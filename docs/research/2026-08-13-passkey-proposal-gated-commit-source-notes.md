# Passkey Proposal → Gated Commit: Source Notes

This note records official sources consulted for the credentialless GitHub Pages control model. The signature verifier, branch planner, bounded PR handoff, and fault-injection checks are implemented. The reviewed public enrollment record is proposed separately for the author registry; it is a recovery authority for a human, not the normal execution route for agents.

| Source | Relevant constraint | Design consequence |
|---|---|---|
| W3C WebAuthn Level 3 [1] | WebAuthn credentials are scoped to the relying party origin; an authenticator requires user consent and returns a public-key assertion. Registration and authentication depend on a relying-party challenge. | A Pages PWA may request a user-approved passkey assertion for a proposal, but must bind a fresh, one-use challenge to the proposal digest and current origin. A passkey does not grant GitHub repository authority. |
| GitHub Actions event documentation [2] | Workflows can be triggered from GitHub events, schedules, or external events; event-triggered workflows run only when the workflow file exists on the default branch. | A verifier workflow on `main` can consume a durable GitHub proposal carrier and create a separate branch for a validated proposal. Protected-main policy remains independently enforced. |
| GitHub artifact-attestation guidance [3] | Actions can produce verifiable build provenance using the workflow identity, OIDC, and attestation permissions. | Build provenance can complement proposal evidence, but it does not replace human/passkey proposal authorization or replay prevention. |
| GitHub OAuth authorization guidance [4] | The browser-oriented authorization-code exchange requires a client secret; GitHub also states that CORS preflight is not supported for its authorization endpoint. | A static GitHub Pages PWA cannot safely complete the standard OAuth token exchange or safely keep a shared organization credential. |
| GitHub App security guidance [5] | GitHub says a GitHub App private key must never ship in client-side code; it also cautions that device flow is intended for constrained/headless environments and public clients are spoofable. | Device flow is not a substitute for a repository execution boundary. The PWA signs proposals; GitHub Actions owns bounded execution. |
| GitHub reusable-workflow guidance [6] | A workflow declared with `workflow_call` accepts typed inputs and explicitly passed secrets. Permissions can only be maintained or reduced through a reusable-workflow chain. | A pre-authorized agent running from committed `main` may call a bounded staging workflow automatically. The caller is the execution authority; the PWA never receives its token. |
| GitHub workflow-token guidance [7] | `GITHUB_TOKEN` is available only inside a workflow and GitHub recommends granting its minimum required permissions. | The agent executor can hold `contents: write` only long enough to create a review branch; pull-request creation uses the separately scoped PR credential. |

## Minimum proposal envelope

```json
{
  "schema": "zeta.proposal.v1",
  "proposalId": "uuid",
  "repository": "Lucent-Financial-Group/Zeta",
  "baseRef": "main",
  "baseSha": "immutable commit SHA",
  "createdAt": "RFC3339 UTC",
  "expiresAt": "RFC3339 UTC",
  "nonce": "32-byte random base64url",
  "changeDigest": "sha256 of canonical change payload",
  "authorCredentialId": "WebAuthn credential ID",
  "assertion": "WebAuthn assertion over canonical envelope digest"
}
```

The verifier must reject an unknown credential, wrong repository/ref, stale base SHA, expired proposal, reused nonce/proposal ID, bad assertion, origin or RP-ID mismatch, and a payload whose canonical digest differs from the signed value. Each rejection must produce a teaching error that identifies the invalid field and the corrective generator.

## Authority split

The PWA performs local inference, displays the resulting patch, and may sign a recovery proposal. It does not need a token to do this. The normal autonomous source is an agent already running from committed `main`: it calls the bounded executor with a patch digest and a fresh proposal ID. The executor uses its ephemeral `GITHUB_TOKEN` to create a branch; it never writes directly to protected `main`. The standard required gate reviews the branch/PR.

A static site cannot convert a local patch directly into a GitHub Action invocation without some separate authority: GitHub's browser OAuth exchange requires a client secret and does not support CORS preflight, while a passkey establishes user consent rather than GitHub repository permissions [4]. Therefore a browser-originated automatic handoff requires one of two explicitly separate components: a local companion that stores the user's own short-lived authorization in the operating-system key store, or a small verifier gateway that accepts a passkey-signed proposal and owns the executor credential. Neither credential may be embedded in Pages.

## Normal operating paths

| Path | Human interaction | Source of executor authority | Result |
|---|---|---|---|
| **Autonomous society agent** | None after the agent is enabled | A committed protected-main workflow calls a reusable bounded staging workflow | A patch digest is checked, a non-main branch is created, gates run, and a PR is opened automatically. |
| **Browser-local LLM/BNN** | None to calculate, inspect, and queue a proposal locally | None yet; a static PWA is intentionally unable to dispatch a repository write | The proposal remains local until a companion or verifier gateway is configured. No key leaks and no hidden write occurs. |
| **Human recovery proposal** | One device-native passkey prompt; a first enrollment also needs registry review | The reviewed public WebAuthn credential | The verifier may convert a signed patch into the same bounded branch/PR flow. |

> **Design decision:** opening a GitHub Issue form is no longer the routine delivery mechanism. It is removed from the normal Pages control surface. Agents execute through their already-authorized workflow identity; people use passkeys only when human recovery or explicit authority is needed.

## Operational sequence

The author registry begins empty intentionally. A newly created passkey has **no repository authority** until a maintainer independently reviews the exported enrollment package and adds its parsed P-256 public key, credential ID, exact GitHub Pages origin, and RP ID to `docs/security/proposal-author-registry.json` in a normal protected PR. This separates registration from authorization and prevents any visitor from converting their own passkey into write access. The reviewed Aaron enrollment is currently on that protected-PR path.

| Step | Actor | Authority used | Bounded result |
|---|---|---|---|
| 1. Enroll | Person, from the primary GitHub Pages origin | OS/platform passkey or security key | An exportable public enrollment package only; no GitHub token and no repository mutation. |
| 2. Authorize | Maintainer through a standard protected PR | Existing normal maintainer review path | A named public credential appears in the registry after required gates. |
| 3. Autonomous propose | Committed main-branch agent | Workflow identity and a declared reusable-workflow call | A patch, SHA-256 digest, and bounded proposal ID enter the executor without a browser or issue form. |
| 4. Verify and stage | GitHub Action | Ephemeral `GITHUB_TOKEN` with contents write | A one-time `agent-proposal/<ID>` branch, a receipt, and no protected-main write. |
| 5. Hand off | Same Action | `ZETA_PR_ARCHIVE_TOKEN`, confined to Pull requests: write | A review PR whose required checks remain the merge authority. A failed PR handoff deletes the temporary branch. |

The verifier rejects schema/repository/ref substitutions, non-immutable base SHAs, expired envelopes, wrong change digests, unknown or mismatched credentials, client-data or origin errors, RP-ID mismatch, missing user verification, bad signatures, and consumed nonce or proposal IDs. Every rejection carries a `-1` retraction label and a named corrective generator.

> **Security invariant:** neither GitHub Pages nor the browser receives a shared organization token, an installation token, a GitHub App private key, or the Action's ephemeral write credential. Possession of a passkey proves consent to a proposal; it does not bypass branch protection or create autonomous authority to merge.

## References

[1]: https://www.w3.org/TR/webauthn-3/ "W3C Web Authentication: An API for accessing Public Key Credentials, Level 3"
[2]: https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows "GitHub Docs: Events that trigger workflows"
[3]: https://docs.github.com/en/actions/security-for-github-actions/using-artifact-attestations/using-artifact-attestations-to-establish-provenance-for-builds "GitHub Docs: Using artifact attestations to establish provenance for builds"
[4]: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps "GitHub Docs: Authorizing OAuth apps"
[5]: https://docs.github.com/en/apps/creating-github-apps/about-creating-github-apps/best-practices-for-creating-a-github-app "GitHub Docs: Best practices for creating a GitHub App"
[6]: https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows "GitHub Docs: Reuse workflows"
[7]: https://docs.github.com/actions/reference/authentication-in-a-workflow "GitHub Docs: Use GITHUB_TOKEN for authentication in workflows"
