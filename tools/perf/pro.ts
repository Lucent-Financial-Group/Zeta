#!/usr/bin/env bun
// pro.ts — the pro(file) verb's GLASS-SIDE attach lane (B-1039 Progress 3/5; Aaron 2026-06-11:
// "now lets have ben and pro(file) and all in our framework air tight vacuum tight" + the ruling
// "glass-side only no wall clock in the room").
//
// THE DISCIPLINE: this tool NEVER enters the room. It attaches dotnet-trace (EventPipe — the
// out-of-process diagnostics IPC) to a running .NET process and observes THROUGH THE GLASS: zero
// syscalls injected into the observed loop, the Reticulum-only seal intact, the red light on (the
// observed process can see the diagnostics session — observation is never covert). In-room
// measurement stays the exact pair (Ben.chip8Ticks + Ben.allocBytes); everything statistical —
// wall time, CPU stacks, GC events — lives HERE, outside the membrane.
//
// Usage:
//   bun tools/perf/pro.ts --pid <pid> [--seconds <s>] [--out <file.nettrace>]
//   bun tools/perf/pro.ts [--out <file.nettrace>] -- <command> [args...]
//
// In `--` mode the command is spawned and the trace attaches to THAT pid. Caveat (honest): for
// `dotnet test`, the interesting work runs in a CHILD testhost process — attach to its pid with
// --pid instead (find it via `dotnet-trace ps`). Analysis lanes: PerfView (Windows, the senior
// session — Aaron owns), TraceEvent / `dotnet-trace report` (cross-platform).

import { spawn, spawnSync } from "node:child_process";

function fail(msg: string): never {
  console.error("pro: " + msg);
  process.exit(1);
}

const argv = process.argv.slice(2);
const sep = argv.indexOf("--");
const flags = sep >= 0 ? argv.slice(0, sep) : argv;
const cmd = sep >= 0 ? argv.slice(sep + 1) : [];

function flagOf(name: string): string | undefined {
  const i = flags.indexOf("--" + name);
  return i >= 0 ? flags[i + 1] : undefined;
}

const pidFlag = flagOf("pid");
const seconds = flagOf("seconds");
const out = flagOf("out") ?? `pro-${pidFlag ?? "spawn"}-${process.pid}.nettrace`;

if ((pidFlag === undefined) === (cmd.length === 0)) {
  fail("exactly one of --pid <pid> or `-- <command...>` is required (see header for usage)");
}

let pid: number;
let child: ReturnType<typeof spawn> | undefined;
if (pidFlag !== undefined) {
  pid = Number(pidFlag);
  if (!Number.isInteger(pid) || pid <= 0) fail(`--pid must be a positive integer, got '${pidFlag}'`);
} else {
  child = spawn(cmd[0]!, cmd.slice(1), { stdio: "inherit" });
  if (child.pid === undefined) fail(`could not spawn: ${cmd.join(" ")}`);
  pid = child.pid;
  console.error(`pro: spawned pid ${pid}: ${cmd.join(" ")}`);
}

const traceArgs = ["collect", "-p", String(pid), "-o", out];
if (seconds !== undefined) traceArgs.push("--duration", `00:00:00:${seconds.padStart(2, "0")}`);

console.error(`pro: attaching through the glass — dotnet-trace ${traceArgs.join(" ")}`);
const trace = spawnSync("dotnet-trace", traceArgs, { stdio: "inherit" });

if (child !== undefined && child.exitCode === null) child.kill("SIGTERM");
if (trace.status !== 0) fail(`dotnet-trace exited ${trace.status} (is pid ${pid} a .NET process with diagnostics IPC? try \`dotnet-trace ps\`)`);
console.error(`pro: trace written to ${out} — analyze with \`dotnet-trace report ${out} topN\` or PerfView/TraceEvent`);
