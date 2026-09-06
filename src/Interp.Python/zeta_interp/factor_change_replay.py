"""Independent dense/Kronecker posterior and full-sequence likelihood controls."""

from __future__ import annotations

import argparse
import hashlib
import json
from functools import reduce
from pathlib import Path

import numpy as np

from zeta_interp.comparison_replay import output_checksum, read
from zeta_interp.mess3_replay import Stream, domain
from zeta_interp.rrxor_replay import divergence


def change_streams(probability, duration, tag):
    rng = Stream(domain(1009, tag))
    tokens = np.zeros((2048, 512), dtype=int)
    for row in tokens:
        for t in range(512):
            draw = rng.next()
            if t < 2:
                row[t] = int(2 * draw)
            else:
                p = probability if 128 <= t < 128 + duration else 0.75
                row[t] = row[t - 2] if draw < p else 1 - row[t - 2]
    return tokens


def likelihoods(tokens, positions=(64, 128, 192, 256)):
    t = np.arange(tokens.shape[1])
    copying = np.ones_like(tokens, dtype=bool)
    copying[:, 2:] = tokens[:, 2:] == tokens[:, :-2]

    def full_sequence(p):
        probabilities = np.where(copying, p, 1 - p)
        probabilities[:, :2] = 0.5
        return np.log(probabilities).cumsum(axis=1)

    alternatives = [
        full_sequence(np.where(t >= start, p, 0.75))
        for start in positions
        for p in (0.5, 0.25)
    ]
    numerator = np.logaddexp.reduce(alternatives) - np.log(len(alternatives))
    return numerator - full_sequence(0.75), numerator + (t + 1) * np.log(2)


def crossing(log_ratios):
    mask = log_ratios >= np.log(20)
    return np.where(mask.any(axis=1), mask.argmax(axis=1), -1)


def alarm_summary(first):
    first = np.asarray(first)
    n = len(first)
    alarms = int((first >= 0).sum())
    z = 1.959963984540054
    p = alarms / n
    center = (p + z * z / (2 * n)) / (1 + z * z / n)
    radius = z * np.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / (1 + z * z / n)
    pre = int(((first >= 0) & (first < 128)).sum())
    post = first[first >= 128]
    delay = post - 128
    return {
        "Alarms": alarms,
        "Rate": p,
        "Wilson95": [float(center - radius), float(center + radius)],
        "Pre128": pre,
        "Post128": len(post),
        "Post128Rate": len(post) / n,
        "Post128AtRiskRate": len(post) / (n - pre),
        "Misses": int((first < 0).sum()),
        "ConditionalDelayQuantiles": np.quantile(delay, [0, 0.5, 0.9, 1]).tolist()
        if len(delay)
        else None,
    }


def verify_change(root):
    data = read(root, "change-detection-results.json")
    assert data["Complete"] and data["MarginalOnlyRatio"] == 1
    expected = [
        ("unchanged", 0.75, 0, 41),
        ("permanent-fair", 0.5, 384, 42),
        ("permanent-anticopy", 0.25, 384, 43),
        ("transient-fair", 0.5, 16, 44),
    ]
    assert len(data["Panels"]) == 4
    summaries = []
    for row, (name, probability, duration, tag) in zip(
        data["Panels"], expected, strict=True
    ):
        assert (row["Panel"], row["Probability"], row["Duration"], row["Domain"]) == (
            name,
            probability,
            duration,
            tag,
        )
        tokens = change_streams(probability, duration, tag)
        assert (
            hashlib.sha256(tokens.astype(np.uint8).tobytes()).hexdigest().upper()
            == row["StreamsSha256"]
        )
        known, wrong = likelihoods(tokens)
        for values, first, final in [
            (known, "FirstKnown", "FinalKnownLogRatio"),
            (wrong, "FirstWrongIid", "FinalWrongLogRatio"),
        ]:
            np.testing.assert_array_equal(crossing(values), row[first])
            np.testing.assert_allclose(
                values[:, -1], row[final], atol=2e-10, rtol=1e-10
            )
        summaries.append(
            {
                "Panel": name,
                "KnownNull": alarm_summary(row["FirstKnown"]),
                "WrongIidNull": alarm_summary(row["FirstWrongIid"]),
            }
        )
    return summaries


def factor_operators(n, epsilon):
    transition = np.array([[0.8, 0.2], [0.3, 0.7]])
    emission = np.array([[0.9, 0.1], [0.2, 0.8]])
    local = np.stack([transition * emission[:, symbol][None, :] for symbol in range(2)])
    edges = []
    for token in range(2**n):
        # Highest factor first makes factor zero the least significant bit.
        normal = reduce(np.kron, [local[(token >> f) & 1] for f in reversed(range(n))])
        flipped = reduce(
            np.kron, [local[1 - ((token >> f) & 1)] for f in reversed(range(n))]
        )
        edges.append((1 - epsilon) * normal + epsilon * flipped)
    prior = reduce(np.kron, [np.array([0.6, 0.4])] * n)
    return prior, np.stack(edges), local


def factor_streams(n, epsilon, seed):
    _, _, local = factor_operators(n, epsilon)
    rng = Stream(domain(seed, 51))
    tokens = np.empty((256, 64), dtype=int)
    for row in tokens:
        hidden = [0 if rng.next() < 0.6 else 1 for _ in range(n)]
        for t in range(64):
            token = 0
            for f in range(n):
                cumulative = np.cumsum(local[:, hidden[f], :].ravel())
                choice = min(
                    int(np.searchsorted(cumulative, rng.next(), side="right")), 3
                )
                x, hidden[f] = divmod(choice, 2)
                token |= x << f
            row[t] = token ^ ((2**n - 1) if rng.next() < epsilon else 0)
    return tokens


def get_marginals(state, n):
    columns = [
        state[:, [s for s in range(2**n) if ((s >> f) & 1) == bit]].sum(axis=1)
        for f in range(n)
        for bit in range(2)
    ]
    return np.stack(columns, axis=1)


def product(marginals, n):
    return np.stack(
        [
            np.prod(marginals[:, [2 * f + ((s >> f) & 1) for f in range(n)]], axis=1)
            for s in range(2**n)
        ],
        axis=1,
    )


def factor_outputs(n, epsilon, tokens, projected=False):
    prior, edges, _ = factor_operators(n, epsilon)
    state = np.tile(prior, (len(tokens), 1))
    for column in tokens.T:
        state = np.einsum("bi,bij->bj", state, edges[column])
        state /= state.sum(axis=1, keepdims=True)
        if projected:
            state = product(get_marginals(state, n), n)
    p = state @ edges.sum(axis=2).T
    return state, p


def verify_factors(root):
    data = read(root, "factor-comparison-results.json")
    assert (
        data["Complete"]
        and len(data["Scores"]) == 54
        and len(data["Measurements"]) == 270
    )
    expected = {
        (n, e, s, m)
        for n in (2, 3, 4)
        for e in (0, 0.2)
        for s in (41, 53, 67)
        for m in ("Dense", "TensorJoint", "ProjectedProduct")
    }
    assert {
        (r["Factors"], r["Epsilon"], r["Seed"], r["Mode"]) for r in data["Scores"]
    } == expected
    outputs, summaries = {}, []
    for n in (2, 3, 4):
        for epsilon in (0, 0.2):
            for seed in (41, 53, 67):
                tokens = factor_streams(n, epsilon, seed)
                context_hash = (
                    hashlib.sha256(tokens.astype(np.uint8).tobytes())
                    .hexdigest()
                    .upper()
                )
                true_state, true_p = factor_outputs(n, epsilon, tokens)
                reduced_state, reduced_p = factor_outputs(n, epsilon, tokens, True)
                corr = divergence(
                    true_state, product(get_marginals(true_state, n), n)
                ).mean()
                for row in data["Scores"]:
                    if (row["Factors"], row["Epsilon"], row["Seed"]) != (
                        n,
                        epsilon,
                        seed,
                    ):
                        continue
                    projected = row["Mode"] == "ProjectedProduct"
                    state, p = (
                        (reduced_state, reduced_p)
                        if projected
                        else (true_state, true_p)
                    )
                    values = {
                        "NextKlBits": divergence(true_p, p).mean(),
                        "MaximumStateError": np.max(np.abs(true_state - state)),
                        "JointVsMarginalsKlBits": corr,
                    }
                    assert row["ContextSha256"] == context_hash
                    for key, value in values.items():
                        np.testing.assert_allclose(
                            value, row[key], atol=3e-12, rtol=1e-9
                        )
                    s = 2**n
                    assert row["ParameterBytes"] == 8 * (
                        s**3 + s if row["Mode"] == "Dense" else 11
                    )
                    assert row["StateBytes"] == 8 * (2 * n if projected else s)
                    outputs[row["Model"]] = output_checksum(
                        get_marginals(state, n) if projected else state, p
                    )
                    summaries.append(
                        {
                            k: row[k]
                            for k in [
                                "Model",
                                "NextKlBits",
                                "MaximumStateError",
                                "JointVsMarginalsKlBits",
                            ]
                        }
                    )
    assert {(r["Model"], r["Repetition"]) for r in data["Measurements"]} == {
        (i, r) for i in outputs for r in range(5)
    }
    for row in data["Measurements"]:
        np.testing.assert_allclose(row["Checksum"], outputs[row["Model"]], atol=2e-8)
        assert (
            row["Calls"] == 4096
            and row["ThreadAllocatedBytes"] > 0
            and row["ElapsedMilliseconds"] > 0
        )
    return summaries


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("root", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    if args.output.exists():
        raise ValueError("refusing to overwrite replay receipt")
    result = {"Change": verify_change(args.root), "Factors": verify_factors(args.root)}
    args.output.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result["Change"], indent=2))


if __name__ == "__main__":
    main()
