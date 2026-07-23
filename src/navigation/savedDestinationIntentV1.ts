export type SavedDestinationRouteV1 = "saved-mixes" | "saved-sounds";
export type SavedDestinationTabV1 = "sessions" | "sounds";

export type SavedDestinationIntentV1 = Readonly<{
  requestId: number;
  route: SavedDestinationRouteV1;
  tab: SavedDestinationTabV1;
  label: "Saved mixes" | "Saved sounds";
}>;

export function createSavedDestinationIntentV1(
  route: SavedDestinationRouteV1,
  requestId: number,
): SavedDestinationIntentV1 {
  if (!Number.isSafeInteger(requestId) || requestId < 1) throw new Error("SAVED_DESTINATION_REQUEST_ID_INVALID");
  return route === "saved-sounds"
    ? Object.freeze({ requestId, route, tab: "sounds", label: "Saved sounds" })
    : Object.freeze({ requestId, route, tab: "sessions", label: "Saved mixes" });
}

export type SavedDestinationApplicationContextV1 = Readonly<{
  currentRequestId: number;
  consumedRequestId: number | null;
  activeSectionKey: string;
  activeTab: SavedDestinationTabV1;
  containerLayoutY: number | null;
  headingLayoutY: number | null;
}>;

export type SavedDestinationApplicationPlanV1 = Readonly<{
  requestId: number;
  tab: SavedDestinationTabV1;
  label: SavedDestinationIntentV1["label"];
  needsSectionSelection: boolean;
  needsTabSelection: boolean;
  ready: boolean;
  scrollOffset: number | null;
}>;

export function isCurrentSavedDestinationIntentV1(
  intent: SavedDestinationIntentV1 | null,
  currentRequestId: number,
  consumedRequestId: number | null,
): intent is SavedDestinationIntentV1 {
  return Boolean(
    intent
      && intent.requestId === currentRequestId
      && intent.requestId !== consumedRequestId,
  );
}

export function planSavedDestinationApplicationV1(
  intent: SavedDestinationIntentV1 | null,
  context: SavedDestinationApplicationContextV1,
): SavedDestinationApplicationPlanV1 | null {
  if (!isCurrentSavedDestinationIntentV1(intent, context.currentRequestId, context.consumedRequestId)) {
    return null;
  }
  const needsSectionSelection = context.activeSectionKey !== "player";
  const needsTabSelection = context.activeTab !== intent.tab;
  const layoutReady = context.containerLayoutY !== null && context.headingLayoutY !== null;
  const ready = !needsSectionSelection && !needsTabSelection && layoutReady;
  return Object.freeze({
    requestId: intent.requestId,
    tab: intent.tab,
    label: intent.label,
    needsSectionSelection,
    needsTabSelection,
    ready,
    scrollOffset: ready
      ? Math.max(0, context.containerLayoutY! + context.headingLayoutY! - 12)
      : null,
  });
}

export function shouldApplySavedDestinationIntentV1(
  intent: SavedDestinationIntentV1 | null,
  currentRequestId: number,
  consumedRequestId: number | null,
  activeSectionKey: string,
): intent is SavedDestinationIntentV1 {
  return Boolean(
    isCurrentSavedDestinationIntentV1(intent, currentRequestId, consumedRequestId)
      && activeSectionKey === "player",
  );
}
