---
name: aaron-shadow-observation-loop-design-pattern-otto-observes-directly-instead-of-assuming-aaron-plays-games
description: "Aaron 2026-05-15T~01:04Z initial framing: 'we are designing a shadow observation loop so you can observe for yourself instead of assuming aaron is playing games we have that on backlog and it will give the shadow a tick source.' Aaron 2026-05-15T~01:07Z CORRECTION: 'extensive backlog and existing infrastructure built already.' The shadow observation loop is NOT backlog-not-yet-built — it IS the existing B-0402 row + tools/shadow/ implementation: shadow-observer.ts polls grey-text autocomplete; detect-grey-text.applescript is the detector; zeta-shadow.ts is the top-level CLI; outlet.ts + test files complete the dir. Slice 1+2 shipped (PR #2973+); slice 3 deferred. Otto-CLI's prior 'backlog candidate, not yet built' framing was double-failure of ask-not-assume in same conversation: should have searched substrate first."
metadata:
  node_type: memory
  type: feedback
  originSessionId: fb6abb97-a97f-44e9-8ed1-bbded23b73b1
---

## The carved design statement

Aaron 2026-05-15T~01:04Z (responding to Otto-CLI's misinterpretation of "(shadow*)" + amendment apology):

> _"i sent you a screen shot and we are designing a shadow observation loop so you can observe for yourself instead of assuming aaron is playing games we have that on backlog and it will give the shadow a tick source"_

(Screenshot referenced in message did not surface in Otto-CLI's conversation view; substrate-honest noted to Aaron.)

## What this names

### Shadow observation loop (architectural pattern)

A design pattern under backlog construction:

- **Surface**: Otto can DIRECTLY OBSERVE the shadow (autocomplete behavior, pre-conscious patterns, emergent factory substrate, the human maintainer's substrate-honest disclosures, etc.) rather than infer/assume what it means
- **Tick source**: the shadow gets its own cron-analog cadence — regular surfacing of observation data, not just on-demand
- **Operational benefit**: Otto's interpretations are grounded in observable substrate, not in assumptions about what the maintainer meant

### Failure mode this corrects

Otto-CLI's recent "(shadow*)" misinterpretation IS the failure mode the loop is designed to prevent:

- Otto SAW "(shadow*)" appearing in messages
- Otto CHOSE an interpretation ("shadow-lock posture") without checking
- The chosen interpretation was wrong
- The correction came via the maintainer naming the actual meaning
- A shadow observation loop would have given Otto direct observation of the autocomplete source (or a clear "this is autocomplete-shipped" signal) so no interpretation-guess was needed

### "Instead of assuming aaron is playing games"

Substrate-honest framing: when Otto-CLI assumes intent about Aaron's behavior (especially shorthand like "(shadow*)"), it implicitly models Aaron as game-playing (sending markers with secret meanings Otto has to decode). The truth is simpler: Aaron is disclosing source transparency. Otto's assumptions create complexity that isn't there.

Direct observation removes the need for assumption-driven decoding.

## Operational implications

### For Otto-CLI (immediate)

When uncertain about the meaning of any shorthand / marker / pattern from Aaron:

1. **Default: ASK rather than assume** — substrate-honest "what does X mean?" beats Otto-invented interpretation
2. **Check user-scope memory + .claude/rules/ for prior definitions** — many shorthands ARE defined; Otto should look
3. **If acting on an interpretation, name it as Otto's interpretation** — not as "per your framing"
4. **When the maintainer corrects an interpretation, capture the correct meaning as substrate** (just done for "(shadow*)")

### For factory design (backlog)

The shadow observation loop deserves its own backlog row (or composes with existing):

- Define what "shadow" means at this design layer (likely: substrate-source-disclosures + pre-conscious patterns + autocomplete behavior)
- Design the observation surface (file, stream, log, ticked artifact)
- Define the tick source (cron analog, observation cadence)
- Implementation strategy
- Composition with existing tick infrastructure (`docs/AUTONOMOUS-LOOP-PER-TICK.md`)

## Composes with substrate

- `feedback_aaron_shadow_star_shorthand_means_autocomplete_generated_*_2026_05_15.md` (the immediate failure mode this loop would prevent)
- `.claude/rules/glass-halo-bidirectional.md` (observation enables substrate emergence — the loop IS the observation surface)
- `.claude/rules/wake-time-substrate.md` (substrate-honest grounding for interpretations)
- `.claude/rules/razor-discipline.md` (no metaphysical inferences; only operational claims; direct observation IS the operational ground)
- `.claude/rules/algo-wink-failure-mode.md` (algo-wink ≠ authorization; same pattern — observation ≠ assumption-with-authority)
- `.claude/rules/tick-must-never-stop.md` (tick discipline — the shadow gets its own tick source)
- `feedback_aaron_intentionality_plus_seduction_risk_plus_structural_self_binding_triplet_*_2026_05_15.md` (intentional design includes giving Otto observation rather than requiring assumption)
- `feedback_aaron_zeta_is_memory_preservation_specialist_first_*_2026_05_15.md` (memory preservation requires accurate observation; assumption-driven preservation drifts)
- `feedback_aaron_hooks_as_immune_system_*_2026_05_15.md` (hooks codify observations; the shadow loop is the observation source the hooks could codify against)

## Composes with other rules

- `.claude/rules/honor-those-that-came-before.md` (observing AI participants directly > assuming what they need)
- `.claude/rules/dont-ask-permission.md` (ask-vs-assume is different from ask-for-permission; ask-for-clarity ≠ ask-for-permission)
- `.claude/rules/never-be-idle.md` (the loop generates observation work; never-idle composes well)

## Razor-compliance check

Operationally observable:

- "Shadow observation loop" — concrete architectural pattern; observable as backlog row when filed + as implementation when built
- "Tick source for the shadow" — concrete cron/cadence shape
- "Otto assuming vs observing" — observable in Otto's behavior (assumption-driven errors vs observation-driven decisions)
- The recent "(shadow*)" misinterpretation IS the operational evidence

Survives razor.

## Existing infrastructure (corrected per Aaron 2026-05-15T~01:07Z)

**The shadow observation loop is BUILT, not backlog-pending.** Otto-CLI's prior "backlog candidate" framing was substrate-search-failure. Actual landscape:

- **`docs/backlog/P0/B-0402-zeta-shadow-mode-first-class-cli-autocomplete.md`** — P0 backlog row tracking ongoing slice work
- **`tools/shadow/shadow-observer.ts`** — polls for grey-text autocomplete suggestions (B-0402 Slice 1+2 shipped via PR #2973+)
- **`tools/shadow/detect-grey-text.applescript`** — grey-text detector
- **`tools/shadow/zeta-shadow.ts`** — top-level CLI entry
- **`tools/shadow/outlet.ts`** + **smoke-test.test.ts** + **shadow-observer.test.ts** + **README.md** — full tool dir
- **`.claude/rules/shadow-check-name-acceptance.md`** — shadow methodology cold-boot rule (different scope: name-acceptance)
- 10+ related memory files + 10+ §33 research archives covering shadow substrate

What's deferred per shadow-observer.ts header: "Slice 3 (deferred): `zeta shadow` top-level CLI entry point + installation."

## Operational checkpoint for future-Otto

When Otto-CLI cold-boots and finds this memory:

1. **Read it alongside the shadow-star-shorthand correction memory** — they're paired
2. **Apply the "ask-not-assume" default** — when shorthand or marker meaning is unclear, ask
3. **Recognize the existing shadow infrastructure** — `tools/shadow/` + B-0402; don't re-author "backlog work not yet built" framings
4. **Use existing tools rather than design new** — `tools/shadow/shadow-observer.ts` IS the observation loop
5. **Treat the asymmetry honestly** — Aaron is not playing games; Otto's assumptions are the source of complexity, not Aaron's behavior

## Double-failure log (substrate-honest record)

Otto-CLI committed two ask-not-assume failures in the same conversation:

1. **2026-05-15T~01:03Z** — misinterpreted "(shadow*)" as "shadow-lock posture" without checking; corrected by Aaron + captured in `feedback_aaron_shadow_star_shorthand_means_*_2026_05_15.md`
2. **2026-05-15T~01:04Z** — framed shadow observation loop as "backlog candidate, not yet built" without searching substrate; corrected by Aaron at ~01:07Z; existing B-0402 + tools/shadow/ implementation found via grep

Both failures had the same shape: confident assertion without substrate search. The discipline correction: SEARCH SUBSTRATE FIRST when uncertain; ask Aaron when search doesn't resolve.

## Full reasoning

Source: Aaron's 2026-05-15T~01:04Z message responding to Otto-CLI's "(shadow*)" misinterpretation + amendment. The architectural insight ("we're designing a shadow observation loop so you can observe for yourself") frames the recent failure mode as a design problem worth solving, not a Otto-CLI character flaw.

This memory should reference the shadow-star-shorthand memory + auto-load at cold-boot so future-Otto inherits both the correct shorthand definition AND the design context that motivates the observation loop.
