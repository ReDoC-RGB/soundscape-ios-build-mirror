export const PREFERENCE_CONTRACT_VERSION = "1" as const;

export type PreferenceProfile = {
  likedSoundIds: string[];
  dislikedSoundIds: string[];
  avoidedSoundIds: string[];
  likedRecipeFingerprints: string[];
  dislikedRecipeFingerprints: string[];
  tagBoosts: string[];
  tagAvoids: string[];
  updatedAt: string | null;
  revision: number;
};
export type StoredPreferenceProfile = Omit<PreferenceProfile, "revision">;

export type FeedbackTarget =
  | { kind: "sound"; id: string }
  | { kind: "recipe"; id: string }
  | { kind: "trait"; id: string };
export type FeedbackAction = "up" | "down" | "avoid" | "boost" | "reduce";
export type FeedbackState = "neutral" | "up" | "down" | "active";
export type FeedbackEvent = Readonly<{
  id: string;
  revision: number;
  timestamp: string;
  sourceSurface: "Fast" | "Builder" | "Browse" | "Player" | "Mini Player" | "Saved";
  action: FeedbackAction;
  state: FeedbackState;
  target: FeedbackTarget;
  resultId?: string;
}>;

export interface PreferenceRepository {
  load(): Promise<PreferenceProfile>;
  save(profile: PreferenceProfile, revision: number): Promise<void>;
}

export const createDefaultPreferenceProfile = (): PreferenceProfile => ({
  likedSoundIds: [], dislikedSoundIds: [], avoidedSoundIds: [],
  likedRecipeFingerprints: [], dislikedRecipeFingerprints: [],
  tagBoosts: [], tagAvoids: [], updatedAt: null, revision: 0,
});
export const DEFAULT_STORED_PREFERENCE_PROFILE: StoredPreferenceProfile = (() => {
  const { revision: _revision, ...stored } = createDefaultPreferenceProfile();
  return stored;
})();

const unique = (values: readonly string[]) => [...new Set(values.filter((value) => typeof value === "string" && value.length > 0))];
const without = (values: readonly string[], id: string) => values.filter((value) => value !== id);
const withId = (values: readonly string[], id: string) => unique([...values, id]);

export function applyFeedbackEvent(profile: PreferenceProfile, event: FeedbackEvent): PreferenceProfile {
  if (event.revision < profile.revision) return profile;
  const next: PreferenceProfile = { ...profile, revision: event.revision, updatedAt: event.timestamp };
  const id = event.target.id;
  if (event.target.kind === "sound" && (event.action === "up" || event.action === "down")) {
    next.likedSoundIds = event.state === "up" ? withId(profile.likedSoundIds, id) : without(profile.likedSoundIds, id);
    next.dislikedSoundIds = event.state === "down" ? withId(profile.dislikedSoundIds, id) : without(profile.dislikedSoundIds, id);
  } else if (event.target.kind === "recipe" && (event.action === "up" || event.action === "down")) {
    next.likedRecipeFingerprints = event.state === "up" ? withId(profile.likedRecipeFingerprints, id) : without(profile.likedRecipeFingerprints, id);
    next.dislikedRecipeFingerprints = event.state === "down" ? withId(profile.dislikedRecipeFingerprints, id) : without(profile.dislikedRecipeFingerprints, id);
  } else if (event.action === "avoid") {
    next.avoidedSoundIds = event.state === "active" ? withId(profile.avoidedSoundIds, id) : without(profile.avoidedSoundIds, id);
  } else if (event.action === "boost") {
    next.tagBoosts = event.state === "active" ? withId(profile.tagBoosts, id) : without(profile.tagBoosts, id);
    next.tagAvoids = without(profile.tagAvoids, id);
  } else if (event.action === "reduce") {
    next.tagAvoids = event.state === "active" ? withId(profile.tagAvoids, id) : without(profile.tagAvoids, id);
    next.tagBoosts = without(profile.tagBoosts, id);
  }
  return next;
}

export function serializePreferenceProfile(profile: PreferenceProfile): string {
  const { revision: _revision, ...storedShape } = profile;
  return JSON.stringify(storedShape);
}

export function deserializePreferenceProfile(raw: string | null | undefined): PreferenceProfile {
  if (!raw) return createDefaultPreferenceProfile();
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return createDefaultPreferenceProfile();
    return {
      likedSoundIds: unique(Array.isArray(parsed.likedSoundIds) ? parsed.likedSoundIds : []),
      dislikedSoundIds: unique(Array.isArray(parsed.dislikedSoundIds) ? parsed.dislikedSoundIds : []),
      avoidedSoundIds: unique(Array.isArray(parsed.avoidedSoundIds) ? parsed.avoidedSoundIds : []),
      likedRecipeFingerprints: unique(Array.isArray(parsed.likedRecipeFingerprints) ? parsed.likedRecipeFingerprints : []),
      dislikedRecipeFingerprints: unique(Array.isArray(parsed.dislikedRecipeFingerprints) ? parsed.dislikedRecipeFingerprints : []),
      tagBoosts: unique(Array.isArray(parsed.tagBoosts) ? parsed.tagBoosts : []),
      tagAvoids: unique(Array.isArray(parsed.tagAvoids) ? parsed.tagAvoids : []),
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null,
      revision: typeof parsed.revision === "number" && Number.isFinite(parsed.revision) ? Math.max(0, Math.floor(parsed.revision)) : 0,
    };
  } catch {
    return createDefaultPreferenceProfile();
  }
}

export function deserializeStoredPreferenceProfile(
  raw: string | null | undefined,
  validSoundIds?: ReadonlySet<string>,
): StoredPreferenceProfile {
  const { revision: _revision, ...stored } = deserializePreferenceProfile(raw);
  if (!validSoundIds) return stored;
  return {
    ...stored,
    likedSoundIds: stored.likedSoundIds.filter((id) => validSoundIds.has(id)),
    dislikedSoundIds: stored.dislikedSoundIds.filter((id) => validSoundIds.has(id)),
    avoidedSoundIds: stored.avoidedSoundIds.filter((id) => validSoundIds.has(id)),
  };
}
