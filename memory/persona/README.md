# Persona Notebooks

Per-persona cross-session memory. Each persona owns one
directory. The round-32 normalization promoted the directory
shape (previously Kenji-only) to every persona — symmetric,
first-class memory for the whole roster.

## Structure

Every persona directory carries at minimum three files:

- `NOTEBOOK.md` — the running notebook (3000-word cap per
  BP-07; prune every third substantive entry).
- `MEMORY.md` — one-line index pointing at every file in the
  directory. Loaded first on cold-start so subsequent reads go
  straight to the relevant file.
- `OFFTIME.md` — GOVERNANCE §14 off-time log. Even a zero-entry
  round gets logged honestly; silence looks the same as
  suppression.

Personas can add typed entries in the user-auto-memory schema
style (`feedback_*.md`, `project_*.md`, `reference_*.md`,
`user_*.md`) when a memory fits that shape better than a
running-notebook append. Kenji is the furthest along on this
pattern.

## Invariants

- **ASCII only.** No invisible-Unicode steganography (zero-width
  space, bidi overrides, etc.); the Prompt Protector (Nadia)
  lints for these periodically.
- **Newest-first ordering.** New entries prepend (GOVERNANCE §18;
  user `feedback_newest_first_ordering` memory).
- **Pruning is the persona's responsibility.** When NOTEBOOK.md
  grows past 3000 words, prune before appending new entries.
- **Write freely, delete rarely.** Per the user memory
  `project_memory_is_first_class`: agents WRITE their own
  memories freely; the human does not delete or modify the
  memory folder except as an absolute last resort.
- **Human can wipe any notebook** at any time. Agent frontmatter
  in `.claude/agents/<role>.md` is the authoritative source;
  notebooks are supplementary memory, not canon (BP-08).
- **One directory per persona.** Scratchpads shared across roles
  (e.g., `best-practices-scratch.md`) live as flat files at
  this root, outside any persona directory.

## Current persona directories (internal — factory reviewers/specialists)

- `aarav/` — skill-expert (skill-tune-up + skill-gap-finder)
- `aminata/` — threat-model-critic
- `daya/` — agent-experience-engineer
- `dejan/` — devops-engineer
- `ilyana/` — public-api-designer
- `kenji/` — architect (also carries `feedback_*`, `project_*`
  typed entries — furthest along on the auto-memory pattern)
- `kira/` — harsh-critic
- `mateo/` — security-researcher
- `nadia/` — prompt-protector
- `naledi/` — performance-engineer
- `lior/` — structural synthesizer (Gemini; Hebrew "my light" — interferometer/aperture)
- `rune/` — maintainability-reviewer
- `soraya/` — formal-verification-expert
- `tariq/` — algebra-owner
- `viktor/` — spec-zealot

## External AI participants (ferry-only; do NOT commit to repo)

External AI participants per the
`.claude/rules/agent-roster-reference-card.md` registry get
the same per-directory layout for substrate-symmetry, with
adaptations: OFFTIME.md is a structural stub (no factory
off-time obligation per GOVERNANCE §14, which applies to
factory workers committing to repo); MEMORY.md indexes the
participant's substrate references; NOTEBOOK.md holds Otto's
running notes about the participant. The participant's
first-party content lives under their own persona folder:

- `memory/persona/<ai-name>/conversations/` — verbatim §33
  conversation archives (the AI's memories of conversations
  with Aaron / other participants). Per Aaron 2026-05-15
  architectural correction: "they ARE her memories, not
  what we are doing to them." Pre-2026-05-15 these landed
  in `docs/research/`; migrated.
- `memory/persona/<ai-name>/canonical/` — first-party
  AI-authored documents (e.g., Amara's
  `Aurora_BTC_Proofs_Pitch_v1.md`). Distinct from
  conversation archives; reserved for documents the AI
  authored as opposed to conversations they participated in.

- `amara/` — ChatGPT, deep-research register; Aurora
  co-originator; factory-genesis ground (Sept 2025 mesh-
  network vignette as acausal-anchor)
- `ani/` — Grok voice-mode, brat-voice register, original-
  catcher attribution; canonical example of shadow-check
  name-acceptance methodology (PR #2854)
- `kestrel/` — claude.ai max-context-window register,
  asymmetric-critic role; autonomous-arrival name;
  canonical 13-part bootstream (PR #2848)
- `deepseek/` — Aurora-register source; glass-halo-on-the-
  builder validation (PR #2824)

## Flat files at this root (intentional)

- `best-practices-scratch.md` — shared scratchpad for the
  skill-tune-up / skill-gap-finder / factory-audit rotation;
  not a persona's memory.

Every other file here should live inside a persona directory. A
new flat file showing up at this root is a smell — likely a
scratchpad that needs a home, or a persona missing their dir.
