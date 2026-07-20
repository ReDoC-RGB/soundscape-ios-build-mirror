export const PERSISTENT_DOWNLOAD_RIGHTS_CONTRACT_VERSION = "1" as const;

export type PersistentDownloadRightsStateV1 =
  | "eligible_persistent_download"
  | "bundled_or_local"
  | "streaming_only"
  | "rights_unknown"
  | "restricted_or_revoked"
  | "unavailable";

export const PERSISTENT_DOWNLOAD_CUSTOMER_COPY_V1 = Object.freeze({
  eligible_persistent_download: "Download for offline",
  bundled_or_local: "Available offline",
  streaming_only: "This sound is available online only.",
  rights_unknown: "Offline download isn't available for this sound.",
  restricted_or_revoked: "This sound isn't available.",
  unavailable: "Offline download isn't available for this sound.",
} satisfies Readonly<Record<PersistentDownloadRightsStateV1, string>>);

export type PersistentDownloadEvidenceV1 = Readonly<{
  rightsRecord: string;
  activationRecord: string;
  licenseOrProviderBasis: string;
  sourceIdentity: string;
  sourceUri: string | null;
  sourceChecksumSha256: string;
}>;

export type PersistentDownloadDeliveryV1 = Readonly<{
  remoteUri: string;
  expectedBytes: number;
  checksumSha256: string;
  mediaType: "audio/mpeg";
}>;

export type PersistentDownloadCatalogRecordV1 = Readonly<{
  version: 1;
  catalogIdentity: string;
  catalogCohort: "m6" | "pre_m6";
  catalogAudioUri: string;
  state: PersistentDownloadRightsStateV1;
  lifecycleState: "active" | "held" | "blocked" | "revoked" | "deprecated";
  activationStatus: string;
  attributionText: string | null;
  evidence: PersistentDownloadEvidenceV1;
  delivery: PersistentDownloadDeliveryV1 | null;
}>;

export type PersistentDownloadResolutionV1 = Readonly<{
  state: PersistentDownloadRightsStateV1;
  eligible: boolean;
  customerCopy: string;
  technicalReason: string;
  record: PersistentDownloadCatalogRecordV1 | null;
}>;

export function createPersistentDownloadResolutionV1(input: Readonly<{
  state: PersistentDownloadRightsStateV1;
  technicalReason: string;
  record?: PersistentDownloadCatalogRecordV1 | null;
}>): PersistentDownloadResolutionV1 {
  const eligible = input.state === "eligible_persistent_download";
  return Object.freeze({
    state: input.state,
    eligible,
    customerCopy: PERSISTENT_DOWNLOAD_CUSTOMER_COPY_V1[input.state],
    technicalReason: input.technicalReason,
    record: input.record ?? null,
  });
}

export type LayerPersistentDownloadClassificationV1 =
  | "download-eligible"
  | "already-downloaded"
  | "bundled-or-local"
  | "streaming-only"
  | "rights-unknown"
  | "restricted"
  | "unavailable";

export type LayerPersistentDownloadInputV1 = Readonly<{
  layerId: string;
  layerName: string;
  soundId: string;
  audioUrl: string;
  manifestState: string | null;
}>;

export type LayerPersistentDownloadResolutionV1 = Readonly<{
  layerId: string;
  layerName: string;
  soundId: string;
  classification: LayerPersistentDownloadClassificationV1;
  eligible: boolean;
  customerCopy: string;
  technicalReason: string;
}>;

export function classifyPersistentDownloadLayerV1(
  layer: LayerPersistentDownloadInputV1,
  resolution: PersistentDownloadResolutionV1,
): LayerPersistentDownloadResolutionV1 {
  const classification: LayerPersistentDownloadClassificationV1 =
    resolution.state === "eligible_persistent_download"
      ? layer.manifestState === "available" ? "already-downloaded" : "download-eligible"
      : resolution.state === "bundled_or_local" ? "bundled-or-local"
        : resolution.state === "streaming_only" ? "streaming-only"
          : resolution.state === "rights_unknown" ? "rights-unknown"
            : resolution.state === "restricted_or_revoked" ? "restricted"
              : "unavailable";
  const customerCopy = classification === "already-downloaded" || classification === "bundled-or-local"
    ? PERSISTENT_DOWNLOAD_CUSTOMER_COPY_V1.bundled_or_local
    : resolution.customerCopy;
  return Object.freeze({
    layerId: layer.layerId,
    layerName: layer.layerName,
    soundId: layer.soundId,
    classification,
    eligible: resolution.eligible,
    customerCopy,
    technicalReason: resolution.technicalReason,
  });
}
