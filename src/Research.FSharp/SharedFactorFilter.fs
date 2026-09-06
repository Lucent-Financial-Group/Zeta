namespace Zeta.Research

open System

/// Known-law common-noise fixture separating operator reuse from posterior product projection.
[<RequireQualifiedAccess>]
module SharedFactorFilter =
    type Mode = Dense | TensorJoint | ProjectedProduct
    type Model = private { Factors: int; Noise: float; Mode: Mode; Dense: DenseHmm.Model option }
    let private local = [|0.72;0.04;0.27;0.14; 0.08;0.16;0.03;0.56|]
    let private prior = [|0.6;0.4|]
    let private emission = [|0.76;0.41;0.24;0.59|]
    let internal bit value n = (value >>> n) &&& 1
    let private size model = 1 <<< model.Factors
    let factors model = model.Factors
    let mode model = model.Mode
    let noise model = model.Noise
    let internal product (marginals: float[]) n =
        Array.init (1 <<< n) (fun state ->
            let mutable value = 1.0
            for f in 0..n-1 do value <- value * marginals.[2*f + bit state f]
            value)
    let internal marginals n (joint: float[]) =
        let values = Array.zeroCreate (2*n)
        for s in 0 .. joint.Length - 1 do
            for f in 0..n-1 do values.[2*f + bit s f] <- values.[2*f + bit s f] + joint.[s]
        values
    let internal expand model state = if model.Mode = ProjectedProduct then product state model.Factors else Array.copy state
    let create factors noise mode =
        if factors < 2 || factors > 4 || not (Double.IsFinite noise) || noise < 0.0 || noise > 1.0 then Error "shared-factor fixture needs 2..4 factors and noise in [0,1]"
        else
            let m = { Factors = factors; Noise = noise; Mode = mode; Dense = None }
            if mode <> Dense then Ok m
            else
                let s = size m
                let edges = [| for token in 0..s-1 do
                                   for source in 0..s-1 do
                                       for target in 0..s-1 do
                                           let mutable normal, flipped = 1.0, 1.0
                                           for f in 0..factors-1 do
                                               let i,j,x = bit source f, bit target f, bit token f
                                               normal <- normal * local.[4*x + 2*i + j]
                                               flipped <- flipped * local.[4*(1-x) + 2*i + j]
                                           yield (1.0-noise)*normal + noise*flipped |]
                DenseHmm.fromParameters s s (product (Array.init (2*factors) (fun i -> prior.[i%2])) factors) edges
                |> Result.map (fun dense -> {m with Dense = Some dense})
    // Pairwise axis contractions reuse the same 2x2 local operator without a dense joint matrix.
    let private contract model token (state: float[]) flipped (output: float[]) (scratch: float[]) =
        Array.Copy(state, output, state.Length)
        let mutable current, target = output, scratch
        for f in 0 .. model.Factors - 1 do
            let stride = 1 <<< f
            let x = bit token f ^^^ flipped
            for block in 0 .. 2*stride .. state.Length - 1 do
                for offset in 0 .. stride - 1 do
                    let i,j = block+offset, block+offset+stride
                    target.[i] <- current.[i]*local.[4*x] + current.[j]*local.[4*x+2]
                    target.[j] <- current.[i]*local.[4*x+1] + current.[j]*local.[4*x+3]
            let old = current
            current <- target
            target <- old
        if not (Object.ReferenceEquals(current, output)) then Array.Copy(current, output, state.Length)
    let private jointNext model (state: float[]) =
        Array.init (size model) (fun token ->
            let mutable total = 0.0
            for hidden in 0 .. state.Length - 1 do
                let mutable normal, flipped = 1.0, 1.0
                for f in 0 .. model.Factors - 1 do
                    let x, h = bit token f, bit hidden f
                    normal <- normal * emission.[2*x+h]
                    flipped <- flipped * emission.[2*(1-x)+h]
                total <- total + state.[hidden]*((1.0-model.Noise)*normal + model.Noise*flipped)
            total)
    let private projectedNext model (state: float[]) =
        let p = Array.init (2*model.Factors) (fun i -> let f,x = i/2,i%2 in state.[2*f]*emission.[2*x] + state.[2*f+1]*emission.[2*x+1])
        Array.init (size model) (fun token ->
            let mutable normal, flipped = 1.0, 1.0
            for f in 0 .. model.Factors - 1 do
                let x = bit token f
                normal <- normal * p.[2*f+x]
                flipped <- flipped * p.[2*f+1-x]
            (1.0-model.Noise)*normal + model.Noise*flipped)
    let after model (tokens: int[]) =
        if isNull tokens || tokens.Length > 256 || Array.exists (fun x -> x < 0 || x >= size model) tokens then Error "factor context needs at most 256 in-alphabet tokens"
        else
            match model.Dense with
            | Some dense -> DenseHmm.after dense tokens
            | None when model.Mode = TensorJoint ->
                let state = product (Array.init (2*model.Factors) (fun i -> prior.[i%2])) model.Factors
                let normal, flipped, scratch = Array.zeroCreate state.Length, Array.zeroCreate state.Length, Array.zeroCreate state.Length
                for token in tokens do
                    contract model token state 0 normal scratch
                    contract model token state 1 flipped scratch
                    let mutable total = 0.0
                    for i in 0 .. state.Length - 1 do
                        state.[i] <- (1.0-model.Noise)*normal.[i] + model.Noise*flipped.[i]
                        total <- total + state.[i]
                    for i in 0 .. state.Length - 1 do state.[i] <- state.[i] / total
                Ok(state, jointNext model state)
            | None ->
                let state = Array.init (2*model.Factors) (fun i -> prior.[i%2])
                let normal, flipped = Array.zeroCreate state.Length, Array.zeroCreate state.Length
                for token in tokens do
                    let mutable normalMass, flippedMass = 1.0-model.Noise, model.Noise
                    for f in 0 .. model.Factors - 1 do
                        let x = bit token f
                        let a,b = state.[2*f], state.[2*f+1]
                        let mutable sum0, sum1 = 0.0, 0.0
                        for j in 0..1 do
                            normal.[2*f+j] <- a*local.[4*x+j] + b*local.[4*x+2+j]
                            flipped.[2*f+j] <- a*local.[4*(1-x)+j] + b*local.[4*(1-x)+2+j]
                            sum0 <- sum0 + normal.[2*f+j]
                            sum1 <- sum1 + flipped.[2*f+j]
                        normalMass <- normalMass * sum0
                        flippedMass <- flippedMass * sum1
                        for j in 0..1 do
                            normal.[2*f+j] <- normal.[2*f+j] / sum0
                            flipped.[2*f+j] <- flipped.[2*f+j] / sum1
                    let weight = normalMass / (normalMass + flippedMass)
                    for i in 0 .. state.Length - 1 do state.[i] <- weight*normal.[i] + (1.0-weight)*flipped.[i]
                Ok(state, projectedNext model state)
    let sample model (random: ResearchRandom.Stream) length =
        if length < 0 || length > 256 then Error "factor sample length must be 0..256"
        else
            let hidden = Array.init model.Factors (fun _ -> if random.Next() < 0.6 then 0 else 1)
            let tokens = Array.zeroCreate length
            for t in 0 .. length - 1 do
                let mutable token = 0
                for f in 0 .. model.Factors - 1 do
                    let draw = random.Next()
                    let mutable cumulative = 0.0
                    let mutable choice = 3
                    let mutable found = false
                    for x in 0..1 do
                        for j in 0..1 do
                            cumulative <- cumulative + local.[4*x+2*hidden.[f]+j]
                            if not found && draw < cumulative then choice <- 2*x+j; found <- true
                    hidden.[f] <- choice%2
                    token <- token ||| ((choice/2) <<< f)
                let flip = random.Next() < model.Noise
                tokens.[t] <- if flip then token ^^^ (size model - 1) else token
            Ok tokens
