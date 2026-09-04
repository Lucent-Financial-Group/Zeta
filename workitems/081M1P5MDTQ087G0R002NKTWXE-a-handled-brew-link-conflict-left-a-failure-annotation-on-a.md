---
id: 081M1P5MDTQ087G0R002NKTWXE
type: bug
state: backlog
priority: P2
slug: a-handled-brew-link-conflict-left-a-failure-annotation-on-a
title: "a handled brew link conflict left a failure annotation on a green macOS job"
created: 2026-09-04T12:17:26.871Z
depends_on: []
composes_with: []
---

# a handled brew link conflict left a failure annotation on a green macOS job

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1P5MDTQ087G0R002NKTWXE-*.md` glob. -->

## How it surfaced

`drift (loud)` on run 33860210941 reported a subject nothing else could see:

```
build-and-test (macos-26) › (step swallowed by continue-on-error)
  1/1 executions failed (100.0%), clean streak 0
  step red, JOB GREEN (no red X anywhere)
```

The job's `conclusion` is `success` and **no step reports `failure`**. The only evidence
anywhere is a check-run annotation:

```
##[error]The `brew link` step did not complete successfully
The formula built, but is not symlinked into /opt/homebrew
Could not symlink bin/wasm2c
Target /opt/homebrew/bin/wasm2c is a symlink belonging to wabt.
```

## What is actually happening

`tools/setup/macos.sh` already handles this collision correctly and deliberately.
`binaryen` and `wabt` both ship `wasm2c`; `ZETA_BREW_LINK_OVERWRITE` declares `binaryen`
the winner with a written reason, and when `brew install binaryen` fails its link phase the
script recovers with `brew link --overwrite binaryen`. The install succeeds, the step exits
0, the job is green.

**The residue is the annotation.** Homebrew's `ofail` emits a GitHub Actions error
annotation when `GITHUB_ACTIONS` is set — `Library/Homebrew/utils/output.rb` `onoe` →
`GitHub::Actions.puts_annotation_if_env_set!`, gated on
`env_set?` = `ENV.fetch("GITHUB_ACTIONS", false).present?`. So a failure we intended to
recover from leaves a permanent `failure` annotation on a green job.

And through the API that is **indistinguishable from a step swallowed by
`continue-on-error`** — which is exactly what `drift-loud.ts` classifies it as, and why its
`SWALLOWED_STEP` subject is keyed on the job: the annotation carries no step name.

## The fix: stop failing, do not stop reporting

`brew install --overwrite` links over a conflicting file during install, so the link phase
never fails. A declared winner now installs with it.

The end state is identical to what the recovery already produced — `brew link --overwrite`
deletes the same `wabt` symlink — so nothing about the resulting toolchain changes. What
changes is that there is no failure on the way, and therefore no annotation.

**The alternative was worse and worth recording.** Unsetting `GITHUB_ACTIONS` for that call
would have suppressed the annotation while leaving the failure happening — hiding a report
rather than removing its cause — and would have blinded Homebrew's CI reporting for every
other formula in the loop.

## Probed, not assumed

`--overwrite` is not in every Homebrew version and this script runs on dev laptops with
whatever brew they have. Support is probed once (`brew install --help | grep -q --
--overwrite`); where it is absent the install-then-relink path is unchanged, so an older
brew keeps working and keeps its annotation. Honest either way.

## What this does not resolve

Whether `drift (loud)` should band a **handled** swallow differently from an unhandled one.
It cannot currently tell them apart, and arguably should not have to — the fix is to not
generate the annotation. Recorded because the next handled-recovery pattern will look
identical.
