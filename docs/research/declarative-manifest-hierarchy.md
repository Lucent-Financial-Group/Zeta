# Declarative manifest hierarchy — design for Zeta

**Round:** draft (targeted for a post-round-35 dedicated round)
**Status:** draft | pending human maintainer review
**Scope:** retrofit Zeta's flat `tools/setup/manifests/` onto
`../scratch`'s three-feature declarative discipline: `@include`
hierarchy, `BOOTSTRAP_MODE` (min vs all), `BOOTSTRAP_CATEGORIES`
(orthogonal selectors). One design doc covering three BACKLOG
entries because the features compose; splitting would force
rework.

## What `../scratch` teaches (paraphrased, not copied)

Three layered primitives, each implementable on top of the
previous, landed as one coherent feature set.

### Primitive 1 — `@include` directive (~6h to port)

Lines starting with `@<name>` inline the contents of the named
manifest. Example from `../scratch/declarative/python/tools/all.uv-tools`:

```
@min
```

`all.uv-tools` is exactly that one line — it inherits everything
from `min.uv-tools` (`poethepoet`, `ruff`). Adding a dev-only
tool means appending to `all.uv-tools` after the `@min` line;
the min / CI manifest stays lean.

Same pattern on apt (`../scratch/declarative/debian/apt/min.apt`
starts `@bootstrap` then lists dev libs). Resolution rules:

- `@<name>` matches a sibling manifest by filename stem
- Recursive: `all` → `@min` → `@bootstrap`
- Cycle detection: fail-loud if `@a → @b → @a`
- Comments: `#` at line start; `@` recognised before `#` strip

### Primitive 2 — `BOOTSTRAP_MODE=minimum|all` (~8h to port)

Env var selects the root manifest. `BOOTSTRAP_MODE=minimum` picks
`min.<manifest>`; `BOOTSTRAP_MODE=all` picks `all.<manifest>`
(which via `@min` still includes the minimum set).

Cost contract: `minimum` is what CI runs; `all` is what a
contributor runs on their laptop. CI minutes drop because the
minimum manifest is strict-subset of the dev manifest — no
surprise rebuilds, no CI-only tool debt.

### Primitive 3 — `BOOTSTRAP_CATEGORIES=quality database` (~12h to port)

Space-separated category selectors layer ON TOP of the
`BOOTSTRAP_MODE` base. `BOOTSTRAP_CATEGORIES="quality database"`
with `BOOTSTRAP_MODE=minimum` installs:
`min.<manifest> + quality.<manifest> + database.<manifest>`.

Categories Zeta might want (pending Dejan + human sign-off):

- `quality` — linters (shellcheck, markdownlint, semgrep, ruff)
- `lean` — elan + mathlib toolchain
- `docs` — markdown tooling, link checkers
- `native` — clang / system libs for native-build work
- `db` — sqlite3, duckdb, parquet-tools (if DB lane grows)

Composition rule: categories are additive; `@min` inherits
still apply inside each category manifest; duplicates resolve
to a single install step.

## Zeta's adoption — decisions locked / open

| Decision | Source | Choice | Rationale |
|---|---|---|---|
| Adopt all three features | `../scratch` | yes | Solves Python + Bun tool-set growth before copy-paste debt compounds |
| Port order | Zeta | 1 → 2 → 3 | Each primitive is independent-usable; `@include` alone already fixes flat-manifest copy-paste |
| Manifest extensions | Zeta | existing `apt`, `brew`, `dotnet-tools`, `uv-tools`, `verifiers` stay bare; new files follow `min.<ext>` / `all.<ext>` shape once Primitive 2 lands | Backward compatible; existing tooling keeps working |
| Category list | open question 1 | TBD | Depends on which axes of orthogonality matter to Zeta |
| Reserved category names | open question 2 | TBD | `bootstrap` reserved? `min` reserved? Fail-loud if a user manifest takes the name |
| Error on unknown `@name` | Zeta | fail loud | Silent no-op hides manifest typos; CI should red on them |

## What Zeta borrows

| From scratch | Why it fits |
|---|---|
| `@include` directive syntax | Simple, readable, no DSL; any editor highlights comments the same |
| Cycle detection on recursive includes | Essential for user safety; three-line implementation |
| `BOOTSTRAP_MODE` / `BOOTSTRAP_CATEGORIES` env-var shape | No config file; works identically on laptop / CI / devcontainer |
| Manifest-per-file-type directories | `apt/`, `python/tools/`, `dotnet/tools/` — makes adding a new tool type one file drop |

## What Zeta does NOT borrow

| From scratch | Why not |
|---|---|
| scratch's Debian-specific `.apt` bootstrap list | Zeta's apt manifest is already smaller; port only what Zeta needs |
| scratch's Windows branch | Zeta's Windows branch is backlogged; port alongside that work |
| scratch's full category list (runner / cli / etc.) | Categories are project-specific; Zeta picks its own per the table above |

## Proposed layout after Primitive 1 lands

```
tools/setup/manifests/
  apt              # existing flat file (kept working)
  brew             # existing flat file
  dotnet-tools     # existing flat file
  uv-tools         # existing flat file
  verifiers        # existing flat file

  # new hierarchical manifests (Primitive 1 lands them alongside)
  min.apt          # CI-minimum
  all.apt          # @min + dev-only additions
  min.uv-tools     # CI-minimum
  all.uv-tools     # @min + dev-only additions
```

Install.sh gains a resolver: if `min.<ext>` exists, honour the
hierarchy; else fall back to the flat filename. Fully
backward-compatible.

## Cost estimate

| Primitive | Port hours | Net effect on CI minutes |
|---|---|---|
| 1 `@include` | 6h | 0 (same manifests, just deduplicated) |
| 2 `BOOTSTRAP_MODE` | 8h | -20 to -40% (CI drops dev-only tool installs) |
| 3 `BOOTSTRAP_CATEGORIES` | 12h | -30 to -50% additional for category-slim CI stages |

## Open questions for the human maintainer

1. **Category list.** Which orthogonal axes matter? Candidates:
   `quality`, `lean`, `docs`, `native`, `db`. Pick 3-5; defer
   the rest.
2. **Reserved names.** Are `min`, `all`, `bootstrap` reserved?
   (Recommendation: yes; fail-loud if a user manifest takes
   these stems.)
3. **Env-var precedence.** If both `BOOTSTRAP_MODE=minimum`
   and `BOOTSTRAP_CATEGORIES="quality"` are set, installed set
   is `min + quality`. Confirm.
4. **CI surface.** Should `gate.yml` default to
   `BOOTSTRAP_MODE=minimum` and add categories per-job? Or
   stay on the flat manifest until Primitive 2 proves out?
5. **Devcontainer.** When `.devcontainer/` lands, which mode /
   categories does it use? (Recommendation: `all` with no
   categories — contributor devcontainer is full-fat by
   intent.)
6. **Error shape.** A missing `@included` manifest — exit 1
   with stderr line pointing at the source manifest + line
   number? Match scratch's exact shape.

## What lands after sign-off

Dedicated round, sequenced:

1. Primitive 1 (@include resolver in install.sh) — 1 round.
   Reviewer floor: Kira + Rune + Dejan self-review + bash-expert
   hat. Ship with 5-8 test cases in `tools/setup/tests/` (bats
   per the existing backlog entry).
2. Primitive 2 (`BOOTSTRAP_MODE`) — next round.
3. Primitive 3 (`BOOTSTRAP_CATEGORIES`) — round after.

Each primitive ships as its own PR with its own human sign-off;
no bundling. Rollback path: flat-manifest fallback stays alive
until Primitive 3 has been green on CI for 5+ rounds.

## References

- `../scratch/declarative/` — read-only borrow surface
- `../scratch/scripts/setup/unix/bootstrap.sh` — resolver shape
- `docs/research/build-machine-setup.md` — install-script
  rationale
- `docs/research/ci-workflow-design.md` — CI minutes cost
  model the `BOOTSTRAP_MODE` savings plug into
- `docs/BACKLOG.md` — the three entries this doc consolidates:
  "Manifest `@include` hierarchy", "`BOOTSTRAP_MODE`",
  "`BOOTSTRAP_CATEGORIES`"
- `.claude/skills/devops-engineer/SKILL.md` Step 7 — the
  generic-by-default portability check; this manifest work
  stays in generic scaffolding, specific manifests in the
  category dir
