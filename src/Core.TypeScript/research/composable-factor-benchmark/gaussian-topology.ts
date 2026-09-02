/**
 * CFB-A: exact finite Gaussian composition benchmark.
 * The balanced DAG changes reduction topology, not evidence or the posterior algebra.
 */

export interface GaussianEvidence {
  readonly id: string;
  readonly mean: number;
  readonly variance: number;
}

export interface GaussianNatural {
  readonly precisionMean: number;
  readonly precision: number;
}

export interface GaussianMoment {
  readonly mean: number;
  readonly variance: number;
}

export interface GaussianReduction {
  readonly posterior: GaussianMoment;
  readonly natural: GaussianNatural;
  readonly productCount: number;
  readonly criticalPathDepth: number;
  readonly evidenceIds: readonly string[];
}

export interface GaussianTopologyCensus {
  readonly evidenceCount: number;
  readonly dense: GaussianReduction;
  readonly chain: GaussianReduction;
  readonly balancedDag: GaussianReduction;
  readonly reversedChain: GaussianReduction;
  readonly branchDrop: GaussianReduction;
  readonly droppedEvidenceId: string;
  readonly maxMomentDifference: number;
  readonly branchDropMomentDifference: number;
}

function assertEvidence(evidence: GaussianEvidence): void {
  if (evidence.id.length === 0) throw new Error("CFB-A-EMPTY-ID");
  if (!Number.isFinite(evidence.mean)) throw new Error(`CFB-A-NON-FINITE-MEAN:${evidence.id}`);
  if (!Number.isFinite(evidence.variance) || evidence.variance <= 0) {
    throw new Error(`CFB-A-INVALID-VARIANCE:${evidence.id}`);
  }
}

export function toNatural(evidence: GaussianEvidence): GaussianNatural {
  assertEvidence(evidence);
  const precision = 1 / evidence.variance;
  return { precisionMean: evidence.mean * precision, precision };
}

export function product(left: GaussianNatural, right: GaussianNatural): GaussianNatural {
  return {
    precisionMean: left.precisionMean + right.precisionMean,
    precision: left.precision + right.precision,
  };
}

export function toMoment(natural: GaussianNatural): GaussianMoment {
  if (!Number.isFinite(natural.precision) || natural.precision <= 0 || !Number.isFinite(natural.precisionMean)) {
    throw new Error("CFB-A-IMPROPER-POSTERIOR");
  }
  return { mean: natural.precisionMean / natural.precision, variance: 1 / natural.precision };
}

function reduction(natural: GaussianNatural, productCount: number, criticalPathDepth: number, evidenceIds: readonly string[]): GaussianReduction {
  return { posterior: toMoment(natural), natural, productCount, criticalPathDepth, evidenceIds };
}

export function denseOracle(evidence: readonly GaussianEvidence[]): GaussianReduction {
  if (evidence.length === 0) throw new Error("CFB-A-EMPTY-EVIDENCE");
  let precision = 0;
  let precisionMean = 0;
  for (const item of evidence) {
    const natural = toNatural(item);
    precision += natural.precision;
    precisionMean += natural.precisionMean;
  }
  return reduction({ precisionMean, precision }, evidence.length - 1, 1, evidence.map((item) => item.id));
}

export function chainReduction(evidence: readonly GaussianEvidence[]): GaussianReduction {
  const first = evidence[0];
  if (first === undefined) throw new Error("CFB-A-EMPTY-EVIDENCE");
  let combined = toNatural(first);
  for (let index = 1; index < evidence.length; index += 1) {
    const item = evidence[index];
    if (item === undefined) throw new Error(`CFB-A-MISSING-EVIDENCE:${String(index)}`);
    combined = product(combined, toNatural(item));
  }
  return reduction(combined, evidence.length - 1, evidence.length - 1, evidence.map((item) => item.id));
}

interface BalancedNode {
  readonly natural: GaussianNatural;
  readonly productCount: number;
  readonly depth: number;
  readonly ids: readonly string[];
}

export function balancedDagReduction(evidence: readonly GaussianEvidence[]): GaussianReduction {
  if (evidence.length === 0) throw new Error("CFB-A-EMPTY-EVIDENCE");
  let level: BalancedNode[] = evidence.map((item) => ({ natural: toNatural(item), productCount: 0, depth: 0, ids: [item.id] }));
  while (level.length > 1) {
    const next: BalancedNode[] = [];
    for (let index = 0; index < level.length; index += 2) {
      const left = level[index];
      const right = level[index + 1];
      if (left === undefined) throw new Error(`CFB-A-MISSING-NODE:${String(index)}`);
      if (right === undefined) {
        next.push(left);
      } else {
        next.push({
          natural: product(left.natural, right.natural),
          productCount: left.productCount + right.productCount + 1,
          depth: Math.max(left.depth, right.depth) + 1,
          ids: [...left.ids, ...right.ids],
        });
      }
    }
    level = next;
  }
  const root = level[0];
  if (root === undefined) throw new Error("CFB-A-MISSING-ROOT");
  return reduction(root.natural, root.productCount, root.depth, root.ids);
}

function momentDifference(left: GaussianMoment, right: GaussianMoment): number {
  return Math.max(Math.abs(left.mean - right.mean), Math.abs(left.variance - right.variance));
}

export function deterministicEvidence(count: number): readonly GaussianEvidence[] {
  if (!Number.isInteger(count) || count < 2) throw new Error(`CFB-A-COUNT:${String(count)}`);
  return Array.from({ length: count }, (_, index) => ({
    id: `e${String(index).padStart(3, "0")}`,
    mean: ((index % 11) - 5) / 3,
    variance: 1 + ((index * 7) % 13) / 5,
  }));
}

export function measureGaussianTopology(count: number): GaussianTopologyCensus {
  const evidence = deterministicEvidence(count);
  const dense = denseOracle(evidence);
  const chain = chainReduction(evidence);
  const balancedDag = balancedDagReduction(evidence);
  const reversedChain = chainReduction([...evidence].reverse());
  const droppedIndex = Math.floor(evidence.length / 2);
  const dropped = evidence[droppedIndex];
  if (dropped === undefined) throw new Error("CFB-A-DROP-MISSING");
  const branchDrop = balancedDagReduction(evidence.filter((_, index) => index !== droppedIndex));
  return {
    evidenceCount: count,
    dense,
    chain,
    balancedDag,
    reversedChain,
    branchDrop,
    droppedEvidenceId: dropped.id,
    maxMomentDifference: Math.max(
      momentDifference(dense.posterior, chain.posterior),
      momentDifference(dense.posterior, balancedDag.posterior),
      momentDifference(dense.posterior, reversedChain.posterior),
    ),
    branchDropMomentDifference: momentDifference(dense.posterior, branchDrop.posterior),
  };
}
