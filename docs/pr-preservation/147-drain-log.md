# PR #147 review-drain log

Git-native preservation of the 7 unresolved review threads
drained on `feat/servicetitan-factory-demo-api-csharp` at
2026-04-24. One entry per thread; each ends in a paired
`resolveReviewThread` mutation. Retained as part of the PR's
own commits so the audit trail survives regardless of GitHub
UI state (Otto-238 retractability + glass-halo).

---

### Thread PRRT_kwDOSF9kNM59eE_k
- **Reviewer**: copilot-pull-request-reviewer
- **File**: `.claude/commands/btw.md`:10
- **Original comment**: P1: This command doc uses the human maintainer’s name directly (e.g., “(Aaron)”), but the repo’s operational standing rule is “No name attribution in code, docs, or skills” — use role references instead (docs/AGENT-BEST-PRACTICES.md:284-292). Please rewrite to “human maintainer” (and apply the same sweep to other new docs/skills in this PR that use the name).
- **Outcome**: fix-inline
- **Your reply**: Fixed — swept every name reference in `.claude/commands/btw.md` to "human maintainer" / "the maintainer". Checked the rest of the PR: only `btw.md` is a new doc/skill in this PR with name attribution; other new docs (`samples/FactoryDemo.Api.CSharp/**`, `tools/audit/live-lock-audit.sh`) already use role-refs. Fix in the drain commit.
- **Resolution commit**: drain commit on `feat/servicetitan-factory-demo-api-csharp`

### Thread PRRT_kwDOSF9kNM59eFAE
- **Reviewer**: copilot-pull-request-reviewer
- **File**: `tools/audit/live-lock-audit.sh`:54
- **Original comment**: P2: `git diff-tree --no-commit-id --name-only -r` does not report paths for the repository’s root commit unless `--root` is provided. If the window includes the root commit (small repos / large windows), it will be misclassified as having no files. Consider adding `--root` to make classification correct for all commits.
- **Outcome**: fix-inline
- **Your reply**: Fixed — added `--root` to the `git diff-tree` invocation and expanded the comment to explain why. Otherwise the root commit silently misclassifies to OTHR (no files). Thanks.
- **Resolution commit**: drain commit on `feat/servicetitan-factory-demo-api-csharp`

### Thread PRRT_kwDOSF9kNM59eFAU
- **Reviewer**: copilot-pull-request-reviewer
- **File**: `samples/FactoryDemo.Api.CSharp/Program.cs`:21
- **Original comment**: P1: Root endpoint parity issue — the F# sibling includes "/" in its advertised `endpoints` list, but this C# list omits it. That makes `/` JSON differ between implementations, contradicting the parity guarantee. Consider adding "/" to this list (and updating the smoke-test expected length accordingly), or removing it from the F# sibling so both match.
- **Outcome**: fix-inline
- **Your reply**: Fixed — added `"/"` at the head of the C# endpoints list (9 entries, matching F#'s list order), bumped `smoke-test.sh` expected length from 8 to 9, and updated the script header comment from "all 8 API endpoints plus the root `/`" to "all 9 endpoints". Parity restored.
- **Resolution commit**: drain commit on `feat/servicetitan-factory-demo-api-csharp`

### Thread PRRT_kwDOSF9kNM59eFAn
- **Reviewer**: copilot-pull-request-reviewer
- **File**: `samples/FactoryDemo.Api.CSharp/smoke-test.sh`:38
- **Original comment**: P2: The comment claims `mktemp` "works on hosts without a writable /tmp", but `mktemp -t ...` still requires a writable temp directory (typically `$TMPDIR` or `/tmp`). Suggest rewording to avoid implying it works without any writable temp dir (or explicitly mention it uses the system temp dir).
- **Outcome**: fix-inline
- **Your reply**: Fixed — reworded the comment to "writes into the host's system temp dir (honouring `$TMPDIR` when set, falling back to `/tmp`)" so the behaviour is accurately described without the misleading "without a writable /tmp" phrasing.
- **Resolution commit**: drain commit on `feat/servicetitan-factory-demo-api-csharp`

### Thread PRRT_kwDOSF9kNM59eFA2
- **Reviewer**: copilot-pull-request-reviewer
- **File**: `samples/ServiceTitanCrm/ServiceTitanCrm.fsproj`:5
- **Original comment**: P1: Repo convention is that demos stay company-neutral (no `samples/ServiceTitan*/` dirs / namespaces). This project name and RootNamespace are ServiceTitan-specific, which the repo feedback explicitly calls out to avoid. Please rename this sample to a generic `FactoryDemo.*`-style name (folder, project, RootNamespace) per `memory/feedback_open_source_repo_demos_stay_generic_not_company_specific_2026_04_23.md:59-66`.
- **Outcome**: fix-inline
- **Your reply**: Fixed — renamed `samples/ServiceTitanCrm/` → `samples/FactoryDemo.Crm/`, `ServiceTitanCrm.fsproj` → `FactoryDemo.Crm.fsproj`, module `Zeta.Samples.ServiceTitanCrm.Program` → `Zeta.Samples.FactoryDemo.Crm.Program`, `RootNamespace` → `Zeta.Samples.FactoryDemo.Crm`. Updated `Zeta.sln` project entry, the ServiceTitan-CRM comment in `Program.fs`, and the `tests/Tests.FSharp/Operators/CrmScenarios.Tests.fs` doc comment. Also removed stray `samples/ServiceTitanFactoryApi/` bin+obj residue left over from an earlier rename.
- **Resolution commit**: drain commit on `feat/servicetitan-factory-demo-api-csharp`

### Thread PRRT_kwDOSF9kNM59eFR4
- **Reviewer**: chatgpt-codex-connector
- **File**: `src/Core/SignalQuality.fs`:175
- **Original comment**: P1: Avoid quarantining short text due gzip header overhead. `compressionRatio` clamps any ratio above `1.0` to `1.0`, and `compressionMeasure` maps that directly to severity, so short non-empty inputs (where gzip header/trailer overhead exceeds raw length) are deterministically scored as maximally suspicious. In practice this means many legitimate short payloads get `Quarantine`, which skews composite quality scoring and can trigger false failures even when content is fine.
- **Outcome**: fix-inline
- **Your reply**: Fixed — added a named `compressionMinInputBytes = 64` threshold. Inputs shorter than 64 bytes short-circuit to `0.0` (neutral Pass) in both `compressionRatio` and `compressionMeasure`, with explicit evidence noting the gzip-header-dominates regime. Rationale inline at the constant's docstring (gzip header 10 B + trailer 8 B + deflate overhead; 64 B leaves enough payload that honest incompressible data can still score high). Existing tests remain valid — the 26-char clamp test asserts `0.0 ≤ ratio ≤ 1.0` which `0.0` satisfies, and the end-to-end structured-vs-fluff test uses inputs well above threshold.
- **Resolution commit**: drain commit on `feat/servicetitan-factory-demo-api-csharp`

### Thread PRRT_kwDOSF9kNM59eFR8
- **Reviewer**: chatgpt-codex-connector
- **File**: `samples/FactoryDemo.Api.CSharp/Program.cs`:24
- **Original comment**: P2: Include root path in C# endpoint index for parity. The C# root metadata omits `"/"` from `endpoints`, while the F# sibling publishes it, so the advertised contract is no longer parity-compatible across the two sample APIs. Any consumer using root endpoint discovery (or parity checks) will see different endpoint sets despite the sample claiming interchangeable behavior.
- **Outcome**: fix-inline (same fix as PRRT_kwDOSF9kNM59eFAU above)
- **Your reply**: Fixed — added `"/"` to the C# endpoints list (same fix as Copilot's P1 on the same file). C# list is now 9 entries in F#-matching order; smoke-test length expectation updated from 8 → 9. Parity restored.
- **Resolution commit**: drain commit on `feat/servicetitan-factory-demo-api-csharp`

---

All 7 threads: fix-inline. No BACKLOG rows owed.
