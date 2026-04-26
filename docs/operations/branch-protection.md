# Branch protection — actual gates per repo settings

**Purpose:** make the actual GitHub branch-protection config visible IN-REPO so agents reading the substrate see the real gates, not training-data defaults. Closes the live-lock hallucination class where "BLOCKED" was misdiagnosed as "review-approval gated" when the actual gates are CI checks + thread resolution.

**Snapshot source:** `gh api repos/<owner>/<repo>/rules/branches/main` (run periodically; see [Refresh cadence](#refresh-cadence)).

**Last snapshot:** 2026-04-26 — see `branch-protection-lfg-main.json` and `branch-protection-acehack-main.json` for the raw GitHub API output.

---

## LFG (Lucent-Financial-Group/Zeta) main branch — actual gates

```text
- deletion: forbidden
- non_fast_forward: forbidden
- copilot_code_review: review_on_push: true
- code_quality: severity all
- pull_request:
    required_approving_review_count: 0   ← NO HUMAN REVIEW REQUIRED
    required_review_thread_resolution: true   ← all threads must resolve
    allowed_merge_methods: [squash]
- required_linear_history: enforced
```

**To merge a PR on LFG main, the following gates must clear:**

1. **All CI checks PASS** (`code_quality: all`)
2. **All review threads RESOLVED** (`required_review_thread_resolution: true`)
3. **Copilot has REVIEWED the latest push** (`copilot_code_review.review_on_push: true`)
4. **Linear history** (no merge commits — squash only)

**Human review approval is EXPLICITLY NOT required** (`required_approving_review_count: 0`).

## AceHack (AceHack/Zeta) main branch — actual gates

See `branch-protection-acehack-main.json`. Per Aaron 2026-04-26 (HB-005 settings-sync), AceHack is intended to be symmetric with LFG where platform allows; merge queue is the known asymmetric exception (org-only feature).

---

## Why this file exists

**The live-lock hallucination class:** in many GitHub repos, branch protection requires ≥1 human review approval. Most training data biases agents toward this assumption. When an agent sees `mergeStateStatus: BLOCKED` on a PR, the statistical prior says "blocked on review-approval."

**Zeta config is non-standard:** `required_approving_review_count: 0`. Review approval is NOT a gate. The actual blockers are CI checks + thread resolution.

**Without this file**, agents working on Zeta repeatedly misdiagnose BLOCKED PRs as review-approval-gated, then sit waiting for a review that's never required, while failing CI checks or unresolved threads accumulate as the actual blocker.

**With this file** (and the `AGENTS.md` required-reading entry that points here), agents reading the substrate during normal work will encounter the actual gates and override the training-data prior.

Per Otto-341 (mechanism over vigilance): this file is the mechanism. Memory-only reminders haven't held across sessions; substrate-in-repo gives agents a primary source they encounter naturally during repo navigation.

Per Otto-329 Phase 4 (full backups including settings): this is a step toward full host-layer backup. Future expansion: snapshot rulesets, repo-level toggles, secret names (not values), workflow permissions, etc.

## Diagnostic flow for "is this PR actually gated on review-approval?"

```bash
# Step 1: actual blocker classification
gh pr view <N> --repo <owner/repo> --json statusCheckRollup,reviewDecision --jq '{
  review: .reviewDecision,
  fails: ([.statusCheckRollup[] | select(.conclusion=="FAILURE")] | length),
  running: ([.statusCheckRollup[] | select(.status=="IN_PROGRESS" or .status=="QUEUED")] | length),
  success: ([.statusCheckRollup[] | select(.conclusion=="SUCCESS")] | length)
}'

# Step 2: thread resolution count
gh api graphql -f query='query { repository(owner: "OWNER", name: "REPO") { pullRequest(number: N) { reviewThreads(first: 50) { nodes { isResolved } } } } }' | \
  jq '[.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved == false)] | length'
```

Output classes:

- `fails: 0, threads: 0, BLOCKED` → likely Copilot review on latest push not yet posted; wait
- `fails: >0` → fix the failing checks (often transient `curl 502` infra flakes; check log via `gh run view --log-failed | grep "exit code|502|fatal"`)
- `running: >0` → CI in flight; wait for green
- `threads: >0` → drain the threads
- **NEVER** "review-approval gated" without `reviewDecision == "REVIEW_REQUIRED"` AND `required_approving_review_count > 0` in this file

## Refresh cadence

Run when:

- Aaron changes branch-protection settings via GitHub UI
- A new ruleset is added to either repo
- Quarterly drift check (audit substrate vs live state)

Refresh command:

```bash
gh api repos/Lucent-Financial-Group/Zeta/rules/branches/main | python3 -m json.tool > docs/operations/branch-protection-lfg-main.json
gh api repos/AceHack/Zeta/rules/branches/main | python3 -m json.tool > docs/operations/branch-protection-acehack-main.json
# Update the "Last snapshot" date above + edit the LFG / AceHack tables if rules changed
```

Future automation: a `tools/hygiene/check-branch-protection-snapshot-stale.sh` that warns if the JSON files are >30 days old. Owed work.

## Composes with

- **Otto-329 Phase 4** (full backups including host-layer settings) — this file is one step toward full Phase 4
- **Otto-341** (mechanism over vigilance) — substrate-as-mechanism, not memory-as-reminder
- **Otto-247** (training-data defaults drift) — the failure mode this file prevents
- **`memory/feedback_blocked_status_is_not_review_gating_check_status_checks_failure_first_otto_live_lock_2026_04_26.md`** — the live-lock memory this file structurally supports
- **AGENTS.md** required-reading section (separate update owed) — should reference this file so agent cold-start encounters it
