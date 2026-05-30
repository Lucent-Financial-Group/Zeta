namespace Zeta.Core.FSharp.TriBoolean

/// Tri-boolean core primitive -- the digital qubit cell (B-0944).
///
/// Three-valued state: True | False | Null. Null (N) is the HELD living-uncertainty
/// (superposition) state -- never silently collapsed. measure is the only collapsing
/// operation, and collapsing a living (N) cell is surfaced as feedback rather than
/// performed silently (Result-over-exception / asymmetric-authorship).
///
/// This is the F# implementation -- oracle #2 of four (TS/F#/C#/Rust) in the
/// summonable-BFT cross-language consensus. The F# compiler is a non-Byzantine oracle.

/// The three-valued state. N (Null) is the held / superposed living-uncertainty state.
type Tri =
    | T
    | F
    | N

/// Feedback surfaced when measure is asked to collapse a living (N) cell -- the forbidden
/// move, surfaced rather than silently performed.
type CollapseFeedback =
    | CollapsedLivingUncertainty
