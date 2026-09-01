module Zeta.Tests.ZetaFsCryptoTests

open System
open System.Buffers.Binary
open System.Security.Cryptography
open global.Xunit
open Zeta.Core

let private vaultKey =
    [| 0uy .. 31uy |]

let private session () =
    match ZetaFsCrypto.sessionFromVaultKey 7u vaultKey with
    | Ok s -> s
    | Error e -> failwith (ZetaFsCrypto.errorName e)

let private packed (epoch: uint32) (lsn: uint32) (disc: uint32) : byte[] =
    let n = Array.zeroCreate 12
    BinaryPrimitives.WriteUInt32LittleEndian(Span(n, 0, 4), epoch)
    BinaryPrimitives.WriteUInt32LittleEndian(Span(n, 4, 4), lsn)
    BinaryPrimitives.WriteUInt32LittleEndian(Span(n, 8, 4), disc)
    n

[<Fact>]
let ``packNonce writes epoch, LSN, disc little-endian and they all move the bytes`` () =
    let got = ZetaFsCrypto.packNonce 1u 99L ZetaFsCrypto.Disc.Log
    Assert.Equal<byte[]>(packed 1u 99u ZetaFsCrypto.Disc.Log, got)
    Assert.Equal(12, got.Length)
    Assert.NotEqual<byte[]>(got, ZetaFsCrypto.packNonce 2u 99L ZetaFsCrypto.Disc.Log)
    Assert.NotEqual<byte[]>(got, ZetaFsCrypto.packNonce 1u 100L ZetaFsCrypto.Disc.Log)
    Assert.NotEqual<byte[]>(got, ZetaFsCrypto.packNonce 1u 99L ZetaFsCrypto.Disc.Object)

[<Fact>]
let ``AesGcmCryptoProvider Encrypt of the same plaintext is not a volume nonce`` () =
    let pt = [| 1uy; 2uy; 3uy |]
    let rng = AesGcmCryptoProvider(vaultKey) :> Zeta.Core.Abstractions.ICryptoProvider
    let x = rng.Encrypt pt
    let y = rng.Encrypt pt
    Assert.NotEqual<byte[]>(x, y)
    let s = session ()
    match ZetaFsCrypto.sealLog s 3L pt with
    | Error e -> Assert.Fail(ZetaFsCrypto.errorName e)
    | Ok sealedBytes ->
        Assert.NotEqual<byte[]>(x, sealedBytes)
        Assert.Equal(ZetaFsCrypto.MacSize + ZetaFsCrypto.TagSize + pt.Length, sealedBytes.Length)

[<Fact>]
let ``log seal round-trips and open fails on a flipped MAC byte`` () =
    let s = session ()
    let pt = Text.Encoding.UTF8.GetBytes "freeze-intent/1"
    match ZetaFsCrypto.sealLog s 1L pt with
    | Error e -> Assert.Fail(ZetaFsCrypto.errorName e)
    | Ok sealedBytes ->
        match ZetaFsCrypto.openLog s 1L sealedBytes with
        | Ok got -> Assert.Equal<byte[]>(pt, got)
        | Error e -> Assert.Fail(ZetaFsCrypto.errorName e)

        let flipped = Array.copy sealedBytes
        flipped.[0] <- flipped.[0] ^^^ 1uy

        match ZetaFsCrypto.openLog s 1L flipped with
        | Error ZetaFsCrypto.CryptoError.MacMismatch -> ()
        | other -> Assert.Fail(sprintf "expected MacMismatch, got %A" other)

[<Fact>]
let ``ContentId is inside the AEAD, not in the ciphertext`` () =
    let s = session ()
    let contentId = Array.init 32 (fun i -> byte (i + 17))
    let payload = [| 9uy; 8uy; 7uy |]
    match ZetaFsCrypto.sealObject s 4L contentId payload with
    | Error e -> Assert.Fail(ZetaFsCrypto.errorName e)
    | Ok sealedBytes ->
        let cipher = Array.sub sealedBytes (ZetaFsCrypto.MacSize + ZetaFsCrypto.TagSize) (sealedBytes.Length - ZetaFsCrypto.MacSize - ZetaFsCrypto.TagSize)
        Assert.Equal(-1, MemoryExtensions.IndexOf(ReadOnlySpan<byte> cipher, ReadOnlySpan<byte> contentId))

        match ZetaFsCrypto.openObject s 4L sealedBytes with
        | Ok(id, body) ->
            Assert.Equal<byte[]>(contentId, id)
            Assert.Equal<byte[]>(payload, body)
        | Error e -> Assert.Fail(ZetaFsCrypto.errorName e)

[<Fact>]
let ``keyed MAC is of the ciphertext, not the plaintext`` () =
    let s = session ()
    let pt = [| 5uy; 5uy; 5uy; 5uy |]
    match ZetaFsCrypto.sealLog s 2L pt with
    | Error e -> Assert.Fail(ZetaFsCrypto.errorName e)
    | Ok sealedBytes ->
        let mac = sealedBytes.[0 .. ZetaFsCrypto.MacSize - 1]
        let cipher = sealedBytes.[(ZetaFsCrypto.MacSize + ZetaFsCrypto.TagSize) ..]
        let overCipher = HMACSHA256.HashData(s.MacKey, cipher)
        let overPlain = HMACSHA256.HashData(s.MacKey, pt)
        Assert.Equal<byte[]>(overCipher, mac)
        Assert.NotEqual<byte[]>(overPlain, mac)

[<Fact>]
let ``vault-dedup and convergent-opt-in stay off`` () =
    match ZetaFsCrypto.requireContext ZetaFsCrypto.SecurityContext.VaultDedup with
    | Error ZetaFsCrypto.CryptoError.VaultDedupOff -> ()
    | other -> Assert.Fail(sprintf "%A" other)

    match ZetaFsCrypto.requireContext ZetaFsCrypto.SecurityContext.ConvergentOptIn with
    | Error ZetaFsCrypto.CryptoError.ConvergentOptInOff -> ()
    | other -> Assert.Fail(sprintf "%A" other)

    match ZetaFsCrypto.requireContext ZetaFsCrypto.SecurityContext.Vault with
    | Ok() -> ()
    | Error e -> Assert.Fail(ZetaFsCrypto.errorName e)

[<Fact>]
let ``toy passphrase KDF is HMAC of the pinned label`` () =
    let p = Text.Encoding.UTF8.GetBytes "pass"
    let q = Text.Encoding.UTF8.GetBytes "other"
    let label = Text.Encoding.ASCII.GetBytes "zetafs-toy-passphrase-kdf"
    let expected = HMACSHA256.HashData(p, label)
    Assert.Equal<byte[]>(expected, ZetaFsCrypto.toyPassphraseKdf p)
    Assert.NotEqual<byte[]>(expected, ZetaFsCrypto.toyPassphraseKdf q)
    Assert.Equal(32, expected.Length)

[<Fact>]
let ``FORMAT default remains enc off; aes-gcm is the explicit-nonce value`` () =
    Assert.Equal(ZetaFsFormat.Enc.Off, ZetaFsFormat.pr6Default.Enc)
    let encrypted = { ZetaFsFormat.pr6Default with Enc = ZetaFsFormat.Enc.AesGcmExplicitNonce }

    match ZetaFsFormat.parse (ZetaFsFormat.render encrypted) with
    | Ok m -> Assert.Equal(ZetaFsFormat.Enc.AesGcmExplicitNonce, m.Enc)
    | Error e -> Assert.Fail(ZetaFsFormat.describe e)

    match ZetaFsFormat.parse "zetafs/2\nns=git-trees\nbody=jumprope\nhash=blake3-256\nenc=xts\n" with
    | Error(ZetaFsFormat.FormatError.UnknownKnownOptionalValue("enc", "xts")) -> ()
    | other -> Assert.Fail(sprintf "XTS must not be an object format, got %A" other)
