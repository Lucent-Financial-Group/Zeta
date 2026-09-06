"""Independent matrix replay of every registered RRXOR model and intervention."""

from __future__ import annotations

import itertools
import json
from pathlib import Path

import numpy as np

from zeta_interp.mess3_replay import (
    Network,
    Stream,
    digest,
    domain,
    initial_parameters,
    joint3,
    probe_score,
    ridge,
)
from zeta_interp.predictive_reference import (
    filter_word,
    fixtures,
    future,
    next_probabilities,
)


def observations(seed, count, length):
    stream = Stream(seed)
    rows = []
    for _ in range(count):
        phase = int(stream.next() * 3)
        blocks = []
        # Match the declared random draws, including the next block after an exact boundary.
        a, b = int(stream.next() * 2), int(stream.next() * 2)
        for position in range(length + 1 + phase):
            blocks.append((a, b, a ^ b)[position % 3])
            if position % 3 == 2:
                a, b = int(stream.next() * 2), int(stream.next() * 2)
        rows.append(blocks[phase:])
    values = np.asarray(rows)
    return values[:, :-1], values[:, -1]


def matrices():
    matrix = np.zeros((2, 5, 5))
    for source, symbol, destination, probability in fixtures()["rrxor"][1]:
        matrix[symbol, source, destination] = float(probability)
    return matrix


def known(contexts):
    transitions = matrices()
    belief = np.tile(np.array([1 / 3] + [1 / 6] * 4), (len(contexts), 1))
    for tokens in contexts.T:
        belief = np.einsum("bi,bij->bj", belief, transitions[tokens])
        belief /= belief.sum(axis=1, keepdims=True)
    prediction = np.stack([(belief @ t).sum(axis=1) for t in transitions], axis=1)
    futures = np.stack(
        [
            (belief @ transitions[a] @ transitions[b] @ transitions[c]).sum(axis=1)
            for a, b, c in itertools.product(range(2), repeat=3)
        ],
        axis=1,
    )
    return belief, prediction, futures


def divergence(actual, predicted):
    logarithm = np.zeros_like(actual)
    np.log2(
        np.divide(actual, predicted, out=np.ones_like(actual), where=actual > 0),
        out=logarithm,
        where=actual > 0,
    )
    return (actual * logarithm).sum(axis=1)


def score(actual, observed, expected_future, predicted, predicted_future):
    log_q, log_p = np.zeros_like(actual), np.zeros_like(actual)
    np.log2(predicted, out=log_q, where=actual > 0)
    np.log2(actual, out=log_p, where=actual > 0)
    ce, entropy = (
        -(actual * log_q).sum(axis=1).mean(),
        -(actual * log_p).sum(axis=1).mean(),
    )
    return {
        "NextCrossEntropyBits": ce,
        "NextEntropyBits": entropy,
        "NextKlBits": ce - entropy,
        "SampledNextLossBits": -np.log2(
            predicted[np.arange(len(actual)), observed]
        ).mean(),
        "Future3KlBits": divergence(expected_future, predicted_future).mean(),
    }


def pairs():
    model = fixtures()["rrxor"]
    histories = []
    for word in itertools.product(range(2), repeat=8):
        _, belief = filter_word(model, word)
        if belief is not None:
            histories.append(
                (word, next_probabilities(model[1], belief), future(model, belief))
            )
    result = []
    for left, right in itertools.combinations(histories, 2):
        if left[1] == right[1] and left[2] != right[2]:
            result.append(
                {
                    "Left": list(left[0]),
                    "Right": list(right[0]),
                    "NextProbability": [
                        {
                            "Numerator": str(p.numerator),
                            "Denominator": str(p.denominator),
                        }
                        for p in left[1]
                    ],
                    "LeftFuture": list(map(float, left[2])),
                    "RightFuture": list(map(float, right[2])),
                }
            )
            if len(result) == 128:
                return result
    raise ValueError("registered pair population absent")


def intervention(network, selected):
    left, right = (
        network.after(np.array([row[key] for row in selected]))[0]
        for key in ("Left", "Right")
    )
    left_future, right_future = (
        np.array([row[key] for row in selected])
        for key in ("LeftFuture", "RightFuture")
    )

    def measure(state, truth):
        return divergence(
            truth, joint3(network.step, state, network.probabilities(state))
        )

    intact = (measure(left, left_future) + measure(right, right_future)) / 2
    identity = (
        measure(left.copy(), left_future) + measure(right.copy(), right_future)
    ) / 2
    midpoint = (left + right) / 2
    merged = (measure(midpoint, left_future) + measure(midpoint, right_future)) / 2
    return {
        "IntactKlBits": intact.mean(),
        "IdentityKlBits": identity.mean(),
        "MidpointKlBits": merged.mean(),
        "Changes": merged - intact,
    }


PREDICTIONS = {
    "known-model-filter",
    "empirical-unigram",
    "empirical-bigram",
    "untrained-rnn",
    "trained-rnn",
}
PROBES = {
    "trained-hidden",
    "untrained-hidden",
    "shuffled-fit-labels",
    "trained-next-probabilities",
    "trained-joint-three-probabilities",
    "known-next-probabilities",
    "known-joint-three-probabilities",
}


def validate(receipt):
    if (
        receipt.get("Protocol") != "rrxor-rnn-v1"
        or receipt.get("Complete") is not True
        or receipt.get("ExpectedRuns") != 9
    ):
        raise ValueError("incomplete or changed RRXOR protocol")
    if receipt["Config"] != {
        "Steps": 4096,
        "Batch": 16,
        "SequenceSteps": 32,
        "LearningRate": 0.003,
    }:
        raise ValueError("changed training configuration")
    runs = receipt["Runs"]
    if len(runs) != 9 or {(r["Hidden"], r["Seed"]) for r in runs} != set(
        itertools.product((3, 8, 16), (41, 53, 67))
    ):
        raise ValueError("changed run coverage")
    if receipt["InterventionPairs"] != pairs():
        raise ValueError("changed intervention population")
    for run in runs:
        if run["TrainedTokens"] != 2097152 or [
            r["Step"] for r in run["TrainingTrace"]
        ] != [1] + list(range(512, 4097, 512)):
            raise ValueError("changed training exposure")
        if len(run["Evaluations"]) != 2 or {
            p["ContextLength"] for p in run["Evaluations"]
        } != {16, 64}:
            raise ValueError("changed panel coverage")
        for panel in run["Evaluations"]:
            if (
                panel["Examples"] != 2048
                or len(panel["Predictions"]) != 5
                or {p["Model"] for p in panel["Predictions"]} != PREDICTIONS
                or len(panel["Probes"]) != 7
                or {p["Features"] for p in panel["Probes"]} != PROBES
            ):
                raise ValueError("changed metric coverage")
        if (
            len(run["Interventions"]) != 2
            or {r["Model"] for r in run["Interventions"]}
            != {"trained-rnn", "untrained-rnn"}
            or any(
                r["Pairs"] != 128 or len(r["Changes"]) != 128
                for r in run["Interventions"]
            )
        ):
            raise ValueError("changed intervention coverage")


def replay(run, selected):
    seed, width = run["Seed"], run["Hidden"]
    initial = initial_parameters(width, seed, 2)
    if (
        digest(initial) != run["InitialSha256"]
        or digest(run["Parameters"]) != run["TrainedSha256"]
    ):
        raise ValueError("weight fingerprint mismatch")
    trained, untrained = (
        Network(width, run["Parameters"], 2),
        Network(width, initial, 2),
    )
    fitting, _ = observations(domain(seed, 3), 512, 16)
    fit_belief, fit_known, fit_future = known(fitting)
    fit_state, fit_output = trained.after(fitting)
    random_fit, _ = untrained.after(fitting)
    fit_joint = joint3(trained.step, fit_state, fit_output)
    order, stream = list(range(512)), Stream(domain(seed, 5))
    for i in range(511, 0, -1):
        j = int(stream.next() * (i + 1))
        order[i], order[j] = order[j], order[i]
    unigram, bigram = np.asarray(run["Unigram"]), np.asarray(run["Bigram"])
    maximum, comparisons = 0.0, 0

    def compare(actual, expected):
        nonlocal maximum, comparisons
        difference = np.abs(np.asarray(actual) - np.asarray(expected))
        if not np.isfinite(difference).all() or difference.max() > 1e-8:
            raise ValueError(f"measurement mismatch {difference.max()}")
        maximum = max(maximum, float(difference.max()))
        comparisons += difference.size

    for panel in run["Evaluations"]:
        length = panel["ContextLength"]
        contexts, observed = observations(
            domain(seed, 4 if length == 16 else 6), 2048, length
        )
        belief, actual, expected_future = known(contexts)
        state, output = trained.after(contexts)
        random_state, random_output = untrained.after(contexts)
        output_joint = joint3(trained.step, state, output)
        count = len(contexts)
        fixed = np.tile(unigram, (count, 1))
        big = bigram[contexts[:, -1]]
        predictions = {
            "known-model-filter": (actual, expected_future),
            "empirical-unigram": (
                fixed,
                joint3(lambda s, _, p=fixed: (s, p), None, fixed),
            ),
            "empirical-bigram": (
                big,
                joint3(
                    lambda s, token, n=count: (s, np.tile(bigram[token], (n, 1))),
                    None,
                    big,
                ),
            ),
            "untrained-rnn": (
                random_output,
                joint3(untrained.step, random_state, random_output),
            ),
            "trained-rnn": (output, output_joint),
        }
        for row in panel["Predictions"]:
            computed = score(
                actual, observed, expected_future, *predictions[row["Model"]]
            )
            for key, value in computed.items():
                compare(row[key], value)
        probes = {
            "trained-hidden": (fit_state, fit_belief, state),
            "untrained-hidden": (random_fit, fit_belief, random_state),
            "shuffled-fit-labels": (fit_state, fit_belief[order], state),
            "trained-next-probabilities": (fit_output, fit_belief, output),
            "trained-joint-three-probabilities": (fit_joint, fit_belief, output_joint),
            "known-next-probabilities": (fit_known, fit_belief, actual),
            "known-joint-three-probabilities": (
                fit_future,
                fit_belief,
                expected_future,
            ),
        }
        for row in panel["Probes"]:
            computed = probe_score(ridge(*probes[row["Features"]]), belief)
            for key, value in computed.items():
                compare(row["Score"][key], value)
    for row in run["Interventions"]:
        for key, value in intervention(
            trained if row["Model"] == "trained-rnn" else untrained, selected
        ).items():
            compare(row[key], value)
    return {
        "hidden": width,
        "seed": seed,
        "comparisons": comparisons,
        "maximum_absolute_error": maximum,
    }


if __name__ == "__main__":
    source = (
        Path(__file__).resolve().parents[2]
        / "Research.FSharp/rrxor-learned-belief-results.json"
    )
    receipt = json.loads(source.read_text(encoding="utf-8"))
    validate(receipt)
    print(
        json.dumps(
            {
                "status": "passed",
                "runs": [
                    replay(run, receipt["InterventionPairs"]) for run in receipt["Runs"]
                ],
            },
            indent=2,
        )
    )
