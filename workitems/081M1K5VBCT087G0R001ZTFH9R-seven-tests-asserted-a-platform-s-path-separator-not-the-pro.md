---
id: 081M1K5VBCT087G0R001ZTFH9R
type: bug
state: backlog
priority: P2
slug: seven-tests-asserted-a-platform-s-path-separator-not-the-pro
title: "Seven tests asserted a platform's path separator, not the property they were named for"
created: 2026-09-03T09:35:00.000Z
depends_on: []
composes_with: []
---

# Seven tests asserted a platform's path separator, not the property they were named for

## The defect

`bun test src/Core.TypeScript/observe/` was **7 red on unmodified `main`** on any Windows checkout.
Every one of them was a defect in the **test**, not the code:

| test                                                      | asserted                                            | the code does        |
| --------------------------------------------------------- | --------------------------------------------------- | -------------------- |
| `a legitimate name resolves inside the dataset directory` | `"/tmp/zeta-f4-out/R-….jsonl"`                      | `resolve(dir, name)` |
| `expandHome resolves tilde paths`                         | `"/home/zeta/.config/gh/hosts.yml"`                 | `join(home, rest)`   |
| `manifestPathsForVendor returns gh hosts.yml`             | `toContain(".config/gh/hosts.yml")`                 | `join(…)`            |
| `defaults land on the repo-relative bindings path`        | `"/repo/db/self-claims/…"`                          | `join(…)`            |
| `--repo without --bindings resolves…`                     | `"/r/db/self-claims/…"`                             | `join(…)`            |
| `filename is a canonical 32-hex ZetaId…`                  | `` `root/2026/07/08/…` `` **and** `path.split("/")` | `join(…)`            |

A test named _"the output path is contained"_ that asserts `"/tmp/a/b"` is not testing containment —
it is testing **which platform wrote the test**. The production code builds these with node's `path`
module and was correct throughout.

The `tick-shards` one is the sharpest: after fixing its literal, it still failed, because it went on
to do `path.split("/").pop()`. On Windows that returns the **whole path** as a single element, so the
32-hex regex was run against `root\2026\07\08\<id>` and rejected a filename that was correct. Now
`basename(path, ".json")`, which asks the question the test is actually asking.

## The seventh is different, and gets a different fix

`link creates a second path to the same content` is a **real platform capability limit**: the os-fs
port implements `link` with `symlinkSync`, which on Windows requires Developer Mode or elevation and
otherwise fails `EPERM`. The port was behaving correctly — reporting a refusal it could not avoid —
while the test asserted `ok === true` unconditionally.

A platform skip would hide it, and **a check that quietly does not run is the failure this repo cares
most about**. So both outcomes are asserted and each says something real:

- **linked** → the two paths must read the same content (the actual contract)
- **refused** → the port must say so _as data_, with a reason naming the path, and leave **no
  half-made second path** behind

The only answer that would be a defect — `ok: true` over a link that does not exist — fails both
branches.

## Why this was worth fixing

Persistent red is how a suite stops being read. Seven standing failures mean a real regression
arriving on Windows is indistinguishable from the background, and every local verification in this
session had to be manually triaged against "is this one of the known seven?".

## Result

```
bun test src/Core.TypeScript/observe/    # 1624 pass, 0 fail   (was 1603 pass, 7 fail)
bun src/Core.TypeScript/lint/lint-typescript.ts   # tsc clean
```

The changes are platform-neutral by construction: on Linux `join("root", "2026")` is byte-identical
to `"root/2026"`, so nothing about CI's behaviour changes — the assertions simply stop encoding an
assumption they never meant to make.
