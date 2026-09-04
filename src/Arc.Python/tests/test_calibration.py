"""Falsifiers for the ARC coordinate pre-commitment calibration meter."""

from pathlib import Path

from zeta_arc.calibration import (
    CoordinateCalibrationSample,
    calibration_json,
    measure,
    record_click_calibration,
)
from zeta_arc.click import ClickPolicy, CoordinateMass
from zeta_arc.driver import reset
from zeta_arc.environments.click_target import ZetaClickTarget
from zeta_arc.frames import grid_of


def _control_samples(
    outcomes: tuple[bool, ...],
) -> tuple[CoordinateCalibrationSample, ...]:
    masses = (
        CoordinateMass(10, 12, 1 / 3),
        CoordinateMass(44, 14, 1 / 3),
        CoordinateMass(28, 48, 1 / 3),
    )
    selected = (10, 12)
    return tuple(
        CoordinateCalibrationSample(
            tick=tick,
            minimum_mass=0.0,
            masses=masses,
            selected=selected,
            committed=selected if committed else None,
            levels_completed=1 if committed else 0,
        )
        for tick, committed in enumerate(outcomes)
    )


def test_current_policy_is_measured_as_uncalibrated() -> None:
    samples = record_click_calibration()
    report = measure(samples)

    assert len(samples) == 20
    assert report.commit_count == 10
    assert report.refusal_count == 10
    assert report.mean_selected_mass == 0.333333333333
    assert report.observed_selected_rate == 0.5
    assert report.brier_score == 0.277777777778
    assert report.expected_calibration_error == 0.166666666667
    assert report.maximum_gate_calibration_error == 0.666666666667
    assert report.verdict == "uncalibrated"


def test_refusal_does_not_consume_the_selected_coordinate() -> None:
    frame = reset(ZetaClickTarget(seed=0))
    policy = ClickPolicy()

    refused = policy.decide(grid_of(frame), minimum_mass=0.5)
    committed = policy.decide(grid_of(frame), minimum_mass=0.0)
    non_finite = ClickPolicy().decide(grid_of(frame), minimum_mass=float("nan"))

    assert refused.committed is None
    assert committed.committed == refused.forecast.selected
    assert non_finite.minimum_mass == 1.0
    assert non_finite.committed is None


def test_meter_accepts_a_calibrated_control_and_rejects_an_outcome_mutant() -> None:
    calibrated = _control_samples((True, False, False) * 7)
    mutant = _control_samples((True,) * 21)

    calibrated_report = measure(calibrated)
    mutant_report = measure(mutant)

    assert calibrated_report.expected_calibration_error == 0.0
    assert calibrated_report.maximum_gate_calibration_error == 0.0
    assert calibrated_report.brier_score == 0.222222222222
    assert calibrated_report.verdict == "calibrated"
    assert mutant_report.expected_calibration_error == 0.666666666667
    assert mutant_report.verdict == "uncalibrated"


def test_calibration_artifact_is_byte_identical_to_the_generator() -> None:
    root = Path(__file__).resolve().parents[3]
    artifact = (
        root
        / "src"
        / "apps"
        / "twitch-ai"
        / "src"
        / "recordings"
        / "arc-coordinate-calibration.json"
    )

    assert artifact.read_text(encoding="utf-8") == calibration_json()
