/**
 * gitlab-windows-runner.test.ts -- falsifiers for the opt-in Windows GitLab runner path:
 *
 *   full-ai-cluster/k8s/examples/gitlab-windows-runner-token.yaml   (mints the runner record + token Secret)
 *   full-ai-cluster/k8s/examples/kubevirt-windows-gitlab-runner.yaml (the KubeVirt guest that registers it)
 *   docs/ops/WINDOWS-GITLAB-RUNNER.md                                (the runbook)
 *
 *   A. THE TAG CONTRACT -- the Windows runner and the Linux runner (applications/gitlab/Application.yaml)
 *      must never be able to take each other's jobs: disjoint tag sets, exactly one of them takes
 *      untagged jobs, and it is the Linux one. Read from the two sources, not restated here.
 *   B. THE TOKEN JOB, EXECUTED -- its script is pulled out of the manifest and RUN against a stub
 *      `kubectl`, so what it sends to Rails (the runner's tags / run_untagged), what it writes (one
 *      Secret key), what it prints (never the token) and how it fails (loudly, exit 1) are observed.
 *   C. THE GUEST SPEC -- internal consistency of the VM, its volumes and the bootstrap it carries, and
 *      its consistency with the tree (storage capability, KubeVirt release, placement outside
 *      k8s/applications/, opt-in by construction).
 *   D. THE RUNBOOK names every file and Secret the manifests define, so it cannot drift from them.
 *
 * WHAT THIS CANNOT PROVE (recorded in the runbook too): that `Ci::Runners::CreateRunnerService` accepts
 * these params on GitLab 17.7 (the Linux Job proves the instance_type path live; the params differ here
 * only in tags/run_untagged), that KubeVirt accepts the volume shapes (the server-side dry-run in
 * kubevirt-vm-live-test.ts is the authority, run in the `live-kind-virt` job), or that a Windows guest
 * boots, runs bootstrap.ps1 and registers -- no Windows image exists in CI.
 */

import { describe, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import { parseAllDocuments, parse as parseYaml } from "yaml";
import { STORAGE_CAPABILITIES } from "./storage-capabilities.ts";

const REPO_ROOT = resolve(import.meta.dir, "../../..");
const EXAMPLES = join(REPO_ROOT, "full-ai-cluster/k8s/examples");
const TOKEN_FILE = join(EXAMPLES, "gitlab-windows-runner-token.yaml");
const VM_FILE = join(EXAMPLES, "kubevirt-windows-gitlab-runner.yaml");
const GITLAB_APP = join(REPO_ROOT, "full-ai-cluster/k8s/applications/gitlab/Application.yaml");
const RUNBOOK = join(REPO_ROOT, "docs/ops/WINDOWS-GITLAB-RUNNER.md");

type Doc = Record<string, any>;

function loadDocs(path: string): Doc[] {
  return parseAllDocuments(readFileSync(path, "utf8"))
    .map((d) => d.toJS() as Doc)
    .filter((d) => d !== null && d !== undefined);
}
const kindOf = (docs: Doc[], kind: string): Doc[] => docs.filter((d) => d.kind === kind);

const tokenDocs = loadDocs(TOKEN_FILE);
const vmDocs = loadDocs(VM_FILE);

// ---------------------------------------------------------------------------
// The two sources of the tag contract
// ---------------------------------------------------------------------------

function windowsJob(): Doc {
  return kindOf(tokenDocs, "Job")[0]!;
}
function windowsEnv(name: string): string {
  const env = windowsJob().spec.template.spec.containers[0].env as { name: string; value: string }[];
  const hit = env.find((e) => e.name === name);
  if (!hit) throw new Error(`token Job has no env ${name}`);
  return hit.value;
}
function windowsScript(): string {
  return windowsJob().spec.template.spec.containers[0].args[0] as string;
}

/** The Linux runner's record, as the in-cluster Job in the GitLab Application creates it. */
function linuxRunner(): { tags: string[]; runUntagged: boolean; description: string; secret: string; image: string } {
  const app = parseYaml(readFileSync(GITLAB_APP, "utf8")) as Doc;
  const extra = app.spec.source.helm.valuesObject["gitlab-runner"].extraObjects as Doc[];
  const job = extra.find((o) => o.kind === "Job" && o.metadata.name === "gitlab-runner-token")!;
  const container = job.spec.template.spec.containers[0];
  const script = container.args[0] as string;
  const tags = /tag_list: %w\[([^\]]*)\]/.exec(script)?.[1];
  const untagged = /run_untagged: (true|false)/.exec(script)?.[1];
  const description = /description: '([^']+)'/.exec(script)?.[1];
  const secret = /SECRET=(\S+)/.exec(script)?.[1];
  if (tags === undefined || untagged === undefined || description === undefined || secret === undefined) {
    throw new Error("could not read the Linux runner's record out of Job/gitlab-runner-token");
  }
  return { tags: tags.split(/\s+/).filter(Boolean), runUntagged: untagged === "true", description, secret, image: String(container.image) };
}

describe("A. the tag contract: the two runners can never take each other's jobs", () => {
  const linux = linuxRunner();
  const winTags = windowsEnv("RUNNER_TAGS").split(",");

  test("the Linux runner is read correctly (so a refactor that moves its Job fails here, not silently)", () => {
    expect(linux.tags.length).toBeGreaterThan(0);
    expect(linux.runUntagged).toBe(true);
    expect(linux.description).toBe("zeta-cluster");
  });

  test("the tag sets are DISJOINT", () => {
    expect(winTags.filter((t) => linux.tags.includes(t))).toEqual([]);
  });

  test("the Windows runner is tagged `windows` and does NOT take untagged jobs; the Linux one does", () => {
    expect(winTags).toContain("windows");
    expect(windowsEnv("RUN_UNTAGGED")).toBe("false");
    expect(linux.runUntagged).toBe(true);
    // exactly one untagged taker: two would split tag-less pipelines across operating systems.
    expect([windowsEnv("RUN_UNTAGGED") === "true", linux.runUntagged].filter(Boolean)).toHaveLength(1);
  });

  test("the Windows script has no literal that could override the env knobs back to untagged", () => {
    const script = windowsScript();
    expect(script).not.toContain("run_untagged: true");
    expect(script).toContain("run_untagged: @UNTAGGED@");
  });

  test("distinct record description and distinct Secret: a re-run cannot adopt or overwrite the Linux runner's token", () => {
    expect(windowsEnv("RUNNER_DESCRIPTION")).not.toBe(linux.description);
    expect(windowsEnv("TARGET_SECRET")).not.toBe(linux.secret);
    expect(windowsEnv("TARGET_SECRET")).toBe("gitlab-windows-runner-token");
  });

  test("the Job image is the chart's own kubectl image at the SAME release as the GitLab images, and is in the resolvability roster", () => {
    // The Linux Job resolves it through the chart helper (a template expression); here it is a literal, so
    // a GitLab bump must move it by hand -- this is what makes forgetting a red test.
    expect(linux.image).toContain("gitlab.kubectl.image");
    const image = String(windowsJob().spec.template.spec.containers[0].image);
    const refs = readFileSync(join(REPO_ROOT, "full-ai-cluster/k8s/image-resolvability.json"), "utf8");
    expect(refs).toContain(`"${image}"`);
    const toolbox = /registry\.gitlab\.com\/gitlab-org\/build\/cng\/gitlab-toolbox-ce:(v[0-9.]+)/.exec(refs)?.[1];
    expect(toolbox).toBeDefined();
    expect(image.endsWith(`:${toolbox}`)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// B. The token Job, executed against a stub kubectl
// ---------------------------------------------------------------------------

const probe = (cmd: string[]): boolean => {
  try {
    return Bun.spawnSync(cmd, { stdout: "pipe", stderr: "pipe" }).exitCode === 0;
  } catch {
    return false;
  }
};
const BASH = probe(["bash", "-c", "exit 0"]);
if (!BASH) console.warn("gitlab-windows-runner.test: bash not on PATH -- section B is SKIPPED, not passed");

const TOKEN = "glrt-t3_WinTok-123_xyz";

const KUBECTL_STUB = `#!/usr/bin/env bash
state="$STUB_DIR"
echo "$*" >> "$state/calls.log"
case " $* " in
  *" get secret "*) printf '%s' "$(cat "$state/existing" 2>/dev/null)"; exit 0 ;;
  *" exec "*)
    n=$(cat "$state/exec-count" 2>/dev/null || echo 0); n=$((n + 1)); echo "$n" > "$state/exec-count"
    for a in "$@"; do last="$a"; done
    printf '%s' "$last" > "$state/ruby.rb"
    fails=$(cat "$state/exec-failures" 2>/dev/null || echo 0)
    if [ "$fails" = "inf" ] || [ "$n" -le "$fails" ]; then echo "error: toolbox not answering (attempt $n)" >&2; exit 1; fi
    printf 'DEPRECATION WARNING: noise before the token\\n\\n%s' "$STUB_TOKEN"
    exit 0 ;;
  *" patch "*)
    prev=""
    for a in "$@"; do if [ "$prev" = "--patch-file" ]; then cp "$a" "$state/patch.json"; fi; prev="$a"; done
    exit 0 ;;
esac
echo "stub kubectl: unexpected invocation: $*" >&2
exit 99
`;

const readIfPresent = (path: string): string | null => {
  try {
    return readFileSync(path, "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
};

interface Scenario {
  existing?: string;
  execFailures?: number;
  env?: Record<string, string>;
}
interface Outcome {
  exitCode: number;
  output: string;
  execCalls: number;
  ruby: string | null;
  patch: Record<string, any> | null;
}

function runScript(script: string, scenario: Scenario): Outcome {
  const dir = mkdtempSync(join(tmpdir(), "win-mint-stub-"));
  try {
    const bin = join(dir, "bin");
    mkdirSync(bin, { recursive: true });
    for (const [name, body] of [["kubectl", KUBECTL_STUB], ["sleep", "#!/usr/bin/env bash\nexit 0\n"]] as const) {
      writeFileSync(join(bin, name), body, "utf8");
      chmodSync(join(bin, name), 0o755);
    }
    writeFileSync(join(dir, "existing"), scenario.existing ?? "", "utf8");
    writeFileSync(join(dir, "exec-failures"), scenario.execFailures === Infinity ? "inf" : String(scenario.execFailures ?? 0), "utf8");
    writeFileSync(join(dir, "script.sh"), script, "utf8");
    const toPosix = (p: string): string => p.replaceAll("\\", "/").replace(/^([A-Za-z]):/, (_m, d: string) => `/${d.toLowerCase()}`);
    const onWindows = process.platform === "win32";
    const env: Record<string, string | undefined> = { ...process.env };
    const inheritedPath = process.env["PATH"] ?? process.env["Path"] ?? "";
    for (const k of Object.keys(env)) if (k.toLowerCase() === "path") delete env[k];
    // The Job's own env block, then the scenario's overrides: the script sees what a pod would.
    const jobEnv: Record<string, string> = {};
    for (const e of windowsJob().spec.template.spec.containers[0].env as { name: string; value: string }[]) {
      if (e.name !== "HOME") jobEnv[e.name] = e.value;
    }
    const run = Bun.spawnSync(["bash", onWindows ? toPosix(join(dir, "script.sh")) : join(dir, "script.sh")], {
      stdout: "pipe",
      stderr: "pipe",
      env: {
        ...env,
        ...jobEnv,
        PATH: `${bin}${delimiter}${inheritedPath}`,
        STUB_DIR: onWindows ? toPosix(dir) : dir,
        STUB_TOKEN: TOKEN,
        MINT_MAX_ATTEMPTS: "5",
        ...(scenario.env ?? {}),
      },
    });
    const patchText = readIfPresent(join(dir, "patch.json"));
    return {
      exitCode: run.exitCode ?? -1,
      output: run.stdout.toString() + run.stderr.toString(),
      execCalls: Number(readIfPresent(join(dir, "exec-count"))?.trim() ?? "0"),
      ruby: readIfPresent(join(dir, "ruby.rb")),
      patch: patchText === null ? null : (JSON.parse(patchText) as Record<string, any>),
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe.skipIf(!BASH)("B. the token Job's script, executed", () => {
  test("it sends Rails an instance runner tagged windows that does NOT run untagged, and writes only runner-token", () => {
    const out = runScript(windowsScript(), {});
    expect(out.exitCode).toBe(0);
    expect(out.execCalls).toBe(1);
    expect(out.ruby).toContain("tag_list: %w[windows zeta-windows]");
    expect(out.ruby).toContain("run_untagged: false");
    expect(out.ruby).not.toContain("run_untagged: true");
    expect(out.ruby).toContain("runner_type: 'instance_type'");
    expect(out.ruby).toContain("description: 'zeta-windows'");
    expect(out.ruby).not.toContain("@"); // every placeholder was substituted
    const data = out.patch?.["data"] ?? {};
    expect(Object.keys(data)).toEqual(["runner-token"]);
    expect(Buffer.from(data["runner-token"], "base64").toString("utf8")).toBe(TOKEN);
  });

  test("the token is never printed: the Job's whole output is one known line", () => {
    const out = runScript(windowsScript(), {});
    expect(out.output).toBe("minted a glrt- runner token into gitlab-windows-runner-token\n");
  });

  test("a token already in the Secret is left alone: no Rails call, no patch (idempotent re-apply)", () => {
    const out = runScript(windowsScript(), { existing: "Z2xydC1zb21ldGhpbmc=" });
    expect(out.exitCode).toBe(0);
    expect(out.execCalls).toBe(0);
    expect(out.patch).toBeNull();
    expect(out.output).toContain("already present");
  });

  test("a Rails call that fails twice and then succeeds still writes the token", () => {
    const out = runScript(windowsScript(), { execFailures: 2 });
    expect(out.exitCode).toBe(0);
    expect(out.execCalls).toBe(3);
    expect(out.patch).not.toBeNull();
  });

  test("a Rails call that never succeeds FAILS LOUD (exit 1, operator step printed), unlike the Linux sync-hook Job", () => {
    const out = runScript(windowsScript(), { execFailures: Infinity });
    expect(out.exitCode).toBe(1);
    expect(out.execCalls).toBe(5);
    expect(out.patch).toBeNull();
    expect(out.output).toContain("Operator step");
    expect(out.output).toContain("windows,zeta-windows");
  });

  test("the env knobs are the whole interface: another runner is a values change, and untagged is passed through", () => {
    const out = runScript(windowsScript(), {
      env: { RUNNER_DESCRIPTION: "zeta-big-linux", RUNNER_TAGS: "linux-big,privileged", RUN_UNTAGGED: "true", TARGET_SECRET: "gitlab-big-linux-runner-token" },
    });
    expect(out.exitCode).toBe(0);
    expect(out.ruby).toContain("description: 'zeta-big-linux'");
    expect(out.ruby).toContain("tag_list: %w[linux-big privileged]");
    expect(out.ruby).toContain("run_untagged: true");
    expect(out.output).toContain("gitlab-big-linux-runner-token");
  });

  for (const [name, env] of [
    ["a quote in the description", { RUNNER_DESCRIPTION: "x'; system('id'); '" }],
    ["a space or bracket in the tags", { RUNNER_TAGS: "a] + system('id') + %w[b" }],
    ["a non-boolean run-untagged", { RUN_UNTAGGED: "false) ; system('id'" }],
  ] as const) {
    test(`Ruby injection is refused before any Rails call: ${name}`, () => {
      const out = runScript(windowsScript(), { env });
      expect(out.exitCode).toBe(1);
      expect(out.execCalls).toBe(0);
      expect(out.patch).toBeNull();
    });
  }
});

describe("B2. the token Job's authority", () => {
  const role = kindOf(tokenDocs, "Role")[0]!;

  test("it can patch ONE named Secret and cannot create Secrets (the Secret is pre-created empty)", () => {
    const secretRules = (role.rules as Doc[]).filter((r) => (r.resources as string[]).includes("secrets"));
    expect(secretRules).toHaveLength(1);
    expect(secretRules[0]?.["resourceNames"]).toEqual(["gitlab-windows-runner-token"]);
    expect((secretRules[0]?.["verbs"] as string[]).slice().sort()).toEqual(["get", "patch"]);
    const secret = kindOf(tokenDocs, "Secret")[0]!;
    expect(secret.metadata.name).toBe("gitlab-windows-runner-token");
    expect(secret.metadata.namespace).toBe("gitlab");
  });

  test("the pre-created Secret carries NO data key, so re-applying this file cannot blank a live token", () => {
    const secret = kindOf(tokenDocs, "Secret")[0]!;
    expect(secret.data).toBeUndefined();
    expect(secret.stringData).toBeUndefined();
  });

  test("everything is in the gitlab namespace and the RoleBinding binds the Job's ServiceAccount to the Role", () => {
    for (const d of tokenDocs) expect(d.metadata.namespace).toBe("gitlab");
    const rb = kindOf(tokenDocs, "RoleBinding")[0]!;
    expect(rb.roleRef.name).toBe(role.metadata.name);
    expect(rb.subjects[0].name).toBe(windowsJob().spec.template.spec.serviceAccountName);
  });

  test("the container runs unprivileged: non-root, read-only rootfs, no capabilities", () => {
    const spec = windowsJob().spec.template.spec;
    expect(spec.securityContext.runAsNonRoot).toBe(true);
    const c = spec.containers[0];
    expect(c.securityContext.allowPrivilegeEscalation).toBe(false);
    expect(c.securityContext.readOnlyRootFilesystem).toBe(true);
    expect(c.securityContext.capabilities.drop).toEqual(["ALL"]);
  });
});

// ---------------------------------------------------------------------------
// C. The guest spec
// ---------------------------------------------------------------------------

describe("C. the Windows runner guest", () => {
  const vm = kindOf(vmDocs, "VirtualMachine")[0]!;
  const spec = vm.spec.template.spec;
  const volumes = spec.volumes as Doc[];
  const disks = spec.domain.devices.disks as Doc[];
  const configMaps = kindOf(vmDocs, "ConfigMap");
  const bootstrapCm = configMaps.find((c) => c.metadata.name === "windows-runner-bootstrap")!;
  const script = bootstrapCm.data["bootstrap.ps1"] as string;

  test("OPT-IN by construction: Halted, an unresolvable image sentinel, outside the applications tree", () => {
    expect(vm.spec.runStrategy).toBe("Halted");
    const dv = kindOf(vmDocs, "DataVolume")[0]!;
    expect(new URL(dv.spec.source.http.url).hostname.endsWith(".invalid")).toBe(true);
    for (const path of [VM_FILE, TOKEN_FILE]) expect(path.startsWith(join(REPO_ROOT, "full-ai-cluster/k8s/applications"))).toBe(false);
    // ArgoCD's root reads only applications/*/Application.yaml: nothing in that tree may name these.
    const appText = readFileSync(GITLAB_APP, "utf8");
    expect(appText).not.toContain("windows-runner");
    expect(appText).not.toContain("kubevirt-windows-gitlab-runner");
  });

  test("it does not ship or fetch Windows: no Windows image URL, only a sentinel the operator must replace", () => {
    const text = readFileSync(VM_FILE, "utf8");
    // (the XML namespace `schemas.microsoft.com` in Unattend.xml is not a download; only `url:` fields count)
    expect(text).not.toMatch(/url:\s*\S*(microsoft\.com|windowsupdate|software-download)/i);
    const source = kindOf(vmDocs, "DataVolume")[0]!.spec.source;
    expect(Object.keys(source)).toEqual(["http"]);
    expect(text).toContain("EDIT");
  });

  test("every object lives in the namespace the GitLab Application owns, and the VM sits beside the token Secret it mounts", () => {
    for (const d of vmDocs) expect(d.metadata.namespace).toBe("gitlab");
    const secretVolume = volumes.find((v) => v.secret)!;
    expect(secretVolume.secret.secretName).toBe(kindOf(tokenDocs, "Secret")[0]!.metadata.name);
  });

  test("a Windows guest, not a Linux one with a Windows name: EFI, Hyper-V enlightenments, clock policy, slow-shutdown grace", () => {
    const domain = spec.domain;
    for (const key of ["relaxed", "vapic", "spinlocks", "vpindex", "runtime", "synic", "synictimer"]) expect(domain.features.hyperv).toHaveProperty(key);
    expect(domain.clock.timer.hpet.present).toBe(false);
    expect(domain.firmware.bootloader.efi).toBeDefined();
    expect(spec.terminationGracePeriodSeconds).toBeGreaterThanOrEqual(120);
    // only fields KubeVirt's FeatureHyperv declares (same list and reason as kubevirt-vm-live-test.test.ts)
    const declared = new Set(["relaxed", "vapic", "spinlocks", "vpindex", "runtime", "synic", "synictimer", "reset", "vendorid", "frequencies", "reenlightenment", "tlbflush", "ipi", "evmcs"]);
    expect(Object.keys(domain.features.hyperv).filter((k) => !declared.has(k))).toEqual([]);
  });

  test("memory request == limit and NO CPU limit (same sizing contract as kubevirt-windows-vm.yaml)", () => {
    const { requests, limits } = spec.domain.resources;
    expect(limits.memory).toBe(requests.memory);
    expect(spec.domain.memory.guest).toBe(requests.memory);
    expect(limits.cpu).toBeUndefined();
    expect(requests.cpu).toBeDefined();
  });

  test("every disk has a volume and every volume has a disk, and every volume source names an object this file or the token file defines", () => {
    expect(new Set(disks.map((d) => d.name))).toEqual(new Set(volumes.map((v) => v.name)));
    const have = new Set([...vmDocs, ...tokenDocs].map((d) => `${d.kind}/${d.metadata.name}`));
    for (const v of volumes) {
      if (v.dataVolume) expect(have.has(`DataVolume/${v.dataVolume.name}`)).toBe(true);
      if (v.configMap) expect(have.has(`ConfigMap/${v.configMap.name}`)).toBe(true);
      if (v.sysprep) expect(have.has(`ConfigMap/${v.sysprep.configMap.name}`)).toBe(true);
      if (v.secret) expect(have.has(`Secret/${v.secret.secretName}`)).toBe(true);
    }
  });

  test("the root disk boots first; the rest are CD-ROMs a Windows guest can read", () => {
    const root = disks.find((d) => d.name === "root")!;
    expect(root.bootOrder).toBe(1);
    expect(root.disk.bus).toBe("virtio");
    for (const d of disks.filter((x) => x.name !== "root")) expect(d.cdrom).toBeDefined();
  });

  test("the volume labels the guest looks for are the labels the volumes carry (ZETABOOT, ZETATOKEN) in EVERY place that names them", () => {
    const labelOf = (volName: string): string | undefined => {
      const v = volumes.find((x) => x.name === volName)!;
      return v.configMap?.volumeLabel ?? v.secret?.volumeLabel;
    };
    expect(labelOf("bootstrap")).toBe("ZETABOOT");
    expect(labelOf("runner-token")).toBe("ZETATOKEN");
    const userData = volumes.find((v) => v.cloudInitConfigDrive)!.cloudInitConfigDrive.userData as string;
    const unattend = configMaps.find((c) => c.metadata.name === "windows-runner-sysprep")!.data["Unattend.xml"] as string;
    expect(script).toContain("Find-Volume 'ZETABOOT'");
    expect(script).toContain("Find-Volume 'ZETATOKEN'");
    expect(userData).toContain("'ZETABOOT'");
    expect(unattend).toContain("'ZETABOOT'");
    // ISO 9660 volume labels: <= 32 chars, upper-case letters / digits / underscore
    for (const l of ["ZETABOOT", "ZETATOKEN"]) expect(l).toMatch(/^[A-Z0-9_]{1,32}$/);
    // the file the script reads is the key the token Job writes
    expect(script).toContain("'runner-token'");
  });

  test("storage: a CAPABILITY name (never a provider class), RWO, a sized claim; counted by the runbook, not priced as always-on demand", () => {
    const dv = kindOf(vmDocs, "DataVolume")[0]!;
    expect(STORAGE_CAPABILITIES as readonly string[]).toContain(dv.spec.storage.storageClassName);
    expect(dv.spec.storage.accessModes).toEqual(["ReadWriteOnce"]);
    expect(dv.spec.storage.resources.requests.storage).toMatch(/^\d+(Gi|Ti)$/);
    expect(dv.spec.storage.resources.requests.storage).toBe("64Gi");
  });

  test("the virtio driver CD is pinned to the SAME KubeVirt release as the vendored operator", () => {
    const operator = readFileSync(join(REPO_ROOT, "full-ai-cluster/k8s/applications/kubevirt/kubevirt-operator.yaml"), "utf8");
    const version = /name: KUBEVIRT_VERSION\s+value: (v[0-9.]+)/.exec(operator)?.[1];
    expect(version).toBeDefined();
    expect(volumes.find((v) => v.name === "virtio-win")!.containerDisk.image).toBe(`quay.io/kubevirt/virtio-container-disk:${version}`);
  });

  test("RDP Service selects the label KubeVirt stamps on the launcher, is ClusterIP", () => {
    const svc = kindOf(vmDocs, "Service")[0]!;
    expect(svc.spec.selector["kubevirt.io/domain"]).toBe(vm.spec.template.metadata.labels["kubevirt.io/domain"]);
    expect(svc.spec.type).toBe("ClusterIP");
    expect(svc.spec.ports[0].port).toBe(3389);
  });
});

describe("C2. what the guest installs and where it connects", () => {
  const bootstrapCm = kindOf(vmDocs, "ConfigMap").find((c) => c.metadata.name === "windows-runner-bootstrap")!;
  const settings = JSON.parse(bootstrapCm.data["settings.json"]) as Record<string, any>;
  const script = bootstrapCm.data["bootstrap.ps1"] as string;

  test("it reaches GitLab through the SAME in-cluster Service the Linux runner uses, by FQDN (a Windows resolver does not walk a search list)", () => {
    const app = parseYaml(readFileSync(GITLAB_APP, "utf8")) as Doc;
    const linuxUrl = new URL(app.spec.source.helm.valuesObject["gitlab-runner"].gitlabUrl as string);
    const winUrl = new URL(settings["gitlabUrl"]);
    expect(winUrl.port).toBe(linuxUrl.port);
    const [svc, ns] = linuxUrl.hostname.split(".");
    expect(winUrl.hostname).toBe(`${svc}.${ns}.svc.cluster.local`);
    expect(winUrl.protocol).toBe("http:");
  });

  test("gitlab-runner.exe is downloaded from the vendor's release bucket, pinned by version AND sha256, and verified before it runs", () => {
    expect(settings["runnerExeSha256"]).toMatch(/^[0-9a-f]{64}$/);
    const url = new URL(settings["runnerExeUrl"]);
    expect(url.protocol).toBe("https:");
    expect(url.pathname).toMatch(/^\/v\d+\.\d+\.\d+\/binaries\/gitlab-runner-windows-amd64\.exe$/);
    expect(script).toContain("Get-FileHash -Algorithm SHA256");
    // the hash is compared and a mismatch throws BEFORE Move-Item puts the file where the service runs it
    expect(script.indexOf("does not match the pinned")).toBeLessThan(script.indexOf("Move-Item $tmp $exe"));
  });

  test("the runner version matches the GitLab release (the Job image tag), never newer than the server", () => {
    const version = /\/(v\d+\.\d+\.\d+)\//.exec(settings["runnerExeUrl"])?.[1];
    const imageTag = /:(v\d+\.\d+\.\d+)$/.exec(String(windowsJob().spec.template.spec.containers[0].image))?.[1];
    expect(version).toBe(imageTag);
  });

  test("registration is the authentication-token flow: a glrt- token, none of the flags GitLab refuses alongside it", () => {
    expect(script).toContain("-notmatch '^glrt-'");
    const registerLine = script.split("\n").find((l) => l.includes("register --non-interactive"))!;
    expect(registerLine).toContain("--token $token");
    for (const refused of ["--tag-list", "--run-untagged", "--locked", "--registration-token"]) expect(registerLine).not.toContain(refused);
    expect(registerLine).toContain("--executor shell");
    expect(registerLine).toContain("--shell powershell");
    // clone_url keeps checkouts in-cluster, as for the Linux runner
    expect(registerLine).toContain("--clone-url $settings.gitlabUrl");
  });

  test("everything the script can write to its log is an exact, known set of lines (none of which is the token)", () => {
    // An EXACT pin on the whole set of output statements, so a new one -- which could be a leak -- is a diff
    // here rather than a negative assertion that witnesses one rendering of a leak.
    const outputs = script
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => /Write-(Host|Output|Warning|Verbose|Error)|Out-File|Add-Content|Set-Content|echo /i.test(l) && !l.startsWith("(Get-Content"));
    expect(outputs).toEqual([
      "Write-Host 'runner already registered; nothing to do'",
      'catch { Write-Host "download attempt $i failed: $($_.Exception.Message)"; Start-Sleep -Seconds 20 }',
      "Write-Host 'gitlab-runner registered and started'",
    ]);
  });

  test("it is idempotent: an already-registered runner exits before downloading or registering anything", () => {
    expect(script.indexOf("runner already registered")).toBeLessThan(script.indexOf("Invoke-WebRequest"));
    expect(script.indexOf("runner already registered")).toBeLessThan(script.indexOf("register --non-interactive"));
  });
});

// ---------------------------------------------------------------------------
// D. The runbook
// ---------------------------------------------------------------------------

describe("D. the runbook", () => {
  const doc = existsSync(RUNBOOK) ? readFileSync(RUNBOOK, "utf8") : "";

  test("exists", () => {
    expect(doc.length).toBeGreaterThan(2000);
  });

  test("names every manifest, Secret, label and tag the files define, so it cannot drift from them", () => {
    for (const needle of [
      "examples/gitlab-windows-runner-token.yaml",
      "examples/kubevirt-windows-gitlab-runner.yaml",
      "gitlab-windows-runner-token",
      "windows-runner-bootstrap",
      "ZETABOOT",
      "ZETATOKEN",
      "windows,zeta-windows",
      "cloudbase-init",
      "Unattend.xml",
      "virtio",
    ]) {
      expect(doc).toContain(needle);
    }
  });

  test("has an HONEST section: what is proven, what is not, and how the operator verifies", () => {
    expect(doc).toMatch(/^## .*[Uu]nproven/m);
    expect(doc).toMatch(/^## .*[Pp]roven/m);
    expect(doc).toContain("Admin > CI/CD > Runners");
    expect(doc).toMatch(/tags:\s*\[windows\]/);
    expect(doc).toMatch(/no Windows image/i);
  });

  test("documents adding ANY extra runner without a reflash", () => {
    expect(doc).toMatch(/^## .*extra runner/im);
    for (const needle of ["RUNNER_TAGS", "RUN_UNTAGGED", "privileged", "group", "/api/v4/user/runners"]) expect(doc).toContain(needle);
  });
});
