---
name: agencysignature-canonical-ten-keys-and-the-two-jobs
description: "The exact ten AgencySignature trailer keys, plus the contiguity rule and the two separate checking jobs"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 21d1a9c2-bd74-472a-abbe-cbd7e052b883
  modified: 2026-08-23T16:44:23.641Z
---

Source of truth: `.github/PULL_REQUEST_TEMPLATE.md` and `REQUIRED_KEYS` in
`src/Core.TypeScript/hygiene/agencysignature-block.ts`. **Read those, never recall
from memory of a past brief** — the names below are easy to get subtly wrong and
the failure is silent until CI.

```
Agency-Signature-Version: 1
Agent: <persona>
Agent-Runtime: <harness, e.g. claude-code | codex-cli>
Agent-Model: <model id>
Credential-Identity: <account the credential belongs to>
Credential-Mode: shared | dedicated-agent | operator-delegated | human-only | unknown
Human-Review: not-implied-by-credential
Human-Review-Evidence: none
Action-Mode: autonomous-fail-open
Task: none
Co-authored-by: <persona> <persona@zeta.agents>
```

**The four names I repeatedly got wrong** (2026-08-23, propagated to ~8 agent briefs):
`Agency-Signature-Version` **not** `Signature-Version`; `Agent-Runtime` **and**
`Agent-Model` as two keys **not** one `Agent-Type`; `Credential-Identity` and `Task`
omitted entirely. `Session` / `Provenance` / `Confidence` / `Reversibility` are **not
required** — harmless if present, but they are not the block.

**Two constraints that produce confusing failures:**

1. **Contiguity.** The block must be the final contiguous paragraph and parse as git
   trailers. A `🤖 Generated with [Claude Code]…` footer placed *after* it breaks
   parsing — failure class prints as `Trailer Contiguity Survival Failure`. Put any
   footer **above** the block.
2. **Two separate jobs, both required, similar names.** One reads the **PR
   description**; a different one reads the **squash preimage** (commit messages).
   Neither satisfies the other. So the block goes in **both** the commit message and
   the PR body. `squash_merge_commit_message: COMMIT_MESSAGES` is why the preimage
   matters.

Also: `Human-Review-Evidence` must be `none` whenever `Human-Review` is not
`explicit`, and `explicit` requires evidence != `none`.

**Repair note:** the PR-body half is fixable with `gh pr edit <N> --body-file` — no
push, no rebase. The **commit** half is not: it needs history rewrite (force-push, a
gated class) or a new commit carrying *your own* honest block. Per
`.claude/rules/maintenance-commit-on-another-agents-branch-carries-no-block.md`, if
your honest values then disagree with the branch's on a governance key, **hand the PR
back to its owner** rather than papering over it.

Related: [[verify-the-tree-not-just-the-command]] — read the failing job's log before
guessing the cause; two wrong guesses preceded finding the real one here.

## The brief defect that made 7 of 9 PRs red (2026-08-25)

`agencysignature (PR body)` failed on **seven of nine** open PRs at once — five agent
PRs plus two of my own. Not seven mistakes: **one defective instruction, mine.**

Every agent brief I wrote said *"AgencySignature trailer, exactly these ten keys ..."*
and then *"open a PR against main."* Agents put the block in the **commit** and not in
the **PR body**. The check's own words: `FAIL: no parseable git trailers found in the PR
DESCRIPTION` — class *Trailer Contiguity Survival Failure*.

My own two failed for a mechanically different reason with the same effect: I built the
body with `--body "$(git log -1 --format=%b | sed '/^Agency-Signature-Version/,$d')"`,
which **strips** the block, and on those two I forgot to re-append it. On the PRs that
passed I had appended a fenced `## AgencySignature` section; on the ones that failed I
had not. Same author, same hour, both branches of the mistake.

**How to apply — put this in EVERY agent brief, verbatim:**

> The AgencySignature block must appear in BOTH the commit trailer AND the PR body. They
> are separate jobs; satisfying one does not satisfy the other. In the PR body put it in
> a fenced block under a `## AgencySignature` heading, all ten keys contiguous, no blank
> line inside the block.

**Repair is legitimate, forging is not.** Transcribing an agent's own block from its own
commit into its own PR body asserts nothing on its behalf — it moves that agent's
existing attestation to the surface where it is checked. Inventing a block for a commit
that has none would be the forbidden copy
([[maintenance-commit-on-another-agents-branch-carries-no-block]]). Skip and report
instead.

## Shell state does NOT persist between Bash tool calls — mint and commit in ONE call

Fifth `Task:` failure of 2026-08-25, and the first that was **not** fabrication.

```bash
# call 1
ZID=$(bun .../new-workitem.ts ... | grep zetaid | awk '{print $2}')   # real id, verified

# call 2  ← FRESH SHELL. $ZID is EMPTY here.
git commit -F - <<MSG
...
Task: $ZID      # ships as "Task:" with no value
MSG
```

The id was **real, minted, and verified to resolve**. It simply never reached the commit,
because each Bash tool call starts a new shell — *"Working directory persists between
calls, but shell state (env vars, functions) does not."* That is documented in the
environment notes; I knew it and did not apply it.

**Same visible symptom as fabrication** (`Task:` identifies nothing, AH006 and the PR-body
check both go red) with a **completely different cause**, so the fix differs: fabrication
needs discipline about inventing values; this needs the **mint and the commit in the same
Bash call**. Diagnose by looking at the value: absent ⇒ variable didn't survive;
well-formed but unresolvable ⇒ fabricated.

Both blocks need repairing when it happens — the commit trailer (`git commit --amend`,
force-with-lease to your own branch) **and** the PR body (`gh pr edit --body-file`), since
they are separate jobs.


## `Human-Review-Evidence` is an ENUM, and it is COUPLED to `Human-Review` (2026-08-26)

Valid values: `chat` · `pr-review` · `pr-comment` · `signed-policy` · `none`.
Prose is rejected `invalid-enum`.

**The coupling is the part I got wrong twice in one session.**
`Human-Review: not-implied-by-credential` REQUIRES `Human-Review-Evidence: none`.
The validator rejects `not-implied-by-credential` + `chat` explicitly
(see the header of `src/Core.TypeScript/hygiene/agencysignature-block.ts`).
Semantically obvious in hindsight: if no human review is implied, there cannot
be evidence of one.

History, because the correction sequence matters:
1. I mandated a trailer with a **prose** evidence string -> agent's commit flagged;
   it fixed the field to `chat` (valid *and* true for its case) and kept my prose
   in the commit body. Correct call.
2. I then over-generalised and put `chat` into every mandated block **while
   keeping** `Human-Review: not-implied-by-credential` -> that combination is
   invalid, and it failed CI on #15541. A second agent caught it and amended to
   `none`, matching its honest state.

**How to apply:** when mandating a block in an agent prompt, keep
`not-implied-by-credential` paired with `none`. Only raise the evidence field
when the review claim is raised too, and only when a human actually reviewed.
Put any human-authorization narrative in the commit body or PR body, never in a
trailer value.

**RECURRED 2026-08-28, in a worse form.** I did not misspell the keys — I invented a
whole plausible-looking alternative schema from scratch: `Agency-Model`,
`Agency-Surface`, `Agency-Instance`, `Agency-Topology`, `Provenance-Class`,
`Evidence-Class`. Not one is a real key. It *reads* like a valid block, which is why
nothing looked wrong while writing it, and it shipped in two PR bodies and two commit
messages before `agencysignature (main tip)` went red on the merge.

A misspelling is caught by eye. **A fabricated-but-coherent schema is not** — it has
the shape of compliance and none of the content, which is the vacuity class applied to
attribution. The mitigation is mechanical, not attentional: before writing any block,
run `grep -n "REQUIRED_KEYS" -A20 src/Core.TypeScript/hygiene/agencysignature-block.ts`
and copy from the output. Then validate before pushing — `findAllSignatureBlocks(msg)`
must return 1 and no `REQUIRED_KEYS` entry may be missing. That check takes seconds and
is the only thing that actually closes this.
