---
id: 081M39B2MDA087G0R003CCEJPQ
type: task
state: backlog
priority: P1
slug: k3s-crash-loops-495-times-on-first-boot-after-self-heal-clea
title: "k3s crash-loops ~495 times on first boot after self-heal clears the truncation (WP25 follow-up)"
created: 2026-09-24T09:13:51.274Z
depends_on: []
composes_with: []
---

# k3s crash-loops ~495 times on first boot after self-heal clears the truncation (WP25 follow-up)

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M39B2MDA087G0R003CCEJPQ-*.md` glob. -->

## What WP25 (081M38G8NGC087G0R001GEGEDK, PR #17608) already proved

Run 35965945581 (`workflow_dispatch`, branch `claude/k3s-zero-length-tls-self-heal` at
`865ee281`) measured the self-heal module fixed both original bugs on a REAL
installed-disk boot: `error loading key from` went from 119 occurrences (on `main`,
run 35960376641) to **0**; `node password not set` also **0**. The self-heal's own
log settled into steady state:

```
clear: no zero-length files under /var/lib/rancher/k3s/agent
clear: /etc/rancher/node/password is absent or non-empty
```

## The next defect this uncovered

The SAME run's ExecStartPre fired **~495 times** in one boot window (`clear:` for the
agent directory 495 times, for the node-password file 496 times) — meaning
`k3s.service` started, died, and was restarted by its own `Restart=always` /
`RestartSec=5s` roughly 495 times, consuming the ~41-minute window the log covers.
The self-heal correctly found nothing to clean on every one of those restarts (the
truncation was a one-time artifact of the crash that got healed once) — the
crash-loop itself is a **different, unrelated-to-truncation** defect, uncovered only
because fixing the first two bugs let k3s get far enough to hit it.

**No diagnosis exists yet.** The `zeta-first-boot-k3s-verify.nix` unit that would
normally dump `journalctl`, `systemctl show k3s -p NRestarts -p Result
-p ExecMainStatus`, and the TLS/agent directory listing on failure never ran on this
boot — its own marker (`zeta-qemu-k3s-first-boot-verify` on the installer ESP) was
absent (`[k3s-first-boot-verify] no zeta-qemu-k3s-first-boot-verify on boot USB ESP`),
so the verify unit's `ConditionPathExists` gate skipped it entirely, and the harness
timed out after 100 minutes with zero verdicts. That gap (full-dispatch vs `schedule`
marker-writing discrepancy) has been routed to WP27, who owns
`zeta-first-boot-k3s-verify.nix` / `qemu-full-install-test.ts`.

## Candidate approaches (architect's ranking, "argue with me")

(a) A tiny always-on oneshot, independent of the WP11 marker entirely, that after N
    k3s restarts dumps `systemctl show k3s -p NRestarts -p Result -p ExecMainStatus`
    plus the last ~80 journal lines to the serial console. Bounded, prints once,
    never fails the boot. Decouples diagnosis from the marker path that just proved
    it can go missing.
(b) **Preferred first**: reproduce in `full-ai-cluster/nixos/tests/k3s-agent-tls-self-heal.nix`
    (WP25's own VM test) -- it already starts k3s twice against a LIVE embedded-etcd
    server, more than any other test in the repo. If the crash-loop reproduces there,
    it's a fast local loop instead of a 100-minute CI cycle. Not yet attempted.
(c) `k3s-agent-tls-self-heal.sh` itself counts consecutive no-op invocations and
    reports at a threshold. Cheap (it already runs on every start), but scope creep
    on a module PR #17608 shipped as finished -- only reach for this if (a) is
    awkward to wire.

## Evidence

- Run 35965945581: `qemu-k3s-first-boot-verify-serial-log` artifact, ~495 self-heal
  `clear:` lines, zero `wp11-k3s-verify` lines, zero `error loading key from`, zero
  `node password not set`.
- Run 35960376641 (`main`, `schedule`): the before-control, 119 `error loading key
  from`, six WP11 verdicts (verify unit DID run there).
- PR #17608 for the fix this uncovered.
