#!/usr/bin/env python3
"""Verify the recorded benchmark result against fresh F# and independent outputs."""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path


def load(path: str) -> dict[str, object]:
    value = json.loads(Path(path).read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return value


def as_record(value: object, label: str) -> dict[str, object]:
    if not isinstance(value, dict):
        raise ValueError(f"{label} must be an object")
    return value


def numeric(record: dict[str, object], key: str, label: str) -> float:
    value = record.get(key)
    if not isinstance(value, (int, float)) or isinstance(value, bool) or not math.isfinite(value):
        raise ValueError(f"{label}.{key} must be a finite number")
    return float(value)


def require_equal(label: str, actual: object, expected: object) -> None:
    if actual != expected:
        raise AssertionError(f"{label}: expected {expected!r}, received {actual!r}")


def require_close(label: str, actual: float, expected: float, tolerance: float = 1e-15) -> None:
    if abs(actual - expected) > tolerance:
        raise AssertionError(f"{label}: expected {expected:.17g}, received {actual:.17g}, tolerance {tolerance:.17g}")


def main() -> int:
    if len(sys.argv) != 3:
        raise SystemExit("usage: verify_bank_marketing_result.py <recorded-result.json> <fresh-comparison.json>")
    recorded = load(sys.argv[1])
    fresh = load(sys.argv[2])
    source = as_record(recorded.get("source"), "recorded.source")
    split = as_record(recorded.get("split"), "recorded.split")
    baseline = as_record(recorded.get("baseline"), "recorded.baseline")
    ep = as_record(recorded.get("approximateUnaryEp"), "recorded.approximateUnaryEp")
    exact = as_record(recorded.get("exactOneDimensionalIntegralComparison"), "recorded.exactOneDimensionalIntegralComparison")

    require_equal("fresh status", fresh.get("status"), "Compared")
    require_equal("CSV SHA-256", fresh.get("csvSha256"), source.get("csvSha256"))
    require_equal("canonical input fingerprint", fresh.get("canonicalInputFingerprint"), source.get("canonicalInputFingerprint"))
    require_equal("training rows", fresh.get("trainingRows"), split.get("trainingRows"))
    require_equal("held-out rows", fresh.get("heldOutRows"), split.get("heldOutRows"))

    require_close("baseline probability", numeric(fresh, "baseline", "fresh"), numeric(baseline, "probability", "recorded.baseline"))
    require_close("baseline Brier", numeric(fresh, "baselineBrier", "fresh"), numeric(baseline, "brier", "recorded.baseline"))
    require_close("baseline NLPD", numeric(fresh, "baselineNlpd", "fresh"), numeric(baseline, "negativeLogPredictiveDensity", "recorded.baseline"))
    require_close("EP Brier", numeric(fresh, "epBrier", "fresh"), numeric(ep, "brier", "recorded.approximateUnaryEp"))
    require_close("EP NLPD", numeric(fresh, "epNlpd", "fresh"), numeric(ep, "negativeLogPredictiveDensity", "recorded.approximateUnaryEp"))
    require_close("EP-minus-baseline Brier", numeric(fresh, "brierDeltaEpMinusBaseline", "fresh"), numeric(ep, "brierDeltaEpMinusBaseline", "recorded.approximateUnaryEp"))
    require_close("EP-minus-baseline NLPD", numeric(fresh, "nlpdDeltaEpMinusBaseline", "fresh"), numeric(ep, "negativeLogPredictiveDensityDeltaEpMinusBaseline", "recorded.approximateUnaryEp"))

    recorded_groups = exact.get("groups")
    fresh_groups = fresh.get("groups")
    if not isinstance(recorded_groups, list) or not isinstance(fresh_groups, list) or len(recorded_groups) != 3 or len(fresh_groups) != 3:
        raise ValueError("both result forms must contain exactly three declared groups")
    maxima = {"absoluteMeanError": 0.0, "absoluteVarianceError": 0.0, "absolutePredictiveError": 0.0}
    for index, fresh_group_raw in enumerate(fresh_groups):
        recorded_group = as_record(recorded_groups[index], f"recorded.groups[{index}]")
        fresh_group = as_record(fresh_group_raw, f"fresh.groups[{index}]")
        for key in ("group", "count", "successes"):
            require_equal(f"group[{index}].{key}", fresh_group.get(key), recorded_group.get(key))
        for key in maxima:
            value = numeric(fresh_group, key, f"fresh.groups[{index}]")
            require_close(f"group[{index}].{key}", value, numeric(recorded_group, key, f"recorded.groups[{index}]"))
            maxima[key] = max(maxima[key], value)

    require_close("maximum mean error", maxima["absoluteMeanError"], numeric(exact, "maximumAbsoluteMeanError", "recorded.exact"))
    require_close("maximum variance error", maxima["absoluteVarianceError"], numeric(exact, "maximumAbsoluteVarianceError", "recorded.exact"))
    require_close("maximum predictive error", maxima["absolutePredictiveError"], numeric(exact, "maximumAbsolutePredictiveError", "recorded.exact"))
    print("Signed-probit UCI result receipt: fresh EP/exact comparison matches every recorded metric; failures 0")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
