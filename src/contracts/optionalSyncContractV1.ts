export const OPTIONAL_SYNC_CONTRACT_VERSION = 1 as const;
export type SyncRevisionV1 = Readonly<{ counter: number; clientId: string }>;
export type SyncRecordKindV1 = "preference" | "feedback" | "saved-session" | "builder-session" | "profile";
export type SyncRecordV1 = Readonly<{ id: string; kind: SyncRecordKindV1; revision: SyncRevisionV1; tombstone: boolean; payload: unknown }>;
export type OptionalSyncEnvelopeV1 = Readonly<{
  schemaVersion: typeof OPTIONAL_SYNC_CONTRACT_VERSION;
  provider: "disabled" | string;
  profileId: string;
  clientId: string;
  clientRevision: number;
  records: readonly SyncRecordV1[];
}>;
export type SyncMergeOutcomeV1 = Readonly<{ id: string; category: "identical-collapsed" | "independent-merged" | "newer-revision-won" | "tombstone-won" | "saved-session-conflict-preserved" }>;
const compareRevision = (a: SyncRevisionV1, b: SyncRevisionV1) => a.counter - b.counter || a.clientId.localeCompare(b.clientId);
const sameRecord = (a: SyncRecordV1, b: SyncRecordV1) => JSON.stringify(a) === JSON.stringify(b);
const conflictId = (record: SyncRecordV1) => `${record.id}:conflict:${record.revision.counter}:${record.revision.clientId}`;

export function mergeOptionalSyncEnvelopesV1(a: OptionalSyncEnvelopeV1, b: OptionalSyncEnvelopeV1): Readonly<{
  schemaVersion: 1; provider: "disabled"; profileId: string; clientId: string; clientRevision: number;
  records: readonly SyncRecordV1[]; outcomes: readonly SyncMergeOutcomeV1[]; remoteSyncEnabled: false;
}> {
  if (a.schemaVersion !== 1 || b.schemaVersion !== 1 || a.profileId !== b.profileId) throw new Error("Incompatible optional-sync envelope.");
  const byId = new Map<string, [SyncRecordV1 | undefined, SyncRecordV1 | undefined]>();
  for (const record of a.records) byId.set(record.id, [record, byId.get(record.id)?.[1]]);
  for (const record of b.records) byId.set(record.id, [byId.get(record.id)?.[0], record]);
  const records: SyncRecordV1[] = [];
  const outcomes: SyncMergeOutcomeV1[] = [];
  for (const id of [...byId.keys()].sort()) {
    const [left, right] = byId.get(id)!;
    if (!left || !right) {
      records.push((left ?? right)!);
      outcomes.push(Object.freeze({ id, category: "independent-merged" }));
      continue;
    }
    if (sameRecord(left, right)) {
      records.push(left);
      outcomes.push(Object.freeze({ id, category: "identical-collapsed" }));
      continue;
    }
    const comparison = compareRevision(left.revision, right.revision);
    if (left.tombstone !== right.tombstone && left.revision.counter !== right.revision.counter) {
      const newer = left.revision.counter > right.revision.counter ? left : right;
      records.push(newer);
      outcomes.push(Object.freeze({ id, category: newer.tombstone ? "tombstone-won" : "newer-revision-won" }));
      continue;
    }
    if (left.kind === "saved-session" && right.kind === "saved-session" && left.revision.counter === right.revision.counter && left.revision.clientId !== right.revision.clientId) {
      records.push(Object.freeze({ ...left, id: conflictId(left) }), Object.freeze({ ...right, id: conflictId(right) }));
      outcomes.push(Object.freeze({ id, category: "saved-session-conflict-preserved" }));
      continue;
    }
    const newer = comparison >= 0 ? left : right;
    records.push(newer);
    outcomes.push(Object.freeze({ id, category: newer.tombstone ? "tombstone-won" : "newer-revision-won" }));
  }
  return Object.freeze({
    schemaVersion: 1,
    provider: "disabled",
    profileId: a.profileId,
    clientId: [a.clientId, b.clientId].sort().join("+"),
    clientRevision: Math.max(a.clientRevision, b.clientRevision),
    records: Object.freeze(records.sort((x, y) => x.id.localeCompare(y.id))),
    outcomes: Object.freeze(outcomes),
    remoteSyncEnabled: false,
  });
}
