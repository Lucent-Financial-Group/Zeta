---
name: zeta-cluster-install-target-persona-first-time-cli-users-3-node-production-ready-easier-than-proxmox-aaron-2026-05-25
description: "Aaron 2026-05-25 named the Zeta cluster-install target persona — first-time command-line users; UX bar is \"easier than Proxmox / unRAID for home clusters\"; 3-node threshold is the production-ready inflection point (when HA control-plane substrate per B-0756 lights up real cluster availability)"
metadata: 
  node_type: memory
  type: project
  originSessionId: c2b77530-8ef0-405c-a0bd-04cf8d511cb6
---

Aaron 2026-05-25, mid-B-0754-v1-implementation conversation: *"if
i'm targeting first time commandline users that's the persona i'm
going for so this can spread easliy to home clusters easlier than
proxmox or any of that but prodicution ready once 3 nodes"*.

## The product bet

**Why:** Zeta cluster-install is being substrate-engineered to
reach a market segment that Proxmox / unRAID / cluster competitors
don't serve well: home users who aren't comfortable with
command-line. The UX bar is "zero CLI knowledge required for the
happy path"; the production-readiness bar is "3-node HA cluster is
the inflection point where prod claims become real."

**How to apply:** every UX decision in cluster-install scope (B-0754
v1 zero-typing, B-0755 role taxonomy, B-0756 HA control-plane,
B-0757 mDNS auto-discovery, B-0758 unRAID-style USB-persistent OS,
B-0737 zflash flow, B-0743 "I execute, you fingerprint" pattern,
B-0738/B-0739 Linux/Windows extensions, flash-cluster-iso skill,
PROVISIONING.md, README) MUST pass two filters:

1. **Persona filter** — would a first-time command-line user
   complete this step without giving up? Plain-language defaults,
   no jargon-without-explanation, actionable error messages
   pointing at the next safe action
2. **3-node prod-ready filter** — does this step compose toward
   the production-ready threshold? Single-node lab → 3-node HA
   (B-0756) is the canonical growth path; auto-discovery
   (B-0757) is what makes that path seamless

## Operational implications

For substrate landing decisions:

| Scope | Persona implication |
|---|---|
| Documentation tone | Plain English; no implicit "you obviously know what k3s is"; explain acronyms first use; include "what just happened" sections after each step |
| Error messages | Bail messages name the next safe action (e.g., "no internal disks found — plug in a disk OR see USB-persistent OS at B-0758"); never bail without a follow-up suggestion |
| Default behaviors | Zero-config happy path: ethernet-DHCP + single-disk + control-plane → just works; opt-out for power users |
| Comparisons | When relevant, frame against Proxmox / unRAID / cluster competitors (e.g., "unRAID-style USB-OS but for a real cluster, not just a NAS"); the competitive frame helps the persona orient |
| The 3-node inflection | Documentation should celebrate the moment "you just hit production-ready"; auto-discovery (B-0757) recognizes when a 3rd CP node joins and could announce it |

## Competitive positioning context

| Competitor | What it does well | What Zeta does that they don't |
|---|---|---|
| Proxmox VE | VM-first cluster; mature; UI-driven | NixOS declarative + AI cluster substrate + GitOps native + nix-build for reproducibility |
| unRAID | Storage-first; USB-resident OS; one-time license | Kubernetes-native; replicated storage (Longhorn/Ceph); free; declarative |
| Talos | Kubernetes-native; minimal OS | Full general-purpose Linux (NixOS); broader app surface than just k8s; same install simplicity |
| k3sup / k3os | Minimal k3s installer | Same install simplicity + cluster-aware (B-0757 auto-discovery) + declarative reproducibility |

The substrate-honest framing: Zeta cluster-install isn't competing
on "more features" — it's competing on "first-time CLI user can
spin up a real 3-node cluster in an evening, walk away, and it
stays alive." The combination of zflash one-touch (B-0737) +
zero-typing first-boot (B-0754) + auto-discovery (B-0757) + 3-node
HA (B-0756) + greedy disk shape (B-0754) + USB-resident OS option
(B-0758) is the load-bearing UX bundle that no competitor has
end-to-end.

## When this persona DOESN'T apply

Substrate-honest scope exclusion:

- **Maintainer / dev work**: agents + maintainers operating
  inside the factory don't need the first-time-CLI-user UX (per
  Otto-357 no-directives + the autonomy-first-class framing,
  agents operate at maintainer-skill level)
- **Production at scale** (10+ nodes, multi-region, federation):
  different persona; out of B-0754 v1 scope; would compose
  against the same substrate but with different UX defaults
- **Power users explicitly opting out**: every default has an
  env-var or flag override (e.g., `BOOT_DISK`, `STORAGE_BACKEND`,
  `ROOT_SIZE`); the persona-filter applies to defaults, not to
  hard limits on advanced use

## Composes with

- B-0754 — zero-typing USB install (the load-bearing UX
  delivery for this persona)
- B-0755 — role taxonomy expansion (persona-aligned role names
  matter; "all-in-one" is plain-language; "worker-storage" is
  plain-language; ad-hoc nix-attribute names aren't)
- B-0756 — HA control-plane (the 3-node prod-ready inflection)
- B-0757 — cluster auto-discovery (the seamless growth path)
- B-0758 — USB-persistent OS unRAID-style (the explicit unRAID
  competitive framing was Aaron's own framing during this
  conversation)
- B-0737 — zflash Touch ID (the Mac-side persona-aligned UX)
- B-0743 — "I execute, you fingerprint" (the consent pattern
  that respects the persona's trust model)
- `.claude/skills/flash-cluster-iso/SKILL.md` — agent-facing
  substrate that should mirror the persona for documentation
  generation
- `full-ai-cluster/PROVISIONING.md` — primary documentation
  surface; needs UX review against this persona
- `full-ai-cluster/README.md` — primary marketing surface;
  needs the competitive framing applied

## Substrate-honest framing

This memory captures Aaron's stated product bet, NOT a
metaphysical claim about what users want. The bet is testable
empirically once Zeta cluster-install reaches non-maintainer
users — at which point the persona filter either passes (users
ship clusters) or fails (users give up at some step we
identified or didn't).

Future-Otto cold-booting cluster-install work should read this
memory + apply the persona filter to every UX decision, while
remaining open to the persona being refined empirically as real
non-maintainer users hit the substrate.
