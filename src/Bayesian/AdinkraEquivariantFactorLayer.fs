namespace Zeta.Bayesian

open System
open System.Collections.Generic

/// A typed deterministic feature factor for the composable Bayesian factor graph.
/// It is not a learner: it sectorizes Gaussian feature beliefs under the declared
/// coded-Adinkra central involution and refuses to fabricate independence.
module AdinkraEquivariantFactorLayer =

    type private SignedPermutation =
        { To: int array
          Sign: int array }

    type SourceMutation =
        | Baseline
        | ReverseGeneratorOrder
        | FlipFirstGeneratorCoordinate

    type PriorFactorOrder =
        | Forward
        | Reverse

    type SectorFeature =
        { FeatureId: string
          Input: int
          Eigenvalue: int
          Belief: Gaussian }

    type SectorizedFeatures =
        { Plus: SectorFeature array
          Minus: SectorFeature array
          Orientation: string
          RepSeed: int
          SourceCliffordViolations: int
          CentralityViolations: int
          InvolutionViolations: int
          InputAssumption: string
          TargetSelector: string }

    type FactorLayer =
        { Graph: FactorGraph<Gaussian>
          PlusVariables: int array
          MinusVariables: int array
          FactorIds: int array
          Orientation: string }

    type FactorDagLayerDescriptor =
        { NodeIds: int array
          Parents: int list array
          SectorLabels: string array
          Exactness: string
          LearnsWeights: bool }

    type SectorizationError =
        | InvalidFeatureCount of actual: int
        | ImproperInput of index: int
        | SourceAlgebraViolation of clifford: int * centrality: int * involution: int

    let private bitCount value =
        let mutable cursor = value
        let mutable count = 0
        while cursor <> 0 do
            cursor <- cursor &&& (cursor - 1)
            count <- count + 1
        count

    let private cliffordSign left right square =
        let mutable swaps = 0
        for index in 0 .. 31 do
            if (left &&& (1 <<< index)) <> 0 then
                swaps <- swaps + bitCount (right &&& ((1 <<< index) - 1))
        let collide = bitCount (left &&& right)
        let reorder = if swaps % 2 = 0 then 1 else -1
        let metric = if square = 1 || collide % 2 = 0 then 1 else -1
        reorder * metric

    let private enumerateCode (generators: int array) =
        let words = ResizeArray<int>()
        words.Add 0
        for generator in generators do
            let snapshot = words.ToArray()
            for word in snapshot do
                let candidate = word ^^^ generator
                if not (words.Contains candidate) then words.Add candidate
        words.ToArray() |> Array.sort

    let private signedCodeGroup (generators: int array) square =
        let epsilon = Dictionary<int, int>()
        epsilon.[0] <- 1
        for generator in generators do
            let snapshot = epsilon |> Seq.map (fun pair -> pair.Key, pair.Value) |> Seq.toArray
            for word, sign in snapshot do
                let key = word ^^^ generator
                let candidate = sign * cliffordSign word generator square
                match epsilon.TryGetValue key with
                | true, prior when prior <> candidate -> failwithf "signed code group reached -1 at %d" key
                | false, _ -> epsilon.[key] <- candidate
                | _ -> ()
        epsilon

    let private compose outer inner =
        if outer.To.Length <> inner.To.Length then invalidArg (nameof inner) "signed permutation dimensions differ"
        { To = Array.init outer.To.Length (fun source -> outer.To.[inner.To.[source]])
          Sign = Array.init outer.To.Length (fun source -> inner.Sign.[source] * outer.Sign.[inner.To.[source]]) }

    let private identity dimension =
        { To = Array.init dimension id
          Sign = Array.create dimension 1 }

    let private differenceCount left right =
        Array.zip3 left.To left.Sign (Array.zip right.To right.Sign)
        |> Array.sumBy (fun (leftTo, leftSign, (rightTo, rightSign)) ->
            if leftTo = rightTo && leftSign = rightSign then 0 else 1)

    let private extendedHamming =
        [| 0b11100001; 0b11010010; 0b10110100; 0b01111000 |]

    let private buildCanonicalGenerators repSeed mutation =
        let code = enumerateCode extendedHamming
        let epsilon = signedCodeGroup extendedHamming -1
        let repOf = Array.create 256 -1
        let reps = ResizeArray<int>()
        for scan in 0 .. 255 do
            let mask = scan ^^^ repSeed
            if repOf.[mask] = -1 then
                let index = reps.Count
                reps.Add mask
                for word in code do
                    repOf.[mask ^^^ word] <- index
        let edges =
            Array.init 8 (fun colour ->
                let bit = 1 <<< colour
                let targets = Array.zeroCreate reps.Count
                let signs = Array.zeroCreate reps.Count
                for vertex in 0 .. reps.Count - 1 do
                    let representative = reps.[vertex]
                    let shifted = representative ^^^ bit
                    let firstSign = cliffordSign bit representative -1
                    let targetVertex = repOf.[shifted]
                    let targetRepresentative = reps.[targetVertex]
                    let difference = shifted ^^^ targetRepresentative
                    let secondSign = epsilon.[difference]
                    let thirdSign = cliffordSign targetRepresentative difference -1
                    targets.[vertex] <- targetVertex
                    signs.[vertex] <- firstSign * secondSign * thirdSign
                { To = targets; Sign = signs })
        let anchor = edges.[0]
        let internalGenerators = [| for colour in 1 .. 7 -> compose edges.[colour] anchor |]
        let cosetKeys =
            reps
            |> Seq.map (fun representative -> code |> Array.map ((^^^) representative) |> Array.min)
            |> Seq.toArray
        let sortedKeys = Array.copy cosetKeys
        Array.sortInPlace sortedKeys
        let canonicalIndex = sortedKeys |> Array.mapi (fun index key -> key, index) |> Map.ofArray
        let internalToCanonical = cosetKeys |> Array.map (fun key -> canonicalIndex.[key])
        let canonicalized =
            internalGenerators
            |> Array.map (fun permutation ->
                let targets = Array.zeroCreate 16
                let signs = Array.zeroCreate 16
                for internalSource in 0 .. 15 do
                    let source = internalToCanonical.[internalSource]
                    let target = internalToCanonical.[permutation.To.[internalSource]]
                    targets.[source] <- target
                    signs.[source] <- permutation.Sign.[internalSource]
                { To = targets; Sign = signs })
        match mutation with
        | Baseline -> canonicalized, sortedKeys
        | ReverseGeneratorOrder -> Array.rev canonicalized, sortedKeys
        | FlipFirstGeneratorCoordinate ->
            let mutated = Array.copy canonicalized
            let first = mutated.[0]
            let signs = Array.copy first.Sign
            signs.[0] <- -signs.[0]
            mutated.[0] <- { first with Sign = signs }
            mutated, sortedKeys

    let private countCliffordViolations (generators: SignedPermutation array) =
        let mutable violations = 0
        for first in 0 .. generators.Length - 1 do
            for second in first .. generators.Length - 1 do
                let forward = compose generators.[first] generators.[second]
                let backward = compose generators.[second] generators.[first]
                for basis in 0 .. 15 do
                    if first = second then
                        if forward.To.[basis] <> basis || forward.Sign.[basis] <> -1 then
                            violations <- violations + 1
                    elif forward.To.[basis] <> backward.To.[basis] || forward.Sign.[basis] <> -backward.Sign.[basis] then
                        violations <- violations + 1
        violations

    let private centralCensus (generators: SignedPermutation array) =
        let word = generators |> Array.fold compose (identity 16)
        let square = compose word word
        let centrality =
            generators
            |> Array.sumBy (fun generator -> differenceCount (compose word generator) (compose generator word))
        centrality, differenceCount square (identity 16), word

    let private validateInputs (features: Gaussian array) =
        if features.Length <> 16 then
            Error (InvalidFeatureCount features.Length)
        else
            features
            |> Array.tryFindIndex (fun feature ->
                not (Gaussian.isProper feature)
                || not (Double.IsFinite (Gaussian.mean feature))
                || not (Double.IsFinite (Gaussian.variance feature)))
            |> function
                | Some index -> Error (ImproperInput index)
                | None -> Ok ()

    let trySectorizeWithMutation repSeed mutation (features: Gaussian array) =
        validateInputs features
        |> Result.bind (fun () ->
            let generators, keys = buildCanonicalGenerators repSeed mutation
            let clifford = countCliffordViolations generators
            let centrality, involution, word = centralCensus generators
            if clifford <> 0 || centrality <> 0 || involution <> 0 then
                Error (SourceAlgebraViolation (clifford, centrality, involution))
            else
                if word.To <> Array.init 16 id then
                    failwith "declared source central word is not diagonal in the canonical coset basis"
                let classified =
                    Array.init 16 (fun input ->
                        { FeatureId = sprintf "%02x" keys.[input]
                          Input = input
                          Eigenvalue = word.Sign.[input]
                          Belief = features.[input] })
                let plus = classified |> Array.filter (fun feature -> feature.Eigenvalue = 1)
                let minus = classified |> Array.filter (fun feature -> feature.Eigenvalue = -1)
                if plus.Length <> 8 || minus.Length <> 8 then
                    failwith "declared source central sectors do not have dimensions 8+8"
                Ok
                    { Plus = plus
                      Minus = minus
                      Orientation = if mutation = ReverseGeneratorOrder then "reversed" else "declared"
                      RepSeed = repSeed
                      SourceCliffordViolations = clifford
                      CentralityViolations = centrality
                      InvolutionViolations = involution
                      InputAssumption = "sixteen independent scalar Gaussian feature beliefs"
                      TargetSelector = "not-used: source-sector adapter" })

    let trySectorize repSeed features =
        trySectorizeWithMutation repSeed Baseline features

    let roundTrip (sectorized: SectorizedFeatures) =
        let restored = Array.create 16 Gaussian.One
        for feature in Array.append sectorized.Plus sectorized.Minus do
            restored.[feature.Input] <- feature.Belief
        restored

    let tryAddPriorFactors variableBase factorBase order sectorized =
        let beliefs =
            [| yield! sectorized.Plus |> Array.map _.Belief
               yield! sectorized.Minus |> Array.map _.Belief |]
        let variableIds = Array.init beliefs.Length ((+) variableBase)
        let factorIds = Array.init beliefs.Length ((+) factorBase)
        let indices =
            match order with
            | Forward -> [| 0 .. beliefs.Length - 1 |]
            | Reverse -> [| beliefs.Length - 1 .. -1 .. 0 |]
        let graph =
            indices
            |> Array.fold (fun graph index ->
                graph
                |> FactorGraph.addFactor factorIds.[index] (Factor.prior variableIds.[index] beliefs.[index]))
                (FactorGraph.empty Gaussian.algebra)
            |> FactorGraph.passOnce
        Ok
            { Graph = graph
              PlusVariables = variableIds.[0..7]
              MinusVariables = variableIds.[8..15]
              FactorIds = factorIds
              Orientation = sectorized.Orientation }

    let tryToFactorDagLayer variableBase sectorized =
        Ok
            { NodeIds = Array.init 16 ((+) variableBase)
              Parents = Array.create 16 []
              SectorLabels = [| yield! Array.create 8 "+"; yield! Array.create 8 "-" |]
              Exactness = "exact partition of sixteen independent Gaussian roots in the canonical central eigenbasis"
              LearnsWeights = false }
