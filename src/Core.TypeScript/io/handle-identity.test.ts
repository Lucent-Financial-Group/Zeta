// src/Core.TypeScript/io/handle-identity.test.ts
//
// The falsifiers. The one that matters is the LAST one: two files with identical bytes must
// compare `different`, because the whole point of the helper is to catch a read-back that
// verified the wrong object and reported a pass. A content check cannot see that; this can.

import { describe, expect, test } from "bun:test";
import { closeSync, linkSync, mkdtempSync, openSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compareHandleIdentity, describeHandleIdentity, handleIdentity } from "./handle-identity.ts";

function scratch(): string {
  return mkdtempSync(join(tmpdir(), "handle-identity-"));
}

describe("handle-identity", () => {
  test("two descriptors on TWO NAMES of one inode compare same — identity is the object, not the path", () => {
    // THIS WAS TWO `openSync` CALLS ON ONE PATH, and CodeQL was right to report it
    // (`js/file-system-race`, alert #961). Unlike the `zflash` read-backs, the second open here
    // was not the assertion -- it was just a second descriptor -- so there was a narrowing
    // available and no by-design argument to make. It is my own test harness carrying the exact
    // shape this PR exists to remove, and leaving it would have been the rule applying to
    // everyone else's code.
    //
    // A HARD LINK IS THE FIX AND IT IS ALSO THE BETTER TEST. Two distinct names for one inode
    // means no path is opened twice, and the assertion now says what the helper actually
    // promises: identity is a property of the OBJECT, not of the string used to reach it. The
    // old version could not tell those apart.
    //
    // `linkSync` is not guarded: both TS test legs run on `ubuntu-24.04` (ext4), where hard
    // links always work. An unexpected filesystem makes this fail loudly with a real errno,
    // which is the right outcome -- a silent skip here would be a check that did not run.
    const dir = scratch();
    try {
      const original = join(dir, "a.bin");
      const alias = join(dir, "b.bin");
      writeFileSync(original, "same bytes");
      linkSync(original, alias);
      const a = openSync(original, "r");
      const b = openSync(alias, "r");
      try {
        expect(compareHandleIdentity(handleIdentity(a), handleIdentity(b))).toBe("same");
      } finally {
        closeSync(a);
        closeSync(b);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("TWO FILES WITH IDENTICAL BYTES compare different — the case a content check cannot see", () => {
    // The other half of the pair above: same bytes, different inode -> `different`. Together the
    // two pin that the verdict tracks the inode and nothing else -- not the path, not the bytes.
    // MUTANT: make `compareHandleIdentity` return "same" whenever `a.known && b.known`.
    // Every byte-level assertion in the tree still passes and this one goes red, which is the
    // whole reason the helper exists.
    const dir = scratch();
    try {
      const one = join(dir, "one.bin");
      const two = join(dir, "two.bin");
      writeFileSync(one, "identical");
      writeFileSync(two, "identical");
      const a = openSync(one, "r");
      const b = openSync(two, "r");
      try {
        expect(compareHandleIdentity(handleIdentity(a), handleIdentity(b))).toBe("different");
      } finally {
        closeSync(a);
        closeSync(b);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("a descriptor that says nothing is UNKNOWN, never a match", () => {
    // MUTANT: drop the `known` guard from `compareHandleIdentity` so two zeroed identities
    // compare equal. This assertion goes red — and that mutant is exactly the vacuity the
    // third register exists to refuse: a raw device handle reporting (0, 0) would then
    // "verify" against anything.
    const silent = { dev: 0, ino: 0, known: false };
    const real = { dev: 42, ino: 7, known: true };
    expect(compareHandleIdentity(silent, silent)).toBe("unknown");
    expect(compareHandleIdentity(silent, real)).toBe("unknown");
    expect(compareHandleIdentity(real, silent)).toBe("unknown");
    expect(compareHandleIdentity(real, { dev: 42, ino: 7, known: true })).toBe("same");
  });

  test("a closed descriptor reports unknown rather than throwing", () => {
    const dir = scratch();
    try {
      const path = join(dir, "c.bin");
      writeFileSync(path, "x");
      const fd = openSync(path, "r");
      closeSync(fd);
      expect(handleIdentity(fd).known).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("the log rendering names the unknown case out loud", () => {
    expect(describeHandleIdentity({ dev: 0, ino: 0, known: false })).toBe("identity-unavailable");
    expect(describeHandleIdentity({ dev: 3, ino: 9, known: true })).toBe("dev=3 ino=9");
  });
});
