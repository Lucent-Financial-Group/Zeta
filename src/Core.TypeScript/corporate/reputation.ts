/**
 * corporate/reputation.ts — what an agent is known for, per hat, with the evidence decaying.
 *
 * ── THE GAP THIS CLOSES ──────────────────────────────────────────────────────
 * The RMO's staffing choice was `firstContributorUnder` — the first individual contributor in the
 * owning line. Correct, and uninformed: it cannot prefer the agent that has actually done this work
 * well, and it cannot notice one that keeps failing.
 *
 * ── BETA-BERNOULLI, PER (AGENT, HAT, OUTCOME CLASS) ──────────────────────────
 * A conjugate posterior over a success probability: `Beta(α₀ + successes, β₀ + failures)`, with
 * `mean = α/(α+β)` and `variance = αβ/((α+β)²(α+β+1))`. Conjugacy is what makes it cheap — the
 * posterior is a running count, so a rating is a fold over observations rather than a stored score
 * somebody has to remember to update.
 *
 * Keyed on the PAIRING, never on the agent alone. Standing earned reviewing does not buy standing
 * implementing, and an agent that is excellent at one hat and poor at another has two ratings, which
 * is the true state.
 *
 * ── EVIDENCE DECAYS, EXCEPT WHERE IT MUST NOT ────────────────────────────────
 * Observations lose weight on a half-life, so a rating tracks what an agent is like NOW rather than
 * what it once was. Severe incidents keep a floor: an outage does not stop having happened because
 * ninety days passed, and letting it decay to nothing would make the rating forget the one class of
 * event it most needs to carry.
 *
 * ── THE WHITEWASHING RESULT, STATED HONESTLY ─────────────────────────────────
 * A newcomer has no observations, so it scores the prior mean `α₀/(α₀+β₀)`. An agent with a bad
 * record scores lower. So **discarding a damaged identity and re-minting can improve your rank** —
 * and working it out exactly:
 *
 *     fresh > damaged  ⟺  α₀/(α₀+β₀) > (α₀+s)/(α₀+β₀+s+f)  ⟺  **f/s > β₀/α₀**
 *
 * With the reference's uniform `Beta(1,1)` that threshold is **1.0**: any agent failing more than
 * half the time gains by starting over. No finite prior removes this — it only moves the threshold,
 * and paying for it with a harsher prior penalises genuine newcomers. That is Friedman & Resnick's
 * result (*The Social Cost of Cheap Pseudonyms*, 2001), not a defect in the model.
 *
 * So this module does not claim immunity. It EXPOSES the number: `whitewashThreshold` reports the
 * failure-to-success ratio beyond which re-minting pays under the configured prior, so an
 * organization can see its exposure and price identity accordingly. A system that believes it is
 * whitewash-proof is worse off than one that knows its threshold.
 *
 * ── NOT PORTED ───────────────────────────────────────────────────────────────
 * The reference also carries a Normal-Gamma posterior for continuous outcomes (latency, cost). Only
 * the binary model is here; a continuous rating with no consumer would be a second thing to keep
 * correct for nothing.
 */

/** What is being rated. Each is a separate posterior for the same pairing. */
export const OutcomeClass = {
  Quality: "quality",
  Timeliness: "timeliness",
  Reliability: "reliability",
  Safety: "safety",
} as const;

export type OutcomeClass = (typeof OutcomeClass)[keyof typeof OutcomeClass];

export interface ReputationKey {
  readonly agentId: string;
  readonly hatId: string;
  readonly outcomeClass: OutcomeClass;
}

export interface ReputationObservation extends ReputationKey {
  readonly success: boolean;
  readonly atMs: number;
  /** Base weight before decay. Defaults to 1. */
  readonly weight?: number;
  /** Severe incidents keep a weight floor rather than decaying to nothing. */
  readonly severe?: boolean;
}

export interface BetaPrior {
  readonly alpha: number;
  readonly beta: number;
}

/** The reference's prior. Whitewash threshold 1.0 — see the header. */
export const UNIFORM_PRIOR: BetaPrior = { alpha: 1, beta: 1 };

/**
 * The default here: `Beta(1,3)`, threshold 3.0.
 *
 * A newcomer must be failing more than three times per success before starting over pays. The cost
 * is a colder start — a new agent rates 0.25 rather than 0.5, so it is picked later. That trade is
 * deliberate and is the one Friedman & Resnick say is unavoidable; `explorationBonus` below is what
 * keeps a cold start from being a permanent one.
 */
export const DEFAULT_PRIOR: BetaPrior = { alpha: 1, beta: 3 };

export interface DecayPolicy {
  readonly halfLifeMs: number;
  /** Weight a severe observation never falls below. */
  readonly severeFloor: number;
}

export const DEFAULT_DECAY: DecayPolicy = {
  halfLifeMs: 90 * 24 * 3_600_000,
  severeFloor: 0.25,
};

export interface ReputationSummary {
  readonly alpha: number;
  readonly beta: number;
  readonly mean: number;
  readonly variance: number;
  /** Total decayed weight behind the posterior — how much evidence this rating rests on. */
  readonly evidenceWeight: number;
  readonly sampleCount: number;
  readonly latestAtMs?: number;
}

function sameKey(a: ReputationKey, b: ReputationKey): boolean {
  return a.agentId === b.agentId && a.hatId === b.hatId && a.outcomeClass === b.outcomeClass;
}

/**
 * The weight an observation still carries at `asOfMs`.
 *
 * Exponential half-life. An observation from the FUTURE keeps full weight rather than being
 * amplified — `0.5^negative` is greater than one, and a clock skew should not be able to make one
 * report count for several.
 */
export function decayedWeight(
  observation: ReputationObservation,
  asOfMs: number,
  decay: DecayPolicy = DEFAULT_DECAY,
): number {
  const base = observation.weight ?? 1;
  if (base <= 0) return 0;
  if (!Number.isFinite(decay.halfLifeMs) || decay.halfLifeMs <= 0) return base;
  const ageMs = asOfMs - observation.atMs;
  if (ageMs <= 0) return base;
  const decayed = base * 0.5 ** (ageMs / decay.halfLifeMs);
  // A severe incident keeps a floor: it does not stop having happened because time passed.
  return observation.severe === true ? Math.max(decayed, decay.severeFloor) : decayed;
}

/**
 * Fold observations into a posterior for one pairing.
 *
 * `variance` is reported alongside `mean` because they answer different questions: the mean is how
 * good, the variance is how sure. Two agents can share a mean of 0.8 with one rated on forty jobs
 * and the other on two, and a ranking that reads only the mean cannot tell them apart.
 */
export function summarize(
  observations: readonly ReputationObservation[],
  key: ReputationKey,
  asOfMs: number,
  prior: BetaPrior = DEFAULT_PRIOR,
  decay: DecayPolicy = DEFAULT_DECAY,
): ReputationSummary {
  let successWeight = 0;
  let failureWeight = 0;
  let sampleCount = 0;
  let latestAtMs: number | undefined;

  for (const o of observations) {
    if (!sameKey(o, key)) continue;
    const w = decayedWeight(o, asOfMs, decay);
    if (w <= 0) continue;
    if (o.success) successWeight += w;
    else failureWeight += w;
    sampleCount += 1;
    if (latestAtMs === undefined || o.atMs > latestAtMs) latestAtMs = o.atMs;
  }

  const alpha = prior.alpha + successWeight;
  const beta = prior.beta + failureWeight;
  const total = alpha + beta;
  return {
    alpha,
    beta,
    mean: alpha / total,
    variance: (alpha * beta) / (total * total * (total + 1)),
    evidenceWeight: successWeight + failureWeight,
    sampleCount,
    ...(latestAtMs === undefined ? {} : { latestAtMs }),
  };
}

/**
 * The failure-to-success ratio beyond which discarding an identity and re-minting improves the
 * rating: `β₀/α₀`.
 *
 * Derived rather than asserted — see the header for the algebra. Reported so an organization can
 * see its exposure; there is no prior that makes this `Infinity`, and believing otherwise is worse
 * than knowing the number.
 */
export function whitewashThreshold(prior: BetaPrior = DEFAULT_PRIOR): number {
  return prior.alpha <= 0 ? Number.POSITIVE_INFINITY : prior.beta / prior.alpha;
}

/** Would re-minting improve this record's rating under `prior`? */
export function whitewashingPays(
  successes: number,
  failures: number,
  prior: BetaPrior = DEFAULT_PRIOR,
): boolean {
  // The closed form: α₀·f > s·β₀. Equivalent to comparing the two means, without the division.
  return prior.alpha * failures > successes * prior.beta;
}

/**
 * A bonus for a rating resting on little evidence, so an unproven agent is tried rather than
 * starved.
 *
 * Without it a cold start is self-perpetuating: an agent with no record ranks low, so it is never
 * picked, so it never acquires a record. The bonus shrinks as evidence accumulates — it buys a
 * trial, not a permanent handicap for the experienced.
 *
 * Bounded to `[0, max]` and monotonically decreasing in `evidenceWeight`, so it can never let an
 * unproven agent outrank an established one by more than `max`.
 */
export function explorationBonus(summary: ReputationSummary, max = 0.15): number {
  if (max <= 0) return 0;
  return max / (1 + Math.max(0, summary.evidenceWeight));
}

/** Mean plus exploration bonus — the number a ranker sorts on. */
export function rankingScore(summary: ReputationSummary, max = 0.15): number {
  return summary.mean + explorationBonus(summary, max);
}
