namespace Zeta.Core

open System

/// A simulated proposal for wave collapse.
type CollapseProposal<'TState> = {
    ProposalState: 'TState
    Fidelity: float
    IsApproved: bool
}

/// The result of an integration step.
type IntegrationResult<'TState> =
    | Simulating of 'TState
    | Committed of 'TState
    | Propagating of 'TState

/// The Integrate computation expression reader/writer/monadic wrapper representing
/// the sovereign decision commitment operator I.
type Integrate<'TState, 'T> = Integrate of ('TState -> 'T * IntegrationResult<'TState>)

type IntegrateBuilder() =
    member _.Return(x: 'T) : Integrate<'TState, 'T> =
        Integrate (fun s -> x, Committed s)

    member _.Yield(x: 'T) : Integrate<'TState, 'T> =
        Integrate (fun s -> x, Propagating s)

    member _.Bind(Integrate m : Integrate<'TState, 'T>, f: 'T -> Integrate<'TState, 'U>) : Integrate<'TState, 'U> =
        Integrate (fun s ->
            let x, res = m s
            match res with
            | Simulating s' ->
                let (Integrate m2) = f x
                m2 s'
            | Committed s' ->
                let (Integrate m2) = f x
                let y, res2 = m2 s'
                y, res2
            | Propagating s' ->
                let (Integrate m2) = f x
                let y, res2 = m2 s'
                match res2 with
                | Simulating s'' -> y, Propagating s''
                | res'' -> y, res''
        )

    /// Simulate a potential collapse under a given predicate.
    /// Pure function - no commitment. Returns a CollapseProposal.
    member _.Limit(state: 'TState, predicate: 'TState -> CollapseProposal<'TState>) : CollapseProposal<'TState> =
        predicate state

    /// Observe pulling from the environment or memory.
    member _.Observe(source: 'TState -> 'T) : Integrate<'TState, 'T> =
        Integrate (fun s -> source s, Simulating s)

    /// Emit pushing to the environment or memory.
    member _.Emit(action: 'TState -> unit) : Integrate<'TState, unit> =
        Integrate (fun s -> action s; (), Simulating s)

[<AutoOpen>]
module IntegrateExtensions =
    let integrate = IntegrateBuilder()
