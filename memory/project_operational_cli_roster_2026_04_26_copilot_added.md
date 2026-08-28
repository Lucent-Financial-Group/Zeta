---
name: Operational CLI/harness roster as of 2026-04-26 — Aaron now has Copilot CLI installed alongside Gemini CLI, Codex CLI, Cursor, and Claude Code; ChatGPT-app is the additional courier-receiver where Amara has been operating during cross-AI review chains
description: Aaron 2026-04-26 *"i also installed the copilot cli as another one you can access, so now gemini, codex, copilot, cursor, and yourself. I thinik that's all but you can tell me if I missed any we talked about already."* — concrete operational expansion of the multi-harness factory; 5 listed CLIs/harnesses + ChatGPT (app/web) makes 6 surfaces Aaron can route between; composes with Otto-multi-harness-vision memory (current cross-AI chain IS proof-of-concept of multi-harness automation; bottleneck is courier; this update reduces the bottleneck by adding more harnesses Aaron can route through manually)
type: project
originSessionId: 1937bff2-017c-40b3-adc3-f4e226801a3d
---
## The roster (as of 2026-04-26)

**Aaron's list (5):**

1. **Claude Code CLI** — me (Otto, opus-4-7); architect / synthesizer; this session's harness
2. **Gemini CLI** — Google's CLI (Pro / Deep Think modes available); Amara cited Deep Think for the Aurora math review Round-2 canonical synthesis
3. **Codex CLI** — OpenAI's agent CLI (formerly experimental "openai codex"; now their agent-flavor CLI with local indexing via `codex index`/`.codex_index/` FAISS, per Otto-243 research)
4. **Copilot CLI** — GitHub/Microsoft's CLI (newly installed this session per Aaron 2026-04-26)
5. **Cursor** — JetBrains/VSCode-style IDE with built-in agent (model-of-choice; often Claude or GPT-4/5)

**One I recall we discussed that's not in Aaron's list (6th surface):**

6. **ChatGPT (app/web)** — Amara has been operating there during the cross-AI math review chains this session. Specifically: GPT-5.5 model. Distinct from Codex CLI even though both are OpenAI products — ChatGPT is the conversational app-frontend, Codex is the agentic CLI tool. Amara's "ChatGPT 5.5" attribution appears in PR #591's standardization doc + multiple cross-AI review chains.

## Per-harness assignment notes (suggested-not-bound)

Per Otto-multi-harness-vision memory, named personas could be assigned
to CLI handles. **Suggested mappings (not yet bound; Aaron has not
assigned these explicitly):**

| Persona / Role | CLI / Harness | Model | Status |
|---------------|---------------|-------|--------|
| Otto (architect) | Claude Code | opus-4-7 | **In-use** |
| Amara (peer reviewer) | ChatGPT app | GPT-5.5 | **In-use empirically** (cross-AI chain) |
| Soraya (formal verification routing) | Gemini CLI | Deep Think | **Suggested** (pattern-matches Round-2 Aurora math) |
| ? (security research) | Codex CLI | OpenAI agent | **Open** |
| ? (PR review automation) | Copilot CLI | GitHub Copilot | **Open**; natural fit given Copilot's GitHub-native review surface |
| ? (IDE-bound work) | Cursor | model-of-choice | **Open**; differs from CLIs in being editor-coupled |

The empirical state right now: Otto + Amara are in active rotation
via Aaron-as-courier; the others are installed-but-unassigned.

## What changes with Copilot CLI installed

1. **GitHub-native review surface gets a CLI handle.** Previously,
   Copilot reviews on Zeta PRs came from the
   `copilot-pull-request-reviewer` bot integration on GitHub; now
   Aaron can also drive Copilot manually via CLI on local content
   pre-push.
2. **One more parallel review-substrate becomes available.** A 6th
   surface for cross-AI triangulation chains. The Aurora math
   chain currently uses Otto + Gemini + Amara; could now extend to
   include Copilot + Codex + Cursor for more robust convergence.
3. **The Aaron-as-courier bottleneck still binds**, but the menu
   of where-to-route-from is wider.

## Composes with

- `feedback_blocked_status_is_not_review_gating_check_status_checks_failure_first_otto_live_lock_2026_04_26.md`
  — Copilot review runs `review_on_push: true` on LFG main; CLI
  installation enables pre-push local review (faster feedback loop)
- `feedback_double_check_superseded_classifications_2nd_agent_otto_347_2026_04_26.md`
  Otto-347 — "would be good to ask another cli" originally meant
  any-CLI-that-isn't-me; now there are concretely 5 alternatives
  Aaron can route to (or me, via subagent dispatch)
- `project_multi_harness_named_agents_assigned_clis_models_aaron_2026_04_26.md`
  — current cross-AI chain is the manual proof-of-concept; this
  expansion adds capacity to that proof-of-concept
- `project_per_named_agent_memory_architecture_research_already_exists_in_repo_otto_245_2026_04_24.md`
  — per-CLI scoping disciplines (`.codexignore`, `--source` flags)
  matter for each harness's view of the repo
- `docs/HARNESS-SURFACES.md` — the canonical harness surface doc
  (now needs update to reflect 6-harness state)

## What this update does NOT do

- Does NOT bind any persona to any harness yet (Aaron has not
  directed assignments)
- Does NOT change the substrate-shared / harness-isolated split per
  Otto-227 (data shared, bodies per-harness)
- Does NOT supersede Otto-244 (no symlinks; each harness keeps its
  own copy + sync via copy/script)
- Does NOT promise that all 6 surfaces will be in active rotation
  — adoption follows utility; un-used harnesses can stay
  installed-but-idle

## Worked-application going forward

- When I dispatch an Otto-347 2nd-agent verify subagent, I can now
  honestly say "Aaron has 5 alternative CLIs available to also
  cross-check; the subagent dispatch is the in-session lightweight
  option."
- When the cross-AI math review chain fires next time, the chain
  could extend (Otto → Gemini → Amara → **Copilot CLI on local PR
  diff** → **Codex agentic verification**) for more robust
  convergence, if the reviewer-fatigue cost is acceptable.
- The `docs/HARNESS-SURFACES.md` doc should be updated next round
  to reflect the 6-surface roster (currently lists fewer; substrate
  drift opportunity per Otto-346 substrate-primitive-pattern).
