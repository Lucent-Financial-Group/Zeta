"""Grid-only proto-senses for ARC color, shape, density, and motion.

This module separates three identities that an exact screenshot hash would
collapse:

* ``structural_fingerprint`` ignores palette labels and absolute position, so
  a useful shape prior transfers across recoloring and translation;
* ``palette_fingerprint`` keeps color identities but ignores position, so
  within-game color evidence survives ordinary movement and resets when the
  color regime changes;
* ``place_fingerprint`` keeps coarse 4x4 geography, so a caller can recognize
  a recurring part of a level without replaying an exact frame.

Every feature comes from the rendered grid. No engine state, clock, random
source, model library, or level identifier is consulted. The resulting prior
is evidence for an inference layer, not a claim that a color or shape has one
universal meaning.
"""

from __future__ import annotations

import hashlib
import json
import math
from collections import Counter
from dataclasses import dataclass

from zeta_arc.perception import Grid, background_colour, component_regions

Coordinate = tuple[int, int]


@dataclass(frozen=True)
class SceneObject:
    """One connected foreground object with translation-invariant shape."""

    colour: int
    area: int
    cx: float
    cy: float
    min_x: int
    min_y: int
    width: int
    height: int
    perimeter: int
    shape: tuple[Coordinate, ...]

    @property
    def edge_density(self) -> float:
        """Exposed boundary per possible pixel edge, in ``(0, 1]``."""
        return self.perimeter / (4.0 * self.area)


@dataclass(frozen=True)
class ColourSense:
    """Aggregate, normalized evidence for one foreground palette value."""

    colour: int
    pixels: int
    occupancy: float
    component_count: int
    edge_density: float


@dataclass(frozen=True)
class SceneObservation:
    """A frame reduced to reusable identities and measured features."""

    width: int
    height: int
    background: int | None
    objects: tuple[SceneObject, ...]
    colours: tuple[ColourSense, ...]
    structural_fingerprint: str
    palette_fingerprint: str
    place_fingerprint: str


@dataclass(frozen=True)
class MotionSense:
    """Observed translation and one constant-velocity lookahead point."""

    colour: int
    origin: tuple[float, float]
    current: tuple[float, float]
    velocity: tuple[float, float]
    predicted: tuple[float, float]


@dataclass(frozen=True)
class SceneEvent:
    """One typed temporal distinction; details stay machine-readable."""

    kind: str
    colour: int | None = None
    previous_colour: int | None = None
    origin: tuple[float, float] | None = None
    current: tuple[float, float] | None = None


@dataclass(frozen=True)
class SceneDelta:
    """The temporal proto-senses between two rendered grids."""

    changed_pixels: int
    change_density: float
    colour_change_pixels: int
    colour_change_density: float
    events: tuple[SceneEvent, ...]
    motions: tuple[MotionSense, ...]


@dataclass(frozen=True)
class OutcomeEvidence:
    """A Beta(1,1) posterior over whether probing a color changed the world."""

    changed: int = 0
    unchanged: int = 0

    @property
    def mean(self) -> float:
        return (self.changed + 1.0) / (self.changed + self.unchanged + 2.0)

    def observe(self, world_changed: bool) -> OutcomeEvidence:
        if world_changed:
            return OutcomeEvidence(self.changed + 1, self.unchanged)
        return OutcomeEvidence(self.changed, self.unchanged + 1)


EvidenceRow = tuple[str, str, int, OutcomeEvidence]


@dataclass(frozen=True)
class ScenePriorModel:
    """Immutable within-game evidence, scoped by game and palette regime."""

    evidence: tuple[EvidenceRow, ...] = ()

    def lookup(
        self, game_fingerprint: str, palette_fingerprint: str, colour: int
    ) -> OutcomeEvidence:
        key = (game_fingerprint, palette_fingerprint, colour)
        return next(
            (row[3] for row in self.evidence if row[:3] == key), OutcomeEvidence()
        )

    def observe(
        self,
        game_fingerprint: str,
        palette_fingerprint: str,
        colour: int,
        world_changed: bool,
    ) -> ScenePriorModel:
        key = (game_fingerprint, palette_fingerprint, colour)
        rows = {row[:3]: row[3] for row in self.evidence}
        rows[key] = rows.get(key, OutcomeEvidence()).observe(world_changed)
        return ScenePriorModel(
            tuple((*row_key, evidence) for row_key, evidence in sorted(rows.items()))
        )


@dataclass(frozen=True)
class CandidateSignals:
    """Bounded inputs to a coordinate candidate's untuned structural score."""

    rarity: float
    edge_density: float
    change_density: float
    motion: float
    learned_change_rate: float


@dataclass(frozen=True)
class SceneCandidate:
    """One coordinate hypothesis and the evidence that produced its mass."""

    x: int
    y: int
    colours: tuple[int, ...]
    score: float
    probability: float
    signals: CandidateSignals


@dataclass(frozen=True)
class ScenePriorForecast:
    """A normalized, inspectable coordinate prior for an inference layer."""

    observation: SceneObservation
    delta: SceneDelta | None
    candidates: tuple[SceneCandidate, ...]
    selected: Coordinate | None


def _digest(value: object) -> str:
    encoded = json.dumps(value, separators=(",", ":"), sort_keys=True).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def _place_signature(grid: Grid, bins: int = 4) -> list[object]:
    if not grid or not grid[0]:
        return [0, 0, []]
    height, width = len(grid), len(grid[0])
    counts = [Counter[int]() for _ in range(bins * bins)]
    for y, row in enumerate(grid):
        by = min(bins - 1, y * bins // height)
        for x, value in enumerate(row):
            bx = min(bins - 1, x * bins // width)
            counts[by * bins + bx][value] += 1
    tiles = [sorted(tile.items()) for tile in counts]
    return [width, height, tiles]


def observe_scene(grid: Grid) -> SceneObservation:
    """Measure one frame and derive exact, palette, and structural identities."""
    if not grid or not grid[0]:
        empty = _digest([])
        return SceneObservation(0, 0, None, (), (), empty, empty, empty)

    height, width = len(grid), len(grid[0])
    background = background_colour(grid)
    regions = component_regions(grid, background)
    objects = tuple(
        SceneObject(
            colour=region.component.colour,
            area=region.component.area,
            cx=region.component.cx,
            cy=region.component.cy,
            min_x=region.min_x,
            min_y=region.min_y,
            width=region.width,
            height=region.height,
            perimeter=region.perimeter,
            shape=region.shape,
        )
        for region in regions
    )
    total = width * height
    colours: list[ColourSense] = []
    for colour in sorted({item.colour for item in objects}):
        same = [item for item in objects if item.colour == colour]
        pixels = sum(item.area for item in same)
        perimeter = sum(item.perimeter for item in same)
        colours.append(
            ColourSense(
                colour=colour,
                pixels=pixels,
                occupancy=pixels / total,
                component_count=len(same),
                edge_density=perimeter / (4.0 * pixels),
            )
        )

    structural = sorted(
        (item.area, item.width, item.height, item.perimeter, item.shape)
        for item in objects
    )
    # This is deliberately ONLY the scheme, not occupancy or shape. Animation
    # changes both routinely; putting them in this key would erase within-game
    # color evidence on the transition it should explain.
    palette = [background, [colour.colour for colour in colours]]
    return SceneObservation(
        width=width,
        height=height,
        background=background,
        objects=objects,
        colours=tuple(colours),
        structural_fingerprint=_digest([width, height, structural]),
        palette_fingerprint=_digest([width, height, palette]),
        place_fingerprint=_digest(_place_signature(grid)),
    )


def _match_same_colour(
    previous: tuple[SceneObject, ...], current: tuple[SceneObject, ...]
) -> tuple[list[tuple[int, int]], set[int], set[int]]:
    candidates: list[tuple[int, int, float, int, int]] = []
    for pi, before in enumerate(previous):
        for ci, after in enumerate(current):
            if before.colour != after.colour:
                continue
            shape_cost = 0 if before.shape == after.shape else 1
            area_cost = abs(before.area - after.area)
            distance = abs(before.cx - after.cx) + abs(before.cy - after.cy)
            candidates.append((shape_cost, area_cost, distance, pi, ci))
    candidates.sort()
    used_previous: set[int] = set()
    used_current: set[int] = set()
    pairs: list[tuple[int, int]] = []
    for _, _, _, pi, ci in candidates:
        if pi in used_previous or ci in used_current:
            continue
        used_previous.add(pi)
        used_current.add(ci)
        pairs.append((pi, ci))
    return pairs, used_previous, used_current


def _compare_observed(
    previous_grid: Grid,
    current_grid: Grid,
    previous: SceneObservation,
    current: SceneObservation,
) -> SceneDelta:
    width = max(previous.width, current.width)
    height = max(previous.height, current.height)
    changed = 0
    recoloured = 0
    for y in range(height):
        for x in range(width):
            cell_before = (
                previous_grid[y][x]
                if y < previous.height and x < previous.width
                else None
            )
            cell_after = (
                current_grid[y][x] if y < current.height and x < current.width else None
            )
            if cell_before == cell_after:
                continue
            changed += 1
            if (
                cell_before is not None
                and cell_after is not None
                and cell_before != previous.background
                and cell_after != current.background
            ):
                recoloured += 1

    events: list[SceneEvent] = []
    if previous.background != current.background:
        events.append(
            SceneEvent(
                "background-recoloured",
                colour=current.background,
                previous_colour=previous.background,
            )
        )
    previous_colours = {sense.colour for sense in previous.colours}
    current_colours = {sense.colour for sense in current.colours}
    for colour in sorted(current_colours - previous_colours):
        events.append(SceneEvent("colour-appeared", colour=colour))
    for colour in sorted(previous_colours - current_colours):
        events.append(SceneEvent("colour-disappeared", colour=colour))

    previous_counts = Counter(item.colour for item in previous.objects)
    current_counts = Counter(item.colour for item in current.objects)
    for colour in sorted(previous_colours | current_colours):
        before_count = previous_counts[colour]
        after_count = current_counts[colour]
        if after_count > before_count > 0:
            events.append(SceneEvent("component-split", colour=colour))
        elif before_count > after_count > 0:
            events.append(SceneEvent("component-merged", colour=colour))
        before_pixels = next(
            (sense.pixels for sense in previous.colours if sense.colour == colour), 0
        )
        after_pixels = next(
            (sense.pixels for sense in current.colours if sense.colour == colour), 0
        )
        if before_pixels != after_pixels:
            events.append(SceneEvent("occupancy-changed", colour=colour))

    pairs, used_previous, used_current = _match_same_colour(
        previous.objects, current.objects
    )
    motions: list[MotionSense] = []
    for pi, ci in pairs:
        object_before = previous.objects[pi]
        object_after = current.objects[ci]
        origin = (object_before.cx, object_before.cy)
        destination = (object_after.cx, object_after.cy)
        if object_before.shape != object_after.shape:
            events.append(
                SceneEvent(
                    "shape-changed",
                    colour=object_after.colour,
                    origin=origin,
                    current=destination,
                )
            )
            continue
        if origin != destination:
            velocity = (
                object_after.cx - object_before.cx,
                object_after.cy - object_before.cy,
            )
            events.append(
                SceneEvent(
                    "translated",
                    colour=object_after.colour,
                    origin=origin,
                    current=destination,
                )
            )
            motions.append(
                MotionSense(
                    colour=object_after.colour,
                    origin=origin,
                    current=destination,
                    velocity=velocity,
                    predicted=(
                        object_after.cx + velocity[0],
                        object_after.cy + velocity[1],
                    ),
                )
            )

    unmatched_previous = [
        i for i in range(len(previous.objects)) if i not in used_previous
    ]
    unmatched_current = [
        i for i in range(len(current.objects)) if i not in used_current
    ]
    recolour_pairs: list[tuple[int, int]] = []
    for pi in unmatched_previous:
        object_before = previous.objects[pi]
        for ci in unmatched_current:
            if any(existing_ci == ci for _, existing_ci in recolour_pairs):
                continue
            object_after = current.objects[ci]
            if object_before.shape == object_after.shape and (
                object_before.cx,
                object_before.cy,
            ) == (
                object_after.cx,
                object_after.cy,
            ):
                recolour_pairs.append((pi, ci))
                events.append(
                    SceneEvent(
                        "recoloured",
                        colour=object_after.colour,
                        previous_colour=object_before.colour,
                        origin=(object_before.cx, object_before.cy),
                        current=(object_after.cx, object_after.cy),
                    )
                )
                break

    recoloured_previous = {pi for pi, _ in recolour_pairs}
    recoloured_current = {ci for _, ci in recolour_pairs}
    for pi in unmatched_previous:
        if pi not in recoloured_previous:
            object_before = previous.objects[pi]
            events.append(
                SceneEvent(
                    "component-disappeared",
                    colour=object_before.colour,
                    origin=(object_before.cx, object_before.cy),
                )
            )
    for ci in unmatched_current:
        if ci not in recoloured_current:
            object_after = current.objects[ci]
            events.append(
                SceneEvent(
                    "component-appeared",
                    colour=object_after.colour,
                    current=(object_after.cx, object_after.cy),
                )
            )

    events.sort(
        key=lambda event: (
            event.kind,
            -1 if event.colour is None else event.colour,
            -1 if event.previous_colour is None else event.previous_colour,
            event.origin or (-1.0, -1.0),
            event.current or (-1.0, -1.0),
        )
    )
    motions.sort(key=lambda motion: (motion.colour, motion.current, motion.origin))
    cell_count = max(1, width * height)
    return SceneDelta(
        changed_pixels=changed,
        change_density=changed / cell_count,
        colour_change_pixels=recoloured,
        colour_change_density=recoloured / cell_count,
        events=tuple(events),
        motions=tuple(motions),
    )


def compare_scenes(previous_grid: Grid, current_grid: Grid) -> SceneDelta:
    """Distinguish temporal causes instead of calling every difference motion."""
    return _compare_observed(
        previous_grid,
        current_grid,
        observe_scene(previous_grid),
        observe_scene(current_grid),
    )


def _bounded_motion(motion: MotionSense, width: int, height: int) -> float:
    diagonal = math.hypot(width, height)
    if diagonal == 0.0:
        return 0.0
    return min(1.0, math.hypot(*motion.velocity) / diagonal)


def _object_change_density(
    item: SceneObject, previous_grid: Grid | None, current_grid: Grid
) -> float:
    if previous_grid is None:
        return 0.0
    changed = 0
    for dx, dy in item.shape:
        x, y = item.min_x + dx, item.min_y + dy
        before = (
            previous_grid[y][x]
            if y < len(previous_grid) and x < len(previous_grid[y])
            else None
        )
        if before != current_grid[y][x]:
            changed += 1
    return changed / item.area


def forecast_scene(
    model: ScenePriorModel,
    game_fingerprint: str,
    grid: Grid,
    previous_grid: Grid | None = None,
) -> ScenePriorForecast:
    """Turn proto-senses and scoped outcomes into normalized coordinate mass."""
    observation = observe_scene(grid)
    delta = (
        _compare_observed(
            previous_grid,
            grid,
            observe_scene(previous_grid),
            observation,
        )
        if previous_grid is not None
        else None
    )
    if not observation.objects:
        return ScenePriorForecast(observation, delta, (), None)

    motion_by_object: dict[tuple[int, tuple[float, float]], float] = {}
    if delta is not None:
        for motion in delta.motions:
            key = (motion.colour, motion.current)
            motion_by_object[key] = max(
                motion_by_object.get(key, 0.0),
                _bounded_motion(motion, observation.width, observation.height),
            )

    scores: dict[Coordinate, float] = {}
    signal_rows: dict[Coordinate, list[CandidateSignals]] = {}
    colours_by_point: dict[Coordinate, set[int]] = {}
    occupancy_by_colour = {
        sense.colour: sense.occupancy for sense in observation.colours
    }
    for item in observation.objects:
        point = (
            min(63, max(0, round(item.cx))),
            min(63, max(0, round(item.cy))),
        )
        rarity = 1.0 - occupancy_by_colour[item.colour]
        object_key = (item.colour, (item.cx, item.cy))
        activity = _object_change_density(item, previous_grid, grid)
        motion_signal = motion_by_object.get(object_key, 0.0)
        learned = model.lookup(
            game_fingerprint, observation.palette_fingerprint, item.colour
        ).mean
        signals = CandidateSignals(
            rarity, item.edge_density, activity, motion_signal, learned
        )
        structural_score = 1.0 + rarity + item.edge_density + activity + motion_signal
        score = structural_score * learned
        scores[point] = scores.get(point, 0.0) + score
        signal_rows.setdefault(point, []).append(signals)
        colours_by_point.setdefault(point, set()).add(item.colour)

    denominator = sum(scores.values())
    candidates: list[SceneCandidate] = []
    for point in sorted(scores, key=lambda value: (value[1], value[0])):
        rows = signal_rows[point]
        signals = CandidateSignals(
            rarity=sum(row.rarity for row in rows) / len(rows),
            edge_density=sum(row.edge_density for row in rows) / len(rows),
            change_density=sum(row.change_density for row in rows) / len(rows),
            motion=sum(row.motion for row in rows) / len(rows),
            learned_change_rate=sum(row.learned_change_rate for row in rows)
            / len(rows),
        )
        candidates.append(
            SceneCandidate(
                x=point[0],
                y=point[1],
                colours=tuple(sorted(colours_by_point[point])),
                score=scores[point],
                probability=scores[point] / denominator,
                signals=signals,
            )
        )
    selected = max(
        candidates,
        key=lambda candidate: (candidate.probability, -candidate.y, -candidate.x),
    )
    return ScenePriorForecast(
        observation=observation,
        delta=delta,
        candidates=tuple(candidates),
        selected=(selected.x, selected.y),
    )


def observe_forecast_outcome(
    model: ScenePriorModel,
    game_fingerprint: str,
    forecast: ScenePriorForecast,
    selected: Coordinate,
    world_changed: bool,
) -> ScenePriorModel:
    """Return a new model with evidence for the selected visible color(s)."""
    candidate = next(
        (item for item in forecast.candidates if (item.x, item.y) == selected), None
    )
    if candidate is None:
        return model
    updated = model
    for colour in candidate.colours:
        updated = updated.observe(
            game_fingerprint,
            forecast.observation.palette_fingerprint,
            colour,
            world_changed,
        )
    return updated
