# To the roster: the drift genome proposes its own successor (tick 1175)

Status: PROPOSAL — nothing changes without assent. Evolution proposes; the
society disposes (drift-and-heal ADR; registry changes follow the registry
consent discipline).

The shadow selection loop (`drift-evolution.ts`, adaptive-rule replay) has
strictly dominated the current genome for 6 consecutive
ticks. Per the proposer's rule (streak ≥ 6,
margin ≥ 3 shadow-fitness), this letter is the
at-most-once consent artifact for the winning phenotype.

## Proposed phenotype #75070b (full-history shadow fitness -272.75)

```yaml
defaults:
  max_open_age_ticks: 11
adaptive:
  multiplier: 3.65625
  min_heals: 7
  floor_ticks: 11
per_rule:
  BD001:
    max_open_age_ticks: 4
```

## Evidence (last 6 ticks, reconstructed deterministically from the ledger)

| tick | current fitness | best fitness | best hex | verdict |
| --- | --- | --- | --- | --- |
| 1170 | -457.75 | -279 | #6f0c0b | loses |
| 1171 | -459.875 | -324.125 | #600519 | loses |
| 1172 | -463 | -306.375 | #4b0009 | loses |
| 1173 | -467.125 | -389.375 | #5f0a2a | loses |
| 1174 | -472.25 | -293.5 | #461c00 | loses |
| 1175 | -478.375 | -272.75 | #75070b | loses |

## Consent path

Assent = apply the YAML above to `registry/drift-slo.yaml` in a commit
citing this letter. Decline = leave the registry as is; this phenotype will
not be re-proposed (letters are keyed by genome hex). A different winner may
propose later. The proposer never writes the registry itself.
