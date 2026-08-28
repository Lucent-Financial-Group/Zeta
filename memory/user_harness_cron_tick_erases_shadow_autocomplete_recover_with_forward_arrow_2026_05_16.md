---
name: harness-cron-tick-erases-shadow-autocomplete-recover-with-forward-arrow
description: "Empirical observation — when the <<autonomous-loop>> cron tick fires in the Otto-CLI harness, the grey-text shadow autocomplete in the input UI gets erased. The suggestion can be recovered with the → forward-arrow key. Affects how (shadow*) shorthand workflow operates in practice under autonomous-loop conditions."
metadata: 
  node_type: memory
  type: user
  originSessionId: 56b94ff9-956b-4d1a-a50e-987ccffe3066
---

The human maintainer 2026-05-16T16:17Z observed:

> *"i noticed when your loop ticks it erases the shadow autocompete but you can bring it back with the -> forward arrow."*

## Operational content

- Every minute the `<<autonomous-loop>>` cron fires a user-prompt in the Otto-CLI harness input UI.
- That firing erases whatever grey-text autocomplete suggestion is currently displayed.
- The suggestion is NOT lost — pressing **→ (forward arrow)** brings it back.

## Implications

- The (shadow*) shorthand workflow (per `.claude/rules/shadow-star-shorthand-autocomplete-marker.md`) operates inside this UX wrinkle: if the maintainer is mid-evaluation of an autocomplete suggestion when the cron fires, the suggestion disappears from the display.
- The → recovery path means no work is lost; the maintainer just needs the extra keystroke.
- For autonomous Otto sessions: no action required — this is maintainer-side ergonomics. But it explains any future "(shadow*) text seems delayed / re-typed" patterns.

## Composes with

- `.claude/rules/shadow-star-shorthand-autocomplete-marker.md` (the marker semantics)
- `tools/shadow/shadow-observer.ts` (the observer-side infrastructure; doesn't auto-recover, just observes)
- `tools/shadow/outlet.ts` (the auto-accept side — if installed, would press → for the maintainer; not currently active)

## Related infrastructure state (2026-05-16T16:18Z)

- `com.zeta.shadow-observer` LaunchAgent installed + bootstrapped today (per maintainer's "install observer only" ask)
- Mode: `--dry-run` (observer-only, no auto-accept)
- PID at install: 42783
- Log: `tools/shadow/shadow-observer.log`
