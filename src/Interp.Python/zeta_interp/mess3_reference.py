"""Independent, standard-library checks of the F# numerical fixture.

The HMM path uses exact fractions and the transition-then-emission factorization,
not the F# edge matrices. The RNN gradient is central finite difference of a
separate forward pass. Ridge uses pivoted elimination, not F# Cholesky.
"""

from __future__ import annotations

import json
import math
import subprocess
import sys
from fractions import Fraction
from pathlib import Path


def forward(parameters: list[float], tokens: list[int], hidden: int = 3):
    """Scalar Elman recurrence; return average loss and final state/readout."""
    input_offset = hidden * hidden
    bias_offset = input_offset + 3 * hidden
    output_offset = bias_offset + hidden
    output_bias = output_offset + 3 * hidden
    state = [0.0] * hidden
    loss = 0.0
    prediction = [1 / 3] * 3
    for position, token in enumerate(tokens):
        state = [
            math.tanh(
                math.fsum(parameters[i * hidden + j] * state[j] for j in range(hidden))
                + parameters[input_offset + 3 * i + token]
                + parameters[bias_offset + i]
            )
            for i in range(hidden)
        ]
        logits = [
            math.fsum(
                parameters[output_offset + t * hidden + j] * state[j]
                for j in range(hidden)
            )
            + parameters[output_bias + t]
            for t in range(3)
        ]
        maximum = max(logits)
        exponentials = [math.exp(x - maximum) for x in logits]
        total = math.fsum(exponentials)
        prediction = [x / total for x in exponentials]
        if position + 1 < len(tokens):
            loss += maximum - logits[tokens[position + 1]] + math.log(total)
    return loss / (len(tokens) - 1), state, prediction


def fraction_filter(tokens: list[int]):
    belief = [Fraction(1, 3)] * 3
    probability = Fraction(1)
    for token in tokens:
        predicted = [Fraction(17, 20) * p + Fraction(1, 20) for p in belief]
        weights = [
            p * (Fraction(17, 20) if state == token else Fraction(3, 40))
            for state, p in enumerate(predicted)
        ]
        mass = sum(weights)
        probability *= mass
        belief = [w / mass for w in weights]
    prediction = [Fraction(527, 800) * p + Fraction(91, 800) for p in belief]
    return (
        [float(p) for p in belief],
        [float(p) for p in prediction],
        math.log(probability),
    )


def solve(matrix: list[list[float]], right: list[list[float]]):
    n = len(matrix)
    rows = [list(a) + list(b) for a, b in zip(matrix, right, strict=True)]
    for column in range(n):
        pivot = max(range(column, n), key=lambda i: abs(rows[i][column]))
        rows[column], rows[pivot] = rows[pivot], rows[column]
        scale = rows[column][column]
        if abs(scale) < 1e-14:
            raise ValueError("singular reference ridge system")
        rows[column] = [v / scale for v in rows[column]]
        for i in range(n):
            if i != column:
                factor = rows[i][column]
                rows[i] = [
                    a - factor * b for a, b in zip(rows[i], rows[column], strict=True)
                ]
    return [row[n:] for row in rows]


def ridge_predict(features, targets, testing=None):
    n, d = len(features), len(features[0])
    mean = [math.fsum(row[j] for row in features) / n for j in range(d)]
    target_mean = [math.fsum(row[j] for row in targets) / n for j in range(3)]
    centered = [[x - m for x, m in zip(row, mean, strict=True)] for row in features]
    gram = [
        [
            math.fsum(row[i] * row[j] for row in centered) / n + (1e-6 if i == j else 0)
            for j in range(d)
        ]
        for i in range(d)
    ]
    cross = [
        [
            math.fsum(
                centered[r][i] * (targets[r][j] - target_mean[j]) for r in range(n)
            )
            / n
            for j in range(3)
        ]
        for i in range(d)
    ]
    slopes = solve(gram, cross)
    return [
        [
            target_mean[j]
            + math.fsum((row[i] - mean[i]) * slopes[i][j] for i in range(d))
            for j in range(3)
        ]
        for row in (features if testing is None else testing)
    ]


def max_error(left, right):
    return max(abs(a - b) for a, b in zip(left, right, strict=True))


def verify_fixture(fixture):
    parameters, tokens = fixture["Parameters"], fixture["Tokens"]
    loss, state, prediction = forward(parameters, tokens)
    eps = 1e-5
    numeric = []
    for i in range(len(parameters)):
        plus, minus = list(parameters), list(parameters)
        plus[i] += eps
        minus[i] -= eps
        numeric.append(
            (forward(plus, tokens)[0] - forward(minus, tokens)[0]) / (2 * eps)
        )
    belief, known, log_probability = fraction_filter(tokens)
    probe = ridge_predict(fixture["ProbeFeatures"], fixture["ProbeTargets"])
    errors = {
        "loss": abs(loss - fixture["Loss"]),
        "gradient": max_error(numeric, fixture["Gradient"]),
        "state": max_error(state, fixture["State"]),
        "network_prediction": max_error(prediction, fixture["NetworkPrediction"]),
        "exact_belief": max_error(belief, fixture["Belief"]),
        "exact_prediction": max_error(known, fixture["Prediction"]),
        "exact_log_probability": abs(log_probability - fixture["LogProbability"]),
        "probe": max(
            max_error(a, b)
            for a, b in zip(probe, fixture["ProbePredictions"], strict=True)
        ),
    }
    for name, error in errors.items():
        tolerance = 1e-8 if name == "gradient" else 1e-10
        if not math.isfinite(error) or error > tolerance:
            raise ValueError(f"{name} mismatch {error} > {tolerance}")
    return {"status": "passed", "maximum_absolute_errors": errors}


def main():
    root = Path(__file__).resolve().parents[3]
    if len(sys.argv) == 2:
        with Path(sys.argv[1]).open(encoding="utf-8") as source:
            fixture = json.load(source)
    else:
        completed = subprocess.run(
            [
                "dotnet",
                "fsi",
                "--warnaserror",
                "--optimize+",
                "src/Research.FSharp/check-mess3-kernel.fsx",
            ],
            cwd=root,
            check=True,
            capture_output=True,
            text=True,
        )
        fixture = json.loads(completed.stdout)
    print(json.dumps(verify_fixture(fixture), indent=2))


if __name__ == "__main__":
    main()
