"""Opt-in offline ARC REST server for the source-owned ZetaChase environment."""

from __future__ import annotations

import argparse
from collections.abc import Sequence
from pathlib import Path

from arc_agi import Arcade, OperationMode  # type: ignore[import-untyped]


def _environment_files() -> Path:
    return Path(__file__).resolve().parents[1] / "environment_files"


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8001)
    parser.add_argument("--recordings-dir", default="recordings")
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    arcade = Arcade(
        arc_api_key="",
        operation_mode=OperationMode.OFFLINE,
        environments_dir=str(_environment_files()),
        recordings_dir=args.recordings_dir,
    )
    arcade.listen_and_serve(
        host=args.host,
        port=args.port,
        include_frame_data=True,
        use_reloader=False,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
