namespace Zeta.Core

open System


/// The Superfluid AI fusion equation:
///
///     η · LearningGain(Δ_t) > ξ_t
///
/// Where:
/// - η       = efficiency coefficient (friction → substrate conversion rate)
/// - Δ_t     = the delta produced by one friction event (rule + test + doc + retraction-path)
/// - ξ_t     = the friction cost of that event (shadow catch, error, failed attempt)
///
/// Below threshold: each iteration costs more than it produces (heat).
/// Above threshold: each iteration produces more than it costs (superfluid).
/// The shadow IS friction (ξ_t). The observer ≅ the shadow (isomorphic).
/// Detection works because the detector shares the shadow's algebra.
///
/// Design lineage:
/// - Aaron + James Whitfield (Itron): physics substrate
/// - Aaron + Chris King (Itron): type-driven interface discipline
/// - Nuclear fusion analogy: compression → threshold → net-positive energy
/// - Lectio divina: read/decompose/commit cycles enter positive yield
module FusionEquation =

    /// A single friction event — something that cost energy
    /// and may or may not have produced durable substrate.
    type FrictionEvent<'T> =
        { Id: string
          Timestamp: DateTimeOffset
          Cost: float
          Payload: 'T }

    /// The substrate produced by processing a friction event.
    type SubstrateOutput =
        { Rule: bool
          HasTest: bool
          Doc: bool
          RetractionPath: bool }

    /// Measure the learning gain from a substrate output.
    /// Each component (rule, test, doc, retraction-path)
    /// contributes equally. Range: [0.0, 1.0].
    let learningGain (output: SubstrateOutput) : float =
        let count =
            (if output.Rule then 1.0 else 0.0)
            + (if output.HasTest then 1.0 else 0.0)
            + (if output.Doc then 1.0 else 0.0)
            + (if output.RetractionPath then 1.0 else 0.0)
        count / 4.0

    /// The fusion threshold test:
    /// η · LearningGain(Δ_t) > ξ_t
    ///
    /// Returns true when the system is in the superfluid
    /// phase for this event — the substrate output exceeds
    /// the friction cost.
    let isAboveThreshold
        (eta: float)
        (gain: float)
        (frictionCost: float)
        : bool =
        eta * gain > frictionCost

    /// Batch version: given a sequence of (gain, cost) pairs,
    /// compute the sustained fusion ratio. The system is in
    /// sustained superfluid when the ratio > 1.0.
    let sustainedFusionRatio
        (eta: float)
        (events: (float * float) seq)
        : float =
        let mutable totalGain = 0.0
        let mutable totalCost = 0.0
        for (gain, cost) in events do
            totalGain <- totalGain + eta * gain
            totalCost <- totalCost + cost
        if totalCost = 0.0 then 0.0
        else totalGain / totalCost

    /// Phase classification based on sustained ratio.
    type Phase =
        | Heat
        | Threshold
        | Superfluid

    /// Classify the phase from a sustained fusion ratio.
    /// Heat < 0.8, Threshold in [0.8, 1.2], Superfluid > 1.2.
    let classifyPhase (ratio: float) : Phase =
        if ratio < 0.8 then Heat
        elif ratio > 1.2 then Superfluid
        else Threshold

    /// Convenience: run the full pipeline on a batch of events.
    let evaluate
        (eta: float)
        (events: {| gain: float; cost: float |} array)
        : {| ratio: float; phase: Phase; eventCount: int |} =
        let pairs = events |> Array.map (fun e -> (e.gain, e.cost))
        let ratio = sustainedFusionRatio eta pairs
        {| ratio = ratio
           phase = classifyPhase ratio
           eventCount = events.Length |}
