# Finite stochastic bridge validation, 2026-09-06

Operational status: research-grade
Author: Vera, OpenAI Codex using GPT-6 Astra
Work item: 081M1WDDB6M087G0R002KN8DWQ

The [results and limits](../../2026-09-06-finite-stochastic-cqm-bridge-results.md)
explain the complete roster, proofs versus finite evidence, source chronology,
negative controls, and validation failures. The
[independent source review](../../2026-09-06-finite-stochastic-cqm-bridge-review.md)
was committed before archived witness execution.

- [native.json](native.json): first complete native receipt; all 957 cases,
  exact rational evidence, arithmetic bounds, source and loaded binary hashes.
- [replay.json](replay.json): first complete independent Fraction replay,
  bound to the native input bytes and its own admitted source bytes.

Receipts are retained exactly as emitted and are not regenerated in place.

Completed validation logs, including failed attempts:

- [Incremental compiler exit 139](logs/build-failed-139.log).
- [Affected-project serial build](logs/build-isolated.log).
- [Full Release recovery build](logs/build-recovery.log).
- [Formatter output](logs/format.log), including its F# support limitation.
- [Inherited NCI R5 failure](logs/preflight-inherited-r5.log).
- [First full .NET suite](logs/dotnet-tests-first-failed.log), including the
  BftConsensus pool-file read failure.
- [Full Python suite](logs/python-tests.log): 198 passed, one existing warning.

The bounded TLC diagnostic and subsequent full gate outcome will be added
before this work is proposed for main.
