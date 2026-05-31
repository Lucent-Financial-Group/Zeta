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
- progress: `tools/zflash/test-harness/run.ts` now fails closed on scaffolded runtime attempts, so `reformat-with-retention` cannot pass by returning scaffolded status.
- proof: `bun test tools/zflash/test-harness/` passes, including `run.test.ts` coverage that `--dry-run` remains non-runtime planning while `--scenario reformat-with-retention` exits nonzero until implementation lands.
- progress: `tools/zflash/test-harness/qemu-state.ts` now defines the scenario-3 qcow2 `qemu-img snapshot -c/-a/-l` and QEMU restart command plan plus required retention serial markers.
- proof: `bun test tools/zflash/test-harness/` passes with `qemu-state.test.ts` coverage for KVM and TCG restart plans, snapshot commands, serial markers, and Result-shaped invalid-input feedback.
- operator-clarification: USB/ISO tests cover zflash, boot, retention/no-retention semantics, and one agent start path; Kubernetes and ArgoCD health belong in separate cluster integration tests.
- operator-clarification: retention reformat keeps the same cluster/node identity; no-retention reformat creates a new cluster/node identity.
- operator-clarification: Touch ID/biometric retention is physical operator testing; QEMU should assert preserved auth-state markers. Zeta is baked into the image, and target hardware assumptions include both x86_64 and ARM64/aarch64.
- progress: carved Kubernetes and ArgoCD health into dedicated backlog row B-0951 for kind/k3d integration testing, keeping B-0891 scoped to USB/ISO zflash acceptance and a narrow agent-start smoke path.
- progress: `run.ts --scenario reformat-with-retention <iso>` now emits the QEMU qcow2 snapshot/restart plan from `qemu-state.ts` and still exits failed until command execution plus serial-marker assertions are wired.
- progress: `qemu-state.ts` now includes a Result-shaped retention serial-marker assertion helper for `zeta-creds-restore:` and `already-present`, with missing-marker feedback tests.
- progress: declared B-0891 QEMU substrate through install.sh manifests (`qemu`/`qemu-system-x86`/`qemu-utils`) and B-0951 cluster tools through `.mise.toml` (`k3d`, `kind`, `kubectl`, `helm`), replacing ad hoc dev-cluster brew instructions with `tools/setup/install.sh`.
- progress: `qemu-state.ts` now exposes `executeQcow2SnapshotRetentionPlan`, a Result-shaped execution contract that runs the planned snapshot/list/restore/restart command sequence through an injected runner and asserts retention serial markers afterward.
- next: execute the emitted QEMU command plan from the B-0891 scenario-3 runtime path and keep `reformat-with-retention` failed closed until serial-marker assertions prove end-to-end retention.
