// seed-not-broadcast — the Zeta Gate is a magnet + gossip over time, not a tweet (riven*, 2026-09-05).
//
// Aaron: DHT or Tor-like connection OVER TIME, not a broadcast that says where the
// server is hosted. The cathedral (DNS / IP / one-tick fanout to every node) is a
// valid cache or operator note. It is not the gate. The gate is content addressing
// (Kademlia dest / ZetaId / magnet fingerprint) plus bounded gossip (Kademlia α,
// salon anti-entropy on a timer).
//
// This module CLASSIFIES. It does not mint a second DHT (dht-discovery.ts is the
// DHT), does not implement onion routing (shape only), and does not replace
// llmtv-broadcast.ts (that file is the one-way society picture, noninterference
// §13 — a different job). Pin-against-TTL-fade is observeNode with a fresh nowMs,
// so expireNodes does not drop a hash that a heartbeat still cares about.
//
// Dual-use: a refusal is a measurement, not a verdict about the caller. Grey-hat
// / individual-default is research-grade in the 2026-09-05 absorb, not a coded
// permission. Pattern 1 (FF7 identity-blend) is refused at the absorb, not here.
//
// Pure, DST-replayable: nowMs injected, no socket, no clock, no onion wire.

import { isIP } from "node:net";
import { allNodes, observeNode, type RoutingTable } from "./dht-discovery";

/// Kademlia's α — the accepted gossip-k default. lookup() in dht-discovery uses 3.
export const GATE_GOSSIP_K = 3;
/// k above this is high-amplitude dressed as gossip. Not a wire constant.
export const GATE_GOSSIP_K_MAX = 8;
/// Onion *shape* — three wrapping hops. Not a Tor implementation.
export const ONION_MIN_HOPS = 3;

const ZETAID_RE = /^\d[\dA-HJKMNP-TV-Z]{25}$/;
const HEX_HASH_RE = /^[0-9a-f]{32,}$/i;
const MAGNET_RE = /^magnet:\?/i;
const CID_RE = /^(Qm[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{44}|bafy[a-z0-9]+)$/;
const HOST_RE = /^(?:localhost|(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,})$/i;
const ONION_SUFFIX_RE = /\.(onion|zeta)$/i;

export type LocatorClass = "content-hash" | "zeta-id" | "dns-host" | "ip" | "onion-shape" | "unknown";

export type FanoutPlan =
  | { readonly kind: "gossip-k"; readonly k: number; readonly peerCount: number }
  | { readonly kind: "anti-entropy-timer"; readonly intervalMs: number }
  | { readonly kind: "broadcast-all-in-one-tick"; readonly peerCount: number };

export type FanoutRefuseReason = "high-amplitude-broadcast" | "k-out-of-range";

export type FanoutClass =
  | { readonly ok: true; readonly class: "gossip-over-time" }
  | { readonly ok: false; readonly reason: FanoutRefuseReason };

export type GateVerdict =
  | { readonly ok: true; readonly gate: "seed" }
  | { readonly ok: false; readonly reason: "cathedral-locator" | "unknown-locator" | FanoutRefuseReason };

export type OnionShapeVerdict =
  | { readonly ok: true; readonly class: "accepted-shape"; readonly hops: number }
  | { readonly ok: false; readonly reason: "too-few-hops" };

/// Who, not where. ZetaId and content-hash are fingerprints. Onion-shape is the
/// cloak's *shape* (`.onion` / named `.zeta`), not a hosted hidden service.
/// DNS and IP are cathedral locators — valid as caches, not the gate.
export function classifyLocator(raw: string): LocatorClass {
  const s = raw.trim();
  if (s.length === 0) return "unknown";
  if (ZETAID_RE.test(s)) return "zeta-id";
  if (ONION_SUFFIX_RE.test(s)) return "onion-shape";
  if (isIP(s) !== 0) return "ip";
  if (MAGNET_RE.test(s) || HEX_HASH_RE.test(s) || CID_RE.test(s)) return "content-hash";
  if (HOST_RE.test(s)) return "dns-host";
  return "unknown";
}

export function isSeedLocator(cls: LocatorClass): boolean {
  return cls === "content-hash" || cls === "zeta-id" || cls === "onion-shape";
}

export function isCathedralLocator(cls: LocatorClass): boolean {
  return cls === "dns-host" || cls === "ip";
}

/// Frequency vs amplitude. The KIND is the refuse: broadcast-all-in-one-tick is
/// high-amplitude even when N is 2. gossip-k in [1, GATE_GOSSIP_K_MAX] is
/// frequency. Salon anti-entropy on a positive timer is frequency (re-gossip
/// over time, not one tick). intervalMs <= 0 collapses the timer into a spike.
export function classifyFanout(plan: FanoutPlan): FanoutClass {
  if (plan.kind === "broadcast-all-in-one-tick") {
    return { ok: false, reason: "high-amplitude-broadcast" };
  }
  if (plan.kind === "anti-entropy-timer") {
    if (!(plan.intervalMs > 0) || !Number.isFinite(plan.intervalMs)) {
      return { ok: false, reason: "high-amplitude-broadcast" };
    }
    return { ok: true, class: "gossip-over-time" };
  }
  if (!Number.isInteger(plan.k) || plan.k < 1 || plan.k > GATE_GOSSIP_K_MAX) {
    return { ok: false, reason: "k-out-of-range" };
  }
  if (!Number.isInteger(plan.peerCount) || plan.peerCount < 0) {
    return { ok: false, reason: "k-out-of-range" };
  }
  return { ok: true, class: "gossip-over-time" };
}

/// Seed = seed locator AND frequency fanout. Cathedral locator fails even with
/// a perfect gossip-k — the join path is not a place. Unknown locator is not
/// silently promoted.
export function classifyGate(locator: LocatorClass, fanout: FanoutClass): GateVerdict {
  if (isCathedralLocator(locator)) return { ok: false, reason: "cathedral-locator" };
  if (locator === "unknown") return { ok: false, reason: "unknown-locator" };
  if (!fanout.ok) return { ok: false, reason: fanout.reason };
  return { ok: true, gate: "seed" };
}

/// Heartbeat keep-alive against DHT BitRot. Refresh lastSeenMs so expireNodes
/// does not drop a dest this tick still cares about. Missing dest → same table
/// (byte-identical). observeNode still refuses unbound (dest, zid) pairs, so
/// pinning cannot launder an impostor. nowMs is INJECTED (no ambient clock).
export function pinAgainstTtl(table: RoutingTable, dest: string, nowMs: number): RoutingTable {
  const node = allNodes(table).find((n) => n.dest === dest);
  if (node === undefined) return table;
  return observeNode(table, node, nowMs);
}

/// Onion *shape*: hop count only. Returns a verdict, never a circuit a caller
/// could put on a wire. There is no onion encoder, no telescoping, no .zeta
/// directory in this module.
export function classifyOnionCircuit(hops: readonly string[]): OnionShapeVerdict {
  if (hops.length < ONION_MIN_HOPS) return { ok: false, reason: "too-few-hops" };
  return { ok: true, class: "accepted-shape", hops: hops.length };
}
