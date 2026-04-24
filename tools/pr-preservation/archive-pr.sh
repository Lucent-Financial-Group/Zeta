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
# general PR comments. PR numbers are zero-padded to four
# digits in the filename (e.g. PR-0357-...) so archives
# sort lexicographically in the same order as they sort
# numerically up to PR #9999.
#
# Exit codes:
#   0  success
#   1  missing arg / gh CLI not authenticated / repo detect failed
#   2  PR fetch failed (auth / network / GraphQL errors / not found)
#
# Review-thread drain Otto-226 fixes (PR #357):
#   - Pagination + truncation warning for threads (>100) and
#     per-thread comments (>100).
#   - Top-level `errors` and `pullRequest: null` detection
#     before dereferencing (both Python and shell paths).
#   - Dynamic owner/name from `gh repo view` (works from
#     forks or after a rename).
#   - `set -e`-safe capture of `gh api graphql` exit code
#     so "fetch failed" diagnostics actually print.
#   - YAML string values quoted (refs can contain `#` / `:`).

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "usage: $0 <PR-number>" >&2
  exit 1
fi

PR="$1"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

# Dynamic owner / name — works from forks or after rename.
# Falls back to Lucent-Financial-Group/Zeta only if the
# detection command itself fails (e.g. not inside a repo
# gh recognises). Never silently wrong.
REPO_NWO="$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || true)"
if [ -z "${REPO_NWO}" ]; then
  echo "error: could not detect repo via 'gh repo view'. Is gh authenticated and this a GitHub repo?" >&2
  exit 1
fi
REPO_OWNER="${REPO_NWO%/*}"
REPO_NAME="${REPO_NWO#*/}"

export REPO_ROOT PR REPO_OWNER REPO_NAME
OUT_DIR="${REPO_ROOT}/docs/pr-discussions"
mkdir -p "$OUT_DIR"

TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

# Paginated fetch: drive it from Python (single interpreter,
# single GraphQL query with cursors). This keeps the shell
# simple and lets us both paginate and validate top-level
# `errors` / `pullRequest: null` before proceeding.
#
# We still capture a shell-side exit code so `set -e` does
# not swallow the "fetch failed" diagnostic path.
set +e
REPO_OWNER="$REPO_OWNER" REPO_NAME="$REPO_NAME" PR="$PR" python3 - <<'PY' > "$TMP"
import json, os, subprocess, sys

OWNER = os.environ['REPO_OWNER']
NAME  = os.environ['REPO_NAME']
PR    = int(os.environ['PR'])

QUERY = """
query($owner: String!, $name: String!, $number: Int!,
      $threadsAfter: String, $commentsAfter: String, $reviewsAfter: String) {
  repository(owner: $owner, name: $name) {
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
      reviewThreads(first: 100, after: $threadsAfter) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          isResolved
          path
          line
          originalLine
          comments(first: 100) {
            pageInfo { hasNextPage endCursor }
            nodes {
              author { login }
              body
              createdAt
              updatedAt
            }
          }
        }
      }
      reviews(first: 50, after: $reviewsAfter) {
        pageInfo { hasNextPage endCursor }
        nodes {
          author { login }
          state
          body
          submittedAt
        }
      }
      comments(first: 100, after: $commentsAfter) {
        pageInfo { hasNextPage endCursor }
        nodes {
          author { login }
          body
          createdAt
        }
      }
    }
  }
}
"""

THREAD_COMMENTS_QUERY = """
query($threadId: ID!, $after: String) {
  node(id: $threadId) {
    ... on PullRequestReviewThread {
      comments(first: 100, after: $after) {
        pageInfo { hasNextPage endCursor }
        nodes {
          author { login }
          body
          createdAt
          updatedAt
        }
      }
    }
  }
}
"""

def gh_graphql(query, variables):
    """Invoke gh api graphql and return parsed JSON or raise."""
    cmd = ["gh", "api", "graphql", "-f", f"query={query}"]
    for k, v in variables.items():
        if v is None:
            # gh treats -F with empty string as null; for explicit null
            # we omit — GraphQL default for unspecified variable is null.
            continue
        if isinstance(v, int):
            cmd.extend(["-F", f"{k}={v}"])
        else:
            cmd.extend(["-f", f"{k}={v}"])
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        sys.stderr.write(
            f"gh api graphql failed (exit {proc.returncode}):\n{proc.stderr}\n"
        )
        sys.exit(2)
    try:
        data = json.loads(proc.stdout)
    except json.JSONDecodeError as e:
        sys.stderr.write(f"non-JSON response from gh api graphql: {e}\n")
        sys.stderr.write(proc.stdout[:2000] + "\n")
        sys.exit(2)
    if data.get("errors"):
        sys.stderr.write("GraphQL errors:\n")
        sys.stderr.write(json.dumps(data["errors"], indent=2) + "\n")
        sys.exit(2)
    return data

# First page.
first = gh_graphql(QUERY, {
    "owner": OWNER, "name": NAME, "number": PR,
})
repo = (first.get("data") or {}).get("repository") or {}
pr = repo.get("pullRequest")
if pr is None:
    sys.stderr.write(
        f"pullRequest is null for {OWNER}/{NAME}#{PR} "
        "(not found, private, or access denied).\n"
    )
    sys.exit(2)

# Accumulate nodes across pages. Simple loop per connection.
def paginate_top_level(key_chain, variable_name):
    """Walk connections rooted at pullRequest.<key>."""
    all_nodes = list(pr[key_chain]["nodes"])
    page = pr[key_chain]["pageInfo"]
    cursor = page["endCursor"] if page["hasNextPage"] else None
    while cursor:
        vars_ = {"owner": OWNER, "name": NAME, "number": PR, variable_name: cursor}
        page_data = gh_graphql(QUERY, vars_)
        page_pr = (
            (page_data.get("data") or {}).get("repository") or {}
        ).get("pullRequest")
        if page_pr is None:
            break
        conn = page_pr[key_chain]
        all_nodes.extend(conn["nodes"])
        page = conn["pageInfo"]
        cursor = page["endCursor"] if page["hasNextPage"] else None
    return all_nodes

threads = paginate_top_level("reviewThreads", "threadsAfter")
reviews = paginate_top_level("reviews", "reviewsAfter")
comments = paginate_top_level("comments", "commentsAfter")

# For each thread, paginate its comments connection.
for t in threads:
    conn = t.get("comments") or {}
    nodes = list(conn.get("nodes") or [])
    pi = conn.get("pageInfo") or {}
    cursor = pi.get("endCursor") if pi.get("hasNextPage") else None
    while cursor:
        page = gh_graphql(THREAD_COMMENTS_QUERY, {"threadId": t["id"], "after": cursor})
        node = (page.get("data") or {}).get("node") or {}
        cc = node.get("comments") or {}
        nodes.extend(cc.get("nodes") or [])
        pi2 = cc.get("pageInfo") or {}
        cursor = pi2.get("endCursor") if pi2.get("hasNextPage") else None
    t["comments"] = {"nodes": nodes}

# Reshape into the same envelope older code expects.
pr["reviewThreads"] = {"nodes": threads}
pr["reviews"] = {"nodes": reviews}
pr["comments"] = {"nodes": comments}

json.dump({"data": {"repository": {"pullRequest": pr}}}, sys.stdout)
PY
FETCH_RC=$?
set -e

if [ "$FETCH_RC" -ne 0 ]; then
  echo "fetch failed for PR #$PR (exit $FETCH_RC)" >&2
  exit 2
fi

export TMP

# Validate JSON parseability AND that pullRequest is non-null.
# Guards against malformed output or upstream GraphQL nulls
# that would otherwise crash the formatter with a cryptic
# TypeError. TMP must be exported (above) so the heredoc-run
# Python interpreter sees it.
if ! TMP="$TMP" python3 - <<'PY'
import json, os, sys
with open(os.environ['TMP']) as f:
    d = json.load(f)
pr = ((d.get('data') or {}).get('repository') or {}).get('pullRequest')
if pr is None:
    sys.exit(2)
PY
then
  echo "fetch failed for PR #$PR (invalid JSON or pullRequest: null):" >&2
  head -20 "$TMP" >&2
  exit 2
fi

PR_JSON_PATH="$TMP" python3 <<'PY'
import json, os, re, sys, datetime

with open(os.environ['PR_JSON_PATH']) as f:
    d = json.load(f)

# Defensive: we already validated upstream, but keep the
# guards so this script is also safe to re-run against a
# saved TMP file.
repo = (d.get('data') or {}).get('repository') or {}
pr = repo.get('pullRequest')
if pr is None:
    sys.stderr.write("pullRequest missing in JSON — aborting formatter.\n")
    sys.exit(2)

title = pr.get('title', 'untitled')
number = pr.get('number')

slug = re.sub(r'[^a-zA-Z0-9]+', '-', title).strip('-').lower()
slug = slug[:60].strip('-') or 'untitled'

out_dir = os.path.join(os.environ['REPO_ROOT'], 'docs', 'pr-discussions')
os.makedirs(out_dir, exist_ok=True)
# Zero-pad to 4 digits — aligns with README's documented
# filename shape (e.g. PR-0357-...). Sorts lexicographically
# == numerically for PR #0001..#9999.
path = os.path.join(out_dir, f'PR-{number:04d}-{slug}.md')

archived_at = datetime.datetime.utcnow().isoformat(timespec='seconds') + 'Z'

def yaml_quote(s):
    """Quote YAML string values safely. json.dumps gives us
    double-quoted strings with escaping; valid YAML too."""
    return json.dumps('' if s is None else str(s))

lines = []
lines.append('---')
lines.append(f'pr_number: {number}')
lines.append(f'title: {yaml_quote(title)}')
lines.append(f'author: {yaml_quote((pr.get("author") or {}).get("login") or "unknown")}')
lines.append(f'state: {yaml_quote(pr.get("state"))}')
lines.append(f'created_at: {yaml_quote(pr.get("createdAt") or "")}')
if pr.get('mergedAt'):
    lines.append(f'merged_at: {yaml_quote(pr.get("mergedAt"))}')
if pr.get('closedAt'):
    lines.append(f'closed_at: {yaml_quote(pr.get("closedAt"))}')
lines.append(f'head_ref: {yaml_quote(pr.get("headRefName") or "")}')
lines.append(f'base_ref: {yaml_quote(pr.get("baseRefName") or "")}')
lines.append(f'archived_at: {yaml_quote(archived_at)}')
lines.append(f'archive_tool: {yaml_quote("tools/pr-preservation/archive-pr.sh")}')
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
# Strip trailing whitespace on every line — markdownlint
# MD009 + keeps backfilled archives clean.
content = '\n'.join(line.rstrip() for line in content.split('\n'))
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print(f'wrote {path} ({len(content)} bytes, {len(threads)} threads, {len(reviews)} reviews, {len(comments)} comments)')
PY
