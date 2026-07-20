import type { OfflineManifestItemV1 } from "./contracts/offlineManifestContractV1";
import type { PersistentDownloadResolutionV1 } from "./contracts/persistentDownloadRightsContractV1";

export const LAYER_OFFLINE_PROJECTION_VERSION = "1" as const;

export type LayerOfflineProjectionStateV1 =
  | "eligible-undownloaded"
  | "downloading"
  | "preparing"
  | "available"
  | "failed-retryable"
  | "bundled-local"
  | "streaming-only"
  | "rights-unknown"
  | "restricted"
  | "unavailable";

export type LayerOfflineActionV1 = Readonly<{
  kind: "download" | "retry" | "delete";
  label: "Download for offline" | "Retry download" | "Delete download";
  accessibilityLabel: string;
  disabled: boolean;
}>;

export type LayerOfflineProjectionInputV1 = Readonly<{
  layerId: string;
  layerName: string;
  catalogId: string;
  mediaUri: string;
  role: "bed" | "texture" | "accent" | "foreground";
  enabled: boolean;
  rights: PersistentDownloadResolutionV1;
  manifestItem: OfflineManifestItemV1 | null;
}>;

export type LayerOfflineProjectionV1 = Readonly<{
  version: typeof LAYER_OFFLINE_PROJECTION_VERSION;
  layerId: string;
  layerName: string;
  catalogId: string;
  mediaUri: string;
  role: LayerOfflineProjectionInputV1["role"];
  enabled: boolean;
  state: LayerOfflineProjectionStateV1;
  customerCopy: string;
  technicalReason: string;
  primaryAction: LayerOfflineActionV1 | null;
  secondaryAction: LayerOfflineActionV1 | null;
  busy: boolean;
  operationId: number | null;
}>;

const action = (
  kind: LayerOfflineActionV1["kind"],
  layerName: string,
  disabled = false,
): LayerOfflineActionV1 => {
  const label = kind === "download" ? "Download for offline" : kind === "retry" ? "Retry download" : "Delete download";
  return Object.freeze({
    kind,
    label,
    accessibilityLabel: `${label}: ${layerName}`,
    disabled,
  });
};

const projection = (
  input: LayerOfflineProjectionInputV1,
  state: LayerOfflineProjectionStateV1,
  customerCopy: string,
  options: Readonly<{
    primaryAction?: LayerOfflineActionV1 | null;
    secondaryAction?: LayerOfflineActionV1 | null;
    busy?: boolean;
    technicalReason?: string;
  }> = {},
): LayerOfflineProjectionV1 => Object.freeze({
  version: LAYER_OFFLINE_PROJECTION_VERSION,
  layerId: input.layerId,
  layerName: input.layerName,
  catalogId: input.catalogId,
  mediaUri: input.mediaUri,
  role: input.role,
  enabled: input.enabled,
  state,
  customerCopy,
  technicalReason: options.technicalReason ?? input.rights.technicalReason,
  primaryAction: options.primaryAction ?? null,
  secondaryAction: options.secondaryAction ?? null,
  busy: options.busy ?? false,
  operationId: input.manifestItem?.operationId ?? null,
});

export function projectLayerOfflineStateV1(input: LayerOfflineProjectionInputV1): LayerOfflineProjectionV1 {
  const manifest = input.manifestItem;
  if (manifest?.assetId && manifest.assetId !== input.catalogId) {
    return projection(input, "unavailable", "This layer isn't available.", {
      technicalReason: `${input.layerId} manifest identity ${manifest.assetId} does not match ${input.catalogId}.`,
    });
  }

  if (manifest?.state === "revoked" || input.rights.state === "restricted_or_revoked") {
    return projection(input, "restricted", "This layer isn't available.");
  }
  if (input.rights.state === "unavailable") {
    return projection(input, "unavailable", "This layer isn't available.");
  }
  if (input.rights.state === "streaming_only") {
    return projection(input, "streaming-only", "This layer is available online only.");
  }
  if (input.rights.state === "rights_unknown") {
    return projection(input, "rights-unknown", "Offline download isn't available for this layer.");
  }
  if (input.rights.state === "bundled_or_local") {
    return projection(input, "bundled-local", "Available offline");
  }

  if (!input.rights.eligible || input.rights.state !== "eligible_persistent_download") {
    return projection(input, "unavailable", "This layer isn't available.");
  }
  if (!manifest || manifest.state === "ineligible") {
    return projection(input, "eligible-undownloaded", "Download for offline", {
      primaryAction: action("download", input.layerName),
    });
  }
  if (manifest.state === "queued" || manifest.state === "downloading") {
    return projection(input, "downloading", "Downloading…", { busy: true });
  }
  if (manifest.state === "verifying" || manifest.state === "deleting") {
    return projection(input, "preparing", "Preparing offline copy…", { busy: true });
  }
  if (manifest.state === "available") {
    return projection(input, "available", "Available offline", {
      secondaryAction: action("delete", input.layerName),
    });
  }
  const boundedError = manifest.lastErrorCustomerCopy ?? "Offline download failed. Try again.";
  return projection(input, "failed-retryable", boundedError, {
    primaryAction: action("retry", input.layerName),
    technicalReason: manifest.lastErrorTechnicalReason ?? input.rights.technicalReason,
  });
}

export type LayerOfflineOperationOwnerV1 = Readonly<{
  sessionId: string;
  generation: number;
  editId: string;
  layerId: string;
  catalogId: string;
  mediaUri: string;
}>;

export type LayerOfflineOperationTokenV1 = LayerOfflineOperationOwnerV1 & Readonly<{
  operationId: number;
  joined: boolean;
}>;

const layerOwnerKey = (owner: LayerOfflineOperationOwnerV1): string =>
  JSON.stringify([owner.sessionId, owner.generation, owner.editId, owner.layerId]);
const exactOwnerKey = (owner: LayerOfflineOperationOwnerV1): string =>
  JSON.stringify([owner.sessionId, owner.generation, owner.editId, owner.layerId, owner.catalogId, owner.mediaUri]);

export class LayerOfflineOperationCoordinatorV1 {
  private nextOperationId = 0;
  private readonly activeByLayer = new Map<string, LayerOfflineOperationTokenV1>();

  begin(owner: LayerOfflineOperationOwnerV1): LayerOfflineOperationTokenV1 {
    const layerKey = layerOwnerKey(owner);
    const current = this.activeByLayer.get(layerKey);
    if (current && exactOwnerKey(current) === exactOwnerKey(owner)) {
      return Object.freeze({ ...current, joined: true });
    }
    const token = Object.freeze({ ...owner, operationId: ++this.nextOperationId, joined: false });
    this.activeByLayer.set(layerKey, token);
    return token;
  }

  isCurrent(token: LayerOfflineOperationTokenV1, owner: LayerOfflineOperationOwnerV1): boolean {
    const current = this.activeByLayer.get(layerOwnerKey(token));
    return Boolean(
      current
      && current.operationId === token.operationId
      && exactOwnerKey(token) === exactOwnerKey(owner)
      && exactOwnerKey(current) === exactOwnerKey(owner),
    );
  }

  finish(token: LayerOfflineOperationTokenV1): void {
    const key = layerOwnerKey(token);
    if (this.activeByLayer.get(key)?.operationId === token.operationId) this.activeByLayer.delete(key);
  }

  invalidateSession(sessionId: string): void {
    for (const [key, token] of this.activeByLayer) {
      if (token.sessionId === sessionId) this.activeByLayer.delete(key);
    }
  }
}
