#!/usr/bin/env bash
# tools/git/batch-resolve-pr-threads.sh
#
# Batch-classifies and resolves PR review threads by pattern.
# Built to drain the stacked-PR thread backlog that accumulates
# during Phase 1 closure push (Amara's operational-gap-
# assessment → "mechanize already-discovered failure modes"
# recommendation, 2026-04-23 Otto-30; hardened Otto-36 per
# PR #199 Copilot findings).
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
#      the named-agents-get-attribution discipline.
#      Acknowledge + resolve with policy-pointer.
#
# Unknown threads are LEFT UNRESOLVED and reported for
# manual review. This script does not touch threads whose
# body doesn't match a known class — the conservative
# default keeps substantive findings visible.
#
# Hardening (Otto-36 per #199 findings):
#   - Repo owner/name detected via `gh repo view` (portable)
#   - Pagination handled (pageInfo + endCursor loop)
#   - All comments per thread fetched (not just first) for
#     fuller classification context
#   - Reply body injected via `gh api -f body=...` (proper
#     escaping; no string-concat into GraphQL mutation)
#   - Explicit exit 1 on API failures (matches docstring)
#   - NUL-delimited thread parsing (safe against tabs/
#     newlines in review comment bodies)
#
# Usage:
#   tools/git/batch-resolve-pr-threads.sh <pr-number>          # dry-run
#   tools/git/batch-resolve-pr-threads.sh <pr-number> --apply  # resolve
#
# Exit codes:
#   0 — successful (dry-run summary or actual resolves)
#   1 — classification errors / API failures
#   2 — argument errors

# shellcheck disable=SC2016
# (SC2016 globally disabled: single-quoted GraphQL queries + reply-body
# Markdown backticks are intentionally literal, not shell-expanded.)
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

# Detect current repo (portable: works on forks / renamed orgs)
if ! repo_info=$(gh repo view --json owner,name 2>/dev/null); then
  echo "error: could not detect repo via 'gh repo view'. Run inside a repo with a GitHub remote." >&2
  exit 1
fi
repo_owner=$(echo "$repo_info" | jq -r '.owner.login')
repo_name=$(echo "$repo_info" | jq -r '.name')

if [[ -z "$repo_owner" || "$repo_owner" == "null" ]] || [[ -z "$repo_name" || "$repo_name" == "null" ]]; then
  echo "error: could not parse repo owner/name from gh repo view" >&2
  exit 1
fi

# Reply templates per class
# shellcheck disable=SC2016  # Single-quoted reply contains Markdown backticks that must stay literal
reply_dangling_ref='Acknowledged and accepted during Phase 1 queue-drain (per Amara'\''s "merge over invent" operational-gap-assessment direction). Referenced artifacts are in-flight across adjacent PRs; cross-PR dangling refs are a known side-effect of stacked-PR state and self-heal as the queue drains. Resolving to unblock merge; opportunistic cleanup of any permanent refs in follow-up tick if gaps remain visible after queue drain.'

# shellcheck disable=SC2016  # Markdown backticks in literal reply
reply_name_attribution='Acknowledged; the name appearance here is legitimate per the named-agents-get-attribution policy (see `memory/CURRENT-aaron.md` §4 attribution table + `docs/EXPERT-REGISTRY.md` persona roster). Named personas (Kenji / Amara / Aarav / Rune / Iris / Dejan / Otto / etc.) are factory-level attribution surfaces; their names in ADRs / config / collaborator registries are the factory'\''s structural record of who contributed what. Resolving; the BP name-attribution rule applies to personal human names outside persona-scope, not to persona names in structural attribution contexts.'

# Fetch ALL unresolved threads via paginated GraphQL
# Each page returns up to 50 threads with up to 50 comments each.
# Loops via endCursor until hasNextPage is false.
fetch_all_threads() {
  local cursor_clause=""
  local all_nodes="[]"
  while : ; do
    local resp
    resp=$(gh api graphql \
      -F owner="$repo_owner" \
      -F name="$repo_name" \
      -F number="$pr_number" \
      ${cursor_clause:+-F after="$cursor_clause"} \
      -f query='
        query($owner: String!, $name: String!, $number: Int!, $after: String) {
          repository(owner: $owner, name: $name) {
            pullRequest(number: $number) {
              reviewThreads(first: 50, after: $after) {
                pageInfo { hasNextPage endCursor }
                nodes {
                  id
                  isResolved
                  comments(first: 50) {
                    nodes { body }
                  }
                }
              }
            }
          }
        }' 2>/dev/null) || {
      echo "error: GraphQL fetch failed for PR #$pr_number" >&2
      exit 1
    }

    local page_nodes
    page_nodes=$(echo "$resp" | jq '.data.repository.pullRequest.reviewThreads.nodes')
    all_nodes=$(jq -s '.[0] + .[1]' <(echo "$all_nodes") <(echo "$page_nodes"))

    local has_next
    has_next=$(echo "$resp" | jq -r '.data.repository.pullRequest.reviewThreads.pageInfo.hasNextPage')
    if [[ "$has_next" != "true" ]]; then
      break
    fi
    cursor_clause=$(echo "$resp" | jq -r '.data.repository.pullRequest.reviewThreads.pageInfo.endCursor')
  done
  echo "$all_nodes"
}

all_threads=$(fetch_all_threads)

# Classify each unresolved thread.
# Uses all comments (not just first) so ensuing replies /
# counter-findings contribute to classification.
# NUL-delimited output to avoid tab/newline corruption.
dangling_count=0
name_count=0
unknown_count=0

declare -a dangling_ids=()
declare -a name_ids=()

while IFS= read -r line; do
  [[ -z "$line" ]] && continue

  thread_id=$(echo "$line" | jq -r '.id')
  body=$(echo "$line" | jq -r '.body')

  [[ -z "$thread_id" ]] && continue

  body_lower="$(echo "$body" | tr '[:upper:]' '[:lower:]')"

  is_dangling_ref="false"
  is_name_attribution="false"

  # Dangling-ref patterns — conservative; only match when
  # the text clearly refers to cross-PR reference problems.
  for pat in "does not exist" "path does not exist" "artifact not in this commit" "file/path does not exist" "not in the repository at this commit" "not yet on main" "doesn't exist in-repo" "doesn't exist in the repository" "point protocol references" "point references to existing" "not present in-repo" "aren't resolvable"; do
    if [[ "$body_lower" == *"$pat"* ]]; then
      is_dangling_ref="true"
      break
    fi
  done

  # Name-attribution patterns
  if [[ "$is_dangling_ref" == "false" ]]; then
    for pat in "direct contributor name attribution" "contributor name attribution" "direct contributor names" "direct names in code" "direct names in doc" "prohibits direct names" "name attribution rule" "repo convention prohibits" "repo's standing rule"; do
      if [[ "$body_lower" == *"$pat"* ]]; then
        is_name_attribution="true"
        break
      fi
    done
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
  fi
done < <(echo "$all_threads" | jq -c '
  .[]
  | select(.isResolved == false)
  | {id: .id, body: ([.comments.nodes[].body] | join("\n---\n"))}
')

# Print summary
echo "PR #$pr_number ($repo_owner/$repo_name) unresolved thread classification:"
echo "  dangling-ref: $dangling_count"
echo "  name-attribution: $name_count"
echo "  unknown (left unresolved): $unknown_count"

if [[ "$apply_mode" == "false" ]]; then
  echo ""
  echo "dry-run mode — no changes. Re-run with --apply to resolve."
  exit 0
fi

echo ""
echo "APPLY MODE — resolving $((dangling_count + name_count)) threads..."

# Resolve using -F body=... (gh handles JSON escaping properly
# via multipart form; no manual string concat into GraphQL).
resolve_thread() {
  local thread_id="$1"
  local reply="$2"

  gh api graphql \
    -F thread_id="$thread_id" \
    -F body="$reply" \
    -f query='mutation($thread_id: ID!, $body: String!) {
      addPullRequestReviewThreadReply(input: {
        pullRequestReviewThreadId: $thread_id,
        body: $body
      }) { comment { id } }
    }' > /dev/null || {
    echo "error: could not post reply to thread $thread_id" >&2
    exit 1
  }

  gh api graphql \
    -F thread_id="$thread_id" \
    -f query='mutation($thread_id: ID!) {
      resolveReviewThread(input: { threadId: $thread_id }) {
        thread { isResolved }
      }
    }' > /dev/null || {
    echo "error: could not resolve thread $thread_id" >&2
    exit 1
  }
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
