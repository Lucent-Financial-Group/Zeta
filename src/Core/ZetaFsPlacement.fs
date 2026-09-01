namespace Zeta.Core

open System
open System.Buffers.Binary
open Zeta.Core.FSharp.Blake3

/// Placement as HRW over named device ids (PR8 / E9).
/// Beacon: Thaler–Ravishankar HRW 1998; SplitMix64 mixer.
/// `RendezvousHash.Pick(key, n)` is integer slots — do not call it here.
/// Polyfill `.zetafs` is `single` only. stripe/mirror/single+parity are
/// this function + simulated-disk falsifiers, not two files on APFS.
module ZetaFsPlacement =

    [<Struct>]
    type DeviceId = { Raw: System.UInt128 }

    module DeviceId =
        let ofRaw (raw: System.UInt128) : DeviceId = { Raw = raw }

        let compare (a: DeviceId) (b: DeviceId) : int = compare a.Raw b.Raw

    type Role =
        | Data of index: int
        | Parity of index: int

    type Extent =
        { Device: DeviceId
          Role: Role }

    type Assignment =
        { Profile: ZetaFsPolicy.PlacementProfile
          Extents: Extent[] }

    type PlaceError =
        | NoDevices
        | NeedTwoDisks of ZetaFsPolicy.PlacementProfile

    /// Host-directory polyfill is one filesystem. Not RAID.
    let polyfillProfile = ZetaFsPolicy.PlacementProfile.Single

    /// HRW score: mix(hash(ContentId), hash(deviceId)). Named buckets.
    let score (content: ContentHash256) (device: DeviceId) : uint64 =
        let c0 = BinaryPrimitives.ReadUInt64LittleEndian(ReadOnlySpan<byte>(content.Raw, 0, 8))
        let c1 = BinaryPrimitives.ReadUInt64LittleEndian(ReadOnlySpan<byte>(content.Raw, 8, 8))
        let d0 = uint64 device.Raw
        let d1 = uint64 (device.Raw >>> 64)
        SplitMix64.mix (c0 ^^^ d0 ^^^ SplitMix64.mix (c1 ^^^ d1))

    let private ranked (content: ContentHash256) (devices: DeviceId[]) : DeviceId[] =
        let copy = Array.copy devices

        Array.sortInPlaceWith
            (fun a b ->
                match compare (score content b) (score content a) with
                | 0 -> DeviceId.compare a b
                | c -> c)
            copy

        copy

    let assign
        (content: ContentHash256)
        (profile: ZetaFsPolicy.PlacementProfile)
        (devices: DeviceId[])
        : Result<Assignment, PlaceError> =
        if isNull devices || devices.Length = 0 then
            Error PlaceError.NoDevices
        else
            let order = ranked content devices

            match profile with
            | ZetaFsPolicy.PlacementProfile.Single ->
                Ok
                    { Profile = profile
                      Extents = [| { Device = order.[0]; Role = Role.Data 0 } |] }
            | ZetaFsPolicy.PlacementProfile.Stripe ->
                if devices.Length < 2 then
                    Error(PlaceError.NeedTwoDisks profile)
                else
                    Ok
                        { Profile = profile
                          Extents =
                            [| for i in 0 .. order.Length - 1 ->
                                   { Device = order.[i]
                                     Role = Role.Data i } |] }
            | ZetaFsPolicy.PlacementProfile.Mirror ->
                if devices.Length < 2 then
                    Error(PlaceError.NeedTwoDisks profile)
                else
                    Ok
                        { Profile = profile
                          Extents =
                            [| { Device = order.[0]; Role = Role.Data 0 }
                               { Device = order.[1]; Role = Role.Data 0 } |] }
            | ZetaFsPolicy.PlacementProfile.SinglePlusParity ->
                // One device, two data regions + one parity region (sector/die, not whole-disk).
                let d = order.[0]

                Ok
                    { Profile = profile
                      Extents =
                        [| { Device = d; Role = Role.Data 0 }
                           { Device = d; Role = Role.Data 1 }
                           { Device = d; Role = Role.Parity 0 } |] }

    let xorInto (dest: byte[]) (src: byte[]) =
        let n = min dest.Length src.Length
        let mutable i = 0

        while i < n do
            dest.[i] <- dest.[i] ^^^ src.[i]
            i <- i + 1

    let split2 (bytes: byte[]) : byte[] * byte[] =
        let mid = (bytes.Length + 1) / 2
        let a = Array.zeroCreate mid
        let b = Array.zeroCreate mid
        let n0 = min mid bytes.Length
        if n0 > 0 then
            Buffer.BlockCopy(bytes, 0, a, 0, n0)
        if bytes.Length > mid then
            Buffer.BlockCopy(bytes, mid, b, 0, bytes.Length - mid)
        a, b

    let join2 (a: byte[]) (b: byte[]) (total: int) : byte[] =
        let dest = Array.zeroCreate total
        let n0 = min a.Length total
        if n0 > 0 then
            Buffer.BlockCopy(a, 0, dest, 0, n0)
        let n1 = min b.Length (total - n0)
        if n1 > 0 then
            Buffer.BlockCopy(b, 0, dest, n0, n1)
        dest

    /// Reconstruct k=2 data + 1 XOR parity. At most one of three may be missing.
    let tryXorRepair (d0: byte[] option) (d1: byte[] option) (parity: byte[] option) : byte[] option * byte[] option =
        match d0, d1, parity with
        | Some a, Some b, _ -> Some a, Some b
        | None, Some b, Some p ->
            let a = Array.copy p
            xorInto a b
            Some a, Some b
        | Some a, None, Some p ->
            let b = Array.copy p
            xorInto b a
            Some a, Some b
        | _ -> None, None
