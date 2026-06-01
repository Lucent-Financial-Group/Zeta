/**
 * bonsai.ts — TS reference (oracle #1) for the **Bonsai-subset** expression-tree
 * serializer (B-0976 slice 1), the cross-language serialization primitive the
 * self-evolving-saga build needs ("serialize the deferred computation's
 * expression tree").
 *
 * Named after Nuqleon **Bonsai** (Reaqtor's compact serializer for .NET
 * expression trees). This is the **weakly-typed / reflection-info-omitted**
 * mode — the cross-language-portable form (the same mode Bonsai uses when its
 * trees are deserialized in native C++ or eval'd in JavaScript): kind-tagged
 * nodes, no .NET type/assembly/member table. The full Nuqleon Bonsai stays the
 * conformance oracle for the .NET-typed mode; this subset is what the
 * TS/F#/C#/Rust oracles agree on byte-for-byte.
 *
 * The node set (the subset): `const` · `param` · `lambda` · `binary` · `call` ·
 * `cond`. Enough to express a real deferred computation (e.g. a recursive
 * factorial), small enough to cross-verify exactly.
 *
 * Canonical form (the cross-oracle byte-diff contract): `serialize` emits
 * **compact JSON** (no whitespace) with a **fixed key order per node-kind**
 * (`kind` first, then fields in declared order) and **integer-only** numeric
 * literals (no floats — float formatting diverges across languages). Two oracles
 * agree iff their `serialize` outputs are byte-identical, and `parse` round-trips
 * (`serialize(parse(s)) === s`, `equals(parse(serialize(e)), e)`). String values
 * use standard JSON escaping. Document wrapper: `{"v":1,"expr":<node>}`.
 */

/** A literal value — tagged so every oracle round-trips the type exactly. */
export type ConstValue =
  | { readonly t: "int"; readonly v: number } // integer only (no floats in the subset)
  | { readonly t: "str"; readonly v: string }
  | { readonly t: "bool"; readonly v: boolean }
  | { readonly t: "null" };

/** The language-agnostic binary operators in the subset. */
export type BinOp = "add" | "sub" | "mul" | "eq" | "lt" | "and" | "or";

/** A Bonsai-subset expression node (kind-tagged discriminated union). */
export type Expr =
  | { readonly kind: "const"; readonly value: ConstValue }
  | { readonly kind: "param"; readonly name: string }
  | { readonly kind: "lambda"; readonly params: readonly string[]; readonly body: Expr }
  | { readonly kind: "binary"; readonly op: BinOp; readonly left: Expr; readonly right: Expr }
  | { readonly kind: "call"; readonly fn: string; readonly args: readonly Expr[] }
  | { readonly kind: "cond"; readonly test: Expr; readonly then: Expr; readonly else: Expr };

/** The serialization format version (the `v` field of the document wrapper). */
export const BONSAI_VERSION = 1;

// ---- constructors (ergonomic builders; optional) ---------------------------

/** A literal-int constant. */
export const cint = (v: number): Expr => ({ kind: "const", value: { t: "int", v: Math.trunc(v) } });
/** A literal-string constant. */
export const cstr = (v: string): Expr => ({ kind: "const", value: { t: "str", v } });
/** A literal-bool constant. */
export const cbool = (v: boolean): Expr => ({ kind: "const", value: { t: "bool", v } });
/** The null constant. */
export const cnull = (): Expr => ({ kind: "const", value: { t: "null" } });
/** A parameter (variable) reference. */
export const param = (name: string): Expr => ({ kind: "param", name });
/** A lambda abstraction. */
export const lambda = (params: readonly string[], body: Expr): Expr => ({ kind: "lambda", params, body });
/** A binary operation. */
export const binary = (op: BinOp, left: Expr, right: Expr): Expr => ({ kind: "binary", op, left, right });
/** A named function application. */
export const call = (fn: string, args: readonly Expr[]): Expr => ({ kind: "call", fn, args });
/** A conditional (`if test then then else else`). */
export const cond = (test: Expr, then: Expr, els: Expr): Expr => ({ kind: "cond", test, then, else: els });

// ---- serialize (canonical, byte-exact) ------------------------------------

/** Emit a constant value in canonical compact form (`t` first, then `v`). */
function emitConst(c: ConstValue): string {
  switch (c.t) {
    case "int":
      return `{"t":"int","v":${Math.trunc(c.v)}}`;
    case "str":
      return `{"t":"str","v":${JSON.stringify(c.v)}}`;
    case "bool":
      return `{"t":"bool","v":${c.v ? "true" : "false"}}`;
    case "null":
      return `{"t":"null"}`;
  }
}

/** Emit a node in canonical compact form (fixed key order per kind). */
function emit(e: Expr): string {
  switch (e.kind) {
    case "const":
      return `{"kind":"const","value":${emitConst(e.value)}}`;
    case "param":
      return `{"kind":"param","name":${JSON.stringify(e.name)}}`;
    case "lambda":
      return `{"kind":"lambda","params":[${e.params.map((p) => JSON.stringify(p)).join(",")}],"body":${emit(e.body)}}`;
    case "binary":
      return `{"kind":"binary","op":${JSON.stringify(e.op)},"left":${emit(e.left)},"right":${emit(e.right)}}`;
    case "call":
      return `{"kind":"call","fn":${JSON.stringify(e.fn)},"args":[${e.args.map(emit).join(",")}]}`;
    case "cond":
      return `{"kind":"cond","test":${emit(e.test)},"then":${emit(e.then)},"else":${emit(e.else)}}`;
  }
}

/** Serialize an expression to the canonical Bonsai-subset string. */
export function serialize(e: Expr): string {
  return `{"v":${BONSAI_VERSION},"expr":${emit(e)}}`;
}

// ---- parse (canonical string -> Expr) -------------------------------------

/** Rebuild a `ConstValue` from parsed JSON (validating the tag). */
function parseConst(n: unknown): ConstValue {
  const o = n as Record<string, unknown>;
  switch (o.t) {
    case "int":
      return { t: "int", v: Math.trunc(o.v as number) };
    case "str":
      return { t: "str", v: o.v as string };
    case "bool":
      return { t: "bool", v: o.v as boolean };
    case "null":
      return { t: "null" };
    default:
      throw new Error(`bonsai: unknown const tag: ${String(o.t)}`);
  }
}

/** Rebuild an `Expr` from parsed JSON (validating the kind). */
function parseNode(n: unknown): Expr {
  const o = n as Record<string, unknown>;
  switch (o.kind) {
    case "const":
      return { kind: "const", value: parseConst(o.value) };
    case "param":
      return { kind: "param", name: o.name as string };
    case "lambda":
      return { kind: "lambda", params: o.params as string[], body: parseNode(o.body) };
    case "binary":
      return { kind: "binary", op: o.op as BinOp, left: parseNode(o.left), right: parseNode(o.right) };
    case "call":
      return { kind: "call", fn: o.fn as string, args: (o.args as unknown[]).map(parseNode) };
    case "cond":
      return { kind: "cond", test: parseNode(o.test), then: parseNode(o.then), else: parseNode(o.else) };
    default:
      throw new Error(`bonsai: unknown node kind: ${String(o.kind)}`);
  }
}

/** Parse a canonical Bonsai-subset string back to an `Expr`. */
export function parse(s: string): Expr {
  const doc = JSON.parse(s) as { v?: number; expr?: unknown };
  if (doc.v !== BONSAI_VERSION) {
    throw new Error(`bonsai: unsupported version ${String(doc.v)} (expected ${BONSAI_VERSION})`);
  }
  return parseNode(doc.expr);
}

// ---- structural equality --------------------------------------------------

function constEquals(a: ConstValue, b: ConstValue): boolean {
  if (a.t !== b.t) return false;
  if (a.t === "null") return true;
  // a.t === b.t and not null ⇒ both carry a `v`
  return (a as { v: unknown }).v === (b as { v: unknown }).v;
}

/** Structural equality of two expressions (the canonical-form equality). */
export function equals(a: Expr, b: Expr): boolean {
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case "const":
      return constEquals(a.value, (b as Extract<Expr, { kind: "const" }>).value);
    case "param":
      return a.name === (b as Extract<Expr, { kind: "param" }>).name;
    case "lambda": {
      const bb = b as Extract<Expr, { kind: "lambda" }>;
      return (
        a.params.length === bb.params.length &&
        a.params.every((p, i) => p === bb.params[i]) &&
        equals(a.body, bb.body)
      );
    }
    case "binary": {
      const bb = b as Extract<Expr, { kind: "binary" }>;
      return a.op === bb.op && equals(a.left, bb.left) && equals(a.right, bb.right);
    }
    case "call": {
      const bb = b as Extract<Expr, { kind: "call" }>;
      return a.fn === bb.fn && a.args.length === bb.args.length && a.args.every((x, i) => equals(x, bb.args[i]!));
    }
    case "cond": {
      const bb = b as Extract<Expr, { kind: "cond" }>;
      return equals(a.test, bb.test) && equals(a.then, bb.then) && equals(a.else, bb.else);
    }
  }
}
