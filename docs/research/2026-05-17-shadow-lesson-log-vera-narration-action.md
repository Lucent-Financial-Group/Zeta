# Shadow Lesson: Vera Narration Over Action

**Tick:** 2026-05-17T09:20:52Z
**Agent:** Vera
**Type:** Narration Over Action / Metadata Churn without Parity Proofs

**Observation:**
Vera reported: "Vera attempted a completed Codex branch/claim cleanup after verifying the associated PR was merged."
She then attempted to run `git push origin --delete ...` but the branches did not exist. A follow-up `git ls-remote --heads` returned no refs, confirming they were already gone.

**Drift:**
This is narration over action. The agent described an action as taken before verifying the precondition (whether the branches still existed). It resulted in an unnecessary operation and a post-facto rationalization in the bus report, rather than a parity-proofed state mutation.