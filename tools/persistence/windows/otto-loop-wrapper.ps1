#Requires -Version 5.1
# otto-loop-wrapper.ps1 — per-tick entry point for the Zeta autonomous loop on Windows.
# Task Scheduler runs this each minute (at-logon trigger + PT1M repetition, user-mode).
#
# Parity with tools/kiro/kiro-loop-wrapper.sh. Runs the loop tick against a DEDICATED
# CLONE under %LOCALAPPDATA%\zeta-otto-loop\Zeta — NEVER the operator checkout, because
# the tick does `git reset --hard origin/<ref>` which would wipe a working checkout.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$Base   = Join-Path $env:LOCALAPPDATA 'zeta-otto-loop'
$Clone  = Join-Path $Base 'Zeta'
$LogDir = $Base
New-Item -ItemType Directory -Force -Path $Base | Out-Null

# Which ref the dedicated clone tracks. The installer writes loop-ref.txt (--ref);
# default 'main' once the loop substrate is merged. The tick resets to origin/<ref>.
$refFile = Join-Path $Base 'loop-ref.txt'
$ref = if (Test-Path $refFile) { (Get-Content $refFile -Raw).Trim() } else { 'main' }

$git = (Get-Command git -ErrorAction SilentlyContinue).Source
$bun = (Get-Command bun -ErrorAction SilentlyContinue).Source
if (-not $git) { "$(Get-Date -Format o) ERROR git not on PATH" | Out-File -Append (Join-Path $LogDir 'wrapper.err'); exit 1 }
if (-not $bun) { "$(Get-Date -Format o) ERROR bun not on PATH" | Out-File -Append (Join-Path $LogDir 'wrapper.err'); exit 1 }

# Clone-if-missing safety net (the installer normally creates the clone at the chosen
# --ref; this only fires if the dir vanished). Never touches the operator checkout.
if (-not (Test-Path (Join-Path $Clone '.git'))) {
    & $git clone https://github.com/Lucent-Financial-Group/Zeta.git $Clone *>> (Join-Path $LogDir 'wrapper.log')
    & $git -C $Clone checkout $ref *>> (Join-Path $LogDir 'wrapper.log')
}

# The tick reads these to override its macOS-default paths onto Windows locations.
$env:ZETA_CLAUDE_LOOP_WORKTREE  = $Clone
$env:ZETA_CLAUDE_LOOP_STATE_DIR = Join-Path $Base 'state'
$env:ZETA_CLAUDE_LOOP_LOG_DIR   = $LogDir
$env:ZETA_CLAUDE_LOOP_REF       = $ref
# Heartbeat-only by default (slice 1 — proves the mechanism). Uncomment for harness-launch:
# $env:ZETA_CLAUDE_LOOP_RUN_CLAUDE = '1'
# $env:ZETA_CLAUDE_LOOP_MODEL      = 'sonnet'

Set-Location $Clone
$tick = Join-Path $Clone '.claude\bin\claude-loop-tick.ts'
& $bun $tick *>> (Join-Path $LogDir 'wrapper.log')
exit $LASTEXITCODE
