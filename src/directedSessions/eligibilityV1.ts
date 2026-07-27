import type { DirectedSceneIdV1 } from "./sceneScoresV1";
import { getDirectedSceneScoreV1 } from "./sceneScoresV1";
import { getDirectedContentEvidenceV1 } from "./directedContentEvidenceV1";
import { SLOW_RAIN_RECONCILED_EVIDENCE_V1 } from "../catalog/slowRainReconciledEvidenceV1";

export type DirectedOfflinePackageAssetV1 = Readonly<{
  assetId: string;
  remoteUri: string;
  expectedBytes: number | null;
  checksumSha256: string | null;
  mediaType: "audio/mpeg";
  fileExtension: ".mp3";
  persistentDownloadEligible: boolean;
  primaryRequired: boolean;
  replacementRequired: boolean;
}>;

export type DirectedOfflinePackageV1 = Readonly<{
  contractVersion: 1;
  sceneId: DirectedSceneIdV1;
  scoreHash: string;
  productionEligible: boolean;
  assets: readonly DirectedOfflinePackageAssetV1[];
}>;

export type DirectedManifestProjectionItemV1 = Readonly<{
  assetId: string;
  state: string;
  expectedBytes?: number | null;
  verifiedBytes?: number | null;
  checksumSha256?: string | null;
  localUri?: string | null;
  stage?: string | null;
}>;

export type DirectedAvailabilityStateV1 =
  | "checking"
  | "native-unavailable"
  | "content-gated"
  | "ready-to-stream"
  | "offline-ready"
  | "offline-missing"
  | "downloading"
  | "package-corrupt";

export type DirectedAvailabilityProjectionV1 = Readonly<{
  state: DirectedAvailabilityStateV1;
  customerCopy: string;
  primaryLabel: string;
  secondaryLabel: string | null;
  startable: boolean;
  offlineReady: boolean;
  playingSourceMode: "local" | "remote" | null;
  verifiedCount: number;
  totalCount: number;
  missingAssetIds: readonly string[];
  corruptAssetIds: readonly string[];
}>;

const packageAsset = (
  assetId: string,
  remoteUri: string,
  expectedBytes: number | null,
  checksumSha256: string | null,
  options: Readonly<{ persistentDownloadEligible?: boolean; primaryRequired?: boolean; replacementRequired?: boolean }> = {},
): DirectedOfflinePackageAssetV1 => Object.freeze({
  assetId,
  remoteUri,
  expectedBytes,
  checksumSha256,
  mediaType: "audio/mpeg",
  fileExtension: ".mp3",
  persistentDownloadEligible: options.persistentDownloadEligible ?? true,
  primaryRequired: options.primaryRequired ?? true,
  replacementRequired: options.replacementRequired ?? true,
});

const evidencedPackageAsset = (
  assetId: string,
  options: Readonly<{ primaryRequired?: boolean; replacementRequired?: boolean }> = {},
): DirectedOfflinePackageAssetV1 => {
  const evidence = getDirectedContentEvidenceV1(assetId);
  return packageAsset(
    evidence.assetId,
    evidence.productionUri,
    evidence.expectedBytes,
    evidence.checksumSha256,
    {
      persistentDownloadEligible: evidence.persistentDownloadAllowed,
      primaryRequired: options.primaryRequired,
      replacementRequired: options.replacementRequired,
    },
  );
};

export const DIRECTED_OFFLINE_PACKAGES_V1: Readonly<Record<DirectedSceneIdV1, DirectedOfflinePackageV1>> = Object.freeze({
  "rain-desk-v1": Object.freeze({
    contractVersion: 1,
    sceneId: "rain-desk-v1",
    scoreHash: "d6de12e1809d5876928876f07812af376dddda8e518cafb4b746833e08c0b33d",
    productionEligible: true,
    assets: Object.freeze([
      packageAsset(
        SLOW_RAIN_RECONCILED_EVIDENCE_V1.catalogIdentity,
        SLOW_RAIN_RECONCILED_EVIDENCE_V1.delivery.remoteUri,
        SLOW_RAIN_RECONCILED_EVIDENCE_V1.delivery.expectedBytes,
        SLOW_RAIN_RECONCILED_EVIDENCE_V1.delivery.checksumSha256,
        { persistentDownloadEligible: true, primaryRequired: true, replacementRequired: false },
      ),
      evidencedPackageAsset("m6-nonvoice-bb9-026-book-handling"),
      evidencedPackageAsset("m6-nonvoice-bb9-032-paper-handling"),
      evidencedPackageAsset("m6-nonvoice-bb9-033-pencil-and-marker-writing"),
      evidencedPackageAsset("m6-nonvoice-bb9-025-book-open-close-and-pages"),
    ]),
  }),
  "porcelain-table-v1": Object.freeze({
    contractVersion: 1,
    sceneId: "porcelain-table-v1",
    scoreHash: "41f373d964fd3e8e8544481b414df03cb6a60c7737cbd3e9557a7d2687a8c6ee",
    productionEligible: true,
    assets: Object.freeze([
      evidencedPackageAsset("m6-nonvoice-bb9-013-shells-on-marble-and-ceramic", { primaryRequired: true }),
      evidencedPackageAsset("m6-nonvoice-bb10-009-finger-tapping-on-table"),
      evidencedPackageAsset("m6-nonvoice-bb9-009-finger-tapping-on-metal-pipe"),
      evidencedPackageAsset("m6-nonvoice-bb9-012-screwdriver-taps-and-coin-jar"),
    ]),
  }),
  "soft-wardrobe-v1": Object.freeze({
    contractVersion: 1,
    sceneId: "soft-wardrobe-v1",
    scoreHash: "9b67643332bb8ade2a78d1d7682474430cce819d80a2fcbc0b74f8b0f9c4706a",
    productionEligible: true,
    assets: Object.freeze([
      evidencedPackageAsset("m6-nonvoice-bb9-057-zip-and-rustling-fabric", { primaryRequired: true }),
      evidencedPackageAsset("m6-nonvoice-bb9-050-leather-jacket-handling"),
      evidencedPackageAsset("m6-nonvoice-bb9-051-plastic-hairbrush"),
    ]),
  }),
});

const exactVerifiedLocal = (asset: DirectedOfflinePackageAssetV1, item: DirectedManifestProjectionItemV1 | undefined): boolean => Boolean(
  asset.persistentDownloadEligible
  && asset.expectedBytes !== null
  && asset.checksumSha256
  && item
  && item.state === "available"
  && item.expectedBytes === asset.expectedBytes
  && item.verifiedBytes === asset.expectedBytes
  && item.checksumSha256?.toLowerCase() === asset.checksumSha256
  && typeof item.localUri === "string"
  && item.localUri.length > 0,
);

const incompleteButActive = (item: DirectedManifestProjectionItemV1 | undefined): boolean => Boolean(item && ["queued", "downloading", "verifying"].includes(item.state));
const corruptOrFailed = (asset: DirectedOfflinePackageAssetV1, item: DirectedManifestProjectionItemV1 | undefined): boolean => {
  if (!item) return false;
  if (["failed/retryable", "unusable", "quarantined"].includes(item.state)) return true;
  if (item.state !== "available") return false;
  return !exactVerifiedLocal(asset, item);
};

export function validateDirectedPackageV1(
  packageDefinition: DirectedOfflinePackageV1,
  manifestItems: readonly DirectedManifestProjectionItemV1[],
): Readonly<{ valid: boolean; verifiedAssetIds: readonly string[]; missingAssetIds: readonly string[]; corruptAssetIds: readonly string[] }> {
  const byId = new Map(manifestItems.map((item) => [item.assetId, item]));
  const eligibleAssets = packageDefinition.assets.filter((assetDefinition) => assetDefinition.persistentDownloadEligible);
  const verifiedAssetIds = eligibleAssets.filter((assetDefinition) => exactVerifiedLocal(assetDefinition, byId.get(assetDefinition.assetId))).map((assetDefinition) => assetDefinition.assetId);
  const corruptAssetIds = eligibleAssets.filter((assetDefinition) => corruptOrFailed(assetDefinition, byId.get(assetDefinition.assetId))).map((assetDefinition) => assetDefinition.assetId);
  const missingAssetIds = eligibleAssets.filter((assetDefinition) => !verifiedAssetIds.includes(assetDefinition.assetId) && !corruptAssetIds.includes(assetDefinition.assetId)).map((assetDefinition) => assetDefinition.assetId);
  return Object.freeze({
    valid: packageDefinition.productionEligible && verifiedAssetIds.length === eligibleAssets.length && corruptAssetIds.length === 0,
    verifiedAssetIds: Object.freeze(verifiedAssetIds),
    missingAssetIds: Object.freeze(missingAssetIds),
    corruptAssetIds: Object.freeze(corruptAssetIds),
  });
}

export function projectDirectedAvailabilityV1(input: Readonly<{
  sceneId: DirectedSceneIdV1;
  capabilityVersion: number | null;
  networkAvailable: boolean;
  manifestItems: readonly DirectedManifestProjectionItemV1[];
}>): DirectedAvailabilityProjectionV1 {
  const packageDefinition = DIRECTED_OFFLINE_PACKAGES_V1[input.sceneId];
  const eligibleAssets = packageDefinition.assets.filter((assetDefinition) => assetDefinition.persistentDownloadEligible);
  const byId = new Map(input.manifestItems.map((item) => [item.assetId, item]));
  const validation = validateDirectedPackageV1(packageDefinition, input.manifestItems);
  const base = {
    verifiedCount: validation.verifiedAssetIds.length,
    totalCount: eligibleAssets.length,
    missingAssetIds: validation.missingAssetIds,
    corruptAssetIds: validation.corruptAssetIds,
  };
  if ((input.capabilityVersion ?? 0) < 1) {
    return Object.freeze({ ...base, state: "native-unavailable", customerCopy: "Sessions are unavailable in this build.", primaryLabel: "Open Library", secondaryLabel: "Try again", startable: false, offlineReady: false, playingSourceMode: null });
  }
  if (!packageDefinition.productionEligible) {
    return Object.freeze({ ...base, state: "content-gated", customerCopy: "Rain Desk isn’t available in this beta yet.", primaryLabel: "Start unavailable", secondaryLabel: null, startable: false, offlineReady: false, playingSourceMode: null });
  }
  if (eligibleAssets.some((assetDefinition) => incompleteButActive(byId.get(assetDefinition.assetId)))) {
    return Object.freeze({ ...base, state: "downloading", customerCopy: `Downloading ${base.verifiedCount} of ${base.totalCount} sounds…`, primaryLabel: "Cancel download", secondaryLabel: null, startable: false, offlineReady: false, playingSourceMode: null });
  }
  if (validation.corruptAssetIds.length) {
    return Object.freeze({ ...base, state: "package-corrupt", customerCopy: "A session sound needs to be downloaded again.", primaryLabel: "Retry download", secondaryLabel: null, startable: false, offlineReady: false, playingSourceMode: null });
  }
  if (validation.valid) {
    return Object.freeze({ ...base, state: "offline-ready", customerCopy: "Available offline.", primaryLabel: "Start session", secondaryLabel: null, startable: true, offlineReady: true, playingSourceMode: "local" });
  }
  if (!input.networkAvailable) {
    return Object.freeze({ ...base, state: "offline-missing", customerCopy: "This session isn’t downloaded.", primaryLabel: "Unavailable offline", secondaryLabel: "Try again when online", startable: false, offlineReady: false, playingSourceMode: null });
  }
  return Object.freeze({ ...base, state: "ready-to-stream", customerCopy: "Streaming available.", primaryLabel: "Start session", secondaryLabel: "Download", startable: true, offlineReady: false, playingSourceMode: "remote" });
}

export function createDirectedDownloadInputsV1(sceneId: DirectedSceneIdV1, now: string) {
  const packageDefinition = DIRECTED_OFFLINE_PACKAGES_V1[sceneId];
  if (!packageDefinition.productionEligible) throw new Error("This session package is not available in this beta.");
  return Object.freeze(packageDefinition.assets.map((assetDefinition) => {
    if (!assetDefinition.persistentDownloadEligible || assetDefinition.expectedBytes === null || !assetDefinition.checksumSha256) throw new Error(`Package asset ${assetDefinition.assetId} is not eligible.`);
    return Object.freeze({
      assetId: assetDefinition.assetId,
      remoteUri: assetDefinition.remoteUri,
      catalogRevision: assetDefinition.assetId === SLOW_RAIN_RECONCILED_EVIDENCE_V1.catalogIdentity
        ? "slow-rain-reconciled-evidence-v1"
        : "m6-traditional-asmr-catalog-expansion-v1",
      sourceRevision: packageDefinition.scoreHash,
      expectedBytes: assetDefinition.expectedBytes,
      checksumSha256: assetDefinition.checksumSha256,
      mediaType: assetDefinition.mediaType,
      fileExtension: assetDefinition.fileExtension,
      attributionRequired: false,
      rights: Object.freeze({
        bundledAllowed: true,
        cacheAllowed: true,
        persistentDownloadAllowed: true,
        streamingAllowed: true,
        redistributionAllowed: true,
        attributionRequired: false,
        offlineEligibilityReason: assetDefinition.assetId === SLOW_RAIN_RECONCILED_EVIDENCE_V1.catalogIdentity
          ? "accepted exact CC0 source-to-delivery and mobile-playback evidence"
          : "accepted exact M6 persistent delivery evidence",
        offlineEligibilityVersion: "1" as const,
      }),
      lifecycleState: "active" as const,
      now,
    });
  }));
}

export function resolveDirectedAssetSourcesV1(input: Readonly<{
  sceneId: DirectedSceneIdV1;
  manifestItems: readonly DirectedManifestProjectionItemV1[];
  allowRemote: boolean;
}>): Readonly<{ usable: boolean; sourceMode: "local" | "remote" | null; sourceByAssetId: Readonly<Record<string, string>>; missingAssetIds: readonly string[] }> {
  const score = getDirectedSceneScoreV1(input.sceneId);
  const packageDefinition = DIRECTED_OFFLINE_PACKAGES_V1[input.sceneId];
  const byId = new Map(input.manifestItems.map((item) => [item.assetId, item]));
  const sourceByAssetId: Record<string, string> = {};
  const missingAssetIds: string[] = [];
  let usedRemote = false;
  for (const scoreAsset of score.assets) {
    const packageAssetDefinition = packageDefinition.assets.find((candidate) => candidate.assetId === scoreAsset.assetId);
    const manifestItem = byId.get(scoreAsset.assetId);
    if (packageAssetDefinition && exactVerifiedLocal(packageAssetDefinition, manifestItem)) {
      sourceByAssetId[scoreAsset.assetId] = manifestItem?.localUri ?? "";
    } else if (input.allowRemote && scoreAsset.sourceUri) {
      sourceByAssetId[scoreAsset.assetId] = scoreAsset.sourceUri;
      usedRemote = true;
    } else {
      missingAssetIds.push(scoreAsset.assetId);
    }
  }
  return Object.freeze({
    usable: missingAssetIds.length === 0,
    sourceMode: missingAssetIds.length ? null : usedRemote ? "remote" : "local",
    sourceByAssetId: Object.freeze(sourceByAssetId),
    missingAssetIds: Object.freeze(missingAssetIds),
  });
}

export function projectDifferentTextureAvailabilityV1(input: Readonly<{
  sceneId: DirectedSceneIdV1;
  fromAssetId: string;
  toAssetId: string;
  manifestItems: readonly DirectedManifestProjectionItemV1[];
  offline: boolean;
}>): Readonly<{ enabled: boolean; accessibilityHint: string }> {
  const packageDefinition = DIRECTED_OFFLINE_PACKAGES_V1[input.sceneId];
  const score = getDirectedSceneScoreV1(input.sceneId);
  const compatible = score.texturePairs.some((pair) => pair.assetIds.includes(input.fromAssetId) && pair.assetIds.includes(input.toAssetId));
  const target = packageDefinition.assets.find((assetDefinition) => assetDefinition.assetId === input.toAssetId);
  const local = target ? exactVerifiedLocal(target, input.manifestItems.find((item) => item.assetId === target.assetId)) : false;
  const enabled = compatible && (!input.offline || local);
  return Object.freeze({
    enabled,
    accessibilityHint: enabled ? "Uses the next compatible session texture at a safe phase boundary." : "No compatible downloaded texture is available for the next phase.",
  });
}
