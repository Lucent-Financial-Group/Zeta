/**
 * _patch_revfix.ts — one-shot patch script for slice-6 review fixes.
 * Applies exactly-1-occurrence anchor assertions before each replacement.
 * Run: bun tools/ace/_patch_revfix.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function assertExactlyOne(content: string, anchor: string, label: string): void {
  const count = content.split(anchor).length - 1;
  if (count !== 1) {
    throw new Error(`[${label}] expected exactly 1 occurrence of anchor, got ${count}.\nAnchor: ${JSON.stringify(anchor)}`);
  }
}

// ---- Fix 1 (P1-A): already applied; verify marker present ----

const skillPath = join(import.meta.dirname!, "..", "..", ".claude", "skills", "ace", "SKILL.md");
const skillContent = readFileSync(skillPath, "utf8");
const fix1Marker = "skips the *registry* network";
if (!skillContent.includes(fix1Marker)) {
  throw new Error("Fix1 marker not found in SKILL.md — re-apply manually");
}
console.log("Fix 1 verified in SKILL.md");

// ---- Fix 2 (P2-B): add update --offline integration test to ace.test.ts ----

const testPath = join(import.meta.dirname!, "ace.test.ts");
const testContent = readFileSync(testPath, "utf8");

// Skip if already applied.
if (testContent.includes("update --offline uses cached registry-index")) {
  console.log("Fix 2 already applied: skipping test rewrite");
  process.exit(0);
}

const testAnchor = '  test("--offline + --frozen parse OK together", () => {\n' +
  '    expect("error" in parseArgs(["install", "x.json", "--offline", "--frozen"])).toBe(false);\n' +
  '  });\n' +
  '});';

assertExactlyOne(testContent, testAnchor, "Fix2-anchor");

const newTestBlock = `  test("--offline + --frozen parse OK together", () => {
    expect("error" in parseArgs(["install", "x.json", "--offline", "--frozen"])).toBe(false);
  });

  // ---- update --offline: uses cached registry-index, still fetches package artifacts ----

  test("update --offline uses cached registry-index (no index fetch) + writes lockfile", async () => {
    // Setup: a signed remote index + signed package, mirroring the install test above.
    const idxKp = gkpA(); const now = Date.now();
    const files = { "leaf.txt": "hi" };
    const ch = contentHash(new TextEncoder().encode(JSON.stringify(files)));
    const pkgKp = generateKeypair();
    const m = { format_version: 1, name: "leaf", version: "1.0.0", content_hash: ch };
    const pkg = { manifest: { ...m, signature: signManifest(m, pkgKp.privatePem) }, files };
    const pkgJson = JSON.stringify(pkg);
    const pkgHash = packageHash(pkg as unknown as Parameters<typeof packageHash>[0]);
    const pkgUrl = "https://pkgs/leaf-1.0.0.json";
    const idxUrl = "https://x/index.json";
    const idxContent = { format_version: 1 as const, sequence: 1, issued_at: new Date(now).toISOString(),
      packages: { leaf: { "1.0.0": { url: pkgUrl, package_hash: pkgHash } } } };
    const idxJson = JSON.stringify({ ...idxContent, signature: sidxA(idxContent, idxKp.privatePem) });

    // Trust both keys and register the remote.
    await main(["trust", "add", idxKp.publicSpkiB64]);
    await main(["trust", "add", pkgKp.publicSpkiB64]);
    await main(["registry", "remote", "add", idxUrl, "--key", idxKp.keyId]);

    // Build a root with a registry dep on "leaf".
    const root = { manifest: { format_version: 1, name: "root", version: "1.0.0",
      content_hash: contentHash(new TextEncoder().encode(JSON.stringify({ "r.txt": "r" }))),
      dependencies: [{ kind: "registry", name: "leaf", version: "^1.0.0" }] }, files: { "r.txt": "r" } };
    const rootPath = join(tempHome, "root.json"); writeFileSync(rootPath, JSON.stringify(root));
    const lockPath = join(tempHome, "ace.lock");

    // === PASS 1 (ONLINE): prime the registry-index cache ===
    // fetch serves both the index URL and the package URL.
    globalThis.fetch = (async (u: string) =>
      new Response(u === pkgUrl ? pkgJson : idxJson, { status: 200 })) as unknown as typeof fetch;
    const onlineCode = await main(["update", rootPath, "--lockfile", lockPath, "--allow-no-signature"]);
    expect(onlineCode).toBe(0);
    expect(existsSync(lockPath)).toBe(true);

    // === FALSE-GREEN CHECK: wipe the registry-cache + confirm offline update then fails ===
    // Without a cached index, --offline cannot resolve registry deps.
    const { rmSync } = await import("node:fs");
    const { registryCacheDir } = await import("./store.ts");
    rmSync(registryCacheDir(), { recursive: true, force: true });
    rmSync(lockPath, { force: true });
    // Fetch throws for everything — no index cache, offline update cannot resolve.
    globalThis.fetch = (() => { throw new Error("network disabled"); }) as unknown as typeof fetch;
    const failCode = await main(["update", rootPath, "--lockfile", lockPath, "--allow-no-signature", "--offline"]);
    expect(failCode).not.toBe(0); // no cache -> must fail (false-green check)

    // === PASS 2 (OFFLINE): restore cache via online pass, then confirm offline succeeds ===
    // Re-prime the cache with a fresh online pass.
    globalThis.fetch = (async (u: string) =>
      new Response(u === pkgUrl ? pkgJson : idxJson, { status: 200 })) as unknown as typeof fetch;
    expect(await main(["update", rootPath, "--lockfile", lockPath, "--allow-no-signature"])).toBe(0);
    // Block only the INDEX url; package URL still served (--offline skips registry network).
    globalThis.fetch = (async (u: string) => {
      if (u === idxUrl) throw new Error("registry unreachable");
      return new Response(pkgJson, { status: 200 });
    }) as unknown as typeof fetch;
    const offlineCode = await main(["update", rootPath, "--lockfile", lockPath, "--allow-no-signature", "--offline"]);
    expect(offlineCode).toBe(0); // cached index used; update writes lock
    // Lockfile must pin leaf@1.0.0 from the cached registry resolution.
    const lf = parseLockfile(readFileSync(lockPath, "utf8"));
    expect("error" in lf).toBe(false);
    if (!("error" in lf)) {
      expect(lf.nodes.map((n) => \`\${n.name}@\${n.version}\`)).toEqual(["leaf@1.0.0"]);
    }
  });
});`;

const testFixed = testContent.replace(testAnchor, newTestBlock);
assertExactlyOne(testFixed, "update --offline uses cached registry-index", "Fix2-new-test-present");
writeFileSync(testPath, testFixed, "utf8");
console.log("Fix 2 applied: added update --offline integration test to ace.test.ts");
