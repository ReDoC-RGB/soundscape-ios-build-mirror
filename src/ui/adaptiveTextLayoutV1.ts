export const adaptiveTextLayoutThresholdsV1 = Object.freeze({
  accessibilityFontScale: 1.35,
  narrowPhoneWidth: 360,
  minimumTouchTarget: 44,
  navigationVerticalPadding: 12,
  // Conservative measured width of “Soundscape” in the bold system-font
  // fallback, expressed in em. This token is intentionally brand-only.
  brandHeadingMeasuredWidthEm: 6.2,
} as const);

export type AdaptiveTextLayoutInputV1 = Readonly<{
  width: number;
  fontScale: number;
}>;

export type AdaptiveTextLayoutV1 = Readonly<{
  mode: "normal" | "accessibility";
  navigationMode: "row" | "stacked";
  stackHeader: boolean;
  stackActionRows: boolean;
  allowConstrainedSingleLine: boolean;
  minimumTouchTarget: number;
  layoutKey: string;
}>;

export type AdaptiveTextLinePolicyV1 = Readonly<{
  numberOfLines: 1 | undefined;
  adjustsFontSizeToFit: boolean;
  hyphenation: "none";
}>;

export type AdaptiveBrandHeadingProjectionV1 = Readonly<{
  availableWidth: number;
  effectiveFontScale: number;
  maximumFontSizeMultiplier: number | undefined;
  estimatedRenderedWidth: number;
}>;

const finitePositive = (value: number, fallback: number): number => (
  Number.isFinite(value) && value > 0 ? value : fallback
);
const finiteNonNegative = (value: number, fallback: number): number => (
  Number.isFinite(value) && value >= 0 ? value : fallback
);

const normalizedLayoutInputV1 = (input: AdaptiveTextLayoutInputV1): AdaptiveTextLayoutInputV1 => Object.freeze({
  width: finitePositive(input.width, adaptiveTextLayoutThresholdsV1.narrowPhoneWidth),
  fontScale: finitePositive(input.fontScale, 1),
});

export function resolveAdaptiveTextLayoutV1(input: AdaptiveTextLayoutInputV1): AdaptiveTextLayoutV1 {
  const normalized = normalizedLayoutInputV1(input);
  const accessibilityText = normalized.fontScale >= adaptiveTextLayoutThresholdsV1.accessibilityFontScale;
  const narrowPhone = normalized.width <= adaptiveTextLayoutThresholdsV1.narrowPhoneWidth;
  return Object.freeze({
    mode: accessibilityText ? "accessibility" : "normal",
    navigationMode: accessibilityText ? "stacked" : "row",
    stackHeader: accessibilityText || narrowPhone,
    stackActionRows: accessibilityText || narrowPhone,
    allowConstrainedSingleLine: !accessibilityText,
    minimumTouchTarget: adaptiveTextLayoutThresholdsV1.minimumTouchTarget,
    layoutKey: `${Math.round(normalized.width)}:${Math.round(normalized.fontScale * 1000)}`,
  });
}

export function nextAdaptiveTextLayoutRevisionV1(
  currentRevision: number,
  previous: AdaptiveTextLayoutInputV1,
  next: AdaptiveTextLayoutInputV1,
): number {
  const safeRevision = Number.isFinite(currentRevision) && currentRevision >= 0
    ? Math.floor(currentRevision)
    : 0;
  const previousLayout = resolveAdaptiveTextLayoutV1(previous);
  const nextLayout = resolveAdaptiveTextLayoutV1(next);
  return previousLayout.layoutKey === nextLayout.layoutKey ? safeRevision : safeRevision + 1;
}

export function resolveAdaptiveNavigationHeightV1(input: Readonly<{
  itemCount: number;
  fontScale: number;
  normalHeight: number;
  minimumTouchTarget?: number;
}>): number {
  const itemCount = Number.isFinite(input.itemCount) ? Math.max(0, Math.floor(input.itemCount)) : 0;
  const fontScale = finitePositive(input.fontScale, 1);
  const normalHeight = finitePositive(input.normalHeight, adaptiveTextLayoutThresholdsV1.minimumTouchTarget);
  const minimumTouchTarget = finitePositive(
    input.minimumTouchTarget ?? adaptiveTextLayoutThresholdsV1.minimumTouchTarget,
    adaptiveTextLayoutThresholdsV1.minimumTouchTarget,
  );
  if (fontScale < adaptiveTextLayoutThresholdsV1.accessibilityFontScale) return normalHeight;
  if (itemCount === 0) return 0;
  const scaledLabelHeight = Math.ceil(17 * fontScale) + adaptiveTextLayoutThresholdsV1.navigationVerticalPadding;
  const itemGap = 6;
  const containerVerticalPadding = 12;
  return itemCount * Math.max(minimumTouchTarget, scaledLabelHeight)
    + (itemCount - 1) * itemGap
    + containerVerticalPadding;
}

export function resolveAdaptiveTextLinePolicyV1(input: Readonly<{
  fontScale: number;
  constrained: boolean;
  essential: boolean;
}>): AdaptiveTextLinePolicyV1 {
  const accessibilityText = finitePositive(input.fontScale, 1)
    >= adaptiveTextLayoutThresholdsV1.accessibilityFontScale;
  const releaseConstraint = input.essential && accessibilityText;
  return Object.freeze({
    numberOfLines: input.constrained && !releaseConstraint ? 1 : undefined,
    adjustsFontSizeToFit: input.constrained && !releaseConstraint,
    hyphenation: "none",
  });
}

export function resolveAdaptiveBrandHeadingProjectionV1(input: Readonly<{
  width: number;
  fontScale: number;
  baseFontSize: number;
  horizontalInsets: number;
}>): AdaptiveBrandHeadingProjectionV1 {
  const width = finitePositive(input.width, adaptiveTextLayoutThresholdsV1.narrowPhoneWidth);
  const fontScale = finitePositive(input.fontScale, 1);
  const baseFontSize = finitePositive(input.baseFontSize, 28);
  const horizontalInsets = finiteNonNegative(input.horizontalInsets, 0);
  const availableWidth = Math.max(
    adaptiveTextLayoutThresholdsV1.minimumTouchTarget,
    width - horizontalInsets,
  );
  const measuredWidthEm = adaptiveTextLayoutThresholdsV1.brandHeadingMeasuredWidthEm;
  const naturalRenderedWidth = baseFontSize * fontScale * measuredWidthEm;
  const needsAccessibilityFit = fontScale >= adaptiveTextLayoutThresholdsV1.accessibilityFontScale
    && naturalRenderedWidth > availableWidth;
  const effectiveFontScale = needsAccessibilityFit
    ? Math.max(1, Math.min(fontScale, availableWidth / (baseFontSize * measuredWidthEm)))
    : fontScale;
  return Object.freeze({
    availableWidth,
    effectiveFontScale,
    maximumFontSizeMultiplier: needsAccessibilityFit ? effectiveFontScale : undefined,
    estimatedRenderedWidth: baseFontSize * effectiveFontScale * measuredWidthEm,
  });
}

export type AdaptiveLayoutGenerationV1 = Readonly<{
  layoutKey: string;
  generation: number;
}>;

export type AdaptiveDockMeasurementV1 = Readonly<{
  layoutKey: string;
  generation: number;
  height: number;
}>;

export type AdaptiveDockMeasurementPublicationV1 = Readonly<{
  measurement: AdaptiveDockMeasurementV1;
  accepted: boolean;
  reason: "accepted" | "stale-generation" | "unchanged" | "invalid-height";
}>;

export function beginAdaptiveLayoutGenerationV1(
  current: AdaptiveLayoutGenerationV1 | null,
  layoutKey: string,
): AdaptiveLayoutGenerationV1 {
  if (current?.layoutKey === layoutKey) return current;
  return Object.freeze({
    layoutKey,
    generation: current ? current.generation + 1 : 0,
  });
}

export function publishAdaptiveDockMeasurementV1(input: Readonly<{
  current: AdaptiveDockMeasurementV1;
  authority: AdaptiveLayoutGenerationV1;
  publication: AdaptiveDockMeasurementV1;
}>): AdaptiveDockMeasurementPublicationV1 {
  if (
    input.publication.layoutKey !== input.authority.layoutKey
    || input.publication.generation !== input.authority.generation
  ) {
    return Object.freeze({ measurement: input.current, accepted: false, reason: "stale-generation" });
  }
  if (!Number.isFinite(input.publication.height) || input.publication.height < 0) {
    return Object.freeze({ measurement: input.current, accepted: false, reason: "invalid-height" });
  }
  if (
    input.current.layoutKey === input.publication.layoutKey
    && input.current.generation === input.publication.generation
    && Math.abs(input.current.height - input.publication.height) < 0.5
  ) {
    return Object.freeze({ measurement: input.current, accepted: false, reason: "unchanged" });
  }
  return Object.freeze({
    measurement: Object.freeze({
      layoutKey: input.publication.layoutKey,
      generation: input.publication.generation,
      height: input.publication.height,
    }),
    accepted: true,
    reason: "accepted",
  });
}

export function resolveAdaptiveDockHeightV1(input: Readonly<{
  layoutKey: string;
  layoutGeneration: number;
  measurement: AdaptiveDockMeasurementV1;
  provisionalHeight: number;
}>): Readonly<{ height: number; measurementCurrent: boolean }> {
  const measurementCurrent = input.measurement.layoutKey === input.layoutKey
    && input.measurement.generation === input.layoutGeneration;
  return Object.freeze({
    height: measurementCurrent
      ? finiteNonNegative(input.measurement.height, input.provisionalHeight)
      : finiteNonNegative(input.provisionalHeight, adaptiveTextLayoutThresholdsV1.minimumTouchTarget),
    measurementCurrent,
  });
}

export function resolveAdaptiveMiniPlayerProvisionalHeightV1(input: Readonly<{
  fontScale: number;
  normalHeight: number;
  actionCount: number;
}>): number {
  const fontScale = finitePositive(input.fontScale, 1);
  const normalHeight = finitePositive(input.normalHeight, 59);
  if (fontScale < adaptiveTextLayoutThresholdsV1.accessibilityFontScale) return normalHeight;
  const actionCount = Number.isFinite(input.actionCount) ? Math.max(1, Math.floor(input.actionCount)) : 1;
  const scaledLine = Math.ceil(18 * fontScale);
  const stackedActions = actionCount * Math.max(adaptiveTextLayoutThresholdsV1.minimumTouchTarget, scaledLine + 24);
  const summaryAndProgress = Math.ceil(38 * fontScale) + 72;
  return Math.max(normalHeight, stackedActions + summaryAndProgress);
}

export function resolveAdaptivePersistentDockViewportV1(input: Readonly<{
  viewportHeight: number;
  fontScale: number;
  safeAreaBottom: number;
  navigationHeight: number;
  miniPlayerHeight: number;
}>): Readonly<{
  availableDockHeight: number;
  navigationViewportHeight: number;
  miniPlayerViewportHeight: number;
  navigationScrollEnabled: boolean;
  miniPlayerScrollEnabled: boolean;
}> {
  const viewportHeight = finitePositive(input.viewportHeight, 780);
  const fontScale = finitePositive(input.fontScale, 1);
  const safeAreaBottom = finiteNonNegative(input.safeAreaBottom, 0);
  const navigationHeight = finiteNonNegative(input.navigationHeight, 0);
  const miniPlayerHeight = finiteNonNegative(input.miniPlayerHeight, 0);
  if (fontScale < adaptiveTextLayoutThresholdsV1.accessibilityFontScale) {
    return Object.freeze({
      availableDockHeight: navigationHeight + miniPlayerHeight,
      navigationViewportHeight: navigationHeight,
      miniPlayerViewportHeight: miniPlayerHeight,
      navigationScrollEnabled: false,
      miniPlayerScrollEnabled: false,
    });
  }

  // Keep the complete navigation visible whenever the supported viewport can
  // hold it. The compact Player receives the remaining bounded area and owns
  // a real vertical scroll path when its full controls do not fit.
  const minimumTouchTarget = adaptiveTextLayoutThresholdsV1.minimumTouchTarget;
  const headerReserve = Math.ceil(34 * fontScale) + minimumTouchTarget + 32;
  const minimumContentExposure = minimumTouchTarget;
  const availableDockHeight = Math.max(
    2 * minimumTouchTarget,
    viewportHeight - safeAreaBottom - headerReserve - minimumContentExposure,
  );
  const scaledActionHeight = Math.max(minimumTouchTarget, Math.ceil(18 * fontScale) + 24);
  const minimumMiniPlayerViewport = Math.min(miniPlayerHeight, 2 * scaledActionHeight);
  const navigationViewportHeight = Math.min(
    navigationHeight,
    Math.max(minimumTouchTarget, availableDockHeight - minimumMiniPlayerViewport),
  );
  const miniPlayerViewportHeight = Math.min(
    miniPlayerHeight,
    Math.max(0, availableDockHeight - navigationViewportHeight),
  );
  return Object.freeze({
    availableDockHeight,
    navigationViewportHeight,
    miniPlayerViewportHeight,
    navigationScrollEnabled: navigationViewportHeight + 0.5 < navigationHeight,
    miniPlayerScrollEnabled: miniPlayerViewportHeight + 0.5 < miniPlayerHeight,
  });
}

export type MaximumTextDockPolicyV1 = Readonly<{
  acceptIntrinsicMeasurementFeedback: boolean;
  navigationScrollEnabled: boolean;
  miniPlayerScrollEnabled: boolean;
}>;

export function resolveMaximumTextDockPolicyV1(input: Readonly<{
  mode: "normal" | "accessibility";
  viewport: Readonly<{
    navigationScrollEnabled: boolean;
    miniPlayerScrollEnabled: boolean;
  }>;
}>): MaximumTextDockPolicyV1 {
  if (input.mode === "accessibility") {
    return Object.freeze({
      acceptIntrinsicMeasurementFeedback: false,
      navigationScrollEnabled: true,
      miniPlayerScrollEnabled: true,
    });
  }
  return Object.freeze({
    acceptIntrinsicMeasurementFeedback: true,
    navigationScrollEnabled: input.viewport.navigationScrollEnabled,
    miniPlayerScrollEnabled: input.viewport.miniPlayerScrollEnabled,
  });
}

export type FullPlayerMaximumTextViewportV1 = Readonly<{
  availableHeight: number;
  verticalScrollEnabled: boolean;
  horizontalScrollEnabled: false;
}>;

export function resolveFullPlayerMaximumTextViewportV1(input: Readonly<{
  viewportHeight: number;
  safeAreaTop: number;
  safeAreaBottom: number;
  headerHeight: number;
  mode: "normal" | "accessibility";
}>): FullPlayerMaximumTextViewportV1 {
  const viewportHeight = finitePositive(input.viewportHeight, 568);
  const safeAreaTop = finiteNonNegative(input.safeAreaTop, 0);
  const safeAreaBottom = finiteNonNegative(input.safeAreaBottom, 0);
  const headerHeight = finiteNonNegative(input.headerHeight, adaptiveTextLayoutThresholdsV1.minimumTouchTarget);
  return Object.freeze({
    availableHeight: Math.max(
      adaptiveTextLayoutThresholdsV1.minimumTouchTarget,
      viewportHeight - safeAreaTop - safeAreaBottom - headerHeight,
    ),
    // All Directed surfaces keep one vertical owner. At maximum text this is
    // mandatory; in normal mode it preserves the accepted long-page behavior.
    verticalScrollEnabled: true,
    horizontalScrollEnabled: false,
  });
}

export function resolveMaximumTextSettingsLabelV1(mode: "normal" | "accessibility"): "Settings" | "⚙︎" {
  return mode === "accessibility" ? "⚙︎" : "Settings";
}

export function resolveAdaptiveActionClusterProvisionalHeightV1(input: Readonly<{
  fontScale: number;
  actionCount: number;
  minimumTouchTarget?: number;
  textLineHeight?: number;
  verticalPadding?: number;
  topMargin?: number;
}>): number {
  const fontScale = finitePositive(input.fontScale, 1);
  const actionCount = Number.isFinite(input.actionCount) ? Math.max(0, Math.floor(input.actionCount)) : 0;
  if (actionCount === 0) return 0;
  const minimumTouchTarget = finitePositive(
    input.minimumTouchTarget ?? adaptiveTextLayoutThresholdsV1.minimumTouchTarget,
    adaptiveTextLayoutThresholdsV1.minimumTouchTarget,
  );
  const textLineHeight = finitePositive(input.textLineHeight ?? 21, 21);
  const verticalPadding = finiteNonNegative(input.verticalPadding ?? 28, 28);
  const topMargin = finiteNonNegative(input.topMargin ?? 8, 8);
  const scaledActionBody = Math.max(
    minimumTouchTarget,
    Math.ceil(textLineHeight * fontScale) + verticalPadding,
  );
  return actionCount * (scaledActionBody + topMargin);
}
