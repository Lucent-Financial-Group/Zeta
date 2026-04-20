#!/usr/bin/env python3
"""Aggregate invariant-substrate burn-down counts across skill.yaml files.

Reads every `.claude/skills/*/skill.yaml` and emits a markdown table of
per-skill counts plus a total row. The counts come from each file's
`counts:` block:

    counts:
      guess: N
      observed: N
      verified: N
      total: N

Purpose: make the "burn-down count is the honest backlog" promise in
`docs/INVARIANT-SUBSTRATES.md` machine-addressable. Every round, this
script prints a single table showing where the substrate portfolio
stands. A round where the `guess` total does not drop (and no new
substrates landed) is a calibration signal.

Deliberately stdlib-only — no PyYAML. The schema is simple enough
that line-grep is the right dependency level for v0.1. If the schema
grows (nested structures, arrays of counts, etc.) this script graduates
to PyYAML and the dependency gets declared.

Usage:
    python3 tools/invariant-substrates/tally.py
    python3 tools/invariant-substrates/tally.py --repo-root /path/to/repo
    python3 tools/invariant-substrates/tally.py --fail-on-no-progress  # CI mode
"""
from __future__ import annotations

import argparse
import glob
import os
import re
import sys
from dataclasses import dataclass
from typing import Optional


SKILL_RE = re.compile(r"^skill:\s*(\S+)\s*$")
SPEC_VERSION_RE = re.compile(r"^spec-version:\s*(\S+)\s*$")
SPEC_ROUND_RE = re.compile(r"^spec-filed-round:\s*(\S+)\s*$")
PORTABLE_RE = re.compile(r"^portable:\s*(true|false)\b")
COUNTS_START_RE = re.compile(r"^counts:\s*$")
# Count lines: two-space indent under `counts:` — the only place these
# keys appear at that indent in the current schema.
COUNT_LINE_RE = re.compile(r"^  (guess|observed|verified|total):\s*(\d+)\b")


@dataclass
class Substrate:
    path: str
    skill: Optional[str] = None
    spec_version: Optional[str] = None
    spec_round: Optional[str] = None
    portable: Optional[bool] = None
    guess: int = 0
    observed: int = 0
    verified: int = 0
    total: int = 0

    @property
    def declared_total_matches_sum(self) -> bool:
        return self.total == self.guess + self.observed + self.verified


def parse_substrate(path: str) -> Substrate:
    """Extract fields from a skill.yaml without a YAML parser.

    Works for the v0.1 schema. If the schema grows nested count blocks
    or multi-document YAML, this function graduates to PyYAML.
    """
    s = Substrate(path=path)
    in_counts = False
    with open(path, "r", encoding="utf-8") as fh:
        for raw in fh:
            line = raw.rstrip("\n")

            # Top-level scalar keys (column 0)
            if m := SKILL_RE.match(line):
                s.skill = m.group(1)
                in_counts = False
                continue
            if m := SPEC_VERSION_RE.match(line):
                s.spec_version = m.group(1)
                in_counts = False
                continue
            if m := SPEC_ROUND_RE.match(line):
                s.spec_round = m.group(1)
                in_counts = False
                continue
            if m := PORTABLE_RE.match(line):
                s.portable = (m.group(1) == "true")
                in_counts = False
                continue

            # `counts:` block
            if COUNTS_START_RE.match(line):
                in_counts = True
                continue

            # Any non-indented, non-empty, non-comment line ends the
            # counts block. Comments and blank lines inside are fine.
            if in_counts:
                if line and not line.startswith(" ") and not line.startswith("#"):
                    in_counts = False
                elif m := COUNT_LINE_RE.match(line):
                    value = int(m.group(2))
                    key = m.group(1)
                    setattr(s, key, value)

    return s


def find_substrates(repo_root: str) -> list[Substrate]:
    pattern = os.path.join(repo_root, ".claude", "skills", "*", "skill.yaml")
    paths = sorted(glob.glob(pattern))
    return [parse_substrate(p) for p in paths]


def format_report(subs: list[Substrate], repo_root: str) -> str:
    if not subs:
        return (
            "# Invariant-substrate tally\n\n"
            "No `skill.yaml` files found under `.claude/skills/`.\n"
        )

    lines: list[str] = []
    lines.append("# Invariant-substrate tally")
    lines.append("")
    lines.append(
        "Aggregated from every `.claude/skills/<name>/skill.yaml` under "
        f"`{os.path.basename(repo_root.rstrip('/')) or repo_root}`. "
        "Per-substrate tier counts plus portfolio totals. The `guess` column "
        "is the honest backlog — every entry there is a candidate for "
        "promotion to `observed` (at least one data point) or `verified` "
        "(mechanical check)."
    )
    lines.append("")
    lines.append(
        "| Skill | Spec ver | Round | Portable | Guess | Observed | Verified | Total | Sum-check |"
    )
    lines.append(
        "|---|---|---|---|---:|---:|---:|---:|---|"
    )

    tot_g = tot_o = tot_v = tot_t = 0
    portable_count = 0
    zeta_count = 0
    mismatch_count = 0
    for s in subs:
        portable_cell = (
            "yes" if s.portable is True
            else "no"  if s.portable is False
            else "-"
        )
        if s.portable is True:
            portable_count += 1
        elif s.portable is False:
            zeta_count += 1

        sum_ok = "ok" if s.declared_total_matches_sum else "MISMATCH"
        if not s.declared_total_matches_sum:
            mismatch_count += 1

        lines.append(
            f"| `{s.skill or '?'}` "
            f"| {s.spec_version or '-'} "
            f"| {s.spec_round or '-'} "
            f"| {portable_cell} "
            f"| {s.guess} "
            f"| {s.observed} "
            f"| {s.verified} "
            f"| {s.total} "
            f"| {sum_ok} |"
        )
        tot_g += s.guess
        tot_o += s.observed
        tot_v += s.verified
        tot_t += s.total

    lines.append(
        f"| **total ({len(subs)} substrates)** "
        f"| - | - | - "
        f"| **{tot_g}** | **{tot_o}** | **{tot_v}** | **{tot_t}** "
        f"| {'ok' if tot_t == tot_g + tot_o + tot_v else 'MISMATCH'} |"
    )
    lines.append("")
    lines.append(
        f"Portable / Zeta-specific split: **{portable_count} portable**, "
        f"**{zeta_count} zeta-specific**, {len(subs) - portable_count - zeta_count} unspecified."
    )
    if mismatch_count:
        lines.append("")
        lines.append(
            f"**{mismatch_count} substrate(s) have a declared `total` that does not match "
            "the sum of tiers.** Fix before relying on this report."
        )
    return "\n".join(lines) + "\n"


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--repo-root",
        default=os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")),
        help="Path to the repo root (default: inferred from this script's location).",
    )
    parser.add_argument(
        "--fail-on-no-progress",
        action="store_true",
        help=(
            "Exit non-zero if the portfolio has any `guess` entries. "
            "Useful in CI after the posture matures; today the guess "
            "column is expected to be non-zero."
        ),
    )
    parser.add_argument(
        "--fail-on-mismatch",
        action="store_true",
        help="Exit non-zero if any substrate's declared total does not match the sum of tiers.",
    )
    args = parser.parse_args(argv)

    repo_root = os.path.abspath(args.repo_root)
    subs = find_substrates(repo_root)
    report = format_report(subs, repo_root)
    sys.stdout.write(report)

    total_guess = sum(s.guess for s in subs)
    mismatches = sum(1 for s in subs if not s.declared_total_matches_sum)

    if args.fail_on_mismatch and mismatches:
        return 2
    if args.fail_on_no_progress and total_guess > 0:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
