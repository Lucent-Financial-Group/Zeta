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
    // GOLDEN VECTOR, not a self-comparison. This test previously asserted
    // `packNonce x = packNonce x` -- two textually identical executions -- to support a
    // claim of "no RNG". `audit-check-arity` R1 refused it, correctly: a 2-safety claim
    // needs two executions that DIFFER in the variable whose influence is denied, and
    // calling the function twice in a row does not vary ambient entropy in any
    // controlled way. It would have passed against an implementation that drew from an
    // RNG once and cached it.
    //
    // A pinned expected value tests the claim properly and more strongly: ANY change in
    // output fails, including an RNG contribution, a field-order swap, or an endianness
    // change -- none of which a self-comparison can see. Derived from the implementation
    // (three UInt32 little-endian fields: epoch, lsn &&& 0xFFFFFFFF, disc), so the vector
    // and the code are independently checkable against each other rather than one being
    // a restatement of the other.
    let hex (b: byte[]) = System.Convert.ToHexString(b).ToLowerInvariant()
    let a = ZetaFsCrypto.packNonce 1u 99L ZetaFsCrypto.Disc.Log
    Assert.Equal("010000006300000000000000", hex a)
    Assert.Equal(12, a.Length)
    // Input sensitivity, also pinned: LSN and disc each move the nonce, and WHERE.
    Assert.Equal("010000006400000000000000", hex (ZetaFsCrypto.packNonce 1u 100L ZetaFsCrypto.Disc.Log))
    Assert.Equal("010000006300000001000000", hex (ZetaFsCrypto.packNonce 1u 99L ZetaFsCrypto.Disc.Object))

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
    // GOLDEN VECTOR for the same reason as packNonce above: the previous assertion was
    // `toyPassphraseKdf p = toyPassphraseKdf p`, which cannot distinguish a deterministic
    // KDF from one that draws entropy once and caches it -- exactly the failure the test
    // name denies ("is not a wrap of RandomNumberGenerator").
    //
    // Expected value is HMAC-SHA256(key = "pass", data = "zetafs-toy-passphrase-kdf"),
    // computed from the implementation independently of it.
    let p = Text.Encoding.UTF8.GetBytes "pass"
    let got = ZetaFsCrypto.toyPassphraseKdf p
    Assert.Equal(
        "f97c9d699ff38732131e3896d24d060851e81208db6f7fda17f976cdd344a4f9",
        System.Convert.ToHexString(got).ToLowerInvariant()
    )
    Assert.Equal(32, got.Length)

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
