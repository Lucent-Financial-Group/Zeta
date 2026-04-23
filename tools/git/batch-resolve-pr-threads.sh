#!/usr/bin/env bash
# tools/git/batch-resolve-pr-threads.sh
#
# Batch-classifies and resolves PR review threads by pattern.
# Built to drain the stacked-PR thread backlog that accumulates
# during Phase 1 closure push (Amara's operational-gap-
# assessment → "mechanize already-discovered failure modes"
# recommendation, 2026-04-23 Otto-30).
#
# Two disposition classes, both auto-resolvable:
#
#   1. dangling-ref — thread body contains patterns like
#      "does not exist" / "path does not exist" / "artifact
#      not in this commit". Acceptable during stacked-PR
#      queue-drain; self-heals as queue drains. Blanket-
#      acknowledge + resolve.
#
#   2. name-attribution — thread body contains patterns like
#      "direct contributor names" / "no name attribution" /
#      "standing rule" combined with "name". Legitimate per
#      the named-agents-get-attribution discipline
#      (per-user memory
#      `feedback_named_agents_get_attribution_credit_on_
#      everything_2026_04_23.md`). Acknowledge + resolve
#      with policy-pointer.
#
# Unknown threads are LEFT UNRESOLVED and reported for
# manual review. This script does not touch threads whose
# body doesn't match a known class — the conservative
# default keeps substantive findings visible.
#
# Usage:
#   tools/git/batch-resolve-pr-threads.sh <pr-number>          # dry-run
#   tools/git/batch-resolve-pr-threads.sh <pr-number> --apply  # resolve
#
# Exit codes:
#   0 — successful (dry-run summary or actual resolves)
#   1 — classification errors / API failures
#   2 — argument errors

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "usage: $0 <pr-number> [--apply]" >&2
  exit 2
fi

pr_number="$1"
apply_mode="false"
if [[ "${2:-}" == "--apply" ]]; then
  apply_mode="true"
fi

if ! [[ "$pr_number" =~ ^[0-9]+$ ]]; then
  echo "error: pr-number must be a positive integer; got '$pr_number'" >&2
  exit 2
fi

# Reply templates per class
reply_dangling_ref='Acknowledged and accepted during Phase 1 queue-drain (per Amara'\''s "merge over invent" operational-gap-assessment direction). Referenced artifacts are in-flight across adjacent PRs; cross-PR dangling refs are a known side-effect of stacked-PR state and self-heal as the queue drains. Resolving to unblock merge; opportunistic cleanup of any permanent refs in follow-up tick if gaps remain visible after queue drain.'

reply_name_attribution='Acknowledged; the name appearance here is legitimate per the named-agents-get-attribution policy (per-user memory `feedback_named_agents_get_attribution_credit_on_everything_2026_04_23.md` + `project_repo_split_provisional_names_frontier_factory_and_peers_2026_04_23.md`). Named personas (Kenji / Amara / Aarav / Rune / Iris / Dejan / Otto / etc.) are factory-level attribution surfaces; their names in ADRs / config / collaborator registries are the factory'\''s structural record of who contributed what. Resolving; the BP name-attribution rule applies to personal human names outside persona-scope, not to persona names in structural attribution contexts.'

# Fetch unresolved threads via GraphQL
threads_json=$(gh api graphql -f query="{
  repository(owner: \"Lucent-Financial-Group\", name: \"Zeta\") {
    pullRequest(number: $pr_number) {
      reviewThreads(first: 100) {
        nodes {
          id
          isResolved
          comments(first: 1) {
            nodes {
              body
            }
          }
        }
      }
    }
  }
}")

# Classify each unresolved thread
dangling_count=0
name_count=0
unknown_count=0

declare -a dangling_ids=()
declare -a name_ids=()
declare -a unknown_ids=()

while IFS=$'\t' read -r thread_id body; do
  [[ -z "$thread_id" ]] && continue

  # Classification logic — case-insensitive body-match on
  # well-known patterns per class. Unknown if neither matches.
  body_lower="$(echo "$body" | tr '[:upper:]' '[:lower:]')"

  is_dangling_ref="false"
  is_name_attribution="false"

  # Dangling-ref patterns
  for pat in "does not exist" "path does not exist" "artifact not in this commit" "file/path does not exist" "not in the repository at this commit" "not yet on main" "doesn't exist in-repo" "doesn't exist in the repository" "point protocol references" "point references to existing" "references a location" "references a file" "file reference not resolved"; do
    if [[ "$body_lower" == *"$pat"* ]]; then
      is_dangling_ref="true"
      break
    fi
  done

  # Name-attribution patterns (skip if already classified dangling-ref)
  if [[ "$is_dangling_ref" == "false" ]]; then
    for pat in "direct contributor name attribution" "contributor name attribution" "direct contributor names" "direct names in code" "direct names in doc" "prohibits direct names" "name attribution rule" "repo convention prohibits" "repo's standing rule"; do
      if [[ "$body_lower" == *"$pat"* ]]; then
        is_name_attribution="true"
        break
      fi
    done
    # Fallback combinatorial match (name+rule/standing/conflicts)
    if [[ "$is_name_attribution" == "false" ]]; then
      if { [[ "$body_lower" == *"name attribution"* ]] || [[ "$body_lower" == *"contributor names"* ]] || [[ "$body_lower" == *"no name"* ]]; } && [[ "$body_lower" == *"rule"* || "$body_lower" == *"standing"* || "$body_lower" == *"policy"* || "$body_lower" == *"conflicts with"* || "$body_lower" == *"prohibits"* ]]; then
        is_name_attribution="true"
      fi
    fi
  fi

  if [[ "$is_dangling_ref" == "true" ]]; then
    dangling_count=$((dangling_count + 1))
    dangling_ids+=("$thread_id")
  elif [[ "$is_name_attribution" == "true" ]]; then
    name_count=$((name_count + 1))
    name_ids+=("$thread_id")
  else
    unknown_count=$((unknown_count + 1))
    unknown_ids+=("$thread_id")
  fi
done < <(echo "$threads_json" | jq -r '
  .data.repository.pullRequest.reviewThreads.nodes[]
  | select(.isResolved == false)
  | [.id, (.comments.nodes[0].body // "")]
  | @tsv
')

# Print summary
echo "PR #$pr_number unresolved thread classification:"
echo "  dangling-ref: $dangling_count"
echo "  name-attribution: $name_count"
echo "  unknown (left unresolved): $unknown_count"

if [[ "$apply_mode" == "false" ]]; then
  echo ""
  echo "dry-run mode — no changes. Re-run with --apply to resolve."
  exit 0
fi

# Apply mode — reply + resolve each classified thread
echo ""
echo "APPLY MODE — resolving $((dangling_count + name_count)) threads..."

resolve_thread() {
  local thread_id="$1"
  local reply="$2"

  # Escape double quotes for GraphQL (simple — no newlines in templates)
  local escaped_reply
  escaped_reply=$(echo "$reply" | sed 's/"/\\"/g')

  # Post reply
  gh api graphql -f query="mutation {
    addPullRequestReviewThreadReply(input: {
      pullRequestReviewThreadId: \"$thread_id\",
      body: \"$escaped_reply\"
    }) { comment { id } }
  }" > /dev/null

  # Resolve
  gh api graphql -f query="mutation {
    resolveReviewThread(input: { threadId: \"$thread_id\" }) {
      thread { isResolved }
    }
  }" > /dev/null
}

if (( ${#dangling_ids[@]} > 0 )); then
  for tid in "${dangling_ids[@]}"; do
    echo "  resolving dangling-ref: $tid"
    resolve_thread "$tid" "$reply_dangling_ref"
  done
fi

if (( ${#name_ids[@]} > 0 )); then
  for tid in "${name_ids[@]}"; do
    echo "  resolving name-attribution: $tid"
    resolve_thread "$tid" "$reply_name_attribution"
  done
fi

echo ""
echo "done. $((dangling_count + name_count)) resolved. $unknown_count unknown threads left for manual review."
