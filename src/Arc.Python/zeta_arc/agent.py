"""The pixel agent — Zeta's perception ladder pointed at an ARC frame.

WHAT MAKES THIS DIFFERENT FROM `play.py`'s BASELINES. Both existing agents call
`game.current_level.get_sprites_by_tag("agent")` and read `sprite.x`. That is
ground truth handed to the policy — the ARC equivalent of reading V0/V1 out of
the emulator. This agent sees a grid of colour integers and nothing else.

HOW IT KNOWS WHICH BLOB IS ITSELF. Not by colour. The self is the thing that
ANSWERS TO MY OWN ACTIONS: after commanding a direction, the component whose
displacement agrees with that direction accumulates evidence, and the argmax
takes the body once its evidence is actually positive.

That rule is carried over from the CHIP-8 arena, where the alternatives were
measured to fail. Committing on a CLOCK put a WALL in the body's place for an
entire run (work-item 081M0SX3R27087G0R002TJZTYJ: correct on 0 of 2999 ticks),
because the election ran on a frame that contained only walls. Committing on
COLOUR sealed that mistake in, because a colour filter can never fall through
while anything of that colour is on screen. So: evidence, argmax, and a latch
that stays revisable.

ONE HONEST DIFFERENCE FROM THE ARENA. There, the empowerment probe also needed
its NULL branch — my body holds still when I command nothing, a pursuer does
not — because the opponent chased the player and scored just as well on
agreement alone. ARC's action set here is {1,2,3,4} with no null action, and
ZetaChase has no pursuer, so that branch has nothing to measure and is absent
rather than faked.
"""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field

from arcengine import GameAction

from zeta_arc.perception import Component, Grid, components

#: Direction each action moves the agent, in grid cells. Mirrors chase.py's
#: `_MOVES`, but as the agent's OWN hypothesis about what its actions do — it
#: is used to score displacement agreement, never to read the world.
ACTION_VECTORS: dict[GameAction, tuple[int, int]] = {
    GameAction.ACTION1: (0, -1),
    GameAction.ACTION2: (0, 1),
    GameAction.ACTION3: (-1, 0),
    GameAction.ACTION4: (1, 0),
}

#: Evidence leaks, so a wrong body decays out instead of being welded on.
EVIDENCE_DECAY = 0.9
#: A challenger must beat the held body by this margin to take it (hysteresis,
#: same Schmitt-trigger idiom as the arena's mode latch — motor smoothing).
LATCH_MARGIN = 1.0


@dataclass
class PixelAgent:
    """Chooses actions from the rendered frame alone."""

    evidence: dict[int, float] = field(default_factory=dict)
    #: Cells discovered to be impassable — learned by BUMPING, never read from
    #: the environment's wall table. See `_note_blocked_cell`.
    blocked: set[tuple[int, int]] = field(default_factory=set)
    _self_key: int | None = None
    _previous: list[Component] = field(default_factory=list)
    _last_action: GameAction | None = None
    #: Pixels per grid cell, LEARNED from the agent's own first real move. The
    #: environment's CELL constant is never imported: a step size the agent
    #: measures is one it would still have on an environment that used a
    #: different one.
    _step_px: float | None = None
    _last_self_cell: tuple[int, int] | None = None

    def _cell_of(self, c: Component) -> tuple[int, int]:
        """Component centroid in grid cells, using the learned step size."""
        step = self._step_px or 1.0
        return (int(round((c.cx - step / 2) / step)), int(round((c.cy - step / 2) / step)))

    def _note_blocked_cell(self, me: Component) -> None:
        """A commanded move that produced NO displacement means something is in
        the way. Mark the cell I tried to enter.

        This is the same contingency reasoning that finds the body, pointed at
        the world instead: the agent does not need to be TOLD where walls are,
        it needs to notice that a command it issued did not take effect. The
        cost is honest — a few bumps — and that cost is the price of not being
        handed the map.
        """
        if self._last_action is None or self._step_px is None or self._last_self_cell is None:
            return
        here = self._cell_of(me)
        if here != self._last_self_cell:
            return  # it moved; nothing was blocking
        dx, dy = ACTION_VECTORS[self._last_action]
        self.blocked.add((here[0] + dx, here[1] + dy))

    def _route_step(
        self, me: Component, targets: list[Component], width: int, height: int
    ) -> GameAction | None:
        """Breadth-first step toward the nearest target that is not known-blocked.

        The search runs over the OCCUPANCY THE AGENT HAS LEARNED, so early on it
        is optimistic and walks into walls, and each bump makes it less wrong.
        Returns None when nothing is reachable yet, leaving the caller's greedy
        fallback in charge.
        """
        if self._step_px is None:
            return None
        cols, rows = int(width / self._step_px), int(height / self._step_px)
        start = self._cell_of(me)
        goals = {self._cell_of(t) for t in targets} - self.blocked
        if not goals:
            return None

        # Deterministic: actions are explored in their fixed declared order, so
        # equal-length routes always resolve the same way and an episode replays.
        previous: dict[tuple[int, int], tuple[tuple[int, int], GameAction]] = {}
        seen = {start}
        queue: deque[tuple[int, int]] = deque([start])
        found: tuple[int, int] | None = None
        while queue and found is None:
            cur = queue.popleft()
            for action, (dx, dy) in ACTION_VECTORS.items():
                nxt = (cur[0] + dx, cur[1] + dy)
                if not (0 <= nxt[0] < cols and 0 <= nxt[1] < rows):
                    continue
                if nxt in seen or nxt in self.blocked:
                    continue
                seen.add(nxt)
                previous[nxt] = (cur, action)
                if nxt in goals:
                    found = nxt
                    break
                queue.append(nxt)
        if found is None:
            return None
        step = found
        while previous[step][0] != start:
            step = previous[step][0]
        return previous[step][1]

    @staticmethod
    def _key(c: Component) -> int:
        """Identity across frames: colour plus area. Stable for rigid sprites
        that translate without changing shape, which is what these are."""
        return c.colour * 100003 + c.area

    def _update_evidence(self, now: list[Component]) -> None:
        """Credit components whose displacement agreed with what I commanded."""
        if self._last_action is None or not self._previous:
            return
        dx_cmd, dy_cmd = ACTION_VECTORS[self._last_action]
        before = {self._key(c): c for c in self._previous}
        for c in now:
            key = self._key(c)
            was = before.get(key)
            if was is None:
                continue
            dx, dy = c.cx - was.cx, c.cy - was.cy
            magnitude = abs(dx) + abs(dy)
            if magnitude < 1e-9:
                continue  # did not move: unreadable (a wall may have blocked me)
            agreement = (dx * dx_cmd + dy * dy_cmd) / magnitude
            self.evidence[key] = self.evidence.get(key, 0.0) * EVIDENCE_DECAY + agreement

    def _elect_self(self, now: list[Component]) -> Component | None:
        """The body is whichever component the probe best supports."""
        if not now:
            return None
        scored = sorted(now, key=lambda c: -self.evidence.get(self._key(c), 0.0))
        best = scored[0]
        held = next((c for c in now if self._key(c) == self._self_key), None)
        if held is not None:
            best_score = self.evidence.get(self._key(best), 0.0)
            held_score = self.evidence.get(self._key(held), 0.0)
            if best_score < held_score + LATCH_MARGIN:
                return held
        # Commit only once the probe has actually spoken. Before that the pick
        # is provisional and re-run every frame.
        if self.evidence.get(self._key(best), 0.0) > 0:
            self._self_key = self._key(best)
        return best

    def _learn_step_size(self, me: Component) -> None:
        """The agent's own displacement IS the grid step. Measured, not imported."""
        if self._step_px is not None or self._last_action is None:
            return
        was = next((c for c in self._previous if self._key(c) == self._key(me)), None)
        if was is None:
            return
        moved = abs(me.cx - was.cx) + abs(me.cy - was.cy)
        if moved > 1e-6:
            self._step_px = moved

    def act(self, grid: Grid) -> GameAction:
        """One action, from pixels."""
        now = components(grid)
        self._update_evidence(now)
        me = self._elect_self(now)

        if me is None or len(now) < 2:
            # Nothing to steer by yet — probe, so the next frame has evidence.
            # This also covers the FIRST FRAME OF A LEVEL, which is measured to
            # contain the agent alone: the goal and the walls are drawn on the
            # frame after. Acting on a half-drawn world is precisely what put a
            # wall in the body's place in the CHIP-8 arena, so the rule here is
            # the same — when the world is not fully there, probe, do not decide.
            action = GameAction.ACTION4 if self._last_action is None else self._last_action
            self._previous, self._last_action = now, action
            return action

        self._learn_step_size(me)
        self._note_blocked_cell(me)
        self._last_self_cell = self._cell_of(me) if self._step_px else None

        targets = [c for c in now if self._key(c) != self._key(me)]
        # Route around what has been learned to be solid. Falls through to the
        # greedy heading while the occupancy map is still empty — which is most
        # of level 0, where there is nothing to route around.
        routed = self._route_step(me, targets, len(grid[0]), len(grid))
        if routed is not None:
            action = routed
        else:
            # Greedy heading toward the nearest non-self component.
            target = min(targets, key=me.distance_to)
            dx, dy = target.cx - me.cx, target.cy - me.cy
            if abs(dx) >= abs(dy) and abs(dx) > 1e-9:
                action = GameAction.ACTION4 if dx > 0 else GameAction.ACTION3
            elif abs(dy) > 1e-9:
                action = GameAction.ACTION2 if dy > 0 else GameAction.ACTION1
            else:
                action = GameAction.ACTION4

        self._previous, self._last_action = now, action
        return action
