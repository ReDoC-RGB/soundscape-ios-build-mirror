import type { MobileCatalogSound } from "../mobileSoundContract";

export type ClassicVerifiedLocalResolutionV1 = Readonly<
  | { state: "local"; uri: string }
  | { state: "missing" | "not-downloaded"; reason?: string }
  | { state: "unusable" | "revoked"; reason: string }
>;

export type ClassicPlaybackSourceAuthorityV1 =
  | "verified-offline"
  | "prepared-cache"
  | "accepted-stream";

export type ClassicPlaybackSourceResolutionV1 = Readonly<
  | {
      state: "resolved";
      authority: ClassicPlaybackSourceAuthorityV1;
      uri: string;
    }
  | {
      state: "blocked";
      reason: string;
    }
>;

export type ClassicPlaybackSourceStageV1 =
  | "stable-authority-enter"
  | "verified-offline-ready"
  | "verified-offline-missing"
  | "verified-offline-blocked"
  | "prepared-cache-ready"
  | "prepared-cache-miss"
  | "accepted-stream-ready";

export type ResolveClassicPlaybackSourceInputV1 = Readonly<{
  sound: MobileCatalogSound;
  offlineDescriptorPresent: boolean;
  resolveVerifiedLocal: () => Promise<ClassicVerifiedLocalResolutionV1>;
  getPreparedCacheUri: () => string | null;
  onStage?: (stage: ClassicPlaybackSourceStageV1) => void;
}>;

/**
 * Resolves only stable, already-accepted classic playback authority.
 *
 * Network freshness probes and cache population intentionally do not belong
 * here: native preparation owns the current streaming connection.
 */
export async function resolveClassicPlaybackSourceV1(
  input: ResolveClassicPlaybackSourceInputV1,
): Promise<ClassicPlaybackSourceResolutionV1> {
  input.onStage?.("stable-authority-enter");

  if (input.offlineDescriptorPresent) {
    const local = await input.resolveVerifiedLocal();
    if (local.state === "local") {
      input.onStage?.("verified-offline-ready");
      return Object.freeze({
        state: "resolved",
        authority: "verified-offline",
        uri: local.uri,
      });
    }
    if (local.state === "unusable" || local.state === "revoked") {
      input.onStage?.("verified-offline-blocked");
      return Object.freeze({ state: "blocked", reason: local.reason });
    }
    input.onStage?.("verified-offline-missing");
  }

  const preparedCacheUri = input.getPreparedCacheUri();
  if (preparedCacheUri) {
    input.onStage?.("prepared-cache-ready");
    return Object.freeze({
      state: "resolved",
      authority: "prepared-cache",
      uri: preparedCacheUri,
    });
  }
  input.onStage?.("prepared-cache-miss");

  const streamingUri = input.sound.audioUrl.trim();
  if (!/^https:\/\//i.test(streamingUri)) {
    return Object.freeze({
      state: "blocked",
      reason: "Accepted streaming authority did not provide a secure media URI.",
    });
  }

  input.onStage?.("accepted-stream-ready");
  return Object.freeze({
    state: "resolved",
    authority: "accepted-stream",
    uri: streamingUri,
  });
}
