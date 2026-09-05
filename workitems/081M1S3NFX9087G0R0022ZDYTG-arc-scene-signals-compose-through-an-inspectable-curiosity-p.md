---
id: 081M1S3NFX9087G0R0022ZDYTG
type: task
state: active
priority: P2
slug: arc-scene-signals-compose-through-an-inspectable-curiosity-p
title: "ARC scene signals compose through an inspectable curiosity policy"
created: 2026-09-05T15:40:47.913Z
depends_on: []
composes_with: []
---

# ARC scene signals compose through an inspectable curiosity policy

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1S3NFX9087G0R0022ZDYTG-*.md` glob. -->

The ARC scene prior already measures rarity, edge density, recent change,
motion, learned color meaning, and learned shape meaning. Its ranking formula
is currently hard-coded inside `forecast_scene`, so experiments cannot compose
or ablate those channels without editing the policy itself.

Acceptance:

- the six existing signals have stable source-owned identities;
- a deterministic composition value selects structural and learned channels;
- evaluation exposes each selected contribution and the resulting score;
- the default composition reproduces the current score and selection exactly;
- empty channel groups return typed feedback rather than throwing or silently
  inventing mass;
- tests demonstrate channel ablation changes ranking only when the removed
  channel carried discriminating evidence;
- no external ML or numeric dependency is added.
