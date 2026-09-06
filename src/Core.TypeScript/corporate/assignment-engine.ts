/**
 * corporate/assignment-engine.ts — staffing a hat: who is eligible, who is best, who decides.
 *
 * ── THE GAP THIS CLOSES ──────────────────────────────────────────────────────
 * The RMO's staffing choice was `firstContributorUnder` — the first IC in the owning line. It cannot
 * prefer an agent that has done this work well, cannot avoid one that keeps failing, cannot notice
 * that an agent already wears five hats, and cannot stop over-staffing past the supply target.
 *
 * ── DETERMINISM COMPUTES ELIGIBILITY; THE AGENT PICKS ────────────────────────
 * Same split as everywhere else in this register. The eligible set is derived from facts anyone can
 * check — bindings, cooldowns, caps, the reporting line — and the choice within it goes through
 * `chooseWithinLegal`, clamped. So a chooser can prefer, and cannot escape.
 *
 * ── RANKING IS ON THE PAIRING, AND CARRIES ITS OWN UNCERTAINTY ───────────────
 * The score is `mean + explorationBonus` for (agent, hat, quality). Ranking on the agent alone would
 * let standing earned reviewing buy standing implementing; ranking on the mean alone would treat an
 * agent rated on two jobs as equal to one rated on forty. The exploration bonus is what stops a cold
 * start being permanent — an agent nobody picks never earns a record, so it would rank low forever.
 */

import { chooseWithinLegal, type OrgChooser } from "./org-decision";
import { isTerminal, type HatBinding } from "./hat-binding";
import { reportsUpTo, type OrgChart, type OrgHat } from "./org-chart";
import {
  DEFAULT_DECAY,
  DEFAULT_PRIOR,
  OutcomeClass,
  rankingScore,
  summarize,
  type BetaPrior,
  type DecayPolicy,
  type ReputationObservation,
  type ReputationSummary,
} from "./reputation";

/** How many hats one agent may hold at once. */
export const DEFAULT_MAX_ACTIVE_HATS = 3;

export interface Candidate {
  readonly agentId: string;
  /** The hat this agent occupies in the chart — its place in the reporting line. */
  readonly hatId: string;
}

export interface RankedCandidate {
  readonly agentId: string;
  readonly score: number;
  readonly summary: ReputationSummary;
}

export interface EligibilityInput {
  readonly chart: OrgChart;
  readonly hat: OrgHat;
  readonly candidates: readonly Candidate[];
  readonly bindings: readonly HatBinding[];
  readonly nowMs: number;
  readonly maxActiveHats?: number;
  /** When set, a candidate must report up to this hat — the work's owner. */
  readonly mustReportTo?: string;
}

export interface Ineligible {
  readonly agentId: string;
  readonly reason: string;
}

export interface EligibilityResult {
  readonly eligible: readonly Candidate[];
  /** Why each excluded candidate was excluded. Auditable, not silent. */
  readonly excluded: readonly Ineligible[];
}

/**
 * Who may take this hat.
 *
 * Every exclusion is REPORTED with its reason rather than filtered away. "Nobody was eligible" and
 * "everybody was over their hat cap" call for completely different responses from the RMO, and a
 * bare empty list cannot tell them apart.
 */
export function eligibleFor(input: EligibilityInput): EligibilityResult {
  const cap = input.maxActiveHats ?? DEFAULT_MAX_ACTIVE_HATS;
  const eligible: Candidate[] = [];
  const excluded: Ineligible[] = [];

  const live = input.bindings.filter((b) => !isTerminal(b.phase));

  for (const c of input.candidates) {
    if (live.some((b) => b.hatId === input.hat.id && b.wearerAgentId === c.agentId)) {
      excluded.push({ agentId: c.agentId, reason: `already wears '${input.hat.id}'` });
      continue;
    }
    const cooling = input.bindings.find(
      (b) =>
        b.hatId === input.hat.id &&
        b.wearerAgentId === c.agentId &&
        b.cooldownUntilMs !== undefined &&
        input.nowMs < b.cooldownUntilMs,
    );
    if (cooling !== undefined) {
      excluded.push({ agentId: c.agentId, reason: `cooling down on '${input.hat.id}'` });
      continue;
    }
    const held = live.filter((b) => b.wearerAgentId === c.agentId).length;
    if (held >= cap) {
      excluded.push({ agentId: c.agentId, reason: `already wears ${held} hats (cap ${cap})` });
      continue;
    }
    if (input.mustReportTo !== undefined && !reportsUpTo(input.chart, c.hatId, input.mustReportTo)) {
      excluded.push({ agentId: c.agentId, reason: `'${c.hatId}' does not report up to '${input.mustReportTo}'` });
      continue;
    }
    eligible.push(c);
  }

  return { eligible, excluded };
}

export interface RankInput {
  readonly candidates: readonly Candidate[];
  readonly hatId: string;
  readonly observations: readonly ReputationObservation[];
  readonly nowMs: number;
  readonly prior?: BetaPrior;
  readonly decay?: DecayPolicy;
  readonly explorationMax?: number;
}

/**
 * Rank by reputation on the pairing, best first.
 *
 * Ties break on `agentId` so the order is TOTAL and stable. Without it two equally-rated agents
 * would be ordered by however the candidate list happened to arrive, and the same organization in
 * the same state would staff differently on different runs — which would take determinism away from
 * every test and replay that depends on this.
 */
export function rankCandidates(input: RankInput): readonly RankedCandidate[] {
  const scored = input.candidates.map((c) => {
    const summary = summarize(
      input.observations,
      { agentId: c.agentId, hatId: input.hatId, outcomeClass: OutcomeClass.Quality },
      input.nowMs,
      input.prior ?? DEFAULT_PRIOR,
      input.decay ?? DEFAULT_DECAY,
    );
    return { agentId: c.agentId, score: rankingScore(summary, input.explorationMax), summary };
  });
  return [...scored].sort((a, b) => (b.score !== a.score ? b.score - a.score : a.agentId < b.agentId ? -1 : 1));
}

export type AssignmentOutcome =
  | { readonly outcome: "assigned"; readonly agentId: string; readonly reason: string; readonly score: number }
  | { readonly outcome: "supply_exhausted"; readonly reason: string }
  | { readonly outcome: "no_eligible_candidate"; readonly reason: string; readonly excluded: readonly Ineligible[] };

export interface AssignInput extends EligibilityInput {
  readonly observations: readonly ReputationObservation[];
  readonly chooser: OrgChooser<RankedCandidate>;
  /** How many wearers of this hat the RMO has authorized. */
  readonly supplyTarget: number;
  readonly prior?: BetaPrior;
  readonly decay?: DecayPolicy;
  readonly explorationMax?: number;
}

/**
 * Staff one hat.
 *
 * Three outcomes, and the distinction between the last two is the point:
 *
 *   - **assigned** — a wearer was chosen.
 *   - **supply_exhausted** — the hat is already at its authorized wearer count. This is a decision
 *     for the RMO (raise the target, or accept the queue), NOT a staffing failure, and collapsing
 *     it into "no candidate" would send someone looking for people when the constraint is policy.
 *   - **no_eligible_candidate** — carries every exclusion and its reason, so the caller can see
 *     whether the pool was empty, capped, cooling down, or out of the line.
 *
 * The supply check comes FIRST, deliberately: at the cap the answer is the same whoever is
 * available, and ranking a pool that cannot be drawn from would be work done to be discarded.
 */
export function assignHat(input: AssignInput): AssignmentOutcome {
  const activeWearers = input.bindings.filter(
    (b) => b.hatId === input.hat.id && !isTerminal(b.phase),
  ).length;
  if (activeWearers >= input.supplyTarget) {
    return {
      outcome: "supply_exhausted",
      reason: `'${input.hat.id}' is at its supply cap (${activeWearers}/${input.supplyTarget}) — the RMO decides whether to raise it`,
    };
  }

  const { eligible, excluded } = eligibleFor(input);
  if (eligible.length === 0) {
    return {
      outcome: "no_eligible_candidate",
      reason: `no eligible candidate for '${input.hat.id}' among ${input.candidates.length}`,
      excluded,
    };
  }

  const ranked = rankCandidates({
    candidates: eligible,
    hatId: input.hat.id,
    observations: input.observations,
    nowMs: input.nowMs,
    ...(input.prior === undefined ? {} : { prior: input.prior }),
    ...(input.decay === undefined ? {} : { decay: input.decay }),
    ...(input.explorationMax === undefined ? {} : { explorationMax: input.explorationMax }),
  });

  const choice = chooseWithinLegal(ranked, `assign '${input.hat.id}'`, input.chooser);
  if (choice.outcome === "no_legal_option") {
    return { outcome: "no_eligible_candidate", reason: choice.reason, excluded };
  }
  return {
    outcome: "assigned",
    agentId: choice.option.agentId,
    reason: choice.reason,
    score: choice.option.score,
  };
}
