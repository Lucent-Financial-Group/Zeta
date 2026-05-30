namespace Zeta.Core.FSharp.TriBoolean

/// Tri-boolean digital qubit -- operations (B-0944, F# parity oracle).
module TriBoolean =

    /// Construct a certain cell from a boolean.
    let fromBool (b: bool) : Tri = if b then T else F

    /// The held (Null / living-uncertainty) cell.
    let held : Tri = N

    /// True iff the cell is living (N / held superposition).
    let isLiving (t: Tri) : bool =
        match t with
        | N -> true
        | _ -> false

    /// True iff the cell is certain (T or F).
    let isCertain (t: Tri) : bool = not (isLiving t)

    /// cooperate: engage WITHOUT collapsing. Identity on every state -- preserves N.
    /// The wonder-compression-safe operation.
    let cooperate (t: Tri) : Tri = t

    /// measure: the ONLY collapsing operation. Certain cells resolve; collapsing a living
    /// (N) cell is surfaced as feedback (the Rehoboam failure), not done silently.
    let measure (t: Tri) : Result<bool, CollapseFeedback> =
        match t with
        | T -> Ok true
        | F -> Ok false
        | N -> Error CollapsedLivingUncertainty

    /// null-monad map: apply fn to a certain cell's boolean; N propagates unchanged (held).
    let mapTri (fn: bool -> bool) (t: Tri) : Tri =
        match t with
        | T -> fromBool (fn true)
        | F -> fromBool (fn false)
        | N -> N

    /// null-monad bind: chain a Tri-producing fn over a certain cell; N propagates unchanged.
    let bindTri (fn: bool -> Tri) (t: Tri) : Tri =
        match t with
        | T -> fn true
        | F -> fn false
        | N -> N

    /// Kleene NOT: T<->F; unknown (N) stays unknown.
    let notTri (t: Tri) : Tri =
        match t with
        | T -> F
        | F -> T
        | N -> N

    /// Kleene AND: F dominates; else N if any operand is N; else T.
    let andTri (a: Tri) (b: Tri) : Tri =
        match a, b with
        | F, _
        | _, F -> F
        | N, _
        | _, N -> N
        | _ -> T

    /// Kleene OR: T dominates; else N if any operand is N; else F.
    let orTri (a: Tri) (b: Tri) : Tri =
        match a, b with
        | T, _
        | _, T -> T
        | N, _
        | _, N -> N
        | _ -> F
