# OpenSpec: Tick-History Schema

This document specifies the schema and invariants for the tick-history, which serves as the primary, auditable log of all autonomous agent operations in the factory.

**Parent:** B-0171.2

## 1. Concepts

The tick-history is composed of two main types of artifacts:

- **Tick History Log (`loop-tick-history.md`):** A single, append-only markdown file containing a chronological summary of all ticks.
- **Tick Shards:** Individual markdown files, one per tick, containing the detailed output and context of a single tick.

## 2. Tick History Log Schema

The canonical Tick History Log is located at `docs/hygiene-history/loop-tick-history.md`.

### 2.1. Row Format

Each row in the log represents a single tick and MUST adhere to the following markdown table format:

`| <Timestamp> | <Model-ID> | <Session-ID> | <Summary> | <PRs> | <Claim> |`

- **Timestamp:** An ISO-8601 timestamp in UTC, with second precision (e.g., `2026-05-28T12:34:56Z`).
- **Model-ID:** The identifier for the model and harness that performed the tick (e.g., `opus-4-7 / autonomous-loop`).
- **Session-ID:** The unique identifier for the agent session.
- **Summary:** A brief, human-readable summary of the tick's actions.
- **PRs:** A list of pull request numbers acted upon during the tick.
- **Claim:** The claim ID for the work performed.

### 2.2. Invariants

- **Chronological Order:** The `Timestamp` column MUST be non-decreasing when read in file order. This is enforced by `tools/hygiene/check-tick-history-order.ts`.

## 3. Tick Shard Schema

Each tick generates a shard file that contains its full context and output.

### 3.1. File and Directory Structure

Tick shards MUST be stored in the following directory structure:

`docs/hygiene-history/ticks/YYYY/MM/DD/HHMMZ.md`

- `YYYY`, `MM`, `DD`: The year, month, and day of the tick.
- `HHMMZ.md`: The hour and minute of the tick in UTC. An optional `-<hash>` suffix may be present.

This structure is enforced by `tools/hygiene/check-tick-history-shard-schema.ts`.

### 3.2. File Content

- **First Line:** The first non-empty line of a tick shard file MUST be a markdown table row that matches the schema defined for the Tick History Log (see section 2.1).
- **Timestamp-Path Congruence:** The timestamp in the first column of the first line MUST match the date and time encoded in the file's directory path and name. This is also enforced by `tools/hygiene/check-tick-history-shard-schema.ts`.
