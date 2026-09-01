// Independent F# oracle for the finite intertwiner decomposition/selector contract.
// It imports no TypeScript/Rust matrix, basis map, serialized vector, or measured count.

open System
open System.Collections.Generic
open System.Numerics
open System.Text.Json

type SignedPerm = { To: int array; Sign: int array }
type Edge = { Neighbour: int; Factor: int }
type Entry = { Row: int; Column: int; Value: int64 }

type Report =
    { Field: int
      RepSeed: int
      SourceSectorRanks: int array
      TargetSectorRanks: int array
      HomBlocks: int array
      SourceCommutantBlocks: int array
      TargetCommutantBlocks: int array
      SourceGeneratedAlgebraRanks: int array
      TargetGeneratedAlgebraRanks: int array
      FullHomRankSpectrum: int array array
      ProjectiveEmbeddingClassCount: string
      CoefficientBoundaryRanks: int array
      MinimumSupportCandidateCount: int
      AllMinimumSupportRanks: int array
      BalancedMinimizerCount: int
      BalancedScore: int64 array
      BasisOrientationInvariantImage: bool
      UnitMovedByAutomorphism: bool
      MinimumSupportMovedByAutomorphism: bool }

let args = fsi.CommandLineArgs |> Array.skip 1

let intArgument prefix fallback =
    args
    |> Array.tryPick (fun argument ->
        if argument.StartsWith(prefix, StringComparison.Ordinal) then
            match Int32.TryParse(argument.Substring(prefix.Length)) with
            | true, value -> Some value
            | _ -> failwith $"invalid integer argument: {argument}"
        else None)
    |> Option.defaultValue fallback

let stringArgument prefix =
    args
    |> Array.tryPick (fun argument ->
        if argument.StartsWith(prefix, StringComparison.Ordinal) then Some(argument.Substring(prefix.Length))
        else None)

let field = intArgument "--field=" 1000003
let repSeed = intArgument "--rep-seed=" 0
let fault = stringArgument "--fault="
if field = 2 then failwith "central projectors require odd characteristic"

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
    let collision = bitCount (left &&& right)
    let reorder = if swaps % 2 = 0 then 1 else -1
    let metric = if square = 1 || collision % 2 = 0 then 1 else -1
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

let signedCodeGroup (generators: int array) =
    let signs = Dictionary<int, int>()
    signs.[0] <- 1
    for generator in generators do
        let snapshot = signs |> Seq.map (fun pair -> pair.Key, pair.Value) |> Seq.toArray
        for word, sign in snapshot do
            let key = word ^^^ generator
            let candidate = sign * cliffordSign word generator -1
            match signs.TryGetValue(key) with
            | true, prior when prior <> candidate -> failwith "signed code group is inconsistent"
            | false, _ -> signs.[key] <- candidate
            | _ -> ()
    signs

let compose outer inner =
    if outer.To.Length <> inner.To.Length then failwith "signed permutation dimensions differ"
    { To = Array.init outer.To.Length (fun source -> outer.To.[inner.To.[source]])
      Sign = Array.init outer.To.Length (fun source -> inner.Sign.[source] * outer.Sign.[inner.To.[source]]) }

let identityPerm dimension coefficient =
    { To = Array.init dimension id; Sign = Array.create dimension coefficient }

let codedSource seed =
    let generators = [| 0b11100001; 0b11010010; 0b10110100; 0b01111000 |]
    let code = enumerateCode generators
    if code |> Array.exists (fun word -> bitCount word % 4 <> 0) then failwith "code is not doubly even"
    let epsilon = signedCodeGroup generators
    let representativeOf = Array.create 256 -1
    let representatives = ResizeArray<int>()
    for scan in 0 .. 255 do
        let mask = scan ^^^ seed
        if representativeOf.[mask] = -1 then
            let index = representatives.Count
            representatives.Add(mask)
            for word in code do representativeOf.[mask ^^^ word] <- index
    if representatives.Count <> 16 then failwith "coded source dimension is not 16"
    let edges =
        Array.init 8 (fun colour ->
            let bit = 1 <<< colour
            let targets = Array.zeroCreate representatives.Count
            let signs = Array.zeroCreate representatives.Count
            for vertex in 0 .. representatives.Count - 1 do
                let representative = representatives.[vertex]
                let shifted = representative ^^^ bit
                let first = cliffordSign bit representative -1
                let targetVertex = representativeOf.[shifted]
                let targetRepresentative = representatives.[targetVertex]
                let difference = shifted ^^^ targetRepresentative
                let second = epsilon.[difference]
                let third = cliffordSign targetRepresentative difference -1
                targets.[vertex] <- targetVertex
                signs.[vertex] <- first * second * third
            { To = targets; Sign = signs })
    [| for colour in 1 .. 7 -> compose edges.[colour] edges.[0] |]

let parityBelow mask mode =
    if bitCount (mask &&& ((1 <<< mode) - 1)) % 2 = 0 then 1 else -1

let gamma omitParity generator mask =
    let mode = generator / 2
    let occupied = (mask &&& (1 <<< mode)) <> 0
    let stringSign = if omitParity then 1 else parityBelow mask mode
    let target = mask ^^^ (1 <<< mode)
    if generator % 2 = 0 then target, stringSign, 0
    else target, 0, stringSign * (if occupied then -1 else 1)

let gammaProduct omitParity first second mask =
    let middle, rightRe, rightIm = gamma omitParity second mask
    let target, leftRe, leftIm = gamma omitParity first middle
    target, leftRe * rightRe - leftIm * rightIm, leftRe * rightIm + leftIm * rightRe

let fockTarget faultName =
    let masks = [| for mask in 0 .. 255 do if bitCount mask % 2 = 0 then yield mask |]
    if masks.Length <> 128 then failwith "even Fock carrier dimension is not 128"
    let indexByMask = Array.create 256 -1
    masks |> Array.iteri (fun index mask -> indexByMask.[mask] <- index)
    [| for colour in 1 .. 7 do
        let targets = Array.zeroCreate masks.Length
        let signs = Array.zeroCreate masks.Length
        for source in 0 .. masks.Length - 1 do
            let targetMask, real, imaginary = gammaProduct (faultName = Some "parity") (2 * colour) 0 masks.[source]
            if imaginary <> 0 || (real <> 1 && real <> -1) then failwith "target is not real signed permutation"
            targets.[source] <- indexByMask.[targetMask]
            signs.[source] <- real
        yield { To = targets; Sign = signs } |]
    |> fun generators ->
        if faultName = Some "coordinate" then generators.[0].Sign.[0] <- -generators.[0].Sign.[0]
        if faultName = Some "duplicate" then generators.[6] <- { To = Array.copy generators.[5].To; Sign = Array.copy generators.[5].Sign }
        generators

let cliffordViolations (generators: SignedPerm array) =
    let mutable violations = 0
    for first in 0 .. generators.Length - 1 do
        for second in first .. generators.Length - 1 do
            let forward = compose generators.[first] generators.[second]
            let backward = compose generators.[second] generators.[first]
            for basis in 0 .. generators.[first].To.Length - 1 do
                if first = second then
                    if forward.To.[basis] <> basis || forward.Sign.[basis] <> -1 then violations <- violations + 1
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
    if oldR <> 1L then failwith "noninvertible modular pivot"
    (oldS % p + p) % p

let matrixRank rowCount columnCount (entries: Entry array) prime =
    let p = int64 prime
    let rows = Array.init rowCount (fun _ -> Array.zeroCreate<int64> columnCount)
    for entry in entries do rows.[entry.Row].[entry.Column] <- (rows.[entry.Row].[entry.Column] + entry.Value) % p
    let mutable rank = 0
    let mutable column = 0
    while column < columnCount && rank < rowCount do
        let mutable pivot = rank
        while pivot < rowCount && rows.[pivot].[column] = 0L do pivot <- pivot + 1
        if pivot < rowCount then
            let temporary = rows.[rank]
            rows.[rank] <- rows.[pivot]
            rows.[pivot] <- temporary
            let inverse = modularInverse rows.[rank].[column] prime
            for cursor in column .. columnCount - 1 do rows.[rank].[cursor] <- rows.[rank].[cursor] * inverse % p
            for row in 0 .. rowCount - 1 do
                if row <> rank then
                    let factor = rows.[row].[column]
                    if factor <> 0L then
                        for cursor in column .. columnCount - 1 do
                            rows.[row].[cursor] <- (rows.[row].[cursor] - factor * rows.[rank].[cursor]) % p
                            if rows.[row].[cursor] < 0L then rows.[row].[cursor] <- rows.[row].[cursor] + p
            rank <- rank + 1
        column <- column + 1
    rank

let solve (source: SignedPerm array) (target: SignedPerm array) =
    if source.Length = 0 || source.Length <> target.Length then failwith "invalid generator counts"
    let sourceDimension = source.[0].To.Length
    let targetDimension = target.[0].To.Length
    let variableCount = sourceDimension * targetDimension
    let adjacency = Array.init variableCount (fun _ -> ResizeArray<Edge>())
    for generator in 0 .. source.Length - 1 do
        for row in 0 .. targetDimension - 1 do
            for column in 0 .. sourceDimension - 1 do
                let fromVariable = row * sourceDimension + column
                let toVariable = target.[generator].To.[row] * sourceDimension + source.[generator].To.[column]
                let factor = target.[generator].Sign.[row] * source.[generator].Sign.[column]
                adjacency.[fromVariable].Add({ Neighbour = toVariable; Factor = factor })
                adjacency.[toVariable].Add({ Neighbour = fromVariable; Factor = factor })
    let assignment = Array.zeroCreate<int> variableCount
    let basis = ResizeArray<Entry array>()
    for root in 0 .. variableCount - 1 do
        if assignment.[root] = 0 then
            assignment.[root] <- 1
            let queue = ResizeArray<int>()
            let variables = ResizeArray<int>()
            let mutable consistent = true
            queue.Add(root)
            let mutable cursor = 0
            while cursor < queue.Count do
                let current = queue.[cursor]
                cursor <- cursor + 1
                variables.Add(current)
                for edge in adjacency.[current] do
                    let expected = assignment.[current] * edge.Factor
                    if assignment.[edge.Neighbour] = 0 then
                        assignment.[edge.Neighbour] <- expected
                        queue.Add(edge.Neighbour)
                    elif assignment.[edge.Neighbour] <> expected then consistent <- false
            if consistent then
                basis.Add(variables |> Seq.map (fun variable ->
                    { Row = variable / sourceDimension
                      Column = variable % sourceDimension
                      Value = int64 assignment.[variable] }) |> Seq.toArray)
    basis.ToArray()

let orderedWord (generators: SignedPerm array) =
    generators |> Array.fold compose (identityPerm generators.[0].To.Length 1)

let difference left right =
    [| for index in 0 .. left.To.Length - 1 do
        if left.To.[index] <> right.To.[index] || left.Sign.[index] <> right.Sign.[index] then yield index |]
    |> Array.length

let sectorBasis (omega: SignedPerm) eigenvalue =
    let visited = Array.create omega.To.Length false
    let basis = ResizeArray<int array>()
    for root in 0 .. omega.To.Length - 1 do
        if not visited.[root] then
            let target = omega.To.[root]
            if target = root then
                visited.[root] <- true
                if omega.Sign.[root] = eigenvalue then
                    let vector = Array.zeroCreate omega.To.Length
                    vector.[root] <- 1
                    basis.Add(vector)
            else
                if omega.To.[target] <> root || omega.Sign.[target] <> omega.Sign.[root] then failwith "central word is not involutive"
                visited.[root] <- true
                visited.[target] <- true
                let first = min root target
                let second = max root target
                let vector = Array.zeroCreate omega.To.Length
                vector.[first] <- 1
                vector.[second] <- eigenvalue * omega.Sign.[first]
                basis.Add(vector)
    basis.ToArray()

let vectorKey (vector: int array) = String.Join(",", vector)

let restrict (generators: SignedPerm array) (basis: int array array) =
    let positions = basis |> Array.mapi (fun index vector -> vectorKey vector, index) |> dict
    generators
    |> Array.map (fun generator ->
        let targets = Array.zeroCreate basis.Length
        let signs = Array.zeroCreate basis.Length
        for source in 0 .. basis.Length - 1 do
            let image = Array.zeroCreate generator.To.Length
            for coordinate in 0 .. basis.[source].Length - 1 do
                if basis.[source].[coordinate] <> 0 then
                    image.[generator.To.[coordinate]] <- basis.[source].[coordinate] * generator.Sign.[coordinate]
            let scalar = image |> Array.find ((<>) 0)
            let normalized = image |> Array.map ((*) scalar)
            targets.[source] <- positions.[vectorKey normalized]
            signs.[source] <- scalar
        { To = targets; Sign = signs })

let generatedRank (generators: SignedPerm array) =
    let dimension = generators.[0].To.Length
    let mutable words = [| identityPerm dimension 1 |]
    for generator in generators do
        let appended = words |> Array.map (fun prior -> compose prior generator)
        words <- Array.append words appended
    [| for wordIndex in 0 .. words.Length - 1 do
        for column in 0 .. dimension - 1 do
            yield { Row = wordIndex
                    Column = words.[wordIndex].To.[column] * dimension + column
                    Value = int64 words.[wordIndex].Sign.[column] } |]
    |> fun entries -> matrixRank words.Length (dimension * dimension) entries field

let verify source target (entries: Entry array) =
    let sourceDimension = source.To.Length
    let targetDimension = target.To.Length
    let values = Array.zeroCreate<int64> (sourceDimension * targetDimension)
    for entry in entries do
        let index = entry.Row * sourceDimension + entry.Column
        values.[index] <- (values.[index] + entry.Value) % int64 field
    let mutable valid = true
    for row in 0 .. targetDimension - 1 do
        for column in 0 .. sourceDimension - 1 do
            let left = int64 source.Sign.[column] * values.[target.To.[row] * sourceDimension + source.To.[column]]
            let right = int64 target.Sign.[row] * values.[row * sourceDimension + column]
            if (left - right) % int64 field <> 0L then valid <- false
    valid

let basisSector (entries: Entry array) sourceOmega targetDimension =
    let plus = verify sourceOmega (identityPerm targetDimension 1) entries
    let minus = verify sourceOmega (identityPerm targetDimension -1) entries
    if plus = minus then failwith "basis does not occupy one central sector"
    if plus then 1 else -1

let combine (basis: Entry array array) (coefficients: int array) =
    [| for index in 0 .. basis.Length - 1 do
        if coefficients.[index] <> 0 then
            for entry in basis.[index] do
                yield { entry with Value = entry.Value * int64 coefficients.[index] } |]

let dense rows columns (entries: Entry array) =
    let values = Array.zeroCreate<int64> (rows * columns)
    for entry in entries do
        let index = entry.Row * columns + entry.Column
        values.[index] <- (values.[index] + entry.Value) % int64 field
        if values.[index] < 0L then values.[index] <- values.[index] + int64 field
    values

let multiplyDense (left: int64 array) leftRows middle (right: int64 array) rightColumns =
    let result = Array.zeroCreate<int64> (leftRows * rightColumns)
    for row in 0 .. leftRows - 1 do
        for pivot in 0 .. middle - 1 do
            let leftValue = left.[row * middle + pivot]
            if leftValue <> 0L then
                for column in 0 .. rightColumns - 1 do
                    let index = row * rightColumns + column
                    result.[index] <- (result.[index] + leftValue * right.[pivot * rightColumns + column]) % int64 field
    result

let entriesFromDense rows columns (values: int64 array) =
    [| for row in 0 .. rows - 1 do
        for column in 0 .. columns - 1 do
            let value = values.[row * columns + column]
            if value <> 0L then yield { Row = row; Column = column; Value = value } |]

let sameImage (left: Entry array) (right: Entry array) =
    let leftRank = matrixRank 128 16 left field
    let joined =
        Array.append left (right |> Array.map (fun entry -> { entry with Column = entry.Column + 16 }))
    matrixRank 128 32 joined field = leftRank

let movingAutomorphism (selected: Entry array) (commutant: Entry array array) =
    let selectedDense = dense 128 16 selected
    commutant
    |> Array.exists (fun basis ->
        [| 1 .. 17 |]
        |> Array.exists (fun coefficient ->
            let candidate =
                Array.append
                    [| for index in 0 .. 127 -> { Row = index; Column = index; Value = 1L } |]
                    (basis |> Array.map (fun entry -> { entry with Value = int64 coefficient * entry.Value }))
            if matrixRank 128 128 candidate field <> 128 then false
            else
                let moved = multiplyDense (dense 128 128 candidate) 128 128 selectedDense 16 |> entriesFromDense 128 16
                not (sameImage selected moved)))

let gramScore (entries: Entry array) =
    let matrix = Dictionary<struct (int * int), int64>()
    for entry in entries do matrix.[struct (entry.Row, entry.Column)] <- entry.Value
    let value row column =
        match matrix.TryGetValue(struct (row, column)) with
        | true, found -> found
        | _ -> 0L
    let diagonal = ResizeArray<int64>()
    let mutable off = 0L
    for left in 0 .. 15 do
        for right in 0 .. 15 do
            let mutable inner = 0L
            for row in 0 .. 127 do inner <- inner + value row left * value row right
            if left = right then diagonal.Add(inner) else off <- off + inner * inner
    off, (Seq.max diagonal - Seq.min diagonal)

let projectiveSquare (prime: int) =
    let mutable power = BigInteger.One
    let mutable sum = BigInteger.Zero
    for _ in 0 .. 7 do
        sum <- sum + power
        power <- power * BigInteger(prime)
    string (sum * sum)

let rankSpectrum targetDimension sourceDimension (basis: Entry array array) =
    basis
    |> Array.countBy (fun entries -> matrixRank targetDimension sourceDimension entries field)
    |> Array.sortBy fst
    |> Array.map (fun (rank, count) -> [| rank; count |])

match fault with
| Some faultName ->
    if faultName <> "coordinate" && faultName <> "duplicate" && faultName <> "parity" then failwith "unknown fault"
    let violations = fockTarget fault |> cliffordViolations
    let faultReport =
        {| field = field
           fault = faultName
           targetCliffordViolations = violations
           quarantinedBeforeDecomposition = violations > 0 |}
    printfn "%s" (JsonSerializer.Serialize(faultReport))
    Environment.Exit(0)
| None -> ()

let source = codedSource repSeed
let target = fockTarget None
let sourceOmega = orderedWord source
let targetOmega = orderedWord target
if difference (compose sourceOmega sourceOmega) (identityPerm 16 1) <> 0 then failwith "source omega is not involutive"
if difference (compose targetOmega targetOmega) (identityPerm 128 1) <> 0 then failwith "target omega is not involutive"
for generator in source do
    if difference (compose sourceOmega generator) (compose generator sourceOmega) <> 0 then failwith "source omega is not central"
for generator in target do
    if difference (compose targetOmega generator) (compose generator targetOmega) <> 0 then failwith "target omega is not central"

let sourcePlusBasis = sectorBasis sourceOmega 1
let sourceMinusBasis = sectorBasis sourceOmega -1
let targetPlusBasis = sectorBasis targetOmega 1
let targetMinusBasis = sectorBasis targetOmega -1
let sourcePlus = restrict source sourcePlusBasis
let sourceMinus = restrict source sourceMinusBasis
let targetPlus = restrict target targetPlusBasis
let targetMinus = restrict target targetMinusBasis

let homBlocks =
    [| solve sourcePlus targetPlus |> Array.length
       solve sourcePlus targetMinus |> Array.length
       solve sourceMinus targetPlus |> Array.length
       solve sourceMinus targetMinus |> Array.length |]
let sourceCommutantBlocks =
    [| solve sourcePlus sourcePlus |> Array.length
       solve sourcePlus sourceMinus |> Array.length
       solve sourceMinus sourcePlus |> Array.length
       solve sourceMinus sourceMinus |> Array.length |]
let targetCommutantBlocks =
    [| solve targetPlus targetPlus |> Array.length
       solve targetPlus targetMinus |> Array.length
       solve targetMinus targetPlus |> Array.length
       solve targetMinus targetMinus |> Array.length |]

let fullHom = solve source target
let targetCommutant = solve target target
let plusIndices, minusIndices =
    fullHom
    |> Array.mapi (fun index entries -> index, basisSector entries sourceOmega 128)
    |> Array.partition (fun (_, sector) -> sector = 1)
    |> fun (plus, minus) -> plus |> Array.map fst, minus |> Array.map fst

let unit = combine fullHom (Array.create fullHom.Length 1)
let negatedCoefficients = Array.create fullHom.Length 1
negatedCoefficients.[0] <- -1
let negated = combine fullHom negatedCoefficients
let pairMaps =
    [| for plus in plusIndices do
        for minus in minusIndices do
            let coefficients = Array.zeroCreate fullHom.Length
            coefficients.[plus] <- 1
            coefficients.[minus] <- 1
            yield combine fullHom coefficients |]
let pairScores = pairMaps |> Array.map gramScore
let bestScore = pairScores |> Array.min
let balancedMinimizers = pairScores |> Array.filter ((=) bestScore) |> Array.length
let allMinimumSupportRanks = pairMaps |> Array.map (fun entries -> matrixRank 128 16 entries field) |> Array.distinct |> Array.sort

let report =
    { Field = field
      RepSeed = repSeed
      SourceSectorRanks = [| sourcePlusBasis.Length; sourceMinusBasis.Length |]
      TargetSectorRanks = [| targetPlusBasis.Length; targetMinusBasis.Length |]
      HomBlocks = homBlocks
      SourceCommutantBlocks = sourceCommutantBlocks
      TargetCommutantBlocks = targetCommutantBlocks
      SourceGeneratedAlgebraRanks = [| generatedRank sourcePlus; generatedRank sourceMinus |]
      TargetGeneratedAlgebraRanks = [| generatedRank targetPlus; generatedRank targetMinus |]
      FullHomRankSpectrum = rankSpectrum 128 16 fullHom
      ProjectiveEmbeddingClassCount = projectiveSquare field
      CoefficientBoundaryRanks = [| 0; 8; 8; matrixRank 128 16 unit field |]
      MinimumSupportCandidateCount = pairMaps.Length
      AllMinimumSupportRanks = allMinimumSupportRanks
      BalancedMinimizerCount = balancedMinimizers
      BalancedScore = [| fst bestScore; snd bestScore |]
      BasisOrientationInvariantImage = sameImage unit negated
      UnitMovedByAutomorphism = movingAutomorphism unit targetCommutant
      MinimumSupportMovedByAutomorphism = movingAutomorphism pairMaps.[0] targetCommutant }

let jsonOptions = JsonSerializerOptions(PropertyNamingPolicy = JsonNamingPolicy.CamelCase)
printfn "%s" (JsonSerializer.Serialize(report, jsonOptions))
