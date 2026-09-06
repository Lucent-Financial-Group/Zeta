/**
 * Falsifiers for off-cluster bao PKCS#11 init against SoftHSM2.
 *
 * REFUTE:
 *   * PIN in the HCL.
 *   * seal "pkcs11" in Application.yaml.
 *   * Shamir unseal keys counting as the PKCS#11 claim.
 *   * The Alpine musl image being this job's proof.
 *   * A seal stanza without a module.
 *   * skip-if-absent / continue-on-error on the workflow.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CI_KEY_LABEL,
  CI_TOKEN_LABEL,
  OPENBAO_HSM_LINUX_AMD64_TAR,
  OPENBAO_HSM_VERSION,
  alpineImageIsThisJobsProof,
  baoHsmPinEnv,
  baoOperatorInitArgv,
  classifyPkcs11Init,
  committedChartMayGainPkcs11Seal,
  hclContainsPinAssignment,
  offClusterPkcs11Hcl,
  openbaoHsmTarForArch,
  parsePkcs11InitOutput,
  pickSoftHsmModule,
  pinMustBeEnvNotHcl,
  pkcs11ToolAesKeygenArgv,
  refuseInitMaterialInServerLog,
  refuseSealInApplicationYaml,
  sha256Hex,
  sha256Matches,
  softhsmCanWitnessOffClusterInit,
} from "./seal-emulator-bao.ts";
import { skipIfAbsentCannotWearPass } from "./unseal-path.ts";
import { hclHasPkcs11Seal } from "./seal-emulator-rung.ts";

const REPO = join(import.meta.dir, "..", "..", "..");
const WORKFLOW = join(REPO, ".github", "workflows", "seal-emulator-bao.yml");
const OPENBAO_APP = join(REPO, "full-ai-cluster", "k8s", "applications", "openbao", "Application.yaml");

const HCL = offClusterPkcs11Hcl({
  modulePath: "/usr/lib/x86_64-linux-gnu/softhsm/libsofthsm2.so",
  storagePath: "/tmp/bao-data",
  listenAddr: "127.0.0.1:8200",
});

describe("offClusterPkcs11Hcl — PKCS#11, no PIN, AES-GCM", () => {
  test("declares seal pkcs11 with SoftHSM lib and AES-GCM", () => {
    expect(HCL).toContain('seal "pkcs11"');
    expect(HCL).toContain("libsofthsm2.so");
    expect(HCL).toContain("CKM_AES_GCM");
    expect(HCL).toContain(CI_TOKEN_LABEL);
    expect(HCL).toContain(CI_KEY_LABEL);
  });

  test("PIN is not in the HCL", () => {
    expect(hclContainsPinAssignment(HCL)).toBe(false);
    expect(pinMustBeEnvNotHcl(HCL)).toBe(true);
    expect(baoHsmPinEnv().BAO_HSM_PIN).toBe("1234");
  });
});

describe("classifyPkcs11Init — Shamir unseal keys fail the claim", () => {
  test("recovery keys + root token, no unseal keys → ok", () => {
    const json = JSON.stringify({
      root_token: "s.abc",
      recovery_keys_b64: ["r1", "r2"],
    });
    const r = classifyPkcs11Init(json, true);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.recoveryKeyCount).toBe(2);
  });

  test("Shamir unseal keys → shamir-unseal-keys", () => {
    const json = JSON.stringify({
      root_token: "s.abc",
      unseal_keys_b64: ["u1", "u2", "u3"],
    });
    const r = classifyPkcs11Init(json, true);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("shamir-unseal-keys");
  });

  test("no module → seal-without-module even if JSON looks auto-unseal", () => {
    const json = JSON.stringify({ root_token: "s.abc", recovery_keys_b64: ["r1"] });
    const r = classifyPkcs11Init(json, false);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("seal-without-module");
  });

  test("garbage is unparseable", () => {
    const r = classifyPkcs11Init("not json", true);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("unparseable");
  });

  test("parse keeps recovery and unseal arrays distinct", () => {
    const p = parsePkcs11InitOutput(
      JSON.stringify({ root_token: "s.x", recovery_keys_b64: ["r"], unseal_keys_b64: [] }),
    );
    expect(p?.unsealKeysB64).toEqual([]);
    expect(p?.recoveryKeysB64).toEqual(["r"]);
  });

  test("live OpenBao v2.6.2 shape: empty unseal_keys_b64 is not Shamir", () => {
    const json = JSON.stringify({
      root_token: "s.abc",
      recovery_keys_b64: ["r1"],
      unseal_keys_b64: [],
      unseal_keys_hex: [],
    });
    const r = classifyPkcs11Init(json, true);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.recoveryKeyCount).toBe(1);
  });
});

describe("bao operator init argv is recovery, not Shamir key-shares", () => {
  test("uses recovery-shares and json; does not pass -key-shares", () => {
    const argv = baoOperatorInitArgv();
    expect(argv).toContain("operator");
    expect(argv).toContain("init");
    expect(argv).toContain("-recovery-shares=1");
    expect(argv).toContain("-format=json");
    expect(argv.join(" ")).not.toContain("-key-shares");
  });
});

describe("refuseInitMaterialInServerLog", () => {
  test("ok when the log only says a token was generated", () => {
    const json = JSON.stringify({ root_token: "s.secret-token", recovery_keys_b64: ["r-secret"] });
    expect(() => refuseInitMaterialInServerLog("core: root token generated\n", json)).not.toThrow();
  });

  test("fails if the root token is in the server log", () => {
    const json = JSON.stringify({ root_token: "s.secret-token", recovery_keys_b64: ["r-secret"] });
    expect(() => refuseInitMaterialInServerLog("token=s.secret-token\n", json)).toThrow(/root token leaked/);
  });
});

describe("Application.yaml is not this job", () => {
  test("refuseSealInApplicationYaml catches the OpenBao Application path", () => {
    expect(refuseSealInApplicationYaml("full-ai-cluster/k8s/applications/openbao/Application.yaml").ok).toBe(false);
    expect(refuseSealInApplicationYaml("/tmp/bao-ci.hcl").ok).toBe(true);
  });

  test("today's OpenBao Application.yaml still has no pkcs11 seal", () => {
    const yaml = readFileSync(OPENBAO_APP, "utf8");
    expect(committedChartMayGainPkcs11Seal(yaml, false)).toBe(true);
    expect(hclHasPkcs11Seal(yaml)).toBe(false);
  });

  test("a pkcs11 stanza is refused without a module in the image", () => {
    expect(committedChartMayGainPkcs11Seal('seal "pkcs11" {\n  lib = "/x"\n}\n', false)).toBe(false);
    expect(committedChartMayGainPkcs11Seal('seal "pkcs11" {\n  lib = "/x"\n}\n', true)).toBe(true);
  });
});

describe("asset pin — glibc tarball, not the musl image", () => {
  test("version matches Otto's chart appVersion", () => {
    expect(OPENBAO_HSM_VERSION).toBe("2.6.2");
    expect(OPENBAO_HSM_LINUX_AMD64_TAR.url).toContain("v2.6.2");
    expect(OPENBAO_HSM_LINUX_AMD64_TAR.sha256).toHaveLength(64);
  });

  test("arm64 is a different pin", () => {
    const arm = openbaoHsmTarForArch("arm64");
    const amd = openbaoHsmTarForArch("x64");
    expect(arm.sha256).not.toBe(amd.sha256);
    expect(arm.filename).toContain("arm64");
  });

  test("sha256Matches is exact", () => {
    const bytes = new TextEncoder().encode("zeta");
    const hex = sha256Hex(bytes);
    expect(hex).toHaveLength(64);
    expect(sha256Matches(bytes, hex)).toBe(true);
    expect(sha256Matches(bytes, "0".repeat(64))).toBe(false);
  });

  test("Alpine image is not this job's proof", () => {
    expect(alpineImageIsThisJobsProof()).toBe(false);
  });

  test("SoftHSM can witness openbao-inits-without-shamir", () => {
    expect(softhsmCanWitnessOffClusterInit()).toBe(true);
  });
});

describe("pkcs11-tool creates the wrap key before init", () => {
  test("argv is keygen AES-256, not operator init", () => {
    const argv = pkcs11ToolAesKeygenArgv("/usr/lib/softhsm/libsofthsm2.so");
    expect(argv).toContain("--keygen");
    expect(argv).toContain("aes:32");
    expect(argv).toContain(CI_KEY_LABEL);
    expect(argv.join(" ")).not.toContain("operator init");
  });

  test("pickSoftHsmModule sees Ubuntu amd64 path", () => {
    expect(pickSoftHsmModule((p) => p.includes("x86_64-linux-gnu"))).toContain("libsofthsm2.so");
    expect(pickSoftHsmModule(() => false)).toBeUndefined();
  });
});

describe("workflow — installs, downloads pinned glibc bao, never skip-pass", () => {
  const yml = readFileSync(WORKFLOW, "utf8");
  const executable = yml
    .split("\n")
    .filter((line) => {
      const t = line.trimStart();
      return t.length > 0 && !t.startsWith("#");
    })
    .join("\n");

  test("skip-if-absent cannot wear pass", () => {
    expect(skipIfAbsentCannotWearPass()).toBe(false);
    expect(executable).not.toMatch(/continue-on-error\s*:/);
    expect(executable).not.toContain("|| true");
    expect(executable).not.toContain("skip-if-absent");
  });

  test("apt installs softhsm2 and opensc; downloads the pinned tarball", () => {
    expect(yml).toContain("softhsm2");
    expect(yml).toContain("opensc");
    expect(yml).toContain(OPENBAO_HSM_LINUX_AMD64_TAR.sha256);
    expect(yml).toContain("openbao-hsm_2.6.2_linux_amd64.tar.gz");
    expect(yml).toContain("bao operator init");
    expect(yml).toContain("BAO_HSM_PIN");
    expect(yml).toContain("seal-emulator-bao.ts");
    expect(yml).toContain("--run");
  });

  test("does not edit Application.yaml or the Alpine image as the proof", () => {
    expect(yml).not.toContain("valuesObject");
    expect(yml).not.toContain("quay.io/openbao/openbao-hsm");
    expect(yml).not.toMatch(/full-ai-cluster\/k8s\/applications\/openbao/);
  });

  test("permissions contents:read; actions SHA-pinned", () => {
    expect(yml).toMatch(/permissions:\s*\n\s+contents:\s+read/);
    expect(yml).toMatch(/actions\/checkout@[0-9a-f]{40}/);
    expect(yml).toMatch(/oven-sh\/setup-bun@[0-9a-f]{40}/);
  });
});
