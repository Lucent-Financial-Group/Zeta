namespace Zeta.Tests.FSharp

open System
open System.IO
open System.Text.Json
open Xunit
open Zeta.Core

/// The cross-language treaty for `SpecializationCache` — the last of the six unpinned F#↔TypeScript
/// pairs the sweep found.
///
/// WHAT THE TWO SIDES ACTUALLY SHARE, which is less than the matching name suggests:
///
///   F#   `SpecializationCache<'TInput,'TOutput>(specializer)` — generic over ANY specializer. No
///        IR, no Futamura projection, no mix. Just the caching discipline.
///   TS   the same caching discipline, PLUS `specialize(ir)` — the actual 1st Futamura projection
///        over a mix IR — and a multi-IR registry. Neither has an F# counterpart.
///
/// So this pins the CACHE STATE MACHINE, which is the whole of the F# module and the part of the
/// TypeScript one claiming to be the same idea. Pinning `specialize` would be pinning a
/// TypeScript-only feature against nothing — worse than leaving it unpinned, because it would look
/// like cross-language coverage while checking one implementation against itself.
///
/// THE PROPERTY WORTH PINNING. **Errors are never cached.** Both modules say so in a comment, in
/// capitals, and it is the rule here that is easiest to break without anything noticing: a cache
/// that remembers a failure looks MORE correct on the happy path — fewer regenerations — while
/// turning a transient specializer fault into a permanent one. A failing call must increment BOTH
/// `Misses` and `Errors`, clear the cache, and rethrow, so the very next call retries.
///
/// WHAT IS NOT PINNED, AND HOW THE FLAKE IS AVOIDED. Garbage collection. F# holds the specialized
/// function in a `WeakReference` and TypeScript in a `WeakRef`; whether a collection lands between
/// two calls is not observable, reproducible, or the same across runtimes, so there is no vector for
/// it and every script uses `Invalidate()` — the deterministic door to the same code path.
///
/// That leaves a real hazard in the TEST rather than in the code: if the specialized function were
/// reachable only through the cache's weak reference, a collection mid-script would add a miss and
/// the treaty would flake. So the specializer below returns ONE function instance that this test
/// holds strongly for the whole script. The weak reference therefore cannot be cleared, and the
/// counters describe exactly the run the transcript describes. Stated rather than left to be
/// rediscovered as an intermittent failure.
/// A MUTANT THAT SURVIVED, AND WHY IT IS NOT A GAP. Deleting `cached <- None` from the error path —
/// the line whose comment reads "NEVER cache errors" — changes nothing observable, and the treaty
/// stays green. That reads like a hole in the treaty and is not one.
///
/// `Regenerate` is reachable from exactly two states: `cached = None`, or `cached = Some wr` where
/// `wr.TryGetTarget()` just returned false. On the error path the line moves `Some(dead)` to `None`,
/// and BOTH of those force a miss on the next call — a dead weak reference can never come back
/// alive. So the assignment is defensive, not load-bearing, and no test can distinguish it.
///
/// The property itself still holds, enforced by CONTROL FLOW rather than by that line: nothing is
/// stored until the specializer RETURNS, so a throwing specializer has nothing to leave behind. The
/// same argument applies to TypeScript's `cachedRef = null` in its catch block.
///
/// Recorded because a surviving mutant and an untested property are different things, and treating
/// the first as the second would send someone writing a vector for a state the design forbids.
///
/// The two mutants that ARE observable are killed: `Invalidate()` made a no-op, and a hit that
/// forgets to count itself.
module SpecializationCacheTreatyTests =

    [<Literal>]
    let private MaxTranscriptBytes = 1L * 1024L * 1024L

    let private strOf (el: JsonElement) (p: string) = el.GetProperty(p).GetString()
    let private items (el: JsonElement) (p: string) = [ for x in el.GetProperty(p).EnumerateArray() -> x ]

    let private repoRoot () =
        let mutable dir = DirectoryInfo(AppContext.BaseDirectory)

        while dir <> null && not (File.Exists(Path.Join(dir.FullName, "Zeta.sln"))) do
            dir <- dir.Parent

        if dir = null then
            invalidOp "could not locate the repo root (no Zeta.sln above the test binary)"

        dir.FullName

    let private transcript =
        lazy
            (let path =
                Path.Join(
                    repoRoot (),
                    "src",
                    "Core.TypeScript",
                    "algebra",
                    "specialization-cache-treaty-transcript.json"
                )

             let info = FileInfo(path)

             if not info.Exists then
                 invalidOp (
                     sprintf
                         "SpecializationCache treaty transcript missing at %s — regenerate with: bun src/Core.TypeScript/algebra/generate-specialization-cache-treaty-transcript.ts"
                         path
                 )

             if info.Length > MaxTranscriptBytes then
                 invalidOp $"SpecializationCache treaty transcript is too large: {info.Length} bytes."

             use stream = File.OpenRead path
             let doc = JsonDocument.Parse(stream)
             [ for v in doc.RootElement.EnumerateArray() -> v ])

    /// One observation of the cache, in the transcript's wire shape.
    type private Observation =
        { Op: string
          Result: string option
          Threw: bool
          Hits: int
          Misses: int
          Errors: int }

    /// Replay one script through the REAL F# cache.
    let private replay (steps: JsonElement list) : Observation list =
        // ONE instance, held strongly for the whole script — see the GC note in the module header.
        // `x * 2 + 1`, the same function the TypeScript side specializes to.
        let specialized: int64 -> int64 = fun x -> x * 2L + 1L
        let mutable failNext = false

        let specializer () =
            if failNext then
                failNext <- false
                failwith "specializer failed (treaty fixture)"

            specialized

        let cache = SpecializationCache<int64, int64>(specializer)

        [ for step in steps do
              let op = strOf step "op"
              let mutable result = None
              let mutable threw = false

              match op with
              | "invalidate" -> cache.Invalidate()
              | "failNext" -> failNext <- true
              | "run" ->
                  let input = int64 (step.GetProperty("input").GetInt32())

                  try
                      result <- Some((cache.Run input).ToString(Globalization.CultureInfo.InvariantCulture))
                  with _ ->
                      threw <- true
              | other -> failwithf "unknown op: %s" other

              yield
                  { Op = op
                    Result = result
                    Threw = threw
                    Hits = cache.Hits
                    Misses = cache.Misses
                    Errors = cache.Errors } ]

    let private expectedOf (el: JsonElement) : Observation list =
        [ for e in el.GetProperty("expected").EnumerateArray() ->
              { Op = strOf e "op"
                Result =
                    let r = e.GetProperty "result"
                    if r.ValueKind = JsonValueKind.Null then None else Some(r.GetString())
                Threw = e.GetProperty("threw").GetBoolean()
                Hits = e.GetProperty("hits").GetInt32()
                Misses = e.GetProperty("misses").GetInt32()
                Errors = e.GetProperty("errors").GetInt32() } ]

    [<Fact>]
    let ``the cache state machine agrees step for step`` () =
        let vectors = transcript.Value
        Assert.NotEmpty vectors

        for v in vectors do
            let name = strOf v "name"
            let actual = replay (items v "steps")
            let expected = expectedOf v

            Assert.Equal(List.length expected, List.length actual)

            // Step by step, not just the final counters: two implementations can reach the same
            // totals by a different route, and the route is the thing being pinned.
            for i, (e, a) in List.indexed (List.zip expected actual) do
                Assert.True(
                    (e = a),
                    sprintf "script %s, step %d (%s): expected %A, F# gave %A" name i e.Op e a
                )

    [<Fact>]
    let ``an error is never cached — asserted directly, not only through the vectors`` () =
        // The one claim whose failure would be quiet: a cache that remembered the failure would keep
        // throwing, and every counter would still look plausible.
        let specialized: int64 -> int64 = fun x -> x * 2L + 1L
        let mutable failNext = true

        let specializer () =
            if failNext then
                failNext <- false
                failwith "specializer failed"

            specialized

        let cache = SpecializationCache<int64, int64>(specializer)

        Assert.Throws<Exception>(fun () -> cache.Run 1L |> ignore) |> ignore
        Assert.Equal(1, cache.Errors)
        Assert.Equal(1, cache.Misses)

        // The next call must RETRY and succeed. If the failure had been cached this throws again.
        Assert.Equal(3L, cache.Run 1L)
        Assert.Equal(2, cache.Misses)
        Assert.Equal(1, cache.Errors)

        // …and the retry populated the cache, so the call after it is a hit.
        Assert.Equal(5L, cache.Run 2L)
        Assert.Equal(1, cache.Hits)

    [<Fact>]
    let ``the transcript keeps the scripts that discriminate`` () =
        let names = transcript.Value |> List.map (fun v -> strOf v "name") |> Set.ofList

        Assert.True(transcript.Value.Length >= 6, sprintf "expected at least 6 scripts, found %d" transcript.Value.Length)
        Assert.Contains("AN ERROR IS NEVER CACHED", names)
        Assert.Contains("an error after a warm cache does not poison it", names)
        Assert.Contains("two failures in a row each count", names)
        Assert.Contains("invalidate before any call is not an extra miss", names)
