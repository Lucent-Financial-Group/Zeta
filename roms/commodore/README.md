# `roms/commodore/` — Commodore branch folder

This is a **branch folder** in the ROM hierarchy. It
enumerates platforms grouped under the Commodore label. It
is **not empty** — it contains one subfolder per supported
platform, each with its own sentinel `README.md`.

## Children (3 platforms)

- [`c64/`](c64/) — Commodore 64 (1982)
- [`amiga/`](amiga/) — Commodore Amiga (1985)
- [`vic20/`](vic20/) — Commodore VIC-20 (1980)

## What to drop here

**Nothing.** ROMs belong in the child leaf folders, not at
this level. If an emulator frontend points at this directory
as a load path, point it at a specific child instead.

## Why a branch-folder sentinel exists

Aaron asked (autonomous-loop, 2026-04-24):

> *"but if per folder should not say empty when it has
> subfolders"*

Translation: branch folders need their own sentinel prose
so the tree self-documents — opening `commodore/README.md`
tells a maintainer or fresh agent which platforms live under
this label and where to drop files.

## License-safety gate

The top-level `roms/README.md` protocol governs every child
folder. No per-platform carve-outs: if the file isn't safe
under the top-level protocol, it isn't safe anywhere in the
tree.

## Cross-refs

- `roms/README.md` — top-level protocol + the sentinel-pair
  pattern rationale (parity with `drop/` and
  `references/upstreams/`).
- `roms/commodore/<platform>/README.md` — the leaf sentinel for
  each child platform.
