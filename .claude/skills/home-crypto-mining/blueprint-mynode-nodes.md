# blueprint — MyNode BTC nodes (td5, td6): inventory + USB + Zeta update trigger

**Register:** [grounded] equipment blueprint (Aaron). Part of the `home-crypto-mining` skill group.

## The hardware (Aaron)

Two **MyNode BTC** nodes (Bitcoin/Lightning full-node appliances — <https://mynodebtc.com/download>):

- **td5** — MyNode unit #1.
- **td6** — MyNode unit #2.

These are **fleet equipment** (the home-crypto-miner hat) and **inventory items** — to be entered into the
**inventory website** (`inventory/` — Addison's secure Supabase-backed tab; seed via `inventory/seed/`,
NOT hand-edited here). This blueprint is the source record; the live inventory row lives in that system.

## Tasks

1. **Inventory the two nodes** (td5, td6) in the `/inventory` website — model, serial/id, location, status,
   owner. (Data → Supabase via the inventory seed flow; this doc is the spec, not the DB.)
2. **Create a USB** for them from **MyNode "model two"** (the downloadable MyNode image, mynodebtc.com/download)
   — a bootable USB to provision/restore the nodes. *(Physical op — flashing is done by Aaron/Dejan with the
   downloaded image; confirm the exact image/version called "model two".)*
3. **Zeta update trigger** — a `triggers/` trigger that fires a `updates/` flow for the nodes (on new
   release / schedule / drift → update + re-kick), wired through the finalizer-runtime (ReKick).

## Honest scope / security

- **No wallet/private keys** in the repo (Bitcoin node — node config only; keys stay on the device / metal).
  Any key/custody handling → **Nazar** (security).
- USB-flash + live update = **ops** (Aaron/Dejan); this blueprint is the record + process.
- Confirm MyNode model/version naming ("model two", td5/td6) — captured as Aaron stated.

## Pointers

- `inventory/` (the website; CLAUDE.md + spec.md + seed/) · `updates/` + `triggers/` · `hats/home-crypto-miner/`.
