"""A tiny source-owned ACTION6 environment for coordinate-field readout.

Three visible objects are plausible click targets. The lowest-colour object is
the winning target, which makes the existing object-centroid prior expose a
real three-point distribution before committing the deterministic tie-break.

This is a local integration instrument, not an ARC Prize environment.
"""

from __future__ import annotations

from arcengine import ARCBaseGame, GameAction, Level, Sprite

OBJECT_SIZE = 5
TARGET_X = 8
TARGET_Y = 10


def _square(colour: int) -> list[list[int]]:
    return [[colour] * OBJECT_SIZE for _ in range(OBJECT_SIZE)]


def _level() -> Level:
    return Level(
        sprites=[
            Sprite(
                pixels=_square(2),
                name="target",
                x=TARGET_X,
                y=TARGET_Y,
                tags=["target"],
                collidable=False,
            ),
            Sprite(
                pixels=_square(6),
                name="decoy-a",
                x=42,
                y=12,
                tags=["decoy"],
                collidable=False,
            ),
            Sprite(
                pixels=_square(9),
                name="decoy-b",
                x=26,
                y=46,
                tags=["decoy"],
                collidable=False,
            ),
        ],
        grid_size=(64, 64),
        name="click-target",
    )


class ZetaClickTarget(ARCBaseGame):
    """Win by clicking the target; all interaction is coordinate-valued."""

    def __init__(self, seed: int = 0) -> None:
        super().__init__(
            game_id="zeta-click-target",
            levels=[_level()],
            win_score=1,
            # Plain int for the same engine typing reason as the other local
            # environments: GameAction is not an IntEnum.
            available_actions=[6],
            seed=seed,
        )

    def step(self) -> None:
        if self.action.id is GameAction.RESET:
            self.complete_action()
            return
        if self.action.id is not GameAction.ACTION6:
            self.complete_action()
            return

        x = self.action.data.get("x")
        y = self.action.data.get("y")
        if isinstance(x, int) and isinstance(y, int):
            inside_target = (
                TARGET_X <= x < TARGET_X + OBJECT_SIZE
                and TARGET_Y <= y < TARGET_Y + OBJECT_SIZE
            )
            if inside_target:
                self.next_level()
        self.complete_action()
