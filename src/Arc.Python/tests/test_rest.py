"""Contract and real loopback falsifiers for the optional ARC REST lane."""

from __future__ import annotations

import json
import socket
import subprocess
import sys
import time
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from typing import Self

import pytest

from zeta_arc.environments.chase import COLOR_AGENT
from zeta_arc.rest import (
    FRAME_HEIGHT,
    FRAME_WIDTH,
    ArcAction,
    ArcCommand,
    ArcEnvelope,
    ArcFeedbackKind,
    ArcMethod,
    ArcOutcome,
    ArcRequest,
    ArcResponse,
    ArcRestClient,
    UrllibArcTransport,
)


def _frame(agent_x: int = 8) -> list[list[list[int]]]:
    pixels = [[0 for _ in range(FRAME_WIDTH)] for _ in range(FRAME_HEIGHT)]
    for y in range(8, 16):
        for x in range(agent_x, agent_x + 8):
            pixels[y][x] = COLOR_AGENT
    return [pixels]


def _vendor_payload(*, agent_x: int = 8, guid: str = "run-1") -> dict[str, object]:
    return {
        "action_input": {"data": {}, "id": 0},
        "available_actions": [1, 2, 3, 4],
        "frame": _frame(agent_x),
        "game_id": "ztch",
        "guid": guid,
        "levels_completed": 0,
        "state": "NOT_FINISHED",
        "win_levels": 3,
    }


class RecordingTransport:
    def __init__(self, response: ArcResponse) -> None:
        self.response = response
        self.requests: list[ArcRequest] = []

    def send(self, outbound: ArcRequest) -> ArcOutcome[ArcResponse]:
        self.requests.append(outbound)
        return ArcOutcome.succeeded(self.response)


class InvalidUtf8Response:
    status = 200

    def __enter__(self) -> Self:
        return self

    def __exit__(self, *_args: object) -> None:
        return None

    def read(self) -> bytes:
        return b"\xff"


def test_client_pins_the_request_and_source_owned_text_envelope() -> None:
    transport = RecordingTransport(
        ArcResponse(200, json.dumps(_vendor_payload(), separators=(",", ":")))
    )
    result = ArcRestClient(transport).reset("ztch")

    assert result.feedback is None
    assert result.value is not None
    assert transport.requests == [
        ArcRequest(ArcMethod.POST, "/api/cmd/RESET", '{"game_id":"ztch"}')
    ]
    assert result.value.to_json() == json.dumps(
        {
            "action": {"id": "RESET"},
            "availableActions": ["ACTION1", "ACTION2", "ACTION3", "ACTION4"],
            "framesHex": [result.value.frames_hex[0]],
            "gameId": "ztch",
            "guid": "run-1",
            "levelsCompleted": 0,
            "schemaVersion": 1,
            "state": "NOT_FINISHED",
            "winLevels": 3,
        },
        separators=(",", ":"),
        sort_keys=True,
    )
    assert len(result.value.frames_hex[0]) == FRAME_WIDTH * FRAME_HEIGHT
    assert result.value.frames_hex[0][8 * FRAME_WIDTH + 8] == "9"


def test_open_scorecard_pins_the_required_server_lifecycle() -> None:
    transport = RecordingTransport(ArcResponse(200, '{"card_id":"card-1"}'))

    result = ArcRestClient(transport).open_scorecard()

    assert result == ArcOutcome.succeeded("card-1")
    assert transport.requests == [
        ArcRequest(
            ArcMethod.POST,
            "/api/scorecard/open",
            '{"tags":["agent"]}',
        )
    ]


@pytest.mark.parametrize(
    ("command", "message"),
    [
        (ArcCommand.simple(ArcAction.ACTION6), "ACTION6 requires a point"),
        (ArcCommand.at(-1, 0), "ACTION6 x must be an integer in 0..63"),
        (
            ArcCommand(ArcAction.ACTION1, point=ArcCommand.at(0, 0).point),
            "ACTION1 cannot carry a point",
        ),
    ],
)
def test_invalid_commands_are_typed_feedback(command: ArcCommand, message: str) -> None:
    transport = RecordingTransport(ArcResponse(200, "{}"))
    result = ArcRestClient(transport).step("ztch", "run-1", command)

    assert result.feedback is not None
    assert result.feedback.kind is ArcFeedbackKind.INVALID_ACTION
    assert result.feedback.message == message
    assert transport.requests == []


def test_schema_drift_is_typed_feedback() -> None:
    payload = _vendor_payload()
    payload["frame"] = [[[0]]]

    result = ArcEnvelope.from_vendor_json(json.dumps(payload))

    assert result.feedback is not None
    assert result.feedback.kind is ArcFeedbackKind.INVALID_ENVELOPE
    assert result.feedback.message == "frame[0] must have 64 rows"


def test_http_refusal_is_typed_feedback() -> None:
    transport = RecordingTransport(
        ArcResponse(400, '{"error":"VALIDATION_ERROR","message":"bad action"}')
    )

    result = ArcRestClient(transport).reset("ztch")

    assert result.feedback is not None
    assert result.feedback.kind is ArcFeedbackKind.HTTP
    assert result.feedback.status_code == 400
    assert result.feedback.message == "bad action"


def test_invalid_utf8_is_typed_feedback(monkeypatch: pytest.MonkeyPatch) -> None:
    def invalid_utf8(*_args: object, **_kwargs: object) -> InvalidUtf8Response:
        return InvalidUtf8Response()

    monkeypatch.setattr("zeta_arc.rest.request.urlopen", invalid_utf8)

    result = UrllibArcTransport("http://unused.invalid").send(
        ArcRequest(ArcMethod.GET, "/api/healthcheck")
    )

    assert result.feedback is not None
    assert result.feedback.kind is ArcFeedbackKind.INVALID_JSON


def _free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as listener:
        listener.bind(("127.0.0.1", 0))
        return int(listener.getsockname()[1])


@contextmanager
def _running_server(tmp_path: Path) -> Iterator[str]:
    port = _free_port()
    root = Path(__file__).resolve().parents[3]
    process = subprocess.Popen(
        [
            sys.executable,
            "-m",
            "zeta_arc.serve",
            "--host",
            "127.0.0.1",
            "--port",
            str(port),
            "--recordings-dir",
            str(tmp_path / "recordings"),
        ],
        cwd=root,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    base_url = f"http://127.0.0.1:{port}"
    probe = UrllibArcTransport(base_url, timeout_seconds=0.25)
    deadline = time.monotonic() + 15.0
    try:
        while time.monotonic() < deadline:
            health = probe.send(ArcRequest(ArcMethod.GET, "/api/healthcheck"))
            if health.value is not None and health.value.status_code == 200:
                break
            if process.poll() is not None:
                output = process.stdout.read() if process.stdout is not None else ""
                raise AssertionError(f"ARC server stopped during startup:\n{output}")
            time.sleep(0.05)
        else:
            raise AssertionError("ARC server did not become healthy")
        yield base_url
    finally:
        process.terminate()
        try:
            process.wait(timeout=5.0)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=5.0)


def test_real_listen_and_serve_loopback_moves_zetachase(tmp_path: Path) -> None:
    with _running_server(tmp_path) as base_url:
        client = ArcRestClient(UrllibArcTransport(base_url))
        scorecard = client.open_scorecard()

        assert scorecard.feedback is None
        assert scorecard.value is not None
        reset = client.reset("ztch-v1", card_id=scorecard.value)
        assert reset.feedback is None
        assert reset.value is not None
        moved = client.step(
            "ztch-v1",
            reset.value.guid,
            ArcCommand.simple(ArcAction.ACTION4),
        )

        assert moved.feedback is None
        assert moved.value is not None
        assert moved.value.guid == reset.value.guid
        assert moved.value.frames_hex != reset.value.frames_hex
        reset_frame = reset.value.frames_hex[-1]
        moved_frame = moved.value.frames_hex[-1]
        assert reset_frame[8 * FRAME_WIDTH + 8] == "9"
        assert moved_frame[8 * FRAME_WIDTH + 8] != "9"
        assert moved_frame[8 * FRAME_WIDTH + 16] == "9"
