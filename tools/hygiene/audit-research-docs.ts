import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

type AuditExitCode = 0 | 2 | 64;

interface AuditResult {
  readonly researchFiles: readonly string[];
  readonly memoryFiles: readonly string[];
  readonly referenced: readonly string[];
  readonly unreferenced: readonly string[];
}

const RESEARCH_DIR = "docs/research";
const MEMORY_DIR = "memory";

function normalizePath(path: string): string {
  return path.replaceAll("\\", "/");
}

async function listMarkdownFiles(root: string): Promise<readonly string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const paths = await Promise.all(
    entries.map(async (entry): Promise<readonly string[]> => {
      const path = join(root, entry.name);
      if (entry.isDirectory()) {
        return listMarkdownFiles(path);
      }
      if (entry.isFile() && entry.name.endsWith(".md")) {
        return [normalizePath(path)];
      }
      return [];
    }),
  );
  return paths.flat().sort((a, b) => a.localeCompare(b));
}

function isReferenced(path: string, content: string): boolean {
  const normalized = normalizePath(path);
  const researchRelative = normalizePath(relative(RESEARCH_DIR, path));
  return content.includes(normalized) || content.includes(researchRelative);
}

export async function auditResearchDocs(): Promise<AuditResult> {
  const [researchFiles, memoryFiles] = await Promise.all([
    listMarkdownFiles(RESEARCH_DIR),
    listMarkdownFiles(MEMORY_DIR),
  ]);

  const memoryContents = await Promise.all(
    memoryFiles.map(async (path) => readFile(path, "utf8")),
  );
  const combinedMemoryContent = memoryContents.join("\n");

  const referenced: string[] = [];
  const unreferenced: string[] = [];
  for (const file of researchFiles) {
    if (isReferenced(file, combinedMemoryContent)) {
      referenced.push(file);
    } else {
      unreferenced.push(file);
    }
  }

  return { researchFiles, memoryFiles, referenced, unreferenced };
}

function describeIoError(err: unknown): string {
  if (err instanceof Error) {
    const code =
      "code" in err && typeof (err as { code?: unknown }).code === "string"
        ? (err as { code: string }).code
        : undefined;
    return code !== undefined ? `${code}: ${err.message}` : err.message;
  }
  return String(err);
}

export async function main(): Promise<AuditExitCode> {
  let result: AuditResult;
  try {
    result = await auditResearchDocs();
  } catch (err: unknown) {
    process.stderr.write(
      `error: failed to audit research docs (${describeIoError(err)})\n`,
    );
    return 64;
  }

  process.stderr.write(
    `research-doc audit on ${RESEARCH_DIR} against ${MEMORY_DIR}/**/*.md\n`,
  );
  process.stderr.write(`  research docs: ${String(result.researchFiles.length)}\n`);
  process.stderr.write(`  memory docs:   ${String(result.memoryFiles.length)}\n`);
  process.stderr.write(`  referenced:    ${String(result.referenced.length)}\n`);
  process.stderr.write(`  unreferenced:  ${String(result.unreferenced.length)}\n`);

  if (result.unreferenced.length === 0) {
    process.stderr.write("\nall research docs are referenced from memory substrate\n");
    return 0;
  }

  process.stderr.write("\nunreferenced research docs:\n\n");
  for (const file of result.unreferenced) {
    process.stderr.write(`  ${file}\n`);
  }
  process.stderr.write("\n");
  process.stderr.write(
    "Add a memory-substrate reference or record an explicit unindexed rationale.\n",
  );
  return 2;
}

if (import.meta.main) {
  main()
    .then((code) => process.exit(code))
    .catch((err: unknown) => {
      process.stderr.write(
        `error: unhandled research-doc audit failure (${describeIoError(err)})\n`,
      );
      process.exit(1);
    });
}
