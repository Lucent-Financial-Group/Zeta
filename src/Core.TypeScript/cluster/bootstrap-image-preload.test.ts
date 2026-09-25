// src/Core.TypeScript/cluster/bootstrap-image-preload.test.ts
//
// Falsifiers for the bootstrap image preload derivation. OFFLINE by
// construction: every test injects its own chart renderer, so nothing here
// needs `helm`, the network, or a registry token. The network half
// (`--refresh`, `--verify`, `--build-archive`) is exercised in the ISO lane,
// where the failure of a real registry is a real finding rather than a flake.
//
// WHAT THESE ARE FOR, one line each, because a test file with no stated
// intent is a list of things that happen to pass:
//
//   - the ConfigMap walk, which is the ONLY reason `busybox` is in the set
//   - the blackhole host list, which is the falsifier's own input
//   - `archivePlan`'s naming, which is where a preload silently does nothing
//   - drift, which is what makes the committed snapshot a check and not a note

import { describe, expect, test } from "bun:test";

import {
  archivePlan,
  assertContentAddress,
  blackholeHostnames,
  buildArchive,
  compareToSnapshot,
  containerdImageName,
  hasDrift,
  hostCoverage,
  imagesInEmbeddedManifests,
  loadSnapshot,
  MIRRORED_HOST,
  plainDocuments,
  type PreloadImage,
  type Snapshot,
  unmirroredHosts,
} from "./bootstrap-image-preload.ts";

function snapshotOf(images: readonly { reference: string; amd64Digest?: string | null; bytes?: number }[]): Snapshot {
  return {
    $comment: "test",
    resolvedAt: "2026-09-25",
    kubernetesVersion: "1.35.7",
    derivedFrom: [],
    totalCompressedBytes: images.reduce((sum, i) => sum + (i.bytes ?? 0), 0),
    unsized: 0,
    images: images.map((i) => ({
      reference: i.reference,
      rosterAttrs: ["test"],
      amd64Digest: i.amd64Digest === undefined ? "sha256:aa" : i.amd64Digest,
      compressedBytes: i.bytes ?? 0,
    })),
  };
}

describe("imagesInEmbeddedManifests — the ConfigMap blindness this module found", () => {
  // The live case: local-storage.nix embeds the local-path provisioner's
  // helperPod.yaml as a STRING inside a ConfigMap, and that string carries
  // `image: busybox`. A structural `image:` walk sees a ConfigMap whose data is
  // text and finds nothing. Preloading THAT set ships a provisioner that cannot
  // provision.
  test("finds an image inside a ConfigMap's string value", () => {
    const documents = [
      {
        kind: "ConfigMap",
        data: {
          "helperPod.yaml": "apiVersion: v1\nkind: Pod\nspec:\n  containers:\n    - name: helper\n      image: busybox\n",
        },
      },
    ];
    expect(imagesInEmbeddedManifests(documents)).toEqual(["busybox"]);
  });

  test("a ConfigMap value that is not a manifest is skipped, not thrown on", () => {
    const documents = [
      { kind: "ConfigMap", data: { "app.properties": "image: =:::not yaml at all\n\t\tbroken" } },
      { kind: "ConfigMap", data: { "numbers.txt": "1\n2\n3" } },
    ];
    expect(() => imagesInEmbeddedManifests(documents)).not.toThrow();
  });

  test("only ConfigMaps are walked — a Secret's data is not YAML-parsed", () => {
    const documents = [{ kind: "Secret", data: { x: "image: leaked/thing:v1" } }];
    expect(imagesInEmbeddedManifests(documents)).toEqual([]);
  });

  test("bare `busybox` and `busybox:1.36@sha256:...` are DIFFERENT entries", () => {
    // containerd resolves by name. A set deduplicated by "it's busybox either
    // way" preloads one of the two names and lets the kubelet pull the other.
    const embedded = imagesInEmbeddedManifests([
      { kind: "ConfigMap", data: { a: "kind: Pod\nspec:\n  containers:\n    - image: busybox\n" } },
    ]);
    expect(embedded).toEqual(["busybox"]);
    expect(embedded).not.toContain("busybox:1.36");
  });
});

describe("plainDocuments — HelmChart CRs are the renderer's job, not the scanner's", () => {
  test("drops HelmChart documents and keeps ordinary ones", () => {
    const entry = {
      attr: "x",
      filename: "x.yaml",
      sourceDescription: "x",
      content: [
        "apiVersion: helm.cattle.io/v1\nkind: HelmChart\nspec:\n  chart: cilium",
        "apiVersion: v1\nkind: Pod\nspec:\n  containers:\n    - image: busybox:1.36",
      ].join("\n---\n"),
    };
    const kinds = plainDocuments(entry).map((d) => (d as { kind?: string }).kind);
    expect(kinds).toEqual(["Pod"]);
  });
});

describe("blackhole hosts — the falsifier's input, derived and never typed", () => {
  const snapshot = snapshotOf([
    { reference: "quay.io/cilium/cilium:v1.20.1" },
    { reference: "ghcr.io/spiffe/spire-server:1.11.2" },
    { reference: "busybox:1.36" },
    { reference: "docker.io/rancher/kubectl:v1.35.6" },
  ]);

  test("every host except the one mirror.gcr.io covers", () => {
    expect(unmirroredHosts(snapshot)).toEqual(["ghcr.io", "quay.io"]);
  });

  test("the mirrored host is excluded from the COVERAGE view — it is the covered case", () => {
    expect(unmirroredHosts(snapshot)).not.toContain(MIRRORED_HOST);
  });

  test("but the BLACKHOLE list DOES include docker.io — the claim is 'no registry reachable'", () => {
    // MEASURED 2026-09-25: the first harness run left docker.io reachable and
    // returned UNDECIDED for all four of its images, because a probe that
    // succeeds by PULLING is indistinguishable from one that succeeds by
    // PRELOADING. A registry left up makes its images unjudgeable, which is a
    // weaker result dressed as a narrower one.
    const hosts = blackholeHostnames(snapshot);
    expect(hosts).toContain("docker.io");
    expect(hosts).toContain("quay.io");
    expect(hosts).toContain("ghcr.io");
  });

  test("all three Docker Hub spellings are blackholed — a client may ask for any of them", () => {
    const hosts = blackholeHostnames(snapshot);
    expect(hosts).toContain("docker.io");
    expect(hosts).toContain("index.docker.io");
    expect(hosts).toContain("registry-1.docker.io");
  });

  test("a NEW registry in the set appears in the blackhole list with no code change", () => {
    // This is the whole reason the list is derived. A hand-written list of
    // hosts is a list that silently stops covering an image that moved.
    const grown = snapshotOf([...snapshot.images, { reference: "registry.gitlab.com/thing/app:v1" }]);
    expect(blackholeHostnames(grown)).toContain("registry.gitlab.com");
  });
});

describe("hostCoverage — the measurement that justifies the payload", () => {
  test("splits mirrored from unmirrored and sorts by bytes", () => {
    const rows = hostCoverage(
      snapshotOf([
        { reference: "quay.io/a/b:v1", bytes: 300 },
        { reference: "busybox:1.36", bytes: 10 },
        { reference: "ghcr.io/c/d:v1", bytes: 100 },
      ]),
    );
    expect(rows.map((r) => r.host)).toEqual(["quay.io", "ghcr.io", MIRRORED_HOST]);
    expect(rows.find((r) => r.host === MIRRORED_HOST)?.mirrored).toBe(true);
    expect(rows.find((r) => r.host === "quay.io")?.mirrored).toBe(false);
  });
});

describe("archivePlan — where a preload silently does nothing", () => {
  test("the destination NAME is the reference verbatim, tag+digest included", () => {
    // MEASURED 2026-09-25: the kubelet normalises `repo:tag@sha256:X` to
    // `repo@sha256:X` and asks containerd for content with digest X. If the
    // archive names it anything else, the image is pulled anyway.
    const reference = "quay.io/cilium/cilium:v1.20.1@sha256:ae9ea21f7427fe24bc6ea7247eb552157a1b0a431744045d3f641545ca71d11b";
    const { plan } = archivePlan(snapshotOf([{ reference }]));
    expect(plan).toHaveLength(1);
    expect(plan[0]?.destinationName).toBe(reference);
  });

  test("the TOP reference is fetched, never the amd64 child digest", () => {
    // Fetching the child is what breaks the digest-pinned references: the
    // child's digest is not the digest the pod spec names.
    const reference = "quay.io/cilium/cilium:v1.20.1@sha256:ae9ea21f7427fe24bc6ea7247eb552157a1b0a431744045d3f641545ca71d11b";
    const { plan } = archivePlan(snapshotOf([{ reference, amd64Digest: "sha256:cccccccc" }]));
    expect(plan[0]?.topReference).toBe("sha256:ae9ea21f7427fe24bc6ea7247eb552157a1b0a431744045d3f641545ca71d11b");
    expect(plan[0]?.topReference).not.toBe("sha256:cccccccc");
  });

  test("a plain tag stays a plain tag", () => {
    const { plan } = archivePlan(snapshotOf([{ reference: "quay.io/jetstack/trust-manager:v0.24.0" }]));
    expect(plan[0]?.topReference).toBe("v0.24.0");
    expect(plan[0]?.repository).toBe("jetstack/trust-manager");
    expect(plan[0]?.host).toBe("quay.io");
  });

  test("an UNPINNED image is reported, never silently dropped", () => {
    // An image with no digest is an image the archive cannot carry. Skipping it
    // quietly would produce a tarball that looks complete and is not.
    const { plan, unpinned } = archivePlan(
      snapshotOf([{ reference: "quay.io/a/b:v1", amd64Digest: null }, { reference: "quay.io/c/d:v1" }]),
    );
    expect(unpinned).toEqual(["quay.io/a/b:v1"]);
    expect(plan.map((p) => p.destinationName)).toEqual(["quay.io/c/d:v1"]);
  });

  test("buildArchive REFUSES to report success when an image is unpinned", async () => {
    const result = await buildArchive(snapshotOf([{ reference: "quay.io/a/b:v1", amd64Digest: null }]), "/dev/null", () => ({
      status: 0,
      stderr: "",
    }));
    expect(result.staged).toBe(0);
    expect(result.failures.join(" ")).toContain("no amd64 digest");
  });

  test("buildArchive surfaces a failing tar rather than claiming an archive exists", async () => {
    const result = await buildArchive(snapshotOf([]), "/dev/null", () => ({ status: 2, stderr: "tar: boom" }));
    expect(result.failures.join(" ")).toContain("tar failed");
  });
});

describe("drift — what makes the committed snapshot a check rather than a note", () => {
  const snapshot = snapshotOf([{ reference: "quay.io/a/b:v1" }, { reference: "quay.io/c/d:v1" }]);
  const derived = (refs: readonly string[]): readonly PreloadImage[] =>
    refs.map((reference) => ({ reference, rosterAttrs: ["x"] }));

  test("no drift when the roster and the snapshot agree", () => {
    const drift = compareToSnapshot(derived(["quay.io/a/b:v1", "quay.io/c/d:v1"]), snapshot);
    expect(hasDrift(drift)).toBe(false);
  });

  test("a NEW roster image is `missingFromSnapshot` — it would not be preloaded", () => {
    const drift = compareToSnapshot(derived(["quay.io/a/b:v1", "quay.io/c/d:v1", "ghcr.io/new/thing:v9"]), snapshot);
    expect(drift.missingFromSnapshot).toEqual(["ghcr.io/new/thing:v9"]);
    expect(hasDrift(drift)).toBe(true);
  });

  test("a REMOVED roster image is `staleInSnapshot` — bytes carried for nothing", () => {
    const drift = compareToSnapshot(derived(["quay.io/a/b:v1"]), snapshot);
    expect(drift.staleInSnapshot).toEqual(["quay.io/c/d:v1"]);
    expect(hasDrift(drift)).toBe(true);
  });
});

describe("the committed snapshot", () => {
  const snapshot = loadSnapshot();

  test("every image carries an amd64 digest — an unpinned one cannot be archived", () => {
    const unpinned = snapshot.images.filter((i) => i.amd64Digest === null).map((i) => i.reference);
    expect(unpinned).toEqual([]);
  });

  test("nothing is UNSIZED — a null size means the registry refused us, not that it is small", () => {
    expect(snapshot.unsized).toBe(0);
  });

  test("it is the BOOTSTRAP slice, not the catalog — an upper bound with a reason", () => {
    // 134 images across the whole roster (#17670). If this snapshot ever holds
    // most of them, something is deriving from the wrong source and the ISO is
    // about to grow by 28 GB. 40 is comfortably above the measured 25 and
    // far below anything that could be the catalog.
    expect(snapshot.images.length).toBeGreaterThan(10);
    expect(snapshot.images.length).toBeLessThan(40);
  });

  test("the payload stays within the size the maintainer approved", () => {
    // ~1.02 GB measured and approved 2026-09-25 (+1.1 GB ISO, +3.1 GB disk).
    // A roster change that doubles it is a decision, not a refresh — so this
    // goes red and someone re-takes it.
    expect(snapshot.totalCompressedBytes).toBeLessThan(1_600_000_000);
  });

  test("the set is mostly UNMIRRORED — which is the reason it is worth carrying", () => {
    const rows = hostCoverage(snapshot);
    const unmirroredBytes = rows.filter((r) => !r.mirrored).reduce((sum, r) => sum + r.bytes, 0);
    expect(unmirroredBytes / snapshot.totalCompressedBytes).toBeGreaterThan(0.9);
  });
});

describe("containerdImageName — the untagged name that cost a whole archive", () => {
  test("a BARE name gets the canonical tag the kubelet will actually ask for", () => {
    // MEASURED 2026-09-25: k3s refuses the entire archive on one untagged
    // entry — `failed to retag images: failed to parse tag for image busybox:
    // can't cast reference.repository to NamedTagged`. One bad name cost all
    // twenty-five images, which is why this is not cosmetic.
    expect(containerdImageName("busybox")).toBe("docker.io/library/busybox:latest");
  });

  test("a tagged reference is left VERBATIM — verbatim is what was measured to work", () => {
    expect(containerdImageName("quay.io/jetstack/trust-manager:v0.24.0")).toBe("quay.io/jetstack/trust-manager:v0.24.0");
  });

  test("a tag+digest reference is left VERBATIM — normalising it is how the cilium images break", () => {
    const reference = "quay.io/cilium/cilium:v1.20.1@sha256:ae9ea21f";
    expect(containerdImageName(reference)).toBe(reference);
  });

  test("a digest-only reference is left verbatim", () => {
    const reference = "cgr.dev/chainguard/bash@sha256:bcaf350e";
    expect(containerdImageName(reference)).toBe(reference);
  });

  test("a short tagged name is left verbatim — k3s imported one of these successfully", () => {
    expect(containerdImageName("rancher/local-path-provisioner:v0.0.30")).toBe("rancher/local-path-provisioner:v0.0.30");
  });

  test("a registry with a PORT is not mistaken for a tag", () => {
    // `localhost:5000/thing` has a colon and no tag. Treating the port as a tag
    // would leave it untagged in the archive and reproduce the failure above.
    expect(containerdImageName("localhost:5000/thing")).toBe("localhost:5000/thing:latest");
  });

  test("archivePlan uses the normalised name", () => {
    const { plan } = archivePlan(snapshotOf([{ reference: "busybox" }]));
    expect(plan[0]?.destinationName).toBe("docker.io/library/busybox:latest");
  });
});

describe("assertContentAddress — a registry's digest becomes a filesystem path", () => {
  const good = `sha256:${"a".repeat(64)}`;

  test("a bare sha256 digest is accepted", () => {
    expect(assertContentAddress(good)).toBe(good);
  });

  test("a traversal attempt is REFUSED, not sanitised", () => {
    // The blobs are written at `blobs/sha256/<digest>`. A registry answering
    // with a digest containing separators would write outside the layout.
    expect(() => assertContentAddress("sha256:../../../etc/passwd")).toThrow(/content address/);
  });

  test("an absolute path is refused", () => {
    expect(() => assertContentAddress("/etc/passwd")).toThrow(/content address/);
  });

  test("a wrong-length or non-hex digest is refused", () => {
    expect(() => assertContentAddress("sha256:abc")).toThrow(/content address/);
    expect(() => assertContentAddress(`sha256:${"z".repeat(64)}`)).toThrow(/content address/);
  });

  test("an uppercase digest is refused — one spelling, so one path", () => {
    expect(() => assertContentAddress(`sha256:${"A".repeat(64)}`)).toThrow(/content address/);
  });
});
