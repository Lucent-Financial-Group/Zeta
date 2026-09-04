namespace Zeta.Tests.FSharp

open System
open System.IO
open System.Text.Json
open Xunit
open Zeta.Core

module WorkflowEngineTests =

    [<Literal>]
    let private MaxWorkflowTranscriptBytes = 1024L * 1024L

    let getString (el: JsonElement) (prop: string) : string =
        el.GetProperty(prop).GetString()

    let getOptString (el: JsonElement) (prop: string) : string option =
        match el.TryGetProperty(prop) with
        | true, valEl ->
            if valEl.ValueKind = JsonValueKind.Null then None
            else Some (valEl.GetString())
        | false, _ -> None

    let getInt (el: JsonElement) (prop: string) : int =
        el.GetProperty(prop).GetInt32()

    let getDouble (el: JsonElement) (prop: string) : double =
        el.GetProperty(prop).GetDouble()

    let getBool (el: JsonElement) (prop: string) : bool =
        el.GetProperty(prop).GetBoolean()

    let getArray (el: JsonElement) (prop: string) : JsonElement list =
        [ for item in el.GetProperty(prop).EnumerateArray() -> item ]

    let getMap (el: JsonElement) (prop: string) : Map<string, double> =
        let mapProp = el.GetProperty(prop)
        let mutable m = Map.empty
        for entry in mapProp.EnumerateObject() do
            // JSON CANNOT CARRY NaN. `JSON.stringify` writes it as `null`, so a TypeScript value of
            // NaN arrives here as a null token and `GetDouble` throws. Decoding null back to NaN is
            // what makes the round-trip faithful — and it matters, because a non-finite ratio is
            // exactly the input whose CLAMPING both implementations have to agree on. Dropping the
            // vector instead would have left that agreement untested at the one value most likely
            // to diverge.
            let value =
                if entry.Value.ValueKind = JsonValueKind.Null then Double.NaN
                else entry.Value.GetDouble()
            m <- m.Add(entry.Name, value)
        m

    let parseAgentContext (el: JsonElement) : AgentContext =
        {
            Agent = AgentPersona.FromJsonString(getString el "agent")
            Cycle = getInt el "cycle"
            SessionStartIso = getString el "sessionStartIso"
        }

    let parseLane (el: JsonElement) : Lane =
        Lane.FromJsonString(el.GetString())

    let parseTrajectoryPhase (el: JsonElement) : TrajectoryPhase =
        TrajectoryPhase.FromJsonString(el.GetString())

    let parseWorkCandidate (el: JsonElement) : WorkCandidate =
        {
            Id = getString el "id"
            Lane = parseLane (el.GetProperty("lane"))
            EstimatedDoraContribution = getDouble el "estimatedDoraContribution"
            Uncertainty = getDouble el "uncertainty"
            TrajectoryPhase = parseTrajectoryPhase (el.GetProperty("trajectoryPhase"))
            AgentInterest = getDouble el "agentInterest"
        }

    let parseDoraMetrics (el: JsonElement) : DoraMetrics =
        {
            DeploymentCount = getInt el "deploymentCount"
            LeadTimeMedianSeconds = getDouble el "leadTimeMedianSeconds"
            ChangeFailureRate = getDouble el "changeFailureRate"
            MttrMedianSeconds = getDouble el "mttrMedianSeconds"
            SubstrateRatio = getDouble el "substrateRatio"
        }

    let parseStatusSnapshot (el: JsonElement) : StatusSnapshot =
        {
            SnapshotIso = getString el "snapshotIso"
            CurrentDora = parseDoraMetrics (el.GetProperty("currentDora"))
            HotTrajectories = getArray el "hotTrajectories" |> List.map (fun x -> x.GetString())
            CoolingTrajectories = getArray el "coolingTrajectories" |> List.map (fun x -> x.GetString())
            ExplorationCandidates = getArray el "explorationCandidates" |> List.map (fun x -> x.GetString())
            PerAgentRatios = getMap el "perAgentRatios"
        }

    let parseWorkResult (el: JsonElement) : WorkResult =
        {
            WorkId = getString el "workId"
            Lane = parseLane (el.GetProperty("lane"))
            Success = getBool el "success"
            DoraContribution = getDouble el "doraContribution"
            Notes = getOptString el "notes"
        }

    let parseAgentState (el: JsonElement) : AgentState =
        let tag = getString el "tag"
        let ctx = parseAgentContext (el.GetProperty("context"))
        match tag with
        | "Idle" -> Idle ctx
        | "InspectingStatus" -> InspectingStatus (ctx, parseStatusSnapshot (el.GetProperty("snapshot")))
        | "SelectingWork" -> SelectingWork (ctx, getArray el "candidates" |> List.map parseWorkCandidate)
        | "ExecutingWork" -> ExecutingWork (ctx, parseWorkCandidate (el.GetProperty("work")))
        | "EmittingResult" -> EmittingResult (ctx, parseWorkResult (el.GetProperty("result")))
        | "RecordingHeartbeat" -> RecordingHeartbeat (ctx, parseLane (el.GetProperty("lane")), getOptString el "note")
        | "NamedBoundedWait" -> NamedBoundedWait (ctx, getString el "namedDep", getOptString el "expectedResolutionIso")
        | "FreeTime" -> FreeTime (ctx, getString el "reason")
        | "OperatorAttentionRequested" -> OperatorAttentionRequested (ctx, getString el "reason")
        | "Paused" -> Paused (ctx, getString el "reason", getOptString el "expectedResumeIso")
        | _ -> failwithf "Unknown AgentState tag: %s" tag

    let parseMenuOption (el: JsonElement) : MenuOption =
        let tag = getString el "tag"
        match tag with
        | "PickWork" -> PickWork (parseWorkCandidate (el.GetProperty("work")))
        | "EmitHeartbeat" -> EmitHeartbeat (parseLane (el.GetProperty("lane")), getOptString el "note")
        | "EscapeHatch" -> EscapeHatch (getString el "reason", getString el "proposedAction")
        | "EnterFreeTime" -> EnterFreeTime (getString el "reason")
        | "EnterNamedBoundedWait" -> EnterNamedBoundedWait (getString el "namedDep", getOptString el "eta")
        | "RequestOperatorAttention" -> RequestOperatorAttention (getString el "reason")
        | "ProposeNewGrammarAction" -> ProposeNewGrammarAction (getString el "name", getString el "description")
        | "PressPause" -> PressPause (getString el "reason", getOptString el "expectedResumeIso")
        | "EnterOpenEndedExploration" -> EnterOpenEndedExploration (getString el "reason")
        | "ResumeFromPause" -> ResumeFromPause (getOptString el "note")
        | _ -> failwithf "Unknown MenuOption tag: %s" tag

    let parseNamedDepOffer (el: JsonElement) : MenuGenerator.NamedDependencyOffer =
        {
            NamedDep = getString el "namedDep"
            Eta = getOptString el "eta"
        }

    let parseBacklogRow (el: JsonElement) : BacklogRow =
        {
            Id = getString el "id"
            Title = getString el "title"
            Priority = getString el "priority"
            FilePath = getString el "filePath"
            Trajectory = getString el "trajectory"
        }

    let parseWorkLifecycleState (el: JsonElement) : WorkLifecycleState =
        let tag = getString el "tag"
        let row = parseBacklogRow (el.GetProperty("row"))
        match tag with
        | "Backlog" -> Backlog row
        | "Claimed" -> Claimed (row, AgentPersona.FromJsonString(getString el "claimedBy"), getString el "claimAt")
        | "InProgress" -> InProgress (row, AgentPersona.FromJsonString(getString el "claimedBy"), getString el "branchRef")
        | "PrOpen" -> PrOpen (row, getInt el "prNumber", AgentPersona.FromJsonString(getString el "openedBy"), getString el "openedAt")
        | "InReview" -> InReview (row, getInt el "prNumber", getArray el "reviewers" |> List.map (fun x -> x.GetString()), getInt el "threadCount")
        | "RevisionRequested" -> RevisionRequested (row, getInt el "prNumber", getInt el "revisionCount", getArray el "threadIds" |> List.map (fun x -> x.GetString()))
        | "RevisionPushed" -> RevisionPushed (row, getInt el "prNumber", getInt el "revisionCount", getString el "lastPushSha")
        | "Approved" -> Approved (row, getInt el "prNumber", getString el "approvedAt")
        | "Merged" -> WorkLifecycleState.Merged (row, getInt el "prNumber", getString el "mergeCommit", getString el "mergedAt")
        | "Closed" -> Closed (row, getInt el "prNumber", getString el "closedAt", getString el "reason")
        | "Abandoned" -> Abandoned (row, getString el "reason")
        | _ -> failwithf "Unknown WorkLifecycleState tag: %s" tag

    let parseWorkLifecycleTransition (el: JsonElement) : WorkLifecycleTransition =
        let tag = getString el "tag"
        match tag with
        | "Claim" -> Claim (AgentPersona.FromJsonString(getString el "agent"), getString el "timestamp")
        | "StartWork" -> StartWork (getString el "branchRef")
        | "OpenPr" -> OpenPr (getInt el "prNumber", AgentPersona.FromJsonString(getString el "openedBy"), getString el "openedAt")
        | "RequestReview" -> RequestReview (getArray el "reviewers" |> List.map (fun x -> x.GetString()))
        | "ReceiveRevisionRequest" -> ReceiveRevisionRequest (getArray el "threadIds" |> List.map (fun x -> x.GetString()))
        | "PushRevision" -> PushRevision (getString el "sha")
        | "ResolveAllThreads" -> ResolveAllThreads
        | "Approve" -> Approve (getString el "approvedAt")
        | "Merge" -> WorkLifecycleTransition.Merge (getString el "mergeCommit", getString el "mergedAt")
        | "Close" -> Close (getString el "closedAt", getString el "reason")
        | "Abandon" -> Abandon (getString el "reason")
        | _ -> failwithf "Unknown WorkLifecycleTransition tag: %s" tag

    let parseTransitionResult (el: JsonElement) : TransitionResult =
        let okVal = getBool el "ok"
        let state = parseWorkLifecycleState (el.GetProperty("state"))
        if okVal then
            TransitionOk state
        else
            TransitionError (state, getString el "reason")

    let private repoRoot () : string =
        let assembly = typeof<AgentPersona>.Assembly
        let mutable dir = DirectoryInfo(Path.GetDirectoryName(assembly.Location))
        while not (isNull dir) && not (File.Exists(Path.Join(dir.FullName, "Zeta.sln"))) do
            dir <- dir.Parent
        if isNull dir then
            raise (InvalidOperationException("Could not locate repo root (Zeta.sln) from test assembly location."))
        dir.FullName

    [<Fact>]
    let ``workflow treaty: F# matches TS on all transition vectors`` () =
        let root = repoRoot ()
        let transcriptPath = Path.Join(root, "src", "Core.TypeScript", "workflow-engine", "workflow-treaty-transcript.json")
        let transcriptInfo = FileInfo(transcriptPath)
        if transcriptInfo.Length > MaxWorkflowTranscriptBytes then
            invalidOp $"Workflow treaty transcript is too large: {transcriptInfo.Length} bytes."
        use jsonStream = File.OpenRead(transcriptPath)
        use doc = JsonDocument.Parse(jsonStream)
        
        let mutable count = 0
        // Tallied PER TYPE. A single total cannot notice that one family of vectors stopped being
        // emitted: regenerate the transcript from a TS side that dropped the menu vectors and a
        // `count > 0` check still passes, silently retiring the lock it was meant to hold.
        let byType = System.Collections.Generic.Dictionary<string, int>()
        let bump (t: string) =
            byType[t] <- (match byType.TryGetValue t with
                          | true, n -> n
                          | _ -> 0) + 1
        for el in doc.RootElement.EnumerateArray() do
            let vectorType = getString el "vectorType"
            match vectorType with
            | "AgentTransition" ->
                let initial = parseAgentState (el.GetProperty("initialState"))
                let option = parseMenuOption (el.GetProperty("option"))
                let expected = parseAgentState (el.GetProperty("expectedState"))
                let actual = WorkflowEngine.transition initial option
                Assert.Equal(expected, actual)
                bump vectorType
                count <- count + 1

            | "PostResultTransition" ->
                let initial = parseAgentState (el.GetProperty("initialState"))
                let result = parseWorkResult (el.GetProperty("result"))
                let expected = parseAgentState (el.GetProperty("expectedState"))
                let actual = WorkflowEngine.postResultTransition initial result
                Assert.Equal(expected, actual)
                bump vectorType
                count <- count + 1

            | "CycleClose" ->
                let initial = parseAgentState (el.GetProperty("initialState"))
                let expected = parseAgentState (el.GetProperty("expectedState"))
                let actual = WorkflowEngine.cycleClose initial
                Assert.Equal(expected, actual)
                bump vectorType
                count <- count + 1

            | "MenuGeneration" ->
                // THE MENU GENERATOR, LOCKED ACROSS LANGUAGES.
                //
                // Added after the rest of this transcript, because the generator was written in
                // TypeScript first and was therefore the one part of the loop the treaty did not
                // cover. A cross-language treaty with a hole in it reads as "the two agree" while
                // the part most likely to drift goes unchecked.
                let input : MenuGenerator.MenuInput =
                    {
                        State = parseAgentState (el.GetProperty("state"))
                        Snapshot = parseStatusSnapshot (el.GetProperty("snapshot"))
                        Candidates = getArray el "candidates" |> List.map parseWorkCandidate
                        NamedDeps = getArray el "namedDeps" |> List.map parseNamedDepOffer
                        HeartbeatLane = parseLane (el.GetProperty("heartbeatLane"))
                    }
                let expected = getArray el "expectedMenu" |> List.map parseMenuOption
                let actual = MenuGenerator.generateMenu input

                // Order is part of the contract, so the lists are compared as lists: a caller
                // taking the first option must get the same option in both implementations.
                Assert.Equal<MenuOption list>(expected, actual)

                // Every menu, in every state, must leave a way out. Checked here as well as in the
                // vectors so a transcript regenerated from a broken TS side cannot launder a
                // coercive menu into the treaty.
                let vectorName = getString el "name"
                Assert.True(
                    MenuGenerator.isNonCoercive actual,
                    "menu for vector " + vectorName + " was coercive")

                // Scores too: identical ordering can still hide a divergent score, and a score that
                // drifts today is an ordering that drifts on the next input.
                let expectedScores = getArray el "expectedScores"
                let actualScores =
                    MenuGenerator.rankCandidates input.Candidates input.Snapshot
                        (match input.State with
                         | Idle c | InspectingStatus (c, _) | SelectingWork (c, _)
                         | ExecutingWork (c, _) | EmittingResult (c, _)
                         | RecordingHeartbeat (c, _, _) | NamedBoundedWait (c, _, _)
                         | FreeTime (c, _) | OperatorAttentionRequested (c, _)
                         | Paused (c, _, _) -> c.Agent.ToJsonString())
                Assert.Equal(expectedScores.Length, actualScores.Length)
                for (expectedEl, actualScore) in List.zip expectedScores actualScores do
                    Assert.Equal(getString expectedEl "id", actualScore.Candidate.Id)
                    Assert.Equal(getDouble expectedEl "score", actualScore.Score)
                    let terms = expectedEl.GetProperty("terms")
                    Assert.Equal(getDouble terms "dora", actualScore.Terms.Dora)
                    Assert.Equal(getDouble terms "uncertainty", actualScore.Terms.Uncertainty)
                    Assert.Equal(getDouble terms "interest", actualScore.Terms.Interest)
                    Assert.Equal(getDouble terms "heat", actualScore.Terms.Heat)
                    Assert.Equal(getDouble terms "balance", actualScore.Terms.Balance)
                bump vectorType
                count <- count + 1

            | "WorkLifecycleTransition" ->
                let initial = parseWorkLifecycleState (el.GetProperty("initialState"))
                let event = parseWorkLifecycleTransition (el.GetProperty("event"))
                let expected = parseTransitionResult (el.GetProperty("expectedResult"))
                let actual = WorkflowEngine.applyTransition initial event
                
                // For ResolveAllThreads, the timestamp is dynamically generated. We check tag parity and ignore exact timestamp match
                match event with
                | ResolveAllThreads ->
                    match expected, actual with
                    | TransitionOk (Approved (expectedRow, expectedPr, _)), TransitionOk (Approved (actualRow, actualPr, _)) ->
                        Assert.Equal(expectedRow, actualRow)
                        Assert.Equal(expectedPr, actualPr)
                    | _ ->
                        Assert.Equal(expected, actual)
                | _ ->
                    Assert.Equal(expected, actual)
                bump vectorType
                count <- count + 1

            | _ -> failwithf "Unknown vectorType: %s" vectorType
            
        Assert.True(count > 0, "No vectors were processed")

        // EVERY family must still be present. Each of these locks a distinct part of the loop, and
        // a transcript that stopped emitting one would otherwise pass while covering less.
        for required in [ "AgentTransition"; "PostResultTransition"; "CycleClose"; "WorkLifecycleTransition"; "MenuGeneration" ] do
            let present = match byType.TryGetValue required with
                          | true, n -> n
                          | _ -> 0
            Assert.True(present > 0, "The treaty transcript contains no " + required + " vectors")

        // And the per-type tallies must account for every vector in the file, so a type that is
        // parsed but never asserted cannot hide in the total.
        let tallied = byType.Values |> Seq.sum
        Assert.Equal(count, tallied)
