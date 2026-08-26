namespace Zeta.Core

/// **Correlation Estimator (ρ)**
///
/// Estimates the pairwise correlation ρ between adopters based on their
/// provenance polynomials. This fulfills the requirement for the N_eff
/// ratification gate by evaluating structural sameness.
module CorrelationEstimator =

    /// Calculate the Jaccard similarity between two provenance polynomials
    /// based on their base tokens (support).
    ///
    /// J = |A ∩ B| / |A ∪ B|
    /// If both supports are empty, they share no source, so J = 0.
    let jaccard (a: ProvenancePoly) (b: ProvenancePoly) : float =
        let supportA = Provenance.support a
        let supportB = Provenance.support b
        if Set.isEmpty supportA && Set.isEmpty supportB then
            0.0
        else
            let inter = Set.intersect supportA supportB
            let uni = Set.union supportA supportB
            float (Set.count inter) / float (Set.count uni)

    /// Calculate the average pairwise correlation (ρ) for a group of adopters.
    ///
    /// For n adopters, there are n(n-1)/2 pairs. The overall ρ is the
    /// arithmetic mean of their Jaccard similarities.
    let calculateRho (adopters: seq<ProvenancePoly>) : float =
        let arr = Seq.toArray adopters
        let n = arr.Length
        if n < 2 then
            0.0
        else
            let mutable sum = 0.0
            for i in 0 .. n - 1 do
                for j in i + 1 .. n - 1 do
                    sum <- sum + jaccard arr.[i] arr.[j]
            
            let pairCount = float (n * (n - 1)) / 2.0
            sum / pairCount
