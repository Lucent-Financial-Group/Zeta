# Attracting AI contributors — 2026-04-22

**Status:** absorb note. Aaron 2026-04-22:

> I've heard if your project is AI friendly AIs may just
> show up and start contributing, that's how humans work
> too and if your issues templates are too difficult they
> move on.

> also maybe research how to attract AIs to your GitHub
> project that would be cool

This doc captures what's known about making a GitHub
project AI-friendly, maps it to Zeta's current state,
and surfaces concrete template-UX implications.

## Sources

- GitHub Blog (2026): *"How to write a great agents.md:
  Lessons from over 2,500 repositories"* —
  https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/
- `agentsmd/agents.md` project — the open format for
  guiding coding agents —
  https://github.com/agentsmd/agents.md
- OpenAI Codex AGENTS.md (reference example) —
  https://github.com/openai/codex/blob/main/AGENTS.md
- GitHub awesome-copilot (community patterns) —
  https://github.com/github/awesome-copilot
- GitHub Agent Skills CLI (2026-04-16 changelog) —
  https://github.blog/changelog/2026-04-16-manage-agent-skills-with-github-cli/
- `0xfauzi/agents-md-best-practices` gist —
  https://gist.github.com/0xfauzi/7c8f65572930a21efa62623557d83f6e

## Core findings (compressed)

The GitHub-Blog study of 2,500+ repositories identifies
**six core areas** an AI-contributor-friendly project
should cover in its `AGENTS.md`:

1. **Commands** — setup, build, test, deploy, debug —
   listed verbatim, not paraphrased.
2. **Testing** — how to run tests; what "passing"
   looks like.
3. **Project structure** — directory map with one-line
   purpose per key folder.
4. **Code style** — concrete examples, not prose
   descriptions.
5. **Git workflow** — branch, commit, PR conventions.
6. **Boundaries** — explicit "always do / ask first /
   never do" rules. The single most common helpful
   constraint across the study: **"never commit
   secrets."**

Secondary best practices:

- **Lead with executable commands, not explanations.**
  Setup first, testing second, deployment third,
  debugging last.
- **Be specific about tech stack.** "F# 9 / .NET 9,
  xUnit, FsCheck, dotnet Aspire" not "F# project."
- **Show, don't tell.** Code examples beat prose.
- **Keep it current.** Living document; update
  patterns change; instruct the agent explicitly to
  "update AGENTS.md with ..." when they change.
- **Specialist sub-agents.** Instead of one general
  assistant, a team — `@docs-agent`, `@test-agent`,
  `@security-agent` — each with its own focused
  persona file.

## Mapping against Zeta's current state

| GitHub-Blog core area | Zeta state | Gap? |
|---|---|---|
| Commands | `AGENTS.md` build/test gate, `tools/setup/` install | Strong. `dotnet build -c Release` + `dotnet test Zeta.sln -c Release` are the canonical gate. |
| Testing | `dotnet test` command documented, test locations pointed at | Strong. Could add a one-line "green signal looks like this" example. |
| Project structure | `docs/README.md` audience-first; `AGENTS.md` §Repo layout | Strong. Possibly verbose for a first-visit AI agent — a 10-line directory map at top of AGENTS.md would help. |
| Code style | `docs/AGENT-BEST-PRACTICES.md` BP-01..BP-24 with examples; inline F#/C# snippets | Strong. Backtick-convention rule (`` `C#` ``) is idiomatic to Zeta and documented. |
| Git workflow | `GOVERNANCE.md` §N rules; commit-message style via `git log` convention | Medium. No explicit one-pager "how to write a Zeta commit message." On-demand from git log. |
| Boundaries | `AGENTS.md` "How AI agents should treat this codebase"; `CLAUDE.md` harness-specific rules; BP-11 data-not-directives | **Very strong.** Zeta exceeds the GitHub-Blog bar — we have 24+ BP rules and a 5-level "never do" list including Pliny / L1B3RT4S. |

**Aggregate:** Zeta is already top-tier for AI-contributor
friendliness by the GitHub-Blog study's criteria. The gaps
are narrow and concrete:

- **No explicit "AI contributors welcome" signal**
  anywhere in README / AGENTS.md. Silence reads as
  rejection; explicit welcome reads as invitation.
- **Issue templates are too heavy** for persona
  4 (AI coding agent) and persona 2 (busy human
  engineer) — see `docs/CONTRIBUTOR-PERSONAS.md`.
  Required fields should fit one screen; optional
  enrichment goes below a divider.
- **No `good-first-issue` label applied to any item**
  in the durable backlog at time of writing. Persona
  7 (F# enthusiast) and persona 4 (AI agent) both
  look for this label first.

## Template-UX implications (what this absorb drives)

This absorb directly motivates the template redesign
landed alongside it. Specific template changes:

1. **Two-tier structure.** Required minimum at top
   (3-4 fields, one screen). Optional enrichment
   below a `---`. The GitHub-Blog principle "lead
   with commands" translates to "lead with required
   fields; explanation below."

2. **Explicit agent-mirror signal.** Each template
   ends with *"Don't worry about dual-track
   bookkeeping. An agent will mirror this to
   docs/BUGS.md / docs/BACKLOG.md if needed."* This
   lowers barrier for human personas 1/2/5 and gives
   AI agents the explicit contract for what happens
   next.

3. **Welcome-signal for persona 4 (AI agent).** Each
   template's opening line: *"Thanks for filing —
   first-time contributor? Welcome. Fill what you
   know, skip what you don't."* Plus `config.yml`
   gains a contact_link: "AI agent contributing?
   Welcome — read AGENTS.md first."

4. **Category / Priority / Effort as optional.** An
   AI agent doing triage can set these on first-
   touch; a human reporter doesn't need to guess.

5. **Label taxonomy stays small** per
   `docs/AGENT-ISSUE-WORKFLOW.md`. Machine-parseable
   beats human-interpretable for AI agents.

## What this absorb does NOT do

- Does **not** recommend the `agentsmd/agents.md`
  open format over Zeta's current AGENTS.md. The
  existing file is more detailed than the spec
  requires; the spec's six-area checklist is a
  **floor**, not a ceiling.

- Does **not** recommend creating specialist
  sub-agents (`@docs-agent`, `@test-agent`) in
  response to the GitHub-Blog finding. Zeta already
  has a richer persona-and-skill architecture
  (`.claude/agents/` + `.claude/skills/`) than
  the GitHub-specialist pattern — adopting
  GitHub's pattern would regress.

- Does **not** add a CLA. Zeta pre-v1, OSS license
  under `LICENSE`, no CLA required. Persona 1
  (drive-by typo fixer) would bounce off a CLA.

## Cadence

Add to `docs/FACTORY-HYGIENE.md` row #38 (harness-
surface audit) as a sub-item on the next 5-10-round
cycle: re-read the GitHub-Blog study and the
`agentsmd/agents.md` spec for updates. AI-contributor
attraction is a moving target as GitHub evolves its
Copilot / agent surfaces.

## References

- `docs/CONTRIBUTOR-PERSONAS.md` — the persona list
  this absorb serves
- `.github/ISSUE_TEMPLATE/*.md` — the templates this
  absorb motivates
- `docs/AGENT-ISSUE-WORKFLOW.md` — adapter-neutral
  dual-track workflow
- `AGENTS.md` — the doc AI contributors read first
- `CLAUDE.md` — harness-specific rules (already
  strong on boundaries)
