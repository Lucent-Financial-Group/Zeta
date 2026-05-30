/**
 * Model-backed composer — the agent's REAL decision intelligence. Given the
 * readout's legal options (computed by the deterministic kernel), it asks a
 * language model which legal move to make, parses the model's choice, and
 * selects that option.
 *
 * Safety is structural, not trusted: the model is only ever shown the LEGAL
 * options, and whatever it returns is re-checked against that set by the
 * decision kernel (resolveSelection). An unparseable or illegal response falls
 * back to the deterministic composer. The model adds judgment WITHIN the
 * guardrails; it can never widen them.
 *
 * Pure over injected ports (ChatCompletionPort + a sync fallback composer);
 * the concrete HTTP/model adapter lives at the composition root.
 */

import {
  ComposerDecision,
  type AsyncEphemeralComposerPort,
  type ComposerSelection,
  type ComposerSelectionRequest,
  type EphemeralComposerPort,
} from "./observe.ts";

export type ChatCompletionRequest = {
  system: string;
  user: string;
};

/** Dependency-inverted model port. A real adapter (Ollama, OpenAI, …) implements this. */
export interface ChatCompletionPort {
  complete: (request: ChatCompletionRequest) => Promise<string>;
}

export type CreateModelBackedComposerInput = {
  chat: ChatCompletionPort;
  /** used when the model is unreachable, unparseable, or picks an illegal option */
  fallback: EphemeralComposerPort;
};

const SYSTEM_PROMPT =
  "You are an agent operating inside a deterministic organization. You will be" +
  " given the legal next moves for a run. Choose exactly one by replying with" +
  " ONLY its actionType token (e.g. `compose`). Do not explain. Do not invent" +
  " moves — pick one of the listed actionTypes verbatim.";

export function createModelBackedComposer(input: CreateModelBackedComposerInput): AsyncEphemeralComposerPort {
  return {
    compose: async (request: ComposerSelectionRequest): Promise<ComposerSelection> => {
      const options = request.readout.options;
      if (options.length === 0) {
        return input.fallback.compose(request);
      }

      let raw: string;
      try {
        raw = await input.chat.complete({ system: SYSTEM_PROMPT, user: buildUserPrompt(request) });
      } catch {
        // model unreachable → deterministic fallback keeps the agent alive
        return input.fallback.compose(request);
      }

      const chosen = matchOption(raw, options);
      if (chosen === undefined) {
        // unparseable or not a legal token → fall back (kernel would reject it anyway)
        return input.fallback.compose(request);
      }

      return { decision: ComposerDecision.Select, option: chosen, reason: `model selected '${chosen.actionType}'` };
    },
  };
}

/** Adapt a synchronous composer to the async port (e.g. the deterministic baseline). */
export function toAsyncComposer(composer: EphemeralComposerPort): AsyncEphemeralComposerPort {
  return { compose: async (request) => composer.compose(request) };
}

function buildUserPrompt(request: ComposerSelectionRequest): string {
  const lines = request.readout.options.map(
    (option) => `- ${option.actionType} -> ${option.toPhase} (${option.rationale})`,
  );
  return [
    `Run ${request.readout.runId} is at phase '${request.readout.phase}'.`,
    "Legal next moves:",
    ...lines,
    "Reply with one actionType token from the list above.",
  ].join("\n");
}

/**
 * Parse the model's free text into a legal option. Tolerant: case-insensitive,
 * matches the first listed actionType whose token appears as a whole word in the
 * response (longest token first, so e.g. `request_review` wins over `review`).
 */
function matchOption(
  raw: string,
  options: ComposerSelectionRequest["readout"]["options"],
): ComposerSelectionRequest["readout"]["options"][number] | undefined {
  const text = raw.toLowerCase();
  const byLength = [...options].sort((a, b) => b.actionType.length - a.actionType.length);
  for (const option of byLength) {
    const token = option.actionType.toLowerCase();
    if (new RegExp(`(^|[^a-z0-9_])${escapeRegExp(token)}([^a-z0-9_]|$)`).test(text)) {
      return option;
    }
  }
  return undefined;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
