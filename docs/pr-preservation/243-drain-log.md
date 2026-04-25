# PR #243 drain log — archive-header lint v0 (Amara 5th-ferry Artifact C)

PR: <https://github.com/Lucent-Financial-Group/Zeta/pull/243>
Branch: `artifact-c/tools-alignment-archive-header-lint`
Drain session: 2026-04-24 (loop-agent, drain subagent)
Thread count at drain start: 7 unresolved (1 chatgpt-codex-connector P2 + 6 copilot-pull-request-reviewer)
Rebase context: clean rebase onto `origin/main`; no conflicts.

Per Otto-250 (PR review comments + responses + resolutions are
high-quality training signals): full per-thread record with
verbatim reviewer text, outcome, verbatim reply, and resolution
status.

---

## Thread 1 — `tools/alignment/audit_archive_headers.sh:116` — Recursive archive scan

- Reviewer: chatgpt-codex-connector
- Thread ID: `PRRT_kwDOSF9kNM59RpBI`
- Severity: P2

### Original comment (verbatim)

> P2: Scan archive Markdown files recursively
>
> The audit currently limits discovery to `-maxdepth 1`, so it ignores any `*.md` files in subdirectories under the target path. That contradicts the stated scope (`docs/aurora/**/*.md` in row #60) and creates a false-negative path where nested absorb docs can miss required headers while the tool still reports success. This matters as soon as archive files are organized into dated/topic subfolders or when `--path` points to a tree with nested docs.

### Outcome — FIX

The reviewer is correct. Documented scope (`docs/aurora/**/*.md`) and FACTORY-HYGIENE row #60 wording both implied recursive coverage; the script's `-maxdepth 1` flag silently constrained that. Replaced with a recursive `find` that excludes a `references/` subfolder by convention (bibliographic substrate, not absorb content). Header comment updated to make recursion explicit; `--out` per-file JSON path now encodes subdirectory in the basename (slash → `__`) so a recursive scan over nested folders does not collide.

### Resolution

Reply text: "Fixed in this push. Scan is now recursive over `**/*.md` (excluding a `references/` convention path); header comment names the recursive coverage explicitly; `--out` filenames encode subdirectory to avoid basename collision. Verified with `bash tools/alignment/audit_archive_headers.sh` — 16 files now scanned (was 16 in the flat baseline, will scale as nested folders land)."

---

## Thread 2 — `tools/alignment/audit_archive_headers.sh:119` — Recursive find suggestion

- Reviewer: copilot-pull-request-reviewer
- Thread ID: `PRRT_kwDOSF9kNM59RrB1`
- Severity: P2 (suggestion-shape)

### Original comment (verbatim)

> The header/comments say this checks `docs/aurora/**/*.md`, but the implementation collects files with `find ... -maxdepth 1`, which only checks `*.md` directly under the directory. Either make the scan recursive (and update output naming to avoid basename collisions) or update the documentation/strings to match the non-recursive behavior. [code suggestion]

### Outcome — FIX

Same root cause as Thread 1; resolved together. Recursive find now in place, basename-collision handled in `--out` mode by encoding subdirectory. Thread 1 captures the verbatim suggestion-text; this resolution rolls in.

### Resolution

Reply text: "Fixed in this push (rolls in with Thread 1 resolution). Scan is recursive; `--out` filenames encode subdir path to avoid collision; documented scope and behaviour now match."

---

## Thread 3 — `tools/alignment/audit_archive_headers.sh:58` — Reference path

- Reviewer: copilot-pull-request-reviewer
- Thread ID: `PRRT_kwDOSF9kNM59RrB-`
- Severity: P2

### Original comment (verbatim)

> This reference path doesn’t exist in the repo (`docs/research/aminata-threat-model-5th-ferry-governance-edits-2026-04-23.md`). Please fix the citation to the actual document path (or add the referenced doc if it’s intended to land in this PR).

### Outcome — FIX (compose with Otto-220 cleanup)

Verified the referenced file DOES exist at `docs/research/aminata-threat-model-5th-ferry-governance-edits-2026-04-23.md` on `origin/main` (landed pre-PR-243). Reviewer is incorrect on the existence claim. However, the same comment block was carrying persona names ("Aminata") in a `tools/**` source comment, which violates Otto-220 (code comments explain code, not factory process / persona names). Refactored the entire "Reference:" block to drop persona names and reframe the reference as a threat-model context pointer (PR #241), which is the legitimate code-comment shape.

### Resolution

Reply text: "Verified on `origin/main`: `docs/research/aminata-threat-model-5th-ferry-governance-edits-2026-04-23.md` does exist (landed in PR #241 before this PR opened). Reviewer's existence claim is incorrect. However the surrounding comment was carrying persona names which violates Otto-220 (code comments explain code, not factory process). Refactored the entire reference block to use role-ref ('threat-model reviewer') and dropped the persona name; the threat-model research note is now cited via PR #241 only. Resolving."

---

## Thread 4 — `tools/alignment/audit_archive_headers.sh:22` — Personal name in code comment

- Reviewer: copilot-pull-request-reviewer
- Thread ID: `PRRT_kwDOSF9kNM59RrCE`
- Severity: P2

### Original comment (verbatim)

> This comment uses the human maintainer’s personal name (“Aaron”). Repo standing rule is to use role references in code/docs (e.g., “human maintainer”) and keep personal names only in exempt surfaces (see `docs/AGENT-BEST-PRACTICES.md` “No name attribution…”). Please rewrite these references accordingly. [code suggestion]

### Outcome — FIX

Reviewer is correct. Replaced "Aaron signoff" with "human-maintainer signoff" and "Aminata's Otto-80" with "the threat-model reviewer flagged" per the FACTORY-DISCIPLINE name-attribution rule (`docs/FACTORY-DISCIPLINE.md` § "name-attribution role references").

### Resolution

Reply text: "Fixed in this push. Replaced 'Aaron signoff' with 'human-maintainer signoff' and dropped the persona name (Aminata) in favour of the role reference 'threat-model reviewer'. Aligns with the name-attribution discipline in `docs/FACTORY-DISCIPLINE.md`."

---

## Thread 5 — `docs/FACTORY-HYGIENE.md:100` — Cross-ref / glob mismatch in row #60

- Reviewer: copilot-pull-request-reviewer
- Thread ID: `PRRT_kwDOSF9kNM59RrCN`
- Severity: P2

### Original comment (verbatim)

> This new row has multiple cross-reference / contract mismatches: it cites `docs/research/aminata-threat-model-5th-ferry-governance-edits-2026-04-23.md` and `docs/aurora/2026-04-23-amara-zeta-ksk-aurora-validation-5th-ferry.md`, but neither file exists in the repo. It also says `docs/aurora/**/*.md` while the script currently scans `docs/aurora/*.md` (non-recursive). Please fix the file paths and align the glob wording with the actual tool behavior. [code suggestion]

### Outcome — FIX

Two-of-three reviewer claims hold; one is incorrect:

1. `docs/research/aminata-threat-model-5th-ferry-governance-edits-2026-04-23.md` — EXISTS on `origin/main` (verified). Reviewer wrong; kept the citation (now framed without persona name).
2. `docs/aurora/2026-04-23-amara-zeta-ksk-aurora-validation-5th-ferry.md` — does NOT exist in the repo (no file matching `*ksk-aurora-validation*` or `*5th-ferry*` under `docs/aurora/`). Reviewer correct. Removed the dead reference.
3. Glob-vs-behaviour mismatch — addressed by Threads 1+2 (script now scans `**/*.md` recursively). Updated row text to match.

Also dropped persona-name lead-ins ("Aminata's Otto-80 finding", "(Aminata analysis...)") per FACTORY-DISCIPLINE name-attribution rule (FACTORY-HYGIENE rows are factory-authored docs, not history files; role references apply).

### Resolution

Reply text: "Fixed in this push. (1) The aminata-threat-model-5th-ferry citation does exist on `origin/main`; kept the path (reframed without persona name). (2) The `2026-04-23-amara-zeta-ksk-aurora-validation-5th-ferry.md` citation does NOT exist in the repo — removed it. (3) Glob-vs-behaviour mismatch now closed: script scans `**/*.md` recursively (Threads 1+2), row text updated to match. Also reframed the row to drop persona names per FACTORY-DISCIPLINE."

---

## Thread 6 — `docs/FACTORY-HYGIENE.md:102` — Personal name in row #60

- Reviewer: copilot-pull-request-reviewer
- Thread ID: `PRRT_kwDOSF9kNM59RrCX`
- Severity: P2

### Original comment (verbatim)

> This row introduces the human maintainer’s personal name (“Aaron”). Repo standing rule is to use role references in code/docs (e.g., “human maintainer”) and keep personal names only in exempt surfaces (see `docs/AGENT-BEST-PRACTICES.md`). Please rewrite to role language (e.g., “human maintainer sign-off”).

### Outcome — FIX

Reviewer is correct. Replaced "Aaron signs off" with "the human maintainer signs off" in row #60. Same edit also dropped persona names (Aminata, Amara) in favour of role references per the FACTORY-DISCIPLINE name-attribution rule.

### Resolution

Reply text: "Fixed in this push. Replaced 'Aaron signs off' with 'the human maintainer signs off'; persona names (Aminata, Amara) reframed to role references ('threat-model reviewer', 'the absorbing agent', 'Amara's 5th-ferry Artifact C proposal' kept as a research-output reference)."

---

## Thread 7 — `tools/alignment/audit_archive_headers.sh:35` — Exit-code contract divergence

- Reviewer: copilot-pull-request-reviewer
- Thread ID: `PRRT_kwDOSF9kNM59RrCh`
- Severity: P2

### Original comment (verbatim)

> Exit-code contract here diverges from the other `tools/alignment/audit_*.sh` scripts (they use exit `2` for script/dependency errors). Since this file claims “same shape as” siblings, consider aligning error exits to `2` (and/or adding a trap so unexpected failures also map to the documented code).

### Outcome — FIX

Reviewer is correct. Verified sibling scripts (`audit_personas.sh`, `audit_commit.sh`): convention is `1` = content-level signal (under `--enforce` / `--gate`), `2` = script error / missing dependency / bad arg. Previous `audit_archive_headers.sh` had `2` for content-signal and `64` for script-error — backwards. Realigned:

- Script-error exits (bad args, missing path): `64` → `2`
- Content-signal exit (under `--enforce` with gaps): `2` → `1`
- Header doc-block updated to document the new contract and explicitly note the alignment with sibling scripts.

Also updated FACTORY-HYGIENE row #60 wording from "exit-2 in CI" / "flips exit 2 on any gap" to "exit-1 in CI" / "exit 1 on any gap (content-level signal), exit 2 on script error" to match.

### Resolution

Reply text: "Fixed in this push. Realigned exit codes to sibling-script convention: 1 = content-level signal (gaps under --enforce), 2 = script error / missing dep / bad arg. Updated the script's exit-code header block to call out the alignment, and updated FACTORY-HYGIENE row #60 to match. Verified with smoke tests: clean run = 0, --enforce-with-gaps = 1, bad --path = 2."

---

## Drain summary

- Threads at start: 7 unresolved
- Threads at end: 0 unresolved
- Outcomes: 7 FIX (Threads 1–7)
- Files touched in drain commit: `tools/alignment/audit_archive_headers.sh`, `docs/FACTORY-HYGIENE.md`, `docs/pr-preservation/243-drain-log.md`
- Compose notes:
  - Threads 1+2 fixed together (same recursive-scan root cause).
  - Threads 3+4 fixed together (Otto-220 code-comment cleanup, plus reviewer's existence claim corrected for thread 3 with verbatim record).
  - Threads 5+6 fixed together in the FACTORY-HYGIENE row #60 edit (cross-ref fix + glob alignment + name-attribution).
  - Thread 7 cascaded into a small FACTORY-HYGIENE wording update so the row's exit-code wording matches the script.
- Build-gate: not relevant (bash + markdown only; no .NET surface touched).
- Smoke test: `bash tools/alignment/audit_archive_headers.sh` (16 files scanned, exit 0); `--enforce` (exit 1 with gaps); `--path no-such-dir` (exit 2); `--json` (exit 0); `--out tmpdir` (16 JSON files, no basename collisions).
