import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

async function main() {
  const researchDir = 'docs/research';
  const memoryFile = 'MEMORY.md';
  
  try {
    const files = await readdir(researchDir);
    const memoryContent = await readFile(memoryFile, 'utf-8').catch(() => '');
    
    let unreferenced = 0;
    let referenced = 0;
    
    console.log(`Auditing ${researchDir} against ${memoryFile}...`);
    for (const file of files) {
      if (!file.endsWith('.md')) continue;
      if (memoryContent.includes(file)) {
        referenced++;
      } else {
        unreferenced++;
        console.log(`- Unreferenced: ${file}`);
      }
    }
    
    console.log(`\nAudit complete: ${referenced} referenced, ${unreferenced} unreferenced.`);
  } catch (error) {
    console.error('Failed to audit research docs:', error);
    process.exit(1);
  }
}

main();