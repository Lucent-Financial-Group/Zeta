---
id: B-0083
priority: P1
status: open
title: Atari 2600 ROM canonical-naming + safe-vs-unsafe folder split + TOSEC/Good-Tools-style hash-lookup tooling (Aaron 2026-04-28)
effort: M
ask: build a hash-lookup-based ROM canonical-namer that ingests the messy roms/atari/2600/ folder (3461 files), renames each to canonical TOSEC or Good-Tools form, and splits into gitignored-bulk vs tracked-safe folders per the existing license-safety gate. Replicate the datfile-based functionality so list-updates flow through our factory.
created: 2026-04-28
last_updated: 2026-04-28
schedule_after: 0/0/0 AceHack-LFG hard-reset complete
tags: [aaron-2026-04-28, roms, atari-2600, tosec, good-tools, canonical-naming, datfile, license-safety, gitignore-already-protects, high-priority-after-0-0-0]
---

# B-0083 — Atari 2600 ROM canonical-naming + tooling

## Source

Aaron 2026-04-28T18:55Z verbatim:

> *"I just put a bunch of messy roms int your Atari 2600 folder, can you
> organize them connonicaly for easy finding, feel free to spend some
> time doing research, these folders should be ignored and not checked
> in but you can reference any of them you want in readmes as games you
> can test out locally, we don't want to distribute atari roms, we can
> manually selelct check in any that won't get us in trouble for sharing
> on github for any that's follow those rules and licenses. we maybe need
> different non git ignored folder for those special ones that are safe.
> Please name them all connonically and probably does not need to be
> zipped, there are tools that can help you likely with naming them, like
> to tosec and good tools, i don't know if they run on mac but you can
> look at their source to figure out how it workds it's proabaly some
> database file you can check agants sha or md5s or sometime based on the
> latest list. Lets make sure we can replicate that functionalty here on
> list updates if that's how it works, we can backlog this but hight
> priortiy right after the 0/0/0 starting point"*

## Current state (verified 2026-04-28T18:53Z)

- **3461 files** in `roms/atari/2600/` — mix of `.bin` and `.zip`,
  some Good-Tools-style canonical names (`Title (Year) (Publisher)
  [!]`), some uncanonical (`Jammed.bin`, `seantsc.bin`).
- **`roms/.gitignore` already fully protects** with depth-limited
  pattern (`*` + `!*/` + `!/README.md` + `!/*/README.md` +
  `!/*/*/README.md`). The 3461 ROMs are NOT at risk of accidental
  commit. README.md is the only tracked file. **No emergency action
  required.**
- **`roms/atari/2600/README.md` already documents the license-safety
  gate**: PD / homebrew-with-permissive-license / official-test-ROMs /
  commercially-released-as-free / explicit-license-commercial = SAFE;
  uncertain provenance defaults to FORBIDDEN.

## Why high-priority + scheduled-after-0/0/0

Aaron's explicit verbatim: *"we can backlog this but hight priortiy
right after the 0/0/0 starting point"*. Decoded:
- Priority: P1 (high)
- Trigger: AceHack-main and LFG-main reach 0/0/0 (per the hard-reset
  audit already in flight; see PR #677's 5-disciplines memory + the
  pull-queue work this session).
- NOT before 0/0/0 — the substrate cleanup is the blocking
  dependency.

## Background research (TOSEC + Good Tools)

### TOSEC ("The Old School Emulation Center")

- Datfile format: XML, one `<datafile>` per platform.
- Each `<game>` entry has `<rom>` children with `name`, `size`,
  `crc`, `md5`, `sha1` attributes.
- Canonical naming convention (TOSEC Naming Convention 2015 / TNC15):
  `Title version (Demo) (Date)(Publisher)(System)(Video)(Country)(Language)(Copyright)(Devstatus)[Cracked][Trainer][Hacked][Modified][Pirated][Bad][Verified][More Info]`
- Datfiles available from: <https://www.tosecdev.org/> + GitHub
  mirrors (e.g. `TheTOSECteam` org).
- Atari 2600 platform-slug: `Atari 2600 (TOSEC)`.

### Good Tools (a.k.a. GoodSets)

- Created by Cowering. Discontinued ~2011 but datfiles remain
  authoritative for older ROM-set hash matching.
- Atari 2600 set: `GoodA26` (typically `GoodA26 v3.27` or similar).
- Naming convention: `Title (Year) (Publisher) [code]` where code is
  `[!]` (verified good), `[a1]` (alternate), `[b1]` (bad dump),
  `[h1]` (hack), `[o1]` (overdump), `[t1]` (trainer), `[T+ENG]`
  (English translation), etc.
- Source for GoodA26: search GitHub for `GoodTools-A26` mirrors;
  the original distribution was `GoodA26.zip` containing the EXE
  + datfile.

### Algorithm (replicated in factory tooling)

1. **For each file in `roms/atari/2600/`**:
   - Extract: if `.zip`, get the inner ROM bytes.
   - Compute SHA1 + MD5 + CRC32 of the ROM bytes.
2. **Lookup in datfile**:
   - Match by SHA1 first (most discriminating).
   - Fall back to MD5 → CRC32 if SHA1 absent.
   - If no match: file is unrecognized; flag for manual review.
3. **Rename to canonical form**:
   - Use TOSEC TNC15 OR Good-Tools convention (pick one as
     factory standard; recommend TOSEC for ongoing maintenance
     since GoodTools is discontinued).
4. **Classify license-safety**:
   - Match against the README's permitted classes (PD, homebrew,
     official-test, commercially-released-as-free, explicit-license).
   - The TOSEC `<game>` element's `<description>` and
     `<comment>` fields sometimes carry license metadata; if not,
     fall back to a curated allowlist (e.g.
     `homebrew-allowlist.txt`).
5. **Move to safe vs unsafe folder**:
   - Safe: a NEW non-gitignored tracked folder
     (`roms-safe/atari/2600/` or similar).
   - Unsafe: stays in `roms/atari/2600/` (gitignored).
6. **README cross-references**:
   - Update `roms/atari/2600/README.md` to list the safe ROMs
     by canonical name with a one-line summary + license citation.
   - Optional: list the unsafe ROMs available locally (filenames
     only, no distribution) so future-Otto knows what's available
     for testing.

## Tooling design — replicate, don't depend on TOSEC binary

The TOSEC reference tool (`TOSECdev/tosec-cli`) is .NET
Framework-based and may not run cleanly on Mac. The Good-Tools EXE
is Windows-only. **Don't depend on either binary**; instead:

- **Build a pure-Python (or pure-bash) tool** that:
  1. Downloads the latest TOSEC Atari 2600 datfile (XML) from
     a versioned URL (or mirrors it locally per the version-
     currency Otto-247 discipline — search for latest before
     asserting which version).
  2. Parses the XML, builds a `dict[sha1] = (canonical_name,
     license_class, ...)`.
  3. For each file in `roms/atari/2600/`, computes SHA1, looks
     up, renames + moves.
  4. Refresh-on-demand: re-pulls the datfile, re-runs against
     the folder, finds newly-recognized ROMs.
- **Live in `tools/roms/`** (new factory tooling subdirectory).
- **Schedule via existing GHA cadence** (similar to budget-snapshot-
  cadence pattern) for periodic refresh on TOSEC datfile updates.

## Folder structure proposal

```
roms/                              (gitignored, bulk)
├── .gitignore                     (existing depth-limited rule)
├── README.md                      (existing top-level protocol)
└── atari/2600/                    (existing — 3461 ROMs gitignored)
    └── README.md                  (existing safety-gate)

roms-safe/                         (NEW, tracked — license-verified ROMs)
├── README.md                      (NEW — explains the split + cites licenses)
└── atari/2600/                    (NEW)
    ├── README.md                  (NEW — per-ROM citations)
    └── *.bin                      (NEW — only ROMs cleared by license)
```

## Acceptance criteria

- [ ] All 3461 files in `roms/atari/2600/` renamed to canonical
  form (TOSEC or Good-Tools — pick one) where matchable.
- [ ] Unmatchable files flagged in a manual-review list.
- [ ] License-classification applied per the README's gate.
- [ ] License-cleared ROMs moved to `roms-safe/atari/2600/`
  with per-ROM license citation.
- [ ] License-uncertain ROMs stay in `roms/atari/2600/`
  (gitignored, never distributed).
- [ ] Tooling lives in `tools/roms/` and refreshes on TOSEC
  datfile updates (manual-trigger workflow at minimum;
  scheduled cron optional).
- [ ] `roms/atari/2600/README.md` updated to reference the
  safe ROMs as "games you can test out locally" per Aaron's
  framing.
- [ ] Otto-247 version-currency: WebSearch for the latest
  TOSEC Atari 2600 datfile version before asserting which
  one to use.

## Composes with

- `roms/.gitignore` — already protects against accidental commit.
- `roms/README.md` + `roms/atari/2600/README.md` — already
  document the license-safety gate.
- B-0061 (monolith-to-per-row migration) — adjacent factory-
  hygiene class.
- Otto-247 version-currency — for datfile version handling.
- Otto-275-YET — Aaron's explicit log-don't-implement signal
  ("we can backlog this").
- The 0/0/0 hard-reset work in flight (PR #677 5-disciplines
  + the pull-queue audit) — gating dependency.

## Future-Otto pickup notes

When 0/0/0 lands:
1. Re-read this row + `roms/README.md` + `roms/atari/2600/README.md`.
2. Run an Otto-247 WebSearch for "TOSEC Atari 2600 datfile latest 2026"
   to get the current version.
3. Pick TOSEC (recommended for active maintenance) over Good Tools.
4. Build the tooling in `tools/roms/` (Python likely; bash for shell-
   integration; either is acceptable per existing factory polyglot
   discipline).
5. Apply per the algorithm in this row.
6. Spot-check 5-10 ROM renames before mass-applying (per the
   5-pre-flight-disciplines verify-substrate-state pattern).
7. Cross-CLI verify (Otto-347) on the license-classification logic
   — getting that wrong has legal blast radius.
