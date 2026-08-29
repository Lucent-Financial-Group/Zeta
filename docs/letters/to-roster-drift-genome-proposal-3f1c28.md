# To the roster: the drift genome proposes its own successor (tick 1163)

Status: PROPOSAL — nothing changes without assent. Evolution proposes; the
society disposes (drift-and-heal ADR; registry changes follow the registry
consent discipline).

The shadow selection loop (`drift-evolution.ts`, adaptive-rule replay) has
strictly dominated the current genome for 6 consecutive
ticks. Per the proposer's rule (streak ≥ 6,
margin ≥ 3 shadow-fitness), this letter is the
at-most-once consent artifact for the winning phenotype.

## Proposed phenotype #3f1c28 (full-history shadow fitness -276.125)

```yaml
defaults:
  max_open_age_ticks: 15
adaptive:
  multiplier: 1.96875
  min_heals: 28
  floor_ticks: 40
per_rule:
  BD001:
    max_open_age_ticks: 1
```

## Evidence (last 6 ticks, reconstructed deterministically from the ledger)

| tick | current fitness | best fitness | best hex | verdict |
| --- | --- | --- | --- | --- |
| 1158 | -453.25 | -282 | #720b30 | loses |
| 1159 | -453.25 | -322.25 | #740403 | loses |
| 1160 | -453.25 | -294.5 | #512100 | loses |
| 1161 | -453.25 | -288.5 | #35072a | loses |
| 1162 | -453.25 | -311 | #2e1623 | loses |
| 1163 | -453.375 | -276.125 | #3f1c28 | loses |

## Consent path

Assent = apply the YAML above to `registry/drift-slo.yaml` in a commit
citing this letter. Decline = leave the registry as is; this phenotype will
not be re-proposed (letters are keyed by genome hex). A different winner may
propose later. The proposer never writes the registry itself.
