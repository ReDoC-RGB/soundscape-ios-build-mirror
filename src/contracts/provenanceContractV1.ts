export const PROVENANCE_CONTRACT_VERSION = "1" as const;
export type EvidenceReference = Readonly<{ id: string; kind: "source_url" | "snapshot" | "receipt" | "file_record" | "review_note"; locator: string; capturedAt: string | null }>;
export type ResolvedFact<T> = Readonly<{ state: "known"; value: T; evidenceReferenceIds: readonly string[] }>;
export type UnresolvedFact = Readonly<{ state: "unknown" | "missing" | "not_applicable" | "not_yet_reviewed"; reason: string }>;
export type EvidencedFact<T> = ResolvedFact<T> | UnresolvedFact;
export const knownFact = <T>(value: T, evidenceReferenceIds: readonly string[]): EvidencedFact<T> => Object.freeze({ state: "known", value, evidenceReferenceIds: Object.freeze([...evidenceReferenceIds]) });
export const unknownFact = <T = never>(reason: string): EvidencedFact<T> => Object.freeze({ state: "unknown", reason });
export const missingFact = <T = never>(reason: string): EvidencedFact<T> => Object.freeze({ state: "missing", reason });
export const notApplicableFact = <T = never>(reason: string): EvidencedFact<T> => Object.freeze({ state: "not_applicable", reason });
export const notYetReviewedFact = <T = never>(reason: string): EvidencedFact<T> => Object.freeze({ state: "not_yet_reviewed", reason });

export type AssetChecksum = Readonly<{ algorithm: "sha256" | "sha512"; value: string }>;
export type TransformationRecordV1 = Readonly<{
  id: string; tool: EvidencedFact<string>; toolVersion: EvidencedFact<string>; settings: EvidencedFact<Readonly<Record<string, string | number | boolean>>>;
  inputChecksum: EvidencedFact<AssetChecksum>; outputChecksum: EvidencedFact<AssetChecksum>; timestamp: EvidencedFact<string>;
  status: "planned" | "completed" | "failed" | "not_evidenced";
}>;
export type AssetRelationshipV1 = Readonly<{ fromAssetId: string; toAssetId: string; relationship: "original_to_derived" | "catalog_to_original" | "catalog_to_mobile_playback" | "catalog_to_metadata_only" }>;
export type ProvenanceRecordV1 = Readonly<{
  version: 1; catalogIdentity: string; sourceProviderIdentity: EvidencedFact<string>; canonicalSourceUrl: EvidencedFact<string>;
  originalTitle: EvidencedFact<string>; creatorUploaderPublisher: EvidencedFact<string>; originalAssetIdentifier: EvidencedFact<string>;
  acquisitionTimestamp: EvidencedFact<string>; originalFilename: EvidencedFact<string>; byteSize: EvidencedFact<number>;
  checksum: EvidencedFact<AssetChecksum>; mediaType: EvidencedFact<string>; originalAssetId: EvidencedFact<string>;
  derivedAssetIds: readonly string[]; relationships: readonly AssetRelationshipV1[]; transformations: readonly TransformationRecordV1[];
  evidenceReferences: readonly EvidenceReference[];
}>;
export const createMissingLegacyProvenance = (catalogIdentity: string): ProvenanceRecordV1 => Object.freeze({
  version: 1, catalogIdentity,
  sourceProviderIdentity: missingFact("source/provider evidence is not present in the accepted catalog"),
  canonicalSourceUrl: missingFact("canonical source URL is not present in the accepted catalog"),
  originalTitle: missingFact("original source title is not present in the accepted catalog"),
  creatorUploaderPublisher: missingFact("creator/uploader/publisher evidence is not present in the accepted catalog"),
  originalAssetIdentifier: missingFact("original asset identifier is not present in the accepted catalog"),
  acquisitionTimestamp: missingFact("acquisition timestamp is not evidenced"),
  originalFilename: missingFact("original filename is not evidenced"), byteSize: missingFact("original bytes are unavailable for measurement"),
  checksum: missingFact("original bytes are unavailable for checksum calculation"), mediaType: missingFact("original media type is not evidenced"),
  originalAssetId: missingFact("original asset relationship is not evidenced"), derivedAssetIds: Object.freeze([]), relationships: Object.freeze([]),
  transformations: Object.freeze([]), evidenceReferences: Object.freeze([]),
});
const isKnownWithEvidence = <T>(fact: EvidencedFact<T>): boolean => fact.state === "known" && fact.evidenceReferenceIds.length > 0;
export const hasActivationProvenanceEvidence = (record: ProvenanceRecordV1): boolean =>
  isKnownWithEvidence(record.sourceProviderIdentity)
  && isKnownWithEvidence(record.originalAssetIdentifier)
  && isKnownWithEvidence(record.checksum)
  && isKnownWithEvidence(record.originalAssetId)
  && record.evidenceReferences.length > 0;
