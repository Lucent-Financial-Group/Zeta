// llmtv-live-readout -- cadence sink from live replay bridge to artifact/page.
//
// The mesh runner owns sockets. The bridge owns capture. This module owns the readout tick:
// drain the captured wires, write the replay artifact, and render the zero-JS LLMTV page.

import { renderLlmtvDocument, type RenderDocumentOptions } from "../darkhall-ui/darkhall-tv";
import type { LlmtvLiveReplayBridge } from "./llmtv-live-replay-bridge";
import { encodeReplayArtifact, foldReplayArtifact, type ReplayStats } from "./llmtv-replay";
import type { Scheduler } from "./llmtv-node";

export interface LlmtvLiveReadoutIo {
  readonly writeText: (path: string, text: string) => void;
}

export interface LlmtvLiveReadoutOptions {
  readonly seed: string;
  readonly readoutEveryMs: number;
  readonly replayPath: string;
  readonly htmlPath: string;
  readonly generatedBy?: string;
  readonly title?: string;
  readonly expireTtlMs?: number;
  readonly skipEmpty?: boolean;
}

export interface LlmtvLiveReadoutSummary {
  readonly atMs: number;
  readonly replayPath: string;
  readonly htmlPath: string;
  readonly frames: number;
  readonly dwellers: number;
  readonly stats: ReplayStats;
}

export type LlmtvLiveReadoutFlushResult =
  | { readonly ok: true; readonly skipped: false; readonly summary: LlmtvLiveReadoutSummary }
  | { readonly ok: true; readonly skipped: true; readonly reason: "empty" }
  | { readonly ok: false; readonly reason: "write-failed"; readonly error: string };

export interface LlmtvLiveReadout {
  start(): void;
  stop(): void;
  flushNow(): LlmtvLiveReadoutFlushResult;
  lastSummary(): LlmtvLiveReadoutSummary | undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function renderOptions(options: LlmtvLiveReadoutOptions): RenderDocumentOptions {
  return options.title === undefined ? {} : { title: options.title };
}

function generatedBy(options: LlmtvLiveReadoutOptions): string {
  return options.generatedBy ?? "llmtv-live-readout";
}

function shouldSkipEmpty(options: LlmtvLiveReadoutOptions): boolean {
  return options.skipEmpty ?? true;
}

export function createLlmtvLiveReadout(
  bridge: LlmtvLiveReplayBridge,
  scheduler: Scheduler,
  io: LlmtvLiveReadoutIo,
  options: LlmtvLiveReadoutOptions,
): LlmtvLiveReadout {
  let cancel: (() => void) | undefined;
  let last: LlmtvLiveReadoutSummary | undefined;

  const flushNow = (): LlmtvLiveReadoutFlushResult => {
    const atMs = scheduler.now();
    const expire = options.expireTtlMs === undefined ? undefined : { nowMs: atMs, ttlMs: options.expireTtlMs };
    const artifact = bridge.drain({ seed: options.seed, generatedBy: generatedBy(options), expire });

    if (artifact.frames.length === 0 && shouldSkipEmpty(options)) {
      return { ok: true, skipped: true, reason: "empty" };
    }

    const replay = foldReplayArtifact(artifact);
    const html = renderLlmtvDocument(replay.transcript, renderOptions(options));

    try {
      io.writeText(options.replayPath, encodeReplayArtifact(artifact));
      io.writeText(options.htmlPath, `${html}\n`);
    } catch (error) {
      return { ok: false, reason: "write-failed", error: errorMessage(error) };
    }

    last = {
      atMs,
      replayPath: options.replayPath,
      htmlPath: options.htmlPath,
      frames: artifact.frames.length,
      dwellers: replay.transcript.dwellers.length,
      stats: replay.stats,
    };
    return { ok: true, skipped: false, summary: last };
  };

  return {
    start() {
      if (cancel === undefined) {
        cancel = scheduler.setInterval(options.readoutEveryMs, () => {
          flushNow();
        });
      }
    },
    stop() {
      cancel?.();
      cancel = undefined;
    },
    flushNow,
    lastSummary: () => last,
  };
}
