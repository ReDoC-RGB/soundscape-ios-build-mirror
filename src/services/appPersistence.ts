import AsyncStorage from "@react-native-async-storage/async-storage";
import { SoundscapePersistenceAdapter, STORAGE_KEYS, type LocalSettings, type StoragePort } from "../contracts/persistenceContractV1";
import { deserializePreferenceProfile, serializePreferenceProfile, type PreferenceProfile, type PreferenceRepository } from "../contracts/preferenceContractV1";
import {
  IMPORTED_LOCAL_SNAPSHOT_JOURNAL_KEY_V1,
  IMPORTED_LOCAL_SNAPSHOT_TARGETS_V1,
  commitImportedLocalSnapshotTransactionV1,
  recoverInterruptedLocalSnapshotCommitV1,
  type ImportedLocalSnapshotV1,
} from "./importedLocalSnapshotTransactionV1";

let importedSnapshotRecoveryPromiseV1: Promise<Readonly<{ recovered: boolean; transactionId?: string }>> | null = null;
let importedSnapshotTransactionCounterV1 = 0;
let importedSnapshotCommitQueueV1: Promise<void> = Promise.resolve();

export function ensureImportedLocalSnapshotRecoveryV1(): Promise<Readonly<{ recovered: boolean; transactionId?: string }>> {
  if (!importedSnapshotRecoveryPromiseV1) {
    importedSnapshotRecoveryPromiseV1 = recoverInterruptedLocalSnapshotCommitV1(AsyncStorage).catch((error) => {
      importedSnapshotRecoveryPromiseV1 = null;
      throw error;
    });
  }
  return importedSnapshotRecoveryPromiseV1;
}

export function createRecoveryGatedStorageV1(storage: StoragePort): StoragePort {
  return Object.freeze({
    async getItem(key: string) {
      await importedSnapshotCommitQueueV1;
      await ensureImportedLocalSnapshotRecoveryV1();
      return storage.getItem(key);
    },
    async setItem(key: string, value: string) {
      await importedSnapshotCommitQueueV1;
      await ensureImportedLocalSnapshotRecoveryV1();
      await storage.setItem(key, value);
    },
    async removeItem(key: string) {
      await importedSnapshotCommitQueueV1;
      await ensureImportedLocalSnapshotRecoveryV1();
      await storage.removeItem(key);
    },
  });
}

const recoveryGatedStorageV1 = createRecoveryGatedStorageV1(AsyncStorage);
export const appPersistence = new SoundscapePersistenceAdapter(recoveryGatedStorageV1);
export const preferenceRepository: PreferenceRepository = {
  async load() { return deserializePreferenceProfile(await appPersistence.loadPreferencesRaw()); },
  async save(profile: PreferenceProfile) { await appPersistence.savePreferencesRaw(serializePreferenceProfile(profile)); },
};

export async function commitImportedLocalSnapshotV1(
  input: ImportedLocalSnapshotV1 & { settings: LocalSettings },
  options: Readonly<{ isCurrent?: () => boolean }> = {},
): Promise<void> {
  const operation = importedSnapshotCommitQueueV1.then(async () => {
    await ensureImportedLocalSnapshotRecoveryV1();
    importedSnapshotTransactionCounterV1 += 1;
    try {
      await commitImportedLocalSnapshotTransactionV1(AsyncStorage, input, {
        transactionId: `import-${Date.now().toString(36)}-${importedSnapshotTransactionCounterV1.toString(36)}`,
        isCurrent: options.isCurrent,
      });
    } catch (error) {
      importedSnapshotRecoveryPromiseV1 = null;
      throw error;
    }
  });
  importedSnapshotCommitQueueV1 = operation.catch(() => undefined);
  return operation;
}

export async function resetSupportedLocalDataV1(): Promise<void> {
  await importedSnapshotCommitQueueV1;
  await ensureImportedLocalSnapshotRecoveryV1();
  await AsyncStorage.multiRemove([
    ...new Set([
      ...Object.values(STORAGE_KEYS),
      ...IMPORTED_LOCAL_SNAPSHOT_TARGETS_V1.map(({ key }) => key),
      IMPORTED_LOCAL_SNAPSHOT_JOURNAL_KEY_V1,
    ]),
  ]);
}
