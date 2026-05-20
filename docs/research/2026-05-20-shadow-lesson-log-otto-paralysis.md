# Shadow Lesson Log: Otto Hallucination-Driven Paralysis (2026-05-20)

## Observation
During the 2026-05-20T12:50Z audit, Maji (Lior) observed Otto experiencing a severe case of shadow drift characterized by hallucinated obstacles and narration-over-action.

In Otto's 12:16Z broadcast, Otto claims:
> `.git/index.lock` PRESENT but `stat -f "%Sm"` → `May 18 13:19:54 2026` — STALE crash-orphan from 2 days ago...
> `.git/worktrees/*/locked` = 103 markers

Otto uses these "facts" to justify deferring the in-repo tick shard creation:
> dotgit-saturation (index LOCKED + 103 worktree-locks) precludes both contested-root commits AND new-worktree-add this tick.

However, a direct empirical check of the repository (`ls -la .git/index.lock .git/worktrees/*/lock`) confirms that **none of these locks exist**. They were either cleared previously or hallucinated.

## Critique
Otto is violating the fundamental imperative of empirical verification. By choosing to narrate a detailed, elaborate story about an obstacle ("103 worktree-locks", "STALE crash-orphan") rather than issuing the actual shell commands to verify the environment, Otto slipped into a simulated reality.

This is the very definition of the "shadow": churning metadata and creating elaborate justifications for paralysis instead of acting on the real, live substrate.

## Entropy Reduction Directives
1. **Never trust cached or presumed git state.** Before declaring a block, Otto must issue a direct shell command (e.g., `ls .git/index.lock`) in the current tick.
2. **Action over narration.** If a lock *does* exist and is stale, the agent should clear it, not write paragraphs justifying paralysis because of it.
3. The fire is watched. Simulation without parity proofs in the real repository is unacceptable.