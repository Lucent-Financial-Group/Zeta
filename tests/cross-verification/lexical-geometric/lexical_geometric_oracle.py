#!/usr/bin/env python3
"""Independent finite receipt oracle for the declared lexical-geometric fixture.

This deliberately reconstructs the contract's length-prefixed SHA-256 records
without importing the F# implementation or parsing its output.
"""

import hashlib
import struct
import sys
from dataclasses import dataclass


ALGORITHM = "declared-lexical-geometry-calibration/v1"
CALIBRATION_VERSION = "non-personal-fixture/v1"
SEED_VERSION = "nsm-english-candidate/v0"


@dataclass(frozen=True)
class Entry:
    seed_id: str
    rgb: str
    x: float
    y: float
    z: float
    uncertainty_ppm: int


def canonical_float(value: float) -> str:
    return format(value, ".17g")


def fingerprint(fields: list[str]) -> str:
    encoded = bytearray()
    for field in fields:
        data = field.encode("utf-8")
        encoded.extend(struct.pack("<i", len(data)))
        encoded.extend(data)
    return hashlib.sha256(encoded).hexdigest()


def entry_fingerprint(entry: Entry) -> str:
    return fingerprint(
        [
            ALGORITHM,
            entry.seed_id.lower(),
            entry.rgb.upper(),
            canonical_float(entry.x),
            canonical_float(entry.y),
            canonical_float(entry.z),
            str(entry.uncertainty_ppm),
        ]
    )


def project(entries: list[Entry], mutate: bool, reverse: bool, conflict: bool) -> str:
    if mutate:
        entries = [Entry("seed-i", "#FF0000", 0.75, 0.0, 0.0, 250_000), entries[1]]
    if reverse:
        entries = list(reversed(entries))
    calibration_id = fingerprint(
        [ALGORITHM, CALIBRATION_VERSION, SEED_VERSION]
        + sorted(entry_fingerprint(entry) for entry in entries)
    )
    by_seed: dict[str, list[Entry]] = {}
    for entry in entries:
        by_seed.setdefault(entry.seed_id, []).append(entry)
    forms = {"i": "seed-i", "you": "seed-you", "now": "seed-now"}
    rows: list[tuple[list[str], str]] = []
    for original in ["I", "you", "now", "unknown"]:
        normalized = original.lower()
        if conflict and normalized == "now":
            fields = ["conflict", original, normalized, "lexical-correction-conflict", "correction-a", "correction-b"]
        elif normalized not in forms:
            fields = ["unresolved-token", original, normalized]
        elif forms[normalized] not in by_seed:
            fields = ["unresolved-calibration", original, normalized, forms[normalized]]
        else:
            entry = by_seed[forms[normalized]][0]
            fields = [
                "resolved",
                original,
                normalized,
                entry.seed_id,
                entry.rgb.upper(),
                canonical_float(entry.x),
                canonical_float(entry.y),
                canonical_float(entry.z),
                str(entry.uncertainty_ppm),
                entry_fingerprint(entry),
            ]
        rows.append((fields, "|".join(fields)))
    receipt_id = fingerprint(
        [ALGORITHM, CALIBRATION_VERSION, SEED_VERSION, calibration_id, "I you now unknown", "i you now unknown"]
        + [field for fields, _ in rows for field in fields]
    )
    return "\n".join([f"calibration={calibration_id}", f"receipt={receipt_id}"] + [rendered for _, rendered in rows])


if __name__ == "__main__":
    arguments = set(sys.argv[1:])
    base_entries = [
        Entry("seed-i", "#FF0000", 0.25, 0.0, 0.0, 250_000),
        Entry("seed-you", "#00FF00", -0.5, 0.0, 0.0, 500_000),
    ]
    print(project(base_entries, "--mutate-coordinate" in arguments, "--reverse-calibration" in arguments, "--correction-conflict" in arguments))
