#r "../../../src/Bayesian/bin/Debug/net10.0/Zeta.Bayesian.dll"

open System
open System.Text.Json
open Zeta.Bayesian

type Evidence = { Id: string; Mean: float; Variance: float }

let evidence count =
    [| for index in 0 .. count - 1 ->
        { Id = $"e{index:D3}"
          Mean = float (index % 11 - 5) / 3.0
          Variance = 1.0 + float ((index * 7) % 13) / 5.0 } |]

let gaussian (item: Evidence) = Gaussian.ofMeanVariance item.Mean item.Variance

let rec balancedProduct (messages: Gaussian array) depth =
    if messages.Length = 1 then messages.[0], depth
    else
        let next =
            [| for index in 0 .. 2 .. messages.Length - 1 ->
                if index + 1 < messages.Length then Gaussian.product messages.[index] messages.[index + 1]
                else messages.[index] |]
        balancedProduct next (depth + 1)

let measure count =
    let items = evidence count
    let messages = items |> Array.map gaussian
    let densePrecision = items |> Array.sumBy (fun item -> 1.0 / item.Variance)
    let densePrecisionMean = items |> Array.sumBy (fun item -> item.Mean / item.Variance)
    let chain = messages |> Array.reduce Gaussian.product
    let dag, dagDepth = balancedProduct messages 0
    let reversed = messages |> Array.rev |> Array.reduce Gaussian.product
    let dropIndex = count / 2
    let dropped = messages |> Array.mapi (fun index message -> index, message) |> Array.choose (fun (index, message) -> if index = dropIndex then None else Some message)
    let branchDrop = dropped |> Array.reduce Gaussian.product
    {| evidenceCount = count
       densePrecision = densePrecision
       densePrecisionMean = densePrecisionMean
       chainPrecision = chain.Precision
       chainPrecisionMean = chain.PrecisionMean
       dagPrecision = dag.Precision
       dagPrecisionMean = dag.PrecisionMean
       reversedPrecision = reversed.Precision
       reversedPrecisionMean = reversed.PrecisionMean
       branchDropPrecision = branchDrop.Precision
       branchDropPrecisionMean = branchDrop.PrecisionMean
       productCount = count - 1
       chainDepth = count - 1
       dagDepth = dagDepth |}

let report = [| 2; 4; 8; 16; 32; 64 |] |> Array.map measure
printfn "%s" (JsonSerializer.Serialize report)
