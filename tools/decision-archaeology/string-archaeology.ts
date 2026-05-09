import { execSync } from 'child_process';

export interface ArchaeologyResult {
  commits: string[];
  summary: string;
}

/**
 * String archaeology mode (existence / introduction slice).
 * Smallest safe implementation for B-0169 decision-archaeology.
 * Returns commits that introduced or removed the search string.
 */
export function findStringIntroduction(search: string, filePath?: string): ArchaeologyResult {
  if (!search || search.trim() === '') {
    return { commits: [], summary: 'No search string provided.' };
  }
  const fileArg = filePath ? ` -- ${filePath}` : '';
  try {
    const output = execSync(
      `git log -S "${search}" --oneline${fileArg}`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();
    const commits = output ? output.split('\n').filter(Boolean) : [];
    return {
      commits,
      summary: commits.length > 0 
        ? `Found ${commits.length} commit(s) touching "${search}".`
        : `No commits found for "${search}".`
    };
  } catch (e) {
    return { commits: [], summary: `Error running git log: ${(e as Error).message}` };
  }
}
