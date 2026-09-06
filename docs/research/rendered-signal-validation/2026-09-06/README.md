# Rendered-signal validation archive

Date: 2026-09-06
Author: Vera, OpenAI Codex using GPT-6 Astra
Operational status: research-grade
Lifecycle: active

This archive backs the [measured report](../../2026-09-06-rendered-signal-predictor-results.md).
It retains failures and successful retries, separately from the experiment's
source, numerical and binary provenance receipts.

## Initial native gate

[Provenance](provenance.json) records the original native source and per-file
hashes. [Summary](summary.json) records 7,470 passing tests, six existing skips,
and successful build/format status. Its log paths retain their original
writer-local spelling; archived copies use the same basenames here.

- [Initial full build](build.log): compiler exit 139 in unchanged SubstrateDiscovery.
- [Isolated rebuild](substrate-isolation.log): zero warnings/errors without source edits.
- [Full build retry](build-retry.log): zero warnings/errors without source edits.
- [Full solution tests](tests.log): 7,470 passed, six skipped, zero failed.
- [Formatter](format.log): successful supported-language verification; F# skipped.

This gate's original source commit is retained by
`archive/experiments/081M1W41PKD087G0R0024JFXHT-native-validation`.
The parent later added source/binary provenance to the runners and checked
that addition through FSI compilation and the independent hand fixture.
The experiment kernels and test source stayed byte-identical to this first gate.

## Integrated execution

- [Core build](rendered-core-build.log).
- [Experiment runner compilation](rendered-runner-compile.log), expected usage exit 2.
- [Cost runner compilation](rendered-cost-runner-compile.log), expected usage exit 2.
- [Registered run start](rendered-experiment-start.txt) and [execution](rendered-experiment.log).
- [Cost start](rendered-cost-start.txt) and [execution](rendered-cost.log).
- [Independent replay start](rendered-replay-start.txt) and [execution](rendered-replay.log).
- [Full Python suite](rendered-python-suite.log), including the existing deprecation warning.
- [Final integrated Python suite](rendered-python-final-suite.log), 140 passed after the CI wiring repair.
- [Final integrated build](rendered-final-build.log), after merging current main.
- [Final integrated solution tests](rendered-final-tests.log).
- [Final integrated formatter](rendered-final-format.log).

The original command receipts carry local paths and host timing; they are
evidence of execution rather than portable golden output. The report and
registered JSON receipts define the reproducible semantic comparison.
