module Zeta.Tests.Plugin.LawRunnerTests

open System.Threading.Tasks
open Xunit
open FsUnit.Xunit
open Zeta.Core


// ────────────────────────────────────────────────────────────────
// Linearity fixtures
// ────────────────────────────────────────────────────────────────

/// Linear plugin — doubling is linear over integers.
type private DoublerOp(input: Stream<int>) =
    let deps = [| input.AsDependency() |]
    interface ILinearOperator<int, int> with
        member _.Name = "doubler"
        member _.ReadDependencies = deps
        member _.StepAsync(out, _ct) =
            out.Publish (input.Current * 2)
            ValueTask.CompletedTask


/// **Not** linear — squaring breaks `op(a+b) = op(a)+op(b)`.
/// Falsely tagged `ILinearOperator` so the law runner catches
/// the lie.
type private SquarerOp(input: Stream<int>) =
    let deps = [| input.AsDependency() |]
    interface ILinearOperator<int, int> with
        member _.Name = "squarer-liar"
        member _.ReadDependencies = deps
        member _.StepAsync(out, _ct) =
            let v = input.Current
            out.Publish (v * v)
            ValueTask.CompletedTask


// ────────────────────────────────────────────────────────────────
// Retraction-completeness fixtures (ZSet<int> → ZSet<int>)
// ────────────────────────────────────────────────────────────────

/// Clean retraction — pure passthrough. Each tick echoes the
/// input Z-set; forward+retract round-trip sums to empty.
type private ZSetEchoOp(input: Stream<ZSet<int>>) =
    let deps = [| input.AsDependency() |]
    interface IStatefulStrictOperator<ZSet<int>, unit, ZSet<int>> with
        member _.Name = "zset-echo"
        member _.ReadDependencies = deps
        member _.StepAsync(out, _ct) =
            out.Publish input.Current
            ValueTask.CompletedTask


/// Retraction-lossy — drops negative-weight entries. Under a
/// forward+retract round-trip the retracted entries never make
/// it through, so cumulative output ≠ empty. Falsely tagged
/// `IStatefulStrictOperator` so the law runner catches the lie.
type private PositiveOnlyOp(input: Stream<ZSet<int>>) =
    let deps = [| input.AsDependency() |]
    interface IStatefulStrictOperator<ZSet<int>, unit, ZSet<int>> with
        member _.Name = "positive-only-liar"
        member _.ReadDependencies = deps
        member _.StepAsync(out, _ct) =
            let positives =
                input.Current.AsSpan().ToArray()
                |> Array.filter (fun e -> e.Weight > 0L)
                |> Array.map (fun e -> e.Key, e.Weight)
            out.Publish (ZSet.ofSeq positives)
            ValueTask.CompletedTask


// ────────────────────────────────────────────────────────────────
// Generators
// ────────────────────────────────────────────────────────────────

let private genInt (rng: System.Random) : int = rng.Next(-100, 101)

let private genZSet (rng: System.Random) : ZSet<int> =
    let n = rng.Next(0, 4)
    [ for _ in 1 .. n ->
        let k = rng.Next(0, 5)
        // Weight in [-3, 3] \ {0} — both polarities appear.
        let mutable w = rng.Next(-3, 4)
        if w = 0 then w <- 1
        (k, int64 w) ]
    |> ZSet.ofSeq


// ────────────────────────────────────────────────────────────────
// Linearity
// ────────────────────────────────────────────────────────────────

[<Fact>]
let ``checkLinear passes on a genuine linear op`` () =
    let result =
        LawRunner.checkLinear
            42      // seed
            20      // samples
            8       // scheduleLength
            (fun s -> DoublerOp s :> IOperator<int>)
            genInt
            (+)
            (+)
            (=)
    match result with
    | Ok () -> ()
    | Error v -> Assert.Fail (sprintf "expected Ok, got %A" v)


[<Fact>]
let ``checkLinear catches a falsely-tagged non-linear op`` () =
    let result =
        LawRunner.checkLinear
            42
            20
            8
            (fun s -> SquarerOp s :> IOperator<int>)
            genInt
            (+)
            (+)
            (=)
    match result with
    | Ok () -> Assert.Fail "expected linearity violation"
    | Error v ->
        v.Seed |> should equal 42
        v.Message |> should haveSubstring "Linearity broke"


[<Fact>]
let ``checkLinear reproduces bit-exact on the same seed`` () =
    let run () =
        LawRunner.checkLinear
            99 10 5
            (fun s -> SquarerOp s :> IOperator<int>)
            genInt (+) (+) (=)
    let first = run ()
    let second = run ()
    first |> should equal second


// ────────────────────────────────────────────────────────────────
// Retraction completeness
// ────────────────────────────────────────────────────────────────

[<Fact>]
let ``checkRetractionCompleteness passes on a clean-retracting op`` () =
    let result =
        LawRunner.checkRetractionCompleteness
            7       // seed
            15      // samples
            6       // scheduleLength
            (fun s -> ZSetEchoOp s :> IOperator<ZSet<int>>)
            genZSet
    match result with
    | Ok () -> ()
    | Error v -> Assert.Fail (sprintf "expected Ok, got %A" v)


[<Fact>]
let ``checkRetractionCompleteness catches a retraction-lossy op`` () =
    let result =
        LawRunner.checkRetractionCompleteness
            7 15 6
            (fun s -> PositiveOnlyOp s :> IOperator<ZSet<int>>)
            genZSet
    match result with
    | Ok () -> Assert.Fail "expected retraction-completeness violation"
    | Error v ->
        v.Seed |> should equal 7
        v.Message |> should haveSubstring "Retraction incomplete"
