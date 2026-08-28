---
name: stop-minting-b-numbers
description: "Aaron 2026-06-11: STOP creating new B-NNNN backlog numbers — this was said long ago and AIs kept minting them; the zetaid rename batches (#7840-7843 + workitems migration) exist precisely to end the series. New work items are ZetaId-keyed (workitems/081K...md), never a fresh B-number."
metadata:
  node_type: memory
  type: feedback
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

Aaron: "B-1039 — I had someone rename all these to the zetaids … so the AIs would stop creating
more. We said stop a long time ago."

**Why:** the B-NNNN series is a sequential counter — every minter races every other minter for
the next number (the exact shared-mutable-state smell the manifesto bans), and the series kept
growing after it was supposed to be closed. ZetaIds are generated, collision-free, and DST-clean:
no counter to fight over. The 2026-06-11 rename batches (#7840–#7843) + the workitems/ migration
are the enforcement sweep, not cosmetic renames.

**How to apply:** never create a new `B-NNNN` row, filename, or identifier. New work lands as a
ZetaId-named file under `workitems/` (generate the id; the workitem tooling does this). Refer to
old items by their zetaid filename where it exists; legacy B-numbers in prose are historical
labels only. I minted B-1036..B-1040 in violation of this on 2026-06-11 — that batch is what
triggered the correction. Related: [[machine-setup-must-land-in-install-sh]] (same shape: standing
constraints bind every action, not just the first).
