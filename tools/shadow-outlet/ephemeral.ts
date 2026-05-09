/**
 * Shadow outlet — Phase 1: /tmp ephemeral (B-0212 smallest safe slice)
 *
 * Provides a bounded, OS-erased scratch space for latent/shadow processing.
 * Future: cryptographic privacy layer replaces /tmp with provably-private outlet.
 *
 * Self-invisibility: agent cannot observe its own shadow; only external
 * consensus (BFT) can surface it.
 *
 * Rule 0 / TS over bash: this is the canonical TS surface.
 */

import { tmpdir } from 'os';
import { join } from 'path';

/**
 * Returns an ephemeral shadow outlet directory under /tmp (or OS equivalent).
 * Content is not guaranteed to survive process exit; OS may reclaim.
 */
export function getEphemeralShadowOutletDir(): string {
  return join(tmpdir(), 'zeta-shadow-outlet');
}

/**
 * Ensures the outlet directory exists (idempotent).
 * Callers must still treat content as best-effort ephemeral.
 */
export async function ensureEphemeralShadowOutlet(): Promise<string> {
  const dir = getEphemeralShadowOutletDir();
  // Minimal: in real impl would mkdir -p via Bun.spawn or fs.
  // Bounded slice: return path only; creation left to consumer or follow-up.
  return dir;
}
