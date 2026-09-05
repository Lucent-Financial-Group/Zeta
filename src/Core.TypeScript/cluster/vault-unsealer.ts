#!/usr/bin/env bun
/**
 * src/Core.TypeScript/cluster/vault-unsealer.ts
 *
 * THE POST-INIT HALF of the metal Vault ceremony -- the decision loop that
 * may unseal and may never init. Sibling of `ephemeral-vault-init.ts`, which
 * is the disposable-cluster path that mints material and throws it away.
 * This module is the going-for unsealer for a cluster that already exists:
 * a human has inited, saved Shamir shares into Lucent, and proved them once.
 *
 * Nothing here talks to Helm. The extraContainer + TOPOLOGY.md §5 recast
 * land in the same later commit as the sidecar. This file is the payload
 * that commit will call: classify health, fetch shares THIS tick, apply
 * threshold-many distinct keys, drop them.
 *
 * Health is HTTP-shaped, matching the Google-review reject table:
 *
 *   200  -- unsealed. Sleep. Do not fetch.
 *   503  -- sealed. Fetch shares this tick, PUT threshold-many.
 *   501 / initialized=false -- not inited. Refuse forever. Do not init.
 *   000 (status 0) -- unreachable. A miss, not a seal. Do not fetch.
 *
 * Fetch-at-unseal is the IInput that Google's `KEY1=$(cat)`-once missed:
 * file updates never reach a process that cached the first read. The
 * ShareFetcher port is called on every sealed tick, injected so tests do
 * not touch 1Password and production can bind Lucent later.
 *
 * Shares live in local bindings for the duration of one tick. This module
 * never writes them to disk, env, etcd, or the report. `scanForKeyMaterial`
 * runs WITH THE MATERIAL STILL IN HAND, same discipline as ephemeral init.
 *
 * Not HashiCorp auto-unseal (KMS wrap of the root key). Shamir unseal loop.
 */

import { scanForKeyMaterial, type LeakScan } from "./ephemeral-vault-init.ts";

/** Listener the sidecar will talk to. tlsDisable: true on the chart. */
export const VAULT_LOCAL = "http://127.0.0.1:8200";
export const VAULT_HEALTH_PATH = "/v1/sys/health";
export const VAULT_UNSEAL_PATH = "/v1/sys/unseal";

/**
 * Shamir threshold the unsealer applies. Must be >= 2. Threshold 1 is the
 * Google-sketch reject (S=4 coercion: one key is every key).
 */
export const UNSEAL_THRESHOLD = 3;

export const HEALTH_UNSEALED = 200;
export const HEALTH_SEALED = 503;
export const HEALTH_NOT_INITIALIZED = 501;
/** curl's "000" -- connect failed / timed out. A miss, not a seal. */
export const HEALTH_UNREACHABLE = 0;

export type HealthClass = "unsealed" | "sealed" | "not-initialized" | "unreachable";

export interface HealthResponse {
  /** HTTP status, or 0 when the listener was not reached. */
  readonly status: number;
  readonly initialized?: boolean;
  readonly sealed?: boolean;
}

export interface UnsealResponse {
  readonly status: number;
  readonly sealed: boolean;
}

/**
 * The ONLY HTTP surface this loop is allowed. There is no init method.
 * A client that can init is a client this module must not be handed; the
 * type is the gate.
 */
export interface UnsealHttp {
  health(): Promise<HealthResponse>;
  putUnseal(key: string): Promise<UnsealResponse>;
}

/**
 * Fetch shares at the moment of the sealed tick, then drop them. Called
 * every sealed tick -- never cached across ticks by this module.
 */
export interface ShareFetcher {
  fetchSharesThisTick(): Promise<readonly string[]>;
}

export type UnsealerDecision =
  | { readonly kind: "sleep"; readonly reason: "unsealed" }
  | { readonly kind: "miss"; readonly reason: "unreachable" }
  | { readonly kind: "refuse-init"; readonly reason: "not-initialized" }
  | { readonly kind: "fetch-and-unseal"; readonly reason: "sealed" };

export type UnsealerTickOutcome =
  | {
      readonly ok: true;
      readonly decision: UnsealerDecision;
      readonly unsealOperations: number;
      readonly sealedAfter: boolean | null;
      readonly leakScan: LeakScan | null;
    }
  | {
      readonly ok: false;
      readonly decision: UnsealerDecision;
      readonly error: string;
      readonly unsealOperations: number;
      readonly leakScan: LeakScan | null;
    };

export interface UnsealerTickDeps {
  readonly http: UnsealHttp;
  readonly fetcher: ShareFetcher;
  readonly threshold?: number;
  readonly fileRoots?: readonly string[];
  readonly transcript?: string;
  readonly reportJson?: string;
  readonly podLogs?: string;
  readonly log?: (line: string) => void;
}

/**
 * Classify Vault health. Order is load-bearing:
 *
 *   1. status 0 is a miss even if a stale body says sealed.
 *   2. not-initialized wins over sealed -- a 501 must never look like a 503.
 *   3. 200 sleeps; 503 fetches; anything else is a miss, not a seal.
 */
export function classifyHealth(health: HealthResponse): HealthClass {
  if (health.status === HEALTH_UNREACHABLE) return "unreachable";
  if (health.status === HEALTH_NOT_INITIALIZED || health.initialized === false) {
    return "not-initialized";
  }
  if (health.status === HEALTH_UNSEALED && health.sealed !== true) return "unsealed";
  if (health.status === HEALTH_SEALED || health.sealed === true) return "sealed";
  return "unreachable";
}

export function decideUnsealerTick(health: HealthResponse): UnsealerDecision {
  const klass = classifyHealth(health);
  switch (klass) {
    case "unsealed":
      return { kind: "sleep", reason: "unsealed" };
    case "unreachable":
      return { kind: "miss", reason: "unreachable" };
    case "not-initialized":
      return { kind: "refuse-init", reason: "not-initialized" };
    case "sealed":
      return { kind: "fetch-and-unseal", reason: "sealed" };
  }
}

export interface ShareValidation {
  readonly ok: boolean;
  readonly keys: readonly string[];
  readonly error?: string;
}

/**
 * Take threshold-many DISTINCT shares. Duplicate keys do not count.
 * Threshold < 2 is refused even if the caller passed one excellent key.
 */
export function validateShares(shares: readonly string[], threshold: number = UNSEAL_THRESHOLD): ShareValidation {
  if (!Number.isInteger(threshold) || threshold < 2) {
    return {
      ok: false,
      keys: [],
      error: `refused: Shamir threshold must be >= 2 (got ${String(threshold)}); threshold 1 is coercion`,
    };
  }
  const seen = new Set<string>();
  const keys: string[] = [];
  for (const share of shares) {
    if (typeof share !== "string") continue;
    const trimmed = share.trim();
    if (trimmed.length === 0) continue;
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    keys.push(trimmed);
    if (keys.length >= threshold) break;
  }
  if (keys.length < threshold) {
    return {
      ok: false,
      keys: [],
      error: `refused: need ${String(threshold)} distinct unseal shares this tick, got ${String(seen.size)}`,
    };
  }
  return { ok: true, keys };
}

function redactLog(log: ((line: string) => void) | undefined, needles: readonly string[]): (line: string) => void {
  return (line: string) => {
    if (log === undefined) return;
    let out = line;
    for (const needle of needles) {
      if (needle.length > 0 && out.includes(needle)) {
        out = "[REDACTED-VAULT-KEY-MATERIAL]";
        break;
      }
    }
    log(out);
  };
}

/**
 * One tick of the Shamir unseal loop. Fetch happens only on the sealed
 * branch, and happens every time that branch is taken.
 */
export async function runUnsealerTick(deps: UnsealerTickDeps): Promise<UnsealerTickOutcome> {
  const threshold = deps.threshold ?? UNSEAL_THRESHOLD;
  const health = await deps.http.health();
  const decision = decideUnsealerTick(health);

  if (decision.kind !== "fetch-and-unseal") {
    return {
      ok: true,
      decision,
      unsealOperations: 0,
      sealedAfter: health.sealed ?? (decision.reason === "unsealed" ? false : null),
      leakScan: null,
    };
  }

  const shares = await deps.fetcher.fetchSharesThisTick();
  const validated = validateShares(shares, threshold);
  if (!validated.ok) {
    return {
      ok: false,
      decision,
      error: validated.error ?? "refused: share validation failed",
      unsealOperations: 0,
      leakScan: null,
    };
  }

  const log = redactLog(deps.log, validated.keys);
  log?.(`unsealer: applying ${String(validated.keys.length)} distinct shares this tick`);

  let unsealOperations = 0;
  let sealedAfter = true;
  for (const key of validated.keys) {
    const response = await deps.http.putUnseal(key);
    unsealOperations += 1;
    sealedAfter = response.sealed;
    if (!response.sealed) break;
  }

  const leakScan = scanForKeyMaterial(validated.keys, {
    fileRoots: deps.fileRoots ?? [],
    transcript: deps.transcript ?? "unsealer tick transcript",
    reportJson: deps.reportJson ?? "{}",
    podLogs: deps.podLogs ?? "",
  });

  if (leakScan.leaked.length > 0) {
    return {
      ok: false,
      decision,
      error: "refused: unseal share material leaked into a reachable surface",
      unsealOperations,
      leakScan,
    };
  }

  return {
    ok: true,
    decision,
    unsealOperations,
    sealedAfter,
    leakScan,
  };
}
