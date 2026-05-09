import { spawnSync } from 'child_process';

export interface ArchaeologyResult {
  commits: string[];
  summary: string;
}

export function findStringIntroduction(search: string, filePath?: string): ArchaeologyResult {
  if (!search || search.trim() === '') {
    return { commits: [], summary: 'No search string provided.' };
  }
  const args = ['log', '-S', search, '--oneline'];
  if (filePath) {
    args.push('--', filePath);
  }
  const result = spawnSync('git', args, {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  if (result.error) {
    return { commits: [], summary: `Error running git log: ${result.error.message}` };
  }
  if (result.status !== 0) {
    return { commits: [], summary: `git log exited with code ${result.status}: ${(result.stderr ?? '').trim()}` };
  }
  const output = (result.stdout ?? '').trim();
  const commits = output ? output.split('\n').filter(Boolean) : [];
  return {
    commits,
    summary: commits.length > 0
      ? `Found ${commits.length} commit(s) touching "${search}".`
      : `No commits found for "${search}".`,
  };
}
