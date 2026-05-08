namespace Zeta.Core

open System

module Consensus =

    type NodeId = NodeId of string

    type Vote<'T> =
        { Node: NodeId
          Value: 'T
          Timestamp: DateTimeOffset }

    type ConsensusResult<'T> =
        | Committed of value: 'T * quorum: int * total: int
        | Rejected of reason: string * votes: int * total: int

    let quorumThreshold (nodeCount: int) : int =
        (2 * ((nodeCount - 1) / 3)) + 1

    let decide<'T when 'T: equality>
        (votes: Vote<'T> list)
        : ConsensusResult<'T> =
        let total = votes.Length
        let threshold = quorumThreshold total
        let groups =
            votes
            |> List.groupBy (fun v -> v.Value)
            |> List.sortByDescending (fun (_, vs) -> vs.Length)
        match groups with
        | [] ->
            Rejected("no votes", 0, 0)
        | (value, supporters) :: _ when supporters.Length >= threshold ->
            Committed(value, supporters.Length, total)
        | (_, supporters) :: _ ->
            Rejected(
                $"no quorum: best=%d{supporters.Length} threshold=%d{threshold}",
                supporters.Length,
                total
            )

    let isCommitted (result: ConsensusResult<'T>) : bool =
        match result with
        | Committed _ -> true
        | Rejected _ -> false

    let committedValue (result: ConsensusResult<'T>) : 'T option =
        match result with
        | Committed(v, _, _) -> Some v
        | Rejected _ -> None

    type Phase =
        | Proposed
        | Voting
        | Decided

    type Message<'T> =
        | Propose of proposer: NodeId * value: 'T
        | CastVote of voter: NodeId * value: 'T
        | Finalize

    type RoundState<'T> =
        { Phase: Phase
          Proposal: 'T option
          Proposer: NodeId option
          Votes: Vote<'T> list
          Result: ConsensusResult<'T> option
          Nodes: NodeId list }

    let emptyRound (nodes: NodeId list) : RoundState<'T> =
        { Phase = Proposed
          Proposal = None
          Proposer = None
          Votes = []
          Result = None
          Nodes = nodes }

    type TransitionResult<'T> =
        | Ok of RoundState<'T>
        | InvalidTransition of reason: string

    let transition<'T when 'T: equality>
        (state: RoundState<'T>)
        (msg: Message<'T>)
        : TransitionResult<'T> =
        match state.Phase, msg with
        | Proposed, Propose(proposer, value) ->
            if not (List.contains proposer state.Nodes) then
                InvalidTransition $"unknown proposer: %A{proposer}"
            else
                Ok { state with
                        Phase = Voting
                        Proposal = Some value
                        Proposer = Some proposer }
        | Voting, CastVote(voter, value) ->
            if not (List.contains voter state.Nodes) then
                InvalidTransition $"unknown voter: %A{voter}"
            elif state.Votes |> List.exists (fun v -> v.Node = voter) then
                InvalidTransition $"duplicate vote from %A{voter}"
            else
                let vote =
                    { Node = voter
                      Value = value
                      Timestamp = DateTimeOffset.UtcNow }
                Ok { state with Votes = vote :: state.Votes }
        | Voting, Finalize ->
            let result = decide state.Votes
            Ok { state with Phase = Decided; Result = Some result }
        | Decided, _ ->
            InvalidTransition "round already decided"
        | Proposed, CastVote _ ->
            InvalidTransition "cannot vote before proposal"
        | Proposed, Finalize ->
            InvalidTransition "cannot finalize before proposal"
        | Voting, Propose _ ->
            InvalidTransition "cannot propose during voting"

    type MergeVerdict =
        | Merge
        | Block of reason: string

    type PrGateState =
        { Number: int
          ChecksPassed: int
          ChecksFailed: int
          ChecksInProgress: int
          UnresolvedThreads: int
          AutoMergeArmed: bool }

    let evaluateGate (pr: PrGateState) : MergeVerdict =
        if pr.ChecksFailed > 0 then
            Block $"PR #%d{pr.Number}: %d{pr.ChecksFailed} failed checks"
        elif pr.ChecksInProgress > 0 then
            Block $"PR #%d{pr.Number}: %d{pr.ChecksInProgress} checks in progress"
        elif pr.UnresolvedThreads > 0 then
            Block $"PR #%d{pr.Number}: %d{pr.UnresolvedThreads} unresolved threads"
        else
            Merge

    let prToVote
        (node: NodeId)
        (pr: PrGateState)
        : Vote<MergeVerdict> =
        { Node = node
          Value = evaluateGate pr
          Timestamp = DateTimeOffset.UtcNow }

    let prConsensus
        (nodes: NodeId list)
        (prStates: (NodeId * PrGateState) list)
        : ConsensusResult<MergeVerdict> =
        let votes =
            prStates
            |> List.map (fun (node, pr) -> prToVote node pr)
        decide votes
