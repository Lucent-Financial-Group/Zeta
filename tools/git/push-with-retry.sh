#!/usr/bin/env bash
# tools/git/push-with-retry.sh
#
# Thin wrapper over `git push` that retries on transient
# GitHub 5xx errors. Thin-wrapper-over-existing-CLI exemption
# from the bun+TS default per docs/POST-SETUP-SCRIPT-STACK.md.
#
# Why this exists: the factory has observed recurring
# transient GitHub 500s during autonomous-loop tick-close
# commits (multiple occurrences 2026-04-23). A retry of the
# same `git push` command succeeds on the next attempt within
# seconds. Manual retry burns tick budget; a one-line helper
# makes the retry uniform.
#
# Open root-cause question: Aaron 2026-04-23 noted the error
# URL shows `Zeta.git/` with a trailing slash. Local git
# config has the canonical `.git` form with no trailing
# slash. The trailing slash in the error may be an artifact
# of git's URL-error formatter (closing `'` could visually
# resemble `/`) or a real URL-normalisation inside libcurl.
# Either way the symptom — transient 5xx on push — is
# what this script mitigates. If the root cause turns out
# to be URL-construction, a repo-level fix would supersede
# this retry wrapper.
#
# Usage: tools/git/push-with-retry.sh [git push args...]
#   tools/git/push-with-retry.sh
#   tools/git/push-with-retry.sh --set-upstream origin my-branch
#
# Exit codes:
#   0   push succeeded (possibly after retries)
#   1   push failed after all retries OR non-transient error
#
# Environment:
#   GIT_PUSH_MAX_ATTEMPTS  override retry count (default 3)
#   GIT_PUSH_BACKOFF_S     override initial backoff seconds
#                          (default 2; doubles each retry)

set -euo pipefail

max_attempts="${GIT_PUSH_MAX_ATTEMPTS:-3}"
backoff="${GIT_PUSH_BACKOFF_S:-2}"

attempt=1
while (( attempt <= max_attempts )); do
  tmp_stderr="$(mktemp)"
  if git push "$@" 2> >(tee "$tmp_stderr" >&2); then
    rm -f "$tmp_stderr"
    exit 0
  fi

  exit_code=$?

  # Only retry on transient 5xx errors from the remote.
  if grep -qE "(500|502|503|504|Internal Server Error|Bad Gateway|Service Unavailable|Gateway Timeout)" "$tmp_stderr"; then
    rm -f "$tmp_stderr"
    if (( attempt < max_attempts )); then
      echo "push-with-retry: transient 5xx on attempt $attempt/$max_attempts; retrying in ${backoff}s..." >&2
      sleep "$backoff"
      backoff=$(( backoff * 2 ))
      attempt=$(( attempt + 1 ))
      continue
    fi
    echo "push-with-retry: failed after $max_attempts attempts on transient 5xx" >&2
    exit 1
  fi

  # Non-transient error (auth / protected branch / hook /
  # divergence / etc.) — propagate immediately, do not retry.
  rm -f "$tmp_stderr"
  exit "$exit_code"
done
