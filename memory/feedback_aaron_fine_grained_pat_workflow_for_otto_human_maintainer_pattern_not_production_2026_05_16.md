---
name: aaron-fine-grained-pat-workflow-for-otto-human-maintainer-pattern
description: "2026-05-16 substrate — Aaron prefers fine-grained PATs (not classic) for granting Otto GitHub scope on a maintainer's laptop. Pattern is human-maintainer-grants-one-at-a-time on their own laptop, NOT production-grade GitHub App auth. Includes the full permission-checklist mapping for future humans to use as template."
metadata: 
  node_type: memory
  type: feedback
  created: 2026-05-16
  originSessionId: 04f5c5ca-b54a-4fb6-a84c-b8e39cd46cec
---

## Origin

Aaron 2026-05-16, after I'd offered both classic-PAT and fine-grained-PAT paths for granting all GitHub scopes:

> *"lets do fine grained i'll run the gh command to auth it you give me and you can save it latter for current scoped mapped out i don't like classic tokens but i also want to use the humanmaintainer workflow not necessalry production casue humans will grant you to these one at a time on their behalf on thier latop"*

Three pattern declarations:
1. **Fine-grained PATs, not classic** — Aaron's revealed-preference for security shape
2. **Human-maintainer workflow** — humans grant Otto scopes one-at-a-time on their own laptops (not centrally managed)
3. **Not production** — production auth would be GitHub App (B-0571); this is the human-side flow

**Correction same-day** — Aaron preferred the `gh auth refresh` web-OAuth flow over fine-grained PAT UI checklist:

> *"instead of creating a fine grained it's easier to get right if you just excute the right gh command and the webpage shows the maintiner what auth scopes you are requesting on thier behlf already"*

So the OPERATIONAL workflow is: Otto provides the `gh auth refresh -h github.com -s <scope-list>` command; human runs it; GitHub's web-auth page enumerates the requested scopes for human review; human approves in browser; gh receives the updated token. The web page IS the human-review surface, not Otto's checklist transcription. The fine-grained PAT path (still documented below) remains a fallback for cases where the `gh auth refresh` OAuth scope set is insufficient.

This composes with the morning's grey-hat-chose-Enterprise calibration (`feedback_aaron_grey_hat_chose_enterprise_over_orthogonal_accounts_or_ips_*`) — legitimate-path preference at scope-management layer.

## Preferred workflow: `gh auth refresh` (web OAuth)

The maintainer runs ONE command. GitHub's web page shows them the scope list. They approve. Done.

### Comprehensive scope command for "all Otto operations"

```bash
gh auth refresh -h github.com -s "manage_billing:enterprise,manage_runners:enterprise,admin:org,admin:public_key,admin:repo_hook,admin:org_hook,admin:gpg_key,admin:ssh_signing_key,delete_repo,notifications,user,write:discussion,write:packages,delete:packages,audit_log,codespace,copilot,manage_billing:copilot,project,write:network_configurations,security_events"
```

This adds (preserves any already-granted):

- **Billing**: `manage_billing:enterprise` + `manage_billing:copilot` (covers the 2026-05-16 scarcity-mitigation work)
- **Enterprise admin**: `manage_runners:enterprise` (Actions runner config), `audit_log` (enterprise audit log)
- **Org admin**: `admin:org` (full vs read-only)
- **Keys**: `admin:public_key`, `admin:gpg_key`, `admin:ssh_signing_key`
- **Webhooks**: `admin:repo_hook`, `admin:org_hook`
- **Lifecycle**: `delete_repo`, `notifications`, `user`
- **Features**: `write:discussion`, `write:packages`+`delete:packages`, `codespace`, `copilot`, `project`, `write:network_configurations`, `security_events`

After running, verify: `gh auth status` shows the updated scope list.

### CRITICAL — `gh auth refresh` is interactive (Otto-can't-run-blindly)

Aaron 2026-05-16 caught this when Otto tried to fire the command via Bash tool: **`gh auth refresh` requires interactive human steps that Otto's non-interactive subprocess can't supply**:

```text
$ gh auth refresh -h github.com -s "<scopes>"
? Authenticate Git with your GitHub credentials? Yes        ← Y/n prompt
! First copy your one-time code: 472D-B3EF                  ← human MUST copy this code
Press Enter to open https://github.com/login/device in your browser...  ← Enter blocks
✓ Authentication complete.                                   ← only after browser-side approve
```

The one-time code (`472D-B3EF` in this run) is the load-bearing credential — it must be transferred from terminal to browser. Otto running the command blindly via Bash tool either hangs at the Y/n prompt or — if it answers — burns the code without surfacing it.

**Operational pattern for now**: Otto prepares the gh command string; human runs it in their own terminal; human handles the interactive flow. Otto does NOT fire `gh auth refresh` itself.

**Future substrate** (Aaron 2026-05-16: "we need a skill around this"): a skill that wraps `gh auth refresh` and:
1. Runs the command with stdin pumped to handle the Y/n
2. Captures the one-time code from stdout
3. Surfaces the code prominently to the human (chat output, copy-to-clipboard, OS notification)
4. Pumps Enter to open the browser
5. Polls `gh auth status` until the new scopes appear (browser-side approval complete)
6. Records the scope grant in the registry per the "track which scopes are active on which machine" pattern

Backlog row TBD — see B-NNNN for the actual skill spec.

### GitHub OAuth scope-name collapsing

Some classic-PAT scope names get collapsed/implied by GitHub's OAuth flow. The 2026-05-16 grant requested:

- `manage_billing:enterprise` → not in resulting scope list, but `admin:enterprise` (already granted) covers billing read endpoints empirically (`enterprises/<slug>/settings/billing/usage` returned data)
- `manage_billing:copilot` → not in list; copilot billing endpoint returned 404 (may not exist via API regardless)
- `manage_runners:enterprise` → not in list; may be implied by admin:enterprise
- `security_events` → not in list; may be implied by `repo` scope

The substrate-honest discipline: request the comprehensive scope list; verify post-grant which endpoints actually work; document the empirical coverage rather than the requested coverage.

### Narrower commands for partial scope grants

If a human wants to grant Otto only billing-scope (e.g., for a billing-audit session):

```bash
gh auth refresh -h github.com -s "manage_billing:enterprise,manage_billing:copilot,audit_log"
```

Or only org-admin scope:

```bash
gh auth refresh -h github.com -s "admin:org"
```

The granularity is the human's call. Otto requests via the command; GitHub shows what's being asked; human approves what they're comfortable with.

## When this applies

When a NEW human maintainer is setting up Otto on their laptop and needs to grant Otto GitHub API scope:

- Follow this checklist instead of issuing a classic PAT
- Each human's PAT is theirs (revoking == removing that human's Otto access)
- The PAT is scoped to whatever orgs/repos that human can grant access to (their own RBAC limits apply)

This is NOT for production automation — for that, use a GitHub App per B-0571 (separate rate-limit pool, no human-identity attribution).

## The fine-grained PAT creation checklist

### Step 1: URL + basic settings

- **Create at**: <https://github.com/settings/personal-access-tokens/new>
- **Token name**: `zeta-otto-<surface>-<YYYY-MM-DD>` (e.g., `zeta-otto-cli-2026-05-16`)
- **Resource owner**: the org Otto should operate in (e.g., `Lucent-Financial-Group`)
- **Repository access**: "All repositories" (covers future repos) OR "Only select repositories" → specific repos (narrower)
- **Expiration**: 90 days (rotation-safe) / 1 year (less ceremony) / No expiration (set-and-forget; least secure)

### Step 2: Repository permissions

Set to **Read and write** for full Otto operation:

- Actions
- Administration
- Attestations
- Code scanning alerts
- Codespaces
- Codespaces lifecycle admin
- Codespaces secrets
- Commit statuses
- Contents (the basic "edit files" permission)
- Custom properties
- Dependabot alerts
- Dependabot secrets
- Deployments
- Environments
- Issues
- Merge queues
- Pages
- Pull requests
- Repository security advisories
- Secret scanning alerts
- Secrets
- Variables
- Webhooks
- Workflows

**Read-only** (these have no write variant):

- Codespaces metadata
- Metadata (always required for any PAT to work)

### Step 3: Organization permissions

Set to **Read and write**:

- Administration
- Attestation enforcement
- Blocking users
- Custom organization roles
- Custom properties
- Custom repository roles
- Discussions
- Issue types
- Knowledge bases
- Members
- Network configurations
- Organization announcement banners
- Organization codespaces
- Organization codespaces secrets
- Organization codespaces settings
- Organization copilot seat management
- Organization dependabot secrets
- Organization private registries
- Projects
- Secrets
- Self-hosted runners
- Single sign on
- Team discussions
- Variables
- Webhooks

**Read-only**:

- API Insights
- Audit log
- Events
- Plan

### Step 4: Account permissions

Set to **Read and write**:

- Codespaces user secrets
- Email addresses
- GPG keys
- Gists
- Git SSH keys
- Interaction limits
- Profile
- Repository invitations
- SSH signing keys
- Starring
- Watching

**Read-only**:

- Block another user
- Copilot Chat
- Followers
- Knowledge bases
- Plan

### Step 5: Install the token locally

After GitHub shows the token (visible once — copy immediately):

```bash
# Pipe the token directly
gh auth login --with-token < <(echo "ghp_YOUR_TOKEN_HERE")

# OR pipe from clipboard (macOS)
gh auth login --with-token < <(pbpaste)
```

Verify:

```bash
gh auth status
# Should show the new PAT installed
```

## Enterprise-scope caveat

Fine-grained PATs do NOT currently cover all enterprise-level APIs that classic-PAT scopes do. Specifically, the following operations may still require a classic PAT with `admin:enterprise` or `manage_billing:enterprise`:

- `gh api enterprises/<slug>/rulesets` — enterprise-level ruleset operations (used in B-0580 work)
- `gh api enterprises/<slug>/billing/*` — enterprise billing operations
- `gh api enterprises/<slug>/audit-log` — enterprise audit log
- Some `gh api enterprises/<slug>/...` admin operations

**Workaround pattern**:

1. Use the fine-grained PAT as the DEFAULT (`gh auth login` profile)
2. Keep a classic PAT (created with `gh auth refresh -h github.com -s admin:enterprise,manage_billing:enterprise`) as a separate profile OR as `GH_ENTERPRISE_TOKEN` env var
3. Switch to classic only for the specific enterprise-API calls

Long-term: as GitHub expands fine-grained PAT coverage to all enterprise APIs, the classic-PAT can be retired. Track this via the GitHub changelog at <https://github.blog/changelog/>.

## Composes with

- B-0571 (GitHub App for factory automation — the PRODUCTION-grade alternative to this human-maintainer workflow)
- B-0572 (LFG GitHub tier decision — Enterprise trial that enables enterprise-scope operations)
- B-0580 (Enterprise ruleset management — uses enterprise-scope APIs that fine-grained may not cover)
- `.claude/rules/methodology-hard-limits.md` (least-privilege at token level; legal/ethical floor preserved regardless of scope)
- `.claude/rules/dont-ask-permission.md` (budget-INCREASE gate still binding even with full scope)
- `feedback_aaron_grey_hat_chose_enterprise_over_orthogonal_accounts_or_ips_legitimate_path_over_gray_area_workarounds_2026_05_16.md` (legitimate-path preference at the scope-management layer; same family of revealed-preference)
- `feedback_aaron_servicetitan_funding_24_month_runway_infinite_budget_dora_metrics_roi_cover_2026_05_16.md` (funding context — comprehensive scope is affordable from Aaron's risk perspective)

## Operational discipline for future-Otto

When a new human maintainer is setting up Otto on their laptop:

1. **Default to this fine-grained workflow**, not classic PATs
2. **Walk through this checklist** as the template; each human can narrow scope based on what THEIR role allows them to grant
3. **Note the enterprise-scope gap** explicitly — if Otto needs enterprise-API access, the human must additionally provide a classic PAT
4. **Save the actual installed token outside Otto's reach** — Otto sees `gh auth status` but not the token plaintext; humans keep the token in their password manager
5. **Rotation reminder**: if expiration was set (90d/1yr), set a calendar reminder; expired token = Otto stops working until refresh
6. **Revocation is the human's call** — if the human decides to stop hosting Otto on their laptop, they revoke the PAT at <https://github.com/settings/personal-access-tokens>; Otto stops working immediately

## Why this workflow shape

Aaron's framing positions this between two extremes:

- **Production extreme**: GitHub App auth (B-0571) — separate rate-limit pool, no human-identity attribution, bot-account semantics. Too much ceremony for human-maintainer setup.
- **Convenience extreme**: classic PAT with all scopes checked. Aaron explicitly rejected this ("i don't like classic tokens").

Fine-grained PATs sit in the middle: per-resource scope granularity, human-identity attribution (the human can see what their PAT did in audit logs), revocation by the human, BUT same human-account rate-limit pool (5000/hr GraphQL shared with the human's other PAT use).

This is the substrate-honest shape for the "human grants Otto access on their laptop" pattern.
