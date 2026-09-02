/**
 * hat/ — the F#-canonical Hat/Persona model, migrated to TypeScript.
 *
 * `src/Core/{ActionGrammar,Hat,Persona}.fs` are canonical; these are the TS oracles, pinned to them
 * by `hat-treaty-transcript.json` and `tests/Tests.FSharp/HatTreaty.Tests.fs`.
 */
export * as ActionGrammar from "./action-grammar";
export * as Hat from "./hat";
export * as Persona from "./persona";
export { gateSlots, permittedSlots, slotPermitted, SLOT_FREE_TIME } from "./hat-grammar-gate";
