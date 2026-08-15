Audits the 2026-05-11 brief to Don Syme against today's measurements (PR #10817, #10819) and against his **published** positions, fetched and quoted today. One doc, no code.

Per Aaron's correction: the approach-strategy is **public**, because the discipline is stronger than concealment — every characterisation traces to something the person published, good faith and technical intent are assumed without hedging, and where no statement exists the doc says "not stated publicly" and stops. `.claude/rules/engagement-profiles-public-work-only-not-surveillance-dossiers.md` governs; nothing about anyone's inner life is inferred.

## The honest verdict

**The case is not ready to be put to anyone.** Two of Aaron's three criteria fail on measurement, and the reason is our own design choice, not a missing feature.

## The framing finding — arrow-first is why the residue collapsed

Verified independently on `origin/main`: the repo is Kleisli/Arrow throughout (`IntrCtx.fs:34` `ISR<'A,'B>`, `Meno.fs` `Arrow<'a,'b>`, `FerryThrottler.fs:607`, `IsrLift.fs:31`, plus `SoftValue`/`ParseSoft`/`Tracing`) and has **zero `Applicative`** — `rg` over every `.fs`/`.fsi`, exit 1, no matches.

An arrow has both parameters at kind `*`; `Applicative` cannot be *stated* without quantifying over `'F : * -> *`. So #10817's residue collapsing twice was not luck — **the architecture avoids the `* -> *` layer by construction.**

With the precision a language designer will check: we use **an** arrow, not the Haskell `Arrow` **class** (`* -> * -> *`). The instance needs no HKT; the abstraction would. And `ISR` is Kleisli over `Task<Result<_,_>>`, which is genuinely `* -> *` — used monomorphically, never quantified over.

So the claim is **not** "our mathematics requires HKT". It is: *we chose a formulation that does not, and the one construction where we wanted the other formulation — the `NovelMathExt.fs` profunctor lift, needing `p : * -> * -> *` and rank-2 — we cut, because neither IWSAM nor open generics carries either requirement.*

## Syme's objections, quoted and steelmanned (seven, A-G)

All fetched today from `fslang-suggestions#243` and RFC FS-1124, with per-comment links. For each, the doc says honestly whether our evidence answers it. Summary: **for most of them our own measurements agree with him.** Objection D (explicit function passing is shorter and more general) is *supported* by #10817's one-instance-per-site finding. Objection B (the category-theory-empowerment argument) is the one the geometry case runs straight into.

## Governance facts that change the venue

- **#175 "Simulate higher-kinded polymorphism" is CLOSED** (2024-02-07), labels `probably not` + **`needs-clr-change`**
- **#243 is OPEN**, label **`await-csharp-alignment`**
- **Syme publicly stepped back in Jan 2025** (#1403) to an oversight / final-decision role; the "F# Language Design Squad" (@vzarytovskii, @T-Gro) leads

An HKT ask addressed to F# alone is addressed to the wrong half of a gate the team has publicly said is partly CLR-level. Note the asymmetry in our favour: **the `.fsi`-sealed brand #10817 measured needs no CLR change, no C# alignment, and no language change at all.**

## Where the case is STRONGER than framed (flagged, per instruction)

1. **The UoM x generic-math gap.** FS-1124 records that .NET generic math **does not propagate units of measure**; the team chose to *suppress* the `System.Numerics.I*` interfaces on unitized types, with guidance *"For generic math using units-of-measure, use SRTP."* This sits exactly at the intersection the old brief advertised as F#'s unique combination — and it does not compose. Already acknowledged, bounded, needs no new type theory. **More actionable than the HKT ask.**
2. **The 94% citation is a better argument than the brief made it.** It traces to Mündler, He, Wang, Sen, Song & Vechev, *Type-Constrained Code Generation with Language Models* (arXiv:2504.09246) — whose contribution is **type-constrained decoding**, >50% compilation-error reduction. That is a utilitarian bug-reduction claim, which is the register Syme publicly says he prefers. The brief buried it as a statistic in the Python section, where it does not belong: the paper studies **TypeScript**.

## Corrections to the old brief

- `scikit-learn #1250` -> the real artefact is **`python/typing#1250`**, open since 2022-09-01, and its content (`fit` returning `Fitted[Self]`) is better for us than the summary
- **Keras VU#253266 — recommend dropping.** Real (2024-04-16), but it is unsafe deserialization; HKT would not prevent it. Citing it invites the numerology objection
- "Effective HKT via SAIMs + SRTPs (production-ready)" — #10817 confirms IWSAM works, but **FS-1124's own guidance says "Do not use IWSAMs as the basis for a composition framework"**. Citing it as an advantage to that RFC's author fails on first contact
- "3,000+ PRs proving the encoding works" does not support the claim it is attached to
- "Don Syme is the gatekeeper" is half right (see governance, above)

## The N-copies problem we actually have is not HKT-shaped

`ZSet` is implemented independently in F# (602 lines), C# (566), Rust (469), Q# (318) and Go (93). HKT in F# cannot touch any of it — the duplication is cross-language. That lane is `gen/`.

## Two paths for externalized types, costs stated, not ranked

`ShivaGc.fs` collects `DynamicValue` heaps — **values**, not types — and #10819's wall says why that is the only thing that works: types are collectable only at `AssemblyLoadContext` granularity.

- **(a) push HKT into F#** — keeps CLR static checking and interop; pays the gates, the objections, and the ALC wall remains
- **(b) make types values in our own layer** — sidesteps the ALC wall, needs no persuasion from anyone, and is **the direction Syme publicly recommends** (type providers / generators / analyzers). Cost, unsoftened: we forfeit static checking, we own the checker we have not written, and #10819 measured that there is no F# type provider in this repo at all

## Register discipline

Every claim carries `toy` / `unmetered` / `metered` in a ledger (§9). The geometry argument is **`toy`** and the doc names the experiment that would meter it. The ALC finding is `metered` but marked **inherited** — I did not re-run that test. Two prior-brief quotes are marked `unmetered` because I could not locate them.

## Sibling overlap

Reported, not edited: the IR op-set lane, the build-graph drift guard, the untracked `MenoBraidedRMatrix.lean` in the shared checkout. Docs-only, no code touched.

**Auto-merge deliberately not armed.**

Agency-Signature-Version: 1
Agent: shadow
Agent-Runtime: Claude Code
Agent-Model: claude-opus-5
Credential-Identity: AceHack via gh
Credential-Mode: shared
Human-Review: not-implied-by-credential
Human-Review-Evidence: none
Action-Mode: supervised
Task: hkt-case-audit-syme-published-positions
Co-authored-by: Aaron Stainback <acehack00@gmail.com>
