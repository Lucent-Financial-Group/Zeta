"""Independent finite NciNonUrgency receipt checker controls."""

from __future__ import annotations

import json
import shutil
from pathlib import Path

import pytest

from zeta.nci_witness_receipt_oracle import (
    WitnessFailure,
    render_receipt,
    verify_pinned_subject,
    verify_receipt,
)

ROOT = Path(__file__).resolve().parents[3]


def copied_subject(tmp_path: Path) -> Path:
    for relative in (
        Path("src/Core.TLA/specs/NciNonUrgency.tla"),
        Path("src/Core.TLA/specs/NciNonUrgency.cfg"),
        Path("src/Core.TLA/tla2tools.jar"),
        Path("registry/tlc-models.json"),
    ):
        target = tmp_path / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT / relative, target)
    return tmp_path


def test_pinned_nci_subject_renders_a_canonical_receipt() -> None:
    receipt = render_receipt(ROOT)
    assert receipt.endswith("\n")
    verify_receipt(ROOT, receipt)


def test_committed_receipts_are_equal_and_replay_the_independent_canonical_form() -> (
    None
):
    typescript = (
        ROOT / "docs/research/data/2026-09-06-nci-witness-v1-typescript.json"
    ).read_text(encoding="utf-8")
    python = (
        ROOT / "docs/research/data/2026-09-06-nci-witness-v1-python.json"
    ).read_text(encoding="utf-8")
    assert typescript == python == render_receipt(ROOT)
    verify_receipt(ROOT, python)


def test_mutated_config_is_refused_before_receipt_render(tmp_path: Path) -> None:
    subject = copied_subject(tmp_path)
    config = subject / "src/Core.TLA/specs/NciNonUrgency.cfg"
    config.write_text(
        config.read_text(encoding="utf-8") + "\\* mutation\n", encoding="utf-8"
    )
    with pytest.raises(WitnessFailure, match="refuse-identity-mismatch"):
        verify_pinned_subject(subject)


def test_altered_or_incomplete_json_receipt_is_refused() -> None:
    body = json.loads(render_receipt(ROOT))
    del body["checkedProperties"]
    with pytest.raises(WitnessFailure, match="refuse-receipt-mismatch"):
        verify_receipt(ROOT, json.dumps(body, separators=(",", ":")) + "\n")
    body = json.loads(render_receipt(ROOT))
    body["verdict"] = "policy-authorized"
    with pytest.raises(WitnessFailure, match="refuse-receipt-mismatch"):
        verify_receipt(ROOT, json.dumps(body, separators=(",", ":")) + "\n")


def test_python_oracle_has_no_typescript_emitter_dependency() -> None:
    source = (
        ROOT / "src/Core.Python/src/zeta/nci_witness_receipt_oracle.py"
    ).read_text(encoding="utf-8")
    assert "nci-witness-receipt" not in source
