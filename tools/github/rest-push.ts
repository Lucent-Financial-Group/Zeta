#!/usr/bin/env bun
// rest-push.ts — REST git-data API bypass for `git push` under saturation.
//
// When `git push` silently fails (exit 0, no remote update — see B-0615) under
// multi-agent saturation, this script lands a single-file change via the
// GitHub REST git-data API instead. The REST endpoints (POST /git/blobs,
// /git/trees, /git/commits, /git/refs) are served by different infrastructure
// than the git-push transport, so they remain responsive while push is hung.
//
// Worked example: PR #4145 + #4146 (2026-05-18) — both landed via this
// pattern after the corresponding `git push` exited 0 with no remote update.
//
// Usage:
//   bun tools/github/rest-push.ts --file <path> --branch <ref> --message <msg> [--base main] [--owner X] [--repo Y]
//
// Multi-file changes:
//   --file PATH ... (repeatable; combines into one commit)
//
// Examples:
//   bun tools/github/rest-push.ts --file CLAUDE.md --branch otto/fix-typo-2026-05-18 \
//       --message "docs(CLAUDE): fix typo in §3"
//
//   bun tools/github/rest-push.ts \
//       --file .claude/rules/foo.md --file docs/backlog/P3/B-XXXX.md \
//       --branch otto/b0XXXX-impl-2026-05-18 \
//       --message "feat(B-XXXX): two-file change\n\n..."
//
// Output: JSON to stdout:
//   { "branch": "...", "sha": "<commit-sha>", "url": "https://github.com/.../tree/<branch>" }
//
// Exit codes:
//   0  success
//   1  REST error (network / 4xx / 5xx)
//   2  bad usage
//
// Composes with: PR #4145 (the rule documenting the discipline)
//                PR #4146 (background-loop awareness)
//                B-0615 (the open bug class this works around)

import { readFileSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";

interface Args {
    files: string[];
    branch: string;
    message: string;
    base: string;
    owner: string;
    repo: string;
}

function parseArgs(argv: string[]): Args {
    const args: Args = {
        files: [],
        branch: "",
        message: "",
        base: "main",
        owner: "Lucent-Financial-Group",
        repo: "Zeta",
    };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        const next = argv[i + 1];
        if (a === "--file" && next) { args.files.push(next); i++; }
        else if (a === "--branch" && next) { args.branch = next; i++; }
        else if (a === "--message" && next) { args.message = next; i++; }
        else if (a === "--base" && next) { args.base = next; i++; }
        else if (a === "--owner" && next) { args.owner = next; i++; }
        else if (a === "--repo" && next) { args.repo = next; i++; }
        else if (a === "--help" || a === "-h") {
            process.stdout.write(`Usage: bun tools/github/rest-push.ts --file <path> --branch <ref> --message <msg> [--base main]\n  --file can be repeated to land multiple files in one commit.\n`);
            process.exit(0);
        }
        else { process.stderr.write(`unknown arg: ${a}\n`); process.exit(2); }
    }
    if (args.files.length === 0) { process.stderr.write("--file required (at least one)\n"); process.exit(2); }
    if (!args.branch) { process.stderr.write("--branch required\n"); process.exit(2); }
    if (!args.message) { process.stderr.write("--message required\n"); process.exit(2); }
    return args;
}

function ghApi(method: string, path: string, body?: object): unknown {
    const cmdArgs = ["api", "-X", method, path];
    let stdin: string | undefined;
    if (body !== undefined) {
        cmdArgs.push("--input", "-");
        stdin = JSON.stringify(body);
    }
    const result = spawnSync("gh", cmdArgs, { encoding: "utf8", input: stdin, maxBuffer: 16 * 1024 * 1024 });
    if (result.status !== 0) {
        throw new Error(`gh ${method} ${path} failed (exit ${result.status}): ${result.stderr.trim() || result.stdout.trim()}`);
    }
    try { return JSON.parse(result.stdout); }
    catch (e) { throw new Error(`gh ${method} ${path} returned non-JSON: ${result.stdout.slice(0, 200)}`); }
}

function fileMode(path: string): string {
    // 100755 for executables (preserve x-bit); 100644 otherwise.
    const st = statSync(path);
    const isExec = (st.mode & 0o111) !== 0;
    return isExec ? "100755" : "100644";
}

function main(): void {
    const args = parseArgs(process.argv.slice(2));
    const { owner, repo, base, branch, message, files } = args;

    // 1. Get base ref SHA + tree SHA
    const baseRef = ghApi("GET", `repos/${owner}/${repo}/branches/${base}`) as { commit: { sha: string } };
    const baseSha = baseRef.commit.sha;
    const baseCommit = ghApi("GET", `repos/${owner}/${repo}/git/commits/${baseSha}`) as { tree: { sha: string } };
    const baseTreeSha = baseCommit.tree.sha;

    // 2. Create blobs for each file
    const treeEntries = files.map((path) => {
        const content = readFileSync(path);
        const blob = ghApi("POST", `repos/${owner}/${repo}/git/blobs`, {
            content: content.toString("base64"),
            encoding: "base64",
        }) as { sha: string };
        return { path, mode: fileMode(path), type: "blob", sha: blob.sha };
    });

    // 3. Create tree
    const tree = ghApi("POST", `repos/${owner}/${repo}/git/trees`, {
        base_tree: baseTreeSha,
        tree: treeEntries,
    }) as { sha: string };

    // 4. Create commit
    const commit = ghApi("POST", `repos/${owner}/${repo}/git/commits`, {
        message,
        tree: tree.sha,
        parents: [baseSha],
    }) as { sha: string };

    // 5. Create branch ref (fails if branch already exists; intentional —
    // caller can use PATCH /refs/heads/<branch> for force-update workflows)
    ghApi("POST", `repos/${owner}/${repo}/git/refs`, {
        ref: `refs/heads/${branch}`,
        sha: commit.sha,
    });

    process.stdout.write(JSON.stringify({
        branch,
        sha: commit.sha,
        url: `https://github.com/${owner}/${repo}/tree/${branch}`,
    }) + "\n");
}

main();
