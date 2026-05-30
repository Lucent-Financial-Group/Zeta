// tools/research/adinkra-ecc/adinkra-ecc-prototype.ts
//
// B-0623 acceptance #3 — "one constructive proof path: small Adinkra → ECC code →
// cryptographic primitive." Toy scale, test-guarded.
//
// The primer (docs/research/2026-05-21-adinkra-primer-for-non-physicists-zeta-substrate-context.md)
// established: an Adinkra's chromotopology IS a hypercube H_n quotiented by a
// doubly-even self-dual binary code C. The smallest interesting case is the
// [8,4,4] extended Hamming code (the unique doubly-even self-dual code of length 8).
//
// This module CONSTRUCTS that code, VERIFIES the two load-bearing properties
// (doubly-even + self-dual — the structural requirements that make it an Adinkra
// code AND give it ECC error-resistance), and derives a deterministic key-seed
// from it (the "code → key" path). The point is the constructive proof that ONE
// structure yields both the ECC (protect-from-errors) and key material
// (protect-from-being-seen) — B-0623's dual-use claim, at toy scale.
//
// SUBSTRATE-HONESTY (per the primer's razor note): deriving key MATERIAL from the
// code is a deterministic construction; turning it into a production key needs a
// real KDF (blake3 per the Lucent-KSK substrate) + the open security questions in
// the primer (indistinguishability / forward-secrecy / non-compromise of the ECC)
// are NOT answered here. This is the proof-of-construction, not a security claim.

/** A length-8 binary codeword as a tuple of 8 bits (0|1). */
export type Bits8 = readonly [number, number, number, number, number, number, number, number];

/**
 * Generator matrix G = [I_4 | A] for the [8,4,4] extended Hamming code, where
 * A = J + I (mod 2) = the 4×4 all-ones-off-diagonal matrix. Each generator row
 * has weight 4 (1 from I + 3 from A) ⇒ doubly-even generators. A·Aᵀ = I (mod 2)
 * ⇒ G·Gᵀ = I + A·Aᵀ = 0 (mod 2) ⇒ self-orthogonal; with dim = n/2 = 4 ⇒ self-dual.
 * (Derivation verified in the module doc / the test below.)
 */
export const EXTENDED_HAMMING_8_4_4_GENERATOR: readonly Bits8[] = [
  [1, 0, 0, 0, 0, 1, 1, 1],
  [0, 1, 0, 0, 1, 0, 1, 1],
  [0, 0, 1, 0, 1, 1, 0, 1],
  [0, 0, 0, 1, 1, 1, 1, 0],
];

/** XOR two length-8 bit vectors (GF(2) addition). */
export function xor8(a: Bits8, b: Bits8): Bits8 {
  return a.map((bit, i) => bit ^ b[i]) as unknown as Bits8;
}

/** Hamming weight (number of 1-bits). */
export function weight(c: Bits8): number {
  return c.reduce((acc, bit) => acc + bit, 0);
}

/** Standard inner product mod 2 (used for self-duality / orthogonality). */
export function dotMod2(a: Bits8, b: Bits8): number {
  return a.reduce((acc, bit, i) => acc ^ (bit & b[i]), 0);
}

/**
 * Enumerate all 2^k codewords of the linear code spanned by `generators`
 * (k = generators.length). Each codeword is the GF(2) sum of a subset of rows.
 */
export function enumerateCodewords(generators: readonly Bits8[]): Bits8[] {
  const k = generators.length;
  const zero: Bits8 = [0, 0, 0, 0, 0, 0, 0, 0];
  const out: Bits8[] = [];
  for (let mask = 0; mask < 1 << k; mask++) {
    let cw: Bits8 = zero;
    for (let i = 0; i < k; i++) {
      if (mask & (1 << i)) cw = xor8(cw, generators[i]);
    }
    out.push(cw);
  }
  return out;
}

/** Doubly-even: EVERY codeword has Hamming weight divisible by 4. */
export function isDoublyEven(codewords: readonly Bits8[]): boolean {
  return codewords.every((c) => weight(c) % 4 === 0);
}

/**
 * Self-dual: C = C⊥. For a length-n code we check (a) self-orthogonal — every
 * pair of codewords is orthogonal under the mod-2 inner product — and (b) the
 * dimension is n/2 (|C| = 2^(n/2)). Self-orthogonal + dim n/2 ⟹ C = C⊥.
 */
export function isSelfDual(codewords: readonly Bits8[], n = 8): boolean {
  const selfOrthogonal = codewords.every((a) => codewords.every((b) => dotMod2(a, b) === 0));
  const correctDimension = codewords.length === 2 ** (n / 2);
  return selfOrthogonal && correctDimension;
}

/**
 * Canonical, order-independent serialization of the code (the set of codewords,
 * sorted) — deterministic key MATERIAL. Same code ⇒ same string, regardless of
 * generator-row order or enumeration order.
 */
export function canonicalCodeMaterial(codewords: readonly Bits8[]): string {
  return codewords
    .map((c) => c.join(""))
    .sort()
    .join("|");
}

/**
 * Derive a deterministic key-seed (hex) from the code material via SHA-256.
 * The "code → key" proof path: the SAME code always yields the SAME seed; a
 * production KDF would substitute blake3 (Lucent-KSK substrate) + add the
 * security properties the primer flags as open research.
 */
export async function deriveKeySeed(codewords: readonly Bits8[]): Promise<string> {
  const material = canonicalCodeMaterial(codewords);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(material));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** The full constructive proof path, as one object (code → properties → key). */
export async function adinkraEccProof(): Promise<{
  codewords: Bits8[];
  doublyEven: boolean;
  selfDual: boolean;
  dimension: number;
  keySeed: string;
}> {
  const codewords = enumerateCodewords(EXTENDED_HAMMING_8_4_4_GENERATOR);
  return {
    codewords,
    doublyEven: isDoublyEven(codewords),
    selfDual: isSelfDual(codewords),
    dimension: EXTENDED_HAMMING_8_4_4_GENERATOR.length,
    keySeed: await deriveKeySeed(codewords),
  };
}
