"""Falsifiers for grid-only ARC scene regimes and coordinate priors."""

from __future__ import annotations

from pathlib import Path

import pytest

from zeta_arc.scene_prior_benchmark import benchmark_json, benchmark_payload
from zeta_arc.scene_priors import (
    ScenePriorModel,
    compare_scenes,
    forecast_scene,
    observe_forecast_outcome,
    observe_scene,
)


def _grid(*objects: tuple[int, int, int, int, int]) -> list[list[int]]:
    """Build an 8x8 grid from (colour, x, y, width, height) rectangles."""
    grid = [[0] * 8 for _ in range(8)]
    for colour, x, y, width, height in objects:
        for py in range(y, y + height):
            for px in range(x, x + width):
                grid[py][px] = colour
    return grid


def _kinds(before: list[list[int]], after: list[list[int]]) -> set[str]:
    return {event.kind for event in compare_scenes(before, after).events}


def test_structural_identity_survives_translation_and_palette_relabeling() -> None:
    first = observe_scene(_grid((2, 1, 1, 2, 2), (7, 5, 5, 1, 2)))
    translated = observe_scene(_grid((2, 2, 3, 2, 2), (7, 4, 1, 1, 2)))
    recoloured = observe_scene(_grid((9, 1, 1, 2, 2), (4, 5, 5, 1, 2)))

    assert first.structural_fingerprint == translated.structural_fingerprint
    assert first.structural_fingerprint == recoloured.structural_fingerprint
    assert first.palette_fingerprint == translated.palette_fingerprint
    assert first.palette_fingerprint != recoloured.palette_fingerprint
    assert first.place_fingerprint != translated.place_fingerprint


def test_palette_regime_survives_shape_and_occupancy_changes() -> None:
    before = observe_scene(_grid((3, 1, 1, 2, 2), (8, 6, 6, 1, 1)))
    after = observe_scene(_grid((3, 1, 1, 3, 1), (8, 5, 5, 2, 2)))

    assert before.palette_fingerprint == after.palette_fingerprint
    assert before.structural_fingerprint != after.structural_fingerprint


def test_background_recolouring_is_explicit() -> None:
    before = _grid((3, 1, 1, 1, 1))
    after = [[6 if value == 0 else value for value in row] for row in before]

    assert "background-recoloured" in _kinds(before, after)


def test_translation_is_not_misreported_as_shape_change() -> None:
    before = _grid((3, 1, 1, 2, 2))
    after = _grid((3, 3, 2, 2, 2))
    delta = compare_scenes(before, after)

    assert "translated" in {event.kind for event in delta.events}
    assert "shape-changed" not in {event.kind for event in delta.events}
    assert delta.motions[0].velocity == (2.0, 1.0)
    assert delta.motions[0].predicted == (5.5, 3.5)


def test_recolouring_is_distinct_from_translation_and_shape_change() -> None:
    before = _grid((3, 2, 2, 2, 2))
    after = _grid((8, 2, 2, 2, 2))
    kinds = _kinds(before, after)

    assert "recoloured" in kinds
    assert "translated" not in kinds
    assert "shape-changed" not in kinds


def test_shape_change_is_visible_even_when_area_and_centroid_are_stable() -> None:
    before = _grid((3, 2, 3, 3, 1))
    after = _grid((3, 3, 2, 1, 3))

    assert "shape-changed" in _kinds(before, after)


def test_split_merge_appearance_and_disappearance_are_separate_signals() -> None:
    one = _grid((3, 1, 1, 5, 1), (7, 6, 6, 1, 1))
    split = _grid((3, 1, 1, 2, 1), (3, 4, 1, 2, 1), (9, 6, 6, 1, 1))

    forward = _kinds(one, split)
    backward = _kinds(split, one)
    assert "component-split" in forward
    assert "component-merged" in backward
    assert "colour-appeared" in forward
    assert "colour-disappeared" in forward


def test_forecast_is_deterministic_unique_finite_and_normalized() -> None:
    previous = _grid((2, 1, 1, 1, 1), (8, 5, 5, 2, 2))
    current = _grid((2, 1, 1, 1, 1), (8, 4, 5, 2, 2))
    model = ScenePriorModel()

    first = forecast_scene(model, "unseen-game", current, previous)
    second = forecast_scene(model, "unseen-game", current, previous)

    assert first == second
    assert sum(
        candidate.probability for candidate in first.candidates
    ) == pytest.approx(1.0)
    assert len({(candidate.x, candidate.y) for candidate in first.candidates}) == len(
        first.candidates
    )
    assert all(
        candidate.score > 0.0 and candidate.probability > 0.0
        for candidate in first.candidates
    )
    assert all(
        value == pytest.approx(value)
        for candidate in first.candidates
        for value in (candidate.score, candidate.probability)
    )


def test_recently_active_object_outranks_static_low_colour_distractor() -> None:
    previous = _grid((1, 1, 1, 2, 2), (9, 5, 5, 1, 1))
    current = _grid((1, 1, 1, 2, 2), (9, 4, 5, 1, 1))

    forecast = forecast_scene(ScenePriorModel(), "new-game", current, previous)

    assert forecast.selected == (4, 5)
    moving = next(
        candidate for candidate in forecast.candidates if candidate.colours == (9,)
    )
    static = next(
        candidate for candidate in forecast.candidates if candidate.colours == (1,)
    )
    assert moving.probability > static.probability


def test_motion_evidence_does_not_leak_to_same_colour_static_object() -> None:
    previous = _grid((7, 1, 1, 1, 1), (7, 5, 5, 1, 1))
    current = _grid((7, 1, 1, 1, 1), (7, 4, 5, 1, 1))

    forecast = forecast_scene(ScenePriorModel(), "new-game", current, previous)

    assert forecast.selected == (4, 5)
    moving = next(
        candidate
        for candidate in forecast.candidates
        if (candidate.x, candidate.y) == (4, 5)
    )
    static = next(
        candidate
        for candidate in forecast.candidates
        if (candidate.x, candidate.y) == (1, 1)
    )
    assert moving.signals.motion > 0.0
    assert static.signals.motion == 0.0
    assert moving.probability > static.probability


def test_palette_relabeling_preserves_untrained_structural_probabilities() -> None:
    original = _grid((2, 1, 1, 2, 2), (7, 6, 5, 1, 2))
    relabelled = _grid((11, 1, 1, 2, 2), (4, 6, 5, 1, 2))

    first = forecast_scene(ScenePriorModel(), "new-a", original)
    second = forecast_scene(ScenePriorModel(), "new-b", relabelled)

    assert [
        (item.x, item.y, item.probability) for item in first.candidates
    ] == pytest.approx(
        [(item.x, item.y, item.probability) for item in second.candidates]
    )


def test_colour_and_shape_evidence_have_distinct_scopes_and_are_immutable() -> None:
    grid = _grid((3, 1, 1, 1, 1), (8, 6, 6, 1, 1))
    empty = ScenePriorModel()
    initial = forecast_scene(empty, "game-a", grid)
    point_three = next(
        (candidate.x, candidate.y)
        for candidate in initial.candidates
        if candidate.colours == (3,)
    )
    learned = empty
    for _ in range(4):
        learned = observe_forecast_outcome(
            learned, "game-a", initial, point_three, True
        )

    same_game = forecast_scene(learned, "game-a", grid)
    other_game = forecast_scene(learned, "game-b", grid)
    changed_palette = forecast_scene(
        learned, "game-a", _grid((4, 1, 1, 1, 1), (8, 6, 6, 1, 1))
    )

    assert empty.evidence == ()
    same = next(c for c in same_game.candidates if c.colours == (3,)).signals
    recoloured = next(
        c for c in changed_palette.candidates if c.colours == (4,)
    ).signals

    assert same.learned_colour_change_rate > 0.5
    assert same.learned_shape_change_rate > 0.5
    assert all(
        c.signals.learned_colour_change_rate == 0.5
        and c.signals.learned_shape_change_rate == 0.5
        for c in other_game.candidates
    )
    assert recoloured.learned_colour_change_rate == 0.5
    assert recoloured.learned_shape_change_rate > 0.5


def test_unknown_coordinate_does_not_spend_or_invent_evidence() -> None:
    model = ScenePriorModel()
    forecast = forecast_scene(model, "game", _grid((3, 1, 1, 1, 1)))

    assert observe_forecast_outcome(model, "game", forecast, (7, 7), True) is model


def test_empty_frame_is_a_cold_total_forecast() -> None:
    forecast = forecast_scene(ScenePriorModel(), "game", [])

    assert forecast.selected is None
    assert forecast.candidates == ()


def test_next_mover_benchmark_carries_its_counterexample() -> None:
    report = benchmark_payload()

    assert report["persistentMover"] == {
        "caseCount": 40,
        "controlCorrect": 20,
        "controlTop1Accuracy": 0.5,
        "protoCorrect": 40,
        "protoTop1Accuracy": 1.0,
    }
    assert report["switchedMover"] == {
        "caseCount": 8,
        "controlCorrect": 4,
        "controlTop1Accuracy": 0.5,
        "protoCorrect": 0,
        "protoTop1Accuracy": 0.0,
    }


def test_next_mover_benchmark_artifact_is_generated_byte_for_byte() -> None:
    artifact = Path(__file__).with_name("data") / "scene-prior-benchmark.json"

    assert artifact.read_text(encoding="utf-8") == benchmark_json()
