"""Bounded-memory lexical-admission preflight for a pinned gSCAN JSON carrier.

This diagnostic emits source and seed coverage receipts.  It does not assign
coordinates, train a model, execute actions, or claim language understanding.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import unicodedata
from collections.abc import Mapping
from typing import BinaryIO, Final

import ijson  # type: ignore[import-untyped]

ALGORITHM: Final = "gscan-lexical-preflight/v2-streaming"
PARSER: Final = "ijson-3.5.1"


def _sha256_file(path: str) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as source:
        for chunk in iter(lambda: source.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _normalized_words(source: str) -> str:
    normalized = unicodedata.normalize("NFKC", source).lower()
    words: list[str] = []
    current: list[str] = []
    for character in normalized:
        if character.isalnum() or character in "'’-":
            current.append(character)
        elif current:
            words.append("".join(current))
            current = []
    if current:
        words.append("".join(current))
    return " ".join(words)


def _seed_form_index(seed_json: object) -> tuple[str, dict[str, str]]:
    if not isinstance(seed_json, Mapping):
        raise TypeError("ENGLISH-SEED-SCHEMA")
    version = seed_json.get("version")
    entries = seed_json.get("entries")
    if not isinstance(version, str) or not version or not isinstance(entries, list):
        raise ValueError("ENGLISH-SEED-SCHEMA")

    forms: dict[str, str] = {}
    ids: set[str] = set()
    for raw_entry in entries:
        if not isinstance(raw_entry, Mapping):
            raise TypeError("ENGLISH-SEED-ENTRY-SCHEMA")
        entry_id = raw_entry.get("id")
        exponent = raw_entry.get("exponent")
        allolexes = raw_entry.get("allolexes")
        category = raw_entry.get("category")
        frames = raw_entry.get("valencyFrames")
        if (
            not isinstance(entry_id, str)
            or not entry_id
            or not isinstance(exponent, str)
            or not exponent
            or not isinstance(category, str)
            or not category
            or not isinstance(allolexes, list)
            or not all(isinstance(value, str) and value for value in allolexes)
            or not isinstance(frames, list)
            or not all(isinstance(value, str) and value for value in frames)
            or entry_id in ids
        ):
            raise ValueError("ENGLISH-SEED-ENTRY-SCHEMA")
        ids.add(entry_id)
        for source_form in [exponent, *allolexes]:
            form = _normalized_words(source_form)
            if not form or form in forms:
                raise ValueError(f"ENGLISH-SEED-DUPLICATE-FORM:{form}")
            forms[form] = entry_id
    return version, forms


def _command_forms(command: str) -> list[str]:
    forms = [_normalized_words(part) for part in command.split(",")]
    nonempty = [form for form in forms if form]
    if not nonempty:
        raise ValueError("GSCAN-COMMAND-EMPTY")
    return nonempty


def _stream_examples(dataset_path: str, split_name: str) -> BinaryIO:
    return open(dataset_path, "rb")


def inspect_gscan_lexical_preflight(
    dataset_path: str,
    seed_path: str,
    split_name: str,
    expected_dataset_sha256: str,
) -> dict[str, object]:
    """Emit a deterministic lexical-admission receipt without constructing the dataset."""

    observed_hash = _sha256_file(dataset_path)
    base: dict[str, object] = {
        "algorithm": ALGORITHM,
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
        with open(seed_path, encoding="utf-8") as seed_file:
            seed_version, forms = _seed_form_index(json.load(seed_file))
    except (
        OSError,
        UnicodeDecodeError,
        json.JSONDecodeError,
        TypeError,
        ValueError,
    ) as error:
        return {**base, "status": "malformed-seed", "reason": str(error)}

    resolved_ids: set[str] = set()
    unresolved_forms: set[str] = set()
    example_count = 0
    command_form_count = 0
    resolved_form_count = 0
    try:
        with _stream_examples(dataset_path, split_name) as dataset_file:
            for example in ijson.items(dataset_file, f"examples.{split_name}.item"):
                if not isinstance(example, Mapping):
                    raise TypeError(f"GSCAN-DATASET-EXAMPLE-SCHEMA:{example_count}")
                command = example.get("command")
                if not isinstance(command, str):
                    raise TypeError(f"GSCAN-DATASET-COMMAND-SCHEMA:{example_count}")
                example_count += 1
                for form in _command_forms(command):
                    command_form_count += 1
                    seed_id = forms.get(form)
                    if seed_id is None:
                        unresolved_forms.add(form)
                    else:
                        resolved_form_count += 1
                        resolved_ids.add(seed_id)
    except (OSError, TypeError, ValueError, ijson.JSONError) as error:
        return {**base, "status": "malformed-dataset", "reason": str(error)}

    if example_count == 0:
        return {
            **base,
            "status": "malformed-dataset",
            "reason": f"GSCAN-DATASET-SPLIT-MISSING:{split_name}",
        }

    ordered_unresolved = sorted(unresolved_forms)
    return {
        **base,
        "status": "preflight-lexically-covered"
        if not ordered_unresolved
        else "preflight-unresolved",
        "seed_version": seed_version,
        "example_count": example_count,
        "command_form_count": command_form_count,
        "resolved_form_count": resolved_form_count,
        "unresolved_form_count": command_form_count - resolved_form_count,
        "resolved_seed_ids": sorted(resolved_ids),
        "unresolved_forms": ordered_unresolved,
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Bounded-memory gSCAN lexical-admission preflight"
    )
    parser.add_argument(
        "dataset", help="explicit path to gSCAN dataset.txt JSON member"
    )
    parser.add_argument("seed", help="explicit path to a versioned English seed JSON")
    parser.add_argument("split", help="named gSCAN split to inspect")
    parser.add_argument(
        "expected_sha256", help="expected SHA-256 of the explicit dataset file"
    )
    arguments = parser.parse_args()
    receipt = inspect_gscan_lexical_preflight(
        arguments.dataset, arguments.seed, arguments.split, arguments.expected_sha256
    )
    print(json.dumps(receipt, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
