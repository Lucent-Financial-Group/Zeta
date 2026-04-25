# `roms/nec/pcenginecd/` — PC Engine CD / TurboGrafx-CD (1988)

CD add-on

## What to drop here

ROM / disc image / cassette dump files for **PC Engine CD / TurboGrafx-CD**.
Common extensions: see the emulator core's documentation
for your chosen runtime. The directory slug `pcenginecd` matches
the EmulationStation / libretro convention (under the
`nec/` manufacturer branch, so the fully-qualified path
matches a common layout emulator frontends expect).

## License-safety gate — this is a leaf folder

Before dropping a file here, check `roms/README.md` at the
repo root. The protocol-permitted classes are:

- Public-domain releases.
- Homebrew / demoscene productions whose license explicitly
  permits redistribution.
- Official test suites / diagnostic ROMs published by the
  manufacturer as free material.
- Commercially-released-as-free software (documented
  per-title).
- Modern commercial titles **only** if an explicit
  redistribution license is attached in writing.

Forbidden (do not drop here):

- ROM dumps of commercial cartridges / discs without
  license.
- BIOS dumps from retail hardware.
- Anything whose provenance is uncertain — "uncertain"
  defaults to "not allowed".

## Gitignore behaviour

Every file in this folder except this `README.md` is
gitignored via the root `roms/.gitignore` rule (`*` + `!*/`
+ `!**/README.md`). Drop ROMs confidently — git will not
accidentally track them.

## Cross-refs

- `roms/README.md` — top-level protocol.
- `roms/nec/README.md` — the branch folder listing this platform alongside siblings.
