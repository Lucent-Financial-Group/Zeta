#!/usr/bin/env bun
import { spawn } from "bun";

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: bun run tools/auth/gh-auth-refresh-wrapper.ts <scope-list>");
    process.exit(1);
  }

  const scopes = args[0];
  if (!scopes) {
    console.error("Scope list cannot be empty.");
    process.exit(1);
  }
  console.log(`[gh-auth-refresh-wrapper] Starting gh auth refresh for scopes: ${scopes}`);

  const proc = spawn(["gh", "auth", "refresh", "-h", "github.com", "-s", scopes], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "inherit",
  });

  if (!proc.stdout || !proc.stdin) {
    console.error("Failed to get piped stdin/stdout for gh process.");
    process.exit(1);
  }

  const reader = proc.stdout.getReader();
  const decoder = new TextDecoder();
  let codeFound = false;
  let buffer = "";

  async function processStream() {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value);
      process.stdout.write(text);
      buffer += text;

      // Look for the Yes/No prompt
      if (buffer.includes("Authenticate Git with your GitHub credentials?")) {
        console.log("\n[gh-auth-refresh-wrapper] Auto-answering 'Y' to auth prompt...");
        if(proc.stdin) {
          proc.stdin.write("Y\n");
          proc.stdin.flush();
        }
      }

      // Look for the one-time code
      const codeMatch = buffer.match(/one-time code:\s*([A-Z0-9\-]+)/i);
      if (codeMatch && !codeFound) {
        codeFound = true;
        const code = codeMatch[1];
        console.log("\n=========================================");
        console.log(`[gh-auth-refresh-wrapper] ONE-TIME CODE CAPTURED: ${code}`);
        console.log("=========================================\n");
        // Slice 2 will add pbcopy and osascript UI. Slice 3 will add auto-Enter pumping.
      }
    }
  }

  await processStream();

  const exitCode = await proc.exited;
  console.log(`[gh-auth-refresh-wrapper] gh process exited with code ${exitCode}`);
  process.exit(exitCode);
}

main();
