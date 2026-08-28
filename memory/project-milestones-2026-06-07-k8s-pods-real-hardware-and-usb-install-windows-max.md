---
name: project-milestones-2026-06-07-k8s-pods-real-hardware-and-usb-install-windows-max
description: "Milestones 2026-06-07 (operator-stated): Kubernetes pods running on REAL hardware; zflash USB install working on Windows (set up by Max)"
metadata:
  node_type: memory
  type: project
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

Aaron, 2026-06-07 (operator-stated milestones — authoritative):

- **Kubernetes pods running on REAL HARDWARE now.** The cluster/infra is live on physical machines (not just
  local/dev). Advances the cluster lane (ArgoCD/k8s) and grounds the Ace external-state-closure stack
  (NixOS→Ace→ArgoCD, #6939/#6941) on real metal. Real deployment, not simulation.
- **USB install working on Windows too — set up by Max.** The zflash USB-ISO install (zflash lane: B-0891
  acceptance + QEMU harness, B-0844 agent-mode, B-0884 PQ-gitcrypt USB creds) now works **on Windows**,
  extending cross-OS reach (Ace cross-OS / B-0806). Done by **Max** (contributor/surface — note as named entity;
  set up the k8s-on-hardware and the Windows USB install).

**Why it matters / how to apply:**
- These move two ACTIVE-WORKSTREAMS lanes from in-flight toward working: **cluster** (k8s on real hardware) and
  **zflash USB-ISO install** (now Windows-capable). Reflect in `docs/ACTIVE-WORKSTREAMS.md` per-lane detail
  (kept current per the doc's own discipline; PR'd this session).
- **Max** joins the named contributors alongside otto-cli / vera-codex / otto-windows. Confirm Max's
  surface/role with Aaron when relevant (human vs agent surface).
- Grounds the whole closure/infra arc (#6939–#6945) in real, running infrastructure — the architecture is not
  only captured, it's deploying on hardware.

**Owned GPU compute coming online (2026-06-07):** Aaron: his daughter **Addison** is setting up a **2nd
machine with a 4090 GPU**; **Max** has a **3090 hooked up**. Owned local GPU capacity for the AI team — this is
the **responsible temporal-plasticity** thread (#6909: free-compute economics done right = *owned/local* compute,
not free-tier ToS abuse) becoming real hardware, and it feeds local-LLM inference + the k8s-on-real-hardware
cluster (above). Contributors building the physical substrate: **Addison** (daughter, building Zeta with Aaron —
dedication lineage) + **Max**. Relevant to `docs/governance/AI-TEAM-FINANCIAL-SUBSTRATE.md` (the AI-team
hardware relationship). Capacity snapshot, operator-stated; will grow.

Recorded as operator-stated project status (not derived from code/git); dated 2026-06-07.
