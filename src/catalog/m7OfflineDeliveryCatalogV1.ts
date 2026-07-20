import type { CatalogDeliveryRightsV1, LifecycleState } from "../contracts/catalogContractV2";
import { m6PersistentDownloadRightsRecordsV1 } from "./persistentDownloadRightsCatalogV1";

export const M7_OFFLINE_DELIVERY_CATALOG_VERSION = "2" as const;
export type M7OfflineAssetDescriptorV1 = Readonly<{
  assetId: string;
  catalogRevision: "alpha-0.13.2-persistent-download-rights-2026-07-18";
  sourceRevision: string;
  remoteUri: string;
  expectedBytes: number;
  checksumSha256: string;
  mediaType: "audio/mpeg";
  fileExtension: ".mp3";
  lifecycleState: LifecycleState;
  rights: CatalogDeliveryRightsV1;
  attributionText: string | null;
}>;

const acceptedPersistentDownloadRights = (reason: string, attributionRequired: boolean): CatalogDeliveryRightsV1 => Object.freeze({
  bundledAllowed: true,
  cacheAllowed: true,
  persistentDownloadAllowed: true,
  streamingAllowed: true,
  redistributionAllowed: true,
  attributionRequired,
  offlineEligibilityReason: reason,
  offlineEligibilityVersion: "1",
});

export const m7OfflineDeliveryCatalogV1: readonly M7OfflineAssetDescriptorV1[] = Object.freeze(
  m6PersistentDownloadRightsRecordsV1.map((record) => {
    if (record.state !== "eligible_persistent_download" || !record.delivery || record.lifecycleState !== "active") {
      throw new Error(`${record.catalogIdentity} cannot enter the M7 download adapter without active exact persistent-download evidence.`);
    }
    return Object.freeze({
      assetId: record.catalogIdentity,
      catalogRevision: "alpha-0.13.2-persistent-download-rights-2026-07-18" as const,
      sourceRevision: record.evidence.rightsRecord,
      remoteUri: record.delivery.remoteUri,
      expectedBytes: record.delivery.expectedBytes,
      checksumSha256: record.delivery.checksumSha256,
      mediaType: record.delivery.mediaType,
      fileExtension: ".mp3" as const,
      lifecycleState: record.lifecycleState,
      rights: acceptedPersistentDownloadRights(
        `Exact accepted evidence permits persistent local storage of ${record.catalogIdentity} delivery bytes.`,
        record.attributionText !== null,
      ),
      attributionText: record.attributionText,
    });
  }),
);

const byId = new Map(m7OfflineDeliveryCatalogV1.map((descriptor) => [descriptor.assetId, descriptor]));
export const getM7OfflineAssetDescriptor = (assetId: string): M7OfflineAssetDescriptorV1 | null => byId.get(assetId) ?? null;
