# Vulnerability + dependency scanner landscape — Zeta fit, 2026-04-22

**Context:** Aaron 2026-04-22, following the GITHUB-ACTIONS-SAFE-
PATTERNS + SUPPLY-CHAIN-SAFE-PATTERNS absorptions: *"backlog
[research] vulnerability and dependency scanners like OpenVAS and
and other alternatives, we should likely adopt one or multiple if
they are orthogonal."*

**Scope.** Map the 2026 scanner landscape against Zeta's actual
third-party-code ingress surface (NuGet packages, GitHub Actions,
toolchain installers, MSBuild `.targets`, OS packages on CI
runners). Identify an orthogonal short-list worth adopting and
name the ones that do not fit the factory's current shape.

**Contributor:** Claude Code (Opus 4.7), sourcing from WebSearch
over current (April 2026) sources. First pass; subject to
cadenced re-read per FACTORY-HYGIENE rows 40-41.

**Headline finding.** Tool-to-tool coverage overlap is only ~60-
65% — running multiple scanners genuinely catches more than one.
Orthogonality is real, not marketing.

**Second headline finding.** Trivy — one of the most popular SCA
scanners and a candidate we would otherwise recommend — was
compromised on 2026-03-19 (TeamPCP attack, 76-of-77 mutable tags
force-pushed on `aquasecurity/trivy-action`, malicious binary
`v0.69.4` published through a compromised service account). The
attack pattern is exactly what our own `gha-action-mutable-tag`
Semgrep rule is designed to prevent, and it strengthens the
"content-review-is-load-bearing" policy in
`docs/security/SUPPLY-CHAIN-SAFE-PATTERNS.md` §The one rule you
cannot break. **Trivy adoption is deferred pending a formal
post-mortem + rebuild-trust timeline** — the ecosystem uses
Trivy to check other software; a compromised scanner is not a
risk class we absorb lightly.

## Categories of scanner — what they actually scan

Lumping scanners together hides real orthogonality. Five
distinct categories:

1. **Software Composition Analysis (SCA)** — scans declared
   dependencies against a vulnerability database
   (OSV.dev / GitHub Advisory / CPE / NVD). Inputs: `*.fsproj` /
   `*.csproj` / `Directory.Packages.props` / `packages.lock.json`
   / `package.json` / `pyproject.toml`. Outputs: CVE list +
   fixed-version recommendations.
2. **SBOM generation** — produces a machine-readable Software
   Bill of Materials (SPDX / CycloneDX) from built artefacts.
   Enables downstream consumers to run their own SCA. Inputs:
   built binaries or source tree. Outputs: SBOM file.
3. **Vulnerability assessment (VA)** — network / host scanner
   that probes running services for known CVEs on exposed
   infrastructure. Inputs: IP ranges, hostnames. Outputs: host-
   level vulnerability report.
4. **Dynamic application security testing (DAST)** — runs
   attacks against a live application and observes responses.
   Inputs: deployed endpoints. Outputs: exploited-or-not reports.
5. **Supply-chain anomaly / signal detection** — watches for
   typosquats, maintainer-account changes, sudden dependency
   growth, package-behaviour changes. Inputs: dependency graph
   + ecosystem telemetry. Outputs: risk scores.

Zeta's current shape (a pre-v1 F#/C# library factory shipped as
NuGet packages; no hosted services; ephemeral GitHub-hosted CI
runners) determines which categories matter:

| Category | Relevant to Zeta? | Why |
|---|---|---|
| SCA | **Yes — primary** | NuGet + GitHub Actions are our biggest third-party ingress. |
| SBOM | **Yes — publish-blocking over time** | Adopters and regulators increasingly demand SBOMs (NTIA minimum elements, EU CRA). |
| VA (OpenVAS / Nessus) | **No** | No hosted infra; GH-hosted runners are ephemeral and managed by GitHub. |
| DAST (ZAP / Burp) | **No** | No web app / service endpoint. Reconsider when an Aurora service lands. |
| Anomaly detection | **Watch** | Complementary to SCA; currently a watchlist item. |

So **OpenVAS and its peers do not fit Zeta today.** They are
correct tools for their category; that category is not ours
until we stand up hosted infrastructure.

## Tool-by-tool fit assessment

### SCA — the primary category

| Tool | License | NuGet support | Zeta-fit | Notes |
|---|---|---|---|---|
| `dotnet list package --vulnerable` | MIT (.NET SDK) | Native | **HIGH — adopt now** | Free, no install, uses GitHub Advisory. Trivial CI integration (`--format json` + exit non-zero on any finding). No new dependency to trust. |
| **OSV-Scanner** (Google) | Apache-2.0 | Partial today | **HIGH — adopt after `packages.lock.json`** | Uses OSV.dev (Google's de-duplicated vuln DB). Low false-positive rate. Known limitation (`google/osv-scalibr#618`): NuGet detection keys on `packages.lock.json`, not `Directory.Packages.props`. Blocked-by SDL #7 (lockfile adoption) today. |
| **Trivy** (Aqua Security) | Apache-2.0 | Strong | **DEFER — compromised March 2026** | Most-starred OSS scanner (32k+). Compromised 2026-03-19 (TeamPCP). See `docs/security/INCIDENT-PLAYBOOK.md` canonical-incident list. Revisit after ecosystem rebuild-trust signals. |
| **Grype** (Anchore) | Apache-2.0 | Via Syft SBOM | **LOW** | Container-first; redundant with OSV-Scanner for our surface. Pair with Syft only if we publish SBOMs that need scanning. |
| **Snyk** | Proprietary (free tier for OSS) | Strong | **LOW** | Telemetry + account-coupling make it heavier-weight than the factory's trust model. Reconsider if a commercial sponsor pays. |
| **Dependabot** (GitHub-native) | Free on GitHub | Strong | **ADOPT AS BASELINE** | Already available on the repo (Security → Dependabot). Zero install; enable via `.github/dependabot.yml`. Partial SBOM-style coverage via GitHub's native graph. |

### SBOM generation

| Tool | License | NuGet fidelity | Zeta-fit | Notes |
|---|---|---|---|---|
| **Syft** (Anchore) | Apache-2.0 | Multi-ecosystem | **MEDIUM — adopt when SBOM becomes publish-blocking** | Most versatile; outputs SPDX + CycloneDX. Some NuGet detection still via PE-header inspection, not .csproj; fidelity improving. |
| **CycloneDX/cyclonedx-dotnet** | Apache-2.0 | Native | **HIGH — adopt when SBOM becomes publish-blocking** | OWASP-blessed, .NET-specific; understands `Directory.Packages.props` out of the box. Ships via NuGet + Docker Hub. |
| **Microsoft SBOM Tool** (`sbom-tool`) | MIT | Native | **WATCH** | First-party .NET tool; simpler than CycloneDX project but less feature-complete. Candidate if we want a single-maintainer trust story (Microsoft). |
| **cdxgen** (OWASP) | Apache-2.0 | Broad | **WATCH** | Multi-ecosystem CycloneDX generator; overlapping with Syft. |

### Anomaly / supply-chain signal

| Tool | License | Zeta-fit | Notes |
|---|---|---|---|
| **OSSF Scorecard** | Apache-2.0 | **MEDIUM — adopt** | Scores the Zeta repo itself AND our dependencies against 18 supply-chain heuristics (branch protection, SAST coverage, maintainer diversity, pinned deps). Publishes a GitHub Action (would itself need SHA-pinning per our discipline). Complementary to SCA — tells you *about project health*, not CVEs. |
| **Socket.dev** | Freemium | **LOW — watch** | Typosquat + behaviour-change detection. JS/Python-first; NuGet story weak. Reconsider when they improve NuGet coverage. |

## Orthogonality matrix

What each **adopt-now** tool covers on Zeta's surface:

|  | NuGet CVEs | GH Action CVEs | Repo-health signals | SBOM for consumers | Policy gating |
|---|---|---|---|---|---|
| Dependabot | ✓ | ✓ | partial | — | PR-based (no hard gate) |
| `dotnet list --vulnerable` | ✓ | — | — | — | CI exit code |
| OSSF Scorecard | — | — | ✓ | — | advisory |
| (later) OSV-Scanner | ✓ | ✓ | — | — | CI exit code |
| (later) cyclonedx-dotnet | — | — | — | ✓ | — |

Dependabot + `dotnet list --vulnerable` is a real double-check,
not redundancy — Dependabot is PR-based (nudges on new vulns),
`dotnet list` is CI-gate (hard-fails the build on any vuln).
Adding OSV-Scanner (post-lockfile) extends NuGet coverage beyond
the GitHub Advisory-only source. Adding Scorecard adds a
different axis entirely (project-health vs known-CVE).

## Short-list recommendation

**Adopt now (no new blocking dependency):**

1. **Enable Dependabot alerts + PR updates** — configure
   `.github/dependabot.yml` for `nuget`, `github-actions`, and
   `pip` (for our Python linting / Semgrep install on CI).
   Schedule weekly. Auto-merge disabled; Mateo (security-
   researcher) triages.
2. **Add `dotnet list package --vulnerable` to the gate** —
   one new lint job in `gate.yml`; hard-fails the build on any
   finding. Data source is GitHub Advisory, same as Dependabot,
   so false-positive risk is low.
3. **Add OSSF Scorecard** — runs weekly, uploads to
   Security → Code scanning. Complementary axis (project
   health, not CVEs). SHA-pin its GitHub Action per our
   existing discipline; content-review the script at first pin.

**Adopt after SDL #7 deliverable lands:**

1. **OSV-Scanner** — unlocks when `packages.lock.json` is
   committed. Runs on every PR; hard-fails on severity ≥ HIGH.
   Data source is OSV.dev (de-duplicated across ecosystems), so
   catches some advisories that GitHub Advisory misses.

**Adopt when SBOM becomes publish-blocking** (adopter pressure
or EU CRA mandate):

1. **`CycloneDX/cyclonedx-dotnet`** — native to our ecosystem,
   `Directory.Packages.props`-aware; generate on package-publish,
   attach as a release asset.

**Watch, do not adopt today:**

- **Trivy** — deferred per 2026-03-19 compromise; revisit after
  post-mortem + rebuild-trust signals.
- **Syft / Grype** — keep on radar; currently redundant with
  OSV-Scanner + Dependabot for our pre-container shape.
- **Microsoft SBOM Tool** — first-party candidate; lower
  priority than CycloneDX project (which is OWASP-blessed).
- **Socket.dev / cdxgen** — NuGet story still weak vs dedicated
  .NET tooling.

**Decline:**

- **OpenVAS / Nessus / Tenable / InsightVM** — network VA; no
  hosted infra to scan.
- **ZAP / Burp Suite** — DAST; no web app / service endpoint.
- **Snyk commercial** — heavier-weight than the factory's trust
  model; reconsider only if a commercial sponsor pays.

## Ripples into other docs

1. **`docs/security/SUPPLY-CHAIN-SAFE-PATTERNS.md` canonical
   incident list** — add Trivy TeamPCP (2026-03-19) alongside
   tj-actions/changed-files (CVE-2025-30066). Both are
   mutable-tag attacks; both strengthen the SHA-pin +
   content-review discipline.
2. **`docs/security/INCIDENT-PLAYBOOK.md` Playbook A** (third-
   party GHA action compromise) — cross-reference the Trivy
   incident as a second worked example of the playbook's
   relevance.
3. **BACKLOG rows** — five adopt-track items filed with
   effort sizing + owners (see §Short-list).
4. **`docs/TECH-RADAR.md`** — the three adopt-now items move
   into Assess (with rationale) pending shipped-in-CI
   evidence for Trial promotion.

## Cadence

Re-read this research doc alongside FACTORY-HYGIENE rows 40-41
(GHA safe-patterns + supply-chain safe-patterns upstream re-read)
every 5-10 rounds. New scanner-compromise incidents (Trivy-style)
and new orthogonality entrants (OSSF Scorecard, Socket.dev)
get absorbed on that cadence.

## Honest limits of this first pass

- Did not run any scanner against Zeta yet — the tool fit
  assessments are based on documented capabilities, not
  empirical Zeta runs. Next sweep: actually run `dotnet list
  --vulnerable` + a local OSSF Scorecard against this repo and
  record the finding count as baseline.
- The Trivy incident write-ups are all from April 2026 post-
  mortems; no formal Aqua Security remediation timeline yet.
  Deferral is conservative by default.
- OSV-Scanner's NuGet limitation (`google/osv-scalibr#618`) was
  open as of early 2026; status should be re-checked before
  adoption — the fix may have landed.

## Sources

- [12 Best Open-Source SCA Tools 2026](https://appsecsanta.com/sca-tools/open-source-sca-tools)
- [OSV-Scanner Review 2026](https://appsecsanta.com/osv-scanner)
- [OSV-Scanner vs Trivy — google/osv-scanner#2330](https://github.com/google/osv-scanner/issues/2330)
- [Top 10 OpenVAS Alternatives — G2](https://www.g2.com/products/openvas/competitors/alternatives)
- [6 Top Open-Source Vulnerability Scanners — eSecurity Planet](https://www.esecurityplanet.com/networks/open-source-vulnerability-scanners/)
- [SBOM Generation Tools Compared — Sbomify](https://sbomify.com/2026/01/26/sbom-generation-tools-comparison/)
- [CycloneDX/cyclonedx-dotnet](https://github.com/CycloneDX/cyclonedx-dotnet)
- [Syft — anchore/syft](https://github.com/anchore/syft)
- [osv-scanner NuGet limitation — google/osv-scalibr#618](https://github.com/google/osv-scalibr/issues/618)
- [dotnet list package --vulnerable](https://github.com/NuGet/Home/wiki/dotnet-list-package---vulnerable/837e9313842e367fdeb2dcb9ab8d555673307302)
- [Dependabot alerts — GitHub Docs](https://docs.github.com/en/code-security/dependabot/dependabot-alerts)
- [Trivy supply chain compromise advisory — aquasecurity/trivy GHSA-69fq-xp46-6x23](https://github.com/aquasecurity/trivy/security/advisories/GHSA-69fq-xp46-6x23)
- [Trivy Compromise — Wiz Blog](https://www.wiz.io/blog/trivy-compromised-teampcp-supply-chain-attack)
- [Trivy Supply Chain Compromise — Microsoft Security Blog](https://www.microsoft.com/en-us/security/blog/2026/03/24/detecting-investigating-defending-against-trivy-supply-chain-compromise/)
- [Trivy Supply Chain Attack — Palo Alto Networks](https://www.paloaltonetworks.com/blog/cloud-security/trivy-supply-chain-attack/)
