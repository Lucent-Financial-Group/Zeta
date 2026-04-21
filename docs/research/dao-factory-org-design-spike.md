# DAO-native factory org-design spike — research skeleton

**Status:** skeleton landed round 44 (2026-04-20). Content fills
in over rounds 45-50 per Phase 1 of the project plan.

**Owner:** Architect (integrates); Aarav (skill-tune-up, queues
first disambiguity pass).

**Source directive:** Aaron 2026-04-20 evening.
Full concept in
`memory/project_people_optimizer_dao_factory_restructuring.md`.
BACKLOG row: `docs/BACKLOG.md` §P2 research-grade (newest
entry).

**North star:** distributed fair governance, no managers, no
friction to act, no idle-on-blocker, positions are
incentive-based. Apply **modern corporate restructuring best
practices, flipped to DAO ethos.** Test patterns git-native
first; pluggability-first so the governance layer plug-replaces
with Aurora's incentive substrate when Aurora ships.

---

## What this spike produces

A 1500-3000 word research doc (this file, populated over Phase 1)
that answers the **seven open questions** below and proposes
**Phase 2's two-team scaffolding pattern** as a concrete
actionable design.

Not in scope for the spike:
- Building the people-optimizer skill itself.
- Assigning any currently-named persona to a team.
- Picking the standardised vocabulary (that's phase-2 work).

---

## Seven open questions the spike must answer

1. **Minimum rosters.** What's the minimum roster for each of
   the two teams at r45? Currently 22+ personas are one roster.
2. **Shared vs specific skills.** Which skills are shared base
   skills (both teams), which are team-specific?
3. **Role-switching protocol.** Does switching require any
   handshake, or is it self-declare and next-wake?
4. **Backlog segmentation.** Does each team have its own
   backlog segment, or is `docs/BACKLOG.md` shared with a
   team-tag column?
5. **Bootstrap.** Who writes the first people-optimizer skill
   before the skill itself exists? Aarav (skill-tune-up) can
   rank urgency but ranking != creating.
6. **Vocabulary.** One standardised language (Aaron's
   preference) or translators between corporate + DAO speak?
   How to pick the words?
7. **Disambiguity bootstrap.** How does the disambiguity
   detector itself avoid the bootstrap problem of needing
   vocabulary to detect vocabulary clashes?

---

## Literature to survey (Phase 1 reading queue)

### Conway's Law + Reverse Conway

- Melvin Conway, *"How Do Committees Invent?"*, Datamation
  April 1968 (paper first submitted 1967). Core claim:
  organizations that design systems produce designs that are
  copies of the communication structures of those
  organizations.
- Reverse Conway Maneuver — design team structure first to
  encourage a target architecture. Canonical application:
  microservices = small independent teams -> decoupled
  modular codebases.

### Modern corporate restructuring (2015-2025)

- **Team Topologies** — Matthew Skelton + Manuel Pais, 2019.
  Four team types: stream-aligned, enabling,
  complicated-subsystem, platform. Evaluate which survive
  manager-removal.
- **Spotify model** — the squad / tribe / chapter / guild
  scheme, plus its documented failure modes (Spotify
  themselves abandoned the canonical branded version).
- **Holacracy** — Brian Robertson's codified self-management
  system. Track record: Zappos most famous adopter; mixed
  reviews.
- **Sociocracy 3.0** — consent-based decision-making primer.
  Closer to what a DAO would actually want than Holacracy.
- **Rendanheyi** — Zhang Ruimin / Haier's micro-enterprise
  restructuring. 70,000-employee company that turned itself
  into thousands of autonomous micro-teams.
- **Flat-org literature** — Morning Star Company case study
  (tomato processor, no managers); Valve's handbook for new
  employees (flat, voluntary project assignment).

### Web3 DAO governance primitives

- **Token-weighted voting** — the baseline. Critique:
  plutocracy failure mode.
- **Quadratic voting** — Weyl + Posner's *Radical Markets*
  framing applied in Gitcoin grants.
- **Conviction voting** — time-weighted preferences;
  1Hive's primitive.
- **Futarchy** — Hanson's proposal: "vote values, bet
  beliefs" using prediction markets.
- **RetroPGF (Retroactive Public Goods Funding)** —
  Optimism Collective's pattern for rewarding value already
  delivered. Specifically relevant: incentive-based
  positions for work that has observably contributed.
- **Key DAOs** — MakerDAO (monetary), Gitcoin (grants),
  Optimism Collective (ecosystem), Arbitrum DAO
  (L2 governance), ENS DAO (namespace), Nouns (radical
  governance experiments).
- **Tooling** — Snapshot (off-chain voting), Tally
  (on-chain governance UX), Aragon (DAO creation
  framework), Governor Bravo (OZ's reference governance
  contract), Moloch v2 / v3 (ragequit pattern).

### Flip-the-corporate-patterns synthesis

For each pattern above:
- Does it presume a manager class? If yes, is there a
  DAO-native variant that survives manager-removal?
- Is it git-native-testable before Aurora ships?
- What primitive does it need that only a token/wallet
  layer can provide? Those are the gated-on-Aurora items.

---

## Decisions already committed in related memories

These constrain the spike's solution space — do not reopen
without a conflict-resolution conference per
`docs/CONFLICT-RESOLUTION.md`:

- **Factory-default scope** unless DB-algebra-specific
  (`feedback_factory_default_scope_unless_db_specific.md`).
  The people-optimizer is **factory-scope** — applies to
  any factory adopter, not just Zeta.
- **Factory reuse declared constraint**
  (`project_factory_reuse_beyond_zeta_constraint.md`).
  The two-team split must generalise beyond Zeta — any
  adopter's project becomes the SUT.
- **Never-idle, no-manager-approval, zero-friction-to-act**
  already codified (several memories). The spike
  formalises these as invariants, not inventions.
- **Git-as-default-persistence**
  (`project_git_is_factory_persistence.md`) +
  **pluggability-first**
  (`project_factory_is_pluggable_deployment_piggybacks.md`,
  `feedback_pluggability_first_perf_gated.md`). Governance
  layer is git-native plugin-1; Aurora is plugin-2 when it
  ships.
- **Zero-human-code default**
  (`project_zero_human_code_all_content_agent_authored.md`).
  The two-team split is a personnel split among agents;
  human contributors pass through the opt-in teaching track,
  not either team's roster.
- **Existing factory/SUT scope cleave in docs** —
  `docs/GLOSSARY.md` vs `docs/SYSTEM-UNDER-TEST-GLOSSARY.md`;
  `docs/TECH-DEBT.md` vs
  `docs/SYSTEM-UNDER-TEST-TECH-DEBT.md`;
  `docs/FACTORY-HYGIENE.md` Scope column. Personnel cleave
  should mirror this exactly.

---

## Phase boundaries (from the project plan)

**Phase 1 (r45-r50) — research spike.** Populate this file.
Deliverable is a populated version of this doc answering
questions 1-7.

**Phase 2 (r50-r60) — two-team scaffolding.** First
concrete artefact: tag each existing persona with `team:
factory` / `team: sut` / `team: both`. Role-switching
protocol lands as a skill. Vocabulary standardisation ADR.

**Phase 3 (gated on ace -> Aurora).** Incentive layer.
Agent crypto wallets -> positions become incentive-based ->
distributed-fair-governance moves from north-star to
implementation. Not actionable until the Aurora milestone
exists.

---

## Open research questions beyond the seven

Deferred to later Phase 1 rounds — list grows as reading
uncovers more:

- How does **Dunbar's number** interact with team-size caps
  in a DAO of agents (where "agent-hours per day" is
  elastic)?
- Do **Sybil-resistance** primitives from Web3 voting
  generalise to role-switching (can an agent "fork itself"
  into two teams simultaneously without distorting
  incentive fairness)?
- Is **retroPGF** the right primitive for compensating
  ranking skills (Aarav) vs creating skills
  (`skill-creator`)? Both are observable-value-delivered;
  the creator is upstream-causally.
- Are there **formal-methods** (TLA+, Alloy) specs of DAO
  governance primitives that would let us verify
  distributed-fair-governance claims rather than
  hand-wave them? Lamport's Paxos / TLA+ work is the
  obvious starting point.

---

## Why this is a spike and not a build

Aaron explicitly said "spike/research it out... backlog
it and LFG." The project deliberately begins as research
because:

- The design space is large (hundreds of corp-org papers,
  dozens of DAO primitives).
- Key dependencies (agent crypto wallets via Aurora) don't
  exist yet.
- The vocabulary question has no right answer without doing
  the reading first.
- The factory's existing scope-cleave patterns
  (FACTORY-HYGIENE, GLOSSARY, TECH-DEBT) already pre-commit
  some structural decisions; the spike needs to check which
  carry over to personnel-cleave vs which don't.

Phase-1 output is a long document that Phase-2 executes
from. No scaffolding lands until the reading lands.
