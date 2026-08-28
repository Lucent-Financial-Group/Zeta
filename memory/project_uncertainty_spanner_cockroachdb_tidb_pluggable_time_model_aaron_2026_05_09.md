---
name: Uncertainty prior art — Spanner TrueTime, CockroachDB HLC, TiDB TSO; pluggable time-uncertainty model
description: Real DB primitives of uncertainty on datetime (Spanner intervals, CockroachDB HLC uncertainty windows, TiDB TSO). Research whether Zeta should make the time-uncertainty model pluggable like the weight semiring. Aaron 2026-05-09.
type: project
originSessionId: fb6abb97-a97f-44e9-8ed1-bbded23b73b1
---
Spanner, CockroachDB, and TiDB each implement uncertainty
as first-class on the time dimension. Research these as
prior art for B-0357 (first-class uncertainty in DBSP):

- **Spanner**: TrueTime returns [earliest, latest], commit-wait
- **CockroachDB**: HLC (Lamport + wall-clock), read uncertainty restart
- **TiDB**: centralized TSO (timestamp oracle)

Aaron 2026-05-09: "there is tidb we should research this
actually and decide if we want to support multiple and make
it pluggable."

**Why:** Lamport's logical clocks → Spanner's TrueTime →
Zeta's weight semiring. Three instantiations of "carry
uncertainty, don't pretend precision." The pluggable question:
should Zeta parameterize the time-uncertainty model the same
way B-0357 parameterizes the weight semiring?

**How to apply:** Research session comparing timestamp
strategies across Spanner/CockroachDB/TiDB/YugabyteDB.
Decide: hardcode one, or make pluggable via interface.
Add findings to B-0357 prior-art section.

Composes with: B-0357 (semiring-parameterized weight),
Lamport clock work in `src/Core/`, Reaqtor checkpoint
architecture, the distributed-consensus-expert skill.
