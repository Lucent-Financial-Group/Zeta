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
# Root-cause investigation (2026-04-23, per Aaron's DST
# discipline — retries should be investigated before added,
# per the per-user memory
# `feedback_retries_are_non_determinism_smell_DST_holds_investigate_first_2026_04_23.md`):
#
# - Local git config is clean: `remote.origin.url =
#   https://github.com/Lucent-Financial-Group/Zeta.git` with
#   no trailing slash.
# - `GIT_TRACE=1 GIT_CURL_VERBOSE=1 git ls-remote origin`
#   shows the on-wire URL is
#   `/Lucent-Financial-Group/Zeta.git/git-upload-pack` — the
#   trailing `.git/` in error messages is `.git/git-upload-pack`
#   truncated in git's error formatter, not a client-side
#   URL-construction bug. Aaron's trailing-slash hypothesis
#   was structural but the `/` is the path separator before
#   the Git-protocol endpoint, correct per spec.
# - The HTTP 500 returns directly from GitHub's server and
#   reproduces intermittently on different commands
#   (push / ls-remote).
# - Conclusion: the 500 is a genuinely external GitHub
#   transient, not a client-side fix we can make. This is
#   the "real external reasons we can't control" exception
#   from the DST discipline — retry is legitimate here
#   after investigation, not as a default reach.
#
# If the 500-rate escalates or the investigation surfaces a
# new root cause, this wrapper should be revisited.
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
