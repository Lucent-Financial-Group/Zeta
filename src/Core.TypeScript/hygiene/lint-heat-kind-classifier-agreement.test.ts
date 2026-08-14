import { describe, expect, test } from "bun:test";
import {
  kindLiterals,
  pressureDecidingBindings,
  stripFSharpComments,
  tokenPredicates,
  run,
} from "./lint-heat-kind-classifier-agreement.ts";

// A minimal Heat.fs in the POST-FIX shape: the raw substring probes are consumed by `ofKind`
// and by nothing else, and `isPressureKind` is derived from it.
const HEAT_FIXED = `
[<RequireQualifiedAccess>]
module HeatSignature =

    let private kindContains (needle: string) (kind: string) : bool =
        not (String.IsNullOrEmpty kind) && kind.Contains(needle, StringComparison.OrdinalIgnoreCase)

    let isBackpressureKind (kind: string) : bool =
        kindContains "backpressure" kind

    let isDeniedKind (kind: string) : bool =
        kindContains "denied" kind || kindContains "reject" kind

    let isForgettingKind (kind: string) : bool =
        kindContains "forgotten" kind || kindContains "forget" kind || kindContains "prune" kind

    let isStorageErrorKind (kind: string) : bool =
        kindContains "storage" kind

    let isInvalidKind (kind: string) : bool =
        kindContains "invalid" kind

    let isExpiredKind (kind: string) : bool =
        kindContains "expired" kind || kindContains "ttl" kind

    let isStaleKind (kind: string) : bool =
        kindContains "stale" kind

[<RequireQualifiedAccess>]
module HeatSignal =

    let ofKind (kind: string) : HeatSignal =
        if HeatSignature.isForgettingKind kind then
            HeatSignal.Forgotten
        elif HeatSignature.isBackpressureKind kind then
            HeatSignal.Backpressure
        elif HeatSignature.isDeniedKind kind then
            HeatSignal.Denied
        else
            HeatSignal.Other kind

    let isPressureKind (kind: string) : bool = kind |> ofKind |> isPressure
`;

// The PRE-FIX shape: a second, independent classifier beside `ofKind`.
const HEAT_TWO_CLASSIFIERS = HEAT_FIXED.replace(
  "    let isForgettingKind",
  `    let isPressureKind (kind: string) : bool =
        isBackpressureKind kind || isDeniedKind kind

    let isForgettingKind`,
);

describe("stripFSharpComments", () => {
  test("a token named only in a comment is not a reference", () => {
    const stripped = stripFSharpComments(`// mentions isBackpressureKind in prose\nlet x = 1\n`);
    expect(stripped).not.toContain("isBackpressureKind");
    expect(stripped).toContain("let x = 1");
  });
});

describe("tokenPredicates", () => {
  test("parses the token sets out of the F# rather than restating them", () => {
    const predicates = tokenPredicates(HEAT_FIXED);
    expect(predicates.get("isForgettingKind")).toEqual(["forgotten", "forget", "prune"]);
    expect(predicates.get("isBackpressureKind")).toEqual(["backpressure"]);
    expect(predicates.get("isDeniedKind")).toEqual(["denied", "reject"]);
  });

  test("a token added to the F# flows through without editing the lint", () => {
    const withNewToken = HEAT_FIXED.replace(
      `kindContains "forgotten" kind`,
      `kindContains "evicted" kind || kindContains "forgotten" kind`,
    );
    expect(tokenPredicates(withNewToken).get("isForgettingKind")).toContain("evicted");
  });
});

describe("pressureDecidingBindings", () => {
  test("post-fix: exactly one binding consumes the raw probes", () => {
    expect(pressureDecidingBindings(HEAT_FIXED)).toEqual(["ofKind"]);
  });

  test("pre-fix: the second classifier is visible", () => {
    expect(pressureDecidingBindings(HEAT_TWO_CLASSIFIERS)).toContain("isPressureKind");
  });
});

describe("kindLiterals", () => {
  test("extracts inline, multiline, literal-binding, and treaty kinds by named route", () => {
    const fs = [
      `HeatSignature.ofMass source "room-boundary.door-denied" 1 1.0 detail`,
      `            HeatSignature.ofMass`,
      `                CellSchedulerSource`,
      `                "forgotten-multiline"`,
      `    let BackpressureKind = "backpressure"`,
    ].join("\n");
    const found = kindLiterals("src/Core/Sample.fs", fs);
    expect(found.get("fsharp-emitter-inline")).toContain("room-boundary.door-denied");
    expect(found.get("fsharp-emitter-multiline")).toContain("forgotten-multiline");
    expect(found.get("fsharp-kind-literal")).toContain("backpressure");

    const treaty = kindLiterals("treaty.json", `{ "kind": "soft-emu.prune" }`);
    expect(treaty.get("treaty-kind-field")).toContain("soft-emu.prune");
  });

  test("expands the composed wset kind over its closed function set", () => {
    const wset = [
      `              WSetFunction = "consolidate"`,
      `                  Kind = "wset." + operationProfile.WSetFunction + ".forgotten"`,
    ].join("\n");
    expect(kindLiterals("src/Core/WSetHeat.fs", wset).get("wset-composed")).toEqual(["wset.consolidate.forgotten"]);
  });
});

describe("run", () => {
  /** A read function over an in-memory corpus, defaulting every unnamed source to empty. */
  const reader = (files: Record<string, string>) => (p: string) => files[p] ?? "";

  // 30 single-token kinds, enough to clear the aggregate floor, plus one hit for every route.
  const bulkKinds = Array.from({ length: 28 }, (_, i) => `{ "kind": "bulk.stale-${i}" }`).join("\n");
  const cleanCorpus = {
    "src/Core/Heat.fs": HEAT_FIXED,
    "src/Core/SoftEmu.fs": `HeatSignature.ofMass source "soft-emu.prune" 1 1.0 detail`,
    "src/Core/SchedulerShedHeat.fs": [
      `    let BackpressureKind = "backpressure"`,
      `            HeatSignature.ofMass`,
      `                CellSchedulerSource`,
      `                "forgotten"`,
    ].join("\n"),
    "src/Core/WSetHeat.fs": [
      `              WSetFunction = "consolidate"`,
      `                  Kind = "wset." + operationProfile.WSetFunction + ".forgotten"`,
    ].join("\n"),
    "src/Core.QSharp.ReferenceOracle/heat-signals-treaty.json": bulkKinds,
  };

  test("a clean corpus passes", () => {
    const { failures, kindsInspected } = run(reader(cleanCorpus));
    expect(failures).toEqual([]);
    expect(kindsInspected).toBeGreaterThanOrEqual(30);
  });

  test("PART A — a dual-token kind fails", () => {
    const { failures } = run(
      reader({
        ...cleanCorpus,
        "src/Core/SoftEmu.fs": `HeatSignature.ofMass source "soft-emu.prune-backpressure" 1 1.0 d`,
      }),
    );
    expect(failures.some((f) => f.part === "A")).toBe(true);
    expect(failures.find((f) => f.part === "A")?.message).toContain("prune-backpressure");
  });

  test("PART B — a second classifier fails", () => {
    const { failures } = run(reader({ ...cleanCorpus, "src/Core/Heat.fs": HEAT_TWO_CLASSIFIERS }));
    expect(failures.some((f) => f.part === "B")).toBe(true);
  });

  test("PART B — losing the single classifier is also a failure, not a silent pass", () => {
    const noOfKind = HEAT_FIXED.replace(/let ofKind[\s\S]*?HeatSignal\.Other kind\n/, "");
    const { failures } = run(reader({ ...cleanCorpus, "src/Core/Heat.fs": noOfKind }));
    expect(failures.some((f) => f.part === "B")).toBe(true);
  });

  test("FLOOR — an empty corpus fails instead of reporting clean", () => {
    // The whole point of the floor. Every source reads empty, so there is nothing to disagree
    // with — and a guard that calls that "OK" is the blind instrument.
    const { failures } = run(reader({ "src/Core/Heat.fs": HEAT_FIXED }));
    expect(failures.some((f) => f.part === "floor")).toBe(true);
  });

  test("FLOOR — one dark extraction route fails even when the aggregate floor is met", () => {
    // Measured regression: at an aggregate-only floor this case exited 0 (33 kinds -> 30).
    const treatyOnly = {
      "src/Core/Heat.fs": HEAT_FIXED,
      "src/Core.QSharp.ReferenceOracle/heat-signals-treaty.json": Array.from(
        { length: 40 },
        (_, i) => `{ "kind": "bulk.stale-${i}" }`,
      ).join("\n"),
    };
    const { failures, kindsInspected } = run(reader(treatyOnly));
    expect(kindsInspected).toBeGreaterThanOrEqual(30);
    expect(failures.some((f) => f.part === "floor" && f.message.includes("gone dark"))).toBe(true);
  });

  test("FLOOR — a restructured Heat.fs that defeats token parsing fails", () => {
    const { failures } = run(reader({ ...cleanCorpus, "src/Core/Heat.fs": "module HeatSignal =\n" }));
    expect(failures.some((f) => f.part === "floor")).toBe(true);
  });
});
