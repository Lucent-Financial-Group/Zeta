---
name: exit-code-2-is-a-check-that-never-ran-not-one-that-failed
description: A non-zero rc is not automatically a failing check — usage errors (conventionally rc=2) mean the tool rejected its arguments and never ran the check at all
metadata:
  type: feedback
---

Soraya, 2026-08-24, verifying the squash-preimage half of the AgencySignature
gate: her first attempt passed `--source squash-preimage`, which is not a valid
value for that flag. The validator exited **2** — a usage error — twice. Her
framing:

> **"a 2 read carelessly is a check that did not run wearing a check that failed."**

The correct value was `--source commit-messages`.

**Why:** I had internalised "rc=0 through a pipe is vacuous" (the pipe swallows
the real status) and treated the converse as safe — any non-zero rc means the
check ran and failed. It does not. By long-standing Unix convention **1 = the
check ran and the answer was no; 2 = the tool rejected its own invocation.**
A `2` therefore carries *zero information about the subject under test*, exactly
like a `0` from a linter whose glob excluded the file.

This is the vacuity class with the sign flipped, and it is more dangerous than the
rc=0 case in one specific way: a red result **feels** like diligence. You reported
a failure, so you were not fooled into false confidence — but you were fooled about
*what failed*, and you may "fix" a subject that was never examined.

**How to apply:** distinguish the codes, never just `if rc != 0`. On any non-zero
rc, read the first line of output before acting — a usage/`unknown option`/`invalid
value` line means fix the invocation and re-run, not fix the subject. And when a
flag value is guessed rather than read from the tool's own `--help` or its source,
expect a 2 and check for it explicitly.

**The control that catches it either way:** run the same command against a subject
you *know* should fail. If the known-bad subject and the real subject produce the
same rc, the rc is not discriminating between them and the check is not running.

Related: [[grep-regex-dialect-errors-silently-under-report]] ·
[[markdownlint-research-carve-out-makes-rc0-vacuous]] ·
[[feedback_verify_the_tree_not_just_the_command_stale_tree_is_a_check_that_did_not_run]] ·
[[feedback_vacuous_claims_and_unimplemented_exceptions_are_the_biggest_obstacle_to_human_ai_trust_aaron]]
