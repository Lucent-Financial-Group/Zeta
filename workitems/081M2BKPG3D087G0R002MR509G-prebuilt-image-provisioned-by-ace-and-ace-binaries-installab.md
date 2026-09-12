---
id: 081M2BKPG3D087G0R002MR509G
type: task
state: backlog
priority: P2
slug: prebuilt-image-provisioned-by-ace-and-ace-binaries-installab
title: "prebuilt image provisioned by ace, and ace binaries installable in one line"
created: 2026-09-12T20:07:17.869Z
depends_on: []
composes_with: []
---

# prebuilt image provisioned by ace, and ace binaries installable in one line

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M2BKPG3D087G0R002MR509G-*.md` glob. -->

## Origin

Aaron, 2026-09-12, after a day in which four dependency bumps each cost a chain of coupled CI
edits:

> *"except for our specific os tests can we make all other tests rely on a docker image of ours
> with install.sh already installed?"*
> *"yes maybe we spend a bit of time to move our image to use ace over install.sh, we might need
> to publish some ace binaries that can be one line installed for this to work. we could
> eventually make install.sh use ace binaries too."*

## What runtime provisioning costs today, measured

Every item below exists only because jobs provision at RUN time. A prebuilt image deletes the
cause, and the apparatus becomes vestigial rather than something each new job must satisfy:

| cost | why it exists |
|---|---|
| 561 MB of `.deb` per ubuntu job against a mirror at ~1.1 MB/s | apt at run time |
| the whole `.github/actions/apt-archive-cache` action | mitigating that download |
| a 420 s apt budget + `PRE_APT_RESERVE_SECONDS` | bounding it |
| `apt-job-timings.measured.json` + `refresh-apt-job-timings.ts` | proving it fits each job's timeout |
| the slim/standard/full tier roster | limiting what each job installs |
| four coupled edits on #17341 | ONE job joining that governed class |

The #17341 case is the cleanest argument: the `cross-verify` leg that started it would have
needed no provisioning at all -- dotnet would simply have been present.

## THE CONSTRAINT THAT SHAPES THIS, and it is carved

`.claude/rules/clone-at-tag-stays-sufficient.md` anticipated this exact move BY NAME:

> *"A repo must stay buildable and checkable from `git clone` at a pinned tag, with no package
> manager present -- PERMANENTLY, never 'until ace ships'. ace may be the GOOD path and may
> accumulate any amount of use; the moment it becomes the ONLY path, it is an appointed hub and
> manifesto §1 is violated. The discriminator is EXIT, NOT DEGREE."*

And it is not advice: `src/Core.TypeScript/hygiene/lint-clone-at-tag-is-sufficient.ts` refuses
`ace` as a RESOLVER in `tools/setup` and `.github/workflows`. So the third part of the
direction -- *"eventually make install.sh use ace binaries too"* -- walks into a live falsifier,
by design, because the rule was written for precisely this temptation.

**That is a shape constraint, not a refusal.** Sorting the three parts against it:

| part | verdict |
|---|---|
| **image provisioned by ace** | FINE. An image is an optimisation; a clone-at-tag consumer never touches it, so exit is intact. |
| **ace binaries installable in one line** | FINE, and it is distribution rather than resolution. |
| **install.sh uses ace** | ONLY as a fast path with a working fallback. The moment install.sh REQUIRES ace, clone-at-tag is dead and the lint says so. |

## THE BETTER ANSWER: ACE SHIPS THE EQUIVALENT COMMANDS, SO EXIT IS FREE

Aaron, 2026-09-12:

> *"ace could ship with exact 3rd party commands that are equivalent or some array of them.
> then it can run before the binary is installed. but in the end we want ace to be the tip
> where it's super super easy to install on every platform."*

This is better than the fast-path-with-a-fallback shape below, and it dissolves the tension
rather than managing it. If every operation ace performs is RECORDED AS THE CONCRETE COMMAND
(or an array of per-platform equivalents), then a consumer without ace runs those commands
directly. Exit stops being a promise maintained by discipline and becomes a property of the
data: the escape route is the same datum ace itself executes.

**And it is not new machinery -- the pattern already ships.** `tools/setup/manifests/pinned-refs`
carries `remeasure=docker:build:--quiet:-f:<dockerfile>:<context>` -- a colon-encoded command
stored as data in a manifest, so the way to reproduce a pin's measurement travels WITH the pin.
Generalising that field from pinned-refs to every realizer is the whole idea.

**THE DESIGN RULE THAT MAKES IT WORK, and it is easy to get wrong:** ace must EXECUTE the
recorded command, not maintain a parallel implementation of it.

Today `setup-realizers/from-dotnet-global.ts` builds its argv in TypeScript --
`["dotnet", "tool", "install", "-g", tool]` -- while the manifest declares only WHAT to install.
The manifest says what, the code says how. If a "human equivalent" command were added to the
manifest beside that code, there would be TWO copies of how, and they would drift -- a broken
meter, in the vocabulary of 081M2BHMW9N087G0R002ARAQAW: an escape hatch that looks inspectable
and no longer matches what runs.

So the invariant is one copy: the manifest (or realizer declaration) carries the argv, and ace
runs exactly that. Then `equivalent` needs no audit, because there is nothing for the
equivalence to hold BETWEEN. Two copies need an audit and will eventually fail it; one copy
cannot diverge from itself.

**The array is the package-manager-of-package-managers idea again.** One logical operation with
N concrete realisations (apt / brew / dnf / winget / a tarball) is exactly the normalisation ace
already performs across ecosystems -- the array is that normalisation written down rather than
compiled in.

**And it keeps the tip.** ace remains the thing that is super easy to install on every platform
and the path everyone actually uses; the recorded commands are not a competing interface, they
are what ace was going to run anyway, legible. That satisfies the carved discriminator exactly:
a consumer CAN resolve without it, so ace is an oracle chosen rather than a hub that holds.

## The fallback must be EXERCISED, not merely present

This is the part most likely to be got wrong, and this repository already has the vocabulary
for why: a fallback nobody runs is the vacuity class -- it looks like exit and provides none.
So if `install.sh` gains an ace fast path, the no-ace path must be RUN in CI on a schedule, not
just written. An untested fallback is a check that never ran.

## AND THIS MAKES THE REAL FALSIFIER BOTH POSSIBLE AND MANDATORY

The clone-at-tag rule states its own honest limit today:

> *"the real falsifier is 'clone at a tag with no `ace` on PATH and build', which cannot run
> until a second repo exists -- this is the reachable proxy until then."*

Publishing ace as a separately-installable binary is exactly the condition that makes that real
test runnable: there is finally a world where ace is absent and the tree must still build. So
this work does not merely have to RESPECT the rule -- it is what lets the rule finally be
tested. The proxy lint should be replaced by the real thing in the same change that ships the
binaries.

## Staleness: a baked image is a frozen judgement

An image with the toolchain already installed is a crystal in the sense used in
081M2BHMW9N087G0R002ARAQAW -- judgement crystallised once, replayed deterministically. It
therefore has the crystal's failure mode: `install.sh` (or ace's manifests) changing while the
image is not rebuilt is a BROKEN METER, presenting as a frozen, inspectable environment while
silently drifting from what the repo declares. Guard as that rule prescribes: rebuild on a
declared-input change, pin the image by DIGEST (the `tools/setup/manifests/pinned-refs` pattern
already does this for containers, with `update=follow-tag` and a `remeasure=` command), and
make a missed rebuild loud rather than silent.

## Scope limit, stated

This buys nothing for the OS-specific legs. macOS and Windows cannot use a Linux image, and
`build-and-test` across five platforms is where much of the apt cost actually lands. The win is
the Linux-only lint / audit / cross-verify jobs -- which is most of the job count and most of
the per-job setup tax, but not the wall-clock-heaviest matrix.

## Falsifiers

1. **Exit is real:** clone at a tag, no `ace` on PATH, no prebuilt image -- the tree still
   builds and the floor checks still run. This is the rule's real falsifier, unavailable today.
2. **The fallback is exercised:** a scheduled CI lane runs the no-ace path and goes red if it
   rots.
3. **The image cannot silently drift:** changing a declared input without rebuilding the image
   fails a check, rather than producing a green run against a stale environment.
