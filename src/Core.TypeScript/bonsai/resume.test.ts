import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { binary, cbool, cint, lambda, param, type ConstValue, type Expr, type Result } from "./bonsai";
import { parseState, resume, serializeState, start, type ResumeFeedback, type SagaStep } from "./resume";

interface Trace {
  readonly name: string;
  readonly program: Expr;
  readonly bindings: Record<string, ConstValue>;
  readonly activityResults: readonly ConstValue[];
  readonly expectedSuspensions: readonly { readonly fn: string; readonly args: readonly ConstValue[] }[];
  readonly expectedFinal: ConstValue;
}

const goldenPath = join(dirname(fileURLToPath(import.meta.url)), "resume-golden.json");
const golden = JSON.parse(readFileSync(goldenPath, "utf8")) as { readonly traces: readonly Trace[] };

function stepOk(r: Result<SagaStep, ResumeFeedback>): SagaStep {
  if (!r.ok) throw new Error(`expected Ok SagaStep, got Error ${JSON.stringify(r.error)}`);
  return r.value;
}

// Replay each golden trace; at EVERY suspension persist the state and resume from the
// re-parsed state — proving restore-not-replay (the continuation round-trips; prior
// activities are never re-invoked) AND the cross-language suspension/final contract.
for (const tr of golden.traces) {
  test(`resume golden: ${tr.name}`, () => {
    let step = stepOk(start(tr.program, tr.bindings));
    for (let i = 0; i < tr.expectedSuspensions.length; i++) {
      expect(step.kind).toBe("suspended");
      if (step.kind !== "suspended") return;
      expect(step.activity).toEqual(tr.expectedSuspensions[i]!);

      // persist → re-parse → resume from the RESTORED state (not a replay from the top)
      const ser = serializeState(step.state);
      expect(ser.ok).toBe(true);
      if (!ser.ok) return;
      const restored = parseState(ser.value);
      expect(restored.ok).toBe(true);
      if (!restored.ok) return;
      // canonical round-trip is byte-stable
      const reser = serializeState(restored.value);
      expect(reser.ok).toBe(true);
      if (reser.ok) expect(reser.value).toBe(ser.value);

      step = stepOk(resume(restored.value, tr.activityResults[i]!));
    }
    expect(step.kind).toBe("done");
    if (step.kind !== "done") return;
    expect(step.value).toEqual(tr.expectedFinal);
  });
}

test("golden traces are loaded", () => {
  expect(golden.traces.length).toBeGreaterThan(0);
});

// ---- feedback-variant rejections ----

test("unbound param declines Unbound", () => {
  const r = start(param("missing"));
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.error.kind).toBe("Unbound");
});

test("type mismatch declines TypeMismatch", () => {
  // add requires int operands; a bool operand is a type error
  const r = start(binary("add", cint(1), cbool(true)));
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.error.kind).toBe("TypeMismatch");
});

test("lambda in eval position declines UnsupportedNode (slice-1)", () => {
  const r = start(lambda(["x"], cint(1)));
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.error.kind).toBe("UnsupportedNode");
});

// ---- state serialization round-trip ----

test("serializeState / parseState round-trip + resume-from-restored equals resume-from-original", () => {
  // a 2-activity saga: suspend at the first, persist, restore, and resume both ways
  const program = binary("add", { kind: "call", fn: "x", args: [] }, { kind: "call", fn: "y", args: [] });
  const s0 = stepOk(start(program));
  expect(s0.kind).toBe("suspended");
  if (s0.kind !== "suspended") return;

  const ser = serializeState(s0.state);
  expect(ser.ok).toBe(true);
  if (!ser.ok) return;
  const restored = parseState(ser.value);
  expect(restored.ok).toBe(true);
  if (!restored.ok) return;

  const fromOriginal = stepOk(resume(s0.state, { t: "int", v: 1 }));
  const fromRestored = stepOk(resume(restored.value, { t: "int", v: 1 }));
  expect(fromRestored).toEqual(fromOriginal);
});

test("parseState declines MalformedState on junk + on an unsupported version", () => {
  const a = parseState("not json");
  expect(a.ok).toBe(false);
  if (!a.ok) expect(a.error.kind).toBe("MalformedState");

  const b = parseState('{"v":2,"kont":[],"awaiting":{"fn":"a","args":[]}}');
  expect(b.ok).toBe(false);
  if (!b.ok) expect(b.error.kind).toBe("MalformedState");
});
