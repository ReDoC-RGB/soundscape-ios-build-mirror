import { SLOW_RAIN_RECONCILED_EVIDENCE_V1 } from "../catalog/slowRainReconciledEvidenceV1";
import { DIRECTED_OFFLINE_PACKAGES_V1 } from "./eligibilityV1";
import { directedSceneScoresV1, type DirectedSceneIdV1 } from "./sceneScoresV1";

export const DIRECTED_SESSIONS_RELEASE_CONFIG_V1 = Object.freeze({
  channel: "preview",
  distribution: "internal",
  directedSessionSchedulerVersion: 1,
} as const);

const requiredSceneIds = Object.freeze([
  "rain-desk-v1",
  "porcelain-table-v1",
  "soft-wardrobe-v1",
] as const satisfies readonly DirectedSceneIdV1[]);

const scoresProductionEligible = requiredSceneIds.every((sceneId) => (
  directedSceneScoresV1.find((score) => score.sceneId === sceneId)?.productionEligible === true
));
const packagesProductionEligible = requiredSceneIds.every((sceneId) => DIRECTED_OFFLINE_PACKAGES_V1[sceneId].productionEligible);
const scoreHashesMatchPackages = requiredSceneIds.every((sceneId) => {
  const score = directedSceneScoresV1.find((candidate) => candidate.sceneId === sceneId);
  return Boolean(score && score.scoreHash === DIRECTED_OFFLINE_PACKAGES_V1[sceneId].scoreHash);
});
const rainPackage = DIRECTED_OFFLINE_PACKAGES_V1["rain-desk-v1"];
const slowRainAsset = rainPackage.assets.find((asset) => asset.assetId === SLOW_RAIN_RECONCILED_EVIDENCE_V1.catalogIdentity);
const slowRainAccepted = Boolean(
  SLOW_RAIN_RECONCILED_EVIDENCE_V1.catalogIdentity === "freesound-slow-rain-loop"
  && SLOW_RAIN_RECONCILED_EVIDENCE_V1.delivery.hostedRouteAccepted
  && SLOW_RAIN_RECONCILED_EVIDENCE_V1.delivery.fullResponseStatus === 200
  && SLOW_RAIN_RECONCILED_EVIDENCE_V1.delivery.rangeResponseStatus === 206
  && SLOW_RAIN_RECONCILED_EVIDENCE_V1.rights.commercialUse
  && SLOW_RAIN_RECONCILED_EVIDENCE_V1.rights.derivativeCreationAndDistribution
  && SLOW_RAIN_RECONCILED_EVIDENCE_V1.rights.redistributionAndEmbedding
  && SLOW_RAIN_RECONCILED_EVIDENCE_V1.rights.hostingAndStreaming
  && SLOW_RAIN_RECONCILED_EVIDENCE_V1.rights.persistentOfflineCustomerDownload
  && SLOW_RAIN_RECONCILED_EVIDENCE_V1.qc.androidPhysicalPlaybackAccepted
  && SLOW_RAIN_RECONCILED_EVIDENCE_V1.qc.iosPhysicalPlaybackAccepted
  && SLOW_RAIN_RECONCILED_EVIDENCE_V1.qc.mobileListeningPlaybackAccepted
  && slowRainAsset?.persistentDownloadEligible
  && slowRainAsset.expectedBytes === SLOW_RAIN_RECONCILED_EVIDENCE_V1.delivery.expectedBytes
  && slowRainAsset.checksumSha256 === SLOW_RAIN_RECONCILED_EVIDENCE_V1.delivery.checksumSha256
  && slowRainAsset.remoteUri === SLOW_RAIN_RECONCILED_EVIDENCE_V1.delivery.remoteUri,
);

export const DIRECTED_SESSIONS_CONTENT_PREREQUISITES_V1 = Object.freeze({
  sceneIds: requiredSceneIds,
  scoresProductionEligible,
  packagesProductionEligible,
  scoreHashesMatchPackages,
  slowRainAccepted,
  allReady: scoresProductionEligible && packagesProductionEligible && scoreHashesMatchPackages && slowRainAccepted,
});

export type DirectedSessionsReleaseGateReasonV1 =
  | "wrong-channel"
  | "wrong-distribution"
  | "scheduler-version-unavailable"
  | "content-prerequisites-unavailable";

export type DirectedSessionsReleaseGateInputV1 = Readonly<{
  channel: string | null;
  distribution: string | null;
  directedSessionSchedulerVersion?: number;
  contentPrerequisitesReady?: boolean;
}>;

export type DirectedSessionsReleaseGateProjectionV1 = Readonly<{
  enabled: boolean;
  reasons: readonly DirectedSessionsReleaseGateReasonV1[];
}>;

export function evaluateDirectedSessionsBetaV1(
  input: DirectedSessionsReleaseGateInputV1,
): DirectedSessionsReleaseGateProjectionV1 {
  const reasons: DirectedSessionsReleaseGateReasonV1[] = [];
  if (input.channel !== DIRECTED_SESSIONS_RELEASE_CONFIG_V1.channel) reasons.push("wrong-channel");
  if (input.distribution !== DIRECTED_SESSIONS_RELEASE_CONFIG_V1.distribution) reasons.push("wrong-distribution");
  if ((input.directedSessionSchedulerVersion ?? DIRECTED_SESSIONS_RELEASE_CONFIG_V1.directedSessionSchedulerVersion) !== 1) {
    reasons.push("scheduler-version-unavailable");
  }
  if ((input.contentPrerequisitesReady ?? DIRECTED_SESSIONS_CONTENT_PREREQUISITES_V1.allReady) !== true) {
    reasons.push("content-prerequisites-unavailable");
  }
  return Object.freeze({ enabled: reasons.length === 0, reasons: Object.freeze(reasons) });
}

export const DIRECTED_SESSIONS_PREVIEW_GATE_V1 = evaluateDirectedSessionsBetaV1({
  channel: DIRECTED_SESSIONS_RELEASE_CONFIG_V1.channel,
  distribution: DIRECTED_SESSIONS_RELEASE_CONFIG_V1.distribution,
});
