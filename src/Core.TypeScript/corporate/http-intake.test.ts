/**
 * http-intake.test.ts — the connector, against a REAL listening server.
 *
 * The happy path runs over an actual HTTP socket rather than a mock, because a connector whose
 * every test is mocked has proved nothing about whether it can reach anything — the one claim it
 * exists to make. The refusal paths use an injected `fetchImpl`, since "the tracker returned 503"
 * is a scenario a real server cannot conveniently be asked to produce on demand.
 *
 * The property under test throughout: A BAD TICKET AND NO TICKET MUST NOT LOOK ALIKE. Dropping the
 * item that failed to parse leaves a queue that is quietly short, and the work simply never happens
 * with nothing anywhere saying so.
 */

import { afterAll, describe, expect, test } from "bun:test";
import { httpIntake } from "./adapters";
import { Fidelity } from "./providers";
import { IntakeKind, Severity, type ExternalEvent } from "./intake";

/** The tracker's payload, in the shape a Jira-like search endpoint returns. */
const PAYLOAD = {
  issues: [
    { key: "OPS-1", fields: { summary: "checkout double-charges", priority: "High", steps: "twice" } },
    { key: "OPS-2", fields: { summary: "coupon total is wrong", priority: "Low", steps: "apply two" } },
  ],
};

/** One tracker item to one `ExternalEvent`. THE only thing a new tracker has to supply. */
const mapper = (item: unknown): ExternalEvent => {
  const issue = item as { key?: string; fields?: { summary?: string; priority?: string; steps?: string } };
  if (typeof issue.key !== "string") throw new Error("this item has no key");
  if (typeof issue.fields?.summary !== "string") throw new Error(`${issue.key} has no summary`);
  return {
    source: "tracker",
    externalId: issue.key,
    kind: IntakeKind.Defect,
    severity: issue.fields.priority === "High" ? Severity.High : Severity.Low,
    title: issue.fields.summary,
    reproduction: issue.fields.steps ?? "",
    evidenceRefs: [`tracker/${issue.key}`],
  };
};

// A real server, on a real port, for the duration of this file.
const server = Bun.serve({
  port: 0,
  fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/issues") return Response.json(PAYLOAD);
    if (url.pathname === "/empty") return Response.json({ issues: [] });
    if (url.pathname === "/notalist") return Response.json({ issues: { one: 1 } });
    if (url.pathname === "/garbage") return new Response("<html>not json</html>", { headers: { "content-type": "application/json" } });
    if (url.pathname === "/denied") return new Response("nope", { status: 401 });
    return new Response("not found", { status: 404 });
  },
});
const base = `http://127.0.0.1:${String(server.port)}`;
afterAll(() => server.stop(true));

const source = (path: string, over: Partial<Parameters<typeof httpIntake>[0]> = {}) =>
  httpIntake({
    url: `${base}${path}`,
    itemsAt: (body) => (body as { issues?: unknown }).issues,
    mapper,
    ...over,
  });

describe("against a real server", () => {
  test("IT ACTUALLY REACHES — tickets arrive over a socket and map to events", async () => {
    const r = await source("/issues").poll();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.map((e) => e.externalId)).toEqual(["OPS-1", "OPS-2"]);
    expect(r.value[0]?.title).toBe("checkout double-charges");
    expect(r.value[0]?.severity).toBe(Severity.High);
    expect(r.value[1]?.severity).toBe(Severity.Low);
    expect(r.evidence[0]?.ref).toContain("#2");
  });

  test("it says it is real, and names where it fetches from", () => {
    const port = source("/issues");
    expect(port.meta.fidelity).toBe(Fidelity.Real);
    expect(port.meta.describes).toContain(base);
  });

  test("AN EMPTY TRACKER IS A NORMAL POLL, not an outage", async () => {
    const r = await source("/empty").poll();
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual([]);
  });

  test("a 401 refuses WITH THE STATUS — a 401 and a 503 need different actions", async () => {
    const r = await source("/denied").poll();
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("401");
  });

  test("a body that is not JSON refuses rather than yielding nothing", async () => {
    const r = await source("/garbage").poll();
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("could not be read");
  });

  test("a payload whose items are not a list refuses", async () => {
    const r = await source("/notalist").poll();
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("did not return a list");
  });

  test("the body IS the list when no `itemsAt` is given", async () => {
    // The other common tracker shape. Proves the extractor is a choice, not a requirement.
    const bare = Bun.serve({ port: 0, fetch: () => Response.json(PAYLOAD.issues) });
    try {
      const r = await httpIntake({ url: `http://127.0.0.1:${String(bare.port)}/`, mapper }).poll();
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toHaveLength(2);
    } finally {
      bare.stop(true);
    }
  });

  test("headers reach the server — how a real tracker gets its token", async () => {
    const seen: (string | null)[] = [];
    const guarded = Bun.serve({
      port: 0,
      fetch(request) {
        seen.push(request.headers.get("authorization"));
        return Response.json([]);
      },
    });
    try {
      await httpIntake({
        url: `http://127.0.0.1:${String(guarded.port)}/`,
        mapper,
        headers: { authorization: "Bearer test-token" },
      }).poll();
      expect(seen).toEqual(["Bearer test-token"]);
    } finally {
      guarded.stop(true);
    }
  });
});

describe("A BAD TICKET AND NO TICKET MUST NOT LOOK ALIKE", () => {
  const serving = (body: unknown): typeof fetch =>
    (async () =>
      new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } })) as unknown as typeof fetch;

  test("ONE unmappable item refuses the whole poll, and names which one", async () => {
    // Skipping it is the tempting shortcut and the expensive one: the ticket is never worked and
    // nothing anywhere records that it arrived.
    const r = await httpIntake({
      url: "http://tracker.invalid/issues",
      itemsAt: (b) => (b as { issues: unknown }).issues,
      mapper,
      fetchImpl: serving({ issues: [PAYLOAD.issues[0], { key: "OPS-3" }] }),
    }).poll();
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toContain("item 1");
      expect(r.reason).toContain("OPS-3 has no summary");
    }
  });

  test("the FIRST bad item is the one reported, with its index", async () => {
    const r = await httpIntake({
      url: "http://tracker.invalid/issues",
      itemsAt: (b) => (b as { issues: unknown }).issues,
      mapper,
      fetchImpl: serving({ issues: [{ nokey: true }, { alsonokey: true }] }),
    }).poll();
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("item 0");
  });

  test("an unreachable tracker refuses; it does not poll empty", async () => {
    // The most dangerous confusion available to this port: "the tracker is down" reported as
    // "nothing came in" would stop the organization working and look like a quiet day.
    const r = await httpIntake({
      url: "http://tracker.invalid/issues",
      mapper,
      fetchImpl: (async () => {
        throw new Error("getaddrinfo ENOTFOUND tracker.invalid");
      }) as unknown as typeof fetch,
    }).poll();
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("ENOTFOUND");
  });
});
