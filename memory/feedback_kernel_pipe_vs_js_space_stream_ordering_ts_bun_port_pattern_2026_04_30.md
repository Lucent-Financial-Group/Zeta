---
name: kernel-pipe vs JS-space stream ordering — TS+Bun port pattern (2026-04-30)
description: When porting bash command-substitution with `2>&1` to TypeScript via `spawnSync`, must merge stdout+stderr at the kernel pipe boundary (shell-side `2>&1`), NOT in JS-space by concatenating `result.stdout + result.stderr` — JS-space concat loses chronological ordering when child interleaves stdout/stderr writes.
type: feedback
---

# kernel-pipe vs JS-space stream ordering — TS+Bun port pattern

When porting bash command-substitution like `output=$( script.sh 2>&1 )` to
TypeScript via `spawnSync`, the byte-equivalent shape is:

```typescript
const result = spawnSync("/bin/bash", ["-c", `"${path}" 2>&1`], {
  encoding: "utf8",
  stdio: ["inherit", "pipe", "pipe"],
});
const output = result.stdout ?? "";
```

NOT:

```typescript
// WRONG — loses chronological ordering when child interleaves stdout/stderr
const result = spawnSync(path, [], { encoding: "utf8" });
const output = result.stdout + result.stderr;
```

**Why:** bash `$(... 2>&1)` redirects stderr into stdout at the kernel pipe
boundary, which preserves the child's chronological write order across both
streams. JS-space concatenation glues two already-segregated buffers together
in a fixed order (`stdout` first, `stderr` second), losing the original
interleaving. If the child emits `[stdout-A, stderr-B, stdout-C]`, the
kernel-pipe form captures `A B C` in order; the JS-space form captures
`A C B`.

**How to apply:**

- **Always** use shell-side `2>&1` via `bash -c "<path> 2>&1"` for
  byte-equivalent output to bash `$(... 2>&1)`. Use `/bin/bash` (not
  `/bin/sh`) so bash-only features like `[[ ]]`, brace expansion, process
  substitution still work.
- The performance cost (one extra fork+exec for `bash -c`) is negligible
  compared to typical TS/CLI overhead.
- This applies to any TS port that needs in-order merged output — wrappers
  spawning sibling scripts, audit scripts capturing combined diagnostic
  output, peer-call wrappers piping LLM-CLI output through, etc.
- **Edge case — shell parse errors fall outside `( ) 2>&1`**: when wrapping
  user-supplied commands like `(${cmd}) 2>&1`, shell parse errors emerge on
  the parent shell's stderr (not the child's). For those, also concatenate
  `result.stderr` to surface diagnostics. The two patterns are stacked, not
  alternative — kernel-pipe for in-order child output, plus stderr-concat for
  shell-side parse errors.
- Defensive: `result.stdout ?? ""` because the typings claim `string` when
  encoding is set, but runtime can return `null` if the child fails to start.

## Origin

PR #901 (slice 18 — `tools/budget/daily-cost-report.ts`) Copilot P1 round 2.
The first version of `runProjectRunway` concatenated `result.stdout + result.stderr` in JS-space.
Copilot caught that this loses ordering vs the bash original
`$( "$script_dir/project-runway.sh" 2>&1 )`. Fixed by switching to
`spawnSync("/bin/bash", ["-c", \`"${path}" 2>&1\`])` so the merge happens at
the kernel pipe boundary chronologically. Same pattern then baked into
slice 19 (`tools/budget/project-runway.ts`).

## Composes with

- `docs/best-practices/typescript.md` (TS+Bun discipline; pending #351 skill).
- `tools/peer-call/{grok,gemini,codex}.ts` `runContextCmd` helpers — same
  shell-side-merge pattern via `(${cmd}) 2>&1 | head -c N` for
  shell-side truncation.
- Otto-363 substrate-or-it-didn't-happen — this finding only lived in commit
  messages and review threads until this memory file landed.
- `classifySpawnFailure` 4-case helper (status set / ENOENT / signal / other)
  — same shape from PRs #887/#892/#894/#896-#902. Used together when the
  port also needs failure classification.
