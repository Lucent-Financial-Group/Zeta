namespace Zeta.Core

open System
open System.Collections.Generic
open System.Runtime.CompilerServices
open System.Threading
open System.Threading.Tasks


/// Build-time fusion producer: a map that can feed a downstream fuse
/// without materializing its Z-set. `ForEachMapped` always reflects
/// the current fused chain (mutable), so a later Map∘Map rewrite is
/// visible to an already-installed Filter fuse thunk.
type internal IMapProducer<'B when 'B : comparison> =
    abstract SetFuseSkip: unit -> unit
    abstract SourceCount: int
    abstract ForEachMapped: visit: ('B -> int64 -> unit) -> unit

type internal IFilterProducer<'K when 'K : comparison> =
    abstract SetFuseSkip: unit -> unit
    abstract SourceCount: int
    abstract ForEachKept: visit: ('K -> int64 -> unit) -> unit

[<Sealed>]
type internal MapZSetOp<'A, 'B when 'A : comparison and 'B : comparison>(input: Op<ZSet<'A>>, f: Func<'A, 'B>) =
    inherit Op<ZSet<'B>>()
    let inputs = [| input :> Op |]
    let mutable skip = false
    let mutable fusedVisit: (('B -> int64 -> unit) -> unit) option = None
    let mutable ilCompiled: Func<'A, FuseEmit.Result<'A>> option = None
    let mutable ilRoot: Op<ZSet<'A>> option = None
    let mutable ilStages: FuseEmit.Stage<'A> list = []
    override _.Name = "map"
    override _.Inputs = inputs
    override _.IsLinear = true
    override _.IsFuseSkipped = skip
    override _.IsIlEmitted = ilCompiled.IsSome
    member _.SetFuseSkip() = skip <- true

    member this.ForEachMapped(visit: 'B -> int64 -> unit) =
        match ilCompiled, ilRoot with
        | Some compiled, Some root ->
            let span = root.Value.AsSpan()
            for i in 0 .. span.Length - 1 do
                let t = compiled.Invoke span.[i].Key
                if t.Keep then visit (unbox (box t.Key)) span.[i].Weight
        | _ ->
            match fusedVisit with
            | Some chain -> chain visit
            | None ->
                let span = input.Value.AsSpan()
                for i in 0 .. span.Length - 1 do
                    visit (f.Invoke span.[i].Key) span.[i].Weight

    member _.SourceCount =
        match ilRoot with
        | Some root -> root.Value.Count
        | None ->
            match box input with
            | :? IMapProducer<'A> as p -> p.SourceCount
            | :? IFilterProducer<'A> as p -> p.SourceCount
            | _ -> input.Value.Count

    interface IMapProducer<'B> with
        member this.SetFuseSkip() = this.SetFuseSkip()
        member this.SourceCount = this.SourceCount
        member this.ForEachMapped visit = this.ForEachMapped visit

    interface IHomogeneous<'A> with
        member _.InputOp = input
        member _.Stages =
            if typeof<'A> <> typeof<'B> then []
            elif not (List.isEmpty ilStages) then ilStages
            else [ FuseEmit.Map(unbox (box f)) ]
        member _.SetFuseSkip() = skip <- true

    override this.TryFuse fanoutOf =
        if skip || fusedVisit.IsSome || ilCompiled.IsSome then false
        elif fanoutOf input <> 1 then false
        elif typeof<'A> = typeof<'B> then
            match box input with
            | :? IHomogeneous<'A> as up when not (List.isEmpty up.Stages) ->
                let own = [ FuseEmit.Map(unbox (box f)) ]
                let stages = up.Stages @ own
                up.SetFuseSkip()
                ilStages <- stages
                ilCompiled <- Some(FuseEmit.compile stages)
                ilRoot <- Some(FuseWalk.bottom up.InputOp)
                true
            | :? IMapProducer<'A> as up ->
                up.SetFuseSkip()
                fusedVisit <- Some (fun visit ->
                    up.ForEachMapped (fun a w -> visit (f.Invoke a) w))
                true
            | :? IFilterProducer<'A> as up ->
                up.SetFuseSkip()
                fusedVisit <- Some (fun visit ->
                    up.ForEachKept (fun a w -> visit (f.Invoke a) w))
                true
            | _ -> false
        else
            match box input with
            | :? IMapProducer<'A> as up ->
                up.SetFuseSkip()
                fusedVisit <- Some (fun visit ->
                    up.ForEachMapped (fun a w -> visit (f.Invoke a) w))
                true
            | :? IFilterProducer<'A> as up ->
                up.SetFuseSkip()
                fusedVisit <- Some (fun visit ->
                    up.ForEachKept (fun a w -> visit (f.Invoke a) w))
                true
            | _ -> false

    override this.StepAsync(_: CancellationToken) =
        if skip then ValueTask.CompletedTask
        else
            match ilCompiled, ilRoot with
            | Some compiled, Some root ->
                let span = root.Value.AsSpan()
                let cap = max 1 span.Length
                let rented = Pool.Rent<ZEntry<'B>> cap
                try
                    let mutable n = 0
                    for i in 0 .. span.Length - 1 do
                        let t = compiled.Invoke span.[i].Key
                        if t.Keep && n < rented.Length then
                            rented.[n] <- ZEntry(unbox (box t.Key), span.[i].Weight)
                            n <- n + 1
                    if n = 0 then this.Value <- ZSet<'B>.Empty
                    else
                        let live = ZSetBuilder.sortAndConsolidate (Span<_>(rented, 0, n))
                        this.Value <-
                            if live = 0 then ZSet<'B>.Empty
                            else ZSet(Pool.FreezeSlice(rented, live))
                finally
                    Pool.Return rented
            | _ ->
                match fusedVisit with
                | None ->
                    this.Value <- ZSet.map f.Invoke input.Value
                | Some chain ->
                    let cap = max 1 this.SourceCount
                    let rented = Pool.Rent<ZEntry<'B>> cap
                    try
                        let mutable n = 0
                        chain (fun k w ->
                            if n < rented.Length then
                                rented.[n] <- ZEntry(k, w)
                                n <- n + 1)
                        if n = 0 then this.Value <- ZSet<'B>.Empty
                        else
                            let live = ZSetBuilder.sortAndConsolidate (Span<_>(rented, 0, n))
                            this.Value <-
                                if live = 0 then ZSet<'B>.Empty
                                else ZSet(Pool.FreezeSlice(rented, live))
                    finally
                        Pool.Return rented
            ValueTask.CompletedTask


[<Sealed>]
type internal FilterZSetOp<'K when 'K : comparison>(input: Op<ZSet<'K>>, predicate: Func<'K, bool>) =
    inherit Op<ZSet<'K>>()
    let inputs = [| input :> Op |]
    let mutable skip = false
    let mutable fusedVisit: (('K -> int64 -> unit) -> unit) option = None
    let mutable ilCompiled: Func<'K, FuseEmit.Result<'K>> option = None
    let mutable ilRoot: Op<ZSet<'K>> option = None
    let mutable ilStages: FuseEmit.Stage<'K> list = []
    override _.Name = "filter"
    override _.Inputs = inputs
    override _.IsLinear = true
    override _.IsFuseSkipped = skip
    override _.IsIlEmitted = ilCompiled.IsSome
    member _.SetFuseSkip() = skip <- true

    member this.ForEachKept(visit: 'K -> int64 -> unit) =
        match ilCompiled, ilRoot with
        | Some compiled, Some root ->
            let span = root.Value.AsSpan()
            for i in 0 .. span.Length - 1 do
                let t = compiled.Invoke span.[i].Key
                if t.Keep then visit t.Key span.[i].Weight
        | _ ->
            match fusedVisit with
            | Some chain -> chain visit
            | None ->
                let span = input.Value.AsSpan()
                for i in 0 .. span.Length - 1 do
                    if predicate.Invoke span.[i].Key then
                        visit span.[i].Key span.[i].Weight

    member _.SourceCount =
        match ilRoot with
        | Some root -> root.Value.Count
        | None ->
            match box input with
            | :? IMapProducer<'K> as p -> p.SourceCount
            | :? IFilterProducer<'K> as p -> p.SourceCount
            | _ -> input.Value.Count

    interface IFilterProducer<'K> with
        member this.SetFuseSkip() = this.SetFuseSkip()
        member this.SourceCount = this.SourceCount
        member this.ForEachKept visit = this.ForEachKept visit

    interface IHomogeneous<'K> with
        member _.InputOp = input
        member _.Stages =
            if not (List.isEmpty ilStages) then ilStages
            else [ FuseEmit.Keep predicate ]
        member _.SetFuseSkip() = skip <- true

    override this.TryFuse fanoutOf =
        if skip || fusedVisit.IsSome || ilCompiled.IsSome then false
        elif fanoutOf input <> 1 then false
        else
            match box input with
            | :? IHomogeneous<'K> as up when not (List.isEmpty up.Stages) ->
                let stages = up.Stages @ [ FuseEmit.Keep predicate ]
                up.SetFuseSkip()
                ilStages <- stages
                ilCompiled <- Some(FuseEmit.compile stages)
                ilRoot <- Some(FuseWalk.bottom up.InputOp)
                true
            | :? IMapProducer<'K> as up ->
                up.SetFuseSkip()
                fusedVisit <- Some (fun visit ->
                    up.ForEachMapped (fun k w -> if predicate.Invoke k then visit k w))
                true
            | :? IFilterProducer<'K> as up ->
                up.SetFuseSkip()
                fusedVisit <- Some (fun visit ->
                    up.ForEachKept (fun k w -> if predicate.Invoke k then visit k w))
                true
            | _ -> false

    override this.StepAsync(_: CancellationToken) =
        if skip then ValueTask.CompletedTask
        else
            match ilCompiled, ilRoot with
            | Some compiled, Some root ->
                let span = root.Value.AsSpan()
                let cap = max 1 span.Length
                let rented = Pool.Rent<ZEntry<'K>> cap
                try
                    let mutable n = 0
                    for i in 0 .. span.Length - 1 do
                        let t = compiled.Invoke span.[i].Key
                        if t.Keep && n < rented.Length then
                            rented.[n] <- ZEntry(t.Key, span.[i].Weight)
                            n <- n + 1
                    if n = 0 then this.Value <- ZSet<'K>.Empty
                    else
                        let live = ZSetBuilder.sortAndConsolidate (Span<_>(rented, 0, n))
                        this.Value <-
                            if live = 0 then ZSet<'K>.Empty
                            else ZSet(Pool.FreezeSlice(rented, live))
                finally
                    Pool.Return rented
            | _ ->
                match fusedVisit with
                | None ->
                    this.Value <- ZSet.filter predicate.Invoke input.Value
                | Some chain ->
                    let cap = max 1 this.SourceCount
                    let rented = Pool.Rent<ZEntry<'K>> cap
                    try
                        let mutable n = 0
                        chain (fun k w ->
                            if n < rented.Length then
                                rented.[n] <- ZEntry(k, w)
                                n <- n + 1)
                        if n = 0 then this.Value <- ZSet<'K>.Empty
                        else
                            let live = ZSetBuilder.sortAndConsolidate (Span<_>(rented, 0, n))
                            this.Value <-
                                if live = 0 then ZSet<'K>.Empty
                                else ZSet(Pool.FreezeSlice(rented, live))
                    finally
                        Pool.Return rented
            ValueTask.CompletedTask


[<Sealed>]
type internal FlatMapZSetOp<'A, 'B when 'A : comparison and 'B : comparison>
    (input: Op<ZSet<'A>>, f: Func<'A, ZSet<'B>>) =
    inherit Op<ZSet<'B>>()
    let inputs = [| input :> Op |]
    override _.Name = "flatMap"
    override _.Inputs = inputs
    /// Linear: ZSet.flatMap scales `f k` by the input entry's weight
    /// before accumulating — distributes over Z-set addition.
    override _.IsLinear = true
    override this.StepAsync(_: CancellationToken) =
        this.Value <- ZSet.flatMap f.Invoke input.Value
        ValueTask.CompletedTask


[<Sealed>]
type internal PlusZSetOp<'K when 'K : comparison>(a: Op<ZSet<'K>>, b: Op<ZSet<'K>>) =
    inherit Op<ZSet<'K>>()
    let inputs = [| a :> Op; b :> Op |]
    override _.Name = "plus"
    override _.Inputs = inputs
    override this.StepAsync(_: CancellationToken) =
        this.Value <- ZSet.add a.Value b.Value
        ValueTask.CompletedTask


[<Sealed>]
type internal MinusZSetOp<'K when 'K : comparison>(a: Op<ZSet<'K>>, b: Op<ZSet<'K>>) =
    inherit Op<ZSet<'K>>()
    let inputs = [| a :> Op; b :> Op |]
    override _.Name = "minus"
    override _.Inputs = inputs
    override this.StepAsync(_: CancellationToken) =
        this.Value <- ZSet.sub a.Value b.Value
        ValueTask.CompletedTask


[<Sealed>]
type internal NegZSetOp<'K when 'K : comparison>(a: Op<ZSet<'K>>) =
    inherit Op<ZSet<'K>>()
    let inputs = [| a :> Op |]
    override _.Name = "neg"
    override _.Inputs = inputs
    /// Linear: -(a + b) = -a + -b and -0 = 0.
    override _.IsLinear = true
    override this.StepAsync(_: CancellationToken) =
        this.Value <- ZSet.neg a.Value
        ValueTask.CompletedTask


[<Sealed>]
type internal DistinctZSetOp<'K when 'K : comparison>(input: Op<ZSet<'K>>) =
    inherit Op<ZSet<'K>>()
    let inputs = [| input :> Op |]
    override _.Name = "distinct"
    override _.Inputs = inputs
    override this.StepAsync(_: CancellationToken) =
        this.Value <- ZSet.distinct input.Value
        ValueTask.CompletedTask


[<Sealed>]
type internal DistinctIncrementalOp<'K when 'K : comparison>(integralPrev: Op<ZSet<'K>>, delta: Op<ZSet<'K>>) =
    inherit Op<ZSet<'K>>()
    let inputs = [| integralPrev :> Op; delta :> Op |]
    override _.Name = "distinctIncremental"
    override _.Inputs = inputs
    override this.StepAsync(_: CancellationToken) =
        this.Value <- ZSet.distinctIncremental integralPrev.Value delta.Value
        ValueTask.CompletedTask


[<Sealed>]
type internal JoinZSetOp<'A, 'B, 'K, 'C
    when 'A : comparison and 'B : comparison and 'K : comparison and 'C : comparison and 'K : not null>
    (a: Op<ZSet<'A>>,
     b: Op<ZSet<'B>>,
     keyA: Func<'A, 'K>,
     keyB: Func<'B, 'K>,
     combine: Func<'A, 'B, 'C>) =
    inherit Op<ZSet<'C>>()
    let inputs = [| a :> Op; b :> Op |]
    override _.Name = "join"
    override _.Inputs = inputs
    /// Bilinear: (a₁+a₂) ⋈ b = (a₁ ⋈ b) + (a₂ ⋈ b), symmetric in b,
    /// and 0 ⋈ b = a ⋈ 0 = 0. IncrementalAuto rewrites this to the
    /// three-term form `Δa ⋈ Δb + z⁻¹(I(a)) ⋈ Δb + Δa ⋈ z⁻¹(I(b))`.
    override _.IsBilinear = true
    override this.StepAsync(_: CancellationToken) =
        this.Value <-
            ZSet.join
                keyA.Invoke
                keyB.Invoke
                (fun x y -> combine.Invoke(x, y))
                a.Value b.Value
        ValueTask.CompletedTask


[<Sealed>]
type internal CartesianZSetOp<'A, 'B when 'A : comparison and 'B : comparison>
    (a: Op<ZSet<'A>>, b: Op<ZSet<'B>>) =
    inherit Op<ZSet<'A * 'B>>()
    let inputs = [| a :> Op; b :> Op |]
    override _.Name = "cartesian"
    override _.Inputs = inputs
    /// Bilinear: weights multiply (Checked.* in ZSet.cartesian); the
    /// product distributes over Z-set addition in each argument.
    override _.IsBilinear = true
    override this.StepAsync(_: CancellationToken) =
        this.Value <- ZSet.cartesian a.Value b.Value
        ValueTask.CompletedTask


[<Sealed>]
type internal GroupBySumOp<'K, 'G when 'K : comparison and 'G : comparison and 'G : not null>
    (input: Op<ZSet<'K>>, key: Func<'K, 'G>, value: Func<'K, int64>) =
    inherit Op<ZSet<'G * int64>>()
    let inputs = [| input :> Op |]
    override _.Name = "groupBySum"
    override _.Inputs = inputs
    override this.StepAsync(_: CancellationToken) =
        let span = input.Value.AsSpan()
        if span.IsEmpty then
            this.Value <- ZSet<'G * int64>.Empty
        else
            let sums = Dictionary<'G, int64>(span.Length)
            for i in 0 .. span.Length - 1 do
                let g = key.Invoke span.[i].Key
                // Checked × — user value × weight.
                let v = Checked.(*) (value.Invoke span.[i].Key) span.[i].Weight
                let mutable existing = 0L
                if sums.TryGetValue(g, &existing) then
                    sums.[g] <- Checked.(+) existing v
                else
                    sums.[g] <- v
            let rented = Pool.Rent<ZEntry<'G * int64>> sums.Count
            try
                let mutable k = 0
                for kv in sums do
                    if kv.Value <> 0L then
                        rented.[k] <- ZEntry((kv.Key, kv.Value), 1L)
                        k <- k + 1
                if k = 0 then
                    this.Value <- ZSet<'G * int64>.Empty
                else
                    let live = ZSetBuilder.sortAndConsolidate (Span<_>(rented, 0, k))
                    this.Value <-
                        if live = 0 then ZSet<'G * int64>.Empty
                        else ZSet(Pool.FreezeSlice(rented, live))
            finally
                Pool.Return rented
        ValueTask.CompletedTask


[<Sealed>]
type internal IndexWithOp<'A, 'K, 'V
    when 'A : comparison and 'K : comparison and 'V : comparison and 'K : not null>
    (input: Op<ZSet<'A>>, key: Func<'A, 'K>, value: Func<'A, 'V>) =
    inherit Op<IndexedZSet<'K, 'V>>()
    let inputs = [| input :> Op |]
    override _.Name = "indexWith"
    override _.Inputs = inputs
    /// Linear: indexing distributes over Z-set addition because the
    /// (key, value) extraction is weight-independent and the
    /// per-key value groups sum via ZSet.add.
    override _.IsLinear = true
    override this.StepAsync(_: CancellationToken) =
        this.Value <- IndexedZSet.indexWith key.Invoke value.Invoke input.Value
        ValueTask.CompletedTask


[<Sealed>]
type internal IndexedJoinOp<'K, 'VA, 'VB, 'C
    when 'K : comparison and 'VA : comparison and 'VB : comparison and 'C : comparison and 'K : not null>
    (a: Op<IndexedZSet<'K, 'VA>>,
     b: Op<IndexedZSet<'K, 'VB>>,
     combine: Func<'K, 'VA, 'VB, 'C>) =
    inherit Op<ZSet<'C>>()
    let inputs = [| a :> Op; b :> Op |]
    override _.Name = "indexedJoin"
    override _.Inputs = inputs
    /// Bilinear: per-key value-group cartesian; weights multiply
    /// (Checked.* in IndexedZSet.join); distributes per-arg.
    override _.IsBilinear = true
    override this.StepAsync(_: CancellationToken) =
        this.Value <-
            IndexedZSet.join
                (fun k va vb -> combine.Invoke(k, va, vb))
                a.Value b.Value
        ValueTask.CompletedTask


/// Linear/bilinear operator builders exposed as extension methods on `Circuit`.
[<Extension>]
type OperatorExtensions =

    [<Extension>]
    static member Map<'A, 'B when 'A : comparison and 'B : comparison>
        (this: Circuit, s: Stream<ZSet<'A>>, f: Func<'A, 'B>) : Stream<ZSet<'B>> =
        this.RegisterStream (MapZSetOp(s.Op, f))

    [<Extension>]
    static member Filter<'K when 'K : comparison>
        (this: Circuit, s: Stream<ZSet<'K>>, predicate: Func<'K, bool>) : Stream<ZSet<'K>> =
        this.RegisterStream (FilterZSetOp(s.Op, predicate))

    [<Extension>]
    static member FlatMap<'A, 'B when 'A : comparison and 'B : comparison>
        (this: Circuit, s: Stream<ZSet<'A>>, f: Func<'A, ZSet<'B>>) : Stream<ZSet<'B>> =
        this.RegisterStream (FlatMapZSetOp(s.Op, f))

    [<Extension>]
    static member Plus<'K when 'K : comparison>
        (this: Circuit, a: Stream<ZSet<'K>>, b: Stream<ZSet<'K>>) : Stream<ZSet<'K>> =
        this.RegisterStream (PlusZSetOp(a.Op, b.Op))

    [<Extension>]
    static member Minus<'K when 'K : comparison>
        (this: Circuit, a: Stream<ZSet<'K>>, b: Stream<ZSet<'K>>) : Stream<ZSet<'K>> =
        this.RegisterStream (MinusZSetOp(a.Op, b.Op))

    [<Extension>]
    static member Negate<'K when 'K : comparison>
        (this: Circuit, s: Stream<ZSet<'K>>) : Stream<ZSet<'K>> =
        this.RegisterStream (NegZSetOp(s.Op))

    [<Extension>]
    static member Distinct<'K when 'K : comparison>
        (this: Circuit, s: Stream<ZSet<'K>>) : Stream<ZSet<'K>> =
        this.RegisterStream (DistinctZSetOp(s.Op))

    [<Extension>]
    static member DistinctIncremental<'K when 'K : comparison>
        (this: Circuit, integralPrev: Stream<ZSet<'K>>, delta: Stream<ZSet<'K>>) : Stream<ZSet<'K>> =
        this.RegisterStream (DistinctIncrementalOp(integralPrev.Op, delta.Op))

    [<Extension>]
    static member Join<'A, 'B, 'K, 'C
        when 'A : comparison and 'B : comparison and 'K : comparison and 'C : comparison and 'K : not null>
        (this: Circuit,
         a: Stream<ZSet<'A>>,
         b: Stream<ZSet<'B>>,
         keyA: Func<'A, 'K>,
         keyB: Func<'B, 'K>,
         combine: Func<'A, 'B, 'C>) : Stream<ZSet<'C>> =
        this.RegisterStream (JoinZSetOp(a.Op, b.Op, keyA, keyB, combine))

    [<Extension>]
    static member Cartesian<'A, 'B when 'A : comparison and 'B : comparison>
        (this: Circuit, a: Stream<ZSet<'A>>, b: Stream<ZSet<'B>>) : Stream<ZSet<'A * 'B>> =
        this.RegisterStream (CartesianZSetOp(a.Op, b.Op))

    [<Extension>]
    static member GroupBySum<'K, 'G when 'K : comparison and 'G : comparison and 'G : not null>
        (this: Circuit,
         s: Stream<ZSet<'K>>,
         key: Func<'K, 'G>,
         value: Func<'K, int64>) : Stream<ZSet<'G * int64>> =
        this.RegisterStream (GroupBySumOp(s.Op, key, value))

    [<Extension>]
    static member IndexWith<'A, 'K, 'V
        when 'A : comparison and 'K : comparison and 'V : comparison and 'K : not null>
        (this: Circuit,
         s: Stream<ZSet<'A>>,
         key: Func<'A, 'K>,
         value: Func<'A, 'V>) : Stream<IndexedZSet<'K, 'V>> =
        this.RegisterStream (IndexWithOp(s.Op, key, value))

    [<Extension>]
    static member IndexedJoin<'K, 'VA, 'VB, 'C
        when 'K : comparison and 'VA : comparison and 'VB : comparison and 'C : comparison and 'K : not null>
        (this: Circuit,
         a: Stream<IndexedZSet<'K, 'VA>>,
         b: Stream<IndexedZSet<'K, 'VB>>,
         combine: Func<'K, 'VA, 'VB, 'C>) : Stream<ZSet<'C>> =
        this.RegisterStream (IndexedJoinOp(a.Op, b.Op, combine))
