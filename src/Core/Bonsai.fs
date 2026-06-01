namespace Zeta.Core

open System.Text
open System.Text.Json

/// Bonsai-subset expression-tree serializer — the F# oracle (#2 of TS/F#/C#/Rust)
/// for B-0976 slice 1. Named after Nuqleon Bonsai (Reaqtor's compact serializer
/// for .NET expression trees); this is the weakly-typed / reflection-info-omitted
/// mode — kind-tagged nodes, no .NET type table — the cross-language-portable
/// form. The TS reference oracle (src/Core.TypeScript/bonsai/) authors the shared
/// golden vectors; this F# oracle replays them byte-for-byte. Mirrors the
/// algebra-ladder meet-in-the-middle discipline: the compilers do not lie;
/// agreement IS the verification.
///
/// Canonical form (the cross-oracle byte-diff contract): serialize emits compact
/// JSON (no whitespace) with a fixed key order per node-kind (kind first, then
/// fields in declared order), integer-only numeric literals in the shared
/// JS-safe-integer range, standard JSON string
/// escaping, and the document wrapper v=1,expr=node. parse round-trips:
/// serialize(parse s) = s, and the DU has structural equality.
module Bonsai =

    /// A literal value — tagged so every oracle round-trips the type exactly.
    type ConstValue =
        /// An integer literal (int64 to match the Rust i64 oracle).
        | CInt of int64
        /// A string literal (serialized with standard JSON escaping).
        | CStr of string
        /// A boolean literal.
        | CBool of bool
        /// The null literal (no value field in the canonical form).
        | CNull

    /// The language-agnostic binary operators in the subset.
    type BinOp =
        | Add
        | Sub
        | Mul
        | Eq
        | Lt
        | And
        | Or

    /// A Bonsai-subset expression node (kind-tagged discriminated union).
    type Expr =
        /// A constant literal.
        | Const of ConstValue
        /// A parameter (variable) reference by name.
        | Param of string
        /// A lambda abstraction: parameter names and a body.
        | Lambda of string list * Expr
        /// A binary operation: operator, left, right.
        | Binary of BinOp * Expr * Expr
        /// A named function application: function name and arguments.
        | Call of string * Expr list
        /// A conditional: test, then-branch, else-branch.
        | Cond of Expr * Expr * Expr

    /// The serialization format version (the v field of the document wrapper).
    [<Literal>]
    let Version = 1

    /// Map a binary operator to its canonical wire string.
    let binOpToString (op: BinOp) : string =
        match op with
        | Add -> "add"
        | Sub -> "sub"
        | Mul -> "mul"
        | Eq -> "eq"
        | Lt -> "lt"
        | And -> "and"
        | Or -> "or"

    /// Parse a canonical wire string back to a binary operator.
    let binOpOfString (s: string) : BinOp =
        match s with
        | "add" -> Add
        | "sub" -> Sub
        | "mul" -> Mul
        | "eq" -> Eq
        | "lt" -> Lt
        | "and" -> And
        | "or" -> Or
        | other -> failwithf "bonsai: unknown binop: %s" other

    /// The JS safe-integer bound, Number.MAX_SAFE_INTEGER = 2^53 - 1. The v1 int
    /// domain is the safe-integer range every oracle shares: an int64 beyond this
    /// cannot round-trip through the TS oracle's number (JSON.parse rounds it), so
    /// it is rejected here too rather than emitting bytes a peer oracle would
    /// silently rewrite — keeping the byte-exact cross-language contract exact.
    [<Literal>]
    let private MaxSafeInt = 9007199254740991L // 2^53 - 1

    /// Reject an integer literal outside the shared v1 safe-integer range.
    let private checkSafeInt (v: int64) : int64 =
        if v > MaxSafeInt || v < -MaxSafeInt then
            failwithf "bonsai: integer literal %d is outside the v1 safe-integer range [-(2^53-1), 2^53-1]" v

        v

    /// Escape a string to a JSON string literal (quotes included), matching
    /// JavaScript JSON.stringify: escape quote, backslash, the short control
    /// forms, any other control char below 0x20 as lowercase \uXXXX, and any
    /// unpaired UTF-16 surrogate as lowercase \uXXXX (a valid surrogate pair is
    /// emitted literally, as JSON.stringify does, so the bytes stay valid UTF-8).
    let private jsonString (s: string) : string =
        let sb = StringBuilder(s.Length + 2)
        sb.Append('"') |> ignore
        let mutable i = 0

        while i < s.Length do
            let ch = s.[i]

            match ch with
            | '"' -> sb.Append("\\\"") |> ignore
            | '\\' -> sb.Append("\\\\") |> ignore
            | '\b' -> sb.Append("\\b") |> ignore
            | '\f' -> sb.Append("\\f") |> ignore
            | '\n' -> sb.Append("\\n") |> ignore
            | '\r' -> sb.Append("\\r") |> ignore
            | '\t' -> sb.Append("\\t") |> ignore
            | c when c < ' ' -> sb.AppendFormat("\\u{0:x4}", int c) |> ignore
            | c when System.Char.IsHighSurrogate c && i + 1 < s.Length && System.Char.IsLowSurrogate(s.[i + 1]) ->
                // valid surrogate pair — emit both code units literally (matches
                // JSON.stringify, which emits the astral character, not an escape)
                sb.Append(c) |> ignore
                sb.Append(s.[i + 1]) |> ignore
                i <- i + 1 // also consume the low surrogate
            | c when System.Char.IsHighSurrogate c || System.Char.IsLowSurrogate c ->
                // unpaired surrogate — escape it (well-formed JSON.stringify does)
                sb.AppendFormat("\\u{0:x4}", int c) |> ignore
            | c -> sb.Append(c) |> ignore

            i <- i + 1

        sb.Append('"') |> ignore
        sb.ToString()

    /// Emit a constant value in canonical compact form (t first, then v).
    let private emitConst (c: ConstValue) : string =
        match c with
        | CInt v -> sprintf "{\"t\":\"int\",\"v\":%d}" (checkSafeInt v)
        | CStr v -> sprintf "{\"t\":\"str\",\"v\":%s}" (jsonString v)
        | CBool v -> sprintf "{\"t\":\"bool\",\"v\":%s}" (if v then "true" else "false")
        | CNull -> "{\"t\":\"null\"}"

    /// Emit a node in canonical compact form (fixed key order per kind).
    let rec private emit (e: Expr) : string =
        match e with
        | Const c -> sprintf "{\"kind\":\"const\",\"value\":%s}" (emitConst c)
        | Param n -> sprintf "{\"kind\":\"param\",\"name\":%s}" (jsonString n)
        | Lambda(ps, body) ->
            let psJson = ps |> List.map jsonString |> String.concat ","
            sprintf "{\"kind\":\"lambda\",\"params\":[%s],\"body\":%s}" psJson (emit body)
        | Binary(op, l, r) ->
            sprintf "{\"kind\":\"binary\",\"op\":%s,\"left\":%s,\"right\":%s}" (jsonString (binOpToString op)) (emit l) (emit r)
        | Call(fn, args) ->
            let argsJson = args |> List.map emit |> String.concat ","
            sprintf "{\"kind\":\"call\",\"fn\":%s,\"args\":[%s]}" (jsonString fn) argsJson
        | Cond(t, th, el) ->
            sprintf "{\"kind\":\"cond\",\"test\":%s,\"then\":%s,\"else\":%s}" (emit t) (emit th) (emit el)

    /// Serialize an expression to the canonical Bonsai-subset string.
    let serialize (e: Expr) : string =
        sprintf "{\"v\":%d,\"expr\":%s}" Version (emit e)

    /// Rebuild a ConstValue from a parsed JSON element (validating the tag).
    let private parseConst (el: JsonElement) : ConstValue =
        match el.GetProperty("t").GetString() with
        | "int" -> CInt(checkSafeInt (el.GetProperty("v").GetInt64()))
        | "str" -> CStr(el.GetProperty("v").GetString())
        | "bool" -> CBool(el.GetProperty("v").GetBoolean())
        | "null" -> CNull
        | other -> failwithf "bonsai: unknown const tag: %s" other

    /// Rebuild an Expr from a parsed JSON element (validating the kind). Uses
    /// eager list comprehensions over EnumerateArray (the JsonElement array
    /// enumerator is a mutable struct that corrupts through a lazy Seq pipeline).
    let rec private parseNode (el: JsonElement) : Expr =
        match el.GetProperty("kind").GetString() with
        | "const" -> Const(parseConst (el.GetProperty("value")))
        | "param" -> Param(el.GetProperty("name").GetString())
        | "lambda" ->
            let ps = [ for p in el.GetProperty("params").EnumerateArray() -> p.GetString() ]
            Lambda(ps, parseNode (el.GetProperty("body")))
        | "binary" ->
            Binary(
                binOpOfString (el.GetProperty("op").GetString()),
                parseNode (el.GetProperty("left")),
                parseNode (el.GetProperty("right"))
            )
        | "call" ->
            let args = [ for a in el.GetProperty("args").EnumerateArray() -> parseNode a ]
            Call(el.GetProperty("fn").GetString(), args)
        | "cond" ->
            Cond(parseNode (el.GetProperty("test")), parseNode (el.GetProperty("then")), parseNode (el.GetProperty("else")))
        | other -> failwithf "bonsai: unknown node kind: %s" other

    /// Parse a canonical Bonsai-subset string back to an Expr.
    let parse (s: string) : Expr =
        use doc = JsonDocument.Parse(s)
        let root = doc.RootElement
        let v = root.GetProperty("v").GetInt32()

        if v <> Version then
            failwithf "bonsai: unsupported version %d (expected %d)" v Version

        parseNode (root.GetProperty("expr"))
