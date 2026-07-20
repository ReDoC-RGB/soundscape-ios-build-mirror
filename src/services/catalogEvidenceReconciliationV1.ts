import { catalogRepository, type CatalogSoundV2, type MobileCatalogSound } from "../contracts/catalogContractV2";
import { createMissingLegacyProvenance, knownFact, missingFact, notYetReviewedFact, type ProvenanceRecordV1 } from "../contracts/provenanceContractV1";
import { createLegacyPendingRights, type RightsEvidenceRecordV1 } from "../contracts/rightsEvidenceContractV1";
import { createUnmeasuredTechnicalQc, createUnreviewedSensoryQc, requiresExplicitSensitiveReview, type SensoryQcRecordV1, type TechnicalQcRecordV1 } from "../contracts/qcContractV1";
import { decideActivationEligibility, type ActivationGateEvidenceV1 } from "./activationEligibilityV1";
import type { ActivationEvidenceV1, ExposureGateV1, IngestionManifestRecordV1, IngestionManifestV1 } from "./ingestionManifestV1";
import {
  SLOW_RAIN_RECONCILED_EVIDENCE_V1,
  createSlowRainReconciledProvenanceV1,
  createSlowRainReconciledRightsV1,
  createSlowRainReconciledSensoryQcV1,
  createSlowRainReconciledTechnicalQcV1,
} from "../catalog/slowRainReconciledEvidenceV1";

export const RECONCILIATION_CONTRACT_VERSION = "1" as const;
export type CatalogEvidenceRecordV1 = Readonly<{
  version: 1;
  catalogIdentity: string;
  migrationClass: "accepted_legacy_catalog";
  lifecycleState: "legacy_active_pending_evidence" | "active_mobile_playback";
  lifecycleReason: Readonly<{ code: "legacy_evidence_migration"; notes: string; evidenceReferenceIds: readonly string[] }> | null;
  catalogStatus: "active_metadata_only" | "active_mobile_playback";
  provenance: ProvenanceRecordV1;
  rights: RightsEvidenceRecordV1;
  technicalQc: TechnicalQcRecordV1;
  sensoryQc: SensoryQcRecordV1;
  activationEvidence: ActivationEvidenceV1;
  exposureGate: ExposureGateV1;
  sensitiveFamilyRequiresChoice: boolean;
  explicitSensitiveReviewCompleted: boolean;
  gateEvidence?: ActivationGateEvidenceV1;
  missingEvidenceCategories: readonly string[];
  compatibility: Readonly<{ metadataVisible: true; mobilePlayable: boolean; defaultSafe: boolean; choice: boolean; loopEligible: boolean }>;
}>;
export type CatalogReconciliationV1 = Readonly<{
  version: 1;
  generatedFrom: string;
  records: readonly CatalogEvidenceRecordV1[];
  recordById: Readonly<Record<string, CatalogEvidenceRecordV1>>;
  counts: Readonly<{
    catalog: Readonly<{ metadata: number; mobilePlayback: number; metadataOnly: number; defaultSafe: number; choice: number }>;
    lifecycle: Readonly<Record<string, number>>;
    rights: Readonly<Record<string, number>>;
    technicalQc: Readonly<Record<string, number>>;
    sensoryQc: Readonly<Record<string, number>>;
    lifecycleReasons: Readonly<Record<string, number>>;
  }>;
  evidenceGaps: Readonly<{ totalRecordsWithDebt: number; byCategory: Readonly<Record<string, number>> }>;
  clearanceClaim: "not_commercially_cleared";
}>;

const isLoopEligible = (row: CatalogSoundV2): boolean => row.compatibility.metadata.loopPolicy === "loop_safe" || row.compatibility.metadata.loopPolicy === "restart_safe";
const createRecord = (row: CatalogSoundV2): CatalogEvidenceRecordV1 => {
  const mobilePlayable = row.eligibility.mobilePlayable;
  const sensitiveFamily = requiresExplicitSensitiveReview(row.taxonomy.triggerFamilyIds);
  if (row.id === SLOW_RAIN_RECONCILED_EVIDENCE_V1.catalogIdentity) {
    if (!mobilePlayable || row.compatibility.playback?.audioUrl !== SLOW_RAIN_RECONCILED_EVIDENCE_V1.delivery.remoteUri) {
      throw new Error("Slow Rain reconciled evidence does not match the active catalog playback identity.");
    }
    return Object.freeze({
      version: 1,
      catalogIdentity: row.id,
      migrationClass: "accepted_legacy_catalog",
      lifecycleState: "active_mobile_playback",
      lifecycleReason: null,
      catalogStatus: "active_mobile_playback",
      provenance: createSlowRainReconciledProvenanceV1(),
      rights: createSlowRainReconciledRightsV1(),
      technicalQc: createSlowRainReconciledTechnicalQcV1(),
      sensoryQc: createSlowRainReconciledSensoryQcV1(),
      activationEvidence: Object.freeze({
        taxonomyReview: knownFact<"approved">("approved", ["slow-rain-mode-a-r4-decision"]),
        sensitivityExposureReview: knownFact<"approved">("approved", ["slow-rain-mode-a-r4-decision"]),
        playbackEvidence: knownFact<"mobile_playback">("mobile_playback", ["slow-rain-mobile-physical-playback"]),
      }),
      exposureGate: Object.freeze({ sensitiveFamily: false, requiresChoice: false, manualOnly: false, explicitSensitiveReviewCompleted: true }),
      sensitiveFamilyRequiresChoice: false,
      explicitSensitiveReviewCompleted: true,
      gateEvidence: Object.freeze({ provenance: true, rights: true, technicalQc: true, sensoryQc: true, taxonomy: true, sensitivityExposure: true, playback: true }),
      missingEvidenceCategories: Object.freeze([]),
      compatibility: Object.freeze({ metadataVisible: true, mobilePlayable: true, defaultSafe: row.exposure.defaultSafe, choice: row.exposure.explicitChoice, loopEligible: isLoopEligible(row) }),
    });
  }
  return Object.freeze({
    version: 1,
    catalogIdentity: row.id,
    migrationClass: "accepted_legacy_catalog",
    lifecycleState: "legacy_active_pending_evidence",
    lifecycleReason: Object.freeze({ code: "legacy_evidence_migration", notes: "Accepted catalog behavior is preserved while M3 evidence debt is reconciled.", evidenceReferenceIds: Object.freeze([]) }),
    catalogStatus: mobilePlayable ? "active_mobile_playback" : "active_metadata_only",
    provenance: createMissingLegacyProvenance(row.id),
    rights: createLegacyPendingRights(row.id),
    technicalQc: createUnmeasuredTechnicalQc(row.id, "M3 objective measurements were not performed because original/local audio bytes are not authorized or available in this milestone"),
    sensoryQc: createUnreviewedSensoryQc(row.id),
    activationEvidence: Object.freeze({
      taxonomyReview: notYetReviewedFact("M3 taxonomy activation review not completed"),
      sensitivityExposureReview: notYetReviewedFact("M3 sensitivity/exposure activation review not completed"),
      playbackEvidence: notYetReviewedFact("M3 playback activation evidence not completed"),
    }),
    exposureGate: Object.freeze({ sensitiveFamily, requiresChoice: row.exposure.explicitChoice || sensitiveFamily, manualOnly: row.exposure.manualOnly || sensitiveFamily, explicitSensitiveReviewCompleted: false }),
    sensitiveFamilyRequiresChoice: sensitiveFamily,
    explicitSensitiveReviewCompleted: false,
    missingEvidenceCategories: Object.freeze(["provenance", "rights", "original_asset_relationship", "checksum", "technical_qc", "sensory_qc", "activation_review"]),
    compatibility: Object.freeze({ metadataVisible: true, mobilePlayable, defaultSafe: row.exposure.defaultSafe, choice: row.exposure.explicitChoice, loopEligible: isLoopEligible(row) }),
  });
};
const countBy = <T>(rows: readonly T[], key: (row: T) => string): Readonly<Record<string, number>> => Object.freeze(rows.reduce<Record<string, number>>((counts, row) => { const value = key(row); counts[value] = (counts[value] ?? 0) + 1; return counts; }, {}));

export const reconcileCurrentCatalog = (): CatalogReconciliationV1 => {
  const records = Object.freeze(catalogRepository.enumerate().map(createRecord).sort((a, b) => a.catalogIdentity.localeCompare(b.catalogIdentity)));
  const recordById = Object.freeze(Object.fromEntries(records.map((record) => [record.catalogIdentity, record])));
  const protectedCounts = catalogRepository.getProtectedCounts();
  const evidenceCategoryCounts: Record<string, number> = {};
  for (const record of records) for (const category of record.missingEvidenceCategories) evidenceCategoryCounts[category] = (evidenceCategoryCounts[category] ?? 0) + 1;
  return Object.freeze({
    version: 1,
    generatedFrom: catalogRepository.revision,
    records,
    recordById,
    counts: Object.freeze({
      catalog: Object.freeze({ metadata: records.length, mobilePlayback: protectedCounts.mobilePlayback, metadataOnly: records.length - protectedCounts.mobilePlayback, defaultSafe: protectedCounts.defaultSafe, choice: protectedCounts.userChoice }),
      lifecycle: countBy(records, (record) => record.lifecycleState), rights: countBy(records, (record) => record.rights.reviewDecision.state),
      technicalQc: countBy(records, (record) => record.technicalQc.decision), sensoryQc: countBy(records, (record) => record.sensoryQc.decision),
      lifecycleReasons: countBy(records, (record) => record.lifecycleReason?.code ?? "reconciled_active"),
    }),
    evidenceGaps: Object.freeze({ totalRecordsWithDebt: records.filter((record) => record.missingEvidenceCategories.length > 0).length, byCategory: Object.freeze(evidenceCategoryCounts) }),
    clearanceClaim: "not_commercially_cleared",
  });
};
export const currentCatalogReconciliation = reconcileCurrentCatalog();
export const serializeReconciliation = (report: CatalogReconciliationV1): string => JSON.stringify({ version: report.version, generatedFrom: report.generatedFrom, records: report.records, counts: report.counts, evidenceGaps: report.evidenceGaps, clearanceClaim: report.clearanceClaim });
export const renderHumanEvidenceReport = (report: CatalogReconciliationV1): string => [
  "Soundscape catalog evidence reconciliation v1",
  "The current catalog is not commercially cleared by this report.",
  `Catalog: ${report.counts.catalog.metadata} metadata; ${report.counts.catalog.mobilePlayback} mobile playback; ${report.counts.catalog.metadataOnly} metadata-only; ${report.counts.catalog.defaultSafe} default-safe; ${report.counts.catalog.choice} Choice.`,
  `Lifecycle: ${report.counts.lifecycle.legacy_active_pending_evidence ?? 0} legacy-active-pending-evidence; ${report.counts.lifecycle.active_mobile_playback ?? 0} reconciled active mobile playback.`,
  `Rights: ${report.counts.rights.legacy_active_pending_evidence ?? 0} pending evidence review; ${report.counts.rights.approved_for_defined_use ?? 0} approved for defined use; technical QC: ${report.counts.technicalQc.not_yet_reviewed ?? 0} not reviewed / ${report.counts.technicalQc.approved ?? 0} approved; sensory QC: ${report.counts.sensoryQc.not_yet_reviewed ?? 0} not reviewed / ${report.counts.sensoryQc.approved ?? 0} approved.`,
  `Lifecycle reasons: ${Object.entries(report.counts.lifecycleReasons).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join(", ")}.`,
  `Evidence debt: ${report.evidenceGaps.totalRecordsWithDebt} records. Missing categories: ${Object.entries(report.evidenceGaps.byCategory).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join(", ")}.`,
  "Legacy compatibility preserves accepted behavior but is not verified licensing or completed QC.",
].join("\n");

const knownValue = <T>(fact: { state: string; value?: T }): T | null => fact.state === "known" ? fact.value ?? null : null;
export const renderAttributionNotices = (report: Pick<CatalogReconciliationV1, "records">): string => report.records.map((record) => {
  const requiredText = knownValue<string>(record.rights.facts.requiredAttributionText);
  const links = knownValue<readonly string[]>(record.rights.facts.requiredAttributionLinks);
  if (requiredText) return `${record.catalogIdentity}: ${requiredText}${links?.length ? ` — ${links.join(", ")}` : ""}`;
  const creator = knownValue<string>(record.provenance.creatorUploaderPublisher);
  const source = knownValue<string>(record.provenance.canonicalSourceUrl);
  if (creator && source) return `${record.catalogIdentity}: ${creator} — ${source}`;
  return `${record.catalogIdentity}: Missing evidence — creator/source/license attribution cannot yet be generated.`;
}).join("\n");

const manifestRecords: readonly IngestionManifestRecordV1[] = Object.freeze(currentCatalogReconciliation.records.map((record) => Object.freeze({
  catalogIdentity: record.catalogIdentity,
  migrationClass: record.migrationClass,
  lifecycleState: record.lifecycleState,
  lifecycleReason: record.lifecycleReason,
  catalogStatus: record.catalogStatus,
  asset: record.catalogIdentity === SLOW_RAIN_RECONCILED_EVIDENCE_V1.catalogIdentity
    ? Object.freeze({ originalAssetId: record.provenance.originalAssetId, derivedAssetIds: record.provenance.derivedAssetIds, checksum: record.provenance.checksum })
    : Object.freeze({ originalAssetId: missingFact<string>("original asset relationship is not evidenced"), derivedAssetIds: Object.freeze([]), checksum: missingFact("original bytes unavailable for checksum") }),
  provenance: record.provenance,
  rights: record.rights,
  technicalQc: record.technicalQc,
  sensoryQc: record.sensoryQc,
  activationEvidence: record.activationEvidence,
  exposureGate: record.exposureGate,
  requestedActivation: "none" as const,
})));
export const currentCatalogManifest: IngestionManifestV1 = Object.freeze({ version: 1, contract: "soundscape-ingestion-manifest-v1", generatedFrom: catalogRepository.revision, records: manifestRecords });

const eligibleIds = new Set(currentCatalogReconciliation.records.filter((record) => decideActivationEligibility(record).mobilePlayback).map((record) => record.catalogIdentity));
const compatibility = catalogRepository.getCompatibilityProjection();
export const activationGatedMobileCatalogSoundsV1: MobileCatalogSound[] = compatibility.playback.filter((row) => eligibleIds.has(row.id));
export const activationGatedDefaultMobileCatalogSoundV1: MobileCatalogSound = activationGatedMobileCatalogSoundsV1[0];
export const activationGatedMobileCatalogLanesV1: string[] = Array.from(new Set(activationGatedMobileCatalogSoundsV1.map((sound) => sound.lane)));

export const catalogEvidenceRepository = Object.freeze({
  contractVersion: RECONCILIATION_CONTRACT_VERSION,
  getById: (id: string) => currentCatalogReconciliation.recordById[id] ?? null,
  enumerate: () => currentCatalogReconciliation.records,
  getCounts: () => currentCatalogReconciliation.counts,
  getEvidenceGaps: () => currentCatalogReconciliation.evidenceGaps,
  getManifest: () => currentCatalogManifest,
  decideById: (id: string) => { const record = currentCatalogReconciliation.recordById[id]; return record ? decideActivationEligibility(record) : null; },
  getMobilePlaybackProjection: () => activationGatedMobileCatalogSoundsV1,
});
