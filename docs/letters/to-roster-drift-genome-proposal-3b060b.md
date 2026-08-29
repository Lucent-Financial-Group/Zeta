# To the roster: the drift genome proposes its own successor (tick 1169)

Status: PROPOSAL — nothing changes without assent. Evolution proposes; the
society disposes (drift-and-heal ADR; registry changes follow the registry
consent discipline).

The shadow selection loop (`drift-evolution.ts`, adaptive-rule replay) has
strictly dominated the current genome for 6 consecutive
ticks. Per the proposer's rule (streak ≥ 6,
margin ≥ 3 shadow-fitness), this letter is the
at-most-once consent artifact for the winning phenotype.

## Proposed phenotype #3b060b (full-history shadow fitness -258.75)

```yaml
defaults:
  max_open_age_ticks: 12
adaptive:
  multiplier: 1.84375
  min_heals: 6
  floor_ticks: 11
per_rule:
  BD001:
    max_open_age_ticks: 2
```

## Evidence (last 6 ticks, reconstructed deterministically from the ledger)

| tick | current fitness | best fitness | best hex | verdict |
| --- | --- | --- | --- | --- |
| 1164 | -453.375 | -370.375 | #3c1a03 | loses |
| 1165 | -453.375 | -304.375 | #540f20 | loses |
| 1166 | -453.375 | -282.375 | #3d1d06 | loses |
| 1167 | -453.375 | -282.125 | #6b132e | loses |
| 1168 | -453.5 | -322 | #682207 | loses |
| 1169 | -453.625 | -258.75 | #3b060b | loses |

## Consent path

Assent = apply the YAML above to `registry/drift-slo.yaml` in a commit
citing this letter. Decline = leave the registry as is; this phenotype will
not be re-proposed (letters are keyed by genome hex). A different winner may
propose later. The proposer never writes the registry itself.
