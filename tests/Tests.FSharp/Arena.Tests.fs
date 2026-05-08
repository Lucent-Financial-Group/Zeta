module Zeta.Tests.ArenaTests

open Xunit
open Zeta.Core.Arena

[<Fact>]
let ``createGrid makes empty grid`` () =
    let g = createGrid 3 3
    Assert.Equal(Empty, g[0, 0])
    Assert.Equal(Empty, g[2, 2])

[<Fact>]
let ``Fill sets cell`` () =
    let g = createGrid 3 3
    let g2 = applyMove g (Fill(1, 1, 5))
    Assert.Equal(Filled 5, g2[1, 1])
    Assert.Equal(Empty, g2[0, 0])

[<Fact>]
let ``Clear resets cell`` () =
    let g = createGrid 3 3 |> fun g -> applyMove g (Fill(1, 1, 5))
    let g2 = applyMove g (Clear(1, 1))
    Assert.Equal(Empty, g2[1, 1])

[<Fact>]
let ``CopyRow duplicates row`` () =
    let g = createGrid 3 3
    let g2 = applyMove g (Fill(0, 0, 1))
    let g3 = applyMove g2 (Fill(0, 1, 2))
    let g4 = applyMove g3 (CopyRow(0, 2))
    Assert.Equal(Filled 1, g4[2, 0])
    Assert.Equal(Filled 2, g4[2, 1])

[<Fact>]
let ``scoreAttempt — perfect match`` () =
    let g = createGrid 2 2
    let score = scoreAttempt g g 0 10
    Assert.Equal(4, score.CorrectCells)
    Assert.Equal(4, score.TotalCells)
    Assert.Equal(1.0, accuracy score)

[<Fact>]
let ``scoreAttempt — partial match`` () =
    let expected = createGrid 2 2 |> fun g -> applyMove g (Fill(0, 0, 1))
    let actual = createGrid 2 2
    let score = scoreAttempt expected actual 1 10
    Assert.Equal(3, score.CorrectCells)

[<Fact>]
let ``solve — correct moves produce perfect score`` () =
    let input = createGrid 2 2
    let expected = applyMove input (Fill(0, 0, 7))
    let puzzle = { Input = input; ExpectedOutput = expected; Id = "test-1" }
    let score = solve puzzle [ Fill(0, 0, 7) ] 5
    Assert.Equal(1.0, accuracy score)
    Assert.True(withinBudget score)

[<Fact>]
let ``solve — move limit truncates`` () =
    let input = createGrid 2 2
    let expected =
        input
        |> fun g -> applyMove g (Fill(0, 0, 1))
        |> fun g -> applyMove g (Fill(1, 1, 2))
    let puzzle = { Input = input; ExpectedOutput = expected; Id = "test-2" }
    let score = solve puzzle [ Fill(0, 0, 1); Fill(1, 1, 2) ] 1
    Assert.Equal(1, score.MovesUsed)
    Assert.Equal(3, score.CorrectCells)

[<Fact>]
let ``FloodFill fills connected region`` () =
    let g = createGrid 3 3
    let g2 = applyMove g (FloodFill(0, 0, 3))
    for r in 0 .. 2 do
        for c in 0 .. 2 do
            Assert.Equal(Filled 3, g2[r, c])
