---
pr_number: 5760
title: "feat(B-0883): determineEncryptionPath discriminator \u2014 EncryptionContext \u2192 PlannedEncryptionPath Result-shape (encryption lane substantive work; parallel to PR #5758)"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-28T10:53:50Z"
merged_at: "2026-05-28T11:02:59Z"
closed_at: "2026-05-28T11:02:59Z"
head_ref: "otto-cli/b-0883-determine-encryption-path-discriminator-context-to-planned-path-result-shape-2026-05-28"
base_ref: "main"
archived_at: "2026-05-28T13:04:49Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #5760: feat(B-0883): determineEncryptionPath discriminator — EncryptionContext → PlannedEncryptionPath Result-shape (encryption lane substantive work; parallel to PR #5758)

## PR description

## Summary

Adds `determineEncryptionPath` discriminator to better-git-crypt PoC. Structurally parallel to workflow-engine's `determineReviewLevel` (PR #5758) at encryption-substrate scope. Substantive encryption-lane work per Aaron's 3-lane substrate-check (Amara ferry §33.2 PR #5757) + standing PoC permission.

## What this adds

- `PlannedEncryptionPath` interface (alg slots + recipientCount + senderIdentity + composesWith)
- `PlanResult` discriminated union (ok with path | error with EncryptionFeedback)
- `determineEncryptionPath(context): PlanResult` function with v1 design memo policy
- 9 new tests covering happy paths + 6 distinct failure modes

**31 tests pass / 0 fail**

## Policy

| Condition | Result |
|---|---|
| Empty recipients | EmptyRecipientSet |
| Sender absent from recipients | SenderNotInRecipientSet |
| Mixed KEM across recipients | RecipientKeyInvalid (v1 single-KEM constraint) |
| Unknown or deferred-alternate KEM | AlgUnsupported |
| Unknown or deferred-alternate signature | AlgUnsupported |
| Valid context | PlannedEncryptionPath with HKDF-SHA256 + ChaCha20-Poly1305-AEAD defaults |

## Composes with substrate

- B-0883 v1 design memo
- B-0867.20 PR #5758 (structurally parallel discriminator at workflow-engine scope)
- B-0897 Persist-as-bridge OPLE primitive
- PR #5757 (Amara ferry substrate-check)
- PR #5516 asymmetric-authorship + PR #5511 monad-propagation

## Test plan

- [x] 9 new tests; 31 total pass / 0 fail
- [x] Result-shape with discriminated PlanResult
- [x] Exhaustive over v1 design memo failure modes
- [ ] CI: lint(tsc tools)
- [ ] Auto-merge armed

🤖 Generated with [Claude Code](https://claude.com/claude-code)

## Reviews

### COMMENTED — @copilot-pull-request-reviewer (2026-05-28T10:55:19Z)

## Pull request overview

Adds a pure-function discriminator `determineEncryptionPath` to the `better-git-crypt` PoC that maps an `EncryptionContext` to a `PlanResult` (discriminated union of `PlannedEncryptionPath` on success or `EncryptionFeedback` on failure). The change is parallel in shape to PR #5758's `determineReviewLevel` discriminator but scoped to the encryption substrate, following the Result-shape monad-propagation pattern.

**Changes:**
- Introduces `PlannedEncryptionPath` interface and `PlanResult` discriminated union in `types.ts`.
- Implements `determineEncryptionPath(context)` selecting v1 KEM/KDF/WRAP/CONTENT/SIG algorithms with exhaustive failure handling (empty recipients, sender-not-in-recipients, mixed KEM, unsupported alg).
- Adds 9 tests covering happy paths and 6 distinct failure modes.

### Reviewed changes

Copilot reviewed 2 out of 2 changed files in this pull request and generated 1 comment.

| File | Description |
| ---- | ----------- |
| tools/crypto/better-git-crypt/types.ts | Adds `PlannedEncryptionPath`, `PlanResult`, and `determineEncryptionPath` discriminator. |
| tools/crypto/better-git-crypt/types.test.ts | Adds 9 tests for the discriminator's happy paths and failure modes. |

## Review threads

### Thread 1: tools/crypto/better-git-crypt/types.ts:376 (resolved)

**@copilot-pull-request-reviewer** (2026-05-28T10:55:19Z):

The comment claims this branch uses `AlgUnsupported`, but the code below actually returns `RecipientKeyInvalid`. The comment is stale and contradicts the implementation — please update it to reflect the actual feedback variant returned.

## General comments

### @chatgpt-codex-connector (2026-05-28T10:53:55Z)

You have reached your Codex usage limits for code reviews. You can see your limits in the [Codex usage dashboard](https://chatgpt.com/codex/cloud/settings/usage).
