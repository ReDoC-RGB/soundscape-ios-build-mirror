import type { MobileCatalogSound } from "../contracts/catalogContractV2";
import type { GeneratedRecipe } from "../contracts/recommendationContractV1";
import type { StoredPreferenceProfile } from "../contracts/preferenceContractV1";
import type { QuickFeedbackState } from "../quickFeedback";

type PresetLike = { id: string; layers: Array<{ soundId?: string }> };

const normalizePreferenceTag = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
const addUniqueValues = (currentValues: string[], nextValues: string[]) => Array.from(new Set([...nextValues, ...currentValues].filter(Boolean))).slice(0, 80);
const removeValues = (currentValues: string[], valuesToRemove: string[]) => {
  const removeSet = new Set(valuesToRemove);
  return currentValues.filter((value) => !removeSet.has(value));
};
const formatSoundUserTags = (sound: MobileCatalogSound) => {
  const lane = normalizePreferenceTag(sound.lane);
  if (lane.includes("rain")) return "rain · background";
  if (lane.includes("fan")) return "fan / air · room ambience";
  if (lane.includes("water")) return "water · river / creek";
  if (lane.includes("forest")) return "nature · night ambience";
  if (lane.includes("noise")) return "steady noise · background";
  if (lane.includes("writing")) return "typing / writing · texture";
  if (lane.includes("paper")) return "paper / pages · texture";
  if (lane.includes("fabric")) return "fabric · soft texture";
  if (lane.includes("tapping")) return "soft tapping · accent";
  return sound.lane;
};
const getPreferenceTagsForSound = (sound: MobileCatalogSound) => addUniqueValues([], [
  sound.lane, sound.category, ...sound.tags, ...formatSoundUserTags(sound).split(" · "),
].map(normalizePreferenceTag)).slice(0, 10);

export function applySoundPreferenceFeedback(
  current: StoredPreferenceProfile,
  sound: MobileCatalogSound,
  action: "like" | "dislike" | "avoid",
): StoredPreferenceProfile {
  const tags = getPreferenceTagsForSound(sound);
  const liked = current.likedSoundIds.includes(sound.id);
  const disliked = current.dislikedSoundIds.includes(sound.id);
  const avoided = current.avoidedSoundIds.includes(sound.id);
  if (action === "like" && liked) return { ...current, likedSoundIds: removeValues(current.likedSoundIds, [sound.id]), tagBoosts: removeValues(current.tagBoosts, tags) };
  if (action === "dislike" && disliked) return { ...current, dislikedSoundIds: removeValues(current.dislikedSoundIds, [sound.id]), tagAvoids: removeValues(current.tagAvoids, tags) };
  if (action === "avoid" && avoided) return { ...current, avoidedSoundIds: removeValues(current.avoidedSoundIds, [sound.id]), tagAvoids: removeValues(current.tagAvoids, tags) };
  if (action === "like") return {
    ...current,
    likedSoundIds: addUniqueValues(removeValues(current.likedSoundIds, [sound.id]), [sound.id]),
    dislikedSoundIds: removeValues(current.dislikedSoundIds, [sound.id]),
    avoidedSoundIds: removeValues(current.avoidedSoundIds, [sound.id]),
    tagBoosts: addUniqueValues(current.tagBoosts, tags),
    tagAvoids: removeValues(current.tagAvoids, tags),
  };
  if (action === "avoid") return {
    ...current,
    likedSoundIds: removeValues(current.likedSoundIds, [sound.id]),
    dislikedSoundIds: removeValues(current.dislikedSoundIds, [sound.id]),
    avoidedSoundIds: addUniqueValues(current.avoidedSoundIds, [sound.id]),
    tagBoosts: removeValues(current.tagBoosts, tags),
    tagAvoids: addUniqueValues(current.tagAvoids, tags),
  };
  return {
    ...current,
    likedSoundIds: removeValues(current.likedSoundIds, [sound.id]),
    dislikedSoundIds: addUniqueValues(current.dislikedSoundIds, [sound.id]),
    avoidedSoundIds: removeValues(current.avoidedSoundIds, [sound.id]),
    tagBoosts: removeValues(current.tagBoosts, tags),
    tagAvoids: addUniqueValues(current.tagAvoids, tags),
  };
}

export function applySoundQuickFeedbackState(current: StoredPreferenceProfile, sound: MobileCatalogSound, target: QuickFeedbackState): StoredPreferenceProfile {
  let normalized = current;
  if (normalized.likedSoundIds.includes(sound.id)) normalized = applySoundPreferenceFeedback(normalized, sound, "like");
  if (normalized.dislikedSoundIds.includes(sound.id)) normalized = applySoundPreferenceFeedback(normalized, sound, "dislike");
  if (target === "up") return applySoundPreferenceFeedback(normalized, sound, "like");
  if (target === "down") return applySoundPreferenceFeedback(normalized, sound, "dislike");
  return normalized;
}

const getRecipeSoundIds = (recipe: GeneratedRecipe | undefined, preset: PresetLike | null | undefined) =>
  recipe?.layers.map((layer) => layer.soundId) ?? preset?.layers.flatMap((layer) => layer.soundId ? [layer.soundId] : []) ?? [];
export const buildRecipeFingerprint = (recipe: GeneratedRecipe | undefined, preset: PresetLike | null | undefined) =>
  [recipe?.id ?? preset?.id ?? "recipe", ...getRecipeSoundIds(recipe, preset)].join("|");
const getPreferenceTagsForRecipe = (recipe: GeneratedRecipe | undefined, preset: PresetLike | null | undefined, byId: Map<string, MobileCatalogSound>) =>
  addUniqueValues([], getRecipeSoundIds(recipe, preset).flatMap((id) => {
    const sound = byId.get(id);
    return sound ? getPreferenceTagsForSound(sound) : [];
  })).slice(0, 16);

export function applyRecipePreferenceFeedback(
  current: StoredPreferenceProfile,
  recipe: GeneratedRecipe | undefined,
  preset: PresetLike | null | undefined,
  byId: Map<string, MobileCatalogSound>,
  action: "like" | "dislike" | "more" | "less",
): StoredPreferenceProfile {
  const fingerprint = buildRecipeFingerprint(recipe, preset);
  const tags = getPreferenceTagsForRecipe(recipe, preset, byId);
  const ids = getRecipeSoundIds(recipe, preset);
  if (action === "like" && current.likedRecipeFingerprints.includes(fingerprint)) return { ...current, likedRecipeFingerprints: removeValues(current.likedRecipeFingerprints, [fingerprint]), likedSoundIds: removeValues(current.likedSoundIds, ids) };
  if (action === "dislike" && current.dislikedRecipeFingerprints.includes(fingerprint)) return { ...current, dislikedRecipeFingerprints: removeValues(current.dislikedRecipeFingerprints, [fingerprint]), dislikedSoundIds: removeValues(current.dislikedSoundIds, ids) };
  if (action === "like" || action === "more") return {
    ...current,
    likedRecipeFingerprints: action === "like" ? addUniqueValues(current.likedRecipeFingerprints, [fingerprint]) : current.likedRecipeFingerprints,
    dislikedRecipeFingerprints: action === "like" ? removeValues(current.dislikedRecipeFingerprints, [fingerprint]) : current.dislikedRecipeFingerprints,
    likedSoundIds: action === "like" ? addUniqueValues(current.likedSoundIds, ids) : current.likedSoundIds,
    dislikedSoundIds: action === "like" ? removeValues(current.dislikedSoundIds, ids) : current.dislikedSoundIds,
    tagBoosts: addUniqueValues(current.tagBoosts, tags), tagAvoids: removeValues(current.tagAvoids, tags),
  };
  return {
    ...current,
    likedRecipeFingerprints: action === "dislike" ? removeValues(current.likedRecipeFingerprints, [fingerprint]) : current.likedRecipeFingerprints,
    dislikedRecipeFingerprints: action === "dislike" ? addUniqueValues(current.dislikedRecipeFingerprints, [fingerprint]) : current.dislikedRecipeFingerprints,
    likedSoundIds: action === "dislike" ? removeValues(current.likedSoundIds, ids) : current.likedSoundIds,
    dislikedSoundIds: action === "dislike" ? addUniqueValues(current.dislikedSoundIds, ids) : current.dislikedSoundIds,
    tagBoosts: removeValues(current.tagBoosts, tags), tagAvoids: addUniqueValues(current.tagAvoids, tags),
  };
}

export function applyRecipeQuickFeedbackState(
  current: StoredPreferenceProfile,
  recipe: GeneratedRecipe | undefined,
  preset: PresetLike | null | undefined,
  byId: Map<string, MobileCatalogSound>,
  target: QuickFeedbackState,
): StoredPreferenceProfile {
  const fingerprint = buildRecipeFingerprint(recipe, preset);
  let normalized = current;
  if (normalized.likedRecipeFingerprints.includes(fingerprint)) normalized = applyRecipePreferenceFeedback(normalized, recipe, preset, byId, "like");
  if (normalized.dislikedRecipeFingerprints.includes(fingerprint)) normalized = applyRecipePreferenceFeedback(normalized, recipe, preset, byId, "dislike");
  if (target === "up") return applyRecipePreferenceFeedback(normalized, recipe, preset, byId, "like");
  if (target === "down") return applyRecipePreferenceFeedback(normalized, recipe, preset, byId, "dislike");
  return normalized;
}
