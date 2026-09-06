"""Regression and mutation controls for the independent upstream MiniGrid fixture."""

from __future__ import annotations

import json
import shutil
from pathlib import Path

import pytest

from zeta import minigrid_empty_5x5_v310_fixture as fixture

ROOT = Path(__file__).resolve().parents[3]
FSHARP_RECEIPT = (
    ROOT / "docs/research/data/2026-09-06-minigrid-empty-5x5-v310-adapter-fsharp.json"
)
PYTHON_RECEIPT = (
    ROOT / "docs/research/data/2026-09-06-minigrid-empty-5x5-v310-adapter-python.json"
)


def test_fixture_admits_pinned_carrier_and_runtime() -> None:
    carrier = fixture.load_verified_carrier(ROOT)
    fixture.validate_upstream_runtime(carrier)
    assert carrier.environment_id == "MiniGrid-Empty-5x5-v0"
    assert carrier.reset_seeds == (42, 43)


def test_upstream_fixture_replays_committed_cross_oracle_bytes() -> None:
    current = fixture.render(fixture.run_upstream_witness(ROOT))
    assert current == PYTHON_RECEIPT.read_bytes()
    assert current == FSHARP_RECEIPT.read_bytes()
    fixture.verify_canonical_receipt(ROOT, current)


def test_raw_carrier_mutation_refuses_before_upstream_runtime_execution(
    tmp_path: Path,
) -> None:
    carrier_path = tmp_path / fixture.CARRIER_PATH
    carrier_path.parent.mkdir(parents=True)
    shutil.copy(ROOT / fixture.CARRIER_PATH, carrier_path)
    carrier_path.write_bytes(carrier_path.read_bytes() + b" ")
    with pytest.raises(ValueError, match="UPSTREAM_IDENTITY_MISMATCH"):
        fixture.load_verified_carrier(tmp_path)


def test_wrong_action_integer_and_undeclared_projection_refuse_semantically() -> None:
    carrier = json.loads((ROOT / fixture.CARRIER_PATH).read_bytes())
    carrier["actions"][1]["integer"] = 0
    with pytest.raises(ValueError, match="INVALID_ACTION_MAPPING"):
        fixture.validate_carrier_data(carrier)
    carrier = json.loads((ROOT / fixture.CARRIER_PATH).read_bytes())
    carrier["stateProjection"] = "upstream-image/v1"
    with pytest.raises(ValueError, match="INVALID_STATE_PROJECTION"):
        fixture.validate_carrier_data(carrier)


@pytest.mark.parametrize("field", ["terminated", "truncated"])
def test_missing_terminal_fields_refuse_valid_json_receipt(field: str) -> None:
    receipt = json.loads(PYTHON_RECEIPT.read_bytes())
    del receipt["steps"][0][field]
    candidate = json.dumps(receipt, separators=(",", ":")).encode()
    with pytest.raises(ValueError, match="INVALID_RECEIPT_SCHEMA"):
        fixture.verify_canonical_receipt(ROOT, candidate)


def test_altered_valid_json_reward_diagnostic_refuses_canonical_replay() -> None:
    receipt = json.loads(PYTHON_RECEIPT.read_bytes())
    receipt["steps"][-1]["rewardPpm"] = 955_001
    candidate = json.dumps(receipt, separators=(",", ":")).encode()
    with pytest.raises(ValueError, match="NONCANONICAL_RECEIPT"):
        fixture.verify_canonical_receipt(ROOT, candidate)
