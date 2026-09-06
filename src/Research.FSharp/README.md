# F# research experiments

Source-owned, bounded experiments compiled into the F# test executable. They are not
part of the database runtime assembly.

## Simplex belief comparison

See [the report](../../docs/research/2026-09-06-simplex-wset-comparison-and-stack-verdicts.md)
for assumptions, measurements, negative controls, and claims not established.

```sh
dotnet build src/Core/Core.fsproj -c Release
dotnet fsi --warnaserror src/Research.FSharp/run-simplex-belief-comparison.fsx
dotnet test tests/Tests.FSharp/Tests.FSharp.fsproj -c Release --filter FullyQualifiedName~SimplexBeliefComparison
```

Regenerate `simplex-belief-comparison.json` from the runner's stdout. The JSON is a
measured report, not an independent reference implementation. Exact predictions
are checked against dense propagation and separate closed-form predictors in code.
