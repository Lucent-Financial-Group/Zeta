#!/usr/bin/env bun
/**
 * Refuse an Application that DECLARES authentication the render does not carry.
 *
 * THE FAILURE THIS EXISTS FOR (081M1FG1RCW087G0R000TAZWJX, measured 2026-09-01):
 * `full-ai-cluster/seaweedfs` declared `allInOne.s3.enableAuth: true` with an access
 * key and a secret key beside it. Rendered at the pinned chart version, the manifest
 * contained ZERO identities and no mention of the access key at all -- no identity file
 * was produced. The S3 gateway therefore served the blob store with no identities
 * configured, and the loader at that version failed OPEN.
 *
 * Anything able to reach that Service could read and write loki chunks, mimir TSDB
 * blocks and zeta-backups, credentials or not.
 *
 * WHY EVERY EXISTING GUARD MISSED IT, which is the part that made this worth building:
 *
 *   - `inert-valuesobject-keys` asks "does the chart HAVE this key". It does. The keys
 *     are real, spelled correctly, and read by the chart at OTHER versions.
 *   - the chart audits ask "does this pin resolve". It does.
 *   - `helm template` exits 0. The manifest is valid. Nothing is malformed.
 *
 * The configuration was present, well-formed, and NOT IN EFFECT. That is the vacuity
 * class one level up from a check that cannot fail: a SETTING that cannot take effect,
 * which is worse, because a setting reads as a guarantee to everyone who greps for it.
 *
 * So this asks a different question from every guard above: not "is auth configured"
 * but "is the configuration VISIBLE IN THE THING THAT DEPLOYS".
 *
 * HONEST LIMIT, and it is a real one. Presence in the render is necessary and NOT
 * sufficient. This proves an identity file is produced; it does not prove the gateway
 * rejects an unauthenticated request. The sufficient test needs a live cluster and is
 * the work item's actual exit condition. This is the half that runs on every PR.
 */

import { join } from "node:path";
import { discoverApplications, renderApplication } from "./rendered-storage-claims.ts";

export const REPO_ROOT = join(import.meta.dir, "..", "..", "..");

/**
 * One declared-auth expectation.
 *
 * `mustAppear` are strings that MUST occur in the rendered manifest when the
 * declaration is on. They are deliberately the SECRET-BEARING values: a chart that
 * renders the word "auth" while dropping the credential has still failed.
 */
export interface AuthExpectation {
  readonly appId: string;
  /** Dotted path into the valuesObject whose truthiness turns the expectation on. */
  readonly declaredBy: string;
  readonly mustAppear: readonly string[];
  readonly why: string;
}

/**
 * The roster. Small and explicit on purpose: a generic "find anything auth-shaped"
 * scan would produce false positives on every chart that mentions a token, and a
 * check people learn to ignore protects nothing.
 */
export const EXPECTATIONS: readonly AuthExpectation[] = [
  {
    appId: "full-ai-cluster/seaweedfs",
    declaredBy: "allInOne.s3.enableAuth",
    mustAppear: ["zeta-blob-store"],
    why:
      "the S3 gateway holds loki chunks, mimir TSDB blocks and zeta-backups; with no " +
      "identity in the render the gateway serves them to anyone who can reach the Service",
  },
];

export interface AuthFinding {
  readonly appId: string;
  readonly declaredBy: string;
  readonly missing: readonly string[];
  readonly detail: string;
}

/** Read a dotted path out of a values object. */
export function valueAt(values: unknown, path: string): unknown {
  let cursor: unknown = values;
  for (const part of path.split(".")) {
    if (typeof cursor !== "object" || cursor === null) return undefined;
    cursor = (cursor as Record<string, unknown>)[part];
  }
  return cursor;
}

/** Which expected strings are absent from a rendered manifest. */
export function missingFromRender(
  /** The rendered manifest set, serialised. */
  rendered: string,
  expectation: AuthExpectation,
): readonly string[] {
  return expectation.mustAppear.filter((needle) => !rendered.includes(needle));
}

export function formatFinding(finding: AuthFinding, expectation: AuthExpectation): string {
  return (
    `  ${finding.appId} declares ${finding.declaredBy} and the RENDER DOES NOT CARRY IT.\n` +
    `      absent from the rendered manifest: ${finding.missing.join(", ")}\n` +
    `      ${expectation.why}\n` +
    `      A declared credential that does not reach the render is not a weak setting, it is\n` +
    `      NO setting -- and it reads as a guarantee to everyone who greps for it.`
  );
}

/** Audit every rostered expectation against a live render. */
export function auditDeclaredAuth(repoRoot = REPO_ROOT): readonly AuthFinding[] {
  const byId = new Map(discoverApplications(repoRoot).map((s) => [s.appId, s]));
  const findings: AuthFinding[] = [];
  for (const expectation of EXPECTATIONS) {
    const source = byId.get(expectation.appId);
    if (source === undefined) {
      // An expectation naming an Application that no longer exists is STALE, and a
      // stale expectation that quietly passes is the failure this file is about.
      findings.push({
        appId: expectation.appId,
        declaredBy: expectation.declaredBy,
        missing: [],
        detail: "no such Application in the tree; this expectation is stale",
      });
      continue;
    }
    if (valueAt(source.valuesObject, expectation.declaredBy) !== true) continue;

    const rendered = renderApplication(source, { repoRoot, timeoutMs: 240_000 });
    if (!rendered.ok) {
      // UNKNOWN, never a pass. A render that could not run tells us nothing about
      // whether the credential reaches the manifest.
      findings.push({
        appId: expectation.appId,
        declaredBy: expectation.declaredBy,
        missing: [],
        detail: `render unavailable (${rendered.reason}) -- auth presence is UNKNOWN, not confirmed`,
      });
      continue;
    }
    // The render gives PARSED documents, so serialise them and search the whole set.
    // Searching the serialised form rather than one field means a chart that moves a
    // credential between a ConfigMap, a Secret and a container arg still satisfies this
    // -- the question is whether the credential reaches the manifest AT ALL, not where.
    const missing = missingFromRender(JSON.stringify(rendered.documents), expectation);
    if (missing.length > 0) {
      findings.push({
        appId: expectation.appId,
        declaredBy: expectation.declaredBy,
        missing,
        detail: "declared, well-formed, and absent from the rendered manifest",
      });
    }
  }
  return findings;
}

if (import.meta.main) {
  const findings = auditDeclaredAuth();
  if (findings.length === 0) {
    process.stdout.write(
      `declared-auth: OK -- ${String(EXPECTATIONS.length)} expectation(s), every declared ` +
        "credential appears in its Application's rendered manifest\n",
    );
    process.exit(0);
  }
  process.stdout.write(`declared-auth VIOLATED -- ${String(findings.length)} finding(s)\n\n`);
  for (const finding of findings) {
    const expectation = EXPECTATIONS.find((e) => e.appId === finding.appId);
    process.stdout.write(
      expectation ? `${formatFinding(finding, expectation)}\n      ${finding.detail}\n\n`
                  : `  ${finding.appId}: ${finding.detail}\n\n`,
    );
  }
  process.exit(1);
}
