# Live claims

This directory holds **active claim files** under the
git-native claim protocol specified in
[`../AGENT-CLAIM-PROTOCOL.md`](../AGENT-CLAIM-PROTOCOL.md).

Each live claim is one file at `docs/claims/<slug>.md`,
where `<slug>` follows the slug rules in the protocol
(`backlog-<N>`, `bug-<N>`, `issue-<N>`, or
`task-<kebab-slug>`).

## How to use

- **Look for live claims:** `ls docs/claims/`
- **Read a specific claim:** `cat docs/claims/<slug>.md`
- **File a new claim:** create `docs/claims/<slug>.md`
  using the [claim file template](../AGENT-CLAIM-PROTOCOL.md#claim-file-shape)
  and commit `claim: <slug> - <one-line scope>`
- **Release a claim:** delete the file in the same PR
  that lands the work

A live claim with `claimed-at` within the last 24 hours
is **active** — pick different work or wait. A claim
older than 24 hours without a progress signal is
**stale** and may be force-released (see
[Stale claims](../AGENT-CLAIM-PROTOCOL.md#stale-claims-and-force-release)).

This directory is tracked so a fresh clone has the
lookup target already in place; the `README.md` keeps
it non-empty across release cycles when no claims are
live.
