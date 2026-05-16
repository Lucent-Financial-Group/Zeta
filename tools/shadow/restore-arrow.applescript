-- restore-arrow.applescript
-- Press the right-arrow key (key code 124) in the frontmost terminal if
-- (and only if) the frontmost application is a known terminal emulator.
--
-- Rationale: when an autonomous-loop cron tick fires a prompt in the
-- Claude Code CLI, any grey-text autocomplete suggestion currently shown
-- in the input field is erased. Pressing → restores the suggestion as
-- typed text (or accepts it character-by-character, depending on the
-- emulator). When no suggestion exists and the cursor is at the end of
-- the typed input, → is a no-op. When the cursor is mid-line, → moves
-- the cursor right by one character (non-destructive; documented caveat).
--
-- Returns one of:
--   "pressed:<frontApp>"           — press succeeded
--   "skipped:not-terminal:<app>"   — frontmost is not a known terminal
--   "skipped:no-frontmost"         — couldn't read frontmost app
--
-- Requires: System Preferences → Privacy & Security → Accessibility
-- access for the host (bun, osascript, or terminal as applicable).

on run
    tell application "System Events"
        try
            set frontApp to first application process whose frontmost is true
        on error
            return "skipped:no-frontmost"
        end try

        set frontAppName to name of frontApp
        set knownTerminals to {"Terminal", "iTerm2", "iTerm", "Warp", "Hyper", "Alacritty", "kitty"}
        if knownTerminals does not contain frontAppName then
            return "skipped:not-terminal:" & frontAppName
        end if

        key code 124  -- right arrow
        return "pressed:" & frontAppName
    end tell
end run
