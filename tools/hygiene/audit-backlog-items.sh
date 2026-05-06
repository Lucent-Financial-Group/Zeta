#!/usr/bin/env bash
# tools/hygiene/audit-backlog-items.sh
#
# Surveys the factory's backlog (docs/backlog/P*/B-*.md) and reports state
# across tiers. Composes with tools/hygiene/audit-lost-files.sh
# (Aaron 2026-05-05: "not just lost files all the trjaectoris and backlog
# tiems") -- extending the audit pattern from "where files go to die" to
# "where backlog rows go to die."
#
# Composes with the typed-edge graph in
# memory/feedback_decision_graph_emergent_from_archaeologies_and_flywheel_aaron_2026_05_03.md
# (depends_on / composes_with / supersedes / etc.) -- this script makes the
# graph state observable: orphan rows, broken edges, top blocked rows.
#
# What it audits:
#   1. Per-tier counts (P0/P1/P2/P3) with status breakdown
#   2. Aging open rows by tier (>30 / >60 / >90 days from `created:`)
#   3. Broken depends_on pointers (B-NNNN refs that don't exist)
#   4. Broken composes_with pointers (B-NNNN refs that don't exist)
#   5. Orphan rows (no incoming depends_on or composes_with from anyone)
#   6. Top-10 most-blocked rows (rows whose depends_on chain blocks the most
#      downstream rows)
#   7. Unclosed-but-merged rows (head-keyword matches recent merged-PR title)

set -eu
# Note: pipefail intentionally NOT set -- this script has many `... | head -N`
# pipes where head closes the pipe early, which would otherwise SIGPIPE-kill
# the whole script. Failures are guarded individually where they matter.

REPO="${REPO:-Lucent-Financial-Group/Zeta}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$REPO_ROOT"

BACKLOG_ROOT="$REPO_ROOT/docs/backlog"

if [ ! -d "$BACKLOG_ROOT" ]; then
    echo "ERROR: $BACKLOG_ROOT not found"
    exit 1
fi

NOW_EPOCH=$(date -u +%s)
TODAY=$(date -u +%Y-%m-%dT%H:%MZ)

echo "# Backlog-items audit ($TODAY)"
echo ""
echo "Repo: $REPO_ROOT"
echo "Backlog root: docs/backlog/"
echo ""

# Build a temp workspace for derived data. BSD-compatible fallback for
# `mktemp -d` (some platforms require an explicit template).
TMPDIR_AUDIT=$(mktemp -d 2>/dev/null || mktemp -d -t 'zeta-backlog-audit')
trap 'rm -rf "$TMPDIR_AUDIT"' EXIT

ALL_ROWS="$TMPDIR_AUDIT/all-rows.tsv"     # tier<TAB>id<TAB>path<TAB>status<TAB>created<TAB>title
DEPENDS_EDGES="$TMPDIR_AUDIT/depends.tsv" # src_id<TAB>target_id
COMPOSES_EDGES="$TMPDIR_AUDIT/composes.tsv"
ALL_IDS="$TMPDIR_AUDIT/all-ids.txt"

# Extract a frontmatter scalar field value from a file. Strips quotes/whitespace.
extract_field() {
    local file="$1" field="$2"
    awk -v f="$field" '
        BEGIN { in_fm=0; n=0 }
        /^---[[:space:]]*$/ { n++; if (n==1) { in_fm=1; next } else { exit } }
        in_fm && $0 ~ "^" f ":" {
            sub("^" f ":[[:space:]]*", "")
            sub("[[:space:]]+$", "")
            print
            exit
        }
    ' "$file"
}

# Extract referenced B-NNNN ids from a list-style field like
# `depends_on: [B-0001, B-0002]` or multi-line YAML list.
extract_brefs() {
    local file="$1" field="$2"
    awk -v f="$field" '
        BEGIN { in_fm=0; n=0; in_field=0 }
        /^---[[:space:]]*$/ { n++; if (n==1) { in_fm=1; next } else { exit } }
        !in_fm { next }
        $0 ~ "^" f ":" {
            in_field=1
            line=$0
            sub("^" f ":[[:space:]]*", "", line)
            print line
            # if line contains a closing bracket, single-line list
            if (line ~ /\]/) { in_field=0 }
            next
        }
        in_field && /^[a-zA-Z_]+:/ { in_field=0; next }
        in_field { print }
    ' "$file" | { grep -oE 'B-[0-9]{4}' || true; } | sort -u
}

# 1. Build all-rows.tsv + ids list
echo "## 1. Per-tier counts + status breakdown"
echo ""
total_rows=0
for tier_dir in "$BACKLOG_ROOT"/P0 "$BACKLOG_ROOT"/P1 "$BACKLOG_ROOT"/P2 "$BACKLOG_ROOT"/P3; do
    [ -d "$tier_dir" ] || continue
    tier=$(basename "$tier_dir")
    tier_count=0
    for f in "$tier_dir"/B-*.md; do
        [ -f "$f" ] || continue
        id=$(extract_field "$f" id)
        status=$(extract_field "$f" status)
        created=$(extract_field "$f" created)
        title=$(extract_field "$f" title)
        # Fall back to filename id if frontmatter missing
        if [ -z "$id" ]; then
            id=$(basename "$f" | grep -oE '^B-[0-9]{4}' || echo "")
        fi
        [ -z "$id" ] && continue
        printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$tier" "$id" "$f" "${status:-unknown}" "${created:-unknown}" "${title:-(no title)}" >> "$ALL_ROWS"
        echo "$id" >> "$ALL_IDS"
        tier_count=$((tier_count + 1))
        total_rows=$((total_rows + 1))
    done
    echo "### $tier ($tier_count rows)"
    if [ "$tier_count" -gt 0 ]; then
        awk -F'\t' -v t="$tier" '$1==t { print $4 }' "$ALL_ROWS" \
            | sort | uniq -c | sort -rn \
            | awk '{ printf "  - %s: %d\n", $2, $1 }'
    fi
    echo ""
done
sort -u -o "$ALL_IDS" "$ALL_IDS"
echo "**Total rows: $total_rows**"
echo ""

# 2. Aging open rows
echo "## 2. Aging open rows by tier (status open and not closed/landed/superseded)"
echo ""

# date-to-epoch helper that works on macOS (BSD date) and Linux (GNU date)
to_epoch() {
    local d="$1"
    if [ -z "$d" ] || [ "$d" = "unknown" ]; then echo ""; return; fi
    # Try BSD date first (macOS), then GNU date (Linux)
    date -j -f "%Y-%m-%d" "$d" +%s 2>/dev/null \
        || date -d "$d" +%s 2>/dev/null \
        || echo ""
}

# Pre-compute (status, age_days) per row once into a derived TSV.
ROWS_AGED="$TMPDIR_AUDIT/rows-aged.tsv"  # tier id status age_days created title
while IFS=$'\t' read -r tier id path status created title; do
    is_closed=0
    case "$status" in
        closed|landed|superseded|merged|done) is_closed=1 ;;
    esac
    [ "$is_closed" = "1" ] && continue
    ep=$(to_epoch "$created")
    [ -z "$ep" ] && continue
    age_days=$(( (NOW_EPOCH - ep) / 86400 ))
    printf '%s\t%s\t%s\t%d\t%s\t%s\n' "$tier" "$id" "$status" "$age_days" "$created" "$title" >> "$ROWS_AGED"
done < "$ALL_ROWS"

for bucket_days in 30 60 90; do
    echo "### Open rows older than $bucket_days days"
    if [ -f "$ROWS_AGED" ]; then
        count=$(awk -F'\t' -v d="$bucket_days" '$4 > d { c++ } END { print c+0 }' "$ROWS_AGED")
        echo "  Count: $count"
        awk -F'\t' -v d="$bucket_days" '$4 > d { printf "  - [%s][%s] %s (%dd, status=%s)\n", $1, $2, $5, $4, $3 }' "$ROWS_AGED" \
            | sort | head -20
    else
        echo "  Count: 0"
    fi
    echo ""
done

# 3 + 4. Build edges + check broken pointers
echo "## 3. Broken depends_on pointers"
echo ""
broken_depends=0
while IFS=$'\t' read -r tier id path status created title; do
    refs=$(extract_brefs "$path" depends_on)
    [ -z "$refs" ] && continue
    while IFS= read -r ref; do
        [ -z "$ref" ] && continue
        printf '%s\t%s\n' "$id" "$ref" >> "$DEPENDS_EDGES"
        if ! grep -qx "$ref" "$ALL_IDS"; then
            printf '  - %s [%s] depends_on missing %s\n' "$id" "$tier" "$ref"
            broken_depends=$((broken_depends + 1))
        fi
    done <<< "$refs"
done < "$ALL_ROWS"
echo ""
echo "**Broken depends_on edges: $broken_depends**"
echo ""

echo "## 4. Broken composes_with pointers"
echo ""
broken_composes=0
while IFS=$'\t' read -r tier id path status created title; do
    refs=$(extract_brefs "$path" composes_with)
    [ -z "$refs" ] && continue
    while IFS= read -r ref; do
        [ -z "$ref" ] && continue
        printf '%s\t%s\n' "$id" "$ref" >> "$COMPOSES_EDGES"
        if ! grep -qx "$ref" "$ALL_IDS"; then
            printf '  - %s [%s] composes_with missing %s\n' "$id" "$tier" "$ref"
            broken_composes=$((broken_composes + 1))
        fi
    done <<< "$refs"
done < "$ALL_ROWS"
echo ""
echo "**Broken composes_with edges: $broken_composes**"
echo "(Note: composes_with also accepts non-B refs -- skill/memory/doc paths;"
echo " only B-NNNN refs are checked here.)"
echo ""

# 5. Orphan rows: no incoming depends_on AND no incoming composes_with from any other row
echo "## 5. Orphan rows (no incoming depends_on or composes_with from any other row)"
echo ""
INCOMING_IDS="$TMPDIR_AUDIT/incoming-ids.txt"
{
    [ -f "$DEPENDS_EDGES" ] && awk -F'\t' '{ print $2 }' "$DEPENDS_EDGES"
    [ -f "$COMPOSES_EDGES" ] && awk -F'\t' '{ print $2 }' "$COMPOSES_EDGES"
} | sort -u > "$INCOMING_IDS"

orphans=$(comm -23 "$ALL_IDS" "$INCOMING_IDS")
orphan_count=$(echo "$orphans" | grep -cv '^$' || true)
echo "**Orphan rows: $orphan_count**"
if [ "$orphan_count" -gt 0 ]; then
    echo ""
    echo "Sample (first 20):"
    # Truncate the input first so the producer-side `while` loop never
    # races a downstream `head` close (defensive against future pipefail
    # additions; see set-eu comment at top).
    sample_orphans=$(printf '%s\n' "$orphans" | head -20)
    while IFS= read -r oid; do
        [ -z "$oid" ] && continue
        line=$(awk -F'\t' -v i="$oid" '$2==i { print $1 "\t" $4 "\t" $6; exit }' "$ALL_ROWS")
        printf '  - %s: %s\n' "$oid" "$line"
    done <<< "$sample_orphans"
fi
echo ""

# 6. Top-10 most-blocked rows: a row X "blocks" Y if Y depends_on X (directly).
# Count direct downstream dependents per row.
echo "## 6. Top-10 most-blocked rows (direct downstream dependents via depends_on)"
echo ""
if [ -f "$DEPENDS_EDGES" ] && [ -s "$DEPENDS_EDGES" ]; then
    awk -F'\t' '{ print $2 }' "$DEPENDS_EDGES" | sort | uniq -c | sort -rn | head -10 \
        | while read -r cnt target; do
            line=$(awk -F'\t' -v i="$target" '$2==i { print $1 "\t" $4 "\t" $6; exit }' "$ALL_ROWS")
            [ -z "$line" ] && line="(target id not found in current rows)"
            printf '  - %s blocks %s direct downstream: %s\n' "$target" "$cnt" "$line"
        done
else
    echo "  (no depends_on edges in backlog)"
fi
echo ""

# 7. Unclosed-but-merged rows: head-keyword matches recent merged-PR title
echo "## 7. Unclosed-but-merged rows (head-keyword matches recent merged-PR title; heuristic)"
echo ""
if command -v gh >/dev/null 2>&1; then
    PR_TITLES="$TMPDIR_AUDIT/pr-titles.txt"
    gh pr list --repo "$REPO" --state merged --limit 200 \
        --json number,title 2>/dev/null \
        | (command -v jq >/dev/null && jq -r '.[] | "\(.number)\t\(.title)"' || cat) \
        > "$PR_TITLES" 2>/dev/null || echo "" > "$PR_TITLES"
    pr_count=$(wc -l < "$PR_TITLES" | tr -d ' ')
    echo "Scanned $pr_count merged PR titles."
    if [ "$pr_count" -gt 0 ]; then
        candidate_count=0
        while IFS=$'\t' read -r tier id path status created title; do
            case "$status" in
                closed|landed|superseded|merged|done) continue ;;
            esac
            # Build a head-keyword from title: first 4 alphanum tokens >= 4 chars,
            # to lower the false-positive rate of common stopwords.
            kw=$(printf '%s' "$title" \
                | tr '[:upper:]' '[:lower:]' \
                | tr -c 'a-z0-9' ' ' \
                | tr -s ' ' '\n' \
                | awk 'length($0) >= 5 && $0 !~ /^(rewrite|review|update|create|enable|backlog|memory|across|using|after|before|where|which|while|their|there|other|maintainer|aaron|otto|amara)$/' \
                | head -3 | tr '\n' ' ' | sed 's/[[:space:]]*$//')
            [ -z "$kw" ] && continue
            # Require at least 2 head-keywords; check if all appear in any merged PR title.
            kw_count=$(echo "$kw" | wc -w | tr -d ' ')
            [ "$kw_count" -lt 2 ] && continue
            match=$(awk -F'\t' -v kws="$kw" '
                BEGIN { n=split(kws, k, " ") }
                {
                    t=tolower($2); ok=1
                    for (i=1;i<=n;i++) { if (index(t, k[i])==0) { ok=0; break } }
                    if (ok) { print $1 "\t" $2; exit }
                }' "$PR_TITLES")
            if [ -n "$match" ]; then
                printf '  - %s [%s] status=%s -- candidate match: PR #%s\n' "$id" "$tier" "$status" "$(echo "$match" | cut -f1)"
                printf '      row title: %s\n' "$title"
                printf '      pr  title: %s\n' "$(echo "$match" | cut -f2)"
                candidate_count=$((candidate_count + 1))
            fi
        done < "$ALL_ROWS" | head -60
        echo ""
        echo "(Heuristic: 3 head-keywords of >=5 chars must all appear in PR title."
        echo " False positives expected; manual review required before closing rows.)"
    fi
else
    echo "SKIP: gh CLI not available"
fi
echo ""

# Summary
echo "## Summary"
echo ""
echo "  - Total backlog rows: $total_rows"
echo "  - Broken depends_on edges: $broken_depends"
echo "  - Broken composes_with edges (B-NNNN refs only): $broken_composes"
echo "  - Orphan rows (no incoming graph edge): $orphan_count"
echo ""
echo "Composes with: tools/hygiene/audit-lost-files.sh (sibling pattern),"
echo "  memory/feedback_decision_graph_emergent_from_archaeologies_and_flywheel_aaron_2026_05_03.md"
echo "  (typed-edge backlog graph)."
