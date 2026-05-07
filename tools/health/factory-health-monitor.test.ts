import { describe, expect, test } from "bun:test";
import {
  buildHealthReport,
  runHealthCheck,
  type HealthSignal,
} from "./factory-health-monitor";

const HEALTH_CHECK_TIMEOUT_MS = 20_000;
let cachedReport: ReturnType<typeof runHealthCheck> | undefined;

function getReport(): ReturnType<typeof runHealthCheck> {
  cachedReport ??= runHealthCheck();
  return cachedReport;
}

describe("factory-health-monitor", () => {
  test("buildHealthReport summarizes deterministic signals", () => {
    const signals: HealthSignal[] = [
      { surface: "pr-queue", level: "ok", message: "ready" },
      {
        surface: "claims",
        level: "warning",
        message: "claim drift",
        action: "audit claims",
      },
      {
        surface: "cadence",
        level: "critical",
        message: "idle",
        action: "wake runner",
      },
    ];

    const report = buildHealthReport(
      signals,
      "2026-05-07T15:10:00.000Z",
    );

    expect(report.summary).toEqual({ ok: 1, warning: 1, critical: 1 });
    expect(report.recommendedAction).toBe("wake runner");
    expect(report.timestamp).toBe("2026-05-07T15:10:00.000Z");
  });

  test("runHealthCheck returns a valid HealthReport shape", () => {
    const report = getReport();

    expect(report).toHaveProperty("timestamp");
    expect(report).toHaveProperty("signals");
    expect(report).toHaveProperty("summary");
    expect(Array.isArray(report.signals)).toBe(true);
    expect(typeof report.summary.ok).toBe("number");
    expect(typeof report.summary.warning).toBe("number");
    expect(typeof report.summary.critical).toBe("number");
  }, HEALTH_CHECK_TIMEOUT_MS);

  test("summary counts match signal levels", () => {
    const report = getReport();

    const okCount = report.signals.filter((s) => s.level === "ok").length;
    const warnCount = report.signals.filter(
      (s) => s.level === "warning",
    ).length;
    const critCount = report.signals.filter(
      (s) => s.level === "critical",
    ).length;

    expect(report.summary.ok).toBe(okCount);
    expect(report.summary.warning).toBe(warnCount);
    expect(report.summary.critical).toBe(critCount);
  }, HEALTH_CHECK_TIMEOUT_MS);

  test("all signals have required fields", () => {
    const report = getReport();

    for (const signal of report.signals) {
      expect(typeof signal.surface).toBe("string");
      expect(["ok", "warning", "critical"]).toContain(signal.level);
      expect(typeof signal.message).toBe("string");
      expect(signal.message.length).toBeGreaterThan(0);
    }
  }, HEALTH_CHECK_TIMEOUT_MS);

  test("timestamp is valid ISO 8601", () => {
    const report = getReport();
    const parsed = new Date(report.timestamp);
    expect(parsed.getTime()).not.toBeNaN();
  }, HEALTH_CHECK_TIMEOUT_MS);

  test("at least one signal covers each expected surface", () => {
    const report = getReport();
    const surfaces = new Set(report.signals.map((s) => s.surface));

    expect(surfaces.has("pr-queue") || surfaces.has("backlog")).toBe(true);
    expect(surfaces.has("cadence")).toBe(true);
  }, HEALTH_CHECK_TIMEOUT_MS);
});
