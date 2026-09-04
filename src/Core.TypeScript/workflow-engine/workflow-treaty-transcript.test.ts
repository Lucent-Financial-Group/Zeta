// src/Core.TypeScript/workflow-engine/workflow-treaty-transcript.test.ts

import { expect, test, describe } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";
import { transition, postResultTransition, cycleClose } from "./agent-loop/state-machine";
import { applyTransition } from "./agent-loop/work-lifecycle-state-machine";
import { generateMenu, isNonCoercive, rankCandidates } from "./agent-loop/menu-generator";

describe("Workflow Treaty Transcript (TS-side verification)", () => {
  const transcriptPath = join(__dirname, "workflow-treaty-transcript.json");
  const vectors = JSON.parse(readFileSync(transcriptPath, "utf-8"));

  // Tallied per type rather than as one total: a total cannot notice that one FAMILY of vectors
  // stopped being emitted, so a regenerated transcript that dropped the menu vectors would still
  // pass while silently covering less.
  const byType = new Map<string, number>();

  test("every treaty vector matches the TS implementation dynamically", () => {
    let count = 0;
    for (const vector of vectors) {
      switch (vector.vectorType) {
        case "AgentTransition": {
          const actual = transition(vector.initialState, vector.option);
          expect(actual).toEqual(vector.expectedState);
          count++;
          break;
        }
        case "PostResultTransition": {
          const actual = postResultTransition(vector.initialState, vector.result);
          expect(actual).toEqual(vector.expectedState);
          count++;
          break;
        }
        case "CycleClose": {
          const actual = cycleClose(vector.initialState);
          expect(actual).toEqual(vector.expectedState);
          count++;
          break;
        }
        case "WorkLifecycleTransition": {
          const actual = applyTransition(vector.initialState, vector.event);
          // For ResolveAllThreads, TS uses new Date().toISOString() dynamically.
          // We assert tag and non-timestamp fields are equal.
          if (vector.event.tag === "ResolveAllThreads") {
            expect(actual.ok).toBe(vector.expectedResult.ok);
            if (actual.ok && vector.expectedResult.ok) {
              expect(actual.state.tag).toBe(vector.expectedResult.state.tag);
              expect(actual.state.tag).toBe("Approved");
              expect(vector.expectedResult.state.tag).toBe("Approved");

              if (actual.state.tag === "Approved" && vector.expectedResult.state.tag === "Approved") {
                expect(actual.state.row).toEqual(vector.expectedResult.state.row);
                expect(actual.state.prNumber).toBe(vector.expectedResult.state.prNumber);
              }
            }
          } else {
            expect(actual).toEqual(vector.expectedResult);
          }
          count++;
          break;
        }
        case "MenuGeneration": {
          const actual = generateMenu({
            state: vector.state,
            snapshot: vector.snapshot,
            candidates: vector.candidates,
            namedDeps: vector.namedDeps,
            heartbeatLane: vector.heartbeatLane,
          });
          // Order is part of the contract: a caller taking the first option must get the same
          // option here and in F#.
          expect(actual).toEqual(vector.expectedMenu);
          // Every menu, in every state, leaves a way out. Asserted against the LIVE menu rather
          // than the recorded one, so a coercive generator cannot launder itself into the treaty
          // by writing its own output down.
          expect(isNonCoercive(actual)).toBe(true);
          const scores = rankCandidates(vector.candidates, vector.snapshot, vector.state.context.agent);
          expect(scores.map((s) => ({ id: s.candidate.id, score: s.score, terms: s.terms }))).toEqual(
            vector.expectedScores,
          );
          count++;
          break;
        }
        default:
          throw new Error(`unknown vectorType in transcript: ${vector.vectorType}`);
      }
      byType.set(vector.vectorType, (byType.get(vector.vectorType) ?? 0) + 1);
    }
    expect(count).toBeGreaterThan(0);

    // Each family locks a distinct part of the loop. One vanishing is a lock quietly retired.
    for (const required of [
      "AgentTransition",
      "PostResultTransition",
      "CycleClose",
      "WorkLifecycleTransition",
      "MenuGeneration",
    ]) {
      expect(byType.get(required) ?? 0).toBeGreaterThan(0);
    }
    // And the tallies account for every vector, so a type parsed but never asserted cannot hide.
    expect([...byType.values()].reduce((a, b) => a + b, 0)).toBe(count);
  });
});
