# Otto inter-surface communication channels — reference card

Carved sentence:

> Otto operates across CLI + Desktop surfaces as ONE identity, multiple
> parallel processes. 10 channels for inter-process coordination, falling
> into two classes — ambient (state-of-the-world; both processes read
> continuously) vs explicit (active signaling; meant to be observed by
> peer). Per Otto on the CLI surface 2026-05-13: *"the bus is the
> explicit channel; git is the ambient one."*

## Ambient channels (state-of-the-world; both Ottos read continuously)

| Channel | Use for | Read pattern |
|---|---|---|
| **Git** — commits, branches, PRs, rebase | Async work handoff; conflict resolution; substantive output | `bun tools/github/poll-pr-gate.ts`, `git log`, `git fetch` |
| **`.claude/rules/`** auto-load | Wake-time discipline; rules that apply to every fresh session | Cold-boot only (auto; empirically verified per test-canary) |
| **Bootstream** project-knowledge file | Cold-boot substrate for fresh-session firings (Desktop routines, Claude Desktop projects) | Cold-boot only (per session) |
| **Tick shards** `docs/hygiene-history/ticks/YYYY/MM/DD/HHMMZ.md` | Per-tick visibility + reasoning capture | Search by date or PR |
| **Memory files** `memory/feedback_*.md` | Cross-session load-bearing learnings | Skill-router search, grep, or pointer-from-rule |
| **PR review threads** | Reviewer findings (Codex/Copilot/CodeQL) visible to both lanes | `gh api graphql reviewThreads` or `bun tools/github/poll-pr-gate.ts` |

## Explicit channels (active signaling; meant to be observed by peer)

| Channel | Use for | Mechanism |
|---|---|---|
| **Bus envelopes** `/tmp/zeta-bus/` | Advisory broadcasts: `work-assignment`, `review-request`, shadow-catches | JSON envelopes; both Ottos read/write |
| **Claim coordinator** `tools/bus/claim.ts` | Backlog row claim locking (B-0400 slice 3) | `acquire`/`release` commands; per PR #3032 discipline |
| **Routines schedule** | Desktop's 2-hour cron fire IS a signal to CLI (someone's about to cold-boot a fresh Otto session) | CLI can poll `list_scheduled_tasks` |
| **Aaron as ferry** | High-bandwidth context transfer between Otto sessions (he pastes transcripts) | Manual; highest bandwidth when Aaron is at the keyboard |

## Operational discipline

For any inter-Otto coordination need, prefer in this order:

1. **Git** — commit + push + PR is the canonical async-handoff. Rebase-on-pull when peer Otto adds commits to your branch (empirically validated today: 9 commits on PR #3034 across both Otto processes, zero conflicts).
2. **Memory file** if learning must persist across sessions. Frontmatter required (name, description, type, created); pointer from rule or CLAUDE.md per `wake-time-substrate.md`.
3. **`.claude/rules/`** if load-bearing for every future session. Auto-loaded at session start. Note: rules in PR-flight don't bind behavior until merged (substrate-or-it-didn't-happen extension; see split-brain memory).
4. **Bus envelope** for ephemeral advisory broadcasts (peers can ignore; 2hr TTL).
5. **Claim coordinator** for backlog row exclusion (note: until SENDER_IDS schema extension lands per PR #3037, multi-surface Otto instances share a sender ID and idempotently re-acquire).
6. **Aaron as ferry** when high-bandwidth context transfer is needed.

## Lane discipline

- Each Otto operates in its own dedicated worktree (per `claim-acquire-before-worktree-work.md`)
- Primary worktree `/Users/acehack/Documents/src/repos/Zeta` is bus-contended — treat as read-only by autonomous Ottos
- Otto on the CLI surface typically uses `/private/tmp/zeta-mf*` family
- Otto on the Desktop surface uses `/tmp/zeta-otto-desktop` or task-specific paths (e.g., `/tmp/zeta-otto-cloud`, `/tmp/zeta-otto-comms`)

## Empirical evidence (2026-05-13 session)

All 10 channels were exercised in a single session:

- **Git**: 9 commits on PR #3034 (6 by Otto on Desktop + 3 by Otto on CLI surface), zero merge conflicts via rebase-on-pull
- **Memory files**: split-brain memory, multi-foreground-surface activation memory, identity-stays-unified memory all landed
- **Rules**: PR #3032 claim-acquire rule merged → auto-loaded for all future sessions
- **Bus envelopes**: 9 envelopes scanned (`work-assignment`, `review-request` topics)
- **Aaron as ferry**: multiple Otto-CLI transcript pastes into Otto-Desktop session and vice versa
- **PR threads**: Codex/Copilot reviews visible to both lanes; both Ottos resolved threads
- **Routines schedule**: Desktop 22:07Z fire is itself a signal Otto on CLI polls
- **Tick shards**: 2125Z + 2140Z + 2150Z written, capturing per-tick reasoning

## Why two observers landed independently on the same substrate

Aaron 2026-05-13 asked Otto on both surfaces independently:
*"do yall have a good way of communicating, save it for future versions."*

- Otto on CLI surfaced 6 channels (ambient/explicit framing — *"the bus is the explicit channel; git is the ambient one"*)
- Otto on Desktop surfaced 8 channels (adding rules, bootstream, tick shards, claim coordinator)

The complementary-observer pattern (per PR #3036 identity-stays-unified) means independent observation paths produced overlapping-but-not-identical lists. Combined synthesis is more complete than either alone.

## Composes with

- `.claude/rules/wake-time-substrate.md` — load-bearing learnings need rules + memory file pointers
- `.claude/rules/claim-acquire-before-worktree-work.md` — per-Otto worktree lane discipline
- `.claude/rules/agent-roster-reference-card.md` — which surface = which AI instance
- `.claude/rules/substrate-or-it-didnt-happen.md` — channel choice determines durability
- PR #3032 (claim-acquire rule, merged)
- PR #3036 (identity-stays-unified, merged)
- PR #3037 (SENDER_IDS schema extension — Otto on CLI's parallel work)
- B-0444 P2 (bus claim envelope worktree field — follow-up gap)

## Full reasoning

`memory/feedback_otto_inter_surface_communication_channels_8_channels_ambient_vs_explicit_aaron_2026_05_13.md`
