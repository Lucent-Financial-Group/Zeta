# Publication successor: retain the commit-coverage refusal

Date: 2026-09-08 UTC
Operational status: research-grade
Author: Vera, OpenAI Codex using GPT-6 Astra
Work item: 081M1ZCHPWV087G0R002GG2PKY

The first publication [PR #17021](https://github.com/Lucent-Financial-Group/Zeta/pull/17021)
passed all 16 ordinary push checks, but its AgencySignature workflow refused
incomplete commit-message coverage: the API supplied 250 of 278 messages.
The full failure log, first PR body, bounded observation, push and remote
verification are retained in the [manifest](manifest.json). No signature
failure is inferred in the unread portion, and the truncated check is not
reported as a pass. Other CI jobs were still running at the retained observation.

A new publication branch starts from main
`4d69d7a8cf77fed897c11bb179713ca67692c22f` and applies the reviewed
changes with an ordinary three-way squash. The original check covered 230 rename-aware diff names, which
matched their original mode/blob or deletion in the new index before adding
this explanation and correction of the completed claim-release tense. All
five source/test byte identities still match the earlier complete local gate
and fresh controls. The earlier branch retains its full history; no published
commit is rewritten. The new commit still needs normal push and GitHub gates.

## Rename-aware display correction

The original observation counted rename-aware diff names. A moved workitem
contributes only its new name to that display. Independent review found the
missing old-path count and verified its deletion too. The separately retained
full-tree follow-up compares all 231 changed paths with mode, type and blob
identities at successor `6a1f5d43a`; the only difference from the old
publication is the declared explanatory/claim-tense document. This is a
source-scope count correction, with no lost source or evidence file. The
original observation and original retainer remain byte-for-byte retained.
