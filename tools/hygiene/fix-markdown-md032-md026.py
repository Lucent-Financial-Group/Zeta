#!/usr/bin/env python3
"""
tools/hygiene/fix-markdown-md032-md026.py — mechanical fix for two
markdownlint violations:

- MD032 (blanks-around-lists): inserts blank lines before/after list
  blocks where they're missing
- MD026 (no-trailing-punctuation): strips trailing `:` `!` `?` from
  ATX headings

Why this exists (Aaron 2026-04-26):
    "in python shape should be a queue that we are missing substraight
     primitives"

I'd been carrying this fix as `/tmp/md_fix.py` and re-typing it
across multiple drain ticks. Per Otto-346 principle (recurring
dynamic Python = signal a substrate primitive is missing), the
right home is `tools/hygiene/` checked into substrate. This tool
is the formalized version of the recurring pattern.

Usage:
    python3 tools/hygiene/fix-markdown-md032-md026.py FILE [FILE ...]
    python3 tools/hygiene/fix-markdown-md032-md026.py --dry-run FILE

Always idempotent: running on already-clean file is no-op.

Composes with:
- markdownlint-cli2 (.github/workflows/gate.yml lint-markdown job)
  — this tool produces input the linter accepts; the linter is the
  detection check
- Otto-341 (mechanism over discipline; markdownlint discipline
  becomes mechanism via this tool)
- Otto-346 candidate (recurring dynamic = missing primitive;
  this tool IS the primitive that absorbs the recurring pattern)
"""

import argparse
import re
import sys
from pathlib import Path


_LIST_LINE = re.compile(r"^(  )*(- |\d+\. )")
_INDENTED_LINE = re.compile(r"^  +\S")
_HEADING_WITH_PUNCT = re.compile(r"^(#+ .+?)([:!?]+)$")


def _is_list_or_continuation(line: str) -> bool:
    """Return True if line is a list item or its continuation
    (indented paragraph under a list item)."""
    return bool(_LIST_LINE.match(line) or _INDENTED_LINE.match(line))


def _is_list(line: str) -> bool:
    """Return True if line starts a list item."""
    return bool(_LIST_LINE.match(line))


def fix_md032(text: str) -> str:
    """Insert blank lines before list blocks (where the previous
    line is non-blank and not itself a list/continuation) and after
    list blocks (where the next line is non-blank and not part of
    the list)."""
    lines = text.split("\n")

    # Pass 1: insert blank line BEFORE a list when previous is a
    # non-list, non-blank line.
    out: list[str] = []
    for line in lines:
        if _is_list(line) and out:
            prev = out[-1]
            if prev.strip() and not _is_list_or_continuation(prev):
                out.append("")
        out.append(line)

    # Pass 2: insert blank line AFTER a list-item when next is a
    # non-list, non-blank line.
    out2: list[str] = []
    for i, line in enumerate(out):
        out2.append(line)
        if _is_list(line) and i + 1 < len(out):
            nxt = out[i + 1]
            if nxt.strip() and not _is_list_or_continuation(nxt):
                out2.append("")

    return "\n".join(out2)


def fix_md026(text: str) -> str:
    """Strip trailing `:`, `!`, `?` punctuation from ATX heading
    lines (matches `^#+ ...`)."""
    out: list[str] = []
    for line in text.split("\n"):
        m = _HEADING_WITH_PUNCT.match(line)
        if m:
            out.append(m.group(1))
        else:
            out.append(line)
    return "\n".join(out)


def fix_file(path: Path, dry_run: bool = False) -> tuple[bool, int]:
    """Apply both fixes to a file. Returns (changed, bytes_diff)."""
    if not path.exists():
        print(f"ERROR: file not found: {path}", file=sys.stderr)
        return False, 0
    original = path.read_text()
    fixed = fix_md026(fix_md032(original))
    if fixed == original:
        return False, 0
    if not dry_run:
        path.write_text(fixed)
    return True, len(fixed) - len(original)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Fix markdownlint MD032 + MD026 violations mechanically"
    )
    parser.add_argument("files", nargs="+", help="Markdown files to fix")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would change; do not modify files",
    )
    args = parser.parse_args(argv)

    any_changed = False
    for f in args.files:
        path = Path(f)
        changed, byte_diff = fix_file(path, dry_run=args.dry_run)
        if changed:
            any_changed = True
            verb = "WOULD FIX" if args.dry_run else "FIXED"
            sign = "+" if byte_diff >= 0 else ""
            print(f"{verb} {path} ({sign}{byte_diff} bytes)")

    if not any_changed:
        print("OK: no changes needed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
