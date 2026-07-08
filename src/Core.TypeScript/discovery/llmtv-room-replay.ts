import {
  roomTranscriptToLlmtv,
  type RoomRunTranscript,
  type RoomTranscriptLlmtvOptions,
} from "../darkhall-ui/darkhall-room";
import type { DwellerMind } from "../darkhall-ui/darkhall-tv";
import { publishFrame, type BroadcastMessage, type BroadcastSource, type SourceMind } from "./llmtv-broadcast";
import { REPLAY_SCHEMA, replayFrame, type ReplayArtifact, type ReplayWireFrame } from "./llmtv-replay";

export interface RoomTranscriptReplayOptions extends RoomTranscriptLlmtvOptions {
  readonly sourceZid?: string;
  readonly sourceName?: string;
  readonly seq?: number;
  readonly frameNo?: number;
  readonly receivedAtMs?: number;
  readonly from?: string;
  readonly seed?: string;
  readonly expire?: ReplayArtifact["expire"];
}

export interface RoomTranscriptReplayEntry extends RoomTranscriptReplayOptions {
  readonly transcript: RoomRunTranscript;
}

export interface RoomTranscriptsReplayOptions {
  readonly seed?: string;
  readonly generatedBy?: string;
  readonly expire?: ReplayArtifact["expire"];
  readonly startReceivedAtMs?: number;
  readonly receivedAtStepMs?: number;
}

function finiteWhole(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.trunc(value));
}

function finiteSeq(value: number | undefined, fallback: number): number {
  return Math.max(1, finiteWhole(value, fallback));
}

function projectionOptions(options: RoomTranscriptReplayOptions): RoomTranscriptLlmtvOptions {
  return {
    ...(options.name === undefined ? {} : { name: options.name }),
    ...(options.role === undefined ? {} : { role: options.role }),
    ...(options.hat === undefined ? {} : { hat: options.hat }),
    ...(options.live === undefined ? {} : { live: options.live }),
    ...(options.generatedBy === undefined ? {} : { generatedBy: options.generatedBy }),
  };
}

function sourceForTranscript(transcript: RoomRunTranscript, options: RoomTranscriptReplayOptions): BroadcastSource {
  return {
    zid: options.sourceZid ?? `room:${transcript.roomName}:${transcript.seed}`,
    name: options.sourceName ?? options.name ?? transcript.roomName,
  };
}

function sourceMindFromDweller(dweller: DwellerMind): SourceMind {
  const base = {
    role: dweller.role,
    hat: dweller.hat,
    required: dweller.predictions,
    ...(dweller.temperatureTreaty === undefined ? {} : { temperatureTreaty: dweller.temperatureTreaty }),
  };

  if (dweller.frost === undefined) {
    return base;
  }

  return {
    ...base,
    personal: {
      frosted: true,
      veilLabel: dweller.frost.veilLabel,
      predictions: [],
    },
  };
}

function projectedDweller(transcript: RoomRunTranscript, options: RoomTranscriptReplayOptions): DwellerMind {
  const projected = roomTranscriptToLlmtv(transcript, projectionOptions(options));
  const dweller = projected.dwellers[0];
  if (dweller !== undefined) {
    return dweller;
  }

  return {
    name: options.name ?? transcript.roomName,
    role: options.role ?? "room runtime",
    hat: options.hat ?? "room readout",
    live: options.live ?? true,
    predictions: [],
  };
}

export function roomTranscriptToBroadcastMessage(
  transcript: RoomRunTranscript,
  options: RoomTranscriptReplayOptions = {},
): BroadcastMessage {
  const dweller = projectedDweller(transcript, options);
  const frameNo = finiteWhole(options.frameNo, dweller.frame ?? transcript.ticks.length);
  const seq = finiteSeq(options.seq, frameNo);

  return publishFrame(sourceForTranscript(transcript, options), seq, frameNo, sourceMindFromDweller(dweller));
}

export function roomTranscriptToReplayFrame(
  transcript: RoomRunTranscript,
  options: RoomTranscriptReplayOptions = {},
): ReplayWireFrame {
  const message = roomTranscriptToBroadcastMessage(transcript, options);
  const fallbackReceivedAtMs = message.t === "frame" ? message.frameNo : transcript.ticks.length;
  return replayFrame(message, finiteWhole(options.receivedAtMs, fallbackReceivedAtMs), options.from);
}

export function roomTranscriptToReplayArtifact(
  transcript: RoomRunTranscript,
  options: RoomTranscriptReplayOptions = {},
): ReplayArtifact {
  const base = {
    schema: REPLAY_SCHEMA,
    seed: options.seed ?? transcript.seed,
    frames: [roomTranscriptToReplayFrame(transcript, options)],
    generatedBy: options.generatedBy ?? "room-transcript -> llmtv-replay",
  } satisfies Omit<ReplayArtifact, "expire">;

  return options.expire === undefined ? base : { ...base, expire: options.expire };
}

export function roomTranscriptsToReplayArtifact(
  entries: readonly RoomTranscriptReplayEntry[],
  options: RoomTranscriptsReplayOptions = {},
): ReplayArtifact {
  const start = finiteWhole(options.startReceivedAtMs, 0);
  const step = finiteWhole(options.receivedAtStepMs, 1);
  const frames = entries.map((entry, index) => {
    const { transcript, ...entryOptions } = entry;
    return roomTranscriptToReplayFrame(transcript, {
      ...entryOptions,
      receivedAtMs: entryOptions.receivedAtMs ?? start + index * step,
    });
  });
  const first = entries[0];
  const base = {
    schema: REPLAY_SCHEMA,
    seed: options.seed ?? first?.transcript.seed ?? "room-replay",
    frames,
    generatedBy: options.generatedBy ?? "room-transcripts -> llmtv-replay",
  } satisfies Omit<ReplayArtifact, "expire">;

  return options.expire === undefined ? base : { ...base, expire: options.expire };
}
