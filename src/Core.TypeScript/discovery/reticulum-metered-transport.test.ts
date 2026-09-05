import { describe, expect, it } from "bun:test";
import {
  calculateShannonEntropy,
  ReticulumMeteredPeer,
  ReticulumMeshMeteredNetwork,
  type TransportSample,
} from "./reticulum-metered-transport.ts";

function receipt(samples: readonly TransportSample[]) {
  return samples.map((sample) => ({
    frameId: sample.frameId,
    srcDest: sample.srcDest,
    dstDest: sample.dstDest,
    sendTimeNs: sample.sendTimeNs.toString(),
    receiveTimeNs: sample.receiveTimeNs.toString(),
    latencyNs: sample.latencyNs.toString(),
    payloadBytes: sample.payloadBytes,
  }));
}

function configuredMesh(seed: number): ReticulumMeshMeteredNetwork {
  const mesh = new ReticulumMeshMeteredNetwork({
    seed,
    startTimeNs: 500_000_000n,
    interBroadcastNs: 25_000_000n,
  });
  mesh.addPeer("node-p1");
  mesh.addPeer("node-p2");
  mesh.addPeer("node-p3");
  return mesh;
}

describe("Reticulum metered transport: caller observations and deterministic simulation", () => {
  it("calculates finite Shannon entropy over discrete histogram distributions", () => {
    expect(calculateShannonEntropy([1, 2, 3, 4, 5, 6, 7, 8], 8)).toBeGreaterThan(2.5);
    expect(calculateShannonEntropy([5, 5, 5, 5, 5])).toBe(0);
    expect(() => calculateShannonEntropy([1, 2], 0)).toThrow("positive integer");
  });

  it("retains caller-supplied arrival observations without claiming their clock origin", () => {
    const peer = new ReticulumMeteredPeer("node-alpha-zeta-01");
    const sample = peer.recordFrameArrival("frame-001", "src-hash-123", 10n, 5_000_010n, 256);
    expect(peer.sampleCount).toBe(1);
    expect(sample.latencyNs).toBe(5_000_000n);
    expect(sample.payloadBytes).toBe(256);
  });

  it("returns descriptive histogram metrics with the contracted non-physical name", () => {
    const peer = new ReticulumMeteredPeer("node-beta-zeta-02");
    let time = 0n;
    for (let index = 0; index < 50; index++) {
      const latencyNs = BigInt(2_000_000 + (index % 5) * 500_000);
      peer.recordFrameArrival(`frame-${index}`, "src-hash-456", time, time + latencyNs, 128 + (index % 16));
      time += 10_000_000n + BigInt((index % 7) * 1_000_000);
    }

    const metrics = peer.computeEntropyMetrics();
    expect(metrics.totalPacketsMeasured).toBe(50);
    expect(metrics.meanLatencyMs).toBeGreaterThan(1.5);
    expect(metrics.meanLatencyMs).toBeLessThan(5.0);
    expect(metrics.jitterMs).toBeGreaterThan(0);
    expect(metrics.interArrivalEntropyBits).toBeGreaterThan(0);
    expect(metrics.byteEntropyBits).toBeGreaterThan(0);
    expect(metrics.interArrivalUniformityGapBits).toBeGreaterThanOrEqual(0);
    expect("maxwellDemonInformationGainBits" in metrics).toBe(false);
  });

  it("replays an equal finite simulator call sequence exactly from an equal declared seed and logical clock", () => {
    const left = configuredMesh(0x10203040);
    const right = configuredMesh(0x10203040);
    const leftReceipt = [
      ...left.broadcastFrame("node-p1", "frame-1", 512, 3.0, 0.8),
      ...left.broadcastFrame("node-p1", "frame-2", 513, 3.0, 0.8),
      ...left.broadcastFrame("node-p1", "frame-3", 514, 3.0, 0.8),
    ];
    const rightReceipt = [
      ...right.broadcastFrame("node-p1", "frame-1", 512, 3.0, 0.8),
      ...right.broadcastFrame("node-p1", "frame-2", 513, 3.0, 0.8),
      ...right.broadcastFrame("node-p1", "frame-3", 514, 3.0, 0.8),
    ];

    expect(receipt(leftReceipt)).toEqual(receipt(rightReceipt));
  });

  it("changes a finite synthetic-latency receipt when the declared seed changes", () => {
    const first = configuredMesh(1).broadcastFrame("node-p1", "frame", 512, 3.0, 0.8);
    const second = configuredMesh(2).broadcastFrame("node-p1", "frame", 512, 3.0, 0.8);
    expect(receipt(first)).not.toEqual(receipt(second));
  });

  it("advances simulation timestamps only by the declared logical interval", () => {
    const mesh = new ReticulumMeshMeteredNetwork({ seed: 1, startTimeNs: 41n, interBroadcastNs: 17n });
    mesh.addPeer("node-p1");
    mesh.addPeer("node-p2");
    const first = mesh.broadcastFrame("node-p1", "frame-1", 1, 1.0, 0);
    const second = mesh.broadcastFrame("node-p1", "frame-2", 1, 1.0, 0);

    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
    expect(first[0]!.sendTimeNs).toBe(41n);
    expect(second[0]!.sendTimeNs).toBe(58n);
  });

  it("refuses invalid simulation configuration before producing an observation", () => {
    expect(() => new ReticulumMeshMeteredNetwork({ seed: -1 })).toThrow("unsigned 32-bit");
    expect(() => new ReticulumMeshMeteredNetwork({ seed: 1.5 })).toThrow("unsigned 32-bit");
    expect(() => new ReticulumMeshMeteredNetwork({ interBroadcastNs: -1n })).toThrow("non-negative");
  });
});
