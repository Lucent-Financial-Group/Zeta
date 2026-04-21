# GitHub Models — factory integration research

**Status:** research note, round 44. Aaron 2026-04-22:
*"reserch if there is anyting we can do with this new
featue https://docs.github.com/en/github-models/use-github-
models/prototyping-with-ai-models"*.

**Bottom line:** three concrete fit-areas (ranked), two
concerns worth surfacing before adoption, one BACKLOG row
filed for a minimal proof-of-concept.

## What GitHub Models is

GitHub Models is GitHub's AI inference catalog + playground,
CI action, and evaluation CLI, currently in public preview.
It lets any GitHub repo call AI models with no separate
account or API key beyond a `models:read` scope on the
GitHub token. Providers include OpenAI, Meta, DeepSeek,
Mistral, Microsoft. Structured-output `.prompt.yml` files
plus JSON-schema validation are first-class. A `gh models
eval` CLI runs cross-model evaluations with pluggable
metrics (string match, similarity, LLM-as-judge,
groundedness, custom).

Free-tier rate limits are low: 10-15 req/min, 50-150/day,
8K input + 4K output tokens per call. Enough for CI /
round-close work; not enough for high-volume inference.

`actions/ai-inference` v2.0.7 (Feb 2026) is the stable
Action. It requires `permissions: models: read` — minimal
scope, safe for supply-chain posture.

## Fit-area 1 (strongest) — multi-harness eval test bed

`gh models eval` directly addresses the capability boundary
documented in
`memory/feedback_multi_harness_support_each_tests_own_integration.md`:
a harness cannot honestly test its own factory integration.
GitHub Models provides a **catalog of non-Claude harnesses
under one authentication surface** — GPT-4o, Llama, DeepSeek,
Mistral. Our existing eval-harness (from `skill-creator`)
spawns Claude subagents; switching to `gh models eval`
against the same test prompts gives each skill a
*cross-harness* verification without standing up separate
CLIs for each provider.

Concrete use: the three skills being forged from the
cartographer feedback loop (`research-vision` /
`crystallize-vision` / `backlog-kanban-fill`) should be
evaluated on at least two harnesses per round. Turn the
eval-harness dual-track: Claude subagent AND GitHub Models
inference on the same prompt, compare outputs, record
divergences.

This is the **first instance where multi-harness-tests-own-
integration has a concrete cost-effective path** — prior to
GitHub Models it required separate CLI installs per harness.
Now it's a single Action.

## Fit-area 2 — PR reviewer augmentation

We already run **two reviewers** on PRs: Claude Code
(factory-internal) and GitHub Copilot PR reviewer
(external robot per
`memory/feedback_multi_harness_support_each_tests_own_integration.md`).
The copilot-wins log shows Copilot's review value is real
(PR #32 delivered 7 findings, one false positive — see
`docs/copilot-wins.md`).

Adding a third reviewer via `actions/ai-inference` with
model `openai/gpt-4o` or `mistral/mistral-large` gives us
**reviewer diversity at zero licensing cost**. A workflow
step reads the PR diff, invokes the Action with a
structured prompt that asks for xref / config-drift /
shell-safety issues (the classes we already track), and
posts findings as review comments.

Cost vs. value: ~5-10 requests per PR = fits the free
tier; marginal value is the diversity dividend when two
reviewers disagree.

## Fit-area 3 — ADR contradiction cross-check

When a new ADR lands under `docs/DECISIONS/`, a
`actions/ai-inference` step can check it against the
existing ADR catalog for contradictions. Cheap, bounded,
high-value for a doc tree that accumulates ADRs over
rounds. Fits the DMAIC Control phase per
`docs/FACTORY-METHODOLOGIES.md` — a Control-gate that
flags structural drift.

Not urgent; nice-to-have once the eval bed (Fit-area 1)
lands.

## Concerns

### Concern 1 — supply-chain posture

GitHub Models is Azure AI under the hood. All inference
traffic goes through Microsoft. Factory security stance
per `memory/user_security_credentials.md` is nation-state
aware. **Policy implication:** any skill that ingests
`memory/**` (which may contain MNPI-adjacent user context
per
`memory/user_servicetitan_current_employer_preipo_insider.md`)
MUST NOT pass that content to GitHub Models inference.
This is a **hard boundary**, not a preference. Prompt-
protector-style filter needed before any `actions/ai-
inference` call that reads from `memory/`.

Mitigation shape: whitelist of content categories allowed
to reach GitHub Models (docs, specs, source code under
`src/`, test assertions). Blacklist: `memory/`, personal
memories, any `docs/DECISIONS/` containing user-context
quotes. Enforce at the prompt-builder step, not at post-
response filtering.

### Concern 2 — portability

Per
`memory/project_factory_reuse_beyond_zeta_constraint.md`,
the factory is meant to be reusable beyond Zeta. GitHub
Models is GitHub-specific. Non-GitHub adopters (GitLab,
self-hosted) can't use it directly.

Mitigation: treat GitHub Models as an **optional adopter
module** — factory-generic scripts work without it;
GitHub-hosted adopters opt in via a workflow file under
`.github/workflows/`. Parallel adopter paths for Azure AI
Foundry, OpenRouter, or local Ollama could be added later;
first adopter is Zeta on GitHub.

This is consistent with the portability-drift criterion in
`.claude/skills/skill-tune-up/SKILL.md` — we don't hard-
code "GitHub" into generic skills; we factor GitHub-
specific workflows into `.github/workflows/` where they
belong.

## Concrete next step

One BACKLOG row: **multi-harness eval proof-of-concept
using `actions/ai-inference`**. A single workflow file
that runs one existing skill's eval test on `openai/gpt-4o`
via GitHub Models, compares to the existing Claude-subagent
eval output, and posts a divergence summary as a
round-close artifact.

Scope bounds: one skill, one model, one workflow. No
migration of the eval-harness. Pure proof-of-concept to
verify: (a) rate limits are workable, (b)
supply-chain filter is enforceable, (c) output quality is
comparable. If yes, expand. If no, close honestly and log
in `docs/WONT-DO.md`.

## References

- <https://docs.github.com/en/github-models/use-github-models/prototyping-with-ai-models>
- <https://github.com/actions/ai-inference> — v2.0.7, Feb 2026
- <https://docs.github.com/en/github-models/use-github-models/evaluating-ai-models>
- <https://github.com/features/models>
- `memory/feedback_multi_harness_support_each_tests_own_integration.md`
- `memory/project_factory_reuse_beyond_zeta_constraint.md`
- `memory/user_security_credentials.md`
- `memory/user_servicetitan_current_employer_preipo_insider.md`
- `docs/copilot-wins.md` — existing external-reviewer pattern
- `docs/FACTORY-METHODOLOGIES.md` — DMAIC Control-phase framing
