import type { MobileCatalogSound } from "../mobileSoundContract";
import type { PersistentDownloadResolutionV1 } from "../contracts/persistentDownloadRightsContractV1";
import { m6CatalogExpansionV1, type M6LocalCatalogIdentity } from "./m6CatalogExpansionV1";
import { resolvePersistentDownloadRightsV1 } from "./persistentDownloadRightsCatalogV1";

export const M6_PRODUCT_CATALOG_VERSION = "1" as const;

const M6_FAMILY_LABELS: Readonly<Record<string, string>> = Object.freeze({
  tapping_object_handling: "Tapping / Object Foley",
  paper_pages_writing_typing: "Paper / Writing / Typing",
  brushing_mic_brushing: "Brushing / Scratching",
  fabric_cloth: "Fabric / Soft Texture",
  mouth_sounds: "Mouth / Eating Sounds",
  eating_chewing: "Mouth / Eating Sounds",
  resonant_tone_drone: "Tones / Resonance",
  scratching_surface_tracing: "Brushing / Scratching",
  controlled_plastic_packaging_crinkle: "Crinkle / Packaging",
  whisper_soft_spoken: "Voice / Whisper / Soft-Spoken",
  personal_attention_intimate: "Voice / Whisper / Soft-Spoken",
});

const familyLabel = (identity: M6LocalCatalogIdentity): string =>
  M6_FAMILY_LABELS[identity.triggerFamilyIds[0]] ?? "Traditional ASMR";

export type M6ProductCatalogSound = MobileCatalogSound & Readonly<{
  m6Identity: M6LocalCatalogIdentity;
  productActive: true;
  manualOnly: boolean;
  neverAutoplay: boolean;
  builderRole: M6LocalCatalogIdentity["builderRole"];
  persistentDownloadRights: PersistentDownloadResolutionV1;
}>;

export const adaptM6IdentityToProductCatalogSound = (
  identity: M6LocalCatalogIdentity,
): M6ProductCatalogSound => {
  if (!identity.activationEligible || identity.lifecycleState !== "active" || !identity.playbackEvidenceComplete) {
    throw new Error(`${identity.id} cannot enter the product catalog before every accepted activation gate passes.`);
  }
  const lane = familyLabel(identity);
  return Object.freeze({
    id: identity.id,
    title: identity.title,
    subtitle: identity.containsVoice
      ? `${identity.voiceModality === "whisper" ? "Whisper" : "Soft-spoken"} foreground · explicit Choice`
      : `${lane} · Traditional ASMR`,
    audioUrl: identity.audioUrl,
    category: identity.containsVoice ? "voice-whisper-soft-spoken" : identity.triggerFamilyIds[0],
    lane,
    playable: true,
    containsVoice: identity.containsVoice,
    ...(identity.containsVoice ? {
      voiceMetadata: Object.freeze({
        modality: identity.voiceModality!,
        synthetic: identity.syntheticVoice === true,
        disclosureLabel: identity.syntheticVoice ? "Synthetic voice" as const : "Human voice" as const,
        provenanceSummary: identity.voiceProvenanceSummary
          ?? "Source, performer, and rights evidence is retained in the accepted M6 catalog ledger.",
        transcript: identity.transcript ?? "Transcript evidence is retained in the accepted M6 catalog ledger.",
      }),
    } : {}),
    durationSeconds: identity.durationSeconds,
    clearLabelRequired: identity.warningRequired,
    userChoiceOnly: identity.manualOnly,
    loopEligible: false,
    tags: [
      ...identity.triggerFamilyIds,
      ...identity.materialIds,
      ...identity.actionIds,
      identity.builderRole,
      identity.manualOnly ? "choice" : "default-safe",
      identity.containsVoice ? "voice" : "traditional-asmr",
      identity.syntheticVoice ? "synthetic-voice" : "source-recording",
      identity.neverAutoplay ? "never-autoplay" : "automatic-eligible",
      lane,
    ],
    m6Identity: identity,
    productActive: true,
    manualOnly: identity.manualOnly,
    neverAutoplay: identity.neverAutoplay,
    builderRole: identity.builderRole,
    persistentDownloadRights: resolvePersistentDownloadRightsV1(identity.id, identity.audioUrl),
  });
};

export const m6ProductCatalogSoundsV1: readonly M6ProductCatalogSound[] = Object.freeze(
  m6CatalogExpansionV1.map(adaptM6IdentityToProductCatalogSound),
);
export const m6DefaultSafeProductCatalogSoundsV1 = Object.freeze(
  m6ProductCatalogSoundsV1.filter((sound) => !sound.manualOnly),
);
export const m6ChoiceProductCatalogSoundsV1 = Object.freeze(
  m6ProductCatalogSoundsV1.filter((sound) => sound.manualOnly),
);
export const m6AutomaticProductCatalogSoundsV1 = Object.freeze(
  m6ProductCatalogSoundsV1.filter((sound) => !sound.manualOnly && !sound.neverAutoplay && !sound.containsVoice),
);
export const m6VoiceForegroundCatalogSoundsV1 = Object.freeze(
  m6ProductCatalogSoundsV1.filter((sound) => sound.containsVoice && sound.builderRole === "foreground"),
);

const m6ProductById = new Map(m6ProductCatalogSoundsV1.map((sound) => [sound.id, sound]));
export const getM6ProductCatalogSound = (soundId: string): M6ProductCatalogSound | null =>
  m6ProductById.get(soundId) ?? null;

export type M6ProductBuilderDescriptor = Readonly<{
  sound: M6ProductCatalogSound;
  role: "texture" | "accent" | "foreground";
  roleEligible: true;
  gate: Readonly<{
    lifecycleState: "active";
    mobilePlayable: true;
    rightsAllowed: true;
    technicalQcAllowed: true;
    sensoryQcAllowed: true;
    activationAllowed: true;
    manualOnly: boolean;
    explicitChoice: boolean;
    warning: string | null;
    persistentDownloadState: PersistentDownloadResolutionV1["state"];
    persistentDownloadEligible: boolean;
  }>;
}>;

export const getM6ProductBuilderDescriptor = (soundId: string): M6ProductBuilderDescriptor | null => {
  const sound = getM6ProductCatalogSound(soundId);
  if (!sound) return null;
  return Object.freeze({
    sound,
    role: sound.builderRole,
    roleEligible: true,
    gate: Object.freeze({
      lifecycleState: "active",
      mobilePlayable: true,
      rightsAllowed: true,
      technicalQcAllowed: true,
      sensoryQcAllowed: true,
      activationAllowed: true,
      manualOnly: sound.manualOnly,
      explicitChoice: sound.manualOnly,
      warning: sound.clearLabelRequired
        ? `${sound.title} is Choice content and starts only after explicit current-session selection.`
        : null,
      persistentDownloadState: sound.persistentDownloadRights.state,
      persistentDownloadEligible: sound.persistentDownloadRights.eligible,
    }),
  });
};

export const getM6ProductSavedSessionEligibility = (
  soundId: string,
): Readonly<{ allowed: boolean; reason: string | null; persistentDownloadRights: PersistentDownloadResolutionV1 | null }> => {
  const sound = getM6ProductCatalogSound(soundId);
  return sound
    ? Object.freeze({ allowed: true, reason: null, persistentDownloadRights: sound.persistentDownloadRights })
    : Object.freeze({ allowed: false, reason: "Missing active M6 product identity", persistentDownloadRights: null });
};
