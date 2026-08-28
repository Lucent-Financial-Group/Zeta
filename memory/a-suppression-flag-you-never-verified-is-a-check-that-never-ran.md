---
name: a-suppression-flag-you-never-verified-is-a-check-that-never-ran
description: The env-var escape hatch is unfalsifiable by construction — use the closed command set; MISE_DISABLE=1 was the live instance
metadata:
  type: feedback
---

`export MISE_DISABLE=1` was prefixed to essentially every Bash call for a whole
session. **There is no such mise setting.** The error it was meant to suppress
printed on every single command, and I never read the output I was producing.

**The first read was too weak.** I wrote this down as a discipline — *verify a
workaround once, at adoption*. Aaron corrected it to a structural fault:

> *"the solution to this we already have recorded: only call our own CLIs with
> trusted parameters. The ENV_ prefixes won't work on our commands cause they mean
> non-pre-thought-out scenarios for AI — we have workflow / discriminated-union
> escapes for join-society edit of DUs instead of env prefixes."*
> *"env var escapes are often single-user commands trying to act like multi-tenant
> without proper guardrails."*

**Why this is stronger:** the env-var surface **accepts any string and silently
ignores unknown ones**, so a bogus one *cannot* fail loudly. `MISE_DISABLE=1`
wasn't a badly-chosen workaround — it was one the mechanism made **unfalsifiable**.
A closed command set has no such hole: you may NAME a command, never DEFINE one,
so an unrecognised name is an error rather than a no-op. Discipline asks me to be
careful; the mechanism makes carelessness impossible. The mechanism wins.

Same rule one altitude up from [[feedback_no_adhoc_sudo_privileged_ops_are_committed_tested_reviewable_code_2026_08_24]],
and the portable half of the Itron hub patent (see
`.claude/rules/itron-hub-patent-boundary-p2p-is-the-upgrade.md`). Where behaviour
must vary, the variation is a **DU case edited through the society workflow**, not
an env var invented at the call site.

**The ambient family, priced (Aaron 2026-08-25):** *"ambient costs should be
avoided at the cost of replacing the shell like bash or pwsh or zsh and then the
OS"* / *"we are trying to avoid ambient PATH at all costs except initial bootstrap
by detection"* / *"we either fingerprint what's on PATH or heuristics to bootstrap
what's fingerprintable"* / *"at a minimum make sure we install the right version
behind our own hexagonal interface that can be guaranteed to work — this is how we
replace it eventually with our own code."*

Env vars, ambient PATH, and shell semantics are ONE class: influence entering
outside a declared channel (§13 noninterference). Measured cost to me in a single
session: zsh not word-splitting an unquoted ref list (reported 0 branches; truth
1,084), `:r` silently eating a push refspec, unquoted glob failures, and `$?` read
after a pipe three separate times. Six losses, none declared by anyone.

**IT WAS ALREADY RECORDED, AND I DID NOT FIND IT.** Aaron: *"the solution to this
we already have recorded."* He was literally right —
`docs/research/2026-08-13-lessons-belong-in-the-harness-not-in-rules-the-externalization-ladder.md`
carries his position in his own words twelve days earlier: *"these lessons all need
to make it into our harness and cli, cause eventually there will just be our own
clis and we will use 0 external dependencies, and even before that they will be
behind our cli and hexagonal interfaces, so we can just make the right decision
every time and easily code in flow fixes that don't need to be llm rules — they can
just be externalized discriminated union / workflow / cli / mux/duplex rules."*

That doc IS this memory's parent, and the title states the ladder: **lessons belong
in the harness, not in rules.** So writing a new memory here was itself the weaker
move — the durable fix is externalized into a CLI/DU, and a memory is at best the
rung below it. My first search missed the doc because `grep "closed command set"`
is case-sensitive and the rule capitalises it — a case-sensitivity under-report,
the same defect family as the rest of this file.

**How to apply:** reach for the port, not the prefix. A tool goes behind a
hexagonal interface whose contract we own *including its version guarantee*;
today's adapter is a pinned, detected, fingerprinted binary, tomorrow's is our own
code, and callers never change. That substitutability is the justification — an
indirection that cannot be swapped is just a wrapper. Ambient PATH is touched
exactly once, at bootstrap, by detection.

Live surface as of 2026-08-25: **223 `no-os-command-from-path` disable sites across
125 files** (git 163, bun 51, gh 32, bash 18, **sudo 8**, launchctl 8) — work item
081M0X0R2T5087G0R0008J5PSH.

Related: [[verify-the-tree-not-just-the-command]] · [[exit-code-2-is-a-check-that-never-ran-not-one-that-failed]] · [[grep-regex-dialect-errors-silently-under-report]] · [[project_capability_vector_not_tier_enum_hardware_matrix_picks_dependencies]]
