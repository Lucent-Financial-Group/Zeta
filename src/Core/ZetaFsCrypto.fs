namespace Zeta.Core

open System
open System.Buffers.Binary
open System.Security.Cryptography
open System.Text

/// ZetaFS volume crypto (E8 / E12 / PR9).
///
/// Default confidentiality is off. AES-GCM uses an explicit 96-bit nonce
/// packed from `(epoch, LSN, disc)` -- never RandomNumberGenerator.Fill
/// (that is `AesGcmCryptoProvider`, the spine DiskBackingStore path, not
/// this volume). ContentId lives inside the AEAD plaintext. Cleartext on
/// a sealed object is a keyed HMAC-SHA256 of the ciphertext so bitrot
/// can be named without publishing ContentId.
///
/// Hardware AES-NI / VAES / ARMv8 is whatever `AesGcm` already dispatches;
/// `aesGcmHardwareAtProcessStart` records the process-start fact for a
/// telemetry lane. It does not enter FORMAT. Numbers stay unmetered.
///
/// `vault-dedup` and `convergent-opt-in` are named and refused (default off).
/// XTS is not an object format. Passphrase KDF is a toy HMAC, not R8.
module ZetaFsCrypto =

    [<Literal>]
    let NonceSize = 12

    [<Literal>]
    let TagSize = 16

    [<Literal>]
    let MacSize = 32

    /// Distinguishes log frames from CAS objects in the nonce disc field.
    /// Uniqueness is still (epoch, LSN, disc): one LSN per sealed write.
    module Disc =
        let Log = 0u
        let Object = 1u

    type CryptoError =
        | BadVaultKey of int
        | CiphertextTooShort of int
        | MacMismatch
        | GcmAuthFailed
        | VaultDedupOff
        | ConvergentOptInOff

    type SecurityContext =
        | Clear
        | Vault
        | VaultDedup
        | ConvergentOptIn
        | Ephemeral

    type Session =
        { Epoch: uint32
          EncKey: byte[]
          MacKey: byte[] }

    /// Process-start hardware fact. Not a FORMAT key. Not a throughput claim.
    let aesGcmHardwareAtProcessStart: bool = AesGcm.IsSupported

    let errorName (e: CryptoError) : string =
        match e with
        | CryptoError.BadVaultKey _ -> "BadVaultKey"
        | CryptoError.CiphertextTooShort _ -> "CiphertextTooShort"
        | CryptoError.MacMismatch -> "MacMismatch"
        | CryptoError.GcmAuthFailed -> "GcmAuthFailed"
        | CryptoError.VaultDedupOff -> "VaultDedupOff"
        | CryptoError.ConvergentOptInOff -> "ConvergentOptInOff"

    /// `vault-dedup` / `convergent-opt-in` stay off. Clear and Vault (and
    /// ephemeral-as-vault) are the first-product contexts.
    let requireContext (c: SecurityContext) : Result<unit, CryptoError> =
        match c with
        | SecurityContext.Clear
        | SecurityContext.Vault
        | SecurityContext.Ephemeral -> Ok()
        | SecurityContext.VaultDedup -> Error CryptoError.VaultDedupOff
        | SecurityContext.ConvergentOptIn -> Error CryptoError.ConvergentOptInOff

    let packNonce (epoch: uint32) (lsn: int64) (disc: uint32) : byte[] =
        let n = Array.zeroCreate NonceSize
        BinaryPrimitives.WriteUInt32LittleEndian(Span(n, 0, 4), epoch)
        BinaryPrimitives.WriteUInt32LittleEndian(Span(n, 4, 4), uint32 (uint64 lsn &&& 0xFFFFFFFFUL))
        BinaryPrimitives.WriteUInt32LittleEndian(Span(n, 8, 4), disc)
        n

    let private asciiLabel (s: string) : byte[] =
        Encoding.ASCII.GetBytes s

    let private hmac (key: byte[]) (data: byte[]) : byte[] =
        HMACSHA256.HashData(key, data)

    /// Toy passphrase KDF. Not PBKDF2, not Argon2, not R8 machine-bind.
    let toyPassphraseKdf (passphrase: byte[]) : byte[] =
        let p = if isNull passphrase then Array.empty else passphrase
        hmac p (asciiLabel "zetafs-toy-passphrase-kdf")

    let sessionFromVaultKey (epoch: uint32) (vaultKey: byte[]) : Result<Session, CryptoError> =
        if isNull vaultKey || (vaultKey.Length <> 16 && vaultKey.Length <> 32) then
            let n = if isNull vaultKey then 0 else vaultKey.Length
            Error(CryptoError.BadVaultKey n)
        else
            Ok
                { Epoch = epoch
                  EncKey = hmac vaultKey (asciiLabel "zetafs-enc-aes-256")
                  MacKey = hmac vaultKey (asciiLabel "zetafs-mac-hmac-sha256") }

    let private macOfCipher (macKey: byte[]) (cipher: byte[]) : byte[] =
        hmac macKey cipher

    let private macEquals (a: byte[]) (b: byte[]) : bool =
        a.Length = b.Length && CryptographicOperations.FixedTimeEquals(ReadOnlySpan a, ReadOnlySpan b)

    let seal (session: Session) (lsn: int64) (disc: uint32) (plaintext: byte[]) : Result<byte[], CryptoError> =
        let nonce = packNonce session.Epoch lsn disc
        let pt = if isNull plaintext then Array.empty else plaintext
        let tag = Array.zeroCreate TagSize
        let cipher = Array.zeroCreate pt.Length

        try
            use aes = new AesGcm(session.EncKey, TagSize)
            aes.Encrypt(ReadOnlySpan nonce, ReadOnlySpan pt, Span cipher, Span tag)
            let mac = macOfCipher session.MacKey cipher
            let sealedBytes = Array.zeroCreate (MacSize + TagSize + cipher.Length)
            Buffer.BlockCopy(mac, 0, sealedBytes, 0, MacSize)
            Buffer.BlockCopy(tag, 0, sealedBytes, MacSize, TagSize)
            Buffer.BlockCopy(cipher, 0, sealedBytes, MacSize + TagSize, cipher.Length)
            Ok sealedBytes
        with :? CryptographicException ->
            Error CryptoError.GcmAuthFailed

    let openSealed (session: Session) (lsn: int64) (disc: uint32) (sealedBytes: byte[]) : Result<byte[], CryptoError> =
        if isNull sealedBytes || sealedBytes.Length < MacSize + TagSize then
            let n = if isNull sealedBytes then 0 else sealedBytes.Length
            Error(CryptoError.CiphertextTooShort n)
        else
            let mac = Array.zeroCreate MacSize
            let tag = Array.zeroCreate TagSize
            let cipherLen = sealedBytes.Length - MacSize - TagSize
            let cipher = Array.zeroCreate cipherLen
            Buffer.BlockCopy(sealedBytes, 0, mac, 0, MacSize)
            Buffer.BlockCopy(sealedBytes, MacSize, tag, 0, TagSize)
            Buffer.BlockCopy(sealedBytes, MacSize + TagSize, cipher, 0, cipherLen)

            let expected = macOfCipher session.MacKey cipher

            if not (macEquals mac expected) then
                Error CryptoError.MacMismatch
            else
                let nonce = packNonce session.Epoch lsn disc
                let pt = Array.zeroCreate cipherLen

                try
                    use aes = new AesGcm(session.EncKey, TagSize)
                    aes.Decrypt(ReadOnlySpan nonce, ReadOnlySpan cipher, ReadOnlySpan tag, Span pt)
                    Ok pt
                with :? CryptographicException ->
                    Error CryptoError.GcmAuthFailed

    let sealLog (session: Session) (lsn: int64) (plaintext: byte[]) : Result<byte[], CryptoError> =
        seal session lsn Disc.Log plaintext

    let openLog (session: Session) (lsn: int64) (sealedBytes: byte[]) : Result<byte[], CryptoError> =
        openSealed session lsn Disc.Log sealedBytes

    /// ContentId (32 raw bytes) is prefixed into the plaintext. It is not
    /// a filename and not a nonce field.
    let sealObject (session: Session) (lsn: int64) (contentIdRaw: byte[]) (payload: byte[]) : Result<byte[], CryptoError> =
        let id = if isNull contentIdRaw then Array.empty else contentIdRaw
        let body = if isNull payload then Array.empty else payload
        let pt = Array.zeroCreate (id.Length + body.Length)
        Buffer.BlockCopy(id, 0, pt, 0, id.Length)
        Buffer.BlockCopy(body, 0, pt, id.Length, body.Length)
        seal session lsn Disc.Object pt

    let openObject (session: Session) (lsn: int64) (sealedBytes: byte[]) : Result<byte[] * byte[], CryptoError> =
        match openSealed session lsn Disc.Object sealedBytes with
        | Error e -> Error e
        | Ok pt ->
            if pt.Length < 32 then
                Error(CryptoError.CiphertextTooShort pt.Length)
            else
                let id = Array.zeroCreate 32
                let body = Array.zeroCreate (pt.Length - 32)
                Buffer.BlockCopy(pt, 0, id, 0, 32)
                Buffer.BlockCopy(pt, 32, body, 0, body.Length)
                Ok(id, body)
