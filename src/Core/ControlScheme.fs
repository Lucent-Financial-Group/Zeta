namespace Zeta.Core

open System
open System.Globalization

/// ControlScheme — **control schemes are ZetaId-addressed artifacts, and every device is SECOND to
/// the universal action grammar** (Aaron 2026-06-11: "make sure our zetaids are capable of expressing
/// control schemes — gamepad, keyboard — all are 2nd to our universal action grammar; that's where
/// the mappings come from").
///
/// The shared cross-domain object is `ControlScheme.Action`, not `ActionGrammar.Action`'s 4x4
/// held-key lattice. CHIP-8/9 and Atari are finite discrete schemes; ARC also carries a coordinate
/// field, represented by `Point` rather than compressed into a controller cell.
///
/// The law: the GRAMMAR owns the action set (the canonical things a citizen can MEAN — the compass
/// from the four corners, select/back, conference, the raw CHIP-9 pad); a SCHEME is a total mapping
/// from one device's physical inputs INTO that set — never past it. Schemes are registered with
/// content-addressed ZetaIds (GeneratorRegistry — same id everywhere; version bump = new id), so a
/// cartridge's `io`/`button` lines can reference a control scheme BY ID and any host resolves the
/// same mapping. Portability is the theorem: dpad-up ≡ 'w' ≡ pad-5 — different fingers, one meaning.
[<RequireQualifiedAccess>]
module ControlScheme =

    /// THE GRAMMAR'S ACTION SET — the canonical meanings (devices map into these, the wire form is
    /// the crossing payload the rooms already speak).
    type Action =
        | Go of string // the compass: "n" | "s" | "e" | "w" (the four corners) | "hottest" | "self"
        | Select
        | Back
        | Conference
        | Pad of int // the raw CHIP-9 16-key pass-through (0x0..0xF)
        | Point of x: int * y: int // a coordinate-valued action (ARC ACTION6, mouse click, touch)

    /// The crossing payload an action means (the wire the rooms speak — go:/key: precedents).
    let payload (a: Action) : string =
        match a with
        | Go d -> "go:" + d
        | Select -> "ui:select"
        | Back -> "ui:back"
        | Conference -> "ui:conference"
        | Pad k -> SoftChip8Flux.encodeKey (k &&& 0xF) true
        | Point(x, y) ->
            "point:"
            + x.ToString(CultureInfo.InvariantCulture)
            + ":"
            + y.ToString(CultureInfo.InvariantCulture)

    /// A data-defined coordinate-bearing physical input. The accepted spelling is
    /// `<prefix>:<x>:<y>` with canonical invariant-culture integers inside the declared bounds.
    type PointInput =
        { Prefix: string
          Width: int
          Height: int }

    /// A scheme: a named, versioned, ZetaId-addressed device mapping into the grammar.
    type Scheme =
        { Name: string
          Version: int
          ZetaId: string
          Map: Map<string, Action>
          PointInput: PointInput option }

    let private mk
        (name: string)
        (version: int)
        (pointInput: PointInput option)
        (map: (string * Action) list)
        : Scheme =
        { Name = name
          Version = version
          ZetaId = GeneratorRegistry.idOf name version
          Map = Map.ofList map
          PointInput = pointInput }

    /// The CHIP-9 16-key pad (the atom's native scheme — keys pass through; 5/8/7/9 double as compass).
    let chip9Pad: Scheme =
        mk "control.chip9-pad" 1 None
            ([ for k in 0..15 -> sprintf "%x" k, Pad k ]
             @ [ "5", Go "n"; "8", Go "s"; "7", Go "w"; "9", Go "e" ])

    /// Keyboard WASD (+ enter/esc/c/h/.) — the desk scheme.
    let keyboardWasd: Scheme =
        mk "control.keyboard-wasd" 1 None
            [ "w", Go "n"; "s", Go "s"; "a", Go "w"; "d", Go "e"
              "h", Go "hottest"; ".", Go "self"
              "enter", Select; "esc", Back; "c", Conference ]

    /// The standard gamepad — dpad to the compass, face buttons to the verbs.
    let gamepadStandard: Scheme =
        mk "control.gamepad-standard" 1 None
            [ "dpad-up", Go "n"; "dpad-down", Go "s"; "dpad-left", Go "w"; "dpad-right", Go "e"
              "a", Select; "b", Back; "y", Conference; "x", Go "hottest" ]

    /// ARC-AGI-3's seven atomic actions plus ACTION6's 64x64 coordinate field.
    /// RESET is the control-plane transition; ACTION7 is the environment's undo/back action.
    let arcAgi3: Scheme =
        mk
            "control.arc-agi-3"
            1
            (Some
                { Prefix = "ACTION6"
                  Width = 64
                  Height = 64 })
            [ "RESET", Conference
              "ACTION1", Go "n"
              "ACTION2", Go "s"
              "ACTION3", Go "w"
              "ACTION4", Go "e"
              "ACTION5", Select
              "ACTION7", Back ]

    /// Atari 2600's complete 18-action ALE set. Direction+fire remains one discrete action;
    /// `+select` keeps it distinct from both the direction-only and fire-only meanings.
    let atari2600: Scheme =
        let directions =
            [ "UP", "n"
              "RIGHT", "e"
              "LEFT", "w"
              "DOWN", "s"
              "UPRIGHT", "ne"
              "UPLEFT", "nw"
              "DOWNRIGHT", "se"
              "DOWNLEFT", "sw" ]

        mk
            "control.atari-2600"
            1
            None
            ([ "NOOP", Go "stay"; "FIRE", Select ]
             @ [ for input, direction in directions -> input, Go direction ]
             @ [ for input, direction in directions -> input + "FIRE", Go(direction + "+select") ])

    /// The registered schemes (the shelf — each referenceable by its ZetaId from io/button lines).
    let known: Scheme list = [ chip9Pad; keyboardWasd; gamepadStandard; arcAgi3; atari2600 ]

    /// Resolve a scheme by ZetaId (the cartridge's direction).
    let byId (zetaId: string) : Scheme option =
        known |> List.tryFind (fun s -> s.ZetaId = zetaId)

    let private tryParseCoordinate (text: string) : int option =
        match Int32.TryParse(text, NumberStyles.None, CultureInfo.InvariantCulture) with
        | true, value -> Some value
        | false, _ -> None

    let private translatePoint (spec: PointInput) (input: string) : Action option =
        match input.Split([| ':' |], StringSplitOptions.None) with
        | [| prefix; xText; yText |] when String.Equals(prefix, spec.Prefix, StringComparison.Ordinal) ->
            match tryParseCoordinate xText, tryParseCoordinate yText with
            | Some x, Some y when x >= 0 && x < spec.Width && y >= 0 && y < spec.Height ->
                let canonical =
                    spec.Prefix
                    + ":"
                    + x.ToString(CultureInfo.InvariantCulture)
                    + ":"
                    + y.ToString(CultureInfo.InvariantCulture)

                if String.Equals(input, canonical, StringComparison.Ordinal) then
                    Some(Point(x, y))
                else
                    None
            | _ -> None
        | _ -> None

    /// Translate one physical input under a scheme — None = unmapped or malformed (honest; never invented).
    let translate (s: Scheme) (input: string) : Action option =
        if isNull input then
            None
        else
            Map.tryFind input s.Map
            |> Option.orElseWith (fun () -> s.PointInput |> Option.bind (fun spec -> translatePoint spec input))

    /// The wire crossing for a physical input under a scheme (the whole pipeline in one call).
    let crossing (s: Scheme) (input: string) : string option =
        translate s input |> Option.map payload
