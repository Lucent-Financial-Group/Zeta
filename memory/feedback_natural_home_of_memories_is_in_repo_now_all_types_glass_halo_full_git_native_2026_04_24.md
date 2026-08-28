---
name: In-repo memory/ is the NATURAL HOME for memories now — all types (user / feedback / project / reference), all named agents, no distinction between "private" auto-memory and "public" in-repo; glass halo extends to agent-accumulated substrate; auto-memory (~/.claude/projects/.../memory/) becomes a per-session staging area, not the authoritative store; Aaron Otto-114; 2026-04-24
description: Aaron Otto-114 confirmation "so the natural home of memories is in repo now? per user memoreis too and everyitng?"; YES — in-repo memory/ is now the authoritative store for ALL memory types; the auto-memory path is the live-write staging target only because CLI tooling hasn't been switched yet; substrate policy changes: future ticks write to in-repo memory/ or mirror-on-ship; MEMORY.md index maintained in-repo
type: feedback
originSessionId: 1937bff2-017c-40b3-adc3-f4e226801a3d
---
Aaron 2026-04-24 Otto-114 (verbatim):

*"so the natural home of memories is in repo now?  per
user memoreis too and everyitng?"*

Otto's answer: **yes — and yes for all types.**

## The rule

**In-repo `memory/` is the authoritative home for every
memory type:**

- `user_*` — user profile, preferences, biographical
  context
- `feedback_*` — guidance corrections + confirmations
- `project_*` — ongoing-work context
- `reference_*` — external-system pointers
- `CURRENT-*` — per-maintainer projections
- `MEMORY.md` — canonical index
- `persona/**` — per-persona notebooks

No type-based distinction between public and private.
Aaron Otto-113 framed memories as *"technically public
but i'm okay with it not public surface"* — that means
they live in-repo WITH non-linted-surface status. Glass
halo applies: open-nature transparency extends to
agent-accumulated substrate.

## Transitional state (Otto-113 → Otto-114 onward)

### Before Otto-113

- Auto-memory at `~/.claude/projects/-Users-acehack-
  Documents-src-repos-Zeta/memory/` = authoritative,
  live-write target for Otto memory operations.
- In-repo `memory/` = persona notebooks + some earlier
  sync attempts.

### Otto-113 one-shot sync (PR #307)

- Rsync of 439 auto-memory files into in-repo memory/
- MEMORY.md / CURRENT-aaron.md / CURRENT-amara.md
  refreshed from auto-memory source
- Total in-repo memory/ files grew from 124 to 563
  + indexes

### Otto-114 policy going forward

- In-repo memory/ = AUTHORITATIVE; it's what glass-halo
  preserves and what future contributors / Otto
  instances read
- Auto-memory path = LIVE-WRITE STAGING because CLI
  tooling still writes to `~/.claude/projects/...`
  conventions; auto-memory is a mirror, not the source
  of truth
- On each tick that writes memory:
  - Primary: write to auto-memory (CLI-compatible)
  - Follow-up: periodic sync (rsync `--ignore-existing`)
    into in-repo memory/
  - Ideal eventual state: direct-to-repo writes with
    auto-memory as read-cache
- MEMORY.md index maintained in-repo on each write
  (the paired-edit workflow catches orphans)

## Pattern: full git-native preservation

This follows the same logic as Otto-113's git-native
PR-conversation preservation directive *"we probably
need to resolve and save the conversations on the PRs
to git for gitnative presevration"*:

| Substrate | Prior home | New home | Mechanism |
|---|---|---|---|
| Agent memories | `~/.claude/projects/.../memory/` (per-machine) | in-repo `memory/` | one-shot sync Otto-113 + ongoing mirror |
| PR review threads | GitHub-side only | pending BACKLOG | skill/tool to export to git |
| Conversation history | auto-memory + ChatGPT | in-repo `docs/amara-full-conversation/` | Otto-109-110 per-month chunks |
| Raw external artifacts | `drop/` (per-machine) | gitignored local | stays local, absorbed subset lands in docs |

**Pattern:** everything that represents ongoing context
for the factory gets git-native preservation unless
there's a specific reason not to (live credentials,
PII, machine-ephemeral logs). The glass-halo default
is "in repo"; opt-out requires justification.

## Practical implications for future Otto ticks

1. **Writing a new memory:** Save to auto-memory path
   first (CLI compatibility), then in the same tick
   either (a) manually copy to in-repo memory/ and
   update MEMORY.md, or (b) defer to a periodic
   memory-sync PR.
2. **Reading memories:** Prefer in-repo memory/ when
   across sessions / machines; auto-memory when
   CLI-session-state (the auto-loaded context at
   session start).
3. **MEMORY.md index maintenance:** Every in-repo
   write pairs with an index update (per memory-
   index-integrity workflow). No orphan files.
4. **Privacy-review is NOT new here.** Memory has
   always been Otto-written append-log; stuff in it
   is Otto's judgement of what to preserve. The
   git-native landing doesn't change the judgement
   bar, it just makes the preservation more
   durable.

## What this memory does NOT authorize

- **Does NOT** authorize deleting auto-memory at
  `~/.claude/projects/.../memory/`. That path remains
  live-write for CLI compatibility; don't remove it.
- **Does NOT** authorize stopping periodic sync.
  Ongoing mirror Otto-113-style one-shot must become
  recurring (BACKLOG item, separate tick).
- **Does NOT** override the docs-lint / memory-no-lint
  policy (Otto-112). Memory/ in-repo is non-linted;
  docs/ is linted.
- **Does NOT** authorize scrubbing memory content for
  full-name "Aaron Stainback" (Otto-113 scrub was
  docs-only per *"still not from memories"*).
- **Does NOT** authorize dropping existing in-repo
  memory files already committed. Only NEW files get
  synced forward.
- **Does NOT** authorize checking in actual credential
  material (passwords, API keys, session tokens).
  Memory files about Aaron's security background are
  biographical context; memory files containing
  cryptographic secrets are not permitted.

## Composition

- **Otto-112 docs-lint / memory-no-lint policy** —
  unchanged; extended to cover all of memory/**
- **Otto-113 "glass halo" transparency + memory-sync
  directive** — this memory codifies the policy
  consequence
- **Bootstrap-attempt-1 memory (Otto-113)** — the
  factory evolution framing; in-repo memory is the
  natural continuation of the same substrate-
  preservation logic that put the Aaron+Amara
  conversation in-repo
- **.markdownlint-cli2.jsonc** — now ignores
  `memory/**` (widened from `memory/persona/**` this
  same PR)
- **memory-reference-existence-lint.yml + memory-
  index-integrity.yml workflows** — these enforce the
  index discipline; still applicable; no change

## Direct Aaron quote for future reference

*"so the natural home of memories is in repo now? per
user memoreis too and everyitng?"*

Future Otto instances: the answer to this is **YES,
for every type, with glass-halo transparency as the
justification**. Auto-memory remains a staging area
for CLI-tooling compatibility only.
