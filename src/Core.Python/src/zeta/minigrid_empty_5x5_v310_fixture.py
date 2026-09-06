"""Upstream MiniGrid v3.1.0 Empty-5x5 source-conformance fixture.

This fixture calls the pinned upstream Python package. It does not import F#,
Zeta benchmark policy code, or any committed F# receipt. Its only purpose is to
emit one canonical upstream witness for an independently authored adapter.
"""

from __future__ import annotations

import argparse
import hashlib
import hmac
import importlib.metadata
import json
import struct
import sys
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol, cast

import gymnasium as gym
import minigrid
import numpy as np
import pygame
from minigrid import minigrid_env
from minigrid.core import actions, constants
from minigrid.envs import empty

ADAPTER_VERSION = "zeta.minigrid-empty-5x5-adapter/v1"
CARRIER_FINGERPRINT = "49db9a4f6fd415ba4f15b613eba858511e6cf116ec7574cd5ee50cc7c2e46b07"
CARRIER_PATH = Path(
    "docs/research/data/2026-09-06-minigrid-empty-5x5-v310-adapter-carrier.json"
)
EXPECTED_SOURCES = {
    "minigrid/envs/empty.py": "9daabf330a51023f5fe2a8884b9b6b26482ee489cbee68604712271e818e5ae6",
    "minigrid/minigrid_env.py": "23490887fbaadd8f4973b4375cd40a23b7636e7aedf59561f767315c36cd0371",
    "minigrid/core/actions.py": "787274f08bc91a76dba83b322ff5ee8fdb8ea7843cb706a1b5371029ac234e28",
    "minigrid/core/constants.py": "5e82c8765064461001b8a5e07b2c5f693ce65297418755a11d7917dacbd204ac",
}
ACTION_ROWS = (("left", 0), ("right", 1), ("forward", 2))
WITNESS_ACTIONS = (2, 2, 1, 2, 2)


class ImageArray(Protocol):
    """The finite image operations used only to digest the upstream reset observation."""

    dtype: object
    shape: tuple[int, ...]

    def tobytes(self) -> bytes: ...


class EmptyEnvPose(Protocol):
    """Upstream pose fields used in the explicit static-world projection only."""

    agent_dir: int
    agent_pos: Sequence[int]


@dataclass(frozen=True)
class Carrier:
    environment_id: str
    max_steps: int
    reset_observation_digest: str
    reset_seeds: tuple[int, ...]
    state_projection: str
    upstream_commit: str
    python: str
    minigrid_version: str
    gymnasium_version: str
    numpy_version: str
    pygame_ce_version: str


def _sha256(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def _string(mapping: dict[str, object], name: str) -> str:
    value = mapping.get(name)
    if not isinstance(value, str):
        raise TypeError(f"INVALID_CARRIER_SCHEMA: {name}")
    return value


def _integer(mapping: dict[str, object], name: str) -> int:
    value = mapping.get(name)
    if not isinstance(value, int) or isinstance(value, bool):
        raise TypeError(f"INVALID_CARRIER_SCHEMA: {name}")
    return value


def _mapping(value: object, name: str) -> dict[str, object]:
    if not isinstance(value, dict):
        raise TypeError(f"INVALID_CARRIER_SCHEMA: {name}")
    return cast(dict[str, object], value)


def _source_rows(value: object) -> dict[str, str]:
    if not isinstance(value, list):
        raise TypeError("INVALID_CARRIER_SCHEMA: upstream.sourceFiles")
    source_rows: dict[str, str] = {}
    for row in value:
        mapping = _mapping(row, "upstream.sourceFiles[]")
        source_rows[_string(mapping, "path")] = _string(mapping, "sha256")
    return source_rows


def _action_rows(value: object) -> tuple[tuple[str, int], ...]:
    if not isinstance(value, list):
        raise TypeError("INVALID_CARRIER_SCHEMA: actions")
    rows: list[tuple[str, int]] = []
    for row in value:
        mapping = _mapping(row, "actions[]")
        rows.append((_string(mapping, "name"), _integer(mapping, "integer")))
    return tuple(rows)


def _seed_rows(value: object) -> tuple[int, ...]:
    if not isinstance(value, list) or not all(
        isinstance(seed, int) and not isinstance(seed, bool) for seed in value
    ):
        raise TypeError("INVALID_CARRIER_SCHEMA: witness.seeds")
    return tuple(cast(list[int], value))


def validate_carrier_data(parsed: object) -> Carrier:
    root_mapping = _mapping(parsed, "root")
    upstream = _mapping(root_mapping.get("upstream"), "upstream")
    runtime = _mapping(root_mapping.get("fixtureRuntime"), "fixtureRuntime")
    environment = _mapping(root_mapping.get("environment"), "environment")
    witness = _mapping(root_mapping.get("witness"), "witness")

    if _string(root_mapping, "schemaVersion") != ADAPTER_VERSION:
        raise ValueError("INVALID_CARRIER_SCHEMA_VERSION")
    if _string(upstream, "commit") != "90928729376741a41222a257911343b97103b548":
        raise ValueError("UPSTREAM_IDENTITY_MISMATCH: commit")
    if _source_rows(upstream.get("sourceFiles")) != EXPECTED_SOURCES:
        raise ValueError("UPSTREAM_IDENTITY_MISMATCH: source files")
    if _string(root_mapping, "stateProjection") != "static-world-pose/v1":
        raise ValueError("INVALID_STATE_PROJECTION")
    if _string(environment, "id") != "MiniGrid-Empty-5x5-v0":
        raise ValueError("INVALID_ENVIRONMENT_ID")
    if _action_rows(root_mapping.get("actions")) != ACTION_ROWS:
        raise ValueError("INVALID_ACTION_MAPPING")
    if _seed_rows(witness.get("seeds")) != (42, 43):
        raise ValueError("INVALID_RESET_SEEDS")
    registry_kwargs = _mapping(environment.get("registryKwargs"), "registryKwargs")
    if _integer(registry_kwargs, "size") != 5:
        raise ValueError("INVALID_REGISTRY_KWARGS")
    return Carrier(
        environment_id=_string(environment, "id"),
        max_steps=_integer(environment, "maxSteps"),
        reset_observation_digest=_string(root_mapping, "resetObservationDigest"),
        reset_seeds=_seed_rows(witness.get("seeds")),
        state_projection=_string(root_mapping, "stateProjection"),
        upstream_commit=_string(upstream, "commit"),
        python=_string(runtime, "python"),
        minigrid_version=_string(runtime, "minigrid"),
        gymnasium_version=_string(runtime, "gymnasium"),
        numpy_version=_string(runtime, "numpy"),
        pygame_ce_version=_string(runtime, "pygameCe"),
    )


def load_verified_carrier(root: Path) -> Carrier:
    raw = (root / CARRIER_PATH).read_bytes()
    if _sha256(raw) != CARRIER_FINGERPRINT:
        raise ValueError("UPSTREAM_IDENTITY_MISMATCH: carrier SHA-256")
    return validate_carrier_data(json.loads(raw))


def _file_hash(module_file: str | None) -> str:
    if module_file is None:
        raise ValueError("UPSTREAM_IDENTITY_MISMATCH: module source unavailable")
    return _sha256(Path(module_file).read_bytes())


def validate_upstream_runtime(carrier: Carrier) -> None:
    runtime_rows = {
        "python": sys.version.split()[0],
        "minigrid": importlib.metadata.version("minigrid"),
        "gymnasium": importlib.metadata.version("gymnasium"),
        "numpy": np.__version__,
        "pygameCe": importlib.metadata.version("pygame-ce"),
    }
    expected_rows = {
        "python": carrier.python,
        "minigrid": carrier.minigrid_version,
        "gymnasium": carrier.gymnasium_version,
        "numpy": carrier.numpy_version,
        "pygameCe": carrier.pygame_ce_version,
    }
    if runtime_rows != expected_rows:
        raise ValueError("UPSTREAM_IDENTITY_MISMATCH: fixture runtime")
    source_rows = {
        "minigrid/envs/empty.py": _file_hash(empty.__file__),
        "minigrid/minigrid_env.py": _file_hash(minigrid_env.__file__),
        "minigrid/core/actions.py": _file_hash(actions.__file__),
        "minigrid/core/constants.py": _file_hash(constants.__file__),
    }
    if source_rows != EXPECTED_SOURCES:
        raise ValueError("UPSTREAM_IDENTITY_MISMATCH: installed source files")
    if pygame.version.ver != carrier.pygame_ce_version:
        raise ValueError("UPSTREAM_IDENTITY_MISMATCH: pygame runtime")
    if minigrid.__file__ is None:
        raise ValueError(
            "UPSTREAM_IDENTITY_MISMATCH: minigrid package source unavailable"
        )


def _observation_digest(observation: dict[str, object]) -> str:
    image = cast(ImageArray, observation["image"])
    payload = {
        "direction": int(cast(int, observation["direction"])),
        "imageDtype": str(image.dtype),
        "imageShape": list(image.shape),
        "imageSha256": _sha256(image.tobytes()),
        "mission": str(observation["mission"]),
    }
    return _sha256(json.dumps(payload, sort_keys=True, separators=(",", ":")).encode())


def _row(
    env: gym.Env[object, int],
    action: int,
    reward: float,
    terminated: bool,
    truncated: bool,
) -> dict[str, object]:
    unwrapped = cast(EmptyEnvPose, env.unwrapped)
    names = {0: "left", 1: "right", 2: "forward"}
    return {
        "action": names[action],
        "direction": int(unwrapped.agent_dir),
        "integer": action,
        "position": [int(value) for value in unwrapped.agent_pos],
        "rewardBinary64Bits": struct.pack(">d", reward).hex(),
        "rewardPpm": round(1_000_000 * reward),
        "terminated": terminated,
        "truncated": truncated,
    }


def run_upstream_witness(root: Path) -> dict[str, object]:
    carrier = load_verified_carrier(root)
    validate_upstream_runtime(carrier)
    env = cast(
        gym.Env[object, int],
        gym.make(carrier.environment_id, max_steps=carrier.max_steps),
    )
    traces: list[list[dict[str, object]]] = []
    reset_digests: list[str] = []
    try:
        for seed in carrier.reset_seeds:
            observation, _ = env.reset(seed=seed)
            typed_observation = cast(dict[str, object], observation)
            reset_digests.append(_observation_digest(typed_observation))
            trace: list[dict[str, object]] = []
            for action in WITNESS_ACTIONS:
                _, reward, terminated, truncated, _ = env.step(action)
                trace.append(_row(env, action, float(reward), terminated, truncated))
            traces.append(trace)
    finally:
        env.close()
    if not reset_digests or any(
        digest != carrier.reset_observation_digest for digest in reset_digests
    ):
        raise ValueError("UPSTREAM_IDENTITY_MISMATCH: reset observation")
    if any(trace != traces[0] for trace in traces[1:]):
        raise ValueError("STATIC_RESET_DIVERGENCE")
    return {
        "adapterVersion": ADAPTER_VERSION,
        "carrierFingerprint": CARRIER_FINGERPRINT,
        "environmentId": carrier.environment_id,
        "fixtureRuntime": {
            "gymnasium": carrier.gymnasium_version,
            "minigrid": carrier.minigrid_version,
            "numpy": carrier.numpy_version,
            "pygameCe": carrier.pygame_ce_version,
            "python": carrier.python,
        },
        "resetObservationDigest": carrier.reset_observation_digest,
        "resetSeeds": list(carrier.reset_seeds),
        "stateProjection": carrier.state_projection,
        "steps": traces[0],
        "upstreamCommit": carrier.upstream_commit,
    }


def render(receipt: dict[str, object]) -> bytes:
    return json.dumps(receipt, separators=(",", ":")).encode()


def _validate_receipt_shape(value: object) -> None:
    receipt = _mapping(value, "receipt")
    _string(receipt, "adapterVersion")
    _string(receipt, "carrierFingerprint")
    _string(receipt, "environmentId")
    runtime = _mapping(receipt.get("fixtureRuntime"), "receipt.fixtureRuntime")
    for name in ("gymnasium", "minigrid", "numpy", "pygameCe", "python"):
        _string(runtime, name)
    _string(receipt, "resetObservationDigest")
    _seed_rows(receipt.get("resetSeeds"))
    _string(receipt, "stateProjection")
    _string(receipt, "upstreamCommit")
    steps = receipt.get("steps")
    if not isinstance(steps, list):
        raise TypeError("INVALID_RECEIPT_SCHEMA: steps")
    for index, row in enumerate(steps):
        step = _mapping(row, f"receipt.steps[{index}]")
        _string(step, "action")
        _integer(step, "direction")
        _integer(step, "integer")
        position = step.get("position")
        if (
            not isinstance(position, list)
            or len(position) != 2
            or not all(
                isinstance(axis, int) and not isinstance(axis, bool)
                for axis in position
            )
        ):
            raise TypeError("INVALID_RECEIPT_SCHEMA: position")
        _string(step, "rewardBinary64Bits")
        _integer(step, "rewardPpm")
        if not isinstance(step.get("terminated"), bool):
            raise TypeError("INVALID_RECEIPT_SCHEMA: terminated")
        if not isinstance(step.get("truncated"), bool):
            raise TypeError("INVALID_RECEIPT_SCHEMA: truncated")


def verify_canonical_receipt(root: Path, candidate: bytes) -> None:
    try:
        parsed = json.loads(candidate)
        _validate_receipt_shape(parsed)
    except (json.JSONDecodeError, TypeError, ValueError) as error:
        raise ValueError(f"INVALID_RECEIPT_SCHEMA: {error}") from error
    expected = render(run_upstream_witness(root))
    if not hmac.compare_digest(expected, candidate):
        raise ValueError("NONCANONICAL_RECEIPT")


def repository_root(start: Path) -> Path:
    for candidate in (start, *start.parents):
        if (candidate / "Zeta.sln").is_file():
            return candidate
    raise ValueError("repository root with Zeta.sln not found")


def _main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=repository_root(Path.cwd()))
    arguments = parser.parse_args()
    sys.stdout.buffer.write(render(run_upstream_witness(arguments.root)))


if __name__ == "__main__":
    _main()
