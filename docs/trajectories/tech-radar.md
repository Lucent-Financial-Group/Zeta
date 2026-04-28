# Trajectory — Tech Radar

## Scope

ThoughtWorks-style Tech Radar tracking — Adopt / Trial / Assess /
Hold rings for every technology decision the factory faces (tools,
libraries, frameworks, services). The existing `docs/TECH-RADAR.md`
file IS the artifact this trajectory wraps; the trajectory adds
the world-modeled forecast layer (what's moving toward Adopt;
what's drifting toward Hold; new entrants on the Assess ring).
Open-ended because the technology landscape evolves continuously.
Bar: every load-bearing technology in Zeta has a radar row; rings
reflect current evidence; quarterly review keeps the radar fresh.

## Cadence

- **Per-decision**: when Zeta picks up / drops / re-evaluates a
  technology, the radar row updates.
- **Per-evidence**: when a Trial-ring tech accumulates evidence,
  it graduates to Adopt (or back to Assess if evidence is
  negative).
- **Quarterly**: full radar review (`tech-radar-owner` skill).
- **Per-batch**: when a research-batch (Amara ferries etc.)
  surfaces multiple radar rows, batch them.

## Current state (2026-04-28)

- `docs/TECH-RADAR.md` — active radar; ThoughtWorks ring
  conventions
- Tech-radar-owner skill (`.claude/skills/tech-radar-owner/SKILL.md`)
- Recent batches: Amara 8th-ferry recommendations (5 rows
  landed via tech-radar batch 5)
- Rings populated across: programming languages, build tools,
  test frameworks, formal verification tools, distributed
  systems primitives, crypto primitives, CI/CD platforms, etc.

## Target state

- Every technology in Zeta's stack has a radar row.
- Rings are current — no stale Trial rows that should be Adopt
  or Hold.
- Forecast section per row anticipates ring transitions.
- Cross-references: each radar row cites its trajectory (this
  static-analysis row cites the static-analysis trajectory etc.).

## What's left

In leverage order:

1. **Quarterly review reactivation** — when did `tech-radar-owner`
   last run a full pass? Surface candidate.
2. **New entrant scouting** — ast-grep, biome, F\*, others
   queued from active-tracking trajectories.
3. **Cross-trajectory cross-references** — every radar row
   should cite its parent trajectory; many don't yet.
4. **Hold-ring audit** — technologies on Hold that may now be
   re-evaluable (e.g. SIKE collapsed; lattice replaced; check
   for similar shifts).
5. **Adoption-evidence formalization** — what counts as
   evidence to graduate Trial → Adopt; document the bar.

## Recent activity + forecast

- 2026-04-27: tech-radar batch 5 (5 rows from Amara 8th-ferry
  recommendations) landed.
- 2026-04-23: 8th-ferry research absorbs.
- (Cross-ref: `docs/TECH-RADAR.md` git history.)

**Forecast (next 1-3 months):**

- Quarterly review candidate.
- New entrants from active-tracking trajectories — ast-grep,
  biome (static-analysis); F\* (formal-analysis); newer
  cross-AI tools (cross-AI ferry coordination).
- Wallet-experiment v0 may add radar rows (x402, EIP-7702,
  ACP/SPTs).

## Pointers

- Doc: `docs/TECH-RADAR.md`
- Skill: `.claude/skills/tech-radar-owner/SKILL.md`
- Cross-ref: every active-tracking trajectory's
  Research/news section feeds candidates here

## Research / news cadence

External tracking required — this is the *meta*-active-tracking
trajectory (it tracks which technologies should be tracked).

| Source | What to watch | Cadence |
|---|---|---|
| ThoughtWorks Technology Radar (volume publishing) | Macro-level tech-trend signal; framing for our local radar | Semi-annual |
| Hacker News / lobste.rs / arxiv-sanity | Bottom-up new-tech surfacing | Weekly |
| State of JS / State of .NET / State of CSS surveys | Aggregate-evidence ring transitions | Annual |
| GitHub Trending repositories | Bottom-up adoption signal | Weekly (light) |
| CNCF landscape | Cloud-native infra | Quarterly |

Findings capture: candidate-tech → radar row in Assess; Assess →
Trial → Adopt or Hold based on accumulated evidence per the
quarterly review. New trajectory candidates surface here.
