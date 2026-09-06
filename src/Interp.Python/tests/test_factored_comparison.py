"""Retained-result replay plus exact finite-word checks of the current native kernel."""

import itertools
import json
import subprocess
from fractions import Fraction
from pathlib import Path

import numpy as np

from zeta_interp.comparison_replay import verify_comparison, verify_cost
from zeta_interp.factor_change_replay import verify_change, verify_factors
from zeta_interp.predictive_reference import fixtures

ROOT = Path(__file__).resolve().parents[3]
RECEIPTS = ROOT / "src/Research.FSharp"


def test_every_registered_common_panel_prediction_and_probe_replays():
    assert verify_comparison(RECEIPTS) < 3e-8


def test_matched_contract_checksums_and_all_three_layout_witnesses():
    assert verify_cost(RECEIPTS) == 160


def test_every_change_stream_alarm_time_and_final_likelihood_replays():
    assert len(verify_change(RECEIPTS)) == 4


def test_every_shared_factor_prediction_and_benchmark_checksum_replays():
    assert len(verify_factors(RECEIPTS)) == 54


def test_current_known_binary64_filters_match_exact_word_enumeration():
    result = subprocess.run(
        [
            "dotnet",
            "fsi",
            "--warnaserror",
            "--optimize+",
            "src/Research.FSharp/check-known-binary64.fsx",
        ],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=True,
        timeout=120,
    )
    cases = json.loads(result.stdout)
    assert len(cases) == 32
    for case in cases:
        if case["Source"] == "mess3":
            prior = [Fraction(1, 3)] * 3
            matrices = np.array(
                [
                    [
                        [
                            Fraction((18 if i == j else 1) * (34 if x == j else 3), 800)
                            for j in range(3)
                        ]
                        for i in range(3)
                    ]
                    for x in range(3)
                ],
                dtype=object,
            )
        else:
            prior = [Fraction(x, 6) for x in [2, 1, 1, 1, 1]]
            matrices = np.full((2, 5, 5), Fraction(0), dtype=object)
            for i, x, j, p in fixtures()["rrxor"][1]:
                matrices[x, i, j] = p
        belief = np.array(prior, dtype=object)
        for token in case["Tokens"]:
            belief = belief @ matrices[token]
            belief /= sum(belief)
        np.testing.assert_allclose(belief.astype(float), case["State"], atol=1e-13)
        for length, key in [(1, "Next"), (4, "Future4")]:
            values = []
            for word in itertools.product(range(len(matrices)), repeat=length):
                weight = belief.copy()
                for token in word:
                    weight = weight @ matrices[token]
                values.append(float(sum(weight)))
            np.testing.assert_allclose(values, case[key], atol=1e-13)
