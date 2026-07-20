import type { DirectedSceneIdV1 } from "./sceneScoresV1";
import { getDirectedSceneScoreV1 } from "./sceneScoresV1";
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

export const DIRECTED_OFFLINE_PACKAGES_V1: Readonly<Record<DirectedSceneIdV1, DirectedOfflinePackageV1>> = Object.freeze({
  "rain-desk-v1": Object.freeze({
    contractVersion: 1,
    sceneId: "rain-desk-v1",
    scoreHash: "06271ef741f41a84e282aba9469514d65763e4a2075772b5508fa4dcc9eabd35",
    productionEligible: true,
    assets: Object.freeze([
      packageAsset(
        SLOW_RAIN_RECONCILED_EVIDENCE_V1.catalogIdentity,
        SLOW_RAIN_RECONCILED_EVIDENCE_V1.delivery.remoteUri,
        SLOW_RAIN_RECONCILED_EVIDENCE_V1.delivery.expectedBytes,
        SLOW_RAIN_RECONCILED_EVIDENCE_V1.delivery.checksumSha256,
        { persistentDownloadEligible: true, primaryRequired: true, replacementRequired: false },
      ),
      packageAsset("m6-nonvoice-bb9-026-book-handling", "https://cdn.freesound.org/previews/250/250017_389377-lq.mp3", 1_142_352, "7cfbfece218d2b48556a638c229243d3980ae4dffaf183bf61a664d9133d2865"),
      packageAsset("m6-nonvoice-bb9-032-paper-handling", "https://cdn.freesound.org/previews/534/534957_37011-lq.mp3", 703_224, "7927e6af2fded8311a844f4ae6d58c868f62ce427824e1de024ca9db0c3e6e35"),
      packageAsset("m6-nonvoice-bb9-033-pencil-and-marker-writing", "https://cdn.freesound.org/previews/530/530190_6652872-lq.mp3", 775_176, "fe14bc229e2b0c1560e465d5dca4151ab8a0f85b2e893470a5f55617d71e8f87"),
      packageAsset("m6-nonvoice-bb9-025-book-open-close-and-pages", "https://cdn.freesound.org/previews/734/734547_13973196-lq.mp3", 387_361, "b6695e457fcab4b562bbb27787654e6a64c38c47a5e2cdce11a5ad6f7fbd15f9"),
    ]),
  }),
  "porcelain-table-v1": Object.freeze({
    contractVersion: 1,
    sceneId: "porcelain-table-v1",
    scoreHash: "91f1e5848c3bd7bff832b0c42e8d0968036fa747cdc68d54ea3c988505815817",
    productionEligible: true,
    assets: Object.freeze([
      packageAsset("m6-nonvoice-bb9-013-shells-on-marble-and-ceramic", "https://cdn.freesound.org/previews/800/800116_2520418-lq.mp3", 181_296, "c7f49190e118cc61136211f27e9ed712c8d84bbc874fc7f5e2dc5d49b9d8b18d", { primaryRequired: true }),
      packageAsset("m6-nonvoice-bb10-009-finger-tapping-on-table", "https://cdn.freesound.org/previews/557/557363_7281605-lq.mp3", 94_944, "74b7c6180da6f31de24034882491fc2b1003ec84ddfd5dde5a4aea3f06fcd387"),
      packageAsset("m6-nonvoice-bb9-009-finger-tapping-on-metal-pipe", "https://cdn.freesound.org/previews/811/811807_13183432-lq.mp3", 188_664, "97fb94f2fe276fc91b7a932a11ca9654393e8412b09e17d9c4193768213749c4"),
      packageAsset("m6-nonvoice-bb9-012-screwdriver-taps-and-coin-jar", "https://cdn.freesound.org/previews/435/435814_6262563-lq.mp3", 500_744, "4248440768e50ca583d40c11356a10f09462a5047dfb624aec40459be7991e73"),
    ]),
  }),
  "soft-wardrobe-v1": Object.freeze({
    contractVersion: 1,
    sceneId: "soft-wardrobe-v1",
    scoreHash: "efad5676934c2a2e2ea7dbf7809556b6ed76a1d3b17be84a898e2b73e181ba47",
    productionEligible: true,
    assets: Object.freeze([
      packageAsset("m6-nonvoice-bb9-057-zip-and-rustling-fabric", "https://cdn.freesound.org/previews/728/728156_6033218-lq.mp3", 266_712, "2b7b362323058ca6197380db3cb995df1388c832b67592529c235380413b8076", { primaryRequired: true }),
      packageAsset("m6-nonvoice-bb9-050-leather-jacket-handling", "https://cdn.freesound.org/previews/770/770050_13973196-lq.mp3", 312_744, "116417bb8d722b8eb69becd0d2e7e601dfe7fb6208161aa27a562f7b894f4398"),
      packageAsset("m6-nonvoice-bb9-051-plastic-hairbrush", "https://cdn.freesound.org/previews/199/199299_2723971-lq.mp3", 418_584, "aa59f5a606e43cba8539af6261b88a5a3846b22547a29c4c6c37b2919bc16c8f"),
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
  return Object.freeze({ ...base, state: "ready-to-stream", customerCopy: "Ready to stream. Download for offline listening anytime.", primaryLabel: "Start session", secondaryLabel: "Download for offline", startable: true, offlineReady: false, playingSourceMode: "remote" });
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
