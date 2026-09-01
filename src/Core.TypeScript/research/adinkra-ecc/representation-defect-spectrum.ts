// Finite representation-defect spectrum for the four Adinkra/Clifford lanes.
//
// Design rule: only lanes exposing both an operator algebra and a carrier receive a numerical
// rank-one defect. The spinorial lane now measures bounded action, bracket, and mixed-Jacobi
// witnesses, but remains `unmeasured` for regularity until it has rank-one module witnesses.

import {
  PRIMES,
  algebraDimension,
  buildCodedAdinkra,
  enumerateCode,
  freeOverSubalgebra,
  popcount,
  type Mask,
} from "./regular-representation-defect";
import { measureNonQuotientHalfSpinAction, type HalfSpinActionCensus } from "./nonquotient-half-spin-action";
import { measureFiniteHalfSpinBracket, type HalfSpinBracketCensus } from "./nonquotient-half-spin-bracket";
import {
  measureFiniteAdinkraHalfSpinIntertwiner,
  type FiniteAdinkraHalfSpinIntertwinerCensus,
} from "./nonquotient-adinkra-halfspin-intertwiner";

export const EXT_HAMMING_8_4_4_ROWS = [
  [1, 0, 0, 0, 0, 1, 1, 1],
  [0, 1, 0, 0, 1, 0, 1, 1],
  [0, 0, 1, 0, 1, 1, 0, 1],
  [0, 0, 0, 1, 1, 1, 1, 0],
] as const;

export const EXT_HAMMING_8_4_4_MASKS: Mask[] = EXT_HAMMING_8_4_4_ROWS.map((row) =>
  row.reduce<number>((mask, bit, index) => mask | (bit << index), 0),
);

export interface MeasuredRegularity {
  readonly status: "measured";
  readonly carrierDimension: number;
  readonly operatorDimension: number;
  readonly defect: number;
  readonly freeRankOne: boolean;
}

export interface UnmeasuredRegularity {
  readonly status: "unmeasured";
  readonly reason: string;
  readonly missingWitnesses: readonly string[];
}

export type RegularityMeasurement = MeasuredRegularity | UnmeasuredRegularity;

export interface FullColourLane {
  readonly id: "uncoded-cube" | "coded-quotient";
  readonly colourCount: number;
  readonly codeDimension: number;
  readonly codewordCount: number;
  readonly regularity: MeasuredRegularity;
}

export interface ColourResidueWitness {
  readonly colours: readonly number[];
  readonly colourMask: number;
  readonly orbitRank: number;
  readonly freeRankOne: boolean;
}

export interface ColouredResidueLane {
  readonly id: "coloured-residue";
  readonly colourCount: number;
  readonly selectedColourCount: number;
  readonly candidateSubsetCount: number;
  readonly workingSubsetCount: number;
  readonly failingSubsetCount: number;
  readonly perColourWorkingInclusions: readonly number[];
  readonly canonicalSelection: false;
  readonly witnesses: readonly ColourResidueWitness[];
  readonly regularity: MeasuredRegularity;
}

export interface BivectorSpinorLane {
  readonly id: "bivector-spinor";
  readonly ambientVectorDimension: 16;
  readonly bivectorDimension: 120;
  readonly halfSpinorDimension: 128;
  readonly totalDimension: 248;
  readonly quotientApplied: false;
  readonly actionCensus: HalfSpinActionCensus;
  /** Exact finite witness; it is not a regular-module measurement. */
  readonly bracketCensus: HalfSpinBracketCensus;
  readonly regularity: UnmeasuredRegularity;
}

export interface CodedHalfSpinIntertwinerLane {
  readonly id: "coded-half-spin-intertwiner";
  readonly sourceDimension: 16;
  readonly targetDimension: 128;
  readonly evenGeneratorCount: 7;
  /** Exact finite equivariance witness; it is not a regular-module measurement. */
  readonly census: FiniteAdinkraHalfSpinIntertwinerCensus;
  readonly regularity: UnmeasuredRegularity;
}

export interface RepresentationDefectSpectrum {
  readonly uncoded: FullColourLane;
  readonly coded: FullColourLane;
  readonly colouredResidue: ColouredResidueLane;
  readonly bivectorSpinor: BivectorSpinorLane;
  readonly codedHalfSpinIntertwiner: CodedHalfSpinIntertwinerLane;
}

let cachedBracketCensus: HalfSpinBracketCensus | undefined;

function measuredBracketCensus(): HalfSpinBracketCensus {
  cachedBracketCensus ??= measureFiniteHalfSpinBracket({ applyTopWedgeReversion: true });
  return cachedBracketCensus;
}

function choose(values: readonly number[], count: number): number[][] {
  const out: number[][] = [];
  const walk = (start: number, picked: number[]): void => {
    if (picked.length === count) {
      out.push(picked);
      return;
    }
    for (let index = start; index < values.length; index++) {
      const value = values[index];
      if (value !== undefined) walk(index + 1, [...picked, value]);
    }
  };
  walk(0, []);
  return out;
}

function colourMask(colours: readonly number[]): number {
  return colours.reduce((mask, colour) => mask | (1 << colour), 0);
}

function measured(carrierDimension: number, operatorDimension: number): MeasuredRegularity {
  return {
    status: "measured",
    carrierDimension,
    operatorDimension,
    defect: operatorDimension / carrierDimension,
    freeRankOne: operatorDimension === carrierDimension,
  };
}

export function requireMeasuredRegularity(measurement: RegularityMeasurement): MeasuredRegularity {
  if (measurement.status === "unmeasured") {
    throw new Error(`regularity is unmeasured: ${measurement.reason}`);
  }
  return measurement;
}

export function measureRepresentationDefectSpectrum(
  square: 1 | -1 = -1,
  prime: number = PRIMES[0],
): RepresentationDefectSpectrum {
  const uncoded = buildCodedAdinkra(8, [], square);
  const coded = buildCodedAdinkra(8, EXT_HAMMING_8_4_4_MASKS, square);

  const candidateSubsets = choose(
    Array.from({ length: coded.n }, (_, index) => index),
    coded.n - coded.k,
  );
  const witnesses: ColourResidueWitness[] = candidateSubsets.map((colours) => {
    const orbitRank = freeOverSubalgebra(coded, colours, prime);
    return {
      colours,
      colourMask: colourMask(colours),
      orbitRank,
      freeRankOne: orbitRank === coded.reps.length,
    };
  });
  const working = witnesses.filter((witness) => witness.freeRankOne);
  const perColourWorkingInclusions = Array.from(
    { length: coded.n },
    (_, colour) => working.filter((witness) => witness.colours.includes(colour)).length,
  );

  const bivectorDimension = (16 * 15) / 2;
  const halfSpinorDimension = 2 ** (16 / 2 - 1);
  const totalDimension = bivectorDimension + halfSpinorDimension;
  if (totalDimension !== 248) throw new Error(`unexpected spinorial E8 dimension: ${totalDimension}`);
  const actionCensus = measureNonQuotientHalfSpinAction();
  const bracketCensus = measuredBracketCensus();
  const intertwinerCensus = measureFiniteAdinkraHalfSpinIntertwiner({ field: prime });

  return {
    uncoded: {
      id: "uncoded-cube",
      colourCount: uncoded.n,
      codeDimension: 0,
      codewordCount: 1,
      regularity: measured(uncoded.reps.length, algebraDimension(uncoded, prime)),
    },
    coded: {
      id: "coded-quotient",
      colourCount: coded.n,
      codeDimension: coded.k,
      codewordCount: enumerateCode(EXT_HAMMING_8_4_4_MASKS).length,
      regularity: measured(coded.reps.length, algebraDimension(coded, prime)),
    },
    colouredResidue: {
      id: "coloured-residue",
      colourCount: coded.n,
      selectedColourCount: coded.n - coded.k,
      candidateSubsetCount: witnesses.length,
      workingSubsetCount: working.length,
      failingSubsetCount: witnesses.length - working.length,
      perColourWorkingInclusions,
      canonicalSelection: false,
      witnesses,
      regularity: measured(coded.reps.length, 1 << (coded.n - coded.k)),
    },
    bivectorSpinor: {
      id: "bivector-spinor",
      ambientVectorDimension: 16,
      bivectorDimension: 120,
      halfSpinorDimension: 128,
      totalDimension,
      quotientApplied: false,
      actionCensus,
      bracketCensus,
      regularity: {
        status: "unmeasured",
        reason:
          "the finite so(16) action, normalized spinor bracket, and mixed Jacobi witness are measured, but regular-module rank-one witnesses are absent",
        missingWitnesses: [
          "an injectivity test for the declared spinor bracket",
          "a separately declared regular-module carrier",
          "a rank-one-freeness test",
        ],
      },
    },
    codedHalfSpinIntertwiner: {
      id: "coded-half-spin-intertwiner",
      sourceDimension: 16,
      targetDimension: 128,
      evenGeneratorCount: 7,
      census: intertwinerCensus,
      regularity: {
        status: "unmeasured",
        reason:
          "a full-rank intertwiner is measured for one declared seven-generator restriction, but this is not a regular-module rank-one census",
        missingWitnesses: [
          "a separately declared regular-module carrier",
          "a rank-one-freeness test for that carrier",
          "an embedding-independent regularity definition",
        ],
      },
    },
  };
}

export function codewordSupportMasks(): readonly number[] {
  return enumerateCode(EXT_HAMMING_8_4_4_MASKS)
    .filter((word) => word !== 0)
    .map((word) => word)
    .filter((word) => popcount(word) === 4);
}
