"""Falsifiers for the ARC scene observe/choose/outcome controller."""

from __future__ import annotations

from pathlib import Path

from arcengine import GameAction

from zeta_arc.layered import CLICK, LayeredAgent
from zeta_arc.scene_feedback import SceneCoordinatePolicy, SceneFeedbackController
from zeta_arc.scene_feedback_benchmark import benchmark_json, benchmark_payload


def _objects() -> list[list[int]]:
    grid = [[0] * 8 for _ in range(8)]
    for x, y in ((1, 1), (1, 2), (2, 2)):
        grid[y][x] = 3
    for x, y in ((5, 1), (6, 1), (7, 1)):
        grid[y][x] = 8
    return grid


class _Frame:
    def __init__(self, grid: list[list[int]], completed: int = 0) -> None:
        self.frame = [grid]
        self.available_actions = [6]
        self.levels_completed = completed


def test_pending_decision_cannot_be_overwritten_before_feedback() -> None:
    controller = SceneFeedbackController("game")
    first = controller.decide(_objects())
    second = controller.decide(_objects())

    assert first.decision is not None
    assert first.feedback is None
    assert second.decision is None
    assert second.feedback == "outcome-pending"


def test_outcome_integrates_both_colour_and_shape_evidence() -> None:
    controller = SceneFeedbackController("game")
    decision = controller.decide(_objects()).decision
    assert decision is not None

    receipt = controller.observe(_objects())

    assert receipt.feedback is None
    assert receipt.outcome is not None
    assert receipt.outcome.decision == decision
    assert receipt.outcome.world_changed is False
    candidate = next(
        item
        for item in decision.forecast.candidates
        if (item.x, item.y) == decision.selected
    )
    colour = candidate.colours[0]
    shape = candidate.shape_fingerprints[0]
    model = receipt.outcome.resulting_model
    assert (
        model.lookup_colour(
            "game", decision.forecast.observation.palette_fingerprint, colour
        ).mean
        < 0.5
    )
    assert model.lookup_shape("game", shape).mean < 0.5


def test_terminal_frame_credits_scene_policy_through_layer_port() -> None:
    policy = SceneCoordinatePolicy("game")
    agent = LayeredAgent(click=policy)
    action, data = agent.act(_Frame(_objects()))

    assert action is GameAction.ACTION6
    assert set(data) == {"x", "y"}

    agent.observe(_Frame([[0] * 8 for _ in range(8)], completed=1))

    assert policy.last_outcome is not None
    assert policy.last_outcome.world_changed is True
    assert policy.controller.model.evidence
    assert agent.beliefs[CLICK].mu > 0.0


def test_observing_without_a_pending_action_is_total_and_cold() -> None:
    controller = SceneFeedbackController("game")
    result = controller.observe(_objects())

    assert result.outcome is None
    assert result.feedback == "no-pending-decision"
    assert controller.model.evidence == ()


def test_feedback_benchmark_reports_stability_and_switch_costs() -> None:
    payload = benchmark_payload()
    cohorts = payload["cohorts"]
    assert isinstance(cohorts, dict)

    stable_color = cohorts["stableColor"]
    stable_shape = cohorts["stableShapeAcrossPalettes"]
    switched_color = cohorts["switchedColor"]
    switched_shape = cohorts["switchedShape"]

    assert (
        stable_color["sceneFeedback"]["totalActions"]
        < stable_color["control"]["totalActions"]
    )
    assert (
        stable_shape["sceneFeedback"]["totalActions"]
        < stable_shape["control"]["totalActions"]
    )
    assert switched_color["sceneFeedback"]["actionsPerEpisode"][3] > 1
    assert switched_shape["sceneFeedback"]["actionsPerEpisode"][3] > 1


def test_feedback_benchmark_artifact_is_byte_locked() -> None:
    artifact = (
        Path(__file__).resolve().parent / "data" / "scene-feedback-benchmark.json"
    )
    assert artifact.read_text(encoding="utf-8") == benchmark_json()
