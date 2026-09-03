// tools/accelerator/local-llm.ts
//
// A small, ACCOUNT-FREE local-LLM primitive for the accelerator. The whole
// point: validate the "LLM-in-the-loop" seam on a GitHub CPU runner at ZERO
// spend — no API key, no account — before attaching a real harness (Claude
// Code / Codex / …). Run a tiny instruct model (e.g. Qwen2.5-0.5B) locally on
// the runner; this module is the backend-agnostic core that talks to it.
//
// Reusable for TWO consumers (operator 2026-05-30):
//   1. move-next SELECTOR — "choose your own adventure": pick the next move
//      from the menu (the SelectMove seam in move-next-harness.ts).
//   2. observe.ts AUTO-CLASSIFIER (future, Max's keystone) — "given an
//      observation, pick one label." Same shape: constrained choice among N.
//
// Backend-swappable: ollamaBackend (localhost) today; node-llama-cpp (in-process,
// GBNF-grammar-constrained) or a real account-backed backend later. Selection is
// always validated + falls back safely, so a bad/slow/absent model never stalls
// the loop (exceptions-as-signals: the model is best-effort, the fallback is the
// safety rail).

// ─── Backend interface ───────────────────────────────────────────────
// DST note (operator 2026-05-30): a small local model at temperature 0 (greedy) +
// a fixed `seed` + a PINNED model/quantization is DETERMINISTIC — same input ⇒
// same output, reproducibly — so it can be a real (not mocked) fixture in
// deterministic-simulation tests (e.g. observe.ts's auto-classifier), not just a
// runtime selector. Cross-hardware caveat: CPU float order can differ across
// runner architectures, so pin the runner image (or snapshot the output) when
// asserting exact classifications across machines; on one image it is stable.
export interface CompleteOptions {
  readonly temperature?: number; // default 0 (greedy — reproducible, DST)
  readonly seed?: number; // fix for deterministic-simulation reproducibility
  readonly maxTokens?: number; // selection needs only a few tokens
}

export interface ModelBackend {
  readonly name: string;
  /** Complete a prompt with a small local model. Returns raw text. */
  complete(prompt: string, opts?: CompleteOptions): Promise<string>;
}

// ─── Ollama backend (account-free; model runs on the runner) ─────────
export interface OllamaOptions {
  readonly model?: string; // tiny instruct model
  readonly host?: string;
  readonly timeoutMs?: number;
  readonly seed?: number; // default deterministic seed (DST); override per-call
}

/**
 * Validate the ollama host is loopback. The local LLM only ever talks to an
 * ON-MACHINE daemon — a host from the (file-sourced) manifest must never point at
 * a remote, which would exfiltrate prompts (the CodeQL "file data → outbound
 * request" SSRF taint, #6123). Returns the validated host (an explicit guard
 * between the file-source and the fetch sink); throws on a non-loopback host.
 */
function loopbackHostOrThrow(raw: string): string {
  const hostname = new URL(raw).hostname.replace(/^\[|\]$/g, ""); // strip IPv6 [ ]
  if (hostname !== "127.0.0.1" && hostname !== "localhost" && hostname !== "::1") {
    throw new Error(
      `local-llm host must be loopback (got "${hostname}") — the local LLM only talks to an on-machine daemon`,
    );
  }
  return raw;
}

/** A ModelBackend backed by a local Ollama server (no account/key). */
export function ollamaBackend(opts: OllamaOptions = {}): ModelBackend {
  const model = opts.model ?? "qwen2.5:0.5b";
  const host = loopbackHostOrThrow(opts.host ?? "http://127.0.0.1:11434");
  const timeoutMs = opts.timeoutMs ?? 60_000;
  const defaultSeed = opts.seed ?? 0; // fixed seed ⇒ reproducible (DST)
  return {
    name: `ollama:${model}`,
    async complete(prompt, o) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        const res = await fetch(`${host}/api/generate`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            model,
            prompt,
            stream: false,
            options: {
              temperature: o?.temperature ?? 0,
              seed: o?.seed ?? defaultSeed,
              num_predict: o?.maxTokens ?? 6,
            },
          }),
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(`ollama HTTP ${res.status}`);
        const data = (await res.json()) as { response?: string };
        return data.response ?? "";
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

// ─── chooseIndex: the constrained-choice primitive ───────────────────
export interface ChooseArgs {
  readonly context: string; // describe the current state / observation
  readonly options: readonly string[]; // human-readable option labels
  readonly instruction?: string;
}

/**
 * WHY the chooser's answer was not used as given.
 *
 * `fallback: boolean` conflated three causes that call for opposite responses, and the one that
 * matters most was the invisible one:
 *
 *   backend-error   the chooser could not answer. A property of the RUNTIME (ollama down, timeout).
 *                   Not the lane misbehaving.
 *   unparseable     it answered and the answer was not a number. A property of the MODEL's format
 *                   discipline.
 *   out-of-range    it named a slot that does not exist. An ILLEGAL SELECTION — the lane reaching
 *                   past the menu it was given, which is the one thing a menu-bounded design must
 *                   count.
 *
 * The promotion gate demotes on illegal selections and must not demote on a flaky daemon. With one
 * boolean it could not tell them apart, so it would have read a dropped connection as misbehaviour
 * and an out-of-range pick as nothing at all.
 */
export type ChooseFallbackCause = "none" | "backend-error" | "unparseable" | "out-of-range";

export interface ChooseResult {
  readonly index: number; // always a valid index into options
  readonly raw: string; // the model's raw reply (for logging)
  readonly fallback: boolean; // true ⇒ index 0 chosen because the model failed
  /** Why. `fallback` is exactly `cause !== "none"`; a test pins that they cannot drift. */
  readonly cause: ChooseFallbackCause;
}

/**
 * Ask the model to pick ONE option by index. Builds a numbered-options prompt,
 * parses the first integer out of the reply, validates it is in range, and
 * FALLS BACK to index 0 on any failure (empty menu is the only throw). A single
 * option short-circuits with no model call.
 */
/**
 * The index a reply names, or `null` when it does not unambiguously name one.
 *
 * ── WHY NOT `raw.match(/d+/)` ──────────────────────────────────────────────
 * That takes the FIRST run of digits anywhere in the reply, which is right when the model answers
 * with a bare number and silently wrong when it does not:
 *
 *   "0-based index: 4"  ->  0     the model chose 4
 *   "1st: 4"            ->  1     the model chose 4
 *
 * Both were returned as `fallback: false, cause: "none"` — the system asserting the model made a
 * choice it did not make. That is worse than a fallback, because the wrong action is dispatched AND
 * the tick is recorded as a genuine decision, so it feeds `decorrelation-meter`'s agreement figures
 * and the divergence rate the promotion gate reads to decide whether a lane may leave shadow.
 *
 * ── THE RULE ─────────────────────────────────────────────────────────────────
 * A reply naming exactly one number names a choice. A reply naming several does not name one this
 * function can identify, so it is UNPARSEABLE and the caller falls back — the same destination every
 * other uncertain answer in this system takes. An ambiguous answer is not a decision.
 *
 * ── WHAT IT COSTS, MEASURED RATHER THAN ASSUMED ──────────────────────────────
 * 45 real replies were captured from `qwen2.5:0.5b` at temperature 0.8 through this exact prompt,
 * across three menu shapes and three world states. **All 45 were bare numbers.** So for the local
 * model in use this rule changes nothing; what it protects is the CLOUD persona path, which runs the
 * same parse over an unbounded summon where prose is the normal case rather than the exception.
 *
 * A reply like "Option 3 of 5" — correct by luck today — becomes a fallback. That is the trade, and
 * it is the right way round: a recorded fallback is visible in the soak window, and a silently wrong
 * action is not.
 */
export function parseChosenIndex(raw: string): number | null {
  const matches = raw.match(/\d+/g);
  if (matches === null || matches.length !== 1) return null;
  const idx = Number.parseInt(matches[0], 10);
  if (!Number.isInteger(idx)) return null;
  // A minus sign before the digits means the reply named a negative, which is never a menu slot.
  // Reported as unparseable rather than silently read as its absolute value.
  if (/-\s*\d/.test(raw)) return null;
  return idx;
}

export async function chooseIndex(backend: ModelBackend, args: ChooseArgs): Promise<ChooseResult> {
  const n = args.options.length;
  if (n === 0) throw new Error("chooseIndex: options must be non-empty");
  if (n === 1) return { index: 0, raw: "", fallback: false, cause: "none" };

  const numbered = args.options.map((o, i) => `${i}: ${o}`).join("\n");
  const prompt =
    `${args.instruction ?? "You are a selector. Choose the single best next action."}\n\n` +
    `State:\n${args.context}\n\n` +
    `Options:\n${numbered}\n\n` +
    `Reply with ONLY the number of the chosen option (0-${n - 1}). Number:`;

  let raw = "";
  try {
    raw = (await backend.complete(prompt, { temperature: 0, maxTokens: 6 })).trim();
  } catch {
    return { index: 0, raw: "", fallback: true, cause: "backend-error" };
  }
  const parsed = parseChosenIndex(raw);
  if (parsed === null) return { index: 0, raw, fallback: true, cause: "unparseable" };
  const idx = parsed;
  if (idx < 0 || idx >= n) {
    // THE illegal selection: the model named a slot outside the menu it was shown.
    return { index: 0, raw, fallback: true, cause: "out-of-range" };
  }
  return { index: idx, raw, fallback: false, cause: "none" };
}

// ─── classify: observe.ts auto-classifier use case ───────────────────
export interface ClassifyResult {
  readonly label: string;
  readonly index: number;
  readonly fallback: boolean;
}

/**
 * Classify an input into exactly one of `labels` (the observe.ts auto-classifier
 * shape). Thin wrapper over chooseIndex so the selector + classifier share one
 * validated, fallback-safe code path.
 */
export async function classify(
  backend: ModelBackend,
  args: { input: string; labels: readonly string[]; instruction?: string },
): Promise<ClassifyResult> {
  const r = await chooseIndex(backend, {
    context: args.input,
    options: args.labels,
    instruction: args.instruction ?? "Classify the input into exactly one label.",
  });
  return { label: args.labels[r.index]!, index: r.index, fallback: r.fallback };
}
