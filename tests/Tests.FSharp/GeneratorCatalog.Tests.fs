module Zeta.Tests.GeneratorCatalogTests

// SQL over the generator catalog (ferry 37 — "we just need the SQL"): the relational query
// surface over GeneratorRegistry. Total functions, ordinal comparison, the registry as a relation.

open global.Xunit
open FsCheck
open FsCheck.Xunit
open Zeta.Core

[<Fact>]
let ``categoryOf takes the dotted prefix, ordinal; no-dot names are their own category`` () =
    Assert.Equal("shape", GeneratorCatalog.categoryOf "shape.braid")
    Assert.Equal("algebra", GeneratorCatalog.categoryOf "algebra.mod2")
    Assert.Equal("kernel", GeneratorCatalog.categoryOf "kernel.rbf")
    Assert.Equal("loner", GeneratorCatalog.categoryOf "loner") // no dot → whole name

[<Fact>]
let ``FROM: every registry entry becomes exactly one row, ZetaId/Version preserved`` () =
    Assert.Equal(List.length GeneratorRegistry.known, List.length GeneratorCatalog.rows)
    for e in GeneratorRegistry.known do
        let row = GeneratorCatalog.rows |> List.find (fun r -> r.Name = e.Name && r.Version = e.Version)
        Assert.Equal(e.ZetaId, row.ZetaId)
        Assert.Equal(GeneratorCatalog.categoryOf e.Name, row.Category)

[<Fact>]
let ``SELECT DISTINCT category is ordinal-sorted and includes the known kinds`` () =
    let cats = GeneratorCatalog.categories
    Assert.Equal<string list>(List.sortWith (fun a b -> System.String.CompareOrdinal(a, b)) cats, cats)
    Assert.Equal<string list>(List.distinct cats, cats)
    for expected in [ "shape"; "algebra"; "boundary"; "shader"; "audio"; "engine" ] do
        Assert.Contains(expected, cats)

[<Fact>]
let ``WHERE category = shape returns only shape.* generators, and finds the braid`` () =
    let shapes = GeneratorCatalog.byCategory "shape"
    Assert.NotEmpty(shapes)
    Assert.All(shapes, fun r -> Assert.Equal("shape", r.Category))
    Assert.Contains("shape.braid", shapes |> List.map (fun r -> r.Name))

[<Fact>]
let ``the SELECT→unfold path: a category's zetaids match the registry's ids for those names`` () =
    let ids = GeneratorCatalog.zetaIdsInCategory "shape"
    for r in GeneratorCatalog.byCategory "shape" do
        Assert.Equal(GeneratorRegistry.idOf r.Name r.Version, r.ZetaId)
        Assert.Contains(r.ZetaId, ids)

[<Fact>]
let ``byName mirrors the registry (newest version) and nameContains is ordinal`` () =
    match GeneratorCatalog.byName "shape.adinkra", GeneratorRegistry.byName "shape.adinkra" with
    | Some row, Some entry -> Assert.Equal(entry.ZetaId, row.ZetaId)
    | _ -> failwith "shape.adinkra must resolve in both"
    Assert.NotEmpty(GeneratorCatalog.where (GeneratorCatalog.nameContains "braid"))
    Assert.Empty(GeneratorCatalog.where (GeneratorCatalog.nameContains "BRAID")) // ordinal: case matters

[<Property>]
let ``every row's category is the prefix of its name (the projection is faithful)`` (i: int) =
    let rs = GeneratorCatalog.rows
    if List.isEmpty rs then true
    else
        let r = rs.[((i % rs.Length) + rs.Length) % rs.Length]
        r.Name.StartsWith(r.Category, System.StringComparison.Ordinal)

[<Property>]
let ``where composes: inCategory ∧ atVersion = the rows that satisfy both`` (v: int) =
    let cat = "shape"
    let both = GeneratorCatalog.where (fun r -> GeneratorCatalog.inCategory cat r && GeneratorCatalog.atVersion v r)
    both |> List.forall (fun r -> r.Category = cat && r.Version = v)
