"""Check benchmark coverage and consumed outputs, not hardware timing equality."""

import hashlib
import itertools
import json
import math
from pathlib import Path

import numpy as np

from zeta_interp import mess3_replay as mess3
from zeta_interp import rrxor_replay as rrxor


def verify(receipt, directory):
    if (
        receipt.get("Protocol") != "predictive-inference-v1"
        or receipt.get("Complete") is not True
    ):
        raise ValueError("incomplete or changed inference protocol")
    for key, expected in {
        "Calls": 4096,
        "Repetitions": 5,
        "WarmupCalls": 256,
        "Contexts": 256,
        "ContextLength": 64,
        "DataSeed": 1009,
        "DataDomain": 9,
    }.items():
        if receipt.get(key) != expected:
            raise ValueError("changed benchmark configuration")
    input_names = [
        "mess3-learned-belief-results.json",
        "rrxor-learned-belief-results.json",
    ]
    if [row["File"] for row in receipt["InputReceipts"]] != input_names:
        raise ValueError("changed input coverage")
    predictions, payloads = {}, {}
    for source in receipt["InputReceipts"]:
        data = (directory / source["File"]).read_bytes()
        if hashlib.sha256(data).hexdigest().upper() != source["Sha256"]:
            raise ValueError("changed input receipt hash")
        stored = json.loads(data)
        label = "mess3" if source["File"].startswith("mess3") else "rrxor"
        alphabet = 3 if label == "mess3" else 2
        module = mess3 if label == "mess3" else rrxor
        if label == "mess3":
            mess3.validate_receipt(stored)
        else:
            rrxor.validate(stored)
        contexts, observed = module.observations(mess3.domain(1009, 9), 256, 63)
        contexts = np.column_stack([contexts, observed])
        for run in stored["Runs"]:
            identifier = f"{label}-h{run['Hidden']}-s{run['Seed']}"
            model = mess3.Network(run["Hidden"], run["Parameters"], alphabet)
            predictions[identifier] = model.after(contexts)[1]
            payloads[identifier] = (len(run["Parameters"]) + run["Hidden"]) * 8
            predictions[identifier + "-bigram"] = np.array(run["Bigram"])[
                contexts[:, -1]
            ]
            payloads[identifier + "-bigram"] = alphabet * alphabet * 8 + 4
        name = "mess3-known-filter" if label == "mess3" else "rrxor-known-exact-filter"
        predictions[name] = (
            mess3.known_after(contexts)[1]
            if label == "mess3"
            else rrxor.known(contexts)[1]
        )
        payloads[name] = 132 if label == "mess3" else None
    if (
        len(receipt["NumericPayload"]) != 38
        or {row["Model"]: row["Bytes"] for row in receipt["NumericPayload"]} != payloads
    ):
        raise ValueError("changed numeric payload coverage")
    rows = receipt["Measurements"]
    expected_keys = set(itertools.product(predictions, range(5)))
    if (
        len(rows) != 190
        or {(r["Model"], r["Repetition"]) for r in rows} != expected_keys
    ):
        raise ValueError("changed benchmark coverage")
    for repetition in range(5):
        actual_order = [row["Model"] for row in rows if row["Repetition"] == repetition]
        base = [row["Model"] for row in rows if row["Repetition"] == 0]
        if actual_order != base[repetition:] + base[:repetition]:
            raise ValueError("changed rotation schedule")
    checksum_error = 0.0
    for row in rows:
        if (
            row["Calls"] != 4096
            or not isinstance(row["ThreadAllocatedBytes"], int)
            or row["ThreadAllocatedBytes"] < 0
        ):
            raise ValueError("invalid allocation or call count")
        for key in ("ElapsedMilliseconds", "ProcessCpuMilliseconds"):
            if not math.isfinite(row[key]) or row[key] < 0:
                raise ValueError("invalid timing measurement")
        output = predictions[row["Model"]]
        expected = sum(output[i % 256, i % output.shape[1]] for i in range(4096))
        error = abs(row["Checksum"] - expected)
        if not math.isfinite(error) or error > 1e-8:
            raise ValueError("output checksum mismatch")
        checksum_error = max(checksum_error, float(error))
    if receipt["ProcessPeakWorkingSetBytes"] < 0:
        raise ValueError("invalid runtime-inclusive memory counter")
    return {
        "status": "passed",
        "candidates": 38,
        "measurements": len(rows),
        "maximum_checksum_error": checksum_error,
        "peak_memory_status": "unavailable"
        if receipt["ProcessPeakWorkingSetBytes"] == 0
        else "runtime-inclusive-only",
    }


if __name__ == "__main__":
    directory = Path(__file__).resolve().parents[2] / "Research.FSharp"
    receipt = json.loads(
        (directory / "predictive-inference-results.json").read_text(encoding="utf-8")
    )
    print(json.dumps(verify(receipt, directory), indent=2))
