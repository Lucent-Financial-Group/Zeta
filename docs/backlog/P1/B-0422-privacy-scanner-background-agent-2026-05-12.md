---
id: B-0422
priority: P1
status: open
title: "Privacy-scanner background agent — scan substrate for sensitive content leaks"
created: 2026-05-12
last_updated: 2026-05-12
depends_on: []
composes_with: []
type: friction-reducer
---

# B-0422 — Privacy-scanner background agent

## What

A background agent (launchd service + tick loop) that continuously
scans committed substrate for:

- Real names of non-consenting third parties (NOT Aaron, NOT named
  persona-array participants per Otto-256/279, NOT public figures
  named in research citations)
- Email addresses, phone numbers, physical addresses
- API keys, tokens, secrets that escaped pre-commit checks
- Credit card numbers, SSN-shaped strings, other PII patterns
- Linkedin URLs, social handles tied to private individuals
- Quoted private messages from third parties without consent
  markers
- Cross-references to sensitive material (e.g., legal cases,
  medical info) that should be redacted in public surfaces

## Why P1

Aaron 2026-05-12: "we should spawn a background agent that looks
for any privacy issues."

Origin: when Otto saved the Aaron+Ani Grok extract (2026-05-12),
the auto-mode classifier flagged the bulk-grep step for name
scrubbing as outside agreed scope. Aaron then explicitly confirmed
no real names were in that extract. But the principle is broader:

- The repo is public; every commit is permanent
- Glass halo applies to founder's content, but founder content
  may legitimately reference third parties without consent
- The factory increasingly ingests external material (ferries,
  forwarded conversations, voice extracts)
- A scanner that fires AFTER commit catches what pre-commit
  hooks miss

## Acceptance criteria

1. `tools/privacy-scanner/scan.ts` runs on a cadence (every 15
   min or every commit) and produces a report:
   - Findings list with file:line:pattern
   - Severity (P0/P1/P2 based on pattern class)
   - Suggested remediation (redact / replace with role-ref / leave)
2. Whitelist of permitted names (the agent array, public figures
   in research citations, Aaron's named family members per existing
   substrate)
3. Findings posted to `~/.local/share/zeta-broadcasts/privacy-scanner.md`
   for other agents to see
4. Background loop wired via launchd (`com.zeta.privacy-scanner`)
   following existing service pattern
5. Integration with the autonomous-loop tick — high-severity
   findings surface in tick-history shards

## Out of scope

- Pre-commit hook (separate row if needed; post-commit catches
  what pre-commit misses)
- Real-time chat scanning (we're scanning committed substrate
  only)
- Auto-redaction (the agent FLAGS, Aaron or maintainer DECIDES)

## Patterns to detect

Initial set (refinable):

- Email: `[\w.+-]+@[\w-]+\.[\w.-]+`
- Phone: `\b\d{3}[-.]?\d{3}[-.]?\d{4}\b`
- LinkedIn URL: `linkedin\.com/in/[\w-]+`
- TikTok URL: `tiktok\.com/@[\w-]+`
- SSN-shape: `\b\d{3}-\d{2}-\d{4}\b`
- AWS keys, GitHub tokens, OpenAI keys (standard regex set)
- Two-capital-name pattern: `\b[A-Z][a-z]+\s+[A-Z][a-z]+\b`
  (filtered against whitelist)
- Quoted-from-other patterns: `said\s+"`, `wrote\s+"`, etc.,
  flagging passages that look like third-party quotes

## Composes with

- `.claude/hooks/` (post-commit could be added separately)
- `~/.local/share/zeta-broadcasts/` (findings surface here)
- `memory/feedback_otto_231_glass_halo_first_party_aaron_consent_no_redaction_of_his_own_content_otto_231_2026_04_24.md`
- `memory/feedback_first_names_are_not_pii_allowed_in_history_files_not_other_types_otto_256_2026_04_24.md`

## Origin

Aaron 2026-05-12 after Otto saved Grok+Ani extract under
Otto-231 first-party authority: "we should spawn a background
agent that looks for any privacy issues." The trigger was the
auto-mode classifier flagging the manual name-scrub step;
mechanizing the scan into a persistent background agent
removes the discipline-skip surface.

## Trajectory composition

This is sub-vector of active trajectory #12 (background-loop
productivity uplift). Specifically: increase the array's
useful-while-Aaron-is-away coverage by giving the background
loops a real, valuable, continuous job (not just maintenance
polling).
