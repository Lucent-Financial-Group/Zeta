/**
 * ReplayableFaultReceiptPanel — Dark Matter Observatory fault-vector console.
 *
 * Style: static discovery renders pre-persisted finite teaching vectors. Amber marks
 * retained facts, teal unresolved authority, and red explicit conflict/no-receipt.
 * An unavailable feed never becomes a browser-invented receipt.
 */
import { useEffect, useMemo, useState } from "react";
import {
  readPublishedReplayFaultFeed,
  summarizeReplayFaultFeed,
  type PublishedReplayFaultVector,
  type ReplayFaultFeedState,
  type ReplayFaultScenario,
} from "@/lib/replayable-fault-feed";

function vectorTone(vector: PublishedReplayFaultVector): string {
  if (vector.receipt.registers.genesisAuthority === "unresolved") return "var(--teal)";
  if (vector.receipt.registers.genesisAuthority === "disputed" || !vector.receipt.transport.semanticReceipt) return "var(--fail-red)";
  return "var(--amber)";
}

function displayScenario(scenario: ReplayFaultScenario): string {
  return scenario.replaceAll("-", " ");
}

function displayOutcome(vector: PublishedReplayFaultVector): string {
  const { receipt } = vector;
  if (!receipt.transport.semanticReceipt) return `UNDERDETERMINED ${String(receipt.transport.classification.erasedCount)} / 8 ERASURE · NO ATOM`;
  if (receipt.outcome === "distinct-fact") return "CRC-VALID CHANGE · R′ ≠ R";
  if (receipt.outcome === "authority-unresolved") return "LOCAL WITNESS ABSENT · RETAIN UNKNOWN";
  if (receipt.outcome === "authority-disputed") return "CONFLICTING WITNESS ATOMS · FAIL CLOSED";
  return `IDENTIFIABLE ${String(receipt.transport.classification.erasedCount)} / 8 ERASURE · R′ = R`;
}

function discoveryNotice(state: ReplayFaultFeedState): { readonly color: string; readonly text: string } | undefined {
  switch (state.kind) {
    case "loading": return { color: "var(--muted-foreground)", text: "STATIC DISCOVERY · REQUESTING VECTORS" };
    case "empty": return { color: "var(--muted-foreground)", text: "STATIC DISCOVERY · EMPTY FEED · NO VECTOR INVENTED" };
    case "unavailable": return { color: "var(--teal)", text: `STATIC DISCOVERY · UNAVAILABLE · ${state.reason}` };
    case "malformed": return { color: "var(--fail-red)", text: `STATIC DISCOVERY · REJECTED · ${state.reason}` };
    case "ready": return undefined;
  }
}

function healthReadout(state: ReplayFaultFeedState): { readonly color: string; readonly text: string } {
  const health = summarizeReplayFaultFeed(state);
  switch (health.kind) {
    case "checking": return { color: "var(--muted-foreground)", text: "FEED HEALTH · CHECKING" };
    case "empty": return { color: "var(--muted-foreground)", text: "FEED HEALTH · EMPTY · NO VECTOR INVENTED" };
    case "ready": return { color: "var(--amber-dim)", text: `FEED HEALTH · READY · ${String(health.declared)} DECLARED / ${String(health.loaded)} LOADED` };
    case "unavailable": return { color: "var(--teal)", text: "FEED HEALTH · UNAVAILABLE · NO COUNT INFERRED" };
    case "rejected": return { color: "var(--fail-red)", text: "FEED HEALTH · REJECTED · NO COUNT INFERRED" };
  }
}

export default function ReplayableFaultReceiptPanel() {
  const [state, setState] = useState<ReplayFaultFeedState>({ kind: "loading" });
  const [selected, setSelected] = useState<ReplayFaultScenario | undefined>();
  const [run, setRun] = useState(0);

  const reload = () => {
    setState({ kind: "loading" });
    void readPublishedReplayFaultFeed().then((next) => {
      setState(next);
      if (next.kind === "ready") setSelected((current) => current ?? next.vectors[0]?.receipt.scenario);
    });
  };
  useEffect(() => { reload(); }, []);

  const vector = useMemo(() => state.kind === "ready" ? state.vectors.find((candidate) => candidate.receipt.scenario === selected) ?? state.vectors[0] : undefined, [selected, state]);
  const notice = discoveryNotice(state);
  const health = healthReadout(state);

  return (
    <section aria-labelledby="fault-replay-title" className="observatory-chamber replay-fault-chamber" style={{ border: "1px solid var(--border)", borderRadius: 0, background: "oklch(0.052 0.009 265)", marginTop: "0.9rem", overflow: "hidden" }}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", padding: "0.9rem 1rem", borderBottom: "1px solid var(--border)" }}>
        <div>
          <div style={{ color: "var(--amber)", fontSize: "0.53rem", letterSpacing: "0.15em", textTransform: "uppercase" }}>replayable fault receipts · immutable static vectors</div>
          <h2 id="fault-replay-title" style={{ margin: "0.35rem 0 0", fontSize: "clamp(1.15rem, 2.7vw, 1.72rem)", letterSpacing: "-0.055em" }}>teach the fault; do not erase the observation</h2>
        </div>
        <div className="evidence-instrument-note" style={{ color: "var(--muted-foreground)", fontSize: "0.53rem", lineHeight: 1.55, textAlign: "right" }}>declared address locked<br />fixture · not production evidence</div>
      </header>
      <div style={{ borderBottom: "1px solid var(--border)", color: health.color, fontSize: "0.5rem", fontWeight: 800, letterSpacing: "0.09em", padding: "0.42rem 1rem", textTransform: "uppercase" }}>{health.text}</div>

      <div className="retained-branch-band" style={{ borderBottom: "1px solid var(--border)", height: 76, overflow: "hidden", position: "relative" }} aria-hidden="true">
        <div style={{ color: "var(--amber-dim)", fontSize: "0.43rem", left: "0.9rem", letterSpacing: "0.12em", position: "absolute", top: "0.25rem" }}>DECLARED VECTOR BRANCHES · FINITE TEACHING SET</div>
        <svg viewBox="0 0 920 76" preserveAspectRatio="none" style={{ display: "block", height: "100%", width: "100%" }}>
          <path d="M454 75 L454 55 L420 55 L395 39 L347 39 L321 59 L264 59 L235 43 L180 43 L149 22 L89 22" fill="none" stroke="var(--amber)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          <path d="M454 55 L495 55 L519 30 L571 30 L600 48 L660 48 L691 19 L739 19 L777 39 L840 39" fill="none" stroke="var(--amber)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          <path d="M420 55 L405 70 L365 70 M347 39 L366 13 L406 13 M235 43 L221 18 L177 18 M571 30 L549 9 L510 9 M660 48 L680 69 L728 69 M777 39 L801 12 L850 12" fill="none" stroke="var(--amber-dim)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <path d="M454 75 L454 66" fill="none" stroke="var(--amber)" strokeWidth="4" vectorEffect="non-scaling-stroke" />
          <circle cx="89" cy="22" r="3" fill="var(--amber)" /><circle cx="840" cy="39" r="3" fill="var(--amber)" />
          <circle cx="365" cy="70" r="2.5" fill="var(--teal)" /><circle cx="728" cy="69" r="2.5" fill="var(--teal)" />
        </svg>
      </div>

      {notice !== undefined ? (
        <div style={{ padding: "1rem", color: notice.color, fontSize: "0.58rem", lineHeight: 1.6 }}>
          {notice.text}
          {state.kind !== "loading" ? <button type="button" onClick={reload} style={{ marginLeft: "0.7rem", font: "inherit", fontSize: "0.54rem", fontWeight: 800, borderRadius: 0, border: `1px solid ${notice.color}`, background: "transparent", color: notice.color, padding: "0.35rem 0.5rem", cursor: "pointer" }}>RECHECK STATIC FEED</button> : null}
        </div>
      ) : vector !== undefined && state.kind === "ready" ? (
        <div className="fault-receipt-layout" style={{ display: "grid", gridTemplateColumns: "minmax(210px, 0.72fr) minmax(0, 1.28fr)" }}>
          <div style={{ padding: "0.9rem", borderRight: "1px solid var(--border)" }}>
            <div style={{ color: "var(--amber-dim)", fontSize: "0.5rem", letterSpacing: "0.13em", textTransform: "uppercase", marginBottom: "0.6rem" }}>declared fault-vector matrix</div>
            <div style={{ display: "grid", gap: "0.35rem" }}>
              {state.vectors.map((item) => {
                const active = vector.receipt.scenario === item.receipt.scenario;
                const tone = vectorTone(item);
                return <button key={item.receipt.scenario} type="button" onClick={() => { setSelected(item.receipt.scenario); setRun(0); }} style={{ textAlign: "left", font: "inherit", fontSize: "0.57rem", padding: "0.55rem 0.6rem", borderRadius: 0, border: `1px solid ${active ? tone : "var(--border)"}`, background: active ? "oklch(0.11 0.022 85)" : "transparent", color: active ? tone : "var(--muted-foreground)", cursor: "pointer" }}>{item.receipt.teaching.code} · {displayScenario(item.receipt.scenario)}</button>;
              })}
            </div>
          </div>
          <div style={{ padding: "0.9rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.7rem", alignItems: "baseline", flexWrap: "wrap" }}>
              <div style={{ color: vectorTone(vector), fontWeight: 900, fontSize: "clamp(1.5rem, 3.6vw, 2.25rem)", lineHeight: 0.92, letterSpacing: "-0.075em" }}>{displayOutcome(vector)}</div>
              <span style={{ color: "var(--muted-foreground)", fontSize: "0.5rem" }}>{vector.receipt.teaching.code} / VECTOR-{String(run).padStart(2, "0")}</span>
            </div>
            <div style={{ color: "var(--muted-foreground)", fontSize: "0.48rem", marginTop: "0.35rem", wordBreak: "break-all" }}>DECLARED CONTENT ADDRESS · {vector.contentKey}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "1px", margin: "0.85rem 0", background: "var(--border)" }}>
              {([ ["sign", vector.receipt.registers.evidenceSign], ["integrity", vector.receipt.registers.contentIntegrity], ["continuity", vector.receipt.registers.causalContinuity], ["authority", vector.receipt.registers.genesisAuthority] ] as const).map(([field, value]) => <div key={field} style={{ background: "oklch(0.06 0.009 265)", padding: "0.5rem" }}><div style={{ color: "var(--muted-foreground)", fontSize: "0.44rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>{field}</div><div style={{ color: vectorTone(vector), fontSize: "0.57rem", fontWeight: 700, marginTop: "0.25rem" }}>{value}</div></div>)}
            </div>
            <p style={{ color: "var(--foreground)", fontSize: "0.62rem", lineHeight: 1.55, margin: "0.5rem 0", maxWidth: "74ch" }}><strong style={{ color: vectorTone(vector) }}>OBSERVED</strong> · {vector.receipt.teaching.lesson}</p>
            <div style={{ borderLeft: `3px solid ${vectorTone(vector)}`, padding: "0.5rem 0.65rem", background: "oklch(0.07 0.01 265)", color: "var(--muted-foreground)", fontSize: "0.55rem", lineHeight: 1.5 }}><strong style={{ color: vectorTone(vector) }}>NEXT GENERATOR</strong> · {vector.receipt.teaching.nextGenerator}</div>
            <button type="button" onClick={() => setRun((value) => value + 1)} style={{ marginTop: "0.8rem", font: "inherit", fontSize: "0.58rem", fontWeight: 800, borderRadius: 0, border: `1px solid ${vectorTone(vector)}`, background: "transparent", color: vectorTone(vector), padding: "0.55rem 0.75rem", cursor: "pointer" }}>REPLAY DECLARED VECTOR →</button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
