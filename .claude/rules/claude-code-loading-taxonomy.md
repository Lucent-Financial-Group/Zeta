# Claude Code loading taxonomy — three mechanisms, pick by failure-mode shape

Carved sentence:

> "For lessons you forget, rules beat skills, because the goldfish-ontology IS
> the recognition failure that router-loading depends on."

## Operational content

**Three loading mechanisms** (empirically confirmed in this harness):

| Mechanism | Surface | When loaded | Empirically tested? |
|-----------|---------|-------------|---------------------|
| **Direct-load** | `CLAUDE.md`, `CLAUDE.local.md`, `.claude/rules/*.md` (no `paths:`) | Full at session start | Yes (see `test-canary.md`) |
| **Lazy-load** | `.claude/rules/*.md` with `paths:` glob | When Claude reads matching files | Doc-supported; path not yet confirmed |
| **Router-keyed** | `.claude/skills/<name>/SKILL.md` | Via `Skill` tool description matching | Yes |
| **Subagent-discovery** | `.claude/agents/<name>.md` | Agent dispatch | Yes |
| **On-demand** | `~/.claude/projects/<x>/memory/MEMORY.md` | First 200 lines / 25KB at start + topic files via Read | Yes |

**Behavioral-lesson placement rule:**

- "I keep forgetting to do X" → `CLAUDE.md` or `.claude/rules/` (goldfish-ontology fix)
- "Apply X when working with Y files" → path-scoped `.claude/rules/` (lazy-load)
- "Multi-step procedure for task T" → skill (router-keyed on demand)
- "Role X has responsibilities Y, Z" → agent

The goldfish-ontology failure mode: router-loading requires recognizing the
trigger — the agent that forgets to use the skill is also the agent that fails
to recognize it's needed. Rules beat skills for this failure class.

## Full reasoning

`memory/feedback_claude_code_loading_taxonomy_rules_vs_skills_vs_claude_md_aaron_2026_05_01.md`

Canonical Anthropic source: `code.claude.com/docs/en/memory`
