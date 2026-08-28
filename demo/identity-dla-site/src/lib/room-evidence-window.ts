/**
 * Room evidence window — Dark Matter Observatory navigation primitive.
 * Windows preserve manifest order only. They do not impose causal order, authority,
 * or a verdict on entries outside the selected finite display range.
 */
export const ROOM_EVIDENCE_WINDOW_SIZE = 8;

export type RoomEvidenceWindow<T> = {
  readonly entries: readonly T[];
  readonly start: number;
  readonly end: number;
  readonly total: number;
  readonly hasPrevious: boolean;
  readonly hasNext: boolean;
};

export function selectRoomEvidenceWindow<T>(entries: readonly T[], requestedOffset: number): RoomEvidenceWindow<T> {
  const total = entries.length;
  if (total === 0) return { entries: [], start: 0, end: 0, total, hasPrevious: false, hasNext: false };
  const finiteOffset = Number.isSafeInteger(requestedOffset) && requestedOffset > 0 ? requestedOffset : 0;
  const cappedOffset = Math.min(finiteOffset, total - 1);
  const start = Math.floor(cappedOffset / ROOM_EVIDENCE_WINDOW_SIZE) * ROOM_EVIDENCE_WINDOW_SIZE;
  const end = Math.min(start + ROOM_EVIDENCE_WINDOW_SIZE, total);
  return { entries: entries.slice(start, end), start, end, total, hasPrevious: start > 0, hasNext: end < total };
}
