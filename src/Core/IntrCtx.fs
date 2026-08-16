namespace Zeta.Core

open System.Diagnostics
open System.Threading.Tasks

/// InterruptKind — the 8 081KSNY2Z0008QG0R002HB4AGT variants representing system/operator interrupt triggers.
type InterruptKind =
    | TimerElapsed of intervalMs: int
    | RateLimitExhausted of budget: string // "rest" | "graphql"
    | OperatorMessageArrived of content: string
    | DotGitSaturation of stuckProcs: int
    | SentinelMissing
    | RoundsElapsedSinceFreeTime of n: int
    | PeerPRMerged of prNumber: int
    | CIFailureDetected of jobId: string

/// InterruptFeedback — the error channel for the ISR monad. An ISR execution can
/// either fail with a general message, or be explicitly interrupted by an InterruptKind.
type InterruptFeedback =
    | Interrupted of InterruptKind
    | Failed of string

/// IntrCtx — the 5-context Kleisli context record (memetic, prompt, trust, log, otel).
/// threads trace/audit/trust metadata explicitly without using hidden ambient state.
type IntrCtx = {
    Memetic: string
    Prompt: string
    Trust: string
    Log: string
    Otel: ActivityContext
}

/// **ISR = Interrupt Service Routine.** Spelled out 2026-08-16 because it never was: the expansion
/// appeared nowhere in the repo, and had to be inferred from `IntrCtx` / `InterruptFeedback`. Aaron,
/// who named it: *"you named it when we were working on interrupts, we should just spell it out."*
///
/// `ISR<'A, 'B>` — the **Kleisli** Arrow context monad type alias. Threads `IntrCtx` explicitly.
///
/// Two layers, and the choice of each is load-bearing:
///   * a **Reader** over `IntrCtx` — the context is threaded EXPLICITLY, never ambiently. That is
///     §13 noninterference: influence enters only through a declared channel, and an interrupt is
///     precisely the undeclared-channel failure this guards against.
///   * **Kleisli** over `Task<Result<_, InterruptFeedback>>` — specifically Kleisli, NOT the more
///     general Hughes Arrow. Since `ArrowApply ≡ Monad`, having `>>=` is what permits dispatch to
///     depend on WHICH interrupt fired — a runtime value — rather than on statically-known wiring.
///     Being the less general structure is the stronger claim here, not a weaker one.
///
/// Consequence used by `IsrLift.fs`: genuine interrupts live in `Result`'s ERROR position and
/// short-circuit under `>=>`, while ordinary per-tick state (the four corners) flows through the
/// VALUE position. Cost note: `>>=` on a runtime value is dynamic control flow — the fragment that
/// is embarrassingly parallel is the Applicative/Arrow one without `ArrowApply`. Keep the monadic
/// power at the membrane; keep the interior static.
type ISR<'A, 'B> = IntrCtx -> 'A -> Task<Result<'B, InterruptFeedback>>

[<CompilationRepresentation(CompilationRepresentationFlags.ModuleSuffix)>]
module ISR =

    /// Kleisli composition (>=>) for ISR arrows. Threads the context and propagates
    /// errors/interrupts automatically.
    let inline (>=>) (f: ISR<'A, 'B>) (g: ISR<'B, 'C>) : ISR<'A, 'C> =
        fun ctx a ->
            task {
                let! resB = f ctx a
                match resB with
                | Ok b -> return! g ctx b
                | Error e -> return Error e
            }
