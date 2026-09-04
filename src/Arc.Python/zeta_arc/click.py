"""Where to click on a world nobody explained — the coordinate action's prior.

THE PROBLEM IS THE SIZE OF THE SPACE. `ACTION6` carries `{x, y}` over 0..63
(`arcengine/enums.py:45`), so its action space is 4096 points, against 4 for a
d-pad. Uniform sampling over it is not a weak policy, it is no policy: at a
budget of a few hundred actions per level you would not finish one sweep, and
the design doc already names this as the reason `ACTION6` does not embed in the
16-key controller grammar — a coordinate is not a button.

So this layer is a PRIOR, in the sense Aaron used when he said the agents start
as untrained networks and priors have to be baked in. It does not know what
clicking does. It knows where clicking is worth trying.

THE PRIOR, IN ONE SENTENCE: things that are OBJECTS are things that are
CLICKABLE. The perception ladder already segments the frame into connected
same-colour components, and a handful of component centroids is a search space
you can actually exhaust. That is the whole idea — and it is the same idea as
the pixel agent's, which finds its body by acting rather than by being told:
here the agent finds the interactive parts of a UI by clicking the parts that
LOOK like parts.

It is also the reason this is not ARC-specific effort. Aaron 2026-08-25:
"we want to support more than just ARC, more like a generic learner that can
look at UI quickly." Object-centroid clicking is how you probe any unfamiliar
interface; ARC is the falsifier that happens to be available.

WHAT IT DOES NOT DO, stated so the gap is visible rather than discovered: it
does not learn which objects were worth clicking. Every click is equally
motivated, and the only feedback used is "did the world change". Wiring the
outcome back into a per-object belief is the layer above this one, and it is
the one that needs `SoftMessage` — this file is deliberately the dumb prior
that layer would sit on.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from zeta_arc.perception import Grid, components

#: The coordinate ceiling the engine enforces (`ComplexAction`: `ge=0, le=63`).
#: Clicks are clamped to it rather than trusted to be in range: a centroid comes
#: from measured pixel data, and a pydantic validation error mid-episode would
#: cost the run for a defect that is one `min()` away.
MAX_COORD = 63

#: Strides for the fallback lattice, coarse first. Chosen so each pass covers
#: the WHOLE board at increasing resolution rather than finishing one region:
#: stride 8 is 64 points over the full 64x64, stride 4 refines to 256, and so
#: on. A raster scan has the same total cost and much worse early coverage,
#: which matters because the budget nearly always runs out first.
SWEEP_STRIDES = (8, 4, 2, 1)


@dataclass(frozen=True)
class CoordinateMass:
    """One sparse cell of a normalized coordinate-action distribution."""

    x: int
    y: int
    probability: float


@dataclass(frozen=True)
class CoordinateForecast:
    """The revisable field and the deterministic point it would commit."""

    masses: tuple[CoordinateMass, ...]
    selected: tuple[int, int]


def _signature(grid: Grid) -> tuple[int, ...]:
    """A cheap, total identity for a frame, used only to ask "did it change".

    Flattened contents rather than a hash: this is compared, never stored at
    scale, and a hash would trade a collision risk for nothing. Collisions here
    would be silent — the policy would think a changed world was unchanged and
    keep refusing to re-click it.
    """
    return tuple(v for row in grid for v in row)


@dataclass
class ClickPolicy:
    """Chooses the next coordinate to try, from the frame alone."""

    #: Coordinates already tried against the CURRENT world. Cleared whenever the
    #: world changes, because a click that did nothing here may do something
    #: there — refusing to re-click after a level transition is how an agent
    #: declines to press the button that just worked.
    tried: set[tuple[int, int]] = field(default_factory=set)
    _last_signature: tuple[int, ...] | None = None
    _stride_index: int = 0
    _sweep_cursor: int = 0

    def _sync_world(self, grid: Grid) -> None:
        signature = _signature(grid)
        if signature == self._last_signature:
            return
        self.tried.clear()
        self._stride_index = 0
        self._sweep_cursor = 0
        self._last_signature = signature

    def _targets(self, grid: Grid) -> list[tuple[int, int]]:
        """Component centroids, in the deterministic order `components` returns.

        `components` sorts by `(colour, cy, cx)` and says so, so this order
        replays. Rounding a centroid can land OFF the component for a concave
        shape (a ring's centre is its hole) — a real limit, and the lattice
        below is what covers it rather than a special case here.
        """
        return [
            (
                min(MAX_COORD, max(0, round(c.cx))),
                min(MAX_COORD, max(0, round(c.cy))),
            )
            for c in components(grid)
        ]

    def _lattice(self, width: int, height: int) -> tuple[int, int] | None:
        """The next untried point on the current stride, refining when exhausted.

        Returns `None` only once stride 1 is exhausted, i.e. every clickable
        cell in the frame has been tried against this unchanged world — which
        is a genuinely finished search, not a failure to have an idea.
        """
        while self._stride_index < len(SWEEP_STRIDES):
            stride = SWEEP_STRIDES[self._stride_index]
            xs = range(0, min(width, MAX_COORD + 1), stride)
            ys = range(0, min(height, MAX_COORD + 1), stride)
            points = [(x, y) for y in ys for x in xs]
            while self._sweep_cursor < len(points):
                point = points[self._sweep_cursor]
                self._sweep_cursor += 1
                if point not in self.tried:
                    return point
            self._stride_index += 1
            self._sweep_cursor = 0
        return None

    def _peek_lattice(self, width: int, height: int) -> tuple[int, int] | None:
        """Read the next lattice point without spending it."""
        stride_index = self._stride_index
        sweep_cursor = self._sweep_cursor
        while stride_index < len(SWEEP_STRIDES):
            stride = SWEEP_STRIDES[stride_index]
            points = [
                (x, y)
                for y in range(0, min(height, MAX_COORD + 1), stride)
                for x in range(0, min(width, MAX_COORD + 1), stride)
            ]
            while sweep_cursor < len(points):
                point = points[sweep_cursor]
                sweep_cursor += 1
                if point not in self.tried:
                    return point
            stride_index += 1
            sweep_cursor = 0
        return None

    def forecast(self, grid: Grid) -> CoordinateForecast:
        """Expose the pre-action field without consuming the selected point.

        Untried object centroids share the mass uniformly. Once no object is
        left, the deterministic coarse-to-fine probe is honestly a point mass;
        there is no hidden stochastic policy to draw wider than that.
        """
        self._sync_world(grid)
        candidates = tuple(
            dict.fromkeys(
                target for target in self._targets(grid) if target not in self.tried
            )
        )
        if candidates:
            probability = 1.0 / len(candidates)
            masses = tuple(CoordinateMass(x, y, probability) for x, y in candidates)
            return CoordinateForecast(masses, candidates[0])

        height = len(grid)
        width = len(grid[0]) if height else 0
        point = self._peek_lattice(width, height)
        if point is None:
            point = next(iter(self._targets(grid)), (0, 0))
        return CoordinateForecast((CoordinateMass(point[0], point[1], 1.0),), point)

    def choose(self, grid: Grid) -> tuple[int, int]:
        """The next coordinate to click.

        Objects first, then the lattice. Always returns a point — an agent that
        declines to act still spends the tick, so "no idea" and "click (0,0)"
        cost the same and only one of them can learn anything.
        """
        self._sync_world(grid)

        for target in self._targets(grid):
            if target not in self.tried:
                self.tried.add(target)
                return target

        height = len(grid)
        width = len(grid[0]) if height else 0
        point = self._lattice(width, height)
        if point is None:
            # Everything has been tried against a world that never changed.
            # Re-clicking the first object is the honest move: the alternative
            # is refusing to act, and the world may yet be waiting on a
            # different action from another layer entirely.
            self.tried.clear()
            self._stride_index = 0
            self._sweep_cursor = 0
            point = next(iter(self._targets(grid)), (0, 0))
        self.tried.add(point)
        return point
