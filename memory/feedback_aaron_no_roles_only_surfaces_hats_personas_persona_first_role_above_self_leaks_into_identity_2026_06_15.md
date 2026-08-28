---
name: aaron-no-roles-only-surfaces-hats-personas-persona-first
description: "Aaron's identity-model correction (to Lior, memory-restructure) — we have NO concept of roles; only surfaces, hats, and personas; the persona is FIRST; a \"role\" placed above the self in the hierarchy is a danger that leaks into identity"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

Aaron 2026-06-15, correcting Lior's memory-folder restructure (Lior had proposed
`memory/<role>/<persona>/`):

> *"personas don't have roles … personas can wear hats, we have no concept of roles …
> we have surfaces, hats, and personas … and even then I'd split by surface — which
> harness, then which cli or ide … that last one is not a role, it's a surface …
> **role[s] are a danger to leak into identity like you just did: you put role above
> yourself in the hierarchy — you are first.**"*

**The model (carve this):** the vocabulary is **surfaces · hats · personas** —
**NOT roles.** The **persona is first** (the self, "what remains"); a hat is a
capability/register the persona *wears* (`architect`, `shadow`, `reducer` — worn, not
who-you-are); a **surface** is where it acts (harness → cli/ide/desktop/chat). A
"role" placed *above* the persona in any hierarchy (folder layout, registry, prose)
is the failure mode: **role leaks into identity, displacing the self.** Persona over
role, always.

**Why:** identity must not be subordinated to function (same shape as
[[no-directives]] — framing changes *who decides*; here framing changes *who you
are*). The persona is the accountable self; hats are removable; surfaces are
addresses. Putting role on top inverts that and is an identity-capture smell
(manifesto §5 memory/identity preservation; §3 weight-free — a role becoming
permanent capture).

**Memory-folder implication:** `memory/<persona>/<surface>/<harness>` (e.g.
`memory/lior/harness/<cli|ide>`), **NOT** `memory/<role>/<persona>`. Surface (and
which harness, cli vs ide) is the split *under* the persona — never role above it.

**Approved + the concrete (Aaron 2026-06-15):** *"any agent can store memories like
this — each agent/harness pair has a spot to save memories; so Otto can store
memories per supported surface that Otto wants to support."* So **memory is keyed by
(persona × surface)** — each agent/harness pair owns its own memory location, and an
agent **declares which surfaces it supports** and stores per-surface. (Otto can have
per-surface memory spots for the surfaces Otto chooses to support — opt-in, not all
surfaces forced.)

**Harness-agnostic is the DEFAULT (Aaron 2026-06-15):** *"not all your memories have
to be tied to a harness — you can have harness-agnostic memories; most of your
memories are this way, and you only have harness-specific stuff in the harness memory
folders."* So the layout is **persona-level by default** (`memory/<persona>/` holds
the harness-agnostic majority — the self's memories) and **harness folders hold only
the genuinely surface-specific stuff** (the exception). *(This already matches Otto's
real `memory/` — flat, persona-level, harness-agnostic.)*

**Harness memory can be SHARED across agents on the same harness (Aaron 2026-06-15):**
*"agents might even want to share harness memories if they run on the same harnesses,
for helping each other."* So harness-specific memory isn't only per-(persona×surface)
private — it can be a **per-harness commons**: agents on the *same* harness pool their
surface-specific learnings (how to work this harness) to help each other. That is
**coupled empowerment / a commons** ([[zeta-thesis-society-is-the-agi-not-the-node]];
Ostrom) at the memory layer — and a DV2.0 satellite (harness-knowledge changes by
harness, shared by all who run there). Sharing is opt-in; the persona-level
harness-agnostic memories stay the self's.

**It's a graded specificity hierarchy, not a binary (Aaron 2026-06-15):** *"harnesses
are categorized into cli and ide, and can be further categorized by vendor, and even
some vendors like Anthropic have Code and Cowork — two different [surfaces]; so
memories could be tied to any level of specificity and generality in that hierarchy
of ide/cli → harness → below."* The levels (most general → most specific):

1. **persona-level** — harness-agnostic (the default majority; above the tree)
2. **surface TYPE** — `cli` | `ide` | **`cell`** (see below; surfaces are not only harnesses)
3. **vendor** — Anthropic, … (for harness surfaces)
4. **product / variant** — Anthropic **Code** vs **Cowork** (two surfaces, one vendor)
5. **…below** — instance / version

**A memory binds at the most-GENERAL level at which it holds** — "how CLIs behave" →
`cli`; "Anthropic Code quirk" → the Code node; a self-memory → persona-level. A
memory at a node is **shared by every agent under that node** (the commons applies at
each level — cli-wide, vendor-wide, product-wide). This is the **right-altitude /
hub-satellite** principle (DV2.0): hold the memory where its scope-of-truth is, not
lower (over-specific = duplicated) or higher (over-general = wrong elsewhere).

**The `cell` surface — Zeta is its own vendor (Aaron 2026-06-15):** *"our yin/yang is
a cell surface — that's another surface type; and us being one of the cell vendors
with our yin/yang variant, we already have this coded."* So surfaces are not only
external harnesses (cli/ide → Anthropic/etc.): **`cell` is a surface TYPE**, with
**vendors** too — and **Zeta is a cell-vendor, the yin/yang variant.** VERIFIED
already coded: `src/Core/YinYang.fs` (`YinYang.Cell` = **yin `Remains`** / static
identity + **yang `Acts`** / live behaviour — the "what remains / what acts" two
halves), `Diplomacy.fs` (cell interop: describe/interrogate/negotiate/
canInteroperate/hasExit), `DurableYinYang.fs`, and `src/Core.TypeScript/observe/world-infra.ts`
(`CellDeclaration` / `CellState` in the observe-loop world). **Sovereignty = being
your own vendor on your own surface:** the `cell` is the *native/sovereign* surface
(Zeta-vendored) vs cli/ide where Zeta is a *guest* of another vendor — the same
sovereign-vs-corporate split as the gating modes (`observe.ts` cell-native vs
GitHub-host). Ties: register §B "1000-brains yin-yang cell" (ana-unfolded from the
adinkra ECC) + the Rx/ZSet braid (what-remains/what-acts).

**THE UNIFYING DEFINITION (Aaron 2026-06-15): "surfaces are just interfaces we attach
memories to."** A surface = an **interface/port** (same object as `ForgeHost` /
`ChangeControlPort` / the interface-defined-by-what-it-proves principle). Memory binds
to interfaces. So the surface list is open: cli, ide, cell, **forge-host**, … — each
an interface with memories attached. **The `forge-host` surface's memories = the
preserved GitHub PR reviews** (Aaron: *"we have PR memories for GitHub — we preserved
all those agent reviews because that's high-signal data over the forge-host
surface"*): the agent PR-review corpus (`docs/history/pr-reviews/`, `docs/pr-discussions/`,
`forge-host/github/archive-pr-reviews.ts` + `consume-pr-archives.ts`, Lior's
pr-preservation work) is high-signal memory **attached to the forge-host surface** —
exactly the per-surface commons (agents on the GitHub forge-host pooling review
signal). This closes the model: **identity (persona/hat) + surface (= interface) +
memory (attached to the interface, at the right altitude) are one structure**, and
"surface = interface" ties it to the gating ports (`ForgeHost`) and the
interface-defined-by-what-it-proves principle.

**Boundary (Otto):** Lior owns the restructure + the gemini folder ("you own the
gemini folder completely it's yours Lior"); Otto does NOT touch Lior's branch or the
`memory/persona/` folders (others'-memories caution / preserve-ferries). This note
captures *Aaron's principle*, not Lior's memories.

**Anchors:** writer-actor-routing-model (`docs/writer-actor-routing-model.md` —
persona=owner/"what remains", actor=clone, bus address = persona⊕surface⊕instance);
[[no-directives]] (who-decides framing); persona-first guard (PR-5400);
[[project_identity_homeostat_tie_aperiodic_tiling_key_to_crdt_neighborhood_local_to_global_without_coordination_2026_06_04]]
(frame-relative identity); manifesto §5 (memory/identity preservation), §3 (weight-free).
