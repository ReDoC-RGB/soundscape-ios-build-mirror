export const LOCAL_PROFILE_SCHEMA_VERSION = 1 as const;
export const LOCAL_STATE_SCHEMA_VERSION = 1 as const;

export type LocalProfileIdentityV1 = Readonly<{
  schemaVersion: typeof LOCAL_PROFILE_SCHEMA_VERSION;
  id: `local-profile:${string}`;
  kind: "anonymous-local";
  revision: number;
  createdAt: string;
  updatedAt: string;
}>;

export type LocalStateDataV1 = Readonly<{
  savedSoundIds: readonly string[];
  recentSoundIds: readonly string[];
  settings: unknown;
  preferencesRaw: string | null;
  savedSessionsRaw: string | null;
  currentSessionRaw: string | null;
  catalogRevision: string | null;
  offlineManifest: readonly unknown[];
}>;

export type LocalStateEnvelopeV1 = Readonly<{
  schemaVersion: typeof LOCAL_STATE_SCHEMA_VERSION;
  profile: LocalProfileIdentityV1;
  data: LocalStateDataV1;
  requiresSignIn: false;
  corruptionRecovered: boolean;
  migrationWarnings: readonly string[];
}>;

type LegacyLocalState = Partial<{
  savedSoundIds: unknown;
  recentSoundIds: unknown;
  settings: unknown;
  preferencesRaw: unknown;
  savedSessionsRaw: unknown;
  currentSessionRaw: unknown;
  catalogRevision: unknown;
  offlineManifest: unknown;
}>;

const normalizeNow = (value: string): string => {
  const millis = Date.parse(value);
  return Number.isFinite(millis) ? new Date(millis).toISOString() : new Date(0).toISOString();
};
const stableSeedHash = (seed: string): string => {
  let hash = 2166136261;
  for (const byte of new TextEncoder().encode(seed)) {
    hash ^= byte;
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
};
const normalizeIds = (value: unknown): string[] => Array.isArray(value)
  ? [...new Set(value.filter((id): id is string => typeof id === "string" && id.trim().length > 0).map((id) => id.trim().slice(0, 160)))]
  : [];
const nullableString = (value: unknown): string | null => typeof value === "string" ? value : null;
const makeProfile = (seed: string, now: string): LocalProfileIdentityV1 => Object.freeze({
  schemaVersion: LOCAL_PROFILE_SCHEMA_VERSION,
  id: `local-profile:${stableSeedHash(seed.trim() || "soundscape-local")}`,
  kind: "anonymous-local",
  revision: 1,
  createdAt: normalizeNow(now),
  updatedAt: normalizeNow(now),
});

export function migrateLocalStateV1(input: { legacy: LegacyLocalState; seed: string; now: string }): LocalStateEnvelopeV1 {
  const legacy = input.legacy ?? {};
  const warnings: string[] = [];
  if (legacy.savedSoundIds !== undefined && !Array.isArray(legacy.savedSoundIds)) warnings.push("Invalid Saved list was ignored.");
  if (legacy.recentSoundIds !== undefined && !Array.isArray(legacy.recentSoundIds)) warnings.push("Invalid Recent list was ignored.");
  const offlineManifest = Array.isArray(legacy.offlineManifest) ? legacy.offlineManifest : [];
  return Object.freeze({
    schemaVersion: LOCAL_STATE_SCHEMA_VERSION,
    profile: makeProfile(input.seed, input.now),
    data: Object.freeze({
      savedSoundIds: Object.freeze(normalizeIds(legacy.savedSoundIds)),
      recentSoundIds: Object.freeze(normalizeIds(legacy.recentSoundIds)),
      settings: legacy.settings ?? null,
      preferencesRaw: nullableString(legacy.preferencesRaw),
      savedSessionsRaw: nullableString(legacy.savedSessionsRaw),
      currentSessionRaw: nullableString(legacy.currentSessionRaw),
      catalogRevision: nullableString(legacy.catalogRevision),
      offlineManifest: Object.freeze([...offlineManifest]),
    }),
    requiresSignIn: false,
    corruptionRecovered: false,
    migrationWarnings: Object.freeze(warnings),
  });
}

export function readLocalStateRollbackSafe(raw: string | null, fallback: { seed: string; now: string }): LocalStateEnvelopeV1 {
  const empty = migrateLocalStateV1({ legacy: {}, ...fallback });
  if (!raw) return empty;
  try {
    const parsed = JSON.parse(raw) as Partial<LocalStateEnvelopeV1>;
    if (parsed.schemaVersion !== LOCAL_STATE_SCHEMA_VERSION || parsed.profile?.schemaVersion !== LOCAL_PROFILE_SCHEMA_VERSION || parsed.profile.kind !== "anonymous-local" || !parsed.data) {
      throw new Error("unsupported local state schema");
    }
    const migrated = migrateLocalStateV1({ legacy: parsed.data as LegacyLocalState, ...fallback });
    return Object.freeze({
      ...migrated,
      profile: Object.freeze({
        ...migrated.profile,
        id: typeof parsed.profile.id === "string" && /^local-profile:[a-z0-9-]+$/i.test(parsed.profile.id) ? parsed.profile.id : migrated.profile.id,
        revision: Number.isSafeInteger(parsed.profile.revision) && parsed.profile.revision! > 0 ? parsed.profile.revision! : 1,
        createdAt: normalizeNow(parsed.profile.createdAt ?? fallback.now),
        updatedAt: normalizeNow(parsed.profile.updatedAt ?? fallback.now),
      }),
    });
  } catch {
    return Object.freeze({ ...empty, corruptionRecovered: true, migrationWarnings: Object.freeze(["Corrupt or incompatible local state was ignored without overwriting stored bytes."]) });
  }
}

export const serializeLocalStateV1 = (state: LocalStateEnvelopeV1): string => JSON.stringify(state);
