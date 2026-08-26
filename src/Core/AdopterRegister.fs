namespace Zeta.Core

/// **The `adopter` register — folding adoption declarations into a Z-set.**
///
/// Models adoption of the Zeta Manifesto as a declared stance (Adopted) and
/// un-adopting as a retraction (Retracted). The fold maintains a Z-set of
/// active adopters.
///
/// This serves as the register for the N_eff constitutional promotion gate
/// defined in MANIFESTO.md. The gate is necessary but not sufficient: passing
/// it licenses a positive human act of promotion, failing it blocks.
module AdopterRegister =

    /// An event on the adopter stream (+1 or -1 fold).
    type AdoptionEvent =
        | Adopted of identity: string
        | Retracted of identity: string

    /// The active register is a Z-set of identity strings.
    type Register = ZSet<string>

    /// Empty register
    let empty : Register = ZSet.empty

    /// Apply a single event, maintaining Z-set semantics.
    let apply (reg: Register) (ev: AdoptionEvent) : Register =
        match ev with
        | Adopted id -> ZSet.add reg (ZSet.singleton id 1L)
        | Retracted id -> ZSet.add reg (ZSet.singleton id -1L)

    /// Fold a sequence of events into a register.
    let fold (events: AdoptionEvent seq) : Register =
        Seq.fold apply empty events

    /// Retrieve the currently active adopters (net weight > 0).
    let activeAdopters (reg: Register) : string list =
        reg
        |> Seq.filter (fun e -> e.Weight > 0L)
        |> Seq.map (fun e -> e.Key)
        |> Seq.toList

    /// The number of unique active adopters.
    let activeCount (reg: Register) : int =
        activeAdopters reg |> List.length

    /// The fixed, manually chosen constitutional threshold.
    /// As stated in the manifesto review: "A threshold is chosen, not derived."
    [<Literal>]
    let RequiredNEff = 10.0

    /// Evaluate whether the current register state and a provided rho estimator
    /// license the human act of constitutional promotion.
    ///
    /// N_eff = n / (1 + (n-1)*rho)
    /// 
    /// If N_eff >= 10.0, promotion is licensed.
    let isPromotionLicensed (reg: Register) (rho: float) : bool =
        let n = activeCount reg
        if n = 0 then false
        else
            // Uses the Kish design effect implemented in DeclaredStanceLedger
            let nEff = DeclaredStanceLedger.effectiveIndependentCount n rho
            nEff >= RequiredNEff
