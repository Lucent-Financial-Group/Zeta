"""Controls for the bounded-memory gSCAN lexical-admission diagnostic."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from zeta.gscan_lexical_preflight import inspect_gscan_lexical_preflight
from zeta.gscan_lexical_preflight_oracle import inspect_gscan_lexical_preflight_oracle

SEED_ENTRIES: list[dict[str, object]] = [
    {
        "id": "big",
        "exponent": "big",
        "category": "descriptor",
        "allolexes": [],
        "valencyFrames": [],
    },
    {
        "id": "small",
        "exponent": "small",
        "category": "descriptor",
        "allolexes": [],
        "valencyFrames": [],
    },
    {
        "id": "walk",
        "exponent": "walk",
        "category": "action",
        "allolexes": [],
        "valencyFrames": [],
    },
    {
        "id": "spinning",
        "exponent": "while spinning",
        "category": "adverb",
        "allolexes": [],
        "valencyFrames": [],
    },
]

SEED: dict[str, object] = {
    "version": "fixture-v1",
    "entries": SEED_ENTRIES,
}


def _write_json(path: Path, value: object) -> str:
    path.write_text(json.dumps(value), encoding="utf-8")
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _dataset(commands: list[str]) -> dict[str, object]:
    return {
        "examples": {"situational_1": [{"command": command} for command in commands]}
    }


def _inspect(
    tmp_path: Path, commands: list[str], seed: object = SEED
) -> dict[str, object]:
    tmp_path.mkdir(parents=True, exist_ok=True)
    dataset_path = tmp_path / "dataset.json"
    seed_path = tmp_path / "seed.json"
    expected_hash = _write_json(dataset_path, _dataset(commands))
    _write_json(seed_path, seed)
    return inspect_gscan_lexical_preflight(
        str(dataset_path), str(seed_path), "situational_1", expected_hash
    )


def test_retains_every_unresolved_form_and_refuses_lexical_admission(
    tmp_path: Path,
) -> None:
    receipt = _inspect(tmp_path, ["walk,big,blue", "small,while spinning"])
    assert receipt["status"] == "preflight-unresolved"
    assert receipt["example_count"] == 2
    assert receipt["command_form_count"] == 5
    assert receipt["resolved_form_count"] == 4
    assert receipt["unresolved_form_count"] == 1
    assert receipt["unresolved_forms"] == ["blue"]
    assert receipt["resolved_seed_ids"] == ["big", "small", "spinning", "walk"]


def test_independent_event_stream_oracle_matches_object_stream_receipt(
    tmp_path: Path,
) -> None:
    dataset_path = tmp_path / "dataset.json"
    seed_path = tmp_path / "seed.json"
    expected_hash = _write_json(
        dataset_path, _dataset(["walk,big,blue", "small,while spinning"])
    )
    _write_json(seed_path, SEED)
    production = inspect_gscan_lexical_preflight(
        str(dataset_path), str(seed_path), "situational_1", expected_hash
    )
    oracle = inspect_gscan_lexical_preflight_oracle(
        str(dataset_path), str(seed_path), "situational_1", expected_hash
    )
    assert {key: value for key, value in production.items() if key != "algorithm"} == {
        key: value for key, value in oracle.items() if key != "algorithm"
    }


def test_independent_oracle_retains_the_seed_removal_mutation(tmp_path: Path) -> None:
    dataset_path = tmp_path / "dataset.json"
    seed_path = tmp_path / "seed.json"
    expected_hash = _write_json(dataset_path, _dataset(["walk,big"]))
    _write_json(
        seed_path,
        {
            **SEED,
            "entries": [entry for entry in SEED_ENTRIES if entry["id"] != "walk"],
        },
    )
    oracle = inspect_gscan_lexical_preflight_oracle(
        str(dataset_path), str(seed_path), "situational_1", expected_hash
    )
    assert oracle["status"] == "preflight-unresolved"
    assert oracle["unresolved_forms"] == ["walk"]


def test_covered_status_is_only_a_lexical_preflight(tmp_path: Path) -> None:
    receipt = _inspect(tmp_path, ["walk,big", "small,while spinning"])
    assert receipt["status"] == "preflight-lexically-covered"
    assert receipt["unresolved_form_count"] == 0
    assert receipt["unresolved_forms"] == []


def test_input_reordering_keeps_aggregate_counts_and_canonical_forms(
    tmp_path: Path,
) -> None:
    left = _inspect(tmp_path / "left", ["walk,big,blue", "small,while spinning"])
    right = _inspect(tmp_path / "right", ["small,while spinning", "walk,big,blue"])
    assert left["dataset_sha256"] != right["dataset_sha256"]
    for key in (
        "example_count",
        "command_form_count",
        "resolved_form_count",
        "unresolved_form_count",
        "resolved_seed_ids",
        "unresolved_forms",
    ):
        assert left[key] == right[key]


def test_seed_entry_removal_changes_the_admission_receipt(tmp_path: Path) -> None:
    baseline = _inspect(tmp_path / "baseline", ["walk,big"])
    removed = _inspect(
        tmp_path / "removed",
        ["walk,big"],
        {
            **SEED,
            "entries": [entry for entry in SEED_ENTRIES if entry["id"] != "walk"],
        },
    )
    assert baseline["status"] == "preflight-lexically-covered"
    assert removed["status"] == "preflight-unresolved"
    assert removed["unresolved_forms"] == ["walk"]


def test_hash_mismatch_and_malformed_inputs_refuse_partial_counts(
    tmp_path: Path,
) -> None:
    dataset_path = tmp_path / "dataset.json"
    seed_path = tmp_path / "seed.json"
    _write_json(dataset_path, _dataset(["walk,big"]))
    _write_json(seed_path, SEED)
    mismatch = inspect_gscan_lexical_preflight(
        str(dataset_path), str(seed_path), "situational_1", "0" * 64
    )
    assert mismatch["status"] == "dataset-hash-mismatch"
    assert "example_count" not in mismatch

    malformed_seed = _inspect(
        tmp_path / "bad-seed",
        ["walk,big"],
        {"version": "bad", "entries": [{"id": "walk"}]},
    )
    assert malformed_seed["status"] == "malformed-seed"
    assert "example_count" not in malformed_seed

    missing_split_path = tmp_path / "missing-split.json"
    missing_split_hash = _write_json(
        missing_split_path, {"examples": {"train": [{"command": "walk,big"}]}}
    )
    missing_split = inspect_gscan_lexical_preflight(
        str(missing_split_path), str(seed_path), "situational_1", missing_split_hash
    )
    assert missing_split["status"] == "malformed-dataset"
    assert "example_count" not in missing_split
