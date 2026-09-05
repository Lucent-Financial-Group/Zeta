/**
 * EvidenceReceiptDetailPage — GitHub Pages finite receipt chamber.
 * Design: source-owned detail and provenance only; no remote fetch, ranking, or evidence mutation.
 */
import { EVIDENCE_SOURCE_COMMIT, evidenceSourceBlob, evidenceSourceUrl, SPECTRUM } from "@/components/EvidenceSeamPanel";
import { useState } from "react";
import { useRoute } from "wouter";

const labelStyle = { color: "var(--muted-foreground)", fontSize: "0.52rem", letterSpacing: "0.12em", textTransform: "uppercase" as const };

function ReceiptRail() {
  return <svg aria-hidden="true" viewBox="0 0 900 150" preserveAspectRatio="none" style={{ height: 150, inset: 0, opacity: 0.38, pointerEvents: "none", position: "absolute", width: "100%" }}><path d="M22 129 L120 129 L168 96 L286 96 L332 58 L453 58 L502 97 L618 97 L665 37 L798 37 L850 15 L878 15" fill="none" stroke="var(--amber)" strokeWidth="2" vectorEffect="non-scaling-stroke" /><path d="M168 96 L141 53 L83 30 M332 58 L303 18 L252 12 M502 97 L535 133 L603 143 M665 37 L718 76 L784 84" fill="none" stroke="var(--amber-dim)" strokeWidth="1.1" vectorEffect="non-scaling-stroke" /><circle cx="22" cy="129" r="3" fill="var(--teal)" /><circle cx="878" cy="15" r="3" fill="var(--amber)" /></svg>;
}

export default function EvidenceReceiptDetailPage() {
  const [, params] = useRoute("/evidence-seam/receipt/:id");
  const receipt = SPECTRUM.find((entry) => entry.id === params?.id);
  const [copyStatus, setCopyStatus] = useState("COPY RECEIPT ID");
  const [routeStatus, setRouteStatus] = useState("COPY ROUTE URL");

  const copy = async (value: string, setter: (next: string) => void, success: string) => {
    if (navigator.clipboard === undefined) { setter("COPY UNAVAILABLE"); return; }
    try { await navigator.clipboard.writeText(value); setter(success); } catch { setter("COPY FAILED"); }
  };

  return <main style={{ background: "var(--background)", color: "var(--foreground)", fontFamily: "'JetBrains Mono', monospace", minHeight: "100vh", padding: "clamp(0.55rem, 1.5vw, 1.25rem)" }}>
    <div className="evidence-room-shell" style={{ margin: "0 auto", maxWidth: 1080 }}>
      <nav aria-label="Evidence navigation" className="grid grid-cols-1 items-center gap-x-4 gap-y-2 border-b border-border pb-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]" style={{ marginBottom: "1.2rem" }}>
        <a href="#/evidence-seam" className="sm:justify-self-start" style={{ color: "var(--amber-dim)", fontSize: "0.56rem", letterSpacing: "0.08em", textDecoration: "none" }}>← EVIDENCE ROOM</a>
        <span className="evidence-room-wordmark">ZETA//IDENTITY-SPACE::PROOF-ENGINE</span>
        <span className="sm:justify-self-end sm:text-right" style={{ color: "var(--muted-foreground)", fontSize: "0.5rem", letterSpacing: "0.07em" }}>FINITE CATALOG · PAGES MIRROR</span>
      </nav>
      <section aria-labelledby="receipt-detail-title" style={{ background: "oklch(0.052 0.008 265)", border: "1px solid var(--border)", minHeight: "min(540px, calc(100vh - 7rem))", overflow: "hidden", position: "relative" }}>
        <ReceiptRail />
        {receipt === undefined ? <div style={{ maxWidth: 760, padding: "clamp(1.25rem, 6vw, 4rem)", position: "relative" }}><div style={{ ...labelStyle, color: "var(--teal)" }}>finite route check</div><h1 id="receipt-detail-title" style={{ color: "var(--teal)", fontSize: "clamp(1.8rem, 5.5vw, 4.2rem)", letterSpacing: "-0.08em", lineHeight: 0.88, margin: "0.55rem 0" }}>RECEIPT NOT DECLARED</h1><p style={{ color: "var(--muted-foreground)", fontSize: "0.7rem", lineHeight: 1.65, maxWidth: "62ch" }}>This identifier is absent from the finite in-bundle spectrum. No nearby receipt was selected and no evidence was synthesized.</p><a href="#/evidence-seam" style={{ color: "var(--amber)", display: "inline-block", fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.1em", marginTop: "1rem", textDecoration: "none" }}>RETURN TO DECLARED SPECTRUM →</a></div> : <div style={{ maxWidth: 920, padding: "clamp(1.25rem, 5vw, 4rem)", position: "relative" }}>
          <div style={{ ...labelStyle, color: receipt.tone }}>bounded spectrum receipt · {receipt.id}</div>
          <h1 id="receipt-detail-title" style={{ color: receipt.tone, fontSize: "clamp(2rem, 6vw, 5rem)", letterSpacing: "-0.09em", lineHeight: 0.86, margin: "0.7rem 0 1.2rem", textTransform: "uppercase" }}>{receipt.lane}</h1>
          <div style={{ borderLeft: `3px solid ${receipt.tone}`, color: receipt.tone, fontSize: "clamp(1.2rem, 2.7vw, 2.1rem)", fontWeight: 900, letterSpacing: "-0.055em", lineHeight: 0.96, padding: "0.45rem 0 0.5rem 0.85rem" }}>{"readout" in receipt ? receipt.readout : `δ ${receipt.defect}`}</div>
          <div style={{ background: "var(--border)", display: "grid", gap: "1px", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", margin: "1.2rem 0", maxWidth: 820 }}>{[["carrier", receipt.carrier], ["operators", receipt.operators], ["bounded verdict", receipt.verdict]].map(([label, value]) => <div key={label} style={{ background: "oklch(0.06 0.009 265)", padding: "0.75rem" }}><div style={labelStyle}>{label}</div><div style={{ color: "var(--foreground)", fontSize: "0.62rem", lineHeight: 1.5, marginTop: "0.35rem" }}>{value}</div></div>)}</div>
          <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: "0.65rem 1rem" }}><button type="button" onClick={() => copy(receipt.id, setCopyStatus, "RECEIPT ID COPIED")} style={{ background: "transparent", border: "1px solid var(--cold)", color: "var(--foreground)", cursor: "pointer", font: "inherit", fontSize: "0.5rem", fontWeight: 800, letterSpacing: "0.08em", padding: "0.42rem 0.5rem" }}>{copyStatus}</button><button type="button" onClick={() => copy(window.location.href, setRouteStatus, "ROUTE URL COPIED")} style={{ background: "transparent", border: "1px solid var(--cold)", color: "var(--foreground)", cursor: "pointer", font: "inherit", fontSize: "0.5rem", fontWeight: 800, letterSpacing: "0.08em", padding: "0.42rem 0.5rem" }}>{routeStatus}</button><span aria-live="polite" style={{ color: "var(--muted-foreground)", fontSize: "0.47rem", letterSpacing: "0.08em" }}>ID · {receipt.id}</span></div>
          {evidenceSourceUrl(receipt.sourcePath) === undefined ? <div style={{ color: "var(--teal)", fontSize: "0.52rem", letterSpacing: "0.09em", marginTop: "1rem" }}>SOURCE NOT DECLARED</div> : <div style={{ display: "grid", gap: "0.4rem", marginTop: "1rem" }}><a href={evidenceSourceUrl(receipt.sourcePath)} target="_blank" rel="noopener noreferrer" style={{ color: "var(--amber-dim)", fontSize: "0.52rem", fontWeight: 800, letterSpacing: "0.09em", textDecoration: "none" }}>OPEN PINNED SOURCE · {EVIDENCE_SOURCE_COMMIT.slice(0, 7)} ↗</a><span style={{ color: "var(--muted-foreground)", fontSize: "0.47rem", letterSpacing: "0.07em", overflowWrap: "anywhere" }}>SOURCE PATH · {receipt.sourcePath}</span><span style={{ color: "var(--muted-foreground)", fontSize: "0.47rem", letterSpacing: "0.07em", overflowWrap: "anywhere" }}>SOURCE BLOB SHA-1 · {evidenceSourceBlob(receipt.sourcePath) ?? "UNAVAILABLE"}</span></div>}
          <p style={{ borderTop: "1px solid var(--border)", color: "var(--muted-foreground)", fontSize: "0.65rem", lineHeight: 1.65, marginTop: "1rem", maxWidth: "72ch", paddingTop: "0.9rem" }}>{"detail" in receipt ? receipt.detail : "This finite catalog row supplies no additional scope note. Its carrier, operators, and bounded verdict are shown without inference or expansion."}</p>
        </div>}
      </section>
    </div>
  </main>;
}
