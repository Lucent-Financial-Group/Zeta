import { mkdir, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join, basename } from 'path';

export interface ShadowOutlet {
  readonly path: string;
  readonly id: string;
  cleanup(): Promise<void>;
}

/**
 * Creates an ephemeral shadow outlet under /tmp.
 * Phase 1 implementation: OS-tmpdir with random suffix, auto-clean optional.
 * Future: replace with cryptographic private store (Phase 2).
 */
export async function createShadowOutlet(prefix = 'zeta-shadow'): Promise<ShadowOutlet> {
  const id = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const path = join(tmpdir(), id);
  await mkdir(path, { recursive: true });
  return {
    path,
    id,
    async cleanup() {
      await rm(path, { recursive: true, force: true });
    }
  };
}
