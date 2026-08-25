module M
open System
open System.Diagnostics
open System.Numerics
open Zeta.Core

let best (rounds:int) (f: unit -> unit) =
    for _ in 1..5 do f()
    let mutable b = Double.MaxValue
    for _ in 1..rounds do
        let sw = Stopwatch.StartNew()
        f()
        sw.Stop()
        b <- min b sw.Elapsed.TotalMilliseconds
    b

[<EntryPoint>]
let main _ =
    printfn "Vector<int64>.Count = %d ; IsHardwareAccelerated = %b" Vector<int64>.Count Vector.IsHardwareAccelerated
    printfn ""
    printfn "=== WHERE : filter(key in [lo,hi)) -> compacted column pair ==="
    printfn "%-10s %-10s %-10s %12s %12s %8s" "n" "order" "selectivity" "scalar ms" "vector ms" "ratio"
    for n in [4096; 65536; 1048576] do
        let rng = Random 20260825
        let sorted = Array.init n (fun i -> int64 i * 3L)
        let weights = Array.init n (fun _ -> int64 (rng.Next(-1000,1000)))
        let sk = Array.copy sorted
        let sw2 = Array.copy weights
        for i in (sk.Length-1) .. -1 .. 1 do
            let j = rng.Next(i+1)
            let t = sk.[i] in sk.[i] <- sk.[j]; sk.[j] <- t
            let t2 = sw2.[i] in sw2.[i] <- sw2.[j]; sw2.[j] <- t2
        let dk = Array.zeroCreate<int64> n
        let dw = Array.zeroCreate<int64> n
        let maxKey = int64 n * 3L
        for (selName, lo, hi) in
            [ "1%",  0L, maxKey/100L
              "50%", maxKey/4L, maxKey*3L/4L
              "99%", 0L, maxKey*99L/100L ] do
            for (ordName, k, w) in [ "sorted", sorted, weights ; "shuffled", sk, sw2 ] do
                let s = best 9 (fun () -> ColumnLinearKernel.FilterKeyInRangeScalar(ReadOnlySpan k, ReadOnlySpan w, lo, hi, Span<int64> dk, Span<int64> dw) |> ignore)
                let v = best 9 (fun () -> ColumnLinearKernel.FilterKeyInRangeVectorized(ReadOnlySpan k, ReadOnlySpan w, lo, hi, Span<int64> dk, Span<int64> dw) |> ignore)
                printfn "%-10d %-10s %-11s %12.4f %12.4f %7.2fx" n ordName selName s v (s/v)
    printfn ""
    printfn "=== SELECT : elementwise map over a column ==="
    printfn "%-10s %-16s %12s %12s %8s" "n" "op" "scalar ms" "vector ms" "ratio"
    for n in [4096; 65536; 1048576] do
        let src = Array.init n (fun i -> int64 (i % 1000))
        let dst = Array.zeroCreate<int64> n
        let s1 = best 9 (fun () -> ColumnLinearKernel.MapAddScalar(ReadOnlySpan src, 7L, Span<int64> dst))
        let v1 = best 9 (fun () -> ColumnLinearKernel.MapAddVectorized(ReadOnlySpan src, 7L, Span<int64> dst))
        printfn "%-10d %-16s %12.4f %12.4f %7.2fx" n "map (+delta)" s1 v1 (s1/v1)
        let s2 = best 9 (fun () -> ColumnLinearKernel.MapScaleScalar(ReadOnlySpan src, 3L, Span<int64> dst))
        let v2 = best 9 (fun () -> ColumnLinearKernel.MapScaleVectorized(ReadOnlySpan src, 3L, Span<int64> dst))
        printfn "%-10d %-16s %12.4f %12.4f %7.2fx" n "map (*m)" s2 v2 (s2/v2)
        // Control for the "identity projection cannot be improved" claim:
        // Span.CopyTo (Buffer.Memmove) vs a hand-rolled Vector<int64> copy loop
        // vs a plain scalar element loop. Comparing CopyTo against itself would
        // be vacuous, so all three are measured.
        let c = best 9 (fun () -> ColumnLinearKernel.CopyColumn(ReadOnlySpan src, Span<int64> dst))
        let handVec () =
            let w = Vector<int64>.Count
            let mutable i = 0
            while i <= src.Length - w do
                Vector<int64>(ReadOnlySpan(src, i, w)).CopyTo(Span<int64>(dst, i, w))
                i <- i + w
            while i < src.Length do dst.[i] <- src.[i]; i <- i + 1
        let hv = best 9 handVec
        let scalarCopy () =
            for i in 0 .. src.Length - 1 do dst.[i] <- src.[i]
        let sc = best 9 scalarCopy
        printfn "%-10d %-16s %12.4f %12.4f %7.2fx" n "copy: hand-vec" sc hv (sc/hv)
        printfn "%-10d %-16s %12.4f %12.4f %7.2fx" n "copy: CopyTo" sc c (sc/c)
    0
