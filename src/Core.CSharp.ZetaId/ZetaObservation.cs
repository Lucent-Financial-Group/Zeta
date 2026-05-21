using System;

namespace Zeta.Core.CSharp.ZetaId;

/// <summary>
/// Core semantic model for a Zeta observation.
/// Execution-model neutral (pure data). No IObservable/IQbservable/IAsyncEnumerable dependencies.
/// This is the single source of truth that all execution model adapters wrap.
/// </summary>
public readonly record struct ZetaObservation(
    IdVersion Version,
    Milliseconds Timestamp,
    int Chromosome,
    int Category,
    int Firefly,
    Authority Authority,
    int Persona,
    Momentum Momentum,
    int Location);
