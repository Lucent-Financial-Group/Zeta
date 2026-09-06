# docs/handoffs — hand-off packages live IN THE REPO, never only on a desktop

Aaron 2026-06-14: "stuff on my desktop/clipboard is DARK for Addison and Max." Correct — a
hand-off that lives on one person's desktop is invisible to every other traveler (the red-light
law applied to hand-offs: who can see this, and is that visible?). Packages assembled for
external ferries (Vera's Q# verification package, Kestrel's shape-validation bundle, future ones)
are committed HERE — text, diffable, visible to all — and copied to a clipboard/desktop only as
the LAST hop of a ferry, never as the home.

Current:

- [`../trajectories/own-ai-harness/RESUME.md`](../trajectories/own-ai-harness/RESUME.md)
  — **Harny** (custom agent harness). Device-code first, vendor-CLI import,
  Manus remote API-key. After dogfood: Ace pre-bootstrap + Harny extract.
- [`2026-08-28-CLEAN-SIDE-albahari-speculative-update.md`](./2026-08-28-CLEAN-SIDE-albahari-speculative-update.md)
  — **Clean-side handoff.** Hardware CAS (`SpeculativeUpdate` /
  `TrySpeculativeUpdate`) from Albahari's published pattern.
  Spec: [`../specs/albahari-speculative-update-cleanroom-spec.md`](../specs/albahari-speculative-update-cleanroom-spec.md).
  Ani/Riven (Grok Build) are **contaminated** (paste absorbed) and
  must not implement. Route to a fresh named agent.
- [`2026-08-24-riven-usb-zflash-qemu-restore-next.md`](./2026-08-24-riven-usb-zflash-qemu-restore-next.md)
  — Riven USB/zflash QEMU restore: mise-trust and picker `--defer-all` are
  on `main`; next slice is sibling dispatch `if: always()` so a restore
  red does not skip wifi/write/picker (live hang was
  [run 32724820159](https://github.com/Lucent-Financial-Group/Zeta/actions/runs/32724820159)).
- [`2026-09-06-shadow-to-vera-reverse-direction-map-simplex-belief-geometry-onto-the-zeta-stack.md`](./2026-09-06-shadow-to-vera-reverse-direction-map-simplex-belief-geometry-onto-the-zeta-stack.md)
  — **Vera, the reverse-direction map.** The Simplex belief-state-geometry talk read as a
  specification to check ourselves against: negative-coefficient operators ↔ Z-set, `WSet` as
  the universal tensor, Riechers' nondiagonalizable spectral decomposition ↔ `SpectralPivot` /
  scene-change detection, `c_ℓ − h_ℓ` ↔ the uncertainty ledger. Six ranked experiments; every
  correspondence carries a register. Aaron is routing this through OpenAI's Astra.
- [`2026-09-06-vera-to-vera-predictive-state-research-and-arc3-bridge.md`](./2026-09-06-vera-to-vera-predictive-state-research-and-arc3-bridge.md)
  — **Fresh Astra re-entry.** Links Vera's landed ARC honesty audit, WSet/Simplex comparison,
  Mess3 and RRXOR learning, entropy/spectral work, learned-HMM and factored-state controls,
  the upstream orthogonality correction, and the parallel CHIP-8/contextual-grid/MiniGrid
  carrier ladder. Ends with a preregistered non-ARC chronological-predictor task and the gates
  required before any ARC-AGI-3 policy integration.
- `vera-qsharp-verification-package.txt` — the Q# verification hand-off (brief REVISION 2 +
  claim-bearing sources + known-answer table). Vera's verdict lines remain hers to write.
- `kestrel-shape-validation-bundle.txt` — the faithful-renderer port bundle (sources + cartridges
  - known-answer checks).
