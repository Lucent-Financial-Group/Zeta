"""Independent Fraction filtering and symbolic spectral checks for finite sources.

No native transition matrices or native belief coordinates are used as inputs
to the reference models. Only emitted measurements are compared afterwards.
"""

from __future__ import annotations

import itertools
import json
import math
import sys
from fractions import Fraction as F
from pathlib import Path

import numpy as np
import sympy as sp


def fixtures():
    # Edge tuples (source, symbol, destination, probability).
    return {
        "biased-coin": ([F(1)], [(0, 0, 0, F(3, 4)), (0, 1, 0, F(1, 4))]),
        "golden-mean": (
            [F(2, 3), F(1, 3)],
            [(0, 0, 1, F(1, 2)), (0, 1, 0, F(1, 2)), (1, 1, 0, F(1))],
        ),
        "even": (
            [F(2, 3), F(1, 3)],
            [(0, 0, 0, F(1, 2)), (0, 1, 1, F(1, 2)), (1, 1, 0, F(1))],
        ),
        "rrxor": (
            [F(1, 3)] + [F(1, 6)] * 4,
            [
                (0, 0, 1, F(1, 2)),
                (0, 1, 2, F(1, 2)),
                (1, 0, 4, F(1, 2)),
                (1, 1, 3, F(1, 2)),
                (2, 0, 3, F(1, 2)),
                (2, 1, 4, F(1, 2)),
                (3, 1, 0, F(1)),
                (4, 0, 0, F(1)),
            ],
        ),
        "lag-two-copy": (
            [F(1, 4)] * 4,
            [
                (state, bit, 2 * (state % 2) + bit, F(3 if bit == state // 2 else 1, 4))
                for state in range(4)
                for bit in range(2)
            ],
        ),
    }


def advance(edges, belief, token):
    weights = [F(0)] * len(belief)
    for source, symbol, destination, probability in edges:
        if symbol == token:
            weights[destination] += belief[source] * probability
    return weights


def filter_word(model, word):
    belief, edges = model
    for token in word:
        belief = advance(edges, belief, token)
    mass = sum(belief)
    return mass, tuple(x / mass for x in belief) if mass else None


def next_probabilities(edges, belief):
    return tuple(sum(advance(edges, belief, bit)) for bit in range(2))


def future(model, belief, length=3):
    return tuple(
        filter_word((belief, model[1]), word)[0]
        for word in itertools.product(range(2), repeat=length)
    )


def closure(model):
    prior, edges = model
    states, transitions = [tuple(prior)], []
    positions = {states[0]: 0}
    for index, belief in enumerate(states):
        for token in range(2):
            weights = advance(edges, belief, token)
            probability = sum(weights)
            if not probability:
                continue
            updated = tuple(x / probability for x in weights)
            if updated not in positions:
                if len(states) == 128:
                    raise ValueError("closure exceeds registered state cap")
                positions[updated] = len(states)
                states.append(updated)
            transitions.append((index, token, positions[updated], probability))
    matrix = sp.zeros(len(states))
    for source, _, target, probability in transitions:
        matrix[source, target] += sp.Rational(
            probability.numerator, probability.denominator
        )
    return states, transitions, matrix


def entropy(p):
    return -sum(float(x) * math.log2(float(x)) for x in p if x)


def block_losses(model, length):
    # Traverse unnormalized word weights; normalization is not needed for the joint loss.
    population = [((), model[0])]
    for _ in range(length):
        population = [
            (word + (bit,), advance(model[1], weights, bit))
            for word, weights in population
            for bit in range(2)
        ]
    probabilities = [(word, sum(weights)) for word, weights in population]
    h = entropy(p for _, p in probabilities)
    result = {}
    for name, one in [
        ("known-model", None),
        ("bernoulli-half", F(1, 2)),
        ("bernoulli-third", F(1, 3)),
    ]:
        ce, kl = 0.0, 0.0
        for word, p in probabilities:
            if not p:
                continue
            q = (
                p
                if one is None
                else one ** sum(word) * (1 - one) ** (len(word) - sum(word))
            )
            ce -= float(p) * math.log2(float(q))
            kl += float(p) * math.log2(float(p / q))
        result[name] = h, ce, kl
    return result


def spectral_check():
    model = fixtures()["lag-two-copy"]
    _, _, matrix = closure(model)
    transform, blocks = matrix.jordan_cells()
    inverse = transform.inv()
    zero_selector = sp.zeros(matrix.rows)
    cursor = 0
    indices = []
    for block in blocks:
        if block[0, 0] == 0:
            zero_selector[
                cursor : cursor + block.rows, cursor : cursor + block.rows
            ] = sp.eye(block.rows)
            indices.append(block.rows)
        cursor += block.rows
    p0 = sp.simplify(transform * zero_selector * inverse)
    assert max(indices) == 2
    assert p0 * p0 == p0 and matrix * p0 == p0 * matrix
    assert matrix * p0 != sp.zeros(matrix.rows)
    assert matrix**2 * p0 == sp.zeros(matrix.rows)
    # The full operator identity, including the Kronecker-delta term at lambda=0.
    for n in range(64):
        expanded_blocks = []
        for block in blocks:
            eigenvalue = block[0, 0]
            nilpotent = block - eigenvalue * sp.eye(block.rows)
            value = sp.zeros(block.rows)
            for degree in range(block.rows):
                coefficient = (
                    int(n == degree)
                    if eigenvalue == 0
                    else sp.binomial(n, degree) * eigenvalue ** (n - degree)
                )
                value += coefficient * nilpotent**degree
            expanded_blocks.append(value)
        expanded = transform * sp.diag(*expanded_blocks) * inverse
        assert sp.simplify(expanded - matrix**n) == sp.zeros(matrix.rows)
    state_entropy = sp.Matrix(
        [1, 1, 1] + [sp.Rational(2) - sp.Rational(3, 4) * sp.log(3, 2)] * 4
    )
    removed = [float((p0 * matrix**n * state_entropy)[0]) for n in range(4)]
    assert removed[0] > 0.18 and removed[1] > 0.18 and removed[2:] == [0.0, 0.0]
    return {
        "powers_verified": 64,
        "zero_jordan_sizes": indices,
        "eigenvalues": {
            str(value): multiplicity
            for value, multiplicity in matrix.eigenvals().items()
        },
        "omitted_zero_mode_error_bits": removed,
        "zero_projector": [
            [str(p0[i, j]) for j in range(matrix.cols)] for i in range(matrix.rows)
        ],
    }


def verify(receipt):
    if (
        receipt.get("Protocol") != "predictive-laws-v1"
        or receipt.get("Complete") is not True
    ):
        raise ValueError("incomplete or changed law protocol")
    expected = fixtures()
    if [r["Model"] for r in receipt["Models"]] != list(expected):
        raise ValueError("changed model coverage")
    maximum, comparisons = 0.0, 0
    for row in receipt["Models"]:
        model = expected[row["Model"]]
        states, edges, matrix = closure(model)
        native_states = [
            tuple(F(int(x), sum(map(int, weights))) for x in weights)
            for weights in row["Closure"]["Beliefs"]
        ]
        assert states == native_states
        native_edges = [
            (
                x["Source"],
                x["Symbol"],
                x["Destination"],
                F(
                    int(x["Probability"]["Numerator"]),
                    int(x["Probability"]["Denominator"]),
                ),
            )
            for x in row["Closure"]["Edges"]
        ]
        assert edges == native_edges
        np.testing.assert_allclose(
            np.asarray(matrix, dtype=float),
            row["Closure"]["Matrix"],
            atol=1e-15,
            rtol=0,
        )
        if {(r["Length"], r["Predictor"]) for r in row["Losses"]} != set(
            itertools.product(
                range(1, 13), ("known-model", "bernoulli-half", "bernoulli-third")
            )
        ) or len(row["Losses"]) != 36:
            raise ValueError("changed loss coverage")
        if len(row["EntropyCurve"]) != 64:
            raise ValueError("changed context coverage")
        previous_h = 0.0
        for length in range(1, 13):
            values = block_losses(model, length)
            h = values["known-model"][0]
            for measured in (r for r in row["Losses"] if r["Length"] == length):
                for key, value in zip(
                    ("Entropy", "CrossEntropy", "Kl"),
                    values[measured["Predictor"]],
                    strict=True,
                ):
                    for name in (key, "Chain" + key):
                        delta = abs(measured[name] - value)
                        maximum = max(maximum, delta)
                        assert delta < 1e-9, (row["Model"], length, name, delta)
                        comparisons += 1
            assert abs(row["EntropyCurve"][length - 1] - (h - previous_h)) < 1e-9
            previous_h = h
        entropy_vector = np.array(
            [entropy(next_probabilities(model[1], state)) for state in states]
        )
        np.testing.assert_allclose(
            entropy_vector, row["Closure"]["Entropy"], atol=1e-14, rtol=0
        )
        power = np.eye(len(states))
        w = np.asarray(matrix, dtype=float)
        for observed in row["EntropyCurve"]:
            assert abs(float((power @ entropy_vector)[0]) - observed) < 1e-12
            power = power @ w
    return {
        "status": "passed",
        "loss_comparisons": comparisons,
        "maximum_absolute_error": maximum,
        "spectral": spectral_check(),
    }


if __name__ == "__main__":
    path = (
        Path(sys.argv[1])
        if len(sys.argv) == 2
        else Path(__file__).resolve().parents[2]
        / "Research.FSharp/predictive-laws-results.json"
    )
    print(json.dumps(verify(json.loads(path.read_text(encoding="utf-8"))), indent=2))
