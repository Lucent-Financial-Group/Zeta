# Preservation has ONE namespace per kind — never invent a new place

Carved sentence:

> **When you rescue something, put it where the last agent put it.** There is one
> namespace per KIND of rescue — a **ref** if git can hold it (`archive/<date>-<event>/<name>`
> tags for swept branch tips, `preserve/<scope>-<date>` branches for commits absent from the
> remote), `docs/recovered/<date>-<event>/` for untracked FILES, and `~/.zeta/backups/` for
> anything off-repo. **Never mint a new preservation root.** An agent that invents
> `~/my-rescue-2026-xx-xx/` has made the work unfindable by the next agent, which is the one
> failure a backup cannot survive.

## Why this rule exists

Measured 2026-08-28, while emptying a machine with confirmed failing memory: preservation
had **twelve** conventions across three surfaces —

| surface | found |
|---|---|
| in-repo | `docs/pr-preservation/`, `docs/recovered/`, `docs/recovered-orphan-branches-2026-05/`, `docs/ops/recovery/`, `docs/ops/ruleset-backups/` |
| refs | `archive/*` (366 tags), `preserve/*` (31 branches), `heartbeat/*` (29) |
| on disk | `~/.zeta/backups/`, `~/.zeta/artifacts/`, `~/zeta-forensics/archives/`, `~/preflight-backup-2026-08-28/` |
| ad-hoc | `Zeta_CORRUPTED`, `Zeta_TO_BE_DELETED`, `Zeta-corrupted-2026-05-24`, `worktree-preservation`, `zeta-lior-batch-archive` |

The divergence had begun nesting on itself: `docs/recovered-orphan-branches-2026-05/misc/archive/`
is an *archive* inside a *recovered* tree.

**The rule is written by an offender.** In one session I created
`~/preflight-backup-2026-08-28/`, `docs/recovered/2026-08-28-src-orphans/` and
`docs/recovered/2026-08-28-home-dir-unique/` — three new locations — without once checking
where the previous rescue had gone. Nobody diverges on purpose. Each agent is mid-rescue,
under time pressure, and inventing a path is faster than finding the convention. That is
precisely why it needs to be a rule with a check rather than a norm.

## The four places, and how to choose

Choose by **what you are rescuing**, not by what feels tidy:

1. **A commit that exists nowhere on the remote** → push it. `preserve/<scope>-<date>` (or
   `preserve/local-only-<clone>-<sha8>`). A branch keeps history, authorship and parentage;
   copying its files into a directory throws all three away.
2. **A branch tip being swept** → tag it. `archive/<date>-branch-sweep/<branch-name>`. This
   mechanism already works and holds 366 tags; do not build a second one.
3. **Untracked FILES with no commit** → `docs/recovered/<date>-<event>/`, laid out as
   `<source-dir>/<original-relative-path>` so collisions between sources stay visible.
   Only when there is no commit to push — see #1.
4. **Anything that cannot go in the repo** (keys, bundles, consent-gated material, bulk
   binaries) → `~/.zeta/backups/<date>-<event>/`. One root, dated subdirectory.

## The test before you create anything

> **Has something been rescued before? Where did it go?**
> `git ls-files | grep -i recover` · `git branch -r | grep preserve` · `ls ~/.zeta/backups`

If the answer exists, use it. If you genuinely need a fifth kind, that is a **reviewed diff
to this rule**, not a new directory created at 2am mid-rescue.

## Why unfindable is worse than unbacked-up

A backup nobody can find is strictly worse than no backup: it costs the disk, it costs the
work of making it, and it produces the *belief* that the material is safe. That belief is
the expensive part — the same shape as a check that cannot fail, applied to storage.

## Pointers

- `src/Core.TypeScript/hygiene/audit-preservation-namespaces.ts` — the falsifier: fails when
  a preservation-shaped path appears outside the sanctioned set.
- [`dv2-data-split-discipline-activated.md`](dv2-data-split-discipline-activated.md) — #5
  DV2.0: preservation is a *satellite* keyed by date+event; the four roots above are its hubs.
- [`workitems-mint-with-zetaid.md`](workitems-mint-with-zetaid.md) — the same shape already
  solved for work items: one keying scheme, minted, never invented per-agent.
