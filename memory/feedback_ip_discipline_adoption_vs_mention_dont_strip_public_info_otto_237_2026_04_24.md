---
name: IP-discipline distinction — avoid ADOPTION of trademarked / IP-protected names as factory vocabulary, do NOT strip MENTION of publicly-available information from research / context docs; non-adoption lists MUST name specifics to be useful; Aaron Otto-237 "do we really need to remove pubically avialable information?"; 2026-04-24
description: Aaron Otto-237 after PR #351 drain over-stripped Star Citizen / Star Trek proper nouns (Kirk, Picard, Enterprise, Voyager, Idris, Constellation, MobiGlas, etc.) from the starship-franchise research doc's NON-ADOPTION LIST. The subagent conflated "avoid adoption of trademarked names as factory vocabulary" with "avoid any mention of trademarked names at all." Those are different disciplines. Public fictional-universe names referenced as RESEARCH CONTEXT carry no IP risk; ADOPTING them as Zeta-vocabulary does. The non-adoption list itself is supposed to name the specifics — stripping them defeats the list's purpose.
type: feedback
originSessionId: 1937bff2-017c-40b3-adc3-f4e226801a3d
---

## The rule

**Two different disciplines for trademarked / IP-protected
names:**

1. **Avoid ADOPTION** as factory vocabulary — do NOT call a
   Zeta subsystem "Idris-class" or a Zeta persona "Kirk" or
   document a Zeta feature "MobiGlas". Legitimate IP concern
   (trademark confusion, derivative-work risk).
2. **Do NOT avoid MENTION** in research / context / non-
   adoption lists — saying "Star Citizen has ship classes
   like Idris, Constellation, and Javelin" in a research doc
   is factual reference to publicly-available information.
   Zero IP risk.

Direct Aaron quote:

> *"IP-discipline fixes including removing all Star
> Citizen/Star Trek proper nouns; do we really need to remove
> pubically avialable information?"*

The answer is **no for mention, yes for adoption**.

## The Wikipedia heuristic

**Aaron Otto-237 follow-up test:** *"wikipedia has those proper
nouns"*. If a name is on Wikipedia (or any public encyclopedia
/ fandom wiki / publisher press page), it is publicly-
available information. Wikipedia's entire premise is freely
referencing public facts about commercial and fictional
works — no trademark claim blocks factual reference.

Practical rule:

- **Wikipedia has an article about it** → safe to MENTION in
  research / context / non-adoption-list form.
- **Not on Wikipedia, only in private licensed material** →
  closer look; may still be fine for factual reference but
  verify source-legitimacy first.

The trademark-confusion risk only arises when the factory
ADOPTS the name for its own use (product name, persona name,
module name, surface label). Citing a public fact never
triggers that risk.

## The non-adoption list special case

A NON-ADOPTION LIST is a document that enumerates WHAT NOT
TO ADOPT. Its entire utility depends on naming specifics:

**Useful:**
> Do NOT adopt as factory vocabulary:
> - starship class names: Idris, Constellation, Javelin,
>   Enterprise, Voyager, Defiant
> - faction names: UEE, Xi'an, Vulcan, Klingon
> - branded surfaces: MobiGlas, Spectrum, LCARS

**Useless (what the subagent produced on #351):**
> Do NOT adopt as factory vocabulary:
> - no starship class names
> - no faction names
> - no branded surfaces

The second form doesn't tell a future reader WHICH names
are prohibited. They'd have to guess. A future factory agent
reading "no starship class names" without specifics might
coin "Valkyrie-class" for a Zeta module, not realizing
Valkyrie is a prominent Star Citizen ship. The specifics in
the list are what makes the list enforceable.

## How this fits the broader name-attribution discipline

**Otto-220 / Otto-229 name-attribution** applies to
*contributor / agent names* (Aaron, Amara, Otto-NN, Max).
Those are first-party personal identifiers; Otto-220 says
use role references in factory-authored docs.

**IP-discipline** (this memory) applies to *trademarked /
IP-protected names from external fictional universes or
commercial products*. Different class of concern
(trademark / derivative-work risk vs. first-party-PII /
glass-halo discipline). Different rule set.

Do not conflate:
- Otto-220 strips contributor names from factory prose
- Otto-237 permits mention of public IP; forbids adoption

## Concrete correction owed on PR #351

The subagent's changes on #351 to `docs/research/frontier-
rename-name-pass-2-otto-175.md` went too far in the non-
adoption list. Forward correction:

- Restore specific-name examples in the non-adoption list
  (what NOT to adopt): `Kirk`, `Picard`, `Enterprise`,
  `Voyager`, `Idris`, `Constellation`, `MobiGlas`, `UEE`,
  `Crimson Fleet`, etc.
- Keep the distinction clear: "these are examples of
  ADOPTION-prohibited names; mentioning them in research
  context (as here) is fine."
- Preserve the research-doc IP-discipline framing but
  don't strip mentions.

If #351 has already merged by the time this memory is
written, a follow-up PR restores the examples.

## What this memory does NOT authorize

- Does NOT authorize ADOPTING trademarked names as Zeta
  vocabulary. "Idris-class durability mode" remains forbidden;
  only the MENTION of Idris in a list describing Star
  Citizen's ship classes is permitted.
- Does NOT authorize quoting copyrighted text wholesale.
  Public *facts* about a work (titles, ship classes,
  character names as identifiers) are citable; reproducing
  significant prose or dialogue without license is a
  different rule (copyright, not trademark).
- Does NOT authorize building factory features that mimic
  trademarked UX. A Zeta UI that looks like the Star Trek
  LCARS interface is a derivative-work risk even if we don't
  call it LCARS.
- Does NOT authorize casual use of third-party trademarks
  in public-facing factory materials (marketing copy,
  README.md top-level, product names). Research docs are a
  carve-out; product surfaces are not.

## Retractability-in-action annotation

Aaron Otto-237 follow-up: *"restore IP specifics good example
of retractability in action"*. The sequence:

1. Original research doc had the IP specifics.
2. Drain-subagent over-applied the IP-discipline rule and
   stripped them.
3. The over-strip merged to main (PR #351).
4. Aaron's next-session review flagged the over-strip.
5. Otto-237 captures the clarified rule.
6. Follow-up PR restores the specifics on main.

Main's history shows BOTH states (the strip and the restore),
not just the final state. That's the factory's retractability
principle at the merge-layer: a decision can land, be
discovered wrong, and be reversed without erasing the
mistake. The visibility of the mistake IS the glass-halo
guarantee.

**Pattern-recognition value:** future Otto should tag similar
reversal sequences as "retractability-in-action" in tick-
history / ROUND-HISTORY entries. These cases are proof-points
for the factory's reversal capacity; they're not failures to
hide.

## Composition with prior memory

- **Otto-73 retractability-by-design** — the factory principle
  this memory is an instance of. Decisions can be reversed
  when evidence warrants; reversal leaves a visible trail.
- **Otto-220 code-comments-not-history** — orthogonal;
  applies to contributor names in code comments, not IP.
- **Otto-229 append-only** — orthogonal; applies to audit-
  trail file immutability.
- **Otto-231 glass-halo first-party PII** — orthogonal;
  applies to Aaron's own personal information.
- **Otto-236 reply+resolve pair** — orthogonal; applies to
  review-thread state.
- **Otto-176 starship-franchise research memory** —
  companion. That memory established the starship-franchise
  research direction; this memory refines the IP-discipline
  scope to permit mention.

## Direct Aaron quote to preserve

> *"IP-discipline fixes including removing all Star
> Citizen/Star Trek proper nouns; do we really need to
> remove pubically avialable information?"*

Future Otto: mentioning trademarked names as factual
reference in research / context / non-adoption lists is
fine. Adopting them as factory vocabulary is the
prohibition. Non-adoption lists MUST name specifics to be
enforceable.
