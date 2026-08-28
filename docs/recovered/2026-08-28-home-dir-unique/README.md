# Recovered from home-directory paths, 2026-08-28

Files whose content existed **nowhere in git** — found while reconciling loose `~/zeta-*`
directories before the machine went to AppleCare for a confirmed memory fault.

Identified by content, not by name: every file was hashed and checked for presence in the
object database (`git hash-object | git cat-file --batch-check`). Only `missing` results
are here.

| source | files | what |
|---|---|---|
| `zeta-sig-0822/` | 26 | PR bodies and message drafts from a signing-work session |
| `zeta-lior-batch-archive/docs/pr-discussions/` | 30 | PR discussion records not in the archive tree |
| `zeta-forensics-proof/` | 21 kept of 28 | forensic snapshots and reports from the crash investigation; the raw `.log`/`.ndjson` ring buffers are excluded as bulk telemetry |
| `zetafs-mac-v0/zetafs_webdav.py` | 1 | a WebDAV presentation of ZetaFS — the only copy |
| `zeta-worktree-lior-ops-2/` | 1 | a shadow-lesson research doc |
| `zeta-build/configuration.nix` | 1 | the NixOS config; the 1.3 GB ISO beside it is reproducible and excluded |

## What was checked and found clean

`zeta-shadow-society-gate/` — **31,824 files, 0 unique.** A pure clone; deleted without loss.
That number is the control: a sweep that found nothing unique anywhere would more likely mean
the check was broken than that the disks were tidy.

## Status: RESCUED, NOT REVIEWED

Nothing here has been read or adjudicated. `zetafs_webdav.py` in particular is worth a look
on its own merits — it is an implementation of the presentation layer described in
`docs/design/2026-08-27-zetafs-names-are-tags-…`, and it existed in one place on a machine
with failing memory.
