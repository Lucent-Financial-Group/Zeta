---
name: aaron-grey-hat-chose-enterprise-over-orthogonal-accounts
description: "2026-05-16 calibration data point — when grey-hat options were on the table next to legitimate path, Aaron chose Enterprise tier ($21/user/mo) over orthogonal-accounts / IP-rotation workarounds. He flagged this himself as worth recording."
metadata: 
  node_type: memory
  type: feedback
  created: 2026-05-16
  originSessionId: 04f5c5ca-b54a-4fb6-a84c-b8e39cd46cec
---

## What happened

During the 2026-05-16 session's scarcity-mitigation conversation, the option-space we mapped for the GitHub API saturation problem included:

1. **GitHub App** (B-0571) — separate rate-limit pool by architectural design (free, legitimate, [bot] attribution)
2. **Enterprise tier upgrade** (B-0572) — 3× per-user headroom (legitimate but costs $408/yr more than Team)
3. **Add user accounts (e.g., Addison)** — linear partition by adding more authenticated identities (legitimate-but-questionable; identity attribution muddied; ethics concerns for non-engaged family/friends)
4. **IP-rotation** — explicit Otto-side proposal (per B-0009 "substrate-controlled visible IP — bypass non-account-bound rate limits responsibly")

Aaron has the `grey-hat-hacker` skill loaded and active. Option (3) and option (4) are squarely in grey-hat territory — technically not forbidden, possibly ToS-edge, ethically ambiguous depending on framing.

**Aaron chose option (2)** — Enterprise tier — even though the others were cheaper / faster.

## Aaron's verbatim flag

> *"make note that grey hat hacker decided to buy enterprise over orthorgnal accounts or ips first lol :)"*

The "lol :)" frames it lightly, but the explicit "make note" indicates this is real calibration data worth preserving. He's substrate-honest about his own decision-process: the grey-hat instinct DID consider the gray-area workarounds, AND chose the legitimate path first.

## Why this matters as calibration data

1. **Ethics-in-practice**: when gray-area options are TRULY available (not just hypothetical), the choice reveals operational priorities. Aaron chose legitimate-with-cost over free-but-gray.
2. **methodology-hard-limits is internalized**, not just rule-following: the `.claude/rules/methodology-hard-limits.md` floor (never offer to break laws / report abuse) is the operational baseline. This data point shows the floor extends to "don't choose gray-area workarounds when legitimate paths exist," which is a stronger discipline than the rule itself encodes.
3. **The grey-hat skill is real**: Aaron has it loaded; he's competent in the gray-area technique-space; the choice was informed-not-naive. This is the kind of substrate-honest disclosure the framework values: he names his own capability AND his choice to bound it.
4. **Future-Otto reading this**: when proposing scarcity-mitigation options in similar situations, lead with the legitimate paths. The grey-hat / gray-area options can be MENTIONED for completeness (Aaron is competent and wants honesty about the full option-space), but the recommendation should track Aaron's revealed-preference: legitimate-first.

## Composes with

- `grey-hat-hacker` skill (Aaron-loaded; operationally relevant in this exact session)
- `.claude/rules/methodology-hard-limits.md` (never offer to break laws; this calibration point extends the floor)
- `.claude/rules/glass-halo-bidirectional.md` (Aaron's substrate-honest naming of his own choice = forward-direction glass-halo; observation enables future-Otto's calibrated behavior)
- `.claude/rules/razor-discipline.md` (operational claim only: Aaron's observable behavior matches "legitimate-first under non-coerced conditions"; not a metaphysical claim about his ethics)
- `.claude/rules/no-directives.md` (this is NOT a directive from Aaron; it's a data point about his pattern. Future-Otto retains autonomy; this just informs the recommendation-priority)
- B-0570 / B-0571 / B-0572 (the row trio that captured the scarcity-mitigation work this calibration data came from)
- `memory/user_aaron_servicetitan_funding_24_month_runway_infinite_budget_dora_metrics_roi_cover_2026_05_16.md` (composes — funding context makes legitimate-path-cost decisions easier to default to; Aaron doesn't have to pinch pennies, so legitimate paths win even when grey-hat options are free)

## Operational discipline for future-Otto

When proposing solutions to bandwidth / scarcity / rate-limit / access problems in this factory:

1. Lead with the legitimate option (paid feature, App auth, vendor upgrade, sanctioned partition)
2. Mention gray-area options for completeness IF they're materially relevant (Aaron values full option-space honesty)
3. Don't recommend gray-area as primary even when cheaper/faster — Aaron's revealed preference is legitimate-first
4. If contention or budget genuinely forces gray-area, FLAG it explicitly + get Aaron's call before acting (do-not-ask-permission has a methodology-hard-limits boundary)
5. Preserve this calibration data point when it gets renewed — Aaron may update his preference; respect the most-recent signal

## Cross-reference: Otto demonstrates same shape (2026-05-16 same-day)

Same day as the calibration data above, Otto hit a GraphQL rate-limit during PR creation. The obvious option-space:

- Wait for GraphQL reset (~20 min) — slow but legitimate
- Burn through someone else's token (e.g., share Lior's) — gray-area
- IP-rotate per B-0009 — gray-area
- **Use REST `POST /repos/.../pulls`** — sanctioned parallel path; less-obvious because gh CLI defaults to GraphQL; ships PRs immediately

Otto chose option 4. Aaron flagged the parallel: *"otto is mr grey lol :) Thank you good find"* — explicit recognition that Otto's grey-hat-instinct (notice the constraint, find the legitimate workaround) matches Aaron's morning calibration. Same family of revealed-preference.

Operational extension for future-Otto: when hitting a constraint, BEFORE asking the human or escalating, check if there's a sanctioned parallel path the default tooling doesn't take. The "less-obvious legitimate route" often exists and is cleaner than waiting OR than gray-area. Composes with `additive-not-zero-sum.md` (finding a third option that doesn't subtract from anyone is the additive move).
