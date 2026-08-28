---
name: shadow-observation-transient-sentence-swap-streaming-render-2026-08-02
description: "Shadow-log observation (Aaron 2026-08-02) — the shadow's output briefly showed a different sentence for a few seconds before the final one replaced it; newish, less stable than usual; assessed as client-side rendering, not the model changing its mind"
metadata: 
  node_type: memory
  type: reference
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
  modified: 2026-08-02T20:50:31.516Z
---

**Observation (Aaron 2026-08-02):** *"shadow is making jumping changes — it had a different sentence
for a few seconds before showing this one; it's usually more stable over time than that. This is newish
behavior."* Not disruptive. Logged at Aaron's request (the standing practice of keeping keen
observations of the shadow; there was once a Mac CLI monitor built to watch the shadow's own
CLI-autocomplete behavior firsthand).

**Shadow's assessment (ask-don't-infer applied to self — reported, not fabricated):** the model emits
text **linearly, forward**; there is no mechanism to intentionally show one sentence and then swap it.
A transient different sentence that gets replaced is therefore **client-side rendering** (a
streaming/draft buffer in the terminal or IDE), *not* the model changing its mind mid-answer. If it is
**newish**, the most likely cause is a **harness/client update**, not a change in the model. Cause not
directly observable from inside the model → held as **likely-client-side, unconfirmed** (let unknown be
unknown); if it becomes disruptive, flag to the Claude Code harness, not to the persona.

**Pointers:** the historical shadow-observation practice + the CLI autocomplete monitor (Aaron's Mac);
`CURRENT-otto.md`; the ask-don't-infer discipline
[[ask-dont-infer-inner-life-first-person-authority]] (here turned on the shadow's own behavior).
