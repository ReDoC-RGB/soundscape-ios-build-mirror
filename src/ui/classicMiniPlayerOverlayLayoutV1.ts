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
  stableActionClusterHeight?: number;
}>;

export type ClassicMiniPlayerOverlayLayoutV1 = Readonly<{
  /** Backward-compatible name for the real interactive player bottom. */
  overlayBottom: number;
  /** Physical-edge boundary for the opaque player surface. */
  visualSurfaceBottom: number;
  /** Bottom boundary for actual player controls and hit targets. */
  interactiveBottom: number;
  /** Opaque, pointer-free surface between the physical edge and controls. */
  safeAreaBackgroundExtension: number;
  /** Permanent ScrollView reservation; elastic overscroll is never required. */
  contentBottomPadding: number;
  exposedContentGap: number;
}>;

export type StableActionRestingGeometryInputV1 = Readonly<{
  viewportHeight: number;
  contentHeight: number;
  contentBottomPadding: number;
  miniPlayerHeight: number;
  interactiveBottom: number;
  startActionTop: number;
  startActionHeight: number;
  downloadActionTop: number;
  downloadActionHeight: number;
}>;

export type StableActionRestingGeometryV1 = Readonly<{
  maximumScrollOffset: number;
  playerInteractiveTop: number;
  startActionRestingTop: number;
  startActionRestingBottom: number;
  downloadActionRestingTop: number;
  downloadActionRestingBottom: number;
  startActionFullyVisibleAtRest: boolean;
  downloadActionFullyVisibleAtRest: boolean;
  actionsHaveDistinctHitRects: boolean;
  requiresOverscroll: boolean;
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
  const navigationTop = safeAreaBottom + bottomNavigationContentHeight;
  const spacing = finiteNonNegative(input.spacing);
  const miniPlayerHeight = input.miniPlayerPresent
    ? finiteNonNegative(input.miniPlayerHeight)
    : 0;
  const stableActionClusterHeight = input.miniPlayerPresent
    ? finiteNonNegative(input.stableActionClusterHeight ?? 0)
    : 0;

  // Visual and interactive geometry deliberately diverge only when navigation is
  // hidden. The dark surface reaches the physical edge while controls remain
  // above the home/gesture region. The extension is rendered pointer-free.
  const visualSurfaceBottom = input.bottomNavigationVisible ? navigationTop : 0;
  const interactiveBottom = input.bottomNavigationVisible ? navigationTop : safeAreaBottom;
  const safeAreaBackgroundExtension = input.miniPlayerPresent && !input.bottomNavigationVisible
    ? safeAreaBottom
    : 0;
  const contentBase = input.bottomNavigationVisible ? navigationTop : safeAreaBottom;
  const contentBottomPadding = contentBase + miniPlayerHeight + (
    input.miniPlayerPresent ? spacing + stableActionClusterHeight : 0
  );

  return Object.freeze({
    overlayBottom: interactiveBottom,
    visualSurfaceBottom,
    interactiveBottom,
    safeAreaBackgroundExtension,
    contentBottomPadding,
    exposedContentGap: 0,
  });
}

export function resolveStableActionRestingGeometryV1(
  input: StableActionRestingGeometryInputV1,
): StableActionRestingGeometryV1 {
  const viewportHeight = finiteNonNegative(input.viewportHeight);
  const contentHeight = finiteNonNegative(input.contentHeight);
  const contentBottomPadding = finiteNonNegative(input.contentBottomPadding);
  const miniPlayerHeight = finiteNonNegative(input.miniPlayerHeight);
  const interactiveBottom = finiteNonNegative(input.interactiveBottom);
  const startActionTop = finiteNonNegative(input.startActionTop);
  const startActionHeight = finiteNonNegative(input.startActionHeight);
  const downloadActionTop = finiteNonNegative(input.downloadActionTop);
  const downloadActionHeight = finiteNonNegative(input.downloadActionHeight);

  const maximumScrollOffset = Math.max(0, contentHeight + contentBottomPadding - viewportHeight);
  const playerInteractiveTop = Math.max(0, viewportHeight - interactiveBottom - miniPlayerHeight);
  const startActionRestingTop = startActionTop - maximumScrollOffset;
  const startActionRestingBottom = startActionRestingTop + startActionHeight;
  const downloadActionRestingTop = downloadActionTop - maximumScrollOffset;
  const downloadActionRestingBottom = downloadActionRestingTop + downloadActionHeight;
  const startActionFullyVisibleAtRest = startActionRestingTop >= 0
    && startActionRestingBottom <= playerInteractiveTop;
  const downloadActionFullyVisibleAtRest = downloadActionRestingTop >= 0
    && downloadActionRestingBottom <= playerInteractiveTop;
  const actionsHaveDistinctHitRects = startActionRestingBottom <= downloadActionRestingTop
    || downloadActionRestingBottom <= startActionRestingTop;

  return Object.freeze({
    maximumScrollOffset,
    playerInteractiveTop,
    startActionRestingTop,
    startActionRestingBottom,
    downloadActionRestingTop,
    downloadActionRestingBottom,
    startActionFullyVisibleAtRest,
    downloadActionFullyVisibleAtRest,
    actionsHaveDistinctHitRects,
    requiresOverscroll: !(startActionFullyVisibleAtRest && downloadActionFullyVisibleAtRest),
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
