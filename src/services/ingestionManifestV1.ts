import { hasActivationProvenanceEvidence, type AssetChecksum, type EvidencedFact, type ProvenanceRecordV1 } from "../contracts/provenanceContractV1";
import { hasCompleteRightsEvidenceForDefinedUse, type RightsEvidenceRecordV1 } from "../contracts/rightsEvidenceContractV1";
import { isSensoryQcApproved, isTechnicalQcApproved, type SensoryQcRecordV1, type TechnicalQcRecordV1 } from "../contracts/qcContractV1";

export const INGESTION_MANIFEST_VERSION = "1" as const;
export type IngestionLifecycleState = "candidate" | "quarantine" | "evidence_incomplete" | "qc_pending" | "approved" | "legacy_active_pending_evidence" | "active_metadata_only" | "active_mobile_playback" | "restricted" | "retired" | "rejected";
export type LifecycleReasonV1 = Readonly<{ code: "legacy_evidence_migration" | "rights_restriction" | "technical_qc_problem" | "sensory_qc_problem" | "source_revoked" | "retired_by_review" | "rejected_by_review" | "other_reviewed_reason"; notes: string; evidenceReferenceIds: readonly string[] }>;
export type ActivationEvidenceV1 = Readonly<{
  taxonomyReview: EvidencedFact<"approved">;
  sensitivityExposureReview: EvidencedFact<"approved">;
  playbackEvidence: EvidencedFact<"metadata_only" | "mobile_playback">;
}>;
export type ExposureGateV1 = Readonly<{
  sensitiveFamily: boolean;
  requiresChoice: boolean;
  manualOnly: boolean;
  explicitSensitiveReviewCompleted: boolean;
}>;
export type IngestionManifestRecordV1 = Readonly<{
  catalogIdentity: string;
  migrationClass: "accepted_legacy_catalog" | "new_candidate";
  lifecycleState: IngestionLifecycleState;
  lifecycleReason: LifecycleReasonV1 | null;
  catalogStatus: IngestionLifecycleState;
  asset: Readonly<{ originalAssetId: EvidencedFact<string>; derivedAssetIds: readonly string[]; checksum: EvidencedFact<AssetChecksum> }>;
  provenance: ProvenanceRecordV1;
  rights: RightsEvidenceRecordV1;
  technicalQc: TechnicalQcRecordV1;
  sensoryQc: SensoryQcRecordV1;
  activationEvidence: ActivationEvidenceV1;
  exposureGate: ExposureGateV1;
  requestedActivation: "none" | "metadata_only" | "mobile_playback";
}>;
export type IngestionManifestV1 = Readonly<{ version: 1; contract: "soundscape-ingestion-manifest-v1"; generatedFrom: string; records: readonly IngestionManifestRecordV1[] }>;
export type ManifestDomainError = Readonly<{ code: "invalid_version" | "duplicate_identity" | "duplicate_checksum" | "implicit_activation" | "illegal_lifecycle_transition" | "missing_required_evidence" | "legacy_state_for_new_candidate" | "activation_gate_incomplete" | "sensitive_exposure_violation"; catalogIdentity: string | null; consumerMessage: string; developerDetail: string }>;
export type ManifestValidationReport = Readonly<{ ok: boolean; dryRun: boolean; errors: readonly ManifestDomainError[]; warnings: readonly Readonly<{ code: "near_duplicate_candidate" | "evidence_debt"; catalogIdentity: string; detail: string }>[]; activationChanges: readonly Readonly<{ catalogIdentity: string; from: string; to: string }>[]; rollbackPlan: readonly Readonly<{ catalogIdentity: string; restoreLifecycleState: string }>[] }>;

export const NEAR_DUPLICATE_STRATEGY = Object.freeze({ kind: "bounded_metadata_candidate" as const, fields: Object.freeze(["normalized title", "duration bucket when evidenced", "provider asset ID when evidenced"]), maximumCandidatesPerRecord: 10, provesIdentity: false, note: "Heuristic candidates require evidence or human review; similarity is never proof." });
const allowedTransitions: Readonly<Record<IngestionLifecycleState, readonly IngestionLifecycleState[]>> = {
  candidate: ["evidence_incomplete", "quarantine", "rejected"], quarantine: ["candidate", "rejected", "retired"],
  evidence_incomplete: ["qc_pending", "restricted", "rejected", "retired"], qc_pending: ["approved", "restricted", "quarantine", "rejected", "retired"],
  approved: ["active_metadata_only", "active_mobile_playback", "restricted", "retired", "rejected"],
  legacy_active_pending_evidence: ["approved", "restricted", "quarantine", "retired", "rejected"],
  active_metadata_only: ["active_mobile_playback", "restricted", "retired", "rejected"], active_mobile_playback: ["active_metadata_only", "restricted", "retired", "rejected"],
  restricted: ["approved", "retired", "rejected"], retired: [], rejected: [],
} as const satisfies Readonly<Record<IngestionLifecycleState, readonly IngestionLifecycleState[]>>;
export const canTransitionLifecycle = (from: IngestionLifecycleState, to: IngestionLifecycleState, hasRecordedReview: boolean): boolean => {
  if (to === "legacy_active_pending_evidence" || !allowedTransitions[from]?.includes(to)) return false;
  return from === "candidate" || from === "quarantine" ? true : hasRecordedReview;
};
const error = (code: ManifestDomainError["code"], catalogIdentity: string | null, developerDetail: string): ManifestDomainError => Object.freeze({ code, catalogIdentity, consumerMessage: "This catalog item is not available yet.", developerDetail });
const knownWithEvidence = <T>(fact: EvidencedFact<T> | undefined): boolean => !!fact && fact.state === "known" && fact.evidenceReferenceIds.length > 0;
const activationEvidenceComplete = (record: IngestionManifestRecordV1): boolean =>
  knownWithEvidence(record.activationEvidence?.taxonomyReview)
  && knownWithEvidence(record.activationEvidence?.sensitivityExposureReview)
  && knownWithEvidence(record.activationEvidence?.playbackEvidence);
const normalizeTitle = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export const validateManifest = (manifest: IngestionManifestV1, options: Readonly<{ dryRun: boolean }>): ManifestValidationReport => {
  const errors: ManifestDomainError[] = [];
  const warnings: { code: "near_duplicate_candidate" | "evidence_debt"; catalogIdentity: string; detail: string }[] = [];
  const activationChanges: { catalogIdentity: string; from: string; to: string }[] = [];
  const rollbackPlan: { catalogIdentity: string; restoreLifecycleState: string }[] = [];
  const identitySeen = new Set<string>();
  const checksumSeen = new Map<string, string>();
  const titleSeen = new Map<string, string[]>();
  if (manifest.version !== 1 || manifest.contract !== "soundscape-ingestion-manifest-v1") errors.push(error("invalid_version", null, "unsupported manifest version/contract"));
  for (const record of manifest.records) {
    if (identitySeen.has(record.catalogIdentity)) errors.push(error("duplicate_identity", record.catalogIdentity, "stable catalog identity occurs more than once"));
    identitySeen.add(record.catalogIdentity);
    if (record.asset.checksum.state === "known") {
      const key = `${record.asset.checksum.value.algorithm}:${record.asset.checksum.value.value}`;
      const prior = checksumSeen.get(key);
      if (prior && prior !== record.catalogIdentity) errors.push(error("duplicate_checksum", record.catalogIdentity, `checksum duplicates ${prior}`));
      else checksumSeen.set(key, record.catalogIdentity);
    }
    if (record.provenance.originalTitle.state === "known") {
      const key = normalizeTitle(record.provenance.originalTitle.value);
      const matches = titleSeen.get(key) ?? [];
      for (const prior of matches.slice(0, NEAR_DUPLICATE_STRATEGY.maximumCandidatesPerRecord)) warnings.push(Object.freeze({ code: "near_duplicate_candidate", catalogIdentity: record.catalogIdentity, detail: `bounded metadata heuristic resembles ${prior}; this is not proof of identity` }));
      matches.push(record.catalogIdentity); titleSeen.set(key, matches);
    }
    if (record.lifecycleState === "legacy_active_pending_evidence") {
      warnings.push(Object.freeze({ code: "evidence_debt", catalogIdentity: record.catalogIdentity, detail: "legacy compatibility is active while provenance, rights, and M3 QC evidence remain incomplete" }));
      if (record.migrationClass === "new_candidate") errors.push(error("legacy_state_for_new_candidate", record.catalogIdentity, "new candidates cannot use the accepted legacy catalog compatibility state"));
    }
    const activeOrApproved = record.lifecycleState === "approved" || record.lifecycleState === "active_metadata_only" || record.lifecycleState === "active_mobile_playback";
    const completeActivationEvidence = hasActivationProvenanceEvidence(record.provenance)
      && hasCompleteRightsEvidenceForDefinedUse(record.rights)
      && isTechnicalQcApproved(record.technicalQc)
      && isSensoryQcApproved(record.sensoryQc)
      && activationEvidenceComplete(record);
    if (record.migrationClass === "new_candidate" && activeOrApproved && !completeActivationEvidence) {
      errors.push(error("activation_gate_incomplete", record.catalogIdentity, "new candidate requires evidenced provenance, rights, technical-QC, human sensory-QC, taxonomy, sensitivity/exposure, and playback gates"));
    }
    const sensitiveExposureValid = !record.exposureGate?.sensitiveFamily || (record.exposureGate.requiresChoice && record.exposureGate.manualOnly && record.exposureGate.explicitSensitiveReviewCompleted);
    if (!sensitiveExposureValid && activeOrApproved) {
      errors.push(error("sensitive_exposure_violation", record.catalogIdentity, "sensitive-family activation requires completed explicit review and Choice/manual-only exposure"));
    }
    const reasonRequired = record.lifecycleState === "quarantine" || record.lifecycleState === "restricted" || record.lifecycleState === "retired" || record.lifecycleState === "rejected";
    if (reasonRequired && !record.lifecycleReason) errors.push(error("missing_required_evidence", record.catalogIdentity, `${record.lifecycleState} lifecycle state requires a structured reviewed reason`));
    if (record.requestedActivation !== "none") {
      if (record.lifecycleState !== "approved" || record.migrationClass !== "new_candidate" || !completeActivationEvidence || !sensitiveExposureValid) errors.push(error("implicit_activation", record.catalogIdentity, "activation requested without complete reviewed new-candidate gates and explicit transition"));
      else {
        const target = record.requestedActivation === "mobile_playback" ? "active_mobile_playback" : "active_metadata_only";
        activationChanges.push(Object.freeze({ catalogIdentity: record.catalogIdentity, from: record.lifecycleState, to: target }));
        rollbackPlan.push(Object.freeze({ catalogIdentity: record.catalogIdentity, restoreLifecycleState: record.lifecycleState }));
      }
    }
  }
  return Object.freeze({ ok: errors.length === 0, dryRun: options.dryRun, errors: Object.freeze(errors), warnings: Object.freeze(warnings), activationChanges: Object.freeze(activationChanges), rollbackPlan: Object.freeze(rollbackPlan) });
};

export const serializeManifest = (manifest: IngestionManifestV1): string => JSON.stringify({ ...manifest, records: [...manifest.records].sort((a, b) => a.catalogIdentity.localeCompare(b.catalogIdentity)) });
