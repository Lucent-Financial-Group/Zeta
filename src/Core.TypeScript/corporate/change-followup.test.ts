import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ATTEMPT_IN_PROMPT, ATTEMPTS_IN_PROMPT, commandFollowUp } from "./followup-commands";
import { acceptedDecisions, answersOwed, correlateFeedback, followUpFailures, followUpOrder, itemsStillToProve, PROVEN_IN_BRANCH, saysLeftReview, gatesForRound, keepRedPipelinesOpen, redPipelinesToReopen, turnedBackItems, type FeedbackDelivery } from "./change-followup";
import { ATTEMPTS_KEPT, foldHandedOffChanges, foldActionItems, openActionItems, type ActionItem, type HandedOffChange } from "./org-fold";
import type { OrgEvent } from "./org-event";

const handed = new Map<string, HandedOffChange>([
  ["task-24", { workId: "task-24", changeId: "c1", branch: "defect/AIAGENT-1660", url: "https://git.example/p/-/merge_requests/162", base: "master" }],
  ["task-32", { workId: "task-32", changeId: "c2", branch: "defect/AIAGENT-1661", url: "https://git.example/p/-/merge_requests/163" }],
]);
const d = (over: Partial<FeedbackDelivery>): FeedbackDelivery => ({ deliveryId: "1", source: "gitlab", itemKind: "comment", summary: "s", ...over });

describe("AN EVENT FINDS THE WORK IT CONCERNS, OR SAYS IT CONCERNS NONE", () => {
  test("by branch, or by a review address the change's own is a prefix of - a comment's anchor still finds its request", () => {
    const c = correlateFeedback(
      [d({ deliveryId: "n1", branch: "refs/heads/defect/AIAGENT-1660" }), d({ deliveryId: "n2", changeUrl: "https://git.example/p/-/merge_requests/163#note_99" })],
      handed,
      "master",
    );
    expect(c.aboutChange.map((m) => [m.workId, m.actionItemId])).toEqual([["task-24", "gitlab:n1"], ["task-32", "gitlab:n2"]]);
    expect(c.unmatched).toEqual([]);
  });

  test("a request with a similar number is NOT a match, in either direction - 16 and 162 never catch each other", () => {
    const c = correlateFeedback([d({ changeUrl: "https://git.example/p/-/merge_requests/16" })], handed, "master");
    expect(c.aboutChange).toEqual([]);
    expect(c.unmatched.length).toBe(1);
    const short = new Map([["task-1", { workId: "task-1", changeId: "c", branch: "b", url: "https://git.example/p/-/merge_requests/16" }]]);
    expect(correlateFeedback([d({ changeUrl: "https://git.example/p/-/merge_requests/162#note_1" })], short, "master").aboutChange).toEqual([]);
    expect(correlateFeedback([d({ changeUrl: "https://git.example/p/-/merge_requests/16/diffs" })], short, "master").aboutChange.length).toBe(1);
  });

  test("a target that moved reaches EVERY change proposed against it, each with its own item id; one recorded without a base uses the default", () => {
    const c = correlateFeedback([d({ deliveryId: "target-abc", itemKind: "target_moved", target: "refs/heads/master" })], handed, "master");
    expect(c.targetMoved.map((m) => m.actionItemId).sort()).toEqual(["gitlab:target-abc@task-24", "gitlab:target-abc@task-32"]);
  });
});

describe("ACTION ITEMS FOLD IDEMPOTENTLY FROM THE LOG", () => {
  const raised = (id: string, atMs: number): OrgEvent =>
    ({ id: `e-${id}-${String(atMs)}`, kind: "change_projected", subjectId: "task-24", decision: "", atMs, supervisorChain: [], fact: { kind: "action_item_raised", workId: "task-24", actionItemId: id, source: "gitlab", itemKind: "comment", summary: "please rename" } }) as unknown as OrgEvent;
  const settled = (id: string): OrgEvent =>
    ({ id: `s-${id}`, kind: "change_projected", subjectId: "task-24", decision: "", atMs: 50, supervisorChain: [], fact: { kind: "action_item_settled", workId: "task-24", actionItemId: id, outcome: "addressed", how: "renamed" } }) as unknown as OrgEvent;

  test("A DEFERRAL KEEPS THE ITEM OPEN AND KEEPS ITS REASON - 'left open' never reads like 'never looked at'", () => {
    const deferred = { id: "d-1", kind: "change_projected", subjectId: "task-24", decision: "", atMs: 40, supervisorChain: [], fact: { kind: "action_item_deferred", workId: "task-24", actionItemId: "gitlab:n2", why: "a backfill is a product decision", byHatId: "tech_lead" } } as unknown as OrgEvent;
    const open = openActionItems([raised("gitlab:n2", 30), deferred]).get("task-24") ?? [];
    expect(open.map((i) => i.actionItemId)).toEqual(["gitlab:n2"]);
    expect(open[0]?.deferred).toMatchObject({ why: "a backfill is a product decision", byHatId: "tech_lead" });
    // A deferral arriving after a settlement does not reopen or relabel it.
    const late = { ...deferred, id: "d-2", atMs: 60, fact: { ...(deferred as unknown as { fact: object }).fact, actionItemId: "gitlab:n1" } } as unknown as OrgEvent;
    expect(openActionItems([raised("gitlab:n1", 10), settled("gitlab:n1"), late]).get("task-24")).toBeUndefined();
  });

  test("the same event delivered twice is one item; a settle closes it; a settle for an unknown id invents nothing", () => {
    const events = [raised("gitlab:n1", 10), raised("gitlab:n1", 20), raised("gitlab:n2", 30), settled("gitlab:n1"), settled("gitlab:nope")];
    expect(foldActionItems(events).get("task-24")?.length).toBe(2);
    expect(openActionItems(events).get("task-24")?.map((i) => i.actionItemId)).toEqual(["gitlab:n2"]);
  });
});

describe("THE ORGANIZATION'S DECISIONS ARE CHECKED, NOT TAKEN ON TRUST", () => {
  const items = [{ actionItemId: "a" }, { actionItemId: "b" }] as unknown as readonly ActionItem[];
  test("an unknown item, a repeat, an invented outcome, or no account are refused; silence leaves an item open", () => {
    const r = acceptedDecisions(items, [
      { actionItemId: "a", outcome: "addressed", how: "renamed it" },
      { actionItemId: "a", outcome: "declined", how: "x" },
      { actionItemId: "zzz", outcome: "addressed", how: "x" },
      { actionItemId: "b", outcome: "closed" as never, how: "x" },
    ]);
    expect(r.accepted.map((x) => x.actionItemId)).toEqual(["a"]);
    expect(r.refused.length).toBe(3);
    expect(acceptedDecisions(items, [{ actionItemId: "b", outcome: "declined", how: " " }]).accepted).toEqual([]);
  });
});

test("the work whose oldest open item has waited longest is followed up first", () => {
  const item = (workId: string, raisedAtMs: number) => ({ workId, actionItemId: `${workId}-${String(raisedAtMs)}`, raisedAtMs }) as unknown as ActionItem;
  const open = new Map([["task-32", [item("task-32", 50)]], ["task-24", [item("task-24", 90), item("task-24", 10)]]]);
  expect(followUpOrder(open)).toEqual(["task-24", "task-32"]);
});

describe("A SETTLED ITEM IS OWED AN ANSWER WHERE IT WAS RAISED", () => {
  const base = { workId: "task-40", source: "gitlab", itemKind: "diff_comment", summary: "s", url: "https://git.example/p/-/merge_requests/164#note_1", raisedAtMs: 1 };
  const settled = (actionItemId: string, s: Partial<NonNullable<ActionItem["settled"]>>, answered?: ActionItem["answered"]): ActionItem => ({
    ...base,
    actionItemId,
    settled: { outcome: "addressed", how: "capped it", atMs: 2, ...s },
    ...(answered === undefined ? {} : { answered }),
  });

  test("addressed and declined are both owed, with the account and the pushed commit; open, deferred and answered items are not", () => {
    const items: ActionItem[] = [
      settled("fixed", { respond: true, commit: "abc123" }),
      settled("refused", { respond: true, outcome: "declined", how: "the problem cannot happen: the filter runs first" }),
      { ...base, actionItemId: "open" },
      { ...base, actionItemId: "later", deferred: { why: "not now", atMs: 3 } },
      settled("done", { respond: true }, { replyId: "note-9", resolved: true, atMs: 4 }),
    ];
    const { owed, unanswered } = answersOwed(items);
    expect(owed.map((o) => [o.actionItemId, o.outcome, o.commit, o.when])).toEqual([
      ["fixed", "addressed", "abc123", "always"],
      ["refused", "declined", undefined, "always"],
    ]);
    expect(owed[1]?.how).toBe("the problem cannot happen: the filter runs first");
    expect(unanswered).toEqual([]);
  });

  test("an item the organization decided needed no answer is recorded as unanswered, never posted", () => {
    const { owed, unanswered } = answersOwed([settled("trigger", { respond: false, outcome: "declined", how: "the review trigger keyword" })]);
    expect(owed).toEqual([]);
    expect(unanswered.map((u) => u.actionItemId)).toEqual(["trigger"]);
  });

  test("MEASURED on MR !162: an account naming a place on this machine is never posted to a reviewer", () => {
    const leaky = [
      "Rollout drafted at C:\\Users\\Max.Chadaev\\.agent-org\\stores\\agentic-team\\runs\\x\\evidence\\review.md for the reviewer",
      "see C:/Users/someone/AppData/Local/Temp/verify.log",
      "written to /home/ci/.agent-org/stores/x",
      "copied to /Users/max/work/evidence.png",
    ];
    for (const how of leaky) {
      const { owed, unanswered, withheld } = answersOwed([settled("x", { respond: true, how })]);
      expect(owed).toEqual([]);
      expect(unanswered).toEqual([]);
      // WITHHELD IS NOT A DEAD END: the item goes back to be decided, told why.
      expect(withheld[0]?.why).toContain("which they cannot open");
    }
    // An item recorded as skipped for this reason before reopening existed is reopened too.
    const legacy = settled("old", { how: leaky[0] as string }, { resolved: false, skipped: "its account names a place the reviewer cannot open (C:\\Users\\x) - not posted", atMs: 5 });
    expect(answersOwed([legacy]).withheld.map((w) => w.actionItemId)).toEqual(["old"]);
    // ...but an item answered for any other reason is left alone.
    const fine = settled("done", { how: "server/src/a.ts" }, { replyId: "note-1", resolved: true, atMs: 5 });
    expect(answersOwed([fine]).withheld).toEqual([]);
    // Repository paths, URLs and code are what a reviewer can open - those are posted.
    for (const how of [
      "server/src/routes/oversight.ts:176 caps the limit; test in server/src/__tests__/routes/x.test.ts",
      "see https://tgcsgitlab.example/p/-/merge_requests/164 and `readCap = limit * 4`",
    ]) {
      expect(answersOwed([settled("y", { respond: true, how })]).owed).toHaveLength(1);
    }
  });

  test("an item settled BEFORE answering existed is answered only if it is a thread - nobody decided, so the answerer checks", () => {
    const { owed } = answersOwed([settled("legacy", {})]);
    expect(owed[0]?.when).toBe("if_thread");
  });
});

describe("THE ANSWER IS FOLDED ONTO ITS ITEM, SO IT IS NEVER GIVEN TWICE", () => {
  test("answered records the reply id and whether it was resolved; a skip is recorded too", () => {
    const ev = (atMs: number, fact: unknown) => ({ id: `e${String(atMs)}`, kind: "change_projected", subjectId: "task-40", decision: "", atMs, evidenceRefs: [], supervisorChain: [], fact }) as unknown as OrgEvent;
    const folded = foldActionItems([
      ev(1, { kind: "action_item_raised", workId: "task-40", actionItemId: "gitlab:note-1", source: "gitlab", itemKind: "comment", summary: "s" }),
      ev(2, { kind: "action_item_settled", workId: "task-40", actionItemId: "gitlab:note-1", outcome: "addressed", how: "h", respond: true, commit: "abc" }),
      ev(3, { kind: "action_item_answered", workId: "task-40", actionItemId: "gitlab:note-1", replyId: "note-7", resolved: true }),
    ]).get("task-40")?.[0];
    expect(folded?.settled).toMatchObject({ respond: true, commit: "abc" });
    expect(folded?.answered).toMatchObject({ replyId: "note-7", resolved: true });
    expect(answersOwed(folded === undefined ? [] : [folded]).owed).toEqual([]);
  });
});

describe("A SETTLEMENT THAT DID NOT STAND IS REOPENED, NOT DROPPED", () => {
  test("reopening clears the settlement and its answer, keeps why, and the item is open again", () => {
    const ev = (atMs: number, fact: unknown) => ({ id: `e${String(atMs)}`, kind: "change_projected", subjectId: "task-24", decision: "", atMs, evidenceRefs: [], supervisorChain: [], fact }) as unknown as OrgEvent;
    const log = [
      ev(1, { kind: "action_item_raised", workId: "task-24", actionItemId: "gitlab:note-1975496", source: "gitlab", itemKind: "diff_comment", summary: "no backfill" }),
      ev(2, { kind: "action_item_settled", workId: "task-24", actionItemId: "gitlab:note-1975496", outcome: "addressed", how: "runbook drafted at C:\\Users\\x\\.agent-org\\y" }),
      ev(3, { kind: "action_item_answered", workId: "task-24", actionItemId: "gitlab:note-1975496", resolved: false, skipped: "its account names a place" }),
      ev(4, { kind: "action_item_reopened", workId: "task-24", actionItemId: "gitlab:note-1975496", why: "the runbook is only in the evidence directory" }),
    ];
    const item = foldActionItems(log).get("task-24")?.[0];
    expect(item?.settled).toBeUndefined();
    expect(item?.answered).toBeUndefined();
    expect(item?.reopened?.why).toContain("only in the evidence directory");
    expect(openActionItems(log).get("task-24")?.map((i) => i.actionItemId)).toEqual(["gitlab:note-1975496"]);
    // Settled again after reopening, it is closed again - and owed a fresh answer.
    const again = [...log, ev(5, { kind: "action_item_settled", workId: "task-24", actionItemId: "gitlab:note-1975496", outcome: "addressed", how: "the rollout note is now in the request's Resolution section", respond: true })];
    const settledAgain = foldActionItems(again).get("task-24") ?? [];
    expect(openActionItems(again).get("task-24")).toBeUndefined();
    expect(answersOwed(settledAgain).owed.map((o) => o.actionItemId)).toEqual(["gitlab:note-1975496"]);
  });
});

describe("UNDER until_green A RED PIPELINE IS NOT FINISHED BY BEING EXPLAINED", () => {
  const item = (actionItemId: string, itemKind: string): ActionItem =>
    ({ workId: "task-40", actionItemId, source: "gitlab", itemKind, summary: "s", raisedAtMs: 1 });
  const items = [item("gitlab:pipeline-55-failed", "pipeline_failed"), item("gitlab:note-7", "diff_comment")];
  // What the organization actually said on agentic-tpm !164, in the shape a session returns it.
  const asFlake = { actionItemId: "gitlab:pipeline-55-failed", outcome: "declined" as const, how: "a MongoMemoryServer flake; the suite is green locally at this SHA", respond: true };
  const onComment = { actionItemId: "gitlab:note-7", outcome: "declined" as const, how: "the problem cannot happen: the filter runs first", respond: true };

  test("a declined pipeline is kept open, with its reasoning, and named so a person can be told", () => {
    const { decisions, kept } = keepRedPipelinesOpen(items, [asFlake, onComment], "until_green");
    expect(kept).toEqual(["gitlab:pipeline-55-failed"]);
    const red = decisions.find((d) => d.actionItemId === "gitlab:pipeline-55-failed");
    expect(red?.outcome).toBe("deferred");
    // THE REASONING SURVIVES: it is kept open, not overruled - the diagnosis may well be right.
    expect(red?.how).toContain("a MongoMemoryServer flake");
    expect(red?.how).toContain("not done until the pipeline passes");
    // A comment is still the organization's to decline: this narrows one outcome on one kind of item.
    expect(decisions.find((d) => d.actionItemId === "gitlab:note-7")).toEqual(onComment);
  });

  test("a pipeline it actually fixed, or one it already left open, passes through untouched", () => {
    const fixed = { actionItemId: "gitlab:pipeline-55-failed", outcome: "addressed" as const, how: "the port was hardcoded; it now takes a free one", respond: true };
    const left = { actionItemId: "gitlab:pipeline-55-failed", outcome: "deferred" as const, how: "waiting on the runner image", respond: true };
    expect(keepRedPipelinesOpen(items, [fixed], "until_green")).toEqual({ decisions: [fixed], kept: [] });
    expect(keepRedPipelinesOpen(items, [left], "until_green")).toEqual({ decisions: [left], kept: [] });
  });

  test("under flag_only, and where nobody has stated a policy, the organization decides for itself", () => {
    expect(keepRedPipelinesOpen(items, [asFlake], "flag_only").decisions).toEqual([asFlake]);
    expect(keepRedPipelinesOpen(items, [asFlake], "none").decisions).toEqual([asFlake]);
    expect(keepRedPipelinesOpen(items, [asFlake], undefined).decisions).toEqual([asFlake]);
  });
});

describe("A PIPELINE STILL REPORTED RED COMES BACK OPEN", () => {
  const base = { workId: "task-40", source: "gitlab", itemKind: "pipeline_failed", summary: "s", raisedAtMs: 1 };
  const red: FeedbackDelivery = { deliveryId: "pipeline-189289-failed", source: "gitlab", itemKind: "pipeline_failed", summary: "the request's pipeline 189289 failed at bcc152b4" };
  const match = { workId: "task-40", actionItemId: "gitlab:pipeline-189289-failed", delivery: red };
  // MEASURED on agentic-tpm !164: raised 21:31, declined 21:31, and the pipeline still red at 00:17.
  const declined: ActionItem = {
    ...base,
    actionItemId: "gitlab:pipeline-189289-failed",
    settled: { outcome: "declined", how: "Same signal as pipeline 189179 - infrastructure", atMs: 2, respond: false },
  };
  const items = (list: readonly ActionItem[]): ReadonlyMap<string, readonly ActionItem[]> => new Map([["task-40", list]]);

  test("a settled item whose pipeline is still failing is reopened, saying what was decided and that it did not make it pass", () => {
    const out = redPipelinesToReopen([match], items([declined]), "until_green");
    expect(out.map((o) => o.actionItemId)).toEqual(["gitlab:pipeline-189289-failed"]);
    expect(out[0]?.why).toContain("still not green");
    expect(out[0]?.why).toContain("Same signal as pipeline 189179");
  });

  test("an item still open is left alone - it is already somebody's to do", () => {
    expect(redPipelinesToReopen([match], items([{ ...base, actionItemId: "gitlab:pipeline-189289-failed" }]), "until_green")).toEqual([]);
  });

  test("a comment is never reopened this way, and nothing is reopened unless the organization asked for until_green", () => {
    const comment = { workId: "task-40", actionItemId: "gitlab:note-7", delivery: { ...red, deliveryId: "note-7", itemKind: "diff_comment" } };
    const settledComment: ActionItem = { ...declined, actionItemId: "gitlab:note-7", itemKind: "diff_comment" };
    expect(redPipelinesToReopen([comment], items([settledComment]), "until_green")).toEqual([]);
    expect(redPipelinesToReopen([match], items([declined]), "flag_only")).toEqual([]);
    expect(redPipelinesToReopen([match], items([declined]), undefined)).toEqual([]);
  });
});

describe("WHAT A ROUND OWES IS DECIDED, AND ONLY WITHIN WHAT THE CHAIN OWES", () => {
  const request = {
    workId: "task-40",
    plannerHatId: "planner",
    available: ["reproduction", "implementation_review", "qa_uat", "release_readiness"],
    usual: ["implementation_review", "qa_uat"],
    because: [{ kind: "comment", summary: "rename the flag" }],
    roundsSoFar: 1,
  };

  test("a plan naming stages the chain owes is what the round owes, with its reason", () => {
    const out = gatesForRound({ gates: ["implementation_review"], why: "a rename in one file; qa_uat judges behaviour and none changed" }, request);
    expect(out.gates).toEqual(["implementation_review"]);
    expect(out.why).toContain("a rename in one file");
  });

  test("NOTHING is a real answer - the repository's own tests still run either way", () => {
    expect(gatesForRound({ gates: [], why: "the answer is in the description; no code changed" }, request).gates).toEqual([]);
  });

  test("a round that keeps coming back may owe MORE than usual", () => {
    const out = gatesForRound({ gates: ["reproduction", "implementation_review", "qa_uat"], why: "turned back twice on the same test; reproduce it first" }, { ...request, roundsSoFar: 3, lastTurnedBackBy: "qa_uat: the test passes with the fix removed" });
    expect(out.gates).toEqual(["reproduction", "implementation_review", "qa_uat"]);
  });

  test("REVIEWING LESS IS A DECISION, NEVER A PARSE FAILURE: no plan, or one naming a stage nobody holds, owes the usual stages", () => {
    expect(gatesForRound(undefined, request).gates).toEqual(request.usual);
    expect(gatesForRound(undefined, request).why).toContain("nobody decided");
    const invented = gatesForRound({ gates: ["security_review"], why: "sounds important" }, request);
    expect(invented.gates).toEqual(request.usual);
    expect(invented.why).toContain("security_review");
    expect(invented.why).toContain("does not owe");
  });
});

describe("ONLY WHAT THE REVIEWER TURNED BACK IS DONE AGAIN", () => {
  // MEASURED on agentic-tpm !164, 2026-09-12: a review rejected 2 of 12 items - "ten of the twelve
  // check out under mutation, but two do not" - and all twelve were reopened. The next session spent
  // 41 minutes and 140 turns reworking ten items the reviewer had already proved good, to fix two.
  const decided = [
    { actionItemId: "gitlab:note-1", outcome: "addressed" },
    { actionItemId: "gitlab:note-2", outcome: "addressed" },
    { actionItemId: "gitlab:note-3", outcome: "declined" },
    { actionItemId: "gitlab:note-4", outcome: "deferred" },
  ];
  const summaries = new Map([
    ["gitlab:note-1", "the oversight severity index"],
    ["gitlab:note-2", "cap the batch size"],
    ["gitlab:note-3", "rename the flag"],
    ["gitlab:note-4", "split the module"],
  ]);

  test("named by summary: those come back, the rest are left alone", () => {
    const out = turnedBackItems(decided, summaries, ["the oversight severity index"]);
    expect(out.again).toEqual(["gitlab:note-1"]);
    expect(out.kept).toEqual(["gitlab:note-2", "gitlab:note-3"]);
  });

  test("named by id works too - a reviewer is shown both", () => {
    expect(turnedBackItems(decided, summaries, ["gitlab:note-2"]).again).toEqual(["gitlab:note-2"]);
  });

  test("a reviewer that names nothing turns the whole round back", () => {
    expect(turnedBackItems(decided, summaries, undefined).again).toEqual(["gitlab:note-1", "gitlab:note-2", "gitlab:note-3"]);
    expect(turnedBackItems(decided, summaries, []).kept).toEqual([]);
  });

  test("a rejection naming nothing THIS round decided turns it back whole - never quietly keeps everything", () => {
    const out = turnedBackItems(decided, summaries, ["something from another change entirely"]);
    expect(out.again).toEqual(["gitlab:note-1", "gitlab:note-2", "gitlab:note-3"]);
    expect(out.kept).toEqual([]);
  });

  test("a deferred item is nobody's to turn back: it was never claimed", () => {
    for (const r of [undefined, ["the oversight severity index"], ["split the module"]]) {
      const out = turnedBackItems(decided, summaries, r);
      expect([...out.again, ...out.kept]).not.toContain("gitlab:note-4");
    }
  });
});

describe("AN ITEM THAT KEEPS COMING BACK SAYS SO", () => {
  // MEASURED on agentic-tpm !164, 2026-09-12: one finding was claimed fixed and turned back three
  // rounds running. Only the latest reason was kept, so every session saw "this was turned back" and
  // none saw "this has been turned back three times" - the fact that should change what it does.
  const ev = (fact: unknown, atMs: number): OrgEvent =>
    ({ id: "e" + String(atMs), kind: "change_projected", subjectId: "task-1", decision: "", atMs, evidenceRefs: [], supervisorChain: [], fact }) as unknown as OrgEvent;
  const raised = ev({ kind: "action_item_raised", workId: "task-1", actionItemId: "gitlab:note-1", source: "gitlab", itemKind: "comment", summary: "add the index" }, 1);
  const settled = (at: number) => ev({ kind: "action_item_settled", workId: "task-1", actionItemId: "gitlab:note-1", outcome: "addressed", how: "added it", respond: true }, at);
  const reopened = (at: number, why: string) => ev({ kind: "action_item_reopened", workId: "task-1", actionItemId: "gitlab:note-1", why }, at);

  test("each settlement that does not stand is counted, and the latest reason is kept", () => {
    const item = (foldActionItems([
      raised,
      settled(2), reopened(3, "the test passes with the fix removed"),
      settled(4), reopened(5, "same item, same missing proof"),
      settled(6), reopened(7, "still not proved - the test fails for another reason"),
    ]).get("task-1") ?? [])[0];
    expect(item?.reopenedTimes).toBe(3);
    expect(item?.reopened?.why).toContain("fails for another reason");
    expect(item?.settled).toBeUndefined();
  });

  test("an item that was never turned back counts nothing", () => {
    const item = (foldActionItems([raised, settled(2)]).get("task-1") ?? [])[0];
    expect(item?.reopenedTimes).toBeUndefined();
  });
});

describe("WHAT THE SESSION IS HANDED ABOUT AN ITEM INCLUDES HOW OFTEN IT HAS FAILED", () => {
  // The count is folded from the log, but it only changes anything if it reaches the session that
  // decides. A stand-in for the command records what it was told.
  test("an item turned back twice or more is handed on with the count; once is just the reason", async () => {
    const dir = mkdtempSync(join(tmpdir(), "followup-seam-"));
    const seen = join(dir, "seen.json");
    const stub = join(dir, "stub.cjs");
    writeFileSync(
      stub,
      'require("fs").writeFileSync(' + JSON.stringify(seen) + ', process.env.ORG_ACTION_ITEMS || "");' +
        'process.stdout.write(JSON.stringify({ decisions: [], syncWithTarget: false, summary: "s" }));',
    );
    try {
      const followUp = commandFollowUp({ command: "node", args: [stub] }, dir);
      const base = { workId: "task-1", source: "gitlab", itemKind: "comment", summary: "add the index", raisedAtMs: 1 };
      await followUp({
        workId: "task-1",
        hatId: "backend_implementer",
        branch: "defect/x",
        mode: "triage",
        canSync: false,
        items: [
          { ...base, actionItemId: "gitlab:once", reopened: { why: "turned back", atMs: 2 }, reopenedTimes: 1 },
          { ...base, actionItemId: "gitlab:again", reopened: { why: "turned back again", atMs: 3 }, reopenedTimes: 3 },
        ] as unknown as readonly ActionItem[],
      });
      const told = JSON.parse(readFileSync(seen, "utf-8")) as { id: string; turnedBackTimes?: number }[];
      expect(told.find((t) => t.id === "gitlab:again")?.turnedBackTimes).toBe(3);
      expect(told.find((t) => t.id === "gitlab:once")?.turnedBackTimes).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("THE PROMPT CARRIES WHAT MUST BE DECIDED - THE WORLDVIEW CARRIES THE REST", () => {
  // MEASURED on dev-portal, 2026-09-12: an item's `detail` went into the prompt unbounded - for a
  // pipeline item that is up to three CI jobs' logs - putting ~16KB of world into a session whose
  // repository already spent most of the context window on its own documents. The session died.
  test("a long detail is cut in the prompt and says where the whole of it is", async () => {
    const dir = mkdtempSync(join(tmpdir(), "followup-detail-"));
    const seen = join(dir, "seen.json");
    const stub = join(dir, "stub.cjs");
    writeFileSync(
      stub,
      'require("fs").writeFileSync(' + JSON.stringify(seen) + ', process.env.ORG_ACTION_ITEMS || "");' +
        'process.stdout.write(JSON.stringify({ decisions: [], syncWithTarget: false, summary: "s" }));',
    );
    try {
      const followUp = commandFollowUp({ command: "node", args: [stub] }, dir);
      const long = "x".repeat(9000);
      await followUp({
        workId: "task-12",
        hatId: "backend_implementer",
        branch: "defect/x",
        mode: "triage",
        canSync: false,
        items: [
          { workId: "task-12", actionItemId: "gitlab:pipeline-1", source: "gitlab", itemKind: "pipeline_failed", summary: "the pipeline failed", detail: long, raisedAtMs: 1 },
          { workId: "task-12", actionItemId: "gitlab:note-1", source: "gitlab", itemKind: "comment", summary: "short one", detail: "still short", raisedAtMs: 1 },
        ] as unknown as readonly ActionItem[],
      });
      const told = JSON.parse(readFileSync(seen, "utf-8")) as { id: string; detail?: string }[];
      const big = told.find((t) => t.id === "gitlab:pipeline-1");
      expect(big?.detail?.length).toBeLessThan(800);
      expect(big?.detail).toContain("+8400 more");
      expect(big?.detail).toContain("observe item task-12");
      // A short one is untouched: this bounds what is large, it does not hide what is small.
      expect(told.find((t) => t.id === "gitlab:note-1")?.detail).toBe("still short");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("GIVING UP ON A REQUEST COUNTS ITS FAILURES, NOT THE ACCOUNT'S CEILING", () => {
  const said = (n: number, decision: string): OrgEvent =>
    ({ id: `f-${String(n)}`, kind: "change_projected", subjectId: "task-24", decision, atMs: n, supervisorChain: [] }) as unknown as OrgEvent;
  const LIMIT = "the follow-up of task-24 did not complete: the follow-up session exited 4: [claude-agent] Claude Code reported an error: You've hit your limit \u00b7 resets Sep 13, 7am (America/New_York)";
  const REAL = "the follow-up of task-24 did not complete: the follow-up session exited 1: the worktree was dirty";

  // MEASURED on agentic-tpm, 2026-09-12: an outage left 13 limit refusals on each of two requests,
  // and the next watcher tick parked BOTH - "a person is needed" - with nothing wrong with either.
  test("a usage limit never reached the work, so it does not count toward giving up", () => {
    const events = Array.from({ length: 13 }, (_, i) => said(i + 1, LIMIT));
    expect(followUpFailures(events, "task-24").inARow).toBe(0);
  });

  test("a real failure still counts, and still clears when a follow-up runs", () => {
    expect(followUpFailures([said(1, REAL), said(2, REAL), said(3, REAL)], "task-24").inARow).toBe(3);
    expect(followUpFailures([said(1, REAL), said(2, REAL), said(3, "followed up task-24: 2 of 2 item(s) decided")], "task-24").inARow).toBe(0);
  });

  // The outage must not erase what happened either side of it: a limit is skipped, not a reset.
  test("failures either side of an outage still add up", () => {
    const events = [said(1, REAL), said(2, LIMIT), said(3, LIMIT), said(4, REAL), said(5, REAL)];
    expect(followUpFailures(events, "task-24").inARow).toBe(3);
  });
});

describe("A PROOF IS SPENT ONCE", () => {
  const decided = [
    { actionItemId: "gitlab:n1", outcome: "addressed" },
    { actionItemId: "gitlab:n2", outcome: "addressed" },
    { actionItemId: "gitlab:n3", outcome: "declined" },
    { actionItemId: "gitlab:n4", outcome: "deferred" },
  ];
  const proven = (id: string) => ({ actionItemId: id, reopened: { why: `${PROVEN_IN_BRANCH} - it is NOT what turned the round back.` } });
  const turnedBack = (id: string) => ({ actionItemId: id, reopened: { why: "your change for this was reviewed and turned back - qa_uat by qa_director: the index is not covered" } });

  // MEASURED on task-040, 2026-09-12: 167 turns and $17.05 re-proving twelve items, most already proved.
  test("an item a reviewer already proved is not handed to the next reviewer to prove again", () => {
    const { toProve, provenAlready } = itemsStillToProve(decided, [proven("gitlab:n1"), turnedBack("gitlab:n2")]);
    expect(provenAlready).toEqual(["gitlab:n1"]);
    expect(toProve.map((d) => d.actionItemId)).toEqual(["gitlab:n2", "gitlab:n3"]);
  });

  test("a deferred item is nobody's to prove", () => {
    const { toProve } = itemsStillToProve(decided, []);
    expect(toProve.map((d) => d.actionItemId)).not.toContain("gitlab:n4");
  });

  test("an item turned back for another reason is proved again - only the proved are skipped", () => {
    const { provenAlready } = itemsStillToProve(decided, [turnedBack("gitlab:n1"), turnedBack("gitlab:n2")]);
    expect(provenAlready).toEqual([]);
  });

  // A review with nothing to judge is not a review: an empty payload reads as "the author claims nothing".
  test("when everything has been proved already, the whole set is judged rather than none", () => {
    const all = [proven("gitlab:n1"), proven("gitlab:n2"), proven("gitlab:n3")];
    const { toProve } = itemsStillToProve(decided, all);
    expect(toProve.map((d) => d.actionItemId)).toEqual(["gitlab:n1", "gitlab:n2", "gitlab:n3"]);
  });
});

describe("A REOPEN DROPS THE SETTLEMENT, NOT THE WORK BEHIND IT", () => {
  // ── WHY THIS EXISTS ──────────────────────────────────────────────────────────────────────────
  // MEASURED on agentic-tpm, 2026-09-12: ~51 agent turns per call, 156 tokens READ for every one
  // written. The reading is the cost. A reopened item arrived carrying the objection and nothing
  // about what the last round had already done, so every round re-derived the same diagnosis from
  // the same repository - the most expensive thing a session does, to arrive where one already was.
  const ev = (fact: unknown, atMs: number): OrgEvent =>
    ({ id: "a" + String(atMs), kind: "change_projected", subjectId: "task-9", decision: "", atMs, evidenceRefs: [], supervisorChain: [], fact }) as unknown as OrgEvent;
  const raised = ev({ kind: "action_item_raised", workId: "task-9", actionItemId: "gitlab:n1", source: "gitlab", itemKind: "comment", summary: "add the index" }, 1);
  const settled = (at: number, how: string) =>
    ev({ kind: "action_item_settled", workId: "task-9", actionItemId: "gitlab:n1", outcome: "addressed", how, byHatId: "backend_implementer", respond: true }, at);
  const reopened = (at: number, why: string) => ev({ kind: "action_item_reopened", workId: "task-9", actionItemId: "gitlab:n1", why }, at);

  test("what a turned-back round did is carried forward with what became of it", () => {
    const item = (foldActionItems([
      raised,
      settled(2, "added a covering index on (tenant_id, created_at)"),
      reopened(3, "the query still scans - the index is not used by this plan"),
    ]).get("task-9") ?? [])[0];
    // The falsifier: before this, the reopen dropped `settled` and kept only `why`, so the next
    // session was told the objection and had to find out for itself what had been tried.
    expect(item?.settled).toBeUndefined();
    expect(item?.attempts?.length).toBe(1);
    expect(item?.attempts?.[0]?.how).toContain("covering index");
    expect(item?.attempts?.[0]?.outcome).toBe("addressed");
    expect(item?.attempts?.[0]?.byHatId).toBe("backend_implementer");
    expect(item?.attempts?.[0]?.thenWhat).toContain("not used by this plan");
  });

  test("attempts accumulate in order and are bounded - the last few, not all of them", () => {
    const events = [raised];
    for (let n = 0; n < ATTEMPTS_KEPT + 2; n += 1) {
      events.push(settled(2 + n * 2, `attempt ${String(n)}`), reopened(3 + n * 2, `no: ${String(n)}`));
    }
    const item = (foldActionItems(events).get("task-9") ?? [])[0];
    expect(item?.reopenedTimes).toBe(ATTEMPTS_KEPT + 2);
    expect(item?.attempts?.length).toBe(ATTEMPTS_KEPT);
    // Oldest first, and it is the LATEST few that survive.
    expect(item?.attempts?.map((a) => a.how)).toEqual(["attempt 2", "attempt 3", "attempt 4"]);
  });

  test("an item settled and never turned back carries no attempts, and one reopened with nothing settled adds none", () => {
    expect((foldActionItems([raised, settled(2, "did it")]).get("task-9") ?? [])[0]?.attempts).toBeUndefined();
    expect((foldActionItems([raised, reopened(2, "never settled")]).get("task-9") ?? [])[0]?.attempts).toBeUndefined();
  });

  test("the next session is handed what was already tried, bounded, with what became of it", async () => {
    const dir = mkdtempSync(join(tmpdir(), "followup-attempts-"));
    const seen = join(dir, "seen.json");
    const stub = join(dir, "stub.cjs");
    writeFileSync(
      stub,
      'require("fs").writeFileSync(' + JSON.stringify(seen) + ', process.env.ORG_ACTION_ITEMS || "");' +
        'process.stdout.write(JSON.stringify({ decisions: [], syncWithTarget: false, summary: "s" }));',
    );
    try {
      const followUp = commandFollowUp({ command: "node", args: [stub] }, dir);
      await followUp({
        workId: "task-9",
        hatId: "backend_implementer",
        branch: "defect/x",
        mode: "triage",
        canSync: false,
        items: [
          {
            workId: "task-9",
            actionItemId: "gitlab:n1",
            source: "gitlab",
            itemKind: "comment",
            summary: "add the index",
            raisedAtMs: 1,
            reopened: { why: "still scans", atMs: 9 },
            attempts: [
              { outcome: "addressed", how: "first try", atMs: 2, thenWhat: "no - a" },
              { outcome: "addressed", how: "second try", atMs: 4, thenWhat: "no - b" },
              { outcome: "addressed", how: `third try ${"y".repeat(900)}`, atMs: 6, thenWhat: "no - c" },
            ],
          },
        ] as unknown as readonly ActionItem[],
      });
      const told = JSON.parse(readFileSync(seen, "utf-8")) as { id: string; alreadyTried?: { decided: string; what: string; thenWhat: string }[] }[];
      const tried = told.find((t) => t.id === "gitlab:n1")?.alreadyTried;
      // Only the last few reach the prompt; the whole history stays in the record for `observe`.
      expect(tried?.length).toBe(ATTEMPTS_IN_PROMPT);
      expect(tried?.[0]?.what).toBe("second try");
      expect(tried?.[0]?.thenWhat).toBe("no - b");
      expect(tried?.[1]?.decided).toBe("addressed");
      // And a long account is cut rather than pasted whole.
      expect((tried?.[1]?.what ?? "").length).toBeLessThanOrEqual(ATTEMPT_IN_PROMPT + 1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("an item with no attempts is handed none - the key is absent, not empty", async () => {
    const dir = mkdtempSync(join(tmpdir(), "followup-attempts-none-"));
    const seen = join(dir, "seen.json");
    const stub = join(dir, "stub.cjs");
    writeFileSync(
      stub,
      'require("fs").writeFileSync(' + JSON.stringify(seen) + ', process.env.ORG_ACTION_ITEMS || "");' +
        'process.stdout.write(JSON.stringify({ decisions: [], syncWithTarget: false, summary: "s" }));',
    );
    try {
      const followUp = commandFollowUp({ command: "node", args: [stub] }, dir);
      await followUp({
        workId: "task-9",
        hatId: "backend_implementer",
        branch: "defect/x",
        mode: "triage",
        canSync: false,
        items: [{ workId: "task-9", actionItemId: "gitlab:n2", source: "gitlab", itemKind: "comment", summary: "s", raisedAtMs: 1 }] as unknown as readonly ActionItem[],
      });
      const told = JSON.parse(readFileSync(seen, "utf-8")) as { id: string; alreadyTried?: unknown }[];
      expect(told[0]?.alreadyTried).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("A REQUEST THAT LEFT REVIEW LEAVES THE ORGANIZATION'S ATTENTION", () => {
  // ── WHY THIS EXISTS ──────────────────────────────────────────────────────────────────────────
  // The poller has reported `merged` and `closed` since it was written. MEASURED on agentic-tpm,
  // 2026-09-12: ZERO events ever consumed them. Two things followed. The delivery became an
  // ordinary action item - a session asked to address, decline or defer "the merge request was
  // merged", which asks nothing of anyone. And `foldHandedOffChanges` only ever GREW, so every
  // request the organization had ever handed off was polled again on every tick, for ever.
  const ev = (fact: unknown, atMs: number): OrgEvent =>
    ({ id: "l" + String(atMs), kind: "change_projected", subjectId: "task-1", decision: "", atMs, evidenceRefs: [], supervisorChain: [], fact }) as unknown as OrgEvent;
  const handedOff = (at: number, workId = "task-1") =>
    ev({ kind: "change_handed_off", workId, changeId: "c1", branch: "defect/x", url: "https://git.example/p/-/merge_requests/1" }, at);
  const left = (at: number, state: string, workId = "task-1") =>
    ev({ kind: "change_left_review", workId, changeId: "c1", branch: "defect/x", state }, at);

  test("merged and closed are the kinds that mean the request is over", () => {
    expect(saysLeftReview("merged")).toBe(true);
    expect(saysLeftReview("closed")).toBe(true);
    expect(saysLeftReview("Merged")).toBe(true);
    expect(saysLeftReview("comment")).toBe(false);
    expect(saysLeftReview("pipeline_failed")).toBe(false);
    expect(saysLeftReview("target_moved")).toBe(false);
  });

  test("a merged request is dropped from what gets polled", () => {
    expect([...foldHandedOffChanges([handedOff(1)]).keys()]).toEqual(["task-1"]);
    // The falsifier: before this the map only grew, so this was still ["task-1"].
    expect([...foldHandedOffChanges([handedOff(1), left(2, "merged")]).keys()]).toEqual([]);
  });

  test("a closed request is dropped too, and other work is untouched", () => {
    const folded = foldHandedOffChanges([handedOff(1), handedOff(2, "task-2"), left(3, "closed")]);
    expect([...folded.keys()]).toEqual(["task-2"]);
  });

  test("work handed off AGAIN after it left review comes back - the events are read in order", () => {
    const folded = foldHandedOffChanges([handedOff(1), left(2, "closed"), handedOff(3)]);
    expect([...folded.keys()]).toEqual(["task-1"]);
    expect(folded.get("task-1")?.branch).toBe("defect/x");
  });
});

describe("A ROUND MAY ASK FOR A STAGE ITS CHAIN DOES NOT OWE", () => {
  // `available` used to be exactly the item's chain, so the one thing a round could never decide was
  // that the change it just made needs a look the original work did not - a follow-up touching
  // authentication cannot ask for a security review when the defect chain never owed one.
  const base = {
    workId: "task-1",
    plannerHatId: "tech_lead",
    usual: ["implementation_review", "qa_uat"],
    because: [{ kind: "comment", summary: "s" }],
    roundsSoFar: 1,
  };

  test("a stage beyond the chain is honoured, and the record says it was asked for", () => {
    const decided = gatesForRound(
      { gates: ["implementation_review", "security_review"], why: "this round changed the token check" },
      { ...base, available: ["implementation_review", "qa_uat", "security_review"], beyondChain: ["security_review"] },
    );
    expect(decided.gates).toEqual(["implementation_review", "security_review"]);
    expect(decided.why).toContain("this round changed the token check");
    // Answerable from the log alone: why did this round run a stage nobody routinely runs?
    expect(decided.why).toContain("security_review");
    expect(decided.why).toContain("does not owe");
  });

  test("a stage nobody can staff is still refused, and the round owes the usual ones", () => {
    const decided = gatesForRound(
      { gates: ["implementation_review", "not_a_gate"], why: "w" },
      { ...base, available: ["implementation_review", "qa_uat"] },
    );
    expect(decided.gates).toEqual(base.usual);
    expect(decided.why).toContain("not_a_gate");
  });

  test("naming only chain stages reads exactly as it did before - no note about extras", () => {
    const decided = gatesForRound(
      { gates: ["qa_uat"], why: "one comment, behaviour changed" },
      { ...base, available: ["implementation_review", "qa_uat", "security_review"], beyondChain: ["security_review"] },
    );
    expect(decided.gates).toEqual(["qa_uat"]);
    expect(decided.why).toBe("one comment, behaviour changed");
  });
});
