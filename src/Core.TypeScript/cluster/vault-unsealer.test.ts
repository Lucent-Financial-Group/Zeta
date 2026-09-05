/**
 * Falsifiers for the post-init Shamir unseal loop.
 *
 * The claims this file has to be able to REFUTE:
 *
 *   * HTTP 200 sleeps and does not fetch shares.
 *   * HTTP 503 fetches THIS tick (not KEY1=$(cat) once).
 *   * HTTP 501 / initialized=false refuses init and never unseals.
 *   * curl 000 is a miss, not a seal -- no fetch.
 *   * Threshold 1 is refused.
 *   * Duplicate shares do not count as threshold-many.
 *   * Share material in a reachable surface makes the tick fail
 *     (the scan can go red; a scan that cannot fail is vacuous).
 */
import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  HEALTH_NOT_INITIALIZED,
  HEALTH_SEALED,
  HEALTH_UNREACHABLE,
  HEALTH_UNSEALED,
  UNSEAL_THRESHOLD,
  classifyHealth,
  decideUnsealerTick,
  runUnsealerTick,
  validateShares,
  type HealthResponse,
  type ShareFetcher,
  type UnsealHttp,
  type UnsealResponse,
} from "./vault-unsealer.ts";

const SENTINEL_SHARES = [
  "SENTINELunsealSHAREoneAAAAAAAAAAAAAAAAAAAAAAAA=",
  "SENTINELunsealSHAREtwoBBBBBBBBBBBBBBBBBBBBBBBB=",
  "SENTINELunsealSHAREthreeCCCCCCCCCCCCCCCCCCCCCC=",
  "SENTINELunsealSHAREfourDDDDDDDDDDDDDDDDDDDDDDD=",
  "SENTINELunsealSHAREfiveEEEEEEEEEEEEEEEEEEEEEEE=",
] as const;

function fakeHttp(start: HealthResponse): {
  readonly http: UnsealHttp;
  readonly healthCalls: number[];
  readonly unsealKeys: string[];
  sealed: boolean;
} {
  const healthCalls: number[] = [];
  const unsealKeys: string[] = [];
  let sealed = start.sealed ?? start.status === HEALTH_SEALED;
  let initialized = start.initialized ?? start.status !== HEALTH_NOT_INITIALIZED;
  const http: UnsealHttp = {
    async health(): Promise<HealthResponse> {
      healthCalls.push(1);
      if (start.status === HEALTH_UNREACHABLE) {
        return { status: HEALTH_UNREACHABLE };
      }
      if (!initialized) {
        return { status: HEALTH_NOT_INITIALIZED, initialized: false, sealed: true };
      }
      return sealed
        ? { status: HEALTH_SEALED, initialized: true, sealed: true }
        : { status: HEALTH_UNSEALED, initialized: true, sealed: false };
    },
    async putUnseal(key: string): Promise<UnsealResponse> {
      unsealKeys.push(key);
      if (unsealKeys.length >= UNSEAL_THRESHOLD) sealed = false;
      return { status: 200, sealed };
    },
  };
  return {
    http,
    healthCalls,
    unsealKeys,
    get sealed() {
      return sealed;
    },
    set sealed(v: boolean) {
      sealed = v;
    },
  };
}

function countingFetcher(shares: readonly string[] = SENTINEL_SHARES): {
  readonly fetcher: ShareFetcher;
  readonly calls: number;
} {
  const state = { calls: 0 };
  const fetcher: ShareFetcher = {
    async fetchSharesThisTick() {
      state.calls += 1;
      return shares;
    },
  };
  return {
    fetcher,
    get calls() {
      return state.calls;
    },
  };
}

describe("classifyHealth -- the Google reject table", () => {
  test("200 unsealed", () => {
    expect(classifyHealth({ status: 200, initialized: true, sealed: false })).toBe("unsealed");
  });

  test("503 sealed", () => {
    expect(classifyHealth({ status: 503, initialized: true, sealed: true })).toBe("sealed");
  });

  test("501 not initialized", () => {
    expect(classifyHealth({ status: 501, initialized: false })).toBe("not-initialized");
  });

  test("initialized=false wins even if status looks like 503", () => {
    expect(classifyHealth({ status: 503, initialized: false, sealed: true })).toBe("not-initialized");
  });

  test("curl 000 is unreachable, not a seal -- even with a stale sealed body", () => {
    expect(classifyHealth({ status: 0, initialized: true, sealed: true })).toBe("unreachable");
  });

  test("unknown HTTP is a miss, not a seal", () => {
    expect(classifyHealth({ status: 418 })).toBe("unreachable");
  });
});

describe("decideUnsealerTick", () => {
  test("maps each class onto one decision kind", () => {
    expect(decideUnsealerTick({ status: 200, sealed: false }).kind).toBe("sleep");
    expect(decideUnsealerTick({ status: 503, sealed: true }).kind).toBe("fetch-and-unseal");
    expect(decideUnsealerTick({ status: 501, initialized: false }).kind).toBe("refuse-init");
    expect(decideUnsealerTick({ status: 0 }).kind).toBe("miss");
  });
});

describe("validateShares -- threshold-many DISTINCT, never 1", () => {
  test("accepts the first threshold distinct shares", () => {
    const v = validateShares(SENTINEL_SHARES);
    expect(v.ok).toBe(true);
    expect(v.keys.length).toBe(UNSEAL_THRESHOLD);
    expect(v.keys[0]).toBe(SENTINEL_SHARES[0]);
  });

  test("REFUSES threshold 1 -- that is the Google-sketch coercion", () => {
    const v = validateShares(SENTINEL_SHARES, 1);
    expect(v.ok).toBe(false);
    expect(v.error).toContain("threshold 1");
    expect(v.keys.length).toBe(0);
  });

  test("REFUSES threshold 0", () => {
    expect(validateShares(SENTINEL_SHARES, 0).ok).toBe(false);
  });

  test("duplicate shares do not count as distinct", () => {
    const v = validateShares([SENTINEL_SHARES[0], SENTINEL_SHARES[0], SENTINEL_SHARES[0]], 3);
    expect(v.ok).toBe(false);
    expect(v.error).toContain("distinct");
  });

  test("too few shares is a refusal, not a partial unseal", () => {
    const v = validateShares([SENTINEL_SHARES[0], SENTINEL_SHARES[1]], 3);
    expect(v.ok).toBe(false);
    expect(v.keys.length).toBe(0);
  });
});

describe("runUnsealerTick -- fetch this tick, never init", () => {
  test("200 sleeps and does not fetch", async () => {
    const { http, unsealKeys } = fakeHttp({
      status: HEALTH_UNSEALED,
      initialized: true,
      sealed: false,
    });
    const shares = countingFetcher();
    const outcome = await runUnsealerTick({ http, fetcher: shares.fetcher });
    expect(outcome.ok).toBe(true);
    expect(outcome.decision.kind).toBe("sleep");
    expect(shares.calls).toBe(0);
    expect(unsealKeys.length).toBe(0);
    expect(outcome.unsealOperations).toBe(0);
  });

  test("000 is a miss -- does not fetch, does not unseal", async () => {
    const { http, unsealKeys } = fakeHttp({ status: HEALTH_UNREACHABLE });
    const shares = countingFetcher();
    const outcome = await runUnsealerTick({ http, fetcher: shares.fetcher });
    expect(outcome.ok).toBe(true);
    expect(outcome.decision.kind).toBe("miss");
    expect(shares.calls).toBe(0);
    expect(unsealKeys.length).toBe(0);
  });

  test("501 refuses init and never fetches shares", async () => {
    const { http, unsealKeys } = fakeHttp({
      status: HEALTH_NOT_INITIALIZED,
      initialized: false,
    });
    const shares = countingFetcher();
    const outcome = await runUnsealerTick({ http, fetcher: shares.fetcher });
    expect(outcome.ok).toBe(true);
    expect(outcome.decision.kind).toBe("refuse-init");
    expect(outcome.decision.reason).toBe("not-initialized");
    expect(shares.calls).toBe(0);
    expect(unsealKeys.length).toBe(0);
  });

  test("503 fetches THIS tick and applies threshold-many distinct keys", async () => {
    const { http, unsealKeys } = fakeHttp({
      status: HEALTH_SEALED,
      initialized: true,
      sealed: true,
    });
    const shares = countingFetcher();
    const logs: string[] = [];
    const outcome = await runUnsealerTick({
      http,
      fetcher: shares.fetcher,
      log: (line) => logs.push(line),
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.decision.kind).toBe("fetch-and-unseal");
    expect(shares.calls).toBe(1);
    expect(unsealKeys.length).toBe(UNSEAL_THRESHOLD);
    expect(outcome.unsealOperations).toBe(UNSEAL_THRESHOLD);
    expect(outcome.sealedAfter).toBe(false);
    expect(unsealKeys).toEqual(SENTINEL_SHARES.slice(0, UNSEAL_THRESHOLD));
    expect(JSON.stringify(outcome)).not.toContain(SENTINEL_SHARES[0]);
    for (const line of logs) {
      expect(line).not.toContain(SENTINEL_SHARES[0]);
    }
    expect(outcome.leakScan).not.toBeNull();
    expect(outcome.leakScan?.leaked.length).toBe(0);
    expect(outcome.leakScan?.vacuous).toBe(false);
  });

  test("two sealed ticks fetch twice -- KEY1=$(cat) once is the reject", async () => {
    const { http } = fakeHttp({
      status: HEALTH_SEALED,
      initialized: true,
      sealed: true,
    });
    const shares = countingFetcher();
    await runUnsealerTick({ http, fetcher: shares.fetcher });
    // Force sealed again: a new fake that stays sealed for both ticks.
    const second = fakeHttp({ status: HEALTH_SEALED, initialized: true, sealed: true });
    await runUnsealerTick({ http: second.http, fetcher: shares.fetcher });
    expect(shares.calls).toBe(2);
  });

  test("the HTTP surface has no init -- only health and putUnseal ran", async () => {
    const methods: string[] = [];
    const http: UnsealHttp = {
      async health() {
        methods.push("health");
        return { status: HEALTH_SEALED, initialized: true, sealed: true };
      },
      async putUnseal(_key: string) {
        methods.push("putUnseal");
        return {
          status: 200,
          sealed: methods.filter((m) => m === "putUnseal").length >= UNSEAL_THRESHOLD ? false : true,
        };
      },
    };
    await runUnsealerTick({ http, fetcher: countingFetcher().fetcher });
    expect(methods[0]).toBe("health");
    expect(methods.filter((m) => m === "putUnseal").length).toBe(UNSEAL_THRESHOLD);
    expect(methods.some((m) => m.toLowerCase().includes("init"))).toBe(false);
  });

  test("leak scan FIRES when a share is planted in a file -- the check can go red", async () => {
    const dir = mkdtempSync(join(tmpdir(), "zeta-unsealer-leak-"));
    try {
      const planted = join(dir, "leaked.log");
      writeFileSync(planted, SENTINEL_SHARES[0], "utf8");
      const { http } = fakeHttp({
        status: HEALTH_SEALED,
        initialized: true,
        sealed: true,
      });
      const outcome = await runUnsealerTick({
        http,
        fetcher: countingFetcher().fetcher,
        fileRoots: [planted],
      });
      expect(outcome.ok).toBe(false);
      if (outcome.ok) return;
      expect(outcome.error).toContain("leaked");
      expect(outcome.leakScan?.leaked).toContain(planted);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("too few shares this tick does not PUT any key", async () => {
    const { http, unsealKeys } = fakeHttp({
      status: HEALTH_SEALED,
      initialized: true,
      sealed: true,
    });
    const outcome = await runUnsealerTick({
      http,
      fetcher: countingFetcher([SENTINEL_SHARES[0]]).fetcher,
    });
    expect(outcome.ok).toBe(false);
    expect(unsealKeys.length).toBe(0);
    expect(outcome.unsealOperations).toBe(0);
  });
});
