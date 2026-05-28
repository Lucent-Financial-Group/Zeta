import fs from 'fs';
import path from 'path';

const CLAUSE_REGEX = /(HC-[0-9]+|SD-[0-9]+|DIR-[0-9]+)/g;
const IGNORE_DIRS = ['node_modules', '.git', '.vscode', '.idea', 'dist', 'build'];
const IGNORE_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.pdf', '.zip', '.gz', '.tar', '.DS_Store'];

interface Match {
  file: string;
  line: number;
  clause: string;
  text: string;
}

function searchInFile(filePath: string): Match[] {
  const matches: Match[] = [];
  if (IGNORE_EXTS.some(ext => filePath.endsWith(ext))) {
    return matches;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let match;
      while ((match = CLAUSE_REGEX.exec(line)) !== null) {
        matches.push({
          file: filePath,
          line: i + 1,
          clause: match[0],
          text: line.trim(),
        });
      }
    }
  } catch (error) {
    // Ignore errors from reading binary files etc.
  }

  return matches;
}

function searchInDirectory(dirPath: string): Match[] {
  let allMatches: Match[] = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (IGNORE_DIRS.includes(entry.name)) {
      continue;
    }

    if (entry.isDirectory()) {
      allMatches = allMatches.concat(searchInDirectory(fullPath));
    } else if (entry.isFile()) {
      allMatches = allMatches.concat(searchInFile(fullPath));
    }
  }

  return allMatches;
}

function main() {
  const searchDir = process.cwd();
  console.log(`Searching for alignment clause references in ${searchDir}...
`);

  const allMatches = searchInDirectory(searchDir);

  const targetClause = process.argv[2];

  const filteredMatches = targetClause
    ? allMatches.filter(m => m.clause.toUpperCase() === targetClause.toUpperCase())
    : allMatches;

  if (filteredMatches.length === 0) {
    console.log('No alignment clause references found.');
    return;
  }

  const groupedByClause: { [key: string]: Match[] } = {};
  for (const match of filteredMatches) {
    if (!groupedByClause[match.clause]) {
      groupedByClause[match.clause] = [];
    }
    groupedByClause[match.clause].push(match);
  }

  for (const clause in groupedByClause) {
    console.log(`
--- Found ${groupedByClause[clause].length} references to ${clause} ---
`);
    for (const match of groupedByClause[clause]) {
      console.log(`${match.file}:${match.line} - ${match.text}`);
    }
  }
}

main();
