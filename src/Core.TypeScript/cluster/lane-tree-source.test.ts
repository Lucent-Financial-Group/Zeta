import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterAll, describe, expect, test } from "bun:test";
import { parseAllDocuments } from "yaml";

import {
  MAX_TREE_BYTES,
  SERVED_GIT_REF,
  SERVED_SUBTREE,
  buildBareRepo,
  buildLaneTreeBundle,
  laneTreeRepoUrl,
  renderLaneTreeManifests,
  rewriteSelfRepoUrls,
  stageLaneTree,
} from "./lane-tree-source";
import { applyResourceProfile, loadResourceCatalogue } from "./storage-profiles";
import { LANE_TREE_REPO_URL, assertLaneTreeRepoUrl, isLaneTreeRepoUrl } from "./dev-cluster/lib";

const REPO_ROOT = resolve(import.meta.dir, "../../..");
const work = mkdtempSync(join(tmpdir(), "zeta-lane-tree-"));
afterAll(() => {
  rmSync(work, { recursive: true, force: true });
});

describe("rewriteSelfRepoUrls", () => {
  const served = "http://lane/tree.git";

  test("rewrites a repoURL pointing at this repository", () => {
    const { text, rewrote } = rewriteSelfRepoUrls(
      "spec:\n  source:\n    repoURL: https://github.com/Lucent-Financial-Group/Zeta\n",
      served,
    );
    expect(rewrote).toBe(true);
    expect(text).toContain(`repoURL: ${served}`);
  });

  test("LEAVES THIRD-PARTY CHART REPOSITORIES ALONE", () => {
    // The load-bearing half. Rewriting every repoURL would point mimir at the lane
    // server for the Grafana chart it does not hold, and the Application would fail
    // to render — trading a scheduling failure for a sync failure.
    const chart = "spec:\n  source:\n    repoURL: https://grafana.github.io/helm-charts\n";
    const { text, rewrote } = rewriteSelfRepoUrls(chart, served);
    expect(rewrote).toBe(false);
    expect(text).toBe(chart);
  });

  test("recognises the fork and the .git suffix, not one exact URL string", () => {
    for (const url of [
      "https://github.com/AceHack/Zeta.git",
      "git@github.com:Lucent-Financial-Group/Zeta.git",
      "https://github.com/Lucent-Financial-Group/Zeta.git",
    ]) {
      expect(rewriteSelfRepoUrls(`    repoURL: ${url}\n`, served).rewrote).toBe(true);
    }
  });
});

describe("stageLaneTree refusals", () => {
  test("an empty source tree is refused, not served", () => {
    // A served empty tree makes every Application disappear, and ArgoCD reports
    // that as a clean prune rather than as a fault — health without a deployment.
    const emptyRepo = join(work, "empty-repo");
    mkdirSync(join(emptyRepo, SERVED_SUBTREE), { recursive: true });
    expect(() => stageLaneTree(emptyRepo, join(work, "empty-stage"), laneTreeRepoUrl())).toThrow(/staged 0 files/);
  });

  test("a tree with no self-referencing repoURL is refused", () => {
    // Otherwise the override covers the Applications and misses every manifest they
    // point at, which is a PARTIAL override — the worst kind, because the lane
    // reports success over a tree that is half one rung and half the other.
    const noSelf = join(work, "no-self-repo");
    mkdirSync(join(noSelf, SERVED_SUBTREE), { recursive: true });
    writeFileSync(
      join(noSelf, SERVED_SUBTREE, "a.yaml"),
      "spec:\n  source:\n    repoURL: https://grafana.github.io/helm-charts\n",
    );
    expect(() => stageLaneTree(noSelf, join(work, "no-self-stage"), laneTreeRepoUrl())).toThrow(
      /no self-referencing repoURL/,
    );
  });
});

describe("the full bundle, built against the live tree", () => {
  const catalogue = loadResourceCatalogue();
  let bundle: ReturnType<typeof buildLaneTreeBundle>;

  test("builds, and the rung apply is not a no-op", () => {
    bundle = buildLaneTreeBundle({
      repoRoot: REPO_ROOT,
      workDir: join(work, "bundle"),
      gitRef: "lane",
      image: "busybox:1.37.0",
      applyRung: (stagedRoot) => applyResourceProfile(catalogue, "dev", stagedRoot).length,
    });
    expect(bundle.staged.files).toBeGreaterThan(0);
    expect(bundle.staged.rewritten.length).toBeGreaterThan(0);
    expect(bundle.repo.sha).toMatch(/^[0-9a-f]{40}$/);
  });

  test("THE END-TO-END PROOF: a clone of the served repository carries the DEV rung", () => {
    // This is the whole point of the module, asserted by cloning rather than by
    // reading the staging directory. `mimir-kafka-0` is the pod that could not be
    // scheduled on run 33790413535; its committed request is 1000m and the dev rung
    // is 25m. If this reads 1000m the override did not reach the served tree, and
    // the lane would fail exactly as it does today.
    const clone = join(work, "clone");
    execFileSync("git", ["clone", "--quiet", bundle.repo.dir, clone], { stdio: ["ignore", "pipe", "pipe"] });

    const mimir = parseAllDocuments(
      readFileSync(join(clone, "full-ai-cluster/k8s/applications/mimir/Application.yaml"), "utf8"),
    )[0]?.toJS({ maxAliasCount: -1 }) as { spec: { source: { helm: { valuesObject: Record<string, never> } } } };
    const kafka = (
      mimir.spec.source.helm.valuesObject as unknown as Record<string, { resources: { requests: { cpu: string } } }>
    ).kafka;
    expect(kafka?.resources.requests.cpu).toBe("25m");

    const hindsight = parseAllDocuments(
      readFileSync(join(clone, "full-ai-cluster/k8s/applications/hindsight/Application.yaml"), "utf8"),
    )[0]?.toJS({ maxAliasCount: -1 }) as { spec: { source: { helm: { valuesObject: unknown } } } };
    const api = (
      hindsight.spec.source.helm.valuesObject as Record<string, { resources: { requests: { cpu: string } } }>
    ).api;
    expect(api?.resources.requests.cpu).toBe("25m");
  });

  test("the clone's self-references point at the lane server, and none at GitHub", () => {
    const clone = join(work, "clone");
    const mimir = readFileSync(join(clone, "full-ai-cluster/k8s/applications/mimir/Application.yaml"), "utf8");
    // The chart repo is untouched — the rewrite is targeted, not global.
    expect(mimir).toContain("repoURL: https://grafana.github.io/helm-charts");

    const agentMemory = readFileSync(
      join(clone, "full-ai-cluster/k8s/applications/agent-memory/Application.yaml"),
      "utf8",
    );
    expect(agentMemory).toContain(laneTreeRepoUrl());
    expect(agentMemory).not.toContain("github.com/Lucent-Financial-Group/Zeta");
  });

  test("update-server-info ran — dumb HTTP needs these two files and nothing else does", () => {
    // The specific artefacts the static-file transport depends on. Without them a
    // clone fails with "repository not found", which points at the repoURL rather
    // than at the missing index and costs a lane run to diagnose.
    expect(existsSync(join(bundle.repo.dir, "info/refs"))).toBe(true);
    expect(existsSync(join(bundle.repo.dir, "objects/info/packs"))).toBe(true);
  });

  test("the served branch is always main, even when gitRef is a provenance label", () => {
    // gitRef: "lane" above is the COMMIT MESSAGE. ArgoCD clones refs/heads/main.
    const refs = readFileSync(join(bundle.repo.dir, "info/refs"), "utf8");
    expect(refs).toMatch(/refs\/heads\/main(?:\s|$)/);
    expect(refs).not.toContain("refs/heads/lane");
    const subject = execFileSync("git", ["-C", bundle.repo.dir, "log", "-1", "--format=%s"], {
      encoding: "utf8",
    }).trim();
    expect(subject).toBe("lane tree (lane)");
    expect(SERVED_GIT_REF).toBe("main");
  });

  test("there is no GitHub http-alternates — a missing SHA is a miss, not a metal fetch", () => {
    // gitpull.html already reads git objects over dumb HTTP from GitHub Pages
    // (`/repo.git/objects/…`) to dodge CORS. That is a real client. THIS pack
    // still must not list an alternate: serving the GitHub SHA would return
    // the committed metal tree, the silent fallback the overlay exists to
    // refuse. A future in-cluster object-cache is that client in this pod,
    // and it lands with its own falsifier, not by writing this file.
    expect(existsSync(join(bundle.repo.dir, "objects/info/http-alternates"))).toBe(false);
    expect(existsSync(join(bundle.repo.dir, "objects/info/alternates"))).toBe(false);
  });

  test("the packed tree fits the ConfigMap budget, with the measurement printed", () => {
    console.log(
      `[lane-tree] packed ${String(bundle.packedBytes)} bytes of ${String(MAX_TREE_BYTES)} ` +
        `(${((bundle.packedBytes / MAX_TREE_BYTES) * 100).toFixed(1)}% of budget), ` +
        `${String(bundle.staged.files)} files, ${String(bundle.staged.rewritten.length)} repoURL rewrites`,
    );
    expect(bundle.packedBytes).toBeLessThan(MAX_TREE_BYTES);
  });

  test("A ZERO-EDIT RUNG APPLY IS REFUSED", () => {
    // The false-green this module exists to remove: a lane that believes it is
    // serving `dev` while it is serving the committed rung. Modelled by an
    // applyRung that reports no edits, which is what a broken catalogue path, a
    // renamed coordinate or a profile equal to the committed one all look like.
    expect(() =>
      buildLaneTreeBundle({
        repoRoot: REPO_ROOT,
        workDir: join(work, "zero-edit"),
        gitRef: "lane",
        image: "busybox:1.37.0",
        applyRung: () => 0,
      }),
    ).toThrow(/produced 0 edits/);
  });
});

describe("buildBareRepo against a GitHub SHA", () => {
  test("the GitHub SHA is not a fetchable object of the served repo", () => {
    // MEASURED 33822942615: ArgoCD treated the 40-hex PR SHA as an object,
    // `git fetch origin dc2e16e3e…`, then `Unable to find` / `Cannot obtain
    // needed object`. The served commit is a NEW hash. This is that miss,
    // asserted without packing the live tree.
    const githubSha = "dc2e16e3e949d17ad76b77b7196d45202a46f9a1";
    const staging = join(work, "sha-stage");
    mkdirSync(join(staging, SERVED_SUBTREE), { recursive: true });
    writeFileSync(join(staging, SERVED_SUBTREE, "a.yaml"), "kind: ConfigMap\n");
    const repo = buildBareRepo(staging, join(work, "sha.git"), githubSha);
    const refs = readFileSync(join(repo.dir, "info/refs"), "utf8");
    expect(refs).toContain(`refs/heads/${SERVED_GIT_REF}`);
    expect(refs).not.toContain(githubSha);
    expect(repo.sha).not.toBe(githubSha);
    expect(() =>
      execFileSync("git", ["-C", repo.dir, "cat-file", "-e", githubSha], {
        stdio: ["ignore", "pipe", "pipe"],
      }),
    ).toThrow();
  });
});

describe("renderLaneTreeManifests", () => {
  const manifests = renderLaneTreeManifests("QUJD", "busybox:1.37.0");

  test("every document parses and the four kinds are present", () => {
    const kinds = parseAllDocuments(manifests).map((d) => (d.toJS({ maxAliasCount: -1 }) as { kind: string }).kind);
    expect(kinds).toEqual(["Namespace", "ConfigMap", "Service", "Deployment"]);
  });

  test("the readiness probe targets the repository index, not /", () => {
    // A server that is up while the tree is missing would otherwise read as ready
    // and hand ArgoCD a 404 that looks like a bad repoURL.
    expect(manifests).toContain("path: /tree.git/info/refs");
  });

  test("the payload rides as binaryData so gzip survives the round trip", () => {
    expect(manifests).toContain("binaryData:");
    expect(manifests).toContain("tree.tar.gz: QUJD");
  });

  test("the server declares requests, so it is not BestEffort in a budget-tight lane", () => {
    // BestEffort makes this pod the first eviction candidate under exactly the node
    // pressure the lane operates in — and evicting the git server mid-sync stalls
    // every Application at once.
    expect(manifests.match(/cpu: 10m/g)?.length).toBe(2);
    expect(manifests.match(/memory: 32Mi/g)?.length).toBe(2);
  });
});

describe("the narrow repo-URL exception", () => {
  test("THE DRIFT GUARD: the allowed literal and the generated URL are the same string", () => {
    // Two constants, two files, one address. `dev-cluster/lib.ts` decides what the
    // bootstrap will ACCEPT and `lane-tree-source.ts` decides what it will PRODUCE,
    // and neither reads the other. If they drift, the bootstrap refuses the only URL
    // anything generates — an exception with no subject — and the failure surfaces
    // as a bring-up abort a long way from either definition.
    expect(LANE_TREE_REPO_URL).toBe(laneTreeRepoUrl());
  });

  test("it is a LITERAL, not a pattern over in-cluster addresses", () => {
    // A pattern like "any http:// on .svc.cluster.local" would accept every service
    // in the cluster, including one an Application could stand up. ArgoCD clones what
    // it is handed, so the set of acceptable URLs is the set of things that can serve
    // this lane its manifests — and that set has one member.
    for (const near of [
      "http://zeta-lane-tree.zeta-lane-tree.svc.cluster.local:8080/other.git",
      "http://evil.default.svc.cluster.local:8080/tree.git",
      "https://zeta-lane-tree.zeta-lane-tree.svc.cluster.local:8080/tree.git",
      "http://zeta-lane-tree.zeta-lane-tree.svc.cluster.local/tree.git",
      "http://github.com/Lucent-Financial-Group/Zeta",
    ]) {
      expect(isLaneTreeRepoUrl(near)).toBe(false);
    }
    expect(isLaneTreeRepoUrl(LANE_TREE_REPO_URL)).toBe(true);
  });

  test("the assertion is reachable and names what it wanted", () => {
    // `assertLaneTreeRepoUrl` calls `fail`, which exits — so the reachable check here
    // is the predicate it is built from. An assertion whose refusal branch is never
    // executed in test is a refusal nobody has seen work; this pins the branch
    // condition, and the bring-up tests pin the throw on the neighbouring failure.
    expect(typeof assertLaneTreeRepoUrl).toBe("function");
    expect(isLaneTreeRepoUrl("")).toBe(false);
  });

  test("the manifests serve the address the guard allows", () => {
    // Closes the loop: the Service name, namespace and port that the rendered
    // manifests create must be the ones the URL resolves. A rename on either side
    // gives ArgoCD an address nothing is listening on.
    const url = new URL(LANE_TREE_REPO_URL);
    const [service, namespace] = url.hostname.split(".");
    const manifests = renderLaneTreeManifests("QUJD", "busybox:1.37.0");
    expect(manifests).toContain(`name: ${String(service)}`);
    expect(manifests).toContain(`name: ${String(namespace)}`);
    expect(manifests).toContain(`port: ${url.port}`);
    expect(manifests).toContain(`path: ${url.pathname}/info/refs`);
  });
});
