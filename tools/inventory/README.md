# tools/inventory/

Reusable utilities for inventory + asset tracking.

## amazon-orders-extract.ts

One-time extraction of personal Amazon order history into local JSON
files. Run by a HUMAN-actor (not by an agent — agent-driven scraping of
authenticated personal accounts is blocked by the safety classifier per
the B-0582 destructive-verb-refusal-gate principle).

Outputs two local files in the current working directory:

- `amazon-orders-full.json` — titles + prices + dates per order (give to
  accountant or other purpose-specific destination; **not for git
  commit**)
- `amazon-orders-hardware-filtered.json` — hardware-keyword subset
  (review then optionally commit to Zeta as B-0590 hardware inventory
  substrate, with PII stripped if desired)

### Usage

```bash
bun install playwright            # first time only
bunx playwright install chromium  # first time only
bun tools/inventory/amazon-orders-extract.ts            # extracts 2025 (default)
bun tools/inventory/amazon-orders-extract.ts 2024       # extracts 2024
```

The script launches Playwright in HEADED mode. Complete sign-in in the
opened browser window when prompted; auto-extraction proceeds after.

### Output files are gitignored

`amazon-orders-full.json` and `amazon-orders-hardware-filtered.json` are
listed in the repo's `.gitignore`. They contain personal financial data
+ adjacent-party purchase info; never appropriate for git commit by
default. The hardware-only subset MAY be committed after manual review
strips PII (dates / prices / order IDs / household-orbit items).

### Reusable for other accounts

The script is generic — anyone can run it on their own Amazon account.
No hardcoded credentials, no Aaron-specific paths. Future extension
(per Aaron's 2026-05-16 framing): multi-account / multi-vendor
consolidation for assets the operator is authorized to query.

### Composes with

- [B-0582](docs/backlog/) — destructive-verb refusal gate; agent-driven
  scraping of authenticated personal accounts is appropriately refused
  at the classifier layer; human-driven script is the legitimate path
- B-0590 — fleet replication + hardware inventory substrate; this
  script's hardware-filtered output feeds that row's inventory section
- Future B-NNNN — multi-account consolidation (Aaron 2026-05-16
  "killer feature" framing)
