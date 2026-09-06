"""Offline F#/Python checks; no pretrained weights or hidden-label training."""

import json
import subprocess
from pathlib import Path

import pytest
import torch

from zeta_interp.mess3_reference import verify_fixture


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
