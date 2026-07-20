import AsyncStorage from "@react-native-async-storage/async-storage";
import { SoundscapePersistenceAdapter, STORAGE_KEYS, type LocalSettings } from "../contracts/persistenceContractV1";
import { deserializePreferenceProfile, serializePreferenceProfile, type PreferenceProfile, type PreferenceRepository } from "../contracts/preferenceContractV1";

export const appPersistence = new SoundscapePersistenceAdapter(AsyncStorage);
export const preferenceRepository: PreferenceRepository = {
  async load() { return deserializePreferenceProfile(await appPersistence.loadPreferencesRaw()); },
  async save(profile: PreferenceProfile) { await appPersistence.savePreferencesRaw(serializePreferenceProfile(profile)); },
};

export async function commitImportedLocalSnapshotV1(input: {
  localStateRaw: string;
  savedSoundIds: readonly string[];
  recentSoundIds: readonly string[];
  settings: LocalSettings;
  preferencesRaw: string;
  savedSessionsRaw: string;
  offlineManifestRaw: string;
}): Promise<void> {
  await AsyncStorage.multiSet([
    [STORAGE_KEYS.localState, input.localStateRaw],
    [STORAGE_KEYS.savedSoundIds, JSON.stringify(input.savedSoundIds)],
    [STORAGE_KEYS.recentSoundIds, JSON.stringify(input.recentSoundIds)],
    [STORAGE_KEYS.settings, JSON.stringify(input.settings)],
    [STORAGE_KEYS.preferences, input.preferencesRaw],
    [STORAGE_KEYS.savedSessions, input.savedSessionsRaw],
    [STORAGE_KEYS.offlineManifest, input.offlineManifestRaw],
  ]);
}

export async function resetSupportedLocalDataV1(): Promise<void> {
  await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
}
