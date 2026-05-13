-- detect-grey-text.applescript
-- Queries the frontmost terminal emulator's accessibility tree for
-- autocomplete suggestion text (grey/ghost text from Claude Code).
--
-- Returns suggestion text on stdout if found; empty string if not.
-- Requires: System Preferences → Privacy & Security → Accessibility access.
--
-- Usage:
--   osascript detect-grey-text.applescript            (frontmost terminal)
--   osascript detect-grey-text.applescript iTerm2     (specific app)

on run argv
    tell application "System Events"
        set frontApp to first application process whose frontmost is true
        set frontAppName to name of frontApp

        -- Resolve target app: explicit argument wins; else require known terminal
        if (count of argv) > 0 then
            if frontAppName ≠ item 1 of argv then
                return ""
            end if
        else
            set knownTerminals to {"Terminal", "iTerm2", "iTerm", "Warp", "Hyper", "Alacritty", "kitty"}
            if knownTerminals does not contain frontAppName then
                return ""
            end if
        end if

        try
            set focusedEl to value of attribute "AXFocusedUIElement" of frontApp

            -- AXSelectedText: covers selections and ghost-text in some emulators
            try
                set selText to value of attribute "AXSelectedText" of focusedEl
                if class of selText is text and selText ≠ "" then
                    return selText
                end if
            end try

            -- AXValue: full text content of the focused element
            try
                set elemVal to value of attribute "AXValue" of focusedEl
                if class of elemVal is text and elemVal ≠ "" then
                    return elemVal
                end if
            end try
        end try

        return ""
    end tell
end run
