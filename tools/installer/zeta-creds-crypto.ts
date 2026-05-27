// zeta-creds-crypto.ts — pure crypto primitives for B-0852 credential persistence.
//
// B-0852 sub-row .1 (smallest concrete substrate slice). Pure functions; no I/O.
// Composes with:
//   - tools/installer/zeta-creds-persist.ts (B-0852.2; consumes encrypt)
//   - tools/installer/zeta-creds-restore.ts (B-0852.2; consumes decrypt)
//   - docs/backlog/P1/B-0852-credential-persistence-on-usb-esp-*.md
//
// Threat model (Phase 1 scope; per row body):
//   - Attacker has physical USB access → blob on ESP is readable as a file
//   - Attacker can copy ESP contents to a different-UUID USB
//   - Attacker does NOT have operator passphrase
//   - Operator passphrase is typed at boot; never persisted to disk
//
// Defense:
//   - HKDF-SHA256 binds key to BOTH (USB UUID || passphrase) so blob copied
//     to a different-UUID USB cannot be decrypted (assuming passphrase secret)
//   - AES-256-GCM authenticated encryption rejects tampered ciphertext
//   - Wrong passphrase produces a different key → GCM auth tag verification
//     fails → decrypt returns error (NOT garbled plaintext)
//
// Phase 3 (NOT this row): hardware-bound keys (TPM / YubiKey / Touch-ID-derived)
//   to defeat the "attacker stole USB AND knows passphrase AND knows UUID" case.

import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

/** AES-256-GCM key size (bytes). */
export const KEY_LEN = 32;

/** AES-GCM IV size (bytes); 12 is the AES-GCM spec recommendation. */
export const IV_LEN = 12;

/** AES-GCM authentication tag size (bytes). */
export const TAG_LEN = 16;

/** HKDF salt length (bytes); ships per-blob in the envelope. */
export const SALT_LEN = 32;

/** HKDF info string — bound to this row's substrate-engineering purpose. */
export const HKDF_INFO = Buffer.from("zeta-b0852-cred-persistence-v1");

/**
 * Envelope written to /esp/zeta-creds.enc. Wire format is a single binary
 * blob (Phase 1 implementation will length-prefix-pack salt+iv+tag+ciphertext).
 * This module returns the structured object; serialization is a sibling
 * concern (B-0852.2 persist CLI).
 */
export interface Envelope {
  readonly salt: Uint8Array;
  readonly iv: Uint8Array;
  readonly tag: Uint8Array;
  readonly ciphertext: Uint8Array;
}

/**
 * Derive AES-256 key from USB UUID + operator passphrase using HKDF-SHA256.
 *
 * Binding to USB UUID is the substrate-engineering anti-defeat measure named
 * by Aaron 2026-05-27: "we can put a key on the usb too if wnated tied to the
 * uuid so it can't be copied to uuid".
 *
 * @param usbUuid - the USB stick's filesystem UUID (operator-provided; e.g.
 *                  from `blkid -s UUID -o value /dev/disk6s1`)
 * @param passphrase - operator passphrase typed at boot
 * @param salt - 32 random bytes; freshly generated per encryption, stored in
 *               the envelope; required at decrypt time
 * @returns 32-byte AES-256 key
 */
export function deriveKey(usbUuid: string, passphrase: string, salt: Uint8Array): Buffer {
  if (salt.length !== SALT_LEN) {
    throw new Error(`salt must be ${SALT_LEN} bytes; got ${salt.length}`);
  }
  // HKDF input keying material: USB UUID || passphrase. Both must match at
  // decrypt time. Order-sensitive (UUID first then passphrase per convention).
  const ikm = Buffer.concat([Buffer.from(usbUuid, "utf8"), Buffer.from("|", "utf8"), Buffer.from(passphrase, "utf8")]);
  const derived = hkdfSync("sha256", ikm, salt, HKDF_INFO, KEY_LEN);
  return Buffer.from(derived);
}

/**
 * Encrypt plaintext with AES-256-GCM. Generates fresh salt + IV per call.
 *
 * @param plaintext - cred-blob bytes (cleartext)
 * @param usbUuid - USB filesystem UUID (bound into key derivation)
 * @param passphrase - operator passphrase
 * @returns envelope { salt, iv, tag, ciphertext } ready for serialization
 */
export function encrypt(plaintext: Uint8Array, usbUuid: string, passphrase: string): Envelope {
  const salt = randomBytes(SALT_LEN);
  const iv = randomBytes(IV_LEN);
  const key = deriveKey(usbUuid, passphrase, salt);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { salt, iv, tag, ciphertext };
}

/**
 * Decrypt envelope. Returns plaintext on success OR { error } on:
 *   - wrong passphrase (auth tag verification fails)
 *   - wrong USB UUID (auth tag verification fails)
 *   - tampered ciphertext (auth tag verification fails)
 *   - tampered tag (auth tag verification fails)
 *   - tampered salt (key derives differently → auth tag verification fails)
 *
 * Operationally: any error means the operator should fall through to the
 * picker's option (2) fresh-login OR option (3) operator-provided PAT path
 * per the row's auth-method picker semantics.
 *
 * @param envelope - serialized blob contents
 * @param usbUuid - USB filesystem UUID
 * @param passphrase - operator passphrase
 * @returns plaintext on success OR { error: string } on any failure
 */
export function decrypt(envelope: Envelope, usbUuid: string, passphrase: string): Buffer | { readonly error: string } {
  if (envelope.iv.length !== IV_LEN) {
    return { error: `iv must be ${IV_LEN} bytes; got ${envelope.iv.length}` };
  }
  if (envelope.tag.length !== TAG_LEN) {
    return { error: `tag must be ${TAG_LEN} bytes; got ${envelope.tag.length}` };
  }
  const key = deriveKey(usbUuid, passphrase, envelope.salt);
  const decipher = createDecipheriv("aes-256-gcm", key, envelope.iv);
  decipher.setAuthTag(envelope.tag);
  try {
    const plaintext = Buffer.concat([decipher.update(envelope.ciphertext), decipher.final()]);
    return plaintext;
  } catch (err) {
    // node:crypto throws on auth-tag mismatch. Return as structured error
    // so callers don't need try/catch (substrate-honest: failure IS a value).
    const msg = err instanceof Error ? err.message : String(err);
    return { error: `decryption failed (wrong passphrase / wrong UUID / tampered blob): ${msg}` };
  }
}
