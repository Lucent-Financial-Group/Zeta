/**
 * TrueSkill 1v1 Bayesian reputation scoring.
 *
 * Faithful port of `src/Core.TypeScript/workflow-engine/trueskill.ts`
 * (Merge1 §05). Pure, deterministic, allocation-light — same inputs always
 * produce identical ratings (MP-1 DST replayability). All errors surface as
 * `RankingResult` Results (MP-7), never exceptions.
 *
 * Source: Herbrich + Minka + Graepel 2007 — "TrueSkill: A Bayesian Skill
 * Rating System" (NeurIPS 2006). Minimal 1v1 case; team play deferred.
 */

/**
 * TrueSkillRating — Bayesian skill rating: skill ~ N(mu, sigma²).
 * Initial defaults per the paper (Xbox Live): mu = 25, sigma = 25/3.
 */
export interface TrueSkillRating {
  readonly mu: number; // posterior mean of skill
  readonly sigma: number; // posterior standard deviation of skill
}

/** Default initial rating per Xbox Live defaults. */
export const DEFAULT_INITIAL_RATING: TrueSkillRating = {
  mu: 25,
  sigma: 25 / 3,
};

/** TrueSkill match outcome — discriminated union. */
export type MatchOutcome =
  | { kind: "win-A" } // hypothesis A beat hypothesis B
  | { kind: "win-B" } // hypothesis B beat hypothesis A
  | { kind: "draw" }; // tied

/** Ranking feedback per asymmetric-authorship + monad-propagation rules. */
export type RankingFeedback =
  | { kind: "InvalidRating"; identity: string; reason: string }
  | { kind: "NumericalInstability"; reason: string }
  | { kind: "UnsupportedOutcome"; outcome: string };

/** Result-shape per monad-propagation rule. */
export type RankingResult =
  | { ok: true; ratingA: TrueSkillRating; ratingB: TrueSkillRating }
  | { ok: false; feedback: RankingFeedback };

/** TrueSkill hyperparameters per the paper's defaults. */
export interface TrueSkillParams {
  readonly beta: number; // skill-to-performance noise; default mu/6
  readonly tau: number; // dynamics factor (skill drift over time); default mu/300
  readonly drawProbability: number; // P(draw); default 0.10
}

export const DEFAULT_PARAMS: TrueSkillParams = {
  beta: 25 / 6,
  tau: 25 / 300,
  drawProbability: 0.1,
};

/** Standard normal PDF. */
function normalPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

/**
 * Standard normal CDF via error-function approximation
 * (Abramowitz & Stegun 7.1.26). Accurate to ~1.5e-7.
 */
function normalCdf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * ax);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);

  return 0.5 * (1.0 + sign * y);
}

/**
 * Truncated-normal correction functions for non-draw outcomes:
 *   v(t, ε) = pdf(t - ε) / cdf(t - ε)
 *   w(t, ε) = v(t, ε) * (v(t, ε) + (t - ε))
 */
function vWin(t: number, epsilon: number): number {
  const denom = normalCdf(t - epsilon);
  if (denom < 1e-100) {
    return epsilon - t;
  }
  return normalPdf(t - epsilon) / denom;
}

function wWin(t: number, epsilon: number): number {
  const v = vWin(t, epsilon);
  return v * (v + (t - epsilon));
}

/** Truncated-normal correction functions for draw outcomes. */
function vDraw(t: number, epsilon: number): number {
  const denom = normalCdf(epsilon - t) - normalCdf(-epsilon - t);
  if (denom < 1e-100) {
    return -t;
  }
  return (normalPdf(-epsilon - t) - normalPdf(epsilon - t)) / denom;
}

function wDraw(t: number, epsilon: number): number {
  const denom = normalCdf(epsilon - t) - normalCdf(-epsilon - t);
  if (denom < 1e-100) {
    return 1;
  }
  const v = vDraw(t, epsilon);
  const numerator = (epsilon - t) * normalPdf(epsilon - t) - (-epsilon - t) * normalPdf(-epsilon - t);
  return v * v + numerator / denom;
}

/**
 * Inverse normal CDF via Newton's method on F(x) = cdf(x) - p.
 * Returns a `RankingResult`-friendly NaN sentinel via the caller's checks
 * rather than throwing, except for the out-of-domain guard.
 */
function inverseNormalCdf(p: number): number {
  if (p <= 0 || p >= 1) {
    return Number.NaN;
  }
  let x = 0;
  for (let i = 0; i < 30; i++) {
    const f = normalCdf(x) - p;
    const fp = normalPdf(x);
    if (Math.abs(fp) < 1e-30) break;
    const dx = f / fp;
    x = x - dx;
    if (Math.abs(dx) < 1e-10) break;
  }
  return x;
}

function drawMargin(drawProbability: number, beta: number): number {
  return Math.sqrt(2) * beta * inverseNormalCdf((1 + drawProbability) / 2);
}

/**
 * Update two TrueSkill ratings after a 1v1 match (Herbrich + Minka +
 * Graepel 2007). Pure + deterministic; returns a `RankingResult`.
 */
export function rate1v1(
  a: TrueSkillRating,
  b: TrueSkillRating,
  outcome: MatchOutcome,
  params: TrueSkillParams = DEFAULT_PARAMS,
): RankingResult {
  if (!Number.isFinite(a.mu) || !Number.isFinite(a.sigma) || a.sigma <= 0) {
    return { ok: false, feedback: { kind: "InvalidRating", identity: "A", reason: `mu=${a.mu} sigma=${a.sigma}` } };
  }
  if (!Number.isFinite(b.mu) || !Number.isFinite(b.sigma) || b.sigma <= 0) {
    return { ok: false, feedback: { kind: "InvalidRating", identity: "B", reason: `mu=${b.mu} sigma=${b.sigma}` } };
  }

  const beta2 = params.beta * params.beta;
  const tau2 = params.tau * params.tau;
  const sigmaA2 = a.sigma * a.sigma;
  const sigmaB2 = b.sigma * b.sigma;

  const c2 = 2 * beta2 + sigmaA2 + sigmaB2;
  const c = Math.sqrt(c2);

  const epsilon = drawMargin(params.drawProbability, params.beta);

  let v: number;
  let w: number;
  let signA: number;
  let signB: number;

  switch (outcome.kind) {
    case "win-A": {
      const t = (a.mu - b.mu) / c;
      v = vWin(t, epsilon);
      w = wWin(t, epsilon);
      signA = +1;
      signB = -1;
      break;
    }
    case "win-B": {
      const t = (b.mu - a.mu) / c;
      v = vWin(t, epsilon);
      w = wWin(t, epsilon);
      signA = -1;
      signB = +1;
      break;
    }
    case "draw": {
      const t = (a.mu - b.mu) / c;
      v = vDraw(t, epsilon);
      w = wDraw(t, epsilon);
      signA = +1;
      signB = -1;
      break;
    }
  }

  if (!Number.isFinite(v) || !Number.isFinite(w)) {
    return { ok: false, feedback: { kind: "NumericalInstability", reason: `v=${v} w=${w}` } };
  }

  const newMuA = a.mu + signA * (sigmaA2 / c) * v;
  const newMuB = b.mu + signB * (sigmaB2 / c) * v;

  const newSigmaA2 = sigmaA2 * (1 - (sigmaA2 / c2) * w);
  const newSigmaB2 = sigmaB2 * (1 - (sigmaB2 / c2) * w);

  const newSigmaA = Math.sqrt(newSigmaA2 + tau2);
  const newSigmaB = Math.sqrt(newSigmaB2 + tau2);

  if (!Number.isFinite(newMuA) || !Number.isFinite(newSigmaA) || newSigmaA <= 0) {
    return { ok: false, feedback: { kind: "NumericalInstability", reason: `newMuA=${newMuA} newSigmaA=${newSigmaA}` } };
  }
  if (!Number.isFinite(newMuB) || !Number.isFinite(newSigmaB) || newSigmaB <= 0) {
    return { ok: false, feedback: { kind: "NumericalInstability", reason: `newMuB=${newMuB} newSigmaB=${newSigmaB}` } };
  }

  return {
    ok: true,
    ratingA: { mu: newMuA, sigma: newSigmaA },
    ratingB: { mu: newMuB, sigma: newSigmaB },
  };
}

/**
 * Conservative skill estimate per Xbox Live convention: skill = mu - 3*sigma.
 * Used for leaderboard ranking (confident lower bound on skill).
 */
export function conservativeSkill(rating: TrueSkillRating): number {
  return rating.mu - 3 * rating.sigma;
}
