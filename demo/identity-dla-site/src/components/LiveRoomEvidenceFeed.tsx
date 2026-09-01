/**
 * LiveRoomEvidenceFeed — Dark Matter Observatory discovery console.
 * Amber is reserved for retrieved immutable envelopes and verdicts; teal is retained unknown/unavailable state; red rejects malformed local teaching records.
 * This browser binds named local adjudication priors but never infers authority, global identity, or a content-address verdict from absence.
 */
import { useCallback, useEffect, useState } from "react";
import {
  parseLocalWitnessAdjudication,
  parseLocalWitnessAdjudicationReference,
  summarizeLocalWitnessAdjudicationAvailability,
  type LocalWitnessAdjudicationView,
} from "@/lib/room-witness-adjudication";
import { ROOM_EVIDENCE_WINDOW_SIZE, selectRoomEvidenceWindow } from "@/lib/room-evidence-window";

const RAW_ROOT = "https://raw.githubusercontent.com/Lucent-Financial-Group/Zeta/main/docs/room-evidence";
const INDEX_URL = `${RAW_ROOT}/index.json`;

type AdjudicationView =
  | { kind: "not-published" }
  | { kind: "ready"; value: LocalWitnessAdjudicationView }
  | { kind: "unavailable"; reason: string }
  | { kind: "malformed"; reason: string };

type EnvelopeView = {
  eventId: string;
  auditContentKey: string;
  receiptContentKey: string;
  weight: number;
  emitterId: string;
  emitterSeq: number;
  witnessMaterial: boolean;
  adjudication: AdjudicationView;
};

type FeedState =
  | { kind: "loading" }
  | { kind: "empty"; source: string }
  | { kind: "ready"; source: string; total: number; start: number; end: number; hasPrevious: boolean; hasNext: boolean; entries: EnvelopeView[] }
  | { kind: "unavailable"; reason: string }
  | { kind: "malformed"; reason: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) throw new Error(`${label} must be a non-empty string`);
  return value;
}

function requireInteger(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) throw new Error(`${label} must be a safe integer`);
  return value;
}

function indexRelativeUrl(path: string): string {
  return `${RAW_ROOT}/${encodeURIComponent(path).replace(/%2F/g, "/")}`;
}

async function readAdjudication(
  entry: Record<string, unknown>,
  expected: { readonly eventId: string; readonly auditContentKey: string; readonly receiptContentKey: string },
  signal: AbortSignal,
): Promise<AdjudicationView> {
  if (entry.adjudication === undefined) return { kind: "not-published" };
  let reference: ReturnType<typeof parseLocalWitnessAdjudicationReference>;
  try {
    reference = parseLocalWitnessAdjudicationReference(entry.adjudication, expected.eventId);
  } catch (error) {
    return { kind: "malformed", reason: error instanceof Error ? error.message : "adjudication reference is invalid" };
  }
  let response: Response;
  try {
    response = await fetch(indexRelativeUrl(reference.file), { cache: "no-store", signal });
  } catch (error) {
    return { kind: "unavailable", reason: error instanceof Error ? error.message : "adjudication request failed" };
  }
  if (!response.ok) return { kind: "unavailable", reason: `adjudication ${reference.file} returned HTTP ${response.status}` };
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return { kind: "malformed", reason: `adjudication ${reference.file} is not valid JSON` };
  }
  try {
    return { kind: "ready", value: parseLocalWitnessAdjudication(payload, expected) };
  } catch (error) {
    return { kind: "malformed", reason: error instanceof Error ? error.message : "adjudication payload is invalid" };
  }
}

async function readFeed(signal: AbortSignal, requestedOffset: number): Promise<FeedState> {
  let response: Response;
  try {
    response = await fetch(INDEX_URL, { cache: "no-store", signal });
  } catch (error) {
    return { kind: "unavailable", reason: error instanceof Error ? error.message : "feed request failed" };
  }
  if (!response.ok) return { kind: "unavailable", reason: `index request returned HTTP ${response.status}` };

  let manifest: unknown;
  try {
    manifest = await response.json();
  } catch {
    return { kind: "malformed", reason: "index is not valid JSON" };
  }
  if (!isRecord(manifest) || manifest.schema !== "zeta.room-evidence-live-feed-index.v1" || !Array.isArray(manifest.entries)) {
    return { kind: "malformed", reason: "index does not match zeta.room-evidence-live-feed-index.v1" };
  }
  if (manifest.entries.length === 0) return { kind: "empty", source: INDEX_URL };

  try {
    const window = selectRoomEvidenceWindow(manifest.entries, requestedOffset);
    const ids = new Set<string>();
    const entries = await Promise.all(
      window.entries.map(async (entry, localIndex): Promise<EnvelopeView> => {
        const index = window.start + localIndex;
        if (!isRecord(entry)) throw new Error(`index entry ${index} is not an object`);
        const eventId = requireString(entry.eventId, `index entry ${index} eventId`);
        const file = requireString(entry.file, `index entry ${index} file`);
        const auditContentKey = requireString(entry.auditContentKey, `${file} audit content key`);
        const receiptContentKey = requireString(entry.receiptContentKey, `${file} receipt content key`);
        if (!/^room-evidence\/[A-Za-z0-9._:-]+\.json$/.test(file)) throw new Error(`index entry ${index} file is outside room-evidence`);
        if (ids.has(eventId)) throw new Error(`index repeats eventId ${eventId}`);
        ids.add(eventId);
        const eventResponse = await fetch(indexRelativeUrl(file), { cache: "no-store", signal });
        if (!eventResponse.ok) throw new Error(`envelope ${file} returned HTTP ${eventResponse.status}`);
        const envelope: unknown = await eventResponse.json();
        if (!isRecord(envelope) || !isRecord(envelope.delta) || !isRecord(envelope.receipt)) {
          throw new Error(`envelope ${file} lacks a receipt or delta`);
        }
        if (requireString(envelope.delta.eventId, `${file} delta.eventId`) !== eventId) {
          throw new Error(`index eventId ${eventId} does not bind envelope ${file}`);
        }
        return {
          eventId,
          auditContentKey,
          receiptContentKey,
          weight: requireInteger(envelope.receipt.weight, `${file} receipt.weight`),
          emitterId: requireString(envelope.delta.emitterId, `${file} emitter`),
          emitterSeq: requireInteger(envelope.delta.emitterSeq, `${file} logical sequence`),
          witnessMaterial: envelope.genesisWitness !== undefined,
          adjudication: await readAdjudication(entry, { eventId, auditContentKey, receiptContentKey }, signal),
        };
      }),
    );
    return { kind: "ready", source: INDEX_URL, total: window.total, start: window.start, end: window.end, hasPrevious: window.hasPrevious, hasNext: window.hasNext, entries };
  } catch (error) {
    return { kind: "malformed", reason: error instanceof Error ? error.message : "feed envelope parse failed" };
  }
}

const labelStyle = { color: "var(--muted-foreground)", fontSize: "0.54rem", letterSpacing: "0.13em", textTransform: "uppercase" as const };

function ReceiptBranchTopology() {
  return (
    <div aria-hidden="true" style={{ borderBottom: "1px solid var(--border)", height: 88, margin: "0.65rem 0 0.9rem", overflow: "hidden", position: "relative" }}>
      <div style={{ color: "var(--amber-dim)", fontSize: "0.43rem", left: "0.15rem", letterSpacing: "0.12em", position: "absolute", top: "0.15rem" }}>RETAINED RECEIPT BRANCHES · LOCAL DISCOVERY</div>
      <svg viewBox="0 0 1000 88" preserveAspectRatio="none" style={{ display: "block", height: "100%", width: "100%" }}>
        <path d="M486 86 L481 65 L448 57 L420 40 L382 47 L349 67 L307 59 L276 42 L235 48 L205 28 L160 34" fill="none" stroke="var(--amber)" strokeWidth="2.2" vectorEffect="non-scaling-stroke" />
        <path d="M481 65 L523 59 L549 35 L593 42 L627 58 L671 50 L703 23 L750 30 L787 47 L842 39" fill="none" stroke="var(--amber)" strokeWidth="2.2" vectorEffect="non-scaling-stroke" />
        <path d="M448 57 L429 80 L392 75 M382 47 L397 13 L438 20 M276 42 L257 14 L218 23 M593 42 L568 11 L529 17 M671 50 L695 79 L737 71 M787 47 L814 13 L858 20" fill="none" stroke="var(--amber-dim)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <path d="M486 84 L486 72" fill="none" stroke="var(--amber)" strokeWidth="4" vectorEffect="non-scaling-stroke" />
        <circle cx="177" cy="27" r="3" fill="var(--amber)" /><circle cx="844" cy="43" r="3" fill="var(--amber)" />
        <circle cx="399" cy="78" r="2.5" fill="var(--teal)" /><circle cx="738" cy="76" r="2.5" fill="var(--teal)" />
      </svg>
    </div>
  );
}

function LocalAdjudicationDetail({ adjudication }: { readonly adjudication: AdjudicationView }) {
  if (adjudication.kind === "not-published") {
    return <div style={{ color: "var(--teal)", marginTop: "0.5rem" }}>LOCAL ADJUDICATION · NOT PUBLISHED · AUTHORITY NOT INFERRED</div>;
  }
  if (adjudication.kind === "unavailable") {
    return <div style={{ color: "var(--teal)", marginTop: "0.5rem" }}>LOCAL ADJUDICATION · UNAVAILABLE · AUTHORITY NOT INFERRED<br />{adjudication.reason}</div>;
  }
  if (adjudication.kind === "malformed") {
    return <div style={{ color: "var(--fail-red)", marginTop: "0.5rem" }}>LOCAL ADJUDICATION · REJECTED · {adjudication.reason}</div>;
  }
  const tone = adjudication.value.authority === "disputed" ? "var(--fail-red)" : "var(--teal)";
  return (
    <div style={{ borderTop: `1px solid ${tone}`, color: "var(--muted-foreground)", marginTop: "0.55rem", paddingTop: "0.45rem" }}>
      <div style={{ ...labelStyle, color: tone }}>local authority: {adjudication.value.authority}</div>
      <div style={{ color: tone, marginTop: "0.18rem" }}>{adjudication.value.teaching.code} · {adjudication.value.disposition}</div>
      <div style={{ marginTop: "0.25rem" }}>{adjudication.value.teaching.lesson}</div>
      <div style={{ color: tone, marginTop: "0.25rem" }}>next generator: {adjudication.value.teaching.nextGenerator}</div>
    </div>
  );
}

export default function LiveRoomEvidenceFeed() {
  const [state, setState] = useState<FeedState>({ kind: "loading" });
  const [windowOffset, setWindowOffset] = useState(0);
  const refresh = useCallback((requestedOffset: number) => {
    const controller = new AbortController();
    setState({ kind: "loading" });
    void readFeed(controller.signal, requestedOffset).then((next) => {
      if (!controller.signal.aborted) setState(next);
    });
    return () => controller.abort();
  }, []);

  useEffect(() => refresh(windowOffset), [refresh, windowOffset]);

  const tone = state.kind === "ready" ? "var(--amber)" : state.kind === "malformed" ? "var(--fail-red)" : "var(--teal)";
  const title = state.kind === "ready" ? "PERSISTED RECEIPT DISCOVERY" : state.kind === "empty" ? "NO RECEIPT EMITTED" : state.kind === "loading" ? "READING RECEIPT MANIFEST" : state.kind === "unavailable" ? "FEED UNAVAILABLE" : "FEED TEACHING ERROR";
  const adjudicationAvailability = state.kind === "ready"
    ? summarizeLocalWitnessAdjudicationAvailability(state.entries.map((entry) => entry.adjudication.kind))
    : undefined;

  return (
    <section className="observatory-chamber live-evidence-instrument" style={{ borderTop: "1px solid color-mix(in srgb, var(--amber) 48%, transparent)", marginTop: "1.4rem", paddingTop: "1rem" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <div style={labelStyle}>Durable room evidence · repository mirror</div>
          <h2 style={{ margin: "0.3rem 0 0", color: state.kind === "ready" ? "var(--amber-dim)" : tone, fontSize: "clamp(1.05rem, 2.35vw, 1.7rem)", lineHeight: 1, letterSpacing: "-0.045em" }}>{title}</h2>
        </div>
        <button onClick={() => refresh(windowOffset)} style={{ background: "transparent", border: `1px solid ${tone}`, color: tone, padding: "0.44rem 0.65rem", fontFamily: "inherit", fontSize: "0.6rem", letterSpacing: "0.1em", cursor: "pointer" }}>
          REFRESH MANIFEST
        </button>
      </div>

      <p className="evidence-instrument-note" style={{ margin: "0.75rem 0", color: "var(--muted-foreground)", fontSize: "0.7rem", lineHeight: 1.6, maxWidth: 960 }}>
        Discovery surface. Event IDs bind envelopes. Named local sidecars only. No durable-address recomputation. No authority inferred from absence.
      </p>

      <ReceiptBranchTopology />

      {state.kind === "loading" && <div style={{ color: "var(--teal)", fontSize: "0.72rem" }}>→ requesting immutable manifest…</div>}
      {state.kind === "empty" && <div style={{ color: "var(--teal)", fontSize: "0.78rem", borderLeft: "3px solid var(--teal)", paddingLeft: "0.7rem" }}>The schema is published, but this feed currently contains zero persisted room receipts. This is not a retraction or a negative observation.</div>}
      {state.kind === "unavailable" && <div style={{ color: "var(--teal)", fontSize: "0.78rem", borderLeft: "3px solid var(--teal)", paddingLeft: "0.7rem" }}>No receipt state was synthesized. {state.reason}</div>}
      {state.kind === "malformed" && <div style={{ color: "var(--fail-red)", fontSize: "0.78rem", borderLeft: "3px solid var(--fail-red)", paddingLeft: "0.7rem" }}>Rejected discovery record: {state.reason}</div>}
      {state.kind === "ready" && (
        <>
          <div style={{ alignItems: "center", color: "var(--amber-dim)", display: "flex", flexWrap: "wrap", fontSize: "0.64rem", gap: "0.55rem", justifyContent: "space-between", letterSpacing: "0.08em", marginBottom: "0.55rem" }}>
            <span>DISCOVERY WINDOW · INDEX {state.start + 1}–{state.end} / {state.total} · MANIFEST ORDER</span>
            <span style={{ display: "flex", gap: "0.35rem" }}>
              <button type="button" disabled={!state.hasPrevious} onClick={() => setWindowOffset(state.start - ROOM_EVIDENCE_WINDOW_SIZE)} style={{ background: "transparent", border: "1px solid var(--border)", color: state.hasPrevious ? "var(--amber-dim)" : "var(--muted-foreground)", cursor: state.hasPrevious ? "pointer" : "not-allowed", font: "inherit", fontSize: "0.49rem", opacity: state.hasPrevious ? 1 : 0.45, padding: "0.3rem 0.45rem" }}>← PRIOR WINDOW</button>
              <button type="button" disabled={!state.hasNext} onClick={() => setWindowOffset(state.end)} style={{ background: "transparent", border: "1px solid var(--border)", color: state.hasNext ? "var(--amber-dim)" : "var(--muted-foreground)", cursor: state.hasNext ? "pointer" : "not-allowed", font: "inherit", fontSize: "0.49rem", opacity: state.hasNext ? 1 : 0.45, padding: "0.3rem 0.45rem" }}>NEXT WINDOW →</button>
            </span>
          </div>
          {adjudicationAvailability && (
            <div aria-label="Local adjudication sidecar availability" style={{ borderLeft: "2px solid var(--cold)", color: "var(--muted-foreground)", display: "flex", flexWrap: "wrap", gap: "0.42rem 0.7rem", marginBottom: "0.8rem", padding: "0.38rem 0.55rem", fontSize: "0.53rem", letterSpacing: "0.08em" }}>
              <span>LOCAL SIDECAR CHECK</span>
              <span style={{ color: "var(--amber-dim)" }}>{adjudicationAvailability.named} NAMED</span>
              <span style={{ color: "var(--amber-dim)" }}>{adjudicationAvailability.ready} READY</span>
              <span style={{ color: "var(--teal)" }}>{adjudicationAvailability.unavailable} UNAVAILABLE</span>
              <span style={{ color: "var(--fail-red)" }}>{adjudicationAvailability.rejected} REJECTED</span>
              <span>{adjudicationAvailability.outOfScope} NO REFERENCE · OUT OF SCOPE</span>
            </div>
          )}
          <div className="evidence-feed-grid">
            {state.entries.map((entry) => (
              <article className="evidence-feed-record" key={entry.eventId} style={{ border: 0, borderTop: "1px solid oklch(0.22 0.025 65 / 0.38)", borderLeft: "2px solid color-mix(in srgb, var(--amber) 58%, transparent)", padding: "0.8rem", background: "oklch(0.052 0.008 265)" }}>
                <div style={{ ...labelStyle, color: "var(--amber)" }}>{entry.weight > 0 ? "+1 assertion" : "−1 retraction"} · sequence {entry.emitterSeq}</div>
                <div style={{ margin: "0.4rem 0", color: "var(--foreground)", fontSize: "0.73rem", overflowWrap: "anywhere" }}>{entry.eventId}</div>
                <div style={{ color: "var(--muted-foreground)", fontSize: "0.59rem", lineHeight: 1.55 }}>emitter: {entry.emitterId}<br />witness material: {entry.witnessMaterial ? "present; authority is assessed by a local verifier" : "absent; do not guess"}<br />audit key: {entry.auditContentKey.slice(0, 22)}…<LocalAdjudicationDetail adjudication={entry.adjudication} /></div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
