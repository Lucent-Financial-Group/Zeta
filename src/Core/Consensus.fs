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
