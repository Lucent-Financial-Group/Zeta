namespace Zeta.Benchmarks

open System
open BenchmarkDotNet.Attributes
open Zeta.Core

/// Volume-path harness (PR9). Unencrypted control vs explicit-nonce GCM.
/// OpenZFS dataset encryption and LUKS+ext4 are named baselines, not hooked.
/// Numbers from this bench stay unmetered until dogfood. Do not copy them
/// into README.
[<MemoryDiagnoser>]
type ZetaFsVolumeCryptoBench() =

    let key = Array.init 32 (fun i -> byte i)
    let mutable session: ZetaFsCrypto.Session option = None
    let mutable payload = Array.empty<byte>

    [<GlobalSetup>]
    member _.Setup() =
        match ZetaFsCrypto.sessionFromVaultKey 1u key with
        | Ok s -> session <- Some s
        | Error e -> failwith (ZetaFsCrypto.errorName e)

        payload <- Array.init 4096 (fun i -> byte i)

    [<Benchmark(Baseline = true)>]
    member _.UnencryptedControl() =
        payload.Length |> ignore

    [<Benchmark>]
    member _.ExplicitNonceGcmSealOpen() =
        let s = session.Value
        match ZetaFsCrypto.sealLog s 1L payload with
        | Error e -> failwith (ZetaFsCrypto.errorName e)
        | Ok sealedBytes ->
            match ZetaFsCrypto.openLog s 1L sealedBytes with
            | Error e -> failwith (ZetaFsCrypto.errorName e)
            | Ok pt -> pt.Length |> ignore
