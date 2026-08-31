// Finite half-spin bracket oracle.
//
// This is independently authored F# / exact-dyadic arithmetic.  It does not
// import the TypeScript census.  Its only contract is the written finite model:
// 8 exterior modes, the declared Jordan-Wigner gamma convention, a reversion-
// signed complex-bilinear top-wedge pairing, and a 1/2 bivector action.

open System
open System.Collections.Generic

type Q = { N: int64; Shift: int }
type C = { Re: Q; Im: Q }
type Pair = { First: int; Second: int }
type BTerm = { Pair: Pair; Coeff: C }
type STerm = { Mask: int; Coeff: C }

let q n shift =
    let rec reduce n shift =
        if shift > 0 && n % 2L = 0L then reduce (n / 2L) (shift - 1)
        else { N = n; Shift = shift }
    reduce n shift

let qZero = q 0L 0
let qOne = q 1L 0
let qHalf = q 1L 1

let qAdd a b =
    let shift = max a.Shift b.Shift
    let left = a.N <<< (shift - a.Shift)
    let right = b.N <<< (shift - b.Shift)
    q (left + right) shift

let qNeg a = q (-a.N) a.Shift
let qMul a b = q (a.N * b.N) (a.Shift + b.Shift)
let qIsZero a = a.N = 0L
let qEqual a b = a.N = b.N && a.Shift = b.Shift

let c re im = { Re = re; Im = im }
let cZero = c qZero qZero
let cOne = c qOne qZero
let cI = c qZero qOne
let cNeg a = c (qNeg a.Re) (qNeg a.Im)
let cAdd a b = c (qAdd a.Re b.Re) (qAdd a.Im b.Im)
let cSub a b = cAdd a (cNeg b)
let cMul a b = c (qAdd (qMul a.Re b.Re) (qNeg (qMul a.Im b.Im))) (qAdd (qMul a.Re b.Im) (qMul a.Im b.Re))
let cScaleQ a r = c (qMul a.Re r) (qMul a.Im r)
let cScaleInt a n = cScaleQ a (q (int64 n) 0)
let cConj a = c a.Re (qNeg a.Im)
let cIsZero a = qIsZero a.Re && qIsZero a.Im
let cEqual a b = qEqual a.Re b.Re && qEqual a.Im b.Im

let modeCount = 8
let generatorCount = 16
let fullMask = 255

let bitCount mask =
    let mutable count = 0
    let mutable cursor = mask
    while cursor <> 0 do
        count <- count + (cursor &&& 1)
        cursor <- cursor >>> 1
    count

let masks = [| for mask in 0 .. fullMask do if bitCount mask % 2 = 0 then yield mask |]
let maskIndex =
    let result = Array.create 256 -1
    masks |> Array.iteri (fun index mask -> result.[mask] <- index)
    result

let pairs =
    [| for first in 0 .. generatorCount - 1 do
           for second in first + 1 .. generatorCount - 1 do
               yield { First = first; Second = second } |]

let pairKey pair = pair.First * generatorCount + pair.Second

type Options =
    { OmitParity: bool
      OmitOrder: bool
      OmitHalf: bool
      ConjugateRight: bool
      FlipCoordinate: Pair option
      Reversion: bool }

let optionsFromArgs args =
    let has flag = args |> Array.exists ((=) flag)
    let flip =
        if has "--flip-0-1" then Some { First = 0; Second = 1 }
        else None
    { OmitParity = has "--omit-parity"
      OmitOrder = has "--omit-order"
      OmitHalf = has "--omit-half"
      ConjugateRight = has "--conjugate-right"
      FlipCoordinate = flip
      Reversion = not (has "--naive-pairing") }

let gammaAction options index mask =
    let mode = index / 2
    let occupied = (mask &&& (1 <<< mode)) <> 0
    let below = bitCount (mask &&& ((1 <<< mode) - 1))
    let jw = if options.OmitParity || below % 2 = 0 then 1 else -1
    let baseCoefficient =
        if index % 2 = 0 then cOne
        elif occupied then cNeg cI
        else cI
    { Mask = mask ^^^ (1 <<< mode); Coeff = cScaleInt baseCoefficient jw }

let gammaProduct options first second mask =
    let right = gammaAction options second mask
    let left = gammaAction options first right.Mask
    { Mask = left.Mask; Coeff = cMul left.Coeff right.Coeff }

let wedgeSign firstMask secondMask =
    if (firstMask &&& secondMask) <> 0 || (firstMask ||| secondMask) <> fullMask then 0
    else
        let mutable inversions = 0
        for mode in 0 .. modeCount - 1 do
            if (firstMask &&& (1 <<< mode)) <> 0 then
                inversions <- inversions + bitCount (secondMask &&& ((1 <<< mode) - 1))
        if inversions % 2 = 0 then 1 else -1

let reversionSign mask =
    let degree = bitCount mask
    if (degree * (degree - 1) / 2) % 2 = 0 then 1 else -1

let pairing options leftMask rightMask coefficient =
    let sign = wedgeSign leftMask rightMask
    if sign = 0 then cZero
    else
        let ordered = if options.OmitOrder then 1 else sign
        let reversed = if options.Reversion then reversionSign leftMask else 1
        let value = if options.ConjugateRight then cConj coefficient else coefficient
        cScaleInt value (ordered * reversed)

let canonical first second coefficient =
    if first = second || cIsZero coefficient then None
    elif first < second then Some { Pair = { First = first; Second = second }; Coeff = coefficient }
    else Some { Pair = { First = second; Second = first }; Coeff = cNeg coefficient }

let addSpinor (target: Dictionary<int, C>) mask coefficient =
    let mutable previous = cZero
    let hasPrevious = target.TryGetValue(mask, &previous)
    let next = if hasPrevious then cAdd previous coefficient else coefficient
    if cIsZero next then target.Remove(mask) |> ignore
    else target.[mask] <- next

let addBivector (target: Dictionary<int, BTerm>) first second coefficient =
    match canonical first second coefficient with
    | None -> ()
    | Some term ->
        let key = pairKey term.Pair
        let mutable previous = Unchecked.defaultof<BTerm>
        let hasPrevious = target.TryGetValue(key, &previous)
        let next = if hasPrevious then cAdd previous.Coeff term.Coeff else term.Coeff
        if cIsZero next then target.Remove(key) |> ignore
        else target.[key] <- { term with Coeff = next }

let spinorsEqual (left: Dictionary<int, C>) (right: Dictionary<int, C>) =
    left.Count = right.Count
    && left |> Seq.forall (fun pair ->
        let mutable expected = cZero
        right.TryGetValue(pair.Key, &expected) && cEqual pair.Value expected)

let bivectorsEqual (left: Dictionary<int, BTerm>) (right: Dictionary<int, BTerm>) =
    left.Count = right.Count
    && left |> Seq.forall (fun pair ->
        let mutable expected = Unchecked.defaultof<BTerm>
        right.TryGetValue(pair.Key, &expected) && cEqual pair.Value.Coeff expected.Coeff)

let bracketBasis options leftMask rightMask =
    let terms = ResizeArray<BTerm>()
    for pair in pairs do
        let image = gammaProduct options pair.First pair.Second rightMask
        let raw = pairing options leftMask image.Mask image.Coeff
        let coefficient =
            match options.FlipCoordinate with
            | Some flipped when flipped = pair -> cNeg raw
            | _ -> raw
        if not (cIsZero coefficient) then terms.Add { Pair = pair; Coeff = coefficient }
    terms.ToArray()

let bracketTable options =
    Array2D.init masks.Length masks.Length (fun left right -> bracketBasis options masks.[left] masks.[right])

let actionBasis options pair mask =
    let image = gammaProduct options pair.First pair.Second mask
    let scale = if options.OmitHalf then qOne else qHalf
    { Mask = image.Mask; Coeff = cScaleQ image.Coeff scale }

let actionBivector options sourceMask (terms: BTerm array) =
    let result = Dictionary<int, C>()
    for term in terms do
        let image = actionBasis options term.Pair sourceMask
        addSpinor result image.Mask (cMul term.Coeff image.Coeff)
    result

let actionSpinor options pair (terms: STerm array) =
    let result = Dictionary<int, C>()
    for term in terms do
        let image = actionBasis options pair term.Mask
        addSpinor result image.Mask (cMul term.Coeff image.Coeff)
    result

let spinorTerms (source: Dictionary<int, C>) =
    source |> Seq.map (fun pair -> { Mask = pair.Key; Coeff = pair.Value }) |> Seq.toArray

let bracketLinear (table: BTerm array [,]) (left: STerm array) (right: STerm array) =
    let result = Dictionary<int, BTerm>()
    for leftTerm in left do
        for rightTerm in right do
            let leftIndex = maskIndex.[leftTerm.Mask]
            let rightIndex = maskIndex.[rightTerm.Mask]
            if leftIndex < 0 || rightIndex < 0 then failwith "half-spin action escaped the declared even carrier"
            let scalar = cMul leftTerm.Coeff rightTerm.Coeff
            for basisTerm in table.[leftIndex, rightIndex] do
                addBivector result basisTerm.Pair.First basisTerm.Pair.Second (cMul scalar basisTerm.Coeff)
    result

let soBracket left right =
    let terms = ResizeArray<BTerm>()
    let append first second factor =
        match canonical first second (cScaleInt cOne factor) with
        | Some term -> terms.Add term
        | None -> ()
    if left.Second = right.First then append left.First right.Second 1
    if left.First = right.First then append left.Second right.Second -1
    if left.Second = right.Second then append left.First right.First -1
    if left.First = right.Second then append left.Second right.First 1
    terms.ToArray()

let actionOnBivectors pair (terms: BTerm array) =
    let result = Dictionary<int, BTerm>()
    for term in terms do
        for next in soBracket pair term.Pair do
            addBivector result next.Pair.First next.Pair.Second (cMul term.Coeff next.Coeff)
    result

let actionNormalization options =
    let mutable violations = 0
    for left in pairs do
        for right in pairs do
            for mask in masks do
                let first = actionBasis options left (actionBasis options right mask).Mask
                let firstCoefficient = cMul (actionBasis options right mask).Coeff first.Coeff
                let second = actionBasis options right (actionBasis options left mask).Mask
                let secondCoefficient = cNeg (cMul (actionBasis options left mask).Coeff second.Coeff)
                let observed = Dictionary<int, C>()
                addSpinor observed first.Mask firstCoefficient
                addSpinor observed second.Mask secondCoefficient
                let expected = actionBivector options mask (soBracket left right)
                if not (spinorsEqual observed expected) then violations <- violations + 1
    violations

let antisymmetry (table: BTerm array [,]) =
    let mutable violations = 0
    for left in 0 .. masks.Length - 1 do
        for right in 0 .. masks.Length - 1 do
            let forward = Dictionary<int, BTerm>()
            let backward = Dictionary<int, BTerm>()
            for term in table.[left, right] do addBivector forward term.Pair.First term.Pair.Second term.Coeff
            for term in table.[right, left] do addBivector backward term.Pair.First term.Pair.Second (cNeg term.Coeff)
            if not (bivectorsEqual forward backward) then violations <- violations + 1
    violations

let equivariance (options: Options) (table: BTerm array [,]) =
    let mutable violations = 0
    for actor in pairs do
        for leftIndex in 0 .. masks.Length - 1 do
            for rightIndex in 0 .. masks.Length - 1 do
                let leftMask = masks.[leftIndex]
                let rightMask = masks.[rightIndex]
                let observed = actionOnBivectors actor table.[leftIndex, rightIndex]
                let actedLeft = actionSpinor options actor [| { Mask = leftMask; Coeff = cOne } |] |> spinorTerms
                let actedRight = actionSpinor options actor [| { Mask = rightMask; Coeff = cOne } |] |> spinorTerms
                let expected = bracketLinear table actedLeft [| { Mask = rightMask; Coeff = cOne } |]
                let second = bracketLinear table [| { Mask = leftMask; Coeff = cOne } |] actedRight
                for term in second.Values do addBivector expected term.Pair.First term.Pair.Second term.Coeff
                if not (bivectorsEqual observed expected) then violations <- violations + 1
    violations

let mixedJacobi (options: Options) (table: BTerm array [,]) =
    let mutable violations = 0
    let mutable witness: (int * int * int) option = None
    for leftIndex in 0 .. masks.Length - 1 do
        for middleIndex in 0 .. masks.Length - 1 do
            for rightIndex in 0 .. masks.Length - 1 do
                let result = Dictionary<int, C>()
                let addAction terms mask =
                    let next = actionBivector options mask terms
                    for entry in next do addSpinor result entry.Key entry.Value
                addAction table.[leftIndex, middleIndex] masks.[rightIndex]
                addAction table.[middleIndex, rightIndex] masks.[leftIndex]
                addAction table.[rightIndex, leftIndex] masks.[middleIndex]
                if result.Count <> 0 then
                    violations <- violations + 1
                    if Option.isNone witness then witness <- Some (masks.[leftIndex], masks.[middleIndex], masks.[rightIndex])
    violations, witness

let hasAntisymmetryFailure (table: BTerm array [,]) =
    masks |> Array.exists (fun left ->
        masks |> Array.exists (fun right ->
            let forward = Dictionary<int, BTerm>()
            let backward = Dictionary<int, BTerm>()
            for term in table.[maskIndex.[left], maskIndex.[right]] do addBivector forward term.Pair.First term.Pair.Second term.Coeff
            for term in table.[maskIndex.[right], maskIndex.[left]] do addBivector backward term.Pair.First term.Pair.Second (cNeg term.Coeff)
            not (bivectorsEqual forward backward)))

let hasActionNormalizationFailure (options: Options) =
    pairs |> Array.exists (fun left ->
        pairs |> Array.exists (fun right ->
            masks |> Array.exists (fun mask ->
                let firstRight = actionBasis options right mask
                let first = actionBasis options left firstRight.Mask
                let secondLeft = actionBasis options left mask
                let second = actionBasis options right secondLeft.Mask
                let observed = Dictionary<int, C>()
                addSpinor observed first.Mask (cMul firstRight.Coeff first.Coeff)
                addSpinor observed second.Mask (cNeg (cMul secondLeft.Coeff second.Coeff))
                let expected = actionBivector options mask (soBracket left right)
                not (spinorsEqual observed expected))))

let hasEquivarianceFailure (options: Options) (table: BTerm array [,]) =
    pairs |> Array.exists (fun actor ->
        masks |> Array.exists (fun leftMask ->
            masks |> Array.exists (fun rightMask ->
                let leftIndex = maskIndex.[leftMask]
                let rightIndex = maskIndex.[rightMask]
                let observed = actionOnBivectors actor table.[leftIndex, rightIndex]
                let actedLeft = actionSpinor options actor [| { Mask = leftMask; Coeff = cOne } |] |> spinorTerms
                let actedRight = actionSpinor options actor [| { Mask = rightMask; Coeff = cOne } |] |> spinorTerms
                let expected = bracketLinear table actedLeft [| { Mask = rightMask; Coeff = cOne } |]
                let second = bracketLinear table [| { Mask = leftMask; Coeff = cOne } |] actedRight
                for term in second.Values do addBivector expected term.Pair.First term.Pair.Second term.Coeff
                not (bivectorsEqual observed expected))))

let hasMixedJacobiFailure (options: Options) (table: BTerm array [,]) =
    masks |> Array.exists (fun leftMask ->
        masks |> Array.exists (fun middleMask ->
            masks |> Array.exists (fun rightMask ->
                let result = Dictionary<int, C>()
                let addAction terms mask =
                    let next = actionBivector options mask terms
                    for entry in next do addSpinor result entry.Key entry.Value
                addAction table.[maskIndex.[leftMask], maskIndex.[middleMask]] rightMask
                addAction table.[maskIndex.[middleMask], maskIndex.[rightMask]] leftMask
                addAction table.[maskIndex.[rightMask], maskIndex.[leftMask]] middleMask
                result.Count <> 0)))

let emitQuickCensus options table =
    let anti = if hasAntisymmetryFailure table then 1 else 0
    let norm = if hasActionNormalizationFailure options then 1 else 0
    let equiv = if hasEquivarianceFailure options table then 1 else 0
    let jacobi = if hasMixedJacobiFailure options table then 1 else 0
    printfn "{\"carrierDimension\":%d,\"bivectorGeneratorCount\":%d,\"bracketAntisymmetryViolations\":%d,\"actionNormalizationViolations\":%d,\"bracketEquivarianceViolations\":%d,\"mixedJacobiViolations\":%d,\"firstMixedJacobiWitness\":null}" masks.Length pairs.Length anti norm equiv jacobi

let arguments = fsi.CommandLineArgs |> Array.skip 1
let options = optionsFromArgs arguments
let table = bracketTable options

if arguments |> Array.exists ((=) "--quick") then
    emitQuickCensus options table
else
    let jacobiViolations, witness = mixedJacobi options table
    let witnessJson =
        match witness with
        | None -> "null"
        | Some (left, middle, right) -> sprintf "[%d,%d,%d]" left middle right

    printfn "{\"carrierDimension\":%d,\"bivectorGeneratorCount\":%d,\"bracketAntisymmetryViolations\":%d,\"actionNormalizationViolations\":%d,\"bracketEquivarianceViolations\":%d,\"mixedJacobiViolations\":%d,\"firstMixedJacobiWitness\":%s}" masks.Length pairs.Length (antisymmetry table) (actionNormalization options) (equivariance options table) jacobiViolations witnessJson
