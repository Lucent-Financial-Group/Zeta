"""Measure learned color and shape priors against the centroid control.

Four deterministic cohorts are reported: stable color, stable shape across
palette changes, then a color switch and a shape switch. The switch cohorts
are counterexamples on purpose: they measure adaptation cost when what used to
remain useful stops remaining useful.

This is a source-owned synthetic benchmark, not an ARC leaderboard score.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from dataclasses import dataclass
from pathlib import Path

from zeta_arc.click import ClickPolicy, CoordinatePolicy
from zeta_arc.perception import Grid
from zeta_arc.scene_feedback import SceneCoordinatePolicy
from zeta_arc.scene_priors import observe_scene

Coordinate = tuple[int, int]
Shape = tuple[Coordinate, ...]

POSITIONS: tuple[Coordinate, ...] = ((1, 1), (6, 1), (3, 6))
SHAPES: dict[str, Shape] = {
    "horizontal": ((0, 0), (1, 0), (2, 0)),
    "vertical": ((0, 0), (0, 1), (0, 2)),
    "elbow": ((0, 0), (0, 1), (1, 1)),
    "point": ((0, 0),),
}
PALETTES: tuple[tuple[int, int, int], ...] = (
    (4, 7, 9),
    (11, 12, 10),
    (14, 13, 15),
    (18, 20, 19),
    (23, 21, 22),
    (26, 27, 25),
)


@dataclass(frozen=True)
class ObjectSpec:
    shape: str
    colour: int
    position: Coordinate


@dataclass(frozen=True)
class EpisodeSpec:
    objects: tuple[ObjectSpec, ...]
    target_colour: int


def _grid(spec: EpisodeSpec) -> Grid:
    grid = [[0] * 10 for _ in range(10)]
    for item in spec.objects:
        for dx, dy in SHAPES[item.shape]:
            grid[item.position[1] + dy][item.position[0] + dx] = item.colour
    return grid


def _target(spec: EpisodeSpec, grid: Grid) -> Coordinate:
    item = next(
        item
        for item in observe_scene(grid).objects
        if item.colour == spec.target_colour
    )
    return round(item.cx), round(item.cy)


def _blank() -> Grid:
    return [[0] * 10 for _ in range(10)]


def _rotated_positions(index: int) -> tuple[Coordinate, ...]:
    offset = index % len(POSITIONS)
    return POSITIONS[offset:] + POSITIONS[:offset]


def _color_episodes(switched: bool) -> tuple[EpisodeSpec, ...]:
    episodes: list[EpisodeSpec] = []
    for index in range(6):
        positions = _rotated_positions(index)
        target = 7 if not switched or index < 3 else 9
        episodes.append(
            EpisodeSpec(
                tuple(
                    ObjectSpec("point", colour, position)
                    for colour, position in zip((2, 7, 9), positions, strict=True)
                ),
                target,
            )
        )
    return tuple(episodes)


def _shape_episodes(switched: bool) -> tuple[EpisodeSpec, ...]:
    episodes: list[EpisodeSpec] = []
    for index, colours in enumerate(PALETTES):
        positions = _rotated_positions(index)
        objects = tuple(
            ObjectSpec(shape, colour, position)
            for shape, colour, position in zip(
                ("horizontal", "vertical", "elbow"),
                colours,
                positions,
                strict=True,
            )
        )
        target = colours[2] if not switched or index < 3 else colours[0]
        episodes.append(EpisodeSpec(objects, target))
    return tuple(episodes)


def _run(
    policy: CoordinatePolicy, episodes: tuple[EpisodeSpec, ...]
) -> dict[str, object]:
    actions: list[int] = []
    solved = 0
    for episode in episodes:
        grid = _grid(episode)
        target = _target(episode, grid)
        count = 0
        while count < 6:
            selected = policy.choose(grid)
            count += 1
            success = selected == target
            policy.observe(_blank() if success else grid)
            if success:
                solved += 1
                break
        actions.append(count)
    total = sum(actions)
    return {
        "actionsPerEpisode": actions,
        "meanActions": total / len(actions),
        "solved": solved,
        "totalActions": total,
    }


def _cohort(name: str, episodes: tuple[EpisodeSpec, ...]) -> dict[str, object]:
    return {
        "control": _run(ClickPolicy(), episodes),
        "sceneFeedback": _run(SceneCoordinatePolicy(name), episodes),
    }


def _case_digest(cohorts: dict[str, tuple[EpisodeSpec, ...]]) -> str:
    rows = {
        name: [
            {
                "objects": [
                    [item.shape, item.colour, list(item.position)]
                    for item in episode.objects
                ],
                "targetColour": episode.target_colour,
            }
            for episode in episodes
        ]
        for name, episodes in cohorts.items()
    }
    encoded = json.dumps(rows, separators=(",", ":"), sort_keys=True).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def benchmark_payload() -> dict[str, object]:
    cohorts = {
        "stableColor": _color_episodes(False),
        "stableShapeAcrossPalettes": _shape_episodes(False),
        "switchedColor": _color_episodes(True),
        "switchedShape": _shape_episodes(True),
    }
    return {
        "caseDigest": _case_digest(cohorts),
        "cohorts": {
            name: _cohort(name, episodes) for name, episodes in cohorts.items()
        },
        "kind": "arc-scene-feedback-v1",
        "limits": [
            "synthetic source-owned environments only",
            "not an ARC leaderboard score",
            "feature switches intentionally measure stale-prior adaptation cost",
            "existing hosted policy remains the control and is not replaced",
        ],
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
