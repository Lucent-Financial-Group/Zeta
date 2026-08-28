import { join } from "node:path";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { BUS_DIR, ensureDir, list } from "./bus";
import type { MessageEnvelope, Topic } from "./types";

/**
 * Reads envelopes from the bus matching the given topic and recipient,
 * calls the handler for each unseen envelope, and marks them as seen
 * in a surface-specific seen.json file.
 */
export async function subscribeOnce<T extends Topic>(
  topic: T,
  surface: string,
  handler: (envelope: MessageEnvelope & { topic: T }) => Promise<void> | void,
  adapters = { list }
): Promise<void> {
  ensureDir();
  const seenFile = join(BUS_DIR, `seen-${surface}.json`);
  let seenIds: Set<string>;
  
  try {
    if (existsSync(seenFile)) {
      const data = JSON.parse(readFileSync(seenFile, "utf8"));
      seenIds = new Set(Array.isArray(data) ? data : []);
    } else {
      seenIds = new Set();
    }
  } catch {
    seenIds = new Set();
  }

  // Get all envelopes matching topic and targeted at this surface (or broadcast)
  const envelopes = adapters.list(topic, surface as any);
  
  let newlySeen = false;

  for (const envelope of envelopes) {
    if (!seenIds.has(envelope.id)) {
      try {
        await handler(envelope as MessageEnvelope & { topic: T });
        seenIds.add(envelope.id);
        newlySeen = true;
      } catch (err) {
        // If handler fails, we do NOT mark as seen, so it can be retried next tick
        console.error(`[subscribeOnce] Handler for ${envelope.id} failed:`, err);
      }
    }
  }

  if (newlySeen) {
    try {
      writeFileSync(seenFile, JSON.stringify(Array.from(seenIds), null, 2));
    } catch (err) {
      console.error(`[subscribeOnce] Failed to write seen file:`, err);
    }
  }
}
