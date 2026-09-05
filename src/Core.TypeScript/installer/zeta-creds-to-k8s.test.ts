// zeta-creds-to-k8s.test.ts — 081M1PWSF56087G0R000FDS3NY lock tests.
//
// Falsifiers, not snapshots:
//   - a new DEFAULT_MANIFEST id without a classification fails
//   - host-only ids never become Secrets even when files exist
//   - dry-run / summary output never carries credential bytes
//   - apply is skipped when nothing projectable is on disk
//   - apply is refused when the API is not ready
import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_MANIFEST } from "./zeta-creds-manifest";
import {
  applyPlan,
  classifyCredId,
  collectRestoredFiles,
  CLUSTER_PROJECTABLE_CRED_IDS,
  DEFAULT_NAMESPACE,
  formatSummary,
  HOST_ONLY_CRED_IDS,
  parseArgs,
  planHostCredDocuments,
  READER_SERVICE_ACCOUNT,
  secretNameFor,
  unclassifiedManifestIds,
} from "./zeta-creds-to-k8s";

const SECRET = "ghp_THIS_MUST_NEVER_APPEAR_IN_LOGS";
const CLAUDE = '{"token":"sk-ant-NEVER-LOG-THIS"}';
const GEMINI = "gemini-oauth-secret";
const CODEX = "codex-auth-secret";

function expectedFixtureSummary(): string {
  return [
    "zeta-creds-to-k8s: applying 4 secrets in zeta-host-creds",
    `  Secret zeta-host-cred-gh-cli (1 keys, ${Buffer.byteLength(SECRET)} bytes)`,
    `  Secret zeta-host-cred-claude (1 keys, ${Buffer.byteLength(CLAUDE)} bytes)`,
    `  Secret zeta-host-cred-gemini (1 keys, ${Buffer.byteLength(GEMINI)} bytes)`,
    `  Secret zeta-host-cred-codex (1 keys, ${Buffer.byteLength(CODEX)} bytes)`,
    "  SKIP ssh-host-keys: host-only (not cluster-projectable)",
    "  SKIP ssh-operator-pubkey: host-only (not cluster-projectable)",
    "  SKIP wifi: host-only (not cluster-projectable)",
    "  SKIP install-answers: host-only (not cluster-projectable)",
  ].join("\n");
}

function fixtureHome(): string {
  const home = mkdtempSync(join(tmpdir(), "zeta-host-creds-"));
  mkdirSync(join(home, ".config", "gh"), { recursive: true });
  mkdirSync(join(home, ".config", "claude"), { recursive: true });
  mkdirSync(join(home, ".gemini"), { recursive: true });
  mkdirSync(join(home, ".codex"), { recursive: true });
  mkdirSync(join(home, "etc", "ssh"), { recursive: true });
  writeFileSync(join(home, ".config", "gh", "hosts.yml"), SECRET);
  writeFileSync(join(home, ".config", "claude", "credentials.json"), CLAUDE);
  writeFileSync(join(home, ".gemini", "oauth_creds.json"), GEMINI);
  writeFileSync(join(home, ".codex", "auth.json"), CODEX);
  writeFileSync(join(home, "etc", "ssh", "ssh_host_ed25519_key"), "ssh-host-private-key");
  mkdirSync(join(home, "etc", "NetworkManager", "system-connections"), { recursive: true });
  writeFileSync(
    join(home, "etc", "NetworkManager", "system-connections", "home.nmconnection"),
    "psk=wifi-psk-must-not-project",
  );
  return home;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

describe("classification lock", () => {
  it("every DEFAULT_MANIFEST id is projectable or host-only", () => {
    expect(unclassifiedManifestIds(DEFAULT_MANIFEST)).toEqual([]);
  });

  it("the four harness logins are projectable", () => {
    for (const id of ["gh-cli", "claude", "gemini", "codex"]) {
      expect(classifyCredId(id)).toBe("projectable");
      expect(CLUSTER_PROJECTABLE_CRED_IDS).toContain(id);
    }
  });

  it("wifi, ssh, and install-answers stay host-only", () => {
    for (const id of ["wifi", "ssh-host-keys", "ssh-operator-pubkey", "install-answers"]) {
      expect(classifyCredId(id)).toBe("host-only");
      expect(HOST_ONLY_CRED_IDS).toContain(id);
    }
  });

  it("an unknown id is unclassified (refuse, do not project)", () => {
    expect(classifyCredId("1password-personal")).toBe("unclassified");
  });
});

describe("planHostCredDocuments", () => {
  it("projects only allowlisted files as Opaque Secrets", () => {
    const home = fixtureHome();
    const plan = planHostCredDocuments({ home, persona: "riven" });
    expect(plan.projectedIds).toEqual(["gh-cli", "claude", "gemini", "codex"]);
    expect(plan.secrets).toHaveLength(4);
    for (const secret of plan.secrets) {
      expect(secret.kind).toBe("Secret");
      expect(secret.type).toBe("Opaque");
      expect(secret.metadata.namespace).toBe(DEFAULT_NAMESPACE);
      expect(isRecord(secret.data)).toBe(true);
    }
    const gh = plan.secrets.find((s) => s.metadata.name === secretNameFor("gh-cli"));
    expect(gh).toBeDefined();
    const data = gh!.data as Record<string, string>;
    expect(Buffer.from(data["hosts.yml"]!, "base64").toString("utf8")).toBe(SECRET);
    expect(gh!.metadata.labels?.["zeta.io/persona"]).toBe("riven");
  });

  it("never projects host-only creds even when those files exist", () => {
    const home = fixtureHome();
    const plan = planHostCredDocuments({ home });
    expect(plan.secrets.map((s) => s.metadata.name)).toEqual([
      "zeta-host-cred-gh-cli",
      "zeta-host-cred-claude",
      "zeta-host-cred-gemini",
      "zeta-host-cred-codex",
    ]);
    expect(plan.skipped).toEqual([
      { id: "ssh-host-keys", reason: "host-only (not cluster-projectable)" },
      { id: "ssh-operator-pubkey", reason: "host-only (not cluster-projectable)" },
      { id: "wifi", reason: "host-only (not cluster-projectable)" },
      { id: "install-answers", reason: "host-only (not cluster-projectable)" },
    ]);
  });

  it("skips a missing projectable file instead of inventing a Secret", () => {
    const home = mkdtempSync(join(tmpdir(), "zeta-host-creds-empty-"));
    const plan = planHostCredDocuments({ home });
    expect(plan.secrets).toHaveLength(0);
    expect(plan.projectedIds).toEqual([]);
    expect(plan.skipped.some((s) => s.id === "gh-cli" && s.reason.includes("missing"))).toBe(true);
  });

  it("creates Namespace, ServiceAccount, Role, and RoleBinding scaffolding", () => {
    const plan = planHostCredDocuments({ home: mkdtempSync(join(tmpdir(), "zeta-host-creds-scaf-")) });
    const kinds = plan.documents.map((d) => `${d.kind}/${d.metadata.name}`);
    expect(kinds).toContain(`Namespace/${DEFAULT_NAMESPACE}`);
    expect(kinds).toContain(`ServiceAccount/${READER_SERVICE_ACCOUNT}`);
    expect(kinds).toContain("Role/zeta-host-cred-reader");
    expect(kinds).toContain("RoleBinding/zeta-host-cred-reader");
  });

  it("collectRestoredFiles never emits host-only ids", () => {
    const home = fixtureHome();
    const collected = collectRestoredFiles(home);
    expect(collected.files.map((f) => f.id)).toEqual(["gh-cli", "claude", "gemini", "codex"]);
  });

  it("skips a projectable path that is a directory (EISDIR, not a prior exists/lstat)", () => {
    const home = mkdtempSync(join(tmpdir(), "zeta-host-creds-dir-"));
    mkdirSync(join(home, ".config", "gh", "hosts.yml"), { recursive: true });
    const collected = collectRestoredFiles(home);
    const gh = collected.skipped.find((s) => s.id === "gh-cli");
    expect(gh).toEqual({ id: "gh-cli", reason: "source is a directory, not a file" });
    expect(collected.files.map((f) => f.id)).not.toContain("gh-cli");
  });

  it("skips an unreadable projectable file from the read's errno, not a prior check", () => {
    const home = fixtureHome();
    const collected = collectRestoredFiles(home, (path) => {
      if (path.endsWith("hosts.yml")) return { kind: "unreadable" };
      return { kind: "bytes", bytes: Buffer.from("ok") };
    });
    const gh = collected.skipped.find((s) => s.id === "gh-cli");
    expect(gh?.reason.startsWith("unreadable ")).toBe(true);
    expect(collected.files.map((f) => f.id)).not.toContain("gh-cli");
  });
});

describe("formatSummary never leaks credential bytes", () => {
  it("omits plaintext and base64 of projected files", () => {
    const home = fixtureHome();
    const plan = planHostCredDocuments({ home });
    expect(formatSummary(plan)).toBe(expectedFixtureSummary());
  });
});

describe("applyPlan", () => {
  it("does not call apply when there are no secrets", () => {
    let applyCalls = 0;
    const plan = planHostCredDocuments({ home: mkdtempSync(join(tmpdir(), "zeta-host-creds-none-")) });
    const result = applyPlan(plan, {
      apiReady: () => true,
      applyJson: () => {
        applyCalls += 1;
        return { ok: true };
      },
    });
    expect(result.ok).toBe(true);
    expect(applyCalls).toBe(0);
  });

  it("fails closed with code 3 when the API is not ready", () => {
    const home = fixtureHome();
    const plan = planHostCredDocuments({ home });
    const result = applyPlan(plan, {
      apiReady: () => false,
      applyJson: () => ({ ok: true }),
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.code).toBe(3);
  });

  it("applies a List whose Secret items are Opaque and namespaced", () => {
    const home = fixtureHome();
    const plan = planHostCredDocuments({ home });
    let payload = "";
    const result = applyPlan(plan, {
      apiReady: () => true,
      applyJson: (json) => {
        payload = json;
        return { ok: true };
      },
    });
    expect(result.ok).toBe(true);
    const list = JSON.parse(payload) as { kind: string; items: Array<Record<string, unknown>> };
    expect(list.kind).toBe("List");
    const secrets = list.items.filter((item) => item.kind === "Secret");
    expect(secrets.length).toBe(4);
    for (const secret of secrets) {
      expect(secret.type).toBe("Opaque");
      const metadata = secret.metadata as { namespace: string };
      expect(metadata.namespace).toBe(DEFAULT_NAMESPACE);
    }
    expect(payload).toContain(Buffer.from(SECRET).toString("base64"));
  });

  it("surfaces apply failure as code 4", () => {
    const home = fixtureHome();
    const plan = planHostCredDocuments({ home });
    const result = applyPlan(plan, {
      apiReady: () => true,
      applyJson: () => ({ ok: false, error: "server rejected" }),
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.code).toBe(4);
    expect(result.error).toBe("server rejected");
  });
});

describe("parseArgs", () => {
  it("requires --home", () => {
    const result = parseArgs(["--namespace", "x"]);
    expect("error" in result).toBe(true);
  });

  it("rejects unknown flags", () => {
    const result = parseArgs(["--home", "/home/zeta", "--bake-cred", "x"]);
    expect("error" in result).toBe(true);
  });

  it("accepts well-formed args", () => {
    const result = parseArgs(["--home", "/home/zeta", "--persona", "riven", "--dry-run"]);
    if ("error" in result) throw new Error(result.error);
    expect(result.home).toBe("/home/zeta");
    expect(result.persona).toBe("riven");
    expect(result.dryRun).toBe(true);
    expect(result.namespace).toBe(DEFAULT_NAMESPACE);
  });
});

describe("CLI dry-run", () => {
  it("prints names and byte counts, never credential bytes, and exits 0", () => {
    const home = fixtureHome();
    const script = fileURLToPath(new URL("./zeta-creds-to-k8s.ts", import.meta.url));
    const result = spawnSync("bun", [script, "--home", home, "--dry-run"], { encoding: "utf8" });
    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toBe(`${expectedFixtureSummary()}\n`);
  });
});
