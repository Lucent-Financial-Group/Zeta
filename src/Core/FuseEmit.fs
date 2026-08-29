namespace Zeta.Core

open System
open System.Linq.Expressions


/// IL-emit for homogeneous (same-key) map/filter chains. Each stage
/// becomes an `Expression.Call` on the captured `Func`; the chain
/// compiles to one `DynamicMethod` (`Expression.Compile`). Heterogeneous
/// Map (key type changes) stays on the closure `fusedVisit` path.
module internal FuseEmit =

    [<Struct>]
    type Result<'K when 'K : comparison> =
        val Keep: bool
        val Key: 'K
        new(keep: bool, key: 'K) = { Keep = keep; Key = key }

    type Stage<'K when 'K : comparison> =
        | Map of Func<'K, 'K>
        | Keep of Func<'K, bool>

    let compile (stages: Stage<'K> list) : Func<'K, Result<'K>> =
        let x = Expression.Parameter(typeof<'K>, "x")
        let mapInvoke =
            match typeof<Func<'K, 'K>>.GetMethod("Invoke", [| typeof<'K> |]) with
            | null -> invalidOp "Func<'K,'K>.Invoke"
            | mi -> mi
        let predInvoke =
            match typeof<Func<'K, bool>>.GetMethod("Invoke", [| typeof<'K> |]) with
            | null -> invalidOp "Func<'K,bool>.Invoke"
            | mi -> mi
        let ctor =
            match typeof<Result<'K>>.GetConstructor([| typeof<bool>; typeof<'K> |]) with
            | null -> invalidOp "FuseEmit.Result ctor"
            | ci -> ci
        let mutable keep : Expression = Expression.Constant(true, typeof<bool>)
        let mutable value : Expression = x
        for st in stages do
            match st with
            | Map f ->
                value <- Expression.Call(Expression.Constant(f, typeof<Func<'K, 'K>>), mapInvoke, value)
            | Keep p ->
                let pred = Expression.Call(Expression.Constant(p, typeof<Func<'K, bool>>), predInvoke, value)
                keep <- Expression.AndAlso(keep, pred)
        let body = Expression.New(ctor, keep, value)
        Expression.Lambda<Func<'K, Result<'K>>>(body, x).Compile()


/// Same-key map/filter op that can contribute stages to `FuseEmit.compile`.
type internal IHomogeneous<'K when 'K : comparison> =
    abstract InputOp: Op<ZSet<'K>>
    abstract Stages: FuseEmit.Stage<'K> list
    abstract SetFuseSkip: unit -> unit

module internal FuseWalk =

    let rec bottom<'K when 'K : comparison> (op: Op<ZSet<'K>>) : Op<ZSet<'K>> =
        match box op with
        | :? IHomogeneous<'K> as h -> bottom h.InputOp
        | _ -> op
