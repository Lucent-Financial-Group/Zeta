module ContextualGridResultReceiptTests

open System
open System.IO
open System.Text.Json
open global.Xunit
open Zeta.Core

let private resultRepoRoot () =
    let mutable dir = DirectoryInfo(Path.GetDirectoryName(System.Reflection.Assembly.GetExecutingAssembly().Location))
    while not (isNull dir) && not (File.Exists(Path.Join(dir.FullName, "Zeta.sln"))) do
        dir <- dir.Parent
    if isNull dir then failwith "Could not locate repo root (Zeta.sln)." else dir.FullName

let private resultReceiptPath fileName =
    Path.Join(resultRepoRoot (), "docs", "research", "data", fileName)

[<Fact>]
let ``contextual-grid result receipt refuses an incomplete or noncanonical roster`` () =
    let missingLastSeed = [ ContextualGridResultReceipt.SeedFirst .. ContextualGridResultReceipt.SeedLast - 1UL ]
    match ContextualGridResultReceipt.run missingLastSeed with
    | Error(ContextualGridResultReceipt.IncompleteOrNoncanonicalRoster detail) ->
        Assert.Contains("exact ascending unsigned sequence", detail)
    | other -> failwithf "expected incomplete roster refusal, got %A" other

    let reordered = 1UL :: 0UL :: [ 2UL .. ContextualGridResultReceipt.SeedLast ]
    match ContextualGridResultReceipt.run reordered with
    | Error(ContextualGridResultReceipt.IncompleteOrNoncanonicalRoster detail) ->
        Assert.Contains("exact ascending unsigned sequence", detail)
    | other -> failwithf "expected reordered roster refusal, got %A" other

[<Fact>]
let ``100-seed receipt replay retains external denominator canonical bytes and fault-sensitive ordering`` () =
    Assert.Equal(1_720_000, ContextualGridBenchmark.optimalHeldOutReturn ContextualGridBenchmark.EpisodeActionCap)
    let fsharpPath = resultReceiptPath "2026-09-05-contextual-grid-v1-100-seed-fsharp.json"
    let pythonPath = resultReceiptPath "2026-09-05-contextual-grid-v1-100-seed-python.json"
    let fsharpBytes = File.ReadAllBytes fsharpPath
    let pythonBytes = File.ReadAllBytes pythonPath
    Assert.Equal<byte>(fsharpBytes, pythonBytes)
    let fsharpText = File.ReadAllText fsharpPath
    match ContextualGridResultReceipt.runCanonical (resultRepoRoot ()) with
    | Error failure -> failwithf "canonical roster unexpectedly refused: %A" failure
    | Ok receipt ->
        match ContextualGridResultReceipt.verifyRenderedReceipt receipt fsharpText with
        | Ok() -> ()
        | Error failure -> failwithf "canonical F# receipt did not replay: %s" failure
        use document = JsonDocument.Parse fsharpText
        let bootstrap = document.RootElement.GetProperty("bootstrap")
        Assert.Equal(1_000_000, bootstrap.GetProperty("draws").GetInt32())
        Assert.Equal(0, bootstrap.GetProperty("rejections").GetInt32())
        Assert.Equal("d845705cc04da1dc190b743a35a7bc358b75ef8e9121509a4ab76629f45467f8", bootstrap.GetProperty("indexDigest").GetString())
        let reorderedText = { receipt with Policies = List.rev receipt.Policies } |> ContextualGridResultReceipt.render
        Assert.NotEqual<string>(fsharpText, reorderedText)
        match ContextualGridResultReceipt.verifyRenderedReceipt receipt reorderedText with
        | Error failure -> Assert.StartsWith("INVALID_RECEIPT", failure)
        | Ok() -> failwith "reordered policy rows must not validate as canonical receipt bytes"

        let incompleteText = fsharpText.Replace(",\"comparisonVerdict\":\"criterion-met-on-declared-grid\"", "")
        Assert.NotEqual<string>(fsharpText, incompleteText)
        match ContextualGridResultReceipt.verifyRenderedReceipt receipt incompleteText with
        | Error failure -> Assert.StartsWith("INVALID_RECEIPT", failure)
        | Ok() -> failwith "an incomplete valid-JSON receipt must not validate as canonical receipt bytes"
