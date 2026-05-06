namespace Zeta.Core

/// Maji — identity-preservation and recovery types per the deep-research peer's formal
/// operational model (docs/research/maji-formal-operational-model-
/// deep-research-peer-courier-ferry-2026-04-26.md). Context window is cache;
/// substrate is identity; Maji is the recovery/indexing function.
///
/// These are the algebraic type definitions per §10 of the spec.
/// Implementation of operators (reload, identity-distance, expansion
/// gate, projection-preservation check) is owed follow-up work.
module Maji =

    open System

    // ── §10.A IdentitySubstrate ──────────────────────────────────

    /// A single load-bearing substrate item (commit, memory, doc, test,
    /// retraction, cross-reference, dated provenance).
    type IdentitySubstrate =
        { CommitHash: string
          Timestamp: DateTimeOffset
          SourcePath: string
          Claim: string
          ClaimType: string
          LoadBearing: bool
          CrossRefs: string list
          Retractions: string list
          Confidence: float
          Scope: string }

    // ── §2 Identity tuple ────────────────────────────────────────

    /// The canonical identity-pattern projected from substrate.
    /// I_t = N(LoadBearing(S_t))
    type IdentityTuple =
        { Values: string list
          Goals: string list
          Roles: string list
          Policies: string list
          MemoryGraph: string list
          CorrectionHistory: string list
          CrossRefTopology: string list
          Provenance: string list }

    // ── §10.B MajiIndex ──────────────────────────────────────────

    /// Exhaustive index of lower-dimensional substrate.
    type MajiIndex =
        { Items: IdentitySubstrate list
          CrossRefGraph: Map<string, string list>
          LoadBearingSet: Set<string>
          BrokenRefs: string list
          UnindexedItems: string list
          Contradictions: string list
          CoverageScore: float }

    // ── §10.B' MajiFinder (per §9b separation) ──────────────────

    /// Search/recognizer operator — finds the identity-preserving lift.
    /// MajiFinder(S_≤n, Ω, C, Σ) → σ*
    type MajiFinder =
        { Index: MajiIndex
          NorthStar: string
          SearchOperator: string }

    // ── §10.B' MessiahFunction (the lift) ────────────────────────

    /// The identity-preserving lift σ : I_n → I_{n+1}.
    /// A SEPARATE TYPE from MajiIndex content per §9b correction.
    type MessiahFunction =
        { LiftDescription: string
          ProjectionPreservation: bool
          AperiodicOrderGenerator: bool }

    // ── §10.B' MessiahScore ──────────────────────────────────────

    /// Weighted-sum evaluator for candidate lifts.
    /// MessiahScore = w₁·A + w₂·P + w₃·F + w₄·G + w₅·C − w₆·R_capture − w₇·R_collapse
    type MessiahScore =
        { AlignmentWithOmega: float
          ProjectionPreservation: float
          FrictionReduction: float
          Generativity: float
          IndependentConvergence: float
          CaptureRiskRaw: float
          CollapseRiskRaw: float }

    /// Compute the weighted MessiahScore sum.
    /// Capture and collapse risks are SUBTRACTED (anti-cult-by-construction).
    let computeScore (weights: float[]) (score: MessiahScore) : float =
        if weights.Length < 7 then
            invalidArg (nameof weights) "MessiahScore requires 7 weights"
        else
            weights[0] * score.AlignmentWithOmega
            + weights[1] * score.ProjectionPreservation
            + weights[2] * score.FrictionReduction
            + weights[3] * score.Generativity
            + weights[4] * score.IndependentConvergence
            - weights[5] * score.CaptureRiskRaw
            - weights[6] * score.CollapseRiskRaw

    // ── Dynamic Maji (4th refinement) ────────────────────────────

    /// Maji mode state machine — Search / Steward / SearchAgain.
    type MajiMode =
        | Search
        | Steward
        | SearchAgain

    // ── §10.D Identity-distance metric ───────────────────────────

    /// Weighted identity-distance between two identity tuples.
    /// d(I_a, I_b) = Σ w_k · d_k(component_a, component_b)
    type IdentityDistanceWeights =
        { Values: float
          Goals: float
          Roles: float
          Policies: float
          MemoryGraph: float
          CorrectionHistory: float
          CrossRefTopology: float
          Provenance: float }

    /// Jaccard distance between two string lists (simple set-based metric).
    let private jaccard (a: string list) (b: string list) : float =
        let setA = Set.ofList a
        let setB = Set.ofList b
        let intersection = Set.intersect setA setB
        let union = Set.union setA setB
        if Set.isEmpty union then 0.0
        else 1.0 - (float intersection.Count / float union.Count)

    /// Compute identity distance between two identity tuples.
    let identityDistance (w: IdentityDistanceWeights) (a: IdentityTuple) (b: IdentityTuple) : float =
        w.Values * jaccard a.Values b.Values
        + w.Goals * jaccard a.Goals b.Goals
        + w.Roles * jaccard a.Roles b.Roles
        + w.Policies * jaccard a.Policies b.Policies
        + w.MemoryGraph * jaccard a.MemoryGraph b.MemoryGraph
        + w.CorrectionHistory * jaccard a.CorrectionHistory b.CorrectionHistory
        + w.CrossRefTopology * jaccard a.CrossRefTopology b.CrossRefTopology
        + w.Provenance * jaccard a.Provenance b.Provenance

    // ── Projection-preservation check ────────────────────────────

    /// Check whether an identity expansion preserves the prior identity
    /// under projection: d(P_{n+1→n}(I_{n+1}), I_n) ≤ ε
    let projectionPreserved
        (weights: IdentityDistanceWeights)
        (epsilon: float)
        (prior: IdentityTuple)
        (expanded: IdentityTuple)
        : bool =
        identityDistance weights prior expanded <= epsilon

    // ── §10.E Test helpers ───────────────────────────────────────

    /// Create an empty identity tuple (useful for tests).
    let emptyIdentity : IdentityTuple =
        { Values = []
          Goals = []
          Roles = []
          Policies = []
          MemoryGraph = []
          CorrectionHistory = []
          CrossRefTopology = []
          Provenance = [] }

    /// Create an empty MajiIndex (useful for tests).
    let emptyIndex : MajiIndex =
        { Items = []
          CrossRefGraph = Map.empty
          LoadBearingSet = Set.empty
          BrokenRefs = []
          UnindexedItems = []
          Contradictions = []
          CoverageScore = 0.0 }
