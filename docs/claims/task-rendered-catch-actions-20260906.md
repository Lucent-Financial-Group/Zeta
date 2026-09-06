# Claim - task-rendered-catch-actions-20260906

- **Session ID:** codex/native-20260906-73b9
- **Co-claimants:** codex/01a0783bc64f70e1, codex/native-20260906-73b9
- **Harness:** codex
- **Claimed at:** 2026-09-06T21:08:28Z
- **ETA:** Registration now; implementation progress within two hours.
- **Scope:** Execute the preregistered rendered CHIP-8 catch follow-up using frozen
  chronological count predictors, rendered-only policy inputs, real keypad
  actions, independent replay, and supplied-goal claim boundaries.
- **Durable target:** `docs/research/2026-09-06-rendered-catch-actions-protocol.md`
  and work item `081M1W8T690087G0R002DJ91MJ`.
- **Platform mirror:** Dependent on
  <https://github.com/Lucent-Financial-Group/Zeta/pull/16858>.

## Notes

The reviewed protocol is frozen at registration, before acting implementation.
The native contributor owns rendered-catch F# modules/runners and focused
tests; the coordinating contributor owns independent Python replay/verdict,
integrated publication, and result receipts/report. Agree the receipt schema
before any measured run. Native implementation commits are transferred to the
coordinator for publication, avoiding concurrent shared-branch pushes.

Registration merges the preserved predecessor branch at
`69ba5db2f663a44e81d85e1c70bfb02c660fb7e5` and current main. PR #16858 remains
pending at registration; final main integration follows its landing.
The implementation must be remotely preserved before measurements begin.

The five policy arms share a target-band projection. Its background is
computed from rows 0..23 only, so catcher and feedback pixels cannot supply
external memory. The revised layout puts the hit glyph at y=26; the palette
panel keeps fixed dot geometry and changes palette on odd observation indices.
