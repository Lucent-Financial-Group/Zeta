---
name: chrome-lazy-load-chunked-extraction
description: "Extract authenticated lazy-loading / virtual-list chat UIs (DeepSeek, ChatGPT, Gemini, Claude.ai) via osascript + Chrome with chunked reverse-scroll — handles virtual-list rendering where scrolling unrenders bottom items + renders earlier ones."
trigger: "extract deepseek conversation", "lazy load chat history", "virtual list scrape", "scroll up and download", "chunked extraction", "reverse scroll", "save chat", "deepseek download"
---

# Chrome lazy-load chunked extraction via reverse-scroll

## What this does

Extracts the full content of authenticated chat UIs that use
**lazy loading / virtual lists** (DeepSeek, ChatGPT,
Gemini, modern Claude.ai). Standard `body.innerText`
extraction misses content because virtualized lists only
render the visible window; scrolling unrenders bottom
items and renders earlier ones.

This skill scrolls the conversation in chunks, extracting
each window of rendered content, then deduplicates the
overlapping chunks into a complete transcript.

## What this does NOT do

- Does NOT bypass authentication (requires user already
  logged in to the chat UI)
- Does NOT work with Safari (Chrome only)
- Does NOT use Playwright (requires the user's existing
  authenticated Chrome session)
- Does NOT handle infinite-scroll feeds in the same way
  (the chunk-overlap-dedupe pattern is for finite
  conversations)

## When to use this vs. the `browser-extraction` skill

- **`browser-extraction`** (parent skill): single-shot
  extraction for non-virtualized pages where the entire
  conversation is in the DOM
- **`chrome-lazy-load-chunked-extraction`** (this skill):
  chunked reverse-scroll for virtual-list / lazy-load
  UIs where the conversation can't fit in the DOM at once

If `browser-extraction`'s single-shot extraction returns
suspiciously little data, or if you can see content
disappear/appear when scrolling, use this skill instead.

## Prerequisites

Same as `browser-extraction`:
1. Chrome running with target site authenticated
2. Chrome → View → Developer → Allow JavaScript from Apple Events
3. Playwright Chrome killed (it shadows real Chrome for AppleScript)
4. Project permissions allow `Bash(osascript *)` + `Bash(kill *)` /
   `Bash(pkill *)` (see `.claude/settings.json`)

## Procedure

### Step 1: Setup

```bash
# Kill Playwright Chrome if running
pkill -f 'ms-playwright/mcp-chrome' 2>/dev/null

# Verify real Chrome is visible
osascript -e 'tell application "Google Chrome" to count of windows'
# Should return >= 1
```

### Step 2: Identify the scrollable virtual-list container

```bash
osascript -e 'tell application "Google Chrome"
    repeat with w in windows
        repeat with t in tabs of w
            if URL of t contains "TARGET-URL-FRAGMENT" then
                tell t
                    return execute javascript "JSON.stringify(Array.from(document.querySelectorAll(\"*\")).filter(el => { const s = getComputedStyle(el); return (s.overflowY === \"auto\" || s.overflowY === \"scroll\") && el.scrollHeight > el.clientHeight; }).map(el => ({tag: el.tagName, cls: el.className.toString().substring(0, 100), scrollHeight: el.scrollHeight, clientHeight: el.clientHeight})).slice(0, 5))"
                end tell
            end if
        end repeat
    end repeat
end tell'
```

Common virtual-list container classes:
- **DeepSeek**: `.ds-virtual-list--printable` (also
  `.ds-virtual-list` for nested lists)
- **ChatGPT**: varies; look for tall scrollHeight + low
  clientHeight ratio
- **Gemini**: `.chat-history` container or similar
- **Claude.ai**: scroll container in conversation view

### Step 3: Determine total scroll height

```bash
TOTAL_HEIGHT=$(osascript -e 'tell application "Google Chrome"
    repeat with w in windows
        repeat with t in tabs of w
            if URL of t contains "TARGET-URL-FRAGMENT" then
                tell t
                    return execute javascript "document.querySelector(\".CONTAINER-SELECTOR\").scrollHeight.toString()"
                end tell
            end if
        end repeat
    end repeat
end tell')
echo "Total scroll height: $TOTAL_HEIGHT"
```

For DeepSeek long conversations: scrollHeight can be
400,000+ pixels (massive conversations). Chunk sizing
matters.

### Step 4: Chunked extraction loop

The proven shell script pattern (see
`tools/browser-extraction/deepseek-extract.sh` if
checked into repo; ad-hoc `/tmp/deepseek-extract.sh`
otherwise):

```bash
OUTPUT="/tmp/extraction-chunks.txt"
> "$OUTPUT"

CHUNK_SIZE=4000   # pixels per scroll step
POSITION=0
CHUNK_NUM=0

# Scroll to top first
osascript -e 'tell application "Google Chrome"
    repeat with w in windows
        repeat with t in tabs of w
            if URL of t contains "TARGET-URL-FRAGMENT" then
                tell t
                    return execute javascript "document.querySelector(\".CONTAINER-SELECTOR\").scrollTop = 0; \"reset\""
                end tell
            end if
        end repeat
    end repeat
end tell' > /dev/null
sleep 2

# Loop
while [ "$POSITION" -lt "$TOTAL_HEIGHT" ]; do
    CHUNK_NUM=$((CHUNK_NUM + 1))

    CONTENT=$(osascript -e 'tell application "Google Chrome"
        repeat with w in windows
            repeat with t in tabs of w
                if URL of t contains "TARGET-URL-FRAGMENT" then
                    tell t
                        return execute javascript "document.body.innerText"
                    end tell
                end if
            end repeat
        end repeat
    end tell')

    echo "=== CHUNK $CHUNK_NUM @ scrollTop=$POSITION ===" >> "$OUTPUT"
    echo "$CONTENT" >> "$OUTPUT"
    echo "" >> "$OUTPUT"

    POSITION=$((POSITION + CHUNK_SIZE))
    osascript -e "tell application \"Google Chrome\"
        repeat with w in windows
            repeat with t in tabs of w
                if URL of t contains \"TARGET-URL-FRAGMENT\" then
                    tell t
                        return execute javascript \"document.querySelector('.CONTAINER-SELECTOR').scrollTop = $POSITION; '$POSITION'\"
                    end tell
                end if
            end repeat
        end repeat
    end tell" > /dev/null
    sleep 2
done

echo "Done. Chunks: $CHUNK_NUM"
```

### Step 5: Deduplicate overlapping chunks

Each chunk contains the currently-rendered window of
messages. Adjacent chunks overlap because the chunk
size (4000px) is smaller than the rendered window
(several thousand pixels of content).

Dedup approach 1 (line-by-line):
```bash
awk '!seen[$0]++' /tmp/extraction-chunks.txt > /tmp/extraction-deduped.txt
```

Dedup approach 2 (segment-by-message): split on message-
boundary markers (e.g., "User:" / "Assistant:" / "Expert"
/ user-handle), then dedupe segments.

### Step 6: PII scrubbing

Same as parent `browser-extraction` skill. Check for:
- Full names (especially user's own)
- Email addresses
- Phone numbers
- Account identifiers from UI chrome (DeepSeek sidebar
  often partial-masks emails like `aar*****nd@yahoo.com`
  — scrub fully)

```bash
grep -ioP '\b[A-Z][a-z]+\s+[A-Z][a-z]+\b' /tmp/extraction-deduped.txt | sort -u
grep -ioE '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}' /tmp/extraction-deduped.txt | sort -u
```

Scrub via `sed`:
```bash
sed -i '' -e 's/\bFullName\b/[user identity scrubbed]/g' \
          -e 's/email@example\.com/[user email scrubbed]/g' \
          /tmp/extraction-deduped.txt
```

### Step 7: §33 archive header + commit

Per GOVERNANCE.md §33, archived external-conversation
extracts get a standard header before commit to
`docs/research/`:

```markdown
# [Title]: [Aaron + Other AI / Operator]

**Date extracted:** YYYY-MM-DD
**Source:** [URL fragment, marked authenticated session]
**Tab title:** [Title from Chrome tab if relevant]
**Participants:** Aaron (operator) + [AI / other]
**Extraction method:** osascript + Chrome chunked
reverse-scroll (chrome-lazy-load-chunked-extraction skill)

## Archive scope (per GOVERNANCE §33)

**Scope:** [What this extract is — purpose-of-preservation]
**Operational status:** research-grade
**Attribution:** Aaron is first-party on his own substrate
(Otto-231). UI-leaked PII has been scrubbed.
**Non-fusion disclaimer:** [If applicable for the AI in
question]

## Why preserved

[Aaron's verbatim rationale + Otto's contextual framing]

---

[Extracted content follows]
```

## Proven track record

Tested on:
- DeepSeek conversation (2026-05-12) — 466K-pixel scroll
  height, 117 chunks at 4000px each, ~5 minutes total
  extraction time, full deduplication via line-awk

## Shadow lesson

This skill was authored in response to Aaron's explicit
ask 2026-05-12: "save deepseek chunk download reverse
scroll skill". The chunk-download-reverse-scroll pattern
emerged from the practical need to extract a DeepSeek
conversation where the parent `browser-extraction` skill
returned only the currently-visible content (~186KB)
instead of the full 466KB+ conversation due to virtual-
list rendering.

The skill is the substrate-honest documentation of the
procedure so future agents (or me with permission) can
extract any lazy-load / virtual-list chat UI cleanly
without rediscovering the chunk-overlap-dedup pattern.

## Composes with

- `.claude/skills/browser-extraction/SKILL.md` — parent
  skill; this is the lazy-load-specific extension
- `.claude/settings.json` permission allowlist for
  `Bash(osascript *)` + `Bash(pkill *)` (required for
  Chrome AppleScript access)
- The substrate-everything glass-halo discipline —
  extracted conversations land in `docs/research/`
  permanently
- The browser-extraction skill's PII-scrubbing discipline
- `feedback_aaron_shadow_speaks_via_grey_text_autocomplete_future_zeta_own_harness_classifier_understands_vision_2026_05_12.md`
  — context for why we extract from authenticated 3rd-
  party sessions: substrate-honest ferrying of relevant
  conversations into Zeta substrate
