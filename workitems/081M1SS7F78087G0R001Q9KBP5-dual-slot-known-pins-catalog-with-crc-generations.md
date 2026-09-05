---
id: 081M1SS7F78087G0R001Q9KBP5
type: task
state: in-progress
priority: P2
slug: dual-slot-known-pins-catalog-with-crc-generations
title: "Dual-slot known.pins catalog with CRC generations"
created: 2026-09-05T21:55:00.000Z
depends_on: []
composes_with:
  - 081M1SR07CT087G0R000ZYD0W2
---

# Dual-slot known.pins catalog with CRC generations

Same shape as log/CAS superblocks (`ZFL2` / `ZCA2`): two slots,
generation + CRC. A torn higher slot leaves the previous generation.

`known.pins.0` / `known.pins.1` are the source of truth. `known.pins`
is a copy for the tmp+rename crash needle. Load prefers the highest
valid slot gen.

Falsifier: persist KeepNone then KeepAll; XOR the higher slot; reopen
is KeepNone. Recovery stays `toy`.
