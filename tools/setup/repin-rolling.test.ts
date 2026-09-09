// repin-rolling.test.ts — the pure halves of the rolling re-pin.
//
// The network fetch and the re-measure spawn are not exercised here: one needs
// GitHub and the other needs a JVM and twenty minutes. What IS exercised is
// every place the tool REWRITES the tree, because a re-pin that silently edits
// the wrong bytes is worse than one that refuses.
import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  assertHttpsUrl,
  deriveIdentity,
  fetchToBuffer,
  identityFromSurfaces,
  identityPattern,
  receiptRow,
  rewriteManifestRow,
  sha256Of,
  stageVerifiedWrite,
  substituteAll,
} from "./repin-rolling.ts";

const OLD = "a".repeat(64);
const NEW = "b".repeat(64);
const DEST = "src/Core.TLA/tla2tools.jar";

describe("substituteAll", () => {
  test("replaces every occurrence and counts them", () => {
    const result = substituteAll(`${OLD} and ${OLD}`, [[OLD, NEW]]);
    expect(result.text).toBe(`${NEW} and ${NEW}`);
    expect(result.replacements).toBe(2);
  });

  // A pin surface that matched NOTHING is the finding the tool refuses on: it
  // means the row's pinsurfaces= list has drifted from where the digest lives,
  // and a re-pin that "succeeded" against it would leave a half re-pin behind.
  test("reports zero when nothing matched", () => {
    expect(substituteAll("no digests here", [[OLD, NEW]]).replacements).toBe(0);
  });

  test("an empty or identity pair is a no-op rather than a corruption", () => {
    expect(substituteAll("text", [["", NEW]]).text).toBe("text");
    expect(substituteAll("text", [[OLD, OLD]]).replacements).toBe(0);
  });
});

describe("rewriteManifestRow", () => {
  const manifest =
    `# ${DEST} was pinned at sha256=${OLD} on some earlier date\n` +
    `other/dest  https://example.invalid/x  sha256=${OLD}\n` +
    `${DEST}  https://example.invalid/y  sha256=${OLD}  rolling=t\n`;

  test("moves the digest on the named row only", () => {
    const out = rewriteManifestRow(manifest, DEST, OLD, NEW);
    expect(out).toContain(`${DEST}  https://example.invalid/y  sha256=${NEW}`);
    expect(out).toContain(`other/dest  https://example.invalid/x  sha256=${OLD}`);
  });

  // Comments carry the MEASUREMENT history -- rewriting a digest inside one
  // would silently falsify the record of what was measured when. It holds
  // because a comment's first token is never the bare dest, which is also why
  // rewriteManifestRow carries no SEPARATE comment guard: one was written, and
  // it survived mutation, i.e. it could not change any outcome.
  test("leaves comments alone", () => {
    expect(rewriteManifestRow(manifest, DEST, OLD, NEW)).toContain(
      `# ${DEST} was pinned at sha256=${OLD} on some earlier date`,
    );
  });

  test("refuses when there is no row for the dest", () => {
    expect(() => rewriteManifestRow(manifest, "nope/x.jar", OLD, NEW)).toThrow("has no row for");
  });
});

describe("receiptRow", () => {
  test("emits every field the lint demands, in the ledger's format", () => {
    const row = receiptRow(DEST, NEW, "2026-09-09", "a/b.ts:--all", "docs/cross-verify/x.md");
    expect(row).toBe(
      `${DEST}  sha256=${NEW}  measured=2026-09-09  result=pass  remeasure=a/b.ts:--all  evidence=docs/cross-verify/x.md`,
    );
  });

  // `result=pass` is not a parameter, and that is deliberate: the tool only ever
  // reaches this line after the re-measure exited 0, so there is no code path
  // that can write a receipt for a run that failed.
  test("result is always pass, because a failed run never gets this far", () => {
    expect(receiptRow(DEST, NEW, "2026-09-09", "x:y", "z")).toContain("result=pass");
  });
});

describe("deriveIdentity", () => {
  test("a row with no identity= asks for nothing and gets null", () => {
    expect(deriveIdentity(undefined, "/nonexistent/does-not-matter.jar")).toBeNull();
    expect(deriveIdentity("", "/nonexistent/does-not-matter.jar")).toBeNull();
  });

  // Against a REAL jar, so the refusal is the identity check firing rather than
  // the file read failing -- otherwise the assertion passes for the wrong reason
  // and a tool that silently guessed an identity would still look tested.
  test("an unknown identity kind is refused rather than guessed", () => {
    const jar = join(process.cwd(), "src/Core.TLA/tla2tools.jar");
    if (!existsSync(jar)) return; // fetched jar; a probe that cannot run is unknown
    expect(deriveIdentity("jar-tlc", jar)).toContain("(rev:");
    expect(() => deriveIdentity("jar-something-else", jar)).toThrow("unknown identity=");
  });
});

describe("stageVerifiedWrite", () => {
  // The write is staged and re-read before it is renamed into place: a short
  // write, a full disk, or a truncated body must never leave partial bytes at
  // the path a runner loads from. It verifies WHAT WE INTENDED TO WRITE landed,
  // and claims nothing about whether upstream sent the right bytes -- only the
  // re-measure says that.
  test("writes through a .part and leaves none behind", () => {
    const dir = mkdtempSync(join(tmpdir(), "repin-stage-"));
    const dest = join(dir, "thing.jar");
    const body = new TextEncoder().encode("payload");
    stageVerifiedWrite(dest, body, sha256Of(body));
    expect(readFileSync(dest, "utf8")).toBe("payload");
    expect(existsSync(dest + ".part")).toBe(false);
  });

  test("a digest that disagrees with the bytes refuses and leaves nothing at dest", () => {
    const dir = mkdtempSync(join(tmpdir(), "repin-stage-"));
    const dest = join(dir, "thing.jar");
    const body = new TextEncoder().encode("payload");
    expect(() => stageVerifiedWrite(dest, body, "0".repeat(64))).toThrow();
    expect(existsSync(dest)).toBe(false);
    expect(existsSync(dest + ".part")).toBe(false);
  });
});

describe("fetchToBuffer", () => {
  // A row's URL is file data, and "committed and reviewed" is a PROCESS claim --
  // this is the mechanical one. `realizeFromUrl` already refuses a non-HTTPS row;
  // this tool reads the same rows and had no such guard until CodeQL pointed at
  // the flow. The check runs BEFORE any request, so this test needs no network.
  test("a non-HTTPS row is refused before any request is made", async () => {
    await expect(fetchToBuffer("http://example.invalid/x.jar")).rejects.toThrow("HTTPS required");
    await expect(fetchToBuffer("file:///etc/passwd")).rejects.toThrow("HTTPS required");
  });

  test("the scheme is PARSED, not prefix-matched", () => {
    expect(assertHttpsUrl("HTTPS://Example.test/x.jar").protocol).toBe("https:");
    expect(() => assertHttpsUrl("httpsx://example.test/x.jar")).toThrow("HTTPS required");
    expect(() => assertHttpsUrl("not a url")).toThrow("not a URL");
  });
});

describe("sha256Of", () => {
  test("hashes bytes, not a path", () => {
    expect(sha256Of(new TextEncoder().encode("abc"))).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});

// ── identityFromSurfaces — added 081M24396B2087G0R000MDMDEA ──────────────────
//
// The regression this locks: on a tree with no previously-pinned bytes (cold CI
// cache, fresh clone, or an auto-accept having already replaced the artefact)
// the old identity used to come back `null`, the `versionBanner` restatement was
// never rewritten, and the re-measure failed six minutes later on a banner
// mismatch that said nothing about any model. MEASURED 2026-09-09: 52/52 models
// "failed" that way.
//
// MUTATION LOG (2026-09-09) — 3 mutants, 3 killed, MEASURED not asserted:
//   M1 `found.size === 1` -> `found.size >= 1`   KILLED — "two disagreeing surfaces refuse"
//   M2 jar-tlc pattern -> /TLC2 Version .*/       KILLED — 3 tests died, listed below
//   M3 `identityFromSurfaces` returns "" on miss  KILLED — "no identity in the surfaces is null"
//
// DECLARED CONTROLS (must SURVIVE all three): `substituteAll` and
// `rewriteManifestRow` — the rewrite paths this change does not touch. If either
// dies, a mutant reached past the unit it claims to be confined to.
//
// A CORRECTION, recorded rather than quietly fixed. The first control declared
// here was "CONTROL: a matching TLC banner is found verbatim", and MEASURING M2
// killed it along with two siblings. That was a bad control by construction: it
// exercises the very function M2 mutates, so it could never have been evidence of
// anything. A control has to live OUTSIDE the mutated unit, which is why the two
// above replaced it. The banner test is still a good FALSIFIER; it is simply not
// a control.
const TLC_A = "TLC2 Version 2026.09.09.162536 (rev: 4ad12e8)";
const TLC_B = "TLC2 Version 2026.09.09.213036 (rev: ede5b88)";

describe("identityFromSurfaces", () => {
  test("a matching TLC banner is found verbatim", () => {
    expect(identityFromSurfaces("jar-tlc", [`"versionBanner": "${TLC_A}",`])).toBe(TLC_A);
  });

  test("the same banner in several surfaces is one answer", () => {
    expect(identityFromSurfaces("jar-tlc", [`x ${TLC_A} y`, `z ${TLC_A}`])).toBe(TLC_A);
  });

  test("two disagreeing surfaces refuse rather than pick one", () => {
    expect(identityFromSurfaces("jar-tlc", [TLC_A, TLC_B])).toBeNull();
  });

  test("no identity in the surfaces is null", () => {
    expect(identityFromSurfaces("jar-tlc", ["nothing to see", ""])).toBeNull();
  });

  test("the pattern stops at the identity and does not swallow the line", () => {
    // Two hazards in one line: prose that says "TLC2 Version" without being one
    // (the registry's own `note` field does exactly this), and a greedy pattern
    // that would match from the first mention to the last and return a string
    // that substitutes nothing. The answer must be the banner, exactly.
    const line = `"versionBanner": "${TLC_A}", "note": "TLC2 Version is checked here"`;
    expect(identityFromSurfaces("jar-tlc", [line])).toBe(TLC_A);
    expect(identityPattern("jar-tlc").test(TLC_A)).toBe(true);
  });

  test("a NON-conforming version string is not an identity", () => {
    // `TLC2 2026.05.18.174321` -- the nci-witness-receipt spelling, no "Version".
    expect(identityFromSurfaces("jar-tlc", ["TLC2 2026.05.18.174321"])).toBeNull();
  });

  test("the alloy shape is recognised", () => {
    expect(identityFromSurfaces("jar-alloy", ["6.2.0.202501090818 (rev: v6.2.0)"]))
      .toBe("6.2.0.202501090818 (rev: v6.2.0)");
  });

  test("an unknown identity kind throws rather than returning null", () => {
    expect(() => identityFromSurfaces("jar-mystery", ["x"])).toThrow("unknown identity=");
  });
});
