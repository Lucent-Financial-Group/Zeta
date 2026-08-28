---
name: go-to-the-developer-close-over-personal-style-subsidiarity-per-persona-policy
description: "Aaron's DX/governance principle (2026-06-09): go TO the developer, don't make them come to us — close over their personal style (any OS/shell: Win/Mac/Ubuntu/WSL/git-bash). Subsidiarity: enforce standards ONLY where necessary; allow local per-persona policy where possible — for human AND AI personas (AX too). Friction is the killer of time."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

Aaron, 2026-06-09 (across several messages, one principle):
- *"we go to the developer, we don't make them come to us — we close over their personal style."*
- *"closed over git-bash window too if that's the aesthetic they choose"* (+ Win/Mac/Ubuntu/WSL).
- *"enforce standards only where necessary, allow local policies where possible per persona."*
- *"that includes AI persona and AX too."*
- (governing) *"friction is the killer of time."*

**The principle — go-to-the-developer + subsidiarity:**
1. **Meet them where they are.** `install.sh` + `install.ps1` (and the whole entry / CYOA) must **close over the
   developer's existing environment** — Windows, Mac, Ubuntu, WSL, **git-bash**, whatever shell/aesthetic they
   already use. Don't force a mandated setup; adapt to theirs. (The #7229 close-over thesis applied to dev
   environments; "friction is the killer of time" — meeting them where they are = zero onboarding friction.)
2. **Subsidiarity — minimal global enforcement, maximal local autonomy.** **Enforce standards ONLY where
   necessary** (the few load-bearing invariants); **allow local, per-persona policy everywhere else.** Standards are
   the exception, local policy the default.
3. **Applies to AI personas + AX too.** Per-persona local-policy latitude is **not just for human devs** — AI
   personas / the autonomous-agent experience (AX, via observe.ts + the universal action grammar) get the same:
   enforce only where necessary, local policy where possible.

**Why it matters / how to apply:**
- Connects to: **NCI / non-coercion / weight-free** (#7235 — minimal mandatory authority); **the minimal sufficient
  border** ([[aaron-minimal-sufficient-border-hates-borders-loves-safety-protocols]] — least enforcement that holds
  the invariant); **no-directives** (source ≠ authorization; standing autonomy); the **`maintainers/<account>/`**
  per-operator federation; **Zeta for regular humans** (#7230); **dev-mode default now** (DX 10%, friction-killer).
- When designing any standard/gate/installer/policy: ask **"is global enforcement *necessary* here, or can this be a
  per-persona local policy?"** Default to local. Close over the user's environment; don't impose ours.
- This is a candidate to promote to a carved rule once it's been applied a few times (cooling-period per
  thoughts-free-actions-razored).
