#!/usr/bin/env python3
"""Compare the independently produced UCI signed-probit benchmark receipts."""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path


def load(path: str) -> dict[str, object]:
    result = json.loads(Path(path).read_text(encoding="utf-8"))
    if not isinstance(result, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return result


def numeric(record: dict[str, object], key: str) -> float:
    value = record.get(key)
    if not isinstance(value, (int, float)) or isinstance(value, bool) or not math.isfinite(value):
        raise ValueError(f"{key} must be finite")
    return float(value)


def main() -> int:
    if len(sys.argv) != 3:
        raise SystemExit("usage: bank_marketing_compare.py <ep-receipt.json> <exact-receipt.json>")

    ep = load(sys.argv[1])
    exact = load(sys.argv[2])
    if ep.get("status") != "Ready":
        raise ValueError("EP receipt must be ready")
    ep_groups = ep.get("groups")
    exact_groups = exact.get("groups")
    if not isinstance(ep_groups, list) or not isinstance(exact_groups, list) or len(ep_groups) != 3 or len(exact_groups) != 3:
        raise ValueError("both receipts must contain exactly three declared groups")

    exact_by_group: dict[str, dict[str, object]] = {}
    for record in exact_groups:
        if not isinstance(record, dict) or not isinstance(record.get("group"), str):
            raise ValueError("exact group schema is invalid")
        exact_by_group[record["group"]] = record

    deltas = []
    for record in ep_groups:
        if not isinstance(record, dict) or not isinstance(record.get("group"), str):
            raise ValueError("EP group schema is invalid")
        name = record["group"]
        peer = exact_by_group.get(name)
        if peer is None:
            raise ValueError(f"missing exact group {name}")
        count = record.get("count")
        successes = record.get("successes")
        if count != peer.get("count") or successes != peer.get("successes"):
            raise ValueError(f"count mismatch for {name}")
        deltas.append(
            {
                "group": name,
                "count": count,
                "successes": successes,
                "absoluteMeanError": abs(numeric(record, "mean") - numeric(peer, "mean")),
                "absoluteVarianceError": abs(numeric(record, "variance") - numeric(peer, "variance")),
                "absolutePredictiveError": abs(numeric(record, "predictive") - numeric(peer, "predictive")),
            }
        )

    output = {
        "status": "Compared",
        "csvSha256": ep.get("csvSha256"),
        "canonicalInputFingerprint": ep.get("canonicalInputFingerprint"),
        "trainingRows": ep.get("trainingRows"),
        "heldOutRows": ep.get("heldOutRows"),
        "baseline": numeric(ep, "baseline"),
        "epBrier": numeric(ep, "epBrier"),
        "baselineBrier": numeric(ep, "baselineBrier"),
        "brierDeltaEpMinusBaseline": numeric(ep, "epBrier") - numeric(ep, "baselineBrier"),
        "epNlpd": numeric(ep, "epNlpd"),
        "baselineNlpd": numeric(ep, "baselineNlpd"),
        "nlpdDeltaEpMinusBaseline": numeric(ep, "epNlpd") - numeric(ep, "baselineNlpd"),
        "groups": deltas,
    }
    print(json.dumps(output, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
