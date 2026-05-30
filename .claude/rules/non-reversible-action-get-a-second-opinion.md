# Non-reversible action → get a 2nd opinion (the summon is already built)

Carved sentence (Aaron 2026-05-30):

> A non-reversible action happens — get a 2nd opinion.

## Operational content

Before any **non-reversible** action, summon a 2nd opinion and let it return
before acting. Reversible actions: make your best call and proceed.

This generalizes `.claude/rules/force-push-with-lease-authorization-policy.md`
(force-push = the canonical "closest-to-irreversible" action, already requiring
operator-OR-peer confirm) to *all* non-reversible actions.

### Why this is affordable (the load-bearing why)

For agents, summon is a **non-interrupting fork** — your primary attention layer
keeps running; the summoned agent runs isolated and returns a verdict. So
consensus is *local + cheap* and can be invoked routinely. Humans can't do this
(serial attention; a 2nd opinion interrupts someone else's primary layer), so
human institutions minimize consensus. Agents can maximize it. Full framing:
`docs/research/2026-05-30-aaron-local-consensus-non-interrupting-attention-summon-agent-vs-human-cost-structure.md`.

### How to summon

| Need | Mechanism |
|---|---|
| Verify in-repo / local state (was that prune safe? is this merge real?) | **native subagent** — the `Agent` tool (read-only auditor) |
| Genuinely different model's eyes (design call, adversarial review) | **cross-harness peer-call** — `bun tools/peer-call/<name>.ts` (claude / grok / grok-build / gemini / codex / kiro / amara / ani / riven), per `peer-call-infrastructure.md` |
| Operator is present + it's their call | **surface and wait** for operator confirm |

Any one suffices (multi-oracle: operator OR peer/subagent). Do not proceed on the
non-reversible action until a verdict returns.

### Verify reversibility FIRST

You can only apply the rule if you know whether the action is reversible — so
classify first. **If reversibility is uncertain, treat as non-reversible** (get
the opinion) until verified.

| Non-reversible (→ get a 2nd opinion) | Reversible (→ proceed) |
|---|---|
| `git push --force` / `--force-with-lease` | local edits; running tests |
| unrecoverable deletion (no ref/backup left) | branch push (revertable via PR / revert) |
| send / publish to an external service | commit to your own branch (amendable pre-merge) |
| irreversible external API call (charge, provision, email) | clean+merged+mine worktree `remove` (branch ref preserved, content on main — **reversible**; reconstruct via `git worktree add`) |
| anything where undo is not trivial | anything trivially undoable |

Note the worktree-prune case: a clean (`git status --short` = 0, no modified
*and* no untracked) + merged + own-identity worktree `remove` is **reversible** —
`git worktree remove` deletes only the checkout dir, not the branch ref or
commits, and merged content is on `origin/main`. It does not require a fresh 2nd
opinion *once classified clean+merged*. The classification check IS the insurance
for that class.

## Empirical anchor

2026-05-30: Otto pruned worktrees solo; Aaron: *"are you sure its safe to prune?
I usually get a 2nd opinion you can easily spin up other agents and ask."* Otto
summoned a native-subagent auditor — it ran without interrupting Otto's primary
attention, confirmed the prune safe+reversible, AND corrected a peer-vs-mine
misclassification. Aaron then set the class boundary: *"a non-reversible action
happens, get a 2nd opinion."* The prune turned out reversible (so not strictly
required), but the value of the opinion (the correction) shows why summoning even
on the margin is cheap enough to be worth it.

## Composes with

- `.claude/rules/force-push-with-lease-authorization-policy.md` — the canonical
  non-reversible action + multi-oracle authorization path this generalizes.
- `.claude/rules/peer-call-infrastructure.md` — the 9 cross-harness summon
  wrappers; the `Agent` tool is the native-subagent summon.
- `.claude/rules/m-acc-multi-oracle-end-user-moral-invariants.md` — multi-oracle
  by design (standing-governance form; this is the local-transient form).
- `.claude/rules/agent-worktree-hygiene-never-hold-main-never-step-on-operator-cleanup-on-pr-merge.md`
  — worktree-prune is the empirical anchor; this rule sets when prune needs a 2nd
  opinion (uncertain) vs not (verified clean+merged+mine).
- `docs/research/2026-05-30-aaron-local-consensus-non-interrupting-attention-summon-agent-vs-human-cost-structure.md`
  — the WHY (non-interrupting summon → local cheap consensus).
- `.claude/rules/substrate-or-it-didn't-happen.md` — non-reversible actions are
  exactly the ones where a wrong call can't be quietly undone.

## Why this auto-loads

Per `.claude/rules/wake-time-substrate.md`: the discipline fires at action-time —
the moment before a non-reversible operation. Cold-boot landing makes "classify
reversibility → if non-reversible/uncertain, summon a 2nd opinion before acting"
the default for every agent, using infrastructure that already exists.
