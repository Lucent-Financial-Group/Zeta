#!/usr/bin/env python3
"""Independent count-form exact posterior oracle for the declared UCI benchmark.

The input is the F# runner's JSON receipt. The oracle uses only its reported
per-group trial/success counts and no Zeta implementation code.
"""

from __future__ import annotations

import json
import math
import sys


LOWER = -12.0
UPPER = 12.0
PANELS = 262_144


def cdf(value: float) -> float:
    return 0.5 * (1.0 + math.erf(value / math.sqrt(2.0)))


def log_density(theta: float, successes: int, failures: int) -> float:
    positive = cdf(theta)
    negative = cdf(-theta)
    if positive <= 0.0 and successes > 0:
        return -math.inf
    if negative <= 0.0 and failures > 0:
        return -math.inf
    return -0.5 * theta * theta + successes * math.log(positive) + failures * math.log(negative)


def simpson_scaled(successes: int, failures: int) -> tuple[float, float, float]:
    coarse_panels = 16_384
    coarse_step = (UPPER - LOWER) / coarse_panels
    mode_log_density = max(log_density(LOWER + index * coarse_step, successes, failures) for index in range(coarse_panels + 1))
    step = (UPPER - LOWER) / PANELS
    normalizer = 0.0
    first = 0.0
    second = 0.0
    predictive = 0.0
    for index in range(PANELS + 1):
        theta = LOWER + index * step
        weight = 1.0 if index == 0 or index == PANELS else (4.0 if index % 2 else 2.0)
        scaled = math.exp(log_density(theta, successes, failures) - mode_log_density)
        normalizer += weight * scaled
        first += weight * theta * scaled
        second += weight * theta * theta * scaled
        predictive += weight * cdf(theta) * scaled
    mean = first / normalizer
    return mean, second / normalizer - mean * mean, predictive / normalizer


def main() -> int:
    document = json.load(sys.stdin)
    if document.get("status") != "Ready":
        raise ValueError("input must be a ready F# benchmark receipt")
    groups = document.get("groups")
    if not isinstance(groups, list) or len(groups) != 3:
        raise ValueError("input must report exactly three declared groups")

    output = []
    for group in groups:
        name = group.get("group")
        count = group.get("count")
        successes = group.get("successes")
        if not isinstance(name, str) or not isinstance(count, int) or not isinstance(successes, int):
            raise ValueError("group schema is invalid")
        if count < 1 or successes < 0 or successes > count:
            raise ValueError("group counts are invalid")
        mean, variance, predictive = simpson_scaled(successes, count - successes)
        output.append({"group": name, "count": count, "successes": successes, "mean": mean, "variance": variance, "predictive": predictive})

    print(json.dumps({"groups": output}, separators=(",", ":"), sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
