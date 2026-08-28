---
name: announce-destructive-or-blocking-action-immediately-before-firing-it
description: "When the agent is about to invoke an action that requires the operator's physical input (Touch ID, fingerprint, key press at console, hardware confirmation) OR that locks the conversation for tens of seconds (long expect-driven subprocess, dd flash, etc.), announce it ONE LINE BEFORE firing — not in a status banner two messages back. Aaron 2026-05-25 confirmed this pattern."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: c2b77530-8ef0-405c-a0bd-04cf8d511cb6
---

**Rule**: when the agent is about to invoke an action that:

- Requires the operator's physical input within the next few seconds
  (Touch ID prompt, fingerprint sensor, console key press,
  hardware-confirmation event the agent can't fulfill itself)
- Locks the conversation for tens of seconds while a destructive
  or long-running subprocess runs (dd flash, nix build, git clone
  large repo, expect-driven multi-step automation)

...the announcement of WHAT IS ABOUT TO HAPPEN must appear in the
text IMMEDIATELY BEFORE the tool call, NOT in a status banner two
messages back.

**Why:** Aaron 2026-05-25 confirmation (after the second zflash
session of the day): *"great job on telling me more this time
right before the touch id too"*. The first session had the
Touch-ID-will-fire prompt buried inside the expect script's
inline `puts` output, which Aaron only saw after the prompt
already fired. The second session (this rule's anchor) put a
one-liner "**Touch ID will fire on your Mac in a few seconds**"
in the agent's text message immediately before the Bash tool call
that drove the expect subprocess. Aaron's positive feedback was
specifically about that placement.

**How to apply:**

| Pattern | Before | After |
|---|---|---|
| Touch ID / fingerprint sensor | Status banner in earlier message: "I'll drive zflash" | One-line immediately before tool call: "Touch ID will fire on your Mac in a few seconds" |
| Long destructive operation (dd, format) | "Starting flash..." in subprocess output | "Flashing the USB — ~90s, you'll see progress" before the tool call |
| Multi-minute build (nix build, docker build, npm install) | "Building..." in subprocess output | "ISO build starting — ~10–30 min depending on cache; you'll get a notification" before the tool call |
| External confirmation (browser prompt, GitHub OAuth) | "Approve in browser" buried in subprocess output | "Approve the OAuth in your browser — should pop up in a few seconds" before the tool call |

**The pattern is bandwidth-honest**: the operator's attention is a
limited resource; surprise-blocking-input or surprise-long-wait
wastes it. The one-line announcement is cheap, gives the operator
heads-up, and confirms the agent knows what's about to happen.

**Composes with:**

- `.claude/rules/bandwidth-served-falsifier.md` — operator attention
  IS a bandwidth this serves
- `.claude/rules/glass-halo-bidirectional.md` — transparency about
  what the agent is doing
- `.claude/rules/algo-wink-failure-mode.md` — the announcement is
  observation, not authorization; the operator's input is still
  the consent
- The "I execute, you fingerprint" pattern (B-0743) — operator's
  physical-presence consent always at the right moment
- The first-time-CLI-user persona (B-0759 + project memory
  `project_zeta_cluster_install_target_persona_first_time_cli_users_3_node_production_ready_easier_than_proxmox_aaron_2026_05_25.md`)
  — first-time users especially benefit from explicit "what's about
  to happen" framing

**Empirical anchor:** 2026-05-25 zflash-driven reflash session
where the agent built the ISO via CI artifact download (nix-build
on macOS couldn't cross-compile to x86_64-linux without
linux-builder; CI artifact path used instead), then drove zflash
via expect. The pre-Touch-ID one-liner was the change Aaron
explicitly thanked.
