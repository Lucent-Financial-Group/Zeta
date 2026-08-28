import { describe, expect, test } from "bun:test";
import { ROOM_EVIDENCE_WINDOW_SIZE, selectRoomEvidenceWindow } from "./room-evidence-window";

describe("bounded room-evidence window", () => {
  const entries = Array.from({ length: 10 }, (_, index) => `entry-${String(index)}`);

  test("preserves manifest order in the initial finite window without calling it causal order", () => {
    const window = selectRoomEvidenceWindow(entries, 0);
    expect(ROOM_EVIDENCE_WINDOW_SIZE).toBe(8);
    expect(window).toEqual({ entries: entries.slice(0, 8), start: 0, end: 8, total: 10, hasPrevious: false, hasNext: true });
  });

  test("exposes a final partial window only through a next-window offset", () => {
    const window = selectRoomEvidenceWindow(entries, 8);
    expect(window).toEqual({ entries: entries.slice(8, 10), start: 8, end: 10, total: 10, hasPrevious: true, hasNext: false });
  });

  test("fault injection: malformed, negative, and excessive offsets cannot manufacture an out-of-range entry", () => {
    expect(selectRoomEvidenceWindow(entries, -4).entries).toEqual(entries.slice(0, 8));
    expect(selectRoomEvidenceWindow(entries, Number.NaN).entries).toEqual(entries.slice(0, 8));
    expect(selectRoomEvidenceWindow(entries, 99)).toEqual({ entries: entries.slice(8, 10), start: 8, end: 10, total: 10, hasPrevious: true, hasNext: false });
  });

  test("an empty manifest has an explicit empty range and no invented navigation", () => {
    expect(selectRoomEvidenceWindow<string>([], 0)).toEqual({ entries: [], start: 0, end: 0, total: 0, hasPrevious: false, hasNext: false });
  });
});
