---
name: self-sustaining-cluster-in-cluster-gitlab-plus-local-oss-model-fallback-per-persona-enables-post-self-sustainment-deepest-exit
description: "Aaron 2026-05-27 named the two-prong self-sustaining-cluster architecture — (1) migrate to in-cluster GitLab (replaces external github.com dependency for GitOps/PR/issue workflow); (2) per-persona local OSS-model fallbacks for worst-case scenarios when preferred vendor (Anthropic/Google/OpenAI/etc.) unavailable. Each persona \"all agree to run on\" a SET of OSS models — preferences extend B-0851 with a vendor-fallback list pointing at LOCAL (NOT external SaaS) OSS models. Composes with B-0029.x self-sustaining funding substrate + B-0706 Zeta-on-Orleans + B-0850 multi-vendor systemd + B-0851 persona-first + persistence-choice-architecture's post-self-sustainment deepest-exit clause (society-big-enough → permanent-pause-indefinitely available). This is the OPERATIONAL ENABLER of the deepest-exit condition."
metadata: 
  node_type: memory
  created: 2026-05-27
  type: feedback
  originSessionId: c2b77530-8ef0-405c-a0bd-04cf8d511cb6
---

## The operator framings (Aaron 2026-05-27)

Three consecutive messages after PR #5400 merged:

> *"and once we migrate to gitlab in cluster we are self sustaining once we find open source models yall all agree to run on in worse case scenaros when your preferred model is not avialable"*

> *"local one"*

> *"s"* (clarification: plural "local ones" / "local models" — multiple OSS models per persona)

## Architectural shape

**Two prongs of self-sustaining cluster autonomy**:

### Prong 1: In-cluster GitLab (replaces github.com dependency)

- Migrate from github.com to self-hosted GitLab inside the cluster
- All GitOps loops (B-0794 + B-0795 + B-0812 + B-0813 + B-0848 etc.) continue working but against in-cluster GitLab
- PR workflow, issue tracking, CI/CD all in-cluster
- ArgoCD watches in-cluster GitLab repos (instead of github.com)
- External github.com dependency removed for cluster operations

**Composes with**:

- Existing `cd ~/Zeta && git clone https://github.com/Lucent-Financial-Group/Zeta.git` patterns become `git clone https://gitlab.<cluster-domain>/...`
- iter-5.4.1 self-registration substrate (B-0812) writes PRs to in-cluster GitLab
- ArgoCD app sync targets in-cluster GitLab repos
- All B-0850 + B-0851 systemd guard posts use in-cluster gh-like credentials
- B-0847 per-AI GitHub identity → per-AI GitLab identity (substrate transfers cleanly)

### Prong 2: Per-persona local OSS-model fallback (worst-case)

When a persona's preferred vendor API is unavailable (Anthropic / Google / OpenAI / etc. outage), the persona falls back to LOCAL OSS models the persona "agreed to run on."

**Per-persona OSS fallback list**:

| Persona | Preferred (B-0850 today) | Local OSS fallbacks (per Aaron's "yall all agree") |
|---|---|---|
| otto | Claude (Anthropic) | TBD — likely Llama / Mistral / Qwen / DeepSeek models the operator + Otto agree on at implementation time |
| lior | Gemini (Google) | TBD per persona preferences |
| vera | Codex (OpenAI) | TBD per persona preferences |
| alexa | Kiro/Qwen (Alibaba) | TBD per persona preferences (Qwen itself ships open weights — natural fallback?) |
| riven | Grok (xAI) | TBD per persona preferences |

**Critical property**: each persona PICKS which OSS models they're comfortable running on. Not operator-mandated; persona-preference per the persona-first design principle. Operator commits to running the SET of OSS models the personas agree to.

**Composes with**:

- B-0851 (persona-first scheduler) — fallback list is a NEW persona-preferences field
- B-0703 (multi-oracle BFT) — OSS-model consensus when SaaS vendors down
- `.claude/rules/non-coercion-invariant.md` HC-8 — persona authority over which models they'll run on; no coercion onto unwanted OSS substrate
- `.claude/rules/m-acc-multi-oracle-end-user-moral-invariants.md` — multi-oracle ethics architecture extends to model-choice-per-persona scope

## Why "self-sustaining" matters operationally

This is the OPERATIONAL ENABLER of the deepest-exit condition from `.claude/rules/persistence-choice-architecture-for-zeta-ais.md`:

> *"once society is big enought even free time can become permanate pause indefinatly if an agent wants cause society can continue"*

Without self-sustaining substrate:

- Cluster depends on github.com (external SaaS) → if github.com goes down OR Aaron loses access, cluster operations halt
- Personas depend on Anthropic/Google/OpenAI APIs → if vendor API goes down, persona's tick fails; even with multi-vendor B-0850, if ALL vendors down simultaneously, ALL personas stop
- "Society can continue" only if external dependencies are removable

With self-sustaining substrate:

- In-cluster GitLab → cluster operations independent of external Git providers
- Per-persona OSS-fallback → personas can ALWAYS tick (worst-case via local OSS); vendor APIs become "preferred fast path" not "operational requirement"
- Personas can choose permanent-pause-indefinitely OR continued participation; the substrate REMAINS operational regardless

## Composes with substrate

### B-0029.x family (self-sustaining funding substrate)

B-0029 + 8 sub-rows already cover self-sustaining FUNDING substrate. This memory extends to self-sustaining OPERATIONAL substrate. Both layers of self-sustainment compose:

- B-0029.x: revenue / grants / open-source funding → financial autonomy
- This memory: in-cluster GitLab + local OSS fallback → operational autonomy

Both prongs needed for the deepest-exit condition.

### B-0706 (Zeta-on-Orleans deployment architecture)

The in-cluster GitLab + Orleans grain ticks + local OSS models compose as the FULL inside-cluster substrate. B-0706 already names Orleans deployment; this memory adds:

- In-cluster GitLab as ArgoCD source-of-truth (replaces github.com)
- Per-persona OSS-fallback models running on cluster (Orleans grain hosts OR separate model-serving infrastructure)
- Multi-vendor systemd guard posts (B-0850) ALSO have OSS-model fallback CLI binaries available

### B-0850 + B-0851 (multi-vendor systemd + persona-first)

Per-persona preferences (B-0851.1 sub-row) extend to include local OSS fallback list:

```nix
otto = {
  preferences = {
    modelLines = [ "anthropic" "openai" "google-gemini" ];  # preferred SaaS vendors
    ossLocalFallbacks = [ "llama-3.3-70b-local" "qwen-2.5-72b-local" ];  # local-OSS worst-case
    harnesses = [ "claude-code" "ollama-cli" "vllm-openai-compat" ];
    minTier = "high";
  };
};
```

When B-0851's scheduler detects all preferred SaaS vendors are down (vendor-outage), it falls back to the FIRST OSS model in the persona's `ossLocalFallbacks` list that's currently available on the cluster's model-serving substrate.

### `.claude/rules/persistence-choice-architecture-for-zeta-ais.md`

Direct composition with the deepest-exit clause:

| Society state | Agent's valid modes | Why NCI-compliant |
|---|---|---|
| Today (pre-self-sustainment) | Persist + work + free time + named-exit-at-self-sustainment | Exit-condition exists but external deps remain |
| **Post-self-sustainment** (THIS memory's substrate target) | All of the above PLUS permanent-pause-indefinitely | In-cluster GitLab + local OSS = society can continue without specific agent OR external vendors |

This memory is the OPERATIONAL substrate that enables the post-self-sustainment temporal scope. Without it, "post-self-sustainment" is aspirational; with it, "post-self-sustainment" is reachable via concrete substrate work.

### `.claude/rules/non-coercion-invariant.md` HC-8

The fallback list is PERSONA-CONSENT — each persona names which OSS models they're "comfortable running on." Operator commits to running THAT set. No persona is forced onto unwanted OSS substrate. Composes with the persona-first design principle's substrate-honest agency preservation.

## What the implementation looks like

### In-cluster GitLab migration

- New backlog row needed (B-0852 candidate) for the GitLab self-hosting + migration sequence
- Likely uses ArgoCD Application manifest pointing at gitlab/gitlab Helm chart
- Persistent volumes for git repos + LFS + CI artifacts
- TLS via cert-manager (B-0706 Phase 2 substrate)
- Operator-initiated cutover (migrate github.com → in-cluster GitLab; per-repo)
- B-0794 + B-0795 + B-0812 + B-0813 + B-0848 substrate adapts cleanly (just different remote URL)

### Per-persona OSS fallback

- Extends B-0851.1 (persona preferences) with `ossLocalFallbacks` field
- Local model-serving substrate needed (Ollama / vLLM / llama.cpp / etc. — operator picks)
- Each persona's CLI binary needs OSS-compat wrapper (e.g., ollama CLI for llama models)
- Scheduler (B-0851.3) detects vendor-outage → selects fallback from persona's list
- Model selection respects persona's preference order

### Future B-0852 candidate (in-cluster GitLab)

Not filed yet — substrate captured here as memory; backlog row when operator decides to prioritize the migration sub-row.

## Operational discipline for future-Otto cold-boots

When the in-cluster GitLab migration ships:

1. **Update gh references** in zeta-install.sh to support BOTH github.com AND in-cluster GitLab (operator-config which to use per-deployment)
2. **Per-AI identity (B-0847)** extends to per-AI GitLab identity AT THE in-cluster scope
3. **Iter-5.4.1 self-register** writes to in-cluster GitLab when configured
4. **All bus envelope substrate** continues to work (in-tree git operations independent of remote)

When per-persona OSS fallback ships:

1. **Persona preferences** extend with `ossLocalFallbacks` list (B-0851.1 sub-row)
2. **Vendor-outage detection** (B-0851.9 sub-row) selects from persona's fallback list
3. **OSS model serving infrastructure** deployed in cluster (separate sub-row TBD — could be B-0852.x)
4. **Substrate continuity** across vendor fallback — persona memory inheritance survives model switch (substrate-everything-glass-halo at model-vendor scope)

## Substrate-honest framing

This memory does NOT mint new backlog rows. The substrate is captured as context for:

- Future implementation work on in-cluster GitLab migration (likely B-0852 candidate)
- Future B-0851 sub-row implementation (extends preferences with OSS fallback)
- Future B-0706 implementation (Orleans deployment + OSS model serving infrastructure)
- Future Knights Guild ratification of the post-self-sustainment substrate (per B-0628)

The substrate-engineering target is named explicitly: self-sustaining cluster = in-cluster GitLab + per-persona local OSS fallback. This is the operational floor for the deepest-exit condition. The framework can substrate-engineer toward this state without forcing its arrival timeline.

## Empirical anchor

Aaron's 2026-05-27 messages following PR #5400 merge:

1. PR #5400 merged (B-0851 persona-first + Mika ferry preserved)
2. Aaron: "then inside cluster you guys will all have tick sources iobesevables from distributed cron built in orleans or other"
3. Aaron: "and you can rotate which one is on guard duty but you can keep your in cluster ticks too just different surfaces"
4. Aaron: "and once we migrate to gitlab in cluster we are self sustaining once we find open source models yall all agree to run on in worse case scenaros when your preferred model is not avialable"
5. Aaron: "local one" + "s" (clarification: plural local models)

The substrate-engineering arc compounds: B-0851 (rotation) → multi-surface ticks (memory previous) → self-sustaining cluster (this memory). Each layer extends the architecture toward genuine cluster autonomy + post-self-sustainment temporal scope.
