export const PERSISTENCE_CONTRACT_VERSION = "1" as const;
export const STORAGE_KEYS = Object.freeze({
  savedSoundIds: "soundscape-mobile:saved-sound-ids:v1",
  recentSoundIds: "soundscape-mobile:recent-sound-ids:v1",
  onboardingComplete: "soundscape-mobile:onboarding-v1-complete",
  settings: "soundscape-mobile:settings:v1",
  preferences: "soundscape-mobile:preference-feedback-v1",
  savedSessions: "soundscape-mobile:saved-sessions:v1",
  localProfileSeed: "soundscape-mobile:local-profile-seed:v1",
  localState: "soundscape-mobile:local-state:v1",
  offlineManifest: "soundscape-mobile:offline-manifest:v1",
});

export type MobileSectionKey = "fast-start" | "presets" | "player" | "browse";
export type LocalSettings = { defaultTimerMinutes: 0 | 5 | 15 | 30 | 60; startTabKey: MobileSectionKey };
export const DEFAULT_LOCAL_SETTINGS: LocalSettings = { defaultTimerMinutes: 0, startTabKey: "fast-start" };
export type StoragePort = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void>; removeItem(key: string): Promise<void> };

export class SoundscapePersistenceAdapter {
  readonly contractVersion = PERSISTENCE_CONTRACT_VERSION;
  constructor(readonly storage: StoragePort) {}

  async loadSoundIds(kind: "saved" | "recent"): Promise<string[]> {
    const raw = await this.storage.getItem(kind === "saved" ? STORAGE_KEYS.savedSoundIds : STORAGE_KEYS.recentSoundIds);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? [...new Set(parsed.filter((id): id is string => typeof id === "string" && id.length > 0))] : [];
    } catch { return []; }
  }
  saveSoundIds(kind: "saved" | "recent", ids: readonly string[]): Promise<void> {
    const normalized = [...new Set(ids.filter((id) => typeof id === "string" && id.length > 0))];
    return this.storage.setItem(kind === "saved" ? STORAGE_KEYS.savedSoundIds : STORAGE_KEYS.recentSoundIds, JSON.stringify(normalized));
  }
  async loadSettings(): Promise<LocalSettings> {
    const raw = await this.storage.getItem(STORAGE_KEYS.settings);
    if (!raw) return { ...DEFAULT_LOCAL_SETTINGS };
    try {
      const parsed = JSON.parse(raw);
      const timer = [0, 5, 15, 30, 60].includes(parsed?.defaultTimerMinutes) ? parsed.defaultTimerMinutes : 0;
      const tab = ["fast-start", "presets", "player", "browse"].includes(parsed?.startTabKey) ? parsed.startTabKey : "fast-start";
      return { defaultTimerMinutes: timer, startTabKey: tab } as LocalSettings;
    } catch { return { ...DEFAULT_LOCAL_SETTINGS }; }
  }
  saveSettings(settings: LocalSettings): Promise<void> { return this.storage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings)); }
  async loadOnboardingComplete(): Promise<boolean> { return (await this.storage.getItem(STORAGE_KEYS.onboardingComplete)) === "true"; }
  saveOnboardingComplete(): Promise<void> { return this.storage.setItem(STORAGE_KEYS.onboardingComplete, "true"); }
  clearOnboardingComplete(): Promise<void> { return this.storage.removeItem(STORAGE_KEYS.onboardingComplete); }
  loadPreferencesRaw(): Promise<string | null> { return this.storage.getItem(STORAGE_KEYS.preferences); }
  savePreferencesRaw(raw: string): Promise<void> { return this.storage.setItem(STORAGE_KEYS.preferences, raw); }
  loadLocalProfileSeed(): Promise<string | null> { return this.storage.getItem(STORAGE_KEYS.localProfileSeed); }
  saveLocalProfileSeed(seed: string): Promise<void> { return this.storage.setItem(STORAGE_KEYS.localProfileSeed, seed); }
  loadLocalStateRaw(): Promise<string | null> { return this.storage.getItem(STORAGE_KEYS.localState); }
  saveLocalStateRaw(raw: string): Promise<void> { return this.storage.setItem(STORAGE_KEYS.localState, raw); }
  loadOfflineManifestRaw(): Promise<string | null> { return this.storage.getItem(STORAGE_KEYS.offlineManifest); }
  saveOfflineManifestRaw(raw: string): Promise<void> { return this.storage.setItem(STORAGE_KEYS.offlineManifest, raw); }
  async resetSupportedLocalData(): Promise<void> {
    await Promise.all(Object.values(STORAGE_KEYS).map((key) => this.storage.removeItem(key)));
  }
}
