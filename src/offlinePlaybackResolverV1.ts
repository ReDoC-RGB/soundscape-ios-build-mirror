import type { OfflineManifestItemV1 } from "./contracts/offlineManifestContractV1";

export const OFFLINE_PLAYBACK_COPY_V1 = Object.freeze({
  notDownloaded: "This sound isn't downloaded. Connect to the internet or download it first.",
  offlineCopyUnusable: "The offline copy couldn't be used. Connect to the internet and download it again.",
  onlineSingleUnknown: "Couldn't play this sound. Check your connection and try again.",
  onlineLayeredUnknown: "Couldn't play this soundscape. Check your connection and try again.",
});

export type OfflinePlaybackIssueCodeV1 =
  | "NOT_DOWNLOADED"
  | "OFFLINE_COPY_UNUSABLE"
  | "STREAMING_NOT_ALLOWED"
  | "RIGHTS_REVOKED";

export class OfflinePlaybackPreparationErrorV1 extends Error {
  readonly name = "OfflinePlaybackPreparationErrorV1";
  constructor(
    readonly code: OfflinePlaybackIssueCodeV1,
    readonly userMessage: string,
    readonly diagnosticDetail: string,
  ) {
    super(diagnosticDetail);
  }
}

export type OfflinePlaybackResolutionV1 = Readonly<
  | { state: "local"; assetId: string; uri: string; source: "verified-manifest" }
  | { state: "streaming"; assetId: string; uri: string; source: "remote" }
  | { state: "unavailable"; assetId: string; code: OfflinePlaybackIssueCodeV1; userMessage: string; diagnosticDetail: string }
>;

export type OfflinePlaybackLayerInputV1 = Readonly<{
  assetId: string;
  remoteUri: string;
  streamingAllowed: boolean;
  networkAvailable: boolean;
  manifestItem: OfflineManifestItemV1 | null;
}>;

const unusableLocalState = (item: OfflineManifestItemV1): boolean =>
  item.state === "available" && (
    !item.localUri
    || item.verifiedBytes === null
    || item.verifiedBytes !== item.expectedBytes
    || !item.checksumSha256
  );

export function resolveOfflinePlaybackLayer(
  input: OfflinePlaybackLayerInputV1,
): OfflinePlaybackResolutionV1 {
  const item = input.manifestItem;
  if (item?.state === "available" && !unusableLocalState(item)) {
    return Object.freeze({
      state: "local",
      assetId: input.assetId,
      uri: item.localUri!,
      source: "verified-manifest",
    });
  }
  if (item && (unusableLocalState(item) || ["failed/retryable", "deleting"].includes(item.state))) {
    return Object.freeze({
      state: "unavailable",
      assetId: input.assetId,
      code: "OFFLINE_COPY_UNUSABLE",
      userMessage: OFFLINE_PLAYBACK_COPY_V1.offlineCopyUnusable,
      diagnosticDetail: `Manifest state ${item.state} did not describe a complete verified local source.`,
    });
  }
  if (item?.state === "revoked") {
    return Object.freeze({
      state: "unavailable",
      assetId: input.assetId,
      code: "RIGHTS_REVOKED",
      userMessage: OFFLINE_PLAYBACK_COPY_V1.offlineCopyUnusable,
      diagnosticDetail: "The downloaded source is no longer eligible for playback.",
    });
  }
  if (input.networkAvailable && input.streamingAllowed) {
    return Object.freeze({ state: "streaming", assetId: input.assetId, uri: input.remoteUri, source: "remote" });
  }
  const code: OfflinePlaybackIssueCodeV1 = input.streamingAllowed ? "NOT_DOWNLOADED" : "STREAMING_NOT_ALLOWED";
  return Object.freeze({
    state: "unavailable",
    assetId: input.assetId,
    code,
    userMessage: OFFLINE_PLAYBACK_COPY_V1.notDownloaded,
    diagnosticDetail: input.streamingAllowed
      ? "No verified local manifest source exists and the network is unavailable."
      : "No verified local manifest source exists and streaming is not allowed.",
  });
}

export type LayeredOfflinePlaybackInputV1 = OfflinePlaybackLayerInputV1 & Readonly<{
  layerId: string;
  layerName: string;
}>;

export type LayeredOfflinePlaybackResolutionV1 = Readonly<{
  canStart: boolean;
  availableLayers: readonly Readonly<LayeredOfflinePlaybackInputV1 & { resolution: Exclude<OfflinePlaybackResolutionV1, { state: "unavailable" }> }>[];
  unavailableLayers: readonly Readonly<LayeredOfflinePlaybackInputV1 & { resolution: Extract<OfflinePlaybackResolutionV1, { state: "unavailable" }> }>[];
  unavailableLayerNames: readonly string[];
  userMessage: string | null;
}>;

export function formatUnavailableOfflineLayersV1(layerNames: readonly string[]): string | null {
  const names = [...new Set(layerNames.map((name) => name.trim()).filter(Boolean))];
  return names.length
    ? `Some layers aren't available offline: ${names.join(", ")}. Connect to the internet or download them first.`
    : null;
}

export function resolveLayeredOfflinePlayback(
  inputs: readonly LayeredOfflinePlaybackInputV1[],
): LayeredOfflinePlaybackResolutionV1 {
  const availableLayers: Array<LayeredOfflinePlaybackInputV1 & { resolution: Exclude<OfflinePlaybackResolutionV1, { state: "unavailable" }> }> = [];
  const unavailableLayers: Array<LayeredOfflinePlaybackInputV1 & { resolution: Extract<OfflinePlaybackResolutionV1, { state: "unavailable" }> }> = [];
  for (const input of inputs) {
    const resolution = resolveOfflinePlaybackLayer(input);
    if (resolution.state === "unavailable") unavailableLayers.push(Object.freeze({ ...input, resolution }));
    else availableLayers.push(Object.freeze({ ...input, resolution }));
  }
  const unavailableLayerNames = Object.freeze(unavailableLayers.map((layer) => layer.layerName));
  return Object.freeze({
    canStart: availableLayers.length > 0,
    availableLayers: Object.freeze(availableLayers),
    unavailableLayers: Object.freeze(unavailableLayers),
    unavailableLayerNames,
    userMessage: formatUnavailableOfflineLayersV1(unavailableLayerNames),
  });
}

export function userFacingPlaybackErrorV1(error: unknown, kind: "single" | "layered"): string {
  if (error instanceof OfflinePlaybackPreparationErrorV1) return error.userMessage;
  return kind === "single"
    ? OFFLINE_PLAYBACK_COPY_V1.onlineSingleUnknown
    : OFFLINE_PLAYBACK_COPY_V1.onlineLayeredUnknown;
}
