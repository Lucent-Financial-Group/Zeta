# `forensics/` — make the next unclean reboot diagnosable

**macOS only.** Stated plainly, not pretended portable: `nvram`, `kmutil`,
`systemextensionsctl`, `pmset`, `vm_stat`, `iostat` and the unified log have no
Linux or Windows equivalent, and the subject is an Apple kernel that dies
without writing a panic log to a place anyone looked. `guardPlatform()` refuses
to run elsewhere rather than emitting plausible-looking output.

**No `sudo`, anywhere.** Verified, not assumed — `/var/db/diagnostics` is
`root:admin drwxr-x---` and the account is in `admin`, so `log collect`,
`log stream` and every probe run unprivileged. `guardNoPrivilege()` refuses to
run as root so the property cannot rot into "it works, under sudo". A harness
that raised routine biometric prompts would make an existing security problem
worse, so this is a hard constraint rather than a nicety.

## Files

| file | what it is |
|---|---|
| `macos-panic-capture.ts` | the CLI — `vitals`, `error-ring`, `snapshot`, `archive`, `boot`, `triage`, `vitals-tail`, `prune`, `cost`, `install` |
| `panicmedic.ts` | decodes the NVRAM `panicmedic-*` keys; classifies a boot clean/unclean |
| `panic-log.ts` | finds (**including `Retired/`**), parses, de-slides and groups `.panic` reports |
| `log-store-retention.ts` | the blackout and ring-retention math, and the disk bill |

## Start here

```bash
bun src/Core.TypeScript/forensics/macos-panic-capture.ts triage
```

Then `docs/runbooks/macos-unclean-reboot.md`.

## The three things worth knowing before reading the code

1. **`logd` loses its last ~24 seconds.** It buffers in memory; whatever is
   unflushed when the machine dies never reached a disk, so no post-hoc
   `log collect` can recover it. Measured: last log line 08:16:36, panic
   08:16:59.664. That hole is why `vitals` exists and why it `fsync`s.
2. **The log store is a ~4-hour ring under load.** 509 MB filling at
   ~130 MB/hour. Investigating "later" means investigating nothing.
3. **`.panic` files hide in `Retired/`.** Not finding them there is how a root
   cause goes unnoticed for a day. `findPanicReports` reports `unsearchable`
   separately from `found none`, because those are different values.

## Cost

`macos-panic-capture.ts cost` reads the sizes off the artifacts on disk rather
than reciting a number. As configured: ~580 MB/day growing, ~4 GB steady state
at 7-day / 6-archive retention, plus a one-time ~447 MB shared symbol catalog.
The catalog is APFS-cloned into each archive — 303 MB "copied" for 4 KB of real
disk — and every clone is verified with `log show --archive` before the
original is discarded.
