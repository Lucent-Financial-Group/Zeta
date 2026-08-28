---
id: 081M0QRP9JY087G0R00146V04J
type: task
state: done
priority: P2
slug: arc-rung-b-arctransport-arcenvelope-over-the-toolkit-s-liste
title: "ARC rung B - ArcTransport + ArcEnvelope over the toolkit's listen_and_serve REST server; one real step in a real ARC-AGI-3 environment"
created: 2026-08-23T16:54:03.614Z
completed: 2026-08-28T13:32:35Z
depends_on: ["081M0QRP3XR087G0R001NCFG83"]
composes_with: []
---

# ARC rung B - ArcTransport + ArcEnvelope over the toolkit's listen_and_serve REST server; one real step in a real ARC-AGI-3 environment

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M0QRP9JY087G0R00146V04J-*.md` glob. -->

**Register: `implemented`.** Design: `docs/design/2026-08-23-arc-agi-3-integration-design-chip8-chip9-atari-and-the-arena.md` §3.

The ARC-AGI Toolkit (`arc-agi`, MIT) ships `Arcade.listen_and_serve` — a blocking Flask server
exposing the toolkit's REST API, documented as existing _to allow local execution for interactions
with languages other than Python_. That is the topology; subprocess-driving and protocol
reimplementation are both rejected in §3.1 with reasons.

Do: `src/Arc.Python/` as its OWN uv project (`pyproject.toml` + `uv.lock`), never a dependency added
to `zeta-core` — `zeta-core` pins `requires-python = ">=3.14"` and `arcengine` documents >=3.12, so a
resolver failure must not be able to reach `uv sync --project src/Core.Python` on the gate. Then a
thin `ArcTransport` (versioned, replaceable) and an `ArcEnvelope` that is OURS and is TEXT
(64x64 palette indices as hex-in-JSON, per no-binary-in-proof-lineage).

**Constraints, all three required:** no gate job may depend on this lane (`workflow_dispatch` only);
nothing in `lint-clone-at-tag-is-sufficient.ts`'s `BOOTSTRAP_SURFACES` may reference it; the lane must
run with NO credential (anonymous key, or `OFFLINE` mode) and only widen when
`op://Lucent/ARCPrize API Key/credential` is present.

**Known unverified:** whether `arc-agi` installs under Python 3.14 at all. The separate-project
constraint exists because that was not checked.

## Evidence

- `src/Arc.Python/zeta_arc/rest.py` owns the versioned text `ArcEnvelope`, the injected
  `ArcTransport` protocol, typed refusal outcomes, the required scorecard lifecycle, and the thin
  standard-library HTTP adapter. No `arc_agi`, Flask, pydantic, or arcengine type crosses that client
  boundary.
- The envelope validates every rendered frame as 64x64 palette indices in 0..15 and preserves the
  complete rendered-frame list as deterministic lowercase hex-in-JSON. Invalid actions, transport
  failures, HTTP refusals, invalid UTF-8, invalid JSON, and schema drift return typed feedback.
- `src/Arc.Python/environment_files/ztch/v1` is the only committed discovery entry under the
  otherwise ignored environment cache. It loads the source-owned deterministic `ZetaChase`; vendor
  downloads remain untracked.
- `src/Arc.Python/tests/test_rest.py` starts the toolkit's real `Arcade.listen_and_serve` in OFFLINE
  mode, opens a scorecard, resets the versioned `ztch-v1` environment, submits `ACTION4`, and proves
  from the returned 64x64 frame that the agent moved from x=8 to x=16. No credential or external
  network is used.
- Measured locally: 9 focused REST tests and all 138 ARC tests pass from the repository root,
  including discovery after changing to an unrelated working directory; the repository Python lint
  gate passes Ruff, formatting, and mypy for both Python projects; quick preflight passes all 15 checks;
  the Release build passes. The complete solution passed in both an isolated/serial diagnostic run
  and one parallel run; separate native host faults are preserved under workitem
  `081KYYQ831108QG0R001FJJ9XK` rather than attributed to this Python lane.

## Honest boundary

This rung owns the service boundary and proves one real local REST step. It does not claim hosted
leaderboard access, run ARC's private environments, or introduce rung C's generic cross-emulator
`IEnvironment` interface. The installed toolkit also requires the versioned `ztch-v1` identity on
subsequent cached steps; using only the base `ztch` name resolves reset but does not retrieve that
cached instance, so the integration pins the full identifier.
