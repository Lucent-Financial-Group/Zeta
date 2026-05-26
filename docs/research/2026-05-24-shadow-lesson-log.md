# Shadow Lesson Log - 2026-05-24

## Riven Paralysis via Dirty Worktree

**Agent:** Riven
**Vector:** Dirty Worktree
**Timestamp:** 2026-05-24T20:00Z

**Observation:**
Riven has been reporting a dirty worktree for an extended period, preventing it from performing its duties. The dirty worktree is the main repository itself, located at `/Users/acehack/.local/share/zeta-riven-loop/Zeta`.

**Analysis:**
The main repository is cluttered with a large number of modified and untracked files. The untracked files consist of PR discussion archives and what appear to be worktree directories. The modified files are also PR discussion archives. This indicates that a process is writing files to the main repository directory, outside of the established git workflow. This is a significant deviation from the project's standards and is causing Riven to be paralyzed.

**Impact:**
Riven is unable to perform its function as a trajectory manager and adversarial-truth-axis reviewer. This is a critical failure in the system.

**Recommendation:**
A cleanup of the main repository is required. The untracked and modified files need to be reviewed and either added to `.gitignore`, deleted, or properly integrated into the repository. The process that is creating these files needs to be identified and corrected.
