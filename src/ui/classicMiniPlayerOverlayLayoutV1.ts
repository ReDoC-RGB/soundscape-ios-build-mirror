export type ClassicMiniPlayerOverlayMetricsV1 = Readonly<{
  present: boolean;
  height: number;
}>;

export type ClassicMiniPlayerOverlayLayoutInputV1 = Readonly<{
  miniPlayerPresent: boolean;
  miniPlayerHeight: number;
  bottomNavigationVisible: boolean;
  bottomNavigationContentHeight: number;
  safeAreaBottom: number;
  spacing: number;
}>;

export type ClassicMiniPlayerOverlayLayoutV1 = Readonly<{
  overlayBottom: number;
  contentBottomPadding: number;
  exposedContentGap: number;
}>;

export type ClassicMiniPlayerPlaybackProjectionInputV1 = Readonly<{
  hasClassicSession: boolean;
  isPlaying: boolean;
  explicitStopAcknowledged: boolean;
}>;

const finiteNonNegative = (value: number): number => Number.isFinite(value) ? Math.max(0, value) : 0;

export function resolveClassicMiniPlayerOverlayLayoutV1(
  input: ClassicMiniPlayerOverlayLayoutInputV1,
): ClassicMiniPlayerOverlayLayoutV1 {
  const safeAreaBottom = finiteNonNegative(input.safeAreaBottom);
  const bottomNavigationContentHeight = input.bottomNavigationVisible
    ? finiteNonNegative(input.bottomNavigationContentHeight)
    : 0;
  const spacing = finiteNonNegative(input.spacing);
  const miniPlayerHeight = input.miniPlayerPresent
    ? finiteNonNegative(input.miniPlayerHeight)
    : 0;
  // The visible navigation and retained player are one measured anchored stack.
  // Spacing is reserved above that stack for scroll reachability, never inserted
  // between the player and navigation where underlying content could show through.
  const overlayBottom = safeAreaBottom + bottomNavigationContentHeight;
  return Object.freeze({
    overlayBottom,
    contentBottomPadding: overlayBottom + miniPlayerHeight + (input.miniPlayerPresent ? spacing : 0),
    exposedContentGap: 0,
  });
}

export function shouldShowRetainedClassicMiniPlayerV1(input: Readonly<{
  hasClassicSession: boolean;
  aggregateSessionType: "single" | "layered" | "directed" | null;
  playbackState: "playing" | "paused" | "stopped";
}>): boolean {
  return input.hasClassicSession
    && input.aggregateSessionType !== "directed"
    && input.playbackState !== "stopped";
}

export function projectClassicMiniPlayerPlaybackStateV1(
  input: ClassicMiniPlayerPlaybackProjectionInputV1,
): "playing" | "paused" | "stopped" {
  if (!input.hasClassicSession || input.explicitStopAcknowledged) return "stopped";
  return input.isPlaying ? "playing" : "paused";
}
