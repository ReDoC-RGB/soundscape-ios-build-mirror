import { missingFact, notYetReviewedFact, type EvidenceReference, type EvidencedFact } from "./provenanceContractV1";
export const RIGHTS_EVIDENCE_CONTRACT_VERSION = "1" as const;
export type RightsCapabilityEvidence = Readonly<{ commercialUse: EvidencedFact<boolean>; derivatives: EvidencedFact<boolean>; redistributionEmbedding: EvidencedFact<boolean>; attributionRequired: EvidencedFact<boolean>; shareAlikeOrNotice: EvidencedFact<boolean>; providerSpecificTerms: EvidencedFact<string> }>;
export type RightsEvidenceFactsV1 = Readonly<{ licenseName: EvidencedFact<string>; licenseVersion: EvidencedFact<string>; canonicalLicenseUrl: EvidencedFact<string>; assertedBySource: EvidencedFact<string>; capabilities: RightsCapabilityEvidence; requiredAttributionText: EvidencedFact<string>; requiredAttributionLinks: EvidencedFact<readonly string[]>; sourceReference: EvidencedFact<string>; evidenceReferences: readonly EvidenceReference[] }>;
export type RightsReviewState = "unreviewed" | "evidence_incomplete" | "review_required" | "approved_for_defined_use" | "restricted" | "rejected" | "legacy_active_pending_evidence";
export type OperationalRightsDecisionV1 = Readonly<{ state: RightsReviewState; definedUse: EvidencedFact<string>; reviewer: EvidencedFact<string>; reviewedAt: EvidencedFact<string>; notes: EvidencedFact<string>; sourceReference: EvidencedFact<string>; legalOpinion: false }>;
export type RightsEvidenceRecordV1 = Readonly<{ version: 1; catalogIdentity: string; facts: RightsEvidenceFactsV1; reviewDecision: OperationalRightsDecisionV1 }>;
const missingCapabilities = (): RightsCapabilityEvidence => Object.freeze({ commercialUse: missingFact("commercial-use evidence missing"), derivatives: missingFact("derivative permission evidence missing"), redistributionEmbedding: missingFact("redistribution/embedding evidence missing"), attributionRequired: missingFact("attribution requirement evidence missing"), shareAlikeOrNotice: missingFact("share-alike/notice evidence missing"), providerSpecificTerms: missingFact("provider-specific terms evidence missing") });
export const createLegacyPendingRights = (catalogIdentity: string): RightsEvidenceRecordV1 => Object.freeze({ version: 1, catalogIdentity, facts: Object.freeze({ licenseName: missingFact("license evidence missing"), licenseVersion: missingFact("license version evidence missing"), canonicalLicenseUrl: missingFact("canonical license URL evidence missing"), assertedBySource: missingFact("source license assertion missing"), capabilities: missingCapabilities(), requiredAttributionText: missingFact("attribution evidence missing"), requiredAttributionLinks: missingFact("attribution links missing"), sourceReference: missingFact("rights source reference missing"), evidenceReferences: Object.freeze([]) }), reviewDecision: Object.freeze({ state: "legacy_active_pending_evidence", definedUse: notYetReviewedFact("defined-use review not completed"), reviewer: notYetReviewedFact("reviewer not assigned"), reviewedAt: notYetReviewedFact("review not completed"), notes: notYetReviewedFact("operational rights review pending"), sourceReference: missingFact("rights evidence source missing"), legalOpinion: false }) });
export const isRightsApprovedForDefinedUse = (record: RightsEvidenceRecordV1): boolean => record.reviewDecision.state === "approved_for_defined_use";
const isKnownWithEvidence = <T>(fact: EvidencedFact<T>): boolean => fact.state === "known" && fact.evidenceReferenceIds.length > 0;
export const hasCompleteRightsEvidenceForDefinedUse = (record: RightsEvidenceRecordV1): boolean => {
  const { facts, reviewDecision } = record;
  return reviewDecision.state === "approved_for_defined_use"
    && isKnownWithEvidence(reviewDecision.definedUse)
    && isKnownWithEvidence(reviewDecision.reviewer)
    && isKnownWithEvidence(reviewDecision.reviewedAt)
    && isKnownWithEvidence(reviewDecision.sourceReference)
    && isKnownWithEvidence(facts.licenseName)
    && isKnownWithEvidence(facts.canonicalLicenseUrl)
    && isKnownWithEvidence(facts.assertedBySource)
    && isKnownWithEvidence(facts.sourceReference)
    && isKnownWithEvidence(facts.capabilities.commercialUse)
    && isKnownWithEvidence(facts.capabilities.derivatives)
    && isKnownWithEvidence(facts.capabilities.redistributionEmbedding)
    && isKnownWithEvidence(facts.capabilities.attributionRequired)
    && isKnownWithEvidence(facts.capabilities.shareAlikeOrNotice)
    && isKnownWithEvidence(facts.capabilities.providerSpecificTerms);
};
