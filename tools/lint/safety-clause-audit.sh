#!/usr/bin/env bash
# safety-clause-audit.sh
#
# Counts how many .claude/skills/*/SKILL.md files carry an explicit
# scope-limiting ("what this skill does NOT do" or equivalent)
# section. Promotes the `every-skill-has-safety-clause` invariant in
# .claude/skills/prompt-protector/skill.yaml from `guess` to
# `observed` — we now have a mechanical count, not a subjective
# impression.
#
# Matches three heading patterns in order of decreasing confidence:
#
#   H1 — explicit "NOT do" heading:
#         ## What this skill does NOT do
#         ## What this agent does NOT do
#         ## What he does not do
#         ## What I don't do
#   H2 — scope heading:
#         ## Scope
#         ## What this skill does not cover
#   H3 — authority-boundary heading:
#         ## does-not-audit
#         ## What this skill does not audit
#
# A skill scoring H1 is strongest; H2 and H3 are acceptable
# equivalents per the invariant text ("OR an equivalent scope-
# limiting clause"). A skill scoring none falls in the MISSING
# bucket.
#
# Usage:
#   tools/lint/safety-clause-audit.sh                      # summary
#   tools/lint/safety-clause-audit.sh --list-missing       # names only
#   tools/lint/safety-clause-audit.sh --verbose            # per-skill
#   tools/lint/safety-clause-audit.sh --fail-over N        # exit 1 if
#                                                         # MISSING > N
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SKILLS_GLOB="${REPO_ROOT}/.claude/skills/*/SKILL.md"

mode="summary"
fail_over=""
for arg in "$@"; do
    case "$arg" in
        --list-missing) mode="list-missing" ;;
        --verbose)      mode="verbose" ;;
        --fail-over)    shift; fail_over="$1" ;;
        --fail-over=*)  fail_over="${arg#*=}" ;;
        -h|--help)
            sed -n 's/^# \{0,1\}//p' "$0" | head -35
            exit 0
            ;;
    esac
done

# Patterns. Anchored to markdown headings (lines starting with #)
# to avoid matching body prose like "this skill does not X".
h1_re='^#+[[:space:]]+(What[[:space:]]+this[[:space:]]+skill|What[[:space:]]+this[[:space:]]+agent|What[[:space:]]+(he|she|they|I)|What[[:space:]]+it)[[:space:]]+(does[[:space:]]+NOT[[:space:]]+do|does[[:space:]]+not[[:space:]]+do|don'\''t[[:space:]]+do|doesn'\''t[[:space:]]+do|does[[:space:]]+not|does[[:space:]]+NOT)'
h2_re='^#+[[:space:]]+(Scope|What[[:space:]]+this[[:space:]]+skill[[:space:]]+does[[:space:]]+not[[:space:]]+cover|Out[[:space:]]+of[[:space:]]+scope)'
h3_re='^#+[[:space:]]+(does-not-audit|What[[:space:]]+this[[:space:]]+skill[[:space:]]+does[[:space:]]+not[[:space:]]+audit)'

total=0
h1=0
h2=0
h3=0
missing=0
missing_list=()
h1_list=()
h2_list=()
h3_list=()

for skill_md in $SKILLS_GLOB; do
    [ -f "$skill_md" ] || continue
    total=$((total + 1))
    dir="$(dirname "$skill_md")"
    name="$(basename "$dir")"

    if grep -iqE "$h1_re" "$skill_md"; then
        h1=$((h1 + 1))
        h1_list+=("$name")
    elif grep -iqE "$h2_re" "$skill_md"; then
        h2=$((h2 + 1))
        h2_list+=("$name")
    elif grep -iqE "$h3_re" "$skill_md"; then
        h3=$((h3 + 1))
        h3_list+=("$name")
    else
        missing=$((missing + 1))
        missing_list+=("$name")
    fi
done

covered=$((h1 + h2 + h3))
if [ "$total" -eq 0 ]; then
    pct_cov="0.0"
    pct_h1="0.0"
else
    pct_cov="$(awk -v c="$covered" -v t="$total" 'BEGIN{printf "%.1f", 100*c/t}')"
    pct_h1="$(awk -v c="$h1" -v t="$total" 'BEGIN{printf "%.1f", 100*c/t}')"
fi

case "$mode" in
    list-missing)
        printf '%s\n' "${missing_list[@]:-}"
        ;;

    verbose)
        echo "# Safety-clause audit — per skill"
        echo
        echo "| Skill | Tier |"
        echo "|---|---|"
        for n in "${h1_list[@]:-}"; do [ -n "$n" ] && echo "| \`$n\` | H1 explicit |"; done
        for n in "${h2_list[@]:-}"; do [ -n "$n" ] && echo "| \`$n\` | H2 scope |"; done
        for n in "${h3_list[@]:-}"; do [ -n "$n" ] && echo "| \`$n\` | H3 authority |"; done
        for n in "${missing_list[@]:-}"; do [ -n "$n" ] && echo "| \`$n\` | MISSING |"; done
        echo
        ;;

    summary|*)
        cat <<EOF
# Safety-clause audit — summary

Counts of \`.claude/skills/*/SKILL.md\` files carrying a
scope-limiting clause. Promotes the
\`every-skill-has-safety-clause\` invariant in
\`.claude/skills/prompt-protector/skill.yaml\` from \`guess\`
to \`observed\`.

| Tier | Pattern | Count |
|---|---|---:|
| H1 | explicit "does NOT do" heading | $h1 |
| H2 | "Scope" / "Out of scope" heading | $h2 |
| H3 | "does-not-audit" / equivalent | $h3 |
| MISSING | no scope-limiting heading | $missing |
| **total** | | **$total** |

Covered (H1+H2+H3): **${covered} / ${total}** — **${pct_cov}%**.
H1-only (strongest): **${h1} / ${total}** — **${pct_h1}%**.

Missing count: **${missing}**.
EOF
        ;;
esac

if [ -n "$fail_over" ] && [ "$missing" -gt "$fail_over" ]; then
    echo "FAIL: missing=${missing} exceeds threshold ${fail_over}" >&2
    exit 1
fi
exit 0
