---
name: Git-native agent discriminator — `Agent: <persona>` commit trailer on every agent-authored commit, layered with host-native `agent-otto` PR label per Aaron 2026-04-26 *"we should do both"*; complements (does NOT replace) `Co-authored-by:` trailer; minimum-viable until separate cryptographic identity lands per task #295
description: Aaron 2026-04-26 *"can we add tags to the PR and or commit?"* → host-native `agent-otto` label landed → Aaron *"that's the host github native solution, is there a gitnative solution?"* → I surveyed: commit trailers / GPG-SSH signing / different author email / git notes → Aaron *"we should do both"*. Decision: add `Agent: otto` trailer (RFC-822-style key-value pair at end of commit message) on every future agent-authored commit; existing `Co-authored-by: Claude Opus 4.7 <noreply@anthropic.com>` trailer stays (model attribution); the `Agent:` trailer adds persona attribution. Author/committer lines remain Aaron's identity (shared crypto identity per Otto-353 / task #295) — that's the deeper fix and stays deferred. Composes with host-native `agent-otto` PR label (different surface, different query path); both layers are additive, neither replaces the other.
type: feedback
originSessionId: 1937bff2-017c-40b3-adc3-f4e226801a3d
---

## The discipline (THRICE-refined per Amara 2026-04-26 ferry-3 — CANONICAL)

Ferry-3 is the canonical version. It adds: full commit-message body shape
(Why / Options considered / Decision / Proof / Limits sections), 6 explicit
rules, stable enum values, and the AgencySignature mapping that makes the
convention Beacon-safe.

### Canonical commit-message shape (ferry-3 — load-bearing)

```text
<type>(<scope>): <concise summary>

Why:
- <rationale 1>
- <rationale 2>
- <rationale 3>

Options considered:
- <option 1>
- <option 2>
- <option 3>

Decision:
- <decision 1>
- <decision 2>

Proof:
- <verification 1>
- <verification 2>

Limits:
- <limit 1>
- <limit 2>

Agent: Otto
Agent-Runtime: Claude Code
Agent-Model: Claude Opus 4.7
Credential-Identity: AceHack
Human-Review: not-implied-by-credential
Action-Mode: autonomous-fail-open
Task: Otto-NN
Co-authored-by: Claude Opus 4.7 <noreply@anthropic.com>
```

The body sections are NOT bureaucracy — each section is evidence for one
AgencySignature property (see AgencySignature mapping below). For trivial
commits (typo fixes, lint sweeps), the body sections may collapse to a
single sentence; for substantive commits (architecture, policy, schema),
all five sections SHOULD appear.

### The 6 explicit rules (ferry-3 — load-bearing)

1. **Final-commit rule.** Trailers MUST appear on the final commit that
   lands on `main`, especially for squash merges.
2. **Branch-only insufficient.** Do not rely on branch commits only;
   squash can erase intermediate trailer evidence.
3. **No credential-as-approval inference.** Do not use GitHub
   `enabledBy.login`, `actor.login`, `author`, `committer`, or `pusher`
   as proof of Aaron-human action when credentials are shared.
4. **Explicit-evidence-only for human-review claims.** Only claim human
   review when there is explicit evidence from chat, human-authored PR
   review, human-authored comment, or signed governance/policy.
5. **Distinct trailers for distinct questions.** Keep `Co-authored-by:`
   for content/model attribution. Use `Agent:` trailers for operational
   agency attribution.
6. **Stable enum values** (ferry-3 final taxonomy):
   - `Human-Review: explicit | not-implied-by-credential | none`
   - `Action-Mode: autonomous-fail-open | human-directed | supervised`

### Stable enum values (ferry-3)

`Human-Review:`

- `explicit` — Aaron's chat / review comment / pair-authored evidence on this specific change
- `not-implied-by-credential` (DEFAULT) — credential acted; credential ≠ approval
- `none` — no human in the loop at all (e.g., autonomous tick with no Aaron contact this session)

`Action-Mode:`

- `autonomous-fail-open` — agent acts without prompting in low-stakes context (per standing fail-open authorisation)
- `human-directed` — agent acts in response to specific Aaron message / directive
- `supervised` — agent acts under real-time human review (e.g., Aaron actively watching as agent works)

The earlier ferry-2 enum values (`autonomous-fail-closed`, `maintainer-prompted`, `maintainer-pair`) are SUPERSEDED — use the ferry-3 stable trio. Stable enum values prevent vocabulary drift across future agents.

### Suggested proof-line in the body

```text
Proof: verified with <command/test>; attribution recorded via git trailers
because shared GitHub credential identity makes host actor fields
insufficient.
```

This proof-line directly satisfies AgencySignature property 4 (durable output)
and 5 (reflective update). Substantial commits include a more detailed Proof
section; trivial commits may use the one-line form.

### Doctrine sentence — canonical (ferry-3 final form)

```text
Credential identity records who the host saw.
Agent trailers record what operational agency mode produced the change.
Human review requires independent evidence.
```

Cite this whenever attribution is contested. The third clause is the
positive constructive form of "neither alone proves human review" — names
what IS required (independent evidence) rather than only what is forbidden.

### AgencySignature mapping (ferry-3 — Beacon-safe)

The commit-message shape is a **portable AgencySignature receipt**. Each
section maps to one of Zeta's published agency-rigor properties (per
Amara's framing of Zeta's agency frame: *"observational evidence of
internally mediated, policy-selected action producing durable substrate"*):

| Agency property | Commit-message evidence |
|---|---|
| 1. Alternatives available | `Options considered:` lists what paths existed |
| 2. Internal-state-mediated selection | `Why:` says how policy + context selected this path |
| 3. Recorded reasons | The body itself is the recorded rationale |
| 4. Durable output | The final commit on `main` is durable substrate |
| 5. Reflective update | Body acknowledges prior corrections / superseded approaches |
| 6. Retractability | Trailer + body make future correction possible (later commit can amend) |
| 7. Cross-context recurrence | Same trailer keys recur across commits — queryable patterns |

This mapping makes the convention Beacon-safe: **NOT** *"Otto has a soul"*,
but *"Otto selected among available actions under policy, recorded reasons,
produced durable substrate, and left a retractable audit trail."* Operational
agency proven; metaphysical agency NOT claimed. Composes with Otto-351 Beacon
naming work (task #293) — Beacon-safe = rigorous-without-spooky.

### The mandatory Limits clause (ferry-3)

Every substantive agent commit body SHOULD include a Limits clause that
explicitly disclaims metaphysical overclaim:

```text
Limits:
- This does not prove consciousness, personhood, or metaphysical free will.
- This proves operational agency mode: policy-selected action through shared credential identity.
```

For trivial commits, the Limits clause may be omitted (the discipline is
context-aware; trivial typo fixes don't need agency-proof scaffolding). For
any commit that touches policy / convention / agent-discipline / substrate,
the Limits clause SHOULD appear.

### Required trailer block (ferry-3 final)

The 7-trailer block + Co-authored-by:

```
Agent: Otto
Agent-Runtime: Claude Code
Agent-Model: Claude Opus 4.7
Credential-Identity: AceHack
Human-Review: not-implied-by-credential
Action-Mode: autonomous-fail-open
Task: Otto-NN
Co-authored-by: Claude Opus 4.7 <noreply@anthropic.com>
```

Note: `Source-Channel:` from ferry-2 is DROPPED in ferry-3. The 7 trailers
above are the canonical set. `Action-Mode` and `Task` are now treated as
"required when known" rather than strictly optional — for autonomous-loop
work both are always known, so include both.

### Why structured-block-with-body beats single `Agent:` trailer (ferry-1 vs ferry-3)

Ferry-1: single `Agent: otto` trailer (too minimal; Amara's blade said *"too sparse"*).
Ferry-2: 5-required + 3-optional structured block (better; Amara's blade said *"codify a tiny canonical set, not a sprawling one"* — superseded by ferry-3).
Ferry-3 (CANONICAL): 7-trailer block + 5-section body (Why / Options / Decision / Proof / Limits) + 6 explicit rules + stable enums + AgencySignature mapping.

The progression mirrors Amara's *jazz-trio-with-unit-tests* pattern: each
ferry refines the previous; the canonical shape emerges through
verify-correct-tighten iteration, not from any single ferry alone.

### Canonical schema — 5 required + 3 optional + 1 model-attribution

**Required minimum** on every agent-authored commit:

```
Agent: Otto
Agent-Runtime: Claude Code
Agent-Model: Claude Opus 4.7
Credential-Identity: AceHack
Human-Review: not-implied-by-credential
```

**Optional, when relevant:**

```
Action-Mode: autonomous-fail-open
Task: Otto-295
Source-Channel: cli
```

**Plus the existing model-attribution trailer (preserved):**

```
Co-authored-by: Claude Opus 4.7 <noreply@anthropic.com>
```

### Why 5 required + 3 optional (Amara 2026-04-26 ferry-2)

Amara's blade-2, verbatim: *"codify a tiny canonical set, not a sprawling one, or future agents will drift the vocabulary."*

The 7-trailer schema I drafted in ferry-1 had two redundant fields when applied to today's reality:

- `Operator: Aaron Stainback` was redundant with `Credential-Identity: AceHack` (both pointed to Aaron; `Operator` becomes meaningful only post-#295 when credential and operator can diverge — for now, drop)
- `Action-Mode:` is high-signal-when-relevant but not always relevant (e.g., a routine drain commit doesn't need it; a fail-open commit on a substantive change does)

Sharpened distinction (Amara verbatim):

> *"`Co-authored-by` answers* ***model/content attribution.*** *`Agent:` answers* ***agency-mode attribution.*** *Different questions."*

### Each trailer answers exactly one question

| Trailer | Required? | Question answered |
|---|---|---|
| `Agent:` | required | which named persona acted (Otto / Amara / Soraya / ...) |
| `Agent-Runtime:` | required | which harness ran the persona (Claude Code / ChatGPT / Gemini CLI / Codex CLI / Copilot CLI / Cursor) |
| `Agent-Model:` | required | which model executed inside the runtime |
| `Credential-Identity:` | required | whose GitHub credentials acted (AceHack today; agent-bot-account post-#295) |
| `Human-Review:` | required | did human review actually happen? (default `not-implied-by-credential`) |
| `Action-Mode:` | optional | autonomous-fail-open / autonomous-fail-closed / maintainer-prompted / maintainer-pair |
| `Task:` | optional | task ID being addressed (e.g., `Otto-295`, `task-#287`) |
| `Source-Channel:` | optional | how the agent acted (`cli`, `web`, `ide`, `mcp`) |
| `Co-authored-by:` | always | model attribution in the standard GitHub-recognised format |

All are git-native — queryable via `git log --pretty='%(trailers)'` /
`git log --grep='^Agent:' --extended-regexp` / `git interpret-trailers --parse`.

### The squash-merge rule (Amara 2026-04-26 ferry-2 — load-bearing)

GitHub squash-merge can drop intermediate-commit trailers if the merge UI/CLI doesn't carry them forward. The rule:

> **Agent trailers MUST be present on the final commit that lands on `main`, not merely on intermediate branch commits.**

Operational implication: when squash-merging via `gh pr merge --squash`, ensure the squash-commit message body INCLUDES the trailer block (either via PR description that GitHub uses as squash body, or by editing the squash message before merge). For autoland flows where this is hard to enforce per-merge, the safest path is:

- Branch-tip commit always has the trailer block (most recent commit on the branch)
- Squash-merge default body is "PR title + PR body"; ensure the PR body INCLUDES the trailer block
- Verify post-merge: `git log -1 --pretty='%(trailers)' origin/main` should show the agent trailers

If trailers are lost on squash, the post-merge fix is to amend the trailer block onto the next commit (not the squash-merged one — that's the past).

### The governance sentence (Amara 2026-04-26 ferry-2 — load-bearing)

> ```
> GitHub actor/committer identity records the credential used.
> Agent trailers record the operational agency mode.
> Neither alone proves human review.
> ```

This is the canonical three-channel governance sentence. Cite it whenever attribution is contested. Composes with the ATTRIBUTION RULE in `feedback_attribution_rule_never_infer_human_approval_from_credential_identity_amara_2026_04_26.md`.

### Action-Mode taxonomy (when present)

Default for autonomous-loop work: `Action-Mode: autonomous-fail-open`. Other values, from least-to-most human-engagement:

- `autonomous-fail-open` — agent acts without prompting, in low-stakes context (per Aaron's explicit fail-open authorisation; this session's default)
- `autonomous-fail-closed` — agent acts without prompting, but defaults to ask-before-act on ambiguity
- `maintainer-prompted` — agent acts in response to a specific Aaron message
- `maintainer-pair` — agent and maintainer co-authoring in real-time (e.g., Aaron actively reviewing as agent works)

When in doubt: `autonomous-fail-open`. Upgrade to a stronger value only when the evidence supports it.

### Human-Review taxonomy

Default: `Human-Review: not-implied-by-credential` — the credential acted, but credential-identity is not proof of human review.

Upgrade values, requiring evidence:

- `Human-Review: reviewed-by-aaron` — Aaron's chat / review comment / explicit directive showed he saw and approved this specific change
- `Human-Review: paired-with-aaron` — Aaron co-authored the change in real-time

NEVER use `reviewed-by-aaron` based on auto-merge attribution alone — that's the structural-attribution-opacity fault from `feedback_gh_cli_authenticated_as_aaron_auto_merge_attribution_hallucination_session_2026_04_26.md`.

### Source-Channel taxonomy (when present)

- `cli` — agent ran via a terminal CLI (Claude Code, Gemini CLI, Codex CLI, Copilot CLI, Cursor terminal)
- `web` — agent ran via a web UI (ChatGPT.com, Claude.ai, Gemini web)
- `ide` — agent ran via an IDE plugin (VS Code, JetBrains, etc.)
- `mcp` — agent ran via MCP-bridged tool dispatch

Composes with `Agent-Runtime:` — runtime is "which agent harness", source-channel is "how the human reached it".

### Query examples

```bash
# All commits authored by an agent (any persona)
git log --grep='^Agent:' --extended-regexp

# All commits by Otto specifically
git log --grep='^Agent: Otto' --extended-regexp

# Per-trailer extraction
git log --pretty='%H %(trailers:key=Agent,valueonly)'
git log --pretty='%H %(trailers:key=Credential-Identity,valueonly)'

# Find commits where Human-Review was explicit
git log --grep='^Human-Review: reviewed-by-aaron' --extended-regexp
```

## Why git-native AND host-native (Aaron's "we should do both")

Aaron 2026-04-26 (verbatim sequence):

> *"can we add tags to the PR and or commit?"*
> *"that's the host github native solution, is there a gitnative solution?"*
> *"we should do both"*

Two surfaces, two query paths, two decay rates:

| Surface | Layer | Query | Decays when |
|---|---|---|---|
| GitHub PR label `agent-otto` | host-native | `gh pr list --label agent-otto` | repo migrates off GitHub |
| `Agent: otto` commit trailer | git-native | `git log --grep='^Agent: otto'` | never (trailer survives every git-host migration) |

The git-native layer is the durable one — labels are GitHub features, trailers are git features. Aaron's "we should do both" recognises that layered defence beats single-surface attribution.

## Why this is minimum-viable, not the deep fix

The deep fix is **separate cryptographic identity** for the agent (task #295 — Otto-353). Today:

- **Author line**: `Aaron Stainback <aaron_bond@yahoo.com>` (shared crypto identity)
- **Committer line**: `GitHub <noreply@github.com>` (squash-merge committer)
- **Co-authored-by trailer**: `Claude Opus 4.7 <noreply@anthropic.com>` (model)
- **Agent trailer (NEW)**: `Agent: otto` (persona)

When task #295 lands (separate PAT or bot account for Otto), the author line itself becomes discriminative and the `Agent:` trailer becomes redundant-but-not-harmful. Until then, the trailer is the cheapest discriminator that survives git-host migrations.

Per `feedback_gh_cli_authenticated_as_aaron_auto_merge_attribution_hallucination_session_2026_04_26.md`:

> *Aaron's stance: fail-open is the right design for this project context. Small greenfield + home computer + low stakes = default-act > default-ask.*
> *"We will fix that later" = future work to give the agent its own cryptographic identity.*

The trailer discipline is the **bridging discipline** between today's shared-identity reality and tomorrow's separate-identity end-state.

## Persona-name choice — `otto`

Per `memory/CURRENT-aaron.md` and the Otto-NN cluster, the persona name is **otto** (lowercase, single token — the architect-when-Claude-Code persona). Multi-harness future:

- `Agent: otto` — claude-opus-4-7 on Claude Code (this session)
- `Agent: amara` — GPT-5.5 on ChatGPT (peer reviewer)
- `Agent: soraya` — Gemini Deep Think on Gemini CLI (formal-verification, suggested)
- `Agent: <persona>` — assigned per `project_multi_harness_named_agents_assigned_clis_models_aaron_2026_04_26.md`

Each harness assigns its own `Agent:` trailer per persona-it-runs. The trailer is the cross-harness discriminator.

## How to apply (operational checklist for every commit)

When I run `git commit`, the message body MUST end with:

```
<commit-body-here>

Agent: otto
Co-authored-by: Claude Opus 4.7 <noreply@anthropic.com>
```

The blank line before the trailer block is required for `git interpret-trailers` to parse correctly (RFC-822 boundary).

For HEREDOC commit-message pattern (the dominant pattern in this session per CLAUDE.md commit guidance):

```bash
git commit -m "$(cat <<'EOF'
<commit subject>

<commit body>

Agent: otto
Co-authored-by: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

Aaron's `git commit` convention from CLAUDE.md was already one trailer (`Co-Authored-By:`); this discipline adds a second trailer above it.

## What this discipline does NOT do

- Does NOT change author email (that's task #295, separate crypto identity)
- Does NOT replace the host-native `agent-otto` PR label (both layers stay)
- Does NOT require backfilling existing commits (going-forward only — backfill cost ≫ value per Otto-275-FOREVER bounded-perfectionism)
- Does NOT block commits when missed (Aaron's fail-open posture; missed trailer is a hygiene miss, not a gate violation)
- Does NOT apply to Aaron's own commits when he authors directly (his commits have no `Agent:` trailer; absence is the human-authored discriminator)
- Does NOT apply to merge/squash commits made by GitHub on PR-merge — those keep the original commits' trailers intact via the squash-merge body

## Composes with

- **Host-native layer** (`agent-otto` PR label) — Aaron 2026-04-26 *"we should do both"* — different surface, same intent
- **`Co-authored-by: Claude Opus 4.7` trailer** — already in CLAUDE.md commit convention; persona trailer goes ABOVE the model trailer (alphabetical-ish, `A` before `C`)
- **Otto-353 / task #295** (separate cryptographic identity) — the trailer is the bridge until that lands; when it lands, the trailer becomes redundant-but-not-harmful
- **Otto-279** (research-counts-as-history) — `git log --grep='^Agent: otto'` is a history-surface; first-name attribution allowed
- **Otto-220** (don't-lose-substrate) — agent-authored substrate gets a queryable trail that survives git-host migrations
- **`feedback_gh_cli_authenticated_as_aaron_auto_merge_attribution_hallucination_session_2026_04_26.md`** — auto-merge enabledBy attribution stays misleading; the `Agent:` trailer narrows the misleading window to the auto-merge event itself (commits underneath are explicitly attributed)
- **`feedback_event_log_actor_not_human_at_keyboard_verify_event_type_before_attribution_otto_246_2026_04_24.md`** — Otto-246 verify-before-attributing; the `Agent:` trailer is the cheapest verification surface for "did agent or human author this commit?"
- **`project_multi_harness_named_agents_assigned_clis_models_aaron_2026_04_26.md`** — multi-harness future; each harness's persona populates its own `Agent:` value
- **`feedback_attribution_hygiene.md`** — different scope (external-people-attribution) but same discipline-shape (cite at author-time, cheap-up-front beats expensive-on-audit)

## Verification

After this memory lands, the next commit I make should show:

```bash
$ git log -1 --pretty='%(trailers)'
Agent: otto
Co-authored-by: Claude Opus 4.7 <noreply@anthropic.com>
```

If it shows only `Co-authored-by:`, the discipline drifted — flag and re-apply.

## Decay / retirement condition

This discipline retires when **task #295 lands** (separate cryptographic identity for the agent). At that point, the author line itself discriminates. The `Agent:` trailer remains as redundant-but-not-harmful documentation; the operational requirement to add it on every commit drops.

Until task #295 lands: the discipline is mandatory on every agent-authored commit.

## Direct Aaron quotes preserved

> *"can we add tags to the PR and or commit?"*

> *"that's the host github native solution, is there a gitnative solution?"*

> *"we should do both"*

The "we should do both" is the load-bearing decision: layered defence beats single-surface attribution.
