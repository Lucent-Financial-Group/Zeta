---
name: markdownlint-research-carve-out-makes-rc0-vacuous
description: "docs/research/2026-*.md is carved out of the markdownlint profile — `markdownlint-cli2 <research doc>` exits 0 without linting, so quoting rc=0 there is a check that did not run"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 21d1a9c2-bd74-472a-abbe-cbd7e052b883
---

`bunx markdownlint-cli2 docs/research/2026-*.md` returns **rc=0 with zero output
whether the file is clean or not.** The research carve-out in the lint profile
excludes it (see backlog `081KQ8P5D0008QG0R002SBGJXX-markdownlint-research-carve-out-narrowing`
and PR-2442 "narrow markdownlint research carve-out to verbatim-only pattern").
`docs/design/` and `docs/books/` **are** linted.

**Why:** I quoted "markdownlint rc=0" as evidence on ~6 research docs in one
session (2026-08-23). Every one of those statements was true and **meaningless** —
the exact vacuity class the repo exists to prevent, in my own evidence, to Aaron,
repeatedly. A subagent caught it because **zero output plus exit 0 is the house
smell**; I had not treated silence as suspicious.

**How to apply:** never quote a lint result without a discrimination proof. The
cheap one, and it takes one extra call:

```bash
cp <file> /tmp/probe.md && printf '\n\n\n\n' >> /tmp/probe.md
bunx markdownlint-cli2 /tmp/probe.md; echo "probe rc=$?"   # MUST be 1
```

A copy **outside the ignore glob** gets linted; if the probe does not go red, the
linter never examined your file. Same shape as reading exit status through a pipe:
the number is real and describes something other than what you claimed.

Related: [[verify-the-tree-not-just-the-command]] · [[grep-regex-dialect-errors-silently-under-report]]
