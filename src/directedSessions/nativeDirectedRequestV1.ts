import type { NativeDirectedSessionDefinitionV1 } from "../../modules/soundscape-layered-media";
import {
  DIRECTED_STEERING_POLICY_V1,
  type DirectedOutputProfileV1,
  type MaterializedDirectedSceneV1,
} from "./sceneScoresV1";

export type DirectedNativeRequestOwnerV1 = Readonly<{
  sessionId: string;
  generationId: number;
  operationId: number;
  expectedPhaseRevision: number;
  expectedPathRevision: number;
  idempotencyKey: string;
}>;

export type DirectedNativeRequestSourcesV1 = Readonly<{
  sourceMode: "remote" | "local";
  sourceByAssetId: Readonly<Record<string, string>>;
}>;

export type CompileNativeDirectedSessionDefinitionInputV1 = Readonly<{
  variant: MaterializedDirectedSceneV1;
  owner: DirectedNativeRequestOwnerV1;
  sources: DirectedNativeRequestSourcesV1;
  outputProfile: DirectedOutputProfileV1;
  initialAppliedSteering: NativeDirectedSessionDefinitionV1["initialAppliedSteering"];
  initialManualTrims: NativeDirectedSessionDefinitionV1["initialManualTrims"];
  restartAtPhaseIndex?: number;
  requireAggregateOwnerAbsent?: boolean;
}>;

/**
 * Single production owner for the exact TypeScript object sent through the
 * directed-session JSON bridge. Authority generators and the live service must
 * call this function rather than reconstructing the request independently.
 */
export function compileNativeDirectedSessionDefinitionV1(
  input: CompileNativeDirectedSessionDefinitionInputV1,
): NativeDirectedSessionDefinitionV1 {
  const { variant, owner, sources } = input;
  if (variant.blocked) throw new Error("DIRECTED_VARIANT_BLOCKED");
  if (variant.outputProfile !== input.outputProfile) throw new Error("DIRECTED_OUTPUT_PROFILE_MISMATCH");

  const layerIdByAsset = new Map(variant.assets.map((candidate) => [candidate.assetId, `directed:${candidate.assetId}`]));
  const sourceFor = (assetId: string): string => {
    const source = sources.sourceByAssetId[assetId];
    if (!source) throw new Error(`DIRECTED_SOURCE_MISSING:${assetId}`);
    return source;
  };
  const restartAtPhaseIndex = Math.max(0, Math.min(variant.phases.length - 1, input.restartAtPhaseIndex ?? 0));

  return {
    sessionId: owner.sessionId,
    generationId: owner.generationId,
    operationId: owner.operationId,
    expectedPhaseRevision: owner.expectedPhaseRevision,
    expectedPathRevision: owner.expectedPathRevision,
    idempotencyKey: owner.idempotencyKey,
    ...(input.requireAggregateOwnerAbsent ? { requireAggregateOwnerAbsent: true } : {}),
    sessionType: "directed",
    contractVersion: 1,
    sceneId: variant.sceneId,
    sceneVersion: variant.sceneVersion,
    scoreHash: variant.scoreHash,
    title: variant.title,
    trajectory: variant.trajectory,
    durationMs: variant.durationMs,
    initialPlayedElapsedMs: variant.phases[restartAtPhaseIndex].startMs,
    finalFadeStartMs: variant.finalFadeStartMs,
    outputProfile: input.outputProfile,
    hardAvoidanceIds: [...variant.hardAvoidanceIds],
    initialAppliedSteering: {
      ...input.initialAppliedSteering,
      textureReplacements: { ...input.initialAppliedSteering.textureReplacements },
    },
    initialManualTrims: { ...input.initialManualTrims },
    playingOffline: sources.sourceMode === "local",
    maxLayerGain: DIRECTED_STEERING_POLICY_V1.maxLayerGain,
    minimumOptionalGain: DIRECTED_STEERING_POLICY_V1.minimumOptionalGain,
    phaseCrossfadeMs: DIRECTED_STEERING_POLICY_V1.phaseCrossfadeMs,
    assets: variant.assets.map((candidate) => ({
      layerId: layerIdByAsset.get(candidate.assetId) ?? candidate.assetId,
      assetId: candidate.assetId,
      title: candidate.title,
      sourceUri: sourceFor(candidate.assetId),
      productionUri: candidate.productionUri,
      expectedBytes: candidate.expectedBytes,
      checksumSha256: candidate.checksumSha256,
      durationMs: candidate.durationMs,
      loopEligible: candidate.loopEligible,
      required: candidate.required,
    })),
    phases: variant.phases.map((candidate) => ({ ...candidate })),
    events: variant.events.map((candidate) => ({
      ...candidate,
      sourceOffsetMs: candidate.sourceOffsetMs,
      layerId: layerIdByAsset.get(candidate.assetId) ?? candidate.assetId,
    })),
    texturePairs: variant.texturePairs.map((pair) => ({
      pairId: pair.pairId,
      layerIds: [
        layerIdByAsset.get(pair.assetIds[0]) ?? pair.assetIds[0],
        layerIdByAsset.get(pair.assetIds[1]) ?? pair.assetIds[1],
      ],
    })),
  };
}
