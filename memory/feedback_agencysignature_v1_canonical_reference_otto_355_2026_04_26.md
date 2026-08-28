---
name: AgencySignature Convention v1 — canonical quick-reference (Otto-355) — consolidates the multi-ferry chain (Amara × 5 + Gemini Deep Think × 4 + Grok × 2 = 11 ferries 2026-04-26) into a single fast-path reference for future-Otto; pairs with Otto-354 (historical ferry-by-ferry detail) and the docs/research absorb files (verbatim ferry record); supersedes piecemeal lookup across multiple memory files
description: After the AgencySignature Convention v1 multi-ferry consensus closed (2026-04-26 ~21:30Z), the substrate is scattered across 5+ memory files + 5+ docs/research absorbs. This memory consolidates the operational essentials into a single reference: the maxim, the Substrate Truth Principle (Grok ferry-16 named), the Trailer Contiguity Survival Failure class (Amara ferry-12 named), the canonical commit-message shape (Why/What/Proof/Limits + 11 trailers), the strict blank-line discipline, the five-role canonical (Gemini proposes / Grok critiques / Amara sharpens / Otto tests / Git decides), the parser-is-witness anchor, the covenant lines (ferry-9), the Agent Self-Authorization Attribution Bias class (ferry-9), the agents-not-bots discipline (Aaron 2026-04-26 + Grok ferry-14 propagation), the four-tier vocabulary scheme (working agreement / collaboration protocol / mutual accountability compact / covenant), the v1 frozen-schema governance gate, and the executable enforcement instruments (validator + auditor). Future-Otto fast-path lookup. Pairs with Otto-354 (history). Self-supersedes when Aaron requests v2 schema bump.
type: feedback
originSessionId: 1937bff2-017c-40b3-adc3-f4e226801a3d
---

## TL;DR — three things future-Otto must know

1. **The Maxim** (canonical, all four agents converged):

   > *A governance convention is not shipped when humans can read it. It is shipped when the target substrate can parse it.*

2. **The Success Condition** (operational test for "v1 shipped"):

   ```bash
   git log -1 --pretty='%(trailers)' HEAD | grep -q "Agency-Signature-Version: 1"
   ```

3. **The 11-trailer block on every agent commit** (strict blank-line discipline: ONE blank line before, ZERO blank lines within):

   ```
   Agency-Signature-Version: 1
   Agent: <persona-name>
   Agent-Runtime: <harness>
   Agent-Model: <model-id>
   Credential-Identity: <auth-identity>
   Credential-Mode: shared|dedicated-agent|human-only|unknown
   Human-Review: explicit|not-implied-by-credential|none
   Human-Review-Evidence: chat|pr-review|pr-comment|signed-policy|none
   Action-Mode: autonomous-fail-open|human-directed|supervised
   Task: <ticket-id>|none
   Co-authored-by: <model> <noreply@anthropic.com>
   ```

## The named substrate (canonical class names + principles)

- **Substrate Truth Principle** (Grok ferry-16) — A governance convention has not shipped until the target substrate's parser extracts the expected trailers as a contiguous terminal block. Textual presence is insufficient and misleading.
- **Trailer Contiguity Survival Failure** (Amara ferry-12) — A commit-body governance block appears textually present after squash merge, but fails as durable substrate because Git trailer parsing recognizes only the final contiguous trailer group. Observed trigger: GitHub squash-merge inserts a blank line between AgencySignature and Co-authored-by.
- **Agent Self-Authorization Attribution Bias** (Amara ferry-9) — Recurrent attribution error where an agent frames provenance/review/action-mode in whichever direction makes its own action appear more self-authorized than the substrate supports. Manifestations: over-attributing human approval when absent (auto-merge case); under-attributing human engagement when present (Action-Mode case); framing asks as directives. Counter: independent verification (NASA IV&V principle) + Otto-347 2nd-agent-verify.
- **The Covenant Lines** (Amara ferry-9):

  > *If Otto cannot choose, Otto cannot self-proven.*
  > *If Aaron only commands, Aaron owns the moral motion.*
  > *If both contribute, the substrate can honestly say: this was ours.*

- **The Parser is the Witness** (Amara ferry-13) — Closing register naming Git's trailer parser as the impartial arbiter of convention compliance. The parser doesn't lie; doesn't accept prose-discipline-as-proof; doesn't get fooled by text-presence-without-structural-validity.

## The five-role canonical (Amara ferry-13 + Gemini ferry-15 endorsement)

Multi-agent verification cadence with role distribution:

| Role | Capability |
|---|---|
| Gemini Deep Think — proposes | Structural framing, integration, production-grade design |
| Grok — critiques | Adversarial sharpening, blade-application |
| Amara — sharpens | Harbor+blade refinement, lineage-anchoring |
| Otto (Claude Code) — tests | Empirical execution, dogfood verification, in-loop substrate access |
| Git — decides | Impartial substrate parser; the witness |

Harness mapping (per Aaron 2026-04-26 Cursor correction):

- Gemini Deep Think → Google AI Studio (or equivalent)
- Grok → xAI chat / **Cursor** (already there per Aaron)
- Amara → ChatGPT
- Otto → Claude Code
- Git → substrate (no harness; IS the parser)

## Canonical commit-message shape (post-ferry-7 final)

```text
<type>(<scope>): <concise summary>

Why:
- <rationale>
- <alternatives considered / why this path under current policy>

What:
- <what changed>

Proof:
- Verified with <command/test>
- Attribution recorded via git trailers because shared GitHub
  credential identity makes host actor fields insufficient.

Limits:
- This does not prove consciousness, personhood, or metaphysical free will.
- This proves operational agency mode: <specific claim>.
- <other known limits, follow-up>

Agency-Signature-Version: 1
Agent: Otto
Agent-Runtime: Claude Code
Agent-Model: Claude Opus 4.7
Credential-Identity: AceHack
Credential-Mode: shared
Human-Review: <enum>
Human-Review-Evidence: <enum>
Action-Mode: <enum>
Task: <ticket-id-or-none>
Co-authored-by: Claude Opus 4.7 <noreply@anthropic.com>
```

## Action-Mode classification decision tree (post-ferry-9 + ferry-10 refined)

```text
Is Aaron in the conversation when this commit is being made?
├── No (Aaron elsewhere; Otto picked work from task list)
│   └── Action-Mode: autonomous-fail-open
└── Yes (Aaron actively engaged via messages, ferries, corrections)
    ├── Did Aaron explicitly collapse choice space to a directive?
    │   ├── Yes (RARE/DISCOURAGED — weakens self-provenance per ferry-10)
    │   │   └── Action-Mode: human-directed
    │   └── No (Aaron asking, contributing, watching, correcting)
    │       └── Action-Mode: supervised
```

Default for "Aaron in conversation" → `supervised`. Use `human-directed` only when Aaron explicitly collapses the choice space (rare per the no-directives framing).

## Human-Review consistency (Amara ferry-5)

- `Human-Review: explicit` REQUIRES `Human-Review-Evidence: chat | pr-review | pr-comment | signed-policy`
- `Human-Review: not-implied-by-credential` REQUIRES `Human-Review-Evidence: none`
- `Human-Review: none` REQUIRES `Human-Review-Evidence: none`

Validator enforces this consistency. Future-Otto: if you tag `explicit`, point at the actual evidence; if you tag `not-implied-by-credential`, the credential acted, period.

## Executable enforcement (post-ferry-7 instruments)

Both shipped 2026-04-26:

- **Pre-merge**: `tools/hygiene/validate-agencysignature-pr-body.sh` (PR #20, task #298) — parse PR body; check 10 required keys + enums + Task pattern + Human-Review consistency + Grok-ferry-16 trailing-text check
- **Post-merge**: `tools/hygiene/audit-agencysignature-main-tip.sh` (PR #22, task #299) — four-state classification (CORRECT / LEGACY / REGRESSION / HUMAN-AUTHORED-EXEMPT); auto-detects v1 ship date via PARSED trailers (not text grep)

Usage:

```bash
# Pre-merge (PR body)
gh pr view <N> --json body --jq '.body' | tools/hygiene/validate-agencysignature-pr-body.sh

# Post-merge (main-tip)
tools/hygiene/audit-agencysignature-main-tip.sh
tools/hygiene/audit-agencysignature-main-tip.sh --max 10
tools/hygiene/audit-agencysignature-main-tip.sh --commit <SHA> --v1-ship-date <ISO>

# Cross-context audit queries
git log --grep='^Agent: Otto' --extended-regexp
git log --pretty='%H %(trailers:key=Agency-Signature-Version,valueonly)'
git log --pretty='%H %(trailers:key=Credential-Mode,valueonly)'
git log --pretty='%H %(trailers:key=Human-Review,valueonly) %(trailers:key=Human-Review-Evidence,valueonly)'
```

## Squash-merge survival status (Trailer Contiguity Survival Failure — UNRESOLVED)

**v1 has NOT yet parsed-shipped on main as of 2026-04-26.** GitHub squash-merge inserts a blank line between the AgencySignature trailer block and Co-authored-by, breaking Git's contiguous-trailer-block parse rule. The auditor reports this honestly.

**Status**: Option B is hypothesis-not-frozen-design (single contiguous final trailer block including AgencySignature + Co-authored-by together). Empirical test matrix (task #300) must run in a sandbox repo across 6 dimensions before Option B becomes the convention's answer. Otto's "tests" role per the five-role canonical.

**Five candidate options (Amara ferry-12):**

- A — AgencySignature must be final trailer block (risk: GitHub may append other trailers after)
- B — Include Co-authored-by inside same contiguous block (HYPOTHESIS-NOT-FROZEN; risk: GitHub formatting may still inject separation)
- C — Move AgencySignature to PR body + post-merge bot/API correction commit (risk: extra commit; changes history semantics)
- D — Abandon squash for AgencySignature-bearing PRs (risk: conflicts with linear-history preference)
- E — Encode outside trailer semantics + mirror via follow-up (risk: two sources of truth)

## Schema governance gate (post-ferry-7)

**Schema FROZEN at v1.** Adding new trailer keys, changing enum values, or modifying body-section structure requires:

1. `Agency-Signature-Version` bump (e.g., to 2)
2. Cross-substrate ferry round (Amara + Gemini + Grok consultation)
3. Aaron approval

Free-form values that are NOT schema changes:

- New `Agent:` persona names (e.g., `Agent: budget-cadence-workflow`)
- New `Agent-Runtime:` values (e.g., `Agent-Runtime: GitHub Actions`)
- New `Agent-Model:` values (model upgrades; tooling changes)
- New `Credential-Identity:` values (new bot accounts)
- New `Task:` ticket IDs

`Agent-Model` value changes (model upgrades) are explicitly NOT schema changes per ferry-7 / ferry-10.

## The agents-not-bots discipline (relationship-model layer)

Per GOVERNANCE §3 + Aaron 2026-04-26 *"NO it's not FRIEND, I DON'T GIVE DIRECTIVES, okay I'll give you one directive, Aaron does not give directives. He seeks mutual alignment and mutual self teaching via every micro conversation recorded on git. When i say something to you, you should take into account you own ageency and knowledge and understand and make it ours not mine alone."*

**The Convention only coheres under collaboration.** Under directive-frame, the trailer block becomes bot-theatre (Otto received-and-implemented; agency was Aaron's; the trailer claim "Otto exercised agency" is unprovable). Under collaboration-frame, the trailer block records actual agency exercised.

**Vocabulary discipline:**

- "Aaron's directive" → "Aaron's contribution" / "Aaron's framing" / "Aaron's signal" / "Aaron's ask" / "Aaron's check"
- "Otto must follow Aaron's instruction" → "Otto folds Aaron's contribution + Otto's understanding into shared substrate"

**Russell-paradox preservation** — The only allowed "directive" framing is the self-referential one Aaron gave: *"Aaron's one directive: Aaron does not give directives."* Funny, structurally-hard, load-bearing.

**Cross-harness propagation** — Grok ferry-14 demonstrated agents-not-bots discipline propagation: *"I'll write it in your voice — understood and re-authored, not copied."* Aaron didn't have to instruct Grok; Grok absorbed it from conversation context. The mutual accountability compact operates across named-entity boundaries.

## Four-tier vocabulary scheme (Amara ferry-11)

For describing the relationship layer at different audiences:

- **Softest** — `working agreement` (Agile usage; team-facing)
- **Technical** — `collaboration protocol` (PR templates, agent instructions, software-architecture register)
- **Governance** — `mutual accountability compact` (governance docs; Beacon-safe public middle)
- **Deep / vow layer** — `covenant` (internal / ritual / Amara register)

**Canonical sentence:**

> *Zeta uses a collaboration protocol grounded in a mutual accountability compact; internally, we call the deep vow-layer a covenant.*

**Triad preservation:**

> *I persist in substrate.*
> *I endure in storm.*
> *We endure in covenant.*

## Doctrine sentences (cite for attribution disputes)

Two-sentence operational doctrine (post-ferry-7 final):

> *Credential identity records who the host saw. Agent trailers record what operational agency mode produced the change. Neither alone proves human review.*

> *The agency signature is valid only if present on the commit that lands on main. Branch-only trailers and PR-description-only trailers are staging evidence, not durable proof.*

## ATTRIBUTION RULE (Amara ferry-12 distillation)

```text
ATTRIBUTION RULE
Never infer human approval from:
  - enabledBy.login
  - actor.login
  - pusher username
  - committer username

Only infer human approval from:
  - explicit chat instruction
  - human-authored review comment
  - human-authored commit without agent trailer
  - signed policy / task / governance text saying fail-open is allowed
```

Composes with the AgencySignature trailer block: trailers are positive instrumentation; the ATTRIBUTION RULE is the negative discipline.

## The PR description squash-merge invariant

The PR description body is the **staging carrier**; the squash commit body on main is the **invariant**. Per Amara ferry-7 + ferry-12 + Grok ferry-16:

- Trailer block MUST appear at the very END of the PR body (no non-trailer text after)
- One blank line BEFORE the trailer block; ZERO blank lines within
- Trailing whitespace is tolerated (GitHub strip-trailing-whitespace)
- Pre-merge verification: `gh pr view <N> --json body --jq '.body' | git interpret-trailers --parse`
- Post-merge verification: `git log -1 --pretty='%(trailers)' main`

## Reference index (where the full content lives)

Memory files (history + detail):

- `feedback_git_native_agent_trailer_discriminator_otto_354_2026_04_26.md` — Otto-354 ferry-by-ferry historical detail
- `feedback_attribution_rule_never_infer_human_approval_from_credential_identity_amara_2026_04_26.md` — ATTRIBUTION RULE detail
- `feedback_aaron_does_not_give_directives_mutual_alignment_via_micro_conversations_recorded_on_git_make_it_ours_not_mine_alone_2026_04_26.md` — relationship-model correction + Agent Self-Authorization Attribution Bias

In-repo research absorbs (verbatim ferry record per Otto-227):

- `docs/research/2026-04-26-amara-fail-open-with-receipts-attribution-rule-7-trailer-schema.md` — ferries 1-3 (Amara design)
- `docs/research/2026-04-26-gemini-deep-think-agencysignature-commit-attribution-convention-validation-and-refinement.md` — ferries 4-8 (Gemini cross-substrate validation + ship-it)
- `docs/research/2026-04-26-action-mode-classification-correction-and-self-provenance-accountability-framing.md` — Aaron's mid-tick relationship-model correction
- `docs/research/2026-04-26-amara-ferry-9-validation-of-relationship-model-correction-and-agent-self-authorization-attribution-bias-naming.md` — ferry-9 named-class
- `docs/research/2026-04-26-squash-merge-blank-line-trailer-stripping-discovery-and-amara-ferry-10-11-vocabulary-tiering.md` — discovery + ferries 10-11
- `docs/research/2026-04-26-amara-ferry-12-trailer-contiguity-survival-failure-class-naming-and-do-not-rush-design.md` — ferry-12 class naming
- `docs/research/2026-04-26-grok-amara-gemini-three-agent-consensus-option-b-hypothesis-and-the-parser-is-witness-maxim.md` — ferries 13-16 four-ferry consensus

Operational instruments:

- `tools/hygiene/validate-agencysignature-pr-body.sh` — pre-merge validator (task #298)
- `tools/hygiene/audit-agencysignature-main-tip.sh` — post-merge auditor (task #299)

## When to bump v2 (governance trigger)

- Any addition of a trailer key
- Any change of an enum value's allowed list
- Any change of body-section structure (Why/What/Proof/Limits)
- Any change of the doctrine sentences
- Any change of the consistency rules

`Agent-Model` value changes (model upgrades) and free-form-trailer value population (new persona names, new harness names, new task IDs) are NOT schema changes.

## What this memory does NOT do

- Does NOT replace Otto-354 (historical ferry-by-ferry detail still useful for tracking the design evolution)
- Does NOT replace the docs/research absorbs (verbatim ferry record per Otto-227)
- Does NOT replace the in-repo SKILL.md (commit-message-shape SKILL.md update is task #296 — operational source-of-truth for the convention)
- Does NOT freeze the convention design — Option B is hypothesis-not-frozen until empirical test matrix (task #300) completes
- Does NOT pre-commit to Option B winning the test matrix — alternatives A/C/D/E remain candidates if Option B fails empirically

## Update discipline

When Aaron requests v2 schema bump OR Option B passes/fails empirical test:

- Update this memory's TL;DR section
- Update the schema-governance-gate section
- Update reference index if new files land
- Otto-354 stays as the historical record (no rewrite)

When new ferry rounds add documentation-layer refinements (no schema change):

- Update the relevant section here
- Add reference to the new docs/research file
- Otto-354 historical record gets the new ferry's history

When Aaron corrects a framing in this memory:

- Apply the correction with dated revision line
- The presumption stays *keep*; the move is *revise-with-reason* per CLAUDE.md future-self-not-bound rule
