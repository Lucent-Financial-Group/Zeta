#!/usr/bin/env bash
# tools/pr-preservation/archive-pr.sh
#
# Minimal git-native PR-conversation preservation (Otto-207).
# Fetches a PR's review threads + general comments + reviews
# via `gh api graphql` and writes them to
# `docs/pr-discussions/PR-<N>-<slug>.md` for audit trail
# outside of GitHub.
#
# Addresses the gap identified Otto-207: PR-preservation
# BACKLOG row (Otto-150..154, PR #335) specifies the
# discipline but never shipped the capture tooling. This
# script is the minimal viable implementation; scales up
# to a GHA workflow later.
#
# Usage:
#   tools/pr-preservation/archive-pr.sh <PR-number>
#
# Output: writes docs/pr-discussions/PR-<N>-<slug>.md with
# YAML frontmatter (pr_number, title, author, merged_at,
# state, archived_at) + all review threads + reviews +
# general PR comments.
#
# Exit codes:
#   0  success
#   1  missing arg / gh CLI not authenticated
#   2  PR fetch failed

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "usage: $0 <PR-number>" >&2
  exit 1
fi

PR="$1"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
export REPO_ROOT PR
OUT_DIR="${REPO_ROOT}/docs/pr-discussions"
mkdir -p "$OUT_DIR"

TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

gh api graphql -F number="$PR" -f query='
  query($number: Int!) {
    repository(owner: "Lucent-Financial-Group", name: "Zeta") {
      pullRequest(number: $number) {
        number
        title
        author { login }
        state
        createdAt
        mergedAt
        closedAt
        headRefName
        baseRefName
        body
        reviewThreads(first: 100) {
          nodes {
            id
            isResolved
            path
            line
            originalLine
            comments(first: 50) {
              nodes {
                author { login }
                body
                createdAt
                updatedAt
              }
            }
          }
        }
        reviews(first: 50) {
          nodes {
            author { login }
            state
            body
            submittedAt
          }
        }
        comments(first: 100) {
          nodes {
            author { login }
            body
            createdAt
          }
        }
      }
    }
  }
' > "$TMP"

if ! python3 -c "import json; json.load(open('$TMP'))" 2>/dev/null; then
  echo "fetch failed for PR #$PR:" >&2
  head -20 "$TMP" >&2
  exit 2
fi

PR_JSON_PATH="$TMP" python3 <<'PY'
import json, os, re, datetime

with open(os.environ['PR_JSON_PATH']) as f:
    d = json.load(f)
pr = d['data']['repository']['pullRequest']

title = pr.get('title', 'untitled')
number = pr.get('number')

slug = re.sub(r'[^a-zA-Z0-9]+', '-', title).strip('-').lower()
slug = slug[:60].strip('-') or 'untitled'

out_dir = os.path.join(os.environ['REPO_ROOT'], 'docs', 'pr-discussions')
os.makedirs(out_dir, exist_ok=True)
path = os.path.join(out_dir, f'PR-{number:04d}-{slug}.md')

archived_at = datetime.datetime.utcnow().isoformat(timespec='seconds') + 'Z'

lines = []
lines.append('---')
lines.append(f'pr_number: {number}')
lines.append(f'title: {json.dumps(title)}')
lines.append(f'author: {(pr.get("author") or {}).get("login") or "unknown"}')
lines.append(f'state: {pr.get("state")}')
lines.append(f'created_at: {pr.get("createdAt") or ""}')
if pr.get('mergedAt'):
    lines.append(f'merged_at: {pr.get("mergedAt")}')
if pr.get('closedAt'):
    lines.append(f'closed_at: {pr.get("closedAt")}')
lines.append(f'head_ref: {pr.get("headRefName") or ""}')
lines.append(f'base_ref: {pr.get("baseRefName") or ""}')
lines.append(f'archived_at: {archived_at}')
lines.append('archive_tool: tools/pr-preservation/archive-pr.sh')
lines.append('---')
lines.append('')
lines.append(f'# PR #{number}: {title}')
lines.append('')

body = pr.get('body') or ''
if body.strip():
    lines.append('## PR description')
    lines.append('')
    lines.append(body.rstrip())
    lines.append('')

reviews = (pr.get('reviews') or {}).get('nodes', [])
if reviews:
    lines.append('## Reviews')
    lines.append('')
    for r in reviews:
        author = (r.get('author') or {}).get('login') or 'unknown'
        state = r.get('state') or 'COMMENTED'
        submitted = r.get('submittedAt') or ''
        body_text = (r.get('body') or '').strip()
        lines.append(f'### {state} — @{author} ({submitted})')
        lines.append('')
        lines.append(body_text if body_text else '_(no body)_')
        lines.append('')

threads = (pr.get('reviewThreads') or {}).get('nodes', [])
if threads:
    lines.append('## Review threads')
    lines.append('')
    for i, t in enumerate(threads, 1):
        path_ref = t.get('path') or '(no path)'
        line_num = t.get('line') or t.get('originalLine') or '?'
        resolved = 'resolved' if t.get('isResolved') else 'unresolved'
        lines.append(f'### Thread {i}: {path_ref}:{line_num} ({resolved})')
        lines.append('')
        for c in (t.get('comments') or {}).get('nodes', []):
            author = (c.get('author') or {}).get('login') or 'unknown'
            when = c.get('createdAt') or ''
            body_text = (c.get('body') or '').strip()
            lines.append(f'**@{author}** ({when}):')
            lines.append('')
            lines.append(body_text)
            lines.append('')

comments = (pr.get('comments') or {}).get('nodes', [])
if comments:
    lines.append('## General comments')
    lines.append('')
    for c in comments:
        author = (c.get('author') or {}).get('login') or 'unknown'
        when = c.get('createdAt') or ''
        body_text = (c.get('body') or '').strip()
        lines.append(f'### @{author} ({when})')
        lines.append('')
        lines.append(body_text)
        lines.append('')

content = '\n'.join(lines).rstrip() + '\n'
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print(f'wrote {path} ({len(content)} bytes, {len(threads)} threads, {len(reviews)} reviews, {len(comments)} comments)')
PY
