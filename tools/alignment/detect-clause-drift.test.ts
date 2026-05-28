import { findClauseReferences } from './detect-clause-drift';
import * as fs from 'fs';
import * as path from 'path';

describe('findClauseReferences', () => {
  const testDir = './test-dir';

  beforeEach(() => {
    // Create test directory
    fs.mkdirSync(testDir, { recursive: true });

    // Create dummy files
    fs.writeFileSync(path.join(testDir, 'file1.md'), 'This file references HC-1 and SD-2.');
    fs.writeFileSync(path.join(testDir, 'file2.ts'), 'This file references DIR-3.');
    fs.writeFileSync(path.join(testDir, 'file3.txt'), 'This file has no references.');
  });

  afterEach(() => {
    // Clean up test directory
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('should find all references to alignment clauses in the specified directory', async () => {
    const references = await findClauseReferences(testDir);

    expect(references.size).toBe(3);
    expect(references.get('HC-1')).toEqual([path.join(testDir, 'file1.md')]);
    expect(references.get('SD-2')).toEqual([path.join(testDir, 'file1.md')]);
    expect(references.get('DIR-3')).toEqual([path.join(testDir, 'file2.ts')]);
  });
});
