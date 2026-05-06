#!/usr/bin/env bash
# tools/hygiene/audit-lost-files.sh
#
# Implements the survey commands from tools/hygiene/LOST-FILES-LOCATIONS.md
# (Otto-329 Phase 8 substrate, 2026-04-25). The list-of-15-location-classes
# has been canonical since 2026-04-25; the executable form was named as
# owed-work in the doc's "Owed work" section but never landed.
#
# This script is the executable form of the catalog: classes 1-8 + 15 each
# run their survey command and report findings. Classes 9-14 are explicitly
# DEFERRED here (per-PR API calls expensive; covered by incident-response
# protocol in LOST-FILES-LOCATIONS.md, not by this script). Triage is
# per-class (see LOST-FILES-LOCATIONS.md for triage protocols).
#
# Composes with: tools/hygiene/LOST-FILES-LOCATIONS.md (the catalog),
# memory/feedback_otto_329_*.md (Otto-329 ownership), Otto-262 trunk-based,
# Otto-257 clean-default smell, Otto-238 retractability glass-halo.

set -eu
# Note: pipefail intentionally NOT set -- this script has many `... | head -N`
# pipes where head closes the pipe early, which would otherwise SIGPIPE-kill
# the producer side of the pipeline (status 141) and abort the whole audit
# before later classes run. Failures are guarded individually via `|| true`
# / `2>/dev/null` where they matter.

# jq dependency check: most class queries require jq for JSON shaping.
# Fail clearly up front rather than partway through with set -e firing.
if ! command -v jq >/dev/null 2>&1; then
    echo "WARNING: jq not found; gh-API-driven classes (1, 2, 8) will be skipped or partial." >&2
    HAS_JQ=0
else
    HAS_JQ=1
fi

REPO="${REPO:-Lucent-Financial-Group/Zeta}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$REPO_ROOT"

echo "# Lost-files audit ($(date -u +%Y-%m-%dT%H:%MZ))"
echo ""
echo "Repo: $REPO_ROOT"
echo "Catalog: tools/hygiene/LOST-FILES-LOCATIONS.md (15 location-classes)"
echo ""

# Class 1: Closed-not-merged PRs
echo "## 1. Closed-not-merged PRs"
if command -v gh >/dev/null 2>&1 && [ "$HAS_JQ" = "1" ]; then
    closed_json=$(gh pr list --repo "$REPO" --state closed --limit 500 \
        --json number,title,closedAt,mergedAt,headRefName 2>/dev/null || echo "[]")
    count=$(echo "$closed_json" | jq -r '[.[] | select(.mergedAt == null)] | length' 2>/dev/null || echo "0")
    echo "Count: $count"
    if [ "$count" != "0" ] && [ "$count" != "" ]; then
        echo "Triage: per Otto-262 + Otto-257 + Otto-254 -- recover via roll-forward on fresh short-lived branch OR prune."
        # Materialize then sample to avoid SIGPIPE on the jq producer.
        sample=$(echo "$closed_json" \
            | jq -r '[.[] | select(.mergedAt == null) | "PR #\(.number): \(.title) (closed \(.closedAt))"] | .[]' 2>/dev/null \
            || true)
        echo "$sample" | head -10
    fi
else
    echo "SKIP: gh CLI or jq not available"
fi
echo ""

# Class 2: Orphan branches (remote, unmerged-to-main AND no-open-PR)
# "no-open-PR" => only OPEN PRs are subtracted. A branch with only closed/
# merged historical PRs is still an orphan (no live PR keeps it tethered).
echo "## 2. Orphan branches (remote, unmerged-to-main AND no-open-PR)"
unmerged=$(git for-each-ref --no-merged origin/main --format='%(refname:short)' refs/remotes/origin/ 2>/dev/null \
    | sed 's|^origin/||' | sort -u || echo "")
if command -v gh >/dev/null 2>&1 && [ "$HAS_JQ" = "1" ]; then
    pr_branches=$(gh pr list --repo "$REPO" --state open --limit 500 \
        --json headRefName 2>/dev/null \
        | jq -r '.[].headRefName' 2>/dev/null | sort -u || echo "")
    orphans=$(comm -23 <(echo "$unmerged") <(echo "$pr_branches") 2>/dev/null || echo "")
    count=$(printf '%s' "$orphans" | grep -cv '^$' || true)
    [ -z "$count" ] && count=0
    echo "Count: $count"
    if [ "$count" != "0" ]; then
        echo "Sample (first 10):"
        echo "$orphans" | head -10
    fi
else
    echo "SKIP: gh CLI or jq not available"
fi
echo ""

# Class 3: Deleted files in git history (last 30 days)
echo "## 3. Deleted files in git history (last 30 days)"
deleted=$(git log --all --diff-filter=D --since="30 days ago" --name-only --pretty=format:'' 2>/dev/null \
    | sort -u | grep -v '^$' || echo "")
count=$(echo "$deleted" | grep -cv '^$' || echo "0")
echo "Count: $count"
if [ "$count" != "0" ]; then
    echo "Sample (first 10):"
    echo "$deleted" | head -10
fi
echo ""

# Class 4: Reflog entries (local-only)
echo "## 4. Reflog entries (local-only; risk of loss on git gc)"
reflog_count=$(git reflog --all 2>/dev/null | wc -l | tr -d ' ' || echo "0")
echo "Count: $reflog_count"
if [ "$reflog_count" != "0" ]; then
    echo "Latest entries (first 5):"
    git reflog --all 2>/dev/null | head -5
fi
echo ""

# Class 5: Stash entries
echo "## 5. Stash entries"
stash_count=$(git stash list 2>/dev/null | wc -l | tr -d ' ' || echo "0")
echo "Count: $stash_count"
if [ "$stash_count" != "0" ]; then
    echo "All stashes:"
    git stash list 2>/dev/null
fi
echo ""

# Class 6: Untracked working-directory artifacts
echo "## 6. Untracked working-directory artifacts (drop/, .playwright-mcp/, *.tmp, *.log)"
untracked=$(git status --porcelain --ignored 2>/dev/null \
    | grep -E '^(\?\?|!!)' | head -20 || echo "")
count=$(echo "$untracked" | grep -cv '^$' || echo "0")
echo "Count (sample 20): $count"
if [ "$count" != "0" ]; then
    echo "Sample:"
    echo "$untracked" | head -10
fi
echo ""

# Class 7: Subagent worktree remnants
echo "## 7. Subagent worktree remnants"
wt_count=$(git worktree list 2>/dev/null | wc -l | tr -d ' ' || echo "0")
echo "Count: $wt_count"
if [ "$wt_count" != "1" ]; then
    echo "Worktrees:"
    git worktree list 2>/dev/null
fi
echo ""

# Class 8: GitHub draft PRs (unpublished)
echo "## 8. GitHub draft PRs (unpublished)"
if command -v gh >/dev/null 2>&1; then
    draft_count=$(gh pr list --repo "$REPO" --state open --search "is:draft" \
        --json number 2>/dev/null | jq 'length' 2>/dev/null || echo "0")
    echo "Count: $draft_count"
    if [ "$draft_count" != "0" ] && [ "$draft_count" != "" ]; then
        gh pr list --repo "$REPO" --state open --search "is:draft" \
            --json number,title 2>/dev/null \
            | jq -r '.[] | "PR #\(.number): \(.title)"' 2>/dev/null | head -5
    fi
else
    echo "SKIP: gh CLI not available"
fi
echo ""

# Classes 9-14: closed-PR threads, squash intermediates, force-pushed-over,
# courier-ferry, external-tool exports, deleted-PR-descriptions
# These are best surveyed as part of incident-response per LOST-FILES-LOCATIONS.md;
# automated survey would be expensive (per-PR API call).
echo "## 9-14. Closed-PR threads / squash intermediates / force-pushed / courier-ferry / external exports / deleted-PR-descriptions"
echo "DEFERRED: per-PR API calls expensive; run on incident or full-sweep cadence."
echo "See: tools/hygiene/LOST-FILES-LOCATIONS.md classes 9-14 for survey commands."
echo ""

# Class 15: Memory-file deletions (cross-tree drift)
echo "## 15. Memory-file deletions (cross-tree drift; broken refs)"
if [ -f "$REPO_ROOT/tools/hygiene/audit-memory-references.ts" ]; then
    if command -v bun >/dev/null 2>&1; then
        echo "Delegating to: bun tools/hygiene/audit-memory-references.ts"
        bun "$REPO_ROOT/tools/hygiene/audit-memory-references.ts" 2>&1 | tail -20 || echo "SCRIPT FAILED"
    else
        echo "SKIP: bun not available"
    fi
else
    echo "SKIP: tools/hygiene/audit-memory-references.ts not found"
fi
echo ""

echo "## Summary"
echo "Audit complete. Catalog: tools/hygiene/LOST-FILES-LOCATIONS.md"
echo "Triage: per-class (see catalog for protocols + Otto-262/-254/-257/-238 lineage)."
