---
id: 081M1F1XZY4087G0R002Z01FGA
type: task
state: backlog
priority: P1
slug: zetafs-stays-in-repo-until-v0-9-unique-key-nexmark-alloc-ben
title: "ZetaFS stays in-repo until v0.9; unique-key Nexmark + alloc benches; later IR/per-lang/Ace split"
created: 2026-09-01T17:58:04.996Z
depends_on: []
composes_with: []
---

# ZetaFS stays in-repo until v0.9; unique-key Nexmark + alloc benches; later IR/per-lang/Ace split

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1F1XZY4087G0R002Z01FGA-*.md` glob. -->

Aaron 2026-09-01: keep ZetaFS in this monorepo until a signed v0.9ish FS;
then split product + per-language repos; IR becomes the main repo;
generated + handwritten oracles; same later for ZetaDB and Ace; Ace
one-liner after packages publish. Factory rust is mise 1.96.1 via
`tools/setup/install.sh` (last-good vs Feldera `dbsp` ICE; first-bad
1.97.0). Do not rustup-install a second compiler to build Feldera.

## This change

- Pin rust 1.87.0 -> 1.96.1 (last 1.96 patch; `dbsp` PASS; 1.97.0+
  ICE). `.mise.toml` + `.mise.full.toml` + rustup cache globs +
  `install-rust-wasm32.sh`.
- Unique-key Feldera.Bench Q1/Q2 (`BidRow`) so `|Z-set| = N`.
- `ZSetAllocBench` + tighter `Allocation.Tests`.
- Research-grade split/IR/Ace absorb; first-product honesty peel.
- `docs/research/feldera-comparison-status.md` (PRIOR-ART-LIST pointer
  was dangling).
- `.github/workflows/feldera-compare.yml` — unique-key + zero-alloc
  BDN on ubuntu-24.04, macos-26, windows-2025 (drift check).

## Not this change

- Minting a GitHub repo.
- FORMAT `ns=bindings`.
- PR12 DST.
- Quoting price-keyed Q1/Q2 as Feldera events/s.
