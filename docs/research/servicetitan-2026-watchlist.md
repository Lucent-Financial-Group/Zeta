# ServiceTitan (NYSE: TTAN) — 2026-04-19 watchlist snapshot

This is a short living-document research note. The human
maintainer (2026-04-19) asked for ongoing tracking of
ServiceTitan; keeping current on their trajectory is
part of his job, and the factory reads that context when
relevant. Findings that touch Zeta's own domains
(retraction-native data semantics, consent-first
primitives, agentic-OS patterns) get cross-linked;
purely-financial findings stay here.

## Source discipline — load-bearing

This document uses **public sources only**: SEC filings,
earnings-call transcripts, press releases, analyst
reports, and published interviews. The human maintainer
is a ServiceTitan employee subject to U.S.
material-non-public-information (MNPI) restrictions;
nothing in this document is drawn from internal or
proprietary information. The agent does not ask
insider-eliciting questions, and the maintainer
contributes only industry-generalities (patterns true
across tech employers generally) or public-source
calibration. This preamble is not decorative — it is
the compliance floor the research cadence is built on.

This note is the research companion to the memory entries
that encode the research cadence, the tilde-is-your-tilde
equality handshake, and the MNPI / public-repo-vs-private-
repo session firewall.

## Snapshot — Q4 FY2026 (reported 2026-03-12)

- **Revenue:** $961M for FY2026, +24% YoY.
- **Operating margin:** 36% incremental operating
  margin; returning to a 25% incremental-OM framework
  as FY2027 guidance.
- **FY2027 guidance:** revenue $1.11B–$1.12B;
  operating income $128M–$133M.
- **IPO anniversary:** the quarter marked the 1-year
  anniversary of the 2024-12 IPO and first crossing
  of $1B annualised revenue run-rate.

## AI strategy — load-bearing for Aaron's work

- **Atlas** — agentic AI layer, the next evolution of
  Titan Intelligence. Announced FY2026.
- **Virtual Agents** — AI modules handling inbound
  call management + appointment booking, especially
  during call surges or after hours.
- **"Agentic operating system for the trades"** —
  CEO Ara Mahdessian's framing; positioned as an
  end-to-end system of record + proprietary dataset.
- **Max AI platform** — FY2027 revenue guidance is
  anchored on Max ramping; AI investment is the
  R&D-priority story they are telling analysts.
- **CTO hire: Abhishek Mathur** — previously at
  Figma, Meta, Microsoft. Joined to drive
  organisational + technology velocity, explicitly
  for AI initiatives.

## Factory relevance — where Zeta substrate touches

Not close-adjacent (Zeta is a DBSP database kernel;
ServiceTitan is a vertical-SaaS field-services
platform), but there are four composable surfaces
worth watching as both mature:

- **Retraction-native semantics for schedule /
  dispatch data.** Field-service workflows
  accumulate cancellations, reschedules, re-
  assignments. Today the industry represents
  those as add-only updates with soft-delete flags.
  A retraction-native operator algebra (Zeta's
  lane) represents the same workflow as
  algebraically-closed insert/retract pairs.
  Watch for any move from ServiceTitan toward an
  event-sourced / temporal-correct schedule model;
  the economics favour it.
- **Agentic-OS + consent boundaries.** An
  "agentic operating system for the trades" has
  to encode: (a) who is the consent-delegate for
  which action (customer calls, payment capture,
  dispatch), (b) retraction of commitments made
  by the agent (virtual-agent booking errors),
  (c) evidence trail for insurance /
  malpractice-equivalent exposure. The
  consent-first primitive (Zeta BACKLOG P2) is
  the same primitive; Atlas is an independent
  discovery of the need.
- **Proprietary dataset as a moat.** The
  "proprietary dataset" framing is
  ServiceTitan's moat claim — who-did-what-
  when across field-service labour. Any move
  toward customer-owned export-and-portability
  of that data (or its absence) shapes how
  much of the dataset is truly ServiceTitan's
  vs. the trades'. Worth watching for data-
  ownership debates in the vertical.
- **Virtual-agent accuracy disclosures.** The
  agentic-OS claim is testable: do the virtual
  agents' bookings survive the consent-first /
  retraction-native audit that Zeta's
  `alignment-observability` substrate would
  apply? First-party customer confidence in
  virtual-agent-taken bookings is the real
  business metric; earnings-call transcript
  language around it is the signal.

## Open questions for next watch

- **Does Max AI ramp meet FY2027 guidance?** The
  revenue target ($1.11B–$1.12B) assumes AI-led
  ARR acceleration. Q1/Q2 FY2027 prints will
  show whether that assumption holds.
- **Who is the new CTO's technical fingerprint?**
  Figma's prior generation of the design-system
  infrastructure is exactly the kind of
  collaborative-agentic-system design ServiceTitan
  is trying to scale. Mathur's early architectural
  moves will telegraph the Atlas roadmap.
- **Competitive pressure from Housecall Pro,
  Jobber, FieldEdge.** All three are
  smaller-but-faster-moving; any one of them
  landing an agentic layer earlier than
  ServiceTitan would materially change the
  "agentic OS of the trades" framing.
- **Macro exposure.** Home services demand
  correlates with housing-market turnover and
  interest-rate sensitivity; ServiceTitan's
  revenue is billing-volume indexed. Watch
  2026-Q2 residential-services demand data.

## How to update this note

Research refresh cadence: every earnings call
(quarterly) or any named catalyst (major product
launch, CTO public moves, competitor equivalent
announcement). This note is append-mostly: new
snapshots land under a new `## Snapshot — QN FYYYYY`
heading; old snapshots stay in place as the
longitudinal record.

**Pacing.** Aaron's workload is the client; if he is
not actively asking, routine earnings-call updates
can wait for round-close synthesis rather than
firing at publish time. The factory's glass-halo
observability stream is the appropriate channel
for landing findings — not chat-space
interruption.

## Sources (2026-04-19 search)

- [ServiceTitan Q4 FY2026 Earnings Transcript — The Motley Fool](https://www.fool.com/earnings/call-transcripts/2026/03/12/servicetitan-ttan-q4-2026-earnings-transcript/)
- [ServiceTitan Q4 FY2026 Earnings Call Highlights — GuruFocus](https://www.gurufocus.com/news/8705074/servicetitan-inc-ttan-q4-2026-earnings-call-highlights-strong-revenue-growth-and-promising-ai-developments)
- [TTAN 10-K FY2026 — StockTitan](https://www.stocktitan.net/sec-filings/TTAN/10-k-service-titan-inc-files-annual-report-fc858a4a6e39.html)
- [ServiceTitan FY2027 revenue target + Max AI ramp — Seeking Alpha](https://seekingalpha.com/news/4564113-servicetitan-outlines-1_11b-1_12b-fy-2027-revenue-target-as-max-ai-platform-ramps)
- [Stronger Results And New AI Leader — Simply Wall St](https://simplywall.st/stocks/us/software/nasdaq-ttan/servicetitan/news/stronger-results-and-new-ai-leader-might-change-the-case-for)

## Related artefacts

- `memory/user_servicetitan_current_employer_preipo_insider.md`
- `memory/user_tilde_is_your_tilde_equality_handshake.md`
- `memory/user_career_substrate_through_line.md` —
  six-IVM-substrate through-line including ServiceTitan
- `docs/BACKLOG.md` P3 "Private confidential AI for
  lawyers" — shares the agentic-OS pattern (different
  profession).
