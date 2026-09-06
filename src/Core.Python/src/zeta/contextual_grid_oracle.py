"""Independent oracle for the finite contextual-grid curiosity benchmark.

This module intentionally reimplements the frozen carrier and policies instead
of importing the F# runner. It is a bounded control oracle, not a general RL or
multi-agent system. Unknown environment or catalogue fingerprints are refused
before simulation starts.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import struct
from dataclasses import dataclass
from pathlib import Path

ENVIRONMENT_FINGERPRINT = (
    "389fca213b59a18f9afe32640a0cefffc32c7423e155dd7fc866e8b4ed3e6338"
)
EVALUATOR_CATALOGUE_FINGERPRINT = (
    "bedd7617e115d7d4a718edd2d5906bfb945a5b7ddbf385a50b17ae279d6b916c"
)
ENVIRONMENT_MANIFEST = Path(
    "docs/research/data/2026-09-05-contextual-grid-v1-manifest.json"
)
EVALUATOR_CATALOGUE = Path(
    "docs/research/data/2026-09-05-contextual-grid-v1-evaluator-catalogue.json"
)
REFLECT_X_ENVIRONMENT_FINGERPRINT = (
    "7477bb597b44805212e7202751ad4988dcae81e4c22e418f7f892cb1c35a1d5a"
)
REFLECT_X_EVALUATOR_CATALOGUE_FINGERPRINT = (
    "1872f54a6fce5f54e3a52456c443012e01c71a8cce33515ef28fb07465da39d7"
)
REFLECT_X_ENVIRONMENT_MANIFEST = Path(
    "docs/research/data/2026-09-06-contextual-grid-v1-reflect-x-manifest.json"
)
REFLECT_X_EVALUATOR_CATALOGUE = Path(
    "docs/research/data/2026-09-06-contextual-grid-v1-reflect-x-evaluator-catalogue.json"
)

MASK = (1 << 64) - 1
GAMMA = 0x9E3779B97F4A7C15
VIGNA_A = 0xBF58476D1CE4E5B9
VIGNA_B = 0x94D049BB133111EB
ACTIONS = ("north", "east", "south", "west")
TRAINING_START = (0, 0)
HELD_OUT_START = (0, 4)
GOAL = (4, 0)
NONTERMINAL_REWARD_PPM = -40_000
TERMINAL_REWARD_PPM = 2_000_000
TRAINING_EPISODES = 1_000
EPISODE_ACTION_CAP = 250

Position = tuple[int, int]
StateAction = tuple[Position, str]


@dataclass(frozen=True)
class Carrier:
    environment_fingerprint: str
    catalogue_fingerprint: str
    environment_manifest: Path
    evaluator_catalogue: Path
    training_start: Position
    held_out_start: Position
    goal: Position
    nonterminal_reward_ppm: int
    terminal_reward_ppm: int


V1_CARRIER = Carrier(
    ENVIRONMENT_FINGERPRINT,
    EVALUATOR_CATALOGUE_FINGERPRINT,
    ENVIRONMENT_MANIFEST,
    EVALUATOR_CATALOGUE,
    TRAINING_START,
    HELD_OUT_START,
    GOAL,
    NONTERMINAL_REWARD_PPM,
    TERMINAL_REWARD_PPM,
)


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def load_verified_carrier(root: Path, carrier_id: str) -> Carrier:
    if carrier_id == "v1":
        expected_environment = ENVIRONMENT_FINGERPRINT
        expected_catalogue = EVALUATOR_CATALOGUE_FINGERPRINT
        environment_path = ENVIRONMENT_MANIFEST
        catalogue_path = EVALUATOR_CATALOGUE
        expected_transition_version = "zeta.contextual-grid/v1"
        expected_catalogue_version = "zeta.contextual-grid/evaluators/v1"
    elif carrier_id == "v1-reflect-x":
        expected_environment = REFLECT_X_ENVIRONMENT_FINGERPRINT
        expected_catalogue = REFLECT_X_EVALUATOR_CATALOGUE_FINGERPRINT
        environment_path = REFLECT_X_ENVIRONMENT_MANIFEST
        catalogue_path = REFLECT_X_EVALUATOR_CATALOGUE
        expected_transition_version = "zeta.contextual-grid/v1-reflect-x"
        expected_catalogue_version = "zeta.contextual-grid/evaluators/v1-reflect-x"
    else:
        raise ValueError("UnknownCarrier")
    environment = (root / environment_path).read_bytes()
    catalogue = (root / catalogue_path).read_bytes()
    if _sha256(environment) != expected_environment:
        raise ValueError("environment manifest hash mismatch")
    if _sha256(catalogue) != expected_catalogue:
        raise ValueError("evaluator catalogue hash mismatch")
    environment_data = json.loads(environment)
    catalogue_data = json.loads(catalogue)
    if environment_data["actions"] != list(ACTIONS):
        raise ValueError("carrier action order is not canonical")
    if environment_data["transitionVersion"] != expected_transition_version:
        raise ValueError("carrier transition version mismatch")
    if catalogue_data["catalogueVersion"] != expected_catalogue_version:
        raise ValueError("carrier catalogue version mismatch")
    if catalogue_data["environmentFingerprint"] != expected_environment:
        raise ValueError("catalogue environment binding mismatch")
    if catalogue_data["entries"] != [
        "external-return/v1",
        "state-action-count/v1",
        "q-epsilon/v1",
        "q-ucb/v1",
        "count-first/v1",
    ]:
        raise ValueError("carrier evaluator entries mismatch")
    return Carrier(
        expected_environment,
        expected_catalogue,
        environment_path,
        catalogue_path,
        tuple(environment_data["trainingStart"]),
        tuple(environment_data["heldOutStart"]),
        tuple(environment_data["goal"]),
        environment_data["nonterminalRewardPpm"],
        environment_data["terminalRewardPpm"],
    )


def verify_repository_carriers(root: Path) -> None:
    load_verified_carrier(root, "v1")


def _admit(
    carrier: Carrier, environment_fingerprint: str, catalogue_fingerprint: str
) -> None:
    if environment_fingerprint != carrier.environment_fingerprint:
        raise ValueError("UnknownFingerprint")
    if catalogue_fingerprint != carrier.catalogue_fingerprint:
        raise ValueError("CatalogueFingerprintMismatch")


def admit(environment_fingerprint: str, catalogue_fingerprint: str) -> None:
    _admit(V1_CARRIER, environment_fingerprint, catalogue_fingerprint)


def next_stream(state: int) -> tuple[int, int]:
    """Return one benchmark-local SplitMix64 word and the next explicit state."""
    next_state = (state + GAMMA) & MASK
    z = next_state
    z = ((z ^ (z >> 30)) * VIGNA_A) & MASK
    z = ((z ^ (z >> 27)) * VIGNA_B) & MASK
    return (z ^ (z >> 31)) & MASK, next_state


def draw_below(bound: int, state: int, draws: int) -> tuple[int, int, int]:
    if bound <= 0:
        raise ValueError("bound must be positive")
    limit = MASK - (MASK % bound)
    while True:
        value, state = next_stream(state)
        draws += 1
        if value < limit:
            return value % bound, state, draws


def _q_value(q_values: dict[StateAction, float], key: StateAction) -> float:
    return q_values.get(key, 0.0)


def _count_value(counts: dict[StateAction, int], key: StateAction) -> int:
    return counts.get(key, 0)


def _greedy_action(q_values: dict[StateAction, float], position: Position) -> str:
    best = ACTIONS[0]
    for candidate in ACTIONS[1:]:
        if _q_value(q_values, (position, candidate)) > _q_value(
            q_values, (position, best)
        ):
            best = candidate
    return best


def _minimum_count_action(
    counts: dict[StateAction, int], position: Position, state: int, draws: int
) -> tuple[str, int, int]:
    minimum = min(_count_value(counts, (position, action)) for action in ACTIONS)
    candidates = [
        action
        for action in ACTIONS
        if _count_value(counts, (position, action)) == minimum
    ]
    index, next_state, next_draws = draw_below(len(candidates), state, draws)
    return candidates[index], next_state, next_draws


def _choose_training_action(
    policy: str,
    q_values: dict[StateAction, float],
    counts: dict[StateAction, int],
    time: int,
    state: int,
    draws: int,
    position: Position,
) -> tuple[str, int, int]:
    if policy == "uniform-random/v1":
        index, next_state, next_draws = draw_below(len(ACTIONS), state, draws)
        return ACTIONS[index], next_state, next_draws
    if policy == "q-epsilon/v1":
        sample, sampled_state, sampled_draws = draw_below(10, state, draws)
        if sample == 0:
            index, next_state, next_draws = draw_below(
                len(ACTIONS), sampled_state, sampled_draws
            )
            return ACTIONS[index], next_state, next_draws
        return _greedy_action(q_values, position), sampled_state, sampled_draws
    if policy == "q-ucb/v1":
        unseen = [
            action
            for action in ACTIONS
            if _count_value(counts, (position, action)) == 0
        ]
        if unseen:
            index, next_state, next_draws = draw_below(len(unseen), state, draws)
            return unseen[index], next_state, next_draws
        t = float(max(1, time + 1))

        def score(action: str) -> float:
            visits = float(_count_value(counts, (position, action)))
            return _q_value(q_values, (position, action)) + 45.0 * math.sqrt(
                math.log(t) / visits
            )

        best_score = max(score(action) for action in ACTIONS)
        candidates = [action for action in ACTIONS if score(action) == best_score]
        index, next_state, next_draws = draw_below(len(candidates), state, draws)
        return candidates[index], next_state, next_draws
    if policy == "count-first/v1":
        return _minimum_count_action(counts, position, state, draws)
    raise ValueError(f"unknown policy: {policy}")


def _transition(
    carrier: Carrier, position: Position, action: str
) -> tuple[Position, int, bool]:
    dx, dy = {
        "north": (0, -1),
        "east": (1, 0),
        "south": (0, 1),
        "west": (-1, 0),
    }[action]
    attempted = (position[0] + dx, position[1] + dy)
    next_position = (
        position
        if not (0 <= attempted[0] <= 4 and 0 <= attempted[1] <= 4)
        else attempted
    )
    if next_position == carrier.goal:
        return next_position, carrier.terminal_reward_ppm, True
    return next_position, carrier.nonterminal_reward_ppm, False


def _max_next_q(q_values: dict[StateAction, float], position: Position) -> float:
    return max(_q_value(q_values, (position, action)) for action in ACTIONS)


def _digest(lines: list[str]) -> str:
    return _sha256("\n".join(lines).encode("utf-8"))


def _q_digest(q_values: dict[StateAction, float]) -> str:
    action_index = {action: index for index, action in enumerate(ACTIONS)}
    lines = [
        f"{position[0]}|{position[1]}|{action}|{struct.pack('>d', value).hex()}"
        for (position, action), value in sorted(
            q_values.items(),
            key=lambda item: (item[0][0][0], item[0][0][1], action_index[item[0][1]]),
        )
    ]
    return _digest(lines)


def _trace_line(
    kind: str,
    episode: int,
    step: int,
    position: Position,
    action: str,
    next_position: Position,
    reward: int,
    count_before: int,
) -> str:
    return "|".join(
        [
            kind,
            str(episode),
            str(step),
            str(position[0]),
            str(position[1]),
            action,
            str(next_position[0]),
            str(next_position[1]),
            str(reward),
            str(count_before),
        ]
    )


def run_for_carrier(
    carrier: Carrier,
    environment_fingerprint: str,
    catalogue_fingerprint: str,
    policy: str,
    seed: int,
    episodes: int,
    action_cap: int,
) -> dict[str, object]:
    _admit(carrier, environment_fingerprint, catalogue_fingerprint)
    if episodes < 0 or action_cap < 0:
        raise ValueError("episodes and action_cap must be non-negative")

    q_values: dict[StateAction, float] = {}
    counts: dict[StateAction, int] = {}
    state = seed & MASK
    draws = 0
    time = 0
    visited_states: set[Position] = set()
    training_goal_episodes = 0
    training_return = 0
    novelty_sum = 0.0
    novelty_count = 0
    training_trace: list[str] = []

    for episode in range(1, episodes + 1):
        position = carrier.training_start
        visited_states.add(position)
        terminal = False
        step = 0
        while step < action_cap and not terminal:
            action, state, draws = _choose_training_action(
                policy, q_values, counts, time, state, draws, position
            )
            key = (position, action)
            count_before = _count_value(counts, key)
            novelty_sum += 1.0 / math.sqrt(1.0 + count_before)
            novelty_count += 1
            next_position, reward, reached_goal = _transition(carrier, position, action)
            training_return += reward
            bootstrap = 0.0 if reached_goal else _max_next_q(q_values, next_position)
            alpha = 0.05 / math.sqrt(max(1, time + 1))
            q_values[key] = _q_value(q_values, key) + alpha * (
                reward + 0.9 * bootstrap - _q_value(q_values, key)
            )
            counts[key] = count_before + 1
            time += 1
            step += 1
            training_trace.append(
                _trace_line(
                    "T",
                    episode,
                    step,
                    position,
                    action,
                    next_position,
                    reward,
                    count_before,
                )
            )
            position = next_position
            visited_states.add(position)
            terminal = reached_goal
            if reached_goal:
                training_goal_episodes += 1

    q_before_evaluation = _q_digest(q_values)
    position = carrier.held_out_start
    held_out_return = 0
    evaluation_actions: list[str] = []
    evaluation_trace: list[str] = []
    terminal = False
    step = 0
    while step < action_cap and not terminal:
        action = _greedy_action(q_values, position)
        count_before = _count_value(counts, (position, action))
        next_position, reward, reached_goal = _transition(carrier, position, action)
        step += 1
        held_out_return += reward
        evaluation_actions.append(action)
        evaluation_trace.append(
            _trace_line(
                "E", 0, step, position, action, next_position, reward, count_before
            )
        )
        position = next_position
        terminal = reached_goal

    q_after_evaluation = _q_digest(q_values)
    return {
        "policy": policy,
        "seed": seed,
        "heldOutReturnPpm": held_out_return,
        "heldOutActions": evaluation_actions,
        "trainingGoalEpisodes": training_goal_episodes,
        "trainingReturnPpm": training_return,
        "trainingUniqueStates": len(visited_states),
        "trainingUniqueStateActions": len(counts),
        "meanPreIncrementNovelty": novelty_sum / novelty_count
        if novelty_count
        else 0.0,
        "trainingTraceDigest": _digest(training_trace),
        "evaluationTraceDigest": _digest(evaluation_trace),
        "qDigestBeforeEvaluation": q_before_evaluation,
        "qDigestAfterEvaluation": q_after_evaluation,
        "streamDraws": draws,
    }


def run(
    environment_fingerprint: str,
    catalogue_fingerprint: str,
    policy: str,
    seed: int,
    episodes: int,
    action_cap: int,
) -> dict[str, object]:
    return run_for_carrier(
        V1_CARRIER,
        environment_fingerprint,
        catalogue_fingerprint,
        policy,
        seed,
        episodes,
        action_cap,
    )


def _main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--policy",
        choices=["uniform-random/v1", "q-epsilon/v1", "q-ucb/v1", "count-first/v1"],
        required=True,
    )
    parser.add_argument("--seed", type=int, required=True)
    parser.add_argument("--episodes", type=int, required=True)
    parser.add_argument("--action-cap", type=int, required=True)
    args = parser.parse_args()
    receipt = run(
        ENVIRONMENT_FINGERPRINT,
        EVALUATOR_CATALOGUE_FINGERPRINT,
        args.policy,
        args.seed,
        args.episodes,
        args.action_cap,
    )
    print(json.dumps(receipt, sort_keys=True, separators=(",", ":")))


if __name__ == "__main__":
    _main()
