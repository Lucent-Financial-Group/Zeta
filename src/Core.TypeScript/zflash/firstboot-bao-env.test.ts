import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { TPM_CHAR_DEVICE } from "../cluster/bao-load-site.ts";
import {
  FIRSTBOOT_BAO_LOAD_SITE_KEY,
  FIRSTBOOT_BAO_PATH_KEY,
  NIXOS_HOST_BAO,
  consumeFirstbootBaoElfProcessEnv,
  nixosHostBaoAsk,
} from "./firstboot-bao-elf.ts";
import { runFirstbootBaoElfEnvCli } from "./firstboot-bao-env.ts";

describe("consumeFirstbootBaoElfProcessEnv", () => {
  test("missing keys are unmeasured", () => {
    expect(consumeFirstbootBaoElfProcessEnv({})).toEqual({ ok: true, ask: null });
  });

  test("option D env is a named ask", () => {
    expect(
      consumeFirstbootBaoElfProcessEnv({
        [FIRSTBOOT_BAO_LOAD_SITE_KEY]: "on-host",
        [FIRSTBOOT_BAO_PATH_KEY]: NIXOS_HOST_BAO,
      }),
    ).toEqual({ ok: true, ask: nixosHostBaoAsk() });
  });

  test("one key without the other refuses — does not fill NIXOS_HOST_BAO", () => {
    expect(consumeFirstbootBaoElfProcessEnv({ [FIRSTBOOT_BAO_LOAD_SITE_KEY]: "on-host" })).toEqual({
      ok: false,
      reason: "site-without-path",
    });
    expect(consumeFirstbootBaoElfProcessEnv({ [FIRSTBOOT_BAO_PATH_KEY]: NIXOS_HOST_BAO })).toEqual({
      ok: false,
      reason: "path-without-site",
    });
  });

  test("tpmrm0 is shell-safe and still not an ask", () => {
    expect(
      consumeFirstbootBaoElfProcessEnv({
        [FIRSTBOOT_BAO_LOAD_SITE_KEY]: "on-host",
        [FIRSTBOOT_BAO_PATH_KEY]: TPM_CHAR_DEVICE,
      }),
    ).toEqual({ ok: true, ask: null });
  });
});

describe("runFirstbootBaoElfEnvCli", () => {
  test("writes option D JSON and exits 0", () => {
    const lines: string[] = [];
    const code = runFirstbootBaoElfEnvCli(
      {
        [FIRSTBOOT_BAO_LOAD_SITE_KEY]: "on-host",
        [FIRSTBOOT_BAO_PATH_KEY]: NIXOS_HOST_BAO,
      },
      (line) => {
        lines.push(line);
      },
    );
    expect(code).toBe(0);
    expect(lines).toEqual([`${JSON.stringify({ ok: true, ask: nixosHostBaoAsk() })}\n`]);
  });

  test("writes a refusal and exits 2", () => {
    const lines: string[] = [];
    const code = runFirstbootBaoElfEnvCli({ [FIRSTBOOT_BAO_LOAD_SITE_KEY]: "on-host" }, (line) => {
      lines.push(line);
    });
    expect(code).toBe(2);
    expect(lines).toEqual([`${JSON.stringify({ ok: false, reason: "site-without-path" })}\n`]);
  });
});

describe("firstboot-bao-env.ts process entry", () => {
  const script = fileURLToPath(new URL("./firstboot-bao-env.ts", import.meta.url));

  test("spawned bun consume round-trips option D from env", () => {
    const spawned = spawnSync(process.execPath, [script], {
      encoding: "utf8",
      env: {
        PATH: process.env.PATH,
        [FIRSTBOOT_BAO_LOAD_SITE_KEY]: "on-host",
        [FIRSTBOOT_BAO_PATH_KEY]: NIXOS_HOST_BAO,
      },
    });
    expect(spawned.status).toBe(0);
    expect(JSON.parse(spawned.stdout)).toEqual({ ok: true, ask: nixosHostBaoAsk() });
  });

  test("spawned bun consume is unmeasured when neither key is exported", () => {
    const spawned = spawnSync(process.execPath, [script], {
      encoding: "utf8",
      env: { PATH: process.env.PATH },
    });
    expect(spawned.status).toBe(0);
    expect(JSON.parse(spawned.stdout)).toEqual({ ok: true, ask: null });
  });
});
