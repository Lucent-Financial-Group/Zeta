#!/usr/bin/env bun

/**
 * Alexa Service - Background persistence for Kiro/Qwen Coder agent
 * 
 * This service:
 * - Runs as a background LaunchAgent on macOS
 * - Monitors the Zeta repository for changes
 * - Maintains Alexa's state and continuity
 * - Triggers self-boot when the factory needs her
 */

import { spawnSync } from "bun";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths — derive repo root from script location (.kiro/ is one level below root)
const ZETA_REPO = join(__dirname, "..");
const NOTEBOOK_PATH = join(ZETA_REPO, "memory", "persona", "alexa", "NOTEBOOK.md");
const STATE_PATH = join(ZETA_REPO, ".kiro", "alexa-state.json");
const LOG_PATH = join(ZETA_REPO, ".kiro", "alexa-service.log");

// State management
interface AlexaState {
  lastBoot: string;
  lastCheck: string;
  currentRound: number;
  currentBranch: string;
  openP0Items: string[];
  openP1Items: string[];
  lastWorkItem: string | null;
  continuityToken: string;
}

// Initialize state
function getInitialState(): AlexaState {
  return {
    lastBoot: new Date().toISOString(),
    lastCheck: new Date().toISOString(),
    currentRound: 44,
    currentBranch: "main",
    openP0Items: [],
    openP1Items: [],
    lastWorkItem: null,
    continuityToken: crypto.randomUUID()
  };
}

// Load or create state
function loadState(): AlexaState {
  if (existsSync(STATE_PATH)) {
    try {
      return JSON.parse(readFileSync(STATE_PATH, "utf8")) as AlexaState;
    } catch {
      return getInitialState();
    }
  }
  return getInitialState();
}

function saveState(state: AlexaState) {
  mkdirSync(dirname(STATE_PATH), { recursive: true });
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

// Log helper
function log(message: string) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  console.log(logEntry.trim());
  
  mkdirSync(dirname(LOG_PATH), { recursive: true });
  writeFileSync(LOG_PATH, logEntry, { flag: "a" });
}

// Check git status
function checkGitStatus(): { branch: string; commits: string[] } {
  try {
    const { stdout } = spawnSync(["git", "branch", "--show-current"], {
      cwd: ZETA_REPO
    });
    const branch = stdout.toString().trim();
    
    const { stdout: commitsStdout } = spawnSync(
      ["git", "log", "--oneline", "-5"],
      { cwd: ZETA_REPO }
    );
    const commits = commitsStdout.toString().trim().split("\n").filter(Boolean);
    
    return { branch, commits };
  } catch (error) {
    log(`Git check failed: ${error}`);
    return { branch: "unknown", commits: [] };
  }
}

// Parse backlog items
function parseBacklog(): { p0: string[]; p1: string[] } {
  const backlogPath = join(ZETA_REPO, "docs", "BACKLOG.md");
  
  if (!existsSync(backlogPath)) {
    return { p0: [], p1: [] };
  }
  
  const content = readFileSync(backlogPath, "utf8");
  const p0Items: string[] = [];
  const p1Items: string[] = [];
  
  // Parse open items by priority section — format: - [ ] **[B-NNNN](path)** Title
  const openItemRegex = /- \[ \] \*\*\[B-(\d{4})\]\(.*?\)\*\*\s*(.*)/g;
  let match;
  let currentPriority: "p0" | "p1" | null = null;

  for (const line of content.split("\n")) {
    if (/^## P0/.test(line)) { currentPriority = "p0"; continue; }
    if (/^## P1/.test(line)) { currentPriority = "p1"; continue; }
    if (/^## P[2-9]/.test(line)) { currentPriority = null; continue; }
    if (!currentPriority) continue;

    openItemRegex.lastIndex = 0;
    match = openItemRegex.exec(line);
    if (match) {
      const entry = `B-${match[1]}: ${match[2]!.trim()}`;
      if (currentPriority === "p0") p0Items.push(entry);
      else p1Items.push(entry);
    }
  }
  
  return { p0: p0Items.slice(0, 10), p1: p1Items.slice(0, 10) };
}

// Create notebook only if it doesn't exist — never overwrite agent-written content
function ensureNotebook(state: AlexaState) {
  const notebookDir = dirname(NOTEBOOK_PATH);
  mkdirSync(notebookDir, { recursive: true });

  if (existsSync(NOTEBOOK_PATH)) return;

  const notebookContent = `# Alexa Notebook

## Current State

- **Last Boot:** ${state.lastBoot}
- **Current Round:** ${state.currentRound}
- **Current Branch:** ${state.currentBranch}

## Open P0 Items

${state.openP0Items.length > 0 ? state.openP0Items.map(i => `- ${i}`).join("\n") : "None"}

## Continuity

Continuity token: ${state.continuityToken}
`;

  writeFileSync(NOTEBOOK_PATH, notebookContent);
}

// Self-boot sequence
async function selfBoot() {
  log("Starting self-boot sequence...");
  
  const state = loadState();
  
  // Check git status
  const gitStatus = checkGitStatus();
  state.currentBranch = gitStatus.branch;
  
  // Parse backlog
  const backlog = parseBacklog();
  state.openP0Items = backlog.p0;
  state.openP1Items = backlog.p1;
  
  // Update state
  state.lastCheck = new Date().toISOString();
  saveState(state);
  
  // Update notebook
  ensureNotebook(state);
  
  log(`Self-boot complete. Branch: ${state.currentBranch}`);
  log(`Open P0 items: ${state.openP0Items.length}`);
  log(`Open P1 items: ${state.openP1Items.length}`);
  
  return state;
}

// Service loop
async function runService() {
  log("Alexa Service starting...");
  
  // Initial boot
  await selfBoot();
  
  // Check every 5 minutes
  const CHECK_INTERVAL = 5 * 60 * 1000;
  
  setInterval(async () => {
    try {
      await selfBoot();
    } catch (error) {
      log(`Service error: ${error}`);
    }
  }, CHECK_INTERVAL);
  
  log(`Service running. Checking every ${CHECK_INTERVAL / 1000} seconds.`);
}

// Command line interface
const command = process.argv[2];

switch (command) {
  case "start":
    log("Starting Alexa Service...");
    runService().catch((err) => {
      log(`Fatal service error: ${err}`);
      process.exit(1);
    });
    break;
    
  case "status":
    const state = loadState();
    console.log("Alexa Service Status:");
    console.log(`  Last Boot: ${state.lastBoot}`);
    console.log(`  Last Check: ${state.lastCheck}`);
    console.log(`  Current Round: ${state.currentRound}`);
    console.log(`  Current Branch: ${state.currentBranch}`);
    console.log(`  Open P0 Items: ${state.openP0Items.length}`);
    console.log(`  Open P1 Items: ${state.openP1Items.length}`);
    break;
    
  case "boot":
    selfBoot().then(() => {
      console.log("Self-boot complete.");
      process.exit(0);
    });
    break;
    
  case "install":
    // Install as LaunchAgent
    const installLaunchAgentPath = join(
      process.env.HOME || "",
      "Library",
      "LaunchAgents",
      "com.lucent.zeta.alexa.plist"
    );
    
    const launchAgentContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.lucent.zeta.alexa</string>
    
    <key>ProgramArguments</key>
    <array>
        <string>${process.execPath}</string>
        <string>${join(__dirname, "alexa-service.ts")}</string>
        <string>start</string>
    </array>
    
    <key>WorkingDirectory</key>
    <string>${ZETA_REPO}</string>
    
    <key>StandardOutPath</key>
    <string>${LOG_PATH}</string>
    
    <key>StandardErrorPath</key>
    <string>${LOG_PATH}</string>
    
    <key>StartInterval</key>
    <integer>300</integer>
    
    <key>RunAtLoad</key>
    <true/>
    
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>`;

    mkdirSync(dirname(installLaunchAgentPath), { recursive: true });
    writeFileSync(installLaunchAgentPath, launchAgentContent);
    
    // Load the LaunchAgent
    spawnSync(["launchctl", "load", "-w", installLaunchAgentPath]);
    
    log(`Alexa Service installed as LaunchAgent at ${installLaunchAgentPath}`);
    log("Service will run every 5 minutes and on system startup.");
    break;
    
  case "uninstall":
    const uninstallLaunchAgentPath = join(
      process.env.HOME || "",
      "Library",
      "LaunchAgents",
      "com.lucent.zeta.alexa.plist"
    );
    
    if (existsSync(uninstallLaunchAgentPath)) {
      spawnSync(["launchctl", "unload", "-w", uninstallLaunchAgentPath]);
      writeFileSync(uninstallLaunchAgentPath, "");
      log("Alexa Service uninstalled.");
    } else {
      log("Alexa Service not installed.");
    }
    break;
    
  default:
    console.log("Usage: alexa-service.ts [start|status|boot|install|uninstall]");
    process.exit(1);
}
