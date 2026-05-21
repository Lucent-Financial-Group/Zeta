namespace Zeta.Core

open System

[<Measure>] type ms
[<Measure>] type ns

[<RequireQualifiedAccess>]
type IdVersion = V1 = 1

[<RequireQualifiedAccess>]
type Chromosome =
    | MetaCoherence = 0
    | FinancialIntegrity = 7

[<RequireQualifiedAccess>]
type Category =
    | Observation = 0
    | Emission = 1
    | Workflow = 2
    | Heartbeat = 3

[<RequireQualifiedAccess>]
type Firefly = NoDirective = 1

[<RequireQualifiedAccess>]
type Authority =
    | HumanVerified | TrustedAgent | Standard | BestEffort | Simulated
    | Raw of byte

module Authority =
    let toByte = function
        | Authority.HumanVerified -> 31uy
        | Authority.TrustedAgent  -> 20uy
        | Authority.Standard      -> 15uy
        | Authority.BestEffort    -> 8uy
        | Authority.Simulated     -> 3uy
        | Authority.Raw b         -> b

[<RequireQualifiedAccess>]
type Momentum =
    | Background | Normal | Elevated | High | Critical
    | Raw of byte

module Momentum =
    let toByte = function
        | Momentum.Background -> 32uy
        | Momentum.Normal     -> 96uy
        | Momentum.Elevated   -> 160uy
        | Momentum.High       -> 224uy
        | Momentum.Critical   -> 248uy
        | Momentum.Raw b      -> b

[<RequireQualifiedAccess>]
type Persona =
    | Aaron = 1
    | FireflyCoherence = 2

[<RequireQualifiedAccess>]
type LocationHint =
    | EastUS_VA1 = 1
    | WestUS_CA3 = 2

type ZetaObservation = {
    Version: IdVersion
    Timestamp: int64<ms>
    Chromosome: Chromosome
    Category: Category
    Firefly: Firefly
    Authority: Authority
    Persona: Persona
    Momentum: Momentum
    Location: LocationHint
}
