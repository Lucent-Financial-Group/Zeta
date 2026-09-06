namespace Zeta.Research

open System

/// Research-only edge-emitting HMM: binary64 filtering and observation-only EM.
[<RequireQualifiedAccess>]
module DenseHmm =
    type Model = private { Alphabet: int; States: int; Prior: float[]; Edges: float[]; Emissions: float[] }
    type Progress = { Pass: int; CorpusLossNats: float }
    type Training = { Model: Model; Trace: Progress[] }

    let alphabet model = model.Alphabet
    let states model = model.States
    let prior model = Array.copy model.Prior
    let parameters model = Array.copy model.Edges
    let internal edge model token source target = model.Edges.[(token * model.States + source) * model.States + target]
    let private nonnegative x = Double.IsFinite x && x >= 0.0
    let private distribution size (values: float[]) =
        not (isNull values) && values.Length = size && Array.forall nonnegative values && abs (Array.sum values - 1.0) <= 1e-10

    let fromParameters alphabet states (prior: float[]) (edges: float[]) =
        if alphabet < 2 || alphabet > 16 || states < 1 || states > 16 then Error "HMM alphabet must be 2..16 and states 1..16"
        elif not (distribution states prior) || isNull edges || edges.Length <> alphabet * states * states || not (Array.forall nonnegative edges) then
            Error "HMM parameters require finite nonnegative probabilities with the declared shape"
        else
            let emissions = Array.zeroCreate (alphabet * states)
            let totals = Array.zeroCreate states
            for token in 0 .. alphabet - 1 do
                for source in 0 .. states - 1 do
                    for target in 0 .. states - 1 do
                        let value = edges.[(token * states + source) * states + target]
                        emissions.[token * states + source] <- emissions.[token * states + source] + value
                        totals.[source] <- totals.[source] + value
            if Array.exists (fun total -> abs (total - 1.0) > 1e-10) totals then Error "outgoing token/transition rows must sum to one"
            else Ok { Alphabet = alphabet; States = states; Prior = Array.copy prior; Edges = Array.copy edges; Emissions = emissions }

    let create alphabet states seed =
        if alphabet < 2 || alphabet > 16 || states < 1 || states > 16 then Error "HMM alphabet must be 2..16 and states 1..16"
        else
            let random = ResearchRandom.Stream seed
            let prior = Array.init states (fun _ -> 0.1 + random.Next())
            let sum = Array.sum prior
            for i in 0 .. states - 1 do prior.[i] <- prior.[i] / sum
            let edges = Array.init (alphabet * states * states) (fun _ -> 0.1 + random.Next())
            for source in 0 .. states - 1 do
                let mutable total = 0.0
                for token in 0 .. alphabet - 1 do
                    for target in 0 .. states - 1 do total <- total + edges.[(token * states + source) * states + target]
                for token in 0 .. alphabet - 1 do
                    for target in 0 .. states - 1 do
                        let i = (token * states + source) * states + target
                        edges.[i] <- edges.[i] / total
            fromParameters alphabet states prior edges

    let internal advanceInto model token (previous: float[]) previousOffset (target: float[]) targetOffset =
        let n = model.States
        for j in 0 .. n - 1 do target.[targetOffset + j] <- 0.0
        for i in 0 .. n - 1 do
            let weight = previous.[previousOffset + i]
            for j in 0 .. n - 1 do
                target.[targetOffset + j] <- target.[targetOffset + j] + weight * edge model token i j
        let mutable mass = 0.0
        for j in 0 .. n - 1 do mass <- mass + target.[targetOffset + j]
        mass

    let internal next model (state: float[]) =
        Array.init model.Alphabet (fun token ->
            let mutable mass = 0.0
            for i in 0 .. model.States - 1 do mass <- mass + state.[i] * model.Emissions.[token * model.States + i]
            mass)

    let private validTokens model minimum (tokens: int[]) =
        not (isNull tokens) && tokens.Length >= minimum && tokens.Length <= 257
        && Array.forall (fun token -> token >= 0 && token < model.Alphabet) tokens

    let internal afterUnchecked model (tokens: int[]) =
        let mutable current = Array.copy model.Prior
        let mutable scratch = Array.zeroCreate model.States
        let mutable valid = true
        for token in tokens do
            if valid then
                let mass = advanceInto model token current 0 scratch 0
                if mass <= 0.0 || not (Double.IsFinite mass) then valid <- false
                else
                    for i in 0 .. model.States - 1 do scratch.[i] <- scratch.[i] / mass
                    let old = current
                    current <- scratch
                    scratch <- old
        if valid then Ok(current, next model current) else Error "impossible or numerically underflowed HMM history"

    let after model tokens =
        if not (validTokens model 0 tokens) then Error "HMM context must contain at most 257 in-alphabet tokens"
        else afterUnchecked model tokens

    let internal stepUnchecked model state token =
        let updated = Array.zeroCreate model.States
        let mass = advanceInto model token state 0 updated 0
        if mass <= 0.0 || not (Double.IsFinite mass) then Error "impossible or numerically underflowed HMM observation"
        else
            for i in 0 .. model.States - 1 do updated.[i] <- updated.[i] / mass
            Ok(updated, next model updated)

    /// Unnormalized expansion handles impossible branches without inventing a posterior.
    let future model horizon (state: float[]) =
        if horizon < 1 || horizon > 4 || not (distribution model.States state) then Error "future requires a normalized state and horizon 1..4"
        else
            let rec expand depth weights =
                if depth = 0 then [| Array.sum weights |]
                else
                    [| for token in 0 .. model.Alphabet - 1 do
                           let updated = Array.zeroCreate model.States
                           advanceInto model token weights 0 updated 0 |> ignore
                           yield! expand (depth - 1) updated |]
            Ok(expand horizon state)

    type private Workspace(states, length) =
        member val Forward: float[] = Array.zeroCreate ((length + 1) * states)
        member val Scale: float[] = Array.zeroCreate length
        member val Beta: float[] = Array.zeroCreate states
        member val PreviousBeta: float[] = Array.zeroCreate states

    let private forward model (tokens: int[]) (workspace: Workspace) =
        let n = model.States
        Array.Copy(model.Prior, workspace.Forward, n)
        let mutable loss = 0.0
        let mutable valid = true
        for t in 0 .. tokens.Length - 1 do
            if valid then
                let mass = advanceInto model tokens.[t] workspace.Forward (t * n) workspace.Forward ((t + 1) * n)
                if mass <= 0.0 || not (Double.IsFinite mass) then valid <- false
                else
                    workspace.Scale.[t] <- mass
                    loss <- loss - Math.Log mass
                    for j in 0 .. n - 1 do workspace.Forward.[(t + 1) * n + j] <- workspace.Forward.[(t + 1) * n + j] / mass
        if valid && Double.IsFinite loss then Ok loss else Error "training corpus has an impossible or underflowed history"

    let private validCorpus model (corpus: int[][]) =
        not (isNull corpus) && corpus.Length >= 1 && corpus.Length <= 65536 && Array.forall (validTokens model 1) corpus

    let private expectation model (corpus: int[][]) =
        let n = model.States
        let workspace = Workspace(n, corpus |> Array.map Array.length |> Array.max)
        let counts = Array.zeroCreate model.Edges.Length
        let initialCounts = Array.zeroCreate n
        let mutable loss = 0.0
        let mutable error = None
        for tokens in corpus do
            match forward model tokens workspace with
            | Error reason -> error <- Some reason
            | Ok value ->
                loss <- loss + value
                Array.Fill(workspace.Beta, 1.0)
                // Scaled beta and alpha give expected edge counts for the observed token.
                for t in tokens.Length - 1 .. -1 .. 0 do
                    let token = tokens.[t]
                    for i in 0 .. n - 1 do
                        let mutable beta = 0.0
                        for j in 0 .. n - 1 do
                            let index = (token * n + i) * n + j
                            let suffix = model.Edges.[index] * workspace.Beta.[j] / workspace.Scale.[t]
                            beta <- beta + suffix
                            counts.[index] <- counts.[index] + workspace.Forward.[t * n + i] * suffix
                        workspace.PreviousBeta.[i] <- beta
                    Array.Copy(workspace.PreviousBeta, workspace.Beta, n)
                for i in 0 .. n - 1 do initialCounts.[i] <- initialCounts.[i] + model.Prior.[i] * workspace.Beta.[i]
        match error with
        | Some reason -> Error reason
        | None when not (Double.IsFinite loss && Array.forall nonnegative counts && Array.forall nonnegative initialCounts) -> Error "non-finite HMM sufficient statistics"
        | None -> Ok(loss, initialCounts, counts)

    let emStep model corpus =
        if not (validCorpus model corpus) then Error "EM needs 1..65536 nonempty in-alphabet sequences of length at most 257"
        else
            expectation model corpus |> Result.bind (fun (loss, initial, counts) ->
                let n = model.States
                let total = Array.sum initial
                for i in 0 .. n - 1 do initial.[i] <- initial.[i] / total
                for i in 0 .. n - 1 do
                    let mutable occupancy = 0.0
                    for token in 0 .. model.Alphabet - 1 do
                        for j in 0 .. n - 1 do occupancy <- occupancy + counts.[(token * n + i) * n + j]
                    for token in 0 .. model.Alphabet - 1 do
                        for j in 0 .. n - 1 do
                            let index = (token * n + i) * n + j
                            counts.[index] <- if occupancy > 0.0 then counts.[index] / occupancy else model.Edges.[index]
                fromParameters model.Alphabet n initial counts |> Result.map (fun updated -> updated, loss))

    let corpusLoss model corpus =
        if not (validCorpus model corpus) then Error "invalid HMM corpus"
        else
            let workspace = Workspace(model.States, corpus |> Array.map Array.length |> Array.max)
            let mutable result = Ok 0.0
            for tokens in corpus do result <- result |> Result.bind (fun loss -> forward model tokens workspace |> Result.map ((+) loss))
            result

    let train passes progress model corpus =
        if passes < 1 || passes > 64 || not (validCorpus model corpus) then Error "training needs 1..64 passes and a valid bounded corpus"
        else
            let trace = ResizeArray<Progress>()
            let mutable current = Ok model
            for pass in 0 .. passes - 1 do
                current <- current |> Result.bind (fun model ->
                    emStep model corpus |> Result.map (fun (updated, loss) ->
                        let row = { Pass = pass; CorpusLossNats = loss }
                        trace.Add row
                        progress row
                        updated))
            current |> Result.bind (fun model ->
                corpusLoss model corpus |> Result.map (fun loss ->
                    let row = { Pass = passes; CorpusLossNats = loss }
                    trace.Add row
                    progress row
                    { Model = model; Trace = trace.ToArray() }))
