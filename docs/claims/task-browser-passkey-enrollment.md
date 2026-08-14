# Claim - task-browser-passkey-enrollment

- **Session ID:** codex/0814-passkey-enrollment
- **Harness:** codex
- **Claimed at:** 2026-08-14T12:16:19Z
- **ETA:** 2026-08-14T16:30:00Z
- **Scope:** Add a source-owned browser passkey enrollment ceremony, strict independent package verification, and an explicit Dark Hall enrollment control.
- **Durable target:** `src/Core.TypeScript/browser-node/`, `src/Core.TypeScript/planning/`, `src/Core.TypeScript/darkhall-ui/`, focused tests, and this claim.

## Notes

Enrollment creates no repository authority. A human confirms the WebAuthn ceremony, and a separate protected PR must approve the resulting public credential before proposals can use it.
