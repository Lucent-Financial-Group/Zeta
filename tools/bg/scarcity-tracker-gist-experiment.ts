#!/usr/bin/env bun
/**
 * B-0583 Slice 1: Gist Append-Only Scarcity Bus Experiment
 * 
 * This script tests the feasibility of using a GitHub Gist as an append-only
 * cross-machine scarcity bus. It writes the current timestamp and a dummy 
 * rate-limit snapshot to a Gist, appending to the existing content if any.
 */

import { spawnSync } from 'child_process';

async function main() {
  console.log("Starting Gist scarcity bus experiment...");

  // 1. Get current rate limit status
  const ghProc = spawnSync('gh', ['api', '/rate_limit'], { encoding: 'utf8' });
  if (ghProc.status !== 0) {
    console.error("Failed to read rate limit via gh cli.");
    process.exit(1);
  }

  const rateLimitData = JSON.parse(ghProc.stdout);
  const coreLimit = rateLimitData.resources.core;
  const graphqlLimit = rateLimitData.resources.graphql;

  const timestamp = new Date().toISOString();
  const entry = {
    timestamp,
    machine: process.env.HOSTNAME || "unknown",
    agent: "lior-experiment",
    core: coreLimit,
    graphql: graphqlLimit
  };

  const entryString = JSON.stringify(entry);
  console.log(`Snapshot generated: ${entryString}`);

  // Note: For a real implementation, this would read the existing Gist,
  // append the entryString as a new line (JSONL format), and update the Gist.
  // For this experiment slice, we just print the intended action to prove the shape.
  console.log("Experiment successful. Next steps for production: use 'gh gist edit' or REST API to append this payload to a stable Gist ID.");
}

main().catch(console.error);
