"""Falsifiers for the pixel agent — the one that is not handed the answer.

Ground truth (`sprite.x`) is read HERE, in assertions only. The agent never
touches it; that is the whole point of the file.
"""

from __future__ import annotations

from zeta_arc.agent import PixelAgent
from zeta_arc.driver import advance, reset
from zeta_arc.environments.chase import CELL, ZetaChase
from zeta_arc.perception import background_colour, components
from zeta_arc.play import play


def _grid(game: ZetaChase, frame) -> list[list[int]]:
    return frame.frame[0]


def _true_cell(game: ZetaChase, tag: str) -> tuple[int, int]:
    s = game.current_level.get_sprites_by_tag(tag)[0]
    return s.x // CELL, s.y // CELL


def test_background_is_measured_not_hardcoded() -> None:
    """Recolour every pixel and the background is still found.

    Hardcoding 5 would pass on ZetaChase forever and break on the first ARC
    environment that paints its floor differently.
    """
    game = ZetaChase(seed=4)
    grid = _grid(game, reset(game))
    assert background_colour(grid) == 5
    shifted = [[v + 100 for v in row] for row in grid]
    assert background_colour(shifted) == 105
    assert len(components(shifted)) == len(components(grid))


def test_components_finds_exactly_the_two_sprites() -> None:
    game = ZetaChase(seed=4)
    found = components(_grid(game, reset(game)))
    assert len(found) == 2
    assert {c.area for c in found} == {CELL * CELL}


def test_the_agent_identifies_its_own_body_from_pixels() -> None:
    """The elected self must land on the real agent sprite, not the goal.

    Non-vacuous by construction: the two sprites are the SAME SIZE, so area
    cannot separate them, and the agent is never told which colour it wears.
    Only the response to its own actions can distinguish them.
    """
    game = ZetaChase(seed=4)
    frame = reset(game)
    agent = PixelAgent()
    for _ in range(4):
        frame = advance(game, agent.act(_grid(game, frame)))

    me = agent._elect_self(components(_grid(game, frame)))
    assert me is not None
    true_x, true_y = _true_cell(game, "agent")
    # Centroid is in pixels; the sprite occupies one CELL-sized block.
    assert abs(me.cx / CELL - true_x) < 1.0
    assert abs(me.cy / CELL - true_y) < 1.0
    # ...and it is NOT sitting on the goal.
    goal_x, goal_y = _true_cell(game, "goal")
    assert (round(me.cx / CELL), round(me.cy / CELL)) != (goal_x, goal_y)


def test_pixel_agent_clears_level_zero_without_reading_sprites() -> None:
    result = play(agent="pixel", seed=4)
    assert result["levels_cleared"] >= 1
    level0 = result["levels"][0]
    assert level0["solved"] is True
    # It pays for perception: the coordinate-reading `greedy` needs `optimal`
    # actions, this one needs a couple more to work out which blob it is.
    assert level0["actions"] > level0["optimal"]
    assert level0["actions"] <= level0["optimal"] + 4


def test_pixel_agent_beats_a_random_walk() -> None:
    """The benchmark has to discriminate, or the score above means nothing."""
    assert play(agent="pixel", seed=4)["environment_score"] > play(agent="random", seed=4)["environment_score"]


def test_episodes_replay_byte_identically() -> None:
    assert play(agent="pixel", seed=4) == play(agent="pixel", seed=4)


def test_the_probe_costs_exactly_one_blind_action() -> None:
    """Before any evidence exists the agent cannot know which blob it is, and
    it says so by probing rather than guessing a colour. After ONE commanded
    move the evidence is positive and the body is committed."""
    game = ZetaChase(seed=4)
    frame = reset(game)
    agent = PixelAgent()

    # The world must be driven by the action the agent ACTUALLY chose. An
    # earlier version of this test advanced with a hardcoded ACTION4 while the
    # agent had commanded something else; the agent scored -1.0 disagreement
    # and correctly refused to commit. That was the probe working and the test
    # being wrong — kept as a note, because it is exactly the confusion this
    # design exists to prevent.
    first = agent.act(_grid(game, frame))
    assert agent._self_key is None  # nothing has answered yet
    frame = advance(game, first)

    agent.act(_grid(game, frame))
    assert agent._self_key is not None
    assert max(agent.evidence.values()) > 0


def test_the_wall_level_is_cleared_and_the_wall_is_learned_by_bumping() -> None:
    """Level 1 puts a wall between start and goal. The agent is never told
    where it is — `_WALLS` is not imported here or in the agent.

    Non-vacuous three ways: level 1 is UNSOLVED without an occupancy map (the
    coordinate-reading `greedy` baseline still fails it), the agent must have
    learned at least one blocked cell to route around, and every blocked cell
    it learned must be a REAL wall cell rather than a guess.
    """
    from zeta_arc.environments.chase import _WALLS  # ground truth, assertions only

    game = ZetaChase(seed=4)
    frame = reset(game)
    agent = PixelAgent()
    for _ in range(120):
        frame = advance(game, agent.act(_grid(game, frame)))
        if game.level_index >= 2:
            break

    assert game.level_index >= 2, "level 1 (the wall level) was not cleared"
    assert agent.blocked, "nothing was learned to be solid — no occupancy map was built"
    real_walls = set(_WALLS[1]) | set(_WALLS[0])
    off_grid = {c for c in agent.blocked if not (0 <= c[0] < 8 and 0 <= c[1] < 8)}
    invented = agent.blocked - real_walls - off_grid
    assert not invented, f"marked cells solid that are not walls: {invented}"


def test_the_step_size_is_measured_not_imported() -> None:
    """The agent derives pixels-per-cell from its own displacement, so it does
    not depend on the environment's CELL constant."""
    game = ZetaChase(seed=4)
    frame = reset(game)
    agent = PixelAgent()
    assert agent._step_px is None
    for _ in range(4):
        frame = advance(game, agent.act(_grid(game, frame)))
    assert agent._step_px == float(CELL)


def test_the_wall_model_improves_the_score() -> None:
    """Routing must beat the coordinate-reading baseline, which has no
    occupancy map and dies on level 1."""
    pixel = play(agent="pixel", seed=4)
    greedy = play(agent="greedy", seed=4)
    assert pixel["levels_cleared"] > greedy["levels_cleared"]
    assert pixel["environment_score"] > greedy["environment_score"]
