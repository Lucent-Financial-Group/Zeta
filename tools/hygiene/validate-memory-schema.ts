#!/usr/bin/env bun
// validate-memory-schema.ts — B-0335
// Enforces the memory-file format standard (B-0330) mechanically.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const home = process.env.HOME ?? homedir();
const DEFAULT_MEMORY_DIR = join(
    home,
    ".claude/projects/-Users-acehack-Documents-src-repos-Zeta/memory",
);

const VALID_TYPES = ["feedback", "user", "project", "reference"] as const;
type MemoryType = (typeof VALID_TYPES)[number];

const PREFIX_TO_TYPE: Record<string, MemoryType> = {
    feedback_: "feedback",
    user_: "user",
    project_: "project",
    reference_: "reference",
};

const SPECIAL_FILES = new Set([
    "MEMORY.md",
    "README.md",
    "MEMORY-AUTHOR-TEMPLATE.md",
]);

interface Violation {
    file: string;
    check: string;
    severity: "error" | "warning";
    message: string;
    fixable: boolean;
}

interface ValidateResult {
    totalFiles: number;
    checkedFiles: number;
    violations: Violation[];
    errorCount: number;
    warningCount: number;
    coverageGap: { inMemoryNotIndex: string[]; inIndexNotMemory: string[] };
}

function parseFrontmatter(content: string): { fields: Record<string, string>; bodyStart: number } | null {
    if (!content.startsWith("---")) return null;
    const endIdx = content.indexOf("\n---", 3);
    if (endIdx === -1) return null;

    const yaml = content.slice(4, endIdx);
    const fields: Record<string, string> = {};
    for (const line of yaml.split("\n")) {
        const match = line.match(/^(\w[\w-]*):\s*(.*)/);
        if (match) {
            fields[match[1]!] = match[2]!.replace(/^["']|["']$/g, "").trim();
        }
    }
    return { fields, bodyStart: endIdx + 4 };
}

function extractPrefix(filename: string): string | null {
    for (const prefix of Object.keys(PREFIX_TO_TYPE)) {
        if (filename.startsWith(prefix)) return prefix;
    }
    return null;
}

function isSpecialFile(filename: string): boolean {
    if (SPECIAL_FILES.has(filename)) return true;
    if (filename.startsWith("CURRENT-")) return true;
    if (filename.startsWith("INDEX-")) return true;
    return false;
}

function parseMemoryIndex(memoryDir: string): Set<string> {
    const indexPath = join(memoryDir, "MEMORY.md");
    if (!existsSync(indexPath)) return new Set();
    const content = readFileSync(indexPath, "utf8");
    const linked = new Set<string>();
    const linkPattern = /\]\(([^)]+\.md)\)/g;
    let match: RegExpExecArray | null;
    while ((match = linkPattern.exec(content)) !== null) {
        linked.add(match[1]!);
    }
    return linked;
}

function validate(memoryDir: string): ValidateResult {
    const allEntries = readdirSync(memoryDir).filter((f) => f.endsWith(".md"));
    const regularFiles = allEntries.filter((f) => !isSpecialFile(f));
    const violations: Violation[] = [];

    for (const file of regularFiles) {
        const content = readFileSync(join(memoryDir, file), "utf8");
        const prefix = extractPrefix(file);

        if (!prefix) {
            violations.push({
                file,
                check: "filename-prefix",
                severity: "error",
                message: `Filename does not start with a valid type prefix (${VALID_TYPES.join("/")}_)`,
                fixable: false,
            });
        }

        if (file.includes(" ")) {
            violations.push({
                file,
                check: "filename-spaces",
                severity: "error",
                message: "Filename contains spaces (use underscores)",
                fixable: false,
            });
        }

        const fm = parseFrontmatter(content);
        if (!fm) {
            violations.push({
                file,
                check: "frontmatter-missing",
                severity: "error",
                message: "No YAML frontmatter block found",
                fixable: false,
            });
            continue;
        }

        if (!fm.fields["name"]) {
            violations.push({
                file,
                check: "frontmatter-name",
                severity: "error",
                message: "Missing required field: name",
                fixable: false,
            });
        }

        if (!fm.fields["description"]) {
            violations.push({
                file,
                check: "frontmatter-description",
                severity: "error",
                message: "Missing required field: description",
                fixable: false,
            });
        }

        if (!fm.fields["type"]) {
            violations.push({
                file,
                check: "frontmatter-type",
                severity: "error",
                message: "Missing required field: type",
                fixable: true,
            });
        } else if (!VALID_TYPES.includes(fm.fields["type"] as MemoryType)) {
            violations.push({
                file,
                check: "frontmatter-type-invalid",
                severity: "error",
                message: `Invalid type: "${fm.fields["type"]}" (must be ${VALID_TYPES.join("|")})`,
                fixable: false,
            });
        }

        if (prefix && fm.fields["type"]) {
            const expectedType = PREFIX_TO_TYPE[prefix];
            if (expectedType && fm.fields["type"] !== expectedType) {
                violations.push({
                    file,
                    check: "prefix-type-mismatch",
                    severity: "error",
                    message: `Filename prefix "${prefix}" implies type "${expectedType}" but frontmatter says "${fm.fields["type"]}"`,
                    fixable: true,
                });
            }
        }
    }

    const indexedFiles = parseMemoryIndex(memoryDir);
    const inMemoryNotIndex = regularFiles.filter((f) => !indexedFiles.has(f));
    const inIndexNotMemory = [...indexedFiles].filter(
        (f) => !allEntries.includes(f) && !isSpecialFile(f),
    );

    const errorCount = violations.filter((v) => v.severity === "error").length;
    const warningCount = violations.filter((v) => v.severity === "warning").length;

    return {
        totalFiles: allEntries.length,
        checkedFiles: regularFiles.length,
        violations,
        errorCount,
        warningCount,
        coverageGap: { inMemoryNotIndex, inIndexNotMemory },
    };
}

function main(argv: string[] = process.argv): void {
    let memoryDir = DEFAULT_MEMORY_DIR;
    const jsonOutput = argv.includes("--json");
    const enforce = argv.includes("--enforce");

    for (let i = 2; i < argv.length; i++) {
        if (argv[i] === "--memory-dir" && argv[i + 1]) {
            memoryDir = argv[++i]!;
        }
    }

    if (!existsSync(memoryDir)) {
        console.error(`Memory directory not found: ${memoryDir}`);
        process.exit(1);
    }

    const result = validate(memoryDir);

    if (jsonOutput) {
        console.log(JSON.stringify(result, null, 2));
    } else {
        console.log("\n=== Memory Schema Validation ===\n");
        console.log(`Total files: ${result.totalFiles}`);
        console.log(`Checked (regular memory files): ${result.checkedFiles}`);
        console.log(`Errors: ${result.errorCount}`);
        console.log(`Warnings: ${result.warningCount}`);

        if (result.violations.length > 0) {
            console.log(`\n--- Violations (first 30) ---\n`);
            for (const v of result.violations.slice(0, 30)) {
                const sev = v.severity === "error" ? "ERR" : "WRN";
                console.log(`  [${sev}] ${v.file}`);
                console.log(`        ${v.check}: ${v.message}`);
            }
            if (result.violations.length > 30) {
                console.log(`  ... and ${result.violations.length - 30} more`);
            }
        }

        const { inMemoryNotIndex, inIndexNotMemory } = result.coverageGap;
        if (inMemoryNotIndex.length > 0 || inIndexNotMemory.length > 0) {
            console.log(`\n--- MEMORY.md coverage ---\n`);
            console.log(`  Files not in MEMORY.md index: ${inMemoryNotIndex.length}`);
            console.log(`  Index entries with no file: ${inIndexNotMemory.length}`);
            if (inIndexNotMemory.length > 0) {
                for (const f of inIndexNotMemory.slice(0, 10)) {
                    console.log(`    ORPHAN INDEX: ${f}`);
                }
            }
        }
    }

    if (enforce && result.errorCount > 0) {
        process.exit(2);
    }
}

if (import.meta.main) {
    main();
}

export { validate, parseFrontmatter, extractPrefix };
