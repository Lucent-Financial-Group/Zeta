---
id: B-0274
priority: P1
status: open
title: "GitHub Pages fingerprints - canonical URLs and content hashing"
created: 2026-05-08
parent: B-0233
decomposition: atomic
---

# B-0274 - Pages fingerprints

Define and implement the fingerprinting scheme for public Pages content.

## Scope

- Canonical URL generation for each public doc
- Content hash (SHA-256) for change detection
- Fingerprint file format and location
- Integration with existing hygiene tools

## Acceptance criteria

- Every public Pages doc has a stable canonical URL
- Fingerprint includes URL + content hash + last-modified
- Fingerprints are machine-readable (JSON)
- Tool exists to regenerate fingerprints on content change
- Fingerprints survive the initial site launch without URL churn

## Exclusions

- Full-text search indexing (separate concern)
- Sitemap generation (follow-on)
- RSS/Atom feeds (follow-on)