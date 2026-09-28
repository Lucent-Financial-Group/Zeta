// Falsifier: the gmod SFTP sidecar must not crash-loop on a fresh install.
//
// atmoz/sftp's create-sftp-user runs `cat /home/<user>/.ssh/keys/*` and exits 1
// when that dir holds no key. The keys come from the OPTIONAL `gmod-sftp-keys`
// ConfigMap, which a fresh install does not have — so the mount is an empty dir
// and the sidecar died on every restart, holding gmod-0 at 1/2 and the
// StatefulSet unready (live, 2026-09-27 bare-metal install).
//
// This test RUNS the sidecar's effective start command (its `command`/`args`, or
// the image entrypoint when none is set) under `sh`, with the keys path pointed
// at a temp dir and atmoz's /entrypoint replaced by a stub that fails exactly
// the way atmoz does on an empty keys dir. Invariant: empty dir => the sidecar
// stays up (SFTP off, pod Ready); a key present => atmoz is started with the
// same user spec.

import { test, expect, describe, afterAll } from "bun:test";
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseAllDocuments } from "yaml";

const REPO = join(import.meta.dir, "..", "..", "..");
const GMOD = join(REPO, "full-ai-cluster", "k8s", "applications", "game-hosting", "gmod", "statefulset.yaml");
const USER_SPEC = "gmod::1000:1000";

// biome-ignore lint/suspicious/noExplicitAny: parsed manifest
const sts: any = parseAllDocuments(readFileSync(GMOD, "utf8"))
  .map((d) => d.toJS())
  .find((d) => d?.kind === "StatefulSet");
const pod = sts.spec.template.spec;
// biome-ignore lint/suspicious/noExplicitAny: parsed manifest
const sftp = pod.containers.find((c: any) => c.name === "sftp");
// biome-ignore lint/suspicious/noExplicitAny: parsed manifest
const keysMount = sftp.volumeMounts.find((m: any) => m.name === "sftp-keys");
// biome-ignore lint/suspicious/noExplicitAny: parsed manifest
const keysVolume = pod.volumes.find((v: any) => v.name === "sftp-keys");

/** The shell the container actually runs: its own `sh -c` script, or the image
 *  entrypoint (`/entrypoint <args>`) when the manifest sets no command. */
function effectiveScript(): string {
  const cmd: string[] | undefined = sftp.command;
  const args: string[] = sftp.args ?? [];
  if (!cmd) return `exec /entrypoint ${args.join(" ")}`;
  expect(cmd.slice(-1)[0]).toBe("-c");
  return args[0];
}

const ROOT = mkdtempSync(join(tmpdir(), "gmod-sftp-keys-")).replaceAll("\\", "/");
afterAll(() => rmSync(ROOT, { recursive: true, force: true }));

/** Run the sidecar script with KEYS -> `keysDir`; the stub mimics atmoz: exit 1
 *  on an empty keys dir, else print the user spec it was started with. */
async function run(keysDir: string): Promise<{ exited: boolean; code: number | null; out: string }> {
  const stub = `${ROOT}/entrypoint-${Math.random().toString(36).slice(2)}`;
  writeFileSync(
    stub,
    `#!/bin/sh\ncat ${keysDir}/* >/dev/null 2>&1 || { echo "create-sftp-user: Error"; exit 1; }\necho "ATMOZ-STARTED $*"\n`,
    { mode: 0o755 },
  );
  const script = effectiveScript()
    .replaceAll(keysMount.mountPath, keysDir)
    .replaceAll("/entrypoint", `sh ${stub}`)
    .replaceAll(/sleep \d+/g, "sleep 1"); // bound the orphaned poll child the kill leaves behind
  // Output to a file, not a pipe: a killed idle sidecar leaves its `sleep` child
  // holding a pipe open, which would hang the read.
  const log = `${stub}.log`;
  const p = Bun.spawn(["sh", "-c", `${script}`], { stdout: Bun.file(log), stderr: Bun.file(log) });
  const done = await Promise.race([p.exited.then(() => true), Bun.sleep(2000).then(() => false)]);
  if (!done) p.kill();
  await p.exited;
  return { exited: done, code: done ? p.exitCode : null, out: readFileSync(log, "utf8") };
}

describe("gmod sftp sidecar on a fresh install (no gmod-sftp-keys)", () => {
  test("the keys source is optional, so a fresh install mounts an empty dir", () => {
    expect(keysVolume.configMap?.name).toBe("gmod-sftp-keys");
    expect(keysVolume.configMap?.optional).toBe(true);
  });

  test("empty keys dir: the sidecar stays up instead of exiting (no crash-loop)", async () => {
    const dir = `${ROOT}/empty`;
    mkdirSync(dir);
    const r = await run(dir);
    expect({ exited: r.exited, code: r.code, out: r.out }).toMatchObject({ exited: false });
  });

  test("ConfigMap bookkeeping entries (..data) alone do not count as a key", async () => {
    const dir = `${ROOT}/dotonly`;
    mkdirSync(`${dir}/..data`, { recursive: true });
    const r = await run(dir);
    expect(r.exited).toBe(false);
  });

  test("a key present: atmoz is started with the same key-only user spec", async () => {
    const dir = `${ROOT}/withkey`;
    mkdirSync(dir);
    writeFileSync(`${dir}/operator.pub`, "ssh-ed25519 AAAAtest operator\n");
    const r = await run(dir);
    expect(r.exited).toBe(true);
    expect(r.code).toBe(0);
    expect(r.out).toContain(`ATMOZ-STARTED ${USER_SPEC}`);
  });
});
