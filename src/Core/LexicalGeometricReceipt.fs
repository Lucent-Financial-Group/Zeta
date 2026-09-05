namespace Zeta.Core

open System
open System.Buffers.Binary
open System.Globalization
open System.Security.Cryptography
open System.Text
open System.Text.RegularExpressions

/// Finite, user-declared lexical-to-geometry records. This module retains exact
/// lexical and calibration provenance; it neither discovers word meaning nor
/// substitutes a coordinate for a missing user-declared calibration.
[<RequireQualifiedAccess>]
module LexicalGeometricReceipt =

    [<Literal>]
    let Algorithm = "declared-lexical-geometry-calibration/v1"

    type TeachingError =
        { Code: string
          Field: string
          Observed: string
          SafeNextStep: string }

    type CalibrationEntry =
        { SeedId: string
          Rgb: string
          X: float
          Y: float
          Z: float
          UncertaintyPpm: int }

    type Calibration =
        { Algorithm: string
          CalibrationVersion: string
          SeedVersion: string
          Entries: CalibrationEntry array }

    type CorrectionConflict =
        { NormalizedSurface: string
          ContentIds: string array }

    type ResolvedGeometry =
        { OriginalSurface: string
          NormalizedSurface: string
          SeedId: string
          Rgb: string
          Coordinate: Cl3.Mv
          ConformalPoint: ConformalGA.CPoint
          UncertaintyPpm: int
          CalibrationEntryFingerprint: string }

    type Projection =
        | Resolved of ResolvedGeometry
        | UnresolvedToken of originalSurface: string * normalizedSurface: string
        | UnresolvedCalibration of originalSurface: string * normalizedSurface: string * seedId: string
        | Conflict of originalSurface: string * normalizedSurface: string * reason: string * contentIds: string array

    type Receipt =
        { Algorithm: string
          CalibrationVersion: string
          SeedVersion: string
          CalibrationFingerprint: string
          OriginalInput: string
          NormalizedInput: string
          Projections: Projection array
          Fingerprint: string }

    let private rgbPattern = Regex("^#[0-9A-F]{6}$", RegexOptions.CultureInvariant)
    let private tokenPattern = Regex("[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*", RegexOptions.CultureInvariant)

    let normalize (value: string) =
        if isNull value then ""
        else value.Normalize(NormalizationForm.FormKC).Trim().ToLowerInvariant()

    let private normalizeRgb (value: string) =
        if isNull value then "" else value.Normalize(NormalizationForm.FormKC).Trim().ToUpperInvariant()

    let private canonicalFloat (value: float) = value.ToString("R", CultureInfo.InvariantCulture)

    let private sha256Hex (bytes: byte array) =
        SHA256.HashData bytes
        |> Convert.ToHexString
        |> fun hex -> hex.ToLowerInvariant()

    let private writeField (stream: IO.MemoryStream) (value: string) =
        let bytes = Encoding.UTF8.GetBytes value
        let length = Array.zeroCreate<byte> 4
        BinaryPrimitives.WriteInt32LittleEndian(length, bytes.Length)
        stream.Write(length, 0, length.Length)
        stream.Write(bytes, 0, bytes.Length)

    let private fingerprint (fields: string list) =
        use stream = new IO.MemoryStream()
        fields |> List.iter (writeField stream)
        sha256Hex (stream.ToArray())

    let private entryFields (entry: CalibrationEntry) : string list =
        [ normalize entry.SeedId
          normalizeRgb entry.Rgb
          canonicalFloat entry.X
          canonicalFloat entry.Y
          canonicalFloat entry.Z
          string entry.UncertaintyPpm ]

    let calibrationEntryFingerprint entry = fingerprint (Algorithm :: entryFields entry)

    let private validCoordinate value = Double.IsFinite value && value >= -1.0 && value <= 1.0

    let private validateEntry knownSeedIds index (entry: CalibrationEntry) =
        let seedId = normalize entry.SeedId
        let rgb = normalizeRgb entry.Rgb
        if String.IsNullOrWhiteSpace seedId then
            Error
                { Code = "LEXGEO-MISSING-SEED-ID"
                  Field = $"entries[{index}].seedId"
                  Observed = entry.SeedId
                  SafeNextStep = "Provide a non-empty declared seed ID." }
        elif not (Set.contains seedId knownSeedIds) then
            Error
                { Code = "LEXGEO-UNKNOWN-SEED-ID"
                  Field = $"entries[{index}].seedId"
                  Observed = entry.SeedId
                  SafeNextStep = "Use a seed ID from the explicitly loaded lexical seed." }
        elif not (rgbPattern.IsMatch rgb) then
            Error
                { Code = "LEXGEO-INVALID-RGB"
                  Field = $"entries[{index}].rgb"
                  Observed = entry.Rgb
                  SafeNextStep = "Provide canonical uppercase #RRGGBB." }
        elif not (validCoordinate entry.X && validCoordinate entry.Y && validCoordinate entry.Z) then
            Error
                { Code = "LEXGEO-INVALID-COORDINATE"
                  Field = $"entries[{index}].coordinate"
                  Observed = $"{canonicalFloat entry.X},{canonicalFloat entry.Y},{canonicalFloat entry.Z}"
                  SafeNextStep = "Provide three finite coordinates in the closed interval [-1, 1]." }
        elif entry.UncertaintyPpm < 0 || entry.UncertaintyPpm > 1_000_000 then
            Error
                { Code = "LEXGEO-INVALID-UNCERTAINTY"
                  Field = $"entries[{index}].uncertaintyPpm"
                  Observed = string entry.UncertaintyPpm
                  SafeNextStep = "Provide an integer uncertainty from 0 through 1,000,000." }
        else
            Ok
                { entry with
                    SeedId = seedId
                    Rgb = rgb }

    let tryCreateCalibration knownSeedIds (calibration: Calibration) =
        let normalizedSeedIds = knownSeedIds |> Seq.map normalize |> Set.ofSeq
        if calibration.Algorithm <> Algorithm then
            Error
                { Code = "LEXGEO-UNSUPPORTED-ALGORITHM"
                  Field = "algorithm"
                  Observed = calibration.Algorithm
                  SafeNextStep = $"Use {Algorithm}." }
        elif String.IsNullOrWhiteSpace calibration.CalibrationVersion then
            Error
                { Code = "LEXGEO-MISSING-CALIBRATION-VERSION"
                  Field = "calibrationVersion"
                  Observed = calibration.CalibrationVersion
                  SafeNextStep = "Provide a non-empty user-declared calibration version." }
        elif String.IsNullOrWhiteSpace calibration.SeedVersion then
            Error
                { Code = "LEXGEO-MISSING-SEED-VERSION"
                  Field = "seedVersion"
                  Observed = calibration.SeedVersion
                  SafeNextStep = "Provide the explicit loaded lexical seed version." }
        else
            calibration.Entries
            |> Array.mapi (validateEntry normalizedSeedIds)
            |> Array.fold
                (fun state item ->
                    match state, item with
                    | Error error, _ -> Error error
                    | Ok _, Error error -> Error error
                    | Ok entries, Ok entry -> Ok(entry :: entries))
                (Ok [])
            |> Result.map (fun entries ->
                { calibration with
                    CalibrationVersion = normalize calibration.CalibrationVersion
                    SeedVersion = normalize calibration.SeedVersion
                    Entries = entries |> List.sortBy calibrationEntryFingerprint |> List.toArray })

    let tryCreateLexicon knownSeedIds declaredForms =
        let normalizedSeedIds = knownSeedIds |> Seq.map normalize |> Set.ofSeq
        declaredForms
        |> Seq.fold
            (fun state (surface, seedId) ->
                match state with
                | Error _ -> state
                | Ok lexicon ->
                    let normalizedSurface = normalize surface
                    let normalizedSeedId = normalize seedId
                    if String.IsNullOrWhiteSpace normalizedSurface then
                        Error
                            { Code = "LEXGEO-EMPTY-LEXICAL-FORM"
                              Field = "declaredForms.surface"
                              Observed = surface
                              SafeNextStep = "Provide a non-empty declared lexical form." }
                    elif not (Set.contains normalizedSeedId normalizedSeedIds) then
                        Error
                            { Code = "LEXGEO-LEXICON-UNKNOWN-SEED"
                              Field = "declaredForms.seedId"
                              Observed = seedId
                              SafeNextStep = "Bind every lexical form to a loaded seed ID." }
                    else
                        match Map.tryFind normalizedSurface lexicon with
                        | Some existing when existing <> normalizedSeedId ->
                            Error
                                { Code = "LEXGEO-AMBIGUOUS-LEXICAL-FORM"
                                  Field = "declaredForms.surface"
                                  Observed = surface
                                  SafeNextStep = "Keep each v0 lexical form bound to exactly one seed ID." }
                        | _ -> Ok(Map.add normalizedSurface normalizedSeedId lexicon))
            (Ok Map.empty)

    let private tokens (input: string) =
        let source = if isNull input then "" else input.Normalize(NormalizationForm.FormKC)
        tokenPattern.Matches source
        |> Seq.cast<Match>
        |> Seq.map (fun matched -> matched.Value, normalize matched.Value)
        |> Seq.toArray

    let private calibrationFingerprint (calibration: Calibration) =
        let entryFingerprints = calibration.Entries |> Array.map calibrationEntryFingerprint |> Array.sort
        fingerprint ([ Algorithm; calibration.CalibrationVersion; calibration.SeedVersion ] @ Array.toList entryFingerprints)

    let private projectionFields (projection: Projection) : string list =
        match projection with
        | Resolved value ->
            [ "resolved"
              value.OriginalSurface
              value.NormalizedSurface
              value.SeedId
              value.Rgb
              canonicalFloat value.Coordinate.E1
              canonicalFloat value.Coordinate.E2
              canonicalFloat value.Coordinate.E3
              string value.UncertaintyPpm
              value.CalibrationEntryFingerprint ]
        | UnresolvedToken(original, normalized) -> [ "unresolved-token"; original; normalized ]
        | UnresolvedCalibration(original, normalized, seedId) -> [ "unresolved-calibration"; original; normalized; seedId ]
        | Conflict(original, normalized, reason, contentIds) ->
            [ "conflict"; original; normalized; reason ] @ (contentIds |> Array.sort |> Array.toList)

    let project
        (calibration: Calibration)
        (correctionConflicts: seq<CorrectionConflict>)
        (lexicon: Map<string, string>)
        (input: string)
        =
        let entriesBySeed =
            calibration.Entries
            |> Array.groupBy (fun entry -> entry.SeedId)
            |> Map.ofArray

        let correctionConflictBySurface =
            correctionConflicts
            |> Seq.groupBy (fun (conflict: CorrectionConflict) -> normalize conflict.NormalizedSurface)
            |> Seq.map (fun (surface, conflicts) ->
                surface,
                (conflicts
                 |> Seq.collect (fun conflict -> conflict.ContentIds)
                 |> Seq.distinct
                 |> Seq.sort
                 |> Seq.toArray))
            |> Map.ofSeq

        let projections =
            tokens input
            |> Array.map (fun (original, normalized) ->
                match Map.tryFind normalized correctionConflictBySurface with
                | Some contentIds -> Conflict(original, normalized, "lexical-correction-conflict", contentIds)
                | None ->
                    match Map.tryFind normalized lexicon with
                    | None -> UnresolvedToken(original, normalized)
                    | Some seedId ->
                        match Map.tryFind seedId entriesBySeed with
                        | None -> UnresolvedCalibration(original, normalized, seedId)
                        | Some entries when entries.Length <> 1 ->
                            Conflict(
                                original,
                                normalized,
                                "duplicate-calibration-seed-id",
                                entries |> Array.map calibrationEntryFingerprint |> Array.sort)
                        | Some [| entry |] ->
                            let coordinate = Cl3.vector entry.X entry.Y entry.Z
                            Resolved
                                { OriginalSurface = original
                                  NormalizedSurface = normalized
                                  SeedId = seedId
                                  Rgb = entry.Rgb
                                  Coordinate = coordinate
                                  ConformalPoint = ConformalGA.embedMv coordinate
                                  UncertaintyPpm = entry.UncertaintyPpm
                                  CalibrationEntryFingerprint = calibrationEntryFingerprint entry }
                        | Some _ -> failwith "unreachable: group length was checked")

        let normalizedInput = normalize input
        let calibrationId = calibrationFingerprint calibration
        let receiptFingerprint =
            fingerprint
                ([ Algorithm; calibration.CalibrationVersion; calibration.SeedVersion; calibrationId; input; normalizedInput ]
                 @ (projections |> Array.collect (fun projection -> projectionFields projection |> List.toArray) |> Array.toList))

        { Algorithm = Algorithm
          CalibrationVersion = calibration.CalibrationVersion
          SeedVersion = calibration.SeedVersion
          CalibrationFingerprint = calibrationId
          OriginalInput = input
          NormalizedInput = normalizedInput
          Projections = projections
          Fingerprint = receiptFingerprint }
