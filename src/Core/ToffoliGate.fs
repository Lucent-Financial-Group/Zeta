namespace Zeta.Core

/// Toffoli gate type model — Z-set encoding for reversible computing.
///
/// The Toffoli gate (a, b, c) → (a, b, c ⊕ (a ∧ b)) is the canonical
/// universal reversible gate. It is self-inverse: applying it twice
/// returns the original input. No bits are erased.
///
/// Z-set assert (+1) maps to Toffoli forward; retract (-1) maps to
/// Toffoli reverse — which is identical to forward (self-inverse).
/// This is the bit-level realisation of the Landauer bridge established
/// in docs/research/2026-05-09-zset-reversible-computing-landauer-bridge-math-writeup.md.
///
/// B-0366.1: smallest safe slice — pure F# type model, no FPGA required.
[<Struct>]
type Bit =
    | Zero
    | One


/// The three-wire state of a Toffoli gate.
[<Struct>]
type ToffoliWires = { A: Bit; B: Bit; C: Bit }


/// A Z-set operation expressible as a Toffoli gate application.
[<Struct>]
type ZSetGateOp =
    | Assert   // +1: add one unit of information
    | Retract  // -1: recover one unit of information


// ── Wire-map formal model (B-0366.2.1) ──────────────────────────────────────
//
// A Toffoli circuit is a gate network over named wires. Each wire has an
// integer index (WireId) and carries a Bit value. A circuit step is a
// single Toffoli gate application that references three wire indices;
// the circuit itself is a sequence of steps plus the current wire state.
//
// Invariants:
//   - Every WireId in ToffoliGateStep.ControlA / ControlB / Target must
//     exist as a key in ToffoliCircuit.Wires.
//   - ToffoliCircuit.Ancilla >= 0.
//   - Ancilla wires occupy indices 0 .. Ancilla-1 by convention.
//   - No bit erasure: ancilla wires carry the inverse function, so the
//     circuit is reversible over its full wire set.

/// Integer index identifying a wire in a ToffoliCircuit.
type WireId = int

/// State of all wires in a circuit at a given point in execution.
/// Maps each wire index to its current Bit value.
type WireMap = Map<WireId, Bit>

/// A single Toffoli gate application, identified by wire indices.
///
/// Semantics: Wires[Target] ← Wires[Target] ⊕ (Wires[ControlA] ∧ Wires[ControlB]).
/// ControlA and ControlB wires are read-only in this step.
[<Struct>]
type ToffoliGateStep = {
    ControlA : WireId
    ControlB : WireId
    Target   : WireId
}

/// A Toffoli gate network (B-0366.2.1 formal model).
///
/// Gates:   ordered sequence of gate applications (wire-index based).
/// Wires:   current bit state of every named wire.
/// Ancilla: number of ancilla (helper) wires. By convention, their
///          indices occupy 0 .. Ancilla-1. Ancilla carry the inverse
///          function — no bits are erased when the circuit runs.
type ToffoliCircuit = {
    Gates   : ToffoliGateStep list
    Wires   : WireMap
    Ancilla : int
}


[<RequireQualifiedAccess>]
module ToffoliGate =

    /// The Toffoli gate: (a, b, c) → (a, b, c ⊕ (a ∧ b)).
    ///
    /// Properties (all proved in ToffoliGate.Laws.Tests.fs):
    ///   - Self-inverse: apply gate (apply gate x) = x
    ///   - Bit-conservative: output has exactly 3 wires (same as input)
    ///   - Universal: can simulate any reversible boolean circuit
    let apply (w: ToffoliWires) : ToffoliWires =
        let control = w.A = One && w.B = One
        let c' = if control then (if w.C = Zero then One else Zero) else w.C
        { w with C = c' }

    /// Encode a Z-set operation as a Toffoli gate application.
    ///
    /// Assert and Retract both map to the same Toffoli forward application —
    /// the self-inverse property makes them indistinguishable at the gate
    /// level, which is exactly what the Landauer bridge requires:
    /// neither operation erases information.
    let encode (op: ZSetGateOp) (w: ToffoliWires) : ToffoliWires =
        match op with
        | Assert  -> apply w
        | Retract -> apply w  // same gate — self-inverse makes retract = apply once more

    /// Assert followed immediately by Retract returns the original wire state.
    ///
    /// This is the gate-level proof of Z-set's assert-retract identity:
    ///   w = Retract (Assert w)
    let assertThenRetract (w: ToffoliWires) : ToffoliWires =
        w |> encode Assert |> encode Retract

    /// Empty circuit: no gate steps, no wires initialised, zero ancilla.
    ///
    /// Use as the base for circuit construction. Satisfies all ToffoliCircuit
    /// invariants trivially — empty gate list implies no WireId constraints.
    let emptyCircuit : ToffoliCircuit =
        { Gates = []; Wires = Map.empty; Ancilla = 0 }
