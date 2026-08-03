export const IMPORTED_LOCAL_SNAPSHOT_TRANSACTION_SCHEMA_V1 = 1 as const;
export const IMPORTED_LOCAL_SNAPSHOT_JOURNAL_KEY_V1 = "soundscape-mobile:imported-local-snapshot-transaction:v1";

export type ImportedLocalSnapshotV1 = Readonly<{
  localStateRaw: string;
  savedSoundIds: readonly string[];
  recentSoundIds: readonly string[];
  settings: unknown;
  preferencesRaw: string;
  savedSessionsRaw: string;
  offlineManifestRaw: string;
  directedCheckpointRaw: string | null;
  directedSavedPathsRaw: string;
  directedFeedbackRaw: string;
}>;

export type ImportedLocalSnapshotStorageV1 = Readonly<{
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}>;

export const IMPORTED_LOCAL_SNAPSHOT_TARGETS_V1 = Object.freeze([
  { field: "localStateRaw", key: "soundscape-mobile:local-state:v1" },
  { field: "savedSoundIds", key: "soundscape-mobile:saved-sound-ids:v1" },
  { field: "recentSoundIds", key: "soundscape-mobile:recent-sound-ids:v1" },
  { field: "settings", key: "soundscape-mobile:settings:v1" },
  { field: "preferencesRaw", key: "soundscape-mobile:preference-feedback-v1" },
  { field: "savedSessionsRaw", key: "soundscape-mobile:saved-sessions:v1" },
  { field: "offlineManifestRaw", key: "soundscape-mobile:offline-manifest:v1" },
  { field: "directedCheckpointRaw", key: "soundscape-mobile:directed-session-state:v1" },
  { field: "directedSavedPathsRaw", key: "soundscape-mobile:directed-saved-paths:v1" },
  { field: "directedFeedbackRaw", key: "soundscape-mobile:directed-feedback:v1" },
] as const);

type SnapshotTargetV1 = typeof IMPORTED_LOCAL_SNAPSHOT_TARGETS_V1[number];
type SnapshotTargetKeyV1 = SnapshotTargetV1["key"];
type PriorGoodSnapshotV1 = Readonly<Record<SnapshotTargetKeyV1, string | null>>;

export type ImportedLocalSnapshotJournalV1 = Readonly<{
  schemaVersion: typeof IMPORTED_LOCAL_SNAPSHOT_TRANSACTION_SCHEMA_V1;
  transactionId: string;
  state: "prepared";
  previous: PriorGoodSnapshotV1;
  candidateSha256: string;
}>;

const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
};

const stableHashV1 = (value: string): string => {
  let first = 2166136261;
  let second = 2246822519;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first = Math.imul(first ^ code, 16777619) >>> 0;
    second = Math.imul(second ^ code, 3266489917) >>> 0;
  }
  return `${first.toString(16).padStart(8, "0")}${second.toString(16).padStart(8, "0")}`;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const requireTransactionId = (value: string): string => {
  const normalized = value.trim();
  if (!/^[a-z0-9][a-z0-9._:-]{0,159}$/i.test(normalized)) throw new Error("Invalid imported snapshot transaction identity.");
  return normalized;
};

export function serializeImportedLocalSnapshotV1(input: ImportedLocalSnapshotV1): Record<SnapshotTargetKeyV1, string | null> {
  if (
    typeof input.localStateRaw !== "string"
    || typeof input.preferencesRaw !== "string"
    || typeof input.savedSessionsRaw !== "string"
    || typeof input.offlineManifestRaw !== "string"
    || (input.directedCheckpointRaw !== null && typeof input.directedCheckpointRaw !== "string")
    || typeof input.directedSavedPathsRaw !== "string"
    || typeof input.directedFeedbackRaw !== "string"
  ) {
    throw new Error("Imported local snapshot contains an invalid serialized domain.");
  }
  if (!Array.isArray(input.savedSoundIds) || !Array.isArray(input.recentSoundIds)) {
    throw new Error("Imported local snapshot contains invalid sound identity lists.");
  }
  const serialized = {
    "soundscape-mobile:local-state:v1": input.localStateRaw,
    "soundscape-mobile:saved-sound-ids:v1": JSON.stringify(input.savedSoundIds),
    "soundscape-mobile:recent-sound-ids:v1": JSON.stringify(input.recentSoundIds),
    "soundscape-mobile:settings:v1": JSON.stringify(input.settings),
    "soundscape-mobile:preference-feedback-v1": input.preferencesRaw,
    "soundscape-mobile:saved-sessions:v1": input.savedSessionsRaw,
    "soundscape-mobile:offline-manifest:v1": input.offlineManifestRaw,
    "soundscape-mobile:directed-session-state:v1": input.directedCheckpointRaw,
    "soundscape-mobile:directed-saved-paths:v1": input.directedSavedPathsRaw,
    "soundscape-mobile:directed-feedback:v1": input.directedFeedbackRaw,
  } as const;
  return serialized;
}

export function createImportedLocalSnapshotJournalV1(
  previous: PriorGoodSnapshotV1,
  candidate: ImportedLocalSnapshotV1,
  transactionId: string,
): ImportedLocalSnapshotJournalV1 {
  const normalizedPrevious = {} as Record<SnapshotTargetKeyV1, string | null>;
  for (const { key } of IMPORTED_LOCAL_SNAPSHOT_TARGETS_V1) {
    const value = previous[key];
    if (value !== null && typeof value !== "string") throw new Error(`Invalid prior-good value for ${key}.`);
    normalizedPrevious[key] = value;
  }
  const candidateSerialized = serializeImportedLocalSnapshotV1(candidate);
  return Object.freeze({
    schemaVersion: IMPORTED_LOCAL_SNAPSHOT_TRANSACTION_SCHEMA_V1,
    transactionId: requireTransactionId(transactionId),
    state: "prepared",
    previous: Object.freeze(normalizedPrevious),
    candidateSha256: stableHashV1(stableStringify(candidateSerialized)),
  });
}

function parseJournalV1(raw: string): ImportedLocalSnapshotJournalV1 {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Imported snapshot recovery journal is corrupt; prior-good data was left untouched.");
  }
  if (!isRecord(parsed) || parsed.schemaVersion !== 1 || parsed.state !== "prepared" || !isRecord(parsed.previous)) {
    throw new Error("Imported snapshot recovery journal is incompatible; prior-good data was left untouched.");
  }
  const transactionId = requireTransactionId(String(parsed.transactionId ?? ""));
  if (typeof parsed.candidateSha256 !== "string" || !/^[a-f0-9]{16}$/.test(parsed.candidateSha256)) {
    throw new Error("Imported snapshot recovery journal identity is invalid; prior-good data was left untouched.");
  }
  const previous = {} as Record<SnapshotTargetKeyV1, string | null>;
  for (const { key } of IMPORTED_LOCAL_SNAPSHOT_TARGETS_V1) {
    const value = parsed.previous[key];
    if (value !== null && typeof value !== "string") throw new Error(`Imported snapshot recovery journal has an invalid prior-good value for ${key}.`);
    previous[key] = value;
  }
  return Object.freeze({
    schemaVersion: 1,
    transactionId,
    state: "prepared",
    previous: Object.freeze(previous),
    candidateSha256: parsed.candidateSha256,
  });
}

async function readPriorGoodSnapshotV1(storage: ImportedLocalSnapshotStorageV1): Promise<PriorGoodSnapshotV1> {
  const values = await Promise.all(IMPORTED_LOCAL_SNAPSHOT_TARGETS_V1.map(({ key }) => storage.getItem(key)));
  return Object.freeze(Object.fromEntries(IMPORTED_LOCAL_SNAPSHOT_TARGETS_V1.map(({ key }, index) => [key, values[index]])) as Record<SnapshotTargetKeyV1, string | null>);
}

async function restorePriorGoodSnapshotV1(storage: ImportedLocalSnapshotStorageV1, previous: PriorGoodSnapshotV1): Promise<void> {
  for (const { key } of IMPORTED_LOCAL_SNAPSHOT_TARGETS_V1) {
    const value = previous[key];
    if (value === null) await storage.removeItem(key);
    else await storage.setItem(key, value);
  }
}

export async function recoverInterruptedLocalSnapshotCommitV1(
  storage: ImportedLocalSnapshotStorageV1,
): Promise<Readonly<{ recovered: boolean; transactionId?: string }>> {
  const raw = await storage.getItem(IMPORTED_LOCAL_SNAPSHOT_JOURNAL_KEY_V1);
  if (raw === null) return Object.freeze({ recovered: false });
  const journal = parseJournalV1(raw);
  await restorePriorGoodSnapshotV1(storage, journal.previous);
  await storage.removeItem(IMPORTED_LOCAL_SNAPSHOT_JOURNAL_KEY_V1);
  return Object.freeze({ recovered: true, transactionId: journal.transactionId });
}

export async function commitImportedLocalSnapshotTransactionV1(
  storage: ImportedLocalSnapshotStorageV1,
  input: ImportedLocalSnapshotV1,
  options: Readonly<{ transactionId: string; isCurrent?: () => boolean }>,
): Promise<void> {
  const assertCurrent = () => {
    if (options.isCurrent && !options.isCurrent()) {
      throw new Error("Classic playback authority changed during imported snapshot commit; prior-good data was restored.");
    }
  };
  assertCurrent();
  await recoverInterruptedLocalSnapshotCommitV1(storage);
  assertCurrent();
  const previous = await readPriorGoodSnapshotV1(storage);
  assertCurrent();
  const candidate = serializeImportedLocalSnapshotV1(input);
  const journal = createImportedLocalSnapshotJournalV1(previous, input, options.transactionId);
  await storage.setItem(IMPORTED_LOCAL_SNAPSHOT_JOURNAL_KEY_V1, JSON.stringify(journal));
  try {
    assertCurrent();
    for (const { key } of IMPORTED_LOCAL_SNAPSHOT_TARGETS_V1) {
      const value = candidate[key];
      if (value === null) await storage.removeItem(key);
      else await storage.setItem(key, value);
      assertCurrent();
    }
    assertCurrent();
    await storage.removeItem(IMPORTED_LOCAL_SNAPSHOT_JOURNAL_KEY_V1);
    assertCurrent();
  } catch (error) {
    try {
      await restorePriorGoodSnapshotV1(storage, previous);
      await storage.removeItem(IMPORTED_LOCAL_SNAPSHOT_JOURNAL_KEY_V1);
    } catch (rollbackError) {
      throw new Error(`Imported snapshot commit failed and durable recovery remains pending: ${String(error)}; rollback: ${String(rollbackError)}`);
    }
    throw error;
  }
}
