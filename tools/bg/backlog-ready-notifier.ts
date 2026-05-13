// backlog-ready-notifier.ts — B-0441 slice 1: skeleton + no-op poll loop
//
// Background service that proactively surfaces ready-to-grind backlog rows
// (open, dependencies satisfied) to agents whose queue is empty. Composes
// with B-0440 (Standing-by detector): B-0440 catches the failure mode AFTER
// it occurs (reactive); this service PREVENTS the failure mode by surfacing
// work BEFORE the agent goes idle (proactive).
//
// This slice ships ONLY the skeleton. Future slices add backlog parsing,
// queue-state detection, and bus integration.
//
// Run: bun tools/bg/backlog-ready-notifier.ts [--once] [--poll-min N]
// Compose with: B-0441 + B-0400 (bus) + B-0440 (reactive peer).

export type NotifierConfig = {
  /** How often to poll, in minutes */
  pollIntervalMin: number;
  /** When true, run a single poll and exit */
  once: boolean;
};

export const DEFAULT_CONFIG: NotifierConfig = {
  pollIntervalMin: 10,
  once: false,
};

export type PollResult = {
  pollAt: string; // ISO-8601
  readyRowsFound: number;
  assignmentsPublished: number;
  note: string;
};

/**
 * Single poll iteration. Slice 1 returns a no-op result. Future slices
 * implement backlog scan + queue-state detection + assignment publish.
 */
export function pollOnce(_config: NotifierConfig): PollResult {
  return {
    pollAt: new Date().toISOString(),
    readyRowsFound: 0,
    assignmentsPublished: 0,
    note: "slice-1 skeleton — no scan yet; future slices add backlog-readiness + queue-state + bus publish",
  };
}

/**
 * Run the notifier loop. When `once: true`, runs exactly one iteration and
 * returns its result. Otherwise sleeps for pollIntervalMin between
 * iterations and runs forever; results are NOT accumulated.
 */
export async function runNotifier(config: NotifierConfig = DEFAULT_CONFIG): Promise<PollResult[]> {
  if (config.once) {
    const result = pollOnce(config);
    console.log(JSON.stringify(result));
    return [result];
  }

  while (true) {
    const result = pollOnce(config);
    console.log(JSON.stringify(result));
    await new Promise(resolve => setTimeout(resolve, config.pollIntervalMin * 60 * 1000));
  }
}

function parsePositiveMinutes(raw: string | undefined, name: string): number {
  if (raw === undefined) throw new Error(`${name} requires a value`);
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`${name} must be a positive finite number; got "${raw}"`);
  }
  return n;
}

function parseArgs(argv: string[]): NotifierConfig {
  const config: NotifierConfig = { ...DEFAULT_CONFIG };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--once") config.once = true;
    else if (arg === "--poll-min") {
      config.pollIntervalMin = parsePositiveMinutes(argv[++i], "--poll-min");
    }
  }

  return config;
}

if (import.meta.main) {
  const config = parseArgs(process.argv.slice(2));
  await runNotifier(config);
}
