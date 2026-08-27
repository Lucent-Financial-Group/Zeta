# AutoMUX is usage-shaped mux and batch — not a replacement for the ferry or IScheduler

Scope: research-grade absorb of Aaron 2026-08-27. AutoMUX is a
*coinage from this conversation*, never said before. Not a library
to adopt. Internal current-state absorb, not an archive import.
Attribution: Aaron (human) framed the meta-protocol; Riven (Grok
4.6) placed it against the in-tree ferry / scheduler / envelope.
Operational status: research-grade
Non-fusion disclaimer: Shared vocabulary here does not imply merged
agency, shared identity, or personhood.

*2026-08-27. Live pointers [`docs/ROADMAP.md`](../ROADMAP.md) P1
ferry. Workitem `081M125DNKK087G0R00292E3ET`. GOVERNANCE.md §33.*

Aaron 2026-08-27:

> do you think automux is a good alternative for the ferry
> throttler plus zeta scheduler IScheduler + our protocols? i'm
> trying to make a meta protocol that can run over most / all /
> many transports and substrates but are very efficient based on
> usage, the auto batching and muxing is just transparent for the
> most part except for when you want to optimize, basically
> implementing the batch interface on either side of the ferry
> throttler producer or consumer is an optimization and no need to
> do it prematurely.

And:

> in a perfect world we would be able to have "templates" or the
> ability to reverse engineer the batch impl from the single one,
> in my original this is a manual operation but in a perfect world
> this would be mechanized with types and less than that would be
> some sort of generator and less than that would be some sort of
> JIT intelligence attention routing to impl the batch on either
> side

Coinage note: AutoMUX is **not** AutoMQ, not tmux Automux, not
AMT (RFC 7450). Compresses to Beacon: transparent multiplexing
and batching over any transport; batch is an earned specialization
of single.

## Not an alternative. A name for the composition.

Do **not** replace `FerryThrottler` or `IScheduler`. They are
different axes, and fusing them is the no-`app` needle again
(`081M10AZ6KS087G0R0000SSFMH`).

| axis | in-tree object | what it meters |
|---|---|---|
| **time / entropy door** | `IScheduler` / `SoftScheduler` / `SchedulerZeta.predict` | when; injected `Source`; DST replay |
| **occupancy / DoP / boat** | `FerryThrottler` | how many now; anti-Nagle; DoP=1→N |
| **identity / channel** | ZetaId demux + FourCorner over duplex | which row on a muxed pipe |
| **envelope** | `EventEnvelope` / CloudEvents | the same TypeSchema over any transport |

AutoMUX names the **usage-shaped** composition of mux + batch
over those axes: transparent until a side *earns* a batch
implementation. The meta-protocol is the envelope + ZetaId mux
+ optional boat, not a fourth CLI or a mediating hub (Itron
patent boundary: no appointed hub).

A library called AutoMUX that sat in front of every pipe and
brokered boats would be the hub. Peer-to-peer: each end may
mux; nobody has to.

## Batch on either side is an optimization, not a premature interface

This is already the 4-way ferry: underneath is one-at-a-time
**unless** the handler is batchable. `ProcessMany` / a batched
producer is a **specialization**. Shipping it before a measured
hot path is the premature optimization. Single is the default
and stays correct. Anti-Nagle already makes usage the timer:
a boat sails with what is queued *now*; cold traffic is one
item, hot traffic fills the cap. No Nagle wait.

Implementing batch on producer **or** consumer (either side of
the ferry) is the earned cell of the matrix. Do not require
both. Do not implement `ProcessMany` in this absorb.

## Reverse-engineer batch from single — push the derivation down

Aaron's original (manual) is a requirement, not a source to
open (clean-room). The ladder is the same push-down as
intelligence tiers:

| rung | what it is | when |
|---|---|---|
| **types** (best) | dual arity; single and batch are the same code path; the type *is* the template | always, as the interface |
| **generator** | derive the batch impl from the single (Futamura 1st projection of "map single over a boat"; stream fusion) | when types cannot emit the body |
| **JIT attention** | intelligence routes to write the batch on the hot side | last resort; each use should mint a generator so the next time is cheaper |

"Templates" here are not string templates. They are the dual
interface + a derivation. SIMD / `ProcessMany` is the hardware
and software analog of that specialization — earned, measured.

## Honesty

No AutoMUX package. No ProcessMany this slice. No look at Itron
original. Usage-based efficiency is already half-shipped as
anti-Nagle; occupancy self-predict (`SchedulerZeta` space
coordinate) is still the missing pair with time.

## Beacon

- **Nagle 1984** (RFC 896) — small-write coalescing; we refuse
  the wait (anti-Nagle / TCP_NODELAY). Usage fills the boat, a
  timer does not.
- **HTTP/2 / QUIC streams** — mux many logical channels over
  one pipe. ZetaId is the demux key, not stream-id appointment.
- **yamux / smux** — mux only, not auto-batch. Do not borrow a
  hub.
- **Gill, Launchbury, Peyton Jones** stream fusion / `build`/`fold`
  — derive a loop over many from a function on one.
- **Futamura** projections — specialize the single interpreter
  at the boat.
- **Meijer** dual interfaces — single/batch is the same shape as
  pull/push, not two products.
