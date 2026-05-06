#!/usr/bin/env bash
# tools/hygiene/audit-trajectories.sh
#
# Sibling to tools/hygiene/audit-lost-files.sh. Where the lost-files audit
# answers "what artifacts might be drifting out of reach?", this audit
# answers "what trajectory axes is the factory currently running on, and
# is each one healthy?"
#
# Aaron 2026-05-05: "not just lost files all the trjaectoris and backlog
# tiems" -- extending the lost-files audit pattern to cover trajectories.
# Composes with the orthogonal-axes discipline
# (memory/feedback_orthogonal_axes_factory_hygiene.md): factory axes form
# an orthogonal basis; this audit enumerates them and reports drift.
#
# Axes covered:
#   1. Scheduled cadence workflows (.github/workflows/*-cadence.yml)
#   2. Event-driven lint / integrity workflows (*-lint.yml, *-integrity.yml)
#   3. Harness hooks (.claude/hooks/*.ts)
#   4. TS / bash hygiene tooling (tools/hygiene/audit-*.sh + .ts)
#   5. Razor-cadence tracking issues (gh label razor-cadence)
#   6. Skill router inventory (.claude/skills/)
#   7. Persona agent inventory (.claude/agents/)
#
# Composes with: tools/hygiene/audit-lost-files.sh (sibling),
# .github/workflows/razor-cadence.yml (B-0192 mechanization),
# memory/feedback_orthogonal_axes_factory_hygiene.md (axis basis).

set -euo pipefail

REPO="${REPO:-Lucent-Financial-Group/Zeta}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$REPO_ROOT"

echo "# Trajectory audit ($(date -u +%Y-%m-%dT%H:%MZ))"
echo ""
echo "Repo: $REPO_ROOT"
echo "Sibling: tools/hygiene/audit-lost-files.sh (lost-files axis)"
echo "Discipline: orthogonal-axes (memory/feedback_orthogonal_axes_factory_hygiene.md)"
echo ""

# Axis 1: Scheduled cadence workflows
echo "## 1. Scheduled cadence workflows (.github/workflows/*-cadence.yml)"
cadence_files=$(find .github/workflows -maxdepth 1 -name '*-cadence.yml' -type f 2>/dev/null | sort || echo "")
cadence_count=$(echo "$cadence_files" | grep -cv '^$' || echo "0")
echo "Count: $cadence_count"
if [ "$cadence_count" != "0" ]; then
    while IFS= read -r wf; do
        [ -z "$wf" ] && continue
        name=$(basename "$wf")
        cron=$(grep -E "^\s*-?\s*cron:" "$wf" 2>/dev/null | head -1 | sed 's/^[[:space:]]*-*[[:space:]]*//' || echo "(no cron)")
        echo ""
        echo "### $name"
        echo "Schedule: $cron"
        if command -v gh >/dev/null 2>&1; then
            recent=$(gh run list --repo "$REPO" --workflow="$name" --limit 5 \
                --json conclusion,createdAt,status 2>/dev/null \
                | jq -r '.[] | "  \(.createdAt) status=\(.status) conclusion=\(.conclusion // "n/a")"' 2>/dev/null \
                || echo "  (no recent runs)")
            if [ -z "$recent" ]; then
                echo "  Recent runs: (none in last 5)"
            else
                echo "  Recent runs (last 5):"
                echo "$recent"
            fi
        else
            echo "  SKIP: gh CLI not available"
        fi
    done <<< "$cadence_files"
fi
echo ""

# Axis 2: Event-driven lint / integrity workflows
echo "## 2. Event-driven lint / integrity workflows (*-lint.yml, *-integrity.yml)"
lint_files=$(find .github/workflows -maxdepth 1 \( -name '*-lint.yml' -o -name '*-integrity.yml' \) -type f 2>/dev/null | sort || echo "")
lint_count=$(echo "$lint_files" | grep -cv '^$' || echo "0")
echo "Count: $lint_count"
if [ "$lint_count" != "0" ]; then
    while IFS= read -r wf; do
        [ -z "$wf" ] && continue
        name=$(basename "$wf")
        # paths filter: grab next ~10 lines after "paths:" if present
        paths_filter=$(awk '/^[[:space:]]*paths:/{flag=1;next} flag && /^[[:space:]]*-/{print; next} flag{exit}' "$wf" 2>/dev/null \
            | head -5 | tr '\n' ' ' | sed 's/  */ /g' || echo "")
        [ -z "$paths_filter" ] && paths_filter="(no paths filter / runs on all changes)"
        echo ""
        echo "### $name"
        echo "Paths: $paths_filter"
        if command -v gh >/dev/null 2>&1; then
            failures=$(gh run list --repo "$REPO" --workflow="$name" --limit 20 \
                --json conclusion 2>/dev/null \
                | jq -r '[.[] | select(.conclusion == "failure")] | length' 2>/dev/null \
                || echo "?")
            echo "  Recent failures (last 20 runs): $failures"
        else
            echo "  SKIP: gh CLI not available"
        fi
    done <<< "$lint_files"
fi
echo ""

# Axis 3: Harness hooks
echo "## 3. Harness hooks (.claude/hooks/*.ts)"
hook_files=$(find .claude/hooks -maxdepth 2 -name '*.ts' -type f 2>/dev/null | sort || echo "")
hook_count=$(echo "$hook_files" | grep -cv '^$' || echo "0")
echo "Count: $hook_count"
if [ "$hook_count" != "0" ]; then
    while IFS= read -r hk; do
        [ -z "$hk" ] && continue
        rel="${hk#./}"
        last=$(git log -1 --format='%cI %h' -- "$rel" 2>/dev/null || echo "(no git history)")
        echo "  $rel -- last modified: $last"
    done <<< "$hook_files"
fi
echo ""

# Axis 4: TS / bash hygiene tooling
echo "## 4. Hygiene tooling cadence (tools/hygiene/audit-*.sh + audit-*.ts)"
tool_files=$(find tools/hygiene -maxdepth 1 \( -name 'audit-*.sh' -o -name 'audit-*.ts' \) -type f 2>/dev/null | sort || echo "")
tool_count=$(echo "$tool_files" | grep -cv '^$' || echo "0")
echo "Count: $tool_count"
if [ "$tool_count" != "0" ]; then
    while IFS= read -r tf; do
        [ -z "$tf" ] && continue
        rel="${tf#./}"
        last=$(git log -1 --format='%cI %h' -- "$rel" 2>/dev/null || echo "(no git history)")
        echo "  $rel -- last modified: $last"
    done <<< "$tool_files"
fi
echo ""

# Axis 5: Razor-cadence tracking issues
echo "## 5. Razor-cadence tracking issues (gh label razor-cadence, open)"
if command -v gh >/dev/null 2>&1; then
    issues_json=$(gh issue list --repo "$REPO" --label razor-cadence --state open \
        --json number,title,createdAt 2>/dev/null || echo "[]")
    issue_count=$(echo "$issues_json" | jq 'length' 2>/dev/null || echo "0")
    echo "Count: $issue_count"
    if [ "$issue_count" != "0" ]; then
        echo "Open issues (sorted by age):"
        echo "$issues_json" | jq -r '.[] | "  #\(.number) created=\(.createdAt) -- \(.title)"' 2>/dev/null \
            | sort | head -20
        echo ""
        echo "Triage: age IS the cadence-skip signal (per B-0192). Older = more overdue."
    fi
else
    echo "SKIP: gh CLI not available"
fi
echo ""

# Axis 6: Skill router inventory
echo "## 6. Skill router inventory (.claude/skills/)"
if [ -d .claude/skills ]; then
    skill_count=$(find .claude/skills -maxdepth 1 -mindepth 1 -type d 2>/dev/null | wc -l | tr -d ' ' || echo "0")
    echo "Count: $skill_count capability skills"
else
    echo "SKIP: .claude/skills/ not present"
fi
echo ""

# Axis 7: Persona agent inventory
echo "## 7. Persona agent inventory (.claude/agents/)"
if [ -d .claude/agents ]; then
    agent_count=$(find .claude/agents -maxdepth 1 -name '*.md' -type f 2>/dev/null | wc -l | tr -d ' ' || echo "0")
    echo "Count: $agent_count persona agents"
else
    echo "SKIP: .claude/agents/ not present"
fi
echo ""

echo "## Summary"
echo "Audit complete. Sibling: tools/hygiene/audit-lost-files.sh."
echo "Triage: per-axis. Aging razor-cadence issues = mechanization-firing-but-pass-not-run."
echo "Stale hook / tool last-modified-date = trajectory drift candidate."
