# Codex claim - docker-nixos-install-sh-test PATH repair

Claim id: codex-docker-nixos-install-sh-test-path-20260527
Owner: Codex/Vera
Branch: claim/codex-docker-nixos-install-sh-test-path-20260527
Status: active
Opened: 2026-05-27T07:39Z

## Scope

Repair the Docker build PATH/base-image failure blocking PR #5416:

- `tools/ci/dockerfiles/nixos-install-sh-test/Dockerfile`
- `tools/ci/docker-nixos-install-sh-test.ts` only if the wrapper needs a matching assertion or error message

## Blocker Being Addressed

PR #5416 is green except `docker-nixos-install-sh-test`, which fails before the
harness runs:

```text
/bin/sh: line 1: mkdir: command not found
Dockerfile:53
```

The failure reproduces on PR #5416 head `6626ccf02f1e8d909a49b9dd93f14ebdc799ff79`
and the PR does not modify the Dockerfile. This claim keeps the harness repair
separate from the B-0855.1 self-register service branch.

## Non-Overlap

Do not modify the B-0855.1 service files from PR #5416:

- `full-ai-cluster/flake.nix`
- `full-ai-cluster/nixos/modules/common.nix`
- `full-ai-cluster/nixos/modules/zeta-self-register.nix`
- `tools/ci/audit-installer-substrate.ts`

## Verification Plan

- Inspect the Dockerfile base/PATH behavior.
- Run `bun tools/ci/docker-nixos-install-sh-test.ts` if local Docker is available.
- If Docker is unavailable locally, run source-level checks and leave the Docker
  runtime gap explicit in the PR.
