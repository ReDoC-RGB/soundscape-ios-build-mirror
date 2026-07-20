export const mobileUxTokens = {
  spacing: {
    xxs: 4,
    xs: 6,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
  radius: {
    chip: 999,
    control: 10,
    card: 14,
    section: 18,
  },
  controlMinHeight: 44,
  compactChipHeight: 36,
  cardPadding: 12,
  sectionPadding: 14,
  bottomNavigationContentHeight: 61,
  miniPlayerEstimatedHeight: 59,
  shellContentGap: 12,
} as const;

export const mobileUxBreakpoints = {
  narrowPhoneWidth: 360,
  compactThreeColumnWidth: 340,
  presetLayerThreeColumnWidth: 350,
  savedManageStackWidth: 340,
  largeTextScale: 1.2,
} as const;

export type MiniPlayerStatusMetadataInput = {
  sessionType: "single" | "recipe";
  activeLayerCount: number;
  activePlaybackStatusLabel: string;
  choiceRequired: boolean;
  timerLabel: string | null;
};

export function getMiniPlayerStatusMetadata({
  sessionType,
  activeLayerCount,
  activePlaybackStatusLabel,
  choiceRequired,
  timerLabel,
}: MiniPlayerStatusMetadataInput): string {
  if (choiceRequired || timerLabel) {
    return [choiceRequired ? "Choice" : null, timerLabel].filter(Boolean).join(" · ");
  }
  if (sessionType === "recipe") {
    return `${activeLayerCount} layer${activeLayerCount === 1 ? "" : "s"}`;
  }
  return `${activePlaybackStatusLabel} · Tap for Player`;
}

export function shouldStackMiniPlayer(screenWidth: number, fontScale: number): boolean {
  return screenWidth <= mobileUxBreakpoints.narrowPhoneWidth
    || fontScale > mobileUxBreakpoints.largeTextScale;
}

export type PresetLayerChoiceLayout = {
  mode: "columns" | "stacked";
  gap: number;
  minimumTargetHeight: number;
  indicatorSize: number;
  indicatorInset: number;
  titleEndPadding: number;
};

export function getPresetLayerChoiceLayout(
  screenWidth: number,
  fontScale: number,
): PresetLayerChoiceLayout {
  const useStackedFallback =
    screenWidth < mobileUxBreakpoints.presetLayerThreeColumnWidth
    || fontScale > mobileUxBreakpoints.largeTextScale;
  return {
    mode: useStackedFallback ? "stacked" : "columns",
    gap: 8,
    minimumTargetHeight: mobileUxTokens.controlMinHeight,
    indicatorSize: 18,
    indicatorInset: 2,
    titleEndPadding: 24,
  };
}
