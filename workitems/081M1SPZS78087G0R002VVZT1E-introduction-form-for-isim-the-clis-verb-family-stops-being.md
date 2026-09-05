---
id: 081M1SPZS78087G0R002VVZT1E
type: task
state: backlog
priority: P2
slug: introduction-form-for-isim-the-clis-verb-family-stops-being
title: "Introduction form for ISim: the clis verb family stops being uninhabitable"
created: 2026-09-05T21:18:28.072Z
depends_on: []
composes_with: []
---

# Introduction form for ISim: the clis verb family stops being uninhabitable

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1SPZS78087G0R002VVZT1E-*.md` glob. -->

## The gap

`tests/Tests.FSharp/Clis/Verbs.Tests.fs` states it by reflection rather than prose:

> *"An interface family with eliminators and no introduction form is uninhabitable as a pipeline by
> construction — no amount of implementation effort produces the first value."*

Six members of the `clis` verb family CONSUMED an `ISim<'a>`; none returned one. That is BREAK A.

## What was done

`IGenVerb.Gen<'a> : 'a -> ISim<'a>`, inherited by `ICli`.

**Scoped so it does not answer a question reserved for the maintainer.** `Verbs.Tests.fs` lists
three readings of *"what does `sim` return"* and picks none, because choosing decides the semantics
of the universal interface. All three readings require *some* way to produce the first value, and
reading 2 says so outright ("a builder, the room, or `SimVerb`") — so declaring the form takes
nothing off the table.

**Answered narrowly:** reading 1's objection, that `Sim: ISeed * TimeSpan -> ISim<'a>` makes `'a` a
return-position-only parameter chosen out of nothing. `Gen<'a>: 'a -> ISim<'a>` takes `'a` from the
argument. That answers an objection to a *mechanism*, not the reading.

**Left open:** what `sim` means, which reading is right, and BREAK B (`mea` and `cut` both consume
the sim, so the documented pipe does not chain). Under the free-object reading BREAK B is not a
defect and the *doc* is wrong; under reading 3 it is a real defect. Not picked here.

## Verification

Non-vacuity by mutation: changing `Gen`'s return type to `unit` COMPILES (0 build errors) and fails
the revisited test. `Zeta.sln` builds 0 warnings / 0 errors; 7/7 clis verb tests pass.
