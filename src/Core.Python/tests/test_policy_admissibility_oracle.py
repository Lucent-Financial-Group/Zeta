from __future__ import annotations

import json
from pathlib import Path

from zeta import policy_admissibility_oracle as oracle


def _root() -> Path:
    return Path(__file__).resolve().parents[3]


def _carrier(name: str) -> Path:
    return _root() / "docs" / "research" / "data" / name


def test_canonical_policy_admissibility_fixture_is_structurally_admitted() -> None:
    receipt = oracle.admit(
        _carrier("2026-09-06-policy-admissibility-v1-self-report.json"),
        _carrier("2026-09-06-policy-admissibility-v1-tick-envelope.json"),
        _carrier("2026-09-06-policy-admissibility-v1-constraint-basis.json"),
    )
    assert receipt["decision"] == "admit-for-ticks"
    assert receipt["registryRelation"] == "registry-derived-match"
    assert oracle.verify_carrier_fingerprints(
        receipt,
        _carrier("2026-09-06-policy-admissibility-v1-self-report.json"),
        _carrier("2026-09-06-policy-admissibility-v1-tick-envelope.json"),
        _carrier("2026-09-06-policy-admissibility-v1-constraint-basis.json"),
    )
    rendered = oracle.render(receipt)
    assert (
        rendered
        == _carrier("2026-09-06-policy-admissibility-v1-python.json").read_text()
    )
    assert (
        _carrier("2026-09-06-policy-admissibility-v1-fsharp.json").read_bytes()
        == _carrier("2026-09-06-policy-admissibility-v1-python.json").read_bytes()
    )
    assert oracle.authorize_execution(receipt, 17, []) == 17


def test_nci_label_defers_and_tampered_carrier_is_detected(tmp_path: Path) -> None:
    report = _carrier("2026-09-06-policy-admissibility-v1-self-report.json")
    envelope = _carrier("2026-09-06-policy-admissibility-v1-tick-envelope.json")
    basis = json.loads(
        _carrier("2026-09-06-policy-admissibility-v1-constraint-basis.json").read_text()
    )
    basis["kind"] = "nci-preservation"
    deferred_basis = tmp_path / "basis.json"
    deferred_basis.write_text(json.dumps(basis, separators=(",", ":")))
    deferred = oracle.admit(report, envelope, deferred_basis)
    assert deferred["decision"] == "defer-basis-not-implemented"

    canonical = oracle.admit(
        report,
        envelope,
        _carrier("2026-09-06-policy-admissibility-v1-constraint-basis.json"),
    )
    altered = tmp_path / "report.json"
    altered.write_text(report.read_text().replace("fixture/v1", "fixture/v2"))
    assert not oracle.verify_carrier_fingerprints(
        canonical,
        altered,
        envelope,
        _carrier("2026-09-06-policy-admissibility-v1-constraint-basis.json"),
    )
    invalid_basis = json.loads(
        _carrier("2026-09-06-policy-admissibility-v1-constraint-basis.json").read_text()
    )
    invalid_basis["kind"] = "global-score"
    invalid_basis_path = tmp_path / "invalid-basis.json"
    invalid_basis_path.write_text(json.dumps(invalid_basis, separators=(",", ":")))
    assert (
        oracle.admit(report, envelope, invalid_basis_path)["decision"]
        == "refuse-invalid-basis"
    )
    assert oracle.authorize_execution(canonical, 17, ["byte-cap", "reward-cap"]) is None
