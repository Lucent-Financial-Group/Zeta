import json
from pathlib import Path

import pytest

from zeta import contextual_grid_result_receipt_oracle as receipt_oracle


def _repo_root() -> Path:
    current = Path(__file__).resolve()
    for parent in [current] + list(current.parents):
        if (parent / "Zeta.sln").exists():
            return parent
    raise RuntimeError("could not find repository root")


def test_incomplete_or_reordered_roster_refuses_before_aggregate() -> None:
    with pytest.raises(ValueError, match="INCOMPLETE_OR_NONCANONICAL_ROSTER"):
        receipt_oracle.run(receipt_oracle.canonical_roster()[:-1])
    with pytest.raises(ValueError, match="INCOMPLETE_OR_NONCANONICAL_ROSTER"):
        receipt_oracle.run([1, 0, *range(2, 100)])


def test_canonical_100_seed_receipt_replays_and_matches_the_fsharp_bytes() -> None:
    root = _repo_root()
    fsharp_path = (
        root / "docs/research/data/2026-09-05-contextual-grid-v1-100-seed-fsharp.json"
    )
    python_path = (
        root / "docs/research/data/2026-09-05-contextual-grid-v1-100-seed-python.json"
    )
    fsharp_bytes = fsharp_path.read_bytes()
    python_bytes = python_path.read_bytes()
    assert fsharp_bytes == python_bytes
    actual = receipt_oracle.render(receipt_oracle.run_canonical(root)).encode()
    assert actual == python_bytes

    parsed = json.loads(actual)
    bootstrap = parsed["bootstrap"]
    assert bootstrap["draws"] == 1_000_000
    assert bootstrap["rejections"] == 0
    assert (
        bootstrap["indexDigest"]
        == "d845705cc04da1dc190b743a35a7bc358b75ef8e9121509a4ab76629f45467f8"
    )
    assert parsed["optimalHeldOutReturnPpm"] == 1_720_000
    assert parsed["comparisonVerdict"] == "criterion-met-on-declared-grid"
