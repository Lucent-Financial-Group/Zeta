"""Offline F#/Python checks; no pretrained weights or hidden-label training."""

import copy
import json
import subprocess
from pathlib import Path

import pytest
import torch

from zeta_interp.mess3_reference import verify_fixture
from zeta_interp.mess3_replay import replay_run, validate_receipt


@pytest.fixture(scope="module")
def native_fixture():
    root = Path(__file__).resolve().parents[3]
    completed = subprocess.run(
        [
            "dotnet",
            "fsi",
            "--warnaserror",
            "--optimize+",
            "src/Research.FSharp/check-mess3-kernel.fsx",
        ],
        cwd=root,
        capture_output=True,
        text=True,
        check=True,
        timeout=120,
    )
    return json.loads(completed.stdout)


def test_independent_fraction_forward_gradient_and_ridge(native_fixture):
    assert verify_fixture(native_fixture)["status"] == "passed"


def test_reference_rejects_a_corrupted_native_gradient(native_fixture):
    corrupted = dict(native_fixture)
    corrupted["Gradient"] = list(native_fixture["Gradient"])
    corrupted["Gradient"][0] += 0.01
    with pytest.raises(ValueError, match="gradient mismatch"):
        verify_fixture(corrupted)


def test_native_gradient_matches_pytorch_autograd(native_fixture):
    weights = torch.tensor(
        native_fixture["Parameters"], dtype=torch.float64, requires_grad=True
    )
    recurrent = weights[:9].reshape(3, 3)
    inputs = weights[9:18].reshape(3, 3)
    hidden_bias = weights[18:21]
    output = weights[21:30].reshape(3, 3)
    output_bias = weights[30:33]
    state = torch.zeros(3, dtype=torch.float64)
    tokens = native_fixture["Tokens"]
    logits = []
    for token in tokens[:-1]:
        state = torch.tanh(recurrent @ state + inputs[:, token] + hidden_bias)
        logits.append(output @ state + output_bias)
    loss = torch.nn.functional.cross_entropy(
        torch.stack(logits), torch.tensor(tokens[1:])
    )
    loss.backward()
    assert loss.item() == pytest.approx(native_fixture["Loss"], abs=1e-12)
    assert weights.grad is not None
    expected = torch.tensor(native_fixture["Gradient"], dtype=torch.float64)
    torch.testing.assert_close(weights.grad, expected, atol=1e-12, rtol=1e-10)


@pytest.mark.parametrize("clipped", [False, True])
def test_native_optimizer_matches_pytorch_adam(native_fixture, clipped):
    fixture = next(
        x for x in native_fixture["OptimizerChecks"] if x["Clipped"] == clipped
    )
    config = fixture["Config"]
    weights = torch.tensor(fixture["Initial"], dtype=torch.float64, requires_grad=True)
    optimizer = torch.optim.Adam(
        [weights],
        lr=config["LearningRate"],
        betas=(0.9, 0.999),
        eps=1e-8,
        foreach=False,
    )
    norms, losses = [], []
    for update in range(config["Steps"]):
        optimizer.zero_grad()
        batch = fixture["Sequences"][
            update * config["Batch"] : (update + 1) * config["Batch"]
        ]
        tokens = torch.tensor(batch)
        state = torch.zeros((config["Batch"], 3), dtype=torch.float64)
        logits = []
        for token in tokens[:, :-1].T:
            state = torch.tanh(
                state @ weights[:9].reshape(3, 3).T
                + weights[9:18].reshape(3, 3)[:, token].T
                + weights[18:21]
            )
            logits.append(state @ weights[21:30].reshape(3, 3).T + weights[30:33])
        loss = torch.nn.functional.cross_entropy(
            torch.stack(logits, dim=1).reshape(-1, 3), tokens[:, 1:].reshape(-1)
        )
        losses.append(loss.item())
        loss.backward()
        assert weights.grad is not None
        norm = torch.linalg.vector_norm(weights.grad).item()
        norms.append(norm)
        weights.grad.mul_(1 / max(1, norm))
        optimizer.step()
    assert any(n > 1 for n in norms) == clipped
    expected = torch.tensor(fixture["Final"], dtype=torch.float64)
    torch.testing.assert_close(weights.detach(), expected, atol=1e-11, rtol=1e-10)
    for row in fixture["Trace"]:
        assert losses[row["Step"] - 1] == pytest.approx(row["LossNats"], abs=1e-12)


@pytest.fixture(scope="module")
def registered_receipt():
    root = Path(__file__).resolve().parents[3]
    with (root / "src/Research.FSharp/mess3-learned-belief-results.json").open(
        encoding="utf-8"
    ) as source:
        receipt = json.load(source)
    assert validate_receipt(receipt) is False
    return receipt


@pytest.mark.parametrize(
    "hidden,seed", [(h, s) for h in (3, 8, 16) for s in (11, 23, 37)]
)
def test_every_registered_run_replays_independently(registered_receipt, hidden, seed):
    run = next(
        r
        for r in registered_receipt["Runs"]
        if (r["Hidden"], r["Seed"]) == (hidden, seed)
    )
    result = replay_run(run)
    assert result["comparisons"] == 70
    assert result["maximum_absolute_error"] < 1e-8


@pytest.mark.parametrize("removal", ["run", "panel", "prediction", "probe"])
def test_receipt_cannot_pass_by_losing_cases(registered_receipt, removal):
    receipt = copy.deepcopy(registered_receipt)
    if removal == "run":
        receipt["Runs"].pop()
    elif removal == "panel":
        receipt["Runs"][0]["Evaluations"].pop()
    elif removal == "prediction":
        receipt["Runs"][0]["Evaluations"][0]["Predictions"].pop()
    else:
        receipt["Runs"][0]["Evaluations"][0]["Probes"].pop()
    with pytest.raises(ValueError, match="changed"):
        validate_receipt(receipt)
