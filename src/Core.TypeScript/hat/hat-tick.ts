#!/usr/bin/env bun
/**
 * hat-tick.ts — run ONE tick of the real observe loop under a persona's hats. READ-ONLY.
 *
 * This is the end-to-end proof that the migrated F# model governs the actual grammar the loop
 * renders, against the live world rather than a fixture: it calls the same `loadWorld` and
 * `renderGrammar16` the loop uses, builds a `Persona` from the hats given on the command line, and
 * prints the 16 fixed slots with the persona's authority applied.
 *
 * It executes NOTHING. No event is appended, no chooser runs, no remote ref moves. `run-loop-real.ts`
 * remains the only path that acts; this is the observation half, so the gate can be inspected on a
 * real world without a real tick's consequences.
 *
 * Usage:
 *   bun src/Core.TypeScript/hat/hat-tick.ts --hat architect=*        # unrestricted hat
 *   bun src/Core.TypeScript/hat/hat-tick.ts --hat ic=0,1,4,12,13
 *   bun src/Core.TypeScript/hat/hat-tick.ts --hat a=0,1 --hat b=4,5  # union across worn hats
 *   bun src/Core.TypeScript/hat/hat-tick.ts                          # no hats — see 5a below
 *
 * A hat spec is `<name>=<slots>` where slots is a comma-separated list of 0..15, or `*` for the
 * UNRESTRICTED hat (an empty allow-list — the `Hat.fs` inversion, where empty means no restriction
 * rather than no permission).
 *
 * With NO `--hat` at all the persona wears nothing, and per the model that is UNRESTRICTED, not
 * powerless (pinned as invariant 5a in `hat-grammar-gate.dst.test.ts`). The output says so out loud
 * rather than letting a full menu be misread as a granted one.
 */

import { loadWorld } from "../observe/load-world";
import { renderGrammar16 } from "../observe/grammar-16-render";
import { ofKeys } from "./action-grammar";
import type { Hat } from "./hat";
import { allowedActions, create, wearAll, type Persona } from "./persona";
import { gateSlots, SLOT_FREE_TIME } from "./hat-grammar-gate";

type CliHat = Hat<never, never, never>;

function parseHats(argv: readonly string[]): { readonly hats: CliHat[]; readonly error?: string } {
  const hats: CliHat[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] !== "--hat") continue;
    const spec = argv[i + 1];
    if (spec === undefined) return { hats, error: "--hat requires <name>=<slots|*>" };
    const eq = spec.indexOf("=");
    if (eq <= 0) return { hats, error: `malformed --hat spec: ${spec}` };
    const name = spec.slice(0, eq);
    const slots = spec.slice(eq + 1);
    if (slots === "*") {
      hats.push({ name, scope: "Meta", lenses: [], landmarks: [], allowedActions: [], traversals: [], controls: [] });
      continue;
    }
    const keys = slots
      .split(",")
      .filter(s => s.length > 0)
      .map(s => Number.parseInt(s, 10));
    if (keys.some(k => !Number.isInteger(k))) return { hats, error: `non-integer slot in: ${spec}` };
    hats.push({
      name,
      scope: "GameSpecific",
      lenses: [],
      landmarks: [],
      allowedActions: [ofKeys(keys)],
      traversals: [],
      controls: [],
    });
  }
  return { hats };
}

const parsed = parseHats(process.argv.slice(2));
if (parsed.error !== undefined) {
  console.error(`hat-tick: ${parsed.error}`);
  process.exit(2);
}

// `loadWorld` is synchronous and takes no agent id: the identity lives on the Persona, not on the
// world channel. (Caught by tsc, not by running it — bun strips types, so the wrong call ran fine.)
const world = loadWorld({ eventDir: "docs/observe-events", repoRoot: process.cwd() });
const persona: Persona<never, never, never> = wearAll(parsed.hats, create("otto"));
const rendered = renderGrammar16(world);
const gated = gateSlots(rendered, persona);

const allowed = allowedActions(persona);
const unrestricted = allowed.length === 0;

console.log(`world:   backlog=${world.backlog.length} mode=${world.mode ?? "(unset)"} operator=${world.operator ? "wired" : "unwired"}`);
console.log(`persona: otto wearing [${persona.worn.map(h => h.name).join(", ") || "nothing"}]`);
console.log(
  unrestricted
    ? `authority: UNRESTRICTED — ${parsed.hats.length === 0 ? "wearing no hats (empty allow-list = unrestricted; see invariant 5a)" : "at least one worn hat carries no restriction"}`
    : `authority: restricted by ${allowed.length} allowed action(s), unioned across worn hats`,
);
console.log("");
console.log(`${"#".padStart(3)}  ${"group".padEnd(9)} ${"input".padEnd(11)} ${"avail".padEnd(5)} label`);
for (const slot of gated) {
  const before = rendered[slot.index]!;
  const changed = before.availability.s !== slot.availability.s ? "  <- vetoed by hat" : "";
  const free = slot.index === SLOT_FREE_TIME ? "  (NCI: never vetoed)" : "";
  console.log(
    `${String(slot.index).padStart(3)}  ${slot.group.padEnd(9)} ${slot.controllerInput.padEnd(11)} ${slot.availability.s.padEnd(5)} ${slot.label}${changed}${free}`,
  );
}
const vetoed = gated.filter((s, i) => s.availability.s !== rendered[i]!.availability.s).length;
console.log("");
console.log(`${gated.length} slots rendered, ${vetoed} vetoed by authority (slots are never removed — the 16 directions are fixed).`);
