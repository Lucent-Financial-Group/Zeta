/**
 * tools/crypto/better-git-crypt/crypto.test.ts
 *
 * B-0883 v1 Phase 2 — real-crypto round-trip + tamper-detection tests.
 *
 * These tests ARE the no-human-intervention oracle: they exercise the actual
 * @noble post-quantum primitives end-to-end. A green run proves the wiring
 * (XWing KEM + ML-DSA-65 sig + HKDF + ChaCha20-Poly1305 + CBOR envelope) is
 * correct against the installed package versions.
 *
 * Run via: bun test tools/crypto/better-git-crypt/crypto.test.ts
 */

import { describe, expect, it } from "bun:test";
import {
  generateRecipientKeyPair,
  encrypt,
  decrypt,
  encodeEnvelope,
  decodeEnvelope,
  type GeneratedKeyPair,
} from "./crypto";
import type { EncryptionContext } from "./types";

const utf8 = (s: string): Uint8Array => new TextEncoder().encode(s);
const str = (b: Uint8Array): string => new TextDecoder().decode(b);

/** Build an EncryptionContext from generated keypairs. */
function ctxFor(plaintext: Uint8Array, sender: GeneratedKeyPair, recipients: GeneratedKeyPair[]): EncryptionContext {
  return {
    plaintext,
    recipients: recipients.map((r) => r.publicKey),
    sender: sender.publicKey,
    seedSource: "random-bytes",
  };
}

describe("B-0883 v1 Phase 2 — keygen", () => {
  it("generates XWing + ML-DSA-65 keypair with expected public-key sizes", () => {
    const kp = generateRecipientKeyPair("otto-cli@zeta");
    expect(kp.publicKey.identity).toBe("otto-cli@zeta");
    expect(kp.publicKey.kemAlgId).toBe("ML-KEM-768+X25519");
    expect(kp.publicKey.sigAlgId).toBe("ML-DSA-65");
    expect(kp.publicKey.publicKemKey.length).toBe(1216); // XWing public key
    expect(kp.publicKey.publicSigKey.length).toBeGreaterThan(0); // ML-DSA-65 public key
    expect(kp.secretKeys.identity).toBe("otto-cli@zeta");
    expect(kp.secretKeys.kemSecretKey.length).toBeGreaterThan(0);
    expect(kp.secretKeys.sigSecretKey.length).toBeGreaterThan(0);
  });

  it("two keypairs differ (fresh randomness)", () => {
    const a = generateRecipientKeyPair("a@zeta");
    const b = generateRecipientKeyPair("b@zeta");
    expect(Buffer.from(a.publicKey.publicKemKey).equals(Buffer.from(b.publicKey.publicKemKey))).toBe(false);
  });

  it("rejects non-random-bytes seed source in v1", () => {
    expect(() => generateRecipientKeyPair("x@zeta", "adinkra-derived")).toThrow(/not available in v1/);
  });
});

describe("B-0883 v1 Phase 2 — encrypt/decrypt round-trip", () => {
  it("single recipient (sender == recipient) round-trips", () => {
    const otto = generateRecipientKeyPair("otto-cli@zeta");
    const pt = utf8("the secret is in the wavefunction");
    const enc = encrypt(ctxFor(pt, otto, [otto]), otto.secretKeys);
    expect(enc.ok).toBe(true);
    if (!enc.ok) return;
    const dec = decrypt(enc.envelope, otto.secretKeys, otto.publicKey.publicSigKey);
    expect(dec.ok).toBe(true);
    if (!dec.ok) return;
    expect(str(dec.plaintext)).toBe("the secret is in the wavefunction");
  });

  it("multi-recipient: every recipient (and the sender) can decrypt", () => {
    const otto = generateRecipientKeyPair("otto-cli@zeta");
    const addison = generateRecipientKeyPair("addison@zeta");
    const max = generateRecipientKeyPair("max@zeta");
    const pt = utf8("three-party shared secret");
    // sender (otto) must be in the recipient set for round-trip recovery
    const enc = encrypt(ctxFor(pt, otto, [otto, addison, max]), otto.secretKeys);
    expect(enc.ok).toBe(true);
    if (!enc.ok) return;
    expect(enc.envelope.recipients.length).toBe(3);

    for (const who of [otto, addison, max]) {
      const dec = decrypt(enc.envelope, who.secretKeys, otto.publicKey.publicSigKey);
      expect(dec.ok).toBe(true);
      if (dec.ok) expect(str(dec.plaintext)).toBe("three-party shared secret");
    }
  });

  it("empty plaintext round-trips", () => {
    const otto = generateRecipientKeyPair("otto-cli@zeta");
    const enc = encrypt(ctxFor(new Uint8Array(0), otto, [otto]), otto.secretKeys);
    expect(enc.ok).toBe(true);
    if (!enc.ok) return;
    const dec = decrypt(enc.envelope, otto.secretKeys, otto.publicKey.publicSigKey);
    expect(dec.ok).toBe(true);
    if (dec.ok) expect(dec.plaintext.length).toBe(0);
  });

  it("larger binary payload round-trips byte-for-byte", () => {
    const otto = generateRecipientKeyPair("otto-cli@zeta");
    const pt = new Uint8Array(8192);
    for (let i = 0; i < pt.length; i++) pt[i] = (i * 37 + 11) & 0xff;
    const enc = encrypt(ctxFor(pt, otto, [otto]), otto.secretKeys);
    expect(enc.ok).toBe(true);
    if (!enc.ok) return;
    const dec = decrypt(enc.envelope, otto.secretKeys, otto.publicKey.publicSigKey);
    expect(dec.ok).toBe(true);
    if (dec.ok) expect(Buffer.from(dec.plaintext).equals(Buffer.from(pt))).toBe(true);
  });
});

describe("B-0883 v1 Phase 2 — encrypt failure modes (authored TFeedback)", () => {
  it("EmptyRecipientSet", () => {
    const otto = generateRecipientKeyPair("otto-cli@zeta");
    const enc = encrypt(ctxFor(utf8("x"), otto, []), otto.secretKeys);
    expect(enc.ok).toBe(false);
    if (!enc.ok) expect(enc.feedback.kind).toBe("EmptyRecipientSet");
  });

  it("SenderNotInRecipientSet", () => {
    const otto = generateRecipientKeyPair("otto-cli@zeta");
    const addison = generateRecipientKeyPair("addison@zeta");
    const enc = encrypt(ctxFor(utf8("x"), otto, [addison]), otto.secretKeys);
    expect(enc.ok).toBe(false);
    if (!enc.ok) expect(enc.feedback.kind).toBe("SenderNotInRecipientSet");
  });

  it("RecipientKeyInvalid when sender secret-key identity mismatches", () => {
    const otto = generateRecipientKeyPair("otto-cli@zeta");
    const imposter = generateRecipientKeyPair("imposter@zeta");
    // context sender = otto, but pass imposter's secret keys
    const enc = encrypt(ctxFor(utf8("x"), otto, [otto]), imposter.secretKeys);
    expect(enc.ok).toBe(false);
    if (!enc.ok) expect(enc.feedback.kind).toBe("RecipientKeyInvalid");
  });

  it("SeedSourceNotAvailable for non-random-bytes", () => {
    const otto = generateRecipientKeyPair("otto-cli@zeta");
    const enc = encrypt({ ...ctxFor(utf8("x"), otto, [otto]), seedSource: "hsm-derived" }, otto.secretKeys);
    expect(enc.ok).toBe(false);
    if (!enc.ok) expect(enc.feedback.kind).toBe("SeedSourceNotAvailable");
  });
});

describe("B-0883 v1 Phase 2 — decrypt failure modes (tamper detection)", () => {
  it("wrong recipient (not in envelope) -> RecipientNotInEnvelope", () => {
    const otto = generateRecipientKeyPair("otto-cli@zeta");
    const stranger = generateRecipientKeyPair("stranger@zeta");
    const enc = encrypt(ctxFor(utf8("secret"), otto, [otto]), otto.secretKeys);
    expect(enc.ok).toBe(true);
    if (!enc.ok) return;
    const dec = decrypt(enc.envelope, stranger.secretKeys, otto.publicKey.publicSigKey);
    expect(dec.ok).toBe(false);
    if (!dec.ok) expect(dec.feedback.kind).toBe("RecipientNotInEnvelope");
  });

  it("tampered ciphertext -> SignatureInvalid (signature covers content)", () => {
    const otto = generateRecipientKeyPair("otto-cli@zeta");
    const enc = encrypt(ctxFor(utf8("secret"), otto, [otto]), otto.secretKeys);
    expect(enc.ok).toBe(true);
    if (!enc.ok) return;
    const tampered = new Uint8Array(enc.envelope.ciphertext);
    tampered[0] = (tampered[0] ?? 0) ^ 0xff;
    const dec = decrypt({ ...enc.envelope, ciphertext: tampered }, otto.secretKeys, otto.publicKey.publicSigKey);
    expect(dec.ok).toBe(false);
    if (!dec.ok) expect(dec.feedback.kind).toBe("SignatureInvalid");
  });

  it("tampered signature -> SignatureInvalid", () => {
    const otto = generateRecipientKeyPair("otto-cli@zeta");
    const enc = encrypt(ctxFor(utf8("secret"), otto, [otto]), otto.secretKeys);
    expect(enc.ok).toBe(true);
    if (!enc.ok) return;
    const sig = new Uint8Array(enc.envelope.signature);
    sig[0] = (sig[0] ?? 0) ^ 0xff;
    const dec = decrypt({ ...enc.envelope, signature: sig }, otto.secretKeys, otto.publicKey.publicSigKey);
    expect(dec.ok).toBe(false);
    if (!dec.ok) expect(dec.feedback.kind).toBe("SignatureInvalid");
  });

  it("wrong sender public sig key -> SignatureInvalid", () => {
    const otto = generateRecipientKeyPair("otto-cli@zeta");
    const other = generateRecipientKeyPair("other@zeta");
    const enc = encrypt(ctxFor(utf8("secret"), otto, [otto]), otto.secretKeys);
    expect(enc.ok).toBe(true);
    if (!enc.ok) return;
    const dec = decrypt(enc.envelope, otto.secretKeys, other.publicKey.publicSigKey);
    expect(dec.ok).toBe(false);
    if (!dec.ok) expect(dec.feedback.kind).toBe("SignatureInvalid");
  });

  it("recipient present but holding wrong KEM secret key -> KemFailure", () => {
    const otto = generateRecipientKeyPair("otto-cli@zeta");
    const addison = generateRecipientKeyPair("addison@zeta");
    const enc = encrypt(ctxFor(utf8("secret"), otto, [otto, addison]), otto.secretKeys);
    expect(enc.ok).toBe(true);
    if (!enc.ok) return;
    // addison's slot exists, but supply a mismatched KEM secret key (otto's)
    const wrongKeys = {
      identity: "addison@zeta",
      kemSecretKey: otto.secretKeys.kemSecretKey,
      sigSecretKey: addison.secretKeys.sigSecretKey,
    };
    const dec = decrypt(enc.envelope, wrongKeys, otto.publicKey.publicSigKey);
    expect(dec.ok).toBe(false);
    if (!dec.ok) expect(dec.feedback.kind).toBe("KemFailure");
  });

  it("context mismatch -> ContextMismatch", () => {
    const otto = generateRecipientKeyPair("otto-cli@zeta");
    const enc = encrypt(ctxFor(utf8("secret"), otto, [otto]), otto.secretKeys);
    expect(enc.ok).toBe(true);
    if (!enc.ok) return;
    // Mutating context breaks the signature first; verify it fails closed.
    const dec = decrypt({ ...enc.envelope, context: "wrong.ctx.v1" }, otto.secretKeys, otto.publicKey.publicSigKey);
    expect(dec.ok).toBe(false);
    // EnvelopeMalformed (structural validator rejects bad context) is the
    // first gate; either that or SignatureInvalid is acceptable fail-closed.
    if (!dec.ok) expect(["EnvelopeMalformed", "ContextMismatch", "SignatureInvalid"]).toContain(dec.feedback.kind);
  });
});

describe("B-0883 v1 Phase 2 — on-disk envelope CBOR codec", () => {
  it("encode/decode round-trips and the decoded envelope still decrypts", () => {
    const otto = generateRecipientKeyPair("otto-cli@zeta");
    const addison = generateRecipientKeyPair("addison@zeta");
    const enc = encrypt(ctxFor(utf8("persisted to git, read later"), otto, [otto, addison]), otto.secretKeys);
    expect(enc.ok).toBe(true);
    if (!enc.ok) return;

    const bytes = encodeEnvelope(enc.envelope);
    expect(bytes.length).toBeGreaterThan(0);

    const decoded = decodeEnvelope(bytes);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;

    // Field-level fidelity
    expect(decoded.envelope.context).toBe("zeta.git-crypt.file.v1");
    expect(decoded.envelope.recipients.length).toBe(2);
    expect(decoded.envelope.contentNonce.length).toBe(12);

    // The decoded envelope must still decrypt (proves the persist->observe bridge)
    const dec = decrypt(decoded.envelope, addison.secretKeys, otto.publicKey.publicSigKey);
    expect(dec.ok).toBe(true);
    if (dec.ok) expect(str(dec.plaintext)).toBe("persisted to git, read later");
  });

  it("decodeEnvelope rejects garbage bytes with EnvelopeMalformed", () => {
    const decoded = decodeEnvelope(new Uint8Array([0xff, 0x00, 0x13, 0x37]));
    expect(decoded.ok).toBe(false);
    if (!decoded.ok) expect(decoded.feedback.kind).toBe("EnvelopeMalformed");
  });

  it("encodeEnvelope is deterministic (same envelope -> same bytes)", () => {
    const otto = generateRecipientKeyPair("otto-cli@zeta");
    const enc = encrypt(ctxFor(utf8("determinism"), otto, [otto]), otto.secretKeys);
    expect(enc.ok).toBe(true);
    if (!enc.ok) return;
    const a = encodeEnvelope(enc.envelope);
    const b = encodeEnvelope(enc.envelope);
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
  });
});
