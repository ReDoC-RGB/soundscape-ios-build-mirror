import type { CatalogDeliveryRightsV1, LifecycleState } from "./catalogContractV2";

export const OFFLINE_MANIFEST_VERSION = 1 as const;
export type OfflineDownloadState = "queued" | "downloading" | "verifying" | "available" | "failed/retryable" | "ineligible" | "revoked" | "deleting";
export type OfflineDownloadStageV1 = "idle" | "downloading" | "validating" | "promoting" | "available_offline" | "failed";
export type OfflineDownloadFailureCodeV1 = "offline" | "http" | "filesystem" | "integrity" | "media" | "promotion" | "stale" | "unknown";
export type OfflineEligibilityDecisionV1 = Readonly<{ state: "eligible" | "ineligible" | "revoked"; eligible: boolean; reason: string; version: "1" }>;
export type OfflineManifestItemV1 = Readonly<{
  version: typeof OFFLINE_MANIFEST_VERSION;
  assetId: string;
  catalogRevision: string;
  sourceRevision: string;
  expectedBytes: number;
  verifiedBytes: number | null;
  checksumSha256: string;
  localUri: string | null;
  state: OfflineDownloadState;
  stage: OfflineDownloadStageV1;
  operationId: number;
  createdAt: string;
  updatedAt: string;
  lastAccessedAt: string;
  attributionRequired: boolean;
  eligibility: OfflineEligibilityDecisionV1;
  lastError: string | null;
  lastErrorCode: OfflineDownloadFailureCodeV1 | null;
  lastErrorCustomerCopy: string | null;
  lastErrorTechnicalReason: string | null;
}>;

export function decideOfflineEligibility(
  rights: CatalogDeliveryRightsV1 | undefined,
  lifecycle: LifecycleState,
): OfflineEligibilityDecisionV1 {
  if (lifecycle === "revoked" || lifecycle === "blocked" || lifecycle === "held") {
    return Object.freeze({ state: "revoked", eligible: false, reason: "Removed/revoked by the current catalog rights or lifecycle decision.", version: "1" });
  }
  if (!rights) return Object.freeze({ state: "ineligible", eligible: false, reason: "Offline delivery rights are unknown; download is disabled.", version: "1" });
  if (!rights.cacheAllowed) return Object.freeze({ state: "ineligible", eligible: false, reason: rights.offlineEligibilityReason || "Caching is not permitted.", version: "1" });
  if (!rights.persistentDownloadAllowed) return Object.freeze({ state: "ineligible", eligible: false, reason: rights.offlineEligibilityReason || "Persistent download is not permitted.", version: "1" });
  if (!rights.redistributionAllowed) return Object.freeze({ state: "ineligible", eligible: false, reason: rights.offlineEligibilityReason || "Redistribution restrictions prevent persistent download.", version: "1" });
  if (!rights.streamingAllowed) return Object.freeze({ state: "ineligible", eligible: false, reason: rights.offlineEligibilityReason || "The remote delivery source is not approved.", version: "1" });
  return Object.freeze({ state: "eligible", eligible: true, reason: rights.offlineEligibilityReason || "Approved for persistent local download.", version: "1" });
}

export function createOfflineManifestItem(input: {
  assetId: string; catalogRevision: string; sourceRevision: string; expectedBytes: number; checksumSha256: string;
  attributionRequired: boolean; eligibility: OfflineEligibilityDecisionV1; now: string; operationId: number;
}): OfflineManifestItemV1 {
  const state: OfflineDownloadState = input.eligibility.state === "revoked" ? "revoked" : input.eligibility.eligible ? "queued" : "ineligible";
  return Object.freeze({
    version: OFFLINE_MANIFEST_VERSION,
    assetId: input.assetId,
    catalogRevision: input.catalogRevision,
    sourceRevision: input.sourceRevision,
    expectedBytes: Math.max(0, Math.floor(input.expectedBytes)),
    verifiedBytes: null,
    checksumSha256: input.checksumSha256.toLowerCase(),
    localUri: null,
    state,
    stage: "idle",
    operationId: input.operationId,
    createdAt: input.now,
    updatedAt: input.now,
    lastAccessedAt: input.now,
    attributionRequired: input.attributionRequired,
    eligibility: input.eligibility,
    lastError: state === "ineligible" || state === "revoked" ? input.eligibility.reason : null,
    lastErrorCode: null,
    lastErrorCustomerCopy: null,
    lastErrorTechnicalReason: state === "ineligible" || state === "revoked" ? input.eligibility.reason : null,
  });
}

type Transition =
  | { type: "download-started"; operationId: number; now: string }
  | { type: "downloaded"; operationId: number; now: string }
  | { type: "promotion-started"; operationId: number; now: string }
  | { type: "verified"; operationId: number; now: string; localUri: string; verifiedBytes?: number }
  | { type: "failed"; operationId: number; now: string; error: string; code?: OfflineDownloadFailureCodeV1; customerCopy?: string; technicalReason?: string }
  | { type: "delete-started"; operationId: number; now: string };
export function transitionOfflineManifestItem(item: OfflineManifestItemV1, transition: Transition): OfflineManifestItemV1 {
  if (transition.operationId !== item.operationId) return item;
  const state: OfflineDownloadState = transition.type === "download-started" ? "downloading"
    : transition.type === "downloaded" || transition.type === "promotion-started" ? "verifying"
      : transition.type === "verified" ? "available"
        : transition.type === "delete-started" ? "deleting" : "failed/retryable";
  const stage: OfflineDownloadStageV1 = transition.type === "download-started" ? "downloading"
    : transition.type === "downloaded" ? "validating"
      : transition.type === "promotion-started" ? "promoting"
        : transition.type === "verified" ? "available_offline"
          : transition.type === "failed" ? "failed" : item.stage;
  return Object.freeze({
    ...item,
    state,
    stage,
    updatedAt: transition.now,
    lastAccessedAt: transition.type === "verified" ? transition.now : item.lastAccessedAt,
    localUri: transition.type === "verified" ? transition.localUri : item.localUri,
    verifiedBytes: transition.type === "verified" ? transition.verifiedBytes ?? item.expectedBytes : item.verifiedBytes,
    lastError: transition.type === "failed" ? transition.error : null,
    lastErrorCode: transition.type === "failed" ? transition.code ?? "unknown" : null,
    lastErrorCustomerCopy: transition.type === "failed" ? transition.customerCopy ?? null : null,
    lastErrorTechnicalReason: transition.type === "failed" ? transition.technicalReason ?? transition.error : null,
  });
}

export function recoverOfflineManifestItem(item: OfflineManifestItemV1, now: string): OfflineManifestItemV1 {
  const normalized = Object.freeze({
    ...item,
    stage: item.stage ?? (item.state === "available" ? "available_offline" : "idle"),
    lastErrorCode: item.lastErrorCode ?? null,
    lastErrorCustomerCopy: item.lastErrorCustomerCopy ?? null,
    lastErrorTechnicalReason: item.lastErrorTechnicalReason ?? item.lastError ?? null,
  });
  if (!(["queued", "downloading", "verifying", "deleting"] as OfflineDownloadState[]).includes(normalized.state)) return normalized;
  const error = "The prior operation was interrupted; retry is safe.";
  return Object.freeze({
    ...normalized,
    state: "failed/retryable",
    stage: "failed",
    updatedAt: now,
    lastError: error,
    lastErrorCode: "unknown",
    lastErrorCustomerCopy: "Offline download failed. Try again.",
    lastErrorTechnicalReason: error,
  });
}
export function reconcileOfflineEligibility(item: OfflineManifestItemV1, eligibility: OfflineEligibilityDecisionV1, now: string): OfflineManifestItemV1 {
  const normalized = recoverOfflineManifestItem(item, now);
  if (eligibility.eligible) return Object.freeze({ ...normalized, eligibility, updatedAt: now });
  return Object.freeze({ ...normalized, eligibility, state: eligibility.state === "revoked" ? "revoked" : "ineligible", updatedAt: now, lastError: eligibility.reason, lastErrorTechnicalReason: eligibility.reason });
}
export function planQuotaEviction(items: readonly OfflineManifestItemV1[], bytesRequired: number, activeAssetIds: ReadonlySet<string>): string[] {
  let released = 0;
  const result: string[] = [];
  const candidates = items
    .filter((item) => item.state === "available" && !activeAssetIds.has(item.assetId))
    .sort((a, b) => a.lastAccessedAt.localeCompare(b.lastAccessedAt) || a.assetId.localeCompare(b.assetId));
  for (const item of candidates) {
    if (released >= bytesRequired) break;
    released += item.verifiedBytes ?? item.expectedBytes;
    result.push(item.assetId);
  }
  return result;
}
