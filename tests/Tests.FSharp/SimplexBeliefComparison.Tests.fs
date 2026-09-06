module Zeta.Tests.SimplexBeliefComparisonTests

open System
open System.IO
open System.Text.Json
open Xunit
open Zeta.Core
open Zeta.Research

module S = SimplexBeliefComparison
module Q = ProbabilitySemiring

let private requireOk = function Ok value -> value | Error reason -> failwith reason
let private prediction source tokens = S.predict source S.Native tokens |> requireOk |> Option.get

[<Fact>]
let ``all bounded histories match dense analytic and signed-coordinate predictions`` () =
    let receipts = S.run 10 |> requireOk
    for receipt in receipts do
        Assert.Equal(2047, receipt.Histories)
        Assert.Equal(receipt.Histories, receipt.Possible + receipt.Impossible)
        Assert.True(receipt.Possible > 100)
        Assert.True(receipt.Impossible > 100)
        Assert.Equal(0, receipt.DenseMismatches)
        Assert.Equal(0, receipt.AnalyticMismatches)
        Assert.Equal(0, receipt.SignedMismatches)
        Assert.True(receipt.ClippedSignedMismatches > 100, "clipping must falsify the signed representation")
        Assert.InRange(receipt.DistinctBeliefs, 3, 4)

[<Fact>]
let ``sequence updates do not obey commutative evidence-set semantics`` () =
    let after01 = prediction S.GoldenMean [ 0; 1 ]
    let after10 = prediction S.GoldenMean [ 1; 0 ]
    Assert.Equal<Q.Rational list>([ Q.one; Q.zero ], after01.Next)
    Assert.Equal<Q.Rational list>([ Q.rat 1L 2L; Q.rat 1L 2L ], after10.Next)
    Assert.NotEqual<Q.Rational list>(after01.Next, after10.Next)

[<Fact>]
let ``zero-likelihood histories refuse without inventing a posterior`` () =
    Assert.Equal(Ok None, S.predict S.GoldenMean S.Native [ 1; 1 ])
    Assert.Equal(Ok None, S.predict S.GoldenMean S.Signed [ 1; 1 ])
    Assert.True((S.predict S.Even S.Native [ 2 ]).IsError)
    Assert.True((S.predict S.Even S.Native (List.replicate 11 0)).IsError)
    Assert.True((S.run -1).IsError)
    Assert.True((S.run 11).IsError)

[<Fact>]
let ``expected excess loss equals independently computed conditional KL`` () =
    for receipt in S.run 10 |> requireOk do
        for row in receipt.Entropy do
            Assert.InRange(abs (row.MemorylessCrossEntropyBits - row.SourceBits - row.ConditionalKlBits), 0.0, 1e-12)
            Assert.InRange(row.ConditionalKlBits, -1e-12, 1.0)
            if receipt.Process = "golden-mean-p-half" && row.Position > 1 then
                Assert.InRange(abs (row.SourceBits - 2.0 / 3.0), 0.0, 1e-12)

[<Fact>]
let ``marginals do not reconstruct correlations in a general joint distribution`` () =
    Assert.Equal((true, true, true, true), S.factorizationWitness ())

[<Fact>]
let ``valid temporal observations can increase next-token entropy`` () =
    let certain = prediction S.GoldenMean [ 1 ]
    let uncertain = prediction S.GoldenMean [ 1; 0 ]
    Assert.Equal<Q.Rational list>([ Q.one; Q.zero ], certain.Next)
    Assert.Equal<Q.Rational list>([ Q.rat 1L 2L; Q.rat 1L 2L ], uncertain.Next)

[<Fact>]
let ``published receipt remains aligned with the measured comparison`` () =
    let rec findRoot (directory: DirectoryInfo) =
        if isNull directory then failwith "could not locate repository root"
        elif File.Exists(Path.Join(directory.FullName, "Zeta.sln")) then directory.FullName
        else findRoot directory.Parent

    let root = findRoot (DirectoryInfo(AppContext.BaseDirectory))
    use document = JsonDocument.Parse(File.ReadAllText(Path.Join(root, "src/Research.FSharp/simplex-belief-comparison.json")))
    let actual = S.run 10 |> requireOk
    let saved = document.RootElement.EnumerateArray() |> Seq.toList
    Assert.Equal(actual.Length, saved.Length)

    for receipt, row in List.zip actual saved do
        Assert.Equal(receipt.Process, row.GetProperty("Process").GetString())
        for name, value in
            [ "Histories", receipt.Histories
              "Possible", receipt.Possible
              "Impossible", receipt.Impossible
              "DenseMismatches", receipt.DenseMismatches
              "AnalyticMismatches", receipt.AnalyticMismatches
              "SignedMismatches", receipt.SignedMismatches
              "ClippedSignedMismatches", receipt.ClippedSignedMismatches
              "DistinctBeliefs", receipt.DistinctBeliefs ] do
            Assert.Equal(value, row.GetProperty(name).GetInt32())

        let entropy = row.GetProperty("Entropy").EnumerateArray() |> Seq.toList
        Assert.Equal(receipt.Entropy.Length, entropy.Length)
        for measured, recorded in List.zip receipt.Entropy entropy do
            Assert.Equal(measured.Position, recorded.GetProperty("Position").GetInt32())
            for name, value in
                [ "SourceBits", measured.SourceBits
                  "MemorylessCrossEntropyBits", measured.MemorylessCrossEntropyBits
                  "ConditionalKlBits", measured.ConditionalKlBits ] do
                Assert.InRange(abs (value - recorded.GetProperty(name).GetDouble()), 0.0, 1e-12)
