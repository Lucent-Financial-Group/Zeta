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
from zeta_arc.scene_priors import ScenePriorModel, compare_scenes, forecast_scene

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
