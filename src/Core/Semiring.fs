namespace Zeta.Core

/// Semiring interface for first-class uncertainty in DBSP weights.
/// Enables ZSet<'K, 'W> parameterization over integer, probabilistic,
/// Gaussian, provenance, etc. semirings (ring for retraction support).
type ISemiring<'W> =
    abstract member Zero: 'W
    abstract member Add: 'W -> 'W -> 'W
    abstract member Mul: 'W -> 'W -> 'W
    abstract member Negate: 'W -> 'W  // for ring support (retraction)