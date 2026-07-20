import type { AggregateCreateOptions } from "../services/audioService";
import type { M6LocalCatalogIdentity } from "./m6CatalogExpansionV1";

export type M6PendingPlaybackPreparation = Readonly<{
  soundId: string;
  sourceUri: string;
  durationMillis: number;
  loopEligible: false;
  supportedProductPlaybackPending: true;
}>;

export const prepareM6PendingPlayback = (identity: M6LocalCatalogIdentity): M6PendingPlaybackPreparation => Object.freeze({
  soundId: identity.id,
  sourceUri: identity.audioUrl,
  durationMillis: Math.round(identity.durationSeconds * 1000),
  loopEligible: false,
  supportedProductPlaybackPending: true,
});

export const createM6NativePlaybackDefinition = (
  identity: M6LocalCatalogIdentity,
  generation: number,
  operationId: number,
): AggregateCreateOptions => {
  if (!identity.activationEligible) {
    throw new Error(`${identity.id} is not activation-eligible: supported-product playback evidence is pending.`);
  }
  return Object.freeze({
    sessionId: `m6-single:${identity.id}:${generation}`,
    generation,
    operationId,
    sessionType: "single" as const,
    title: identity.title,
    durationMillis: Math.round(identity.durationSeconds * 1000),
    loopEnabled: false,
    layers: [{
      layerId: "primary",
      soundId: identity.id,
      sourceUri: identity.audioUrl,
      required: true,
      enabled: true,
      volume: identity.manualOnly ? 0.16 : 0.22,
      loopEligible: false,
    }],
  });
};
