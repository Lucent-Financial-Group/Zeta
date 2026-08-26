namespace Zeta.Bayesian.Tests

open System
open Xunit
open FsCheck
open FsCheck.Xunit
open Zeta.Bayesian

module ThousandBrainsTests =

    [<Fact>]
    let ``TB-1: New column has zero IV and uninformative prior`` () =
        let col = ThousandBrains.createColumn "C1"
        Assert.Equal(0.0, float col.AccumulatedIV)
        Assert.Equal(0.0, col.Belief.Precision)
        Assert.Equal(0.0, col.Belief.PrecisionMean)

    [<Fact>]
    let ``TB-2: Observation increases accumulated IV`` () =
        let col = ThousandBrains.createColumn "C1"
        let obs = { Gaussian.PrecisionMean = 1.0; Precision = 1.0 }
        
        let updatedCol = ThousandBrains.observe col obs
        
        Assert.True(float updatedCol.AccumulatedIV > 0.0, "IV should increase after informative observation")
        Assert.Equal(1.0, updatedCol.Belief.Precision)

    [<Fact>]
    let ``TB-3: Voting weight scales logarithmically with IV`` () =
        let colLow = { ThousandBrains.createColumn "C1" with AccumulatedIV = 10.0<InformationValue.iv> }
        let colHigh = { ThousandBrains.createColumn "C2" with AccumulatedIV = 100.0<InformationValue.iv> }
        
        let voteLow = ThousandBrains.castVote colLow
        let voteHigh = ThousandBrains.castVote colHigh
        
        Assert.True(voteHigh.Weight > voteLow.Weight, "Higher IV should yield higher voting weight")
        // 100 is 10x larger than 10, but log weight should be less than 10x larger
        Assert.True(voteHigh.Weight < voteLow.Weight * 10.0, "Weight scaling should be sub-linear (logarithmic)")

    [<Fact>]
    let ``TB-4: Consensus weights beliefs by IV`` () =
        // Column 1 is highly experienced (high IV) and votes YES (mean = 1.0)
        let col1 = 
            { ThousandBrains.createColumn "C1" with 
                AccumulatedIV = 1000.0<InformationValue.iv>
                Belief = { Gaussian.PrecisionMean = 1.0; Precision = 1.0 } }
                
        // Column 2 is inexperienced (low IV) and votes NO (mean = -1.0)
        let col2 = 
            { ThousandBrains.createColumn "C2" with 
                AccumulatedIV = 1.0<InformationValue.iv>
                Belief = { Gaussian.PrecisionMean = -1.0; Precision = 1.0 } }
                
        let votes = [ ThousandBrains.castVote col1; ThousandBrains.castVote col2 ]
        let consensus = ThousandBrains.computeConsensus votes
        
        // The consensus mean should be pulled toward the highly experienced column
        let consensusMean = consensus.PrecisionMean / consensus.Precision
        Assert.True(consensusMean > 0.0, "Consensus should lean toward the higher-IV column")

    [<Fact>]
    let ``TB-5: Lattice reaches consensus when joint precision crosses threshold`` () =
        let col1 = 
            { ThousandBrains.createColumn "C1" with 
                AccumulatedIV = 10.0<InformationValue.iv>
                Belief = { Gaussian.PrecisionMean = 2.0; Precision = 2.0 } } // mean = 1.0
                
        let col2 = 
            { ThousandBrains.createColumn "C2" with 
                AccumulatedIV = 10.0<InformationValue.iv>
                Belief = { Gaussian.PrecisionMean = 2.0; Precision = 2.0 } } // mean = 1.0
                
        let votes = [ ThousandBrains.castVote col1; ThousandBrains.castVote col2 ]
        
        // Weight = ln(11) ≈ 2.4
        // Joint Precision = 2.0 * 2.4 + 2.0 * 2.4 = 9.6
        
        let undecidedResult = ThousandBrains.evaluateLattice votes 10.0
        let decidedResult = ThousandBrains.evaluateLattice votes 9.0
        
        match undecidedResult with
        | LocalConsensus.Undecided _ -> ()
        | _ -> Assert.Fail("Should be Undecided")
        
        match decidedResult with
        | LocalConsensus.ResolvedYes _ -> ()
        | _ -> Assert.Fail("Should be ResolvedYes")

    [<Property>]
    let ``TB-6: Consensus precision is strictly non-negative`` (pairs: (NormalFloat * NormalFloat) list) =
        // Generate a list of valid votes from paired floats
        let validPairs = 
            pairs
            |> List.map (fun (w, p) -> abs (float w) + 0.01, abs (float p))
            
        let votes = 
            validPairs |> List.mapi (fun i (w, p) ->
                { ThousandBrains.Vote.ColumnId = sprintf "C%d" i
                  ThousandBrains.Vote.Belief = { Gaussian.PrecisionMean = 0.0; Precision = p }
                  ThousandBrains.Vote.Weight = w })
                  
        let consensus = ThousandBrains.computeConsensus votes
        consensus.Precision >= 0.0

    // ── Spatial columns: belief about a location in a frame ─────────────────
    //
    // THE QUESTION THESE ANSWER, before any geometric machinery is committed to:
    // does believing about a VECTOR buy anything over believing about scalars?
    // The work-item asked for that to be established first, and TB-8 below is the
    // answer — it does not, on its own. What buys something is the FRAME.

    let private bits (x: float) = BitConverter.DoubleToInt64Bits x

    let private unwrapR = function Ok v -> v | Error e -> failwith (string e)

    let private g (mu: float) (v: float) = Gaussian.ofMeanVariance mu v

    /// Typed constructors. `ColumnId` and `Weight` exist on both `Vote` and
    /// `SpatialVote`, so an unannotated record literal resolves to whichever the
    /// compiler saw first — these make the intent explicit rather than relying on
    /// declaration order.
    let private scalarVote (id: string) (belief: Gaussian) (w: float) : ThousandBrains.Vote =
        { ColumnId = id; Belief = belief; Weight = w }

    let private spatialVote
        (id: string)
        (frame: string)
        (axes: Gaussian array)
        (w: float)
        : ThousandBrains.SpatialVote =
        { ColumnId = id; Belief = { Frame = frame; Axes = axes }; Weight = w }

    [<Fact>]
    let ``TB-6: a one-axis spatial pool is bit-identical to the scalar pool`` () =
        // The generalisation must contain the thing it generalises. Same weights,
        // same beliefs, one axis — the numbers may not move by a single bit.
        let scalarVotes =
            [ scalarVote "a" (g 1.0 0.5) 0.7
              scalarVote "b" (g -2.0 2.0) 1.3
              scalarVote "c" (g 0.25 0.125) 0.2 ]
        let spatialVotes =
            scalarVotes |> List.map (fun v -> spatialVote v.ColumnId "cup" [| v.Belief |] v.Weight)
        let scalar = ThousandBrains.computeConsensus scalarVotes
        let spatial = ThousandBrains.spatialConsensus spatialVotes |> unwrapR
        Assert.Equal(1, spatial.Axes.Length)
        Assert.Equal(bits scalar.Precision, bits spatial.Axes.[0].Precision)
        Assert.Equal(bits scalar.PrecisionMean, bits spatial.Axes.[0].PrecisionMean)

    [<Fact>]
    let ``TB-7: IV over a one-axis location equals the scalar column's IV`` () =
        // KL divergence is additive over independent components, so a one-axis
        // location must be worth exactly what the scalar is worth. If this drifts,
        // the summing in `observeSpatial` is not the additivity it claims to be.
        let scalar = ThousandBrains.observe (ThousandBrains.createColumn "s") (g 3.0 0.5)
        let spatial =
            ThousandBrains.observeSpatial
                (ThousandBrains.createSpatialColumn "s" "cup" 1)
                { Frame = "cup"; Axes = [| g 3.0 0.5 |] }
            |> unwrapR
        Assert.Equal(bits (float scalar.AccumulatedIV), bits (float spatial.AccumulatedIV))

    [<Fact>]
    let ``TB-8: with independent axes, vector voting IS per-axis scalar voting`` () =
        // THE RESULT THE ROW ASKED FOR, and it is a negative one worth having
        // before any Clifford machinery is built: a pool of independent per-axis
        // Gaussians decomposes exactly. Running three scalar pools and stacking
        // the answers gives the SAME BITS as running one three-axis pool.
        //
        // So "believe about a vector instead of a number" buys nothing by itself.
        // The payoff, if there is one, has to come from something the scalar
        // formulation cannot express — a frame that refuses to pool (TB-9), or
        // correlation between axes, which this representation does not carry.
        let dims = 3
        let cols = [ "a", 0.7; "b", 1.3; "c", 0.2 ]
        let axisBelief (name: string) (axis: int) =
            g (float axis * 1.5 + float name.[0]) (0.25 + float axis * 0.1)

        let stacked =
            [ 0 .. dims - 1 ]
            |> List.map (fun axis ->
                cols
                |> List.map (fun (n, w) -> scalarVote n (axisBelief n axis) w)
                |> ThousandBrains.computeConsensus)

        let jointly =
            cols
            |> List.map (fun (n, w) -> spatialVote n "cup" (Array.init dims (axisBelief n)) w)
            |> ThousandBrains.spatialConsensus
            |> unwrapR

        for axis in 0 .. dims - 1 do
            Assert.Equal(bits stacked.[axis].Precision, bits jointly.Axes.[axis].Precision)
            Assert.Equal(bits stacked.[axis].PrecisionMean, bits jointly.Axes.[axis].PrecisionMean)

    [<Fact>]
    let ``TB-9: pooling across reference frames is REFUSED, and names who disagreed`` () =
        // What the frame tag is FOR. A location in the frame of a cup and a
        // location in the frame of the table it stands on are different
        // quantities; averaging them is a category error, and a plausible-looking
        // average is the silent wrong answer this type exists to prevent.
        let votes =
            [ spatialVote "a" "cup" [| g 1.0 0.5 |] 1.0
              spatialVote "b" "table" [| g 1.0 0.5 |] 1.0 ]
        match ThousandBrains.spatialConsensus votes with
        | Ok _ -> failwith "pooled a cup-frame belief with a table-frame belief"
        | Error e ->
            Assert.Contains("reference frames", e)
            Assert.Contains("b", e)
            Assert.Contains("table", e)

    [<Fact>]
    let ``TB-10: mismatched dimensions are REFUSED, not zero-padded`` () =
        let votes =
            [ spatialVote "a" "cup" [| g 1.0 0.5; g 2.0 0.5 |] 1.0
              spatialVote "b" "cup" [| g 1.0 0.5 |] 1.0 ]
        match ThousandBrains.spatialConsensus votes with
        | Ok _ -> failwith "pooled a 2-axis belief with a 1-axis belief"
        | Error e -> Assert.Contains("dimensions", e)

    [<Fact>]
    let ``TB-11: observing in the wrong frame is REFUSED`` () =
        let col = ThousandBrains.createSpatialColumn "c" "cup" 2
        match ThousandBrains.observeSpatial col { Frame = "table"; Axes = [| g 1.0 0.5; g 2.0 0.5 |] } with
        | Ok _ -> failwith "absorbed a table-frame observation into a cup-frame column"
        | Error e -> Assert.Contains("frame mismatch", e)
