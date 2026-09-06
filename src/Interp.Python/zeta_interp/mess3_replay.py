"""Replay every saved Mess3 measurement with NumPy, without training the F# model.

The RNG deliberately matches the recorded stream convention. Filtering instead
uses transition/emission factorization, neural evaluation uses matrix products,
and regression uses augmented least squares rather than normal-equation Cholesky.
"""

from __future__ import annotations

import hashlib
import json
import math
import struct
import sys
from pathlib import Path

import numpy as np

MASK = (1 << 64) - 1
GOLDEN = 0x9E3779B97F4A7C15


def mix(value):
    value = value * GOLDEN & MASK
    value = (value ^ (value >> 30)) * 0xBF58476D1CE4E5B9 & MASK
    value = (value ^ (value >> 27)) * 0x94D049BB133111EB & MASK
    return value ^ (value >> 31)


def domain(seed, tag):
    return mix(seed ^ (tag * GOLDEN & MASK))


class Stream:
    def __init__(self, seed):
        self.state = seed

    def next(self):
        self.state = (self.state + GOLDEN) & MASK
        return (mix(self.state) >> 11) / 9007199254740992


def observations(seed, count, length):
    stream = Stream(seed)
    result = np.empty((count, length + 1), dtype=np.int64)
    for row in range(count):
        state = int(stream.next() * 3)
        for position in range(length + 1):
            draw = stream.next()
            cumulative = 0
            for edge in range(9):
                token, destination = divmod(edge, 3)
                cumulative += (18 if state == destination else 1) * (
                    34 if token == destination else 3
                )
                if draw < cumulative / 800 or edge == 8:
                    result[row, position] = token
                    state = destination
                    break
    return result[:, :-1], result[:, -1]


def known_step(belief, tokens):
    predicted = 0.85 * belief + 0.05
    emission = np.full_like(predicted, 0.075)
    emission[np.arange(len(predicted)), tokens] = 0.85
    result = predicted * emission
    result /= result.sum(axis=1, keepdims=True)
    return result, 0.65875 * result + 0.11375


def known_after(contexts):
    belief = np.full((len(contexts), 3), 1 / 3)
    for tokens in contexts.T:
        belief, _ = known_step(belief, tokens)
    return belief, 0.65875 * belief + 0.11375


def initial_parameters(hidden, seed):
    stream = Stream(domain(seed, 1))
    parameters = [0.0] * (hidden * hidden + 7 * hidden + 3)
    for start, stop, scale in [
        (0, hidden * hidden, math.sqrt(3 / hidden)),
        (hidden * hidden, hidden * hidden + 3 * hidden, math.sqrt(6 / (hidden + 3))),
        (
            hidden * hidden + 4 * hidden,
            hidden * hidden + 7 * hidden,
            math.sqrt(6 / (hidden + 3)),
        ),
    ]:
        for index in range(start, stop):
            parameters[index] = (2 * stream.next() - 1) * scale
    return parameters


def digest(parameters):
    return (
        hashlib.sha256(struct.pack(f"<{len(parameters)}d", *parameters))
        .hexdigest()
        .upper()
    )


class Network:
    def __init__(self, hidden, parameters):
        self.hidden = hidden
        values = np.asarray(parameters, dtype=np.float64)
        a, b, c, d = (
            hidden * hidden,
            hidden * hidden + 3 * hidden,
            hidden * hidden + 4 * hidden,
            hidden * hidden + 7 * hidden,
        )
        self.recurrent = values[:a].reshape(hidden, hidden)
        self.inputs = values[a:b].reshape(hidden, 3)
        self.bias = values[b:c]
        self.output = values[c:d].reshape(3, hidden)
        self.output_bias = values[d:]

    def step(self, state, tokens):
        state = np.tanh(state @ self.recurrent.T + self.inputs[:, tokens].T + self.bias)
        logits = state @ self.output.T + self.output_bias
        logits -= logits.max(axis=1, keepdims=True)
        probabilities = np.exp(logits)
        probabilities /= probabilities.sum(axis=1, keepdims=True)
        return state, probabilities

    def after(self, contexts):
        state = np.zeros((len(contexts), self.hidden))
        for tokens in contexts.T:
            state, probabilities = self.step(state, tokens)
        return state, probabilities


def joint3(step, state, probabilities):
    columns = []
    for a in range(3):
        state_a, prob_a = step(state, a)
        for b in range(3):
            _, prob_b = step(state_a, b)
            for c in range(3):
                columns.append(probabilities[:, a] * prob_a[:, b] * prob_b[:, c])
    return np.stack(columns, axis=1)


def ridge(fitting, targets, testing):
    mean, target_mean = fitting.mean(axis=0), targets.mean(axis=0)
    count, width = fitting.shape
    design = np.concatenate([fitting - mean, np.eye(width) * math.sqrt(count * 1e-6)])
    response = np.concatenate([targets - target_mean, np.zeros((width, 3))])
    slopes, _, _, _ = np.linalg.lstsq(design, response, rcond=None)
    return (testing - mean) @ slopes + target_mean


def probe_score(predicted, actual):
    squared_error = np.square(predicted - actual).sum()
    total = np.square(actual - actual.mean(axis=0)).sum()
    return {
        "MeanSquaredError": float(squared_error / actual.size),
        "R2": float(1 - squared_error / total),
    }


def prediction_score(actual, observed, expected_joint, predicted, future):
    cross = -np.sum(actual * np.log2(predicted), axis=1).mean()
    entropy = -np.sum(actual * np.log2(actual), axis=1).mean()
    return {
        "NextCrossEntropyBits": float(cross),
        "NextEntropyBits": float(entropy),
        "NextKlBits": float(cross - entropy),
        "SampledNextLossBits": float(
            -np.log2(predicted[np.arange(len(actual)), observed]).mean()
        ),
        "Future3KlBits": float(
            np.sum(expected_joint * np.log2(expected_joint / future), axis=1).mean()
        ),
    }


def replay_run(run, smoke=False):
    seed, hidden = run["Seed"], run["Hidden"]
    initial = initial_parameters(hidden, seed)
    if (
        digest(initial) != run["InitialSha256"]
        or digest(run["Parameters"]) != run["TrainedSha256"]
    ):
        raise ValueError("weight fingerprint mismatch")
    trained, untrained = Network(hidden, run["Parameters"]), Network(hidden, initial)
    fitting, _ = observations(domain(seed, 3), 64 if smoke else 512, 16)
    fit_targets, fit_known = known_after(fitting)
    trained_fit, trained_output_fit = trained.after(fitting)
    random_fit, _ = untrained.after(fitting)
    order = list(range(len(fitting)))
    stream = Stream(domain(seed, 5))
    for i in range(len(order) - 1, 0, -1):
        j = int(stream.next() * (i + 1))
        order[i], order[j] = order[j], order[i]
    unigram, bigram = np.asarray(run["Unigram"]), np.asarray(run["Bigram"])
    maximum = 0.0
    comparisons = 0
    for panel in run["Evaluations"]:
        length = panel["ContextLength"]
        testing, observed = observations(
            domain(seed, 4 if length == 16 else 6), panel["Examples"], length
        )
        actual_belief, actual = known_after(testing)
        expected_joint = joint3(known_step, actual_belief, actual)
        state, trained_output = trained.after(testing)
        random_state, random_output = untrained.after(testing)
        evaluation_count = len(testing)
        predictions = {
            "known-model-filter": (actual, expected_joint),
            "empirical-unigram": (
                np.tile(unigram, (len(testing), 1)),
                np.tile(
                    np.einsum("i,j,k->ijk", unigram, unigram, unigram).ravel(),
                    (len(testing), 1),
                ),
            ),
            "empirical-bigram": (
                bigram[testing[:, -1]],
                joint3(
                    lambda _, token, count=evaluation_count: (
                        None,
                        np.tile(bigram[token], (count, 1)),
                    ),
                    None,
                    bigram[testing[:, -1]],
                ),
            ),
            "untrained-rnn": (
                random_output,
                joint3(untrained.step, random_state, random_output),
            ),
            "trained-rnn": (
                trained_output,
                joint3(trained.step, state, trained_output),
            ),
        }
        for row in panel["Predictions"]:
            predicted, future = predictions[row["Model"]]
            if not np.allclose(future.sum(axis=1), 1, atol=1e-12, rtol=0):
                raise ValueError("joint future is not normalized")
            score = prediction_score(
                actual, observed, expected_joint, predicted, future
            )
            for key, value in score.items():
                error = abs(value - row[key])
                if not math.isfinite(error) or error > 1e-9:
                    raise ValueError(
                        f"width={hidden} seed={seed} context={length} {row['Model']} {key}: {error}"
                    )
                maximum = max(maximum, error)
                comparisons += 1
        probes = {
            "trained-hidden": (trained_fit, fit_targets, state),
            "untrained-hidden": (random_fit, fit_targets, random_state),
            "shuffled-fit-labels": (trained_fit, fit_targets[order], state),
            "trained-next-probabilities": (
                trained_output_fit,
                fit_targets,
                trained_output,
            ),
            "known-next-probabilities": (fit_known, fit_targets, actual),
        }
        for row in panel["Probes"]:
            x, y, test = probes[row["Features"]]
            score = probe_score(ridge(x, y, test), actual_belief)
            for key, value in score.items():
                error = abs(value - row["Score"][key])
                if not math.isfinite(error) or error > 1e-8:
                    raise ValueError(
                        f"width={hidden} seed={seed} context={length} {row['Features']} {key}: {error}"
                    )
                maximum = max(maximum, error)
                comparisons += 1
    return {
        "hidden": hidden,
        "seed": seed,
        "comparisons": comparisons,
        "maximum_absolute_error": maximum,
    }


def validate_receipt(receipt):
    protocol = receipt["Protocol"]
    if protocol not in {"mess3-rnn-v1", "mess3-rnn-smoke-v1"}:
        raise ValueError("unknown experiment protocol")
    smoke = protocol == "mess3-rnn-smoke-v1"
    expected = (
        {(3, 999)} if smoke else {(h, s) for h in (3, 8, 16) for s in (11, 23, 37)}
    )
    if not receipt["Complete"] or receipt["ExpectedRuns"] != len(expected):
        raise ValueError("incomplete experiment receipt")
    actual = [(r["Hidden"], r["Seed"]) for r in receipt["Runs"]]
    if len(actual) != len(expected) or set(actual) != expected:
        raise ValueError("registered run set changed")
    config = {
        "Steps": 64 if smoke else 4096,
        "Batch": 16,
        "SequenceSteps": 32,
        "LearningRate": 0.003,
    }
    if receipt["Config"] != config:
        raise ValueError("registered training configuration changed")
    prediction_names = {
        "known-model-filter",
        "empirical-unigram",
        "empirical-bigram",
        "untrained-rnn",
        "trained-rnn",
    }
    probe_names = {
        "trained-hidden",
        "untrained-hidden",
        "shuffled-fit-labels",
        "trained-next-probabilities",
        "known-next-probabilities",
    }
    for run in receipt["Runs"]:
        if (
            run["TrainedTokens"]
            != config["Steps"] * config["Batch"] * config["SequenceSteps"]
        ):
            raise ValueError("training token count changed")
        h = run["Hidden"]
        if len(run["Parameters"]) != h * h + 7 * h + 3 or run["ParameterCount"] != len(
            run["Parameters"]
        ):
            raise ValueError("parameter shape changed")
        if run["ModelNumericPayloadBytes"] != 8 * (len(run["Parameters"]) + h):
            raise ValueError("numeric payload accounting changed")
        if [panel["ContextLength"] for panel in run["Evaluations"]] != [16, 64]:
            raise ValueError("registered context panels changed")
        for panel in run["Evaluations"]:
            if panel["Examples"] != (64 if smoke else 2048):
                raise ValueError("registered evaluation count changed")
            if (
                len(panel["Predictions"]) != 5
                or {p["Model"] for p in panel["Predictions"]} != prediction_names
            ):
                raise ValueError("prediction control set changed")
            if (
                len(panel["Probes"]) != 5
                or {p["Features"] for p in panel["Probes"]} != probe_names
            ):
                raise ValueError("probe control set changed")
    return smoke


def main():
    root = Path(__file__).resolve().parents[3]
    path = (
        Path(sys.argv[1])
        if len(sys.argv) == 2
        else root / "src/Research.FSharp/mess3-learned-belief-results.json"
    )
    with path.open(encoding="utf-8") as source:
        receipt = json.load(source)
    smoke = validate_receipt(receipt)
    runs = [replay_run(run, smoke) for run in receipt["Runs"]]
    print(json.dumps({"status": "passed", "runs": runs}, indent=2))


if __name__ == "__main__":
    main()
