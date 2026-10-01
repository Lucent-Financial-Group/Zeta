/**
 * zeta-creds-restore-modes.test.ts — restored credentials land with the mode their
 * consumer requires, and a wifi restore cannot abort the run.
 *
 * Both defects live in `applyPlan`, which `zeta-creds-restore.service` runs AS ROOT
 * under systemd (umask 022):
 *
 *   1. `writeFileSync(path, value)` creates 0644. gh/claude/gemini/codex tokens were
 *      therefore world-readable; a persisted ssh PRIVATE host key at 0644 is refused by
 *      sshd ("UNPROTECTED PRIVATE KEY FILE") so the persisted key bought nothing; and a
 *      NetworkManager keyfile that is not 0600 is ignored by NetworkManager.
 *   2. The `wifi` manifest path is the `system-connections` DIRECTORY. Writing the blob
 *      to it is EISDIR, which threw out of `applyPlan`, killed the unit under `set -e`
 *      and skipped the ownership pass — so every credential written BEFORE the throw
 *      stayed root-owned inside the operator's home.
 *
 * POSIX mode bits do not exist on NTFS, so the assertions about bits are skipped on
 * win32 (CI is Linux); the pure mode table and the wifi path assertions run everywhere.
 */

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildBlob, composeBundle } from "./zeta-creds-persist";
import { applyPlan, planRestore, resolveCredPaths, restoreModeFor, RESTORED_WIFI_PROFILE } from "./zeta-creds-restore";
import { DEFAULT_MANIFEST } from "./zeta-creds-manifest";

const UUID = "modes-uuid-1234-5678-9abc";
const PASS = "modes-test-passphrase";
const posix = process.platform !== "win32";

let tmp: string;
beforeAll(() => {
  tmp = mkdtempSync(join(tmpdir(), "zeta-creds-modes-"));
});
afterAll(() => {
  rmSync(tmp, { recursive: true, force: true });
});

function blobFor(bake: readonly string[]): Buffer {
  const args = { usbUuid: UUID, output: join(tmp, "unused.enc"), passphrase: PASS, persona: null, bakeCredArgs: [...bake] };
  const bundle = composeBundle(args);
  if ("error" in bundle) throw new Error(bundle.error);
  return buildBlob(bundle, UUID, PASS);
}

describe("restoreModeFor (pure table)", () => {
  it("tokens and private keys are 0600", () => {
    for (const id of ["gh-cli", "claude", "gemini", "codex"]) expect(restoreModeFor(id, `/h/${id}`)).toBe(0o600);
    expect(restoreModeFor("ssh-host-keys", "/etc/ssh/ssh_host_ed25519_key")).toBe(0o600);
  });

  it("the public half of a host key is not a secret", () => {
    expect(restoreModeFor("ssh-host-keys", "/etc/ssh/ssh_host_ed25519_key.pub")).toBe(0o644);
  });

  it("wifi keyfiles are 0600 (NetworkManager ignores anything looser)", () => {
    expect(restoreModeFor("wifi", `/etc/NetworkManager/system-connections/${RESTORED_WIFI_PROFILE}`)).toBe(0o600);
  });

  it("non-secret entries keep the creation default — tightening them would break their readers", () => {
    for (const id of ["ssh-operator-pubkey", "install-answers", "pkcs11-module-path"]) {
      expect(restoreModeFor(id, `/etc/zeta/${id}`)).toBeUndefined();
    }
  });
});

describe("applyPlan modes (POSIX only)", () => {
  it.skipIf(!posix)("a restored token is created 0600, not the umask default", () => {
    const root = join(tmp, "mode-fresh");
    const plan = planRestore(blobFor(["gh-cli=TOKEN-ONE"]), UUID, PASS, null, root);
    if ("error" in plan) throw new Error(plan.error);
    expect(applyPlan(plan)).toBe(1);
    const path = resolveCredPaths(DEFAULT_MANIFEST.credentials.find((c) => c.id === "gh-cli")!, root)[0]!;
    expect(statSync(path).mode & 0o777).toBe(0o600);
  });

  it.skipIf(!posix)("a token left 0644 by an earlier generation is re-written 0600, not skipped as already-present", () => {
    const root = join(tmp, "mode-repair");
    const path = resolveCredPaths(DEFAULT_MANIFEST.credentials.find((c) => c.id === "gh-cli")!, root)[0]!;
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(path, "TOKEN-TWO");
    chmodSync(path, 0o644);

    const plan = planRestore(blobFor(["gh-cli=TOKEN-TWO"]), UUID, PASS, null, root);
    if ("error" in plan) throw new Error(plan.error);
    // Same bytes as on disk: before the fix this was skipped and the file stayed 0644 forever.
    expect(plan.writes.length).toBe(1);
    expect(plan.skipped.some((s) => s.reason === "already-present")).toBe(false);
    applyPlan(plan);
    expect(statSync(path).mode & 0o777).toBe(0o600);
    expect(readFileSync(path, "utf8")).toBe("TOKEN-TWO");

    // And once repaired it IS idempotent: a third run changes nothing.
    const again = planRestore(blobFor(["gh-cli=TOKEN-TWO"]), UUID, PASS, null, root);
    if ("error" in again) throw new Error(again.error);
    expect(again.writes.length).toBe(0);
    expect(again.skipped.some((s) => s.reason === "already-present")).toBe(true);
  });

  it.skipIf(!posix)("a restored wifi keyfile is 0600", () => {
    const root = join(tmp, "mode-wifi");
    const plan = planRestore(blobFor(['wifi={"ssid":"HomeNet","psk":"hunter2hunter2"}']), UUID, PASS, null, root);
    if ("error" in plan) throw new Error(plan.error);
    applyPlan(plan);
    const file = join(root, "etc", "NetworkManager", "system-connections", RESTORED_WIFI_PROFILE);
    expect(statSync(file).mode & 0o777).toBe(0o600);
  });
});

describe("wifi restore targets a file INSIDE system-connections", () => {
  it("does not throw EISDIR when the directory already exists (NetworkManager creates it)", () => {
    const root = join(tmp, "wifi-dir");
    const dir = join(root, "etc", "NetworkManager", "system-connections");
    mkdirSync(dir, { recursive: true });

    const plan = planRestore(blobFor(['wifi={"ssid":"HomeNet","psk":"hunter2hunter2"}']), UUID, PASS, null, root);
    if ("error" in plan) throw new Error(plan.error);
    expect(plan.writes.map((w) => w.path)).toEqual([join(dir, RESTORED_WIFI_PROFILE)]);
    // Before the fix this threw: the planned path WAS the directory.
    expect(() => applyPlan(plan)).not.toThrow();
    expect(statSync(dir).isDirectory()).toBe(true);
  });

  it("converts the {ssid, psk} JSON the persist side accepts into a real keyfile", () => {
    const root = join(tmp, "wifi-convert");
    const plan = planRestore(blobFor(['wifi={"ssid":"HomeNet","psk":"hunter2hunter2"}']), UUID, PASS, null, root);
    if ("error" in plan) throw new Error(plan.error);
    applyPlan(plan);
    const text = readFileSync(join(root, "etc", "NetworkManager", "system-connections", RESTORED_WIFI_PROFILE), "utf8");
    expect(text).toContain("[wifi]");
    expect(text).toContain("ssid=HomeNet");
    expect(text).toContain("psk=hunter2hunter2");
  });
});
