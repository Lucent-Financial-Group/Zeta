# To the roster: the drift genome proposes its own successor (tick 1155)

Status: PROPOSAL — nothing changes without assent. Evolution proposes; the
society disposes (drift-and-heal ADR; registry changes follow the registry
consent discipline).

The shadow selection loop (`drift-evolution.ts`, adaptive-rule replay) has
strictly dominated the current genome for 6 consecutive
ticks. Per the proposer's rule (streak ≥ 6,
margin ≥ 3 shadow-fitness), this letter is the
at-most-once consent artifact for the winning phenotype.

## Proposed phenotype #2f0010 (full-history shadow fitness -290)

```yaml
defaults:
  max_open_age_ticks: 11
adaptive:
  multiplier: 1.46875
  min_heals: 1
  floor_ticks: 16
per_rule:
  BD001:
    max_open_age_ticks: 1
```

## Evidence (last 6 ticks, reconstructed deterministically from the ledger)

| tick | current fitness | best fitness | best hex | verdict |
| --- | --- | --- | --- | --- |
| 1150 | -453.25 | -320.75 | #2e1100 | loses |
| 1151 | -453.25 | -353.25 | #320303 | loses |
| 1152 | -453.25 | -376.5 | #430000 | loses |
| 1153 | -453.25 | -363.375 | #670000 | loses |
| 1154 | -453.25 | -342 | #542500 | loses |
| 1155 | -453.25 | -290 | #2f0010 | loses |

## Consent path

Assent = apply the YAML above to `registry/drift-slo.yaml` in a commit
citing this letter. Decline = leave the registry as is; this phenotype will
not be re-proposed (letters are keyed by genome hex). A different winner may
propose later. The proposer never writes the registry itself.
