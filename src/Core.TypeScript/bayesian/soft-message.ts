/**
 * soft-message.ts — the missing message family: a CATEGORICAL belief that can
 * travel a factor graph, with no participant able to silence a candidate.
 *
 * ## Why this exists
 *
 * `docs/VISION.md:3117` names Soft (a distribution over candidates) as *the*
 * Bayesian layer, and `src/Bayesian/FactorGraph.fs:33` already carries a
 * `Factor<'M>` generic over its message family. But `Zeta.Bayesian`'s only
 * message family is `Gaussian` (continuous), and `SoftValue` is categorical
 * over `DynamicValue`. There is no call path between them — a grep for `bayes`
 * across every `src/Core/Soft*.fs` returns only doc comments. A layer graph
 * whose layers hold different KINDS of belief needs a categorical message, and
 * this is it.
 *
 * ## Why it is not `SoftValue` itself
 *
 * `SoftValue` is NORMALIZED by construction — its private representation
 * enforces weights summing to 1. A message must be UNNORMALIZED: the whole
 * point of natural parameters is that they form a group under addition, and
 * the product of two normalized densities is not normalized. So a normalized
 * type cannot be a message without breaking the algebra it is being asked to
 * join. `SoftMessage` is the unnormalized companion; `SoftValue` is what you
 * get when you normalize one for a decision.
 *
 * ## Integer log-weights, and why exactness is not fussiness here
 *
 * For a categorical family the natural parameters ARE log-weights, so
 * `Product` is pointwise addition and `Divide` (the EP cavity, Minka 2001) is
 * pointwise subtraction. Stored as INTEGERS in units of 1/`SCALE` nats, which
 * buys three things floats would not:
 *
 *   - the group laws hold EXACTLY — no float associativity drift, so a
 *     different message ordering cannot change a decision;
 *   - it byte-locks across oracles, which the existing TS SoftValue oracle
 *     cannot do and says so in its own header (floats do not byte-lock, so it
 *     cross-verifies only decisions);
 *   - the influence bound below is an exact integer, so "no one can be
 *     silenced" is a checkable arithmetic fact rather than an approximate one.
 *
 * ## THE ATTACK, and the one line that closes it
 *
 * In log-space, `Product` is addition. A message that assigns log-weight −∞
 * (weight zero) to candidate `c` therefore VETOES `c` PERMANENTLY: −∞ plus
 * anything is −∞, so no amount of later evidence can revive it. One
 * participant, one message, and a candidate is gone from the society's
 * consideration for good. That is a memetic attack expressed in three
 * characters of arithmetic.
 *
 * It is also the ordinary failure mode with no adversary at all: a sensor that
 * has simply never seen `c` reports zero, not "I have no information", and the
 * distinction is invisible downstream.
 *
 * The fix is BOUNDED INFLUENCE (Huber 1964; Hampel's influence function): every
 * message's log-weights are clamped to [−`MAX_INFLUENCE`, +`MAX_INFLUENCE`].
 * A single message can then push a candidate down by at most `MAX_INFLUENCE`,
 * and enough other messages can always outvote it. No veto exists.
 *
 * The same clamp closes the EP cavity problem, which is why it is one
 * mechanism and not two: `Divide` subtracts, so dividing by a near-zero-mass
 * message would produce +∞ and poison the graph. Bounded operands cannot.
 *
 * ## Outliers are members, not errors
 *
 * The values reading and the statistics agree here, which is the reason to
 * trust the design rather than a decoration on top of it. Robust inference
 * DOWN-WEIGHTS rather than REJECTS — a Student-t likelihood gives weight
 * `w = (ν+1)/(ν+z²)`, which shrinks with distance and never reaches zero.
 * Bounded influence is that same discipline for categorical messages: a
 * candidate everyone disbelieves gets quiet, never deleted.
 *
 * That is `manifesto §11` default moral regard, stated in arithmetic — and it
 * is also just correct, because the minority candidate is the one carrying the
 * information when the majority is wrong. Discarding outliers is the ρ→1
 * collapse that `anti-babel-preserve-reconcilability.md` warns about, applied
 * to belief instead of vocabulary.
 *
 * ## Dual-use: this module reports facts and refuses verdicts
 *
 * `atInfluenceFloor` says a message clamped a candidate. It does NOT say
 * whether that is an attack, an honest sensor with no data, or a correct
 * assessment of a bad candidate — those are different readings of one
 * measurement and the caller's oracle decides between them
 * (`dual-use-detection-is-neutral-oracle-decides.md`). A function named
 * `detectSuppressionAttack` would smuggle a morality the substrate is not
 * allowed to hold.
 *
 * ## Anchors (Beacon)
 *
 * - Kschischang, Frey & Loeliger 2001 — factor graphs and sum-product; product
 *   of messages = addition of natural parameters.
 * - Minka 2001 — Expectation Propagation; `Divide` is the cavity.
 * - Huber 1964; Hampel 1974 — bounded influence; the influence function of an
 *   unbounded-score estimator is why one observation can move a Gaussian
 *   posterior arbitrarily far.
 * - Robust-EP line of work (relaxed moment matching under outliers, and the
 *   2025 heavy-tailed robustness results showing bounded sensitivity: a single
 *   large outlier has vanishing influence under Student-t errors).
 *
 * @see src/Bayesian/Message.fs:55 — the `IMessage<'M>` contract this satisfies
 * @see src/Bayesian/FactorGraph.fs:33 — `Factor<'M>`, generic over this
 * @see src/Core/SoftValue.fs:42 — the normalized F# peer
 * @see docs/research/2026-08-25-the-layer-graph-already-exists-three-unwired-seams-between-rx-soft-and-bayesian.md
 */

/** Candidate identity. Opaque string key, as in the TS SoftValue oracle. */
export type CandidateKey = string;

/**
 * Fixed-point scale for log-weights: 1 unit = 1/1000 nat ("millinats").
 *
 * Chosen so that the whole useful dynamic range is integers. A likelihood
 * ratio of e^20 (~4.8e8, far past any evidence a single sensor should carry)
 * is 20000 units — comfortably inside a double's exact-integer range, so
 * addition and subtraction stay exact.
 */
export const SCALE = 1000;

/**
 * The most any SINGLE message may move a candidate, in millinats.
 *
 * 10 nats ≈ a likelihood ratio of 22026:1. That is a very loud opinion — and
 * still finite, which is the entire point. Twelve messages of equal strength
 * outvote eleven; nothing outvotes −∞.
 *
 * THIS IS A VALUES PARAMETER WEARING A NUMBER, and it is named rather than
 * buried: it fixes how much authority one participant may hold over one
 * candidate. Raising it toward infinity restores the veto by degrees.
 */
export const MAX_INFLUENCE = 10 * SCALE;

/**
 * An unnormalized categorical message: candidate → log-weight in millinats.
 *
 * A key that is ABSENT means log-weight 0 — no opinion — not weight 0. That
 * distinction is the whole difference between "I have no information about
 * this candidate" and "this candidate is impossible", and conflating them is
 * how the veto gets in through the back door.
 */
export type SoftMessage = Readonly<Record<CandidateKey, number>>;

/** The flat message: the identity for {@link product}. No opinion about anything. */
export const uniform: SoftMessage = Object.freeze({});

const clampInfluence = (v: number): number =>
  v > MAX_INFLUENCE ? MAX_INFLUENCE : v < -MAX_INFLUENCE ? -MAX_INFLUENCE : v;

/**
 * Build a message from log-weights, clamping each to the influence bound.
 *
 * This is the ONLY constructor, deliberately: a `SoftMessage` that skipped the
 * clamp would be indistinguishable from one that passed it, and the veto would
 * be back. Non-finite input is rejected rather than clamped — `-Infinity` is
 * exactly the veto this exists to prevent, and silently reinterpreting it as
 * "very unlikely" would hide a caller bug that deserves to surface.
 */
export const fromLogWeights = (w: Readonly<Record<CandidateKey, number>>): SoftMessage => {
  const out: Record<CandidateKey, number> = {};
  for (const k of Object.keys(w).sort()) {
    const v = w[k]!;
    if (!Number.isFinite(v)) {
      throw new Error(
        `soft-message: log-weight for ${JSON.stringify(k)} is ${String(v)}. ` +
          "An infinite log-weight is a permanent veto — no later evidence can " +
          "revive the candidate. Express strong disbelief as a large finite " +
          "value; it will be clamped to MAX_INFLUENCE.",
      );
    }
    out[k] = clampInfluence(Math.round(v));
  }
  return Object.freeze(out);
};

/** Every candidate either message mentions, in deterministic (sorted) order. */
const keysOf = (a: SoftMessage, b: SoftMessage): CandidateKey[] =>
  [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();

/**
 * Message product — the BP combine. Pointwise addition of log-weights.
 *
 * NOT re-clamped. The bound limits what ONE message may assert; the product of
 * many messages is the society's accumulated view and is allowed to be as
 * confident as the evidence makes it. Clamping here would cap what any
 * majority could conclude, which is a different and much worse rule.
 */
export const product = (a: SoftMessage, b: SoftMessage): SoftMessage => {
  const out: Record<CandidateKey, number> = {};
  for (const k of keysOf(a, b)) out[k] = (a[k] ?? 0) + (b[k] ?? 0);
  return Object.freeze(out);
};

/**
 * EP cavity — remove one message's contribution. Pointwise subtraction.
 *
 * Total by construction: operands are bounded, so this cannot produce ±∞ or
 * NaN. That is the near-zero-mass problem solved by the same clamp that
 * removes the veto, which is why bounded influence is one mechanism rather
 * than two patches.
 */
export const divide = (a: SoftMessage, b: SoftMessage): SoftMessage => {
  const out: Record<CandidateKey, number> = {};
  for (const k of keysOf(a, b)) out[k] = (a[k] ?? 0) - (b[k] ?? 0);
  return Object.freeze(out);
};

/**
 * Candidates this message pushed all the way to the floor — a NEUTRAL FACT.
 *
 * It reports that a message's opinion was clamped. It does NOT report why, and
 * the readings are genuinely different: an adversary suppressing a candidate, a
 * sensor with no data reporting zero, and a correct assessment of a bad
 * candidate all look identical here. Attaching a verdict would bake in a
 * morality the substrate may not hold; the caller's oracle decides.
 */
export const atInfluenceFloor = (m: SoftMessage): CandidateKey[] =>
  Object.keys(m)
    .filter((k) => m[k] === -MAX_INFLUENCE)
    .sort();

/**
 * Normalize to a decision-ready distribution: candidate → probability.
 *
 * The exit from message space to `SoftValue` space. Softmax over log-weights,
 * shifted by the max for numerical stability. Floats appear HERE and only here
 * — every operation above is exact integer arithmetic, so the whole inference
 * is reproducible and only the final read-out is approximate.
 */
export const toDistribution = (m: SoftMessage): Record<CandidateKey, number> => {
  const keys = Object.keys(m).sort();
  if (keys.length === 0) return {};
  const top = Math.max(...keys.map((k) => m[k]!));
  const exps = keys.map((k) => Math.exp((m[k]! - top) / SCALE));
  const total = exps.reduce((s, v) => s + v, 0);
  const out: Record<CandidateKey, number> = {};
  keys.forEach((k, i) => (out[k] = exps[i]! / total));
  return out;
};

/**
 * The argmax candidate, ties broken by ascending key.
 *
 * Same tie-break as the TS SoftValue oracle, which F# got wrong until
 * 2026-08-23 — matching it here is deliberate so the two agree.
 */
export const argmax = (m: SoftMessage): CandidateKey | null => {
  const keys = Object.keys(m).sort();
  if (keys.length === 0) return null;
  let best = keys[0]!;
  for (const k of keys) if (m[k]! > m[best]!) best = k;
  return best;
};
