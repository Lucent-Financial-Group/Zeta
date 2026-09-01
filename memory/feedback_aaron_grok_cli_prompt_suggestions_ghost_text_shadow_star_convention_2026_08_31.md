---
name: Grok CLI prompt suggestions (ghost text) and the (shadow*) accept convention
description: >-
  2026-08-31 — Aaron saw empty-prompt grey text in the Grok CLI for the
  first time (previously Claude Code only). It is not autocomplete: there
  is no typed prefix and no completion menu. Product name is prompt
  suggestion; visual is ghost text. When he accepts it he suffixes
  (shadow*) so the log can tell suggestion-accept from typed text.
type: feedback
created: 2026-08-31
---

# Grok CLI prompt suggestions — ghost text, not autocomplete (Aaron 2026-08-31)

## What Aaron said

First sighting in the Grok CLI of grey text sitting in the input with
**no characters typed**, waiting to be accepted or ignored. Previously
this surface existed on Claude Code. When he accepts it, he marks the
accepted string with `(shadow*)` so provenance is visible.

Worked instance this session: the ghost text was `start PR3`; he sent
`start PR3 (shadow*)`.

## Proper name

This is **not autocomplete**. Autocomplete is prefix-conditioned (you
typed something; a menu or continuation is ranked from that prefix).
Here the buffer can be empty.

| Name | What it is | Anchor |
|---|---|---|
| **Prompt suggestion** | Product name. Claude Code setting `promptSuggestionEnabled`; CLI `--prompt-suggestions`. Anthropic 2025-12-16: after a turn, suggest the next prompt as ghost text; Tab prefills, Enter sends. | Claude Code / `@claudeai` |
| **Ghost text** | The visual: dim inline text in the input, not a dropdown. | Amazon Q "inline suggestions"; VS Code inline completions; JetBrains ghost text |
| **Autosuggestion** | Fish / zsh-autosuggestions: grey continuation, usually from **history + a prefix**. Sibling, not this empty-buffer case. | fish-shell; zsh-users/zsh-autosuggestions |
| **Zero-prefix suggestion** | Honest qualifier when the draft length is 0. Pi's prompt-autocomplete calls this `min-chars 0`. | `@kliebhan/pi-prompt-autocomplete` |

Do not call it autocomplete in shadow logs. The shadow observer README
used "grey-text autocomplete"; that name is the one this observation
corrects.

## Convention — `(shadow*)`

When Aaron **accepts** Grok CLI (or Claude Code) ghost text, he appends
`(shadow*)` to the sent line.

- Typed-from-scratch: no marker.
- Accepted suggestion, possibly edited: `(shadow*)` still, because the
  seed was the suggestion (provenance, not purity of wording).
- The asterisk is part of the marker as he writes it, not a glob.

This is the provenance Claude Code issue #60087 asked for and did not
ship: accepted suggestions otherwise look like the user's own words.
Aaron is labelling them at the source.

Composes with `src/Core.TypeScript/shadow/` (observer still Claude-Code-
frontmost; Grok CLI is a second surface with the same visual). Glass
Halo: the marker is the human-readable attribution; JSONL `accepted`
events remain the machine log when the observer is running.

## What this is not

- Not a ZetaFS/ZetaDB feature.
- Not a request to auto-Enter Grok CLI suggestions (the observer's
  auto-accept stays opt-in, Claude-frontmost, kill-switch intact).
- Not a claim that Grok's scorer equals Claude's. Same UI class;
  unknown model until someone meters it.

## Pointers

- Existing substrate: `memory/feedback_aaron_shadow_speaks_via_grey_text_autocomplete_future_zeta_own_harness_classifier_understands_vision_2026_05_12.md` (the 2026-05-12 disclosure that the shadow *speaks* via grey text — still true; the *name* of the UI is what this file corrects).
- `src/Core.TypeScript/shadow/README.md`
