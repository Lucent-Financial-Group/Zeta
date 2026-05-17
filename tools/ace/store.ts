import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import type { Dirent } from "node:fs";
import { join } from "node:path";

export interface AceManifest {
  readonly format_version: number;
  readonly name: string;
  readonly version: string;
  readonly content_hash: string;
  readonly description?: string;
}

export interface InstalledPackage {
  readonly hash: string;
  readonly manifest: AceManifest;
}

export function defaultStorePath(): string {
  const home = process.env.HOME ?? process.env.USERPROFILE ?? ".";
  return join(home, ".ace", "store");
}

export function listInstalled(storePath: string): InstalledPackage[] {
  if (!existsSync(storePath)) {
    return [];
  }

  try {
    if (!statSync(storePath).isDirectory()) {
      return [];
    }
  } catch {
    return [];
  }

  let entries: Dirent<string>[];
  try {
    entries = readdirSync(storePath, { withFileTypes: true });
  } catch {
    return [];
  }
  const packages: InstalledPackage[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const manifestPath = join(storePath, entry.name, "manifest.json");
    if (!existsSync(manifestPath)) continue;

    try {
      const raw = readFileSync(manifestPath, "utf8");
      const manifest = JSON.parse(raw) as AceManifest;
      if (
        typeof manifest.format_version !== "number" ||
        typeof manifest.name !== "string" ||
        typeof manifest.version !== "string" ||
        typeof manifest.content_hash !== "string"
      ) {
        continue;
      }
      packages.push({ hash: entry.name, manifest });
    } catch {
      continue;
    }
  }

  return packages.sort((a, b) => a.manifest.name.localeCompare(b.manifest.name));
}
