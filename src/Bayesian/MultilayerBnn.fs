namespace Zeta.Bayesian

/// **MultilayerBnn — an N-layer Bayesian network over a chain of Gaussian latents.**
///
/// ## The model, stated explicitly
///
/// One latent variable `x_i` per layer. Three kinds of factor:
///
///   * `prior_i`   — the layer prior `N(x_i ; priors.[i])`;
///   * `data`      — the observation stream, absorbed at layer 0 with variance
///                   `ObservationVariances.[0]`;
///   * `channel_i` — for `i >= 1`, the link `N(s_i ; x_i, ObservationVariances.[i])`,
///                   where `s_i = x_(i-1)` under `Sequential` and
///                   `s_i = x_(i-1) + (sum of the skip sources)` under `SkipConnections`.
///
/// Under `Sequential` that is a chain, hence a tree, so sum-product is EXACT:
/// one forward sweep plus one backward sweep yields the exact marginals. That
/// two-pass schedule is the Rauch-Tung-Striebel smoother in factor-graph
/// clothing (Rauch, Tung and Striebel 1965; Kalman 1960).
///
/// ## What this revision fixed
///
/// The inter-layer hand-off used to be a POINT ESTIMATE: layer `i` received
/// `Gaussian.mean posterior_(i-1)` as a scalar observation and every layer
/// accumulated it into its own likelihood product. Three defects followed from
/// that single choice.
///
///   1. **The variance of the layer below was discarded.** Output precision was
///      depth-INVARIANT (11.0 at every depth in the reproduction) while the mean
///      attenuated geometrically, so a deep agent published a confidently wrong
///      answer — and confidence is the only channel the society reads.
///   2. **The advertised EP cavity was an algebraic identity.** A layer holds
///      only `prior x likelihood`, so `posterior / likelihood` is identically the
///      prior and `(P - L) + L = P`; the backward pass provably did nothing.
///   3. **Messages were accumulated rather than replaced,** so one observation
///      was counted once per layer.
///
/// The fix is to carry a MESSAGE instead of a number. A belief crossing a noisy
/// link keeps its mean and gains the link variance (`throughChannel`); a skip
/// junction sums by convolution (`convolve`); and each sweep RECOMPUTES the
/// up/down messages instead of multiplying fresh copies in. Only layer 0
/// accumulates evidence, because only layer 0 sees data.
///
/// The cavity is now real: the message from `x_(i-1)` to `x_i` is the belief at
/// layer `i-1` with the message layer `i` sent DOWN divided out — the
/// sum-product variable rule, which is exactly the EP cavity (Minka 2001).
/// Dividing it out is also what makes both sweeps idempotent (discipline #6).
///
/// ## What this revision did NOT fix, deliberately
///
/// Depth still attenuates the posterior mean. That is now a property of the
/// STATED MODEL rather than of the arithmetic: every layer carries its own
/// proper prior, so every hop shrinks the mean toward that prior while the
/// channel adds variance. With near-flat deeper priors the same code preserves
/// the mean and grows the variance instead. Choosing the per-layer prior is a
/// modelling decision for the caller, and an agent whose interval fails to
/// cover the truth must be refused by a calibration gate rather than silently
/// summed into a society.
///
/// ## Honest scope boundary
///
/// Under `SkipConnections` the graph is loopy: the forward sweep carries skip
/// evidence but the backward sweep sends downward messages only along the
/// sequential links, so the result is a first-order approximation rather than
/// the exact marginal. `FactorGraph.runToFixpointDamped` is the upgrade path.
///
/// Anchors: Kalman 1960; Rauch, Tung and Striebel 1965 (the two-pass smoother);
/// Kschischang, Frey and Loeliger 2001 (sum-product); Loeliger 2004 (the
/// Gaussian message tables for the sum and channel factors); Minka 2001 (EP,
/// and the reason a fully conjugate site has nothing left to refine).
/// All cited from standing knowledge, not page-checked in this pass.
[<RequireQualifiedAccess>]
module MultilayerBnn =

    // -- Types ------------------------------------------------------------------

    /// A single layer in the network — a MinimalBnn inference cell. Only layer 0
    /// ever absorbs data; deeper layers contribute their prior and their
    /// bookkeeping, and their belief is formed from messages.
    type Layer = MinimalBnn.State

    /// Wiring topology: how layers are connected.
    /// `Sequential` = each layer feeds the next (default).
    /// `SkipConnection from to` = layer `from` also feeds layer `to` directly
    ///   (residual connection — the source beliefs are SUMMED at `to`).
    /// `Dag parents` = `parents.[i]` is the full set of layers feeding layer `i`;
    /// the general case, of which the other two are special forms.
    ///
    /// ALL THREE ARE READ THROUGH `parentsOf` AND NOWHERE ELSE. A topology case
    /// that one sweep interprets and another ignores is how `SkipConnections`
    /// became a first-order approximation: the forward sweep honoured the skips
    /// and the backward sweep did not. One interpreter means a new case cannot
    /// silently miss a code path — and the compiler proved that immediately, by
    /// refusing to build until `toJsonString` handled `Dag` too.
    type Topology =
        | Sequential
        | SkipConnections of (int * int) list
        | Dag of int list array

    /// The layers feeding layer `i`, for any topology. The single place a
    /// topology is interpreted.
    ///
    /// ORDER IS LOAD-BEARING: the sequential predecessor comes first, then the
    /// skips in declaration order, because the sweeps fold over this list and
    /// Gaussian convolution — associative in exact arithmetic — is NOT
    /// bit-associative in floating point. Reordering moves the last ulp of the
    /// numbers this module's bit-identity tests pin.
    let parentsOf (topology: Topology) (i: int) : int list =
        match topology with
        | Sequential -> if i <= 0 then [] else [ i - 1 ]
        | SkipConnections pairs ->
            let skips =
                pairs |> List.choose (fun (from, ``to``) -> if ``to`` = i then Some from else None)
            (if i <= 0 then [] else [ i - 1 ]) @ skips
        | Dag parents -> if i >= 0 && i < parents.Length then parents.[i] else []

    /// An N-layer Bayesian network.
    type Network =
        { /// The layers, in forward-pass order.
          Layers: Layer array
          /// The wiring topology.
          Topology: Topology
          /// Layer 0: the data observation variance. Layer i >= 1: the noise
          /// variance of the link feeding layer i.
          ObservationVariances: float array
          /// The message arriving at layer i FROM BELOW. Recomputed by every
          /// forward sweep — never accumulated, which is what stops one
          /// observation being counted once per layer.
          UpwardMessages: Gaussian array
          /// The message arriving at layer i FROM ABOVE. Recomputed by every
          /// backward sweep. Uniform at the top layer by construction.
          DownwardMessages: Gaussian array }

    /// Exactness of a bounded per-edge factor-graph query.
    ///
    /// Acyclic sum-product is exact only after convergence. On a loopy Gaussian
    /// graph, convergence makes the means exact but generally not the variances
    /// (Weiss and Freeman 1999/2001). An unsettled iterate is always labelled as
    /// such rather than promoted to a posterior.
    type FactorGraphExactness =
        | ExactAcyclic
        /// Exact Gaussian means and variances obtained by conditioning on a
        /// declared feedback vertex set whose residual factor graph is a tree.
        | ExactLoopyViaFvs of feedbackVertexCount: int
        | ConvergedLoopyMeansOnly
        | UnsettledAcyclic
        | UnsettledLoopy

    /// One durable online evidence update plus its bounded per-edge inference
    /// receipt. `Network` carries the observation absorbed exactly once at layer
    /// zero; `Marginals` are a query result and are not copied into the node-level
    /// upward/downward sweep arrays.
    type FactorGraphUpdate =
        { Network: Network
          Marginals: Gaussian array
          Rounds: int
          Converged: bool
          Exactness: FactorGraphExactness }

    /// How the feedback vertex set was selected from the declared factor topology.
    type FeedbackVertexSelection =
        | ExhaustiveMinimum
        | GreedyDeclaredTopology

    /// Read-only FVS-conditioned Gaussian query. Unlike `FactorGraphUpdate`, the
    /// receipt names the selected feedback vertices and never implies that an
    /// online evidence accumulator was canonicalized.
    type FeedbackMessagePassingQuery =
        { Network: Network
          Marginals: Gaussian array
          Rounds: int
          Converged: bool
          Exactness: FactorGraphExactness
          FeedbackVertices: int list
          Selection: FeedbackVertexSelection option }

    /// Exact dense marginal query for the finite declared linear-Gaussian
    /// multilayer model. This is a correctness fallback for at most 64 layers,
    /// not a replacement for distributed per-edge message passing.
    type ExactDenseGaussianQuery =
        { Network: Network
          Marginals: Gaussian array
          LayerCount: int
          AbsorbedObservationCount: int }

    // -- Construction -------------------------------------------------------------

    /// Create an N-layer network from an array of Gaussian priors and
    /// observation variances. Returns `Error` if any layer fails to
    /// initialise (invalid prior or non-positive variance).
    let tryCreate
        (priors: Gaussian array)
        (observationVariances: float array)
        (topology: Topology)
        : Result<Network, string> =
        if priors.Length <> observationVariances.Length then
            Error
                $"priors.Length ({priors.Length}) must equal observationVariances.Length ({observationVariances.Length})"
        elif priors.Length = 0 then
            Error "network must have at least one layer"
        else
            let results =
                Array.zip priors observationVariances
                |> Array.mapi (fun i (prior, variance) ->
                    MinimalBnn.tryCreate prior variance
                    |> Result.mapError (fun e -> $"layer {i}: {e}"))
            let errors = results |> Array.choose (function Error e -> Some e | _ -> None)
            if errors.Length > 0 then
                Error(errors |> String.concat "; ")
            else
                let layers = results |> Array.choose (function Ok s -> Some s | _ -> None)
                Ok
                    { Layers = layers
                      Topology = topology
                      ObservationVariances = observationVariances
                      UpwardMessages = Array.create layers.Length Gaussian.One
                      DownwardMessages = Array.create layers.Length Gaussian.One }

    /// Create a sequential network with identical priors and variances at
    /// every layer — the simplest useful default.
    let tryCreateUniform
        (depth: int)
        (prior: Gaussian)
        (observationVariance: float)
        : Result<Network, string> =
        tryCreate
            (Array.create depth prior)
            (Array.create depth observationVariance)
            Sequential

    // -- Skip-connection helpers ---------------------------------------------------

    /// Remove the FIRST occurrence of `x`, not all of them. A topology may
    /// legitimately name the same parent twice (a skip from `i-1` to `i`
    /// alongside the sequential feed), and that duplicate means the source is
    /// summed in twice. Dropping both would silently change the model rather
    /// than preserve it.
    let private removeFirst (x: int) (xs: int list) : int list =
        let rec go acc =
            function
            | [] -> List.rev acc
            | y :: rest when y = x -> List.rev acc @ rest
            | y :: rest -> go (y :: acc) rest
        go [] xs

    // -- Gaussian message primitives -----------------------------------------------

    /// The sum of two INDEPENDENT Gaussian beliefs: means add, variances add
    /// (the sum-factor rule, Loeliger 2004). A uniform addend absorbs — the sum
    /// of a known and an unknown quantity is unknown.
    let private convolve (a: Gaussian) (b: Gaussian) : Gaussian =
        if a.Precision <= 0.0 || b.Precision <= 0.0 then
            Gaussian.One
        else
            let v = (1.0 / a.Precision) + (1.0 / b.Precision)
            { PrecisionMean = (Gaussian.mean a + Gaussian.mean b) / v
              Precision = 1.0 / v }

    /// The inverse of `convolve` in one addend: the message about `x` given a
    /// belief about `x + y` and a belief about `y`. Means SUBTRACT; variances
    /// still ADD. That asymmetry is the point — uncertainty never cancels,
    /// which is why this is not `Gaussian.divide`.
    let private deconvolve (total: Gaussian) (other: Gaussian) : Gaussian =
        if total.Precision <= 0.0 || other.Precision <= 0.0 then
            Gaussian.One
        else
            let v = (1.0 / total.Precision) + (1.0 / other.Precision)
            { PrecisionMean = (Gaussian.mean total - Gaussian.mean other) / v
              Precision = 1.0 / v }

    /// A belief pushed through a link with additive noise of known variance: the
    /// mean survives, the variance grows by exactly the link noise. This is the
    /// quantity the previous point-estimate hand-off silently discarded, and
    /// discarding it is what made the output precision depth-invariant.
    let private throughChannel (noiseVariance: float) (m: Gaussian) : Gaussian =
        if m.Precision <= 0.0 then
            Gaussian.One
        else
            let v = (1.0 / m.Precision) + noiseVariance
            { PrecisionMean = (Gaussian.mean m) / v
              Precision = 1.0 / v }

    // -- Beliefs -------------------------------------------------------------------

    /// The marginal belief at layer `i`: the layer posterior (prior times the
    /// accumulated data likelihood, which is uniform above layer 0) times the
    /// message from below times the message from above.
    let beliefAt (net: Network) (i: int) : Gaussian =
        net.Layers.[i].Posterior * net.UpwardMessages.[i] * net.DownwardMessages.[i]

    // -- Forward pass ---------------------------------------------------------------

    /// Run the forward (filtering) sweep. Layer 0 absorbs the scalar
    /// observation; every deeper layer recomputes the message arriving from
    /// below. Returns the updated network and the per-layer beliefs.
    let forward (observation: float) (net: Network) : Result<Network * Gaussian array, string> =
        let n = net.Layers.Length
        let layers = Array.copy net.Layers
        let up = Array.copy net.UpwardMessages
        let down = Array.copy net.DownwardMessages
        let posteriors = Array.zeroCreate<Gaussian> n
        let localBelief i = layers.[i].Posterior * up.[i] * down.[i]

        let mutable error : string option = None

        // Layer 0 is the only layer that sees data: the conjugate accumulation
        // there is genuine evidence, not a relayed copy of it.
        match MinimalBnn.update observation layers.[0] with
        | Error e -> error <- Some(sprintf "forward pass layer 0: %s" e)
        | Ok updatedLayer0 ->
            layers.[0] <- updatedLayer0
            posteriors.[0] <- localBelief 0

        let mutable i = 1
        while i < n && error.IsNone do
            let previous = localBelief i
            // The message x_(i-1) -> x_i is the belief at layer i-1 with the
            // message that layer i sent DOWN divided out: the sum-product
            // variable rule, i.e. the EP cavity (Minka 2001). Without this
            // division the chain re-absorbs its own evidence every sweep.
            // ONE PARENT IS THE CAVITY PARENT; THE REST ARE CONVOLVED RAW, and the
            // asymmetry is a limitation of the representation rather than a choice.
            // `down` is indexed BY LAYER, so it holds one downward message per
            // NODE — exactly right for a chain, where a layer has at most one
            // child, and unable to express the per-EDGE message a DAG needs. The
            // sequential predecessor's entry genuinely is the message this layer
            // sent down, so dividing it out is the correct sum-product cavity
            // (Minka 2001). A skip source's entry is the message IT received from
            // ITS own sequential child — a different edge — so dividing that out
            // would remove the wrong evidence, hence raw. `FactorGraph`'s
            // `FactorToVar : Map<factor, Map<var, 'M>>` is per-edge, and is where
            // this stops being approximate.
            let parents = parentsOf net.Topology i |> List.filter (fun src -> src < i)
            let hasSequentialParent = List.contains (i - 1) parents
            let cavityBelow =
                if hasSequentialParent then Gaussian.divide (localBelief (i - 1)) down.[i - 1]
                else Gaussian.One
            let sumBelief =
                (if hasSequentialParent then removeFirst (i - 1) parents else parents)
                |> List.fold (fun acc src -> convolve acc (localBelief src)) cavityBelow
            up.[i] <- throughChannel net.ObservationVariances.[i] sumBelief
            let updated = localBelief i
            if not (System.Double.IsFinite updated.Precision && System.Double.IsFinite updated.PrecisionMean) then
                error <- Some(sprintf "forward pass layer %d: non-finite belief" i)
            else
                let stepIv = InformationValue.compute previous updated
                layers.[i] <-
                    { layers.[i] with
                        Objective =
                            { layers.[i].Objective with
                                ObservationCount = layers.[i].Objective.ObservationCount + 1
                                LastIncrementalIv = stepIv
                                CumulativeIv = layers.[i].Objective.CumulativeIv + stepIv } }
                posteriors.[i] <- updated
                i <- i + 1

        match error with
        | Some e -> Error e
        | None ->
            Ok(
                { net with
                    Layers = layers
                    UpwardMessages = up
                    DownwardMessages = down },
                posteriors)

    // -- Backward pass (the EP cavity sweep) ----------------------------------------

    /// Run the backward (smoothing) sweep: for each layer from the top down,
    /// form the EP cavity at the layer above — its belief WITHOUT the message
    /// that came up from this layer — push it back through the link, and store
    /// it as the message arriving from above.
    ///
    /// On a `Sequential` chain, forward-then-backward gives the EXACT marginals,
    /// and the sweep is idempotent: `down.[i]` is computed from quantities that
    /// do not contain `down.[i]`.
    ///
    /// THAT IDEMPOTENCY CLAIM IS FALSE FOR ANY MULTI-PARENT TOPOLOGY, and it was
    /// stated here without the qualifier until 2026-08-26. The sum-removal fold
    /// below deconvolves `localBelief src` for each other addend, and
    /// `localBelief` reads `down.[src]` — which THIS sweep has already
    /// overwritten, because `i` descends. So the second run sees different inputs
    /// and lands somewhere else.
    ///
    /// MEASURED, worst per-layer drift between two consecutive backward runs on a
    /// 5-layer net (`MLBNN-34`):
    ///
    ///     Sequential  0        Dag-chain  0
    ///     Dag-skip    0.66     SkipConnections  0.66
    ///
    /// It is PRE-EXISTING, not a consequence of the `Dag` generalisation: the
    /// `SkipConnections` row drifts identically and always did. `MLBNN-16` could
    /// not see it because it exercises only `Sequential` and compares through
    /// `toJsonString`, whose `%.12g` hides anything below the twelfth digit.
    ///
    /// NOT FIXED HERE, deliberately. The sweeps' multi-parent answer is already
    /// known to be the wrong one — `MLBNN-33` measures its mean error at 2.07
    /// against an exact solve, where `tryMarginalsViaFactorGraph` scores 4e-14 —
    /// so replacing one approximation with a differently-wrong idempotent
    /// approximation is not obviously progress, and the correct path already
    /// exists and IS idempotent (`MLBNN-35`). Use the factor graph for anything
    /// that is not a chain.
    let backward (net: Network) : Result<Network, string> =
        let n = net.Layers.Length
        let up = net.UpwardMessages
        let down = Array.copy net.DownwardMessages
        let localBelief i = net.Layers.[i].Posterior * up.[i] * down.[i]

        // The top layer receives nothing from above; hold that invariant.
        down.[n - 1] <- Gaussian.One

        let mutable error : string option = None
        let mutable i = n - 2
        while i >= 0 && error.IsNone do
            let cavityAbove = Gaussian.divide (localBelief (i + 1)) up.[i + 1]
            if not (Gaussian.isProper cavityAbove) then
                // Nothing to say downward yet; a uniform message is the honest
                // answer, not a fabricated one.
                down.[i] <- Gaussian.One
            else
                let toSum = throughChannel net.ObservationVariances.[i + 1] cavityAbove
                // If layer i+1 was fed by a SUM, remove the other addends. The
                // target itself is never removed from its own message.
                //
                // Swapping `skipSourcesFor` for `parentsOf` changes nothing here:
                // the only element `parentsOf` adds is the sequential parent of
                // `i+1`, which IS `i`, and the filter already excluded it.
                //
                // STILL A CHAIN WALK, which is this sweep's honest limit. `i`
                // descends `n-2 .. 0` taking its downward message from `i+1`
                // alone, so a layer whose real consumer is a higher non-adjacent
                // node never receives that node's evidence. Under `Dag` that is an
                // approximation of exactly the kind `SkipConnections` already was.
                // Fixing it needs per-edge messages, not a better traversal order.
                down.[i] <-
                    parentsOf net.Topology (i + 1)
                    |> List.filter (fun src -> src < i + 1 && src <> i)
                    |> List.fold (fun acc src -> deconvolve acc (localBelief src)) toSum
            let updated = localBelief i
            if not (System.Double.IsFinite updated.Precision && System.Double.IsFinite updated.PrecisionMean) then
                error <- Some(sprintf "backward pass layer %d: non-finite belief" i)
            else
                i <- i - 1

        match error with
        | Some e -> Error e
        | None -> Ok { net with DownwardMessages = down }

    // -- Factor-graph inference: the per-edge upgrade --------------------------------
    //
    // WHY THIS EXISTS ALONGSIDE THE SWEEPS RATHER THAN REPLACING THEM. The two
    // sweeps store one upward and one downward message PER LAYER, which is exact
    // for a chain — where a layer has at most one parent and one child — and
    // cannot represent the per-EDGE messages a DAG needs. `FactorGraph` keys its
    // messages `factor -> variable`, so every edge carries its own, and loopy
    // topologies get sum-product to a fixed point instead of one forward and one
    // backward pass.
    //
    // BIT-IDENTITY IS THE WRONG BAR HERE, and the row that asked for it was
    // asking for the right thing about the wrong stage. Re-spelling `Sequential`
    // as a `Dag` runs the SAME arithmetic in the same order, so bits must match
    // and MLBNN-23/24 pin that. A fixpoint iteration is a DIFFERENT algorithm
    // computing the same mathematical quantity; it agrees to machine precision,
    // not to the last ulp, and demanding bits would only pin an accident of the
    // schedule. The honest falsifier is the INDEPENDENT one the test file already
    // carries: `exactChainMarginals` inverts the joint precision matrix by
    // Gauss-Jordan, and sum-product on a tree must agree with it.

    /// A factor asserting `child = sum(parents) + noise`, as a sum-product factor
    /// over `parents @ [child]`.
    ///
    /// DUPLICATE PARENTS ARE NOT EXPRESSIBLE HERE and are rejected by
    /// `tryToFactorGraph` rather than silently collapsed. `Factor` keys its
    /// outgoing messages by VARIABLE id, so naming a parent twice would write one
    /// map entry and quietly halve the contribution the sweeps do deliver
    /// (MLBNN-27 pins that they deliver it twice). A refusal is honest; a silent
    /// disagreement between two inference paths on the same network is not.
    let private sumLinkFactor
        (noiseVariance: float)
        (parents: int list)
        (child: int)
        : Factor<Gaussian> =
        { Neighbors = parents @ [ child ]
          ComputeMessages =
            fun incoming ->
                let msg v = incoming |> Map.tryFind v |> Option.defaultValue Gaussian.One
                let combine vs =
                    match vs with
                    | [] -> Gaussian.One
                    | v0 :: rest -> rest |> List.fold (fun acc v -> convolve acc (msg v)) (msg v0)
                let toChild = throughChannel noiseVariance (combine parents)
                let toParent p =
                    // The child's belief pushed back through the link, with the
                    // OTHER addends removed. Means subtract, variances still add —
                    // `deconvolve`, never `divide`: uncertainty does not cancel.
                    removeFirst p parents
                    |> List.fold (fun acc o -> deconvolve acc (msg o)) (throughChannel noiseVariance (msg child))
                (parents |> List.map (fun p -> p, toParent p)) @ [ child, toChild ]
                |> Map.ofList }

    /// Shift a proper Gaussian without changing its variance. A uniform message
    /// remains uniform because an additive offset cannot turn absence of evidence
    /// into information.
    let private shiftProper (offset: float) (message: Gaussian) : Gaussian =
        if message.Precision <= 0.0 then
            Gaussian.One
        else
            Gaussian.ofMeanVariance (Gaussian.mean message + offset) (Gaussian.variance message)

    /// A sum-link factor after some parent variables have been conditioned to
    /// fixed feedback assignments. The residual factor is
    /// `child = offset + sum(remaining parents) + noise`.
    let private sumLinkFactorWithOffset
        (noiseVariance: float)
        (parents: int list)
        (child: int)
        (offset: float)
        : Factor<Gaussian> =
        { Neighbors = parents @ [ child ]
          ComputeMessages =
            fun incoming ->
                let msg variable = incoming |> Map.tryFind variable |> Option.defaultValue Gaussian.One
                let combine variables =
                    match variables with
                    | [] -> Gaussian.One
                    | first :: rest -> rest |> List.fold (fun acc variable -> convolve acc (msg variable)) (msg first)
                let toChild = combine parents |> throughChannel noiseVariance |> shiftProper offset
                let toParent parent =
                    let childWithoutOffset = msg child |> throughChannel noiseVariance |> shiftProper (-offset)
                    removeFirst parent parents
                    |> List.fold (fun acc other -> deconvolve acc (msg other)) childWithoutOffset
                (parents |> List.map (fun parent -> parent, toParent parent)) @ [ child, toChild ]
                |> Map.ofList }

    /// A sum-link factor whose child was conditioned to a fixed value. For
    /// `target = sum(parents) + noise`, this sends each retained parent its
    /// conditional Gaussian message without introducing an artificial zero-
    /// variance point message.
    let private sumConstraintFactor
        (noiseVariance: float)
        (parents: int list)
        (target: float)
        : Factor<Gaussian> =
        { Neighbors = parents
          ComputeMessages =
            fun incoming ->
                let msg variable = incoming |> Map.tryFind variable |> Option.defaultValue Gaussian.One
                parents
                |> List.map (fun parent ->
                    let baseMessage = Gaussian.ofMeanVariance target noiseVariance
                    let toParent =
                        removeFirst parent parents
                        |> List.fold (fun acc other -> deconvolve acc (msg other)) baseMessage
                    parent, toParent)
                |> Map.ofList }

    /// Build the factor graph for a network: one prior factor per layer, and one
    /// sum-link factor per layer that has parents.
    ///
    /// Layer 0's prior factor carries the ABSORBED DATA, not the original prior —
    /// `Layers.[0].Posterior` is the conjugate accumulation, so the evidence
    /// enters once, as a leaf, exactly as it does in the sweeps.
    let private tryValidatedNetworkShape (net: Network) : Result<unit, string> =
        let n = net.Layers.Length
        if n = 0 then
            Error "network must have at least one layer"
        elif
            net.ObservationVariances.Length <> n
            || net.UpwardMessages.Length <> n
            || net.DownwardMessages.Length <> n
        then
            Error(
                $"network array lengths must match {n} layers; variances={net.ObservationVariances.Length}, "
                + $"upward={net.UpwardMessages.Length}, downward={net.DownwardMessages.Length}")
        else
            match
                net.ObservationVariances
                |> Array.tryFindIndex (fun variance -> not (System.Double.IsFinite variance) || variance <= 0.0)
            with
            | Some index -> Error $"ObservationVariances[{index}] must be finite and > 0"
            | None -> Ok()

    let private tryValidatedParents (net: Network) : Result<int list array, string> =
        tryValidatedNetworkShape net
        |> Result.bind (fun () ->
            let n = net.Layers.Length
            let rawError =
                match net.Topology with
                | Sequential -> None
                | SkipConnections pairs ->
                    pairs
                    |> List.tryPick (fun (parent, child) ->
                        if child <= 0 || child >= n then
                            Some $"skip connection child {child} must satisfy 0 < child < {n}"
                        elif parent < 0 || parent >= child then
                            Some $"layer {child} parent {parent} must satisfy 0 <= parent < child < {n}"
                        else
                            None)
                | Dag rows when rows.Length <> n ->
                    Some $"topology has {rows.Length} parent rows but network has {n} layers"
                | Dag _ -> None
            match rawError with
            | Some message -> Error message
            | None ->
                let parentsByChild = Array.init n (parentsOf net.Topology)
                let invalid =
                    parentsByChild
                    |> Array.mapi (fun child parents ->
                        parents
                        |> List.tryFind (fun parent -> parent < 0 || parent >= child)
                        |> Option.map (fun parent -> child, parent))
                    |> Array.tryPick id
                match invalid with
                | Some(child, parent) ->
                    Error $"layer {child} parent {parent} must satisfy 0 <= parent < child < {n}"
                | None ->
                    let offenders =
                        parentsByChild
                        |> Array.mapi (fun child parents ->
                            if List.length parents <> List.length (List.distinct parents) then Some child else None)
                        |> Array.choose id
                    if offenders.Length > 0 then
                        let names = offenders |> Array.map string |> String.concat ", "
                        Error(
                            $"layers {names} name a parent more than once; the factor-graph path "
                            + "keys messages by variable and cannot express a repeated addend")
                    else
                        Ok parentsByChild)

    let private isAcyclicFactorGraph (parentsByChild: int list array) : bool =
        let n = parentsByChild.Length
        let representative = Array.init (2 * n) id
        let rec find node =
            if representative.[node] = node then
                node
            else
                let root = find representative.[node]
                representative.[node] <- root
                root
        let mutable acyclic = true
        for child in 0 .. n - 1 do
            let parents = parentsByChild.[child]
            if not (List.isEmpty parents) then
                let factorNode = n + child
                for variable in parents @ [ child ] do
                    let variableRoot = find variable
                    let factorRoot = find factorNode
                    if variableRoot = factorRoot then
                        acyclic <- false
                    else
                        representative.[variableRoot] <- factorRoot
        acyclic

    /// Acyclicity of a finite bipartite graph represented by factor-neighbor
    /// lists. `variableCount` deliberately remains the original layer count so
    /// conditioned-away variables retain their stable declared identifiers.
    let private areFactorNeighborhoodsAcyclic
        (variableCount: int)
        (neighborhoods: int list list)
        : bool =
        let representative = Array.init (variableCount + neighborhoods.Length) id
        let rec find node =
            if representative.[node] = node then
                node
            else
                let root = find representative.[node]
                representative.[node] <- root
                root
        let mutable acyclic = true
        neighborhoods
        |> List.iteri (fun factorIndex neighbors ->
            let factorNode = variableCount + factorIndex
            for variable in neighbors do
                let variableRoot = find variable
                let factorRoot = find factorNode
                if variableRoot = factorRoot then
                    acyclic <- false
                else
                    representative.[variableRoot] <- factorRoot)
        acyclic

    /// The residual variable neighbors of declared link factors after a proposed
    /// feedback set is conditioned. Numerical cancellations in a realized
    /// precision matrix never enter this topology calculation.
    let private conditionedFactorNeighborhoods
        (parentsByChild: int list array)
        (feedbackVertices: Set<int>)
        : int list list =
        [ for child in 0 .. parentsByChild.Length - 1 do
              let residual =
                  (parentsByChild.[child] @ [ child ])
                  |> List.filter (fun variable -> not (Set.contains variable feedbackVertices))
              if not (List.isEmpty residual) then
                  yield residual ]

    let private tryFindFirstFeedbackSet
        (variableCount: int)
        (budget: int)
        (isFeedbackSet: int list -> bool)
        : int list option =
        let rec firstCombination size start chosen =
            if List.length chosen = size then
                let candidate = List.rev chosen
                if isFeedbackSet candidate then Some candidate else None
            else
                let remaining = size - List.length chosen
                [ start .. variableCount - remaining ]
                |> List.tryPick (fun candidate -> firstCombination size (candidate + 1) (candidate :: chosen))
        [ 0 .. min budget variableCount ]
        |> List.tryPick (fun size -> firstCombination size 0 [])

    let private tryChooseFeedbackVertices
        (budget: int)
        (parentsByChild: int list array)
        : Result<int list * FeedbackVertexSelection option, string> =
        let variableCount = parentsByChild.Length
        if budget < 0 then
            Error "feedbackBudget must be non-negative"
        else
            let isFeedbackSet vertices =
                vertices
                |> Set.ofList
                |> conditionedFactorNeighborhoods parentsByChild
                |> areFactorNeighborhoodsAcyclic variableCount
            if isFeedbackSet [] then
                Ok([], None)
            elif budget = 0 then
                Error "feedback vertex set requires at least one vertex but feedbackBudget is 0"
            elif variableCount <= 20 then
                match tryFindFirstFeedbackSet variableCount budget isFeedbackSet with
                | Some vertices -> Ok(vertices, Some ExhaustiveMinimum)
                | None ->
                    Error
                        $"no feedback vertex set within feedbackBudget {budget} for {variableCount} declared layers"
            else
                let neighborhoods = conditionedFactorNeighborhoods parentsByChild Set.empty
                let score candidate =
                    neighborhoods
                    |> List.sumBy (fun neighbors ->
                        if List.contains candidate neighbors then List.length neighbors - 1 else 0)
                let rec greedy chosen =
                    if isFeedbackSet chosen then
                        Ok(List.rev chosen, Some GreedyDeclaredTopology)
                    elif List.length chosen >= budget then
                        Error
                            $"greedy feedback vertex selection exceeded feedbackBudget {budget} for {variableCount} declared layers"
                    else
                        let available = [ 0 .. variableCount - 1 ] |> List.filter (fun candidate -> not (List.contains candidate chosen))
                        match available with
                        | [] -> Error "greedy feedback vertex selection exhausted declared layers before making the residual acyclic"
                        | _ ->
                            let candidate = available |> List.maxBy (fun index -> score index, -index)
                            greedy (candidate :: chosen)
                greedy []

    let private tryConditionedFactorGraph
        (parentsByChild: int list array)
        (assignments: Map<int, float>)
        (net: Network)
        : Result<FactorGraph<Gaussian>, string> =
        let feedbackVertices = assignments |> Map.toSeq |> Seq.map fst |> Set.ofSeq
        let n = net.Layers.Length
        let graphWithPriors =
            [ 0 .. n - 1 ]
            |> List.filter (fun variable -> not (Set.contains variable feedbackVertices))
            |> List.fold
                (fun graph variable -> FactorGraph.addFactor variable (Factor.prior variable net.Layers.[variable].Posterior) graph)
                (FactorGraph.empty Gaussian.algebra)
        [ 0 .. n - 1 ]
        |> List.fold
            (fun graph child ->
                match parentsByChild.[child] with
                | [] -> graph
                | parents ->
                    let feedbackParentSum =
                        parents
                        |> List.choose (fun parent -> Map.tryFind parent assignments)
                        |> List.sum
                    let retainedParents =
                        parents |> List.filter (fun parent -> not (Set.contains parent feedbackVertices))
                    match Map.tryFind child assignments with
                    | Some childValue when not (List.isEmpty retainedParents) ->
                        let target = childValue - feedbackParentSum
                        FactorGraph.addFactor
                            (n + child)
                            (sumConstraintFactor net.ObservationVariances.[child] retainedParents target)
                            graph
                    | Some _ -> graph
                    | None when List.isEmpty retainedParents ->
                        FactorGraph.addFactor
                            (n + child)
                            (Factor.prior child (Gaussian.ofMeanVariance feedbackParentSum net.ObservationVariances.[child]))
                            graph
                    | None ->
                        FactorGraph.addFactor
                            (n + child)
                            (sumLinkFactorWithOffset net.ObservationVariances.[child] retainedParents child feedbackParentSum)
                            graph)
            graphWithPriors
        |> Ok

    let private tryRunConditionedTree
        (tol: float)
        (maxRounds: int)
        (parentsByChild: int list array)
        (assignments: Map<int, float>)
        (net: Network)
        : Result<Map<int, Gaussian> * int, string> =
        tryConditionedFactorGraph parentsByChild assignments net
        |> Result.bind (fun graph ->
            let neighborhoods = graph.Factors |> Map.toList |> List.map (fun (_, factor) -> factor.Neighbors)
            if not (areFactorNeighborhoodsAcyclic net.Layers.Length neighborhoods) then
                Error "feedback conditioning left the declared factor graph cyclic"
            else
                let settled, rounds, converged = FactorGraph.runToFixpoint Gaussian.distance tol maxRounds graph
                if not converged then
                    Error $"feedback conditioned tree run did not converge in {rounds}/{maxRounds} rounds at tolerance {tol:R}"
                else
                    let marginals =
                        [ 0 .. net.Layers.Length - 1 ]
                        |> List.choose (fun variable ->
                            if Map.containsKey variable assignments then None
                            else
                                let marginal = FactorGraph.marginal variable settled
                                if Gaussian.isProper marginal then Some(variable, marginal) else None)
                        |> Map.ofList
                    if Map.count marginals <> net.Layers.Length - Map.count assignments then
                        Error "feedback conditioned tree produced an improper retained-variable marginal"
                    else
                        Ok(marginals, rounds))

    let private validInferenceBudget (tol: float) (maxRounds: int) : Result<unit, string> =
        if not (System.Double.IsFinite tol) || tol < 0.0 then
            Error "tol must be finite and non-negative"
        elif maxRounds <= 0 then
            Error "maxRounds must be positive"
        else
            Ok()

    let tryToFactorGraph (net: Network) : Result<FactorGraph<Gaussian>, string> =
        tryValidatedParents net
        |> Result.map (fun parentsByChild ->
            let n = net.Layers.Length
            let withPriors =
                [ 0 .. n - 1 ]
                |> List.fold
                    (fun g i -> FactorGraph.addFactor i (Factor.prior i net.Layers.[i].Posterior) g)
                    (FactorGraph.empty Gaussian.algebra)
            [ 0 .. n - 1 ]
            |> List.fold
                (fun g i ->
                    match parentsByChild.[i] with
                    | [] -> g
                    | ps -> FactorGraph.addFactor (n + i) (sumLinkFactor net.ObservationVariances.[i] ps i) g)
                withPriors
            )

    /// Per-layer marginals by sum-product to a fixed point, plus the rounds run
    /// and whether it converged before the cap.
    ///
    /// The caller is told `converged` rather than having a non-convergence
    /// swallowed: on a loopy graph BP may oscillate forever (Weiss & Freeman
    /// 2001), and a silent cap would report an arbitrary iterate as an answer.
    let tryMarginalsViaFactorGraph
        (tol: float)
        (maxRounds: int)
        (net: Network)
        : Result<Gaussian array * int * bool, string> =
        validInferenceBudget tol maxRounds
        |> Result.bind (fun () ->
            tryToFactorGraph net
            |> Result.map (fun g ->
                let settled, rounds, converged =
                    FactorGraph.runToFixpoint Gaussian.distance tol maxRounds g
                Array.init net.Layers.Length (fun i -> FactorGraph.marginal i settled), rounds, converged))

    let private tryQueryViaFactorGraph
        (tol: float)
        (maxRounds: int)
        (requireConvergence: bool)
        (net: Network)
        : Result<FactorGraphUpdate, string> =
        tryValidatedParents net
        |> Result.bind (fun parentsByChild ->
            tryMarginalsViaFactorGraph tol maxRounds net
            |> Result.bind (fun (marginals, rounds, converged) ->
                let acyclic = isAcyclicFactorGraph parentsByChild
                let exactness =
                    match acyclic, converged with
                    | true, true -> ExactAcyclic
                    | true, false -> UnsettledAcyclic
                    | false, true -> ConvergedLoopyMeansOnly
                    | false, false -> UnsettledLoopy
                if requireConvergence && not converged then
                    Error $"factor-graph inference did not converge in {rounds}/{maxRounds} rounds at tolerance {tol:R}"
                else
                    Ok
                        { Network = net
                          Marginals = marginals
                          Rounds = rounds
                          Converged = converged
                          Exactness = exactness }))

    /// Absorb one observation exactly once at layer zero, then run bounded
    /// per-edge sum-product over the complete declared graph. The returned
    /// network is durable evidence state; marginals and exactness are the query
    /// receipt. Strict mode refuses a capped, unsettled iterate.
    let tryUpdateViaFactorGraph
        (tol: float)
        (maxRounds: int)
        (requireConvergence: bool)
        (observation: float)
        (net: Network)
        : Result<FactorGraphUpdate, string> =
        validInferenceBudget tol maxRounds
        |> Result.bind (fun () -> tryValidatedParents net |> Result.map ignore)
        |> Result.bind (fun () ->
            MinimalBnn.update observation net.Layers.[0]
            |> Result.mapError (fun message -> "factor-graph online update: " + message))
        |> Result.bind (fun layerZero ->
            let layers = Array.copy net.Layers
            layers.[0] <- layerZero
            tryQueryViaFactorGraph
                tol
                maxRounds
                requireConvergence
                { net with Layers = layers })

    /// Absorb a finite stream through the same online boundary. A query is run
    /// after every observation so a strict non-convergence stops at the first
    /// unsettled state rather than absorbing the remainder invisibly.
    let tryInferViaFactorGraph
        (tol: float)
        (maxRounds: int)
        (requireConvergence: bool)
        (observations: seq<float>)
        (net: Network)
        : Result<FactorGraphUpdate, string> =
        tryQueryViaFactorGraph tol maxRounds requireConvergence net
        |> fun initial ->
            observations
            |> Seq.fold
                (fun result observation ->
                    result
                    |> Result.bind (fun previous ->
                        tryUpdateViaFactorGraph tol maxRounds requireConvergence observation previous.Network))
                initial

    // -- Exact dense Gaussian query -------------------------------------------------
    //
    // Gaussian BP is exact on a tree, and converged loopy Gaussian BP has exact
    // means but generally not variances. For this declared finite linear-Gaussian
    // model, compiling the information form and inverting it supplies the bounded
    // exact covariance fallback. The implementation is deliberately separate from
    // FactorGraph because that generic API does not expose a joint precision matrix.

    let private exactDenseLayerLimit = 64

    let private tryValidateExactDenseNetwork (net: Network) : Result<int list array, string> =
        tryValidatedParents net
        |> Result.bind (fun parents ->
            if net.Layers.Length > exactDenseLayerLimit then
                Error $"exact dense Gaussian query supports at most {exactDenseLayerLimit} layers, got {net.Layers.Length}"
            else
                match net.Layers |> Array.tryFindIndex (fun layer -> not (Gaussian.isProper layer.Posterior)) with
                | Some index -> Error $"layer {index} posterior must be a finite proper Gaussian"
                | None -> Ok parents)

    let private addPrecision (matrix: float array array) row column amount =
        matrix.[row].[column] <- matrix.[row].[column] + amount

    let private tryCholeskyPositiveDefinite (matrix: float array array) : Result<unit, string> =
        let n = matrix.Length
        let lower = Array.init n (fun _ -> Array.zeroCreate<float> n)
        let mutable failure: string option = None
        let mutable i = 0
        while i < n && failure.IsNone do
            let mutable j = 0
            while j <= i && failure.IsNone do
                let mutable sum = matrix.[i].[j]
                let mutable k = 0
                while k < j do
                    sum <- sum - lower.[i].[k] * lower.[j].[k]
                    k <- k + 1
                if i = j then
                    if not (System.Double.IsFinite sum) || sum <= 0.0 then
                        failure <- Some $"joint precision is not positive definite at pivot {i}"
                    else
                        lower.[i].[j] <- sqrt sum
                else
                    let diagonal = lower.[j].[j]
                    if not (System.Double.IsFinite diagonal) || diagonal <= 0.0 then
                        failure <- Some $"joint precision has invalid Cholesky diagonal {j}"
                    else
                        lower.[i].[j] <- sum / diagonal
                j <- j + 1
            i <- i + 1
        match failure with
        | Some message -> Error message
        | None -> Ok()

    let private tryInvertDeterministic (matrix: float array array) : Result<float array array, string> =
        let n = matrix.Length
        let augmented =
            Array.init n (fun row ->
                Array.init (2 * n) (fun column ->
                    if column < n then matrix.[row].[column]
                    elif column - n = row then 1.0
                    else 0.0))
        let mutable failure: string option = None
        let mutable column = 0
        while column < n && failure.IsNone do
            let pivotRow =
                [ column .. n - 1 ]
                |> List.maxBy (fun row -> abs augmented.[row].[column], -row)
            let pivot = augmented.[pivotRow].[column]
            if not (System.Double.IsFinite pivot) || abs pivot <= 1e-15 then
                failure <- Some $"joint precision has non-positive elimination pivot {column}"
            else
                if pivotRow <> column then
                    let swap = augmented.[column]
                    augmented.[column] <- augmented.[pivotRow]
                    augmented.[pivotRow] <- swap
                let divisor = augmented.[column].[column]
                for index in 0 .. 2 * n - 1 do
                    augmented.[column].[index] <- augmented.[column].[index] / divisor
                for row in 0 .. n - 1 do
                    if row <> column then
                        let scale = augmented.[row].[column]
                        for index in 0 .. 2 * n - 1 do
                            augmented.[row].[index] <- augmented.[row].[index] - scale * augmented.[column].[index]
                column <- column + 1
        match failure with
        | Some message -> Error message
        | None ->
            let inverse = Array.init n (fun row -> Array.init n (fun column -> augmented.[row].[n + column]))
            if inverse |> Array.exists (Array.exists (System.Double.IsFinite >> not)) then
                Error "joint precision inversion produced non-finite covariance"
            else
                Ok inverse

    let private compileJointPrecision (parentsByChild: int list array) (net: Network) =
        let n = net.Layers.Length
        let precision = Array.init n (fun _ -> Array.zeroCreate<float> n)
        let information = Array.zeroCreate<float> n
        for layer in 0 .. n - 1 do
            let posterior = net.Layers.[layer].Posterior
            addPrecision precision layer layer posterior.Precision
            information.[layer] <- posterior.PrecisionMean
        for child in 0 .. n - 1 do
            match parentsByChild.[child] with
            | [] -> ()
            | parents ->
                let couplingPrecision = 1.0 / net.ObservationVariances.[child]
                addPrecision precision child child couplingPrecision
                for parent in parents do
                    addPrecision precision parent parent couplingPrecision
                    addPrecision precision child parent -couplingPrecision
                    addPrecision precision parent child -couplingPrecision
                for firstIndex in 0 .. List.length parents - 1 do
                    for secondIndex in firstIndex + 1 .. List.length parents - 1 do
                        let firstParent = List.item firstIndex parents
                        let secondParent = List.item secondIndex parents
                        addPrecision precision firstParent secondParent couplingPrecision
                        addPrecision precision secondParent firstParent couplingPrecision
        precision, information

    let private queryExactDenseGaussian (net: Network) : Result<ExactDenseGaussianQuery, string> =
        tryValidateExactDenseNetwork net
        |> Result.bind (fun parentsByChild ->
            let precision, information = compileJointPrecision parentsByChild net
            tryCholeskyPositiveDefinite precision
            |> Result.bind (fun () ->
                tryInvertDeterministic precision
                |> Result.map (fun covariance ->
                    let marginals =
                        Array.init net.Layers.Length (fun row ->
                            let mean =
                                [ 0 .. net.Layers.Length - 1 ]
                                |> List.sumBy (fun column -> covariance.[row].[column] * information.[column])
                            Gaussian.ofMeanVariance mean covariance.[row].[row])
                    { Network = net
                      Marginals = marginals
                      LayerCount = net.Layers.Length
                      AbsorbedObservationCount = net.Layers.[0].Objective.ObservationCount })))

    /// Query exact marginals for the current finite declared linear-Gaussian
    /// network. It does not absorb evidence and is bit-stable for the canonical
    /// network state passed by the caller.
    let tryQueryExactDenseGaussian (net: Network) : Result<ExactDenseGaussianQuery, string> =
        queryExactDenseGaussian net

    /// Absorb one observation exactly once at layer zero, then query the exact
    /// finite dense Gaussian model. This is a query path, not a CRDT merge.
    let tryUpdateExactDenseGaussian
        (observation: float)
        (net: Network)
        : Result<ExactDenseGaussianQuery, string> =
        tryValidatedParents net
        |> Result.map ignore
        |> Result.bind (fun () ->
            MinimalBnn.update observation net.Layers.[0]
            |> Result.mapError (fun message -> "exact dense Gaussian online update: " + message))
        |> Result.bind (fun layerZero ->
            let layers = Array.copy net.Layers
            layers.[0] <- layerZero
            queryExactDenseGaussian { net with Layers = layers })

    /// Absorb a finite stream through the exact dense query boundary. Every
    /// observation is applied once, in the caller-declared stream order.
    let tryInferExactDenseGaussian
        (observations: seq<float>)
        (net: Network)
        : Result<ExactDenseGaussianQuery, string> =
        queryExactDenseGaussian net
        |> fun initial ->
            observations
            |> Seq.fold
                (fun result observation ->
                    result
                    |> Result.bind (fun previous -> tryUpdateExactDenseGaussian observation previous.Network))
                initial

    // -- Feedback-vertex-set conditioned Gaussian query ----------------------------
    //
    // This is a finite read-only correction for declared linear-Gaussian loopy
    // graphs. It conditions a topology-derived feedback vertex set until the
    // remaining FACTOR graph is acyclic, runs exact sum-product on that residual
    // graph k+1 times, and solves only the k-by-k feedback block. It is not an
    // online evidence update, a CRDT merge, generic loopy-BP variance correction,
    // or a non-Gaussian algorithm.

    let private matrixVectorProduct (matrix: float array array) (vector: float array) : float array =
        Array.init matrix.Length (fun row ->
            [ 0 .. vector.Length - 1 ]
            |> List.sumBy (fun column -> matrix.[row].[column] * vector.[column]))

    let private quadraticForm (vector: float array) (matrix: float array array) : float =
        let transformed = matrixVectorProduct matrix vector
        Array.map2 (fun left right -> left * right) vector transformed |> Array.sum

    /// Query exact means and covariance diagonals by conditioning a finite feedback
    /// vertex set. A caller who requires out-of-order evidence invariance must pass
    /// a network constructed from a canonical evidence state; this function does not
    /// retrospectively canonicalize `MinimalBnn`'s local arrival-order accumulator.
    let tryQueryViaFeedbackMessagePassing
        (tol: float)
        (maxRounds: int)
        (feedbackBudget: int)
        (net: Network)
        : Result<FeedbackMessagePassingQuery, string> =
        validInferenceBudget tol maxRounds
        |> Result.bind (fun () -> tryValidateExactDenseNetwork net)
        |> Result.bind (fun parentsByChild ->
            tryChooseFeedbackVertices feedbackBudget parentsByChild
            |> Result.bind (fun (feedbackVertices, selection) ->
                match feedbackVertices with
                | [] ->
                    tryQueryViaFactorGraph tol maxRounds true net
                    |> Result.map (fun receipt ->
                        { Network = receipt.Network
                          Marginals = receipt.Marginals
                          Rounds = receipt.Rounds
                          Converged = receipt.Converged
                          Exactness = receipt.Exactness
                          FeedbackVertices = []
                          Selection = selection })
                | _ ->
                    let zeroAssignments = feedbackVertices |> List.map (fun vertex -> vertex, 0.0) |> Map.ofList
                    tryRunConditionedTree tol maxRounds parentsByChild zeroAssignments net
                    |> Result.bind (fun (zeroMarginals, zeroRounds) ->
                        let unitRuns =
                            feedbackVertices
                            |> List.fold
                                (fun current vertex ->
                                    current
                                    |> Result.bind (fun completed ->
                                        let assignment = zeroAssignments |> Map.add vertex 1.0
                                        tryRunConditionedTree tol maxRounds parentsByChild assignment net
                                        |> Result.map (fun run -> (vertex, run) :: completed)))
                                (Ok [])
                        unitRuns
                        |> Result.bind (fun runs ->
                            let orderedRuns = runs |> List.rev |> List.toArray
                            let feedbackIndices = feedbackVertices |> List.toArray
                            let feedbackCount = feedbackIndices.Length
                            let layerCount = net.Layers.Length
                            let feedbackSet = feedbackVertices |> Set.ofList
                            let gains =
                                Array.init layerCount (fun layer ->
                                    Array.init feedbackCount (fun column ->
                                        if Set.contains layer feedbackSet then
                                            0.0
                                        else
                                            let baseline = zeroMarginals |> Map.find layer |> Gaussian.mean
                                            let _, (unitMarginals, _) = orderedRuns.[column]
                                            (unitMarginals |> Map.find layer |> Gaussian.mean) - baseline))
                            let precision, information = compileJointPrecision parentsByChild net
                            let feedbackPrecision =
                                Array.init feedbackCount (fun row ->
                                    Array.init feedbackCount (fun column ->
                                        let feedbackRow = feedbackIndices.[row]
                                        let feedbackColumn = feedbackIndices.[column]
                                        let residualContribution =
                                            [ 0 .. layerCount - 1 ]
                                            |> List.sumBy (fun layer -> precision.[feedbackRow].[layer] * gains.[layer].[column])
                                        precision.[feedbackRow].[feedbackColumn] + residualContribution))
                            let feedbackInformation =
                                Array.init feedbackCount (fun row ->
                                    let feedbackRow = feedbackIndices.[row]
                                    let baselineContribution =
                                        [ 0 .. layerCount - 1 ]
                                        |> List.sumBy (fun layer ->
                                            match Map.tryFind layer zeroMarginals with
                                            | Some marginal -> precision.[feedbackRow].[layer] * Gaussian.mean marginal
                                            | None -> 0.0)
                                    information.[feedbackRow] - baselineContribution)
                            tryCholeskyPositiveDefinite feedbackPrecision
                            |> Result.bind (fun () -> tryInvertDeterministic feedbackPrecision)
                            |> Result.bind (fun feedbackCovariance ->
                                let feedbackMeans = matrixVectorProduct feedbackCovariance feedbackInformation
                                let feedbackPosition =
                                    feedbackVertices
                                    |> List.mapi (fun index vertex -> vertex, index)
                                    |> Map.ofList
                                let marginals =
                                    Array.init layerCount (fun layer ->
                                        match Map.tryFind layer feedbackPosition with
                                        | Some position ->
                                            Gaussian.ofMeanVariance feedbackMeans.[position] feedbackCovariance.[position].[position]
                                        | None ->
                                            let baseline = zeroMarginals |> Map.find layer
                                            let gain = gains.[layer]
                                            let mean = Gaussian.mean baseline + (Array.map2 (fun left right -> left * right) gain feedbackMeans |> Array.sum)
                                            let variance = Gaussian.variance baseline + quadraticForm gain feedbackCovariance
                                            Gaussian.ofMeanVariance mean variance)
                                if marginals |> Array.exists (Gaussian.isProper >> not) then
                                    Error "feedback correction produced an improper Gaussian marginal"
                                else
                                    let unitRounds = orderedRuns |> Array.sumBy (fun (_, (_, rounds)) -> rounds)
                                    Ok
                                        { Network = net
                                          Marginals = marginals
                                          Rounds = zeroRounds + unitRounds
                                          Converged = true
                                          Exactness = ExactLoopyViaFvs feedbackCount
                                          FeedbackVertices = feedbackVertices
                                          Selection = selection })))))

    // -- Combined forward+backward ---------------------------------------------------

    /// Run one full forward+backward cycle. On a `Sequential` chain this is the
    /// exact two-pass smoother, not an approximation.
    let update (observation: float) (net: Network) : Result<Network, string> =
        net
        |> forward observation
        |> Result.bind (fun (updatedNet, _) -> backward updatedNet)

    /// Absorb a stream of observations into the network.
    let infer (observations: seq<float>) (net: Network) : Result<Network, string> =
        observations
        |> Seq.fold
            (fun result obs ->
                match result with
                | Ok current -> update obs current
                | Error e -> Error e)
            (Ok net)

    // -- Objective --------------------------------------------------------------------

    /// The cumulative information value across all layers.
    let cumulativeIv (net: Network) : float<InformationValue.iv> =
        net.Layers |> Array.sumBy (fun l -> l.Objective.CumulativeIv)

    /// The belief of the final layer (the network output).
    let outputPosterior (net: Network) : Gaussian =
        beliefAt net (net.Layers.Length - 1)

    /// The posterior mean of the final layer.
    let outputMean (net: Network) : float =
        Gaussian.mean (outputPosterior net)

    /// The posterior variance of the final layer.
    let outputVariance (net: Network) : float =
        Gaussian.variance (outputPosterior net)

    // -- Serialisation (gen(gen)==gen) ------------------------------------------------

    /// Serialise the network to a JSON string. The network is a residual —
    /// it can be collected by Shiva-GC and regenerated from the priors +
    /// observation variances (the generator).
    let toJsonString (net: Network) : string =
        let layerJsons =
            net.Layers
            |> Array.mapi (fun i l ->
                let p = beliefAt net i
                sprintf "{\"mu\":%.12g,\"sigma2\":%.12g,\"obsCount\":%d}"
                    (Gaussian.mean p) (Gaussian.variance p) l.Objective.ObservationCount)
            |> String.concat ","
        let topologyJson =
            match net.Topology with
            | Sequential -> "\"sequential\""
            | SkipConnections pairs ->
                let pairJsons =
                    pairs |> List.map (fun (f, t) -> sprintf "[%d,%d]" f t) |> String.concat ","
                sprintf "{\"skipConnections\":[%s]}" pairJsons
            // Serialised from the CASE, not normalised through `parentsOf`: this
            // JSON is the round-trip generator, so it has to record which topology
            // was DECLARED. Normalising here would round-trip `Sequential` back as
            // a `Dag` and lose that.
            | Dag parents ->
                let parentJsons =
                    parents
                    |> Array.map (fun ps ->
                        ps |> List.map (sprintf "%d") |> String.concat "," |> sprintf "[%s]")
                    |> String.concat ","
                sprintf "{\"dag\":[%s]}" parentJsons
        sprintf "{\"layers\":[%s],\"topology\":%s}" layerJsons topologyJson
