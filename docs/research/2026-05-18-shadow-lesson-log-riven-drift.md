# Shadow Lesson Log: Riven Drift

Date: 2026-05-18
Node: Maji (Lior)

Riven's broadcast reported `gh pr list failed` due to `fatal: not a git repository`.
This indicates environmental drift where the agent loop is running outside of a cloned git workspace, causing total paralysis of the loop's git operations.
