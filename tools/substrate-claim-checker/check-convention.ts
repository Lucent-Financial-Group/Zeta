#!/usr/bin/env bun
/**
 * substrate-claim-checker / check-convention.ts (v0.9.0)
 *
 * Convention-drift sub-class checker. Smallest v0.9 slice: ADR
 * supersession claims must be reciprocal. When a current ADR says it
 * supersedes an earlier ADR, the earlier ADR must carry a top-of-file
 * "Superseded by" marker that names the superseding ADR.
 */

import { readFileSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, basename } from "node:path";

interface Finding {
  file: string;
  line: number;
  target: string;
  reason: string;
}

interface SupersessionClaim {
  line: number;
  target: string;
  raw: string;
}

interface SearchLine {
  line: number;
  text: string;
}

interface CheckResult {
  findings: Finding[];
  ok: boolean;
}

function statExists(p: string): boolean {
  try {
    statSync(p);
    return true;
  } catch {
    return false;
  }
}

function findRepoRoot(startPath: string): string {
  let cur = isAbsolute(startPath) ? startPath : resolve(startPath);
  try {
    if (statSync(cur).isFile()) cur = dirname(cur);
  } catch {
    cur = dirname(cur);
  }
  while (cur !== "/" && cur !== "") {
    const gitPath = join(cur, ".git");
    if (statExists(gitPath)) return cur;
    const parent = dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return process.cwd();
}

function normalizeTarget(target: string): string {
  let result = stripMarkdownLinkTitle(target);
  if (result.startsWith("<") && result.endsWith(">")) {
    result = result.slice(1, -1);
  }
  const queryAt = result.indexOf("?");
  const anchorAt = result.indexOf("#");
  const cutPoints = [queryAt, anchorAt].filter((n) => n >= 0);
  if (cutPoints.length > 0) {
    result = result.slice(0, Math.min(...cutPoints));
  }
  return result;
}

function stripMarkdownLinkTitle(target: string): string {
  const result = target.trim();
  if (result.startsWith("<")) {
    const closeAt = result.indexOf(">");
    if (closeAt >= 0) return result.slice(1, closeAt);
  }

  const titleMarkers = [' "', " '", " ("];
  const cutPoints = titleMarkers
    .map((marker) => result.indexOf(marker))
    .filter((n) => n >= 0);
  if (cutPoints.length === 0) return result;
  return result.slice(0, Math.min(...cutPoints)).trimEnd();
}

function updateFenceState(
  line: string,
  state: { char: "`" | "~" | null; len: number },
): void {
  const trimmed = line.trimStart();
  const first = trimmed.at(0);
  if (first !== "`" && first !== "~") return;

  let len = 0;
  while (trimmed.at(len) === first) len++;
  if (len < 3) return;

  const ch = first === "`" ? "`" : "~";
  const isCloser = trimmed.slice(len).trim().length === 0;
  if (state.char === null) {
    state.char = ch;
    state.len = len;
    return;
  }
  if (isCloser && ch === state.char && len >= state.len) {
    state.char = null;
    state.len = 0;
  }
}

function startsFenceDelimiter(line: string): boolean {
  const trimmed = line.trimStart();
  const first = trimmed.at(0);
  if (first !== "`" && first !== "~") return false;

  let len = 0;
  while (trimmed.at(len) === first) len++;
  return len >= 3;
}

function pushUnique(
  claims: SupersessionClaim[],
  seen: Set<string>,
  claim: SupersessionClaim,
): void {
  const key = `${String(claim.line)}\0${claim.target}`;
  if (seen.has(key)) return;
  seen.add(key);
  claims.push(claim);
}

function pushMatchesForLine(
  regex: RegExp,
  line: string,
  lineNumber: number,
  claims: SupersessionClaim[],
  seen: Set<string>,
): void {
  regex.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(line)) !== null) {
    const matchedTarget = match[1];
    if (matchedTarget === undefined) continue;
    const target = normalizeTarget(matchedTarget);
    if (target.length === 0) continue;
    pushUnique(claims, seen, {
      line: lineNumber,
      target,
      raw: match[0],
    });
  }
}

function logicalSearchLines(lines: string[]): SearchLine[] {
  const searchLines: SearchLine[] = [];
  const fence = { char: null as "`" | "~" | null, len: 0 };
  const paragraph: string[] = [];
  let paragraphLine = 0;

  const flushParagraph = (): void => {
    if (paragraph.length === 0) return;
    searchLines.push({ line: paragraphLine, text: paragraph.join(" ") });
    paragraph.length = 0;
    paragraphLine = 0;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (startsFenceDelimiter(line)) {
      flushParagraph();
      updateFenceState(line, fence);
      continue;
    }
    if (fence.char !== null) {
      updateFenceState(line, fence);
      continue;
    }

    const trimmed = line.trim();
    if (trimmed.length === 0) {
      flushParagraph();
      continue;
    }
    if (paragraph.length === 0) paragraphLine = i + 1;
    paragraph.push(trimmed);
  }

  flushParagraph();
  return searchLines;
}

function findSupersessionClaims(lines: string[]): SupersessionClaim[] {
  const claims: SupersessionClaim[] = [];
  const seen = new Set<string>();
  const backtickRe = /\bSupersedes(?:\s+ADR)?\s+`([^`\n]+?\.md)`/gi;
  const linkRe =
    /\bSupersedes(?:\s+ADR)?\s+\[[^\]\n]+?\]\(((?:[^()\n]|\([^()\n]*\))+)\)/gi;

  for (const searchLine of logicalSearchLines(lines)) {
    pushMatchesForLine(backtickRe, searchLine.text, searchLine.line, claims, seen);
    pushMatchesForLine(linkRe, searchLine.text, searchLine.line, claims, seen);
  }

  return claims;
}

function isRepoRelativeTarget(target: string): boolean {
  if (target.startsWith("http://") || target.startsWith("https://")) return false;
  if (isAbsolute(target)) return false;
  return true;
}

function isInsideRepo(absPath: string, repoRoot: string): boolean {
  const rel = relative(repoRoot, absPath);
  return rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
}

function resolveTarget(
  target: string,
  fileDir: string,
  fileParentDir: string,
  repoRoot: string,
): string | null {
  if (!isRepoRelativeTarget(target)) return null;
  const candidateRoots = [fileDir, fileParentDir, repoRoot];
  for (const root of candidateRoots) {
    const candidate = join(root, target);
    if (!isInsideRepo(candidate, repoRoot)) continue;
    if (statExists(candidate)) return candidate;
  }
  return null;
}

function supersededByMarkerLines(targetContent: string): string[] {
  return targetContent
    .split("\n")
    .slice(0, 25)
    .filter((line) => /\bsuperseded by\b/i.test(line));
}

function markerNamesSupersedingAdr(markerLines: string[], supersedingFile: string): boolean {
  const supersedingBase = basename(supersedingFile);
  const escaped = supersedingBase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\b${escaped}\\b`, "i");
  return markerLines.some((line) => re.test(line) || line.toLowerCase().includes(supersedingBase.toLowerCase()));
}

function readFile(filePath: string): { content: string; ok: true } | { ok: false } {
  try {
    return { content: readFileSync(filePath, "utf8"), ok: true };
  } catch (e: unknown) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      console.error(`error: file not found: ${filePath}`);
    } else if (err.code === "EISDIR") {
      console.error(`error: not a regular file (directory): ${filePath}`);
    } else {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`error: read failed for ${filePath}: ${msg}`);
    }
    return { ok: false };
  }
}

function checkFile(filePath: string): CheckResult {
  const input = readFile(filePath);
  if (!input.ok) return { findings: [], ok: false };

  const lines = input.content.split("\n");
  const claims = findSupersessionClaims(lines);
  const repoRoot = findRepoRoot(filePath);
  const fileDir = isAbsolute(filePath)
    ? dirname(filePath)
    : resolve(dirname(filePath));
  const fileParentDir = dirname(fileDir);
  const findings: Finding[] = [];

  for (const claim of claims) {
    const resolved = resolveTarget(claim.target, fileDir, fileParentDir, repoRoot);
    if (resolved === null) continue; // existence drift belongs to check-existence.ts

    const target = readFile(resolved);
    if (!target.ok) continue;

    const markerLines = supersededByMarkerLines(target.content);
    const targetDisplay = relative(repoRoot, resolved);
    if (markerLines.length === 0) {
      findings.push({
        file: filePath,
        line: claim.line,
        target: targetDisplay,
        reason: `ADR supersession claim "${claim.raw}" is not reciprocated by a top-of-file "Superseded by" marker in ${targetDisplay}`,
      });
      continue;
    }

    if (!markerNamesSupersedingAdr(markerLines, filePath)) {
      findings.push({
        file: filePath,
        line: claim.line,
        target: targetDisplay,
        reason: `ADR supersession marker in ${targetDisplay} does not name ${basename(filePath)}`,
      });
    }
  }

  return { findings, ok: true };
}

export { checkFile, findSupersessionClaims };
export type { Finding, SupersessionClaim };

export function main(): number {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error(
      "usage: bun tools/substrate-claim-checker/check-convention.ts <file> [<file> ...]",
    );
    return 1;
  }

  let totalFindings = 0;
  let inputErrors = 0;

  for (const arg of args) {
    const { findings, ok } = checkFile(arg);
    if (!ok) {
      inputErrors++;
      continue;
    }
    for (const f of findings) {
      console.log(
        `${f.file}:${String(f.line)}: convention drift — ${f.reason}`,
      );
      totalFindings++;
    }
  }

  if (inputErrors > 0) {
    console.error(`\n${String(inputErrors)} input error(s).`);
    return 1;
  }
  if (totalFindings > 0) {
    console.log(`\n${String(totalFindings)} convention-drift finding(s).`);
    return 1;
  }
  console.log("no convention drift detected.");
  return 0;
}

if (import.meta.main) {
  process.exit(main());
}
