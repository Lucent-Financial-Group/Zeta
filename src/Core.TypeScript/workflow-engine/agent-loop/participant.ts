/**
 * agent-loop/participant.ts — the half of the loop a MODEL plays.
 *
 * ── THE CLAIM THIS MAKES TRUE ────────────────────────────────────────────────
 * The README's whole design is *"deterministic script holds STATE MACHINE; LLM is pure
 * MENU-SELECTOR (reads menu, returns choice)"*. Every chooser in this substrate was deterministic,
 * so the selector half had never actually been played by a model: the determinism⇄autonomy split
 * was implemented on one side only.
 *
 * ── WHAT A MODEL IS, HERE ────────────────────────────────────────────────────
 * A source of an INDEX, and nothing else. It cannot invent an option, reorder the menu, or reach
 * past it — the menu is the legal set, `chooseIndex` clamps to it, and an out-of-range answer is
 * recorded as an illegal selection rather than honoured. That is what makes handing the choice to
 * a model safe: the model's authority is exactly one integer wide.
 *
 * ── THE FAULT AND THE RECOVERY ARE DIFFERENT FACTS ───────────────────────────
 * `chooseIndex` already separates them, and this preserves the distinction rather than collapsing
 * it to a boolean:
 *
 *   `backend-error`  the daemon was down. A property of the RUNTIME, not of the model.
 *   `unparseable`    it answered, and the answer was not a number. The model's format discipline.
 *   `out-of-range`   it named a slot that does not exist — reaching past the menu it was given.
 *
 * A loop that reported these the same way would read a dropped connection as misbehaviour and an
 * illegal selection as nothing at all.
 *
 * ── THE MENU IS THE PROMPT ───────────────────────────────────────────────────
 * *"Menu quality is everything. this is the use conversational UX design."* The labels below ARE
 * that surface: they are what the model sees, and a label that does not say what the option does
 * makes a good model look like a bad one.
 */

import { chooseIndex, ollamaBackend, type ChooseFallbackCause } from "../../accelerator/local-llm";
import type { AgentState, MenuOption, StatusSnapshot } from "./state-machine";

export interface AgentChoice {
  /** Always a valid index into the menu it was given. */
  readonly index: number;
  readonly option: MenuOption;
  /** The model's raw reply, kept for audit. Empty for a deterministic participant. */
  readonly raw: string;
  /** True when the participant's own answer was not used. */
  readonly fallback: boolean;
  readonly cause: ChooseFallbackCause;
}

export interface AgentParticipant {
  readonly kind: "oracle" | "local-llm";
  readonly name: string;
  choose(
    state: AgentState,
    snapshot: StatusSnapshot,
    menu: readonly MenuOption[],
  ): Promise<AgentChoice>;
}

/** What the model is told an option does. One line, no jargon, no tag names on their own. */
export function describeOption(option: MenuOption): string {
  switch (option.tag) {
    case "PickWork":
      return (
        `work on "${option.work.id}" (${option.work.lane}, ${option.work.trajectoryPhase}; ` +
        `impact ${option.work.estimatedDoraContribution.toFixed(2)}, ` +
        `unknowns ${option.work.uncertainty.toFixed(2)}, ` +
        `interest ${option.work.agentInterest.toFixed(2)})`
      );
    case "EmitHeartbeat":
      return `record a heartbeat in the ${option.lane} lane — say you are alive without claiming progress`;
    case "EscapeHatch":
      return `none of these fit: ${option.reason}`;
    case "EnterFreeTime":
      return `take chosen rest: ${option.reason}`;
    case "EnterNamedBoundedWait":
      return (
        `wait for "${option.namedDep}"` +
        (option.eta === undefined ? " (no expected time)" : ` (expected ${option.eta})`)
      );
    case "RequestOperatorAttention":
      return `ask the operator to decide: ${option.reason}`;
    case "ProposeNewGrammarAction":
      return `propose a new kind of action: ${option.name}`;
    case "PressPause":
      return `stop deliberately: ${option.reason}`;
    case "EnterOpenEndedExploration":
      return `explore with no fixed goal: ${option.reason}`;
    case "ResumeFromPause":
      return `resume from the pause`;
  }
  return assertNever(option);
}

function assertNever(x: never): never {
  throw new Error(`unhandled menu option: ${JSON.stringify(x)}`);
}

/** What the model is told about where it is. Compact on purpose — a small model has a small window. */
export function describeState(state: AgentState, snapshot: StatusSnapshot): string {
  const lines: string[] = [`You are ${state.context.agent}, on cycle ${state.context.cycle}.`];
  switch (state.tag) {
    case "Idle":
      lines.push("You are idle and choosing what to do next.");
      break;
    case "ExecutingWork":
      lines.push(`You are currently working on "${state.work.id}".`);
      break;
    case "Paused":
      lines.push(`You are paused: ${state.reason}.`);
      break;
    case "NamedBoundedWait":
      lines.push(`You are waiting for "${state.namedDep}".`);
      break;
    case "FreeTime":
      lines.push(`You are resting: ${state.reason}.`);
      break;
    case "OperatorAttentionRequested":
      lines.push(`You have asked the operator to decide: ${state.reason}.`);
      break;
    default:
      lines.push(`You are ${state.tag}.`);
  }
  const d = snapshot.currentDora;
  lines.push(
    `Delivery so far: ${d.deploymentCount} shipped, ` +
      `${(d.changeFailureRate * 100).toFixed(0)}% of shipped work had trouble.`,
  );
  if (snapshot.hotTrajectories.length > 0) lines.push(`Active areas: ${snapshot.hotTrajectories.join(", ")}.`);
  if (snapshot.explorationCandidates.length > 0) {
    lines.push(`Worth a look: ${snapshot.explorationCandidates.join(", ")}.`);
  }
  return lines.join("\n");
}

const INSTRUCTION =
  "You are an agent choosing your own next action from a menu. " +
  "Every option is permitted — including resting, pausing, waiting, and asking for help. " +
  "Choose the one that best fits your situation.";

/** The deterministic baseline: always the first option, which is the highest-scoring real work. */
export function oracleAgentParticipant(): AgentParticipant {
  return {
    kind: "oracle",
    name: "oracle",
    choose: async (_state, _snapshot, menu) => {
      const option = menu[0];
      if (option === undefined) throw new Error("oracle participant: the menu is empty");
      return { index: 0, option, raw: "oracle-default", fallback: false, cause: "none" };
    },
  };
}

/**
 * A local model, playing the selector.
 *
 * Seeded and temperature-zero, so a run is reproducible — the loop stays DST-replayable even with
 * a model in it, which is the only way a model can be part of a substrate that claims determinism.
 */
export function localLlmAgentParticipant(opts?: {
  readonly model?: string;
  readonly host?: string;
  readonly seed?: number;
}): AgentParticipant {
  const model = opts?.model ?? "qwen2.5:0.5b";
  const backend = ollamaBackend({
    model,
    host: opts?.host ?? process.env["ZETA_OLLAMA_HOST"] ?? "http://127.0.0.1:11434",
    seed: opts?.seed ?? 42,
  });
  return {
    kind: "local-llm",
    name: `local-llm:${model}`,
    choose: async (state, snapshot, menu) => {
      const option0 = menu[0];
      if (option0 === undefined) throw new Error("local-llm participant: the menu is empty");
      const result = await chooseIndex(backend, {
        context: describeState(state, snapshot),
        options: menu.map(describeOption),
        instruction: INSTRUCTION,
      });
      // `chooseIndex` guarantees a valid index — an out-of-range answer comes back as index 0 with
      // the cause recorded. So this lookup cannot miss, and the model cannot leave the menu.
      //
      // The `?? option0` is a TYPE obligation, not a runtime guard: `noUncheckedIndexedAccess`
      // makes the lookup `T | undefined` regardless of the contract above. It is unreachable, and
      // it is written rather than asserted away because an assertion would be a claim the compiler
      // cannot check either.
      const option = menu[result.index] ?? option0;
      return {
        index: result.index,
        option,
        raw: result.raw,
        fallback: result.fallback,
        cause: result.cause,
      };
    },
  };
}

/** Parse a `--participant` spec. Refuses an unknown one rather than falling back silently. */
export function participantFromSpec(
  spec: string,
): { readonly ok: true; readonly participant: AgentParticipant } | { readonly ok: false; readonly reason: string } {
  if (spec === "oracle") return { ok: true, participant: oracleAgentParticipant() };
  if (spec === "local-llm") return { ok: true, participant: localLlmAgentParticipant() };
  if (spec.startsWith("local-llm:")) {
    const model = spec.slice("local-llm:".length);
    if (model === "") return { ok: false, reason: "local-llm: needs a model name after the colon" };
    return { ok: true, participant: localLlmAgentParticipant({ model }) };
  }
  // Silently defaulting would make a typo look like a deliberate oracle run, and the run's own
  // record would then name a participant that never chose anything.
  return { ok: false, reason: `unknown participant '${spec}' (try: oracle, local-llm, local-llm:<model>)` };
}
