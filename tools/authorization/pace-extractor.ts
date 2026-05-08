/**
 * Mechanical authorization check — pace-instruction extractor (B-0306).
 *
 * Pure function: reads substrate surfaces, returns typed PaceInstruction[]
 * with source attribution. Does NOT determine rescind status — that is
 * the resolver's job (B-0307).
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

export interface PaceInstruction {
  source: string;
  timestamp: string | null;
  raw: string;
  file: string;
}

const PACE_PATTERNS = [
  /go\s+hard/i,
  /grind(?:ing)?\s+(?:through|the|on)/i,
  /keep\s+(?:working|grinding)/i,
  /really\s+look\s+at\s+the\s+backlog/i,
  /stop\s+grinding/i,
  /hold\s+the\s+line/i,
  /rest\s+now/i,
  /cooling\s+period/i,
  /take\s+it\s+easy/i,
  /don'?t\s+have\s+to\s+do\s+minimum/i,
  /you\s+(?:can|are)\s+(?:authorized|go)/i,
  /recommend\s+holding/i,
  /hold\s+until\s+maintainer/i,
];

const SOURCE_PATTERNS: [RegExp, string][] = [
  [/\bAaron\b/i, "aaron"],
  [/\bClaude\.ai\b/i, "claude.ai"],
  [/\bCodex\b/i, "codex"],
  [/\bAmara\b/i, "amara"],
  [/\bGemini\b/i, "gemini"],
  [/\bGrok\b/i, "grok"],
  [/\bAni\b/i, "ani"],
  [/\bRiven\b/i, "riven"],
];

const DATE_RE = /\b(20\d{2}-\d{2}-\d{2})\b/;
const FILENAME_DATE_RE = /(\d{4})_(\d{2})_(\d{2})/;

function containsPaceInstruction(text: string): boolean {
  return PACE_PATTERNS.some((p) => p.test(text));
}

function inferSource(text: string, filename: string): string {
  for (const [re, label] of SOURCE_PATTERNS) {
    if (re.test(text)) return label;
  }
  for (const [re, label] of SOURCE_PATTERNS) {
    if (re.test(filename)) return label;
  }
  return "unknown";
}

function extractTimestamp(text: string, filename: string): string | null {
  const inlineMatch = DATE_RE.exec(text);
  const inlineTimestamp = inlineMatch?.[1];
  if (inlineTimestamp !== undefined) return inlineTimestamp;

  const fnMatch = FILENAME_DATE_RE.exec(filename);
  const year = fnMatch?.[1];
  const month = fnMatch?.[2];
  const day = fnMatch?.[3];
  if (year !== undefined && month !== undefined && day !== undefined) {
    return `${year}-${month}-${day}`;
  }

  return null;
}

function extractRawQuote(text: string): string {
  const lines = text.split("\n");
  const paceLines: string[] = [];
  for (const line of lines) {
    if (PACE_PATTERNS.some((p) => p.test(line))) {
      paceLines.push(line.trim());
    }
  }
  return paceLines.join(" ").slice(0, 500);
}

function stripFrontmatter(content: string): string {
  if (!content.startsWith("---")) return content;
  const endIdx = content.indexOf("---", 3);
  if (endIdx === -1) return content;
  return content.slice(endIdx + 3);
}

function extractFromFile(
  filePath: string,
  rootPath: string,
): PaceInstruction[] {
  if (!existsSync(filePath)) return [];

  const content = readFileSync(filePath, "utf-8");
  const body = stripFrontmatter(content);

  if (!containsPaceInstruction(body)) return [];

  const relPath = relative(rootPath, filePath);
  const source = inferSource(body, relPath);
  const timestamp = extractTimestamp(body, relPath);
  const raw = extractRawQuote(body);

  return [{ source, timestamp, raw, file: relPath }];
}

export async function extractPaceInstructions(
  rootPath: string,
): Promise<PaceInstruction[]> {
  const results: PaceInstruction[] = [];

  // Surface 1: CLAUDE.md
  results.push(...extractFromFile(join(rootPath, "CLAUDE.md"), rootPath));

  // Surface 2: memory/feedback_*.md files
  const memoryDir = join(rootPath, "memory");
  if (existsSync(memoryDir)) {
    const files = readdirSync(memoryDir).filter(
      (f) => f.startsWith("feedback_") && f.endsWith(".md"),
    );
    for (const f of files) {
      results.push(...extractFromFile(join(memoryDir, f), rootPath));
    }
  }

  // Surface 3: memory/CURRENT-aaron.md
  results.push(
    ...extractFromFile(join(rootPath, "memory", "CURRENT-aaron.md"), rootPath),
  );

  // Surface 4: docs/active-trajectory.md
  results.push(
    ...extractFromFile(
      join(rootPath, "docs", "active-trajectory.md"),
      rootPath,
    ),
  );

  // Sort chronologically (nulls last)
  results.sort((a, b) => {
    if (a.timestamp === b.timestamp) return 0;
    if (a.timestamp === null) return 1;
    if (b.timestamp === null) return -1;
    return a.timestamp.localeCompare(b.timestamp);
  });

  return results;
}
