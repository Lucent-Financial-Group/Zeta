"""Independent finite NciNonUrgency receipt checker controls."""

from __future__ import annotations

import json
import shutil
import subprocess
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

import pytest

from zeta.nci_witness_receipt_oracle import (
    WitnessFailure,
    render_receipt,
    verify_pinned_subject,
    verify_receipt,
)

ROOT = Path(__file__).resolve().parents[3]
HISTORICAL_REGISTRY = (
    ROOT / "docs/research/data/2026-09-06-nci-witness-v1-registry.json"
)

# The historical subject's JAR, by git blob id.
#
# The 2026-09-06 witness is pinned to TLC2 2026.05.18.174321, and the tree
# stopped carrying those bytes when src/Core.TLA/tla2tools.jar was de-vendored
# onto the rolling from-url row (081M23ESC5B087G0R002HJ39DG). Upstream cannot
# return them either -- tlaplus re-uploads the v1.8.0 asset in place, so the
# build that produced this witness is gone from every URL.
#
# It is NOT gone from git. A blob stays reachable from the commits that carried
# it, so `git cat-file` is a permanent, content-addressed source for exactly the
# bytes the receipt names -- which is the whole point of pinning by digest.
# Reading it here keeps the historical witness reproducible without either
# re-committing a binary or republishing a dated research artefact to match a
# newer checker. Mirrors the TypeScript oracle's test.
HISTORICAL_JAR_BLOB = "2fb671d8be5a1e137f001965d0246509e882aed3"


def historical_jar_bytes() -> bytes:
    result = subprocess.run(
        ["git", "cat-file", "blob", HISTORICAL_JAR_BLOB],
        cwd=ROOT,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        # A failed probe is UNKNOWN, never "the jar is wrong": a shallow clone or
        # an absent git is a question that was not asked.
        raise RuntimeError(
            f"cannot read historical tla2tools blob {HISTORICAL_JAR_BLOB} from git "
            f"(git exited {result.returncode}) -- that is an UNKNOWN, not a mismatch"
        )
    return result.stdout


def copied_subject(tmp_path: Path) -> Path:
    for relative in (
        Path("src/Core.TLA/specs/NciNonUrgency.tla"),
        Path("src/Core.TLA/specs/NciNonUrgency.cfg"),
        Path("src/Core.TLA/tla2tools.jar"),
        Path("registry/tlc-models.json"),
    ):
        target = tmp_path / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        if relative == Path("src/Core.TLA/tla2tools.jar"):
            target.write_bytes(historical_jar_bytes())
            continue
        source = (
            HISTORICAL_REGISTRY
            if relative == Path("registry/tlc-models.json")
            else ROOT / relative
        )
        shutil.copy2(source, target)
    verify_pinned_subject(tmp_path)
    return tmp_path


def test_pinned_nci_subject_renders_a_canonical_receipt(tmp_path: Path) -> None:
    subject = copied_subject(tmp_path)
    receipt = render_receipt(subject)
    assert receipt.endswith("\n")
    verify_receipt(subject, receipt)


def test_committed_receipts_are_equal_and_replay_the_independent_canonical_form(
    tmp_path: Path,
) -> None:
    subject = copied_subject(tmp_path)
    typescript = (
        ROOT / "docs/research/data/2026-09-06-nci-witness-v1-typescript.json"
    ).read_text(encoding="utf-8")
    python = (
        ROOT / "docs/research/data/2026-09-06-nci-witness-v1-python.json"
    ).read_text(encoding="utf-8")
    assert typescript == python == render_receipt(subject)
    verify_receipt(subject, python)


def test_current_registry_cannot_reuse_the_historical_receipt(tmp_path: Path) -> None:
    subject = copied_subject(tmp_path)
    receipt = render_receipt(subject)
    shutil.copy2(
        ROOT / "registry/tlc-models.json", subject / "registry/tlc-models.json"
    )
    with pytest.raises(WitnessFailure, match="refuse-identity-mismatch") as refused:
        verify_receipt(subject, receipt)
    assert refused.value.detail == "registry/tlc-models.json"


def test_named_refusal_survives_contextmanager_traceback_assignment() -> None:
    @contextmanager
    def propagate() -> Iterator[None]:
        yield

    original = WitnessFailure("refuse-identity-mismatch", "registry/tlc-models.json")
    with pytest.raises(WitnessFailure) as refused, propagate():
        raise original
    assert refused.value is original
    assert str(refused.value) == "refuse-identity-mismatch: registry/tlc-models.json"


def test_mutated_config_is_refused_before_receipt_render(tmp_path: Path) -> None:
    subject = copied_subject(tmp_path)
    config = subject / "src/Core.TLA/specs/NciNonUrgency.cfg"
    config.write_text(
        config.read_text(encoding="utf-8") + "\\* mutation\n", encoding="utf-8"
    )
    with pytest.raises(WitnessFailure, match="refuse-identity-mismatch"):
        verify_pinned_subject(subject)


def test_altered_or_incomplete_json_receipt_is_refused(tmp_path: Path) -> None:
    subject = copied_subject(tmp_path)
    body = json.loads(render_receipt(subject))
    del body["checkedProperties"]
    with pytest.raises(WitnessFailure, match="refuse-receipt-mismatch"):
        verify_receipt(subject, json.dumps(body, separators=(",", ":")) + "\n")
    body = json.loads(render_receipt(subject))
    body["verdict"] = "policy-authorized"
    with pytest.raises(WitnessFailure, match="refuse-receipt-mismatch"):
        verify_receipt(subject, json.dumps(body, separators=(",", ":")) + "\n")


def test_python_oracle_has_no_typescript_emitter_dependency() -> None:
    source = (
        ROOT / "src/Core.Python/src/zeta/nci_witness_receipt_oracle.py"
    ).read_text(encoding="utf-8")
    assert "nci-witness-receipt" not in source
