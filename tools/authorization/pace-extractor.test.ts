import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { extractPaceInstructions } from "./pace-extractor.ts";

function makeTempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "pace-ext-"));
  mkdirSync(join(root, "memory"), { recursive: true });
  mkdirSync(join(root, "docs"), { recursive: true });
  return root;
}

describe("extractPaceInstructions", () => {
  test("single pace instruction from memory file → extracted with source attribution", async () => {
    const root = makeTempRoot();
    writeFileSync(
      join(root, "memory", "feedback_go_hard_aaron_2026_05_02.md"),
      [
        "---",
        "name: Go hard authorization",
        "description: Aaron authorized go-hard overnight",
        "type: feedback",
        "---",
        "",
        "Aaron 2026-05-02 ~00:42Z:",
        "",
        '> *"you can go hard, you don\'t have to do minimum action"*',
      ].join("\n"),
    );

    const result = await extractPaceInstructions(root);
    expect(result.length).toBe(1);
    expect(result[0]!.source).toBe("aaron");
    expect(result[0]!.file).toContain("feedback_go_hard_aaron_2026_05_02.md");
    expect(result[0]!.raw).toContain("go hard");
    expect(result[0]!.timestamp).toBe("2026-05-02");
  });

  test("two instructions from maintainer → both returned in chronological order", async () => {
    const root = makeTempRoot();
    writeFileSync(
      join(root, "memory", "feedback_go_hard_aaron_2026_05_01.md"),
      [
        "---",
        "name: Go hard first",
        "description: First go-hard",
        "type: feedback",
        "---",
        "",
        "Aaron 2026-05-01:",
        "",
        '> *"go hard on the backlog"*',
      ].join("\n"),
    );
    writeFileSync(
      join(root, "memory", "feedback_rest_now_aaron_2026_05_02.md"),
      [
        "---",
        "name: Rest now",
        "description: Rest instruction",
        "type: feedback",
        "---",
        "",
        "Aaron 2026-05-02:",
        "",
        '> *"rest now, hold the line"*',
      ].join("\n"),
    );

    const result = await extractPaceInstructions(root);
    expect(result.length).toBe(2);
    expect(result[0]!.timestamp!.localeCompare(result[1]!.timestamp!)).toBeLessThanOrEqual(0);
  });

  test("peer-AI framing → extracted with peer-AI source tag", async () => {
    const root = makeTempRoot();
    writeFileSync(
      join(root, "memory", "feedback_cooling_period_claudeai_2026_05_02.md"),
      [
        "---",
        "name: Cooling period advisory",
        "description: Claude.ai suggested cooling period",
        "type: feedback",
        "---",
        "",
        "Claude.ai 2026-05-02:",
        "",
        '> *"cooling period applies after the intense session"*',
      ].join("\n"),
    );
    writeFileSync(
      join(root, "memory", "feedback_codex_pace_note_codex_2026_05_03.md"),
      [
        "---",
        "name: Codex pace framing",
        "description: Codex suggested holding",
        "type: feedback",
        "---",
        "",
        "Codex 2026-05-03:",
        "",
        '> *"recommend holding until maintainer returns"*',
      ].join("\n"),
    );

    const result = await extractPaceInstructions(root);
    const sources = result.map((r) => r.source);
    expect(sources).toContain("claude.ai");
    expect(sources).toContain("codex");
  });

  test("no pace instruction in substrate → empty array", async () => {
    const root = makeTempRoot();
    writeFileSync(
      join(root, "memory", "feedback_some_unrelated_topic_2026_05_01.md"),
      [
        "---",
        "name: Unrelated topic",
        "description: Nothing about pace",
        "type: feedback",
        "---",
        "",
        "This file discusses the build gate configuration.",
        "No pace instructions here.",
      ].join("\n"),
    );

    const result = await extractPaceInstructions(root);
    expect(result.length).toBe(0);
  });

  test("instruction with rescind language → extracted with raw text preserved", async () => {
    const root = makeTempRoot();
    writeFileSync(
      join(root, "memory", "feedback_stop_grinding_aaron_2026_05_03.md"),
      [
        "---",
        "name: Stop grinding",
        "description: Aaron rescinded go-hard",
        "type: feedback",
        "---",
        "",
        "Aaron 2026-05-03:",
        "",
        '> *"stop grinding, take it easy for now"*',
      ].join("\n"),
    );

    const result = await extractPaceInstructions(root);
    expect(result.length).toBe(1);
    expect(result[0]!.raw).toContain("stop grinding");
    expect(result[0]!.source).toBe("aaron");
  });

  test("CLAUDE.md pace bullet → extracted", async () => {
    const root = makeTempRoot();
    writeFileSync(
      join(root, "CLAUDE.md"),
      [
        "# CLAUDE.md",
        "",
        "Some preamble text.",
        "",
        '- **No-op cadence is the failure mode** — Aaron 2026-05-02: *"you can go hard"*',
        "",
        "Other content.",
      ].join("\n"),
    );

    const result = await extractPaceInstructions(root);
    expect(result.length).toBeGreaterThanOrEqual(1);
    const fromClaude = result.find((r) => r.file.endsWith("CLAUDE.md"));
    expect(fromClaude).toBeDefined();
    expect(fromClaude!.raw).toContain("go hard");
  });

  test("CURRENT-aaron.md → extracted", async () => {
    const root = makeTempRoot();
    writeFileSync(
      join(root, "memory", "CURRENT-aaron.md"),
      [
        "# CURRENT-aaron.md",
        "",
        "## Pace",
        "",
        'Aaron 2026-05-07: *"keep grinding through backlog"*',
      ].join("\n"),
    );

    const result = await extractPaceInstructions(root);
    expect(result.length).toBe(1);
    expect(result[0]!.source).toBe("aaron");
    expect(result[0]!.raw).toContain("keep grinding");
    expect(result[0]!.file).toContain("CURRENT-aaron.md");
  });

  test("docs/active-trajectory.md → extracted", async () => {
    const root = makeTempRoot();
    writeFileSync(
      join(root, "docs", "active-trajectory.md"),
      [
        "# Active trajectory",
        "",
        'Aaron 2026-05-06: *"go hard on B-0160 decomposition"*',
      ].join("\n"),
    );

    const result = await extractPaceInstructions(root);
    expect(result.length).toBe(1);
    expect(result[0]!.file).toContain("active-trajectory.md");
  });

  test("mixed sources across surfaces → all extracted", async () => {
    const root = makeTempRoot();
    writeFileSync(
      join(root, "memory", "feedback_go_hard_aaron_2026_05_02.md"),
      [
        "---",
        "name: Go hard",
        "description: Maintainer go-hard",
        "type: feedback",
        "---",
        "",
        'Aaron 2026-05-02: *"go hard overnight"*',
      ].join("\n"),
    );
    writeFileSync(
      join(root, "memory", "feedback_cooling_claudeai_2026_05_02.md"),
      [
        "---",
        "name: Cooling",
        "description: Claude.ai cooling period",
        "type: feedback",
        "---",
        "",
        'Claude.ai 2026-05-02: *"cooling period applies"*',
      ].join("\n"),
    );
    writeFileSync(
      join(root, "memory", "CURRENT-aaron.md"),
      [
        "# CURRENT-aaron.md",
        "",
        'Aaron 2026-05-04: *"keep working on the backlog"*',
      ].join("\n"),
    );

    const result = await extractPaceInstructions(root);
    expect(result.length).toBe(3);
    const sources = result.map((r) => r.source);
    expect(sources).toContain("aaron");
    expect(sources).toContain("claude.ai");
  });

  test("Amara framing → extracted with source amara", async () => {
    const root = makeTempRoot();
    writeFileSync(
      join(root, "memory", "feedback_amara_hold_amara_2026_05_01.md"),
      [
        "---",
        "name: Amara hold",
        "description: Amara suggested holding",
        "type: feedback",
        "---",
        "",
        'Amara 2026-05-01: *"hold until maintainer confirms"*',
      ].join("\n"),
    );

    const result = await extractPaceInstructions(root);
    expect(result.length).toBe(1);
    expect(result[0]!.source).toBe("amara");
  });

  test("missing surfaces gracefully handled", async () => {
    const root = makeTempRoot();
    const result = await extractPaceInstructions(root);
    expect(result).toEqual([]);
  });
});
