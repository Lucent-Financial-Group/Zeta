"""Compare production, independent-oracle, and committed gSCAN preflight receipts."""

from __future__ import annotations

import argparse
import json
import sys
from collections.abc import Mapping

from zeta.gscan_lexical_preflight import inspect_gscan_lexical_preflight
from zeta.gscan_lexical_preflight_oracle import inspect_gscan_lexical_preflight_oracle

VOLATILE_RESULT_FIELDS = {"algorithm", "elapsed_seconds", "peak_observed_wrapper_rss_kb", "measurement_scope"}


def _comparable(value: Mapping[str, object]) -> dict[str, object]:
    return {key: value[key] for key in sorted(value) if key not in VOLATILE_RESULT_FIELDS}


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify a committed gSCAN lexical-admission receipt")
    parser.add_argument("dataset", help="explicit path to the pinned gSCAN JSON carrier")
    parser.add_argument("seed", help="explicit path to the versioned English seed JSON")
    parser.add_argument("split", help="declared gSCAN split name")
    parser.add_argument("expected_sha256", help="expected SHA-256 of the explicit dataset file")
    parser.add_argument("receipt", help="committed summary receipt JSON")
    arguments = parser.parse_args()

    production = inspect_gscan_lexical_preflight(arguments.dataset, arguments.seed, arguments.split, arguments.expected_sha256)
    oracle = inspect_gscan_lexical_preflight_oracle(arguments.dataset, arguments.seed, arguments.split, arguments.expected_sha256)
    with open(arguments.receipt, encoding="utf-8") as source:
        expected = json.load(source)
    if not isinstance(expected, Mapping):
        raise TypeError("GSCAN-PREFLIGHT-RECEIPT-SCHEMA")

    production_comparable = _comparable(production)
    oracle_comparable = _comparable(oracle)
    expected_comparable = _comparable(expected)
    if production_comparable != oracle_comparable:
        print(json.dumps({"oracle": oracle_comparable, "production": production_comparable}, indent=2, sort_keys=True), file=sys.stderr)
        return 1
    if production_comparable != expected_comparable:
        print(json.dumps({"expected": expected_comparable, "production": production_comparable}, indent=2, sort_keys=True), file=sys.stderr)
        return 1
    print(json.dumps({"status": "verified", "receipt_sha256": arguments.expected_sha256, "split": arguments.split}, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
