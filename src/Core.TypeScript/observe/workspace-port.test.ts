import { describe, expect, test } from "bun:test";
import {
  simulatedWorkspacePort,
  emptySimulatedState,
  EXECUTABLE_PERMISSIONS,
  DEFAULT_PERMISSIONS,
  type SimulatedState,
  type FileEntry,
} from "./workspace-port";

describe("simulatedWorkspacePort — in-memory filesystem", () => {
  test("writeFile + readFile round-trips", () => {
    const state = emptySimulatedState();
    const port = simulatedWorkspacePort(state);

    const writeResult = port.writeFile("src/hello.ts", "export const x = 1;");
    expect(writeResult.ok).toBe(true);

    const readResult = port.readFile("src/hello.ts");
    expect(readResult.ok).toBe(true);
    if (readResult.ok) expect(readResult.value).toBe("export const x = 1;");
  });

  test("readFile on missing path returns error (not throw)", () => {
    const port = simulatedWorkspacePort(emptySimulatedState());
    const result = port.readFile("does-not-exist.md");
    expect(result.ok).toBe(false);
  });

  test("exists reflects written files", () => {
    const state = emptySimulatedState();
    const port = simulatedWorkspacePort(state);
    expect(port.exists("foo.ts")).toBe(false);
    port.writeFile("foo.ts", "x");
    expect(port.exists("foo.ts")).toBe(true);
  });

  test("readDir lists immediate children", () => {
    const state = emptySimulatedState();
    const port = simulatedWorkspacePort(state);
    port.writeFile("docs/backlog/P0/item1.md", "content1");
    port.writeFile("docs/backlog/P0/item2.md", "content2");
    port.writeFile("docs/backlog/P1/other.md", "content3");

    const result = port.readDir("docs/backlog/P0");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual(["item1.md", "item2.md"]);
    }
  });
});

describe("simulatedWorkspacePort — git simulation", () => {
  test("checkout -B creates a new branch", () => {
    const state = emptySimulatedState();
    const port = simulatedWorkspacePort(state);

    port.git(["checkout", "-B", "alexa/test-branch", "origin/main"]);
    expect(state.branch).toBe("alexa/test-branch");
  });

  test("commit records the message", () => {
    const state = emptySimulatedState();
    const port = simulatedWorkspacePort(state);

    port.git(["commit", "--no-verify", "-m", "test commit message"]);
    expect(state.commits.length).toBe(1);
    expect(state.commits[0]!.message).toBe("test commit message");
  });

  test("push records the branch as pushed", () => {
    const state = emptySimulatedState();
    state.branch = "alexa/feature";
    const port = simulatedWorkspacePort(state);

    port.git(["push", "-u", "origin", "alexa/feature"]);
    expect(state.pushed.has("alexa/feature")).toBe(true);
  });

  test("full code-edit cycle: checkout → write → add → commit → push", () => {
    const state = emptySimulatedState();
    const port = simulatedWorkspacePort(state);

    // 1. Create branch
    port.git(["fetch", "origin", "main"]);
    port.git(["checkout", "-B", "alexa/fix-bug", "origin/main"]);
    expect(state.branch).toBe("alexa/fix-bug");

    // 2. Write code
    port.writeFile("src/fix.ts", "export function fix() { return true; }");
    expect(port.exists("src/fix.ts")).toBe(true);

    // 3. Stage + commit
    port.git(["add", "src/fix.ts"]);
    port.git(["commit", "--no-verify", "-m", "fix: the bug"]);
    expect(state.commits.length).toBe(1);

    // 4. Push
    port.git(["push", "-u", "origin", "alexa/fix-bug"]);
    expect(state.pushed.has("alexa/fix-bug")).toBe(true);
  });

  test("exec simulates bun test", () => {
    const port = simulatedWorkspacePort(emptySimulatedState());
    const result = port.exec("bun", ["test", "src/foo.test.ts"]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.exitCode).toBe(0);
    }
  });
});

describe("simulatedWorkspacePort — pre-seeded state", () => {
  test("pre-seeded files are readable immediately", () => {
    const state = emptySimulatedState();
    const port = simulatedWorkspacePort(state);
    port.writeFile("docs/backlog/P1/item.md", "---\nid: B-0170\nzetaid: 081KTEST\n---\n# Item");
    port.writeFile("src/Core.TypeScript/observe/observe.ts", "// the controller");

    const result = port.readFile("docs/backlog/P1/item.md");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toContain("081KTEST");
  });
});

describe("simulatedWorkspacePort — permissions (cross-platform)", () => {
  test("writeFile with executable permissions records them", () => {
    const state = emptySimulatedState();
    const port = simulatedWorkspacePort(state);

    port.writeFile("scripts/run.sh", "#!/bin/bash\necho hi", EXECUTABLE_PERMISSIONS);

    const entry = port.readFileEntry("scripts/run.sh");
    expect(entry.ok).toBe(true);
    if (entry.ok) {
      expect(entry.value.permissions.executable).toBe(true);
    }
  });

  test("default permissions are not executable", () => {
    const state = emptySimulatedState();
    const port = simulatedWorkspacePort(state);

    port.writeFile("src/lib.ts", "export const x = 1;");

    const entry = port.readFileEntry("src/lib.ts");
    expect(entry.ok).toBe(true);
    if (entry.ok) {
      expect(entry.value.permissions.executable).toBe(false);
    }
  });

  test("setPermissions makes a file executable", () => {
    const state = emptySimulatedState();
    const port = simulatedWorkspacePort(state);

    port.writeFile("bin/tool", "#!/usr/bin/env bun\nconsole.log('hi')");
    port.setPermissions("bin/tool", EXECUTABLE_PERMISSIONS);

    const entry = port.readFileEntry("bin/tool");
    expect(entry.ok).toBe(true);
    if (entry.ok) {
      expect(entry.value.permissions.executable).toBe(true);
    }
  });

  test("setPermissions on missing file returns error", () => {
    const port = simulatedWorkspacePort(emptySimulatedState());
    const result = port.setPermissions("nope.sh", EXECUTABLE_PERMISSIONS);
    expect(result.ok).toBe(false);
  });

  test("win32 simulated port still tracks executable (for git mode)", () => {
    const state = emptySimulatedState("win32");
    const port = simulatedWorkspacePort(state);
    expect(port.platform).toBe("win32");

    port.writeFile("script.ps1", "Write-Host hi", EXECUTABLE_PERMISSIONS);
    const entry = port.readFileEntry("script.ps1");
    expect(entry.ok).toBe(true);
    if (entry.ok) {
      // Git tracks the mode even on Windows (100755 in index)
      expect(entry.value.permissions.executable).toBe(true);
    }
  });
});
