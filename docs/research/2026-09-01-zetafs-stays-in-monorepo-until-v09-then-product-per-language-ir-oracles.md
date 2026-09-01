# ZetaFS stays in this monorepo until v0.9ish; then product + per-language IR oracles; Ace one-liner last

Scope: product-repo sequencing for ZetaFS, then ZetaDB, then Ace.
Not a license to mint GitHub repos.

Attribution: Aaron 2026-09-01 chat (verbatim intent in quotes below).
Companion ADRs: `docs/DECISIONS/2026-04-22-three-repo-split-zeta-forge-ace.md`
(factory axis) and `docs/DECISIONS/2026-05-14-product-repo-split-decisions.md`
(product axis). First-product design:
`docs/design/2026-08-30-zetafs-first-product-cas-store-per-entity-policy.md`.

Operational status: research-grade

Non-fusion disclaimer: Recording a later split does not create the
repos, does not merge factory and product identities, and does not
promote this file to operational policy. Promotion is a later ADR
edit, not this absorb.

---

## Verbatim intent (2026-09-01)

> keep things in the repo but once we are ready to sign and test our
> fs and such this is when we can split repos
>
> written in multiple languages but a different repo per language, and
> eventually our IR will be the main repo and the other repos are
> generated from the IR and hand written both for the primary language
> oracles so the generated and hand written code can be tested
>
> Every impl of the same thing over and over the AI finds tweaks,
> enhancements, and bug fixes as they go. this is often more
> informative than the tests themselves cause AI often writes vacuous
> tests
>
> we want to do this same thing to release zetadb and ace package
> manager eventually too, and ace package manager will allow for one
> line installs of graph of dependencies and itself at the same time
> so all of zeta can be installed with a one liner eventually. we need
> to publish packages for this to work so those are the first steps
> after getting code into it's own repo.

Working label remains **ZetaFS**. Never `ZFS`.

## Now — stay in the monorepo

ZetaFS is **not** v0.9ish. PR1-PR11 polyfill is in-tree (FORMAT,
FileSync Result, TagBinding, mutbuf, policy, Jumprope, freeze,
placement, crypto, reclaim, CLI). On-disk `ns` is still `git-trees`.
Crash recovery is `toy` until PR12. POSIX mount is PR13. First-product
already said: *Extract-repo later, not now. Do not mint a GitHub repo
as a prerequisite of PR1-PR12.*

`git clone` at a tag stays sufficient per repo when a split happens
(`.claude/rules/clone-at-tag-stays-sufficient.md`). Ace must never
become the only resolver.

## When a split is earned (v0.9ish)

All of:

1. Signed FS (integrity always; encryption profile metered or honestly
   `enc=off`).
2. Crash recovery out of `toy` (PR12 DST corpus, named seed).
3. Tests that fail without the cycle guard / freeze protocol / FileSync
   Result path.
4. Human maintainer says the FS is ready to sign and test as a product.

Then mint **one** product GitHub, not before. Packages publish after
the code is in that repo — that is the first step that makes Ace's
one-liner possible, not a reason to mint early.

## Later shape (not this PR)

| Layer | Repo | How it is written |
|---|---|---|
| IR | main | the generator; handwritten + generated oracles test against it |
| F# / C# / TS / Rust / … | one repo per language | generated from IR **and** handwritten; the delta is the finding |
| ZetaDB | same pattern after ZetaFS | |
| Ace | last on the factory axis (2026-04-22 ADR) | publishes the graph; installs itself + deps in one line |

The re-implementation loop is load-bearing: vacuous tests are a known
failure class here; a second implementation that disagrees is often
the better falsifier.

Do **not** treat generated-only as the oracle. Primary language
oracles stay handwritten so generation drift is visible.

## Ace one-liner

Ace distributes the graph of dependencies **and itself**. That needs
published packages. Sequence:

1. v0.9ish FS, still in this monorepo until signed.
2. Split ZetaFS product repo; publish packages.
3. Repeat for ZetaDB.
4. Ace last; one-liner install of the whole graph.

Stage 3 of the 2026-05-14 product ADR (`.zeta-version` → `ace.toml`)
is that last step, not a flag day.

## What this file does not do

- Does not mint `Lucent-Financial-Group/zetafs` or per-language repos.
- Does not flip FORMAT `ns=bindings`.
- Does not start PR12 DST / invent a simulated computer.
- Does not promote itself to operational. An ADR edit is the promotion.
