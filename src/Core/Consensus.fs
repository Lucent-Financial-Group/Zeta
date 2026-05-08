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
        if nodeCount <= 0 then
            0
        else
            (2 * ((nodeCount - 1) / 3)) + 1

    let private nodeName (NodeId value) = value

    let decide<'T when 'T: equality>
        (nodeCount: int)
        (votes: Vote<'T> list)
        : ConsensusResult<'T> =
        let threshold = quorumThreshold nodeCount
        let duplicateNodes =
            votes
            |> List.groupBy (fun v -> v.Node)
            |> List.choose (fun (node, nodeVotes) ->
                if nodeVotes.Length > 1 then
                    Some node
                else
                    None
            )

        match duplicateNodes with
        | duplicate :: _ ->
            Rejected(
                $"duplicate votes from node: %s{nodeName duplicate}",
                votes.Length,
                nodeCount
            )
        | [] ->
            if nodeCount <= 0 then
                Rejected("invalid node count", votes.Length, nodeCount)
            else
                let groups =
                    votes
                    |> List.groupBy (fun v -> v.Value)
                    |> List.sortByDescending (fun (_, vs) -> vs.Length)

                match groups with
                | [] ->
                    Rejected("no votes", 0, nodeCount)
                | (value, supporters) :: _ when supporters.Length >= threshold ->
                    Committed(value, supporters.Length, nodeCount)
                | (_, supporters) :: _ ->
                    Rejected(
                        $"no quorum: best=%d{supporters.Length} threshold=%d{threshold}",
                        supporters.Length,
                        nodeCount
                    )

    let isCommitted (result: ConsensusResult<'T>) : bool =
        match result with
        | Committed _ -> true
        | Rejected _ -> false

    let committedValue (result: ConsensusResult<'T>) : 'T option =
        match result with
        | Committed(v, _, _) -> Some v
        | Rejected _ -> None
