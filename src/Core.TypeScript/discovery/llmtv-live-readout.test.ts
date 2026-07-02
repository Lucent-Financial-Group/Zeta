import { describe, expect, it } from "bun:test";
import { decodeReplayArtifact } from "./llmtv-replay";
import { createLlmtvLiveReplayBridge } from "./llmtv-live-replay-bridge";
import { createLlmtvLiveReadout, type LlmtvLiveReadoutIo } from "./llmtv-live-readout";
import type { DiscoveryTransport } from "./discovery-beacon";
import type { BroadcastTransport, SourceMind } from "./llmtv-broadcast";
import type { LlmtvNodeConfig, Scheduler } from "./llmtv-node";

interface FakeMesh {
  attach(id: string): DiscoveryTransport & BroadcastTransport;
  scheduler(): Scheduler;
  advance(ms: number): void;
}

function createFakeMesh(): FakeMesh {
  const nodes: Array<{ id: string; handlers: Array<(text: string, from: string) => void> }> = [];
  let clock = 0;
  let nextId = 0;
  const intervals: Array<{ ms: number; fn: () => void; last: number; id: number }> = [];

  return {
    attach(id) {
      const self = { id, handlers: [] as Array<(text: string, from: string) => void> };
      nodes.push(self);
      const send = (text: string): void => {
        for (const node of nodes) {
          if (node.id !== id) {
            for (const handler of node.handlers) handler(text, id);
          }
        }
      };
      return {
        broadcast: send,
        publish: send,
        onMessage: (handler) => self.handlers.push(handler),
        onFrame: (handler) => self.handlers.push(handler),
      };
    },
    scheduler() {
      return {
        now: () => clock,
        setInterval: (ms, fn) => {
          const id = ++nextId;
          intervals.push({ ms, fn, last: clock, id });
          return () => {
            const index = intervals.findIndex((interval) => interval.id === id);
            if (index >= 0) intervals.splice(index, 1);
          };
        },
      };
    },
    advance(ms) {
      const target = clock + ms;
      let guard = 0;
      for (;;) {
        let next = Infinity;
        for (const interval of intervals) {
          const at = interval.last + interval.ms;
          if (at <= target && at < next) next = at;
        }
        if (next === Infinity) break;
        clock = next;
        const firing = intervals.filter((interval) => interval.last + interval.ms === next);
        for (const interval of firing) interval.last = next;
        for (const interval of firing) interval.fn();
        if (++guard > 100_000) throw new Error("interval storm");
      }
      clock = target;
    },
  };
}

function memoryIo(): { readonly io: LlmtvLiveReadoutIo; readonly writes: Map<string, string> } {
  const writes = new Map<string, string>();
  return {
    writes,
    io: {
      writeText: (path, text) => writes.set(path, text),
    },
  };
}

function throwingIo(message: string): LlmtvLiveReadoutIo {
  return {
    writeText: () => {
      throw new Error(message);
    },
  };
}

function mind(label: string): () => SourceMind {
  return () => ({
    role: "prediction",
    hat: `${label} hat`,
    required: [{ label, temp: "hot", valueMilli: 800, epsilonMilli: 100 }],
  });
}

function config(name: string): LlmtvNodeConfig {
  return {
    self: { persona: name, surface: "llmtv", instance: "0", node: "test" },
    zid: `zid-${name}`,
    routes: [{ kind: "udp", addr: `239.0.0.1:4200#${name}` }],
    source: { zid: `zid-${name}`, name },
    mind: mind(name),
    ttlMs: 10_000,
    helloEveryMs: 1_000,
    publishEveryMs: 1_000,
  };
}

describe("LLMTV live readout cadence", () => {
  it("drains the bridge on cadence and writes replay JSON plus zero-JS HTML", () => {
    const mesh = createFakeMesh();
    const scheduler = mesh.scheduler();
    const alexaPort = mesh.attach("alexa");
    const sorayaPort = mesh.attach("soraya");
    const alexa = createLlmtvLiveReplayBridge(config("alexa"), alexaPort, alexaPort, scheduler);
    const soraya = createLlmtvLiveReplayBridge(config("soraya"), sorayaPort, sorayaPort, scheduler);
    const { io, writes } = memoryIo();
    const readout = createLlmtvLiveReadout(alexa, scheduler, io, {
      seed: "S4",
      readoutEveryMs: 1_000,
      replayPath: "/tmp/live.replay.json",
      htmlPath: "/tmp/live.html",
      title: "Live LLMTV",
    });

    alexa.node.start();
    soraya.node.start();
    readout.start();
    mesh.advance(1_500);

    const replayText = writes.get("/tmp/live.replay.json");
    const html = writes.get("/tmp/live.html");
    expect(replayText).toBeString();
    expect(html).toContain("<title>Live LLMTV</title>");
    expect(html).toContain('data-dweller="alexa"');
    expect(html).toContain('data-dweller="soraya"');
    expect(decodeReplayArtifact(replayText!)).not.toBeNull();
    expect(readout.lastSummary()).toMatchObject({
      replayPath: "/tmp/live.replay.json",
      htmlPath: "/tmp/live.html",
      dwellers: 2,
    });
  });

  it("skips empty ticks by default so the last rendered page is not erased", () => {
    const mesh = createFakeMesh();
    const scheduler = mesh.scheduler();
    const alexaPort = mesh.attach("alexa");
    const bridge = createLlmtvLiveReplayBridge(config("alexa"), alexaPort, alexaPort, scheduler);
    const { io, writes } = memoryIo();
    const readout = createLlmtvLiveReadout(bridge, scheduler, io, {
      seed: "S4",
      readoutEveryMs: 1_000,
      replayPath: "/tmp/live.replay.json",
      htmlPath: "/tmp/live.html",
    });

    const result = readout.flushNow();

    expect(result).toEqual({ ok: true, skipped: true, reason: "empty" });
    expect(writes.size).toBe(0);
  });

  it("returns a typed write failure instead of throwing through the scheduler", () => {
    const mesh = createFakeMesh();
    const scheduler = mesh.scheduler();
    const alexaPort = mesh.attach("alexa");
    const bridge = createLlmtvLiveReplayBridge(config("alexa"), alexaPort, alexaPort, scheduler);
    const readout = createLlmtvLiveReadout(bridge, scheduler, throwingIo("disk full"), {
      seed: "S4",
      readoutEveryMs: 1_000,
      replayPath: "/tmp/live.replay.json",
      htmlPath: "/tmp/live.html",
    });

    bridge.node.start();
    const result = readout.flushNow();

    expect(result).toEqual({ ok: false, reason: "write-failed", error: "disk full" });
  });
});
