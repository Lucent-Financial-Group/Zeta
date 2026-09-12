/**
 * synced-folder.test.ts — a warning that is right about the common cases and quiet otherwise.
 *
 * The cost of a false positive here is a confusing line in a log; the cost of a false negative is
 * an organization quietly paying sync traffic on every git command it runs. Both are cheap enough
 * that the matching stays simple and legible rather than clever.
 */

import { describe, expect, test } from "bun:test";
import { syncedFolderWarnings, syncedUnder } from "./synced-folder";

describe("WHERE THE ORGANIZATION WORKS, AND WHETHER SOMETHING IS WATCHING IT", () => {
  test("a tenant-named OneDrive folder is recognised - which is the shape it actually takes", () => {
    expect(syncedUnder("C:/Users/someone/OneDrive - Toshiba TEC/Desktop/Work/Zeta")).toBe("OneDrive - Toshiba TEC");
    const winPath = ["C:", "Users", "someone", "OneDrive", "Work", "repo"].join(String.fromCharCode(92));
    expect(syncedUnder(winPath)).toBe("OneDrive");
  });

  test("the other common clients too, on either separator", () => {
    expect(syncedUnder("/Users/someone/Dropbox/code/repo")).toBe("Dropbox");
    expect(syncedUnder("/Users/someone/Google Drive/repo")).toBe("Google Drive");
    expect(syncedUnder("C:/Users/someone/Box Sync/repo")).toBe("Box Sync");
  });

  test("a path that merely mentions one is not one", () => {
    // The segment must BE the folder. A repository called `onedrive-exporter` is not synced.
    expect(syncedUnder("/home/someone/src/onedrive-exporter")).toBeUndefined();
    expect(syncedUnder("/home/someone/notes/dropbox-migration.md")).toBeUndefined();
    expect(syncedUnder("/var/lib/org/store")).toBeUndefined();
  });

  test("nothing to say about nothing", () => {
    expect(syncedUnder("")).toBeUndefined();
    expect(syncedUnder("   ")).toBeUndefined();
    expect(syncedUnder(undefined as unknown as string)).toBeUndefined();
  });

  test("each watched place is named once, with its path, and unwatched ones say nothing", () => {
    const said = syncedFolderWarnings({
      "the store": "/var/lib/org/store",
      "the checkout": "C:/Users/x/OneDrive - Acme/Work/repo",
      "the worktrees": undefined,
    });
    expect(said.length).toBe(1);
    expect(said[0]).toContain("the checkout");
    expect(said[0]).toContain("OneDrive - Acme");
    expect(said[0]).toContain("upload traffic");
  });

  test("an organization working entirely outside a sync folder is told nothing at all", () => {
    expect(syncedFolderWarnings({ "the store": "/var/lib/org", "the checkout": "/srv/src/repo" })).toEqual([]);
  });
});
