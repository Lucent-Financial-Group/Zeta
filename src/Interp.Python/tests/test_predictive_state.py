"""Native gradients, exact finite processes, and all preregistered model results."""

import copy
import itertools
import json
import subprocess
from collections import Counter
from fractions import Fraction
from pathlib import Path

import numpy as np
import pytest
import torch

from zeta_interp.inference_replay import verify as verify_inference
from zeta_interp.predictive_reference import filter_word, fixtures, verify
from zeta_interp.rrxor_replay import replay, validate

ROOT = Path(__file__).resolve().parents[3]


def test_block_generator_matches_edge_model_exactly_at_all_stationary_phases():
    length = 8
    population = Counter()
    for phase in range(3):
        blocks = (length + phase + 2) // 3
        for draws in itertools.product(range(2), repeat=2 * blocks):
            emitted = []
            for a, b in zip(draws[::2], draws[1::2], strict=True):
                emitted.extend((a, b, a ^ b))
            population[tuple(emitted[phase : phase + length])] += Fraction(
                1, 3 * 2 ** (2 * blocks)
            )
    model = fixtures()["rrxor"]
    for word in itertools.product(range(2), repeat=length):
        assert population[word] == filter_word(model, word)[0]


@pytest.fixture(scope="module")
def native():
    result = subprocess.run(
        [
            "dotnet",
            "fsi",
            "--warnaserror",
            "--optimize+",
            "src/Research.FSharp/check-predictive-kernel.fsx",
        ],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=True,
        timeout=120,
    )
    return json.loads(result.stdout)


def objective(parameters, tokens, alphabet, hidden):
    end_recurrent = hidden * hidden
    end_inputs = end_recurrent + alphabet * hidden
    end_bias = end_inputs + hidden
    end_output = end_bias + alphabet * hidden
    state = torch.zeros((len(tokens), hidden), dtype=torch.float64)
    logits = []
    for column in tokens[:, :-1].T:
        state = torch.tanh(
            state @ parameters[:end_recurrent].reshape(hidden, hidden).T
            + parameters[end_recurrent:end_inputs]
            .reshape(hidden, alphabet)[:, column]
            .T
            + parameters[end_inputs:end_bias]
        )
        logits.append(
            state @ parameters[end_bias:end_output].reshape(alphabet, hidden).T
            + parameters[end_output:]
        )
    return torch.nn.functional.cross_entropy(
        torch.stack(logits, dim=1).reshape(-1, alphabet), tokens[:, 1:].reshape(-1)
    )


@pytest.mark.parametrize("alphabet", [2, 3])
def test_generalized_native_gradient_matches_autograd(native, alphabet):
    case = next(row for row in native if row["Alphabet"] == alphabet)
    parameters = torch.tensor(
        case["Parameters"], dtype=torch.float64, requires_grad=True
    )
    loss = objective(
        parameters, torch.tensor([case["Tokens"]]), alphabet, case["Hidden"]
    )
    loss.backward()
    assert loss.item() == pytest.approx(case["Loss"], abs=1e-12)
    torch.testing.assert_close(
        parameters.grad,
        torch.tensor(case["Gradient"], dtype=torch.float64),
        atol=1e-12,
        rtol=1e-10,
    )


@pytest.mark.parametrize(
    "alphabet,clipped", [(a, c) for a in (2, 3) for c in (False, True)]
)
def test_generalized_optimizer_matches_autograd(native, alphabet, clipped):
    case = next(row for row in native if row["Alphabet"] == alphabet)
    fixture = next(row for row in case["OptimizerChecks"] if row["Clipped"] == clipped)
    parameters = torch.tensor(
        fixture["Initial"], dtype=torch.float64, requires_grad=True
    )
    optimizer = torch.optim.Adam([parameters], lr=0.003, foreach=False)
    norms = []
    losses = []
    for step in range(4):
        optimizer.zero_grad()
        tokens = torch.tensor(fixture["Sequences"][2 * step : 2 * step + 2])
        loss = objective(parameters, tokens, alphabet, case["Hidden"])
        loss.backward()
        assert parameters.grad is not None
        norm = torch.linalg.vector_norm(parameters.grad).item()
        norms.append(norm)
        parameters.grad.mul_(1 / max(1, norm))
        optimizer.step()
        losses.append(loss.item())
    assert any(value > 1 for value in norms) == clipped
    torch.testing.assert_close(
        parameters.detach(),
        torch.tensor(fixture["Final"], dtype=torch.float64),
        atol=1e-11,
        rtol=1e-10,
    )
    for row in fixture["Trace"]:
        assert row["LossNats"] == pytest.approx(losses[row["Step"] - 1], abs=1e-12)


@pytest.fixture(scope="module")
def laws():
    return json.loads(
        (ROOT / "src/Research.FSharp/predictive-laws-results.json").read_text(
            encoding="utf-8"
        )
    )


def test_every_entropy_identity_and_generalized_spectral_power(laws):
    result = verify(laws)
    assert result["loss_comparisons"] == 1080
    assert result["spectral"]["powers_verified"] == 64


@pytest.mark.parametrize("removed", ["model", "loss", "context"])
def test_law_coverage_cannot_shrink(laws, removed):
    data = copy.deepcopy(laws)
    if removed == "model":
        data["Models"].pop()
    elif removed == "loss":
        data["Models"][0]["Losses"].pop()
    else:
        data["Models"][0]["EntropyCurve"].pop()
    with pytest.raises(ValueError, match="changed"):
        verify(data)


@pytest.fixture(scope="module")
def trained():
    data = json.loads(
        (ROOT / "src/Research.FSharp/rrxor-learned-belief-results.json").read_text(
            encoding="utf-8"
        )
    )
    validate(data)
    return data


@pytest.mark.parametrize(
    "hidden,seed", [(h, s) for h in (3, 8, 16) for s in (41, 53, 67)]
)
def test_every_rrxor_result_and_intervention_replays(trained, hidden, seed):
    row = next(r for r in trained["Runs"] if (r["Hidden"], r["Seed"]) == (hidden, seed))
    result = replay(row, trained["InterventionPairs"])
    assert result["comparisons"] == 340


@pytest.mark.parametrize(
    "removed", ["run", "panel", "prediction", "probe", "intervention", "pair", "trace"]
)
def test_rrxor_coverage_cannot_shrink(trained, removed):
    data = copy.deepcopy(trained)
    if removed == "run":
        data["Runs"].pop()
    elif removed == "panel":
        data["Runs"][0]["Evaluations"].pop()
    elif removed == "prediction":
        data["Runs"][0]["Evaluations"][0]["Predictions"].pop()
    elif removed == "probe":
        data["Runs"][0]["Evaluations"][0]["Probes"].pop()
    elif removed == "intervention":
        data["Runs"][0]["Interventions"].pop()
    elif removed == "trace":
        data["Runs"][0]["TrainingTrace"].pop()
    else:
        data["InterventionPairs"].pop()
    with pytest.raises(ValueError, match="changed"):
        validate(data)


def test_mismatched_prediction_is_detected(trained):
    row = copy.deepcopy(trained["Runs"][0])
    row["Evaluations"][0]["Predictions"][0]["NextKlBits"] += 0.01
    with pytest.raises(ValueError, match="mismatch"):
        replay(row, trained["InterventionPairs"])


def test_intervention_is_not_vacuous(trained):
    for row in trained["Runs"]:
        for intervention in row["Interventions"]:
            assert intervention["IntactKlBits"] == intervention["IdentityKlBits"]
            assert np.isfinite(intervention["Changes"]).all()


@pytest.fixture(scope="module")
def inference():
    return json.loads(
        (ROOT / "src/Research.FSharp/predictive-inference-results.json").read_text(
            encoding="utf-8"
        )
    )


def test_inference_consumes_every_frozen_model_output(inference):
    result = verify_inference(inference, ROOT / "src/Research.FSharp")
    assert result["measurements"] == 190


@pytest.mark.parametrize(
    "change", ["candidate", "repetition", "checksum", "configuration"]
)
def test_inference_cannot_pass_by_dropping_work(inference, change):
    data = copy.deepcopy(inference)
    if change == "candidate":
        data["Measurements"] = [
            r
            for r in data["Measurements"]
            if r["Model"] != data["Measurements"][0]["Model"]
        ]
    elif change == "repetition":
        data["Measurements"].pop()
    elif change == "checksum":
        data["Measurements"][0]["Checksum"] += 0.1
    else:
        data["Calls"] -= 1
    with pytest.raises(ValueError):
        verify_inference(data, ROOT / "src/Research.FSharp")
