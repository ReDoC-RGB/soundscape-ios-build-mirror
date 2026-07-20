import { catalogRepository, type MobileCatalogSound } from "./contracts/catalogContractV2";
import type { GeneratedRecipe, RecipeDensity, RecipeLayerRole } from "./localRecipeEngine";
import { catalogEvidenceRepository } from "./services/catalogEvidenceReconciliationV1";
import {
  getM6ProductBuilderDescriptor,
  getM6ProductCatalogSound,
  getM6ProductSavedSessionEligibility,
} from "./catalog/m6ProductCatalogV1";
import {
  createBuilderSessionModel,
  revalidateBuilderSessionModel,
  type BuilderCandidateGate,
  type BuilderSessionLayer,
  type BuilderSessionLayerRole,
  type BuilderSessionModelV1,
  type BuilderSessionOrigin,
  type BuilderSessionState,
} from "./builderSessionModelV1";

export type BuilderPresetLayerDefinition = Readonly<{
  role: "Background" | "Texture" | "Accent" | "Foreground";
  soundId: string;
  label: string;
  volume: number;
  enabled?: boolean;
  reason?: string;
}>;

export type BuilderPresetDefinition = Readonly<{
  id: string;
  title: string;
  userChoiceOnly: boolean;
  layers: readonly BuilderPresetLayerDefinition[];
}>;

const toBuilderRole = (role: RecipeLayerRole | BuilderPresetLayerDefinition["role"]): BuilderSessionLayerRole => {
  if (role === "bed" || role === "Background") return "bed";
  if (role === "texture" || role === "Texture") return "texture";
  if (role === "Foreground") return "foreground";
  return "accent";
};

const roleEligible = (soundId: string, role: BuilderSessionLayerRole): boolean => {
  const m6 = getM6ProductBuilderDescriptor(soundId);
  if (m6) return m6.role === role;
  const row = catalogRepository.getById(soundId);
  if (!row) return false;
  if (role === "bed") return row.roleEligibility.backgroundBed;
  if (role === "texture") return row.roleEligibility.texture;
  if (role === "foreground") return ["voice_present", "speech_present"].includes(row.voiceSpeech.presence);
  return row.roleEligibility.accentFoley;
};

export function getBuilderCandidateGate(soundId: string): BuilderCandidateGate {
  const m6 = getM6ProductBuilderDescriptor(soundId);
  if (m6) return m6.gate;
  const catalog = catalogRepository.getById(soundId);
  const evidence = catalogEvidenceRepository.getById(soundId);
  const activation = catalogEvidenceRepository.decideById(soundId);
  const mobilePlayable = Boolean(catalog?.eligibility.mobilePlayable && evidence?.compatibility.mobilePlayable && activation?.mobilePlayback);
  return Object.freeze({
    lifecycleState: catalog?.lifecycle.state ?? "blocked",
    mobilePlayable,
    rightsAllowed: Boolean(activation?.newPlaybackSession),
    technicalQcAllowed: Boolean(activation?.newPlaybackSession),
    sensoryQcAllowed: Boolean(activation?.newPlaybackSession),
    activationAllowed: Boolean(activation?.newPlaybackSession),
    manualOnly: catalog?.exposure.manualOnly ?? true,
    explicitChoice: catalog?.exposure.explicitChoice ?? false,
    warning: catalog?.exposure.warningRequired
      ? `${catalog.display.title} is Choice content and starts only after explicit consent.`
      : null,
  });
}

export function createBuilderCandidate(
  soundId: string,
  role: BuilderSessionLayerRole,
  volume: number,
  enabled: boolean,
  reason: string,
  layerId: string = `${role}:${soundId}`,
): BuilderSessionLayer {
  const m6 = getM6ProductBuilderDescriptor(soundId);
  const catalog = catalogRepository.getById(soundId);
  const playback = catalog?.compatibility.playback;
  return Object.freeze({
    layerId,
    role,
    soundId,
    title: m6?.sound.title ?? playback?.title ?? catalog?.display.title ?? soundId,
    volume,
    enabled,
    userChoiceOnly: m6?.sound.userChoiceOnly ?? playback?.userChoiceOnly ?? catalog?.exposure.explicitChoice ?? false,
    reason,
    roleEligible: roleEligible(soundId, role),
    gate: getBuilderCandidateGate(soundId),
  });
}

export function createBuilderSessionModelFromGenerated(
  recipe: GeneratedRecipe,
  input: Readonly<{
    title: string;
    intent: string;
    density: RecipeDensity;
    seed: string;
    choiceGranted: boolean;
  }>,
): BuilderSessionModelV1 {
  return createBuilderSessionModel({
    origin: "generated",
    state: "generated",
    sourceRecipeId: recipe.id,
    title: input.title,
    intent: input.intent,
    density: input.density,
    seed: input.seed,
    choiceGranted: input.choiceGranted,
    layers: recipe.layers.map((layer, index) => createBuilderCandidate(
      layer.soundId,
      toBuilderRole(layer.role),
      layer.volumeDefault,
      true,
      layer.reason,
      `${toBuilderRole(layer.role)}:${index}`,
    )),
  });
}

export function createBuilderSessionModelFromPreset(
  preset: BuilderPresetDefinition,
  input: Readonly<{
    origin?: BuilderSessionOrigin;
    state?: BuilderSessionState;
    intent?: string;
    density?: RecipeDensity;
    seed?: string;
    choiceGranted?: boolean;
  }> = {},
): BuilderSessionModelV1 {
  return createBuilderSessionModel({
    origin: input.origin ?? "curated",
    state: input.state ?? "curated",
    sourceRecipeId: preset.id,
    title: preset.title,
    intent: input.intent ?? preset.title,
    density: input.density ?? (preset.layers.length >= 3 ? "textured" : preset.layers.length === 1 ? "minimal" : "balanced"),
    seed: input.seed ?? `curated:${preset.id}`,
    choiceGranted: input.choiceGranted ?? preset.userChoiceOnly,
    layers: preset.layers.map((layer, index) => createBuilderCandidate(
      layer.soundId,
      toBuilderRole(layer.role),
      layer.volume,
      layer.enabled !== false,
      layer.reason ?? `${layer.label} fills the ${toBuilderRole(layer.role)} role.`,
      `${toBuilderRole(layer.role)}:${index}`,
    )),
  });
}

export function builderPresetDefinitionFromMobile(
  preset: Readonly<{
    id: string;
    title: string;
    userChoiceOnly: boolean;
    layeredPreview?: Readonly<{ layers: readonly Readonly<{
      role: "Background" | "Texture" | "Accent" | "Foreground";
      soundId: string;
      label: string;
      volume: number;
    }>[] }>;
  }>,
): BuilderPresetDefinition | null {
  if (!preset.layeredPreview?.layers.length) return null;
  return Object.freeze({
    id: preset.id,
    title: preset.title,
    userChoiceOnly: preset.userChoiceOnly,
    layers: Object.freeze(preset.layeredPreview.layers.map((layer) => Object.freeze({ ...layer }))),
  });
}

export function revalidateBuilderSessionAgainstCatalog(model: BuilderSessionModelV1): BuilderSessionModelV1 {
  const currentCandidates = model.layers.map((layer) => createBuilderCandidate(
    layer.soundId,
    layer.role,
    layer.volume,
    layer.enabled,
    layer.reason,
    layer.layerId,
  ));
  return revalidateBuilderSessionModel(model, currentCandidates);
}

export function getSavedSessionEligibility(soundId: string): Readonly<{ allowed: boolean; reason: string | null }> {
  if (getM6ProductCatalogSound(soundId)) return getM6ProductSavedSessionEligibility(soundId);
  const catalog = catalogRepository.getById(soundId);
  const activation = catalogEvidenceRepository.decideById(soundId);
  if (!catalog) return Object.freeze({ allowed: false, reason: "Missing catalog identity" });
  if (catalog.lifecycle.state === "revoked" || catalog.lifecycle.state === "deprecated") {
    return Object.freeze({ allowed: false, reason: `Lifecycle ${catalog.lifecycle.state}` });
  }
  if (!activation?.savedRecentRestoration || !activation.newPlaybackSession) {
    return Object.freeze({ allowed: false, reason: "Activation or rights/QC gate restricted" });
  }
  return Object.freeze({ allowed: true, reason: null });
}

export function findMobileSound(soundId: string): MobileCatalogSound | null {
  return getM6ProductCatalogSound(soundId)
    ?? catalogRepository.getById(soundId)?.compatibility.playback
    ?? null;
}
