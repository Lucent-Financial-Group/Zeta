#!/usr/bin/env python3
"""Independent joint-Gaussian oracle for the finite multilayer online-update chain."""

from __future__ import annotations

import json
import os


PRIORS = ((-0.5, 1.25), (0.25, 0.8), (1.0, 1.5), (-0.75, 0.6))
VARIANCES = (0.4, 0.7, 0.3, 1.1)
OBSERVATIONS = (2.0, 2.0, 2.0)


def invert(matrix: list[list[float]]) -> list[list[float]]:
    size = len(matrix)
    augmented = [
        row[:] + [1.0 if i == j else 0.0 for j in range(size)]
        for i, row in enumerate(matrix)
    ]
    for column in range(size):
        pivot = max(range(column, size), key=lambda row: abs(augmented[row][column]))
        if abs(augmented[pivot][column]) <= 1e-15:
            raise ValueError("joint precision matrix is singular")
        augmented[column], augmented[pivot] = augmented[pivot], augmented[column]
        divisor = augmented[column][column]
        augmented[column] = [value / divisor for value in augmented[column]]
        for row in range(size):
            if row == column:
                continue
            scale = augmented[row][column]
            augmented[row] = [
                value - scale * basis
                for value, basis in zip(augmented[row], augmented[column], strict=True)
            ]
    return [row[size:] for row in augmented]


def chain_marginals(
    priors: tuple[tuple[float, float], ...],
    variances: tuple[float, ...],
    observations: tuple[float, ...],
    flip_coupling_sign: bool,
) -> tuple[list[float], list[float]]:
    size = len(priors)
    precision = [[0.0 for _ in range(size)] for _ in range(size)]
    information = [0.0 for _ in range(size)]
    for index, (mean, variance) in enumerate(priors):
        tau = 1.0 / variance
        precision[index][index] += tau
        information[index] += mean * tau
    observation_precision = 1.0 / variances[0]
    for observation in observations:
        precision[0][0] += observation_precision
        information[0] += observation * observation_precision
    coupling_sign = 1.0 if flip_coupling_sign else -1.0
    for child in range(1, size):
        coupling_precision = 1.0 / variances[child]
        precision[child][child] += coupling_precision
        precision[child - 1][child - 1] += coupling_precision
        precision[child - 1][child] += coupling_sign * coupling_precision
        precision[child][child - 1] += coupling_sign * coupling_precision
    covariance = invert(precision)
    means = [
        sum(covariance[row][column] * information[column] for column in range(size))
        for row in range(size)
    ]
    return means, [covariance[index][index] for index in range(size)]


def main() -> None:
    mutation = os.environ.get("MLBNN_ORACLE_MUTATION", "")
    means, variances = chain_marginals(
        PRIORS,
        VARIANCES,
        OBSERVATIONS,
        flip_coupling_sign=mutation == "flip-coupling-sign",
    )
    prior_precision = 1.0 / PRIORS[0][1]
    layer_zero_precision = prior_precision + len(OBSERVATIONS) / VARIANCES[0]
    print(
        json.dumps(
            {
                "sequentialMeans": means,
                "sequentialVariances": variances,
                "layerZeroPrecision": layer_zero_precision,
                "layerZeroObservationCount": len(OBSERVATIONS),
                "deeperObservationCounts": [0 for _ in PRIORS[1:]],
                "mutation": mutation or "none",
            },
            separators=(",", ":"),
            sort_keys=True,
        )
    )


if __name__ == "__main__":
    main()
