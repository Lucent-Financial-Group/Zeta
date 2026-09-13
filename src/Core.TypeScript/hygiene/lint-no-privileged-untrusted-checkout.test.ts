import { describe, expect, it } from "bun:test";
import { parse } from "yaml";
import {
  PRIVILEGED_TRIGGERS,
  checkoutRefs,
  findPrivilegedUntrustedCheckout,
  gatePinsBaseRef,
  isUntrusted,
  triggersOf,
} from "./lint-no-privileged-untrusted-checkout.ts";

const wf = (yaml: string): unknown => parse(yaml);

describe("triggersOf", () => {
  it("reads a mapping `on:` block", () => {
    expect(triggersOf(wf("on:\n  pull_request:\n    types: [opened]\n"))).toEqual(["pull_request"]);
  });

  // YAML 1.1 parses a bare `on` key as the BOOLEAN true. A checker that only looks up the
  // string "on" sees no triggers at all and passes every workflow — vacuous by parser quirk.
  it("survives YAML's bare-`on`-is-true quirk", () => {
    const doc = wf("on: [pull_request_target]\n") as Record<string, unknown>;
    expect("on" in doc || "true" in doc).toBe(true);
    expect(triggersOf(doc)).toEqual(["pull_request_target"]);
  });

  it("reads a scalar and a sequence `on:`", () => {
    expect(triggersOf(wf("on: push\n"))).toEqual(["push"]);
    expect(triggersOf(wf("on: [push, workflow_run]\n"))).toEqual(["push", "workflow_run"]);
  });
});

describe("checkoutRefs", () => {
  it("records an absent ref as <default> rather than skipping the step", () => {
    const doc = wf(`
jobs:
  a:
    steps:
      - uses: actions/checkout@v4
`);
    expect(checkoutRefs(doc)).toEqual(["<default>"]);
  });

  it("finds refs nested at any depth and ignores non-checkout steps", () => {
    const doc = wf(`
jobs:
  a:
    steps:
      - uses: oven-sh/setup-bun@v2
        with: { ref: "not-a-checkout" }
      - uses: actions/checkout@v4
        with: { ref: "\${{ github.event.pull_request.base.sha }}" }
`);
    expect(checkoutRefs(doc)).toEqual(["${{ github.event.pull_request.base.sha }}"]);
  });
});

describe("isUntrusted — the default ref's trust depends on the EVENT", () => {
  it("treats the default ref as untrusted under pull_request*", () => {
    expect(isUntrusted("<default>", ["pull_request_target"])).toBe(true);
    expect(isUntrusted("<default>", ["pull_request"])).toBe(true);
  });

  // The checker's first version got this wrong and fired on `rerun-cancelled-gate.yml`,
  // whose bare checkout IS its documented guard: under workflow_run the default ref is the
  // default branch. Pinning the correct behaviour so the false positive cannot return.
  it("treats the default ref as TRUSTED under workflow_run", () => {
    expect(isUntrusted("<default>", ["workflow_run"])).toBe(false);
  });

  it("flags an explicit author-controlled ref under any event", () => {
    for (const r of [
      "${{ github.event.pull_request.head.sha }}",
      "${{ github.head_ref }}",
      "refs/pull/12/merge",
      "${{ github.event.workflow_run.head_branch }}",
    ]) expect(isUntrusted(r, ["push"])).toBe(true);
  });

  it("does not flag a base-side ref", () => {
    expect(isUntrusted("${{ github.event.pull_request.base.sha }}", ["pull_request_target"])).toBe(false);
  });
});

describe("findPrivilegedUntrustedCheckout — the critical pair", () => {
  const headCheckout = `
jobs:
  a:
    steps:
      - uses: actions/checkout@v4
        with: { ref: "\${{ github.event.pull_request.head.sha }}" }
`;

  it("REFUSES a privileged trigger that checks out author-controlled code", () => {
    for (const t of PRIVILEGED_TRIGGERS) {
      const f = findPrivilegedUntrustedCheckout("bad.yml", wf(`on: [${t}]\n${headCheckout}`));
      expect(f).not.toBeNull();
      expect(f?.detail).toContain(t);
    }
  });

  // The safe single halves must keep working, or the checker forces a worse design.
  it("PERMITS a head checkout under the non-privileged pull_request", () => {
    expect(findPrivilegedUntrustedCheckout("ok.yml", wf(`on: [pull_request]\n${headCheckout}`))).toBeNull();
  });

  it("PERMITS a privileged trigger that checks out a base-side ref", () => {
    const doc = wf(`
on: [pull_request_target]
jobs:
  a:
    steps:
      - uses: actions/checkout@v4
        with: { ref: "\${{ github.event.pull_request.base.sha }}" }
`);
    expect(findPrivilegedUntrustedCheckout("ok.yml", doc)).toBeNull();
  });

  it("PERMITS a privileged trigger with a bare checkout (default branch)", () => {
    const doc = wf("on: [workflow_run]\njobs:\n  a:\n    steps:\n      - uses: actions/checkout@v4\n");
    expect(findPrivilegedUntrustedCheckout("ok.yml", doc)).toBeNull();
  });
});

describe("gatePinsBaseRef — alert #798's own premise", () => {
  it("holds when a base-side ref is pinned", () => {
    const doc = wf(`
jobs:
  a:
    steps:
      - uses: actions/checkout@v4
        with: { ref: "\${{ github.event.pull_request.base.sha }}" }
`);
    expect(gatePinsBaseRef(doc)).toBe(true);
  });

  it("FAILS when the pin is replaced by a head checkout — the regression #798 guards", () => {
    const doc = wf(`
jobs:
  a:
    steps:
      - uses: actions/checkout@v4
        with: { ref: "\${{ github.event.pull_request.head.sha }}" }
`);
    expect(gatePinsBaseRef(doc)).toBe(false);
  });

  // A file with no checkout cannot CONFIRM the premise. Returning true there would be a
  // check that passes by finding nothing — the exact shape this whole file exists to refuse.
  it("does NOT pass a workflow with no checkout at all", () => {
    expect(gatePinsBaseRef(wf("jobs:\n  a:\n    steps:\n      - run: echo hi\n"))).toBe(false);
  });
});
