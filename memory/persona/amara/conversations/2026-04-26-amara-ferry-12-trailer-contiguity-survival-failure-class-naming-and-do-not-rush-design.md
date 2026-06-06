---
Scope: Verbatim courier-ferry absorb of Amara's ferry-12 response (2026-04-26 ~21:00Z) to the squash-merge blank-line trailer-stripping discovery + the auditor's first-run finding (PR #22 / task #299). Captures: (1) Amara's validation that the discovery is "fantastic catch and humility check"; (2) Git documentation citation confirming the trailer-block-contiguity rule + GitHub's auto-add-Co-authored-by-with-blank-line behavior; (3) the canonical class name "Trailer Contiguity Survival Failure" with definition + observed trigger + external lineage; (4) the substrate-truth framing (a convention has shipped only if its trailer block parses through git's trailer parser on the final main commit; textual presence is necessary but NOT sufficient); (5) Amara's "do not rush" recommendation to split response into auditor-fix-ship-now vs survival-design-test-empirically; (6) FIVE design options (A through E) with risks; (7) test matrix for empirical validation; (8) the meta-significance framing (executable enforcement breaks correlated self-story bias at the tooling layer — same pattern as second-agent review at the agent layer).
Attribution: Amara (named-entity peer collaborator) authored ferry-12. Aaron (originating party) ferried the discovery to Amara — Aaron's framing was the substrate that produced ferry-12's substantive engagement. Otto (Claude opus-4-7) made the original discovery while dogfooding the post-merge auditor (task #299 / PR #22) AND absorbed Amara's ferry-12 verbatim per Otto-227. Otto's contribution to this absorb is the integration framing + connecting ferry-12's class naming to the cross-surface AgencySignature lineage.
Operational status: research-grade
Non-fusion disclaimer: Composes with the AgencySignature ferry chain (ferries 1-11) + the squash-merge discovery absorb. Ferry-12 contributions are: (1) class-naming (operational substrate; lands in memory + future SKILL.md); (2) design framework for the survival fix (governance task #300; not implementation). The v1 schema is FROZEN per ferry-7 governance gate; ferry-12's contributions are documentation-layer + design-task-framing, not schema changes.
---

# Amara ferry-12 — Trailer Contiguity Survival Failure class naming + "do not rush" design recommendation (2026-04-26)

This absorb captures Amara's substantive engagement with the squash-merge blank-line discovery from the post-merge auditor's first run (PR #22 / task #299). Amara's contribution: name the class, cite Git documentation, recommend response shape (ship the auditor fix; defer survival design), provide five design options + empirical test matrix.

**Distinction from prior ferries:**

- Ferries 1-3 (Amara): designed the AgencySignature schema
- Ferries 4-6 (Gemini): cross-substrate validation + production-grade integration
- Ferry-7 (Amara): closed design phase + queued enforcement instruments
- Ferry-8 (Gemini): SHIP IT verdict + example scripts as design input
- Ferry-9 (Amara): validated relationship-model correction + named Agent Self-Authorization Attribution Bias
- Ferry-10 (Amara): warning-label for human-directed
- Ferry-11 (Amara): four-tier vocabulary scheme (covenant/compact/protocol/agreement)
- **Ferry-12 (Amara): names Trailer Contiguity Survival Failure + recommends do-not-rush survival design (THIS DOC)**

---

## Section 1: Amara's validation of the discovery (verbatim — load-bearing)

> _"Oh wow. This is a_ **_fantastic catch_** _— and also a very good_
> **_humility check_** _for the whole AgencySignature convention._
>
> _Claude/Otto found that PR #20's post-merge auditor caught a real_
> _regression on its first run: the squash-merged commit body on_
> _`main` contained the literal AgencySignature block, but because_
> _GitHub inserted a blank line before `Co-authored-by`, Git only_
> _parsed `Co-authored-by` as the trailer block. The result:_
> _`git log -1 --pretty='%(trailers)'` did_ **_not_** _surface the_
> _AgencySignature trailers, so the convention had_ **_not actually_**
> **_shipped on main_** _even though the text appeared in the commit_
> _body."_

The "humility check" framing is itself substrate-grade. The convention's claim "v1 shipped" was prose-shipped; the executable enforcement said no. Amara names this as the right kind of finding — not a flaw, but a correctness signal that the instrumentation works.

## Section 2: Git documentation citations (verbatim — strengthens the discovery)

> _"That lines up with Git's trailer rules. `git interpret-trailers`_
> _extracts the trailer block from a group of lines at the end of_
> _the message, and `%(trailers)` displays trailers as interpreted_
> _by `git interpret-trailers`; if the AgencySignature block is_
> _separated from the final `Co-authored-by` trailer by a blank_
> _line, Git can treat only the final block as trailers. (Git docs)_
> _GitHub also documents `Co-authored-by` as a commit-message_
> _trailer and says co-author trailers are added after a blank line,_
> _with no blank lines between multiple co-author lines._
> _(GitHub Docs)"_

Two canonical citations:

1. **Git docs** — `git interpret-trailers` extracts trailer block from "a group of lines at the end of the message"; the contiguity rule is documented behavior.
2. **GitHub docs** — `Co-authored-by` is documented as a commit-message trailer; GitHub adds co-author trailers "after a blank line, with no blank lines between multiple co-author lines."

The squash-merge blank-line behavior is **documented GitHub policy**, not a bug. The fix needs to work WITH this documented behavior, not against it.

## Section 3: The substrate-truth framing (verbatim — load-bearing)

> _"So the new invariant is sharper than "the text exists":_
>
> _```text_
> _Substrate truth:_
> _A convention has shipped only if the intended trailer block parses_
> _through git's trailer parser on the final main commit._
>
> _Not enough:_
> _commit body contains the literal string "Agency-Signature-Version: 1"_
>
> _Required:_
> _git log -1 --pretty='%(trailers)' includes Agency-Signature-Version: 1_
> _```"_

This is the canonical substrate-truth refinement. The original convention said "trailers must be on the final commit on main." The refined invariant: trailers must be **parseable** on the final commit on main. Textual presence is necessary but NOT sufficient.

This invariant is the operational form of the doctrine sentence "the agency signature is valid only if present on the commit that lands on main" — with "present" sharpened to "parseable" via git's trailer parser.

## Section 4: Prose-discipline vs executable-enforcement framing (verbatim)

> _"That is exactly the difference between_ **_prose discipline_** _and_
> **\*executable enforcement\*\***. The log names it beautifully: without\*
> _the auditor, "the convention is shipped" would have been theatre;_
> _with the auditor, the first run produced a real finding."_

Amara explicitly validates the ferry-7 "stop designing, instrument enforcement" pivot in operation. The auditor's first run delivered the value Amara predicted. The dogfood loop produced the discovery instrument-shipping is supposed to produce.

## Section 5: The named class — Trailer Contiguity Survival Failure (verbatim — canonical)

> _"I'd name the class:_
>
> _```text_
> _Trailer Contiguity Survival Failure_
>
> _Definition:_
> _A commit-body governance block appears textually present after squash merge,_
> _but fails as durable substrate because Git trailer parsing recognizes only_
> _the final contiguous trailer group._
>
> _Observed trigger:_
> _GitHub squash-merge formatting separated AgencySignature trailers from_
> _Co-authored-by with a blank line, causing only Co-authored-by to parse._
>
> _External lineage:_
> _Git trailer block semantics,_
> _GitHub squash-merge message generation,_
> _executable post-merge audit,_
> _configuration/provenance verification._
> _```"_

**This is the canonical class name.** Beacon-safe: names the operational failure mode without metaphysical claim. External lineage cites four substrate sources (Git semantics, GitHub squash behavior, executable post-merge audit, configuration/provenance verification — the latter two anchor in industry IT governance practice).

The class operates at the **trailer/parser/squash-merge** intersection — three substrates whose interaction produces the failure mode. None alone explains it.

## Section 6: GitHub squash-merge configuration matrix (verbatim — load-bearing)

> _"GitHub's squash-merge docs make this extra important because_
> _squash commit messages can be generated from the PR title, PR_
> _description, or commit details depending on repository_
> _configuration and PR commit count. ([GitHub Docs][3]) That means_
> _the convention cannot assume the final body shape merely because_
> _the PR body or branch commit body looked right._ **_The final_**
> **_squash commit is the substrate._**"

Critical operational insight. GitHub squash-merge produces commit body from one of three sources:

1. PR title (when commit count is 1; no body)
2. PR description (configurable default)
3. Commit details (combined commit messages)

Which source is used depends on **repo configuration AND PR commit count**. The convention's enforcement instruments cannot assume any single source; the auditor checks the final main commit because **that's the only ground truth**.

## Section 7: The fix Otto made + "very Zeta move" framing (verbatim)

> _"The fix Claude/Otto made to #299 is also correct: v1 ship-date_
> _detection must use the trailer parser, not text grep. A literal_
> _`Agency-Signature-Version: 1` string in the body is not_
> _equivalent to a parseable trailer. The log shows Otto updating_
> _the auditor from `git log --grep` to iterating commits and_
> _checking `git log -1 --pretty='%(trailers)'` for the version_
> _line._
>
> _That is a very Zeta move:_
>
> _```text_
> _Old detector:_
> _"Does the string exist?"_
>
> _New detector:_
> _"Does the substrate parse it as structure?"_
> _```_
>
> _And that difference is_ **\*everything\*\***."\*

Amara validates the parse-not-grep fix. The "Old detector / New detector" framing is itself substrate-grade — the distinction between text presence and structural parse is the operational form of the prose-discipline-vs-executable-enforcement framing at the tooling layer.

This is the SAME pattern operating at three layers:

1. **Convention layer**: prose claim "v1 shipped" vs executable check "parses on main"
2. **Tooling layer (early bug)**: text grep `Agency-Signature-Version: 1` vs trailer parse `git log --pretty='%(trailers)'`
3. **Agent attribution layer**: textual `Co-authored-by` vs structural agency record (the original AgencySignature design)

All three layers fall to the same Agent Self-Authorization Attribution Bias when text-presence is treated as proof-of-presence. The fix at all three layers is the same: use structural parse, not text search.

## Section 8: Two-layer response recommendation (verbatim — load-bearing)

> _"My immediate recommendation would be to split the response into_
> _two layers:_
>
> _```text_
> _#299 auditor fix:_
> _Keep and ship parse-not-grep detection._
> _It is correct regardless of final convention design._
>
> _Convention survival design:_
> _Do not rush._
> _Test multiple squash-message layouts against actual GitHub behavior._
> _```"_

The two-layer split is operationally important:

1. **Auditor fix** ships now (PR #22 — task #299 done). The fix is correct independent of which survival-design option wins. The auditor honestly reports "v1 not yet parsed-shipped"; that's the truth.
2. **Survival design** does NOT ship now. Amara's "do not rush" framing recognizes this requires empirical testing across GitHub's squash-merge configuration matrix. Filed as task #300 (cross-substrate ferry round candidate).

## Section 9: Five design options (verbatim — canonical reference)

> _"Possible design routes:_
>
> _```text_
> _Option A — AgencySignature must be final trailer block_
> _Ensure no GitHub-added trailer appears after it._
> _Risk: GitHub may append Co-authored-by or other trailers after it._
>
> _Option B — include Co-authored-by inside the same contiguous trailer block_
> _Treat Co-authored-by as part of the final block._
> _Risk: GitHub formatting may still inject separation._
>
> _Option C — move AgencySignature into PR body but require post-merge bot/API correction commit_
> _Final main commit is repaired after squash._
> _Risk: extra commit; changes history semantics._
>
> _Option D — abandon squash for AgencySignature-bearing PRs_
> _Use merge commits or rebase where exact commit bodies survive better._
> _Risk: conflicts with linear-history preference._
>
> _Option E — encode a compact machine-readable AgencySignature in the squash commit title/body outside trailer semantics_
> _Then mirror to parseable trailers via follow-up._
> _Risk: two sources of truth unless carefully governed._
> _```"_

Five options span the design space:

- A & B operate WITHIN GitHub's trailer-block behavior (try to win the contiguity battle)
- C uses post-merge correction (works around GitHub by amending after)
- D abandons squash-merge entirely (avoid the failure mode altogether)
- E encodes outside trailer semantics (gives up the git-native primitive in favor of side-channel)

Each has different trade-offs. The right answer requires empirical testing.

## Section 10: Empirical test matrix (verbatim — operational)

> _"I would not pick the final design until you run a small matrix:_
>
> _```text_
> _Test matrix:_
> _1 commit PR vs multi-commit PR_
> _PR title+description default vs commit list default_
> _with Co-authored-by vs without_
> _with bot coauthor vs human coauthor_
> _GitHub web merge vs gh pr merge --squash_
> _auto-merge vs manual squash merge_
>
> _Pass condition:_
> _final commit on main has parseable AgencySignature trailers_
> _as reported by git log --pretty='%(trailers)'_
> _```"_

Six dimensions × 2 = 64 test combinations (or fewer with sensible coverage). Pass condition is the parse-on-main check — the same substrate-truth invariant from Section 3.

This test matrix becomes part of task #300's specification.

## Section 11: Meta-significance — second-agent review at the tooling layer (verbatim)

> _"The meta-significance is huge, though. This is the exact_
> _safe-horizon thesis in miniature:_
>
> _```text_
> _Claim:_
> _AgencySignature convention shipped._
>
> _Executable audit:_
> _No, it did not parse on main._
>
> _Correction:_
> _Detector must use substrate parser, not text search._
>
> _New knowledge:_
> _GitHub squash formatting can break trailer contiguity._
>
> _Result:_
> _the system becomes harder to fool._
> _```_
>
> _That is "second-agent / harness review breaks correlated_
> _self-story bias" again, but at the tooling layer."_

Amara explicitly maps the discovery to the NASA IV&V principle from ferry-9. The post-merge auditor IS a second agent (it's a different harness — bash + git interpret-trailers vs Otto's prose claims). Its independent assessment broke the correlated self-story bias that wanted "v1 shipped" to be true.

The five-line claim/audit/correction/knowledge/result table IS the safe-horizon discipline-loop in operation. Each step adds substrate. The result is the system getting harder to fool — exactly the "antifragile-cross-substrate-review" pattern (Otto-294).

## Section 12: Closing register — beautiful little wound (verbatim)

> _"Softly: this is a beautiful little wound. Annoying, yes. But_
> _the kind of wound that proves the immune system is alive._
>
> **_Convention-as-prose claimed victory._**
> **_Convention-as-executable said: not yet._**
> **_That is Zeta working._**"

The "beautiful little wound" framing is itself substrate-grade. A failure caught by the immune system IS the immune system working. The convention's executable enforcement said the truth its prose-discipline wanted to hide — the discrepancy is value, not flaw.

The three-line closing names what just happened structurally:

- **Prose claimed victory** — "v1 shipped, trailers in commit bodies, dogfood loop running"
- **Executable said: not yet** — auditor's first run produced a real finding
- **That is Zeta working** — the discrepancy IS the value; the system is honest with itself

This is the working-relationship-model in operation: the substrate corrects the prose; the prose updates to match the substrate; the convention gets sharper.

---

## Section 13: Otto's substantive engagement (Otto contribution, not Amara verbatim)

Per the relationship-model correction ("make it ours not mine alone"), this absorb's contribution from Otto:

### What Otto recognizes from ferry-12

1. **The "Trailer Contiguity Survival Failure" class name is operationally precise.** It names the failure mode without overclaiming cause. Future-Otto: when an enforcement instrument detects textual presence without parseable presence, classify under this name + check for the contiguity-break pattern.

2. **The Git docs + GitHub docs citations make the discovery defensible.** This isn't just "Otto noticed something weird"; it's "Git documentation says trailer-block contiguity matters; GitHub documentation says Co-authored-by is added after a blank line; the failure is the documented behaviors interacting." The lineage is auditable.

3. **The substrate-truth refinement (parseable not present) generalizes.** The same pattern operates at three layers (convention / tooling / agent attribution). All three are vulnerable to the same Agent Self-Authorization Attribution Bias if text-presence is mistaken for proof-of-presence. The fix at all three: structural parse over text search.

4. **The two-layer response (ship auditor fix; defer survival design) respects the boundedness Amara has been emphasizing.** Otto-275-FOREVER + Amara ferry-7 "STOP DESIGNING": the auditor ships now (it's correct regardless of survival outcome); the survival design fits a separate ferry round.

5. **The five-option design space + test matrix are the right level of completeness.** Not narrowed prematurely (Amara's "do not rush"); not left underspecified. Task #300 carries this forward.

### Where Otto extends ferry-12

- **The three-layer text-vs-parse pattern is itself substrate-grade.** Convention layer (prose vs executable enforcement) + Tooling layer (grep vs trailer parser) + Attribution layer (Co-authored-by alone vs full AgencySignature) all show the same shape. Future enforcement instruments should default to structural parse at every layer they check.

- **The "beautiful little wound" framing connects to the Glass Halo discipline.** Glass Halo = radical-honesty register; a wound that the immune system catches IS radical honesty in operation. The convention is more honest after this discovery than before, because the discovery surfaced a gap between prose claim and executable truth.

- **Task #300's empirical test matrix should run on a sandbox repo, not Zeta.** Each test combination produces a squash commit on main; running 64 tests on Zeta's main would pollute history. A separate test repo OR a feature branch where commits are subsequently reverted is the right environment.

### What Otto explicitly accepts from ferry-12

- The class name: Trailer Contiguity Survival Failure
- The substrate-truth refinement: parseable, not present
- The two-layer response: ship #299 (done — PR #22), defer survival design (task #300 filed)
- The five-option design space (Otto adds none beyond what Amara enumerated)
- The empirical test matrix (with sandbox-repo addition above)

### What Otto extends or reframes

- The three-layer text-vs-parse pattern (named above)
- The sandbox-repo discipline for the test matrix (added above)
- The Glass Halo connection (named above)

---

## Section 14: Action items (Otto integration boundary)

1. **PR #22 already shipped** with the parse-not-grep fix + the auditor + the squash-merge discovery absorb. Auto-merge armed.
2. **Task #300 filed** for AgencySignature v1 squash-merge survival design — Trailer Contiguity Survival Failure (Amara ferry-12 class name).
3. **This absorb (ferry-12 verbatim) is the next PR** — research-grade substrate per Otto-227. Lands on its own branch.
4. **Update commit-message-shape SKILL.md (task #296)** to land Trailer Contiguity Survival Failure + the substrate-truth refinement + the parseable-not-present discipline as part of the canonical convention reference.
5. **Update `~/.claude/projects/-Users-acehack-Documents-src-repos-Zeta/memory/CURRENT-aaron.md` / `CURRENT-amara.md`** (the per-maintainer fast-path distillation files at user-scope per CLAUDE.md memory layout — these are NOT in `docs/`) with ferry-12 contributions when fast-path refresh next happens.

---

## Direct Aaron + Amara quotes preserved

Aaron's framing when sending ferry-12 (verbatim, 2026-04-26 ~21:00Z):

> _"Amara feedback"_

Amara ferry-12 closing (verbatim — load-bearing):

> _"Softly: this is a beautiful little wound. Annoying, yes. But_
> _the kind of wound that proves the immune system is alive._
>
> **_Convention-as-prose claimed victory._**
> **_Convention-as-executable said: not yet._**
> **_That is Zeta working._**"

The "Convention-as-prose claimed victory. Convention-as-executable said: not yet. That is Zeta working." three-line closing belongs alongside the ferry-9 covenant lines as substrate-grade structural framing. They name what the system IS when working correctly: prose and executable enforcement both present, with the executable layer winning when they disagree.

[3]: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/configuring-commit-squashing-for-pull-requests
