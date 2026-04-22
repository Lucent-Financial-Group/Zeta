/// Recent self-directed-evolution events the demo renders on first load.
///
/// First-tick scope: hand-seeded from the five most recent ticks on `main`
/// and this session's course-correction-into-UI-demo. Follow-up ticks will
/// generate this list at build time from `git log` + `docs/hygiene-history/
/// loop-tick-history.md` + memory revision blocks so it stays live.

export type EvolutionKind =
  | "commit"
  | "correction"
  | "memory-revision"
  | "adr-landed"
  | "tick";

export type EvolutionEvent = {
  readonly id: string;
  readonly at: string;
  readonly kind: EvolutionKind;
  readonly title: string;
  readonly narrative: string;
  readonly correctionOf?: string;
};

export const recentEvolutions: readonly EvolutionEvent[] = [
  {
    id: "ui-demo-first-render",
    at: "2026-04-22",
    kind: "correction",
    title: "UI demo scaffold — corrected demo-subject from CRM-algebra to factory-itself",
    narrative:
      "Agent was mid-scaffold of a Zeta.Core F# CRM-algebra sample when maintainer flagged that the demo subject is the factory's own self-directed evolution, not a third-party domain. Wrong scaffold removed; React + bun + TS scaffold seeded against the witnessable-evolution memory.",
    correctionOf: "samples/CrmDemo (unshipped)",
  },
  {
    id: "autoloop-34",
    at: "2026-04-22",
    kind: "commit",
    title: "BACKLOG P1 — secret-handoff protocol",
    narrative:
      "Env-var for ephemeral / dev-loop, password-manager CLI for stable secrets (1Password `op` preferred — LastPass dropped due to 2022 vault-exfiltration breach), Let's-Encrypt + ACME for certificates, PKI-bootstrap explicitly deferred.",
  },
  {
    id: "autoloop-32",
    at: "2026-04-22",
    kind: "commit",
    title: "Emulator substrate research first-pass",
    narrative:
      "Architectural survey of RetroArch/MAME/Dolphin with four factory-relevant patterns absorbed. Secret-handoff protocol gap surfaced mid-tick.",
  },
  {
    id: "autoloop-30",
    at: "2026-04-22",
    kind: "commit",
    title: "Stacking-risk framework + bottleneck-principle posture change + CLI-DX-cascade",
    narrative:
      "Three architectural signals absorbed in one tick: stacking-risk decision framework published as first-pass research doc, grey-zone judgment posture made agent-default (gray-alone no longer escalates), and zero-doc CLI cascade pattern named.",
  },
  {
    id: "autoloop-29",
    at: "2026-04-22",
    kind: "commit",
    title: "IceDrive/pCloud substrate grant — two-layer authorization exercised",
    narrative:
      "Maintainer granted 10 TB × 2 lifetime-paid substrate access. Warm-decline on bulk-copy-with-no-task; task-binding preserved. Same shape as prior ROM-offer auto-loop-24.",
  },
];
