// k3s-agent-tls-self-heal.test.ts
//
// WP25 (081M38G8NGC087G0R001GEGEDK). EXECUTES
// `full-ai-cluster/nixos/modules/k3s-agent-tls-self-heal.sh` over fixture
// directories, rather than reading it -- same discipline as
// `lint-k3s-datastore-preflight.test.ts`.
//
// WHAT IT IS FOR. On the real USB-installed disk, k3s.service retried
// forever on zero-length agent cert/kubeconfig files left by an unclean
// stop (measured: run 35927439681, every file under
// /var/lib/rancher/k3s/agent at 0 bytes, "error loading key from
// .../serving-kubelet.key: <nil>" every ~8s for 70+ minutes). The script
// under test removes only zero-length files under the agent directory
// before k3s starts, so dynamiclistener's LoadOrGenerateKeyFile sees a
// genuine IsNotExist and regenerates them (full citation in the sibling
// `.nix` module).
//
// THE PROPERTY THAT MATTERS MOST is the negative one, same shape as the
// datastore-preflight suite: a zero-length file is removed, a NON-EMPTY
// file is NEVER removed (however small or suspicious), and nothing outside
// the agent directory is ever touched -- the script must refuse outright
// rather than widen its own scope if ever pointed at a "server" path.
//
// PATH FORM: fixture paths are built with `posix.join` and passed to the
// script (which always runs under bash, including here on a Windows CI/dev
// box via Git Bash) as forward-slash paths throughout -- the shipped script
// only ever runs on NixOS/Linux, where paths are POSIX natively, so this
// keeps the test exercising the same path shape production sees rather than
// a Windows-only backslash artifact.

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { join as posixJoin } from "node:path/posix";

const REPO_ROOT = join(import.meta.dir, "..", "..", "..");
const SCRIPT = join(REPO_ROOT, "full-ai-cluster/nixos/modules/k3s-agent-tls-self-heal.sh");
const MODULE = join(REPO_ROOT, "full-ai-cluster/nixos/modules/k3s-agent-tls-self-heal.nix");
const SERVER_MODULE = join(REPO_ROOT, "full-ai-cluster/nixos/modules/k3s-server.nix");
const AGENT_MODULE = join(REPO_ROOT, "full-ai-cluster/nixos/modules/k3s-agent.nix");

/** A fresh temp root, expressed as a forward-slash (POSIX) path even on Windows. */
function tempRoot(): string {
  return mkdtempSync(join(tmpdir(), "zeta-tls-self-heal-")).replace(/\\/g, "/");
}

function inventory(dir: string): readonly string[] {
  const out: string[] = [];
  const walk = (d: string): void => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const p = posixJoin(d, entry.name);
      if (entry.isDirectory()) {
        out.push(`${p}/`);
        walk(p);
      } else {
        out.push(`${p}:${String(statSync(p).size)}`);
      }
    }
  };
  walk(dir);
  return out.sort();
}

/** A fixture that mirrors the MEASURED defect: every agent file present but 0 bytes. */
function truncatedAgentFixture(): { readonly root: string; readonly agentDir: string } {
  const root = tempRoot();
  const agentDir = posixJoin(root, "var/lib/rancher/k3s/agent");
  mkdirSync(agentDir, { recursive: true });
  for (const name of [
    "client-kubelet.crt",
    "client-kubelet.key",
    "client-k3s-controller.crt",
    "client-k3s-controller.key",
    "client-kube-proxy.crt",
    "client-kube-proxy.key",
    "serving-kubelet.crt",
    "serving-kubelet.key",
    "k3scontroller.kubeconfig",
    "kubelet.kubeconfig",
    "kubeproxy.kubeconfig",
  ]) {
    writeFileSync(posixJoin(agentDir, name), "");
  }
  return { root, agentDir };
}

function run(agentDir: string, serialDevice: string): { readonly status: number; readonly stdout: string } {
  const result = spawnSync("bash", [SCRIPT], {
    env: {
      PATH: process.env.PATH ?? "/usr/bin:/bin",
      LC_ALL: "C",
      ZETA_K3S_AGENT_DIR: agentDir,
      ZETA_SERIAL_DEVICE: serialDevice,
    },
    encoding: "utf8",
    maxBuffer: 64 * 1024,
  });
  return { status: result.status ?? -1, stdout: `${result.stdout}${result.stderr}` };
}

describe("removes only zero-length files", () => {
  test("every zero-length file under the agent dir is removed, logged, and k3s can regenerate", () => {
    const { root, agentDir } = truncatedAgentFixture();
    const before = readdirSync(agentDir);
    expect(before.length).toBeGreaterThan(0);

    const r = run(agentDir, posixJoin(root, "no-such-serial-device"));

    expect(r.status).toBe(0);
    const after = readdirSync(agentDir);
    expect(after).toEqual([]);
    for (const name of before) {
      expect(r.stdout).toContain(`removing zero-length file: ${posixJoin(agentDir, name)}`);
    }
    expect(r.stdout).toContain(`removed ${String(before.length)} zero-length file(s)`);
  });

  test("a non-empty file is NEVER removed, however small", () => {
    const { root, agentDir } = truncatedAgentFixture();
    // One file has real (if tiny) content -- the discriminator this script
    // must honour is size, not name or extension.
    const survivor = posixJoin(agentDir, "serving-kubelet.key");
    writeFileSync(survivor, "x");
    const beforeSize = statSync(survivor).size;

    run(agentDir, posixJoin(root, "no-such-serial-device"));

    expect(existsSync(survivor)).toBe(true);
    expect(statSync(survivor).size).toBe(beforeSize);
  });

  test("a fully-populated (non-empty) agent dir is left byte-for-byte identical", () => {
    const root = tempRoot();
    const agentDir = posixJoin(root, "var/lib/rancher/k3s/agent");
    mkdirSync(agentDir, { recursive: true });
    writeFileSync(posixJoin(agentDir, "serving-kubelet.key"), "real key material, not empty\n");
    writeFileSync(posixJoin(agentDir, "serving-kubelet.crt"), "real cert material, not empty\n");
    const before = inventory(agentDir);

    const r = run(agentDir, posixJoin(root, "no-such-serial-device"));

    expect(r.status).toBe(0);
    expect(r.stdout).toContain("clear: no zero-length files");
    expect(inventory(agentDir)).toEqual(before);
  });

  test("a missing agent dir is a no-op, exit 0 (a node that has never run k3s)", () => {
    const root = tempRoot();
    const agentDir = posixJoin(root, "var/lib/rancher/k3s/agent");
    // Deliberately not created.

    const r = run(agentDir, posixJoin(root, "no-such-serial-device"));

    expect(r.status).toBe(0);
    expect(r.stdout).toContain("does not exist yet");
    expect(existsSync(agentDir)).toBe(false);
  });
});

describe("the datastore is never touched, even under misconfiguration", () => {
  test("a partial-match sibling directory (agent-backup) outside the agent dir is untouched", () => {
    const { root, agentDir } = truncatedAgentFixture();
    const decoy = posixJoin(root, "var/lib/rancher/k3s/agent-backup/serving-kubelet.key");
    mkdirSync(posixJoin(root, "var/lib/rancher/k3s/agent-backup"), { recursive: true });
    writeFileSync(decoy, "");

    run(agentDir, posixJoin(root, "no-such-serial-device"));

    expect(existsSync(decoy)).toBe(true);
  });

  test("refuses outright (does nothing) when ZETA_K3S_AGENT_DIR is pointed at a 'server' path", () => {
    const root = tempRoot();
    const serverTlsDir = posixJoin(root, "var/lib/rancher/k3s/server/tls");
    mkdirSync(serverTlsDir, { recursive: true });
    const caKey = posixJoin(serverTlsDir, "server-ca.key");
    writeFileSync(caKey, "");

    const r = run(serverTlsDir, posixJoin(root, "no-such-serial-device"));

    expect(r.status).toBe(0);
    expect(r.stdout).toContain("refusing");
    expect(existsSync(caKey)).toBe(true);
    expect(statSync(caKey).size).toBe(0);
  });

  test("refuses on the datastore path itself (server/db/etcd)", () => {
    const root = tempRoot();
    const etcdDir = posixJoin(root, "var/lib/rancher/k3s/server/db/etcd");
    mkdirSync(etcdDir, { recursive: true });
    const member = posixJoin(etcdDir, "member-marker");
    writeFileSync(member, "");

    const r = run(etcdDir, posixJoin(root, "no-such-serial-device"));

    expect(r.status).toBe(0);
    expect(r.stdout).toContain("refusing");
    expect(existsSync(member)).toBe(true);
  });

  test("the script contains no destructive verb beyond the one scoped rm -f on found zero-length files", () => {
    const text = readFileSync(SCRIPT, "utf8");
    const body = text
      .split("\n")
      .filter((l) => !l.trimStart().startsWith("#"))
      .join("\n");
    for (const verb of ["rm -r", "rm -R", "rmdir", "shred", "mkfs", "dd if=", "truncate", "wipefs", "find /", "find $HOME"]) {
      expect({ verb, present: body.includes(verb) }).toEqual({ verb, present: false });
    }
    // Exactly the scoped, justified removal this script exists to perform.
    expect(body).toContain('rm -f -- "$f"');
  });
});

describe("unit wiring", () => {
  const moduleText = readFileSync(MODULE, "utf8");

  test("wired as ExecStartPre on systemd.services.k3s, following k3s-wait-for-address.nix's shape", () => {
    expect(moduleText).toContain("systemd.services.k3s.serviceConfig.ExecStartPre");
    expect(moduleText).toContain("k3s-agent-tls-self-heal.sh");
  });

  test("imported by BOTH k3s-server.nix and k3s-agent.nix -- both roles run an embedded agent", () => {
    expect(readFileSync(SERVER_MODULE, "utf8")).toContain("./k3s-agent-tls-self-heal.nix");
    expect(readFileSync(AGENT_MODULE, "utf8")).toContain("./k3s-agent-tls-self-heal.nix");
  });
});
