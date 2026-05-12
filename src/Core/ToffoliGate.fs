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

    /// Circuit representation for reversible Z-set operations (B-0366.2 smallest slice).
    /// A ToffoliCircuit is a sequence of gates plus metadata; ancilla wires are implicit
    /// in the gate list (no bit erasure).
    [<Struct>]
    type ToffoliCircuit = {
        Gates: ToffoliWires list
        Description: string
    }

    /// Model a Z-set join as a Toffoli-gate network (formal gate-network model slice).
    ///
    /// This is the bounded first step: returns an empty circuit stub. Full join
    /// expansion (N×M weight multiplications encoded as Peres/Toffoli chains)
    /// is deferred to a child decomposition. The stub satisfies the signature
    /// and keeps the build green.
    let modelJoinCircuit (_a: obj) (_b: obj) : ToffoliCircuit =
        { Gates = []; Description = "B-0366.2: empty Toffoli circuit for Z-set join (re-decomposed slice)" }
