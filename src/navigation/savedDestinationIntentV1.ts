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

export function shouldApplySavedDestinationIntentV1(
  intent: SavedDestinationIntentV1 | null,
  currentRequestId: number,
  consumedRequestId: number | null,
  activeSectionKey: string,
): intent is SavedDestinationIntentV1 {
  return Boolean(
    intent
      && intent.requestId === currentRequestId
      && intent.requestId !== consumedRequestId
      && activeSectionKey === "player",
  );
}
