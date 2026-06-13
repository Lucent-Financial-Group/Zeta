namespace Zeta.Core

/// GeneratorCatalog — **the SQL over the generator catalog: SELECT a categoried generator, get its
/// ZetaId, unfold from its seed** (ferry 37: "WHY = ZetaId = a specific generator with category…";
/// Aaron 2026-06-12: "that one already has a cart we made we just need the SQL").
///
/// The `GeneratorRegistry` is the STORE (generators-with-seeds, content-addressed). This is the
/// QUERY side: the registry's `known` entries read as a RELATION — one row per generator, with the
/// CATEGORY (the dotted-name prefix: `shape`, `algebra`, `boundary`, `shader`, …) projected out as
/// a first-class column. The query shape is relational combinators (FROM = `rows`, WHERE = `where`,
/// SELECT = ordinary projection over the result) rather than a SQL-string parser — a parser is a
/// large permanent contract surface; combinators are total, minimal, and compose. The DBSP path
/// (the catalog as a Z-set, a query as an incremental circuit) is the future, not this MVP.
///
/// Culture-invariant by default (B-0969): all string comparison here is `StringComparer.Ordinal` /
/// ordinal `IndexOf` — categories must sort and match identically on every machine (the catalog is
/// shared substrate; a locale-sorted category list would diverge across nodes).
[<RequireQualifiedAccess>]
module GeneratorCatalog =

    open System

    /// A catalog row: the registry entry with its CATEGORY projected as a column.
    /// (ZetaId / Name / Version are the Entry; Category is derived from Name.)
    type Row =
        { ZetaId: string
          Name: string
          Category: string
          Version: int }

    /// The category of a generator name: the prefix before the first '.', ordinal — or the whole
    /// name if it has no dot (a category-less generator is its own category).
    let categoryOf (name: string) : string =
        match name.IndexOf('.', StringComparison.Ordinal) with
        | -1 -> name
        | i -> name.Substring(0, i)

    /// FROM: the catalog as a relation — every known generator, one row, category projected.
    let rows: Row list =
        GeneratorRegistry.known
        |> List.map (fun e ->
            { ZetaId = e.ZetaId
              Name = e.Name
              Category = categoryOf e.Name
              Version = e.Version })

    /// SELECT DISTINCT category — the catalog's categories, ordinal-sorted (stable across machines).
    let categories: string list =
        rows
        |> List.map (fun r -> r.Category)
        |> List.distinct
        |> List.sortWith (fun a b -> String.CompareOrdinal(a, b))

    /// WHERE: filter rows by a predicate (the general query; SELECT is ordinary projection after).
    let where (predicate: Row -> bool) : Row list = rows |> List.filter predicate

    // ── Composable predicate builders (the WHERE-clause vocabulary) ──────────────────────────────

    /// rows in a given category (ordinal exact match on the projected category).
    let inCategory (category: string) (r: Row) : bool =
        String.Equals(r.Category, category, StringComparison.Ordinal)

    /// rows whose name contains a substring (ordinal — case-sensitive, locale-free).
    let nameContains (sub: string) (r: Row) : bool =
        r.Name.IndexOf(sub, StringComparison.Ordinal) >= 0

    /// rows at a specific version.
    let atVersion (version: int) (r: Row) : bool = r.Version = version

    // ── Convenience SELECTs (the common queries, named) ─────────────────────────────────────────

    /// SELECT * WHERE category = … (the headline query: get every generator of a kind).
    let byCategory (category: string) : Row list = where (inCategory category)

    /// The ZetaIds of a category — the addresses you'd hand a MediaLines `gen` line to unfold.
    let zetaIdsInCategory (category: string) : string list =
        byCategory category |> List.map (fun r -> r.ZetaId)

    /// SELECT the single row for a name (newest version wins — mirrors GeneratorRegistry.byName).
    let byName (name: string) : Row option =
        where (fun r -> String.Equals(r.Name, name, StringComparison.Ordinal))
        |> List.sortByDescending (fun r -> r.Version)
        |> List.tryHead
