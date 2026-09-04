"""Deterministic ARC session artifacts for static, keyless replay.

The browser cannot call the local ARC server, and the public arena must not
pretend that a committed session is live. This module executes a real
``ZetaChase`` instance through the toolkit's own action loop, projects each
observation through ``ArcEnvelope``, and emits one canonical JSON document.

The output contains no clock, random identifier, credential, or URL. Running
the generator twice therefore produces identical bytes, while a change to the
environment, action loop, or envelope is visible as golden-artifact drift.
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from arcengine import FrameData, GameAction

from zeta_arc.driver import advance, reset
from zeta_arc.environments.chase import ZetaChase
from zeta_arc.frames import grid_of, offered_actions
from zeta_arc.rest import ENVELOPE_VERSION, ArcAction, ArcCommand, ArcEnvelope

RECORDING_VERSION = 1
RECORDED_GAME_ID = "ztch-v1"
RECORDED_SESSION_ID = "ztch-v1-open-room-001"

# The level-zero shortest path. The final move crosses the level boundary, so
# the artifact exercises both ordinary frame evolution and completion state.
RECORDED_ACTIONS: tuple[GameAction, ...] = (
    *(GameAction.ACTION4 for _ in range(5)),
    *(GameAction.ACTION2 for _ in range(5)),
)


@dataclass(frozen=True)
class ArcRecordedStep:
    """One numbered observation in a replayable ARC session."""

    tick: int
    observation: ArcEnvelope

    def to_payload(self) -> dict[str, object]:
        return {
            "observation": json.loads(self.observation.to_json()),
            "tick": self.tick,
        }


@dataclass(frozen=True)
class ArcRecording:
    """Source-owned static replay contract for the browser arena."""

    game_id: str
    session_id: str
    title: str
    steps: tuple[ArcRecordedStep, ...]

    def to_json(self) -> str:
        payload = {
            "gameId": self.game_id,
            "kind": "arc-recorded-session",
            "recordingVersion": RECORDING_VERSION,
            "sessionId": self.session_id,
            "source": "zeta-authored-local-environment",
            "steps": [step.to_payload() for step in self.steps],
            "title": self.title,
        }
        return json.dumps(payload, indent=2, sort_keys=True) + "\n"


def _arc_action(action: GameAction) -> ArcAction:
    return ArcAction(action.name)


def _frame_hex(frame: FrameData) -> str:
    grid = grid_of(frame)
    if len(grid) != 64 or any(len(row) != 64 for row in grid):
        raise ValueError("recorded ARC frames must be 64x64")
    if any(cell < 0 or cell > 15 for row in grid for cell in row):
        raise ValueError("recorded ARC palette entries must be in 0..15")
    return "".join(format(cell, "x") for row in grid for cell in row)


def _envelope(frame: FrameData, action: GameAction) -> ArcEnvelope:
    state: Any = frame.state
    state_name = str(getattr(state, "value", state))
    return ArcEnvelope(
        schema_version=ENVELOPE_VERSION,
        game_id=RECORDED_GAME_ID,
        guid=RECORDED_SESSION_ID,
        levels_completed=int(frame.levels_completed),
        win_levels=int(frame.win_levels),
        state=state_name,
        action=ArcCommand.simple(_arc_action(action)),
        available_actions=tuple(_arc_action(item) for item in offered_actions(frame)),
        frames_hex=(_frame_hex(frame),),
    )


def record_default_session() -> ArcRecording:
    """Run the stable level-zero path and return its complete observation log."""
    game = ZetaChase(seed=0)
    first = reset(game)
    steps = [ArcRecordedStep(0, _envelope(first, GameAction.RESET))]
    for tick, action in enumerate(RECORDED_ACTIONS, start=1):
        steps.append(ArcRecordedStep(tick, _envelope(advance(game, action), action)))
    return ArcRecording(
        game_id=RECORDED_GAME_ID,
        session_id=RECORDED_SESSION_ID,
        title="ZetaChase: open-room level replay",
        steps=tuple(steps),
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, help="write canonical JSON to this path")
    args = parser.parse_args()
    text = record_default_session().to_json()
    if args.output is None:
        print(text, end="")
        return
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(text, encoding="utf-8")


if __name__ == "__main__":
    main()
