# CLAUDE.md — Claude Code session bootstrap for Zeta

Rules auto-load from `.claude/rules/`; skills load on demand from `.claude/skills/`.
Slash commands: `.claude/commands/`; persona agents: `.claude/agents/`.

## 1. Orient

Read: [`AGENTS.md`](AGENTS.md) → [`docs/ALIGNMENT.md`](docs/ALIGNMENT.md) →
[`docs/GLOSSARY.md`](docs/GLOSSARY.md) → [`GOVERNANCE.md`](GOVERNANCE.md) (scan when §N cited).
Check [`docs/WONT-DO.md`](docs/WONT-DO.md) before proposing work.
Vision: [`docs/VISION.md`](docs/VISION.md).

## 2. Refresh

```bash
bun tools/github/refresh-worldview.ts
```

Read active trajectories: `docs/trajectories/*/RESUME.md`.

## 3. Pick work

Open `docs/BACKLOG.md`. Before starting any row, complete the backlog-item start gate
(prior-art search + dependency check — see `.claude/rules/backlog-item-start-gate.md`).

## 4. Build gate

```bash
dotnet build -c Release   # 0 warnings, 0 errors — TreatWarningsAsErrors is on
dotnet test Zeta.sln -c Release
```

## 5. Ship

Set branch: `export ZETA_EXPECTED_BRANCH=<branch> && git checkout -b "$ZETA_EXPECTED_BRANCH"`
Open PR against `main`. Arm auto-merge: `gh pr merge <N> --auto --squash`.

## 6. When stuck

See [`docs/CONFLICT-RESOLUTION.md`](docs/CONFLICT-RESOLUTION.md). On deadlock, the human decides.

## Conventions

- **Agents, not bots** — every AI carries agency; correct "bot" gently (GOVERNANCE.md §3).
- **Result-over-exception** — errors surface as `Result<_, DbspError>`; no exceptions on hot paths.
- **Memory fast-path** — read `~/.claude/projects/<slug>/memory/CURRENT-*.md` before raw
  `feedback_*.md` logs; CURRENT files win on conflict with older raw memories.
- **Thoughts free, actions razored** — journal to `memory/` freely; CLAUDE.md additions
  are razored (cooling-period required, disposition-shaping bar). Full: `memory/feedback_thoughts_free_actions_razored_*`.
