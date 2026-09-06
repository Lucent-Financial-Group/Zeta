"""Independent common-panel prediction, allocation-checksum, and optional EM replay."""

from __future__ import annotations

import argparse
import hashlib
import itertools
import json
from pathlib import Path

import numpy as np

from zeta_interp import hmm_reference as hmm
from zeta_interp import mess3_replay as mess3
from zeta_interp import rrxor_replay as rrxor


def read(root, name):
    return json.loads((root / name).read_text())


def corpus(source, seed, count, length):
    if length == 0:
        return np.empty((count, 0), dtype=int)
    sampler = mess3.observations if source == "mess3" else rrxor.observations
    prefix, last = sampler(seed, count, length - 1)
    return np.column_stack([prefix, last])


def oracle(source):
    if source == "rrxor":
        return np.array([2, 1, 1, 1, 1]) / 6, rrxor.matrices()
    edges = np.array(
        [
            [
                [(18 if i == j else 1) * (34 if x == j else 3) / 800 for j in range(3)]
                for i in range(3)
            ]
            for x in range(3)
        ]
    )
    return np.full(3, 1 / 3), edges


def network_outputs(network, contexts):
    state = np.zeros((len(contexts), network.hidden))
    for column in contexts.T:
        state, _ = network.step(state, column)
    probabilities = network.probabilities(state)
    return state, probabilities


def joint4(network, state, p):
    def expand(depth, state, p):
        if depth == 1:
            return p
        return np.concatenate(
            [
                p[:, x, None] * expand(depth - 1, *network.step(state, x))
                for x in range(p.shape[1])
            ],
            axis=1,
        )

    return expand(4, state, p)


def models(root):
    result = {}
    for source, a in [("mess3", 3), ("rrxor", 2)]:
        for row in read(root, source + "-learned-belief-results.json")["Runs"]:
            ident = f"{source}-h{row['Hidden']}-s{row['Seed']}"
            result[ident] = (
                source,
                "rnn",
                mess3.Network(row["Hidden"], row["Parameters"], a),
            )
            result[ident + "-bigram"] = (source, "bigram", np.array(row["Bigram"]))
        result[source + "-known"] = (source, "known", oracle(source))
    data = read(root, "learned-hmm-results.json")
    assert data["Complete"] and len(data["Runs"]) == 12
    for row in data["Runs"]:
        a, n = row["Alphabet"], row["States"]
        for prefix, kind in [("", "hmm"), ("Initial", "initial-hmm")]:
            ident = f"{row['Source']}-n{n}-s{row['Seed']}-{kind}"
            result[ident] = (
                row["Source"],
                kind,
                (
                    np.array(row[prefix + "Prior"]),
                    np.array(row[prefix + "Edges"]).reshape(a, n, n),
                ),
            )
    assert len(result) == 62
    return result


def predict(model, contexts):
    _, kind, value = model
    if kind == "rnn":
        state, p = network_outputs(value, contexts)
        return state, p, joint4(value, state, p)
    if kind == "bigram":
        last = contexts[:, -1]
        columns = [
            value[last, a] * value[a, b] * value[b, c] * value[c, d]
            for a, b, c, d in itertools.product(range(len(value)), repeat=4)
        ]
        return last[:, None].astype(float), value[last], np.stack(columns, axis=1)
    return hmm.predict(*value, contexts)


def score(truth, output):
    _, p, f = truth
    _, q, g = output
    entropy = -(p * np.log2(p, out=np.zeros_like(p), where=p > 0)).sum(axis=1).mean()
    kl = rrxor.divergence(p, q).mean()
    return {
        "NextEntropyBits": entropy,
        "NextKlBits": kl,
        "NextCrossEntropyBits": entropy + kl,
        "Future4KlBits": rrxor.divergence(f, g).mean(),
    }


def verify_comparison(root):
    data = read(root, "hmm-comparison-results.json")
    all_models = models(root)
    assert data["Complete"] and len(data["Scores"]) == 124 and len(data["Probes"]) == 18
    expected = {(ident, length) for ident in all_models for length in [16, 64]}
    assert {(r["Model"], r["Length"]) for r in data["Scores"]} == expected
    panels, outputs = {}, {}
    maximum = 0.0
    for source in ["mess3", "rrxor"]:
        for length, tag in [(16, 31), (64, 32)]:
            panel = corpus(source, mess3.domain(1009, tag), 512, length)
            panels[source, length] = panel
            for ident, model in all_models.items():
                if model[0] == source:
                    outputs[ident, length] = predict(model, panel)
    for row in data["Scores"]:
        expected_score = score(
            outputs[row["Source"] + "-known", row["Length"]],
            outputs[row["Model"], row["Length"]],
        )
        for key, value in expected_score.items():
            maximum = max(maximum, abs(value - row[key]))
            np.testing.assert_allclose(value, row[key], atol=2e-9, rtol=2e-8)
    fit = corpus("rrxor", mess3.domain(1009, 33), 512, 16)
    fit_target = predict(all_models["rrxor-known"], fit)[0]
    for row in data["Probes"]:
        fitted = predict(all_models[row["Model"]], fit)
        test = outputs[row["Model"], row["Length"]]
        target = outputs["rrxor-known", row["Length"]][0]
        for name, index in [("Hidden", 0), ("Joint4Output", 2)]:
            actual = mess3.probe_score(
                mess3.ridge(fitted[index], fit_target, test[index]), target
            )
            for key, value in actual.items():
                maximum = max(maximum, abs(value - row[name][key]))
                np.testing.assert_allclose(value, row[name][key], atol=3e-8, rtol=2e-8)
    for row in data["OracleValidation"]:
        assert row["MaximumStateError"] < 1e-12
    return float(maximum)


def verify_training(root):
    data = read(root, "learned-hmm-results.json")
    configurations = {
        (s, n, seed)
        for s, sizes, seeds in [
            ("mess3", [3, 8], [11, 23, 37]),
            ("rrxor", [5, 8], [41, 53, 67]),
        ]
        for n in sizes
        for seed in seeds
    }
    assert {
        (r["Source"], r["States"], r["Seed"]) for r in data["Runs"]
    } == configurations
    maximum = 0.0
    for row in data["Runs"]:
        a, n, seed = row["Alphabet"], row["States"], row["Seed"]
        observations = corpus(row["Source"], mess3.domain(seed, 2), 65536, 33)
        assert (
            hashlib.sha256(observations.astype(np.uint8).tobytes()).hexdigest().upper()
            == row["CorpusSha256"]
        )
        prior, edges = hmm.initialize(a, n, seed)
        np.testing.assert_allclose(prior, row["InitialPrior"], atol=1e-14)
        np.testing.assert_allclose(edges.ravel(), row["InitialEdges"], atol=1e-14)
        assert [t["Pass"] for t in row["Trace"]] == list(range(9))
        for pass_index in range(8):
            prior, edges, loss = hmm.em_step(prior, edges, observations)
            np.testing.assert_allclose(
                loss, row["Trace"][pass_index]["CorpusLossNats"], atol=1e-5, rtol=1e-10
            )
        loss = -np.log(hmm.forward(prior, edges, observations)[1]).sum()
        np.testing.assert_allclose(
            loss, row["Trace"][8]["CorpusLossNats"], atol=1e-5, rtol=1e-10
        )
        maximum = max(maximum, float(np.max(np.abs(edges.ravel() - row["Edges"]))))
        np.testing.assert_allclose(prior, row["Prior"], atol=1e-9, rtol=1e-8)
        np.testing.assert_allclose(edges.ravel(), row["Edges"], atol=1e-9, rtol=1e-8)
        assert row["OptimizerTargetVisits"] == 8 * 65536 * 33
        assert row["FreeParameters"] == n - 1 + n * (a * n - 1)
        print(f"replayed training {row['Source']} n{n} s{seed}", flush=True)
    return maximum


def output_checksum(state, p, calls=4096):
    return sum(
        float(
            state[i % len(state), i % state.shape[1]]
            if i % 2 == 0
            else p[i % len(p), i % p.shape[1]]
        )
        for i in range(calls)
    )


def verify_cost(root):
    all_models = models(root)
    data = read(root, "matched-inference-results.json")
    expected = {
        ident
        for ident, (_, kind, _) in all_models.items()
        if kind in {"rnn", "hmm", "known"}
    }
    assert len(expected) == 32 and len(data["Measurements"]) == 160
    assert {(r["Model"], r["Repetition"]) for r in data["Measurements"]} == {
        (i, r) for i in expected for r in range(5)
    }
    checksums = {}
    for ident in expected:
        model = all_models[ident]
        panel = corpus(model[0], mess3.domain(1009, 35), 256, 64)
        output = predict(model, panel)
        checksums[ident] = output_checksum(*output[:2])
    for row in data["Measurements"]:
        assert (
            row["Calls"] == 4096
            and row["ThreadAllocatedBytes"] > 0
            and row["ElapsedMilliseconds"] > 0
        )
        np.testing.assert_allclose(row["Checksum"], checksums[row["Model"]], atol=2e-8)
    baseline = read(root, "rnn-layout-before-results.json")["Rows"]
    assert len(baseline) == 504
    for label in ["after", "struct"]:
        assert read(root, f"rnn-layout-{label}-results.json")["Rows"] == baseline
    for label in ["before", "after", "struct"]:
        rows = read(root, f"rnn-allocation-{label}-results.json")["Measurements"]
        assert len(rows) == 50
        for ident in ["mess3-h8-s11", "rrxor-h8-s41"]:
            for length in [0, 1, 16, 64, 256]:
                selected = [
                    r
                    for r in rows
                    if r["Model"] == ident and r["ContextLength"] == length
                ]
                assert sorted(r["Repetition"] for r in selected) == list(range(5))
                model = all_models[ident]
                panel = corpus(model[0], mess3.domain(1009, 34), 256, length)
                state, p = network_outputs(model[2], panel)
                for row in selected:
                    np.testing.assert_allclose(
                        row["Checksum"], output_checksum(state, p), atol=2e-8
                    )
    return len(data["Measurements"])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("root", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--training", action="store_true")
    args = parser.parse_args()
    if args.output.exists():
        raise ValueError("refusing to overwrite replay receipt")
    result = {
        "ComparisonMaximumError": verify_comparison(args.root),
        "CostRows": verify_cost(args.root),
    }
    if args.training:
        result["TrainingMaximumParameterError"] = verify_training(args.root)
    args.output.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
