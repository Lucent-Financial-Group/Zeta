"""Golden and semantic checks for the public ARC replay artifact."""

from __future__ import annotations

import json
from pathlib import Path

from zeta_arc.recording import RECORDED_ACTIONS, record_default_session


def _artifact_path() -> Path:
    root = Path(__file__).resolve().parents[3]
    return (
        root
        / "src"
        / "apps"
        / "twitch-ai"
        / "src"
        / "recordings"
        / "arc-ztch-v1-session.json"
    )


def test_committed_replay_is_the_generated_session_byte_for_byte() -> None:
    generated = record_default_session().to_json()

    assert _artifact_path().read_text(encoding="utf-8") == generated


def test_replay_is_a_complete_real_level_transition() -> None:
    payload = json.loads(record_default_session().to_json())
    steps = payload["steps"]

    assert len(steps) == len(RECORDED_ACTIONS) + 1
    assert [step["tick"] for step in steps] == list(range(len(steps)))
    assert steps[0]["observation"]["action"] == {"id": "RESET"}
    assert steps[-1]["observation"]["levelsCompleted"] == 1
    assert all(len(step["observation"]["framesHex"][0]) == 64 * 64 for step in steps)
