#!/usr/bin/env python3
"""Independent numerical oracle for the finite signed-probit EP catalogue.

This intentionally does not import Zeta code or reuse its normal-CDF approximation.
It integrates the exact one-dimensional posterior with Python's standard-library
``math.erf`` CDF over a declared finite interval.
"""

from __future__ import annotations

import json
import math
import sys
from dataclasses import dataclass


@dataclass(frozen=True)
class Observation:
    source_row: int
    group: str
    label: int


CATALOGUE = (
    Observation(4, "housing-yes", -1),
    Observation(1, "housing-no", 1),
    Observation(6, "housing-yes", 1),
    Observation(2, "housing-no", -1),
    Observation(5, "housing-yes", -1),
    Observation(3, "housing-no", 1),
    Observation(7, "housing-unknown", 1),
)

GROUPS = ("housing-no", "housing-yes", "housing-unknown")
PANELS = 262_144
LOWER = -12.0
UPPER = 12.0


def cdf(value: float) -> float:
    return 0.5 * (1.0 + math.erf(value / math.sqrt(2.0)))


def prior_density(value: float) -> float:
    return math.exp(-0.5 * value * value) / math.sqrt(2.0 * math.pi)


def simpson(function):
    step = (UPPER - LOWER) / PANELS
    total = function(LOWER) + function(UPPER)
    for index in range(1, PANELS):
        x_value = LOWER + index * step
        total += (4.0 if index % 2 else 2.0) * function(x_value)
    return total * step / 3.0


def catalogue(flip_source_row: int | None) -> tuple[Observation, ...]:
    if flip_source_row is None:
        return CATALOGUE

    changed = False
    result: list[Observation] = []
    for item in CATALOGUE:
        if item.source_row == flip_source_row:
            result.append(Observation(item.source_row, item.group, -item.label))
            changed = True
        else:
            result.append(item)
    if not changed:
        raise ValueError(f"unknown declared source row: {flip_source_row}")
    return tuple(result)


def exact_group(group: str, observations: tuple[Observation, ...]) -> dict[str, float | int | str]:
    labels = tuple(item.label for item in observations if item.group == group)

    def unnormalized(theta: float) -> float:
        likelihood = 1.0
        for label in labels:
            likelihood *= cdf(label * theta)
        return prior_density(theta) * likelihood

    normalizer = simpson(unnormalized)
    mean = simpson(lambda theta: theta * unnormalized(theta)) / normalizer
    second_moment = simpson(lambda theta: theta * theta * unnormalized(theta)) / normalizer
    predictive = simpson(lambda theta: cdf(theta) * unnormalized(theta)) / normalizer

    return {
        "group": group,
        "count": len(labels),
        "mean": mean,
        "variance": second_moment - mean * mean,
        "predictive": predictive,
    }


def main() -> int:
    flip_source_row: int | None = None
    if len(sys.argv) == 3 and sys.argv[1] == "--flip-source-row":
        flip_source_row = int(sys.argv[2])
    elif len(sys.argv) != 1:
        raise SystemExit("usage: signed_probit_ep_oracle.py [--flip-source-row <positive-int>]")

    observations = catalogue(flip_source_row)
    print(json.dumps({"groups": [exact_group(group, observations) for group in GROUPS]}, separators=(",", ":"), sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
