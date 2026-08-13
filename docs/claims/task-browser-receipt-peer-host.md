# Claim - task-browser-receipt-peer-host

- **Session ID:** codex/20260813-browser-peer-host
- **Harness:** codex
- **Claimed at:** 2026-08-13T21:55:06Z
- **ETA:** 2026-08-13T23:55:06Z
- **Scope:** Reconcile deterministic browser-tab receipt peer selection into one bounded same-origin receipt link as lifecycle readouts change.
- **Durable target:** `src/Core.TypeScript/browser-node/` peer-host implementation, focused tests, barrel export, and a pull request
- **Platform mirror:** pending pull request

## Notes

The selector and fixed-peer BroadcastChannel link are already on main. This slice connects them through the existing lifecycle readout sink without clocks, polling, or changes to the receipt wire protocol. It excludes UDP, Reticulum, and other mesh transport work.
