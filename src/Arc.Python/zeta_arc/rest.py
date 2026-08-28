"""Source-owned ARC REST contract and the thin toolkit adapter.

Only :class:`UrllibArcTransport` knows HTTP. ``ArcRestClient`` speaks through
the injected ``ArcTransport`` protocol and converts the toolkit's pre-1.0 JSON
into ``ArcEnvelope``. Callers therefore depend on our stable text contract,
not Flask, requests, pydantic, ``arc_agi``, or ``arcengine``.

The public boundary returns ``ArcOutcome`` for every refusal. HTTP failures,
invalid actions, invalid UTF-8, and schema drift are feedback values; none of
them escape as exceptions.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from enum import Enum
from typing import Protocol
from urllib import error, request

FRAME_WIDTH = 64
FRAME_HEIGHT = 64
PALETTE_SIZE = 16
ENVELOPE_VERSION = 1


class ArcFeedbackKind(str, Enum):
    """Stable refusal categories at the client boundary."""

    INVALID_ACTION = "invalid-action"
    TRANSPORT = "transport"
    HTTP = "http"
    INVALID_JSON = "invalid-json"
    INVALID_ENVELOPE = "invalid-envelope"


@dataclass(frozen=True)
class ArcFeedback:
    kind: ArcFeedbackKind
    message: str
    status_code: int | None = None
    body: str | None = None


@dataclass(frozen=True)
class ArcOutcome[T]:
    """A value or typed feedback; exactly one is populated."""

    value: T | None = None
    feedback: ArcFeedback | None = None

    @property
    def is_ok(self) -> bool:
        return self.feedback is None

    @classmethod
    def succeeded(cls, value: T) -> ArcOutcome[T]:
        return cls(value=value)

    @classmethod
    def refused(cls, feedback: ArcFeedback) -> ArcOutcome[T]:
        return cls(feedback=feedback)


class ArcMethod(str, Enum):
    GET = "GET"
    POST = "POST"


@dataclass(frozen=True)
class ArcRequest:
    method: ArcMethod
    path: str
    body: str = ""


@dataclass(frozen=True)
class ArcResponse:
    status_code: int
    body: str


class ArcTransport(Protocol):
    """Hexagonal port for the one impure operation in the ARC client."""

    def send(self, outbound: ArcRequest) -> ArcOutcome[ArcResponse]: ...


class ArcAction(str, Enum):
    RESET = "RESET"
    ACTION1 = "ACTION1"
    ACTION2 = "ACTION2"
    ACTION3 = "ACTION3"
    ACTION4 = "ACTION4"
    ACTION5 = "ACTION5"
    ACTION6 = "ACTION6"
    ACTION7 = "ACTION7"


_ACTION_BY_VENDOR_ID: dict[int, ArcAction] = {
    index: action for index, action in enumerate(ArcAction)
}


@dataclass(frozen=True)
class ArcPoint:
    x: int
    y: int


@dataclass(frozen=True)
class ArcCommand:
    action: ArcAction
    point: ArcPoint | None = None

    @staticmethod
    def reset() -> ArcCommand:
        return ArcCommand(ArcAction.RESET)

    @staticmethod
    def simple(action: ArcAction) -> ArcCommand:
        return ArcCommand(action)

    @staticmethod
    def at(x: int, y: int) -> ArcCommand:
        return ArcCommand(ArcAction.ACTION6, ArcPoint(x, y))


@dataclass(frozen=True)
class ArcEnvelope:
    """Versioned, deterministic text projection of one ARC observation."""

    schema_version: int
    game_id: str
    guid: str
    levels_completed: int
    win_levels: int
    state: str
    action: ArcCommand
    available_actions: tuple[ArcAction, ...]
    frames_hex: tuple[str, ...]

    def to_json(self) -> str:
        point = self.action.point
        action: dict[str, object] = {"id": self.action.action.value}
        if point is not None:
            action["point"] = {"x": point.x, "y": point.y}

        payload = {
            "action": action,
            "availableActions": [item.value for item in self.available_actions],
            "framesHex": list(self.frames_hex),
            "gameId": self.game_id,
            "guid": self.guid,
            "levelsCompleted": self.levels_completed,
            "schemaVersion": self.schema_version,
            "state": self.state,
            "winLevels": self.win_levels,
        }
        return json.dumps(payload, separators=(",", ":"), sort_keys=True)

    @classmethod
    def from_vendor_json(cls, text: str) -> ArcOutcome[ArcEnvelope]:
        try:
            payload = json.loads(text)
        except (json.JSONDecodeError, UnicodeError) as exc:
            return ArcOutcome.refused(
                ArcFeedback(ArcFeedbackKind.INVALID_JSON, str(exc), body=text)
            )

        if not isinstance(payload, dict):
            return _invalid_envelope("root must be a JSON object", text)

        game_id = payload.get("game_id")
        if not isinstance(game_id, str) or not game_id:
            return _invalid_envelope("game_id must be a non-empty string", text)

        guid = payload.get("guid")
        if not isinstance(guid, str) or not guid:
            return _invalid_envelope("guid must be a non-empty string", text)

        levels_completed = _bounded_int(payload.get("levels_completed"), 0, 254)
        if levels_completed is None:
            return _invalid_envelope(
                "levels_completed must be an integer in 0..254", text
            )

        win_levels = _bounded_int(payload.get("win_levels"), 0, 254)
        if win_levels is None:
            return _invalid_envelope("win_levels must be an integer in 0..254", text)

        state = payload.get("state")
        if state not in {"NOT_PLAYED", "NOT_FINISHED", "WIN", "GAME_OVER"}:
            return _invalid_envelope("state is not a known ARC state", text)

        parsed_action, action_error = _parse_vendor_action(payload.get("action_input"))
        if action_error is not None or parsed_action is None:
            return _invalid_envelope(action_error or "action_input is invalid", text)

        available, available_error = _parse_available_actions(
            payload.get("available_actions")
        )
        if available_error is not None or available is None:
            return _invalid_envelope(
                available_error or "available_actions is invalid", text
            )

        frames, frame_error = _encode_vendor_frames(payload.get("frame"))
        if frame_error is not None or frames is None:
            return _invalid_envelope(frame_error or "frame is invalid", text)

        return ArcOutcome.succeeded(
            cls(
                schema_version=ENVELOPE_VERSION,
                game_id=game_id,
                guid=guid,
                levels_completed=levels_completed,
                win_levels=win_levels,
                state=state,
                action=parsed_action,
                available_actions=available,
                frames_hex=frames,
            )
        )


class ArcRestClient:
    """Toolkit-independent client over an injected ``ArcTransport``."""

    def __init__(self, transport: ArcTransport) -> None:
        self._transport = transport

    def open_scorecard(self) -> ArcOutcome[str]:
        """Open the server-side run required before the first local reset."""
        sent = self._transport.send(
            ArcRequest(
                ArcMethod.POST,
                "/api/scorecard/open",
                '{"tags":["agent"]}',
            )
        )
        if sent.feedback is not None:
            return ArcOutcome.refused(sent.feedback)
        if sent.value is None:
            return ArcOutcome.refused(
                ArcFeedback(
                    ArcFeedbackKind.TRANSPORT,
                    "transport returned neither a response nor feedback",
                )
            )
        response = sent.value
        if not 200 <= response.status_code < 300:
            return ArcOutcome.refused(
                ArcFeedback(
                    ArcFeedbackKind.HTTP,
                    _http_message(response.body),
                    status_code=response.status_code,
                    body=response.body,
                )
            )
        try:
            payload = json.loads(response.body)
        except (json.JSONDecodeError, UnicodeError) as exc:
            return ArcOutcome.refused(
                ArcFeedback(
                    ArcFeedbackKind.INVALID_JSON,
                    str(exc),
                    body=response.body,
                )
            )
        if not isinstance(payload, dict):
            return ArcOutcome.refused(
                ArcFeedback(
                    ArcFeedbackKind.INVALID_ENVELOPE,
                    "scorecard response must be a JSON object",
                    body=response.body,
                )
            )
        card_id = payload.get("card_id")
        if not isinstance(card_id, str) or not card_id:
            return ArcOutcome.refused(
                ArcFeedback(
                    ArcFeedbackKind.INVALID_ENVELOPE,
                    "scorecard response must contain a non-empty card_id",
                    body=response.body,
                )
            )
        return ArcOutcome.succeeded(card_id)

    def reset(
        self, game_id: str, card_id: str | None = None
    ) -> ArcOutcome[ArcEnvelope]:
        return self._execute(game_id, None, ArcCommand.reset(), card_id)

    def step(
        self,
        game_id: str,
        guid: str,
        command: ArcCommand,
        card_id: str | None = None,
    ) -> ArcOutcome[ArcEnvelope]:
        return self._execute(game_id, guid, command, card_id)

    def _execute(
        self,
        game_id: str,
        guid: str | None,
        command: ArcCommand,
        card_id: str | None,
    ) -> ArcOutcome[ArcEnvelope]:
        feedback = _validate_command(command)
        if feedback is not None:
            return ArcOutcome.refused(feedback)
        if not game_id:
            return ArcOutcome.refused(
                ArcFeedback(
                    ArcFeedbackKind.INVALID_ACTION,
                    "game_id must be non-empty",
                )
            )
        if command.action is not ArcAction.RESET and not guid:
            return ArcOutcome.refused(
                ArcFeedback(
                    ArcFeedbackKind.INVALID_ACTION,
                    "guid is required after RESET",
                )
            )

        payload: dict[str, object] = {"game_id": game_id}
        if guid is not None:
            payload["guid"] = guid
        if card_id is not None:
            payload["card_id"] = card_id
        if command.point is not None:
            payload["x"] = command.point.x
            payload["y"] = command.point.y

        outbound = ArcRequest(
            ArcMethod.POST,
            f"/api/cmd/{command.action.value}",
            json.dumps(payload, separators=(",", ":"), sort_keys=True),
        )
        sent = self._transport.send(outbound)
        if sent.feedback is not None:
            return ArcOutcome.refused(sent.feedback)
        if sent.value is None:
            return ArcOutcome.refused(
                ArcFeedback(
                    ArcFeedbackKind.TRANSPORT,
                    "transport returned neither a response nor feedback",
                )
            )

        response = sent.value
        if not 200 <= response.status_code < 300:
            return ArcOutcome.refused(
                ArcFeedback(
                    ArcFeedbackKind.HTTP,
                    _http_message(response.body),
                    status_code=response.status_code,
                    body=response.body,
                )
            )
        return ArcEnvelope.from_vendor_json(response.body)


class UrllibArcTransport:
    """Thin standard-library HTTP edge; no toolkit or requests dependency."""

    def __init__(
        self,
        base_url: str,
        api_key: str | None = None,
        timeout_seconds: float = 10.0,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key
        self._timeout_seconds = timeout_seconds

    def send(self, outbound: ArcRequest) -> ArcOutcome[ArcResponse]:
        headers = {"Accept": "application/json"}
        body = outbound.body.encode("utf-8") if outbound.body else None
        if body is not None:
            headers["Content-Type"] = "application/json"
        if self._api_key:
            headers["X-API-Key"] = self._api_key

        try:
            req = request.Request(
                f"{self._base_url}{outbound.path}",
                data=body,
                headers=headers,
                method=outbound.method.value,
            )
            with request.urlopen(req, timeout=self._timeout_seconds) as response:
                try:
                    text = response.read().decode("utf-8")
                except UnicodeError as exc:
                    return ArcOutcome.refused(
                        ArcFeedback(ArcFeedbackKind.INVALID_JSON, str(exc))
                    )
                return ArcOutcome.succeeded(ArcResponse(response.status, text))
        except error.HTTPError as exc:
            try:
                text = exc.read().decode("utf-8")
            except (OSError, UnicodeError):
                text = ""
            return ArcOutcome.succeeded(ArcResponse(exc.code, text))
        except (error.URLError, TimeoutError, OSError, ValueError) as exc:
            return ArcOutcome.refused(ArcFeedback(ArcFeedbackKind.TRANSPORT, str(exc)))


def _validate_command(command: ArcCommand) -> ArcFeedback | None:
    point = command.point
    if command.action is ArcAction.ACTION6:
        if point is None:
            return ArcFeedback(
                ArcFeedbackKind.INVALID_ACTION,
                "ACTION6 requires a point",
            )
        if _bounded_int(point.x, 0, FRAME_WIDTH - 1) is None:
            return ArcFeedback(
                ArcFeedbackKind.INVALID_ACTION,
                "ACTION6 x must be an integer in 0..63",
            )
        if _bounded_int(point.y, 0, FRAME_HEIGHT - 1) is None:
            return ArcFeedback(
                ArcFeedbackKind.INVALID_ACTION,
                "ACTION6 y must be an integer in 0..63",
            )
    elif point is not None:
        return ArcFeedback(
            ArcFeedbackKind.INVALID_ACTION,
            f"{command.action.value} cannot carry a point",
        )
    return None


def _bounded_int(value: object, minimum: int, maximum: int) -> int | None:
    if isinstance(value, bool) or not isinstance(value, int):
        return None
    return value if minimum <= value <= maximum else None


def _parse_vendor_action(value: object) -> tuple[ArcCommand | None, str | None]:
    if not isinstance(value, dict):
        return None, "action_input must be an object"
    vendor_id = _bounded_int(value.get("id"), 0, 7)
    if vendor_id is None:
        return None, "action_input.id must be an integer in 0..7"
    action = _ACTION_BY_VENDOR_ID[vendor_id]
    data = value.get("data")
    if not isinstance(data, dict):
        return None, "action_input.data must be an object"
    if action is not ArcAction.ACTION6:
        return ArcCommand.simple(action), None

    x = _bounded_int(data.get("x"), 0, FRAME_WIDTH - 1)
    y = _bounded_int(data.get("y"), 0, FRAME_HEIGHT - 1)
    if x is None or y is None:
        return None, "ACTION6 action_input.data must contain x and y in 0..63"
    return ArcCommand.at(x, y), None


def _parse_available_actions(
    value: object,
) -> tuple[tuple[ArcAction, ...] | None, str | None]:
    if not isinstance(value, list):
        return None, "available_actions must be an array"
    actions: list[ArcAction] = []
    for item in value:
        vendor_id = _bounded_int(item, 0, 7)
        if vendor_id is None:
            return None, "available_actions entries must be integers in 0..7"
        action = _ACTION_BY_VENDOR_ID[vendor_id]
        if action in actions:
            return None, "available_actions must not contain duplicates"
        actions.append(action)
    return tuple(actions), None


def _encode_vendor_frames(
    value: object,
) -> tuple[tuple[str, ...] | None, str | None]:
    if not isinstance(value, list) or not value:
        return None, "frame must contain at least one rendered frame"
    encoded: list[str] = []
    for frame_index, frame in enumerate(value):
        if not isinstance(frame, list) or len(frame) != FRAME_HEIGHT:
            return None, f"frame[{frame_index}] must have 64 rows"
        cells: list[str] = []
        for row_index, row in enumerate(frame):
            if not isinstance(row, list) or len(row) != FRAME_WIDTH:
                return None, f"frame[{frame_index}][{row_index}] must have 64 cells"
            for cell in row:
                palette = _bounded_int(cell, 0, PALETTE_SIZE - 1)
                if palette is None:
                    return None, "frame palette entries must be integers in 0..15"
                cells.append(format(palette, "x"))
        encoded.append("".join(cells))
    return tuple(encoded), None


def _invalid_envelope(message: str, body: str) -> ArcOutcome[ArcEnvelope]:
    return ArcOutcome.refused(
        ArcFeedback(ArcFeedbackKind.INVALID_ENVELOPE, message, body=body)
    )


def _http_message(body: str) -> str:
    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        return "ARC server refused the request"
    if isinstance(payload, dict):
        message = payload.get("message") or payload.get("error")
        if isinstance(message, str) and message:
            return message
    return "ARC server refused the request"
