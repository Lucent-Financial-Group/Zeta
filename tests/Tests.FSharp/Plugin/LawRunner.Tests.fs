module Zeta.Tests.Plugin.LawRunnerTests

open System.Collections.Generic
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
// Retraction-completeness fixtures
//
// The law checks state restoration: after forward+retract
// cancel, continuation outputs must match a fresh-op run of
// the same continuation. Catches stateful ops that survive
// what was supposed to be a full cancel.
// ────────────────────────────────────────────────────────────────

/// Stateless echo — trivially passes state restoration
/// because it has no state. Keeps a baseline for the law on
/// clean ops.
type private ZSetEchoOp(input: Stream<ZSet<int>>) =
    let deps = [| input.AsDependency() |]
    interface IStatefulStrictOperator<ZSet<int>, unit, ZSet<int>> with
        member _.Name = "zset-echo"
        member _.ReadDependencies = deps
        member _.StepAsync(out, _ct) =
            out.Publish input.Current
            ValueTask.CompletedTask


/// Genuinely stateful *and* retraction-lossy — a floored per-
/// key counter. Accumulates weights but refuses to go below
/// zero; a `-1` on a key at count 0 is silently dropped. Under
/// forward+retract the dropped decrements leave residual
/// positive state that survives the cancel, so any continuation
/// input sees the leaked state and diverges from a fresh op.
/// Falsely tagged `IStatefulStrictOperator` so the law catches
/// it.
type private FlooredCounterOp(input: Stream<ZSet<int>>) =
    let deps = [| input.AsDependency() |]
    let state = Dictionary<int, int64>()
    interface IStatefulStrictOperator<ZSet<int>, Dictionary<int, int64>, ZSet<int>> with
        member _.Name = "floored-counter-liar"
        member _.ReadDependencies = deps
        member _.StepAsync(out, _ct) =
            let delta = ResizeArray<int * int64>()
            let span = input.Current.AsSpan()
            for i in 0 .. span.Length - 1 do
                let k = span.[i].Key
                let w = span.[i].Weight
                let current =
                    match state.TryGetValue k with
                    | true, v -> v
                    | _ -> 0L
                let proposed = current + w
                let applied = if proposed < 0L then 0L else proposed
                let emitted = applied - current
                if applied = 0L then state.Remove k |> ignore
                else state.[k] <- applied
                if emitted <> 0L then delta.Add (k, emitted)
            out.Publish (ZSet.ofSeq delta)
            ValueTask.CompletedTask


// ────────────────────────────────────────────────────────────────
// Generators
// ────────────────────────────────────────────────────────────────

let private genInt (rng: System.Random) : int = rng.Next(-100, 101)

let private genZSet (rng: System.Random) : ZSet<int> =
    let n = rng.Next(0, 4)
    [ for _ in 1 .. n ->
        let k = rng.Next(0, 5)
        // Exclude zero weight so both polarities are represented
        // without burning a generator draw on a no-op.
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
            42 20 8
            (fun s -> DoublerOp s :> IOperator<int>)
            genInt (+) (+) (=)
    match result with
    | Ok () -> ()
    | Error v -> Assert.Fail (sprintf "expected Ok, got %A" v)


[<Fact>]
let ``checkLinear catches a falsely-tagged non-linear op`` () =
    let result =
        LawRunner.checkLinear
            42 20 8
            (fun s -> SquarerOp s :> IOperator<int>)
            genInt (+) (+) (=)
    match result with
    | Ok () -> Assert.Fail "expected linearity violation"
    | Error v ->
        v.Seed |> should equal 42
        v.Message |> should haveSubstring "Linearity broke"


[<Fact>]
let ``checkLinear reproduces bit-exact on the same seed`` () =
    let run () =
        LawRunner.checkLinear 99 10 5
            (fun s -> SquarerOp s :> IOperator<int>)
            genInt (+) (+) (=)
    let first = run ()
    let second = run ()
    first |> should equal second


[<Fact>]
let ``checkLinear returns Error on bad samples arg`` () =
    let result =
        LawRunner.checkLinear 0 0 1
            (fun s -> DoublerOp s :> IOperator<int>)
            genInt (+) (+) (=)
    match result with
    | Ok () -> Assert.Fail "expected bad-args Error"
    | Error v -> v.Message |> should haveSubstring "samples"


// ────────────────────────────────────────────────────────────────
// Retraction completeness
// ────────────────────────────────────────────────────────────────

[<Fact>]
let ``checkRetractionCompleteness passes on a stateless echo`` () =
    let result =
        LawRunner.checkRetractionCompleteness
            7 15 6 4
            (fun s -> ZSetEchoOp s :> IOperator<ZSet<int>>)
            genZSet
    match result with
    | Ok () -> ()
    | Error v -> Assert.Fail (sprintf "expected Ok, got %A" v)


[<Fact>]
let ``checkRetractionCompleteness catches a stateful retraction-lossy op`` () =
    let result =
        LawRunner.checkRetractionCompleteness
            7 15 6 4
            (fun s -> FlooredCounterOp s :> IOperator<ZSet<int>>)
            genZSet
    match result with
    | Ok () -> Assert.Fail "expected retraction-completeness violation"
    | Error v ->
        v.Seed |> should equal 7
        v.Message |> should haveSubstring "Retraction incomplete"


[<Fact>]
let ``checkRetractionCompleteness reproduces bit-exact on the same seed`` () =
    let run () =
        LawRunner.checkRetractionCompleteness 13 8 5 3
            (fun s -> FlooredCounterOp s :> IOperator<ZSet<int>>)
            genZSet
    let first = run ()
    let second = run ()
    first |> should equal second
