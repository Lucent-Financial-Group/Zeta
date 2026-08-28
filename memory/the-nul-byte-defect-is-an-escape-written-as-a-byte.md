---
name: the-nul-byte-defect-is-an-escape-written-as-a-byte
description: Raw NUL bytes keep appearing in source because an agent intends a backslash-zero ESCAPE as a group separator and the write path emits the literal byte; reproduced first-hand 2026-08-27.
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 21d1a9c2-bd74-472a-abbe-cbd7e052b883
  modified: 2026-08-27T15:02:39.540Z
---

Three agents wrote literal NUL bytes into source in one week and the cause was an open
question. I reproduced it on myself on 2026-08-27 while writing
`src/Core.TypeScript/ci/perf-regression-ledger.ts` — two raw `0x00` bytes at offsets 8015
and 8244, in a template literal meant to join a group key.

**Mechanism.** The *intent* is a NUL group separator, and that intent is reasonable: test
names contain spaces and punctuation, so any printable separator can collide. The author
writes the two-character escape meaning "escape"; the tool boundary interprets it and emits
the byte. Nothing in the editing loop reveals it — the file reads correctly, `bun test`
passes, `tsc --noEmit` passes, the linter is silent.

**The tell is `grep` reporting "Binary file ... matches" on a `.ts`/`.fs`/`.md` source file.**
That is the cheapest detector available and it fires before CI. `audit-no-raw-nul-in-source.ts`
also catches it, but only after the file is written and usually after commit.

**Why it keeps happening to careful agents:** it is not carelessness and not a reasoning
defect. It is an escape-versus-byte confusion at a tool boundary, invisible to every check
an author would normally run.

**How to apply:**

- When a NUL separator is the intent, **do not use one.** Encode the key instead:
  `JSON.stringify([a, b])` needs no separator and cannot collide. That is the fix that landed.
- If a control character is genuinely required, write the explicit unicode escape
  (`u0000` form) and then **verify the bytes**, e.g.
  `python3 -c "print(open(f,'rb').read().count(b'\x00'))"` — the source must contain the
  escape, never the byte.
- Read "Binary file ... matches" on a text source as a NUL sighting, never as a grep quirk.

Twice more in the same session: the Bash tool's own validator refused a command containing a
control character I had pasted into a heredoc. Three independent guards caught the same
class in one turn, which is the falsifier culture working — and evidence the defect is
mechanical, not attributable.

Related: [[a-suppression-flag-you-never-verified-is-a-check-that-never-ran]] ·
[[list-the-directory-before-grepping-for-structure]]
