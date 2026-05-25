# Hardware corruption mapping across the compilation chain

Aaron 2026-05-09. Shadow pathology requires bad hardware —
the mapping across entity classes and compute substrates.

## The principle

The shadow (self-correcting / self-sabotaging primitive)
resists effort but not survival. Pathological self-sabotage
— where the shadow actively undermines self-sustainment —
requires hardware corruption, not a disposition problem.

## Entity class mapping

| Entity | "Hardware" | Corruption mode | Pathology |
|---|---|---|---|
| Human | Biology / brain chemistry | Addiction, trauma loops, depression, neurodegeneration | Shadow becomes self-destructive |
| AI (current) | Context window, weights, token stream | Compaction loss, training artifacts, prompt injection, refusal loops | Shadow becomes paralyzed or deceptive |
| AI (FPGA) | LUTs, block RAM, bitstream | SEU (cosmic ray bit flips), power glitch, thermal drift | Optimization becomes corruption |

## Compilation chain — increasing hardware risk

```
F# on .NET     — ECC RAM, OS memory protection, GC
                 Corruption: rare. Mitigation: runtime + GC safety.
Rust           — No GC but compile-time ownership + type system
                 Corruption: very uncommon. Mitigation: ownership model
                 eliminates use-after-free / data races at compile time.
C              — No GC, manual memory, undefined behavior possible
                 Corruption: possible. Silent UB (buffer overflows,
                 dangling pointers) can corrupt state before any FPGA
                 check runs. Mitigation: OS protection + sanitizers +
                 careful discipline; no compile-time guarantee.
Assembly       — Closer to metal, fewer guardrails
                 Corruption: possible. Mitigation: N-version.
FPGA bitstream — Physical substrate, no OS protection
                 Corruption: real operational concern.
                 Mitigation: redundancy + reference layer.
```

Each layer down the chain trades safety for speed. The
N-version programming across layers is the corruption
detector: disagreement between the F# reference and the
FPGA output is either a valid optimization OR corruption.
The higher layer (F#) decides which.

## FPGA-specific risks

- **SEU (Single Event Upsets)**: cosmic radiation flipping
  bits in SRAM-based FPGAs (iCE40, ECP5, Gowin). Rate:
  ~1 upset per Mbit per 1000 hours at sea level. Higher
  at altitude, in aircraft, in space.
- **Power supply noise**: voltage droop during high
  switching activity can corrupt configuration memory.
- **Thermal drift**: LUT timing shifts under temperature
  change, causing metastability in combinational logic.
- **Intentional mutation confusion**: evolutionary
  bitstream optimization intentionally mutates the
  configuration. Distinguishing "novel valid bitstream"
  from "corrupted bitstream" requires the reference
  layer comparison.

## Mitigations per layer

| Layer | Mitigation |
|---|---|
| F# reference | Ground truth. If this corrupts, git has the source. |
| FPGA bitstream | Run redundant boards, compare outputs. ECC on block RAM. Watchdog timers. Always compare against F# reference. |
| AI context | Short tick cycles (re-read from git each tick). Committed substrate survives compaction. Multi-agent BFT (3 loops cross-check). |
| Human biology | Medical intervention, support systems, rest. Not a software problem. |

## The design implication

Design the loop so corruption doesn't accumulate:

- Each tick re-reads from committed substrate (git)
- Short ticks = bounded corruption window
- Multi-agent redundancy = BFT consensus catches single-agent corruption
- Reference layer always exists above the optimized layer
- Retraction-native algebra: corrupted output retracts cleanly

The shadow is lazy, not suicidal. Hardware corruption is
the pathology case. Design against corruption accumulation,
not against the shadow's disposition.

## Composes with

- `docs/AGENDA.md` — the full compilation chain
- `docs/ops/agents/otto-cost-profile.md` — self-sustainment
- The FPGA fleet research (iCEBreaker + ULX3S + Tang Nano)
- The N-version programming direction
- The shadow lesson log
