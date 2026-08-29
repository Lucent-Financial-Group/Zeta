---
id: 081M177JJX9087G0R000BDYG88
type: task
state: backlog
priority: P1
slug: zeta-cli-opens-zetafs-store-without-git-or-libgit2sharp
title: "zeta CLI opens ZetaFS store without git or LibGit2Sharp"
created: 2026-08-29T17:02:47.209Z
depends_on: []
composes_with: ["081M108RYNT087G0R001JSRNZE"]
---

# zeta CLI opens ZetaFS store without git or LibGit2Sharp

`zeta init` writes `.zetafs`. `StoreSelect` prefers that store over
LibGit2Sharp `Repository.Discover`. `DbCommand` emit/fold run on
ZetaFS with no git repo. Git remains the v1 fallback.

Composes with `081M108RYNT087G0R001JSRNZE` (ZetaFS dual-fold umbrella).
