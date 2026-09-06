module PolicyAdmissibilityTests

open System
open System.IO
open global.Xunit
open Zeta.Core

let private policyAdmissibilityRepoRoot () =
    let mutable directory = DirectoryInfo(Path.GetDirectoryName(System.Reflection.Assembly.GetExecutingAssembly().Location))
    while not (isNull directory) && not (File.Exists(Path.Join(directory.FullName, "Zeta.sln"))) do
        directory <- directory.Parent
    if isNull directory then failwith "Could not locate repo root (Zeta.sln)." else directory.FullName

let private policyCarrier fileName =
    Path.Join(policyAdmissibilityRepoRoot (), "docs", "research", "data", fileName)

let private canonicalSelfReport () = policyCarrier "2026-09-06-policy-admissibility-v1-self-report.json"
let private canonicalEnvelope () = policyCarrier "2026-09-06-policy-admissibility-v1-tick-envelope.json"
let private canonicalBasis () = policyCarrier "2026-09-06-policy-admissibility-v1-constraint-basis.json"
let private canonicalFsharpReceipt () = policyCarrier "2026-09-06-policy-admissibility-v1-fsharp.json"
let private canonicalPythonReceipt () = policyCarrier "2026-09-06-policy-admissibility-v1-python.json"

[<Fact>]
let ``policy self-report admission is structural and preserves its attributed tick envelope`` () =
    match PolicyAdmissibility.admit (canonicalSelfReport ()) (canonicalEnvelope ()) (canonicalBasis ()) with
    | Ok receipt ->
        Assert.Equal(PolicyAdmissibility.AdmitForTicks, receipt.Decision)
        Assert.Equal("registry-derived-match", receipt.RegistryRelation)
        Assert.Equal(0, receipt.TimeDegree)
        Assert.Equal(0, receipt.SpaceDegree)
        Assert.Equal("admit-for-ticks", receipt |> PolicyAdmissibility.render |> fun text ->
            if text.Contains("\"decision\":\"admit-for-ticks\"") then "admit-for-ticks" else "missing")
        match PolicyAdmissibility.verifyCarrierFingerprints receipt (canonicalSelfReport ()) (canonicalEnvelope ()) (canonicalBasis ()) with
        | Ok() -> ()
        | Error detail -> failwithf "canonical carriers unexpectedly mismatched: %s" detail
        let fsharpBytes = File.ReadAllBytes(canonicalFsharpReceipt ())
        let pythonBytes = File.ReadAllBytes(canonicalPythonReceipt ())
        Assert.Equal<byte>(fsharpBytes, pythonBytes)
        let rendered = PolicyAdmissibility.render receipt
        Assert.Equal(File.ReadAllText(canonicalFsharpReceipt ()), rendered)
        match PolicyAdmissibility.verifyRenderedReceipt receipt rendered with
        | Ok() -> ()
        | Error detail -> failwithf "canonical receipt failed self-verification: %s" detail
        match PolicyAdmissibility.authorizeExecution receipt { TickEnvelopeSha256 = receipt.TickEnvelopeSha256; MaxTicks = 17; UndeclaredExternalLimits = [] } with
        | Ok 17 -> ()
        | other -> failwithf "attributed tick request unexpectedly refused: %A" other
    | Error detail -> failwithf "canonical admission unexpectedly refused: %s" detail

[<Fact>]
let ``policy admissibility refuses malformed declarations and invalid envelopes without executing a policy`` () =
    let root = Path.Combine(Path.GetTempPath(), "zeta-policy-admissibility-tests", Guid.NewGuid().ToString("N"))
    Directory.CreateDirectory root |> ignore
    try
        let malformed = Path.Combine(root, "self-report.json")
        File.WriteAllText(malformed, File.ReadAllText(canonicalSelfReport ()).Replace("O(1)", "not-big-o"))
        match PolicyAdmissibility.admit malformed (canonicalEnvelope ()) (canonicalBasis ()) with
        | Ok receipt -> Assert.Equal(PolicyAdmissibility.RefuseInvalidSelfReport, receipt.Decision)
        | Error detail -> failwithf "well-formed JSON should produce a refusal receipt: %s" detail

        let invalidEnvelope = Path.Combine(root, "tick-envelope.json")
        File.WriteAllText(invalidEnvelope, File.ReadAllText(canonicalEnvelope ()).Replace("\"maxTicks\":17", "\"maxTicks\":0"))
        match PolicyAdmissibility.admit (canonicalSelfReport ()) invalidEnvelope (canonicalBasis ()) with
        | Ok receipt -> Assert.Equal(PolicyAdmissibility.RefuseInvalidEnvelope, receipt.Decision)
        | Error detail -> failwithf "well-formed JSON should produce an envelope refusal receipt: %s" detail
    finally
        Directory.Delete(root, true)

[<Fact>]
let ``policy admissibility retains unimplemented NCI and consensus labels as deferrals`` () =
    let root = Path.Combine(Path.GetTempPath(), "zeta-policy-admissibility-basis", Guid.NewGuid().ToString("N"))
    Directory.CreateDirectory root |> ignore
    try
        let deferredBasis = Path.Combine(root, "basis.json")
        File.WriteAllText(deferredBasis, File.ReadAllText(canonicalBasis ()).Replace("\"kind\":\"test-only\"", "\"kind\":\"nci-preservation\""))
        match PolicyAdmissibility.admit (canonicalSelfReport ()) (canonicalEnvelope ()) deferredBasis with
        | Ok receipt -> Assert.Equal(PolicyAdmissibility.DeferBasisNotImplemented, receipt.Decision)
        | Error detail -> failwithf "nci label should defer rather than parse-fail: %s" detail

        File.WriteAllText(deferredBasis, File.ReadAllText(canonicalBasis ()).Replace("\"kind\":\"test-only\"", "\"kind\":\"global-score\""))
        match PolicyAdmissibility.admit (canonicalSelfReport ()) (canonicalEnvelope ()) deferredBasis with
        | Ok receipt -> Assert.Equal(PolicyAdmissibility.RefuseInvalidBasis, receipt.Decision)
        | Error detail -> failwithf "unknown basis should produce a refusal receipt: %s" detail
    finally
        Directory.Delete(root, true)

[<Fact>]
let ``policy admissibility detects an altered carrier after receipt construction`` () =
    match PolicyAdmissibility.admit (canonicalSelfReport ()) (canonicalEnvelope ()) (canonicalBasis ()) with
    | Error detail -> failwithf "canonical admission unexpectedly refused: %s" detail
    | Ok receipt ->
        let root = Path.Combine(Path.GetTempPath(), "zeta-policy-admissibility-carrier", Guid.NewGuid().ToString("N"))
        Directory.CreateDirectory root |> ignore
        try
            let changedSelfReport = Path.Combine(root, "self-report.json")
            File.WriteAllText(changedSelfReport, File.ReadAllText(canonicalSelfReport ()).Replace("\"revision\":\"policy-self-knowledge-fixture/v1\"", "\"revision\":\"policy-self-knowledge-fixture/v2\""))
            match PolicyAdmissibility.verifyCarrierFingerprints receipt changedSelfReport (canonicalEnvelope ()) (canonicalBasis ()) with
            | Error "refuse-carrier-mismatch" -> ()
            | other -> failwithf "expected exact carrier mismatch refusal, got %A" other
        finally
            Directory.Delete(root, true)

[<Fact>]
let ``policy admissibility rejects hidden external budgets after structural admission`` () =
    match PolicyAdmissibility.admit (canonicalSelfReport ()) (canonicalEnvelope ()) (canonicalBasis ()) with
    | Error detail -> failwithf "canonical admission unexpectedly refused: %s" detail
    | Ok receipt ->
        let hidden: PolicyAdmissibility.ExecutionRequest =
            { TickEnvelopeSha256 = receipt.TickEnvelopeSha256
              MaxTicks = 17
              UndeclaredExternalLimits = [ "byte-cap"; "reward-cap" ] }
        Assert.Equal(Error "refuse-undeclared-external-budget", PolicyAdmissibility.authorizeExecution receipt hidden)

[<Fact>]
let ``policy admissibility probe convicts a captured limit that crosses the declared tick boundary`` () =
    match PolicyAdmissibility.admit (canonicalSelfReport ()) (canonicalEnvelope ()) (canonicalBasis ()) with
    | Error detail -> failwithf "canonical admission unexpectedly refused: %s" detail
    | Ok receipt ->
        let mutable capturedLimit = 0
        let leakyAuthorization () =
            capturedLimit <- capturedLimit + 1
            PolicyAdmissibility.authorizeExecution
                receipt
                { TickEnvelopeSha256 = receipt.TickEnvelopeSha256
                  MaxTicks = 17
                  UndeclaredExternalLimits = [] }
            |> Result.map (fun ticks -> ticks + capturedLimit)
        match TickBoundaryProbe.probeEstimator leakyAuthorization () 2 with
        | TickBoundaryProbe.UndeclaredDetected(_, Ok first, Ok second) -> Assert.NotEqual(first, second)
        | other -> failwithf "expected captured limit to be detected as undeclared, got %A" other
