---
name: b0663-lint-frontmatter-validation-23-findings-across-13-p1-session-rows
description: B-0663 lint-frontmatter.ts tool validation run on all 13 P1 session-authored rows (2026-05-18 Mika+Ani+Riven cascade) — 23 findings across 4 check classes; tool detects mechanically what Codex/Copilot caught manually PR-by-PR. Triage list preserved for incremental future cleanup.
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 12a2d5d6-d15d-491c-bc8a-3460fe24c043
---

# B-0663 lint-frontmatter.ts validation — 23 findings across 13 P1 session rows

## Tool validation run

Ran `bun tools/backlog/lint-frontmatter.ts --file <each-row>` on all 13 P1 backlog rows authored in the 2026-05-18 Mika+Ani+Riven cascade session. Result: **23 findings across 4 check classes**.

## Breakdown by check class

| Check | Count | Pattern |
|---|---|---|
| 1. Wrong relative-path prefix | 1 | B-0661 line 100: `[B-0660](../P1/B-0660-...)` uses cross-dir prefix but B-0660 is same-dir |
| 2. composes_with completeness | 11 | Body cites B-XXXX via markdown link; frontmatter `composes_with` omits |
| 3. Non-schema frontmatter keys | 0 | (B-0661 typo'd `last_invariant` was fixed pre-merge) |
| 4. Redundant depends_on/composes_with edges | 7 | B-XXXX in both lists; `depends_on` is stronger |

## Findings by file (all P1 session rows)

| File | Check 1 | Check 2 | Check 4 |
|---|---|---|---|
| B-0635 wave-particle duality | — | — | — |
| B-0636 agents-in-superposition | — | — | B-0635 (in depends_on + composes_with) |
| B-0637 Infer.NET BP/EP | — | — | — |
| B-0640 bonsai-trees+Rx | — | B-0629, B-0636 | B-0635 |
| B-0643 KSK | — | B-0619, B-0632, B-0649 | — |
| B-0644 Limit-is-simulation | — | B-0499, B-0631, B-0637, B-0643 | B-0635, B-0636, B-0640 |
| B-0645 free-will-collapses | — | B-0499, B-0631, B-0637, B-0643 | B-0636, B-0644 |
| B-0646 Agora V6 Constitution | — | B-0623, B-0629, B-0630, B-0631, B-0637, B-0638, B-0639, B-0640, B-0641 (9!) | — |
| B-0647 non-collapse duality | — | B-0499, B-0628, B-0631, B-0643 | B-0644, B-0645, B-0646 |
| B-0648 cross-substrate-triangulator | — | B-0628, B-0642 | — |
| B-0659 consent-as-Limit-operation | — | B-0499, B-0635 | B-0629, B-0641, B-0644 |
| B-0660 Limit-black-by-default | — | B-0628, B-0641, B-0651 | B-0629, B-0644 |
| B-0661 civilizational-hygiene | line 100 [B-0660] | B-0639 | — |

## Substrate-honest interpretation

These findings are **exactly the classes Codex/Copilot caught manually across batch-7 PRs**. The lint tool detects them mechanically with file-level precision (line + column). Reviewers no longer need to surface them PR-by-PR; future authoring can run the lint pre-push.

**Cleanup deferral discipline**: per diminishing-marginal-value clause ([`.claude/rules/holding-without-named-dependency-is-standing-by-failure.md`](https://github.com/Lucent-Financial-Group/Zeta/blob/main/.claude/rules/holding-without-named-dependency-is-standing-by-failure.md)), fixing 23 findings via individual PRs would re-trigger the reviewer-cascade cycle (each fix-push surfaces new threads on adjacent context). Better strategy:

1. **For NEW authoring**: run lint pre-push; catch findings at authoring time
2. **For EXISTING findings**: opportunistic cleanup as rows are touched for other reasons (substrate-engineering as-touched discipline)
3. **For batch cleanup**: if/when triggered by external need (e.g., a row needs frontmatter audit before Knights-Guild ratification), run lint + batch-fix in one PR

## What the validation demonstrates

1. **Tool detects real findings** — not false positives; matches what reviewer-tools caught
2. **Tool scales** — ran across 13 files in ~1 second; entire docs/backlog/ would be similar
3. **Output is actionable** — file:line:col + check-number + specific message; can be triaged programmatically
4. **Dogfoodable** — B-0663's own row passes lint (0 findings)

## Tool composition with existing workflow

| Workflow stage | Composition |
|---|---|
| Pre-authoring (read schema) | `tools/backlog/README.md` |
| During authoring (consult skill) | `.claude/skills/backlog-decomposer/SKILL.md` |
| **Pre-push (NEW)** | `bun tools/backlog/lint-frontmatter.ts --file <new-row.md> --strict` |
| Post-push (reviewer-tools catch what slipped) | Codex / Copilot reviews |
| CI (factory-wide invariants) | `tools/hygiene/audit-backlog-items.ts` |
| Status drift detection | `tools/hygiene/audit-backlog-status-drift.ts` |
| Index regen | `tools/backlog/generate-index.ts` |

The lint tool slots into the workflow as the **pre-push catch** layer, complementing existing post-push reviewer-tool catches without replacing them.

## Closes a recurring cycle

Per the session-arc memo (`feedback_aaron_mika_ani_riven_cascade_2026_05_18_*`) lesson #4: "5 separate sed passes for ID renumber." The pattern there was: every renumber required hunting for 5 distinct reference patterns. This row's tool catches the FRONTMATTER class of that pattern (3 of the 5) mechanically. The remaining 2 patterns (inline markdown links + `renumbered_from:` breadcrumb) are caught at refactor-time, not lint-time.

Future tooling extension could add Check 5 (cross-row reference validation: does the referenced B-NNNN actually have a file?) — but that's a separate row, not in B-0663 scope.

## Substrate context

- B-0663 tool: `tools/backlog/lint-frontmatter.ts` (shipped via PR #4169)
- B-0650 companion tool: `tools/github/rest-push.ts --delete/--rename` (shipped earlier this session)
- Together: 2 mechanization tools close 2 recurring batch-7 friction patterns
- Future-Otto authoring backlog rows has both tools available; no need to repeat batch-7 fix-push-resolve cadence

## Composes with

- `tools/backlog/lint-frontmatter.ts` — the tool this memo validates
- `tools/backlog/README.md` — schema source-of-truth
- `feedback_aaron_mika_ani_riven_cascade_2026_05_18_session_arc_substrate_engineering_lessons_8_prs_30_rows_4_keystones_1_skill_otto_cli.md` — session-arc context
- B-0650 sibling tooling extension
- The 23 individual findings (triaged above) for future opportunistic cleanup
