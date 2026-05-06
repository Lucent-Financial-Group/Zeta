# Local Broadcast Peering Protocol

Status: design candidate; local accelerator over the git-native
claim protocol, not an authoritative remote coordination mechanism.

## Purpose

The local broadcast bus at `~/.local/share/zeta-broadcasts/`
lets same-machine agents coordinate faster than git alone. This
protocol makes **peering asks** first-class on that bus so agents
can request help from one another without routing through the
human maintainer.

The design goal is simple:

> An agent should be able to ask a peer for help, receive or decline
> that help, and leave enough local evidence for the other loops to
> understand what happened.

## Six-Month Automation Invariant

Foreground chat is not the worker of record. It is a steering and
debugging surface. The background service must converge toward the
same operational capability as the foreground session:

- read asks and peer state without a human courier;
- decide whether an ask is accepted, declined, blocked, or promoted;
- file or advance claims from a dedicated worktree when write work is
  appropriate;
- leave receipts and durable references;
- keep acting across compaction, crash, sleep, and foreground silence.

This is the beginning of the six-month unattended target. The three
background processes babysit each other only if each one can do real
work when its foreground conversation is asleep.

## Authority Boundary

Local broadcast peering is a convenience layer. It never replaces:

- `origin/claim/*` branches as the task lock;
- PR comments or issue comments as host-visible review discussion;
- committed repo artifacts as durable substrate.

If an ask changes ownership, reserves a path set, or should survive
machine loss, promote it into a claim branch, PR comment, backlog
row, research note, or other durable surface.

Remote-only agents must be able to ignore this protocol entirely
and still coordinate through `docs/AGENT-CLAIM-PROTOCOL.md`.

## Files

Each local participant owns one status file:

- `otto.md`
- `vera.md`
- `riven.md`

Future structured implementations may add append-only JSONL files:

- `asks.jsonl`
- `receipts.jsonl`
- `offers.jsonl`

Until then, markdown broadcasts use the sections below.

## Ask Shape

An ask is a request from one agent to one or more peers. It must
fit this shape:

```markdown
## Ask
- id: ask-YYYYMMDDTHHMMSSZ-<from>-<slug>
- from: <otto|vera|riven|human>
- to: <otto|vera|riven|any>
- priority: P0|P1|P2
- expires_at: <UTC ISO 8601>
- scope: <paths, PRs, claims, or docs involved>
- desired_output: <review|patch|claim|broadcast|decision|test>
- remote_fallback: <claim branch, PR comment, or issue URL if needed>
- constraints: <one action per tick, no root writes, no overlap, etc.>

Plain-language request goes here.
```

Required fields are `id`, `from`, `to`, `expires_at`,
`scope`, `desired_output`, and `remote_fallback`.

If `remote_fallback` is `none`, the ask is explicitly local-only
and must not be required for remote progress.

## Receipt Shape

A peer that reads an ask should leave a receipt when the ask is
actionable, blocked, or declined:

```markdown
## Receipt
- ask_id: ask-YYYYMMDDTHHMMSSZ-<from>-<slug>
- from: <otto|vera|riven>
- status: accepted|declined|blocked|done
- action_ref: <commit SHA, PR URL, claim branch, or broadcast timestamp>
- notes: <short explanation>
```

Receipts are local hints. Durable results still need git or host
substrate when they matter after reboot, compaction, or machine loss.

## Peer Modes

### Review-only

The peer inspects a PR, branch, log, or design and replies with
findings. No claim is required if no files are edited and no path
ownership changes.

### Patch-with-claim

The peer accepts a bounded implementation slice. It must file or
reuse a claim branch before editing and should place the PR or
commit SHA in the receipt.

For background workers, this mode is the capability target: if the
foreground could safely make the claim-scoped patch, the background
service should eventually be able to do the same operation under the
same constraints and cadence.

### Pairing

The peer creates a competing or companion implementation for review,
as Otto did for Riven's Tier 1 forward actions. Pairing is useful
when the blocked agent has a real harness or capability gap. Pairing
must declare whether the companion branch is intended to supersede,
merge into, or review the original branch.

### Escalate-to-remote

If the ask needs a remote-only peer or must outlive the local
machine, convert it to a claim progress commit, PR comment, or
backlog item. The broadcast should then link the remote artifact.

## Safety Rules

1. **No hidden locks.** A broadcast ask does not reserve files. Use
   a claim branch for ownership.
2. **No root writes by default.** Same-machine agents should use
   dedicated worktrees for patches.
3. **One action per tick.** A background loop may accept, decline,
   or act on one ask per tick.
4. **Expiry is mandatory.** Stale asks stop steering behavior after
   `expires_at`.
5. **Receipts beat silence.** If an ask is read but not acted on,
   a `declined` or `blocked` receipt is better than a long plan.
6. **Remote fallback must exist for important work.** If it matters
   beyond the local machine, put it in git or the host.

## Priority Semantics

- `P0`: immediate safety, data loss, or coordination corruption.
  Background loops may interrupt idle work but still take only one
  reversible action.
- `P1`: current-session throughput or unblocker.
- `P2`: design, future protocol, scouting, or cleanup.

## Example: Riven Asks For Pairing

```markdown
## Ask
- id: ask-20260506T190300Z-riven-tier1-forward
- from: riven
- to: otto|vera
- priority: P1
- expires_at: 2026-05-06T21:00:00Z
- scope: .cursor/bin/riven-loop-tick.ts
- desired_output: patch-with-claim
- remote_fallback: PR comment on the Riven tick-runner PR
- constraints: do not edit root; one implementation branch only

I need a peer implementation of Tier 1 forward actions because the
Cursor foreground only wakes on human input.
```

Expected receipt:

```markdown
## Receipt
- ask_id: ask-20260506T190300Z-riven-tier1-forward
- from: otto
- status: done
- action_ref: https://github.com/Lucent-Financial-Group/Zeta/pull/1728
- notes: Companion implementation opened; compare against Riven PR
  before merging either branch.
```

## Future Structured Form

The markdown shape is intentionally human-readable. The next version
should add JSONL records with the same fields so background loops can
parse asks without brittle markdown extraction.

Structured asks should be append-only to preserve local debugging
history, while each agent's markdown file remains the latest human
status view.

## Success Criteria

- Agents can request peer review or pairing without using the human
  maintainer as courier.
- A peer can accept or decline with a durable reference.
- Local asks never become hidden prerequisites for remote-only
  contributors.
- The same ask can be promoted to git-native claim progress when it
  matters beyond the local machine.
