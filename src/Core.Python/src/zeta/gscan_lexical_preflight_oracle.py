"""Independent event-stream oracle for gSCAN lexical-admission receipts.

This module deliberately uses `ijson.parse` events instead of the production
reader's object-level `ijson.items` stream. It is test-only verification code;
it does not train, score, or execute a gSCAN model.
"""

from __future__ import annotations

import hashlib
import json
import os
import unicodedata
from collections.abc import Mapping
from dataclasses import dataclass, field
from typing import Final

import ijson  # type: ignore[import-untyped]


@dataclass
class _OracleState:
    """Typed accumulator for the event-stream pass.

    Replaces the previous `dict[str, object]` scratch map so mypy can prove
    every field's type instead of narrowing `object` at each use site.
    """

    example_count: int = 0
    command_count: int = 0
    command_form_count: int = 0
    resolved_form_count: int = 0
    resolved_seed_ids: set[str] = field(default_factory=set)
    unresolved_forms: set[str] = field(default_factory=set)


ORACLE_ALGORITHM: Final = "gscan-lexical-preflight-oracle/v1-event-stream"
PARSER: Final = "ijson-3.5.1"


def _file_hash(path: str) -> str:
    accumulator = hashlib.sha256()
    with open(path, "rb") as source:
        while block := source.read(65536):
            accumulator.update(block)
    return accumulator.hexdigest()


def _normalize(fragment: str) -> str:
    output: list[str] = []
    pending: list[str] = []
    for character in unicodedata.normalize("NFKC", fragment).casefold():
        if character.isalnum() or character in "'’-":
            pending.append(character)
        elif pending:
            output.append("".join(pending))
            pending = []
    if pending:
        output.append("".join(pending))
    return " ".join(output)


def _read_seed(path: str) -> tuple[str, dict[str, str]]:
    with open(path, encoding="utf-8") as source:
        raw = json.load(source)
    if (
        not isinstance(raw, Mapping)
        or not isinstance(raw.get("version"), str)
        or not isinstance(raw.get("entries"), list)
    ):
        raise TypeError("ENGLISH-SEED-SCHEMA")

    accepted: dict[str, str] = {}
    seen_ids: set[str] = set()
    for raw_entry in raw["entries"]:
        if not isinstance(raw_entry, Mapping):
            raise TypeError("ENGLISH-SEED-ENTRY-SCHEMA")
        identifier = raw_entry.get("id")
        exponent = raw_entry.get("exponent")
        alternatives = raw_entry.get("allolexes")
        category = raw_entry.get("category")
        frames = raw_entry.get("valencyFrames")
        if (
            not isinstance(identifier, str)
            or not identifier
            or identifier in seen_ids
            or not isinstance(exponent, str)
            or not exponent
            or not isinstance(alternatives, list)
            or not all(isinstance(item, str) and item for item in alternatives)
            or not isinstance(category, str)
            or not category
            or not isinstance(frames, list)
            or not all(isinstance(item, str) and item for item in frames)
        ):
            raise ValueError("ENGLISH-SEED-ENTRY-SCHEMA")
        seen_ids.add(identifier)
        for lexical_form in [exponent, *alternatives]:
            normalized = _normalize(lexical_form)
            if not normalized or normalized in accepted:
                raise ValueError(f"ENGLISH-SEED-DUPLICATE-FORM:{normalized}")
            accepted[normalized] = identifier
    return raw["version"], accepted


def _apply_command(
    command: str, accepted: Mapping[str, str], state: _OracleState
) -> None:
    forms = [_normalize(part) for part in command.split(",")]
    forms = [form for form in forms if form]
    if not forms:
        raise ValueError("GSCAN-COMMAND-EMPTY")
    state.command_form_count += len(forms)
    for form in forms:
        identifier = accepted.get(form)
        if identifier is None:
            state.unresolved_forms.add(form)
        else:
            state.resolved_form_count += 1
            state.resolved_seed_ids.add(identifier)


def inspect_gscan_lexical_preflight_oracle(
    dataset_path: str,
    seed_path: str,
    split_name: str,
    expected_dataset_sha256: str,
) -> dict[str, object]:
    """Independently reproduce the finite lexical-admission receipt."""

    observed_hash = _file_hash(dataset_path)
    base: dict[str, object] = {
        "algorithm": ORACLE_ALGORITHM,
        "parser": PARSER,
        "dataset_sha256": observed_hash,
        "expected_dataset_sha256": expected_dataset_sha256,
        "dataset_bytes": os.path.getsize(dataset_path),
        "split_name": split_name,
    }
    if observed_hash != expected_dataset_sha256:
        return {
            **base,
            "status": "dataset-hash-mismatch",
            "reason": "GSCAN-DATASET-HASH-MISMATCH",
        }

    try:
        seed_version, accepted = _read_seed(seed_path)
    except (
        OSError,
        TypeError,
        UnicodeDecodeError,
        json.JSONDecodeError,
        ValueError,
    ) as error:
        return {**base, "status": "malformed-seed", "reason": str(error)}

    example_prefix = f"examples.{split_name}.item"
    command_prefix = f"{example_prefix}.command"
    state = _OracleState()
    try:
        with open(dataset_path, "rb") as source:
            for prefix, event, value in ijson.parse(source):
                if prefix == example_prefix and event == "start_map":
                    state.example_count += 1
                elif prefix == command_prefix:
                    if event != "string" or not isinstance(value, str):
                        raise TypeError(
                            f"GSCAN-DATASET-COMMAND-SCHEMA:{state.command_count}"
                        )
                    state.command_count += 1
                    _apply_command(value, accepted, state)
    except (OSError, TypeError, ValueError, ijson.JSONError) as error:
        return {**base, "status": "malformed-dataset", "reason": str(error)}

    example_count = state.example_count
    command_count = state.command_count
    if example_count == 0:
        return {
            **base,
            "status": "malformed-dataset",
            "reason": f"GSCAN-DATASET-SPLIT-MISSING:{split_name}",
        }
    if example_count != command_count:
        return {
            **base,
            "status": "malformed-dataset",
            "reason": f"GSCAN-DATASET-COMMAND-COUNT:{command_count}-OF-{example_count}",
        }

    command_form_count = state.command_form_count
    resolved_form_count = state.resolved_form_count
    return {
        **base,
        "status": "preflight-lexically-covered"
        if not state.unresolved_forms
        else "preflight-unresolved",
        "seed_version": seed_version,
        "example_count": example_count,
        "command_form_count": command_form_count,
        "resolved_form_count": resolved_form_count,
        "unresolved_form_count": command_form_count - resolved_form_count,
        "resolved_seed_ids": sorted(state.resolved_seed_ids),
        "unresolved_forms": sorted(state.unresolved_forms),
    }
