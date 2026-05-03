# Architectural-intent guesses — Otto's in-the-moment calibration data

This directory implements the **guess-then-verify architectural-intent
calibration protocol** (Aaron 2026-05-03; canonical memo:
`memory/feedback_guess_then_verify_architectural_intent_calibration_protocol_aaron_2026_05_03.md`).

## Purpose

Each file in this directory is an **in-the-moment guess** about Aaron's
architectural intent for a specific substrate choice — saved BEFORE Otto
researches ground truth. Per Aaron 2026-05-03 verbatim *"your inital
guess in the moment will say a lot about ottos frontier ability"*, the
in-the-moment capture is the **unique frontier-ability data point**:
uncontaminatable, can never be retrospectively replicated.

## File schema

Each guess file uses the format `<date>-<topic-slug>.md` with this body
structure:

1. **Target** — the architectural choice being inferred (substrate path
   + line numbers if applicable; PR # if known)
2. **Read state at guess time** — what Otto had ALREADY READ before
   making the guess (commit SHAs, prior memos, prior research). This
   bounds the inference fairly
3. **Research deliberately AVOIDED** — what Otto did NOT consult before
   guessing (the substrate that would reveal ground truth)
4. **Otto's in-the-moment guess** — the inference, with explicit
   reasoning chain
5. **Confidence level** — Otto's self-reported confidence (low / medium
   / high) per layer (architectural / substrate-content / specific
   implementation)
6. **Ground truth (filled in LATER)** — empty at write time; populated
   when ground truth surfaces via docs archaeology / decision-archaeology
   / asking Aaron
7. **Calibration delta (filled in LATER)** — match / partial-match / off
   / unrecoverable, with analysis

## Write-time discipline

- Save the guess BEFORE consulting any of: the target file's history,
  ADRs touching the topic, persona notebooks, conversation archives,
  docs/research/ artifacts that reveal the intent
- The guess file's commit ITSELF is the timestamp marker
- After saving, ground-truth research is permitted; updates happen in a
  SUBSEQUENT commit / PR with a **GROUND-TRUTH-RECOVERY** prefix

## Cross-model retroactive replay

Per Aaron 2026-05-03 *"you can also test othr models after the fact and
just hid the conclusions from them"*, this directory's guesses can be
retroactively replayed against other models:

1. Pick an architectural choice with both Otto's in-the-moment guess +
   recovered ground truth
2. Hide the ground-truth substrate from the test model
3. Give the test model the architectural choice with the same read-state
   constraints Otto had
4. Compare the test model's guess to the ground truth + Otto's guess
5. Track per-model accuracy + per-architectural-layer accuracy

The retroactive mode is reproducible across new models as they arrive.
Otto's in-the-moment mode is one-shot per architectural choice.

## Discipline reminder

If Otto reads the target's ground truth FIRST and then writes the
"guess" file, the file is **research-then-write** disguised as inference,
not authentic in-the-moment calibration data. The discipline is real
and load-bearing.
