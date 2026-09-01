/**
 * Finite conflict-free scheduling boundary for column-inspired modules.
 *
 * A verified planar embedding plus the external Four Color Theorem permits a four-class
 * certificate. This module verifies finite embedding/color certificates and finds an exact
 * minimum coloring for bounded graphs. It does not infer planarity, neuroscience, or semantics.
 *
 * THE THEOREM IS ONLY APPEALED TO WHEN A WITNESS IS SUPPLIED. `tryFourClassCertificate`
 * reports `viaFourColorTheorem` and `planarity` separately from the colour count, because
 * four classes found by the exact solver is a fact about THIS graph and cites nothing. The
 * earlier signature took no witness, so the citation above was attached to a code path that
 * never used it.
 */

import { stringCompare } from "../collation/collation";

export interface ConflictGraph {
  readonly vertices: readonly string[];
  readonly edges: readonly (readonly [string, string])[];
}

export interface PlanarEmbeddingWitness {
  /** Oriented facial boundary cycles for a connected cellular embedding on the sphere. */
  readonly faces: readonly (readonly string[])[];
}

export interface ColorSchedule {
  readonly colorCount: number;
  readonly assignment: Readonly<Record<string, number>>;
  readonly classes: readonly (readonly string[])[];
}

export interface EmbeddingVerification {
  readonly valid: boolean;
  readonly violations: readonly string[];
  readonly eulerCharacteristic: number;
}

function canonicalGraph(graph: ConflictGraph): {
  readonly vertices: readonly string[];
  readonly edges: readonly (readonly [string, string])[];
  readonly adjacency: ReadonlyMap<string, ReadonlySet<string>>;
} {
  const vertices = [...new Set(graph.vertices)].sort(stringCompare);
  if (vertices.length !== graph.vertices.length) throw new Error("duplicate vertex identifier");
  const known = new Set(vertices);
  const edgeKeys = new Set<string>();
  const edges: [string, string][] = [];
  const adjacency = new Map(vertices.map((vertex) => [vertex, new Set<string>()]));
  for (const [rawLeft, rawRight] of graph.edges) {
    if (!known.has(rawLeft) || !known.has(rawRight)) throw new Error("edge endpoint is not a declared vertex");
    if (rawLeft === rawRight) throw new Error("self-conflict cannot be scheduled by vertex coloring");
    const [left, right] = stringCompare(rawLeft, rawRight) < 0 ? [rawLeft, rawRight] : [rawRight, rawLeft];
    const key = `${left}\u0000${right}`;
    if (edgeKeys.has(key)) continue;
    edgeKeys.add(key);
    edges.push([left, right]);
    adjacency.get(left)?.add(right);
    adjacency.get(right)?.add(left);
  }
  edges.sort(([a0, a1], [b0, b1]) => stringCompare(a0, b0) || stringCompare(a1, b1));
  return { vertices, edges, adjacency };
}

/**
 * Public canonical proof-lineage form. This exposes the exact vertex and endpoint order used by
 * coloring without leaking the mutable adjacency implementation.
 */
export function canonicalConflictGraph(graph: ConflictGraph): {
  readonly vertices: readonly string[];
  readonly edges: readonly (readonly [string, string])[];
} {
  const canonical = canonicalGraph(graph);
  return {
    vertices: Object.freeze([...canonical.vertices]),
    edges: Object.freeze(canonical.edges.map(([left, right]) => Object.freeze([left, right] as const))),
  };
}

function directedEdge(left: string, right: string): string {
  return `${left}\u0000${right}`;
}

export function verifyPlanarEmbedding(
  graph: ConflictGraph,
  witness: PlanarEmbeddingWitness,
): EmbeddingVerification {
  const canonical = canonicalGraph(graph);
  const violations: string[] = [];
  const known = new Set(canonical.vertices);
  const directedCounts = new Map<string, number>();

  for (const [faceIndex, face] of witness.faces.entries()) {
    if (face.length < 3) violations.push(`face ${faceIndex} has fewer than three boundary vertices`);
    if (face.some((vertex) => !known.has(vertex))) violations.push(`face ${faceIndex} names an unknown vertex`);
    for (let index = 0; index < face.length; index += 1) {
      const left = face[index];
      const right = face[(index + 1) % face.length];
      if (left === undefined || right === undefined) continue;
      const neighbours = canonical.adjacency.get(left);
      if (neighbours?.has(right) !== true) violations.push(`face ${faceIndex} traverses non-edge ${left}-${right}`);
      const key = directedEdge(left, right);
      directedCounts.set(key, (directedCounts.get(key) ?? 0) + 1);
    }
  }

  for (const [left, right] of canonical.edges) {
    const forward = directedCounts.get(directedEdge(left, right)) ?? 0;
    const backward = directedCounts.get(directedEdge(right, left)) ?? 0;
    if (forward !== 1 || backward !== 1) {
      violations.push(`edge ${left}-${right} requires one facial traversal in each direction; got ${forward}/${backward}`);
    }
  }
  const declaredDirectedTraversals = [...directedCounts.values()].reduce((sum, count) => sum + count, 0);
  if (declaredDirectedTraversals !== 2 * canonical.edges.length) {
    violations.push("facial boundary traversal count is not twice the edge count");
  }

  const eulerCharacteristic = canonical.vertices.length - canonical.edges.length + witness.faces.length;
  if (canonical.vertices.length > 0 && eulerCharacteristic !== 2) {
    violations.push(`connected spherical embedding requires V-E+F=2; got ${eulerCharacteristic}`);
  }

  if (canonical.vertices.length > 0) {
    const visited = new Set<string>();
    const queue = [canonical.vertices[0]];
    while (queue.length > 0) {
      const current = queue.shift();
      if (current === undefined || visited.has(current)) continue;
      visited.add(current);
      for (const neighbour of canonical.adjacency.get(current) ?? []) queue.push(neighbour);
    }
    if (visited.size !== canonical.vertices.length) violations.push("embedding witness currently requires a connected graph");
  }

  return { valid: violations.length === 0, violations, eulerCharacteristic };
}

function scheduleFromAssignment(
  vertices: readonly string[],
  assignment: Readonly<Record<string, number>>,
  colorCount: number,
): ColorSchedule {
  const classes = Array.from({ length: colorCount }, () => [] as string[]);
  for (const vertex of vertices) {
    const color = assignment[vertex];
    if (color === undefined || color < 0 || color >= colorCount) throw new Error("assignment contains an invalid color");
    classes[color]?.push(vertex);
  }
  const frozenClasses: readonly (readonly string[])[] = classes.map((members) => Object.freeze([...members]));
  return { colorCount, assignment: Object.freeze({ ...assignment }), classes: frozenClasses };
}

export function countScheduleConflicts(graph: ConflictGraph, schedule: ColorSchedule): number {
  const canonical = canonicalGraph(graph);
  return canonical.edges.reduce(
    (count, [left, right]) => count + (schedule.assignment[left] === schedule.assignment[right] ? 1 : 0),
    0,
  );
}

function tryColor(graph: ReturnType<typeof canonicalGraph>, colorCount: number): ColorSchedule | null {
  const order = [...graph.vertices].sort((left, right) => {
    const degreeDifference = (graph.adjacency.get(right)?.size ?? 0) - (graph.adjacency.get(left)?.size ?? 0);
    return degreeDifference || stringCompare(left, right);
  });
  const assignment: Record<string, number> = {};

  function search(index: number): boolean {
    if (index === order.length) return true;
    const vertex = order[index];
    if (vertex === undefined) return false;
    const forbidden = new Set(
      [...(graph.adjacency.get(vertex) ?? [])]
        .map((neighbour) => assignment[neighbour])
        .filter((color): color is number => color !== undefined),
    );
    for (let color = 0; color < colorCount; color += 1) {
      if (forbidden.has(color)) continue;
      assignment[vertex] = color;
      if (search(index + 1)) return true;
      delete assignment[vertex];
    }
    return false;
  }

  if (!search(0)) return null;
  return scheduleFromAssignment(graph.vertices, assignment, colorCount);
}

export function findMinimumColorSchedule(graph: ConflictGraph): ColorSchedule {
  const canonical = canonicalGraph(graph);
  if (canonical.vertices.length === 0) return { colorCount: 0, assignment: {}, classes: [] };
  for (let colorCount = 1; colorCount <= canonical.vertices.length; colorCount += 1) {
    const schedule = tryColor(canonical, colorCount);
    if (schedule !== null) return schedule;
  }
  throw new Error("finite coloring search failed unexpectedly");
}

/**
 * A four-class schedule together with WHY four classes were permissible.
 *
 * `viaFourColorTheorem` is true ONLY when a planar embedding witness was supplied and
 * verified. Without one, four classes may still be found -- by the exact solver below,
 * which needs no theorem -- and the result is then an ordinary chromatic fact about
 * this graph, carrying no appeal to the Four Color Theorem.
 */
export interface FourClassCertificate {
  /** null when four classes do not suffice for this graph at all. */
  readonly schedule: ColorSchedule | null;
  /** True only when a verified planar embedding licensed the appeal to the theorem. */
  readonly viaFourColorTheorem: boolean;
  /** Planarity as MEASURED: verified, refuted, or never asked. */
  readonly planarity: "verified" | "refuted" | "not-established";
  readonly reason: string;
}

/**
 * Four-class schedule, with planarity reported SEPARATELY from colour count.
 *
 * WHY THE WITNESS IS A PARAMETER. The module header cites the Four Color Theorem, and
 * the claim matrix beside it says an implementation "must separately report planarity
 * status, proper-color validity, and colors used." The earlier signature took a graph
 * and nothing else, so nothing in the call path ever required planarity -- the citation
 * was attached to code that did not use it, and a caller could read a four-class result
 * as a theorem appeal when it was an exact-solver result.
 *
 * The distinction is not pedantic, and K3,3 is the case that shows it: chi(K3,3) = 2, and
 * it is NONPLANAR. Two classes suffice with no theorem in sight. A reader who takes "few
 * classes" as evidence of planarity has the implication backwards, and K5 alone cannot
 * expose that -- K5 is nonplanar AND needs five, so it moves both dials at once.
 */
export function tryFourClassSchedule(
  graph: ConflictGraph,
  embedding?: PlanarEmbeddingWitness,
): ColorSchedule | null {
  return tryFourClassCertificate(graph, embedding).schedule;
}

/** The full certificate: the schedule, and what licensed it. */
export function tryFourClassCertificate(
  graph: ConflictGraph,
  embedding?: PlanarEmbeddingWitness,
): FourClassCertificate {
  const canonical = canonicalGraph(graph);
  const schedule = tryColor(canonical, Math.min(4, canonical.vertices.length));
  const valid = schedule !== null && countScheduleConflicts(graph, schedule) === 0;

  let planarity: FourClassCertificate["planarity"] = "not-established";
  if (embedding !== undefined) {
    planarity = verifyPlanarEmbedding(graph, embedding).valid ? "verified" : "refuted";
  }

  if (!valid || schedule === null) {
    return {
      // null, not an empty schedule: "no four-class colouring exists" and "a colouring
      // with zero colours" are different facts, and a sentinel would conflate them.
      schedule: null,
      viaFourColorTheorem: false,
      planarity,
      reason:
        "no proper colouring with four classes exists for this graph; four classes are not " +
        "sufficient here regardless of planarity",
    };
  }
  const viaFourColorTheorem = planarity === "verified";
  return {
    schedule,
    viaFourColorTheorem,
    planarity,
    reason: viaFourColorTheorem
      ? "a verified planar embedding was supplied, so the Four Color Theorem licenses four classes"
      : planarity === "refuted"
        ? "four classes were FOUND by exact search, but the supplied embedding is not planar -- " +
          "this result appeals to no theorem"
        : "four classes were FOUND by exact search; no embedding was supplied, so planarity is " +
          "NOT established and the Four Color Theorem is not being appealed to",
  };
}
