// Falsifiers for the shard-name integrity audit.
//
// The specimen is real: a memory bit-flip put `...7803000<...` into a committed path on
// 2026-08-28 (PR #15007). These cases are built from that instance and from the flips it
// did NOT happen to produce, because a detector tuned to one observed corruption is a
// detector that catches one corruption.

import { describe, expect, test } from "bun:test";
import { auditShardPaths, checkShardPath } from "./audit-shard-name-integrity.ts";

const ok = "docs/github/prs/shards/015/08000000000000007803000000003a98.json";

describe("the invariant holds for well-formed shards", () => {
  test("0x3a98 = 15000 lives in 015", () => {
    expect(checkShardPath(ok)).toBeNull();
  });

  test("bucket boundaries are not off by one", () => {
    // 0x03e8 = 1000 -> bucket 001 ; 0x03e7 = 999 -> bucket 000
    expect(checkShardPath("docs/github/prs/shards/001/000000000000000000000000000003e8.json")).toBeNull();
    expect(checkShardPath("docs/github/prs/shards/000/000000000000000000000000000003e7.json")).toBeNull();
  });

  test("zero is bucket 000, not a special case", () => {
    expect(checkShardPath("docs/github/prs/shards/000/00000000000000000000000000000000.json")).toBeNull();
  });
});

describe("it catches the corruption shapes a bit flip actually produces", () => {
  test("THE OBSERVED FLIP — 0x30 '0' -> 0x3c '<' makes the basename non-hex", () => {
    const v = checkShardPath("docs/github/prs/shards/015/0800000000000000780300000000<a98.json");
    expect(v?.reason).toBe("non-hex-basename");
  });

  test("A FLIP THAT STAYS VALID HEX — 0x3a98 -> 0x3298 moves the implied bucket", () => {
    // This is the case hex-validity alone would MISS. 0x3298 = 12952 -> bucket 012.
    const v = checkShardPath("docs/github/prs/shards/015/08000000000000007803000000003298.json");
    expect(v?.reason).toBe("directory-mismatch");
    expect(v?.detail).toContain("012");
  });

  test("a flip in the DIRECTORY rather than the name is caught symmetrically", () => {
    const v = checkShardPath("docs/github/prs/shards/815/08000000000000007803000000003a98.json");
    expect(v?.reason).toBe("directory-mismatch");
  });

  test("uppercase hex is rejected — these names are generated lowercase", () => {
    // Not pedantry: a case change is a single-bit flip (0x61 vs 0x41).
    expect(checkShardPath("docs/github/prs/shards/015/08000000000000007803000000003A98.json")?.reason).toBe(
      "non-hex-basename",
    );
  });

  test("a truncated basename is reported rather than silently parsed", () => {
    expect(checkShardPath("docs/github/prs/shards/000/abc.json")?.reason).toBe("bad-length");
  });
});

describe("the batch surface", () => {
  test("THE CONTROL — a clean batch yields no violations, so a passing run is not vacuous", () => {
    // Without a clean case, a checker that returned a violation for EVERYTHING would satisfy
    // every test above.
    expect(auditShardPaths([ok, "docs/github/prs/shards/000/000000000000000000000000000003e7.json"])).toEqual([]);
  });

  test("it reports every violation, not just the first", () => {
    const v = auditShardPaths([
      ok,
      "docs/github/prs/shards/015/0800000000000000780300000000<a98.json",
      "docs/github/prs/shards/815/08000000000000007803000000003a98.json",
    ]);
    expect(v.length).toBe(2);
  });

  test("an empty batch is empty, not an error — the RUNNER refuses emptiness, not this function", () => {
    expect(auditShardPaths([])).toEqual([]);
  });
});
