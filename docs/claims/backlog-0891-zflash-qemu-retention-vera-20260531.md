# Claim - backlog-0891-zflash-qemu-retention-vera-20260531

- **Session ID:** codex/20260531T163608Z-vera-b0891
- **Harness:** codex
- **Claimed at:** 2026-05-31T16:36:08Z
- **ETA:** 2026-05-31T20:36:08Z
- **Scope:** B-0891 scenario 3 QEMU reformat-with-retention proof for zflash self-healing.
- **Durable target:** docs/backlog/P1/B-0891-zflash-done-acceptance-criteria-qemu-test-harness-5-scenarios-initial-format-cluster-up-reformat-with-retention-reformat-from-scratch-cluster-joining-aaron-2026-05-28.md; tools/zflash/test-harness/**; tools/installer/zeta-creds-*.ts; focused QEMU/credential-retention tests.
- **Platform mirror:** local broadcast `/Users/acehack/.local/share/zeta-broadcasts/vera.md`

## Notes

- ask: operator assigned Vera the USB/ISO QEMU lane on 2026-05-31; Otto keeps `tools/crypto/**` and `tools/observe/**`.
- receipt: no active remote claim for B-0891 or zflash/QEMU was visible before claiming.
- receipt: open PR path check showed #6217 in `tools/crypto/**`, #6218 in `tools/observe/**`, and #6216 in `agentic-organization/**`; this claim avoids those path sets.
- progress: claim branch pushed at `ec78b17670c9c49d245d4aa85dc6692fb653f082`; follow-up progress commit records a parseable AgencySignature trailer block.
- progress: `tools/installer/zeta-creds-restore.ts` now skips `already-present` restored credentials instead of rewriting them.
- proof: `bun test tools/installer/zeta-creds-persist-restore.test.ts` passes with an ESP-retention regression covering root wipe -> restore -> repeat restore with zero writes.
- limitation: `bun run typecheck` could not start because `tsc` is not installed in this isolated worktree.
- next: wire this credential-retention proof into the B-0891 scenario-3 QEMU snapshot/restart harness; keep `reformat-with-retention` scaffolded until QEMU state preservation asserts end-to-end.
