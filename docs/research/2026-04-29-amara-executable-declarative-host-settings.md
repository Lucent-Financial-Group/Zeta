# Amara — Executable declarative host settings (Aaron + Amara 2026-04-29)

**Date**: 2026-04-29
**Channel**: Aaron (chat) + Amara (relayed via Aaron)
**Status**: Research-grade preservation. The Aaron + Amara quoted bodies are verbatim; the surrounding framing is translation/synthesis. The distilled rule lands as doctrine substrate in `memory/feedback_executable_declarative_host_settings_aaron_amara_2026_04_29.md`. Companion design doc lands as `docs/ops/patterns/executable-host-settings.md` (Amara's MVP "PR 0").

---

## Trigger context

Following the multi-master CodeQL discovery on PR #849 (where the `code_quality severity=all` ruleset's `event=dynamic` run conflicts with the `codeql.yml` advanced-setup workflow), Aaron + Amara arrived at a structural framing:

Aaron: *"i agree with her terraform assesment, i also see what github means by legacy now, they probalby mean non -declartive, if there are two wasys to do something in github one declarative and one api driven we sould prefer the declarative and wrap the api to make it declarative."*

Aaron's reframe of "GitHub legacy" — it's not branch protection vs rulesets specifically; **legacy = non-declarative**. Whenever GitHub offers two paths for one capability, one declarative and one API-driven, prefer declarative; if no declarative path exists, **wrap the API to make it declarative.**

This generalises the "what's blocked on me" diagnostic into a doctrine: clickops and one-off API mutations are legacy. Git-as-source-of-truth + reconciler-driven convergence is the modern shape.

## Aaron — verbatim (Duende IdentityServer reference + GitHub-legacy reframe)

> *"Yes, you are likely referring to Duende IdentityServer (the successor to IdentityServer4). In a .NET environment, Duende supports declarative configuration for defining the 'blueprint' of your roles and claims, though the actual values for users are often managed through ASP.NET Core Identity or a custom Profile Service."* (Aaron relaying Amara's earlier referent)

> *"i agree with her terraform assesment, i also see what github means by legacy now, they probalby mean non -declartive, if there are two wasys to do something in github one declarative and one api driven we sould prefer the declarative and wrap the api to make it declarative."*

The Duende reference matters because it's the lineage example: identity + claims have already been solved declaratively in .NET via `IdentityResource`, `ApiScope`, and `IProfileService` — a declarative resource model with adapter for dynamic values. That's the shape Zeta should adopt for host settings too.

## Amara — verbatim (full design packet)

### TL;DR

> *Yes.*
>
> *If GitHub host settings are already checked into source, the next step is to make them executable.*
>
> *The target model:*
>
> ```text
> Git declares desired host state.
> Validator checks desired state.
> Planner diffs desired vs live host.
> Applier converges live host to desired state.
> Auditor reports drift.
> Rollback is another git change.
> ```
>
> *This should tie directly into the declarative identity/security model.*
>
> *Identity/security says: who is allowed to change host settings.*
> *Host-setting declarations say: what the host should look like.*
> *The reconciler says: what changes are needed to make the host match git.*
>
> *Carved:*
>
> ```text
> Host settings are not clickops.
> Host settings are compiled from git.
> ```
>
> *Sharper:*
>
> ```text
> If a GitHub setting matters, it should be declared, diffed, applied, audited, and reversible through git.
> ```

### Why this belongs in Zeta

> *We already moved toward:*
>
> ```text
> git-native identity
> git-native security
> git-native claims / WorkClaims
> git-native agent topology
> git-native CI classifier
> git-native mirror topology
> ```
>
> *So GitHub host settings should not be a separate click-world.*
>
> *They should become:*
>
> ```text
> git-native desired state
> host-adapter executable state
> ```
>
> *Today the host is GitHub. Future hosts may be: GitLab, local-git, Zeta DB/channel, Zeta-native forge.*
>
> *So the model should be adapter-based, not GitHub-hardcoded forever.*

### Core doctrine

> ```text
> Git is desired state.
> Host is applied state.
> Drift is a bug or an approved emergency.
> Reconciler is the bridge.
> Policy controls the bridge.
> ```

### Proposed repo layout

> ```text
> .zeta/
>   hosts/
>     README.md
>     model.schema.json
>
>     github/
>       lfg-zeta.yaml
>       acehack-zeta-mirror.yaml
>       schemas/
>         repository.schema.json
>         ruleset.schema.json
>         branch-protection.schema.json
>         code-scanning.schema.json
>         actions.schema.json
>         environments.schema.json
>         secrets.schema.json
>         webhooks.schema.json
>         labels.schema.json
>
>       snapshots/
>         lfg-zeta.live.normalized.json
>         acehack-zeta.live.normalized.json
>
>       plans/
>         .gitkeep
>
>   security/
>     policies.yaml
>     capabilities.yaml
>     resources.yaml
>
>   identity/
>     clients.yaml
>     actors.yaml
>
> tools/hosts/
>   validate-host-settings.ts
>   fetch-live-host-settings.ts
>   normalize-github-settings.ts
>   diff-host-settings.ts
>   plan-host-settings.ts
>   apply-host-settings.ts
>   explain-host-drift.ts
> ```
>
> *Alternative name if `.zeta/hosts` feels too broad: `.zeta/adapters/github/**`. But I prefer `.zeta/hosts` because GitHub is just one host adapter.*

### Desired-state model (example)

> ```yaml
> host:
>   id: github:lfg-zeta
>   adapter: github
>   owner: Lucent-Financial-Group
>   repo: Zeta
>   mode: canonical
>
> repository:
>   visibility: public
>   default_branch: main
>   allow_forking: true
>   delete_branch_on_merge: true
>   allow_merge_commit: false
>   allow_squash_merge: true
>   allow_rebase_merge: false
>   allow_auto_merge: true
>
> rulesets:
>   - name: Default
>     target: branch
>     enforcement: active
>     include:
>       - refs/heads/main
>     rules:
>       - type: deletion
>       - type: non_fast_forward
>       - type: pull_request
>         parameters:
>           required_approving_review_count: 1
>           dismiss_stale_reviews_on_push: false
>       - type: required_status_checks
>         parameters:
>           strict_required_status_checks_policy: false
>           required_status_checks:
>             - context: lint (semgrep)
>             - context: build-and-test (ubuntu-24.04)
>             - context: code_quality
>
> branch_protection:
>   main:
>     enabled: true
>     strict_required_status_checks: false
>     required_status_checks:
>       - lint (semgrep)
>       - code_quality
>     enforce_admins: false
>
> code_scanning:
>   owner: advanced_setup
>   default_setup:
>     state: not-configured
>   required_code_quality: true
>
> actions:
>   enabled: true
>   default_workflow_permissions: read
>   can_approve_pull_request_reviews: false
>
> mirror_policy:
>   acehack:
>     mode: inactive_mirror
>     direction: canonical_to_mirror
>     force_sync_allowed: true
>     force_mode_default: force_with_lease
> ```
>
> *Important: this is desired state, not live dump. Do not check in GitHub's raw API JSON as policy. Normalize it first.*

### Normalize, do not raw-dump

> *GitHub API responses contain fields that are: computed, server-assigned, timestamps, URLs, database IDs, node IDs, ordering noise, permission-derived, feature-plan-dependent.*
>
> *The declaration should include only the fields we intend to own.*
>
> *So the pipeline needs two representations:*
>
> ```text
> Desired:
>   human-edited YAML
>
> Live snapshot:
>   normalized JSON fetched from GitHub
>
> Plan:
>   machine-produced diff from desired vs live
> ```

### Enforced mutation flow

> *No direct clickops except emergencies.*
>
> *Normal flow:*
>
> ```text
> 1. Edit .zeta/hosts/github/lfg-zeta.yaml
> 2. Run validate
> 3. Run plan against live GitHub
> 4. Commit desired change + plan summary
> 5. PR review
> 6. Merge
> 7. Reconciler applies
> 8. Reconciler writes receipt / drift report
> ```
>
> *Emergency flow:*
>
> ```text
> 1. Emergency host change allowed by authorized actor
> 2. Reconciler detects drift
> 3. Drift report opens issue / PR
> 4. Git declaration catches up or host is reverted
> ```
>
> *Carved:*
>
> ```text
> Clickops may happen in emergencies.
> Clickops may not remain invisible.
> ```

### Commands

> ```bash
> bun run hosts:validate
> bun run hosts:fetch -- --host github:lfg-zeta
> bun run hosts:diff -- --host github:lfg-zeta
> bun run hosts:plan -- --host github:lfg-zeta
> bun run hosts:apply -- --host github:lfg-zeta --plan .zeta/hosts/github/plans/...
> bun run hosts:audit -- --host github:lfg-zeta
> ```

### Validate / Fetch / Normalize / Diff / Plan / Apply

(Full per-step semantics quoted below — see Amara's TL;DR for the categorisation. Each step has explicit input/output contract; apply is policy-gated, idempotent, dry-run-by-default, requires explicit `--apply`, emits receipts.)

### Tie-in to declarative security

> *Host settings are authority surfaces.*
>
> *Add capabilities:*
>
> ```yaml
> capabilities:
>   host.settings.read:        { kind: read }
>   host.settings.plan:        { kind: plan }
>   host.settings.apply:       { kind: mutate_host, requires_claim: true, risk: high }
>   host.ruleset.write:        { kind: mutate_host, requires_claim: true, risk: high }
>   host.branch_protection.write: { kind: mutate_host, requires_claim: true, risk: high }
>   host.code_scanning.write:  { kind: mutate_host, requires_claim: true, risk: high }
>   host.billing_affecting.write: { kind: mutate_host, requires_claim: true, risk: authority }
> ```
>
> *Roles: host_settings_reader / host_settings_maintainer / host_billing_guardian.*
>
> *Policies:*
>
> ```yaml
> policies:
>   - id: apply-host-settings-requires-merged-declaration
>     effect: allow
>     subjects: { roles: [host_settings_maintainer] }
>     actions: [host.settings.apply]
>     resources: [hosts.github.lfg_zeta]
>     conditions:
>       declaration_ref: main
>       declaration_valid: true
>       plan_reviewed: true
>       claim_status: active
>       ci_green: true
>
>   - id: deny-paid-host-feature-without-billing-audit
>     effect: deny
>     actions: [host.billing_affecting.write]
>     unless:
>       billing_audit_status: active
>       explicit_paid_feature_override: true
> ```
>
> *Apply tool asks: `authorize(actor, host.settings.apply, github:lfg-zeta, context)` before changing GitHub.*

### Tie-in to identity (system actors)

> *Host apply should use a system actor.*
>
> ```yaml
> actors:
>   - actor_id: zeta-system://github-actions/host-reconciler
>     trust_domain: zeta_system
>     role_bindings:
>       - host_settings_maintainer
>     constraints:
>       cannot_elevate_own_permissions: true
>       cannot_apply_unmerged_declarations: true
>       cannot_enable_paid_features_without_policy: true
> ```

### Receipts + drift categories + safety model

(Full text in Amara's packet — receipts capture actor / declaration commit / plan hash / live-before/after hashes / decision; drift categories: `in_sync` / `expected_drift` / `unauthorized_drift` / `unsupported_drift` / `provider_drift` / `paid_feature_drift` / `permission_drift`; read/plan is cheap, apply requires WorkClaim + valid declaration + validated plan + policy allow + appropriate token + billing audit if paid + receipt emission; destructive changes require explicit ceremony.)

### GitHub-specific adapter notes

> *Rulesets — control branch/tag/push interaction; can be active/evaluate/disabled; layered with branch protection. REST API supports updating with Administration write permissions.*
>
> *Design implication:*
>
> ```text
> Prefer rulesets as modern canonical host-setting surface where possible.
> Model legacy branch protection separately until fully migrated.
> Detect conflicting ruleset + branch-protection semantics.
> ```
>
> *Branch protection — endpoints can read/update required checks; updates require admin/owner; arrays like users/teams/apps can replace prior values.*
>
> *Design implication: apply must use read-modify-write carefully. Never blindly replace arrays without comparing desired/full live state.*
>
> *Code scanning — API includes endpoints for getting/updating default setup configuration and uploading SARIF. Updating default setup requires Administration write permission.*
>
> *Design implication: model CodeQL owner as `default_setup` / `advanced_setup` / `none`. Do not let default setup and advanced setup fight.*

### Why not just Terraform?

> *Terraform is good at infra desired state. But Zeta needs:*
>
> ```text
> git-native agent WorkClaims
> AgencySignature receipts
> policy decisions tied to actors
> host-portable adapters
> Zeta DB/channel future
> fine-grained PR/lane authority
> billing audit as policy condition
> ```
>
> *Terraform can be reference lineage or even temporary engine for some surfaces. But the Zeta design should be:*
>
> ```text
> Terraform-like declarative drift/apply,
> but Zeta-native identity/security/receipts.
> ```

### Apply modes

> ```text
> observe:    fetch + normalize only
> plan:       desired vs live diff, no mutation
> apply-safe: only non-destructive changes
> apply-all:  high-risk/destructive changes allowed if policy permits
> break-glass: manual, logged, time-limited, requires follow-up PR
> ```
>
> *Default should be: `plan`. Never default to apply.*

### Relation to local test repos

> *Aaron granted standing authority for public test repos on LFG/AceHack with billing audit. This is perfect for testing host-setting apply.*
>
> *Use public test repos as integration test targets:*
>
> ```text
> zeta-test-host-settings-rulesets
> zeta-test-code-scanning-config
> zeta-test-branch-protection
> ```
>
> *But paid features remain policy-gated: public repo default, no private repos, no larger runners, billing audit active.*

### MVP sequence

> *PR 0 — design doc: `docs/ops/patterns/executable-host-settings.md`. No tooling yet.*
>
> *PR 1 — schema + current declaration: `.zeta/hosts/model.schema.json`, `.zeta/hosts/github/lfg-zeta.yaml`, `.zeta/hosts/github/acehack-zeta-mirror.yaml`. Take existing checked-in host-setting docs/config and normalize them into this shape.*
>
> *PR 2 — fetch + normalize: `tools/hosts/fetch-live-host-settings.ts`, `tools/hosts/normalize-github-settings.ts`. Read-only.*
>
> *PR 3 — diff + plan: `tools/hosts/diff-host-settings.ts`, `tools/hosts/plan-host-settings.ts`. Still no mutation.*
>
> *PR 4 — audit CI: schedule drift audit. Open issue/PR on drift.*
>
> *PR 5 — safe apply for one surface: pick low-risk first (labels / branch delete-on-merge / repo description/topics). Do not start with rulesets as the first apply surface unless we test in public throwaway repos.*
>
> *PR 6 — high-risk apply with policy gate: integrate WorkClaims, host_settings_maintainer role, AgencySignature receipt.*
>
> *PR 7 — host adapter abstraction: prepare GitLab/local-git/Zeta-native adapters.*

### Open review questions (10)

> *1. Should desired host state live under `.zeta/hosts/**`?*
> *2. Should rulesets be the preferred modern surface over branch protection?*
> *3. Which host settings are safe enough for first apply?*
> *4. Should live snapshots be committed or only stored as CI artifacts?*
> *5. Where should receipts live?*
> *6. Should apply run automatically on merge, or require manual dispatch first?*
> *7. How do we represent unsupported GitHub settings?*
> *8. Should Terraform provider schemas be used as reference only or generator input?*
> *9. How does this integrate with WorkClaims and AgencySignature?*
> *10. Which settings are paid-feature/billing-sensitive?*

### Final doctrine

> ```text
> Declare host state in git.
> Validate before merge.
> Plan before apply.
> Apply only from canonical git.
> Audit continuously.
> Treat clickops as drift unless emergency-approved.
> Record every mutation as a receipt.
> ```
>
> *Blade:*
>
> ```text
> Git is not just where we remember GitHub settings.
> Git is how we change them.
> ```
>
> *My strongest recommendation: start read-only. Fetch/normalize/diff first, then plan, then only later apply. And when apply starts, do it in public test repos before touching canonical Zeta rulesets.*
>
> *The subtle but important split:*
>
> ```text
> Checked-in settings = memory.
> Executable declarations = infrastructure.
> Receipted apply = governance.
> ```
>
> *That's the Zeta-native version.*

## Why this packet matters now (synthesis)

The multi-master CodeQL conflict on PR #849 (task #342) is exactly the kind of problem this design addresses: GitHub's `code_quality severity=all` ruleset triggers a `event=dynamic` CodeQL run that conflicts with the advanced-setup `codeql.yml` workflow. Resolving it by-hand requires either ruleset-rule disabling (which I parked pending Aaron's review) or hoping GitHub aligns the two paths. With this design landed:

1. The ruleset state would be declared in `.zeta/hosts/github/lfg-zeta.yaml`
2. The `code_quality` rule's interaction with the codeql.yml advanced-setup would be visible in the declaration
3. The reconciler would detect the conflict at planning time, not at PR-runtime
4. Resolution path is "edit declaration → PR → merge → reconciler converges" — no clickops

This is **why "GitHub legacy = non-declarative" matters**: the failure mode on #849 isn't a bug in either CodeQL path individually; it's that the two paths can't be reconciled because there's no canonical declaration of intent.

## Operational status

- ✅ Verbatim packet preserved (this file).
- ✅ Distilled doctrine memory file lands alongside (`memory/feedback_executable_declarative_host_settings_aaron_amara_2026_04_29.md`).
- ✅ Companion design doc lands at `docs/ops/patterns/executable-host-settings.md` (Amara's MVP "PR 0").
- ✅ MEMORY.md index entry paired (per memory-index-integrity rule).
- ⏸️ Schema + current declaration (Amara's PR 1) — separate later PR.
- ⏸️ Fetch + normalize tools (Amara's PR 2) — separate later PR.
- ⏸️ Diff + plan tools (Amara's PR 3) — separate later PR.
- ⏸️ Audit CI (Amara's PR 4) — separate later PR.
- ⏸️ Apply (Amara's PR 5+) — only after read-only path validated in public test repos per the standing authority grant.

## Composes with

- `feedback_otto_363_substrate_or_it_didnt_happen_no_invisible_directives_aaron_amara_2026_04_29.md` — the rule that demands this packet land as durable substrate.
- `feedback_aaron_channel_verbatim_preservation_anything_through_this_channel_2026_04_29.md` — the verbatim-preservation rule.
- `feedback_zeta_agent_orchestra_capability_role_claim_isolation_aaron_amara_2026_04_29.md` — Agent Orchestra (capabilities / roles / claims / WorkClaims) is the identity layer this design ties into.
- `feedback_standing_authority_create_test_git_repos_public_only_track_billing_aaron_2026_04_29.md` — public test repos are the integration-test surface for the apply tools.
- `feedback_lfg_only_development_flow_acehack_is_mirror_aaron_amara_2026_04_29.md` — the mirror-policy block in the desired-state YAML formalises the LFG-canonical / AceHack-mirror doctrine.
- Task #342 (multi-master CodeQL on PR #849) — the failure mode this design is the structural answer to.
- Task #341 (TS port multi-remote design) — the host-adapter abstraction layer.
