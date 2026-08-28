// registry.ts — the subject registry for the named index into `You, Born at the Hinge`.
//
// WHY THIS FILE EXISTS
// --------------------
// The consent design binds approval to a content hash of the approved passage, so any
// revision makes the approval STALE and asks the subject again. That is correct and it does
// not survive contact with reality: Aaron revises many times AFTER talking to the people
// involved. Twenty subjects x five revisions is a hundred approval requests, and people stop
// answering — at which point the mechanism has trained everyone to ignore it, which is worse
// than not having it.
//
// The named index changes the unit. A subject is shown THEIR WHOLE FOOTPRINT — every place
// they appear — and consent binds to that combined entry rather than to sentences. Revision
// then produces a DELTA against what they already approved instead of a fresh interrogation.
//
// THE REGISTRY IS THE ONE HAND-MAINTAINED PART, AND IT IS DELIBERATELY THE SMALLEST PART.
// The index itself is DERIVED by scanning prose (see `scan.ts`) — never hand-kept — because a
// hand-kept index drifts, and a drifted index means someone approved coverage that no longer
// reflects the text. That is the vacuity class landing on a named third party instead of on
// CI. What cannot be derived is WHO THE PEOPLE ARE and WHAT THEY AGREED TO; that is this file,
// and `audit-coverage.ts` exists to catch it going stale.
//
// NAMES THAT ARE NOT OURS TO WRITE
// --------------------------------
// `Lucent-Financial-Group/Zeta` is a PUBLIC repository, so writing a name here publishes it.
// The registry therefore NEVER introduces a name string that the CONSENT-LEDGER has not
// already established as consented-and-named. Every other subject carries
// `nameWithheldFromRegistry: true` and its detector strings come from a LOCAL OVERLAY that is
// never committed (see `loadOverlay`). Missing overlay does not mean "pass" — it means the
// name-leak check DID NOT RUN, and the audit reports that as UNCHECKED (exit 2), never green.

import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * The consent state of a subject, as recorded in `CONSENT-LEDGER.md`.
 *
 * `pending` and `role-only` enforce IDENTICALLY; so do `revoked` and `omitted`. They are kept
 * apart because the DISPOSITION differs — `pending` generates a follow-up (someone was asked
 * and has not answered), `role-only` is settled; `revoked` is a withdrawal, `omitted` is a
 * protection that was never in question (an identifiable minor). Collapsing them would lose
 * the reason while keeping the rule, and the reason is what a human needs when the audit
 * goes red. `STATE_RULES` below is the machine-checked statement that the enforcement halves
 * really are identical, so this claim is pinned rather than asserted.
 */
export type SubjectState = "named" | "role-only" | "pending" | "revoked" | "omitted";

export const SUBJECT_STATES: readonly SubjectState[] = [
  "named",
  "role-only",
  "pending",
  "revoked",
  "omitted",
];

/** What the book text is permitted to contain for a subject in a given state. */
export interface StateRule {
  /** May the subject's NAME appear in prose? */
  readonly nameMayAppear: boolean;
  /** May the subject appear at all, under a role phrase ("my mother")? */
  readonly roleMayAppear: boolean;
}

export const STATE_RULES: Readonly<Record<SubjectState, StateRule>> = {
  named: { nameMayAppear: true, roleMayAppear: true },
  "role-only": { nameMayAppear: false, roleMayAppear: true },
  pending: { nameMayAppear: false, roleMayAppear: true },
  revoked: { nameMayAppear: false, roleMayAppear: false },
  omitted: { nameMayAppear: false, roleMayAppear: false },
};

export interface SubjectDetectors {
  /**
   * Name strings. Present ONLY for subjects the ledger already names in committed text —
   * writing a withheld name here would be the exposure this file exists to prevent.
   */
  readonly names: readonly string[];
  /**
   * Role phrases ("my mother", "my business partner"). These are how a `role-only` subject is
   * found in prose at all, so they are the committed fallback when names are withheld.
   */
  readonly rolePhrases: readonly string[];
}

export interface Subject {
  readonly id: string;
  /** Relation, matching the ledger's own wording. */
  readonly role: string;
  readonly state: SubjectState;
  /** The `Person` cell in `CONSENT-LEDGER.md` this row corresponds to. */
  readonly ledgerAnchor: string;
  readonly detectors: SubjectDetectors;
  /**
   * True when this subject's name(s) are deliberately NOT in this file. The audit then needs
   * the local overlay to run its leak check, and reports UNCHECKED without it.
   */
  readonly nameWithheldFromRegistry: boolean;
  /**
   * Free-text pointer for constraints the four states cannot express — notably SCOPED
   * permissions ("fine as an ex-wife, not as a tech mentor"). THE INDEX DOES NOT ENFORCE
   * THESE. Stating that plainly is the point: a scoped constraint that looks enforced and is
   * not would be worse than one that is visibly a human's job.
   */
  readonly scopeNote?: string;
  /** Informational: a publish-time gate recorded in the ledger. Not enforced here. */
  readonly publishGate?: string;
}

export interface Registry {
  readonly book: string;
  /** Repo-relative directory holding the book's prose. */
  readonly root: string;
  /**
   * Prose files excluded from the INDEX corpus. `CONSENT-LEDGER.md` is the permissions file,
   * not the book — indexing it would report every subject as appearing in their own consent
   * row. It is still inside the LEAK corpus, because a withheld name written into the ledger
   * is exactly the leak this guards.
   */
  readonly notProse: readonly string[];
  readonly subjects: readonly Subject[];
}

export interface Overlay {
  /** subject id -> withheld name strings, supplied from outside the repo. */
  readonly names: Readonly<Record<string, readonly string[]>>;
}

export const DEFAULT_REGISTRY_PATH = "docs/books/you-born-at-the-hinge/SUBJECTS.json";

/**
 * Where the withheld names live. Never in the repo. The default sits in the same local memory
 * directory that already holds `PENDING-CONSENT-holly-hill-episode-third-party.md`, which is
 * where this material already is; `ZETA_BOOK_SUBJECTS_LOCAL` overrides it.
 */
export function overlayPath(env: NodeJS.ProcessEnv = process.env): string {
  const explicit = env["ZETA_BOOK_SUBJECTS_LOCAL"];
  if (explicit !== undefined && explicit.length > 0) return explicit;
  return join(
    homedir(),
    ".claude",
    "projects",
    "-Users-acehack-Documents-src-repos-Zeta",
    "memory",
    "book-subjects-local.json",
  );
}

function fail(message: string): never {
  throw new Error(`registry: ${message}`);
}

function asStringArray(value: unknown, where: string): readonly string[] {
  if (!Array.isArray(value)) fail(`${where} must be an array of strings`);
  for (const item of value) {
    if (typeof item !== "string" || item.trim().length === 0) {
      fail(`${where} must contain only non-empty strings`);
    }
  }
  return value as readonly string[];
}

export function parseRegistry(json: string, sourceLabel: string): Registry {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch (error) {
    fail(`${sourceLabel} is not valid JSON: ${String(error)}`);
  }
  if (typeof raw !== "object" || raw === null) fail(`${sourceLabel} must be a JSON object`);
  const obj = raw as Record<string, unknown>;

  const book = obj["book"];
  const root = obj["root"];
  if (typeof book !== "string" || typeof root !== "string") {
    fail(`${sourceLabel} needs string "book" and "root"`);
  }
  const notProse = asStringArray(obj["notProse"] ?? [], `${sourceLabel} .notProse`);

  const subjectsRaw = obj["subjects"];
  if (!Array.isArray(subjectsRaw)) fail(`${sourceLabel} needs an array "subjects"`);

  const seen = new Set<string>();
  const subjects: Subject[] = [];
  for (const entry of subjectsRaw) {
    if (typeof entry !== "object" || entry === null) fail(`${sourceLabel}: subject must be an object`);
    const s = entry as Record<string, unknown>;
    const id = s["id"];
    if (typeof id !== "string" || !/^[a-z0-9-]+$/.test(id)) {
      fail(`${sourceLabel}: subject id must match /^[a-z0-9-]+$/ (got ${JSON.stringify(id)})`);
    }
    if (seen.has(id)) fail(`${sourceLabel}: duplicate subject id "${id}"`);
    seen.add(id);

    const state = s["state"];
    if (typeof state !== "string" || !SUBJECT_STATES.includes(state as SubjectState)) {
      fail(`${sourceLabel}: subject "${id}" has unknown state ${JSON.stringify(state)}`);
    }
    const role = s["role"];
    const ledgerAnchor = s["ledgerAnchor"];
    if (typeof role !== "string" || typeof ledgerAnchor !== "string") {
      fail(`${sourceLabel}: subject "${id}" needs string "role" and "ledgerAnchor"`);
    }
    const detectorsRaw = s["detectors"];
    if (typeof detectorsRaw !== "object" || detectorsRaw === null) {
      fail(`${sourceLabel}: subject "${id}" needs "detectors"`);
    }
    const d = detectorsRaw as Record<string, unknown>;
    const names = asStringArray(d["names"] ?? [], `${sourceLabel}: subject "${id}" .detectors.names`);
    const rolePhrases = asStringArray(
      d["rolePhrases"] ?? [],
      `${sourceLabel}: subject "${id}" .detectors.rolePhrases`,
    );

    const withheld = s["nameWithheldFromRegistry"];
    if (typeof withheld !== "boolean") {
      fail(`${sourceLabel}: subject "${id}" needs boolean "nameWithheldFromRegistry"`);
    }

    // A withheld-name subject that also lists names in the committed registry has defeated its
    // own protection. Refuse rather than warn.
    if (withheld && names.length > 0) {
      fail(
        `${sourceLabel}: subject "${id}" is nameWithheldFromRegistry but lists ${names.length} name(s) here`,
      );
    }
    // A subject with no way to be found is an index entry that silently reports zero
    // appearances, which reads as "they are not in the book". Refuse that too.
    if (!withheld && names.length === 0 && rolePhrases.length === 0) {
      fail(`${sourceLabel}: subject "${id}" has no detectors and no withheld names — it can never be found`);
    }

    const scopeNote = s["scopeNote"];
    const publishGate = s["publishGate"];
    subjects.push({
      id,
      role,
      state: state as SubjectState,
      ledgerAnchor,
      detectors: { names, rolePhrases },
      nameWithheldFromRegistry: withheld,
      ...(typeof scopeNote === "string" ? { scopeNote } : {}),
      ...(typeof publishGate === "string" ? { publishGate } : {}),
    });
  }

  if (subjects.length === 0) {
    // Liveness: an empty registry makes every downstream check vacuously pass.
    fail(`${sourceLabel} lists no subjects — an empty registry makes every check vacuous`);
  }

  return { book, root, notProse, subjects };
}

export function loadRegistry(path: string): Registry {
  if (!existsSync(path)) fail(`registry not found at ${path}`);
  return parseRegistry(readFileSync(path, "utf8"), path);
}

export interface OverlayLoad {
  readonly overlay: Overlay | null;
  readonly path: string;
  readonly reason: string;
}

/**
 * Load the local overlay of withheld names. Absence is reported, never defaulted away: the
 * caller decides whether "the leak check could not run" is fatal, and by default it is.
 */
export function loadOverlay(path: string): OverlayLoad {
  if (!existsSync(path)) {
    return { overlay: null, path, reason: `no overlay file at ${path}` };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    return { overlay: null, path, reason: `overlay at ${path} is not valid JSON: ${String(error)}` };
  }
  if (typeof raw !== "object" || raw === null) {
    return { overlay: null, path, reason: `overlay at ${path} must be a JSON object` };
  }
  const namesRaw = (raw as Record<string, unknown>)["names"];
  if (typeof namesRaw !== "object" || namesRaw === null) {
    return { overlay: null, path, reason: `overlay at ${path} must have an object "names"` };
  }
  const names: Record<string, readonly string[]> = {};
  for (const [id, value] of Object.entries(namesRaw as Record<string, unknown>)) {
    if (!Array.isArray(value) || value.some((v) => typeof v !== "string" || v.trim().length === 0)) {
      return { overlay: null, path, reason: `overlay entry "${id}" must be an array of non-empty strings` };
    }
    names[id] = value as readonly string[];
  }
  return { overlay: { names }, path, reason: "loaded" };
}

/**
 * Every name string that must not appear in the repo for this subject, drawn from the overlay.
 * Returns `null` — distinct from `[]` — when the subject's names are withheld and the overlay
 * cannot supply them, so the caller can report UNCHECKED rather than a passing empty check.
 */
export function withheldNamesFor(subject: Subject, overlay: Overlay | null): readonly string[] | null {
  if (!subject.nameWithheldFromRegistry) return [];
  if (overlay === null) return null;
  const supplied = overlay.names[subject.id];
  if (supplied === undefined || supplied.length === 0) return null;
  return supplied;
}
