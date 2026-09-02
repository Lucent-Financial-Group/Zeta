#!/usr/bin/env python3
"""Independent finite oracle for CRDT-compatible Gaussian belief fusion."""

from __future__ import annotations

import json
import os


def inv(matrix):
    a, b = matrix[0]
    c, d = matrix[1]
    determinant = a * d - b * c
    if a <= 0 or determinant <= 0 or abs(b - c) > 1e-12:
        raise ValueError("covariance must be symmetric positive definite")
    return ((d / determinant, -b / determinant), (-c / determinant, a / determinant))


def add_matrix(left, right):
    return tuple(tuple(left[row][column] + right[row][column] for column in range(2)) for row in range(2))


def scale_matrix(scale, matrix):
    return tuple(tuple(scale * matrix[row][column] for column in range(2)) for row in range(2))


def matrix_vector(matrix, vector):
    return tuple(sum(matrix[row][column] * vector[column] for column in range(2)) for row in range(2))


def add_vector(left, right):
    return tuple(left[index] + right[index] for index in range(2))


def scale_vector(scale, vector):
    return tuple(scale * value for value in vector)


def gaussian_product(left, right):
    left_information = inv(left[1])
    right_information = inv(right[1])
    information = add_matrix(left_information, right_information)
    covariance = inv(information)
    natural = add_vector(matrix_vector(left_information, left[0]), matrix_vector(right_information, right[0]))
    return matrix_vector(covariance, natural), covariance


def fingerprint(estimate):
    values = (*estimate[0], *estimate[1][0], *estimate[1][1])
    return "|".join("0" if value == 0 else str(value) for value in values)


def canonical_pair(left, right):
    return (left, right) if fingerprint(left) <= fingerprint(right) else (right, left)


def ci_weight(left, right, weight):
    left_information = inv(left[1])
    right_information = inv(right[1])
    information = add_matrix(scale_matrix(weight, left_information), scale_matrix(1.0 - weight, right_information))
    covariance = inv(information)
    natural = add_vector(
        scale_vector(weight, matrix_vector(left_information, left[0])),
        scale_vector(1.0 - weight, matrix_vector(right_information, right[0])),
    )
    return matrix_vector(covariance, natural), covariance, weight


def fixed_half(left, right):
    first, second = canonical_pair(left, right)
    return ci_weight(first, second, 0.5)


def trace_grid(left, right):
    first, second = canonical_pair(left, right)
    best = ci_weight(first, second, 0.0)
    best_trace = best[1][0][0] + best[1][1][1]
    grid_steps = 999 if os.environ.get("CRDT_BELIEF_MUTANT") == "trace-grid-999" else 1000
    for step in range(1, grid_steps + 1):
        candidate = ci_weight(first, second, step / grid_steps)
        trace = candidate[1][0][0] + candidate[1][1][1]
        if trace < best_trace - 1e-12:
            best = candidate
            best_trace = trace
    return best


def difference(left, right):
    values_left = (*left[0], *left[1][0], *left[1][1])
    values_right = (*right[0], *right[1][0], *right[1][1])
    return max(abs(a - b) for a, b in zip(values_left, values_right))


def dominates(fused, input_covariance):
    matrix = tuple(
        tuple(input_covariance[row][column] - fused[row][column] for column in range(2))
        for row in range(2)
    )
    determinant = matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0]
    return matrix[0][0] >= -1e-12 and matrix[1][1] >= -1e-12 and determinant >= -1e-12


MEANS = ((0.0, 0.0), (1.0, 0.0), (0.0, 1.0), (2.0, -1.0))
COVARIANCES = (
    ((1.0, 0.0), (0.0, 4.0)),
    ((4.0, 0.0), (0.0, 1.0)),
    ((2.0, 1.0), (1.0, 2.0)),
    ((5.0, -1.0), (-1.0, 1.0)),
)
CATALOG = tuple((mean, covariance) for mean in MEANS for covariance in COVARIANCES)


def associativity_witness(fuse):
    for first_index in range(len(CATALOG)):
        for second_index in range(first_index + 1, len(CATALOG)):
            for third_index in range(second_index + 1, len(CATALOG)):
                first = CATALOG[first_index]
                second = CATALOG[second_index]
                third = CATALOG[third_index]
                left_intermediate = fuse(first, second)
                right_intermediate = fuse(second, third)
                left = fuse((left_intermediate[0], left_intermediate[1]), third)
                right = fuse(first, (right_intermediate[0], right_intermediate[1]))
                max_difference = difference((left[0], left[1]), (right[0], right[1]))
                if max_difference > 1e-9:
                    return {
                        "maxDifference": max_difference,
                        "leftCovariance00": left[1][0][0],
                        "rightCovariance00": right[1][0][0],
                        "leftWeight": left[2],
                        "rightWeight": right[2],
                    }
    return None


def evidence_state_merge(left, right):
    versions = {f"{key}\0{fingerprint(estimate)}": (key, estimate) for key, estimate in (*left, *right)}
    return tuple(versions[key] for key in sorted(versions))


def conflict_keys(state):
    by_key = {}
    for key, estimate in state:
        by_key.setdefault(key, set()).add(fingerprint(estimate))
    return tuple(sorted(key for key, versions in by_key.items() if len(versions) > 1))


def main():
    a = ((0.0, 0.0), COVARIANCES[0])
    b = ((1.0, 0.0), COVARIANCES[1])
    c = ((0.0, 1.0), COVARIANCES[2])
    changed_a = ((2.0, -1.0), COVARIANCES[3])
    sa = (("a", a),)
    sb = (("b", b),)
    sc = (("c", c),)
    fixed_pair = fixed_half(a, b)
    trace_pair = trace_grid(a, b)
    product_self = gaussian_product(a, a)
    product_left = gaussian_product(gaussian_product(a, b), c)
    product_right = gaussian_product(a, gaussian_product(b, c))
    abc_left = evidence_state_merge(evidence_state_merge(sa, sb), sc)
    abc_right = evidence_state_merge(sa, evidence_state_merge(sb, sc))
    conflict = evidence_state_merge(sa, (("a", changed_a),))
    report = {
        "evidenceMerge": {
            "idempotent": evidence_state_merge(sa, sa) == sa,
            "commutative": evidence_state_merge(sa, sb) == evidence_state_merge(sb, sa),
            "associative": abc_left == abc_right,
            "monotonic": set(sa).issubset(set(evidence_state_merge(sa, sb))),
            "conflictRetained": len(conflict) == 2 and conflict_keys(conflict) == ("a",),
        },
        "gaussianProduct": {
            "idempotent": difference(product_self, a) <= 1e-12,
            "commutative": difference(gaussian_product(a, b), gaussian_product(b, a)) <= 1e-12,
            "associative": difference(product_left, product_right) <= 1e-12,
            "repeatedEvidenceVarianceRatio": product_self[1][0][0] / a[1][0][0],
        },
        "fixedHalf": {
            "idempotent": difference((fixed_half(a, a)[0], fixed_half(a, a)[1]), a) <= 1e-12,
            "commutative": difference((fixed_half(a, b)[0], fixed_half(a, b)[1]), (fixed_half(b, a)[0], fixed_half(b, a)[1])) <= 1e-12,
            "dominatesBothInputs": dominates(fixed_pair[1], a[1]) and dominates(fixed_pair[1], b[1]),
            "witness": associativity_witness(fixed_half),
        },
        "traceGrid": {
            "idempotent": difference((trace_grid(a, a)[0], trace_grid(a, a)[1]), a) <= 1e-12,
            "commutative": difference((trace_grid(a, b)[0], trace_grid(a, b)[1]), (trace_grid(b, a)[0], trace_grid(b, a)[1])) <= 1e-12,
            "dominatesBothInputs": dominates(trace_pair[1], a[1]) and dominates(trace_pair[1], b[1]),
            "witness": associativity_witness(trace_grid),
        },
    }
    print(json.dumps(report, separators=(",", ":"), allow_nan=False))


if __name__ == "__main__":
    main()
