module Zeta.Tests.ZetaFsCryptoTests

open System
open System.Security.Cryptography
open global.Xunit
open Zeta.Core

let private vaultKey =
    [| 0uy .. 31uy |]

let private session () =
    match ZetaFsCrypto.sessionFromVaultKey 7u vaultKey with
    | Ok s -> s
    | Error e -> failwith (ZetaFsCrypto.errorName e)

[<Fact>]
let ``packNonce is a pure function of epoch, LSN, disc -- no RNG`` () =
    let a = ZetaFsCrypto.packNonce 1u 99L ZetaFsCrypto.Disc.Log
    let b = ZetaFsCrypto.packNonce 1u 99L ZetaFsCrypto.Disc.Log
    let c = ZetaFsCrypto.packNonce 1u 100L ZetaFsCrypto.Disc.Log
    let d = ZetaFsCrypto.packNonce 1u 99L ZetaFsCrypto.Disc.Object
    Assert.Equal<byte[]>(a, b)
    Assert.Equal(12, a.Length)
    Assert.NotEqual<byte[]>(a, c)
    Assert.NotEqual<byte[]>(a, d)

[<Fact>]
let ``same plaintext seals identically; AesGcmCryptoProvider does not`` () =
    let s = session ()
    let pt = [| 1uy; 2uy; 3uy |]
    match ZetaFsCrypto.sealLog s 3L pt, ZetaFsCrypto.sealLog s 3L pt with
    | Ok a, Ok b -> Assert.Equal<byte[]>(a, b)
    | other -> Assert.Fail(sprintf "%A" other)

    let rng = AesGcmCryptoProvider(vaultKey) :> Zeta.Core.Abstractions.ICryptoProvider
    let x = rng.Encrypt pt
    let y = rng.Encrypt pt
    Assert.NotEqual<byte[]>(x, y)

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
let ``toy passphrase KDF is deterministic and is not a wrap of RandomNumberGenerator`` () =
    let p = Text.Encoding.UTF8.GetBytes "pass"
    Assert.Equal<byte[]>(ZetaFsCrypto.toyPassphraseKdf p, ZetaFsCrypto.toyPassphraseKdf p)
    Assert.Equal(32, (ZetaFsCrypto.toyPassphraseKdf p).Length)

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
