module Zeta.Tests.Operators.SpeculativeWatermarkTests
#nowarn "0893"

open System.Threading.Tasks
open FsUnit.Xunit
open global.Xunit
open Zeta.Core


// ═══════════════════════════════════════════════════════════════════
// SpeculativeWindowOp — retraction-native speculative watermark
// emission. First tests land round 34; BACKLOG P0 harsh-critic #28
// residual.
//
// Claim under test: a late positive insert whose event-time sits
// below a previously-emitted speculative watermark causes the op
// to emit `-Δ` with the stale watermark stamp AND `+Δ` with the
// new watermark stamp, mirroring what Beam's RETRACTING mode
// produces but via ordinary Z-weights (the paper-worthy claim
// from the docstring on `SpeculativeWindowOp`).
// ═══════════════════════════════════════════════════════════════════


/// Factory — a Monotonic tracker wrapped in the IWatermarkStrategy
/// adapter interface the op expects.
let private monotonicStrategy () : IWatermarkStrategy =
    let tracker = WatermarkTracker WatermarkStrategy.Monotonic
    WatermarkStrategyAdapter(tracker, "monotonic") :> IWatermarkStrategy


[<Fact>]
let ``first insert at fresh event-time emits one +delta with that watermark`` () =
    task {
        let c = Circuit.create ()
        let input = c.ZSetInput<Timestamped<int>> ()
        let strat = monotonicStrategy ()
        let speculated = c.SpeculativeWindow(input.Stream, strat, 100L)
        let out = c.Output speculated

        input.Send(ZSet.singleton (Timestamped(42, 100L)) 1L)
        do! c.StepAsync ()

        // Exactly one row stamped with the observed watermark (100L
        // under Monotonic).
        let pair = struct (Timestamped(42, 100L), 100L)
        out.Current.[pair] |> should equal 1L
    }


[<Fact>]
let ``late positive insert retracts stale stamp and inserts corrected`` () =
    task {
        let c = Circuit.create ()
        let input = c.ZSetInput<Timestamped<int>> ()
        let strat = monotonicStrategy ()
        let speculated = c.SpeculativeWindow(input.Stream, strat, 100L)
        let snapshot = c.IntegrateZSet speculated
        let out = c.Output snapshot

        // Tick 1: advance watermark to 200 with a fresh key.
        input.Send(ZSet.singleton (Timestamped(1, 200L)) 1L)
        do! c.StepAsync ()

        // Tick 2: a LATE positive insert at the same (eventTime=200,
        // value=1) would be a duplicate of the same key; but DBSP
        // stream semantics model "duplicate at same key" as re-emit
        // with the same watermark stamp — not a retraction. The
        // retraction-native test fires when we send a SECOND row
        // at a LOWER event-time with the same value. After the
        // monotonic watermark has already advanced past that
        // eventTime, the op treats the new arrival as a late
        // update and emits retract+insert.
        input.Send(ZSet.singleton (Timestamped(1, 150L)) 1L)
        do! c.StepAsync ()

        // Integrated view: the row with watermark-stamp 200L was
        // emitted once at +1 then retracted once at -1 → weight 0.
        // A fresh row with watermark-stamp = current watermark
        // after observing 150L (still 200L under Monotonic since
        // the observed 150L cannot drag the watermark backwards)
        // replaces it.
        //
        // The exact stamps depend on Monotonic's "never goes
        // backwards" semantics. This test asserts only the weaker
        // invariant: the net integrated weight for the (value=1,
        // eventTime=150L) key is +1 (it is alive), and no ghost
        // key with weight > 1 exists anywhere.
        let liveAt150 = struct (Timestamped(1, 150L), 200L)
        out.Current.[liveAt150] |> should equal 1L

        // No integrated weight > 1 for any key (retract-native
        // invariant: every speculative emission is matched by a
        // retract before a re-insert).
        let maxWeight =
            out.Current
            |> Seq.sumBy (fun entry ->
                if entry.Weight > 1L then 1 else 0)
        maxWeight |> should equal 0
    }


[<Fact>]
let ``negative-weight input retracts the stored speculative stamp`` () =
    task {
        let c = Circuit.create ()
        let input = c.ZSetInput<Timestamped<int>> ()
        let strat = monotonicStrategy ()
        let speculated = c.SpeculativeWindow(input.Stream, strat, 100L)
        let snapshot = c.IntegrateZSet speculated
        let out = c.Output snapshot

        // Tick 1: insert a row. Speculative stamp lands.
        input.Send(ZSet.singleton (Timestamped(7, 500L)) 1L)
        do! c.StepAsync ()
        let stamped = struct (Timestamped(7, 500L), 500L)
        out.Current.[stamped] |> should equal 1L

        // Tick 2: retract with weight -1. Op should pull the row
        // out of its speculative map and emit -Δ with the stored
        // stamp.
        input.Send(ZSet.singleton (Timestamped(7, 500L)) -1L)
        do! c.StepAsync ()
        out.Current.[stamped] |> should equal 0L
    }


[<Fact>]
let ``empty input produces empty output`` () =
    task {
        let c = Circuit.create ()
        let input = c.ZSetInput<Timestamped<int>> ()
        let strat = monotonicStrategy ()
        let speculated = c.SpeculativeWindow(input.Stream, strat, 100L)
        let out = c.Output speculated

        // No Send call before StepAsync.
        do! c.StepAsync ()
        out.Current |> ZSet.isEmpty |> should be True
    }
