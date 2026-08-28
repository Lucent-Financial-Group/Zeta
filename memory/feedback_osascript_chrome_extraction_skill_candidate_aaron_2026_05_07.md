---
name: osascript/Chrome extraction — kill Playwright Chrome, use real Chrome via AppleScript JS execution
description: The pattern for extracting content from authenticated browser sessions. Kill the Playwright Chrome (ms-playwright/mcp-chrome-*) so AppleScript finds the real Chrome, then execute JavaScript directly. Skill candidate — Aaron 2026-05-07 "maybe skill this."
type: feedback
originSessionId: 8dfb492a-e181-4a10-8fc9-16b3b01e832d
---
## The pattern (proven 2026-05-07)

1. Kill the Playwright Chrome process (it shadows the real Chrome for AppleScript):
   `kill $(ps aux | grep 'ms-playwright/mcp-chrome' | grep -v grep | awk '{print $2}')`

2. Verify AppleScript sees the real Chrome's windows:
   `osascript -e 'tell application "Google Chrome" to count of windows'`

3. Find the target tab:
   ```
   osascript -e 'tell application "Google Chrome"
     repeat with w in windows
       repeat with t in tabs of w
         if URL of t contains "<target-url-fragment>" then
           return title of t & " | " & URL of t
         end if
       end repeat
     end repeat
   end tell'
   ```

4. Execute JavaScript to extract content:
   ```
   osascript << 'EOF' > /tmp/output.txt
   tell application "Google Chrome"
     repeat with w in windows
       repeat with t in tabs of w
         if URL of t contains "<target-url>" then
           tell t
             set totalLen to execute javascript "document.body.innerText.length"
             set allText to ""
             set chunkSize to 40000
             set i to 0
             repeat while i < totalLen
               set chunk to execute javascript "document.body.innerText.substring(" & i & "," & (i + chunkSize) & ")"
               set allText to allText & chunk
               set i to i + chunkSize
             end repeat
           end tell
           return allText
         end if
       end repeat
     end repeat
   end tell
   EOF
   ```

5. **Prerequisite:** Chrome → View → Developer → Allow JavaScript from Apple Events (one-time toggle)

**Why:** Playwright MCP runs its own isolated Chrome with separate cookies. The user's authenticated sessions (Claude.ai, ChatGPT, Gemini, DeepSeek) are in the REAL Chrome. AppleScript can execute JS in the real Chrome's tabs, using the existing authentication.

**Shadow lesson:** Fighting Playwright for 20 minutes was the shadow avoiding the simpler approach. The pattern existed from a prior session; Otto didn't search for it first (shadow catch #6 pattern — confident narration over humble search).

**How to apply:** When extracting from authenticated web sessions, try osascript/Chrome FIRST. Only fall back to Playwright if osascript fails.
