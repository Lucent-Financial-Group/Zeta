import { splitRoms } from './split-by-license';
import * as fs from 'fs';
import * as path from 'path';

describe('splitRoms', () => {
  const romsDir = './test-roms';
  const safeDir = './safe-roms';
  const unsafeDir = './unsafe-roms';
  const allowlistPath = './allowlist.txt';

  beforeEach(() => {
    // Create test directories
    fs.mkdirSync(romsDir, { recursive: true });
    fs.mkdirSync(safeDir, { recursive: true });
    fs.mkdirSync(unsafeDir, { recursive: true });

    // Create dummy rom files
    fs.writeFileSync(path.join(romsDir, 'safe-rom-1.bin'), '');
    fs.writeFileSync(path.join(romsDir, 'safe-rom-2.bin'), '');
    fs.writeFileSync(path.join(romsDir, 'unsafe-rom-1.bin'), '');

    // Create dummy allowlist
    fs.writeFileSync(allowlistPath, 'safe-rom-1.bin\nsafe-rom-2.bin');
  });

  afterEach(() => {
    // Clean up test directories and files
    fs.rmSync(romsDir, { recursive: true, force: true });
    fs.rmSync(safeDir, { recursive: true, force: true });
    fs.rmSync(unsafeDir, { recursive: true, force: true });
    fs.rmSync(allowlistPath, { force: true });
  });

  it('should move roms to the correct directories based on the allowlist', async () => {
    await splitRoms(romsDir, safeDir, unsafeDir, allowlistPath);

    // Check if files are in the correct directories
    expect(fs.existsSync(path.join(safeDir, 'safe-rom-1.bin'))).toBe(true);
    expect(fs.existsSync(path.join(safeDir, 'safe-rom-2.bin'))).toBe(true);
    expect(fs.existsSync(path.join(unsafeDir, 'unsafe-rom-1.bin'))).toBe(true);
  });
});
