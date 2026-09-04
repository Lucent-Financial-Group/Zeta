#!/usr/bin/env bun
// missing-resource-requests.ts — which Applications render a pod that requests NOTHING,
// and, for each, the values coordinate its own chart says would fix it.
//
// -- WHY THIS EXISTS -------------------------------------------------------------------
// `storage-profiles.ts --resource-profile dev --budget` has printed the headline every run
// for weeks: "29 of the 47 Applications render pods that request nothing at all." Nobody
// acted, and the reason is not indifference — the number names a problem and supplies no
// route to fixing it. Turning it into work meant opening 28 charts by hand to find where
// each one takes a `resources` block, which is the kind of task that stays undone.
//
// This module removes that step. Both inputs are already checked in, so it needs no
// network and no helm:
//
//   rendered-resource-requests.snapshot.json  — what each chart ACTUALLY renders, per rung
//   inert-valuesobject-keys.schema.json       — every values key each chart ACCEPTS
//
// The first says who requests nothing. The second says where to write the fix. Intersect
// them and the backlog enumerates itself.
//
// -- WHY A MISSING REQUEST IS NOT A SMALL REQUEST --------------------------------------
// A pod with no requests is QoS class BestEffort: evicted before any Burstable pod under
// node pressure, in whatever order the kubelet picks. It also contributes ZERO to every
// budget, so the lane's arithmetic understates what is running — the direction that
// manufactures a Pending pod somewhere else and lands the scheduler's refusal on an
// innocent workload. MEASURED 2026-09-04: `argocd`, `vault`, `longhorn`, `cockroachdb`,
// `nats`, `spire` and `cert-manager` are all in this set, so the control plane, the storage
// layer, the secret store and the GitOps engine that would have to RECOVER from an
// eviction are all first in line to be evicted.
//
// -- THE THREE VERDICTS, AND WHY THE LAST TWO ARE NOT EXCUSES --------------------------
//   ACTIONABLE   the chart accepts a `*.resources` key. There is no reason not to fix it.
//   NO-WORKLOAD  the Application renders no pod at all (CRDs, a scaled-to-zero roster, a
//                policy-only app). "No request" is arithmetic here, not a choice.
//   IN-REPO      a git-path Application with no Chart.yaml. Its manifests are OURS, so the
//                request goes directly in the YAML — no chart coordinate to discover, and
//                emphatically not an exemption.
//
// Aaron 2026-09-04: "get all our helm charts validated and having a request even if a tiny
// one, if we can't get all our helm charts requests for some reason then we should
// carefully choose the less important ones not to give resource requests too." The point
// of the split above is that the choosing is only ever over a set this module can NAME.

import { readFileSync } from "node:fs";

export interface RenderedApp {
  readonly appId: string;
  readonly cpuMillis: number;
  readonly memoryMib: number;
  readonly pods?: number;
  readonly workloads?: readonly { readonly workload: string; readonly replicas?: number }[];
}

export type Verdict = "ACTIONABLE" | "NO-WORKLOAD" | "IN-REPO";

export interface Row {
  readonly appId: string;
  readonly verdict: Verdict;
  readonly workloads: number;
  readonly pods: number;
  /** Values coordinates the chart accepts, `ACTIONABLE` only. */
  readonly coordinates: readonly string[];
  readonly note?: string;
}

/** Flatten the schema's nested `literal` tree into dotted paths. */
export function flattenLiteral(tree: unknown, prefix = ""): readonly string[] {
  if (tree === null || typeof tree !== "object") return [];
  const out: string[] = [];
  for (const [k, v] of Object.entries(tree as Record<string, unknown>)) {
    const path = `${prefix}${k}`;
    out.push(path);
    out.push(...flattenLiteral(v, `${path}.`));
  }
  return out;
}

/** Values keys that set a container's resources. */
export function resourceCoordinates(schema: unknown): readonly string[] {
  if (schema === null || typeof schema !== "object") return [];
  const s = schema as { open?: unknown; literal?: unknown };
  const open = Array.isArray(s.open) ? s.open.filter((x): x is string => typeof x === "string") : [];
  const all = new Set<string>([...open, ...flattenLiteral(s.literal)]);
  return [...all].filter((k) => /(^|\.)resources$/.test(k)).sort();
}

export function classify(
  rendered: readonly RenderedApp[],
  entries: readonly { appId: string; chartKey?: string; unavailable?: { reason?: string } }[],
  charts: Record<string, unknown>,
): readonly Row[] {
  const byApp = new Map(entries.map((e) => [e.appId, e]));
  const rows: Row[] = [];
  for (const app of rendered) {
    // Requests SOMETHING: not this module's business, whether or not the number is right.
    if (app.cpuMillis > 0 || app.memoryMib > 0) continue;

    const workloads = app.workloads?.length ?? 0;
    const pods = app.pods ?? 0;
    if (workloads === 0) {
      rows.push({
        appId: app.appId,
        verdict: "NO-WORKLOAD",
        workloads,
        pods,
        coordinates: [],
        note: "renders no pod template — there is nothing to attach a request to",
      });
      continue;
    }

    const entry = byApp.get(app.appId);
    const chartKey = entry?.chartKey;
    if (chartKey === undefined || !(chartKey in charts)) {
      rows.push({
        appId: app.appId,
        verdict: "IN-REPO",
        workloads,
        pods,
        coordinates: [],
        note:
          entry?.unavailable?.reason === "no-chart-yaml"
            ? "git-path Application: the manifests are ours, so the request goes in the YAML directly"
            : `no chart schema (${entry?.unavailable?.reason ?? "no entry"})`,
      });
      continue;
    }

    const coordinates = resourceCoordinates(charts[chartKey]);
    if (coordinates.length === 0) {
      rows.push({
        appId: app.appId,
        verdict: "IN-REPO",
        workloads,
        pods,
        coordinates: [],
        note: "chart declares no `resources` key — a request needs a different mechanism (a patch, or an upstream PR)",
      });
      continue;
    }
    rows.push({ appId: app.appId, verdict: "ACTIONABLE", workloads, pods, coordinates });
  }
  return rows.sort((a, b) => b.workloads - a.workloads || (a.appId < b.appId ? -1 : 1));
}

function main(): number {
  const snap = JSON.parse(
    readFileSync("src/Core.TypeScript/cluster/rendered-resource-requests.snapshot.json", "utf8"),
  ) as { profiles: { profile: string; apps: RenderedApp[] }[] };
  const schema = JSON.parse(
    readFileSync("src/Core.TypeScript/cluster/inert-valuesobject-keys.schema.json", "utf8"),
  ) as {
    entries: { appId: string; chartKey?: string; unavailable?: { reason?: string } }[];
    charts: Record<string, unknown>;
  };

  const dev = snap.profiles.find((p) => p.profile === "dev");
  if (dev === undefined || dev.apps.length === 0) {
    // ZERO APPS IS AN ALARM. A renamed profile or a truncated snapshot would otherwise
    // report "nothing missing a request", which is the most flattering possible reading of
    // a broken input.
    console.log(
      "::error::[missing-resource-requests] the dev profile is absent or empty in the render snapshot — the input is broken, not clean",
    );
    return 1;
  }

  const rows = classify(dev.apps, schema.entries, schema.charts);
  const by = (v: Verdict) => rows.filter((r) => r.verdict === v);

  console.log(
    `[missing-resource-requests] ${String(dev.apps.length)} Applications rendered; ${String(rows.length)} request nothing\n`,
  );
  for (const v of ["ACTIONABLE", "IN-REPO", "NO-WORKLOAD"] as const) {
    const group = by(v);
    console.log(`── ${v} (${String(group.length)}) ──`);
    for (const r of group) {
      const detail = r.verdict === "ACTIONABLE" ? r.coordinates.slice(0, 4).join(", ") : (r.note ?? "");
      console.log(
        `  ${r.appId.padEnd(38)} workloads=${String(r.workloads).padStart(2)} pods=${String(r.pods).padStart(2)}  ${detail}`,
      );
    }
    console.log("");
  }
  console.log(
    `[missing-resource-requests] ${String(by("ACTIONABLE").length)} have a coordinate and no excuse; ` +
      `${String(by("IN-REPO").length)} need an in-repo edit; ${String(by("NO-WORKLOAD").length)} render no pod.`,
  );
  // REPORTS, NEVER GATES. Every row here is a standing condition today, so failing would
  // paint a red X that is correct on day one and ignored by day three. The ratchet that
  // makes it shrink belongs on `ungovernedRequests`, where the high-water mark lives.
  return 0;
}

if (import.meta.main) {
  process.exit(main());
}
