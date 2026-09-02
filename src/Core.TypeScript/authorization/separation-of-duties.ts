/**
 * separation-of-duties.ts — the proposer of a change can never approve it.
 *
 * Brought over from `agentic-organization/packages/application/src/hat-guardrails.ts`
 * (`preflightApproval`), which is the only place in the repository that expresses this rule as a
 * check rather than as prose. The sovereign side had the *sentiment* — `ci/forward-action-du.ts`
 * says "Self-approving a held workflow is extension", and a lint pattern catches GitHub's
 * deployment-approval endpoints — but no reusable primitive over a proposer and an approver.
 *
 * ── WHY THIS IS NOT A COPY ───────────────────────────────────────────────────
 * The org version compares HAT IDS:
 *
 *     if (proposerHatId === approverHatId) refuse
 *
 * That is sound in a model where an agent wears one hat. It is NOT sound here, and the difference
 * is not academic: `Persona.Worn` is a LIST — a persona wears a *subset* of hats and may change it
 * with `wear`/`doff` at any time. So under a hat-id comparison:
 *
 *     otto, wearing `author`,   proposes  ->  hat id "author"
 *     otto, wearing `reviewer`, approves  ->  hat id "reviewer"   -> ids differ -> ALLOWED
 *
 * One agent has just approved its own work by changing hats, which is precisely the thing
 * separation of duties exists to prevent. Worse, `doff`/`wear` makes that a two-line manoeuvre
 * rather than an exotic edge case.
 *
 * So this keys on the PERSONA — the durable wearer. A hat is a role you can put on and take off; the
 * persona is who you are, and it is the identity the rule is actually about. The hat is still
 * reported, because *which* hat was worn is useful in the refusal, but it never decides the verdict.
 *
 * ── WHAT THIS IS NOT ─────────────────────────────────────────────────────────
 * This is a check on DECLARED identity. It cannot tell that two persona names are the same human or
 * the same process behind the scenes — a sybil holding two personas defeats it, exactly as a sybil
 * defeats any identity-keyed rule. The repo's own anti-sybil machinery (`TravelerRankLedger`,
 * `SocietyUsefulWork`) is what prices that; this function does not, and does not pretend to.
 */

/** Who acted: the durable wearer, and the role they wore while acting. */
export interface Actor {
  /** The durable identity. THIS is what separation of duties is keyed on. */
  readonly persona: string;
  /** The role worn at the time. Reported in refusals; never decides the verdict. */
  readonly hat: string;
}

export type DutyResult =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly reason: string; readonly persona: string };

/**
 * May `approver` approve a change proposed by `proposer`?
 *
 * Refused when they are the same persona, whatever hats they wore. Changing hats between proposing
 * and approving is the manoeuvre this exists to stop.
 */
export function preflightApproval(proposer: Actor, approver: Actor): DutyResult {
  if (proposer.persona !== approver.persona) return { allowed: true };
  const viaHats =
    proposer.hat === approver.hat
      ? `wearing "${approver.hat}"`
      : `wearing "${proposer.hat}" to propose and "${approver.hat}" to approve — changing hats does not change who you are`;
  return {
    allowed: false,
    reason: `separation-of-duties: "${approver.persona}" proposed this change and cannot approve it, ${viaHats}`,
    persona: approver.persona,
  };
}

/**
 * Does a set of approvals meet a quorum of DISTINCT personas, none of them the proposer?
 *
 * Generalises the shape `src/Core.TypeScript/orchestrator/validate-otto-diff.ts` already enforces by
 * hand — a gated diff needs PASS receipts from two *other* agents — so the rule exists once instead
 * of once per validator.
 *
 * Two things it counts carefully, because both are ways a quorum quietly becomes one signature:
 * duplicate approvals from the same persona collapse to one, and the proposer's own approval is
 * removed before counting rather than counted and then subtracted.
 */
export function preflightQuorum(proposer: Actor, approvers: readonly Actor[], required: number): DutyResult {
  const needed = Math.max(0, required);
  const distinct = new Set<string>();
  for (const a of approvers) {
    if (a.persona === proposer.persona) continue; // self-approval never counts toward a quorum
    distinct.add(a.persona);
  }
  if (distinct.size >= needed) return { allowed: true };
  const selfCount = approvers.filter(a => a.persona === proposer.persona).length;
  const selfNote = selfCount > 0 ? ` (${selfCount} self-approval(s) discounted)` : "";
  return {
    allowed: false,
    reason: `separation-of-duties: quorum of ${needed} distinct approver(s) not met — ${distinct.size} distinct non-proposer persona(s)${selfNote}`,
    persona: proposer.persona,
  };
}
