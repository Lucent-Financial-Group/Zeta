namespace Zeta.Core

open System

module Arena =

    type CellValue =
        | Empty
        | Filled of color: int

    type Grid = CellValue array2d

    type Puzzle =
        { Input: Grid
          ExpectedOutput: Grid
          Id: string }

    type Move =
        | Fill of row: int * col: int * color: int
        | Clear of row: int * col: int
        | CopyRow of src: int * dst: int
        | CopyCol of src: int * dst: int
        | FloodFill of row: int * col: int * color: int

    type Score =
        { CorrectCells: int
          TotalCells: int
          MovesUsed: int
          MoveLimit: int }

    let accuracy (score: Score) : float =
        if score.TotalCells = 0 then 0.0
        else float score.CorrectCells / float score.TotalCells

    let withinBudget (score: Score) : bool =
        score.MovesUsed <= score.MoveLimit

    let createGrid (rows: int) (cols: int) : Grid =
        Array2D.create rows cols Empty

    let applyMove (grid: Grid) (move: Move) : Grid =
        let g = Array2D.copy grid
        let rows = Array2D.length1 g
        let cols = Array2D.length2 g
        match move with
        | Fill(r, c, color) when r >= 0 && r < rows && c >= 0 && c < cols ->
            g[r, c] <- Filled color
            g
        | Clear(r, c) when r >= 0 && r < rows && c >= 0 && c < cols ->
            g[r, c] <- Empty
            g
        | CopyRow(src, dst) when src >= 0 && src < rows && dst >= 0 && dst < rows ->
            for c in 0 .. cols - 1 do
                g[dst, c] <- g[src, c]
            g
        | CopyCol(src, dst) when src >= 0 && src < cols && dst >= 0 && dst < cols ->
            for r in 0 .. rows - 1 do
                g[r, dst] <- g[r, src]
            g
        | FloodFill(r, c, color) when r >= 0 && r < rows && c >= 0 && c < cols ->
            let target = g[r, c]
            let newColor = Filled color
            if target = newColor then g
            else
                let visited = Array2D.create rows cols false
                let rec fill row col =
                    if row >= 0 && row < rows && col >= 0 && col < cols
                       && not visited[row, col] && g[row, col] = target then
                        visited[row, col] <- true
                        g[row, col] <- newColor
                        fill (row - 1) col
                        fill (row + 1) col
                        fill row (col - 1)
                        fill row (col + 1)
                fill r c
                g
        | _ -> g

    let scoreAttempt
        (expected: Grid)
        (actual: Grid)
        (movesUsed: int)
        (moveLimit: int)
        : Score =
        let rows = Array2D.length1 expected
        let cols = Array2D.length2 expected
        let mutable correct = 0
        let mutable total = 0
        for r in 0 .. rows - 1 do
            for c in 0 .. cols - 1 do
                total <- total + 1
                if expected[r, c] = actual[r, c] then
                    correct <- correct + 1
        { CorrectCells = correct
          TotalCells = total
          MovesUsed = movesUsed
          MoveLimit = moveLimit }

    let solve
        (puzzle: Puzzle)
        (moves: Move list)
        (moveLimit: int)
        : Score =
        let limited = moves |> List.truncate moveLimit
        let result =
            limited
            |> List.fold applyMove puzzle.Input
        scoreAttempt puzzle.ExpectedOutput result limited.Length moveLimit
