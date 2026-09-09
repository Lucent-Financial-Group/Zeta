# Rolling `from-url` auto-accept — the exception is DATA, recorded and expiring (design)

**Work item:** 081M24396B2087G0R000MDMDEA
**Date:** 2026-09-09
**Status:** implemented
**Subject:** `src/Core.TLA/tla2tools.jar` (the only declared row)

---

## 1. The ruling

The maintainer, 2026-09-09, verbatim:

> *"okay i think we can just allow for the roll and update for now, i know that is
> not great from a security point of view but this is not a permanent fix, it just
> until we don't need the new features anymore, we are going to need this exception
> path we can just save the exceptions somewhere and let it not break install.sh."*

Three phrases in that sentence are load-bearing and each one became a mechanism:

| the phrase | the mechanism |
|---|---|
| *"save the exceptions **somewhere**"* | `tools/setup/manifests/from-url-rolling-exceptions` — committed, reviewable, **per-ref** data. Not a flag, not an env var, not a `--force` |
| *"**not a permanent** fix"* | `expires=` on every row, ≤ 90 days after `declared=`, **enforced** by a lint that turns the gate red on the day it passes |
| *"let it not break **install.sh**"* | the scope. Provisioning is unblocked; **no verifier claim is** |

**The security tradeoff is the maintainer's and it was made knowingly. It is not
re-litigated here — it is written down (§6) so the next reader can weigh it.**

## 2. What breaks today, measured

`tlaplus` republishes the v1.8.0 prerelease asset from its own CI, which runs on
pushes to master. **MEASURED 2026-09-09 — four distinct builds in one day:**

| time (UTC) | rev | note |
|---|---|---|
| 12:48:04 | `65fbace` | |
| 15:25:40 | `4ad12e8` | sha256 `82cc5759…` |
| 16:25:36 | `4ad12e8` | sha256 `bb82311b…` — **same rev, different bytes** |
| 21:30:36 | `ede5b88` | sha256 `8836549e…` |

Two of them share a git rev, so **a rebuild is often not a new checker at all,
and the digest cannot tell the difference.** Each rebuild aborts the whole
`from-url` realizer — it is not best-effort, so `install.sh` stops — on every
machine whose cached jar is not the pinned one.

Note *which* machines: the CI cache key hashes `tools/setup/**`, so **every PR
that touches setup at all** takes a cache miss, refetches, and hits the wall.
This PR is one of them.

### 2a. The incident this shipped under

**MEASURED across every open PR while this was being written** — nine PRs from
three authors, 5 to 22 failing checks each, `gate=failure` on several:

```
#17180 failing=5   #17179 failing=9   #17178 failing=8   #17177 failing=20
#17176 failing=22  #17175 failing=19  #17174 failing=22  #17173 failing=21
#17145 failing=15
```

One failing step explains all of them: **`Install toolchain via three-way-parity
script (Unix; GOVERNANCE §24)`** — `install.sh` failing closed on this digest,
which fails *every job that installs the toolchain*. **None of the nine diffs is
the cause.**

**And a re-pin is not a reliable remedy for an outage.** What is MEASURED: three
distinct digests for that one URL in roughly three hours — `bb82311b…` pinned at
18:42, re-pinned to `f629a67c…` at 21:29, and **that re-pin's own CI fetched
`8836549e…` at 21:40**, i.e. the remedy was stale before the run carrying it
finished. A fourth, `ede5b88`, was measured at 21:30 while timing the sweep
for §5.

**WHAT IS NOT ESTABLISHED, and a first draft of this section asserted it:** that
the remedy's half-life is shorter than the merge latency. That was a *rate*
inferred from two intervals, and a peer who produced the figure withdrew it in the
committed record after re-measuring at 22:11 and 22:21 and finding upstream
holding one digest for ~40 minutes. **A re-pin may well hold.** The observations
above stand; the projected cadence does not, and it is retracted here rather than
left as the load-bearing argument. What actually argues for a standing exception
is §2b — the digest cannot tell a meaningful change from a rebuild — plus the
plain fact that the failure mode is fleet-wide and the remedy is manual.

### 2b. A rebuild is often not a new checker — and that is the mirror argument

Two of the day's rebuilds shared a git rev (`4ad12e8`): **same source, different
bytes, no upstream commit between them** — consistent with several matrix legs of
one CI run each uploading the artefact. So the digest, which is the only thing
that says which bytes arrived, **cannot distinguish a meaningful upstream change
from a rebuild of identical source.** Every fleet-wide breakage above may have
been paid for nothing.

This is the strongest available argument for the option the maintainer has not
yet decided: **mirror the measured bytes to one immutable asset under our own
org.** It keeps every property asked for — no jar in git, newest checker, clone
at a tag still sufficient — and removes the breakage window entirely, at the
price of redistributing an MIT-licensed third-party binary. **Put in front of him
with this incident attached rather than decided here.**

## 2c. The governing idea: GRANTED versus ACCIDENTAL exceptions

The maintainer, later the same day, gave this mechanism the frame it should have
been designed under:

> *"yes we need to fully design that exception mechanism to allow certain
> dependencies to roll, whatever is needed here. we dont want security to block us
> on this, we should just keep track of the exceptions we've granted and don't have
> accidental ones like the docker and other ones you called out."*

**An unpinned dependency is not "unpinned" — it is an exception NOBODY GRANTED.**
That reframing is the useful part, because it makes one register out of two things
that looked unrelated: the tla2tools roll is a *deliberate* exception that happens
to be **loud**, and an unpinned base image is an *accidental* one that happens to be
**silent**. The silent ones are the larger number.

MEASURED today, 22 ungranted sites: **12 container base images on mutable tags**
(`node:24-slim`, `oven/bun:1.3.14-alpine` ×3, `mcr.microsoft.com/dotnet/sdk:10.0-noble`,
`runtime:10.0-noble`, `sdk:8.0`, `aspnet:8.0`, the Windows test image), **7
package-manager commands** (nuget/npm/pip), and **3 `curl | sh` sites**
(`tools/setup/install-rust-wasm32.sh:32`, ollama in `.github/workflows/mux-swarm-tick.yml:49`
and `arc-swarm-fanout.yml:78`).

**The target this row is the first instance of: one register of granted exceptions,
and everything outside it fails closed.** Three properties, in the order they
matter:

1. **Enumerable.** "What are we currently letting roll, and why?" has one complete
   answer. A granted exception carries a reason and an exit condition — which is
   what `tradeoff=` and `exitcheck=` are for here.
2. **The accidental ones become VISIBLE, not fixed by fiat.** Nothing obliges us to
   pin all 22; what is needed is a check that can say *these 22 are exceptions
   nobody granted*, so the number is known and shrinking rather than ambient. **This
   composes with `tools/setup/manifests/pinned-refs` (#17166) — it must not become a
   third register.** `pinned-refs` already owns pins written at their point of use
   and already classifies rows fresh / moved / past-horizon / **unknown**; the
   ungranted set is the complement of its rows over the same surfaces.
3. **Security not blocking us is BOUGHT BY the ledger, not by weakening the check.**
   The trade is legitimate precisely because the exceptions are recorded and
   countable. §6 states what an attacker who controls a granted-exception URL can do
   while it is live.

**Not built in this diff, deliberately** — the repository is red at
`Install toolchain…` for three authors, and the unblock ships first. What is built
here is the *shape* the register needs: per-ref rows, a reason, an exit condition, a
recorded acceptance, and a lint that refuses anything malformed.

## 3. Shape

Four surfaces, and the first is the whole design:

1. **`tools/setup/manifests/from-url-rolling-exceptions`** — the declaration.
   One row per ref. Fields: `accept` (a closed set of one: `auto`), `verify`,
   `declared`, `expires`, `exitcheck`, `tradeoff`.
2. **`src/Core.TypeScript/ace/setup-realizers/rolling-exception.ts`** — parse +
   policy + the acceptance record. `activeExceptionFor` is the only function
   that can widen the hole, and it is written to be joyless about it.
3. **`.zeta/from-url-rolling-accepts`** — the record. Untracked, per machine,
   append-only, idempotent.
4. **`src/Core.TypeScript/hygiene/lint-rolling-exceptions.ts`** — the falsifier,
   plus each row's own `exitcheck` run as its own gate step.

### There is no global switch, by construction

`activeExceptionFor` compares dests with `===`. A row reading `*  accept=auto`
matches the literal dest `*` and nothing else. There is no prefix match, no
glob, no wildcard, and no env var — so there is nothing for a future agent to
find and flip. Everything without a row keeps failing closed:

| situation | disposition |
|---|---|
| rolling row, **no** exception | **fails closed** (unchanged) |
| rolling row, **expired** exception | **fails closed**, and the gate is red |
| rolling row, exception, `verify` **fails** | **fails closed**, and the failure is recorded |
| **non-rolling** row, bytes changed | **fails closed** — a supply-chain event, never a rebuild |
| fetch/transport failure | **fails closed** (retried, then thrown) |
| malformed or missing `sha256=` | **fails closed** (unchanged) |
| rolling row, live exception, `verify` passes or is `deferred` | **accepted, loudly, and recorded** |

Two independent refusals guard the non-rolling case: the lint refuses such a row
in the gate, and the realizer refuses to even look one up unless the manifest row
carries `rolling=`.

## 4. The record is the price of the concession

**An auto-accept with no record converts a LOUD failure into a SILENT one, which
is strictly worse than the thing it replaces.** So every acceptance does two
things:

- **prints a banner** naming both digests, the exception's dates, the tradeoff
  doc, `verify=`/`verdict=`, and the fact that *the pin has not moved*;
- **appends a row** to `.zeta/from-url-rolling-accepts`:

```
<dest>  from=<64hex>  to=<64hex>  when=<ISO>  verify=<argv|deferred>  verdict=<not-run|pass|fail>  outcome=<accepted|refused>  expires=<date>
```

`verdict` is the field the requirement turns on. **`not-run` is a first-class
value and is never spelled `pass`** — a `verify=deferred` row records honestly
that nothing judged the bytes. And the record is written on the **refusal** path
too: a failed verification is the most informative event this mechanism can
produce, and it is also what keeps `verdict=fail` reachable rather than
decorative.

Idempotent (discipline #6): the realizer re-fetches on every run while the pin
and the accepted bytes disagree, so a naive append would write one line per
install and bury the event. The dedup identity is the row minus its clock.

**It is emphatically NOT `from-url-rolling-receipts`.** That ledger means *this
digest was judged by a re-measure that passed* and is what buys a moved pin.
Writing an auto-accept into it would be the exact laundering the regime exists to
stop — **accepting is not measuring** — so they are separate files with separate
vocabularies.

## 5. Was auto-RE-MEASURE affordable? No, and here is the number

The requirement was to prefer *auto-update when the models still pass* over
*trust whatever arrives*. **It was tried and measured, and the answer is no,
twice over:**

**(a) Wall clock. MEASURED 2026-09-09**, Apple-Silicon host, OpenJDK 26.0.2.1,
the pinned `workers=1` invocation:

```
bun src/Core.TypeScript/formal-verification/run-tlc.ts --all
  → summary: 52 agree with their pin, 0 do not (out of 52)
  → 363.44s user  16.49s system  107% cpu   5:53.12 total
```

**5m53s**, and that is the cost of a *passing* sweep on the newest build
(`ede5b88`), not a pathological one. Adding six minutes to every `install.sh` on
every dev laptop, CI runner and devcontainer layer, for one dependency, is not
affordable — `install.sh` is already the long pole and already has an
exit-124 class of failures on file.

**(b) It could not run there anyway, and this is the harder blocker.** The
declared `remeasure=` judges the jar against `registry/tlc-models.json`'s
`versionBanner`, which is a **committed restatement of the pin** (a declared
`pinsurfaces=` entry). The accept path is not allowed to rewrite committed pin
surfaces — that would be exactly the hand-bump the whole regime forbids — so the
sweep would fail on a banner mismatch that says nothing about the models.

**(c) And firing the re-measure as the UNBLOCK was declined outright.** Moving
that row is a decision about a *verifier*, and on the cadence measured in §2a it
goes stale within hours. A re-pin was attempted here and correctly rolled itself
back (§8a); it is not the remedy for an outage.

**So `verify=deferred`, and the deferral is not a promise.** It is
`tools/setup/repin-rolling.ts`, which runs that same sweep, *is* allowed to move
the pin surfaces, and refuses to write a digest whose re-measure did not pass.
The mechanism for an inline `verify=` argv is built and tested regardless, so the
next row that has an affordable check can declare one.

## 6. THE SECURITY TRADEOFF

Stated plainly, because it is real.

**While this exception is live, whoever can choose the bytes behind that URL
chooses the model checker this repo runs.** For `src/Core.TLA/tla2tools.jar`
that is anyone who can publish to the `tlaplus` v1.8.0 release tag — a
compromised maintainer account, a compromised CI token, a malicious release-asset
overwrite — plus anyone who can forge the TLS-terminated response to it. **An
attacker with that position could ship a TLC that reports every model as valid**,
and the digest, which was the only thing that ever said which bytes arrived,
would no longer refuse it. Downstream, a green TLA+ lane would then be a
statement about a checker nobody chose. The window is bounded by the `expires=`
date and by the fact that exactly one row exists.

**What is NOT given up**, and what makes the trade takeable:

- **The pin does not move.** `from-url` still pins the old digest, and every
  declared pin surface — `registry/tlc-models.json`'s `versionBanner` and
  `jarSha256`, `docs/INSTALLED.md`, `docs/dependency-status.md` — still names it
  and still disagrees with the accepted bytes. **The TLA+ lane stays red until
  someone runs `repin-rolling.ts`, which re-measures.** So the attacker above
  gets a *provisioned machine*, not a *green verifier claim*: to launder a
  claim they would additionally need a 52-model sweep to pass and a receipt to
  be earned.
- **The record.** Both digests, the clock, and the verdict, on every machine that
  accepted.
- **`lint-verifier-jar-provenance.ts` is deliberately left unchanged.** It still
  reports `on disk hashes to X, the manifest pins Y — a different verifier is a
  different experiment`, which is a *true statement* and remains the loud
  residual signal. Relaxing it was considered and rejected: the exception's whole
  justification is that the divergence stays visible.
- **Fail-closed everywhere else** — §3's table.

**Residual risk this design does not remove:** a hostile build is installed and
*run* by anything that invokes the jar directly rather than through the pinned
registry path, and by anyone who ignores the banner. Auto-accept moves the
decision from "the machine refuses" to "the operator is told"; that is a real
weakening and it is the thing that was bought.

**The standing alternative, unchanged from the earlier design:** mirror the
measured bytes to one immutable asset under our own org. That removes the rolling
hazard entirely at the price of becoming a redistributor of an MIT-licensed
third-party binary. It is the maintainer's call and is recorded, not decided,
here.

## 7. Expiry, and what checks it

Two independent expiries, because a date and a reason can die separately:

| what expires | how it is checked | where |
|---|---|---|
| **the window** | `expires=` is a calendar date; past ⇒ the row is inert in `activeExceptionFor` **and** `lint-rolling-exceptions.ts` fails | gate + install |
| **the reason** | `exitcheck=` — `lint-tla2tools-rolling-premise.ts` fails when **no gate-tier model expects a NAMED temporal property** any more | gate |

The second is the interesting one, and it is in the spirit of
`lint-mathjs-dismissal-premise.ts`. The exception exists downstream of a *reason*:
we track the rolling v1.8.0 prerelease rather than the immutable v1.7.4 release
because v1.7.4 prints `Temporal properties were violated.` where v1.8.0 prints
`Temporal property Deterrence was violated.`, and `registry/tlc-models.json` pins
the named form as an `expectDetail`. **If that expectation ever leaves the
registry, the repo no longer needs what only the rolling build provides, and the
whole row should be retired in favour of an immutable pin** — regardless of what
its date says. That is now a red check rather than a thing someone might notice.

`expires=` is set to the 90-day ceiling deliberately: the real exit condition — a
**stable** tlaplus release carrying the named-property diagnostic — is not ours to
schedule, so a shorter window would buy a renewal ritual rather than new
information. That upstream half needs the network and is a **manual revisit**,
the same honest disposition `pinned-refs` records for its npm-advisory row
(`remeasure=manual:…`); it is stated rather than pretended at.

## 8. How it composes with what already exists

Not a third parallel mechanism — the fourth surface of one:

| surface | owns | this change |
|---|---|---|
| `from-url` + `rolling=` | which bytes, and the diagnosis on a rebuild | reads a new manifest; **default unchanged** |
| `repin-rolling.ts` + `from-url-rolling-receipts` | moving a pin, only after a re-measure passes | **untouched.** Still the only path to a moved pin |
| `pinned-refs` + `refresh-pins.ts` | pins written at their point of use | untouched — different subject (`downloadThenRun` has no kind there, on purpose) |
| **`from-url-rolling-exceptions`** (new) | **whether a rebuild may install without judging** | the gap none of the three covered |

Deliberate borrowings so the four read as one system: whitespace-token grammar;
colon-encoded argv for `verify=`/`exitcheck=`; the same **stated honest limit**
(a hand-written row passes — nothing can tell an earned record from a typed one;
what it buys is that the concession stops being invisible and becomes a
reviewable assertion).

### 8a. A defect found in `repin-rolling.ts`, and fixed here

Attempting a re-pin during this work surfaced a real bug in the sibling tool, so
it is repaired in this diff rather than left for the next person to lose six
minutes to.

**`repin-rolling.ts` could not re-pin from a tree that does not already hold the
previously-pinned artefact** — which is every cold CI cache, every fresh clone,
and every machine whose jar an auto-accept has already replaced. The old identity
was derived from the old *bytes*; with no bytes it came back `null`, the
`identity=` restatement inside `pinsurfaces=` was silently never rewritten, and
the re-measure then failed on a banner mismatch that says nothing about any
model. **MEASURED 2026-09-09: 52 of 52 models "failed" that way, after six
minutes**, and the tool rolled back correctly and unhelpfully.

The previous identity was never actually gone — **it is written down in the pin
surfaces**, which is exactly where the tool is about to rewrite it. So
`identityFromSurfaces` reads it from there when the bytes cannot supply it, and
**fails closed on ambiguity**: zero matches (nothing to move) and two different
matches (surfaces that already disagree) both refuse, with **exit 2 before the
re-measure** rather than exit 1 after it. Bytes remain the primary source when
they exist, because a surface can have drifted and bytes cannot.

Re-run after the fix: `rewrote 2 value(s)` in each pin surface — the digest *and*
the banner — where it had rewritten 1.

**`clone-at-tag-stays-sufficient` is unaffected.** No resolver was added to any
bootstrap surface; `lint-clone-at-tag-is-sufficient.ts` must stay green and
unweakened. The exceptions manifest is read by the realizer that is already
there, and a clone with the file deleted simply fails closed on a rebuild — the
strict behaviour, not a broken one.

## 9. Honest limits

- **A hand-written acceptance record passes.** Same admission the two receipt
  ledgers make. The record is a convenience for the operator and an audit trail,
  never a proof.
- **The `attacker`-word check in the lint is crude.** It cannot tell a good
  security paragraph from a bad one. What it buys is that the section cannot be
  quietly dropped, which is the failure that actually happens.
- **90 days is a POLICY number.** It is a judgement about how long a temporary
  concession may sit unrevisited, not a measurement of anything.
- **The clock is local.** Expiry is a *local action* steered by a local clock,
  which is exactly where `local-time-never-enters-the-shared-fold` puts it; the
  committed declaration, which is the shared artefact, carries no clock at all.
- **This does not make the TLA+ lane green after a roll, and must not.** It makes
  the machine finish installing. Those are different claims and conflating them
  would be the laundering.
- **SO THE UNBLOCK IS PARTIAL, and the residue is named rather than discovered.**
  Once `install.sh` completes, the TLC runs proceed and judge the loaded jar
  against `registry/tlc-models.json`'s `versionBanner` — a committed restatement
  of the pin — so on a rolled build **the TLA+ lane will report a banner
  mismatch**. That is a *true* statement (a different verifier is running) and it
  is deliberately left standing. What changes is the blast radius: an install
  failure fails **every job that installs the toolchain** (20+ checks on the PRs
  above), a banner mismatch fails **only the TLA+ lane**. Measured before/after
  numbers for that claim are not in hand at time of writing and are not asserted.

## 10. Falsifiers

**MEASURED 2026-09-09 — 25 mutants applied one at a time, 25 killed**, with
declared **controls that must SURVIVE** (a green happy-path test proves nothing on
its own). Mutation logs are in each test file's header.

| file | tests | mutants |
|---|---|---|
| `rolling-exception.test.ts` | 36 | 12 killed |
| `lint-rolling-exceptions.test.ts` | 28 | 8 lint + 2 premise, all killed |
| `repin-rolling.test.ts` | 27 | 3 killed |

**One control was WRONG and is corrected in place rather than quietly swapped.**
The re-pin file's first declared control exercised the very function one mutant
mutates, so it died with it — a control inside the mutated unit could never have
been evidence of anything. It was replaced by `substituteAll` and
`rewriteManifestRow`, which were then measured surviving all three. The note is
in that test file's header.

**And the mechanism was run end to end against the real manifest and the live
network**, both directions:

- with the exception row present: `↓ from-url: src/Core.TLA/tla2tools.jar` →
  the acceptance banner → `✓ from-url complete`, and a row appended to
  `.zeta/from-url-rolling-accepts` reading
  `from=bb82311b…  to=8836549e…  verify=deferred  verdict=not-run  outcome=accepted`.
- with the row removed (the control): the realizer **threw** the unchanged
  `rollingRemedy`, exactly as before this change existed.

Wired into `gate.yml` beside `refresh-pins.ts --verify` and
`lint-mathjs-dismissal-premise.ts`, which is where the sibling premise-and-pin
checks already live.
