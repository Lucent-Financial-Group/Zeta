# `src/Interp.Python` — the model-interpretability lane

**What it is for:** reading and _writing_ intermediate activations of a trained
model. Ollama's `/api/generate` returns text and `/api/embeddings` returns a
pooled vector; neither is a residual-stream activation, so neither can answer a
causal question. This lane is the aperture.

It closes the infrastructure dependency scoped in work-item
`081M0QD23P3087G0R002NQ8217` and named in
`docs/research/2026-08-23-measuring-latent-geometry-survey-falsifiable-clifford-experiment-and-the-gwt-verdict.md`
§2.2.

## Not a gate, and never a dependency of `zeta-core`

Its own `uv` project, on the `src/Arc.Python` precedent and for the same reason:
a resolution failure here must not be able to break
`uv sync --project src/Core.Python`. `interp-lane.yml` appears in no `needs:`
list; `gate (required)` neither waits for it nor sees it.

## Install

Opt-in, declared through `ace`:

```bash
ZETA_INSTALL_INTERP=1 bun src/Core.TypeScript/ace/setup-realize.ts from-uv-project
```

Or directly, with no `ace` on `PATH` — the tree stays self-sufficient:

```bash
uv sync --project src/Interp.Python --frozen
```

Without `ZETA_INSTALL_INTERP=1` the realizer skips loudly and costs one manifest
read. It is deliberately **not** wired to `ZETA_INSTALL_FULL`, which three
installer-test workflows already set.

## Platforms — one pin does not cover all of them

Sizes are the wheel `Content-Length`, measured 2026-08-25.

| Host                                        | torch build     | Wheel    | Accelerator   |
| ------------------------------------------- | --------------- | -------- | ------------- |
| macOS arm64 (`macos-26`, maintainer laptop) | `2.13.0` (PyPI) | 111.2 MB | CPU + **MPS** |
| `ubuntu-24.04` (x86_64)                     | `2.13.0+cpu`    | 191.8 MB | CPU only      |
| `ubuntu-24.04-arm` (aarch64)                | `2.13.0+cpu`    | 155.0 MB | CPU only      |

The linux rows come from the PyTorch CPU index via `[tool.uv.sources]`. Without
that pin, linux x86_64 resolves the 526.6 MB default wheel **and** the whole
`nvidia-*` CUDA closure. macOS deliberately stays on PyPI because that wheel is
the one carrying the Metal/MPS backend.

**No runner in this repo's matrix has a GPU**, so CUDA would be dead weight.
`tests/test_activation_access.py::test_lock_has_no_cuda_bulk` fails if it
returns.

Windows is untested here. The lock contains win_amd64 wheels, but no workflow
exercises them, so treat it as unmetered rather than supported.

## The falsifier

```bash
uv run --project src/Interp.Python pytest src/Interp.Python/tests -q
```

Nine activation-access tests use randomly-initialised weights. Eighteen Mess3
reference cases below also run offline. No HuggingFace downloads or credentials
are needed. The activation-access load-bearing pair:

- `test_causal_write_changes_the_output` — patching the residual stream must
  move the logits. Verified to fail: making the write a no-op turns exactly this
  test red.
- `test_identity_patch_is_a_no_op` — its **negative control**. Re-injecting the
  activation the model just produced must reproduce the baseline. Without it,
  "the logits changed" would also pass under ordinary nondeterminism.

## What this does NOT claim

The activation-access checks are plumbing only, and `toy_hooked_model` is
randomly initialised: it models nothing. The separate Mess3 experiment measures
a trained recurrent network on a synthetic process, not an LLM. H1 stays `toy`
until something measures it on a real model. See
`.claude/rules/toy-is-free-metered-must-be-earned.md`.

## Mess3 numerical reference

`zeta_interp/mess3_reference.py` independently checks the native F# recurrent
learner's numerical fixture. It runs with the Python standard library alone:

```bash
python3 src/Interp.Python/zeta_interp/mess3_reference.py
```

The script invokes the source-owned F# fixture through `dotnet fsi`.
`tests/test_mess3_reference.py` additionally compares the native gradient with
PyTorch autograd, checks clipped and unclipped updates against PyTorch Adam,
and requires a deliberately corrupted gradient to fail.

`zeta_interp/mess3_replay.py` replays all nine recorded networks, both context
lengths, and every prediction/probe control with independent NumPy calculations:

```bash
uv run --project src/Interp.Python python src/Interp.Python/zeta_interp/mess3_replay.py
```

The tests reject a receipt missing any registered run, panel, or control, and
compare 630 reported quantities. They validate the stored models' measurements;
they do not retrain the entire sweep during CI. The separately
registered [experiment](../../docs/research/2026-09-06-mess3-learned-belief-experiment.md)
owns the training protocol and its measured outcomes.

## Predictive-state batch

The follow-up [protocol](../../docs/research/2026-09-06-predictive-state-batch-protocol.md)
and [report](../../docs/research/2026-09-06-predictive-state-batch-results.md)
cover binary RRXOR learning, matched-history interventions, exact entropy
identities, generalized spectral powers, and inference microbenchmarks.

```sh
uv run --project src/Interp.Python python -m zeta_interp.predictive_reference
uv run --project src/Interp.Python python -m zeta_interp.rrxor_replay
uv run --project src/Interp.Python python -m zeta_interp.inference_replay
```

The isolated lane now collects 62 tests, including the original 27. SymPy
1.14.0 checks rational Jordan decompositions independently; it remains outside
the database runtime. Benchmark replay verifies all 190 measured calls-batches
and their consumed outputs, not equality of hardware timing. A zero raw
peak-working-set counter is reported as unavailable, never zero memory use.
