"""Independent fault controls for the bounded contextual-grid oracle."""

import json
from pathlib import Path

import pytest

from zeta import contextual_grid_oracle as oracle


def _repo_root() -> Path:
    current = Path(__file__).resolve()
    for parent in [current] + list(current.parents):
        if (parent / "Zeta.sln").exists():
            return parent
    raise RuntimeError("could not find repository root")


def test_repository_carriers_match_the_frozen_fingerprints() -> None:
    oracle.verify_repository_carriers(_repo_root())


def test_splitmix64_seed_zero_matches_the_declared_stream_vectors() -> None:
    vectors_path = (
        _repo_root()
        / "docs/research/data/2026-09-05-contextual-grid-v1-splitmix64-vectors.json"
    )
    vectors = json.loads(vectors_path.read_text(encoding="utf-8"))
    state = 0
    for vector in vectors["stream"]:
        word, next_state = oracle.next_stream(state)
        assert word == int(vector["output"])
        assert next_state == int(vector["state"])
        state = next_state


def test_unknown_fingerprint_refuses_before_run() -> None:
    with pytest.raises(ValueError, match="UnknownFingerprint"):
        oracle.run(
            "not-the-frozen-environment",
            oracle.EVALUATOR_CATALOGUE_FINGERPRINT,
            "count-first/v1",
            0,
            1,
            1,
        )


def test_reordered_catalogue_fingerprint_refuses_before_run() -> None:
    with pytest.raises(ValueError, match="CatalogueFingerprintMismatch"):
        oracle.run(
            oracle.ENVIRONMENT_FINGERPRINT,
            "not-the-frozen-catalogue",
            "count-first/v1",
            0,
            1,
            1,
        )


@pytest.mark.parametrize(
    "policy", ["uniform-random/v1", "q-epsilon/v1", "q-ucb/v1", "count-first/v1"]
)
def test_evaluation_freezes_q_and_emits_a_replayable_trace(policy: str) -> None:
    receipt = oracle.run(
        oracle.ENVIRONMENT_FINGERPRINT,
        oracle.EVALUATOR_CATALOGUE_FINGERPRINT,
        policy,
        42,
        12,
        20,
    )
    assert receipt["qDigestBeforeEvaluation"] == receipt["qDigestAfterEvaluation"]
    assert receipt["trainingTraceDigest"] != receipt["evaluationTraceDigest"]
    stream_draws = receipt["streamDraws"]
    assert isinstance(stream_draws, int)
    assert stream_draws > 0


def test_count_novelty_is_not_constant_after_revisiting_state_actions() -> None:
    receipt = oracle.run(
        oracle.ENVIRONMENT_FINGERPRINT,
        oracle.EVALUATOR_CATALOGUE_FINGERPRINT,
        "count-first/v1",
        5,
        8,
        20,
    )
    unique_state_actions = receipt["trainingUniqueStateActions"]
    novelty = receipt["meanPreIncrementNovelty"]
    assert isinstance(unique_state_actions, int)
    assert isinstance(novelty, float)
    assert unique_state_actions > 1
    assert novelty < 1.0


def test_one_seed_full_budget_preflight_receipt_replays_through_python_oracle() -> None:
    preflight_path = (
        _repo_root()
        / "docs/research/data/2026-09-05-contextual-grid-v1-one-seed-preflight.json"
    )
    preflight = json.loads(preflight_path.read_text(encoding="utf-8"))
    assert preflight["status"] == "compatible-conformance-only"
    config = preflight["configuration"]
    for expected in preflight["runs"]:
        actual = oracle.run(
            oracle.ENVIRONMENT_FINGERPRINT,
            oracle.EVALUATOR_CATALOGUE_FINGERPRINT,
            expected["policy"],
            int(config["seed"]),
            int(config["episodes"]),
            int(config["actionCap"]),
        )
        for key in (
            "heldOutReturnPpm",
            "trainingUniqueStates",
            "trainingUniqueStateActions",
            "trainingTraceDigest",
            "evaluationTraceDigest",
            "qDigestBeforeEvaluation",
            "streamDraws",
        ):
            assert actual[key] == expected[key]
