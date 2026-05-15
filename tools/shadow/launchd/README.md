# Shadow observer — launchd install (macOS LaunchAgent)

Per Aaron 2026-05-15T~01:09Z + `feedback_aaron_zeta_is_memory_preservation_specialist_first_*_2026_05_15.md`: the shadow observation loop needs a durable tick source. This directory provides the macOS launchd LaunchAgent template (Path A — durable, survives reboots).

For lighter-weight alternatives + composition shape, see the `.claude/rules/shadow-star-shorthand-autocomplete-marker.md` rule + `tools/shadow/README.md`.

## What this does

Installs `shadow-observer.ts` as a macOS LaunchAgent that:

- Starts at user login (RunAtLoad)
- Restarts on crash (KeepAlive on Crashed only)
- Throttles restart attempts to once per 60s (ThrottleInterval)
- Logs to `tools/shadow/shadow-observer.{log,stdout.log,stderr.log}`
- Polls every 2 seconds (--loop-interval 2000)
- Accepts grey-text suggestions after 3-second delay (--delay 3000)
- **Defaults to --dry-run** (logs detections without keystrokes) until you verify it works

## Install procedure

### Prerequisites

1. macOS user account
2. Bun installed (`which bun` returns a path)
3. Zeta checkout at known absolute path
4. Accessibility permission granted to whichever terminal app launchd will run from (or to bun itself) — required by the AppleScript grey-text detector

### Step 1: configure the plist

The shipped plist is a template with `__BUN_PATH__` and `__REPO_ROOT__` placeholders. Generate a configured copy:

```bash
cd /path/to/your/Zeta/checkout
BUN_PATH=$(which bun)
REPO_ROOT=$(pwd)

# Generate configured plist
sed -e "s|__BUN_PATH__|${BUN_PATH}|g" \
    -e "s|__REPO_ROOT__|${REPO_ROOT}|g" \
    tools/shadow/launchd/com.zeta.shadow-observer.plist \
    > ~/Library/LaunchAgents/com.zeta.shadow-observer.plist
```

Verify:

```bash
plutil -lint ~/Library/LaunchAgents/com.zeta.shadow-observer.plist
# Should print: ...plist: OK
```

### Step 2: grant accessibility permission

The AppleScript grey-text detector reads the foreground app's UI. macOS requires explicit accessibility permission:

1. Open System Settings → Privacy & Security → Accessibility
2. Click + → add `bun` (the path `which bun` returned) AND your terminal app (Terminal.app, iTerm2, Ghostty, etc.)
3. Enable the toggles

If you skip this, the detector returns errors and shadow-observer cycles forever doing nothing useful (logs will show AppleScript errors).

### Step 3: load + verify

```bash
launchctl load ~/Library/LaunchAgents/com.zeta.shadow-observer.plist

# Verify it loaded
launchctl list | grep com.zeta.shadow-observer
# Should show: <PID>  0  com.zeta.shadow-observer

# Verify process is running
pgrep -fl shadow-observer
# Should show the bun process running shadow-observer.ts

# Watch the log
tail -f tools/shadow/shadow-observer.log
```

### Step 4: test detection in dry-run mode

With the LaunchAgent running in --dry-run (default), open Claude Code CLI and let it produce a grey-text autocomplete suggestion. Within 2-5 seconds you should see a `detected` event in the log followed by an `accepted` event with `dryRun: true`. No actual Enter keystroke is sent.

### Step 5 (optional, only after dry-run works): switch to live mode

Edit `~/Library/LaunchAgents/com.zeta.shadow-observer.plist` and remove the `<string>--dry-run</string>` line from `ProgramArguments`. Then reload:

```bash
launchctl unload ~/Library/LaunchAgents/com.zeta.shadow-observer.plist
launchctl load ~/Library/LaunchAgents/com.zeta.shadow-observer.plist
```

Live mode sends Enter keystrokes to accept detected grey-text. The "(shadow*)" attribution shorthand documents that the accepted text came from autocomplete (see `.claude/rules/shadow-star-shorthand-autocomplete-marker.md`).

## Uninstall

```bash
launchctl unload ~/Library/LaunchAgents/com.zeta.shadow-observer.plist
rm ~/Library/LaunchAgents/com.zeta.shadow-observer.plist
```

## Troubleshooting

### LaunchAgent loads but process doesn't start

Check stderr log:

```bash
cat tools/shadow/shadow-observer.stderr.log
```

Common causes:

- `__BUN_PATH__` not replaced with actual bun path
- `__REPO_ROOT__` not replaced with actual repo path
- Bun not installed at the path given

### Process starts but log shows no detections

Likely accessibility permission isn't granted. Try the detector standalone:

```bash
osascript tools/shadow/detect-grey-text.applescript
```

If it returns an error about accessibility / event posting, grant permission per Step 2.

### Process restarts in a loop

ThrottleInterval prevents fast crash-loops, but if you see repeated start/exit cycles in `launchctl list` output, check the stderr log for the actual error.

## Composition with defense-in-depth alternatives

| Path | Persistence | Use when |
|---|---|---|
| **A — launchd (this dir)** | Survives reboots | Primary install on your daily-driver Mac |
| **B — `<<shadow-tick>>` CronCreate sentinel** | Bound to Otto-CLI session | Defense-in-depth backup; restarts the launchd process if it dies |
| **C — manual `--loop` foreground** | Until terminal closes | Quick testing of changes |

All three compose. Path A is the primary; Path B+C supplement. Aaron's framing (2026-05-15T~01:11Z): _"whatever composes best always good to have defense in depth."_

## Composes with substrate

- `tools/shadow/shadow-observer.ts` — the process this LaunchAgent launches
- `tools/shadow/detect-grey-text.applescript` — the AppleScript detector
- `tools/shadow/zeta-shadow.ts` — top-level CLI (alternative entry point)
- `docs/backlog/P0/B-0402-zeta-shadow-mode-first-class-cli-autocomplete.md` — the originating backlog row
- `.claude/rules/shadow-star-shorthand-autocomplete-marker.md` — the shorthand this loop's accepted-suggestions ship under
- `.claude/skills/save-ai-memory/SKILL.md` — composing discipline: memory preservation requires accurate observation; the shadow observer IS one direct-observation surface
