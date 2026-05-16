import { spawn } from "bun";

async function main() {
  const scopes = process.argv.slice(2).join(",");
  if (!scopes) {
    console.error("Usage: bun run tools/auth/gh-auth-refresh-wrapper.ts <scopes>");
    process.exit(1);
  }

  console.log(`Starting gh auth refresh for scopes: ${scopes}`);
  
  const proc = spawn({
    cmd: ["gh", "auth", "refresh", "-h", "github.com", "-s", scopes],
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });

  const decoder = new TextDecoder();
  let codeCaptured = false;

  const handleOutput = async (stream: ReadableStream, isStderr: boolean) => {
    const out = isStderr ? process.stderr : process.stdout;
    for await (const chunk of stream) {
      const text = decoder.decode(chunk);
      out.write(text);
      
      // Look for the Y/N prompt
      if (text.includes("? Authenticate Git with your GitHub credentials?")) {
        proc.stdin.write("Y\n");
        proc.stdin.flush();
      }

      // Look for the one-time code
      const codeMatch = text.match(/! First copy your one-time code: ([A-Z0-9-]+)/);
      if (codeMatch && !codeCaptured) {
        const code = codeMatch[1];
        codeCaptured = true;
        console.log(`\n\n`);
        console.log(`========================================================`);
        console.log(`🚀 ONE-TIME CODE CAPTURED: ${code} 🚀`);
        console.log(`========================================================`);
        console.log(`\n`);
        
        // Optionally pump Enter if the process expects it, but wait for user to copy.
        // The script just needs to surface it prominently for now.
      }
    }
  };

  Promise.all([
    handleOutput(proc.stdout, false),
    handleOutput(proc.stderr, true)
  ]).catch(console.error);

  const exitCode = await proc.exited;
  console.log(`\ngh auth refresh exited with code ${exitCode}`);
  process.exit(exitCode);
}

main().catch((err) => {
  console.error("Error running wrapper:", err);
  process.exit(1);
});
