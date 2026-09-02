#!/usr/bin/env python3
"""Independent ETTh1 CFB-B oracle. Reads public data; emits JSON; imports no TypeScript results."""

from __future__ import annotations

import csv
import hashlib
import json
import math
import os
import sys
from pathlib import Path

import numpy as np


EXPERTS = ("last", "window-start", "train-mean", "ridge-window")
LAMBDAS = (0.0, 1e-6, 1e-4, 1e-2, 1.0)
Z95 = 1.959963984540054
SHRINKAGES = tuple(step / 10.0 for step in range(11))


def xorshift32(state: int) -> int:
    value = state & 0xFFFFFFFF
    value = (value ^ ((value << 13) & 0xFFFFFFFF)) & 0xFFFFFFFF
    value = (value ^ (value >> 17)) & 0xFFFFFFFF
    value = (value ^ ((value << 5) & 0xFFFFFFFF)) & 0xFFFFFFFF
    return value


def metrics(targets: np.ndarray, means: np.ndarray, variances: np.ndarray) -> dict[str, float]:
    error = means - targets
    radius = Z95 * np.sqrt(variances)
    return {
        "mse": float(np.mean(error * error)),
        "mae": float(np.mean(np.abs(error))),
        "gaussianNll": float(np.mean(0.5 * (np.log(2.0 * math.pi * variances) + error * error / variances))),
        "coverage95": float(np.mean(np.abs(error) <= radius)),
        "meanIntervalWidth95": float(np.mean(2.0 * radius)),
    }


def moving_block(left: np.ndarray, right: np.ndarray, seed: int, replicates: int, block: int) -> dict[str, float]:
    differences = left - right
    samples: list[float] = []
    state = seed & 0xFFFFFFFF
    maximum_start = len(differences) - block
    for _ in range(replicates):
        total = 0.0
        count = 0
        while count < len(differences):
            state = xorshift32(state)
            start = 0 if maximum_start == 0 else state % (maximum_start + 1)
            take = min(block, len(differences) - count)
            total += float(np.sum(differences[start : start + take]))
            count += take
        samples.append(total / len(differences))
    samples.sort()
    return {
        "pointEstimate": float(np.mean(differences)),
        "lower95": samples[math.floor(0.025 * (len(samples) - 1))],
        "upper95": samples[math.ceil(0.975 * (len(samples) - 1))],
    }


def active_set_weights(covariance: np.ndarray) -> tuple[int, np.ndarray, float]:
    best: tuple[int, np.ndarray, float] | None = None
    for mask in range(1, 16):
        indices = np.array([index for index in range(4) if mask & (1 << index)], dtype=np.int64)
        subset = covariance[np.ix_(indices, indices)]
        try:
            solved = np.linalg.solve(subset, np.ones(len(indices), dtype=np.float64))
        except np.linalg.LinAlgError:
            continue
        denominator = float(np.sum(solved))
        if denominator <= 1e-12:
            continue
        subset_weights = solved / denominator
        if np.any(~np.isfinite(subset_weights)) or np.any(subset_weights < -1e-12):
            continue
        subset_weights = np.maximum(subset_weights, 0.0)
        subset_weights /= np.sum(subset_weights)
        weights = np.zeros(4, dtype=np.float64)
        weights[indices] = subset_weights
        variance = float(weights @ covariance @ weights)
        if best is None or variance < best[2] - 1e-12 or (abs(variance - best[2]) <= 1e-12 and mask < best[0]):
            best = (mask, weights, variance)
    if best is None or best[2] <= 0.0 or not math.isfinite(best[2]):
        raise ValueError("CFB-CORRELATED-NO-FEASIBLE-SUBSET")
    return best


def fit_correlated(validation_targets: np.ndarray, validation_forecasts: np.ndarray, zero_off_diagonal: bool = False) -> dict[str, object]:
    residuals = validation_targets[:, None] - validation_forecasts
    covariance = np.cov(residuals, rowvar=False, ddof=1)
    if os.environ.get("CFB_C_MUTANT") == "reverse-second-residual":
        mutated = residuals.copy()
        mutated[:, 1] = mutated[::-1, 1]
        covariance = np.cov(mutated, rowvar=False, ddof=1)
    best: dict[str, object] | None = None
    shrinkage_values = SHRINKAGES[:-1] if os.environ.get("CFB_C_MUTANT") == "drop-alpha-one" else SHRINKAGES
    for shrinkage in shrinkage_values:
        shrunk = covariance.copy()
        if zero_off_diagonal:
            shrunk = np.diag(np.diag(covariance))
        else:
            for row in range(4):
                for column in range(4):
                    if row != column:
                        shrunk[row, column] *= 1.0 - shrinkage
        mask, weights, predicted_variance = active_set_weights(shrunk)
        validation_errors = validation_forecasts @ weights - validation_targets
        validation_mse = float(np.mean(validation_errors * validation_errors))
        candidate = {
            "shrinkage": shrinkage,
            "activeMask": mask,
            "weights": weights,
            "residualCovariance": covariance,
            "shrunkCovariance": shrunk,
            "predictedVariance": predicted_variance,
            "intervalVariance": validation_mse,
            "validationMse": validation_mse,
            "diagonalVarianceRatio": float(np.max(np.diag(covariance)) / np.min(np.diag(covariance))),
        }
        if best is None:
            best = candidate
            continue
        best_mse = float(best["validationMse"])
        best_shrinkage = float(best["shrinkage"])
        best_mask = int(best["activeMask"])
        if validation_mse < best_mse - 1e-12 or (
            abs(validation_mse - best_mse) <= 1e-12
            and (shrinkage > best_shrinkage or (shrinkage == best_shrinkage and mask < best_mask))
        ):
            best = candidate
    if best is None:
        raise ValueError("CFB-CORRELATED-ARTIFACT-NOT-FIT")
    return best


def serializable_artifact(artifact: dict[str, object]) -> dict[str, object]:
    return {
        "shrinkage": float(artifact["shrinkage"]),
        "activeMask": int(artifact["activeMask"]),
        "weights": np.asarray(artifact["weights"]).tolist(),
        "residualCovariance": np.asarray(artifact["residualCovariance"]).tolist(),
        "shrunkCovariance": np.asarray(artifact["shrunkCovariance"]).tolist(),
        "predictedVariance": float(artifact["predictedVariance"]),
        "intervalVariance": float(artifact["intervalVariance"]),
        "validationMse": float(artifact["validationMse"]),
        "diagonalVarianceRatio": float(artifact["diagonalVarianceRatio"]),
    }


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: etth1_static_oracle.py MANIFEST_JSON ETTH1_CSV")
    manifest_path = Path(sys.argv[1])
    data_path = Path(sys.argv[2])
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    raw = data_path.read_bytes()
    digest = hashlib.sha256(raw).hexdigest()
    if digest != manifest["dataset"]["sha256"]:
        raise ValueError(f"CFB-B-DIGEST:{digest}")

    with data_path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        target_series = np.array([float(row["OT"]) for row in reader], dtype=np.float64)

    sequence_length = int(manifest["benchmark"]["inputLength"])
    horizon = int(manifest["benchmark"]["forecastHorizon"])
    count = len(target_series) - sequence_length - horizon + 1
    examples = np.empty((count, 4), dtype=np.float64)
    for index in range(count):
        examples[index] = (
            target_series[index],
            target_series[index + 72],
            target_series[index + sequence_length - 1],
            target_series[index + sequence_length + horizon - 1],
        )

    train_count = int(manifest["benchmark"]["splitExampleCounts"]["train"])
    validation_count = int(manifest["benchmark"]["splitExampleCounts"]["validation"])
    train = examples[:train_count]
    validation = examples[train_count : train_count + validation_count]
    test = examples[train_count + validation_count :]
    train_mean = float(np.mean(train[:, 3]))
    feature_means = np.mean(train[:, :3], axis=0)
    feature_scales = np.std(train[:, :3], axis=0, ddof=1)

    def design(rows: np.ndarray) -> np.ndarray:
        normalized = (rows[:, :3] - feature_means) / feature_scales
        return np.column_stack((np.ones(len(rows)), normalized))

    train_design = design(train)
    validation_design = design(validation)
    test_design = design(test)
    best: tuple[float, np.ndarray, float] | None = None
    for ridge_lambda in LAMBDAS:
        penalty = np.diag((0.0, ridge_lambda, ridge_lambda, ridge_lambda))
        try:
            coefficients = np.linalg.solve(train_design.T @ train_design + penalty, train_design.T @ train[:, 3])
        except np.linalg.LinAlgError:
            continue
        validation_error = validation_design @ coefficients - validation[:, 3]
        validation_mse = float(np.mean(validation_error * validation_error))
        if best is None or validation_mse < best[2] - 1e-15:
            best = (ridge_lambda, coefficients, validation_mse)
    if best is None:
        raise ValueError("CFB-B-RIDGE-NOT-FIT")
    ridge_lambda, coefficients, ridge_validation_mse = best

    def forecasts(rows: np.ndarray, design_matrix: np.ndarray) -> np.ndarray:
        return np.column_stack((
            rows[:, 2],
            rows[:, 0],
            np.full(len(rows), train_mean),
            design_matrix @ coefficients,
        ))

    validation_forecasts = forecasts(validation, validation_design)
    test_forecasts = forecasts(test, test_design)
    validation_residuals = validation[:, 3, None] - validation_forecasts
    variances = np.maximum(np.mean(validation_residuals * validation_residuals, axis=0), 1e-9)
    correlation = np.corrcoef(validation_residuals, rowvar=False)
    maximum_correlation = float(np.max(np.abs(correlation[np.triu_indices(4, 1)])))

    validation_expert_mse = np.mean(validation_residuals * validation_residuals, axis=0)
    selected_index = int(np.argmin(validation_expert_mse))
    targets = test[:, 3]
    equal_means = np.mean(test_forecasts, axis=1)
    equal_validation_error = validation[:, 3] - np.mean(validation_forecasts, axis=1)
    equal_variance = max(float(np.mean(equal_validation_error * equal_validation_error)), 1e-9)
    equal_variances = np.full(len(test), equal_variance)
    precision = 1.0 / variances
    static_variance = float(1.0 / np.sum(precision))
    static_means = (test_forecasts @ precision) * static_variance
    static_variances = np.full(len(test), static_variance)
    best_means = test_forecasts[:, selected_index]
    best_variances = np.full(len(test), variances[selected_index])

    duplicate_precision = np.append(precision, precision[0])
    duplicate_forecasts = np.column_stack((test_forecasts, test_forecasts[:, 0]))
    duplicate_variance = float(1.0 / np.sum(duplicate_precision))
    duplicate_means = (duplicate_forecasts @ duplicate_precision) * duplicate_variance
    duplicate_variances = np.full(len(test), duplicate_variance)

    state = (int(manifest["benchmark"]["bootstrap"]["seed"]) ^ 0xA5A5A5A5) & 0xFFFFFFFF
    shuffled_targets = targets.copy()
    for index in range(len(shuffled_targets) - 1, 0, -1):
        state = xorshift32(state)
        swap_index = state % (index + 1)
        shuffled_targets[index], shuffled_targets[swap_index] = shuffled_targets[swap_index], shuffled_targets[index]

    lane_metrics = {
        "equal": metrics(targets, equal_means, equal_variances),
        "best-validation": metrics(targets, best_means, best_variances),
        "zeta-static": metrics(targets, static_means, static_variances),
    }
    static_error = static_means - targets
    equal_error = equal_means - targets
    static_nll = 0.5 * (np.log(2.0 * math.pi * static_variances) + static_error * static_error / static_variances)
    equal_nll = 0.5 * (np.log(2.0 * math.pi * equal_variances) + equal_error * equal_error / equal_variances)
    bootstrap = manifest["benchmark"]["bootstrap"]
    intervals = {
        "mse": moving_block(static_error * static_error, equal_error * equal_error, int(bootstrap["seed"]), int(bootstrap["replicates"]), int(bootstrap["blockLength"])),
        "gaussianNll": moving_block(static_nll, equal_nll, int(bootstrap["seed"]) ^ 0x9E3779B9, int(bootstrap["replicates"]), int(bootstrap["blockLength"])),
    }
    duplicate_metrics = metrics(targets, duplicate_means, duplicate_variances)
    permuted_metrics = metrics(shuffled_targets, static_means, static_variances)

    correlated_artifact = fit_correlated(validation[:, 3], validation_forecasts)
    correlated_weights = np.asarray(correlated_artifact["weights"], dtype=np.float64)
    correlated_means = test_forecasts @ correlated_weights
    correlated_variances = np.full(len(test), float(correlated_artifact["intervalVariance"]))
    correlated_metrics = metrics(targets, correlated_means, correlated_variances)
    correlated_error = correlated_means - targets
    correlated_nll = 0.5 * (
        np.log(2.0 * math.pi * correlated_variances)
        + correlated_error * correlated_error / correlated_variances
    )
    best_error = best_means - targets
    best_nll = 0.5 * (
        np.log(2.0 * math.pi * best_variances)
        + best_error * best_error / best_variances
    )
    correlated_bootstrap_best = {
        "mse": moving_block(
            correlated_error * correlated_error,
            best_error * best_error,
            int(bootstrap["seed"]),
            int(bootstrap["replicates"]),
            int(bootstrap["blockLength"]),
        ),
        "gaussianNll": moving_block(
            correlated_nll,
            best_nll,
            int(bootstrap["seed"]) ^ 0x9E3779B9,
            int(bootstrap["replicates"]),
            int(bootstrap["blockLength"]),
        ),
    }
    correlated_bootstrap_static = {
        "mse": moving_block(
            correlated_error * correlated_error,
            static_error * static_error,
            int(bootstrap["seed"]),
            int(bootstrap["replicates"]),
            int(bootstrap["blockLength"]),
        ),
        "gaussianNll": moving_block(
            correlated_nll,
            static_nll,
            int(bootstrap["seed"]) ^ 0x9E3779B9,
            int(bootstrap["replicates"]),
            int(bootstrap["blockLength"]),
        ),
    }
    zero_artifact = fit_correlated(validation[:, 3], validation_forecasts, zero_off_diagonal=True)
    zero_weights = np.asarray(zero_artifact["weights"], dtype=np.float64)
    zero_means = test_forecasts @ zero_weights
    zero_variances = np.full(len(test), float(zero_artifact["intervalVariance"]))
    zero_metrics = metrics(targets, zero_means, zero_variances)
    maximum_zero_difference = float(max(
        np.max(np.abs(correlated_means - zero_means)),
        np.max(np.abs(correlated_variances - zero_variances)),
    ))
    metric_zero_difference = max(
        abs(correlated_metrics["mse"] - zero_metrics["mse"]),
        abs(correlated_metrics["gaussianNll"] - zero_metrics["gaussianNll"]),
    )
    correlated_permutation_seed = (int(bootstrap["seed"]) ^ 0x7F4A7C15) & 0xFFFFFFFF
    correlated_shuffled_targets = targets.copy()
    permutation_state = correlated_permutation_seed
    for index in range(len(correlated_shuffled_targets) - 1, 0, -1):
        permutation_state = xorshift32(permutation_state)
        swap_index = permutation_state % (index + 1)
        correlated_shuffled_targets[index], correlated_shuffled_targets[swap_index] = (
            correlated_shuffled_targets[swap_index],
            correlated_shuffled_targets[index],
        )
    correlated_permuted_metrics = metrics(correlated_shuffled_targets, correlated_means, correlated_variances)
    coverage_degradation = lane_metrics["equal"]["coverage95"] - correlated_metrics["coverage95"]
    useful = (
        correlated_bootstrap_best["mse"]["upper95"] < 0.0
        and coverage_degradation <= 0.05
        and correlated_metrics["gaussianNll"] <= lane_metrics["best-validation"]["gaussianNll"]
    )
    mse_inflation = (correlated_metrics["mse"] - lane_metrics["zeta-static"]["mse"]) / lane_metrics["zeta-static"]["mse"]
    calibration_repair = (
        correlated_metrics["coverage95"] - lane_metrics["zeta-static"]["coverage95"] >= 0.10
        and mse_inflation <= 0.01
        and correlated_metrics["gaussianNll"] < lane_metrics["zeta-static"]["gaussianNll"]
    )
    correlated_status = "useful" if useful else "calibration-repair-only" if calibration_repair else "not-supported"

    report = {
        "dataset": {"sha256": digest, "rows": len(target_series), "examples": count, "splits": [len(train), len(validation), len(test)]},
        "ridge": {
            "lambda": ridge_lambda,
            "featureMeans": feature_means.tolist(),
            "featureScales": feature_scales.tolist(),
            "coefficients": coefficients.tolist(),
            "validationMse": ridge_validation_mse,
        },
        "variances": dict(zip(EXPERTS, variances.tolist())),
        "maximumAbsoluteValidationResidualCorrelation": maximum_correlation,
        "selectedBestValidationExpert": EXPERTS[selected_index],
        "laneMetrics": lane_metrics,
        "duplicate": {
            "metrics": duplicate_metrics,
            "coverageChangeFromStatic": duplicate_metrics["coverage95"] - lane_metrics["zeta-static"]["coverage95"],
            "nllChangeFromStatic": duplicate_metrics["gaussianNll"] - lane_metrics["zeta-static"]["gaussianNll"],
        },
        "permuted": {
            "seed": (int(bootstrap["seed"]) ^ 0xA5A5A5A5) & 0xFFFFFFFF,
            "metrics": permuted_metrics,
            "mseChangeFromStatic": permuted_metrics["mse"] - lane_metrics["zeta-static"]["mse"],
            "nllChangeFromStatic": permuted_metrics["gaussianNll"] - lane_metrics["zeta-static"]["gaussianNll"],
        },
        "bootstrapVersusEqual": intervals,
        "correlatedError": {
            "artifact": serializable_artifact(correlated_artifact),
            "metrics": correlated_metrics,
            "bootstrapVersusBestValidation": correlated_bootstrap_best,
            "bootstrapVersusStaticDag": correlated_bootstrap_static,
            "zeroOffDiagonalControl": {
                "artifact": serializable_artifact(zero_artifact),
                "maximumPredictionDifference": maximum_zero_difference,
                "metricDifference": metric_zero_difference,
            },
            "permutedTargets": {
                "seed": correlated_permutation_seed,
                "metrics": correlated_permuted_metrics,
                "mseChange": correlated_permuted_metrics["mse"] - correlated_metrics["mse"],
                "nllChange": correlated_permuted_metrics["gaussianNll"] - correlated_metrics["gaussianNll"],
            },
            "verdict": correlated_status,
        },
    }
    print(json.dumps(report, sort_keys=True))


if __name__ == "__main__":
    main()
