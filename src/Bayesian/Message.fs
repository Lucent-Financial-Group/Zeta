namespace Zeta.Bayesian

/// # The message algebra — the inference kernel (B-1000 slice 2)
///
/// The Zeta Infer.NET rewrite (B-1000) runs **message passing** over a
/// factor graph: variables and factors exchange *messages*, and the
/// marginals are the products of incoming messages. This module is the
/// kernel those later slices (factor graph → sum-product BP → EP) stack
/// on: the **message algebra**.
///
/// The load-bearing fact (exponential families): a message is an
/// unnormalized exponential-family density carried in **natural
/// parameters**, and the density *product* is **natural-parameter
/// addition**. So:
///
///   - **`product`** (combine two messages) = add natural parameters —
///     the sum-product / BP combine (Kschischang–Frey–Loeliger 2001).
///   - **`divide`** (form the EP *cavity* — remove one message) =
///     subtract natural parameters (Minka 2001).
///   - **`uniform`** (the flat message) = zero natural parameters — the
///     identity for `product`.
///
/// `product` is therefore a commutative monoid (identity `uniform`) and,
/// with `divide`, a commutative group. That algebraic shape is exactly
/// the message-weight structure BP is parameterized over (the
/// `Zeta.Core.ISemiring` ⊗ at message scope); marginalization (the ⊕ /
/// moment-match projection) arrives with EP in a later slice.
///
/// Spec source = published papers with formal proofs (clean-room):
/// KFL 2001 (sum-product), Minka 2001 (EP), Bishop PRML ch.2/10
/// (exponential families + conjugacy). The conjugate closed-forms here
/// are cross-checked against `Zeta.Bayesian.BayesianAggregate` (the
/// existing hand-rolled conjugate updates): `Beta.product prior
/// (Beta.likelihood s f)` equals `BetaBernoulli(α,β).Observe(s,f)`.

/// An exponential-family message algebra: messages combine by `Product`
/// (= add natural parameters) and EP forms cavities by `Divide` (=
/// subtract natural parameters). `Uniform` is the identity (flat)
/// message. A dictionary value (cf. `Zeta.Core.IAlgebra`) so later
/// slices (BP/EP) can pass any message family generically.
type IMessage<'M> =
    abstract Uniform : 'M
    abstract Product : 'M * 'M -> 'M
    abstract Divide : 'M * 'M -> 'M

/// A Gaussian message in **natural parameters**: precision `τ = 1/σ²`
/// and precision-mean `ν = μ·τ`. Product adds `(ν, τ)` — the canonical
/// precision-weighted EP message product; the uniform message is `τ = 0`
/// (infinite variance, flat). Mean `= ν/τ`, Variance `= 1/τ`.
type Gaussian =
    { /// precision-mean ν = μ·τ
      PrecisionMean: float
      /// precision τ = 1/σ²
      Precision: float }

[<CompilationRepresentation(CompilationRepresentationFlags.ModuleSuffix)>]
module Gaussian =

    /// The flat (uniform) Gaussian message: zero precision = infinite
    /// variance. Identity for `product`.
    let uniform : Gaussian = { PrecisionMean = 0.0; Precision = 0.0 }

    /// A Gaussian from its mean and variance.
    let ofMeanVariance (mean: float) (variance: float) : Gaussian =
        let tau = 1.0 / variance
        { PrecisionMean = mean * tau; Precision = tau }

    /// Posterior mean μ = ν/τ.
    let mean (g: Gaussian) : float = g.PrecisionMean / g.Precision

    /// Variance σ² = 1/τ.
    let variance (g: Gaussian) : float = 1.0 / g.Precision

    /// A message is *proper* (normalizes to a finite distribution) iff
    /// its precision is positive. EP cavities can be improper (negative
    /// precision); the engine tolerates that mid-iteration.
    let isProper (g: Gaussian) : bool = g.Precision > 0.0

    /// Combine two Gaussian messages = add natural parameters. The
    /// product of two Gaussians is Gaussian with precision `τ₁+τ₂` and
    /// mean `(τ₁μ₁ + τ₂μ₂)/(τ₁+τ₂)` — precision-weighted (KFL/Bishop).
    let product (a: Gaussian) (b: Gaussian) : Gaussian =
        { PrecisionMean = a.PrecisionMean + b.PrecisionMean
          Precision = a.Precision + b.Precision }

    /// The EP cavity: remove message `b` from `a` = subtract natural
    /// parameters. Inverse of `product` in `b` (Minka 2001).
    let divide (a: Gaussian) (b: Gaussian) : Gaussian =
        { PrecisionMean = a.PrecisionMean - b.PrecisionMean
          Precision = a.Precision - b.Precision }

    /// The message algebra dictionary.
    let algebra : IMessage<Gaussian> =
        { new IMessage<Gaussian> with
            member _.Uniform = uniform
            member _.Product(a, b) = product a b
            member _.Divide(a, b) = divide a b }

/// A Beta message (shape parameters `Alpha`, `Beta`) — conjugate to
/// Bernoulli. The natural parameters are `(α-1, β-1)`, so the density
/// product adds them: `α_prod = α₁+α₂-1`. The uniform message is
/// `Beta(1,1)` (flat). Mean `= α/(α+β)`.
type Beta =
    { /// shape parameter α
      Alpha: float
      /// shape parameter β
      Beta: float }

[<CompilationRepresentation(CompilationRepresentationFlags.ModuleSuffix)>]
module Beta =

    /// The flat (uniform) Beta message `Beta(1,1)` = natural parameters
    /// `(0,0)`. Identity for `product`.
    let uniform : Beta = { Alpha = 1.0; Beta = 1.0 }

    /// A Beta from explicit shape parameters.
    let create (alpha: float) (beta: float) : Beta = { Alpha = alpha; Beta = beta }

    /// Posterior mean α/(α+β).
    let mean (d: Beta) : float = d.Alpha / (d.Alpha + d.Beta)

    /// Variance αβ / ((α+β)²(α+β+1)).
    let variance (d: Beta) : float =
        let s = d.Alpha + d.Beta
        d.Alpha * d.Beta / (s * s * (s + 1.0))

    /// Proper iff both shape parameters are positive.
    let isProper (d: Beta) : bool = d.Alpha > 0.0 && d.Beta > 0.0

    /// The Bernoulli **likelihood message** for `successes` and
    /// `failures`: `Beta(1+s, 1+f)`. `product prior (likelihood s f)`
    /// is the conjugate posterior `Beta(α+s, β+f)` — i.e. exactly
    /// `BayesianAggregate.BetaBernoulli(α,β).Observe(s,f)`.
    let likelihood (successes: float) (failures: float) : Beta =
        { Alpha = 1.0 + successes; Beta = 1.0 + failures }

    /// Combine two Beta messages = add natural parameters
    /// `(α-1)+(α'-1)` ⇒ `α_prod = α+α'-1` (and likewise for β).
    let product (a: Beta) (b: Beta) : Beta =
        { Alpha = a.Alpha + b.Alpha - 1.0
          Beta = a.Beta + b.Beta - 1.0 }

    /// The EP cavity: subtract natural parameters. Inverse of `product`.
    let divide (a: Beta) (b: Beta) : Beta =
        { Alpha = a.Alpha - b.Alpha + 1.0
          Beta = a.Beta - b.Beta + 1.0 }

    /// The message algebra dictionary.
    let algebra : IMessage<Beta> =
        { new IMessage<Beta> with
            member _.Uniform = uniform
            member _.Product(a, b) = product a b
            member _.Divide(a, b) = divide a b }

/// A Bernoulli message carried as `ProbTrue = P(x = true)`. Product
/// multiplies the true/false masses and renormalizes (= adding
/// log-odds — the discrete natural-parameter add). Uniform = `0.5`.
type Bernoulli =
    { /// P(x = true)
      ProbTrue: float }

[<CompilationRepresentation(CompilationRepresentationFlags.ModuleSuffix)>]
module Bernoulli =

    /// The flat (uniform) Bernoulli message P(true) = 0.5. Identity for
    /// `product`.
    let uniform : Bernoulli = { ProbTrue = 0.5 }

    /// A Bernoulli from P(true).
    let create (probTrue: float) : Bernoulli = { ProbTrue = probTrue }

    /// Combine two Bernoulli messages: multiply true/false masses,
    /// renormalize (equivalently, add log-odds).
    let product (a: Bernoulli) (b: Bernoulli) : Bernoulli =
        let t = a.ProbTrue * b.ProbTrue
        let f = (1.0 - a.ProbTrue) * (1.0 - b.ProbTrue)
        { ProbTrue = t / (t + f) }

    /// The EP cavity: divide true/false masses, renormalize (subtract
    /// log-odds). Inverse of `product`.
    let divide (a: Bernoulli) (b: Bernoulli) : Bernoulli =
        let t = a.ProbTrue / b.ProbTrue
        let f = (1.0 - a.ProbTrue) / (1.0 - b.ProbTrue)
        { ProbTrue = t / (t + f) }

    /// The message algebra dictionary.
    let algebra : IMessage<Bernoulli> =
        { new IMessage<Bernoulli> with
            member _.Uniform = uniform
            member _.Product(a, b) = product a b
            member _.Divide(a, b) = divide a b }
