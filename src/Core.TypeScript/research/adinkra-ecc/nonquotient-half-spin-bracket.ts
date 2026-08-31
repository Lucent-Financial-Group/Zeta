/**
 * Finite half-spin bracket census.
 *
 * Design boundary: this separately declares a complex-bilinear top-wedge
 * pairing on the even Fock carrier, a unit-normalized map Lambda^2(S+) to
 * so(16), and the 1/2 gamma_i gamma_j spinor action.  It measures exact
 * finite-basis identities; it does not assert an E8 construction, a physical
 * model, a regular-module witness, or a homoiconicity score.
 */

import { gammaAction, type Complex, type HalfSpinActionOptions } from "./nonquotient-half-spin-action";

const MODE_COUNT = 8;
const GENERATOR_COUNT = MODE_COUNT * 2;
const FULL_MASK = (1 << MODE_COUNT) - 1;
const ZERO: Complex = { re: 0, im: 0 };

export interface BivectorCoordinate {
  readonly first: number;
  readonly second: number;
  readonly coefficient: Complex;
}

export interface SpinorCoordinate {
  readonly mask: number;
  readonly coefficient: Complex;
}

export interface HalfSpinBracketOptions {
  /** Fault injection only: delegates to the existing gamma parity mutant. */
  readonly omitJordanWignerParity?: boolean;
  /** Fault injection only: discards the ordered top-wedge sign. */
  readonly omitTopWedgeOrderSign?: boolean;
  /**
   * Declared comparison convention: apply the Clifford reversion sign
   * (-1)^(k(k-1)/2) to the left exterior degree before taking its top wedge.
   * The naive top-wedge convention remains separately measurable.
   */
  readonly applyTopWedgeReversion?: boolean;
  /** Fault injection only: omits the declared 1/2 bivector action factor. */
  readonly omitBivectorHalf?: boolean;
  /** Fault injection only: conjugates the second pairing argument. */
  readonly conjugatePairingRight?: boolean;
  /** Fault injection only: negates exactly one bracket coordinate. */
  readonly flipBracketCoordinate?: readonly [first: number, second: number];
}

export interface HalfSpinBracketCensus {
  readonly carrierDimension: number;
  readonly bivectorGeneratorCount: number;
  readonly bracketAntisymmetryViolations: number;
  readonly actionNormalizationViolations: number;
  readonly bracketEquivarianceViolations: number;
  readonly mixedJacobiViolations: number;
  readonly firstMixedJacobiWitness: readonly [number, number, number] | null;
}

function complex(re: number, im = 0): Complex {
  return { re, im };
}

function add(left: Complex, right: Complex): Complex {
  return complex(left.re + right.re, left.im + right.im);
}

function multiply(left: Complex, right: Complex): Complex {
  return complex(left.re * right.re - left.im * right.im, left.re * right.im + left.im * right.re);
}

function scale(value: Complex, factor: number): Complex {
  return complex(value.re * factor, value.im * factor);
}

function conjugate(value: Complex): Complex {
  return complex(value.re, -value.im);
}

function isZero(value: Complex): boolean {
  return value.re === 0 && value.im === 0;
}

function equal(left: Complex, right: Complex): boolean {
  return left.re === right.re && left.im === right.im;
}

function parity(mask: number): number {
  let count = 0;
  for (let cursor = mask; cursor !== 0; cursor >>>= 1) {
    count += cursor & 1;
  }
  return count % 2;
}

function positiveMasks(): readonly number[] {
  const masks: number[] = [];
  for (let mask = 0; mask <= FULL_MASK; mask += 1) {
    if (parity(mask) === 0) masks.push(mask);
  }
  return masks;
}

const POSITIVE_MASKS = positiveMasks();

function bivectorPairs(): readonly (readonly [number, number])[] {
  const pairs: [number, number][] = [];
  for (let first = 0; first < GENERATOR_COUNT; first += 1) {
    for (let second = first + 1; second < GENERATOR_COUNT; second += 1) {
      pairs.push([first, second]);
    }
  }
  return pairs;
}

const BIVECTORS = bivectorPairs();

function pairingWedgeSign(firstMask: number, secondMask: number): number {
  if ((firstMask & secondMask) !== 0 || (firstMask | secondMask) !== FULL_MASK) return 0;
  let inversions = 0;
  for (let mode = 0; mode < MODE_COUNT; mode += 1) {
    if ((firstMask & (1 << mode)) !== 0) {
      inversions += bitCount(secondMask & ((1 << mode) - 1));
    }
  }
  return inversions % 2 === 0 ? 1 : -1;
}

function reversionSign(mask: number): number {
  const degree = bitCount(mask);
  return (degree * (degree - 1) / 2) % 2 === 0 ? 1 : -1;
}

function bitCount(mask: number): number {
  let count = 0;
  for (let cursor = mask; cursor !== 0; cursor >>>= 1) count += cursor & 1;
  return count;
}

function gammaProduct(first: number, second: number, mask: number, options: HalfSpinBracketOptions): SpinorCoordinate {
  const gammaOptions: HalfSpinActionOptions = options.omitJordanWignerParity ? { omitJordanWignerParity: true } : {};
  const right = gammaAction(second, mask, gammaOptions);
  const left = gammaAction(first, right.target, gammaOptions);
  return { mask: left.target, coefficient: multiply(left.coefficient, right.coefficient) };
}

function coordinateKey(first: number, second: number): string {
  return `${first},${second}`;
}

function canonicalBivector(first: number, second: number, coefficient: Complex): BivectorCoordinate | null {
  if (first === second || isZero(coefficient)) return null;
  return first < second
    ? { first, second, coefficient }
    : { first: second, second: first, coefficient: scale(coefficient, -1) };
}

function mapBivectors(terms: readonly BivectorCoordinate[]): Map<string, BivectorCoordinate> {
  const result = new Map<string, BivectorCoordinate>();
  for (const term of terms) {
    const normalized = canonicalBivector(term.first, term.second, term.coefficient);
    if (normalized === null) continue;
    const key = coordinateKey(normalized.first, normalized.second);
    const previous = result.get(key);
    const next = add(previous?.coefficient ?? ZERO, normalized.coefficient);
    if (isZero(next)) result.delete(key);
    else result.set(key, { ...normalized, coefficient: next });
  }
  return result;
}

function mapSpinors(terms: readonly SpinorCoordinate[]): Map<number, Complex> {
  const result = new Map<number, Complex>();
  for (const term of terms) {
    const next = add(result.get(term.mask) ?? ZERO, term.coefficient);
    if (isZero(next)) result.delete(term.mask);
    else result.set(term.mask, next);
  }
  return result;
}

function equalBivectors(left: ReadonlyMap<string, BivectorCoordinate>, right: ReadonlyMap<string, BivectorCoordinate>): boolean {
  if (left.size !== right.size) return false;
  for (const [key, term] of left) {
    const expected = right.get(key);
    if (expected === undefined || !equal(term.coefficient, expected.coefficient)) return false;
  }
  return true;
}

function equalSpinors(left: ReadonlyMap<number, Complex>, right: ReadonlyMap<number, Complex>): boolean {
  if (left.size !== right.size) return false;
  for (const [mask, coefficient] of left) {
    const expected = right.get(mask);
    if (expected === undefined || !equal(coefficient, expected)) return false;
  }
  return true;
}

function topWedgePairing(firstMask: number, secondMask: number, coefficient: Complex, options: HalfSpinBracketOptions): Complex {
  const sign = pairingWedgeSign(firstMask, secondMask);
  if (sign === 0) return ZERO;
  const orderedSign = options.omitTopWedgeOrderSign ? 1 : sign;
  const antiInvolutionSign = options.applyTopWedgeReversion ? reversionSign(firstMask) : 1;
  const pairedCoefficient = options.conjugatePairingRight ? conjugate(coefficient) : coefficient;
  return scale(pairedCoefficient, orderedSign * antiInvolutionSign);
}

function spinorBracketBasis(leftMask: number, rightMask: number, options: HalfSpinBracketOptions): readonly BivectorCoordinate[] {
  const coordinates: BivectorCoordinate[] = [];
  for (const [first, second] of BIVECTORS) {
    const image = gammaProduct(first, second, rightMask, options);
    let coefficient = topWedgePairing(leftMask, image.mask, image.coefficient, options);
    if (options.flipBracketCoordinate?.[0] === first && options.flipBracketCoordinate[1] === second) {
      coefficient = scale(coefficient, -1);
    }
    if (!isZero(coefficient)) coordinates.push({ first, second, coefficient });
  }
  return coordinates;
}

function spinorBracketLinear(
  left: readonly SpinorCoordinate[],
  right: readonly SpinorCoordinate[],
  table: ReadonlyMap<number, readonly BivectorCoordinate[]>,
): Map<string, BivectorCoordinate> {
  const terms: BivectorCoordinate[] = [];
  for (const leftTerm of left) {
    for (const rightTerm of right) {
      const basisTerms = table.get((leftTerm.mask << MODE_COUNT) | rightTerm.mask);
      if (basisTerms === undefined) throw new Error("positive-chirality bracket table entry unexpectedly absent");
      const scalar = multiply(leftTerm.coefficient, rightTerm.coefficient);
      for (const basisTerm of basisTerms) {
        terms.push({ ...basisTerm, coefficient: multiply(scalar, basisTerm.coefficient) });
      }
    }
  }
  return mapBivectors(terms);
}

function actionOnSpinorBasis(first: number, second: number, mask: number, options: HalfSpinBracketOptions): SpinorCoordinate {
  const image = gammaProduct(first, second, mask, options);
  return { mask: image.mask, coefficient: scale(image.coefficient, options.omitBivectorHalf ? 1 : 0.5) };
}

function actionOnSpinors(
  first: number,
  second: number,
  source: readonly SpinorCoordinate[],
  options: HalfSpinBracketOptions,
): Map<number, Complex> {
  const terms: SpinorCoordinate[] = [];
  for (const term of source) {
    const image = actionOnSpinorBasis(first, second, term.mask, options);
    terms.push({ mask: image.mask, coefficient: multiply(term.coefficient, image.coefficient) });
  }
  return mapSpinors(terms);
}

function soBracket(
  first: number,
  second: number,
  third: number,
  fourth: number,
): readonly BivectorCoordinate[] {
  const terms: BivectorCoordinate[] = [];
  const append = (left: number, right: number, factor: number): void => {
    const term = canonicalBivector(left, right, complex(factor));
    if (term !== null) terms.push(term);
  };
  if (second === third) append(first, fourth, 1);
  if (first === third) append(second, fourth, -1);
  if (second === fourth) append(first, third, -1);
  if (first === fourth) append(second, third, 1);
  return terms;
}

function actionOnBivectors(
  first: number,
  second: number,
  source: readonly BivectorCoordinate[],
): Map<string, BivectorCoordinate> {
  const terms: BivectorCoordinate[] = [];
  for (const term of source) {
    for (const bracketTerm of soBracket(first, second, term.first, term.second)) {
      terms.push({ ...bracketTerm, coefficient: multiply(term.coefficient, bracketTerm.coefficient) });
    }
  }
  return mapBivectors(terms);
}

function tableFor(options: HalfSpinBracketOptions): ReadonlyMap<number, readonly BivectorCoordinate[]> {
  const table = new Map<number, readonly BivectorCoordinate[]>();
  for (const left of POSITIVE_MASKS) {
    for (const right of POSITIVE_MASKS) {
      table.set((left << MODE_COUNT) | right, spinorBracketBasis(left, right, options));
    }
  }
  return table;
}

function coordinatesFromMap(source: ReadonlyMap<number, Complex>): readonly SpinorCoordinate[] {
  return [...source].map(([mask, coefficient]) => ({ mask, coefficient }));
}

function countAntisymmetry(table: ReadonlyMap<number, readonly BivectorCoordinate[]>): number {
  let violations = 0;
  for (const left of POSITIVE_MASKS) {
    for (const right of POSITIVE_MASKS) {
      const forward = table.get((left << MODE_COUNT) | right);
      const backward = table.get((right << MODE_COUNT) | left);
      if (forward === undefined || backward === undefined) throw new Error("bracket table entry unexpectedly absent");
      const negated = backward.map((term) => ({ ...term, coefficient: scale(term.coefficient, -1) }));
      if (!equalBivectors(mapBivectors(forward), mapBivectors(negated))) violations += 1;
    }
  }
  return violations;
}

function countActionNormalization(options: HalfSpinBracketOptions): number {
  let violations = 0;
  for (const [first, second] of BIVECTORS) {
    for (const [third, fourth] of BIVECTORS) {
      for (const mask of POSITIVE_MASKS) {
        const right = actionOnSpinorBasis(third, fourth, mask, options);
        const observed = actionOnSpinors(first, second, [right], options);
        const left = actionOnSpinorBasis(first, second, mask, options);
        const reverse = actionOnSpinors(third, fourth, [left], options);
        const commutator = mapSpinors([
          ...coordinatesFromMap(observed),
          ...coordinatesFromMap(reverse).map((term) => ({ ...term, coefficient: scale(term.coefficient, -1) })),
        ]);
        const expected = actionOnSpinorsFromBivectors(soBracket(first, second, third, fourth), mask, options);
        if (!equalSpinors(commutator, expected)) violations += 1;
      }
    }
  }
  return violations;
}

function actionOnSpinorsFromBivectors(
  source: readonly BivectorCoordinate[],
  mask: number,
  options: HalfSpinBracketOptions,
): Map<number, Complex> {
  const terms: SpinorCoordinate[] = [];
  for (const term of source) {
    const image = actionOnSpinorBasis(term.first, term.second, mask, options);
    terms.push({ mask: image.mask, coefficient: multiply(term.coefficient, image.coefficient) });
  }
  return mapSpinors(terms);
}

function countEquivariance(table: ReadonlyMap<number, readonly BivectorCoordinate[]>, options: HalfSpinBracketOptions): number {
  let violations = 0;
  for (const [first, second] of BIVECTORS) {
    for (const leftMask of POSITIVE_MASKS) {
      for (const rightMask of POSITIVE_MASKS) {
        const bracket = table.get((leftMask << MODE_COUNT) | rightMask);
        if (bracket === undefined) throw new Error("bracket table entry unexpectedly absent");
        const leftSide = actionOnBivectors(first, second, bracket);
        const actionLeft = coordinatesFromMap(actionOnSpinors(first, second, [{ mask: leftMask, coefficient: complex(1) }], options));
        const actionRight = coordinatesFromMap(actionOnSpinors(first, second, [{ mask: rightMask, coefficient: complex(1) }], options));
        const rightSide = mapBivectors([
          ...spinorBracketLinear(actionLeft, [{ mask: rightMask, coefficient: complex(1) }], table).values(),
          ...spinorBracketLinear([{ mask: leftMask, coefficient: complex(1) }], actionRight, table).values(),
        ]);
        if (!equalBivectors(leftSide, rightSide)) violations += 1;
      }
    }
  }
  return violations;
}

function countMixedJacobi(
  table: ReadonlyMap<number, readonly BivectorCoordinate[]>,
  options: HalfSpinBracketOptions,
): readonly [number, readonly [number, number, number] | null] {
  let violations = 0;
  let firstWitness: readonly [number, number, number] | null = null;
  for (const leftMask of POSITIVE_MASKS) {
    for (const middleMask of POSITIVE_MASKS) {
      for (const rightMask of POSITIVE_MASKS) {
        const first = table.get((leftMask << MODE_COUNT) | middleMask);
        const second = table.get((middleMask << MODE_COUNT) | rightMask);
        const third = table.get((rightMask << MODE_COUNT) | leftMask);
        if (first === undefined || second === undefined || third === undefined) throw new Error("bracket table entry unexpectedly absent");
        const result = mapSpinors([
          ...coordinatesFromMap(actionOnSpinorsFromBivectors(first, rightMask, options)),
          ...coordinatesFromMap(actionOnSpinorsFromBivectors(second, leftMask, options)),
          ...coordinatesFromMap(actionOnSpinorsFromBivectors(third, middleMask, options)),
        ]);
        if (result.size !== 0) {
          violations += 1;
          firstWitness ??= [leftMask, middleMask, rightMask];
        }
      }
    }
  }
  return [violations, firstWitness];
}

/** Measures the declared finite complexified bracket; all equality is exact dyadic arithmetic. */
export function measureFiniteHalfSpinBracket(options: HalfSpinBracketOptions = {}): HalfSpinBracketCensus {
  const table = tableFor(options);
  const [mixedJacobiViolations, firstMixedJacobiWitness] = countMixedJacobi(table, options);
  return {
    carrierDimension: POSITIVE_MASKS.length,
    bivectorGeneratorCount: BIVECTORS.length,
    bracketAntisymmetryViolations: countAntisymmetry(table),
    actionNormalizationViolations: countActionNormalization(options),
    bracketEquivarianceViolations: countEquivariance(table, options),
    mixedJacobiViolations,
    firstMixedJacobiWitness,
  };
}
