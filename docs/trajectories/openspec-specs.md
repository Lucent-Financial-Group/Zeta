# Trajectory — OpenSpec Specs

## Scope

Behavioral specs under `openspec/specs/**` and the Zeta-modified
OpenSpec workflow (no archive, no change-history per
`openspec/README.md`). Open-ended because specs evolve as
understanding deepens, new capabilities land, old shapes get
deprecated. Bar: every behavioral capability has a current,
honest spec; specs don't drift from code; missing-spec rows on
new capabilities don't pile up.

## Cadence

- **Per-capability**: when a capability ships or churns
  meaningfully, its spec gets touched in the same PR.
- **Full audit**: monthly — every spec under `openspec/specs/**`
  re-read for drift against current code/behavior.
- **Coverage check**: per-round — what shipped this round that
  doesn't have a spec? (`spec-zealot` enforces.)

## Current state (2026-04-28)

| Capability | Spec path | State |
|---|---|---|
| Operator algebra core | `openspec/specs/operator-algebra/` | active; chain-rule + retraction-native invariants documented |
| Circuit recursion | `openspec/specs/circuit-recursion/` | active |
| Retraction-safe recursion | `openspec/specs/retraction-safe-recursion/` | active |
| Durability modes | `openspec/specs/durability-modes/` | active |
| LSM spine family | `openspec/specs/lsm-spine-family/` | active |
| Repo automation | `openspec/specs/repo-automation/` | active |
| Aurora (consent / oracle layer) | research only | round-3 integration in flight; not yet promoted to `openspec/specs/` |
| Wallet experiment v0 | research only | spec deferred until v0 ships |
| EAT (Economic Agency Threshold) | research only | spec deferred until experiment lands |

Total: 6 shipped spec capability families under
`openspec/specs/`, plus research-grade candidates pending
promotion.

## Target state

- 100% of shipped behavioral capabilities have a current spec.
- Every spec is annotated with its formal-verification mapping
  (which TLA+ / Lean / Z3 / Alloy artifact verifies it, if any).
- `spec-zealot` finds zero drift between spec and code on full
  audit.
- New capabilities land with spec in same PR (or follow-up tracked
  in BACKLOG).

## What's left

In leverage order:

1. **Aurora round-3 integration** (task #286) — §6 inference
   architecture + §7 performance doctrine + 2 companion docs
   pending integration absorb.
2. **Spec ↔ formal-verification cross-reference** — every spec
   should cite its formal artifacts (or note "not formalized
   yet"); current state has implicit links.
3. **Drift audit cadence** — full monthly audit hasn't run since
   round 32-ish; needs reactivation.
4. **Wallet v0 spec** — pending experiment v0 launch; the EAT
   packet + wallet-v0 operational spec are research artifacts,
   not yet in `openspec/specs/`.
5. **Maintainer-action specs** — some maintainer-only operations
   (post-AceHack-rest, paired-sync round-close, etc.) have
   ad-hoc procedures; unclear if those should be openspec
   capabilities.

## Recent activity + forecast

- 2026-04-27: research absorbs landed for wallet v0 + EAT
  (research-grade, not yet promoted to openspec).
- 2026-04-26: B-0050 Lean reflection trajectory referenced
  IF4 (Lean-formalizable-in-principle) as gating filter — that
  filter applies to spec-promotion paths.
- 2026-04-24: Aurora 8th-19th ferry research absorbs — many
  feed into Aurora spec round-3.

**Forecast (next 1-3 months):**

- Aurora round-3 integration completes → spec depth grows.
- Wallet v0 operational test → if it ships, gets an openspec
  capability.
- B-0051 isomorphism catalog → may produce spec-level entries
  for retraction-algebra homomorphisms.

## Pointers

- Skill: `.claude/skills/openspec-expert/SKILL.md`
- Skill: `.claude/skills/spec-zealot/SKILL.md`
- Workflow doc: `openspec/README.md`
- Specs: `openspec/specs/**`
- Research: `docs/research/agent-wallet-protocol-stack-x402-eip7702-erc8004-2026-04-26.md`
  (wallet-experiment-v0 / EAT canonical artifacts referenced
  in the wallet-and-EAT trajectory land via a separate AceHack
  PR; this trajectory updates when they merge into LFG)
- BACKLOG row: task #286 Aurora round-3 integration
