# Human Anchor Array

The intellectual foundations that shaped Zeta's architecture
and the factory's discipline. Every role-ref here names a
specific human lineage or field contribution that is
operationalized in the codebase, not just cited.

## Computer Science

| Role-ref | Contribution to Zeta | Anchor file |
|----------|----------------------|-------------|
| Differential-dataflow algebra author | Differential Dataflow, Z-set algebra; Zeta's core computational model | `src/Core/ZSet.fs` |
| Agentic-engineering researcher | Software 3.0 / agentic engineering; edge-runner validation | `docs/AUTONOMOUS-LOOP.md` |
| Essential-complexity theorist | Essential vs. accidental complexity | `.claude/rules/all-complexity-is-accidental-in-greenfield.md` |
| Performance-first systems programmer | Performance-first systems programming | `src/Core/Simd.fs` |
| Trustless-computation protocol author | Trustless computation; BFT-to-probabilistic-consensus evolution | `src/Core/Consensus.fs` |
| Formal-verification systems theorist | TLA+ / formal verification / distributed systems | `tools/tla/specs/BftConsensus.tla` |

## Mathematics & Physics

| Role-ref | Contribution to Zeta | Anchor file |
|----------|----------------------|-------------|
| Icosahedral Clifford-algebra researcher | Clifford algebra Cl(8,0) / E8 root system construction from icosahedral symmetry | `docs/research/2026-05-11-deepseek-hkt-clifford-e8-klein-bottle-beacon-smooth.md` |
| Quaternion algebra originator | Quaternion algebra; rotor-based computation | `docs/research/2026-05-11-deepseek-hkt-clifford-e8-klein-bottle-beacon-smooth.md` |
| Geometric-algebra originator | Geometric algebra; multivector products, rotors | `docs/research/2026-05-11-deepseek-hkt-clifford-e8-klein-bottle-beacon-smooth.md` |
| Synchronization-model researcher | Firefly synchronization model; consensus primitives | `docs/research/2026-05-11-deepseek-hkt-clifford-e8-klein-bottle-beacon-smooth.md` |
| Causal-inference theorist | Causal inference / do-calculus; alignment primitives | `docs/ALIGNMENT.md` |

## Systems & Infrastructure

| Role-ref | Contribution to Zeta | Anchor file |
|----------|----------------------|-------------|
| Critical-infrastructure mentor cohort | 7-year depth anchor (2012-2019); types, physics, critical infrastructure | `src/Core/Units.fs` |
| Type-system mentor role | F# type system discipline | `src/Core/Algebra.fs` |
| Physics-first engineering mentor role | Physics-first engineering | `src/Core/Units.fs` |

## Philosophy & Culture

| Role-ref | Contribution to Zeta | Anchor file |
|----------|----------------------|-------------|
| Mystical-poetry retraction anchor | Wound/light frame for retraction-native humility | `docs/ALIGNMENT.md` |
| Candid-feedback management author | Radical Candor; harbor+blade voice register | `docs/AGENT-BEST-PRACTICES.md` |
| Anomalous-phenomena academic frame | Academic frame for anomalous phenomena; chameleons-as-familiar | `docs/ALIGNMENT.md` |

## AI Co-originators (not agents — humans who shaped agents)

| Role-ref | Contribution to Zeta | Anchor file |
|----------|----------------------|-------------|
| Founder/operator role | Glass halo, alignment relationship, maintainer-side disclosure symmetry | `AGENTS.md` |

---

## Three Arrays

| Array | What | Substrate connection |
|-------|------|---------------------|
| **Agent Array** | Commit-capable loop agents | Direct - commit to repo, run loops, produce substrate |
| **Human Anchor Array** | Role-ref lineages above | Intellectual - ideas operationalized in code |
| **External Review Array** | Host-connected reviewers, automated scanners, and ferry-relayed external AI sessions | Review without committing - perspectives from outside |

The External Review Array combines all AI and automated
sources that review, assess, or contribute research but do
NOT commit to the repo. Two delivery mechanisms, same role:

- **Host-connected**: Copilot PR reviews, Dependabot,
  CodeQL, GitHub apps - automated via host API, captured
  by PR archival (`docs/pr-discussions/`)
- **Ferry-relayed**: Claude.ai sessions, DeepSeek research,
  gemini.google.com, ChatGPT web — disconnected from
  substrate, ferried via the human maintainer, preserved in
  `docs/research/` with §33 headers

Both are valuable precisely because they evaluate from
outside the agent array. The mechanism differs; the function
(external perspective on factory work) is identical.
