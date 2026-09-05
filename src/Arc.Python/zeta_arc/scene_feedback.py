"""Close ARC scene forecasts over explicit action outcomes.

The controller keeps two different things separate:

* ``ScenePriorModel`` is accumulated evidence that remains across turns;
* ``SceneDecision`` and ``SceneOutcome`` are bounded records of what happened
  on one turn.

No engine state is read. A caller presents a grid, receives a coordinate, and
then presents the resulting grid. This makes terminal outcomes creditable and
keeps the controller usable behind the same coordinate-policy port as the
existing centroid control.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from zeta_arc.click import ClickPolicy
from zeta_arc.perception import Grid
from zeta_arc.scene_priors import (
    Coordinate,
    SceneDelta,
    SceneObservation,
    ScenePriorForecast,
    ScenePriorModel,
    compare_scenes,
    forecast_scene,
    observe_forecast_outcome,
    observe_scene,
)

FrozenGrid = tuple[tuple[int, ...], ...]


def _freeze(grid: Grid) -> FrozenGrid:
    return tuple(tuple(row) for row in grid)


def _thaw(grid: FrozenGrid | None) -> Grid | None:
    return [list(row) for row in grid] if grid is not None else None


@dataclass(frozen=True)
class SceneDecision:
    """One pre-action forecast and the coordinate chosen from it."""

    turn: int
    forecast: ScenePriorForecast
    selected: Coordinate


@dataclass(frozen=True)
class SceneDecisionResult:
    """A decision or a typed reason that no new action was admitted."""

    decision: SceneDecision | None
    feedback: str | None


@dataclass(frozen=True)
class SceneOutcome:
    """One completed observe/choose/outcome turn."""

    decision: SceneDecision
    observation: SceneObservation
    delta: SceneDelta
    world_changed: bool
    resulting_model: ScenePriorModel


@dataclass(frozen=True)
class SceneOutcomeResult:
    """A completed turn or a typed reason that no action awaited feedback."""

    outcome: SceneOutcome | None
    feedback: str | None


@dataclass
class SceneFeedbackController:
    """Integrate bounded scene events into persistent color and shape evidence."""

    game_fingerprint: str
    model: ScenePriorModel = field(default_factory=ScenePriorModel)
    _previous_grid: FrozenGrid | None = None
    _pending: tuple[SceneDecision, FrozenGrid] | None = None
    _next_turn: int = 0

    def decide(self, grid: Grid) -> SceneDecisionResult:
        """Admit one coordinate decision without overwriting pending feedback."""
        if self._pending is not None:
            return SceneDecisionResult(None, "outcome-pending")

        frozen = _freeze(grid)
        forecast = forecast_scene(
            self.model,
            self.game_fingerprint,
            grid,
            _thaw(self._previous_grid),
        )
        if forecast.selected is None:
            self._previous_grid = frozen
            return SceneDecisionResult(None, "no-visible-candidates")

        decision = SceneDecision(self._next_turn, forecast, forecast.selected)
        self._next_turn += 1
        self._pending = (decision, frozen)
        return SceneDecisionResult(decision, None)

    def observe(self, grid: Grid) -> SceneOutcomeResult:
        """Close the pending turn against the next grid, including terminal grids."""
        frozen = _freeze(grid)
        if self._pending is None:
            self._previous_grid = frozen
            return SceneOutcomeResult(None, "no-pending-decision")

        decision, acted_grid = self._pending
        acted = _thaw(acted_grid) or []
        changed = frozen != acted_grid
        delta = compare_scenes(acted, grid)
        self.model = observe_forecast_outcome(
            self.model,
            self.game_fingerprint,
            decision.forecast,
            decision.selected,
            changed,
        )
        outcome = SceneOutcome(
            decision=decision,
            observation=observe_scene(grid),
            delta=delta,
            world_changed=changed,
            resulting_model=self.model,
        )
        self._pending = None
        self._previous_grid = frozen
        return SceneOutcomeResult(outcome, None)


@dataclass
class SceneCoordinatePolicy:
    """Experimental adapter from scene feedback to the coordinate-policy port."""

    game_fingerprint: str
    initial_model: ScenePriorModel = field(default_factory=ScenePriorModel)
    controller: SceneFeedbackController = field(init=False)
    fallback: ClickPolicy = field(default_factory=ClickPolicy)
    last_outcome: SceneOutcome | None = None

    def __post_init__(self) -> None:
        self.controller = SceneFeedbackController(
            self.game_fingerprint, model=self.initial_model
        )

    @property
    def model(self) -> ScenePriorModel:
        return self.controller.model

    def observe(self, grid: Grid) -> None:
        result = self.controller.observe(grid)
        self.last_outcome = result.outcome
        self.fallback.observe(grid)

    def choose(self, grid: Grid) -> Coordinate:
        result = self.controller.decide(grid)
        if result.decision is not None:
            return result.decision.selected

        if result.feedback == "outcome-pending":
            self.observe(grid)
            retry = self.controller.decide(grid)
            if retry.decision is not None:
                return retry.decision.selected

        return self.fallback.choose(grid)
