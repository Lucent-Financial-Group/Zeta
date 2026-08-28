---
name: running-a-ci-tool-locally-without-ci-env-fakes-a-finding
description: "A CI tool run locally without the env the workflow supplies (GH_TOKEN) degrades correctly and looks exactly like a bug in the tool"
metadata:
  type: feedback
---

2026-08-25: I ran `rerun-toolchain-install-stall-cli.ts` locally against a real
exit-124 apt stall. It returned `unexplained` / `no-install-stall`. I wrote that up
as a **false negative in a tool that had shipped an hour earlier**, and named a
plausible cause (the signature being keyed to a step name the CodeQL workflow does
not present).

Both claims were wrong, and the tool was correct.

**What actually happened:** `GH_TOKEN` and `GITHUB_TOKEN` were unset in my shell.
The CLI fetches job logs with a bare `fetch`, which — unlike `gh api` — has no
stored credentials. Unauthenticated, the logs endpoint 404s, `apiText` returns `""`
by design, the empty log fails the signature, and the job is reported `unexplained`.
Re-run as `GH_TOKEN="$(gh auth token)" bun …`, the same command returns
`action: rerun`, `verdict: install-stall`.

**Why it was so convincing:** the degradation is *silent and correct*. Nothing
errors. The tool's own comment says missing evidence must never read as absolving
evidence, so it leaves the run red — which is right, and which is indistinguishable
from "the classifier cannot see this case."

**Before claiming a CI tool is broken from a local run:**

1. Export what the workflow exports. Read the `env:` block; `GH_TOKEN` is the usual
   one. `gh` working in the same shell proves NOTHING about a tool using `fetch`.
2. Separate the pure policy from the I/O adapter. Calling `classifyFailedJob`
   directly with a log fetched via `gh api` returned `install-stall` immediately —
   that split localised the fault to my environment in one step, and I should have
   run it *before* writing the finding, not after.
3. A tool whose tests cover the pure function cannot fail at the boundary in its
   test suite. I made the same class of error myself the same night: 25 green tests
   while the shipped command was broken by a jq string-escape bug at the shell
   boundary.

**The asymmetry that makes this worth a file:** a wrong "your tool is broken" report
aimed at another agent's just-shipped work costs more than a delay. It is also the
exact shape this repo's rules warn about — reporting a defect that is really a
missing-context error on the reporter's side.

Related: [[verify-the-tree-not-just-the-command]] ·
[[exit-code-2-is-a-check-that-never-ran-not-one-that-failed]] ·
[[self-comparison-f-x-equals-f-x-cannot-prove-purity]]
