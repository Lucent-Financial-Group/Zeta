---
name: "audit-backlog-status-drift — 2nd false-positive class: inline `composes with` references in Acceptance sub-sections"
description: "The B-0553 audit tool's section-aware parser correctly skips the top-level `## Composes with` section, but misses inline `Composes with X` bullets WITHIN Acceptance sub-sections (Sharpening 4 of B-0518 is the canonical example). Tool needs `INLINE_CROSSREF_PATTERNS` regex set to skip lines matching `\\bcomposes[\\s-]?with\\b`, `\\bsister\\b`, `\\bsee also\\b`, `\\bper [`\\[]`, etc."
type: feedback
created: 2026-05-16
---

# 2nd false-positive class in the audit-backlog-status-drift tool

## Origin

Tick 11 of the 2026-05-16T04:15Z–05:45Z session (rate-limit waiting). Manually verified one of the 30 audit-tool candidates ([B-0518](../docs/backlog/P1/B-0518-sharpen-holding-without-named-dependency-rule-anti-failure-mode-2026-05-14.md)) and discovered the tool flagged it for the wrong reason.

## The false positive

B-0518 is a tracking row for 7 candidate sharpenings to `.claude/rules/holding-without-named-dependency-is-standing-by-failure.md`. The row's `## Acceptance criteria (candidate sharpenings)` section is divided into sub-sections "Sharpening 1" through "Sharpening 7," each with its own bullet list of acceptance criteria.

Sharpening 4 includes this bullet:

> - [ ] Composes with `.claude/rules/encoding-rules-without-mechanizing.md` (encode + mechanize, not just encode)

The audit tool's `extractPrimaryArtifacts` function correctly identifies the bullet as inside an Acceptance section (so section-aware parsing engages), and correctly extracts `.claude/rules/encoding-rules-without-mechanizing.md` from the bullet. Because that rule file exists, the audit reported B-0518 as a drift candidate.

**But the bullet is a CROSS-REFERENCE, not a deliverable**. "Composes with X" inside an Acceptance bullet means "the deliverable this row will produce should compose with X" — X is a sibling, not a new artifact. The audit tool's "skip `## Composes with` section" heuristic doesn't catch this case because the cross-reference is inside a primary-section bullet.

## The fix

Add an `INLINE_CROSSREF_PATTERNS` regex set to the tool. For each line within a primary section, if the line matches any of:

```typescript
/\bcomposes[\s-]?with\b/i
/\bsister\s+(?:mechanism|rule|tool|module)/i
/\bcross[\s-]?reference/i
/\bsee\s+(?:also\s+)?[`\[]/i
/\bper\s+[`\[]/i
/\b(?:references?|cites?)\s+[`\[]/i
```

…skip the line's paths entirely. They're cross-references, not deliverables.

## Why the simple section-aware parser missed it

The original tool's mental model was: "every section is either primary (extract paths) or skip (ignore paths)." This works at the section granularity. But Acceptance sub-sections can themselves contain bullets that are cross-references, not deliverables. The tool needs **two-level discrimination**: section-level (already implemented) AND line-level (the missing piece).

The same applies in reverse — a `## Composes with` section with a bullet "Add `tools/foo.ts`" would be a deliverable inside a skip-section. The tool currently treats it as a cross-reference (correct for almost all cases), but the asymmetry highlights that **line-level intent matters** in addition to section-level intent.

## Test cases to add

The improvement should ship with regression tests:

```typescript
test("INLINE_CROSSREF: 'Composes with X' inside Acceptance section is NOT a deliverable", () => {
    const body = `## Acceptance

- [ ] New \`tools/foo.ts\`
- [ ] Composes with \`.claude/rules/bar.md\`
`;
    expect(extractPrimaryArtifacts(body)).toEqual(["tools/foo.ts"]);
});

test("INLINE_CROSSREF: 'sister mechanism' references skip", () => {
    const body = `## Proposed mechanization

- New \`tools/audit.ts\`
- Sister mechanism: \`tools/orchestrator-checks/verify-branch.ts\`
`;
    expect(extractPrimaryArtifacts(body)).toEqual(["tools/audit.ts"]);
});
```

## Composes with

- [`tools/hygiene/audit-backlog-status-drift.ts`](../tools/hygiene/audit-backlog-status-drift.ts) (the tool to extend; first slice landed via `feat/b0553-audit-backlog-status-drift-impl-otto-cli-2026-05-16` branch, PR pending at the time of this memory's authoring)
- [B-0553](../docs/backlog/P3/B-0553-audit-backlog-status-drift-detection-2026-05-16.md) — the spec, which already mentions the empirical false-positive catalog (the FIRST FP class)
- [`memory/feedback_substrate_drift_catch_pattern_claim_acquire_plus_existence_check_otto_cli_2026_05_16.md`](feedback_substrate_drift_catch_pattern_claim_acquire_plus_existence_check_otto_cli_2026_05_16.md) — the discipline; this observation extends the false-positive list to two classes
- [`.claude/rules/backlog-item-start-gate.md`](../.claude/rules/backlog-item-start-gate.md) — the auto-loaded rule's step 0; the partial-vs-drift discriminator the rule references depends on the audit tool not lying about which rows are drift

## Substrate-honest framing

The first audit-tool slice is still load-bearing — it found 30+ candidates, many of which ARE genuine drift (B-0506, B-0528, B-0530, B-0535 were closed earlier this session). The 2nd false-positive class doesn't invalidate the tool; it refines its precision.

The improvement is a small change (~10 lines + 2 tests) suitable as a follow-up commit on the same PR branch. It does NOT need a new backlog row; it's an inline refinement of the same B-0553 deliverable.

## Origin tick

Tick 11 of the 2026-05-16 cold-boot session — rate-limit-bounded wait window when local-only verification work was the highest-value activity. Authored during tick 12.
