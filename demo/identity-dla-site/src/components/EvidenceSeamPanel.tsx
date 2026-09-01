/**
 * EvidenceSeamPanel — Dark Matter Observatory evidence room.
 *
 * Design: retained amber branch geometry carries proof states; calibrated controls recede around decisive readouts.
 * Teal marks unresolved state and red marks witnessed conflicts. No rounded decorative chrome.
 * Evidence values mirror merged Zeta PRs #15638, #15660, #15669, and #15680.
 */
import { useMemo, useState } from "react";

type EvidenceSign = "assertion +1" | "retraction −1";
type Alteration = "none" | "uncertainty" | "spectrum" | "signature";
type CausalScenario = "settled" | "missing predecessor" | "visible fork";
type GenesisScenario = "witnessed" | "unknown witness" | "visible conflict";

const GENERATOR_MASKS = [225, 210, 180, 120] as const;

function popcount(value: number): number {
  let count = 0;
  for (let word = value; word !== 0; word >>>= 1) count += word & 1;
  return count;
}

function enumerateCode(): number[] {
  return Array.from({ length: 16 }, (_, message) =>
    GENERATOR_MASKS.reduce(
      (word, generator, row) => (message & (1 << row) ? word ^ generator : word),
      0,
    ),
  );
}

const WEIGHT_FOUR_SUPPORTS = new Set(
  enumerateCode().filter((word) => word !== 0 && popcount(word) === 4),
);

const DEFAULT_AMBIGUOUS_MASK = Array.from(WEIGHT_FOUR_SUPPORTS)[0] ?? 225;

const SPECTRUM = [
  {
    lane: "uncoded cube",
    carrier: "256",
    operators: "256",
    defect: "1",
    verdict: "rank-one regular",
    tone: "var(--amber)",
  },
  {
    lane: "coded [8,4,4] quotient",
    carrier: "16",
    operators: "256",
    defect: "16",
    verdict: "faithful, non-regular",
    tone: "var(--amber)",
  },
  {
    lane: "four-colour residue",
    carrier: "16",
    operators: "16",
    defect: "1",
    verdict: "56 / 70 subsets",
    tone: "var(--amber)",
  },
  {
    lane: "bivector + half-spinor",
    carrier: "128 S+",
    operators: "120 bivectors",
    defect: "—",
    verdict: "bracket + Jacobi checked · δ unmeasured",
    tone: "var(--amber)",
  },
  {
    lane: "coded → half-spin module",
    carrier: "16 (8+8) → 128 (64+64)",
    operators: "7 even pairs · TS/F#/Rust · Lean laws",
    defect: "—",
    readout: "rank 16",
    verdict: "rank 16 · Aut GL₈×GL₈ · δ unmeasured",
    detail: "Bayesian factor layer: 8+8 routed · 64 lattice ties",
    tone: "var(--amber)",
    emphasis: true,
  },
  {
    lane: "reference-frame factor heterarchy",
    carrier: "finite modules + room frame",
    operators: "18 F# · 5 TS · F#/TS oracle · Lean laws",
    defect: "—",
    readout: "18 controls",
    verdict: "Bayesian fusion + Cl₃ covariance checked",
    detail: "K4 → 4 · K5 → 5 · language / learning / cortical fidelity unmeasured",
    tone: "var(--amber)",
  },
] as const;

const controlStyle = {
  width: "100%",
  border: 0,
  borderBottom: "1px solid var(--cold)",
  borderRadius: 0,
  background: "transparent",
  color: "var(--foreground)",
  font: "inherit",
  fontSize: "0.66rem",
  padding: "0.55rem 0.3rem 0.38rem",
} as const;

const instrumentControlStyle = {
  display: "block",
  minHeight: 72,
  borderTop: "1px solid color-mix(in srgb, var(--amber) 34%, transparent)",
  borderLeft: "2px solid color-mix(in srgb, var(--amber) 58%, transparent)",
  background: "linear-gradient(118deg, oklch(0.13 0.028 60 / 0.42), oklch(0.052 0.008 265 / 0.72) 72%)",
  padding: "0.58rem 0.62rem 0.45rem",
  letterSpacing: "0.05em",
} as const;

function Register({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  tone: string;
}) {
  return (
    <div style={{ borderTop: `1px solid ${tone}`, padding: "0.72rem 0.1rem", background: "transparent" }}>
      <div style={{ color: "var(--muted-foreground)", fontSize: "0.52rem", letterSpacing: "0.12em", textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ color: tone, fontSize: "clamp(0.9rem, 1.7vw, 1.12rem)", fontWeight: 800, margin: "0.35rem 0 0.2rem", letterSpacing: "-0.03em" }}>{value}</div>
      <div style={{ color: "var(--muted-foreground)", fontSize: "0.54rem", lineHeight: 1.45 }}>{note}</div>
    </div>
  );
}

function ByteMask({ mask }: { mask: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(8, minmax(24px, 1fr))", gap: 4 }} aria-label="Eight transport coordinates">
      {Array.from({ length: 8 }, (_, index) => {
        const erased = (mask & (1 << index)) !== 0;
        return (
          <div
            key={index}
            title={`coordinate ${index}: ${erased ? "erased" : "received"}`}
            style={{
              minHeight: 42,
              display: "grid",
              placeItems: "center",
              border: `1px solid ${erased ? "var(--fail-red)" : "var(--amber)"}`,
              background: erased ? "oklch(0.19 0.07 25)" : "oklch(0.14 0.04 85)",
              color: erased ? "oklch(0.82 0.15 30)" : "var(--amber)",
              fontSize: "0.62rem",
              fontWeight: 800,
            }}
          >
            {erased ? "×" : index}
          </div>
        );
      })}
    </div>
  );
}

function BoundaryTrace({ tone }: { tone: string }) {
  return (
    <div style={{ position: "relative", marginTop: "0.95rem", minHeight: 164, borderTop: "1px solid var(--border)", overflow: "hidden" }} aria-hidden="true">
      <svg viewBox="0 0 760 164" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <path d="M380 160 L380 124 L333 124 L300 94 L252 94 L223 64 L175 64 L146 34 L80 34 M380 124 L427 124 L458 91 L508 91 L538 55 L592 55 L622 24 L710 24" fill="none" stroke={tone} strokeWidth="2.8" vectorEffect="non-scaling-stroke" />
        <path d="M300 94 L300 52 L264 52 L236 18 M223 64 L188 96 L139 96 L111 130 M458 91 L458 45 L492 45 L525 15 M538 55 L568 96 L632 96 L670 136" fill="none" stroke={tone} strokeOpacity="0.58" strokeWidth="1.7" vectorEffect="non-scaling-stroke" />
        <path d="M252 94 L226 121 L190 121 M508 91 L483 122 L448 122 M175 64 L151 82 M592 55 L617 76" fill="none" stroke={tone} strokeOpacity="0.34" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        <path d="M111 130 L111 149 M236 18 L236 42 M525 15 L525 39 M670 136 L670 151" fill="none" stroke="oklch(0.55 0.1 190 / 0.42)" strokeWidth="1" strokeDasharray="3 6" vectorEffect="non-scaling-stroke" />
        {[111, 236, 525, 670].map((x, index) => <circle key={x} cx={x} cy={[149, 42, 39, 151][index]} r="3" fill="oklch(0.72 0.14 190)" />)}
      </svg>
      <div style={{ position: "absolute", left: 8, top: 7, color: "var(--amber-dim)", fontSize: "0.48rem", letterSpacing: "0.13em" }}>
        RETAINED BRANCH TOPOLOGY
      </div>
      <div style={{ position: "absolute", right: 8, bottom: 7, color: "var(--muted-foreground)", fontSize: "0.48rem", letterSpacing: "0.11em" }}>
        DLA-DERIVED BOUNDARY / SPARSE UNRESOLVED SAMPLES
      </div>
    </div>
  );
}

function StructuralProofField() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 900 230"
      preserveAspectRatio="none"
      style={{ position: "absolute", inset: "0 0 auto auto", width: "78%", height: 250, opacity: 0.42, pointerEvents: "none" }}
    >
      <path d="M900 22 L847 28 L815 47 L761 43 L724 69 L659 64 L621 94 L558 87 L516 125 L456 118 L416 154 L352 145 L312 184 L246 176" fill="none" stroke="var(--amber)" strokeWidth="2.7" vectorEffect="non-scaling-stroke" />
      <path d="M815 47 L798 14 L756 7 M761 43 L741 87 L699 104 M659 64 L637 24 L590 13 M621 94 L650 132 L706 142 M516 125 L489 79 L444 61 M456 118 L476 172 L529 199 M352 145 L328 103 L282 88 M312 184 L280 218 L224 226" fill="none" stroke="var(--amber)" strokeOpacity="0.56" strokeWidth="1.35" vectorEffect="non-scaling-stroke" />
      <path d="M699 104 L675 76 M590 13 L565 38 M444 61 L414 31 M529 199 L558 218 M282 88 L252 54" fill="none" stroke="oklch(0.72 0.14 190)" strokeOpacity="0.46" strokeWidth="1" strokeDasharray="3 8" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function SpectrumBranchField() {
  return (
    <svg aria-hidden="true" viewBox="0 0 1120 250" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.34, pointerEvents: "none" }}>
      <path d="M18 226 L85 206 L123 173 L201 181 L249 143 L328 151 L370 112 L448 121 L496 77 L581 88 L631 47 L720 58 L769 24 L866 35 L922 13 L1099 21" fill="none" stroke="var(--amber)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
      <path d="M123 173 L92 128 L35 116 M201 181 L221 220 L286 239 M328 151 L305 94 L244 69 M448 121 L474 174 L538 199 M581 88 L554 32 L488 12 M720 58 L747 109 L815 137 M866 35 L892 83 L956 105 M922 13 L967 48 L1042 61" fill="none" stroke="var(--amber)" strokeOpacity="0.62" strokeWidth="1.35" vectorEffect="non-scaling-stroke" />
      <path d="M92 128 L57 151 M286 239 L320 214 M244 69 L207 31 M538 199 L573 225 M488 12 L452 39 M815 137 L855 168 M956 105 L1001 137" fill="none" stroke="oklch(0.72 0.14 190)" strokeOpacity="0.32" strokeWidth="1" strokeDasharray="3 9" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default function EvidenceSeamPanel() {
  const [erasedCount, setErasedCount] = useState(1);
  const [ambiguousFour, setAmbiguousFour] = useState(false);
  const [sign, setSign] = useState<EvidenceSign>("assertion +1");
  const [alteration, setAlteration] = useState<Alteration>("none");
  const [causal, setCausal] = useState<CausalScenario>("settled");
  const [genesis, setGenesis] = useState<GenesisScenario>("witnessed");

  const mask = useMemo(() => {
    if (erasedCount === 4 && ambiguousFour) return DEFAULT_AMBIGUOUS_MASK;
    return erasedCount === 8 ? 255 : (1 << erasedCount) - 1;
  }, [erasedCount, ambiguousFour]);

  const containsCodewordSupport = Array.from(WEIGHT_FOUR_SUPPORTS).some(
    (support) => support !== 0 && (support & mask) === support,
  );
  const recoverable = erasedCount <= 4 && !containsCodewordSupport;
  const semanticReceipt = recoverable;
  const exactRoot = semanticReceipt && alteration === "none";

  const continuity =
    causal === "settled" ? "settled" : causal === "missing predecessor" ? "unresolved" : "disputed";
  const authority =
    genesis === "witnessed" ? "witnessed" : genesis === "unknown witness" ? "unresolved" : "disputed";
  const integrity = !semanticReceipt
    ? "not assessed"
    : alteration === "none"
      ? "intact"
      : "distinct content";

  const transportTone = !semanticReceipt
    ? "var(--fail-red)"
    : exactRoot
      ? "var(--amber)"
      : "var(--amber)";

  return (
    <section
      aria-labelledby="evidence-seam-title"
      className="evidence-seam-panel"
      style={{
        position: "relative",
        border: "1px solid var(--border)",
        borderRadius: 0,
        background: "oklch(0.065 0.012 265)",
        color: "var(--foreground)",
        fontFamily: "'JetBrains Mono', monospace",
        overflow: "hidden",
        minHeight: "calc(100vh - 5rem)",
      }}
    >
      <StructuralProofField />
      <header style={{ position: "relative", zIndex: 1, padding: "1.4rem 1.25rem 1.15rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <div style={{ color: "var(--amber-dim)", fontSize: "0.56rem", letterSpacing: "0.16em", textTransform: "uppercase" }}>
            room evidence instrument · checked finite artifacts
          </div>
          <h2 id="evidence-seam-title" style={{ margin: "0.42rem 0 0", color: "var(--amber-dim)", fontSize: "clamp(1.05rem, 2.5vw, 1.85rem)", lineHeight: 1, letterSpacing: "-0.035em" }}>
            ADINKRA RECOVERY / DURABLE RECEIPT / LOCAL WITNESS
          </h2>
        </div>
        <div style={{ textAlign: "right", fontSize: "0.55rem", color: "var(--muted-foreground)", lineHeight: 1.55 }}>
          PR #15638 seam · #15660 mutation gate
          <br />#15669 authority · #15680 defect spectrum
        </div>
      </header>

      <div className="evidence-seam-layout" style={{ position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "minmax(0, 1.5fr) minmax(250px, 0.65fr)", gap: 0 }}>
        <div className="evidence-seam-primary" style={{ padding: "1rem", borderRight: "1px solid var(--border)" }}>
          <div className="observatory-controls" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.65rem", marginBottom: "0.9rem" }}>
            <label style={{ ...instrumentControlStyle, fontSize: "0.55rem", color: "var(--muted-foreground)" }}>
              erased coordinates: <strong style={{ color: "var(--foreground)" }}>{erasedCount}</strong>
              <input
                aria-label="Erased transport coordinates"
                type="range"
                min={0}
                max={8}
                value={erasedCount}
                onChange={(event) => setErasedCount(Number(event.target.value))}
                style={{ width: "100%", marginTop: "0.55rem", accentColor: "var(--amber)" }}
              />
            </label>
            <label style={{ ...instrumentControlStyle, fontSize: "0.55rem", color: "var(--muted-foreground)" }}>
              evidence sign
              <select value={sign} onChange={(event) => setSign(event.target.value as EvidenceSign)} style={{ ...controlStyle, marginTop: "0.35rem" }}>
                <option>assertion +1</option>
                <option>retraction −1</option>
              </select>
            </label>
            <label style={{ ...instrumentControlStyle, fontSize: "0.55rem", color: "var(--muted-foreground)" }}>
              CRC-valid semantic change
              <select value={alteration} onChange={(event) => setAlteration(event.target.value as Alteration)} style={{ ...controlStyle, marginTop: "0.35rem" }}>
                <option value="none">none</option>
                <option value="uncertainty">uncertainty changed</option>
                <option value="spectrum">spectrum key changed</option>
                <option value="signature">signature split changed</option>
              </select>
            </label>
          </div>

          {erasedCount === 4 && (
            <button
              type="button"
              onClick={() => setAmbiguousFour((current) => !current)}
              style={{
                ...controlStyle,
                width: "auto",
                marginBottom: "0.75rem",
                borderColor: ambiguousFour ? "var(--fail-red)" : "oklch(0.55 0.12 190)",
              }}
            >
              {ambiguousFour ? "using codeword-support erasure — ambiguous" : "using information-set erasure — identifiable"}
            </button>
          )}

          <ByteMask mask={mask} />

          <div className="evidence-proof-spine" style={{ marginTop: "0.9rem", borderLeft: `3px solid ${transportTone}`, padding: "0.55rem 0.75rem 0.7rem", background: "linear-gradient(90deg, color-mix(in srgb, var(--amber) 8%, transparent), transparent 70%)" }}>
            <div style={{ alignItems: "baseline", display: "flex", flexWrap: "wrap", gap: "0.35rem 0.7rem", marginBottom: "0.32rem" }}>
              <span style={{ color: "var(--muted-foreground)", fontSize: "0.5rem", letterSpacing: "0.12em" }}>IDENTIFIABLE ERASURE DOMAIN</span>
              <strong style={{ color: "var(--amber)", fontSize: "clamp(1.4rem, 2.8vw, 2.05rem)", letterSpacing: "-0.08em" }}>0–3 / 8</strong>
              <span style={{ color: "var(--muted-foreground)", fontSize: "0.5rem", letterSpacing: "0.1em" }}>56 / 70 AT FOUR</span>
            </div>
            <div style={{ color: transportTone, fontWeight: 900, fontSize: "clamp(1.32rem, 3vw, 2.1rem)", lineHeight: 0.94, letterSpacing: "-0.065em" }}>
              {!semanticReceipt
                ? "UNDECODABLE — no semantic receipt enters the ledger"
                : exactRoot
                  ? "RECOVERED — durable receipt root R′ = R"
                  : "VALID DIFFERENT FACT — durable root R′ ≠ R"}
            </div>
            <div style={{ color: "var(--muted-foreground)", fontSize: "0.55rem", lineHeight: 1.55, marginTop: "0.3rem" }}>
              All 0–3 erasures and 56 of 70 four-erasure masks are identifiable. The fourteen weight-four codeword supports are ambiguous. Absence at transport does not manufacture an “unresolved” evidence atom.
            </div>
          </div>
          <BoundaryTrace tone={transportTone} />
        </div>

        <div className="evidence-audit-readout" style={{ padding: "1rem" }}>
          <div style={{ fontSize: "0.55rem", color: "var(--muted-foreground)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.7rem" }}>
            audit scenarios
          </div>
          <label style={{ display: "block", fontSize: "0.55rem", color: "var(--muted-foreground)", marginBottom: "0.65rem" }}>
            causal continuity
            <select value={causal} onChange={(event) => setCausal(event.target.value as CausalScenario)} style={{ ...controlStyle, marginTop: "0.35rem" }}>
              <option>settled</option>
              <option>missing predecessor</option>
              <option>visible fork</option>
            </select>
          </label>
          <label style={{ display: "block", fontSize: "0.55rem", color: "var(--muted-foreground)" }}>
            local genesis witness
            <select value={genesis} onChange={(event) => setGenesis(event.target.value as GenesisScenario)} style={{ ...controlStyle, marginTop: "0.35rem" }}>
              <option>witnessed</option>
              <option>unknown witness</option>
              <option>visible conflict</option>
            </select>
          </label>

          <div className="evidence-register-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0.55rem", marginTop: "0.9rem" }}>
            <Register label="evidence sign" value={semanticReceipt ? sign : "no receipt"} note="+1 and −1 both retain uncertainty." tone="var(--amber)" />
            <Register label="content integrity" value={integrity} note="Different content gets a different root; it is not silently normalized." tone="var(--amber)" />
            <Register label="causal continuity" value={semanticReceipt ? continuity : "not observed"} note="A missing predecessor remains unknown; a visible fork fails closed." tone={continuity === "settled" ? "var(--amber)" : continuity === "unresolved" ? "oklch(0.72 0.14 190)" : "var(--fail-red)"} />
            <Register label="genesis authority" value={semanticReceipt ? authority : "not observed"} note="The roster is local. A partition cannot reveal an unseen competing genesis." tone={authority === "witnessed" ? "var(--amber)" : authority === "unresolved" ? "oklch(0.72 0.14 190)" : "var(--fail-red)"} />
          </div>
        </div>
      </div>

      <div style={{ position: "relative", zIndex: 1, borderTop: "1px solid color-mix(in srgb, var(--amber) 38%, transparent)", padding: "1.45rem 1rem 2rem", overflow: "hidden", background: "oklch(0.052 0.008 265)" }}>
        <SpectrumBranchField />
        <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginBottom: "1.15rem" }}>
          <div>
            <div style={{ color: "var(--amber-dim)", fontSize: "0.56rem", letterSpacing: "0.14em", textTransform: "uppercase" }}>
              representation-defect spectrum
            </div>
            <div style={{ fontSize: "0.58rem", color: "var(--muted-foreground)", marginTop: "0.3rem" }}>
              Same recovery lane. Different representation questions. Unknown stays unknown.
            </div>
          </div>
          <div style={{ fontSize: "0.53rem", color: "var(--muted-foreground)", textAlign: "right" }}>
            mutation gate: ambiguity · CRC · duplicate · length<br />4 / 4 deliberate weakenings killed
          </div>
        </div>
        <div className="evidence-spectrum-grid" style={{ position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.8rem" }}>
          {SPECTRUM.map((row) => (
            <div key={row.lane} style={{ gridColumn: "emphasis" in row ? "span 2" : undefined, border: 0, borderTop: `${"emphasis" in row ? 4 : 1}px solid ${row.tone}`, borderLeft: "1px solid color-mix(in srgb, var(--amber) 24%, transparent)", padding: "emphasis" in row ? "1rem 1.1rem 1.15rem" : "0.7rem", background: "emphasis" in row ? "linear-gradient(128deg, oklch(0.16 0.052 55 / 0.66), oklch(0.058 0.008 265) 66%)" : "oklch(0.052 0.008 265 / 0.78)", boxShadow: "emphasis" in row ? "inset 4px 0 0 color-mix(in srgb, var(--amber) 58%, transparent)" : "none" }}>
              <div style={{ color: "var(--muted-foreground)", fontSize: "0.6rem", fontWeight: 800, minHeight: "2.2em" }}>{row.lane}</div>
              <div style={{ color: "readout" in row ? "var(--amber)" : row.defect === "—" ? "var(--muted-foreground)" : row.tone, fontSize: "emphasis" in row ? "clamp(2rem, 5vw, 3.8rem)" : "clamp(1.45rem, 3vw, 2.2rem)", fontWeight: 900, letterSpacing: "-0.075em", margin: "0.25rem 0 0.6rem", lineHeight: 0.9 }}>{"readout" in row ? row.readout : `δ ${row.defect}`}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "0.3rem", fontSize: "0.52rem", color: "var(--muted-foreground)", marginTop: "0.55rem" }}>
                <span>carrier M</span><strong style={{ color: "var(--foreground)" }}>{row.carrier}</strong>
                <span>operators A</span><strong style={{ color: "var(--foreground)" }}>{row.operators}</strong>
              </div>
              <div style={{ marginTop: "0.6rem", borderTop: "1px solid var(--border)", paddingTop: "0.45rem", fontSize: "0.52rem", fontWeight: "emphasis" in row ? 900 : 400, color: row.tone }}>
                {row.verdict}
              </div>
              {"detail" in row ? <div style={{ marginTop: "0.35rem", fontSize: "0.48rem", color: "var(--muted-foreground)" }}>{row.detail}</div> : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
