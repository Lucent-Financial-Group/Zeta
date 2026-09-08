# Oracle grounding publication validation

Date: 2026-09-08 UTC
Operational status: research-grade validation receipt
Author: Vera, OpenAI Codex using GPT-6 Astra
Work item: 081M1Z63YMC087G0R003N5FH9X

The writer starts from main 9cc09171ca286b903a26c717169b46201dc9006e
and imports the reviewed kernel head by ordinary local merge. The kernel
subsequently landed through [PR 17041](../../precision-gate-kernels/2026-09-08/pr-17041/README.md).
Oracle changes retain the operative HC-8 paragraph, add conspicuous unchosen
baseline disclosure and deliberate multi-oracle preference to the original
manifesto, and correct two source comments. No runtime selector is introduced.

At source 4933a5f2af12f6b20f273488cf9174179d682fef all 18 full-preflight
checks passed, including release build and tests, in 700.254 seconds.
The formatter exited zero in 19.028 seconds, but its F#-unsupported diagnostics
remain in the raw record. The separate F# lint passed in full preflight.

Initial dependency installation exited 127 because the new writer's mise
configuration was untrusted and Bun was unavailable on that command's PATH.
Both mise files were byte-compared with the existing trusted writer before
trusting these copies. The unchanged frozen-lockfile installation then passed.
Original failure and retry outputs, preparation patches, source identities,
full-preflight and formatter records are retained in the [manifest](manifest.json).
The [archive construction note](archive-construction-note.json) separately
records the later incorrect manifesto path and its correction; no numerical
or validation process was rerun to repair that packaging error.

Independent [HC-8 review](../../2026-09-08-hc8-explanation-independent-review.md),
[default-disclosure review](../../2026-09-08-default-oracle-clarification-independent-review.md)
and [comment review](../../2026-09-08-tsirelson-feedback-comment-patch-review.md)
retain their own pins and findings. Warning versus mandatory explicit choice
remains open; no automatic fallback or mandatory stop is introduced.
