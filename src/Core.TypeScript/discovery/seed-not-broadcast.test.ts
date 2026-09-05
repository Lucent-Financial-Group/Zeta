import { describe, it, expect } from "bun:test";
import { destinationHash } from "./reticulum-transport";
import { allNodes, emptyTable, expireNodes, observeNode, type DhtNode, type RoutingTable } from "./dht-discovery";
import {
  GATE_GOSSIP_K,
  GATE_GOSSIP_K_MAX,
  ONION_MIN_HOPS,
  classifyFanout,
  classifyGate,
  classifyLocator,
  classifyOnionCircuit,
  isCathedralLocator,
  isSeedLocator,
  pinAgainstTtl,
} from "./seed-not-broadcast";

const SELF = destinationHash("dht-self");
const node = (zid: string, t = 0): DhtNode => ({ dest: destinationHash(zid), zid, lastSeenMs: t });

describe("classifyLocator — who, not where", () => {
  it("accepts a destination hash as content-hash", () => {
    expect(classifyLocator(destinationHash("genesis-block"))).toBe("content-hash");
    expect(isSeedLocator("content-hash")).toBe(true);
  });
  it("accepts magnet and CID shapes as content-hash", () => {
    expect(classifyLocator("magnet:?xt=urn:btih:0123456789abcdef0123456789abcdef01234567")).toBe("content-hash");
    expect(classifyLocator("QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG")).toBe("content-hash");
    expect(classifyLocator("bafybeigdyrzt5sfp7udw7d4bhchsq7ioqb4r56k75vprw6m7a7q7q7q7q7")).toBe("content-hash");
  });
  it("accepts a 26-char Crockford ZetaId", () => {
    expect(classifyLocator("081M1PYZRE5087G0R000HHG5HV")).toBe("zeta-id");
    expect(isSeedLocator("zeta-id")).toBe(true);
  });
  it("names onion / .zeta as cloak shape, not a place", () => {
    expect(classifyLocator("xyz.onion")).toBe("onion-shape");
    expect(classifyLocator("gate.zeta")).toBe("onion-shape");
    expect(isSeedLocator("onion-shape")).toBe(true);
    expect(isCathedralLocator("onion-shape")).toBe(false);
  });
  it("classifies DNS and IP as cathedral locators", () => {
    expect(classifyLocator("example.com")).toBe("dns-host");
    expect(classifyLocator("localhost")).toBe("dns-host");
    expect(classifyLocator("203.0.113.10")).toBe("ip");
    expect(classifyLocator("2001:db8::1")).toBe("ip");
    expect(isCathedralLocator("dns-host")).toBe(true);
    expect(isCathedralLocator("ip")).toBe(true);
    expect(isSeedLocator("dns-host")).toBe(false);
  });
  it("does not promote junk", () => {
    expect(classifyLocator("")).toBe("unknown");
    expect(classifyLocator("   ")).toBe("unknown");
    expect(classifyLocator("not a locator")).toBe("unknown");
  });
});

describe("classifyFanout — frequency, not amplitude", () => {
  it("accepts gossip-k at Kademlia α and up to the bound", () => {
    expect(classifyFanout({ kind: "gossip-k", k: GATE_GOSSIP_K, peerCount: 100 })).toEqual({
      ok: true,
      class: "gossip-over-time",
    });
    expect(classifyFanout({ kind: "gossip-k", k: GATE_GOSSIP_K_MAX, peerCount: 100 })).toEqual({
      ok: true,
      class: "gossip-over-time",
    });
  });
  it("accepts salon anti-entropy on a positive timer", () => {
    expect(classifyFanout({ kind: "anti-entropy-timer", intervalMs: 5_000 })).toEqual({
      ok: true,
      class: "gossip-over-time",
    });
  });
  it("refuses one-tick all-nodes even when N is small", () => {
    expect(classifyFanout({ kind: "broadcast-all-in-one-tick", peerCount: 2 })).toEqual({
      ok: false,
      reason: "high-amplitude-broadcast",
    });
  });
  it("refuses k outside the bound and a zero timer", () => {
    expect(classifyFanout({ kind: "gossip-k", k: 0, peerCount: 10 }).ok).toBe(false);
    expect(classifyFanout({ kind: "gossip-k", k: GATE_GOSSIP_K_MAX + 1, peerCount: 100 })).toEqual({
      ok: false,
      reason: "k-out-of-range",
    });
    expect(classifyFanout({ kind: "anti-entropy-timer", intervalMs: 0 })).toEqual({
      ok: false,
      reason: "high-amplitude-broadcast",
    });
  });
});

describe("classifyGate — seed vs cathedral", () => {
  const gossip = classifyFanout({ kind: "gossip-k", k: GATE_GOSSIP_K, peerCount: 64 });
  const spike = classifyFanout({ kind: "broadcast-all-in-one-tick", peerCount: 64 });

  it("opens the gate on content-hash + gossip-k", () => {
    expect(classifyGate("content-hash", gossip)).toEqual({ ok: true, gate: "seed" });
    expect(classifyGate("zeta-id", gossip)).toEqual({ ok: true, gate: "seed" });
    expect(classifyGate("onion-shape", gossip)).toEqual({ ok: true, gate: "seed" });
  });
  it("refuses DNS/IP even with a perfect gossip-k — the join path is not a place", () => {
    expect(classifyGate("dns-host", gossip)).toEqual({ ok: false, reason: "cathedral-locator" });
    expect(classifyGate("ip", gossip)).toEqual({ ok: false, reason: "cathedral-locator" });
  });
  it("refuses a seed locator that fans out as a one-tick broadcast", () => {
    expect(classifyGate("content-hash", spike)).toEqual({ ok: false, reason: "high-amplitude-broadcast" });
  });
  it("does not silently promote an unknown locator", () => {
    expect(classifyGate("unknown", gossip)).toEqual({ ok: false, reason: "unknown-locator" });
  });
});

describe("pinAgainstTtl — heartbeat refresh vs expireNodes fade", () => {
  it("keeps a dest that would otherwise TTL-out", () => {
    let t: RoutingTable = emptyTable(SELF, 20);
    t = observeNode(t, node("pin-peer", 1000), 1000);
    const dest = destinationHash("pin-peer");
    expect(allNodes(expireNodes(t, 3000, 1000))).toHaveLength(0);

    const pinned = pinAgainstTtl(t, dest, 2500);
    expect(allNodes(pinned).find((n) => n.dest === dest)?.lastSeenMs).toBe(2500);
    expect(allNodes(expireNodes(pinned, 3000, 1000))).toHaveLength(1);
  });
  it("returns the same table when dest is not in the buckets", () => {
    const t = emptyTable(SELF, 20);
    expect(pinAgainstTtl(t, destinationHash("nobody"), 1)).toBe(t);
  });
});

describe("classifyOnionCircuit — shape only, no wire", () => {
  it("accepts three-or-more hops as shape", () => {
    expect(classifyOnionCircuit(["a", "b", "c"])).toEqual({
      ok: true,
      class: "accepted-shape",
      hops: ONION_MIN_HOPS,
    });
    expect(classifyOnionCircuit(["a", "b", "c", "d"]).ok).toBe(true);
  });
  it("refuses a short circuit and never returns a sendable circuit", () => {
    expect(classifyOnionCircuit(["a", "b"])).toEqual({ ok: false, reason: "too-few-hops" });
    const verdict = classifyOnionCircuit(["entry", "middle", "exit"]);
    expect(verdict).not.toHaveProperty("circuit");
    expect(verdict).not.toHaveProperty("encode");
  });
});
