#!/usr/bin/env bun
// Entry point for `zeta shadow` — thin wrapper around shadow-observer run().
import { run, parseConfig } from "./shadow-observer.ts";

const config = parseConfig(Bun.argv.slice(2));
run(config).catch((err: unknown) => {
  console.error("Shadow observer fatal error:", err);
  process.exit(1);
});
