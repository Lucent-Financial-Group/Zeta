// Independent F# oracle for the finite coded-Adinkra / half-spin intertwiner census.
//
// This script imports no TypeScript matrix or golden count. It rebuilds the extended-Hamming
// quotient signs, the even-occupation Jordan-Wigner target, and the signed constraint graph from
// the declarations in docs/research/2026-09-01-finite-adinkra-half-spin-intertwiner-contract.md.

open System
open System.Collections.Generic
open System.Text.Json

type SignedPerm = { To: int array; Sign: int array }
type Edge = { Neighbour: int; Factor: int }
type SparseEntry = { Row: int; Column: int; Value: int }

type Options =
    { Field: int
      RepSeed: int
      OmitTargetParity: bool
      FlipTargetCoordinate: bool
      DuplicateTargetGenerator: bool }

type Report =
    { Field: int
      RepSeed: int
      SourceDimension: int
      TargetDimension: int
      GeneratorCount: int
      SourceCliffordViolations: int
      TargetCliffordViolations: int
      Nullity: int
      ConsistentComponentCount: int
      InconsistentComponentCount: int
      ComponentSizeSpectrum: int array array
      BasisRankSpectrum: int array array
      MaximalBasisRank: int
      UnitCombinationRank: int }

let args = fsi.CommandLineArgs |> Array.skip 1
let has flag = args |> Array.exists ((=) flag)

let intArgument prefix fallback =
    args
    |> Array.tryPick (fun argument ->
        if argument.StartsWith(prefix, StringComparison.Ordinal) then
            match Int32.TryParse(argument.Substring(prefix.Length)) with
            | true, value -> Some value
            | _ -> failwith $"invalid integer argument: {argument}"
        else None)
    |> Option.defaultValue fallback

let options =
    { Field = intArgument "--field=" 1000003
      RepSeed = intArgument "--rep-seed=" 0
      OmitTargetParity = has "--omit-target-parity"
      FlipTargetCoordinate = has "--flip-target-coordinate"
      DuplicateTargetGenerator = has "--duplicate-target-generator" }

let bitCount mask =
    let mutable count = 0
    let mutable cursor = mask
    while cursor <> 0 do
        cursor <- cursor &&& (cursor - 1)
        count <- count + 1
    count

let cliffordSign left right square =
    let mutable swaps = 0
    for index in 0 .. 31 do
        if (left &&& (1 <<< index)) <> 0 then
            swaps <- swaps + bitCount (right &&& ((1 <<< index) - 1))
    let collide = bitCount (left &&& right)
    let reorder = if swaps % 2 = 0 then 1 else -1
    let metric = if square = 1 || collide % 2 = 0 then 1 else -1
    reorder * metric

let enumerateCode (generators: int array) =
    let words = ResizeArray<int>()
    words.Add(0)
    for generator in generators do
        let snapshot = words.ToArray()
        for word in snapshot do
            let candidate = word ^^^ generator
            if not (words.Contains(candidate)) then words.Add(candidate)
    words.ToArray() |> Array.sort

let signedCodeGroup (generators: int array) square =
    let epsilon = Dictionary<int, int>()
    epsilon.[0] <- 1
    for generator in generators do
        let snapshot = epsilon |> Seq.map (fun pair -> pair.Key, pair.Value) |> Seq.toArray
        for word, sign in snapshot do
            let key = word ^^^ generator
            let candidate = sign * cliffordSign word generator square
            match epsilon.TryGetValue(key) with
            | true, prior when prior <> candidate -> failwith $"signed code group reached -1 at {key}"
            | false, _ -> epsilon.[key] <- candidate
            | _ -> ()
    epsilon

let compose outer inner =
    if outer.To.Length <> inner.To.Length then failwith "signed permutation dimensions differ"
    let dimension = outer.To.Length
    { To = Array.init dimension (fun source -> outer.To.[inner.To.[source]])
      Sign = Array.init dimension (fun source -> inner.Sign.[source] * outer.Sign.[inner.To.[source]]) }

let extendedHamming = [| 0b11100001; 0b11010010; 0b10110100; 0b01111000 |]

let codedAdinkra repSeed =
    let code = enumerateCode extendedHamming
    if code |> Array.exists (fun word -> bitCount word % 4 <> 0) then failwith "code is not doubly even"
    let epsilon = signedCodeGroup extendedHamming -1
    let repOf = Array.create 256 -1
    let reps = ResizeArray<int>()
    for scan in 0 .. 255 do
        let mask = scan ^^^ repSeed
        if repOf.[mask] = -1 then
            let index = reps.Count
            reps.Add(mask)
            for word in code do repOf.[mask ^^^ word] <- index
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
                let secondSign =
                    match epsilon.TryGetValue(difference) with
                    | true, value -> value
                    | _ -> failwith $"coset difference {difference} is absent"
                let thirdSign = cliffordSign targetRepresentative difference -1
                targets.[vertex] <- targetVertex
                signs.[vertex] <- firstSign * secondSign * thirdSign
            { To = targets; Sign = signs })
    let anchor = edges.[0]
    [| for colour in 1 .. 7 -> compose edges.[colour] anchor |]

let parityBelow mask mode =
    if bitCount (mask &&& ((1 <<< mode) - 1)) % 2 = 0 then 1 else -1

let gammaAction omitParity generator mask =
    let mode = generator / 2
    let occupied = (mask &&& (1 <<< mode)) <> 0
    let stringSign = if omitParity then 1 else parityBelow mask mode
    let target = mask ^^^ (1 <<< mode)
    if generator % 2 = 0 then target, stringSign, 0
    else target, 0, stringSign * (if occupied then -1 else 1)

let gammaProduct omitParity first second mask =
    let middle, rightRe, rightIm = gammaAction omitParity second mask
    let target, leftRe, leftIm = gammaAction omitParity first middle
    let real = leftRe * rightRe - leftIm * rightIm
    let imaginary = leftRe * rightIm + leftIm * rightRe
    target, real, imaginary

let targetAction (oracleOptions: Options) =
    let masks = [| for mask in 0 .. 255 do if bitCount mask % 2 = 0 then yield mask |]
    if masks.Length <> 128 then failwith "positive chirality does not have dimension 128"
    let indexByMask = Array.create 256 -1
    masks |> Array.iteri (fun index mask -> indexByMask.[mask] <- index)
    let generators =
        Array.init 7 (fun generatorIndex ->
            let colour = generatorIndex + 1
            let targets = Array.zeroCreate masks.Length
            let signs = Array.zeroCreate masks.Length
            for source in 0 .. masks.Length - 1 do
                let targetMask, real, imaginary = gammaProduct oracleOptions.OmitTargetParity (2 * colour) 0 masks.[source]
                if imaginary <> 0 || (real <> 1 && real <> -1) then failwith "target is not a real signed permutation"
                let target = indexByMask.[targetMask]
                if target < 0 then failwith "target left positive chirality"
                targets.[source] <- target
                signs.[source] <- real
            { To = targets; Sign = signs })
    if oracleOptions.FlipTargetCoordinate then
        let original = generators.[0]
        let signs = Array.copy original.Sign
        signs.[0] <- -signs.[0]
        generators.[0] <- { To = Array.copy original.To; Sign = signs }
    if oracleOptions.DuplicateTargetGenerator then
        let original = generators.[5]
        generators.[6] <- { To = Array.copy original.To; Sign = Array.copy original.Sign }
    generators

let countCliffordSevenViolations (generators: SignedPerm array) =
    let mutable violations = 0
    for first in 0 .. generators.Length - 1 do
        for second in first .. generators.Length - 1 do
            let forward = compose generators.[first] generators.[second]
            let backward = compose generators.[second] generators.[first]
            for basis in 0 .. generators.[first].To.Length - 1 do
                if first = second then
                    if forward.To.[basis] <> basis || forward.Sign.[basis] <> -1 then
                        violations <- violations + 1
                elif forward.To.[basis] <> backward.To.[basis] || forward.Sign.[basis] <> -backward.Sign.[basis] then
                    violations <- violations + 1
    violations

let modularInverse value prime =
    let p = int64 prime
    let mutable oldR = ((int64 value % p) + p) % p
    let mutable r = p
    let mutable oldS = 1L
    let mutable s = 0L
    while r <> 0L do
        let quotient = oldR / r
        let nextR = oldR - quotient * r
        oldR <- r
        r <- nextR
        let nextS = oldS - quotient * s
        oldS <- s
        s <- nextS
    if oldR <> 1L then failwith $"{value} is not invertible modulo {prime}"
    int ((oldS % p + p) % p)

let sparseRank targetDimension sourceDimension (entries: SparseEntry array) field =
    let p = int64 field
    let rows = Array.init targetDimension (fun _ -> Array.zeroCreate<int64> sourceDimension)
    for entry in entries do
        let encoded = if entry.Value = 1 then 1L else p - 1L
        rows.[entry.Row].[entry.Column] <- (rows.[entry.Row].[entry.Column] + encoded) % p
    let mutable rank = 0
    let mutable column = 0
    while column < sourceDimension && rank < targetDimension do
        let mutable pivot = rank
        while pivot < targetDimension && rows.[pivot].[column] = 0L do pivot <- pivot + 1
        if pivot < targetDimension then
            let temporary = rows.[rank]
            rows.[rank] <- rows.[pivot]
            rows.[pivot] <- temporary
            let inverse = int64 (modularInverse (int rows.[rank].[column]) field)
            for cursor in column .. sourceDimension - 1 do
                rows.[rank].[cursor] <- (rows.[rank].[cursor] * inverse) % p
            for rowIndex in 0 .. targetDimension - 1 do
                if rowIndex <> rank then
                    let factor = rows.[rowIndex].[column]
                    if factor <> 0L then
                        for cursor in column .. sourceDimension - 1 do
                            let reduced = (rows.[rowIndex].[cursor] - factor * rows.[rank].[cursor]) % p
                            rows.[rowIndex].[cursor] <- if reduced < 0L then reduced + p else reduced
            rank <- rank + 1
        column <- column + 1
    rank

let increment (dictionary: Dictionary<int, int>) key =
    match dictionary.TryGetValue(key) with
    | true, count -> dictionary.[key] <- count + 1
    | _ -> dictionary.[key] <- 1

let solve (sourceGenerators: SignedPerm array) (targetGenerators: SignedPerm array) field =
    if sourceGenerators.Length = 0 || sourceGenerators.Length <> targetGenerators.Length then
        failwith "source and target generator counts differ"
    let sourceDimension = sourceGenerators.[0].To.Length
    let targetDimension = targetGenerators.[0].To.Length
    let variableCount = sourceDimension * targetDimension
    let adjacency = Array.init variableCount (fun _ -> ResizeArray<Edge>())
    for generatorIndex in 0 .. sourceGenerators.Length - 1 do
        let source = sourceGenerators.[generatorIndex]
        let target = targetGenerators.[generatorIndex]
        for row in 0 .. targetDimension - 1 do
            for column in 0 .. sourceDimension - 1 do
                let fromIndex = row * sourceDimension + column
                let toIndex = target.To.[row] * sourceDimension + source.To.[column]
                let factor = target.Sign.[row] * source.Sign.[column]
                adjacency.[fromIndex].Add({ Neighbour = toIndex; Factor = factor })
                adjacency.[toIndex].Add({ Neighbour = fromIndex; Factor = factor })
    let assignments = Array.zeroCreate<int> variableCount
    let componentSizes = Dictionary<int, int>()
    let rankSpectrum = Dictionary<int, int>()
    let unitEntries = ResizeArray<SparseEntry>()
    let mutable consistentComponents = 0
    let mutable inconsistentComponents = 0
    let mutable maximalBasisRank = 0
    for root in 0 .. variableCount - 1 do
        if assignments.[root] = 0 then
            assignments.[root] <- 1
            let queue = Queue<int>()
            let variables = ResizeArray<int>()
            let mutable consistent = true
            queue.Enqueue(root)
            while queue.Count > 0 do
                let current = queue.Dequeue()
                variables.Add(current)
                for edge in adjacency.[current] do
                    let expected = assignments.[current] * edge.Factor
                    if assignments.[edge.Neighbour] = 0 then
                        assignments.[edge.Neighbour] <- expected
                        queue.Enqueue(edge.Neighbour)
                    elif assignments.[edge.Neighbour] <> expected then
                        consistent <- false
            increment componentSizes variables.Count
            if consistent then
                consistentComponents <- consistentComponents + 1
                let entries =
                    variables
                    |> Seq.map (fun variable ->
                        { Row = variable / sourceDimension
                          Column = variable % sourceDimension
                          Value = assignments.[variable] })
                    |> Seq.toArray
                let rank = sparseRank targetDimension sourceDimension entries field
                increment rankSpectrum rank
                maximalBasisRank <- max maximalBasisRank rank
                unitEntries.AddRange(entries)
            else
                inconsistentComponents <- inconsistentComponents + 1
    consistentComponents,
    inconsistentComponents,
    componentSizes,
    rankSpectrum,
    maximalBasisRank,
    sparseRank targetDimension sourceDimension (unitEntries.ToArray()) field

let source = codedAdinkra options.RepSeed
let target = targetAction options
let consistent, inconsistent, componentSizes, rankSpectrum, maximalRank, unitRank = solve source target options.Field

let spectrum (dictionary: Dictionary<int, int>) =
    dictionary
    |> Seq.sortBy (fun pair -> pair.Key)
    |> Seq.map (fun pair -> [| pair.Key; pair.Value |])
    |> Seq.toArray

let report =
    { Field = options.Field
      RepSeed = options.RepSeed
      SourceDimension = source.[0].To.Length
      TargetDimension = target.[0].To.Length
      GeneratorCount = source.Length
      SourceCliffordViolations = countCliffordSevenViolations source
      TargetCliffordViolations = countCliffordSevenViolations target
      Nullity = consistent
      ConsistentComponentCount = consistent
      InconsistentComponentCount = inconsistent
      ComponentSizeSpectrum = spectrum componentSizes
      BasisRankSpectrum = spectrum rankSpectrum
      MaximalBasisRank = maximalRank
      UnitCombinationRank = unitRank }

let jsonOptions = JsonSerializerOptions(PropertyNamingPolicy = JsonNamingPolicy.CamelCase)
printfn "%s" (JsonSerializer.Serialize(report, jsonOptions))
