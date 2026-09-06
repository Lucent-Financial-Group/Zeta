"""Falsifiers for grid-only ARC scene regimes and coordinate priors."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from zeta_arc.scene_prior_benchmark import (
    benchmark_json,
    benchmark_payload,
    motion_transfer_json,
    motion_transfer_payload,
)
from zeta_arc.scene_priors import (
    DEFAULT_CURIOSITY,
    CandidateSignals,
    CandidateSource,
    CuriosityComposition,
    CuriosityFeedback,
    CuriositySignal,
    CuriosityTerm,
    MotionProjection,
    SceneObservation,
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


def _frame_from_vector(value: dict[str, Any]) -> list[list[int]]:
    width = int(value["width"])
    height = int(value["height"])
    cells = [int(cell) for cell in value["cells"]]
    return [
        cells[offset : offset + width] for offset in range(0, width * height, width)
    ]


def _shape_projection(observation: SceneObservation) -> list[dict[str, object]]:
    objects = observation.objects
    projected = [
        {
            "width": item.width,
            "height": item.height,
            "area": item.area,
            "perimeter": item.perimeter,
            "cells": [list(cell) for cell in item.shape],
        }
        for item in objects
    ]
    return sorted(
        projected,
        key=lambda item: (
            item["width"],
            item["height"],
            item["area"],
            item["perimeter"],
            item["cells"],
        ),
    )


def _placement_projection(observation: SceneObservation) -> list[tuple[int, int]]:
    objects = observation.objects
    return sorted((item.min_x, item.min_y) for item in objects)


def test_python_scene_priors_replay_the_shared_frame_signal_treaty() -> None:
    path = (
        Path(__file__).resolve().parents[3]
        / "src"
        / "Core"
        / "golden-vectors-frame-signals.json"
    )
    treaty = json.loads(path.read_text(encoding="utf-8"))
    assert treaty["schemaVersion"] == 1
    scale = int(treaty["basisPointScale"])
    frames: dict[str, list[list[int]]] = {}
    observations: dict[str, SceneObservation] = {}

    for case in treaty["observations"]:
        input_frame = _frame_from_vector(case["frame"])
        expected = case["expected"]
        observed = observe_scene(input_frame)
        frames[case["name"]] = input_frame
        observations[case["name"]] = observed
        assert observed.background == expected["background"]
        assert [colour.colour for colour in observed.colours] == expected[
            "foregroundPalette"
        ]
        assert [
            {
                "colour": colour.colour,
                "pixels": colour.pixels,
                "occupancyBasisPoints": round(colour.occupancy * scale),
                "componentCount": colour.component_count,
                "edgeDensityBasisPoints": round(colour.edge_density * scale),
            }
            for colour in observed.colours
        ] == expected["colours"]
        assert _shape_projection(observed) == expected["shapes"]
        assert [list(origin) for origin in _placement_projection(observed)] == expected[
            "origins"
        ]

    for case in treaty["comparisons"]:
        previous_name = case["previous"]
        current_name = case["current"]
        previous_grid = frames[previous_name]
        current_grid = frames[current_name]
        previous = observations[previous_name]
        current = observations[current_name]
        expected = case["expected"]
        delta = compare_scenes(previous_grid, current_grid)
        previous_background = previous.background
        current_background = current.background
        background_crossings = sum(
            (before != previous_background) != (after != current_background)
            for before_row, after_row in zip(previous_grid, current_grid, strict=True)
            for before, after in zip(before_row, after_row, strict=True)
            if before != after
        )
        previous_colours = previous.colours
        current_colours = current.colours
        previous_occupancy = [(item.colour, item.pixels) for item in previous_colours]
        current_occupancy = [(item.colour, item.pixels) for item in current_colours]
        previous_edges = [
            (item.colour, round(item.edge_density * scale)) for item in previous_colours
        ]
        current_edges = [
            (item.colour, round(item.edge_density * scale)) for item in current_colours
        ]
        actual_projection = {
            "changedCells": delta.changed_pixels,
            "changeDensityBasisPoints": round(delta.change_density * scale),
            "recolouredForegroundCells": delta.colour_change_pixels,
            "recolourDensityBasisPoints": round(delta.colour_change_density * scale),
            "backgroundCrossings": background_crossings,
            "backgroundChanged": previous_background != current_background,
            "structureChanged": previous.structural_fingerprint
            != current.structural_fingerprint,
            "paletteChanged": previous.palette_fingerprint
            != current.palette_fingerprint,
            "colourOccupancyChanged": previous_occupancy != current_occupancy,
            "colourEdgeDensityChanged": previous_edges != current_edges,
            "placementChanged": _placement_projection(previous)
            != _placement_projection(current),
        }
        assert actual_projection == expected


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


def test_one_step_projection_relocates_a_moving_candidate() -> None:
    previous = _grid((9, 1, 2, 1, 1))
    current = _grid((9, 2, 2, 1, 1))

    observed = forecast_scene(ScenePriorModel(), "game", current, previous)
    explicit_observed = forecast_scene(
        ScenePriorModel(),
        "game",
        current,
        previous,
        motion_projection=MotionProjection.OBSERVED_ONLY,
    )
    projected = forecast_scene(
        ScenePriorModel(),
        "game",
        current,
        previous,
        motion_projection=MotionProjection.ONE_STEP_AHEAD,
    )

    assert observed == explicit_observed
    assert observed.selected == (2, 2)
    assert projected.selected == (3, 2)
    location = projected.candidates[0].locations[0]
    assert location.source is CandidateSource.PREDICTED
    assert location.observed == (2.0, 2.0)
    assert location.projected == (3.0, 2.0)
    assert location.velocity == (1.0, 0.0)
    assert location.action == (3, 2)


def test_one_step_projection_stays_inside_the_rendered_frame() -> None:
    previous = _grid((9, 6, 2, 1, 1))
    current = _grid((9, 7, 2, 1, 1))

    forecast = forecast_scene(
        ScenePriorModel(),
        "game",
        current,
        previous,
        motion_projection=MotionProjection.ONE_STEP_AHEAD,
    )

    assert forecast.selected == (7, 2)
    location = forecast.candidates[0].locations[0]
    assert location.projected == (8.0, 2.0)
    assert location.action == (7, 2)


def test_one_step_projection_keeps_static_candidates_observed() -> None:
    grid = _grid((9, 4, 3, 1, 1))

    forecast = forecast_scene(
        ScenePriorModel(),
        "game",
        grid,
        grid,
        motion_projection=MotionProjection.ONE_STEP_AHEAD,
    )

    assert forecast.selected == (4, 3)
    location = forecast.candidates[0].locations[0]
    assert location.source is CandidateSource.OBSERVED
    assert location.projected is None
    assert location.velocity is None


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


def test_default_curiosity_preserves_the_original_score_and_names_every_term() -> None:
    previous = _grid((1, 1, 1, 2, 2), (9, 5, 5, 1, 1))
    current = _grid((1, 1, 1, 2, 2), (9, 4, 5, 1, 1))

    forecast = forecast_scene(ScenePriorModel(), "new-game", current, previous)

    assert forecast.feedback is None
    for candidate in forecast.candidates:
        signals = candidate.signals
        expected = (
            1.0
            + signals.rarity
            + signals.edge_density
            + signals.change_density
            + signals.motion
        ) * (signals.learned_colour_change_rate + signals.learned_shape_change_rate)
        assert candidate.score == pytest.approx(expected)
        assert len(candidate.curiosity) == 1
        evaluation = candidate.curiosity[0]
        assert evaluation.score == pytest.approx(expected)
        assert [item.signal.value for item in evaluation.structural] == [
            "rarity",
            "edge-density",
            "change-density",
            "motion",
        ]
        assert [item.signal.value for item in evaluation.learned] == [
            "colour-meaning",
            "shape-meaning",
        ]
        assert all(item.weight == 1.0 for item in evaluation.structural)
        assert all(item.weight == 1.0 for item in evaluation.learned)


def test_curiosity_channels_can_be_ablated_without_editing_the_forecaster() -> None:
    previous = _grid((7, 1, 1, 1, 1), (7, 5, 5, 1, 1))
    current = _grid((7, 1, 1, 1, 1), (7, 4, 5, 1, 1))
    learned = DEFAULT_CURIOSITY.learned
    no_temporal = CuriosityComposition(
        structural=(
            CuriosityTerm(CuriositySignal.RARITY),
            CuriosityTerm(CuriositySignal.EDGE_DENSITY),
        ),
        learned=learned,
    )
    no_edge = CuriosityComposition(
        structural=(
            CuriosityTerm(CuriositySignal.RARITY),
            CuriosityTerm(CuriositySignal.CHANGE_DENSITY),
            CuriosityTerm(CuriositySignal.MOTION),
        ),
        learned=learned,
    )
    motion_weighted = CuriosityComposition(
        structural=tuple(
            CuriosityTerm(
                term.signal,
                4.0 if term.signal is CuriositySignal.MOTION else term.weight,
            )
            for term in DEFAULT_CURIOSITY.structural
        ),
        learned=learned,
    )

    default = forecast_scene(ScenePriorModel(), "new-game", current, previous)
    without_temporal = forecast_scene(
        ScenePriorModel(), "new-game", current, previous, no_temporal
    )
    without_edge = forecast_scene(
        ScenePriorModel(), "new-game", current, previous, no_edge
    )
    with_motion_weight = forecast_scene(
        ScenePriorModel(), "new-game", current, previous, motion_weighted
    )

    assert default.selected == (4, 5)
    assert without_temporal.selected == (1, 1)
    assert without_edge.selected == default.selected
    default_moving = next(
        item for item in default.candidates if (item.x, item.y) == (4, 5)
    )
    weighted_moving = next(
        item for item in with_motion_weight.candidates if (item.x, item.y) == (4, 5)
    )
    assert weighted_moving.probability > default_moving.probability


@pytest.mark.parametrize(
    ("composition", "feedback"),
    [
        (
            CuriosityComposition((), DEFAULT_CURIOSITY.learned),
            CuriosityFeedback.NO_STRUCTURAL_TERMS,
        ),
        (
            CuriosityComposition(DEFAULT_CURIOSITY.structural, ()),
            CuriosityFeedback.NO_LEARNED_TERMS,
        ),
        (
            CuriosityComposition(
                (CuriosityTerm(CuriositySignal.COLOUR_MEANING),),
                DEFAULT_CURIOSITY.learned,
            ),
            CuriosityFeedback.MISPLACED_TERM,
        ),
        (
            CuriosityComposition(
                (
                    CuriosityTerm(CuriositySignal.RARITY),
                    CuriosityTerm(CuriositySignal.RARITY),
                ),
                DEFAULT_CURIOSITY.learned,
            ),
            CuriosityFeedback.DUPLICATE_TERM,
        ),
        (
            CuriosityComposition(
                (CuriosityTerm(CuriositySignal.RARITY, float("nan")),),
                DEFAULT_CURIOSITY.learned,
            ),
            CuriosityFeedback.INVALID_WEIGHT,
        ),
        (
            CuriosityComposition(
                (CuriosityTerm(CuriositySignal.RARITY, 0.0),),
                DEFAULT_CURIOSITY.learned,
            ),
            CuriosityFeedback.INVALID_WEIGHT,
        ),
    ],
)
def test_invalid_curiosity_compositions_return_typed_feedback(
    composition: CuriosityComposition, feedback: CuriosityFeedback
) -> None:
    forecast = forecast_scene(
        ScenePriorModel(),
        "game",
        _grid((3, 1, 1, 1, 1)),
        curiosity=composition,
    )

    assert forecast.feedback is feedback
    assert forecast.candidates == ()
    assert forecast.selected is None


def test_invalid_composition_is_not_hidden_by_an_empty_frame() -> None:
    composition = CuriosityComposition((), DEFAULT_CURIOSITY.learned)

    forecast = forecast_scene(ScenePriorModel(), "game", [], curiosity=composition)

    assert forecast.feedback is CuriosityFeedback.NO_STRUCTURAL_TERMS
    assert forecast.candidates == ()
    assert forecast.selected is None


def test_out_of_range_signal_returns_feedback_instead_of_inventing_mass() -> None:
    evaluation = DEFAULT_CURIOSITY.evaluate(
        CandidateSignals(1.1, 0.5, 0.5, 0.5, 0.5, 0.5)
    )

    assert evaluation.feedback is CuriosityFeedback.SIGNAL_OUT_OF_RANGE
    assert evaluation.score is None


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


def test_chip8_selected_motion_policy_transfers_with_explicit_failures() -> None:
    artifact = Path(__file__).with_name("data") / "motion-transfer-benchmark.json"
    expected: dict[str, Any] = json.loads(artifact.read_text(encoding="utf-8"))
    source_training: dict[str, object] = expected["sourceTraining"]
    selected_policy = MotionProjection(source_training["selectedPolicy"])
    actual = motion_transfer_payload(source_training, selected_policy)

    assert actual["targetEvaluation"] == {
        "constantVelocity": {
            "caseCount": 32,
            "observedCorrect": 0,
            "observedTop1Accuracy": 0.0,
            "transferredCorrect": 32,
            "transferredTop1Accuracy": 1.0,
        },
        "directionChange": {
            "caseCount": 8,
            "observedCorrect": 0,
            "observedTop1Accuracy": 0.0,
            "transferredCorrect": 0,
            "transferredTop1Accuracy": 0.0,
        },
        "persistentMotion": {
            "caseCount": 40,
            "observedCorrect": 0,
            "observedTop1Accuracy": 0.0,
            "transferredCorrect": 32,
            "transferredTop1Accuracy": 0.8,
        },
        "switchedMover": {
            "caseCount": 8,
            "observedCorrect": 0,
            "observedTop1Accuracy": 0.0,
            "transferredCorrect": 0,
            "transferredTop1Accuracy": 0.0,
        },
    }
    assert artifact.read_text(encoding="utf-8") == motion_transfer_json(
        source_training, selected_policy
    )
