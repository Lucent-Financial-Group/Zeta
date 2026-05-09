# Cost Reduction Lessons — token budget economics

Learnings from running a 200+ skill AI factory on Claude Code.
These don't matter for a prototype with one dev. They matter
the moment you scale to a team.

## Lesson 1: Skill descriptions are a per-call tax

### The problem

Every Claude Code session loads the skill listing into context.
With 200+ skills at ~50 tokens each = ~10K input tokens loaded
before the agent reads a single line of code.

### The cost (Claude Opus 4.6, May 2026 pricing)

| Scenario | Input tokens | Cost per session start |
|---|---|---|
| Paragraph descriptions (50 tok × 200) | 10,000 | $0.050 |
| Carved sentences (15 tok × 200) | 3,000 | $0.015 |
| **Savings per session** | 7,000 | **$0.035** |

At $15/M input tokens (Opus 4.6):

| Scale | Sessions/day | Annual waste (paragraphs) | Annual savings (carved) |
|---|---|---|---|
| 1 dev, interactive | ~20 | $365 | $255 |
| 1 dev + background loop | ~100 | $1,825 | $1,278 |
| 3 agents (Otto/Vera/Riven) | ~300 | $5,475 | $3,833 |
| 10 devs + agents | ~1,000 | $18,250 | $12,775 |
| 50 devs + agents | ~5,000 | $91,250 | **$63,875** |

**With prompt caching** (cache hit = 10% of input price):
- First load: full price ($0.050 per session)
- Cached loads (within 5min TTL): $0.005 per session
- Background loops hitting every 60s stay cached; the
  skill listing cost drops to ~$0.001 per tick
- But: every new session, every compaction, every cache
  miss pays full price again

### The fix

B-0347: Carve every skill description to <120 chars.
Cost: zero (mechanical edit). Savings: 70% of skill
listing budget.

## Lesson 2: CLAUDE.md size is a per-call tax

### The problem

CLAUDE.md at 62K chars (~15K tokens) loads on every session
start. That's $0.075 per session on Opus 4.6.

| Scale | Sessions/day | Annual CLAUDE.md cost |
|---|---|---|
| 1 dev | 20 | $548 |
| 3 agents | 300 | $8,213 |
| 10 devs + agents | 1,000 | $27,375 |

### The fix

B-0161: Trim CLAUDE.md to <40K chars. Move content to
`.claude/rules/` (auto-loaded, same priority) or skills
(router-loaded, pay only when needed).

## Lesson 3: Context compaction multiplies input cost

Every time the context window fills and compaction fires,
the compacted summary becomes new input tokens on the next
turn. A 200K context session that compacts 3 times pays
for the skill listing + CLAUDE.md content ~4 times.

**Mitigation**: Keep sessions shorter. Use subagents for
context-heavy work (they get their own window). The
background loop's 60s tick cycle naturally stays short.

## Lesson 4: The `/doctor` command catches budget waste

`/doctor` reports:
- Skill descriptions exceeding per-entry cap (truncated)
- Skill descriptions dropped entirely (invisible to router)
- Large CLAUDE.md files
- Settings schema errors (broken hooks = wasted retries)

Run `/doctor` after any settings or skill change.

## Lesson 5: Budget fraction vs description length

`skillListingBudgetFraction` in settings.json controls what
% of context the skill listing can use. Default is 1%.

**Budget fraction is a lever; description length is the
multiplier.** Raising the fraction costs context everywhere
(less room for code, conversation, tool results). Shortening
descriptions costs nothing.

| Approach | Context cost | Routing quality |
|---|---|---|
| Raise fraction to 5% | High (10K tokens) | Good |
| Carve descriptions | Low (3K tokens) | Same or better |
| Both | Medium | Best |

## Summary: cost-per-PR proxy

For a factory producing ~60 PRs/day across 3 agents:

| Cost center | Current $/day | After fixes $/day |
|---|---|---|
| Skill listing (300 sessions) | $15.00 | $4.50 |
| CLAUDE.md (300 sessions) | $22.50 | $9.00 |
| Actual agent work (output tokens) | ~$150.00 | ~$150.00 |
| **Total** | **$187.50** | **$163.50** |
| **Per PR** | **$3.13** | **$2.73** |

The skill listing and CLAUDE.md are ~20% of the per-PR cost.
Not the biggest line item (output tokens dominate), but the
easiest to cut — zero-effort mechanical edits.

## Pricing reference (May 2026)

| Model | Input/M | Output/M | Cache hit/M |
|---|---|---|---|
| Opus 4.6 / 4.7 | $15.00 | $75.00 | $1.50 |
| Sonnet 4.6 | $3.00 | $15.00 | $0.30 |
| Haiku 4.5 | $1.00 | $5.00 | $0.10 |

Source: [Anthropic API Pricing](https://platform.claude.com/docs/en/about-claude/pricing)

Note: Opus 4.7's new tokenizer can produce up to 35% more
tokens for the same input text — the rate card is unchanged
but per-request cost can increase.

## Tracked at

- B-0347 (carved-sentence skill descriptions)
- B-0161 (CLAUDE.md trim)
- `docs/ops/SKILL-ROUTING-BUDGET.md` (budget math detail)
