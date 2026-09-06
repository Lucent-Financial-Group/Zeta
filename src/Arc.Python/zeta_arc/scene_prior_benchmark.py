"""Controlled measurements for the ARC scene prior's narrow capability.

The task is next-mover localization: after observing frames t-1 and t, select
the object in frame t that will move between t and t+1. The positive cohort
uses an actual ZetaChase trajectory under palette relabelings and geometric
symmetries. The negative cohort switches which object moves next. It exists to
show the temporal-persistence prior's failure, not to make its average larger.

This is a source-owned synthetic benchmark, not an ARC leaderboard score and
not evidence of broad one-shot game competence.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from arcengine import GameAction

from zeta_arc.click import ClickPolicy
from zeta_arc.driver import advance, reset
from zeta_arc.environments.chase import ZetaChase
from zeta_arc.frames import grid_of
from zeta_arc.perception import Grid
from zeta_arc.scene_priors import (
    MotionProjection,
    ScenePriorModel,
    compare_scenes,
    forecast_scene,
)

TRANSFORMS = ("identity", "mirror-x", "mirror-y", "rotate-180")


def _transform(grid: Grid, transform: str) -> Grid:
    rows = [row[:] for row in grid]
    if transform in ("mirror-y", "rotate-180"):
        rows.reverse()
    if transform in ("mirror-x", "rotate-180"):
        rows = [list(reversed(row)) for row in rows]
    return rows


def _recolour(grid: Grid, palette: dict[int, int]) -> Grid:
    return [[palette.get(value, value) for value in row] for row in grid]


def _target_points(current: Grid, following: Grid) -> set[tuple[int, int]]:
    return {
        (round(motion.origin[0]), round(motion.origin[1]))
        for motion in compare_scenes(current, following).motions
    }


def _next_position_points(current: Grid, following: Grid) -> set[tuple[int, int]]:
    return {
        (round(motion.current[0]), round(motion.current[1]))
        for motion in compare_scenes(current, following).motions
    }


def _score_case(
    previous: Grid,
    current: Grid,
    following: Grid,
    case: str,
    transform: str,
    palette: str,
) -> dict[str, object]:
    targets = _target_points(current, following)
    control = ClickPolicy().forecast(current).selected
    proto = forecast_scene(
        ScenePriorModel(), f"unseen-{case}", current, previous
    ).selected
    return {
        "case": case,
        "controlCorrect": control in targets,
        "controlSelected": list(control),
        "palette": palette,
        "protoCorrect": proto in targets,
        "protoSelected": list(proto) if proto is not None else None,
        "targets": [list(point) for point in sorted(targets)],
        "transform": transform,
    }


def _score_motion_transfer_case(
    previous: Grid,
    current: Grid,
    following: Grid,
    case: str,
    transform: str,
    palette: str,
    selected_policy: MotionProjection,
) -> dict[str, object]:
    prior_motion = compare_scenes(previous, current).motions
    following_motion = compare_scenes(current, following).motions
    targets = _next_position_points(current, following)
    observed = forecast_scene(
        ScenePriorModel(),
        f"unseen-{case}",
        current,
        previous,
        motion_projection=MotionProjection.OBSERVED_ONLY,
    ).selected
    transferred = forecast_scene(
        ScenePriorModel(),
        f"unseen-{case}",
        current,
        previous,
        motion_projection=selected_policy,
    ).selected
    constant_velocity = (
        len(prior_motion) == 1
        and len(following_motion) == 1
        and prior_motion[0].colour == following_motion[0].colour
        and prior_motion[0].velocity == following_motion[0].velocity
    )
    return {
        "case": case,
        "constantVelocity": constant_velocity,
        "observedCorrect": observed in targets,
        "observedSelected": list(observed) if observed is not None else None,
        "palette": palette,
        "targets": [list(point) for point in sorted(targets)],
        "transferredCorrect": transferred in targets,
        "transferredSelected": (list(transferred) if transferred is not None else None),
        "transform": transform,
    }


def _chase_frames() -> list[Grid]:
    game = ZetaChase(seed=0)
    frame = reset(game)
    frames = [grid_of(frame)]
    actions = (
        GameAction.ACTION4,
        GameAction.ACTION4,
        GameAction.ACTION4,
        GameAction.ACTION2,
        GameAction.ACTION2,
        GameAction.ACTION2,
    )
    for action in actions:
        frames.append(grid_of(advance(game, action)))
    return frames


def _persistent_cases() -> list[dict[str, object]]:
    frames = _chase_frames()
    palettes = {
        "goal-first": {0: 0, 4: 4, 5: 5, 9: 9},
        "mover-first": {0: 0, 4: 9, 5: 5, 9: 4},
    }
    cases: list[dict[str, object]] = []
    for palette_name, palette in palettes.items():
        recoloured = [_recolour(frame, palette) for frame in frames]
        for transform in TRANSFORMS:
            transformed = [_transform(frame, transform) for frame in recoloured]
            for index in range(len(transformed) - 2):
                cases.append(
                    _score_case(
                        transformed[index],
                        transformed[index + 1],
                        transformed[index + 2],
                        "persistent-mover",
                        transform,
                        palette_name,
                    )
                )
    return cases


def _switch_cases() -> list[dict[str, object]]:
    palettes = {
        "first-mover-first": {3: 3, 8: 8},
        "next-mover-first": {3: 8, 8: 3},
    }
    previous = [[0] * 8 for _ in range(8)]
    previous[1][1] = 3
    previous[6][6] = 8
    current = [[0] * 8 for _ in range(8)]
    current[1][2] = 3
    current[6][6] = 8
    following = [[0] * 8 for _ in range(8)]
    following[1][2] = 3
    following[6][5] = 8

    cases: list[dict[str, object]] = []
    for palette_name, palette in palettes.items():
        recoloured = [
            _recolour(frame, palette) for frame in (previous, current, following)
        ]
        for transform in TRANSFORMS:
            transformed = [_transform(frame, transform) for frame in recoloured]
            cases.append(
                _score_case(
                    transformed[0],
                    transformed[1],
                    transformed[2],
                    "switched-mover",
                    transform,
                    palette_name,
                )
            )
    return cases


def _persistent_motion_transfer_cases(
    selected_policy: MotionProjection,
) -> list[dict[str, object]]:
    frames = _chase_frames()
    palettes = {
        "goal-first": {0: 0, 4: 4, 5: 5, 9: 9},
        "mover-first": {0: 0, 4: 9, 5: 5, 9: 4},
    }
    cases: list[dict[str, object]] = []
    for palette_name, palette in palettes.items():
        recoloured = [_recolour(frame, palette) for frame in frames]
        for transform in TRANSFORMS:
            transformed = [_transform(frame, transform) for frame in recoloured]
            for index in range(len(transformed) - 2):
                cases.append(
                    _score_motion_transfer_case(
                        transformed[index],
                        transformed[index + 1],
                        transformed[index + 2],
                        "persistent-mover",
                        transform,
                        palette_name,
                        selected_policy,
                    )
                )
    return cases


def _switched_motion_transfer_cases(
    selected_policy: MotionProjection,
) -> list[dict[str, object]]:
    palettes = {
        "first-mover-first": {3: 3, 8: 8},
        "next-mover-first": {3: 8, 8: 3},
    }
    previous = [[0] * 8 for _ in range(8)]
    previous[1][1] = 3
    previous[6][6] = 8
    current = [[0] * 8 for _ in range(8)]
    current[1][2] = 3
    current[6][6] = 8
    following = [[0] * 8 for _ in range(8)]
    following[1][2] = 3
    following[6][5] = 8

    cases: list[dict[str, object]] = []
    for palette_name, palette in palettes.items():
        recoloured = [
            _recolour(frame, palette) for frame in (previous, current, following)
        ]
        for transform in TRANSFORMS:
            transformed = [_transform(frame, transform) for frame in recoloured]
            cases.append(
                _score_motion_transfer_case(
                    transformed[0],
                    transformed[1],
                    transformed[2],
                    "switched-mover",
                    transform,
                    palette_name,
                    selected_policy,
                )
            )
    return cases


def _summary(cases: list[dict[str, object]]) -> dict[str, object]:
    count = len(cases)
    control = sum(case["controlCorrect"] is True for case in cases)
    proto = sum(case["protoCorrect"] is True for case in cases)
    return {
        "caseCount": count,
        "controlCorrect": control,
        "controlTop1Accuracy": control / count,
        "protoCorrect": proto,
        "protoTop1Accuracy": proto / count,
    }


def _motion_transfer_summary(cases: list[dict[str, object]]) -> dict[str, object]:
    count = len(cases)
    observed = sum(case["observedCorrect"] is True for case in cases)
    transferred = sum(case["transferredCorrect"] is True for case in cases)
    return {
        "caseCount": count,
        "observedCorrect": observed,
        "observedTop1Accuracy": observed / count,
        "transferredCorrect": transferred,
        "transferredTop1Accuracy": transferred / count,
    }


def _case_digest(cases: list[dict[str, object]]) -> str:
    encoded = json.dumps(cases, separators=(",", ":"), sort_keys=True).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def benchmark_payload() -> dict[str, object]:
    """Return both the supported case and its pre-registered counterexample."""
    persistent = _persistent_cases()
    switched = _switch_cases()
    return {
        "caseDigest": _case_digest(persistent + switched),
        "kind": "arc-scene-prior-next-mover-v1",
        "limits": [
            "synthetic source-owned environments only",
            "not an ARC leaderboard score",
            "temporal persistence is expected to fail when the next mover switches",
        ],
        "persistentMover": _summary(persistent),
        "switchedMover": _summary(switched),
    }


def motion_transfer_payload(
    source_training: dict[str, object], selected_policy: MotionProjection
) -> dict[str, object]:
    """Measure one fixed CHIP-8-selected policy on ARC-format pixels."""
    persistent = _persistent_motion_transfer_cases(selected_policy)
    constant_velocity = [case for case in persistent if case["constantVelocity"]]
    direction_change = [case for case in persistent if not case["constantVelocity"]]
    switched = _switched_motion_transfer_cases(selected_policy)
    all_cases = persistent + switched
    return {
        "caseDigest": _case_digest(all_cases),
        "kind": "chip8-to-arc-motion-transfer-v1",
        "limits": [
            "source-owned environments only",
            "pixels and selected policy cross the domain boundary",
            "not an ARC leaderboard score",
            "direction changes and mover switches are expected failures",
        ],
        "sourceTraining": source_training,
        "targetEvaluation": {
            "constantVelocity": _motion_transfer_summary(constant_velocity),
            "directionChange": _motion_transfer_summary(direction_change),
            "persistentMotion": _motion_transfer_summary(persistent),
            "switchedMover": _motion_transfer_summary(switched),
        },
    }


def motion_transfer_json(
    source_training: dict[str, object], selected_policy: MotionProjection
) -> str:
    return (
        json.dumps(
            motion_transfer_payload(source_training, selected_policy),
            indent=2,
            sort_keys=True,
        )
        + "\n"
    )


def benchmark_json() -> str:
    return json.dumps(benchmark_payload(), indent=2, sort_keys=True) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    text = benchmark_json()
    if args.output is None:
        print(text, end="")
        return
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(text, encoding="utf-8")


if __name__ == "__main__":
    main()
