# `roms/fbneo/` — FinalBurn Neo arcade emulator (2019)

Successor to FBA (Final Burn Alpha). Uses MAME-compatible ROM-set conventions. This folder IS the canonical FBN `roms/` load path — drop ROM-set ZIPs directly here.

## What to drop here

Arcade ROM-set ZIP files for the FinalBurn Neo arcade emulator. Each ZIP is
typically one title's ROM set named by its parent-set
short-name — e.g. `pacman.zip`, `sf2.zip`, `mslug.zip`.
Drop ZIPs directly in this folder.

CHD files (compressed hard-disk images) for arcade titles
that require them live alongside the ZIPs in this same
folder, matching the emulator's canonical load layout.

## Why `roms/fbneo/` is top-level (not under `arcade/`)

Aaron (autonomous-loop, 2026-04-24):

> *"mame is separate we don't need per emulator folder like
> that we will treat mame as it's own top level folder under
> roms"*

Arcade is a software-runtime concept, not a manufacturer —
there's no "Arcade Inc." that made these machines. Different
arcade emulators (MAME, FBN, Raine, etc.) each have their
own ROM-set conventions and compatibility envelopes, so
each gets its own top-level folder. `roms/fbneo/` IS the
canonical ROM-set folder the emulator expects — no extra
`roms/` nesting (Aaron corrected that mid-design).

## License-safety gate — this is a leaf folder

Arcade ROM sets are the most fraught class for
redistribution — nearly every commercial arcade title's
ROM set is copyrighted and NOT freely licensed. Before
dropping a file here:

- Public-domain arcade homebrew (some demoscene releases,
  open-source arcade clones) — OK.
- Commercially-released-as-free sets (verify per-title;
  vanishingly rare) — OK per-title.
- Anything else — **forbidden**. That includes the vast
  majority of `.zip` sets a casual web search turns up.
  "Uncertain" defaults to "not allowed".

See `roms/README.md` (top-level) for the full protocol.

## Gitignore behaviour

Every file in this folder except this `README.md` is
gitignored via the root `roms/.gitignore` rule (`*` +
`!*/` + `!**/README.md`). Drop ZIPs and CHDs confidently —
git will not track them.

## Cross-refs

- `roms/README.md` — top-level protocol.
- `roms/fbneo/README.md` — sibling arcade runtime (FBN).
