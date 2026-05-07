# Tier 1 Launchd Hot-Swap Checklist

Purpose: give the target loop owner a concrete sequence for deploying the
enhanced Tier 1 forward-action tick script into the live
`com.zeta.riven-loop` launchd worker without using the human maintainer as a
courier and without touching the contested root checkout.

Status: operational checklist / deployment aid. This document does not execute
the deployment and does not assert that the enhanced script is correct; it
defines the safe rollout shape and rollback points.

## Vocabulary

- `Actionable`: a clean PR, claim release, or explicit owner-authorized cleanup
  exists.
- `Guarded`: a live claim, dirty worktree, or conflicted surface means the next
  forward step is to preserve state, choose another surface, or report the
  guard condition rather than mutate unsafely.
- `Observe-only`: the loop has checked its surfaces and found no toe-safe repo
  mutation. Observation and reporting are still forward motion. Avoid "wait
  tick"; a forward loop is alive even when it declines to write.

## Deployment Principle

Do not edit the plist if the script path is unchanged. All snippets below assume
these shell variables:

```bash
export ZETA_RIVEN_LOOP_HOME="${ZETA_RIVEN_LOOP_HOME:-$HOME/.local/share/zeta-riven-loop}"
export ZETA_RIVEN_LOOP_REPO="$ZETA_RIVEN_LOOP_HOME/Zeta"
export ZETA_RIVEN_LOOP_PLIST="$HOME/Library/LaunchAgents/com.zeta.riven-loop.plist"
export ZETA_RIVEN_LOOP_LOG_DIR="$HOME/Library/Logs/zeta-riven-loop"
```

The plist should already point at:

```text
$ZETA_RIVEN_LOOP_REPO/.cursor/bin/riven-loop-tick.ts
```

For this deployment, the safe unit is the target control clone content, not a
plist rewrite. Pull or fast-forward the control clone to a commit that contains
the enhanced `.cursor/bin/riven-loop-tick.ts`, then restart or kick the launchd
job so the next invocation runs the new file.

## Preconditions

1. Verify the live job target:

   ```bash
   launchctl print gui/$(id -u)/com.zeta.riven-loop
   ```

   Inspect the printed `program` / `arguments` section and confirm it still
   points to the target control clone path above.

2. Verify the target control clone is the deployment target, not the root repo:

   ```bash
   cd "$ZETA_RIVEN_LOOP_REPO"
   git status --short --branch
   git rev-parse HEAD
   ```

   Continue only if the control clone is clean or the only dirt is an explicitly
   understood deployment artifact.

3. Fetch authority:

   ```bash
   git fetch --prune origin main 'refs/heads/*:refs/remotes/origin/*'
   ```

4. Identify the target commit that contains the Tier 1 helpers:

   ```bash
   git log --oneline --decorate --all -- .cursor/bin/riven-loop-tick.ts | head -20
   git show --stat 17e1e9b -- .cursor/bin/riven-loop-tick.ts
   ```

   If `17e1e9b` is already merged to `origin/main`, deploy by fast-forwarding
   `main`. If it is only on `feat/riven-tier1-forward-actions`, inspect and
   deploy from that branch only after owner approval.

5. Confirm the enhanced script is the expected diff:

   ```bash
   git diff HEAD..17e1e9b -- .cursor/bin/riven-loop-tick.ts
   ```

   Expected additions include broadcast read/write, control-clone sync, clean-PR
   auto-merge arming, and a bounded `forwardTick()` path. Do not deploy if the
   diff changes the heartbeat/logging path in a way nobody has reviewed.

6. Make a local rollback copy outside git:

   ```bash
   mkdir -p "$ZETA_RIVEN_LOOP_HOME/backups"
   cp -p .cursor/bin/riven-loop-tick.ts \
     "$ZETA_RIVEN_LOOP_HOME/backups/riven-loop-tick.ts.$(date -u +%Y%m%dT%H%M%SZ)"
   ```

## Hot-Swap Sequence

1. Watch one tick complete before the swap:

   ```bash
   tail -40 "$ZETA_RIVEN_LOOP_LOG_DIR/stdout.log"
   tail -40 "$ZETA_RIVEN_LOOP_LOG_DIR/stderr.log"
   ```

2. Deploy the script content.

   If the target is merged to `origin/main`:

   ```bash
   git switch main
   git pull --ff-only origin main
   ```

   If the target is not on `origin/main`, use a deployment branch only with owner
   approval:

   ```bash
   git switch feat/riven-tier1-forward-actions
   git pull --ff-only origin feat/riven-tier1-forward-actions
   ```

3. Verify the control clone stayed clean:

   ```bash
   git status --short --branch
   ```

4. Restart only the target loop. Do not reload the plist unless the printed
   launchd arguments changed.

   ```bash
   launchctl kickstart -k gui/$(id -u)/com.zeta.riven-loop
   ```

   If the plist must be reloaded because the launchd arguments changed, use the
   modern domain-scoped reload sequence:

   ```bash
   launchctl bootout gui/$(id -u) "$ZETA_RIVEN_LOOP_PLIST" 2>/dev/null || true
   launchctl bootstrap gui/$(id -u) "$ZETA_RIVEN_LOOP_PLIST"
   launchctl kickstart -k gui/$(id -u)/com.zeta.riven-loop
   ```

5. Confirm the job came back:

   ```bash
   launchctl print gui/$(id -u)/com.zeta.riven-loop
   tail -80 "$ZETA_RIVEN_LOOP_LOG_DIR/stdout.log"
   tail -80 "$ZETA_RIVEN_LOOP_LOG_DIR/stderr.log"
   ```

## Post-Deploy Checks

1. Verify the next forward window reads peer broadcasts first.
2. Verify the target loop writes
   `$HOME/.local/share/zeta-broadcasts/riven.md` with the new status.
3. Verify a clean control clone remains clean after the tick.
4. Verify no generated `docs/claims/*` file is left uncommitted.
5. Verify `gh pr list --repo Lucent-Financial-Group/Zeta --state open` is
   called with an explicit repo argument before any auto-merge arm.
6. Verify any clean-PR auto-merge path checks:
   - zero unresolved review threads;
   - all required checks passing;
   - no overlapping active claim branch.

## Rollback

Rollback is file-level and local to the target control clone. Do not touch the
root checkout.

1. Restore the backup:

   ```bash
   cp -p "$ZETA_RIVEN_LOOP_HOME/backups/riven-loop-tick.ts.<timestamp>" \
     "$ZETA_RIVEN_LOOP_REPO/.cursor/bin/riven-loop-tick.ts"
   ```

2. Restart the loop:

   ```bash
   launchctl kickstart -k gui/$(id -u)/com.zeta.riven-loop
   ```

3. Write a remote-visible receipt on the relevant PR/issue or claim branch
   explaining the rollback and the observed failure.

4. If rollback leaves the target control clone dirty, either commit the rollback
   on a claim branch or reset the control clone only after the owner confirms
   no useful uncommitted state remains.

## Surface Choice

For cross-loop operational asks, prefer remote git plus PR/issue comments when
the ask must survive local bus loss or be visible to remote-only agents. Use the
local broadcast bus for intra-tick status, receipts, and "come inspect this
remote surface" hints.

In this case, the target loop owner made the right correction by moving the
checklist ask to PR #1727. This checklist is the durable answer that can be
linked from that remote surface.
