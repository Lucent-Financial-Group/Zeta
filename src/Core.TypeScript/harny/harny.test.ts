import { describe, expect, test } from "bun:test";
import { dispatch } from "./harny.ts";

describe("harny", () => {
  test("help names login, manus --from-file, and indexed search", async () => {
    const out: string[] = [];
    const io = { out: (l: string) => out.push(l), err: () => undefined };
    expect(await dispatch(["help"], io)).toBe(0);
    expect(out.some((l) => l.includes("login"))).toBe(true);
    expect(out.some((l) => l.includes("search"))).toBe(true);
    expect(out.some((l) => l.includes("manus") && l.includes("--from-file"))).toBe(true);
    expect(out.some((l) => l.includes("remote-only"))).toBe(true);
  });

  test("search with no terms is a usage error, not a silent empty corpus", async () => {
    expect(await dispatch(["search"], { out: () => undefined, err: () => undefined })).toBe(2);
  });
});
