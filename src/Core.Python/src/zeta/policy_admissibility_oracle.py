"""Independent validator for PolicyAdmissibilityReceipt/v1.

This fixture validates finite self-reports, attributed tick envelopes, and
constraint bases. It does not execute or rank a policy.
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path
from typing import Any

ALLOWED_INPUT_MEASURES = frozenset({"observations", "cells", "branches", "handlers"})
ALLOWED_BASIS_KINDS = frozenset({"test-only", "nci-preservation", "recorded-consensus"})


def _raw(path: Path) -> tuple[dict[str, Any], str]:
    data = path.read_bytes()
    parsed = json.loads(data)
    if not isinstance(parsed, dict):
        raise TypeError("invalid-json-root")
    return parsed, hashlib.sha256(data).hexdigest()


def _nonempty(value: object, name: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"missing-or-empty:{name}")
    return value


def _shape(value: str) -> tuple[int, int] | None:
    if not value.startswith("O(") or not value.endswith(")"):
        return None
    terms = value[2:-1].split("+")
    shapes: list[tuple[int, int]] = []
    for term in terms:
        degree = 0
        logs = 0
        for factor in term.strip().split("·"):
            item = factor.strip()
            if not item:
                return None
            if item.isdigit():
                continue
            if item.startswith("log"):
                logs += 1
            elif item.endswith("²"):
                degree += 2
            elif item.endswith("³"):
                degree += 3
            elif all(character.isalnum() or character in "-|Δ" for character in item):
                degree += 1
            else:
                return None
        shapes.append((degree, logs))
    return max(shapes)


def _registry_relation(
    report: dict[str, Any], time_shape: tuple[int, int], space_shape: tuple[int, int]
) -> str:
    # The first fixture's independent registry view contains only its declared
    # local operation. A later oracle can extend this finite table without
    # importing or parsing F# source.
    fixture_rows = {
        ("rng.splitmix64", "mix"): ("O(1)", "O(1)", "registry-derived-match"),
    }
    row = fixture_rows.get((report["policyId"], report["operation"]))
    if row is None:
        return "unmatched"
    registry_time, registry_space, relation = row
    if _shape(registry_time) == time_shape and _shape(registry_space) == space_shape:
        return relation
    return "unmatched"


def admit(
    self_report_path: Path, tick_envelope_path: Path, constraint_basis_path: Path
) -> dict[str, object]:
    report, report_sha = _raw(self_report_path)
    envelope, envelope_sha = _raw(tick_envelope_path)
    basis, basis_sha = _raw(constraint_basis_path)
    base: dict[str, object] = {
        "version": "PolicyAdmissibilityReceipt/v1",
        "selfReportSha256": report_sha,
        "tickEnvelopeSha256": envelope_sha,
        "constraintBasisSha256": basis_sha,
        "timeDegree": -1,
        "timeLogs": -1,
        "spaceDegree": -1,
        "spaceLogs": -1,
        "registryRelation": "unavailable",
    }
    try:
        for key in (
            "policyId",
            "revision",
            "operation",
            "inputMeasureId",
            "timeO",
            "spaceO",
            "declaredBy",
            "declarationKind",
        ):
            _nonempty(report.get(key), key)
        if (
            report["declarationKind"] != "self-reported"
            or report["inputMeasureId"] not in ALLOWED_INPUT_MEASURES
        ):
            decision, detail = (
                "refuse-invalid-self-report",
                "unsupported-declaration-kind-or-input-measure",
            )
        elif (
            not isinstance(envelope.get("maxTicks"), int)
            or envelope["maxTicks"] < 1
            or envelope.get("envelopeKind") != "bounded-duration"
        ):
            decision, detail = (
                "refuse-invalid-envelope",
                "invalid-bounded-duration-envelope",
            )
        else:
            for key in ("sourceId", "chosenBy", "rationale", "envelopeKind"):
                _nonempty(envelope.get(key), key)
            for key in ("kind", "basisId", "evidenceRef", "scope", "status"):
                _nonempty(basis.get(key), key)
            if (
                basis["status"] != "declared"
                or basis["kind"] not in ALLOWED_BASIS_KINDS
            ):
                decision, detail = "refuse-invalid-basis", "unknown-or-undeclared-basis"
            else:
                time_shape = _shape(str(report["timeO"]))
                space_shape = _shape(str(report["spaceO"]))
                if time_shape is None or space_shape is None:
                    decision, detail = (
                        "refuse-invalid-self-report",
                        "unparseable-time-or-space-shape",
                    )
                else:
                    relation = _registry_relation(report, time_shape, space_shape)
                    base.update(
                        timeDegree=time_shape[0],
                        timeLogs=time_shape[1],
                        spaceDegree=space_shape[0],
                        spaceLogs=space_shape[1],
                        registryRelation=relation,
                    )
                    if basis["kind"] in {"nci-preservation", "recorded-consensus"}:
                        decision, detail = (
                            "defer-basis-not-implemented",
                            "basis-carried-but-not-implemented",
                        )
                    elif relation == "unmatched":
                        decision, detail = (
                            "defer-unmatched-registry",
                            "self-report-has-no-matching-registry-row",
                        )
                    else:
                        decision, detail = (
                            "admit-for-ticks",
                            "structural-admission-only; no-policy-ranking-or-complexity-proof",
                        )
    except ValueError:
        decision, detail = "refuse-invalid-self-report", "invalid-self-report-json"
    base.update(decision=decision, detail=detail)
    return base


def render(receipt: dict[str, object]) -> str:
    return json.dumps(receipt, separators=(",", ":"), ensure_ascii=True) + "\n"


def verify_carrier_fingerprints(
    receipt: dict[str, object],
    self_report_path: Path,
    tick_envelope_path: Path,
    constraint_basis_path: Path,
) -> bool:
    return (
        receipt.get("selfReportSha256")
        == hashlib.sha256(self_report_path.read_bytes()).hexdigest()
        and receipt.get("tickEnvelopeSha256")
        == hashlib.sha256(tick_envelope_path.read_bytes()).hexdigest()
        and receipt.get("constraintBasisSha256")
        == hashlib.sha256(constraint_basis_path.read_bytes()).hexdigest()
    )


def authorize_execution(
    receipt: dict[str, object], max_ticks: int, external_limits: list[str]
) -> int | None:
    if receipt.get("decision") != "admit-for-ticks" or max_ticks < 1 or external_limits:
        return None
    return max_ticks


def main(argv: list[str]) -> int:
    if len(argv) != 4:
        raise SystemExit(
            "usage: policy_admissibility_oracle.py SELF_REPORT TICK_ENVELOPE CONSTRAINT_BASIS"
        )
    print(render(admit(Path(argv[1]), Path(argv[2]), Path(argv[3]))), end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
