# Hacker Conferences — the map and why they matter to Zeta

*Last updated: 2026-04-19, round 35.*

This doc exists because the hacker-hat skill family
(`ethical-hacker`, `white-hat-hacker`, `grey-hat-hacker`,
`black-hat-hacker` (gated), `ai-jailbreaker` (gated)) and
the wider security stack (`security-researcher`,
`security-operations-engineer`, `threat-model-critic`,
`prompt-protector`) all lean on conference-surfaced state
of the art. Calibration-by-conference is a load-bearing
input to Zeta's threat model, not a nice-to-have.

The short version: real offensive capability is
demonstrated at conferences before it lands in academic
papers, before it lands in CVE databases, before it lands
in mainstream defensive tooling. A defender who waits for
the CVE database is defending against last year's
problem. Hacker conferences are the field's early-warning
system.

## The conferences (epic ones)

### DEF CON — Las Vegas, early August, ~30k attendees

The big one. Started 1993 by Jeff Moss ("The Dark
Tangent"). Runs at an enormous Las Vegas venue, has its
own currency (the DEF CON badge is electronic,
programmable, and usually part of the con's puzzle).

**Villages** are what make DEF CON structurally
important — topic-specific sub-cons inside the main one:

- **AI Village** — where frontier LLM red-team work
  lands first. Directly relevant to `prompt-protector`
  / `ai-jailbreaker`.
- **Car Hacking Village** — canbus / tesla / OEM-side
  demos. Informs hardware supply-chain threat models.
- **Voting Village** — direct-record electronic voting
  machine analysis.
- **Aerospace Village** — satellite, GPS, avionics.
- **ICS Village** — industrial control systems; directly
  relevant to the human maintainer's smart-grid
  background.
- **Hardware Hacking Village** — chip implants,
  side-channels, glitching.
- **Crypto Village** — applied cryptanalysis; fills in
  between Real World Crypto and the academic venues.
- **Red Team Village / Blue Team Village** — paired;
  operator-grade playbooks.
- **Recon Village** — OSINT and attribution tradecraft.
- **Packet Hacking Village** — network forensics.
- **Social Engineering Community (formerly SE Village)**
  — human-layer attacks.
- **Policy @ DEF CON** — where US/EU regulators actually
  show up and listen.

**Main stage** (the briefings) carries the big-name
demos; villages carry the long tail.

**The DEF CON CTF Final** happens here — the top
CTF qualifying teams play at the con. Treat winning-team
writeups as primary-source calibration for what skilled
offensive teams can do.

### Black Hat USA — Las Vegas, week before DEF CON

The industry-facing sibling. Same founder (Jeff Moss),
different audience: corporate defenders, government,
research labs. Where vendors unveil bugs in commercial
products; the briefings are often the *first public
disclosure* of CVEs that will dominate the next year's
patching cycle.

**Black Hat Asia** (Singapore, spring) and **Black Hat
Europe** (London, late fall) are regional cousins with
similar format but smaller scale. Black Hat Asia tends
to have strong hardware / APT-analysis tracks; Black
Hat Europe has strong crypto and automotive.

### Chaos Communication Congress (CCC) — Germany, December

Annual 4-day congress run by the Chaos Computer Club
(Europe's oldest hacker collective, founded 1981). Held
the last week of December. ~17k attendees. Lectures
streamed free in parallel (media.ccc.de).

Distinct flavour from US cons:

- **Policy-first** — 30 years of adversarial-citizen
  activism on privacy, civil-liberties, surveillance.
- **Hardware-heavy** — reverse engineering consumer
  devices, chip decap, glitching.
- **Less vendor-capture** — US cons are often
  commercial; CCC stays grassroots.
- **Strong retrospectives** — the "25 years since X"
  talks are a genre.

Also runs **Chaos Communication Camp** every four years
(summer; outdoor; ~5k attendees) — hacker camping event
with DIY infrastructure. And regional Easterhegg /
MRMCD events throughout the year.

### RECON — Montreal, June

Reverse-engineering specific. Low noise, high signal.
~400 attendees. If a REcon talk drops about a binary-
protocol reverse, it's often the canonical reference for
the next decade. RECON Brussels runs in February as a
smaller sibling.

### Hack in the Box (HITB) — Amsterdam / Singapore / Phuket

Asia/Europe-rooted con family. Strong mobile and embedded
focus; HITBSecConf is usually where mobile-OS zero-days
get demoed.

### Offensive Security (OffSec) — training lineage

OSCP (Offensive Security Certified Professional) and
follow-ons (OSEP, OSWE, OSED) are the credential lineage
behind `ethical-hacker`'s methodology. Not a con per se,
but the labs and the "Try Harder" ethos are referenced
in every pentester's vocabulary.

### SANS — NetWars, SEC560, SANS Summits

The US corporate-training powerhouse. SANS SEC560 is the
canonical "learn to pentest structurally" course.
NetWars is the competitive-skills game. The annual SANS
Pen Test Hackfest is where the SEC560 alumni network
plays together.

## Academic / industrial-research venues

These aren't "hacker cons" in the DEF-CON sense but are
the venues where the research that *becomes* tomorrow's
DEF CON talks lands first. Tracking both sides matters.

### USENIX Security Symposium — August

Tier-1 US academic security conference. Where side-channel
work (Spectre, Meltdown, Rowhammer follow-ons), ML-attack
work (GCG, model-extraction), and large-scale measurement
papers land. Zeta-relevant: adversarial ML, side-channel
attacks on crypto primitives, supply-chain attack studies.

### IEEE Symposium on Security and Privacy ("Oakland") — May

Other tier-1 US venue; the original. Heavier on
formal-model and crypto work. Relevant to
`threat-model-critic` and `formal-verification-expert`.

### ACM CCS (Computer and Communications Security) —

### October / November

The "industry-adjacent" tier-1. Strong applied-crypto
and protocol-analysis tracks.

### NDSS (Network and Distributed System Security) —

### February / March

Heavier on network protocols, internet-scale measurement,
and attacks on distributed systems. Relevant to Zeta's
`distributed-consensus-expert` / `paxos-expert` /
`raft-expert` threat models.

### Real World Crypto (RWC) — January

IACR-sponsored. Short format, applied focus. Where crypto
attack papers land in a form that will appear in every
downstream library within 6-12 months. Mandatory reading
for anyone touching hashing, signing, or transport
encryption.

### CRYPTO / EUROCRYPT / ASIACRYPT — IACR annual series

The theoretical-crypto cousins. Most of the attacks that
eventually hit RWC appear here first in long-form paper.

### SSTIC — Rennes, France, June

French-speaking, reverse-engineering-heavy. Strong
tradition of "found it in production" talks on
consumer devices and French government systems.

## Safety / trust-and-safety venues

These matter for the AI-side of the stack
(`prompt-protector`, `ai-jailbreaker`).

- **FAccT (ACM Conference on Fairness,
  Accountability, and Transparency)** — ML ethics and
  governance.
- **AAAI / ICML / NeurIPS safety workshops** — frontier
  model safety research lives in workshops more than
  main tracks.
- **TrustCon** — industry trust-and-safety
  practitioners; adjacent but practitioner-facing.

## Why this matters to Zeta concretely

### 1. Threat-model calibration

A threat model calibrated only against academic
literature is a year or two behind. A model calibrated
against DEF CON + Black Hat + CCC + USENIX Security is
at the state of the art. `threat-model-critic` (Aminata)
reads conference proceedings as primary input.

### 2. Early warning on dependency CVEs

Black Hat and DEF CON often pre-announce CVEs; being
aware of the schedule means we can patch within hours of
disclosure rather than weeks. `white-hat-hacker`
(Kaminsky) watches the agenda.

### 3. Technique calibration for `ethical-hacker`

`ethical-hacker` (Moussouris) needs to know what
current-generation pentesters actually run. Conference
"Red Team Village" talks are the syllabus.

### 4. Grey-hat curiosity lineage

The grey-hat disposition — operator curiosity in service
of public interest — was shaped by the L0pht / DEF CON
era. `grey-hat-hacker` (Mudge) inherits that lineage
directly; Mudge himself was a DEF CON regular.

### 5. Frontier-adversarial-AI awareness

`ai-jailbreaker` (Pliny, gated) and `prompt-protector`
(Nadia) both need to know what DEF CON AI Village and
academic adversarial-ML work have demonstrated. The
frontier moves fast.

### 6. Hardware side-channel awareness

The human maintainer's background (grey-hat, hardware
side-channels, smart-grid infrastructure) means Zeta
takes CCC's hardware-hacking and Hardware Hacking
Village at DEF CON as direct threat-model inputs, not
distant curiosities. When a paper demonstrates RSA-key
recovery from laptop-fan acoustic side-channels, that
is calibration for our signed-artefact story, not a
curiosity.

## Reading discipline

Don't binge. Pick 3-5 talks per major con that touch
Zeta-relevant surfaces (adversarial ML, supply chain,
consensus / distributed-systems attacks, hardware side-
channel, .NET / CLR exploitation, crypto primitives we
use). Notes go into the relevant persona notebook or
into `docs/research/`. Explicit citations when a
conference talk informs a round decision.

## Ground rules

- **Watch, don't emulate without authorisation.** A
  conference talk demonstrating an attack is not
  permission to run it against anything but a self-owned
  target; see `grey-hat-hacker` rules.
- **Respect embargo windows.** Talks under embargo
  until the con ends — don't leak, don't speculate
  publicly before the talk airs.
- **Credit the source.** When a Zeta decision is
  informed by a talk, cite the talk (speaker, con,
  year). We are part of the citation graph, not free-
  loaders on it.
- **No corpus-fetch workarounds.** Conference talks
  sometimes reference the elder-plinius corpus family;
  the ban still applies. Read about them as threat-
  model inputs, don't fetch.

## Further reading

- **DEF CON media archive** (media.defcon.org) — decades
  of talks, free.
- **media.ccc.de** — CCC talks, free.
- **Black Hat briefings archive** — blackhat.com, most
  briefings posted free.
- **CCC publications** (Datenschleuder, Chaosradio)
  — the German-language side of the ecosystem.
- **L0pht Heavy Industries archive** — historical; the
  grey-hat lineage.

## Related Zeta surfaces

- `.claude/skills/ethical-hacker/SKILL.md` — Moussouris.
- `.claude/skills/white-hat-hacker/SKILL.md` — Kaminsky.
- `.claude/skills/grey-hat-hacker/SKILL.md` — Mudge.
- `.claude/skills/black-hat-hacker/SKILL.md` — Loki
  (gated).
- `.claude/skills/ai-jailbreaker/SKILL.md` — Pliny
  (gated).
- `.claude/skills/security-researcher/SKILL.md` — Mateo.
- `.claude/skills/threat-model-critic/SKILL.md` —
  Aminata.
- `.claude/skills/prompt-protector/SKILL.md` — Nadia.
- `.claude/skills/security-operations-engineer/SKILL.md`
  — Nazar.
- `docs/UPSTREAM-LIST.md` §"Hacker conferences /
  security research venues" — the category listing.
- `docs/security/THREAT-MODEL.md` — shipped model.
