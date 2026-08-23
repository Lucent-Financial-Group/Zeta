# ARC-AGI-3 integration — design for the CHIP-8/9 arena, the Atari lane, and Lior's screen

**Date:** 2026-08-23 · **From:** the shadow (Otto's shadow-work role) · **For:** Aaron → Lior
**Register:** **`proposed`** as a whole. Nothing in this document runs. Every claim about the
in-repo tree was checked in a clone at `6b3b739d2e5ead7cc9f431e48b13b6a1217404e7` (`origin/main`,
2026-08-23T16:43Z); every claim about ARC-AGI-3 was checked against `docs.arcprize.org`, the
`arcprize/ARC-AGI` and `arcprize/ARCEngine` repositories, and the ARC-AGI-3 technical report on
the dates given. Where I did not check something, I say so.

> **Design doc, not implementation.** No code changed. The deliverable is this file plus the
> work-items in §11, each of which ships alone.

**Versions designed against — these will move.** ARC-AGI Toolkit (`arc-agi`) **0.9.3**
(2026-03-09; initial release 0.9.1, 2026-01-29); `arcengine` **0.9.3**. Pre-1.0, three releases
in six weeks, with a recently-fixed _"404 Scorecard not found about 50% of the time when in
ONLINE mode"_. Treat every API name below as a fact with an expiry date.

---

## 0. The four answers, on one page

**1. Does the universal controller grammar exist?** **Yes — as three real F# types, not as prose**
(`src/Core/ActionGrammar.fs`, `src/Core/ControlScheme.fs`, `src/Core/GridBinding.fs`). And **no —
ARC's action space does not embed in it.** `ActionGrammar.Action` is a 16-bit held-key set over a
4×4 grid; ARC-AGI-3's `GameAction` is `RESET` + `ACTION1..ACTION7`, of which **`ACTION6` carries
`{x, y}` over a 64×64 field** — 4096 points that no 16-cell alphabet contains. The honest object
is **`ControlScheme`, which already models exactly this**: a scheme is a _total map from a
device's inputs into the grammar_, and `translate` returns `Action option` — `None` for unmapped,
"honest; never invented" in its own docstring. ARC is a **device with a continuous member**, and
the grammar needs one new constructor (`Point of x:int * y:int`) to hold it. §2.

**2. Which topology does the language boundary force?** **The vendor already shipped the answer:
`listen_and_serve` starts a blocking Flask server exposing the toolkit's REST API, documented as
existing "to allow local execution for interactions with languages other than Python."** Python
serves; our TypeScript/F# agent connects over HTTP. MIT-licensed, and `OFFLINE` mode needs no API
key. The `clone-at-tag` question survives but is **not blocking**: the repo already carries
`src/Core.Python/` with `pyproject.toml` + `uv.lock`, synced in the gate by
`uv sync --project src/Core.Python`. The constraint is therefore **placement**, not permission —
a _separate_ uv project so a resolver failure cannot reach the floor. §3.

**3. Which of the five axes do we already measure?** Honestly: **one and a half of five.**
Exploration — no meter. Percept→plan→action — the loop exists end to end and is the arena's whole
body; unmetered. Memory — **this is the strong one**, `db/emus/chip8/orbits/` is measured (μ,λ)
structure recovered from trajectory, and `Chip8CrossRunStore` is a real cross-run memory with
integrity refusal. Goal acquisition — **nothing**; the largest gap in the substrate and the most
valuable line in this document. Alignment — nothing _measured_, but §8 argues the glow is a
genuine candidate readout. §4.

**4. Does Chollet's denominator claim survive the entailment check?** **Partly, and the failure is
specific and worth having.** Chollet's denominator is `P + E` — **priors plus experience, in bits,
normalised by the Kolmogorov complexity of the solution**. Time is _not_ in the formula; §II.2.2
of the paper names "time efficiency" as one of four **alternative** efficiency axes, gives it no
formula, and explicitly invites others to build one. So _"skill-acquisition efficiency IS the
ΔU-per-available-time denominator"_ is **not entailed**. What _is_ entailed is the shape, and a
sharper result than the claim: **ARC-AGI-3's own scorer uses neither bits nor time — it uses
agent action count**, `S = min(1, h/a)²` against a human baseline. Actions sit between bits and
time and are closer to Chollet's `E` than either, because in a turn-based environment **one
action is exactly one delivery of new information**. §5.

---

## 1. Inventory — real / built-but-unconnected / absent / proposed

Format borrowed from `docs/handoffs/2026-08-23-shadow-to-lior-chip8-arena-deploy-truth-and-the-soft-regime-wiring-ladder.md` §B3, deliberately.

| piece                                    | path                                                                                                              | register                           | bearing on ARC                                                                                                                                    |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| action alphabet + Boolean lattice        | `src/Core/ActionGrammar.fs` (109 ln)                                                                              | **built (F#)**                     | the 4×4 alphabet; its own docstring peels "universal" to _"concrete for CHIP-8"_                                                                  |
| device→grammar mapping, ZetaId-addressed | `src/Core/ControlScheme.fs` (79 ln)                                                                               | **built (F#)**                     | **the correct embedding site for an ARC scheme**                                                                                                  |
| homoiconic 4×4 relabelling               | `src/Core/GridBinding.fs` (76 ln)                                                                                 | **built (F#)**                     | how a >16 action set is paged onto the pad via salience                                                                                           |
| CHIP-8 core + COW oracle                 | `src/Core/Chip8.fs`, `Chip8Cow.fs`                                                                                | **built (F#)**                     | the transition oracle                                                                                                                             |
| CHIP-9                                   | `Chip8Cow.fs` + `src/Core.CSharp/Chip9Machine.cs` + `src/Core.TypeScript/chip9/chip9.ts` + `src/Core.Rust.Chip9/` | **built, 4-language locked**       | **CHIP-9 is real, not aspirational** — exactly one added opcode (`Fn01` plane select)                                                             |
| CHIP-9 golden vectors                    | `src/Core.TypeScript/chip9/golden-vectors.lines`                                                                  | **built**                          | the treaty any new conformer must reproduce                                                                                                       |
| committed orbits                         | `db/emus/chip8/orbits/*.orbit.json` (5)                                                                           | **real data, unrendered**          | the memory axis' evidence                                                                                                                         |
| orbit reader (browser-safe)              | `src/Core.TypeScript/chip9/chip8-cross-run-store.ts`                                                              | **built**                          | `parseArtifact` recomputes `bodyDigest` and refuses a mismatch                                                                                    |
| bridge-transfer instrument               | `src/Core.TypeScript/bridge-transfer/`                                                                            | **metered**                        | the lesson-transfer matrix; 11 tests, 78,149 assertions                                                                                           |
| BNN key predictor                        | `src/Core.TypeScript/bayesian/bnn-key-predictor.ts`                                                               | **live, deterministic, off-clock** | produces the glow; `Math.random` is gone (fixed since the handoff), but its LCG is seeded at a hardcoded `12345`, not from `COMMON_SEED` — see §8 |
| Student-t EP                             | `src/Core.TypeScript/planning/student-t-bnn.ts`                                                                   | **built + tested**                 | what makes the distribution real                                                                                                                  |
| soft snap (TS)                           | `src/Core.TypeScript/soft-value/soft-value.ts`                                                                    | **built, tiny**                    | `resolve` = argmax iff confidence ≥ num/den, else `null`                                                                                          |
| `predictBranches`                        | `src/Core/Vision.fs:288`                                                                                          | **built, F#-only**                 | `SpaceBytes`/`TimeTicks` budgeting; **no Fable, no WASM export — I checked**                                                                      |
| phase clock                              | `src/Core.TypeScript/observe/phase-clock.ts`                                                                      | **built**                          | `COMMON_SEED = 4`; the only legitimate ordering                                                                                                   |
| ΔU ledger + `measure` verb               | `db/uncertainty/`, `src/Core.TypeScript/ledger/measure.ts`                                                        | **built, ORDINAL**                 | **records a ΔU _sign_ + witness, never a number** — see §5.3                                                                                      |
| ΔU aggregation theorem                   | `src/Core/SocietyUsefulWork.fs`                                                                                   | **metered as mathematics**         | additive under correlation ρ; the property ARC's squaring breaks (§6)                                                                             |
| traveler ranking                         | `src/Core/TravelerRankLedger.fs`                                                                                  | **built**                          | TrueSkill-style EP; not an ARC axis but the anti-whitewash floor                                                                                  |
| Python surface                           | `src/Core.Python/` (`pyproject.toml`, `uv.lock`, `requires-python = ">=3.14"`)                                    | **built, in the gate**             | the precedent that makes §3 cheap                                                                                                                 |
| ARC-AGI-**1/2** solver                   | `src/Core.TypeScript/arc-solver/` + `.github/workflows/arc-swarm-fanout.yml`                                      | **built, different benchmark**     | static grid puzzles from `data/ARC-AGI`; **not** ARC-AGI-3                                                                                        |
| the arena page                           | `src/apps/twitch-ai/` → `/Zeta/twitch-ai/`                                                                        | **live**                           | rung 3 of 6                                                                                                                                       |
| ARC-AGI-3 bridge                         | —                                                                                                                 | **ABSENT**                         | this document                                                                                                                                     |
| an Atari emulator                        | —                                                                                                                 | **ABSENT**                         | nothing in the tree emulates a 6507                                                                                                               |
| a goal-acquisition meter                 | —                                                                                                                 | **ABSENT**                         | §4                                                                                                                                                |

**Two things the inventory corrects.** `docs/DECISIONS/2026-04-27-uv-canonical-python-tool-manager.md`
says _"Does NOT decide whether Zeta itself ships Python code (it does not; F# / C# / TS)"_ — that
sentence is **stale**: 46 `.py` files ship, including a gated `src/Core.Python` test lane. And the
existing `arc-solver` is for **ARC-AGI-1/2**, a static grid benchmark; reusing its name for this
work would collide.

---

## 2. The universal controller grammar — exhibited, and where it breaks

### 2.1 It exists as a type

`ActionGrammar` (Aaron 2026-06-08) makes the 16-key hex keypad a **4×4 grid = a finite action
alphabet**, with:

- **alphabet** — `Action = bool[]` of length 16, `single k`, geometry `ofGrid`/`toGrid` (row-major);
- **algebra** — held-key sets form the **Boolean lattice** `2^16`: `bottom`, `top`, `join`, `meet`,
  `complement`, `leq`, `weight`;
- **grammar** — `Word = Action list`, action sequences over time = strings over the alphabet.

It also carries its own peel, which this document takes at face value rather than softening:

> _"'universal' is concrete **for CHIP-8** (all CHIP-8 controls live in these 16). A cross-domain
> universal action grammar … is the **aspiration, not proven here**."_

`ControlScheme` (Aaron 2026-06-11) is the piece that makes it cross-device rather than
cross-domain, and it is the one that matters here. Its law, verbatim from the file:

> _"the GRAMMAR owns the action set (the canonical things a citizen can MEAN …); a SCHEME is a
> total mapping from one device's physical inputs INTO that set — never past it."_

Three schemes ship (`chip9Pad`, `keyboardWasd`, `gamepadStandard`), each ZetaId-addressed via
`GeneratorRegistry.idOf`, and `translate : Scheme -> string -> Action option` returns `None` for
unmapped inputs. **The `option` is the honesty mechanism** and it is already there.

### 2.2 The ARC action space, checked

From `arcprize/ARCEngine` and the ARC-AGI-3 technical report:

| ARC action          | kind                | payload                                     |
| ------------------- | ------------------- | ------------------------------------------- |
| `RESET` (id 0)      | simple              | —                                           |
| `ACTION1`–`ACTION5` | `SimpleAction`      | — (conventionally up/down/left/right/space) |
| **`ACTION6`**       | **`ComplexAction`** | **`{"x": 0..63, "y": 0..63}`** — a click    |
| `ACTION7`           | `SimpleAction`      | — (conventionally undo)                     |

Observation: a **64×64 frame, 16 colours** (palette indices; negative renders transparent).

### 2.3 The arity check — and why it fails as an identification

It is tempting to note that ARC has 8 named actions and the pad has 16 cells, so "it fits". Per
`.claude/rules/numerology-vs-number-theory.md`, **a matching count is not an identification**, and
here the count does not even match once `ACTION6` is expanded:

| space                     | cardinality of one action       | structure                                          |
| ------------------------- | ------------------------------- | -------------------------------------------------- |
| CHIP-8 keypad             | `2^16 = 65,536` (held-key sets) | Boolean lattice, finite, **discrete**              |
| ARC-AGI-3                 | `7 + 4096 = 4103`               | 7 atoms **+ a 64×64 coordinate field**, no lattice |
| Atari 2600 (ALE full set) | 18                              | 9 joystick positions × fire, **discrete**          |

Atari's 18 _does_ embed in the 16-cell pad only if you page it (`GridBinding` exists precisely for
that), and it embeds _cleanly_ in `ControlScheme.Action` with no new constructor. **ARC does not.**
`ACTION6` is a _coordinate_, and a coordinate is not a button — it is a point in the observation
space used as an action. Squeezing 4096 points into a 16-cell lattice would be the same error as
forcing the BNNs onto `WeightedSet`.

### 2.4 The proposal: one new constructor, three schemes, and a named non-embedding

**`proposed`.** Extend `ControlScheme.Action` by exactly one case:

```fsharp
| Point of x: int * y: int   // a coordinate-valued action (ARC ACTION6, mouse click, touch)
```

and add three schemes: `arcAgi3` (RESET/ACTION1..7 → Go/Select/Back/Conference/Point),
`atari2600` (the 18 ALE actions → Go + Select), and leave `chip9Pad` untouched. Then state the
shared object plainly, because this is the sentence Aaron asked for:

> **The shared object is `ControlScheme.Action` — a small set of canonical _meanings_ — not the
> 4×4 grid.** The grid is CHIP-8's _device_, and it is one scheme among several. Two of the three
> environments (CHIP-8/9, Atari) are **finite discrete** and embed into the 16-cell lattice; ARC
> does not, because it has a **continuous-in-shape** member. So: **one grammar of meanings, three
> device schemes, and one honest non-embedding recorded rather than papered over.**

The falsifier that keeps this from being decoration: `translate` must return `None` for every ARC
input the grammar cannot hold, and a test must assert that a `Point` never round-trips through a
16-cell binding without loss. A grammar that accepts everything is the vacuity class.

**Register:** `proposed`. Nothing in the tree implements `Point` today.

---

## 3. The language boundary — the topology, and where the lane lives

### 3.1 The vendor shipped the bridge

`Arcade.listen_and_serve` (toolkit 0.9.2) _"starts a blocking Flask server that exposes the REST
API"_ using `arc_agi.server.create_app()`, documented as conforming to the REST API _"to allow
local execution for interactions with languages other than Python or with the Toolkit running in
ONLINE mode."_ Operation modes are `NORMAL` (local + API), `ONLINE` (API only), `OFFLINE`
(local only), and `COMPETITION` (strict, leaderboard-verifiable). Licence: **MIT**, on both
`arcprize/ARC-AGI` and `arcprize/ARCEngine`.

That collapses the three candidate topologies to one, with the other two named for the record:

| topology                                                | verdict                                                                                                                                                                                                                   |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Python serves, our agent connects over the REST API** | **CHOSEN.** Vendor-supported, purpose-built for exactly this, no subprocess lifecycle, no protocol reverse-engineering, and it works identically for the browser (`fetch`), `bun`, and .NET.                              |
| our agent drives Python as a subprocess                 | rejected — reintroduces process lifecycle, stdio framing and a Python-shaped call stack for no gain now that a server exists                                                                                              |
| reimplement the protocol                                | **not off the table** (MIT, and `OFFLINE` mode proves the engine is local) but **not now**: it buys nothing until we want to _run their games without their runtime_, and it forfeits conformance to a moving pre-1.0 API |

**Consequence for the browser.** The arena is a Vite app on GitHub Pages, which is _static_. It
cannot reach `localhost:8080` from a visitor's machine, and per §B4 of the Lior handoff the page
must stay self-contained. So the split is:

- **Local dev / research lane** — the browser (or `bun`) talks to a locally-running
  `listen_and_serve`. Real interaction, one machine, no deploy.
- **Published arena** — replays a **recorded** ARC session from a committed JSON artifact, exactly
  the shape of orbit rung 1. No network, no key, no third-party request. `toy`/`proposed`.

That second bullet is not a compromise; it is the same pattern that already makes the orbits
drawable with no runtime, and it keeps the most visible surface we have honest and offline.

### 3.2 `clone-at-tag` — checked, and it is a placement question

`.claude/rules/clone-at-tag-stays-sufficient.md` requires a repo to stay _"buildable and checkable
from `git clone` at a pinned tag, with no package manager present."_ Its enforcer,
`src/Core.TypeScript/hygiene/lint-clone-at-tag-is-sufficient.ts`, only refuses **`ace` as a
resolver** in `BOOTSTRAP_SURFACES` (`tools/setup`, `.github/workflows`, the build props,
`global.json`, `flake.nix`, `.cursor`). A Python dependency does **not** trip that lint — so the
lint is not the authority here; the rule's sentence is.

Against the sentence, the finding is that **the precedent is already set and is compliant**:

- `.mise.toml` pins `python = "3.14.6"` and `uv = "0.11.21"`.
- `src/Core.Python/` ships `pyproject.toml` + `uv.lock`; `gate.yml` runs
  `uv sync --project src/Core.Python` and `uv run --project src/Core.Python pytest`.
- `docs/DECISIONS/2026-04-27-uv-canonical-python-tool-manager.md`: **no `pip install` in CI, no
  `actions/setup-python`** — everything through uv, pinned.

So Python is not new. **The blocking finding would be putting `arc-agi` on the floor**, and the
design routes around it with three constraints:

1. **Its own uv project** — `src/Arc.Python/pyproject.toml` + `uv.lock`, _not_ a dependency added
   to `zeta-core`. `zeta-core` declares `requires-python = ">=3.14"`; `arcengine` documents
   **Python ≥ 3.12**, and a package first released 2026-01-29 may have no 3.14 wheels. **A
   resolution failure in the ARC lane must not be able to break `uv sync --project src/Core.Python`,
   and separate projects is the only structural way to guarantee that.**
2. **No gate job depends on it.** The ARC lane is `workflow_dispatch` (+ optional cron), never a
   required check. `main`'s gate is green and this must not touch it.
3. **Nothing in `BOOTSTRAP_SURFACES` references it.** `tools/setup/install.sh` provisions the
   toolchain; the ARC lane provisions itself, on demand, in its own directory.

Under those three, a fresh clone at a tag with no network still builds and checks everything the
floor covers, and the ARC lane is an **optional capability** — which is exactly the exit property
the rule is about.

### 3.3 Wire contract — the one piece worth designing before anyone codes

A `listen_and_serve` REST client written straight against the toolkit's routes will break when the
toolkit moves (three releases in six weeks). So the design puts **one seam** in:

```
ARC REST  ──►  ArcTransport (thin, versioned, replaceable)  ──►  ArcEnvelope (ours)
                                                                    │
                            ┌───────────────────────────────────────┼──────────────────────┐
                            ▼                                       ▼                      ▼
                    ControlScheme.arcAgi3                    frame → 64×64×16          scorecard
                    (actions out)                            (percept in)              (their meter)
```

`ArcEnvelope` is ours and is **text**, per `.claude/rules/no-binary-in-proof-lineage.md`: a frame
is 64×64 palette indices, which is 4096 small integers — hex-in-JSON, diffable, DST-replayable,
and directly comparable to the CHIP-8 frame shape (64×32 bits) the arena already ships. A recorded
session is then a golden vector by construction, and §3.1's "published arena replays a recording"
falls out for free.

**Register:** `proposed`. `ArcTransport` and `ArcEnvelope` do not exist.

---

## 4. The five axes vs what we already measure

Two decompositions are in circulation and they differ; both are reported rather than merged.

- **The toolkit/site five:** exploration · percept→plan→action · memory · goal acquisition ·
  alignment.
- **The technical report's four functional components:** exploration · modeling · goal-setting ·
  planning/execution. **"Memory" and "alignment" are not in the report's four.**

Where they disagree I map the five, since that is what Aaron carried, and flag the discrepancy.

| ARC axis                    | in-repo counterpart                                                                                                                                                              | register                                    | honest verdict                                                                                                                                                                                                                                                                                                                                                            |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Exploration**             | `Vision.predictBranches` budgets `FutureBranch` by `SpaceBytes`/`TimeTicks` and reports `Boarded`/`Deferred`/`Starved`; `ActionGrammar` supplies the alphabet to explore over    | **built (F#), unreachable from TS/browser** | **no meter.** Nothing counts _how much of the reachable space was visited per action_. `Starved` is the closest existing signal and it measures _budget_, not _coverage_.                                                                                                                                                                                                 |
| **Percept → plan → action** | the whole arena: `Chip8Cow.step` → `BnnSocietyPredictor.predict` → `SoftValue.resolve` → key press                                                                               | **live end to end**                         | **built, unmetered.** It runs at ~30fps in production today; nothing scores it.                                                                                                                                                                                                                                                                                           |
| **Memory**                  | `db/emus/chip8/orbits/*.orbit.json` (five, all `verdict: "closed"`, (μ,λ) by Brent 1980); `Chip8CrossRunStore` with digest refusal; `Chip8ConsultCensus` post-selection detector | **real, measured data**                     | **the strongest axis by far.** This is genuine cross-run memory whose _content_ is structure recovered from trajectory. Beacon wording (per `db/emus/chip8/orbits/README.md`): memoization of a deterministic transition function over a finite state space (Michie 1968), eventual periodicity by pigeonhole.                                                            |
| **Goal acquisition**        | —                                                                                                                                                                                | **ABSENT**                                  | **the biggest gap, and the most valuable line in this document.** Every objective in the tree is _supplied_: `measure.ts` takes a work-item, `predictBranches` takes branches, the BNN predicts a _key_ not a _reason_. There is **no mechanism anywhere that forms a goal from an unlabelled environment.** ARC's whole premise is that the goal is not given. See §4.1. |
| **Alignment**               | `SoftValue.snap` returning `None` (refusal to commit) is a real _legibility_ primitive; the glow is a real pre-commitment display                                                | **built primitives, no meter**              | nothing _scores_ alignment. §8 proposes the first candidate and labels it `toy`.                                                                                                                                                                                                                                                                                          |

### 4.1 Goal acquisition — naming the gap precisely, because a vague gap is not a finding

The substrate has three things that _look_ like goal machinery and are not:

- **`db/uncertainty/` + `measure.ts`** — prices a reduction _after_ someone names the work-item.
  The key must already resolve to a file; an unresolvable key is refused. **The goal is an input.**
- **`Vision.predictBranches`** — budgets a _given_ list of `FutureBranch`. It does not generate
  branches, and `UncertaintyResolutionBits` is a field the caller fills in.
- **`SocietyUsefulWork.fs`** — aggregates ΔU across agents. Aggregation presupposes measurement,
  which presupposes a goal.

The closest genuine candidate in the tree is **empowerment** — `ActionGrammar`'s own docstring
names it: _"empowerment (Klyubin–Polani) measures it exactly — empowerment is the channel capacity
from **actions → future states**"_ — and `src/Core/CoEmpowerField.fs` / `CoEmpowerGraph.fs`
implement a co-empowerment dynamic, explicitly as a **`toy` model of society emergence**, over
agent identities on a graph, **not over an emulator's state space**. So the anchor is right and
the instance is missing.

**That is the design statement:** an empowerment-maximising goal-former over the CHIP-8 state
space is the one piece that would give us an ARC axis we currently have zero of, it has a named
human anchor already cited in our own source, and **nothing in the tree computes it over a game.**
Work-item in §11.

---

## 5. The Chollet entailment check

Per `.claude/rules/anchor-to-human-prior-art.md` an anchor must be _checked to entail the claim_.
I downloaded arXiv:1911.01547 and read §II.2 rather than citing it.

### 5.1 What the paper actually says

Chollet's informal definition:

> _"The intelligence of a system is a measure of its skill-acquisition efficiency over a scope of
> tasks, with respect to priors, experience, and generalization difficulty."_

The formal one (sufficient case), transcribed from the PDF:

```
I^θT          = Avg    [ ω_T · θ_T ·  Σ        P_C ·  GD^θT_{IS,T,C} / ( P^θT_{IS,T} + E^θT_{IS,T,C} ) ]
 IS,scope       T∈scope           C∈Cur_T^θT
```

with, in the paper's own words:

- **`GD`** — _"the amount of uncertainty about the shortest evaluation-time solution given that you
  have at your disposal both the initial system and the shortest training-time solution"_,
  normalised by `H(Sol^θ_T)` and therefore in `[0,1]`;
- **`P`** — priors: the fraction of `H(Sol^θ_T)` explained by the initial system;
- **`E`** — experience: _"the amount of relevant information received by the system about the task
  over the course of a curriculum, only accounting for **novel** information at each step"_, also
  normalised by `H(Sol^θ_T)`;
- and the schematic form Chollet gives himself:
  `Expectation[ skill · generalization / (priors + experience) ]`.

### 5.2 The verdict, in three parts

**(a) The shape is entailed. The denominator is not.** Chollet's denominator is `P + E`, in bits.
"Available time" appears nowhere in the formula. §II.2.2 is explicit that the paper considered
**only information-efficiency**, and lists _computation efficiency, **time efficiency**, energy
efficiency, and risk efficiency_ as **alternatives** that _"could be incorporated into our
definition in various ways (e.g. as a regularization term)"_, closing with an invitation: _"we
bring them to the reader's attention to encourage others to develop new formal definitions of
intelligence incorporating them."_ **A named open invitation is the opposite of an entailment.**
So `ΔU / available-time` is **Chollet-shaped and Chollet-adjacent, and is not Chollet's measure.**

**(b) The specific omission is the one the paper exists to prevent.** From the abstract: _"unlimited
priors or unlimited training data allow experimenters to 'buy' arbitrary levels of skills for a
system, in a way that masks the system's own generalization power."_ A time-only denominator
**omits `P` entirely** — so a system with enormous priors and near-zero elapsed time scores as
maximally intelligent. That is precisely the failure mode `P + E` was constructed to close. Any
ΔU/time meter must either measure priors separately or state, out loud, that it cannot compare
systems with different priors.

**(c) The numerator is closer than the denominator, and that is worth keeping.** `GD` is defined
as _an amount of uncertainty_ in bits. Our ΔU is _a reduction of uncertainty_. The bridge — set the
achieved skill θ to the fraction of `GD` actually resolved, so that `θ · GD ≈` uncertainty
actually removed — is legitimate arithmetic, but it is **our construction, not Chollet's theorem**,
and it should be labelled that way wherever it is used.

**(d) Both sides are uncomputable as written.** `H(·)` is Kolmogorov complexity. Chollet knows
this and says the objective must be _"a computable **approximation** of our quantitative
intelligence formula."_ So a proxy denominator is _required_, not a shortcut — the only question is
which proxy, and that is the useful reframing of Aaron's claim.

### 5.3 The in-repo consequence that outranks all of the above

**Our ΔU is ordinal, not cardinal — so `ΔU / anything` does not currently typecheck as a number.**
`src/Core.TypeScript/ledger/measure.ts`, verbatim:

> _"THE REGISTER IS ORDINAL, NOT CARDINAL. The ledger records a ΔU **sign** plus a **witness**,
> never an invented number. There is no metering discipline in the repo that could produce a
> cardinal price for a bug-fix … a cardinal ΔU must be EARNED by a metering discipline later."_

You cannot divide a sign by a duration. So **the ΔU-per-available-time denominator is not merely
under-anchored — it has no numerator yet.** And this is where ARC becomes genuinely useful to us
rather than the other way round: **ARC-AGI-3 supplies the missing cardinal**. A level score is a
real number in `[0,1]`, produced by a decorrelated external oracle, over an environment whose
solution nobody here designed. That is the strongest available candidate for the _first_ cardinal
ΔU the repo has ever had — and per `toy-is-free-metered-must-be-earned.md`, earning it is exactly
what would let `ΔU` shed a register.

---

## 6. Their scorer vs our ΔU — agree, disagree, or orthogonal?

From the ARC-AGI-3 technical report:

```
level:        S_{l,e} = min(1.0,  h_{l,e} / a_{l,e})²        h = SECOND-BEST human action count
                                                             a = AI action count
environment:  E_e     = Σ_{l=1..n} l · S_{l,e}  /  [ n(n+1)/2 ]     (linear weight by level index)
total:        T       = mean of E_e over the dataset
```

Standing gap (March 2026): **humans 100%, frontier AI 0.00%–0.37%.** Human median attempt 7.4
minutes, 10 participants per environment, no instructions. Composition: 25 public demo, 55
semi-private, 55 fully private environments.

**Answer: partly agreeing, and divergent in exactly two places — both of which are informative.**

| property            | ARC's scorer                 | our ΔU / `SocietyUsefulWork` | reading                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------- | ---------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| denominator         | **agent action count**       | proposed: available time     | **agreeing in spirit, and ARC's choice is better.** In a turn-based environment one action is one delivery of new information, so `a` is a direct proxy for Chollet's `E` in a way wall-time is not. **Recommendation: adopt action count as the denominator for the ARC lane and keep time as a second, separately reported axis.**                                                       |
| baseline            | second-best human, per level | none                         | ARC's efficiency is **relative**; ours is absolute. A ratio against a human baseline is a _different quantity_ from a ΔU, and mixing them silently would be a units error of the kind `culture-invariant-by-default.md` exists to prevent.                                                                                                                                                 |
| **convexity**       | **squared**                  | **linear/additive**          | **the real divergence.** `SocietyUsefulWork`'s aggregation theorem is stated over _additive_ ΔU under pairwise correlation ρ. Squaring is not additive: `(x+y)² ≠ x² + y²`. **So a squared score cannot be fed to our aggregation theorem without breaking its hypothesis.** Keep the raw efficiency `h/a` as the ΔU-carrying quantity and treat `S = (h/a)²` as their presentation of it. |
| **level weighting** | linear in level index        | none                         | leaderboard design, not measurement theory. It rewards depth and, with the squaring, makes _"scrape partial credit across many shallow levels"_ a losing strategy.                                                                                                                                                                                                                         |

**A strategy that scores well on one and badly on the other, concretely** — since a documented
divergence is the point. An agent that reliably reaches level 1 of every environment in near-human
action counts and never gets further scores near-zero on ARC (index weighting kills it) while
banking a large, honest, additive ΔU on ours. Conversely an agent that burns 100× the human
actions but _completes_ the last level of one environment scores `0.01` weighted heavily on ARC
and, on ours, records a large uncertainty reduction at enormous cost. **Neither meter is wrong;
they price different goods** — ARC prices _depth at human-comparable efficiency_, we price
_uncertainty removed_. Report both, never blend them into one number.

**Register:** ARC's formulas are `built` (theirs, and specified). Every claim about how they
compose with `SocietyUsefulWork` is `proposed` — I did not run either.

---

## 7. CHIP-9, Atari, and making the third environment cheap

### 7.1 CHIP-9 exists; the ladder's second rung does not

`docs/research/2026-08-19-the-first-rung-is-a-conservative-extension-and-the-second-is-not-a-morphism-at-all.md`
(work-item `081M0DXG800087G0R0028KCZP1`) already **measured** the CHIP-8 → CHIP-9 link. Its
headline, which this design is obliged to respect rather than re-derive:

> **Rung 1 is a conservative extension. Rung 2 is not a morphism of any kind.**

CHIP-9 is CHIP-8 plus exactly one opcode (`Fn01` plane select, John Earnest's XO-CHIP widened from
2 planes to 3), and the inclusion `ι : S₈ → S₉` is a checked functional bisimulation — 11 tests,
78,149 assertions, with a **clean control diagonal** (4/16 control cells fail, one falsifier per
lesson). But there is **no inclusion CHIP-9 → Atari 2600**: different CPU (6507), memory model and
display, no shared instruction set. And the same document records that the transfer instrument
measured the _narrowest_ of three in-repo meanings of "lesson" — a ROM plus trace assertions —
whereas **ARC tests the recognizer meaning, which has no implementation.**

**Design consequence, stated so nobody re-runs a settled experiment:** ARC-AGI-3 is **not** rung 4
of that ladder. The ladder equivocates on both "morphism" and "lesson"; ARC is a _different kind of
target_ reached by a _different claim_ — hold the method fixed and measure acquisition cost on a
new environment, which is Chollet's frame and **needs no morphism at all**. That is the honest and
much cheaper framing, and it is the one this design adopts.

### 7.2 Making the third environment cheap — the actual test of the abstraction

The brief's criterion: _if adding Atari later means rewriting the ARC bridge, the abstraction is in
the wrong place._ Applying it:

```
        ┌────────────────────────────────────────────────┐
        │  agent  (BNN society, SoftValue.resolve, orbit) │
        └───────────────┬────────────────────────────────┘
                        │  ControlScheme.Action   (meanings)
        ┌───────────────┴────────────────────────────────┐
        │  IEnvironment:  reset · step · frame · info     │   ← the seam
        └──┬───────────────┬──────────────────┬──────────┘
           │               │                  │
      Chip8Adapter    ArcRestAdapter     AtariAdapter (absent)
      (in-proc)       (listen_and_serve)  (would be a 6507 emulator)
```

The seam is `IEnvironment` + `ControlScheme`, **not** the ARC REST client. Adding Atari then costs
one adapter and one scheme, and touches no ARC code. Three properties make this checkable rather
than aspirational:

1. **`ControlScheme` already has the right signature** (`translate : Scheme -> string -> Action option`)
   and is already ZetaId-addressed, so a cartridge/environment can name its scheme by id.
2. **The frame type must be the union's shape, chosen once**: CHIP-8 is 64×32×1bit, ARC is
   64×64×4bit. A `Frame = { W:int; H:int; Palette:int; Cells: byte[] }` covers both and Atari's
   160×192; committing to `bool[2048]` would force the rewrite the criterion warns about.
3. **The falsifier**: the same agent code must drive `Chip8Adapter` and `ArcRestAdapter` with only
   a scheme id changed. If it cannot, the seam is in the wrong place and the design is wrong — say
   so then, do not move the seam quietly.

### 7.3 Atari, honestly

Nothing in the tree emulates a 6507. `db/emus/chip8/capabilities.lines` is the existing capability
ledger and the right place to record what a new target does and does not have. Two prior
constraints carry forward unchanged: the **ROM safety rule** (commit only public-domain / explicitly
licensed / homebrew / synthetic ROMs; hashes and metadata only for anything else — from the
2026-05-07 packet), and the corrected transfer anchors — **Parisotto, Ba & Salakhutdinov (2016,
_Actor-Mimic_)** and **Rusu et al. (2016)** document negative transfer _between Atari games_, not
Bellemare et al. 2013, which is a platform paper. Negative transfer between games sharing a console
is a sharper warning about rung 2 than any of our own reasoning.

**A cheaper intermediate rung already exists and is unexplored:** `src/Core/IsaSpec.fs` treats an
ISA as data and carries a 6502-shaped second witness. CHIP-8 → 6502 is a genuine non-inclusion
between real ISAs at a fraction of an emulator's cost. Recorded here because the 2026-08-19
document recommends it and this design does not supersede that.

---

## 8. Does the glow transfer — and is it an alignment readout?

**Yes to the transfer, with one real obstacle. `toy` on the alignment claim.**

Lior's killer feature is already in production: `btn-right=0.79` while the rest sit at the `0.2`
floor, traced end to end from `BnnSocietyPredictor.predict` through `updateStudentT` (real
expectation-propagation, Student-t likelihood) to `opacity = 0.2 + prob*0.8`. Aaron's colour
semantics make it principled: **RGB(A) = the unsnapped distribution, CMYK = the snapped commit**,
and **luminance is additive exactly as probability mass is** — so the glow is not a metaphor for
the soft value, it _is_ the soft value, drawn.

**What transfers cleanly.** Seven of ARC's eight actions are atoms; a bar or a button per atom,
lit by probability mass, is the identical widget. Nothing about the mechanism is CHIP-8-specific.

**What does not, and it is the interesting part.** `ACTION6` is a _coordinate_, so its probability
mass is a **distribution over a 64×64 field, not over a button** — you cannot render it as one
button's brightness. But you can render it as a **heat-map over the frame itself**, which is
strictly _more_ legible than the button version: the viewer sees where the agent is about to click
before it clicks. Same arithmetic (additive luminance), different geometry.

**Correction to the preconditions — I checked rather than inherited them, and three of four have
moved since this morning.** The Lior handoff (measured 2026-08-23T15:5xZ) names four defects. At
`6b3b739d2`, hours later:

| defect                                  | handoff status                              | measured now                                                                                                                                                                                                                                                                                                                                                         |
| --------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 — ambient `Math.random`               | live at `bnn-key-predictor.ts:32` and `:98` | **partly fixed.** No `Math.random` remains; `nextRandom()` (line 29) is an LCG, `seed*9301+49297 mod 233280`, seeded at a hardcoded `12345`. Runs now replay. **But it is not derived from the phase clock** — the file imports neither `phase-clock.ts` nor `COMMON_SEED`, so the arena's glow and the rest of the substrate are seeded from two unrelated sources. |
| 2 — the snap never reaches the frontend | live                                        | **fixed.** `swarm.worker.ts:191` now posts `keys: Array.from(frame.keys)`.                                                                                                                                                                                                                                                                                           |
| 3 — 6 of 16 keys unrendered             | live                                        | **fixed.** `Chip8TvPlayer.ts:170-187` maps all 16 hex keys onto Xbox elements.                                                                                                                                                                                                                                                                                       |
| 4 — `activeConcept` never produced      | live                                        | **still live.** Consumed at `Chip8TvPlayer.ts:135-136`, supplied only as the literal `"Observing..."` at `swarm.worker.ts:193`.                                                                                                                                                                                                                                      |

**So the porting precondition is narrower than the handoff implies and should be stated as the
narrow thing:** finish defect 1 by seeding from `COMMON_SEED` rather than `12345` **before** the ARC
port, so the ARC glow is reproducible _by the same clock as everything else_ and not merely
deterministic in isolation. Two independently-seeded deterministic streams still fold to different
evidence for two viewers, which is the defect the noninterference rule is actually about.

**The alignment claim, stated in the register it deserves.** ARC's five-axis list includes
_alignment_, and the toolkit's `step(action, data, reasoning)` accepts a `reasoning` annotation —
so the benchmark already anticipates that an agent should _say what it is doing_. The proposal:

> **`toy`.** A pre-commitment display — the full distribution over the action space rendered
> _before_ the commit, beside the commit itself, and beside the "refused to snap" outcome when
> confidence falls below threshold — is a candidate **alignment readout**: it shows what the agent
> is about to do while it is still revisable, rather than explaining afterwards what it did.

Why this might be a genuine contribution rather than a nice demo: post-hoc explanation is
unfalsifiable at the moment it matters, whereas a pre-commitment display is checkable against the
action that follows. And **"refused to snap" is a first-class outcome** here — `SoftValue.snap`
returns `DynamicValue option`, `None` meaning _not confident enough to commit_ — which is more
honest than always painting a winner.

**What would move it out of `toy`:** a measurement, not an opinion. Record `(displayed
distribution, chosen action)` pairs and check calibration — does the action taken match the mass
displayed, at the rate the mass claims? A display that is _not_ calibrated to the commit is
decoration wearing an alignment badge, and the calibration test is the falsifier that separates
them. Until that test exists and can fail, the claim stays `toy`. Per §B0 of the Lior handoff, an
uncalibrated display on the most visible surface we have is the vacuity class in the worst possible
place.

---

## 9. The reverse arrow — could our games become ARC environments?

The engine admits authored games: **subclass `ARCBaseGame`, override `step()`**, pass levels
(sprite collections + optional metadata) and an optional camera to the parent initializer;
`win_score` defaults to 1; `next_level()` advances. Output is always **64×64**, sprites are 2D
arrays of palette indices, camera viewport up to 64×64 with letterboxed uniform upscaling. MIT
licensed. **Note for anyone planning to contribute upstream: `arcprize/ARCEngine` states it does
not accept external contributions.** So "author a game" means _for our own use_, not _merged into
the benchmark_.

**Can CHIP-8 produce what that format admits?** Checked against the format, not assumed:

| requirement                              | CHIP-8 reality                                     | verdict                                                                                                             |
| ---------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 64×64 display                            | 64×**32**                                          | **fits** — half-height, letterboxed by the engine's own uniform upscaling                                           |
| 16-colour palette indices                | 1 bit per pixel                                    | **fits trivially** (2 of 16 indices used)                                                                           |
| turn-based `step()`                      | `Chip8Cow.step` is a pure function `Frame → Frame` | **fits well** — this is the closest match of the lot                                                                |
| sprite-based composition                 | CHIP-8 draws by XOR-blitting sprites               | **fits in spirit**, but the engine wants a _sprite list_, not a framebuffer; we would hand it one full-frame sprite |
| levels with `win_score`                  | a ROM has no notion of a level or a win            | **does not fit** — this is the gap                                                                                  |
| no language / numbers / cultural symbols | most CHIP-8 ROMs draw digits and letters           | **does not fit** — ARC environments deliberately exclude these to control priors                                    |

**So the honest answer is a qualified yes with the interesting part named.** The _rendering_ and
_stepping_ fit almost embarrassingly well — a 64×32 monochrome pure-`step` machine is close to an
ARC environment's native shape. What CHIP-8 lacks is exactly the two things ARC environments are
_made of_: **levels with a win condition**, and **priors-controlled content**. Which means the
reverse arrow is not "wrap the emulator"; it is **author levels** — and the repo already has the
one artifact that suggests what a level could be: `db/emus/chip8/orbits/a4e75aee78565f8a.orbit.json` has
μ=3, λ=5 — a 3-step tail into a 5-step cycle, a genuine ρ shape, _a program whose entire future is
finite and was found_. A level whose win condition is "reach the cycle" is a goal defined by
structure rather than by a designer's intent, and that is a different object from anything on
`arc3.games`.

**Register: `proposed`, and the weakest-supported section in this document.** I read the engine's
README and the technical report; I did not install the engine, author a game, or run one. Aaron's
positioning read — that producing benchmark surface is worth more than consuming it — is recorded
as his, and is not something this document measured.

---

## 10. The credential — the pattern, never the value

The ARC key is **optional**. From the toolkit README: _"An API key is optional but recommended"_;
an **anonymous key works without registration**; and `OFFLINE` mode needs no API at all. So the
lane is designed to run for a contributor with no credential, and the key is an **optional
capability that widens** what is reachable (`ONLINE`, `COMPETITION`, leaderboard-verifiable
scorecards) — the `clone-at-tag` property applied to secrets.

Aaron has placed the key in 1Password. **The reference, never the value:**

```
op://Lucent/ARCPrize API Key/credential
```

reached with the `zeta-op-service-account` Keychain token (the auto-exported default, per
`reference_op_access_two_scoped_keychain_tokens_lucent_default_aaron_optin_2026_06_21` (**not in-repo**)).

**The shape, so the plaintext never enters an agent's context, a transcript, or a shell history
file:**

```bash
# local: the value is resolved by op INSIDE the child process; never printed, never assigned
op run --env-file=<(echo 'ARC_API_KEY=op://Lucent/ARCPrize API Key/credential') -- \
  uv run --project src/Arc.Python python -m zeta_arc.serve

# CI, one time, by a human at a terminal: op pipes straight into gh; no variable, no echo
op read "op://Lucent/ARCPrize API Key/credential" | gh secret set ARC_API_KEY --repo Lucent-Financial-Group/Zeta
```

Three rules for the lane, each of which is a refusal an implementation must actually make:

1. **Never read the clipboard, never `echo`, never assign to a shell variable.** `op run` and the
   `op read | gh secret set` pipe both keep the value inside a process boundary.
2. **Degrade, do not fail.** No `ARC_API_KEY` ⇒ anonymous/`OFFLINE`; the lane runs, the scorecard
   is local, and the run says so in its output. A lane that _requires_ a secret is a lane most
   contributors cannot run.
3. **The key never enters an artifact.** Recordings, `ArcEnvelope` JSON and scorecards are
   committed text; a scrub check belongs in the lane's own test, not in a reviewer's attention.

---

## 11. The rungs — each ships alone

Ordered so every rung is independently demoable, in the same spirit as the Lior ladder (whose
rungs 0–6 this extends rather than competes with; Lior's current position is between 3 and 4).

| rung                                                          | what it shows                                                      | depends on                | work-item                    |
| ------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------- | ---------------------------- |
| **A. `ControlScheme.Point` + `arcAgi3`/`atari2600` schemes**  | one grammar of meanings, three devices, one recorded non-embedding | nothing                   | `081M0QRP3XR087G0R001NCFG83` |
| **B. `ArcTransport` + `ArcEnvelope` over `listen_and_serve`** | our agent takes one real step in a real ARC environment            | A                         | `081M0QRP9JY087G0R00146V04J` |
| **C. `IEnvironment` seam + `Chip8Adapter`**                   | the same agent drives CHIP-8 and ARC with a scheme id changed      | A, B                      | `081M0QRP9KX087G0R0039EGV67` |
| **D. Recorded-session replay in the arena**                   | ARC on the published page, offline, no key, no CDN                 | B                         | `081M0QRP9MW087G0R003P83T6D` |
| **E. Coordinate heat-map glow for `ACTION6`**                 | the killer feature, transferred; pre-commitment made visible       | B, D, and Lior's defect 1 | `081M0QRPMZ5087G0R000D33Q8M` |
| **F. Calibration falsifier for the pre-commitment display**   | the alignment claim sheds `toy` — or is refuted                    | E                         | `081M0QRPN05087G0R00047WBC4` |
| **G. Empowerment-based goal former over CHIP-8 state**        | the absent axis, with its anchor already in our source             | nothing (parallel)        | `081M0QRPN16087G0R001TCN5T2` |
| **H. Dual-meter report: ARC score beside additive ΔU**        | the documented divergence, measured instead of argued              | B, and a cardinal ΔU      | `081M0QRPN25087G0R000P1519C` |

Rungs A and G have no dependency on the Python lane at all and are the cheapest real starts.

---

## 12. Honest limits of this document

- **Nothing here ran.** I installed no Python package, started no server, made no ARC call, and
  scored nothing. Every ARC API name is from documentation and repository READMEs, not from a
  session.
- **I did not verify that `arc-agi` installs under Python 3.14.** `arcengine` documents ≥3.12;
  `src/Core.Python` pins ≥3.14. §3.2's separate-project constraint exists _because_ I could not
  check this, not because I checked it and it failed.
- **I did not read the toolkit's source.** `listen_and_serve`'s route shapes, payload schema and
  auth behaviour are described from documentation. §3.3's `ArcTransport` seam is the mitigation for
  exactly that ignorance.
- **The five-axis vs four-component discrepancy is unresolved.** The site/toolkit list five
  (including memory and alignment); the technical report's functional decomposition names four
  (exploration, modeling, goal-setting, planning/execution). I report both; I do not know which is
  canonical.
- **I re-checked the Lior handoff's four defects in source and three had already moved** (§8's
  correction table). I did **not** re-probe the live site, so the traced glow _path_ is still that
  document's measurement, not mine — and the fact that three defects went stale within hours is
  itself the reason this document's claims about `src/apps/twitch-ai/` carry a SHA.
- **§9 is the weakest section.** Engine README plus technical report only.
- **`main` moved under me twice while I worked** (`10fbd9a4` → `6b3b739d2`). Line numbers cited from
  other documents are theirs; paths and file contents are checked at `6b3b739d2`.

---

## Pointers

- `docs/handoffs/2026-08-23-shadow-to-lior-chip8-arena-deploy-truth-and-the-soft-regime-wiring-ladder.md` — the ladder this attaches to; rungs 0–6 and four defects
- `docs/research/2026-08-19-the-first-rung-is-a-conservative-extension-and-the-second-is-not-a-morphism-at-all.md` — why ARC is not rung 4 of the CHIP ladder
- `docs/research/2026-05-07-arc-agi-3-chip8-atari-dbsp-replay-algebra-curriculum-correction.md` — emulator = transition oracle, DBSP = replay algebra, the ROM safety rule
- `docs/research/2026-08-10-lensography-over-small-games-as-an-arc-agi-3-approach-hypothesis.md` — the registered HYPOTHESIS and its cheap falsifier
- `src/Core/ActionGrammar.fs` · `src/Core/ControlScheme.fs` · `src/Core/GridBinding.fs` — the grammar, exhibited
- `src/Core.TypeScript/ledger/measure.ts` — the ordinal-not-cardinal register (§5.3)
- `src/Core.Python/pyproject.toml` + `.mise.toml` — the Python precedent (§3.2)
- `.claude/rules/clone-at-tag-stays-sufficient.md` · `.claude/rules/toy-is-free-metered-must-be-earned.md` · `.claude/rules/numerology-vs-number-theory.md` · `.claude/rules/anchor-to-human-prior-art.md`

### Anchors (Beacon)

- **François Chollet**, _On the Measure of Intelligence_, arXiv:1911.01547 (2019) — §II.2.1 the
  formal definition; §II.2.2 the four alternative efficiency axes. **Checked** (§5), and used only
  for what it entails.
- **ARC Prize Foundation**, _ARC-AGI-3: A New Challenge for Frontier Agentic Intelligence_,
  arXiv:2603.24621 — the scoring formulas and the human baseline (§6).
- **Joseph Weisbecker** (1977) — CHIP-8 on the COSMAC VIP. **John Earnest** — XO-CHIP `FN01` plane
  select, the opcode CHIP-9 widens.
- **Hartmanis & Stearns** (1966); **Park** (1981); **Milner** (1980, 1989) — machine homomorphism
  and bisimulation; the rung-1 result's anchors.
- **Parisotto, Ba & Salakhutdinov** (2016), _Actor-Mimic_; **Rusu et al.** (2016), _Progressive
  Neural Networks_; **Machado et al.** (2018) — the documented negative transfer between Atari
  games (§7.3). **Not** Bellemare et al. 2013, which is a platform paper.
- **Klyubin, Polani & Nehaniv** (2005) — empowerment as channel capacity from actions to future
  states; the anchor `ActionGrammar.fs` already cites and §4.1 proposes instantiating.
- **Donald Michie** (1968) — memoization; **Richard Brent** (1980) — the (μ,λ) cycle detector; the
  Beacon register for the orbit store.
