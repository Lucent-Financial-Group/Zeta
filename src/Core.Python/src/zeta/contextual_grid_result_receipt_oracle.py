"""Independent aggregate receipt for the finite contextual-grid v1 carrier.

This module consumes the Python per-seed oracle but independently implements the
finite denominator, roster admission, resampling, canonical JSON order, and
comparison label. It is a conformance emitter only; it does not claim paper
reproduction, general transfer, or an intrinsic/societal objective.
"""

from __future__ import annotations

import hashlib
import json
import struct
import sys
from pathlib import Path

from zeta import contextual_grid_oracle as runner

SCHEMA_VERSION = "zeta.contextual-grid/result-receipt/v1"
SEED_FIRST = 0
SEED_LAST = 99
SEED_COUNT = 100
BOOTSTRAP_REPLICATES = 10_000
BOOTSTRAP_RESAMPLER_SEED = 0x4354584752494456
BOOTSTRAP_CONFIDENCE_LEVEL_PERCENT = 95
POLICIES = (
    "uniform-random/v1",
    "q-epsilon/v1",
    "q-ucb/v1",
    "count-first/v1",
)


def canonical_roster() -> list[int]:
    return list(range(SEED_FIRST, SEED_LAST + 1))


def _int_field(receipt: dict[str, object], name: str) -> int:
    value = receipt[name]
    if not isinstance(value, int) or isinstance(value, bool):
        raise TypeError(f"per-seed receipt field {name} must be an integer")
    return value


def _float_field(receipt: dict[str, object], name: str) -> float:
    value = receipt[name]
    if not isinstance(value, float):
        raise TypeError(f"per-seed receipt field {name} must be a float")
    return value


def _string_field(receipt: dict[str, object], name: str) -> str:
    value = receipt[name]
    if not isinstance(value, str):
        raise TypeError(f"per-seed receipt field {name} must be a string")
    return value


def _float_bits(value: float) -> str:
    return struct.pack(">d", value).hex()


def _seed_row(receipt: dict[str, object]) -> dict[str, object]:
    return {
        "seed": str(_int_field(receipt, "seed")),
        "heldOutReturnPpm": _int_field(receipt, "heldOutReturnPpm"),
        "trainingGoalEpisodes": _int_field(receipt, "trainingGoalEpisodes"),
        "trainingReturnPpm": _int_field(receipt, "trainingReturnPpm"),
        "trainingUniqueStates": _int_field(receipt, "trainingUniqueStates"),
        "trainingUniqueStateActions": _int_field(receipt, "trainingUniqueStateActions"),
        "meanPreIncrementNoveltyBits": _float_bits(
            _float_field(receipt, "meanPreIncrementNovelty")
        ),
        "trainingTraceDigest": _string_field(receipt, "trainingTraceDigest"),
        "evaluationTraceDigest": _string_field(receipt, "evaluationTraceDigest"),
        "qDigestBeforeEvaluation": _string_field(receipt, "qDigestBeforeEvaluation"),
        "qDigestAfterEvaluation": _string_field(receipt, "qDigestAfterEvaluation"),
        "streamDraws": _int_field(receipt, "streamDraws"),
    }


def _transition(
    position: tuple[int, int], action: str
) -> tuple[tuple[int, int], int, bool]:
    deltas = {
        "north": (0, -1),
        "east": (1, 0),
        "south": (0, 1),
        "west": (-1, 0),
    }
    dx, dy = deltas[action]
    candidate = (position[0] + dx, position[1] + dy)
    next_position = (
        position
        if candidate[0] < 0 or candidate[0] > 4 or candidate[1] < 0 or candidate[1] > 4
        else candidate
    )
    if next_position == (4, 0):
        return next_position, 2_000_000, True
    return next_position, -40_000, False


def optimal_held_out_return(action_cap: int) -> int:
    if action_cap < 0:
        raise ValueError("action_cap must be non-negative")
    actions = ("north", "east", "south", "west")
    values = {(x, y): 0 for y in range(5) for x in range(5)}
    for _ in range(action_cap):
        values = {
            position: max(
                reward if terminal else reward + values[next_position]
                for action in actions
                for next_position, reward, terminal in (_transition(position, action),)
            )
            for position in values
        }
    return values[(0, 4)]


def _validate_roster(roster: list[int]) -> None:
    if roster != canonical_roster():
        raise ValueError("INCOMPLETE_OR_NONCANONICAL_ROSTER")


def _bootstrap_indices() -> tuple[list[list[int]], int, int, str]:
    state = BOOTSTRAP_RESAMPLER_SEED
    draws = 0
    rejections = 0
    accepted: list[int] = []
    replicates: list[list[int]] = []
    while len(replicates) < BOOTSTRAP_REPLICATES:
        replica: list[int] = []
        while len(replica) < SEED_COUNT:
            word, state = runner.next_stream(state)
            draws += 1
            lower32 = word & 0xFFFF_FFFF
            if lower32 >= 4_294_967_200:
                rejections += 1
                continue
            index = lower32 % SEED_COUNT
            accepted.append(index)
            replica.append(index)
        replicates.append(replica)
    index_digest = hashlib.sha256(
        "\n".join(str(index) for index in accepted).encode()
    ).hexdigest()
    return replicates, draws, rejections, index_digest


def _bootstrap_comparison(
    baseline: list[dict[str, object]],
    candidate: list[dict[str, object]],
    samples: list[list[int]],
) -> tuple[int, int, int]:
    deltas = [
        _int_field(baseline_row, "heldOutReturnPpm")
        - _int_field(candidate_row, "heldOutReturnPpm")
        for candidate_row, baseline_row in zip(candidate, baseline, strict=True)
    ]
    mean = sum(deltas) // SEED_COUNT
    estimates = sorted(
        sum(deltas[index] for index in replica) // SEED_COUNT for replica in samples
    )
    return mean, estimates[249], estimates[9750]


def _comparison_verdict(comparisons: list[dict[str, object]]) -> str:
    by_policy = {
        _string_field(comparison, "baselinePolicy"): _int_field(
            comparison, "candidateMeanDeltaPpm"
        )
        for comparison in comparisons
    }
    better_than_uniform = by_policy["uniform-random/v1"] < 0
    better_than_epsilon = by_policy["q-epsilon/v1"] < 0
    no_worse_than_ucb = by_policy["q-ucb/v1"] <= 0
    if better_than_uniform and better_than_epsilon and no_worse_than_ucb:
        return "criterion-met-on-declared-grid"
    if better_than_uniform and better_than_epsilon:
        return "criterion-met-except-ucb-on-declared-grid"
    return "criterion-not-met-on-declared-grid"


def run(roster: list[int]) -> dict[str, object]:
    _validate_roster(roster)
    optimal_return = optimal_held_out_return(runner.EPISODE_ACTION_CAP)
    policy_rows: list[dict[str, object]] = []
    for policy in POLICIES:
        seed_rows = [
            _seed_row(
                runner.run(
                    runner.ENVIRONMENT_FINGERPRINT,
                    runner.EVALUATOR_CATALOGUE_FINGERPRINT,
                    policy,
                    seed,
                    runner.TRAINING_EPISODES,
                    runner.EPISODE_ACTION_CAP,
                )
            )
            for seed in roster
        ]
        mean_return = (
            sum(_int_field(row, "heldOutReturnPpm") for row in seed_rows) // SEED_COUNT
        )
        policy_rows.append(
            {
                "policy": policy,
                "meanHeldOutReturnPpm": mean_return,
                "meanSuboptimalityPpm": optimal_return - mean_return,
                "seeds": seed_rows,
            }
        )
    samples, draws, rejections, index_digest = _bootstrap_indices()
    candidate = policy_rows[-1]
    candidate_rows = candidate["seeds"]
    if not isinstance(candidate_rows, list):
        raise TypeError("candidate seed rows must be a list")
    comparisons: list[dict[str, object]] = []
    for baseline in policy_rows[:-1]:
        baseline_rows = baseline["seeds"]
        if not isinstance(baseline_rows, list):
            raise TypeError("baseline seed rows must be a list")
        if not all(isinstance(row, dict) for row in candidate_rows + baseline_rows):
            raise TypeError("seed rows must be objects")
        typed_candidate = [dict(row) for row in candidate_rows]
        typed_baseline = [dict(row) for row in baseline_rows]
        mean, lower, upper = _bootstrap_comparison(
            typed_baseline, typed_candidate, samples
        )
        comparisons.append(
            {
                "baselinePolicy": _string_field(baseline, "policy"),
                "candidateMeanDeltaPpm": mean,
                "lowerPpm": lower,
                "upperPpm": upper,
            }
        )
    return {
        "schemaVersion": SCHEMA_VERSION,
        "configuration": {
            "actionCap": runner.EPISODE_ACTION_CAP,
            "episodes": runner.TRAINING_EPISODES,
            "seedCount": SEED_COUNT,
            "seedFirst": str(SEED_FIRST),
            "seedLast": str(SEED_LAST),
        },
        "environmentFingerprint": runner.ENVIRONMENT_FINGERPRINT,
        "evaluatorCatalogueFingerprint": runner.EVALUATOR_CATALOGUE_FINGERPRINT,
        "optimalHeldOutReturnPpm": optimal_return,
        "policies": policy_rows,
        "bootstrap": {
            "confidenceLevelPercent": BOOTSTRAP_CONFIDENCE_LEVEL_PERCENT,
            "replicates": BOOTSTRAP_REPLICATES,
            "resamplerSeed": str(BOOTSTRAP_RESAMPLER_SEED),
            "draws": draws,
            "rejections": rejections,
            "indexDigest": index_digest,
            "comparisons": comparisons,
        },
        "comparisonVerdict": _comparison_verdict(comparisons),
    }


def run_verified(repository_root: Path, roster: list[int]) -> dict[str, object]:
    runner.verify_repository_carriers(repository_root)
    return run(roster)


def run_canonical(repository_root: Path) -> dict[str, object]:
    return run_verified(repository_root, canonical_roster())


def render(receipt: dict[str, object]) -> str:
    return json.dumps(receipt, ensure_ascii=True, separators=(",", ":"))


def _main() -> None:
    sys.stdout.write(render(run_canonical(Path.cwd())))


if __name__ == "__main__":
    _main()
