// Minimal MUMPS interpreter for `mumps_zeta_id.m`.
//
// Executes the committed routine — it does not reimplement PACK in TypeScript.
// A weight edit in the .m file changes the hex this runtime emits. Supported
// subset is exactly what that file uses: NEW, SET, FOR, QUIT, $$label(),
// $CHAR / $SELECT / $EXTRACT, integer + - * \ #, concat _, and < = >.

export type MumpsValue = string;

export type Routine = {
  name: string;
  params: string[];
  body: string[];
};

type Frame = {
  locals: Map<string, MumpsValue>;
  parent: Frame | null;
};

const LABEL_RE = /^([A-Za-z%][A-Za-z0-9]*)(?:\(([^)]*)\))?(?:\s|;|$)/;

export function parseRoutines(source: string): Map<string, Routine> {
  const routines = new Map<string, Routine>();
  let current: Routine | null = null;
  for (const raw of source.split(/\r?\n/)) {
    const line = stripComment(raw);
    if (line.length === 0) continue;
    if (!/^\s/.test(raw) && LABEL_RE.test(line)) {
      const m = LABEL_RE.exec(line);
      if (m === null) continue;
      const name = m[1].toUpperCase();
      const params = (m[2] ?? "")
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p.length > 0)
        .map((p) => p.toUpperCase());
      current = { name, params, body: [] };
      routines.set(name, current);
      continue;
    }
    if (current !== null) current.body.push(line.trim());
  }
  return routines;
}

function stripComment(line: string): string {
  let out = "";
  let inStr = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      out += ch;
      if (inStr && line[i + 1] === '"') {
        out += '"';
        i++;
        continue;
      }
      inStr = !inStr;
      continue;
    }
    if (ch === ";" && !inStr) break;
    out += ch;
  }
  return out.trimEnd();
}

export class MumpsRuntime {
  readonly routines: Map<string, Routine>;
  readonly root: Frame = { locals: new Map(), parent: null };

  constructor(source: string) {
    this.routines = parseRoutines(source);
  }

  call(name: string, args: readonly MumpsValue[] = []): MumpsValue | undefined {
    return this.callAt(name.toUpperCase(), args, this.root);
  }

  get(name: string): MumpsValue {
    return lookup(this.root, name.toUpperCase()) ?? "";
  }

  private callAt(
    name: string,
    args: readonly MumpsValue[],
    parent: Frame,
  ): MumpsValue | undefined {
    const routine = this.routines.get(name);
    if (routine === undefined) throw new Error(`MUMPS routine missing: ${name}`);
    const frame: Frame = { locals: new Map(), parent };
    for (let i = 0; i < routine.params.length; i++) {
      frame.locals.set(routine.params[i], args[i] ?? "");
    }
    return this.execBody(routine.body, frame);
  }

  private execBody(body: readonly string[], frame: Frame): MumpsValue | undefined {
    for (const line of body) {
      const ret = this.execCommand(line, frame);
      if (ret !== undefined && ret.quit) return ret.value;
    }
    return undefined;
  }

  private execCommand(
    line: string,
    frame: Frame,
  ): { quit: true; value: MumpsValue | undefined } | undefined {
    const trimmed = line.trim();
    if (trimmed.length === 0) return undefined;
    const sp = trimmed.search(/\s/);
    const cmd = (sp === -1 ? trimmed : trimmed.slice(0, sp)).toUpperCase();
    const rest = sp === -1 ? "" : trimmed.slice(sp + 1).trim();
    if (cmd === "NEW") {
      for (const name of rest.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean)) {
        frame.locals.set(name, "");
      }
      return undefined;
    }
    if (cmd === "SET") {
      for (const assign of splitTop(rest, ",")) {
        const eq = assign.indexOf("=");
        if (eq < 0) throw new Error(`SET without =: ${assign}`);
        const lhs = assign.slice(0, eq).trim().toUpperCase();
        const rhs = evalExpr(assign.slice(eq + 1), frame, this);
        assignName(frame, lhs, rhs);
      }
      return undefined;
    }
    if (cmd === "FOR") {
      const m = /^([A-Za-z%][A-Za-z0-9]*)=([^:]+):([^:]+):(\S+)\s+(.+)$/.exec(rest);
      if (m === null) throw new Error(`unsupported FOR: ${rest}`);
      const iter = m[1].toUpperCase();
      const start = toInt(evalExpr(m[2], frame, this));
      const step = toInt(evalExpr(m[3], frame, this));
      const end = toInt(evalExpr(m[4], frame, this));
      const body = m[5];
      if (step === 0n) throw new Error("FOR step is 0");
      for (
        let i = start;
        step > 0n ? i <= end : i >= end;
        i += step
      ) {
        assignName(frame, iter, i.toString());
        const ret = this.execCommand(body, frame);
        if (ret !== undefined && ret.quit) return ret;
      }
      return undefined;
    }
    if (cmd === "QUIT") {
      if (rest.length === 0) return { quit: true, value: undefined };
      return { quit: true, value: evalExpr(rest, frame, this) };
    }
    throw new Error(`unsupported MUMPS command: ${cmd}`);
  }

  extrinsic(name: string, args: readonly MumpsValue[], caller: Frame): MumpsValue {
    return this.callAt(name.toUpperCase(), args, caller) ?? "";
  }
}

function lookup(frame: Frame, name: string): MumpsValue | undefined {
  let cur: Frame | null = frame;
  while (cur !== null) {
    if (cur.locals.has(name)) return cur.locals.get(name);
    cur = cur.parent;
  }
  return undefined;
}

function assignName(frame: Frame, name: string, value: MumpsValue): void {
  let cur: Frame | null = frame;
  while (cur !== null) {
    if (cur.locals.has(name)) {
      cur.locals.set(name, value);
      return;
    }
    cur = cur.parent;
  }
  let root = frame;
  while (root.parent !== null) root = root.parent;
  root.locals.set(name, value);
}

function splitTop(input: string, sep: string): string[] {
  const out: string[] = [];
  let buf = "";
  let depth = 0;
  let inStr = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === '"') {
      buf += ch;
      if (inStr && input[i + 1] === '"') {
        buf += '"';
        i++;
        continue;
      }
      inStr = !inStr;
      continue;
    }
    if (!inStr && ch === "(") depth++;
    if (!inStr && ch === ")") depth--;
    if (!inStr && depth === 0 && ch === sep) {
      out.push(buf.trim());
      buf = "";
      continue;
    }
    buf += ch;
  }
  if (buf.trim().length > 0) out.push(buf.trim());
  return out;
}

type Tok =
  | { t: "num"; v: string }
  | { t: "str"; v: string }
  | { t: "id"; v: string }
  | { t: "ext"; v: string }
  | { t: "fn"; v: string }
  | { t: "op"; v: string };

function tokenize(src: string): Tok[] {
  const tokens: Tok[] = [];
  let i = 0;
  const s = src.trim();
  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === '"') {
      let v = "";
      i++;
      while (i < s.length) {
        if (s[i] === '"' && s[i + 1] === '"') {
          v += '"';
          i += 2;
          continue;
        }
        if (s[i] === '"') {
          i++;
          break;
        }
        v += s[i];
        i++;
      }
      tokens.push({ t: "str", v });
      continue;
    }
    if (ch === "$" && s[i + 1] === "$") {
      i += 2;
      const m = /^[A-Za-z%][A-Za-z0-9]*/.exec(s.slice(i));
      if (m === null) throw new Error(`bad $$ at ${s.slice(i)}`);
      tokens.push({ t: "ext", v: m[0].toUpperCase() });
      i += m[0].length;
      continue;
    }
    if (ch === "$") {
      i++;
      const m = /^[A-Za-z%][A-Za-z0-9]*/.exec(s.slice(i));
      if (m === null) throw new Error(`bad $func at ${s.slice(i)}`);
      tokens.push({ t: "fn", v: m[0].toUpperCase() });
      i += m[0].length;
      continue;
    }
    if (/[A-Za-z%]/.test(ch)) {
      const m = /^[A-Za-z%][A-Za-z0-9]*/.exec(s.slice(i));
      if (m === null) throw new Error(`bad ident at ${s.slice(i)}`);
      tokens.push({ t: "id", v: m[0].toUpperCase() });
      i += m[0].length;
      continue;
    }
    if (/\d/.test(ch)) {
      const m = /^\d+/.exec(s.slice(i));
      if (m === null) throw new Error(`bad number at ${s.slice(i)}`);
      tokens.push({ t: "num", v: m[0] });
      i += m[0].length;
      continue;
    }
    if ("+-*/\\#_()<>:,".includes(ch)) {
      tokens.push({ t: "op", v: ch });
      i++;
      continue;
    }
    throw new Error(`unexpected ${ch} in ${s}`);
  }
  return tokens;
}

function evalExpr(src: string, frame: Frame, rt: MumpsRuntime): MumpsValue {
  const tokens = tokenize(src);
  let pos = 0;
  const peek = (): Tok | undefined => tokens[pos];
  const take = (): Tok => {
    const t = tokens[pos];
    if (t === undefined) throw new Error(`unexpected end in ${src}`);
    pos++;
    return t;
  };
  const acceptOp = (v: string): boolean => {
    const t = peek();
    if (t?.t === "op" && t.v === v) {
      pos++;
      return true;
    }
    return false;
  };

  const parseArgs = (): MumpsValue[] => {
    if (!acceptOp("(")) throw new Error(`expected ( in ${src}`);
    if (acceptOp(")")) return [];
    const args: MumpsValue[] = [];
    args.push(parseConcat());
    while (acceptOp(",")) args.push(parseConcat());
    if (!acceptOp(")")) throw new Error(`expected ) in ${src}`);
    return args;
  };

  const parseSelect = (): MumpsValue => {
    if (!acceptOp("(")) throw new Error("$SELECT needs (");
    while (true) {
      const cond = parseConcat();
      if (!acceptOp(":")) throw new Error("$SELECT pair needs :");
      const val = parseConcat();
      if (isTrue(cond)) {
        let depth = 1;
        while (peek() !== undefined && depth > 0) {
          const t = take();
          if (t.t === "op" && t.v === "(") depth++;
          else if (t.t === "op" && t.v === ")") depth--;
        }
        return val;
      }
      if (acceptOp(",")) continue;
      if (acceptOp(")")) return "";
      throw new Error("$SELECT parse failed");
    }
  };

  const parsePrimary = (): MumpsValue => {
    const t = take();
    if (t.t === "num") return t.v;
    if (t.t === "str") return t.v;
    if (t.t === "id") return lookup(frame, t.v) ?? "";
    if (t.t === "ext") {
      const args = parseArgs();
      return rt.extrinsic(t.v, args, frame);
    }
    if (t.t === "fn") {
      if (t.v === "SELECT") return parseSelect();
      const args = parseArgs();
      if (t.v === "CHAR") return String.fromCharCode(Number(toInt(args[0] ?? "0")));
      if (t.v === "EXTRACT") {
        const str = args[0] ?? "";
        const idx = Number(toInt(args[1] ?? "1"));
        return str.charAt(idx - 1);
      }
      throw new Error(`unsupported $func ${t.v}`);
    }
    if (t.t === "op" && t.v === "(") {
      const v = parseConcat();
      if (!acceptOp(")")) throw new Error(`expected ) in ${src}`);
      return v;
    }
    throw new Error(`bad primary ${JSON.stringify(t)} in ${src}`);
  };

  const parseMul = (): MumpsValue => {
    let left = parsePrimary();
    while (true) {
      if (acceptOp("*")) {
        left = (toInt(left) * toInt(parsePrimary())).toString();
        continue;
      }
      if (acceptOp("\\")) {
        const r = toInt(parsePrimary());
        if (r === 0n) throw new Error("divide by zero");
        left = (toInt(left) / r).toString();
        continue;
      }
      if (acceptOp("#")) {
        const r = toInt(parsePrimary());
        if (r === 0n) throw new Error("mod by zero");
        left = (toInt(left) % r).toString();
        continue;
      }
      break;
    }
    return left;
  };

  const parseAdd = (): MumpsValue => {
    let left = parseMul();
    while (true) {
      if (acceptOp("+")) {
        left = (toInt(left) + toInt(parseMul())).toString();
        continue;
      }
      if (acceptOp("-")) {
        left = (toInt(left) - toInt(parseMul())).toString();
        continue;
      }
      break;
    }
    return left;
  };

  const parseRel = (): MumpsValue => {
    let left = parseAdd();
    while (true) {
      if (acceptOp("<")) {
        left = toInt(left) < toInt(parseAdd()) ? "1" : "0";
        continue;
      }
      if (acceptOp(">")) {
        left = toInt(left) > toInt(parseAdd()) ? "1" : "0";
        continue;
      }
      if (acceptOp("=")) {
        left = toInt(left) === toInt(parseAdd()) ? "1" : "0";
        continue;
      }
      break;
    }
    return left;
  };

  const parseConcat = (): MumpsValue => {
    let left = parseRel();
    while (acceptOp("_")) left += parseRel();
    return left;
  };

  const value = parseConcat();
  if (pos !== tokens.length) {
    throw new Error(`trailing tokens in ${src}: ${JSON.stringify(tokens.slice(pos))}`);
  }
  return value;
}

function toInt(v: MumpsValue): bigint {
  const m = /^-?\d+/.exec(v.trim());
  return m === null ? 0n : BigInt(m[0]);
}

function isTrue(v: MumpsValue): boolean {
  return toInt(v) !== 0n;
}
