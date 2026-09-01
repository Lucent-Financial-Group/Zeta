namespace Zeta.Core

open System
open System.IO
open Zeta.Core.FSharp.Blake3

/// CLI token grammar (E7). Never guess: a 64-hex filename is a path.
/// `blake3:<64-hex>` is ContentId; `entity:<Crockford-26>` is EntityId;
/// anything else is an ordinal path.
module ZetaFsCli =

    type Token =
        | Content of ContentHash256
        | Entity of ZetaFsNamespace.EntityId
        | Path of string

    type ParseError =
        | Empty
        | BadBlake3 of string
        | BadEntity of string

    let isHex64 (s: string) : bool =
        if isNull s || s.Length <> 64 then
            false
        else
            let mutable ok = true
            let mutable i = 0

            while ok && i < 64 do
                let c = s.[i]

                if (c >= '0' && c <= '9')
                   || (c >= 'a' && c <= 'f')
                   || (c >= 'A' && c <= 'F') then
                    i <- i + 1
                else
                    ok <- false

            ok

    /// UTS #39-shaped ASCII skeleton. Pinned lookalikes only (not a Unicode table).
    let asciiSkeletonChar (c: char) : char =
        match c with
        | '0'
        | 'O' -> 'o'
        | '1'
        | 'I'
        | '|'
        | 'l' -> 'l'
        | '5'
        | 'S' -> 's'
        | '8'
        | 'B' -> 'b'
        | '2'
        | 'Z' -> 'z'
        | c when c >= 'A' && c <= 'Z' -> char (int c + 32)
        | c -> c

    let asciiSkeleton (name: string) : string =
        if isNull name then
            ""
        else
            let buf = Array.zeroCreate name.Length

            for i in 0 .. name.Length - 1 do
                buf.[i] <- asciiSkeletonChar name.[i]

            String buf

    let confusable (a: string) (b: string) : bool =
        not (String.Equals(a, b, StringComparison.Ordinal))
        && String.Equals(asciiSkeleton a, asciiSkeleton b, StringComparison.Ordinal)

    let parse (token: string) : Result<Token, ParseError> =
        if isNull token || token.Length = 0 then
            Error ParseError.Empty
        elif token.StartsWith("blake3:", StringComparison.Ordinal) then
            let rest = token.Substring(7)

            if not (isHex64 rest) then
                Error(ParseError.BadBlake3 rest)
            else
                try
                    Ok(Token.Content(ContentHash256.ofHex rest))
                with _ ->
                    Error(ParseError.BadBlake3 rest)
        elif token.StartsWith("entity:", StringComparison.Ordinal) then
            let rest = token.Substring(7)

            match ZetaFsNamespace.EntityId.tryParse rest with
            | Some id when rest.Length = 26 -> Ok(Token.Entity id)
            | _ -> Error(ParseError.BadEntity rest)
        else
            Ok(Token.Path token)

    let describe (t: Token) : string =
        match t with
        | Token.Content h ->
            String.Concat("blake3:", h.ToHex())
        | Token.Entity id ->
            String.Concat("entity:", ZetaFsNamespace.EntityId.format id)
        | Token.Path p ->
            String.Concat("path:", p)

    let describeError (e: ParseError) : string =
        match e with
        | ParseError.Empty -> "empty token"
        | ParseError.BadBlake3 rest -> String.Concat("bad blake3 token: ", rest)
        | ParseError.BadEntity rest -> String.Concat("bad entity token: ", rest)

    let hexFilenameWarning (t: Token) : string option =
        match t with
        | Token.Path p when isHex64 p ->
            Some "this is a path; ContentId requires the blake3: prefix"
        | _ -> None

    /// 256-bit loose-object fan-out (`objects/<2-hex>/<62-hex>`). Not the
    /// 128-bit MerkleHash layout. Truncating ContentId is never a lookup.
    let contentObjectPath (storeDir: string) (h: ContentHash256) : string =
        let hex = h.ToHex()
        Path.Combine(storeDir, "objects", hex.Substring(0, 2), hex.Substring(2))

    let entityDataPath (storeDir: string) (id: ZetaFsNamespace.EntityId) : string =
        Path.Combine(storeDir, ZetaFsMutbuf.DirName, ZetaFsNamespace.EntityId.format id, "data")

    type Identify =
        { Kind: Token
          Line: string
          Warning: string option
          ContentLine: string option }

    [<NoEquality; NoComparison>]
    type Resolve =
        { ReadPath: string -> byte[] option
          ReadContent: ContentHash256 -> byte[] option
          ReadEntity: ZetaFsNamespace.EntityId -> byte[] option }

    type CatError =
        | Parse of ParseError
        | NotFound of Token

    /// Classify a token. A readable path also yields its ContentId; a 64-hex
    /// filename stays a path even when those bytes hash.
    let identify (token: string) (tryReadPath: string -> byte[] option) : Result<Identify, ParseError> =
        match parse token with
        | Error e -> Error e
        | Ok t ->
            let contentLine =
                match t with
                | Token.Path p ->
                    match tryReadPath p with
                    | Some bytes ->
                        Some(String.Concat("blake3:", (ContentHash256.ofBytes bytes).ToHex()))
                    | None -> None
                | Token.Content _
                | Token.Entity _ -> None

            Ok
                { Kind = t
                  Line = describe t
                  Warning = hexFilenameWarning t
                  ContentLine = contentLine }

    /// Bytes for a token. 64-hex without prefix uses ReadPath, never ReadContent.
    let cat (token: string) (r: Resolve) : Result<byte[], CatError> =
        match parse token with
        | Error e -> Error(CatError.Parse e)
        | Ok t ->
            let bytes =
                match t with
                | Token.Path p -> r.ReadPath p
                | Token.Content h -> r.ReadContent h
                | Token.Entity id -> r.ReadEntity id

            match bytes with
            | Some b -> Ok b
            | None -> Error(CatError.NotFound t)
