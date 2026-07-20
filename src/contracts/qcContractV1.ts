import { notYetReviewedFact, type EvidencedFact } from "./provenanceContractV1";

export const TECHNICAL_QC_CONTRACT_VERSION = "1" as const;
export const SENSORY_QC_CONTRACT_VERSION = "1" as const;

export type Measurement<T> =
  | Readonly<{ state: "measured"; value: T; unit: string | null; method: string; limits: string }>
  | Readonly<{ state: "not_measured" | "not_applicable" | "unavailable"; reason: string }>;
const unmeasured = <T>(reason: string): Measurement<T> => Object.freeze({ state: "not_measured", reason });

export type TechnicalQcDecision = "not_yet_reviewed" | "approved" | "restricted" | "rejected";
export type TechnicalQcRecordV1 = Readonly<{
  version: 1;
  catalogIdentity: string;
  tool: EvidencedFact<string>;
  toolVersion: EvidencedFact<string>;
  measuredAt: EvidencedFact<string>;
  measurements: Readonly<{
    decodeReadability: Measurement<boolean>;
    containerCodec: Measurement<string>;
    durationSeconds: Measurement<number>;
    sampleRateHz: Measurement<number>;
    channelCount: Measurement<number>;
    bitrateKbps: Measurement<number>;
    byteSize: Measurement<number>;
    checksum: Measurement<string>;
    clippingPeakRisk: Measurement<number>;
    loudnessLufs: Measurement<number>;
    dcOffset: Measurement<number>;
    leadingSilenceSeconds: Measurement<number>;
    trailingSilenceSeconds: Measurement<number>;
    sparseContent: Measurement<boolean>;
    corruptionTruncation: Measurement<boolean>;
    fileSizeSanity: Measurement<boolean>;
    loopSeamClickRisk: Measurement<string>;
    tailBehavior: Measurement<string>;
    sourceSuitability: Measurement<string>;
    mobilePlaybackSuitability: Measurement<boolean>;
  }>;
  normalizationPolicy: "report_only_no_audio_change";
  loopReviewDecision: TechnicalQcDecision;
  decision: TechnicalQcDecision;
  decisionReason: string;
}>;

export const createUnmeasuredTechnicalQc = (catalogIdentity: string, reason: string): TechnicalQcRecordV1 => {
  const measurement = () => unmeasured<any>(reason);
  return Object.freeze({
    version: 1,
    catalogIdentity,
    tool: notYetReviewedFact("technical QC tool not run"),
    toolVersion: notYetReviewedFact("technical QC tool not run"),
    measuredAt: notYetReviewedFact("technical QC not run"),
    measurements: Object.freeze({
      decodeReadability: measurement(), containerCodec: measurement(), durationSeconds: measurement(), sampleRateHz: measurement(),
      channelCount: measurement(), bitrateKbps: measurement(), byteSize: measurement(), checksum: measurement(),
      clippingPeakRisk: measurement(), loudnessLufs: measurement(), dcOffset: measurement(), leadingSilenceSeconds: measurement(),
      trailingSilenceSeconds: measurement(), sparseContent: measurement(), corruptionTruncation: measurement(), fileSizeSanity: measurement(),
      loopSeamClickRisk: measurement(), tailBehavior: measurement(), sourceSuitability: measurement(), mobilePlaybackSuitability: measurement(),
    }),
    normalizationPolicy: "report_only_no_audio_change",
    loopReviewDecision: "not_yet_reviewed",
    decision: "not_yet_reviewed",
    decisionReason: reason,
  });
};

export type SensoryQcDecision = "not_yet_reviewed" | "approved" | "restricted" | "rejected";
export type SensoryQcRecordV1 = Readonly<{
  version: 1;
  catalogIdentity: string;
  reviewer: EvidencedFact<string>;
  reviewedAt: EvidencedFact<string>;
  evidenceReferenceIds: readonly string[];
  audibility: EvidencedFact<string>;
  mixUsefulness: EvidencedFact<string>;
  maskingRisk: EvidencedFact<string>;
  sparseShortLivedBehavior: EvidencedFact<string>;
  noise: EvidencedFact<string>;
  artifacts: EvidencedFact<string>;
  contentMismatch: EvidencedFact<string>;
  namingTruth: EvidencedFact<string>;
  taxonomyTruth: EvidencedFact<string>;
  triggerMaterialActionFit: EvidencedFact<string>;
  sourceDescriptionMatch: EvidencedFact<string>;
  loopSuitability: EvidencedFact<string>;
  sensitivityExposureDecision: EvidencedFact<string>;
  decision: SensoryQcDecision;
  reason: string;
}>;

export const createUnreviewedSensoryQc = (catalogIdentity: string): SensoryQcRecordV1 => {
  const pending = () => notYetReviewedFact<string>("human sensory/content review not completed");
  return Object.freeze({
    version: 1, catalogIdentity, reviewer: pending(), reviewedAt: pending(), evidenceReferenceIds: Object.freeze([]),
    audibility: pending(), mixUsefulness: pending(), maskingRisk: pending(), sparseShortLivedBehavior: pending(),
    noise: pending(), artifacts: pending(), contentMismatch: pending(), namingTruth: pending(), taxonomyTruth: pending(),
    triggerMaterialActionFit: pending(), sourceDescriptionMatch: pending(), loopSuitability: pending(),
    sensitivityExposureDecision: pending(), decision: "not_yet_reviewed", reason: "human sensory/content/sensitivity review not completed",
  });
};

const sensitiveFamilies = new Set([
  "mouth_sounds", "eating_chewing", "whisper_soft_spoken", "personal_attention_intimate",
  "hair_scalp_personal_attention", "binaural_spatial_ear_to_ear",
]);
export const requiresExplicitSensitiveReview = (familyIds: readonly string[]): boolean => familyIds.some((id) => sensitiveFamilies.has(id));
export const isTechnicalQcApproved = (record: TechnicalQcRecordV1): boolean => record.decision === "approved";
export const isSensoryQcApproved = (record: SensoryQcRecordV1): boolean => record.decision === "approved";
