namespace Zeta.Core

/// MenuGenerator — `(status_surface, current_state) -> MenuOption list`.
///
/// ── WHY THIS EXISTS IN F# ────────────────────────────────────────────────────
/// `WorkflowEngine.transition` is documented as total and defensive *because* a menu generator is
/// supposed to offer only valid options at each state. That generator was built in TypeScript
/// first, which left the newest and most load-bearing part of the agent loop as the ONE part with
/// no F# counterpart — and therefore outside `workflow-treaty-transcript.json`, the byte-lock that
/// keeps the two implementations honest about `transition`, `postResultTransition`, `cycleClose`
/// and `applyTransition`.
///
/// A cross-language treaty with a hole in it is the vacuity class at the level of the treaty: it
/// reads as "the two implementations agree" while the part most likely to drift is unchecked.
///
/// ── THE THREE PROPERTIES ARE THE CONTRACT ────────────────────────────────────
/// From the agent-loop README, which states them as acceptance criteria:
///
///   - a menu omitting valid options is COERCIVE
///   - a menu including irrelevant options is NOISE
///   - a menu aligned with state + agent-interest + operator-priorities is SUBSTRATE
///
/// So: the free modes and escape hatches appear on EVERY menu unconditionally; `ResumeFromPause`
/// appears only when paused; a wait is offered only for a dependency that can be NAMED; and
/// scoring decides the ORDER of `PickWork` and nothing else. Ordering is advice; filtering is
/// authority.
///
/// ── EXACT PARITY NOTES (what makes the byte-lock hold) ───────────────────────
/// * The score is summed in the SAME left-associative order as the TypeScript, because IEEE-754
///   addition is not associative and a reordered sum can differ in the last bit.
/// * Ties break by ORDINAL string comparison. `String.CompareOrdinal`, never `String.Compare` —
///   `.claude/rules/culture-invariant-by-default.md`, and the same fix was applied to the TS side,
///   which had been using the culture-sensitive `localeCompare`.
/// * Time never enters: no clock is read here. An ETA arrives from the caller or is absent.
module MenuGenerator =

    open System

    /// A dependency the caller can NAME.
    ///
    /// `EnterNamedBoundedWait` is offered only for these, because holding with no named dependency
    /// IS the standing-by failure. Offering "wait for nothing" would make that failure a
    /// first-class menu choice.
    type NamedDependencyOffer = {
        NamedDep: string
        /// Absent means unknown. Never defaulted — a guessed ETA reads as a commitment.
        Eta: string option
    }

    type MenuInput = {
        State: AgentState
        Snapshot: StatusSnapshot
        /// What could be worked on. Empty is normal and is not an error.
        Candidates: WorkCandidate list
        /// Dependencies nameable right now. Empty means no wait is offerable.
        NamedDeps: NamedDependencyOffer list
        /// The lane a heartbeat is filed under when the state has no work of its own.
        HeartbeatLane: Lane
    }

    type ScoreTerms = {
        Dora: double
        Uncertainty: double
        Interest: double
        Heat: double
        Balance: double
    }

    type ScoredCandidate = {
        Candidate: WorkCandidate
        Score: double
        /// The terms, kept separate so the number is never the whole answer.
        Terms: ScoreTerms
    }

    /// Weights. Named so a caller can see what the ordering is made of.
    [<Literal>]
    let WeightDora = 1.0

    [<Literal>]
    let WeightUncertainty = 0.5

    [<Literal>]
    let WeightInterest = 0.5

    [<Literal>]
    let WeightHeat = 0.75

    [<Literal>]
    let WeightBalance = 0.25

    /// How far from a balanced portfolio an agent may drift before the balance term bites.
    [<Literal>]
    let TargetOperationalRatio = 0.5

    let private clamp01 (n: double) : double =
        if Double.IsNaN n || Double.IsInfinity n then 0.0
        else max 0.0 (min 1.0 n)

    /// Is this candidate operational work, or substrate work?
    ///
    /// THE RULE IS THE CLASSIFIER'S. `dora-classify` counts the `operational` lane alone toward an
    /// author's operational ratio; `backlog-row` is a lane of its own and does not contribute.
    /// Including it here would be a second definition of the same word, and the balance term would
    /// push against the very ratio that produced it.
    let isOperationalLane (lane: Lane) : bool =
        match lane with
        | Operational -> true
        | _ -> false

    /// Score one candidate. Higher sorts earlier; NOTHING is removed by scoring.
    let scoreCandidate (candidate: WorkCandidate) (snapshot: StatusSnapshot) (agentId: string) : ScoredCandidate =
        let dora = clamp01 candidate.EstimatedDoraContribution
        // UP, not down. A bug is reducible uncertainty and finding it exposes value.
        let uncertainty = clamp01 candidate.Uncertainty
        let interest = clamp01 candidate.AgentInterest

        // Three-way, not boolean: hot pulls up, cooling pushes down, and a trajectory on neither
        // list is neutral rather than assumed cold.
        let baseHeat =
            if List.contains candidate.Id snapshot.HotTrajectories then 1.0
            elif List.contains candidate.Id snapshot.CoolingTrajectories then 0.0
            else 0.5

        // Sunset work is being wound down, whatever the trajectory's heat says.
        let heat =
            match candidate.TrajectoryPhase with
            | Sunset -> min baseHeat 0.25
            | _ -> baseHeat

        // The two-mandate balance: how much this candidate moves the agent TOWARD an even split.
        let balance =
            match Map.tryFind agentId snapshot.PerAgentRatios with
            | Some ratio when not (Double.IsNaN ratio) && not (Double.IsInfinity ratio) ->
                let overOperational = ratio > TargetOperationalRatio
                if isOperationalLane candidate.Lane = overOperational then 0.0 else 1.0
            | _ -> 0.5

        // Summed in the SAME order as the TypeScript. IEEE-754 addition is not associative.
        let score =
            WeightDora * dora
            + WeightUncertainty * uncertainty
            + WeightInterest * interest
            + WeightHeat * heat
            + WeightBalance * balance

        { Candidate = candidate
          Score = score
          Terms =
            { Dora = dora
              Uncertainty = uncertainty
              Interest = interest
              Heat = heat
              Balance = balance } }

    /// Score and order. Ties break on id ORDINALLY, so the ordering is total and replayable.
    let rankCandidates
        (candidates: WorkCandidate list)
        (snapshot: StatusSnapshot)
        (agentId: string)
        : ScoredCandidate list =
        candidates
        |> List.map (fun c -> scoreCandidate c snapshot agentId)
        |> List.sortWith (fun a b ->
            if a.Score <> b.Score then compare b.Score a.Score
            else String.CompareOrdinal(a.Candidate.Id, b.Candidate.Id))

    let private agentOf (state: AgentState) : string =
        let ctx =
            match state with
            | Idle c -> c
            | InspectingStatus (c, _) -> c
            | SelectingWork (c, _) -> c
            | ExecutingWork (c, _) -> c
            | EmittingResult (c, _) -> c
            | RecordingHeartbeat (c, _, _) -> c
            | NamedBoundedWait (c, _, _) -> c
            | FreeTime (c, _) -> c
            | OperatorAttentionRequested (c, _) -> c
            | Paused (c, _, _) -> c
        ctx.Agent.ToJsonString()

    /// The lane a heartbeat is filed under, when the state knows one of its own.
    let private laneOf (state: AgentState) (fallback: Lane) : Lane =
        match state with
        | ExecutingWork (_, work) -> work.Lane
        | EmittingResult (_, result) -> result.Lane
        | RecordingHeartbeat (_, lane, _) -> lane
        | _ -> fallback

    /// THE FREE MODES AND THE ESCAPE HATCHES — on every menu, in every state.
    ///
    /// Unconditional by construction, and deliberately not parameterised: there is no argument that
    /// removes them, so no future caller can gate them by passing something. That is the difference
    /// between an invariant and a default.
    let private alwaysOffered () : MenuOption list =
        [ EnterFreeTime "chosen rest"
          EnterOpenEndedExploration "exploration"
          EscapeHatch ("no menu option fits", "describe what to do instead")
          ProposeNewGrammarAction ("new-action", "propose a new grammar action")
          RequestOperatorAttention "operator needed at a named decision point" ]

    /// The options that must be present on EVERY menu, as data.
    let neverGatedTags : string list =
        [ "EnterFreeTime"
          "EnterOpenEndedExploration"
          "EscapeHatch"
          "ProposeNewGrammarAction"
          "RequestOperatorAttention" ]

    let tagOf (option: MenuOption) : string =
        match option with
        | PickWork _ -> "PickWork"
        | EmitHeartbeat _ -> "EmitHeartbeat"
        | EscapeHatch _ -> "EscapeHatch"
        | EnterFreeTime _ -> "EnterFreeTime"
        | EnterNamedBoundedWait _ -> "EnterNamedBoundedWait"
        | RequestOperatorAttention _ -> "RequestOperatorAttention"
        | ProposeNewGrammarAction _ -> "ProposeNewGrammarAction"
        | PressPause _ -> "PressPause"
        | EnterOpenEndedExploration _ -> "EnterOpenEndedExploration"
        | ResumeFromPause _ -> "ResumeFromPause"

    /// Does this menu satisfy the non-coercion invariant?
    let isNonCoercive (menu: MenuOption list) : bool =
        let tags = menu |> List.map tagOf |> Set.ofList
        neverGatedTags |> List.forall (fun t -> Set.contains t tags)

    /// Build the menu.
    ///
    /// Ordering within the result is meaningful: work first when there is work, then the ways to
    /// record or wait, then the free modes and hatches. A caller taking the first option gets the
    /// highest-scoring real work, and everything else is still there.
    let generateMenu (input: MenuInput) : MenuOption list =
        match input.State with
        | Paused _ ->
            // NOISE CONTROL: a paused agent is not choosing work. Offering `PickWork` would let the
            // loop step over an explicit cessation, and `PressPause` would be an option to do what
            // is already done. The way out comes first.
            ResumeFromPause None :: alwaysOffered ()
        | _ ->
            // The item already being executed is not offered again: `PickWork` on the current work
            // transitions ExecutingWork -> ExecutingWork with the same item, a no-op that reads as
            // a choice, so a loop taking the top option can spin on it while appearing to act.
            let inFlight =
                match input.State with
                | ExecutingWork (_, work) -> Some work.Id
                | _ -> None

            let picks =
                rankCandidates input.Candidates input.Snapshot (agentOf input.State)
                |> List.filter (fun scored -> Some scored.Candidate.Id <> inFlight)
                |> List.map (fun scored -> PickWork scored.Candidate)

            let heartbeat = [ EmitHeartbeat (laneOf input.State input.HeartbeatLane, None) ]

            // A wait is offered ONLY for a dependency that can be named.
            let waits =
                input.NamedDeps
                |> List.map (fun dep -> EnterNamedBoundedWait (dep.NamedDep, dep.Eta))

            picks @ heartbeat @ waits @ [ PressPause ("explicit cessation", None) ] @ alwaysOffered ()
