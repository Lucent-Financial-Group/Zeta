# To the roster: the drift genome proposes its own successor (tick 1146)

Status: PROPOSAL — nothing changes without assent. Evolution proposes; the
society disposes (drift-and-heal ADR; registry changes follow the registry
consent discipline).

The shadow selection loop (`drift-evolution.ts`, adaptive-rule replay) has
strictly dominated the current genome for 6 consecutive
ticks. Per the proposer's rule (streak ≥ 6,
margin ≥ 3 shadow-fitness), this letter is the
at-most-once consent artifact for the winning phenotype.

## Proposed phenotype #4c1618 (full-history shadow fitness -265.75)

```yaml
defaults:
  max_open_age_ticks: 17
adaptive:
  multiplier: 2.375
  min_heals: 22
  floor_ticks: 24
per_rule:
  BD001:
    max_open_age_ticks: 4
```

## Evidence (last 6 ticks, reconstructed deterministically from the ledger)

| tick | current fitness | best fitness | best hex | verdict |
| --- | --- | --- | --- | --- |
| 1141 | -453.25 | -335.5 | #4b000e | loses |
| 1142 | -453.25 | -275.25 | #3a1f00 | loses |
| 1143 | -453.25 | -366.5 | #420007 | loses |
| 1144 | -453.25 | -288.5 | #492004 | loses |
| 1145 | -453.25 | -270.5 | #5c0f08 | loses |
| 1146 | -453.25 | -265.75 | #4c1618 | loses |

## Consent path

Assent = apply the YAML above to `registry/drift-slo.yaml` in a commit
citing this letter. Decline = leave the registry as is; this phenotype will
not be re-proposed (letters are keyed by genome hex). A different winner may
propose later. The proposer never writes the registry itself.
