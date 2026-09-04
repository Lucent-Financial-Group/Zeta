/**
 * run-org.test.ts — the production entry point, driven as a caller would drive it.
 *
 * `main` is what makes "it runs end to end" a statement about a code path something outside a test
 * suite takes. Tested through its EXIT CODE and its real output, because those are what a caller
 * actually consumes.
 */

import { describe, expect, test } from "bun:test";
import { main, parseArgs } from "./run-org";

/** Run `main`, capturing what it printed. */
async function capture(argv: readonly string[]): Promise<{ code: number; out: string }> {
  const lines: string[] = [];
  const log = console.log;
  const err = console.error;
  console.log = (...a: unknown[]) => void lines.push(a.map(String).join(" "));
  console.error = (...a: unknown[]) => void lines.push(a.map(String).join(" "));
  try {
    const code = await main(argv);
    return { code, out: lines.join("\n") };
  } finally {
    console.log = log;
    console.error = err;
  }
}

describe("argument parsing", () => {
  test("defaults are all off", () => {
    // `store` is undefined by default: persisting is a SIDE EFFECT, and a reporting CLI should
    // not have one unless told to.
    expect(parseArgs([])).toEqual({
      qaFails: false, churn: false, json: false, cycleOnly: false, admin: false, store: undefined,
    });
    expect(parseArgs(["--store", "/tmp/x"]).store).toBe("/tmp/x");
  });

  test("--churn implies --qa-fails, since churn needs something to fail", () => {
    const a = parseArgs(["--churn"]);
    expect(a.churn).toBe(true);
    expect(a.qaFails).toBe(true);
  });

  test("unknown flags are ignored rather than fatal", () => {
    expect(parseArgs(["--nonsense"]).json).toBe(false);
  });
});

describe("the default run delivers", () => {
  test("exit 0, and the whole pipeline is visible in the output", async () => {
    const { code, out } = await capture([]);
    expect(code).toBe(0);
    expect(out).toContain("=== DELIVERED ===");
    // Every phase left a trace.
    expect(out).toContain("intake accepted");
    expect(out).toContain("accepted 'checkout double-charges");
    expect(out).toContain("owns initiative");
    expect(out).toContain("bound to");
    expect(out).toContain("the accountable chain met");
    expect(out).toContain("offered 1 item(s); picked");
    expect(out).toContain("approved and it merged");
    expect(out).toContain("qa_engineer: 1/1 passed");
    expect(out).toContain("passed all 7 gates");
    expect(out).toContain("DELIVERED");
  });

  test("the levels engaged run from the C-suite to the contributor", async () => {
    const { out } = await capture([]);
    expect(out).toContain("c_suite → director → manager → lead → individual_contributor");
  });

  test("the DUPLICATE and the INCOMPLETE report are both refused", async () => {
    const { out } = await capture([]);
    expect(out).toContain("duplicate");
    expect(out).toContain("missing_reproduction");
  });

  test("the status readout is printed", async () => {
    const { out } = await capture([]);
    expect(out).toContain("--- status ---");
    expect(out).toContain("whitewash:   threshold");
    expect(out).toContain("qa:");
    expect(out).toContain("queue:");
  });

  test("the dev's communication brief names all eight tools", async () => {
    const { out } = await capture([]);
    expect(out).toContain("communication brief");
    for (const tool of [
      "ask_question",
      "report_blocker",
      "request_decision",
      "request_resource",
      "request_review",
      "report_risk",
      "suggest_improvement",
      "request_escalation",
    ]) {
      expect(out).toContain(tool);
    }
  });
});

describe("the failure modes exit non-zero", () => {
  test("--qa-fails does not deliver", async () => {
    const { code, out } = await capture(["--qa-fails"]);
    expect(code).toBe(1);
    expect(out).toContain("=== NOT DELIVERED ===");
    expect(out).toContain("runtime_validation");
  });

  test("--churn escalates, and says what the escalation DID", async () => {
    const { code, out } = await capture(["--churn"]);
    expect(code).toBe(1);
    expect(out).toContain("escalated");
    expect(out).toContain("changes_the_input");
  });

  test("--cycle runs the delivery loop alone and delivers", async () => {
    const { code, out } = await capture(["--cycle"]);
    expect(code).toBe(0);
    expect(out).toContain("DELIVERED");
  });

  test("--json emits parseable JSON carrying the report", async () => {
    const { code, out } = await capture(["--json"]);
    expect(code).toBe(0);
    const parsed = JSON.parse(out) as { delivered: boolean; events: string[]; bindings: unknown[] };
    expect(parsed.delivered).toBe(true);
    expect(parsed.events.length).toBeGreaterThan(0);
    expect(parsed.bindings).toHaveLength(2);
  });
});

describe("--admin exercises the operator surface, refusals included", () => {
  test("every authority check is shown refusing where it should", async () => {
    const { out } = await capture(["--admin"]);
    expect(out).toContain("--- operator surface ---");
    // The refusals are the point: a surface that only demonstrates success has not shown what
    // makes it safe.
    expect(out).toContain("revoke by a stranger:   refused");
    expect(out).toContain("revoke by a supervisor: done");
    expect(out).toContain("approve an ACTIVE binding: refused");
    expect(out).toContain("heartbeat a finished claim: refused");
    expect(out).toContain("NaN → refused");
    expect(out).toContain("evidence ok: false");
    expect(out).toContain("missing_reproduction");
  });

  test("it shows the authority ladder differing by level", async () => {
    const { out } = await capture(["--admin"]);
    // A manager gets three verdicts; a director additionally gets `waived`.
    expect(out).toContain("a manager's gate verdicts:  approved, changes_requested, rejected");
    expect(out).toContain("a director's:              approved, changes_requested, rejected, waived");
    expect(out).toContain("a lead's priority options: (none");
    expect(out).toContain("a manager may set it: false");
  });

  test("the accountability chain is printed for real work", async () => {
    const { out } = await capture(["--admin"]);
    expect(out).toContain("--- accountability for");
    expect(out).toContain("chain:");
    expect(out).toContain("rung:      lead");
  });
});
