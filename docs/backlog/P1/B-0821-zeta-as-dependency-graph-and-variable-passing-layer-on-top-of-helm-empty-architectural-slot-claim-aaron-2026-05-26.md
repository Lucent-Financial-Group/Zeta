---
id: B-0821
priority: P1
status: open
title: Zeta as the dependency-graph + auto-variable-passing layer on top of Helm — empty architectural slot above sync engines (ArgoCD / Flux) that nobody has claimed; load-bearing strategic-positioning substrate (Aaron 2026-05-26)
effort: L
ask: aaron 2026-05-26
created: 2026-05-26
last_updated: 2026-05-26
depends_on:
  - B-0816
  - B-0819
  - B-0820
composes_with:
  - B-0794
  - B-0813
tags: [strategic-positioning, dependency-graph, helm, variable-passing, ontology-substrate, empty-architectural-slot, force-multiplier, terraform-pulumi-helmfile-comparison]
---

## Problem

Aaron 2026-05-26 architectural observation:

> *"really we could become the dependency graph on top of helm i'm supprised no one has claimed that space. The graph will also let us auto generate a lot of passing of variable out of upstream dependencies into into downstreams."*

There is an empty architectural slot above today's Kubernetes substrate stack:

| Layer | Today's leader | Status |
|---|---|---|
| Container runtime | Docker / containerd | Saturated |
| Container packaging | Dockerfile / OCI | Saturated |
| App templating | Helm | Saturated |
| Manifest overlay | Kustomize | Saturated |
| Cluster sync engine | ArgoCD / Flux | Saturated (per [B-0816](B-0816-architectural-principle-maximize-argocd-scope-minimize-nixos-native-lock-in-cross-cluster-portability-leverage-aaron-2026-05-26.md)) |
| **Dependency graph + auto-variable-passing on top of Helm** | **— EMPTY —** | **Open slot Zeta can claim** |
| Progressive delivery | Argo Rollouts / Flagger | Saturated |
| Cluster orchestration / multi-cluster | KubeFed / ClusterAPI / etc. | Saturated |

Adjacent tools that touch parts of this slot but don't fill it:

| Tool | What it does | Why it's NOT the dependency-graph-on-Helm layer |
|---|---|---|
| **Helmfile** | Multi-release Helm orchestration via single YAML spec | Operator-authored release ordering; no typed-output → typed-input variable flow |
| **Terraform Helm provider** | Apply Helm releases via Terraform | TF outputs work, but mixes TF and K8s state; impedance mismatch |
| **Pulumi Kubernetes** | Imperative IaC for K8s + Helm | Same impedance issues as TF; full-IaC paradigm, not GitOps-native |
| **Cluster API (CAPI)** | Cluster lifecycle (provisioning, not app deps) | Different layer (cluster, not app) |
| **Helm `Chart.yaml` `dependencies:`** | Sub-chart inclusion ordering | Per-chart scope only; no cross-chart variable passing; no graph above charts |
| **ArgoCD `argocd.argoproj.io/sync-wave`** | Numeric ordering within ArgoCD | Per-sync-engine; non-portable; no variable flow |
| **Flux `dependsOn`** | Named-dependency between Flux resources | Per-sync-engine; no variable flow |

The slot is EMPTY because the constraints are awkward: Helm's templating language can't easily express graph topology; sync-engines (ArgoCD, Flux) treat dependencies at their own granularity (Application / HelmRelease); no GitOps-native tool sits above Helm + below the sync engine to provide typed dependency-graph + auto-variable-passing.

## Why Zeta is positioned to claim it

Three substrates already in flight that compose into the dependency-graph-on-Helm layer:

1. **[B-0816](B-0816-architectural-principle-maximize-argocd-scope-minimize-nixos-native-lock-in-cross-cluster-portability-leverage-aaron-2026-05-26.md) Helm-as-convergence-point** — Zeta authors substrate as Helm charts; both engines (ArgoCD + Flux) consume the same charts. This positions Zeta TO sit above Helm, regardless of which engine ships.
2. **[B-0820](../P2/B-0820-flux-engine-second-engine-support-flag-toggle-multi-cluster-experimentation-aaron-2026-05-26.md) Derivability asymmetry** — `dependsOn` → sync-waves is computable; sync-waves → `dependsOn` is not. The named-dependency graph IS the source-of-truth shape; engine-specific outputs are derived projections. Zeta's `tools/cluster/deps-to-engine-config.ts` (B-0820 sub-target 4) is the first concrete substrate at this layer.
3. **[B-0819](B-0819-ai-runbook-substrate-run-deferred-run-continue-with-auto-jit-as-next-force-multiplier-layer-above-helm-kustomize-dockerfile-aaron-2026-05-26.md) Ontology-based-not-tool-based** — AI runbooks describe ontology shapes; tools surface BECAUSE they fit the shape. A dependency-graph IS an ontology primitive; this layer IS Zeta's ontology layer applied to K8s substrate.

The three substrates compose: B-0816 puts Zeta at Helm's level; B-0820 establishes the source-of-truth shape (named-dependency graph); B-0819 makes the layer ontology-shaped rather than tool-shaped. This row formalizes the strategic claim: Zeta is the empty architectural slot's tenant.

## Target

Substrate-engineering work to claim the slot:

### Sub-target 1 — named-dependency-graph spec (source-of-truth shape)

Operator-authored canonical spec format for cross-chart dependencies. Likely structure:

```yaml
# maintainers/<op>/cluster-apps/<app>/zeta-deps.yaml
apiVersion: zeta.lucent-financial-group.com/v1
kind: AppDependencyGraph
metadata:
  name: my-app
spec:
  dependsOn:
    - chart: postgres
      version: ">=15.0.0"
      outputs:
        - name: connection-url
          source: ".Values.postgres.connectionUrl"
          consumes:
            - target: my-app.values.database.url
        - name: admin-password
          source: ".Values.postgres.adminPassword"
          consumes: []  # not consumed by this app
    - chart: redis
      outputs:
        - name: endpoint
          source: ".Values.redis.endpoint"
          consumes:
            - target: my-app.values.cache.endpoint
```

The graph is engine-agnostic (consumed by both ArgoCD and Flux wrappers via Sub-target 2).

### Sub-target 2 — graph → engine-specific config emitter (`tools/cluster/deps-to-engine-config.ts` from B-0820)

Same TS tool from B-0820 sub-target 4 + extended scope:

- Input: the named-dependency-graph spec (Sub-target 1)
- Output for Flux: `dependsOn: [name1, name2]` arrays + `valuesFrom:` references for variable flow
- Output for ArgoCD: `argocd.argoproj.io/sync-wave: "N"` annotations + secret/configmap references for variable flow

The variable-passing piece is the GENUINELY-NEW substrate: upstream chart outputs flow as downstream chart inputs AUTOMATICALLY. Today operators wire this manually (copy-paste connection strings; sync passwords across charts; etc.). With the graph, the tool resolves the flow.

### Sub-target 3 — typed output resolution

Outputs need types so the variable-flow validation can catch mistakes at build time, not runtime. Candidate shapes:

- **Helm-native**: chart `Chart.yaml` declares `outputs:` block with typed fields (extension to Helm chart spec; not yet upstream)
- **External**: parallel `zeta-chart-outputs.yaml` file alongside `Chart.yaml` declares the typed surface
- **Convention**: the `values.yaml` itself documents outputs via a `_zeta_outputs:` reserved key

Recommended: **external `zeta-chart-outputs.yaml`** for chart-portability — upstream charts (Bitnami, Argo, Prometheus, etc.) don't ship Zeta-specific extensions; our wrapper layer declares the outputs for them in our substrate.

### Sub-target 4 — graph cycle detection + validation

The dependency graph must be acyclic. Build-time validation:

- DAG check on `dependsOn` references
- Output-consumer resolution (every `consumes.target` exists in some downstream chart)
- Type check (output type matches consumer type)
- Missing-output check (consumer references an output the upstream doesn't declare)

### Sub-target 5 — multi-cluster + multi-tenant scope

Cross-cluster variable flow (cluster-A produces something cluster-B consumes) is THE next-level shape. Per [B-0820](../P2/B-0820-flux-engine-second-engine-support-flag-toggle-multi-cluster-experimentation-aaron-2026-05-26.md) multi-cluster substrate, the dependency-graph can extend to cross-cluster outputs (federated state). Out of scope for initial implementation; substrate-design considerations should not preclude future extension.

### Sub-target 6 — UX + DX (ontology-shaped operator surface)

Per [B-0819](B-0819-ai-runbook-substrate-run-deferred-run-continue-with-auto-jit-as-next-force-multiplier-layer-above-helm-kustomize-dockerfile-aaron-2026-05-26.md): operators describe the ontology of what they want; the graph + tool materialize the engine-specific configs. The substrate IS ontology-shaped, not tool-shaped. AI agents (via Skill router + the three primitives `run` / `deferred run / continue with` / `auto JIT`) author runbooks that emit dependency-graph specs from natural-language operator intent.

## Acceptance

- [ ] Named-dependency-graph spec format documented + at least one example chart pair (e.g., my-app dependsOn postgres) shipped
- [ ] `tools/cluster/deps-to-engine-config.ts` produces both Flux and ArgoCD outputs from one graph
- [ ] Variable flow tested empirically: upstream chart's output X flows to downstream chart's input Y on actual deploy
- [ ] Cycle detection + validation passes
- [ ] At least one operator (Aaron) deploys two interdependent charts via the graph + confirms the variable-passing eliminates a manual step
- [ ] Strategic positioning documented (`docs/POSITIONING.md` or equivalent) — Zeta as the dependency-graph-on-Helm layer

## Composes with

- **[B-0816](B-0816-architectural-principle-maximize-argocd-scope-minimize-nixos-native-lock-in-cross-cluster-portability-leverage-aaron-2026-05-26.md)** — Helm-as-convergence-point (this row sits ON TOP of that convergence)
- **[B-0819](B-0819-ai-runbook-substrate-run-deferred-run-continue-with-auto-jit-as-next-force-multiplier-layer-above-helm-kustomize-dockerfile-aaron-2026-05-26.md)** — ontology-based substrate (this row IS the ontology layer applied to K8s substrate)
- **[B-0820](../P2/B-0820-flux-engine-second-engine-support-flag-toggle-multi-cluster-experimentation-aaron-2026-05-26.md)** — derivability-asymmetry + `tools/cluster/deps-to-engine-config.ts` (this row extends that tool with variable-passing scope)
- **[B-0794](B-0794-node-self-registers-in-git-under-maintainers-cluster-nodes-triggers-argocd-full-bringup-of-k8s-apps-charts-gitops-native-cluster-substrate-aaron-2026-05-26.md)** — cluster-bring-up substrate (the dependency-graph governs which charts deploy when)
- **[B-0813](B-0813-iter-5-4-2-argocd-app-watches-maintainers-cluster-nodes-tree-reconciles-on-pr-merge-completes-gh-auth-to-cluster-bringup-arc-aaron-2026-05-26.md)** — ArgoCD reconciler (consumes graph-derived sync-wave annotations)

## Empirical verification — empty-slot claim confirmed (2026-05-26 search-pass)

Aaron 2026-05-26 follow-up: *"can you do a quick search that seems like such an easy slot to fill i'm supprised it's not, maybe just vendors do this for their flavor like redhats version of k8s and it's blessed packages"*. Two WebSearch passes 2026-05-26 confirm the slot is empty in the specific shape this row claims:

**Helm's own variable-passing is unsolved at platform level**:

- [Helm GH Issue #12323](https://github.com/helm/helm/issues/12323) — "Discussion on passing templated values to sub-chart dependencies with backwards compatibility" — OPEN; community-discussed without resolution
- [Helm GH Issue #9461](https://github.com/helm/helm/issues/9461) — "Working with unpackaged charts as dependency" — OPEN; cross-chart variable flow gaps

**Closest tools fall short of the slot in specific ways**:

| Tool | Empirical limit |
|---|---|
| [Helm umbrella charts](https://oneuptime.com/blog/post/2026-02-26-argocd-helm-umbrella-charts/view) | Per-chart-bundle scope; not a portable layer; sub-chart values still operator-wired |
| [Helmfile](https://github.com/helmfile/helmfile) | Multi-release orchestration; no typed-dependency-graph; no auto-variable-passing |
| ArgoCD ApplicationSet | Template-based Application generation; not a dependency-graph |
| Helm `Chart.yaml` `dependencies:` | Sub-chart inclusion only; no cross-chart-graph |

**Vendor platforms** (OpenShift / Rancher / Tanzu / etc.) fill the slot for THEIR OWN blessed-package configs but with explicit lock-in tradeoffs:

- [Rancher's Helm config](https://github.com/rancher/rancher/wiki/Understanding-How-Rancher-Configures-Helm-Charts) uses platform-specific `answers` + `valuesYaml` injection; not a portable cross-platform dependency-graph
- [OpenShift Helm](https://docs.openshift.com/en/container-platform/4.10/applications/working_with_helm_charts/understanding-helm.html) provides chart-management UI but no cross-chart variable-flow layer
- Industry observation: [proprietary K8s lock-in](https://www.spectrocloud.com/blog/closed-source-open-minds) — vendors fork K8s for their own platforms; portable OSS layer for this specific slot is open

**Confirmed**: the dependency-graph + auto-variable-passing slot above Helm + below sync-engine, OSS-portable + GitOps-native, is empty in the substantive sense Aaron framed. Strategic positioning claim stands.

## Out of scope (this row)

- Helmfile / Terraform / Pulumi feature parity at the IaC layer — Zeta's slot is GitOps-native + above Helm + below sync engine; not full IaC
- Cross-cluster variable flow (Sub-target 5 names it; reserved for follow-on row)
- Upstream Helm chart spec extension to declare outputs natively (filed as upstream contribution if substrate matures)

## Origin

Aaron 2026-05-26 in conversation about Flux-engine-experimentation + Helm-convergence-point + derivability-asymmetry. The strategic-positioning claim ("really we could become the dependency graph on top of helm i'm supprised no one has claimed that space") is the architectural observation. The variable-passing piece ("graph will also let us auto generate a lot of passing of variable out of upstream dependencies into into downstreams") is the load-bearing capability the graph enables.

Filed as P1 because:

1. **Strategic-positioning slot** — empty architectural slots are rare; claiming this one positions Zeta as a unique substrate layer the K8s ecosystem doesn't yet have
2. **Auto-variable-passing eliminates a recurring operator-pain class** (manual cross-chart wiring of connection strings, passwords, endpoints, secrets) — high-leverage substrate
3. **Composes with already-in-flight B-0816 + B-0819 + B-0820** — substrate-engineering work consolidates rather than expanding the surface
4. **Differentiator from Helmfile / Terraform / Pulumi** — those tools touch parts of the slot but don't fill it GitOps-natively; Zeta's positioning is unique

## Substrate-inventory pass

Per [`.claude/rules/verify-existing-substrate-before-authoring.md`](../../../.claude/rules/verify-existing-substrate-before-authoring.md):

- `rg "dependency graph" docs/ memory/ .claude/` → no prior strategic-positioning row on this slot
- `gh pr list --state all --search "dependency graph helm"` → no in-flight collision
- `gh pr list --state all --search "B-0821"` → no in-flight collision
- ID B-0821 next-free per `git ls-tree origin/main` (highest = B-0820 from #5227 just merged; B-0818/B-0819 already merged)
- Composes with established substrate-engineering arc (B-0816 + B-0819 + B-0820); not parallel-shape
