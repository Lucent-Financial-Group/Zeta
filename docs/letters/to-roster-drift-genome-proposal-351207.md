# To the roster: the drift genome proposes its own successor (tick 1152)

Status: PROPOSAL — nothing changes without assent. Evolution proposes; the
society disposes (drift-and-heal ADR; registry changes follow the registry
consent discipline).

The shadow selection loop (`drift-evolution.ts`, adaptive-rule replay) has
strictly dominated the current genome for 6 consecutive
ticks. Per the proposer's rule (streak ≥ 6,
margin ≥ 3 shadow-fitness), this letter is the
at-most-once consent artifact for the winning phenotype.

## Proposed phenotype #351207 (full-history shadow fitness -276.75)

```yaml
defaults:
  max_open_age_ticks: 12
adaptive:
  multiplier: 1.65625
  min_heals: 18
  floor_ticks: 7
per_rule:
  BD001:
    max_open_age_ticks: 1
```

## Evidence (last 6 ticks, reconstructed deterministically from the ledger)

| tick | current fitness | best fitness | best hex | verdict |
| --- | --- | --- | --- | --- |
| 1147 | -453.25 | -391.625 | #660001 | loses |
| 1148 | -453.25 | -276.75 | #351207 | loses |
| 1149 | -453.25 | -389.5 | #3b0a13 | loses |
| 1150 | -453.25 | -320.75 | #2e1100 | loses |
| 1151 | -453.25 | -353.25 | #320303 | loses |
| 1152 | -453.25 | -376.5 | #430000 | loses |

## Consent path

Assent = apply the YAML above to `registry/drift-slo.yaml` in a commit
citing this letter. Decline = leave the registry as is; this phenotype will
not be re-proposed (letters are keyed by genome hex). A different winner may
propose later. The proposer never writes the registry itself.
