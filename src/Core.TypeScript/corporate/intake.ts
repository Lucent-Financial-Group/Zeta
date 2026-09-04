/**
 * corporate/intake.ts — work arriving from outside, normalized once and never ingested twice.
 *
 * ── THE GAP THIS CLOSES ──────────────────────────────────────────────────────
 * Every goal in this register so far was handed to `acceptGoal` by a caller who already knew what it
 * wanted. Nothing described how work ARRIVES: a customer report, a monitor firing, a support ticket.
 * Those come from systems that retry, so the two questions intake has to answer are "is this
 * well-formed" and "have I seen it before".
 *
 * ── THE IDEMPOTENCY KEY, AND WHY THE OBVIOUS ONE COLLIDES ────────────────────
 * The reference keys on `` `${source}:${externalId}` ``. That is ambiguous whenever either part can
 * contain the separator: source `"a:b"` with id `"c"` and source `"a"` with id `"b:c"` both produce
 * `"a:b:c"`, so two unrelated upstream reports silently become one work item — and the one that
 * loses is dropped as a duplicate, which is the least visible failure available.
 *
 * Here the parts are LENGTH-PREFIXED (`3:src|1:id`), which is unambiguous for any content, and the
 * `|` is never load-bearing because the lengths already delimit. A caller does not have to sanitize
 * anything, which matters because the source of the collision is upstream data nobody controls.
 *
 * ── REFUSING IS NOT DROPPING ─────────────────────────────────────────────────
 * Malformed payloads come back as a typed refusal with a reason, so a webhook can answer its caller.
 * Silently discarding an unparseable report is how a customer's bug disappears with nobody, on
 * either side, aware it did.
 */

import { WorkType } from "./goal-cascade";

export const IntakeKind = {
  Defect: "defect",
  ServiceRequest: "service_request",
  Feature: "feature",
  Goal: "goal",
  Incident: "incident",
} as const;

export type IntakeKind = (typeof IntakeKind)[keyof typeof IntakeKind];

export const Severity = {
  Critical: "critical",
  High: "high",
  Medium: "medium",
  Low: "low",
} as const;

export type Severity = (typeof Severity)[keyof typeof Severity];

/** The raw inbound event. Everything here is untrusted upstream data. */
export interface ExternalEvent {
  readonly source: string;
  readonly externalId: string;
  readonly kind?: IntakeKind;
  readonly title: string;
  readonly body?: string;
  readonly severity?: Severity;
  /** Evidence the reporter attached — a trace, a screenshot, a log. */
  readonly evidenceRefs?: readonly string[];
  /** Steps to reproduce. Required for a defect (see `triage`). */
  readonly reproduction?: string;
}

export type RefusalReason =
  | "missing_title"
  | "missing_source"
  | "missing_external_id"
  | "duplicate"
  | "missing_reproduction"
  | "missing_evidence"
  /** The item is not where the intake path says triage can act on it. */
  | "not_awaiting_triage";

export interface IntakeRefusal {
  readonly reason: RefusalReason;
  readonly message: string;
}

export interface NormalizedIntake {
  readonly workType: WorkType;
  readonly kind: IntakeKind;
  readonly title: string;
  readonly externalRef: string;
  readonly severity: Severity;
  readonly evidenceRefs: readonly string[];
  readonly reproduction?: string;
}

export type IntakeResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly refusal: IntakeRefusal };

/**
 * Where each inbound kind lands in the cascade.
 *
 * A `goal` becomes a `Goal` — which `acceptGoal` will then refuse unless the C-suite takes it, so an
 * external system CANNOT set company direction by labelling its ticket. That refusal living in the
 * cascade rather than here is deliberate: intake's job is to classify honestly, and authority is a
 * separate question asked by whoever acts on the classification.
 */
const KIND_TO_WORK_TYPE: Readonly<Record<IntakeKind, WorkType>> = {
  // EACH KIND KEEPS ITS SHAPE. All four of these used to map onto `Task`, which threw away the
  // classification intake had just made: a defect and an incident became the same thing the moment
  // they entered the cascade, so nothing downstream could apply a fix flow to one and a restoration
  // clock to the other. Classifying honestly and then discarding the answer is worse than not
  // classifying, because the discarded distinction still LOOKS like it survived.
  [IntakeKind.Defect]: WorkType.Defect,
  [IntakeKind.Incident]: WorkType.Incident,
  // A service request asks for an operational action; a feature asks for new capability. Both are
  // requests for something the organization does not yet provide.
  [IntakeKind.ServiceRequest]: WorkType.CapabilityRequest,
  [IntakeKind.Feature]: WorkType.CapabilityRequest,
  [IntakeKind.Goal]: WorkType.Goal,
};

/**
 * The idempotency key: length-prefixed parts, unambiguous for any content.
 *
 * Exported because a caller has to compute the same key to answer "have I seen this", and two
 * implementations of a key is one implementation of a bug.
 */
export function externalRefOf(source: string, externalId: string): string {
  return `${source.length}:${source}|${externalId.length}:${externalId}`;
}

/** Normalize and validate. Refuses rather than guessing. */
export function normalize(raw: ExternalEvent): IntakeResult<NormalizedIntake> {
  const title = raw.title.trim();
  const source = raw.source.trim();
  const externalId = raw.externalId.trim();

  if (title === "") {
    return { ok: false, refusal: { reason: "missing_title", message: "intake has no title" } };
  }
  if (source === "") {
    // Without a source the key is not unique across systems, so two upstreams with the same
    // internal id would collide.
    return { ok: false, refusal: { reason: "missing_source", message: "intake has no source" } };
  }
  if (externalId === "") {
    return {
      ok: false,
      refusal: { reason: "missing_external_id", message: "intake has no externalId — it cannot be de-duplicated" },
    };
  }

  const kind = raw.kind ?? IntakeKind.ServiceRequest;
  return {
    ok: true,
    value: {
      workType: KIND_TO_WORK_TYPE[kind],
      kind,
      title,
      externalRef: externalRefOf(source, externalId),
      // An unstated severity is MEDIUM, not low. An unclassified report is not evidence that
      // nothing is wrong, and defaulting downward buries exactly the reports nobody triaged.
      severity: raw.severity ?? Severity.Medium,
      evidenceRefs: raw.evidenceRefs ?? [],
      ...(raw.reproduction === undefined || raw.reproduction.trim() === ""
        ? {}
        : { reproduction: raw.reproduction.trim() }),
    },
  };
}

export const IntakeState = {
  Created: "created",
  Intake: "intake",
  Triage: "triage",
  Ready: "ready",
} as const;

export type IntakeState = (typeof IntakeState)[keyof typeof IntakeState];

export const INTAKE_PATH: readonly IntakeState[] = [
  IntakeState.Created,
  IntakeState.Intake,
  IntakeState.Triage,
  IntakeState.Ready,
];

export interface IntakeItem {
  readonly itemId: string;
  readonly externalRef: string;
  readonly workType: WorkType;
  readonly kind: IntakeKind;
  readonly title: string;
  readonly severity: Severity;
  readonly state: IntakeState;
  readonly evidenceRefs: readonly string[];
  readonly reproduction?: string;
  readonly receivedAtMs: number;
}

/**
 * Ingest — idempotent on `externalRef`.
 *
 * `seen` is passed in rather than looked up, so this stays a pure function of its inputs. A retrying
 * upstream is the normal case, not the exception, and a second call for the same report must be a
 * refusal rather than a second work item.
 */
export function ingest(
  normalized: NormalizedIntake,
  input: { readonly itemId: string; readonly nowMs: number; readonly seen: ReadonlySet<string> },
): IntakeResult<IntakeItem> {
  if (input.seen.has(normalized.externalRef)) {
    return {
      ok: false,
      refusal: { reason: "duplicate", message: `'${normalized.externalRef}' has already been ingested` },
    };
  }
  return {
    ok: true,
    value: {
      itemId: input.itemId,
      externalRef: normalized.externalRef,
      workType: normalized.workType,
      kind: normalized.kind,
      title: normalized.title,
      severity: normalized.severity,
      state: IntakeState.Created,
      evidenceRefs: normalized.evidenceRefs,
      ...(normalized.reproduction === undefined ? {} : { reproduction: normalized.reproduction }),
      receivedAtMs: input.nowMs,
    },
  };
}

/**
 * What a kind must carry before it may reach `Ready`.
 *
 * The reference walks the same path but passes `hasTriageFields: true, hasRequiredEvidence: true`
 * HARDCODED into its transition guard, with a comment saying an external report carries them. So the
 * guard is called and cannot refuse — a defect with no reproduction steps and no evidence advances
 * exactly as one with both. Checked here instead of asserted.
 */
export function requirementsFor(kind: IntakeKind): {
  readonly needsReproduction: boolean;
  readonly needsEvidence: boolean;
} {
  switch (kind) {
    case IntakeKind.Defect:
      // "It is broken" without steps is a report nobody can act on.
      return { needsReproduction: true, needsEvidence: true };
    case IntakeKind.Incident:
      // An incident is urgent and may not be reproducible on demand, but something must have been
      // observed or there is nothing to respond to.
      return { needsReproduction: false, needsEvidence: true };
    case IntakeKind.ServiceRequest:
    case IntakeKind.Feature:
    case IntakeKind.Goal:
      return { needsReproduction: false, needsEvidence: false };
  }
  return assertNeverKind(kind);
}

function assertNeverKind(x: never): never {
  throw new Error(`unhandled intake kind: ${String(x)}`);
}

/**
 * Advance an ingested item to `Ready`, or REFUSE with what is missing.
 *
 * The refusal is the point. A defect that reaches the backlog without reproduction steps costs a
 * developer a day and comes back unresolved; refusing it at the door costs the reporter one reply.
 */
export function triage(item: IntakeItem): IntakeResult<IntakeItem> {
  const needs = requirementsFor(item.kind);
  if (needs.needsReproduction && (item.reproduction === undefined || item.reproduction === "")) {
    return {
      ok: false,
      refusal: {
        reason: "missing_reproduction",
        message: `a ${item.kind} needs reproduction steps before it is workable`,
      },
    };
  }
  if (needs.needsEvidence && item.evidenceRefs.length === 0) {
    return {
      ok: false,
      refusal: { reason: "missing_evidence", message: `a ${item.kind} needs at least one piece of evidence` },
    };
  }
  // The path is CONSULTED, not merely declared. Triage moves an item forward along it, and an item
  // already at or past the destination is refused rather than silently re-triaged — a table nothing
  // reads is a comment with a type annotation.
  const from = INTAKE_PATH.indexOf(item.state);
  const to = INTAKE_PATH.indexOf(IntakeState.Ready);
  if (from < 0 || from >= to) {
    return {
      ok: false,
      refusal: {
        reason: "not_awaiting_triage",
        message:
          from < 0
            ? `'${item.itemId}' is in unknown intake state '${item.state}'`
            : `'${item.itemId}' is already ${item.state} and cannot be triaged again`,
      },
    };
  }
  return { ok: true, value: { ...item, state: IntakeState.Ready } };
}

/**
 * The whole door in one call: normalize, de-duplicate, triage.
 *
 * Returns the FIRST refusal, which is the one the caller can act on — telling a reporter its
 * untitled duplicate also lacks reproduction steps is three problems where there is one.
 */
export function receive(
  raw: ExternalEvent,
  input: { readonly itemId: string; readonly nowMs: number; readonly seen: ReadonlySet<string> },
): IntakeResult<IntakeItem> {
  const normalized = normalize(raw);
  if (!normalized.ok) return normalized;
  const ingested = ingest(normalized.value, input);
  if (!ingested.ok) return ingested;
  return triage(ingested.value);
}
