# Source v2: pre-result repairs with retained witnesses

Date: 2026-09-06
Operational status: research-grade
Lifecycle: active
Protocol: [registered protocol](2026-09-06-protocol.md)
Original source: `0f021adac`, `archive/relational-identity-20260906-source-v1`
Repaired source archive: `archive/relational-identity-20260906-source-v2`

Source v1 is preserved unchanged. Its ten focused native tests passed, but two
additional checks found defects before the complete experiment was executed.
The v2 fixture panel adds one regression mutation, making eighteen cases. This
is a witnessed implementation repair, without changing the hypothesis,
threshold, graph budget or promotion rule.

## Unavailable alternatives were hidden by event-ID coverage

A view contained an accepted receipt for event `e` and a second occurrence
with the same event ID, a different claim, and unavailable authentication.
The other view contained only the accepted receipt. The v1 witness returned:

```text
Status=consistent-on-declared-cut; UnverifiedRight=[]; InvariantPresent=true
```

The cause was subtracting all accepted event IDs from unavailable event IDs.
That erased an unresolved alternative. Source v2 preserves every unavailable
occurrence in the diagnostic and returns unknown coverage if any exists,
including when another occurrence covers its event ID. An authenticated
conflict still takes priority. This is deliberately conservative: even an
unavailable duplicate of identical content remains visible and unknown.
Only identical *authenticated* receipts have the registered idempotent replay
behavior. The native and independent Python tests retain both variants.

## The runner used a reserved F# identifier

The frozen kernel and test executable compiled with zero warnings and errors.
A separate compile-only invocation of the runner with `--warnaserror` found
`FS0046`: its local name `process` is reserved for future F# use. Rename that
local to `runningProcess`. No panel ran and no output receipt was written by
the failed invocation. The repair does not change the model or measurements.

## Source verification and execution

The strict independent replay accepts the v2 archive and checks all source
hashes, including this repair record. Current-tree regression tests regenerate
all semantic outcomes and validate the source-hash schema; a separate temporary
snapshot test checks actual hash mismatch rejection. Historical source hashes
remain evidence about their archive checkout, rather than a prohibition on
future unrelated edits to the live repository.

Both archived refs must remain reachable. Run the complete panel only after
the v2 source ref is pushed, retain the output and independent replay, then
apply the registered stopping and promotion rules.
