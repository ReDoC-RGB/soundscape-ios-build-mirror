import type { MobileCatalogSound } from "../mobileSoundContract";
import {
  createBuilderSessionModel,
  type BuilderSessionLayer,
  type BuilderSessionModelV1,
} from "../builderSessionModelV1";
import { m6CatalogExpansionV1, type M6LocalCatalogIdentity } from "./m6CatalogExpansionV1";

export const M6_INTERNAL_PHYSICAL_REVIEW_VERSION = "1" as const;

export type M6InternalPhysicalReviewSound = MobileCatalogSound & Readonly<{
  internalReviewOnly: true;
  activationEligible: false;
  supportedProductPlaybackPending: true;
  m6Identity: M6LocalCatalogIdentity;
}>;

const reviewSubtitle = (identity: M6LocalCatalogIdentity): string => {
  if (!identity.containsVoice) {
    return `Internal M6 review · ${identity.triggerFamilyIds.join(" / ")}`;
  }
  const modality = identity.voiceModality === "whisper" ? "Whisper" : "Soft-spoken";
  return `Internal M6 review · ${modality} · ${identity.syntheticVoice ? "Synthetic voice" : "Human voice"}`;
};

export const adaptM6IdentityToInternalPhysicalReviewSound = (
  identity: M6LocalCatalogIdentity,
): M6InternalPhysicalReviewSound => Object.freeze({
  id: identity.id,
  title: identity.title,
  subtitle: reviewSubtitle(identity),
  audioUrl: identity.audioUrl,
  category: "m6-internal-physical-review",
  lane: "Internal M6 physical review",
  playable: true,
  containsVoice: identity.containsVoice,
  ...(identity.containsVoice ? {
    voiceMetadata: Object.freeze({
      modality: identity.voiceModality!,
      synthetic: identity.syntheticVoice === true,
      disclosureLabel: identity.syntheticVoice ? "Synthetic voice" as const : "Human voice" as const,
      provenanceSummary: identity.voiceProvenanceSummary
        ?? "M6 rights and provenance evidence is retained in the sealed catalog ledger.",
      transcript: identity.transcript ?? "Transcript evidence is retained in the sealed M6 ledger.",
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
    "m6-internal-review-only",
    identity.manualOnly ? "choice" : "explicit-review-tap",
    identity.syntheticVoice ? "synthetic-voice" : "source-recording",
  ],
  internalReviewOnly: true,
  activationEligible: false,
  supportedProductPlaybackPending: true,
  m6Identity: identity,
});

export const m6InternalPhysicalReviewSoundsV1: readonly M6InternalPhysicalReviewSound[] = Object.freeze(
  m6CatalogExpansionV1.map(adaptM6IdentityToInternalPhysicalReviewSound),
);

const m6PhysicalReviewIds = new Set(m6InternalPhysicalReviewSoundsV1.map((sound) => sound.id));

export const isM6InternalPhysicalReviewSoundId = (soundId: string): boolean =>
  m6PhysicalReviewIds.has(soundId);

export const getM6PhysicalReviewSavedSessionEligibility = (
  soundId: string,
): Readonly<{ allowed: boolean; reason: string | null }> =>
  isM6InternalPhysicalReviewSoundId(soundId)
    ? Object.freeze({ allowed: true, reason: null })
    : Object.freeze({ allowed: false, reason: "Not an M6 internal physical-review identity" });

const createVoiceForegroundReviewCandidate = (
  identity: M6LocalCatalogIdentity,
): BuilderSessionLayer => {
  if (!identity.containsVoice || identity.builderRole !== "foreground") {
    throw new Error(`${identity.id} is not an M6 Voice foreground identity.`);
  }
  return Object.freeze({
    layerId: `m6-internal-review:foreground:${identity.id}`,
    role: "foreground" as const,
    soundId: identity.id,
    title: identity.title,
    volume: 0.1,
    enabled: true,
    userChoiceOnly: true,
    reason: "explicit Daniel-only M6 physical review of Voice as a Builder foreground",
    roleEligible: true,
    gate: Object.freeze({
      // This active/allowed gate is an ephemeral review-session capability only.
      // The source identity remains activationEligible=false and playback-pending.
      lifecycleState: "active",
      mobilePlayable: true,
      rightsAllowed: identity.rightsEvidenceComplete === true,
      technicalQcAllowed: true,
      sensoryQcAllowed: true,
      activationAllowed: true,
      manualOnly: true,
      explicitChoice: true,
      warning: `${identity.title} is INTERNAL REVIEW ONLY, Choice-only, never-autoplay, non-looping, and not production-active.`,
    }),
  });
};

export const createM6VoiceForegroundPhysicalReviewModel = (
  identity: M6LocalCatalogIdentity,
  acceptedBedCandidate: BuilderSessionLayer,
): BuilderSessionModelV1 => {
  if (acceptedBedCandidate.role !== "bed" || !acceptedBedCandidate.enabled) {
    throw new Error("M6 Voice foreground review requires one accepted enabled bed.");
  }
  return createBuilderSessionModel({
    origin: "manual",
    state: "manual_edit",
    sourceRecipeId: `m6-internal-physical-review:${identity.id}`,
    title: `Internal M6 review · ${identity.title}`,
    intent: "Daniel-only supported-product Voice foreground physical review",
    density: "balanced",
    seed: `m6-internal-review:${identity.id}`,
    choiceGranted: true,
    layers: [acceptedBedCandidate, createVoiceForegroundReviewCandidate(identity)],
  });
};
