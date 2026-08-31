# `human-chosen-iv-or-nonce` fixtures

Kept as `.ts.txt`, not `.ts`, on purpose: they are semgrep INPUT, not code this
repo compiles. A `.ts` file here would be typechecked, linted and counted as
source, and `bad.ts` deliberately contains a defect.

Run them:

```bash
semgrep --config .semgrep.yml --metrics=off \
  src/Core.TypeScript/hygiene/fixtures/iv-nonce/human-chosen-iv.bad.ts.txt   # expect 4 findings
semgrep --config .semgrep.yml --metrics=off \
  src/Core.TypeScript/hygiene/fixtures/iv-nonce/csprng-iv.good.ts.txt        # expect 0
```

(semgrep needs `--lang ts` for a `.txt` extension; see the test that drives them.)

## What the bad fixture proves, line by line

| line | form | why it is the bug |
|---|---|---|
| 4 | `createCipheriv(..., "0000000000000007")` | string literal IV |
| 5 | `createCipheriv(..., Buffer.from("...", "hex"))` | **the realistic one** — a hex constant |
| 6 | `createCipheriv(..., Buffer.alloc(16))` | all-zero IV |
| 7 | `createDecipheriv(..., "0000000000000007")` | the decrypt side |

**Line 5 is the reason these fixtures exist.** The rule's first draft used the
one-argument `Buffer.from("...")` pattern and caught 3 of the 4 — missing
exactly the form anyone would actually write. Review did not find that; running
the fixture did.

The rule's first draft was also fully VACUOUS before that: it shipped
`languages: [generic]`, copied from its sibling `system-random-in-security-context`
(which targets F#), and generic mode does not parse TypeScript — so it matched
NOTHING, including the bad fixture. A check that cannot fail is not a check.
