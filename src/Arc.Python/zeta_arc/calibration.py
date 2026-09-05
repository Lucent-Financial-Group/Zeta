"""Calibration evidence for ARC coordinate pre-commitment fields.

The displayed mass is a probabilistic claim: among decisions whose selected
coordinate carries mass ``p``, that coordinate should be committed at rate
``p``. A refusal is an observed zero, not a dropped row. This module records
real ``ClickPolicy.decide`` outcomes and reports both a binary Brier score and
ten-bin expected calibration error (ECE).

The current object-centroid policy is deterministic, so this instrument is
expected to report it as uncalibrated. The result is evidence about the current
implementation, not a gate that changes the implementation until it passes.
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path

from arcengine import GameAction

from zeta_arc.click import ClickPolicy, CoordinateMass
from zeta_arc.driver import advance, reset
from zeta_arc.environments.click_target import ZetaClickTarget
from zeta_arc.frames import grid_of

CALIBRATION_VERSION = 1
CALIBRATION_BINS = 10
MINIMUM_SAMPLE_COUNT = 20
DEFAULT_TOLERANCE = 0.05
DEFAULT_REPETITIONS_PER_GATE = 10


def _rounded(value: float) -> float:
    return round(value, 12)


@dataclass(frozen=True)
class CoordinateCalibrationSample:
    """One displayed coordinate field and its subsequent policy outcome."""

    tick: int
    minimum_mass: float
    masses: tuple[CoordinateMass, ...]
    selected: tuple[int, int]
    committed: tuple[int, int] | None
    levels_completed: int

    @property
    def selected_probability(self) -> float:
        return next(
            mass.probability
            for mass in self.masses
            if (mass.x, mass.y) == self.selected
        )

    @property
    def selected_was_committed(self) -> bool:
        return self.committed == self.selected

    def to_payload(self) -> dict[str, object]:
        outcome: dict[str, object]
        if self.committed is None:
            outcome = {"kind": "refused", "levelsCompleted": self.levels_completed}
        else:
            outcome = {
                "kind": "committed",
                "levelsCompleted": self.levels_completed,
                "point": {"x": self.committed[0], "y": self.committed[1]},
            }
        return {
            "masses": [
                {"probability": mass.probability, "x": mass.x, "y": mass.y}
                for mass in self.masses
            ],
            "minimumMass": self.minimum_mass,
            "outcome": outcome,
            "selected": {"x": self.selected[0], "y": self.selected[1]},
            "tick": self.tick,
        }


@dataclass(frozen=True)
class CoordinateCalibrationReport:
    """Proper-score and reliability summary for selected-coordinate commits."""

    sample_count: int
    commit_count: int
    refusal_count: int
    mean_selected_mass: float
    observed_selected_rate: float
    brier_score: float
    expected_calibration_error: float
    maximum_gate_calibration_error: float
    tolerance: float
    verdict: str

    def to_payload(self) -> dict[str, object]:
        return {
            "brierScore": self.brier_score,
            "commitCount": self.commit_count,
            "expectedCalibrationError": self.expected_calibration_error,
            "meanSelectedMass": self.mean_selected_mass,
            "maximumGateCalibrationError": self.maximum_gate_calibration_error,
            "observedSelectedRate": self.observed_selected_rate,
            "refusalCount": self.refusal_count,
            "sampleCount": self.sample_count,
            "tolerance": self.tolerance,
            "verdict": self.verdict,
        }


def measure(
    samples: tuple[CoordinateCalibrationSample, ...],
    tolerance: float = DEFAULT_TOLERANCE,
) -> CoordinateCalibrationReport:
    """Measure selected-action calibration without discarding refusals."""
    count = len(samples)
    if count == 0:
        return CoordinateCalibrationReport(
            sample_count=0,
            commit_count=0,
            refusal_count=0,
            mean_selected_mass=0.0,
            observed_selected_rate=0.0,
            brier_score=0.0,
            expected_calibration_error=0.0,
            maximum_gate_calibration_error=0.0,
            tolerance=tolerance,
            verdict="insufficient-data",
        )

    probabilities = [sample.selected_probability for sample in samples]
    observations = [1.0 if sample.selected_was_committed else 0.0 for sample in samples]
    bins: list[list[tuple[float, float]]] = [[] for _ in range(CALIBRATION_BINS)]
    for probability, observed in zip(probabilities, observations, strict=True):
        bin_index = min(CALIBRATION_BINS - 1, int(probability * CALIBRATION_BINS))
        bins[bin_index].append((probability, observed))

    ece = 0.0
    for bucket in bins:
        if not bucket:
            continue
        mean_probability = sum(probability for probability, _ in bucket) / len(bucket)
        observed_rate = sum(observed for _, observed in bucket) / len(bucket)
        ece += len(bucket) / count * abs(mean_probability - observed_rate)

    gate_buckets: dict[float, list[tuple[float, float]]] = {}
    for sample, probability, observed in zip(
        samples, probabilities, observations, strict=True
    ):
        gate_buckets.setdefault(sample.minimum_mass, []).append((probability, observed))
    maximum_gate_error = max(
        abs(
            sum(probability for probability, _ in bucket) / len(bucket)
            - sum(observed for _, observed in bucket) / len(bucket)
        )
        for bucket in gate_buckets.values()
    )

    commit_count = sum(sample.committed is not None for sample in samples)
    brier = (
        sum(
            (probability - observed) ** 2
            for probability, observed in zip(probabilities, observations, strict=True)
        )
        / count
    )
    verdict = (
        "insufficient-data"
        if count < MINIMUM_SAMPLE_COUNT
        else "calibrated"
        if max(ece, maximum_gate_error) <= tolerance
        else "uncalibrated"
    )
    return CoordinateCalibrationReport(
        sample_count=count,
        commit_count=commit_count,
        refusal_count=count - commit_count,
        mean_selected_mass=_rounded(sum(probabilities) / count),
        observed_selected_rate=_rounded(sum(observations) / count),
        brier_score=_rounded(brier),
        expected_calibration_error=_rounded(ece),
        maximum_gate_calibration_error=_rounded(maximum_gate_error),
        tolerance=tolerance,
        verdict=verdict,
    )


def record_click_calibration(
    repetitions_per_gate: int = DEFAULT_REPETITIONS_PER_GATE,
) -> tuple[CoordinateCalibrationSample, ...]:
    """Record equal cohorts below and above the current confidence gate."""
    samples: list[CoordinateCalibrationSample] = []
    thresholds = (0.0, 0.5)
    for tick in range(max(0, repetitions_per_gate) * len(thresholds)):
        game = ZetaClickTarget(seed=tick)
        frame = reset(game)
        threshold = thresholds[tick % len(thresholds)]
        decision = ClickPolicy().decide(grid_of(frame), threshold)
        levels_completed = int(frame.levels_completed)
        if decision.committed is not None:
            frame = advance(
                game,
                GameAction.ACTION6,
                x=decision.committed[0],
                y=decision.committed[1],
            )
            levels_completed = int(frame.levels_completed)
        samples.append(
            CoordinateCalibrationSample(
                tick=tick,
                minimum_mass=decision.minimum_mass,
                masses=decision.forecast.masses,
                selected=decision.forecast.selected,
                committed=decision.committed,
                levels_completed=levels_completed,
            )
        )
    return tuple(samples)


def calibration_json() -> str:
    """Return the canonical corpus and the Python-computed report."""
    samples = record_click_calibration()
    payload = {
        "calibrationVersion": CALIBRATION_VERSION,
        "kind": "arc-coordinate-calibration",
        "policy": "object-centroid-prior-v1",
        "report": measure(samples).to_payload(),
        "samples": [sample.to_payload() for sample in samples],
    }
    return json.dumps(payload, indent=2, sort_keys=True) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, help="write canonical JSON to this path")
    args = parser.parse_args()
    text = calibration_json()
    if args.output is None:
        print(text, end="")
        return
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(text, encoding="utf-8")


if __name__ == "__main__":
    main()
