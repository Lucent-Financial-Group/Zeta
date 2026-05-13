# Upstream rhythm — Forge's fork-first PR cadence

This doc is **Forge-specific** project configuration for the
`fork-pr-workflow` skill. The skill itself is factory-generic
and defers the upstream-cadence choice to project-level
configuration (see
`Lucent-Financial-Group/Zeta: .claude/skills/fork-pr-workflow/SKILL.md`
§"Optional overlay: batched upstream rhythm"). This doc is that
configuration for Forge.

## Terminology — three surfaces

Forge has **three surfaces**:

Two come from git (the repo axis):

- **upstream** — `Lucent-Financial-Group/Forge`. The parent
  repo. Where releases, stable URLs, issue numbers, the
  canonical commit history, and the social / governance
  edge live.
- **fork** — `AceHack/Forge`. The fork the human maintainer
  and agents develop on day-to-day. The downstream copy where
  daily agent-loop PRs land so the billed upstream surfaces
  (Copilot coding-agent, Actions minutes, paid seats) aren't
  charged per-PR.

The third is the role axis:

- **factory content** — everything in Forge. Unlike Zeta (which
  has a SUT/factory split), Forge is *purely* factory content:
  skills, agents, tools, factory meta-docs, persona notebooks.
  Every file in Forge is factory-by-role.

When fork-vs-upstream disagree on anything, upstream wins.

## Forge's choice: batched fork-first rhythm

**Default PR target for daily agent work:** the fork
(`AceHack/Forge:main`) — **not** upstream
(`Lucent-Financial-Group/Forge:main`).

Agents develop on fork feature branches, open PRs against the
fork's `main`, auto-merge there. The fork's free-tier CI
minutes run the gate. Once `AceHack/Forge:main` is ~10 commits
ahead of `Lucent-Financial-Group/Forge:main`, **one** bulk sync
PR lifts all accumulated work into upstream.

```text
feature-branches (AceHack)
   \ \ \ \ \ \ \ \ \ \
    v v v v v v v v v v
    AceHack/Forge:main ─────────────────────────────┐
    (agent daily loop,                              │
     free CI, free Copilot)                         │
                                                    │ every ~10 PRs
                                                    │ one bulk-sync PR
                                                    v
                                    Lucent-Financial-Group/Forge:main
                                    (LFG Copilot + Actions
                                     billed ONCE per bulk sync,
                                     not once per PR)
```

This pattern mirrors `Lucent-Financial-Group/Zeta`'s rhythm
(`docs/UPSTREAM-RHYTHM.md` there is the canonical reference
for the cost-rationale and threshold tuning guidance).

## Concrete commands

### Default PR (the 90% case)

```bash
# Agent opens a PR from its feature branch to AceHack's main.
gh pr create \
  --repo AceHack/Forge \
  --head AceHack:<branch> \
  --base main \
  --title "<title>" \
  --body  "<body>"

# Auto-merge on AceHack.
gh pr merge <N> --repo AceHack/Forge --auto --squash
```

### Bulk sync (every ~10 PRs)

```bash
# Precondition: AceHack/Forge:main is ahead of
# Lucent-Financial-Group/Forge:main by ~10 commits.
# Check:
gh api /repos/AceHack/Forge/compare/Lucent-Financial-Group:main...main \
  --jq '.status,.ahead_by,.behind_by'

# Open ONE bulk sync PR.
gh pr create \
  --repo Lucent-Financial-Group/Forge \
  --head AceHack:main \
  --base main \
  --title "Sync: AceHack/Forge:main → LFG/Forge:main (batch of N PRs)" \
  --body "Bulk upstream sync per docs/UPSTREAM-RHYTHM.md cadence."

# Squash-merge matches LFG/Forge's squash-only merge settings (scaffold default).
gh pr merge <N> --repo Lucent-Financial-Group/Forge --auto --squash
```

### Forward-sync AceHack/main from LFG/main (after a bulk sync)

```bash
gh api -X POST /repos/AceHack/Forge/merge-upstream -f branch=main
```

## When to bypass the batched rhythm

Six named exceptions (same as Zeta's `docs/UPSTREAM-RHYTHM.md`):

1. **Security P0** — any `docs/BUGS.md` P0-security row.
2. **External-contributor dependency** — a change an external
   contributor is actively waiting on.
3. **Human maintainer explicit request** — overrides the rhythm.
4. **CI-repair to LFG** — when LFG's gate is broken and the fix
   must land on LFG immediately.
5. **Bulk-sync PR itself** — the one PR that batches ~10 PRs.
6. **LFG-only capability experiment** — a deliberate probe of
   a capability that exists on LFG but not on AceHack.

Outside these cases, default to AceHack.

## Threshold tuning

"~10 PRs" is a suggestion, not a hard rule. Range 5-20 is
reasonable. Revisit every ~5 bulk syncs; record any change in
an ADR under `docs/DECISIONS/`.

## Cross-references

- `Lucent-Financial-Group/Zeta: docs/UPSTREAM-RHYTHM.md` —
  canonical cost-rationale and full guidance; Forge follows
  the same pattern.
- `docs/DECISIONS/2026-04-22-three-repo-split-zeta-forge-ace.md`
  (in Zeta) — ADR establishing the three-repo split.
