import type { ReactElement } from "react";
import { recentEvolutions, type EvolutionEvent } from "./evolution-data.ts";

/// The demo's top-level page. Renders the factory's recent self-directed
/// evolution events as a timeline an external witness (CEO/CTO, alignment
/// researcher, new contributor) can read in a single screen.
///
/// Per `memory/feedback_witnessable_self_directed_evolution_factory_as_public_artifact.md`,
/// the goal is to make the wrong-move -> correction -> action chronology
/// visible. First tick: static data seeded from the most recent ticks,
/// wired by hand; follow-up ticks will read `docs/hygiene-history/
/// loop-tick-history.md` + `git log` at build time.
export function App(): ReactElement {
  return (
    <main style={pageStyle}>
      <header style={headerStyle}>
        <h1 style={titleStyle}>Zeta factory</h1>
        <p style={subtitleStyle}>
          self-directed evolution, witnessable in real time
        </p>
      </header>
      <section aria-label="recent evolution events">
        <ol style={timelineStyle}>
          {recentEvolutions.map((event) => (
            <TimelineItem key={event.id} event={event} />
          ))}
        </ol>
      </section>
      <footer style={footerStyle}>
        <p style={footnoteStyle}>
          source: git log + docs/hygiene-history/loop-tick-history.md +
          memory revision blocks
        </p>
      </footer>
    </main>
  );
}

function TimelineItem({ event }: { event: EvolutionEvent }): ReactElement {
  return (
    <li style={itemStyle}>
      <div style={metaRowStyle}>
        <time style={timeStyle} dateTime={event.at}>
          {event.at}
        </time>
        <span style={kindBadgeStyle(event.kind)}>{event.kind}</span>
      </div>
      <h2 style={itemTitleStyle}>{event.title}</h2>
      <p style={itemBodyStyle}>{event.narrative}</p>
      {event.correctionOf !== undefined && (
        <p style={correctionRefStyle}>
          corrects: <span style={correctionIdStyle}>{event.correctionOf}</span>
        </p>
      )}
    </li>
  );
}

const pageStyle: React.CSSProperties = {
  fontFamily:
    '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  maxWidth: "760px",
  margin: "0 auto",
  padding: "48px 24px 96px",
  color: "#1a1a1a",
  background: "#fafaf8",
  minHeight: "100vh",
};
const headerStyle: React.CSSProperties = { marginBottom: "40px" };
const titleStyle: React.CSSProperties = {
  fontSize: "2rem",
  fontWeight: 600,
  letterSpacing: "-0.01em",
  margin: "0 0 4px",
};
const subtitleStyle: React.CSSProperties = {
  color: "#555",
  margin: 0,
  fontSize: "1.05rem",
};
const timelineStyle: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "flex",
  flexDirection: "column",
  gap: "24px",
  borderLeft: "2px solid #d8d4cc",
  paddingLeft: "24px",
};
const itemStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e6e2d9",
  borderRadius: "8px",
  padding: "18px 22px",
  position: "relative",
};
const metaRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontSize: "0.82rem",
  marginBottom: "6px",
};
const timeStyle: React.CSSProperties = { color: "#666", fontVariantNumeric: "tabular-nums" };
const itemTitleStyle: React.CSSProperties = {
  fontSize: "1.05rem",
  fontWeight: 600,
  margin: "0 0 6px",
};
const itemBodyStyle: React.CSSProperties = {
  margin: 0,
  lineHeight: 1.55,
  color: "#2a2a2a",
};
const correctionRefStyle: React.CSSProperties = {
  marginTop: "10px",
  marginBottom: 0,
  fontSize: "0.85rem",
  color: "#7a5200",
};
const correctionIdStyle: React.CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: "0.8rem",
};
const footerStyle: React.CSSProperties = { marginTop: "48px" };
const footnoteStyle: React.CSSProperties = {
  fontSize: "0.78rem",
  color: "#888",
  fontStyle: "italic",
};

function kindBadgeStyle(kind: EvolutionEvent["kind"]): React.CSSProperties {
  const base: React.CSSProperties = {
    padding: "2px 8px",
    borderRadius: "10px",
    fontSize: "0.72rem",
    fontWeight: 500,
    textTransform: "lowercase",
    letterSpacing: "0.02em",
  };
  const palette: Record<EvolutionEvent["kind"], React.CSSProperties> = {
    commit: { background: "#eef3ec", color: "#2f5a3a" },
    correction: { background: "#fcf3e0", color: "#7a5200" },
    "memory-revision": { background: "#edf0f7", color: "#2c4a80" },
    "adr-landed": { background: "#f0eaf5", color: "#5a2f70" },
    tick: { background: "#f2f2ee", color: "#444" },
  };
  return { ...base, ...palette[kind] };
}
