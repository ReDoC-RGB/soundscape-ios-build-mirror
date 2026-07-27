export type SavedDestructiveSurfaceV1 = "classic" | "directed";
export type SavedDestructiveSectionV1 = "fast-start" | "browse" | "presets" | "player";
export type SavedDestructiveTabV1 = "sounds" | "sessions";

export type SavedDestructiveContextV1 = Readonly<{
  surface: SavedDestructiveSurfaceV1;
  section: SavedDestructiveSectionV1 | null;
  savedTab: SavedDestructiveTabV1 | null;
  settingsOpen: boolean;
  destinationRevision: number;
}>;

export type SavedDestructiveAuthorityV1 = Readonly<{
  generation: number;
  commandRevision: number;
  contextKey: string;
  managedSavedSessionId: string | null;
  pendingDeleteSessionId: string | null;
}>;

export type SavedDestructiveCommandTokenV1 = Readonly<{
  generation: number;
  commandRevision: number;
  contextKey: string;
}>;

export type SavedDeleteRequestResultV1 = Readonly<{
  state: SavedDestructiveAuthorityV1;
  confirmationReady: boolean;
}>;

export function savedDestructiveContextKeyV1(context: SavedDestructiveContextV1): string {
  return [
    context.surface,
    context.section ?? "none",
    context.savedTab ?? "none",
    context.settingsOpen ? "settings" : "content",
    String(context.destinationRevision),
  ].join(":");
}

export function isSavedDestructiveContextV1(context: SavedDestructiveContextV1): boolean {
  return context.surface === "classic"
    && context.section === "player"
    && context.savedTab === "sessions"
    && !context.settingsOpen;
}

export function createSavedDestructiveAuthorityV1(
  context: SavedDestructiveContextV1,
): SavedDestructiveAuthorityV1 {
  return Object.freeze({
    generation: 0,
    commandRevision: 0,
    contextKey: savedDestructiveContextKeyV1(context),
    managedSavedSessionId: null,
    pendingDeleteSessionId: null,
  });
}

export function savedDestructiveCommandTokenV1(
  state: SavedDestructiveAuthorityV1,
): SavedDestructiveCommandTokenV1 {
  return Object.freeze({
    generation: state.generation,
    commandRevision: state.commandRevision,
    contextKey: state.contextKey,
  });
}

export function applySavedDestructiveNavigationBoundaryV1(
  state: SavedDestructiveAuthorityV1,
  nextContext: SavedDestructiveContextV1,
): SavedDestructiveAuthorityV1 {
  const nextContextKey = savedDestructiveContextKeyV1(nextContext);
  if (state.contextKey === nextContextKey) return state;
  return Object.freeze({
    generation: state.generation + 1,
    commandRevision: state.commandRevision + 1,
    contextKey: nextContextKey,
    managedSavedSessionId: null,
    pendingDeleteSessionId: null,
  });
}

function tokenOwnsCurrentAuthorityV1(
  state: SavedDestructiveAuthorityV1,
  token: SavedDestructiveCommandTokenV1,
  context: SavedDestructiveContextV1,
): boolean {
  return token.generation === state.generation
    && token.commandRevision === state.commandRevision
    && token.contextKey === state.contextKey
    && savedDestructiveContextKeyV1(context) === state.contextKey
    && isSavedDestructiveContextV1(context);
}

export function selectManagedSavedSessionV1(
  state: SavedDestructiveAuthorityV1,
  context: SavedDestructiveContextV1,
  token: SavedDestructiveCommandTokenV1,
  sessionId: string | null,
): SavedDestructiveAuthorityV1 {
  if (!tokenOwnsCurrentAuthorityV1(state, token, context)) return state;
  if (state.managedSavedSessionId === sessionId && state.pendingDeleteSessionId === null) return state;
  return Object.freeze({
    ...state,
    commandRevision: state.commandRevision + 1,
    managedSavedSessionId: sessionId,
    pendingDeleteSessionId: null,
  });
}

export function requestSavedSessionDeleteV1(
  state: SavedDestructiveAuthorityV1,
  context: SavedDestructiveContextV1,
  token: SavedDestructiveCommandTokenV1,
  sessionId: string,
): SavedDeleteRequestResultV1 {
  if (
    !tokenOwnsCurrentAuthorityV1(state, token, context)
    || state.managedSavedSessionId !== sessionId
  ) {
    return Object.freeze({ state, confirmationReady: false });
  }
  if (state.pendingDeleteSessionId === sessionId) {
    return Object.freeze({ state, confirmationReady: true });
  }
  return Object.freeze({
    state: Object.freeze({
      ...state,
      commandRevision: state.commandRevision + 1,
      pendingDeleteSessionId: sessionId,
    }),
    confirmationReady: false,
  });
}

export function cancelSavedSessionDeleteV1(
  state: SavedDestructiveAuthorityV1,
  context: SavedDestructiveContextV1,
  token: SavedDestructiveCommandTokenV1,
  sessionId: string,
): SavedDestructiveAuthorityV1 {
  if (!tokenOwnsCurrentAuthorityV1(state, token, context) || state.pendingDeleteSessionId !== sessionId) return state;
  return Object.freeze({
    ...state,
    commandRevision: state.commandRevision + 1,
    pendingDeleteSessionId: null,
  });
}

export function clearSavedDestructiveAuthorityV1(
  state: SavedDestructiveAuthorityV1,
  preserveManagedSession: boolean = false,
): SavedDestructiveAuthorityV1 {
  const managedSavedSessionId = preserveManagedSession ? state.managedSavedSessionId : null;
  if (state.pendingDeleteSessionId === null && state.managedSavedSessionId === managedSavedSessionId) return state;
  return Object.freeze({
    ...state,
    commandRevision: state.commandRevision + 1,
    managedSavedSessionId,
    pendingDeleteSessionId: null,
  });
}

export function canConfirmSavedSessionDeleteV1(
  state: SavedDestructiveAuthorityV1,
  context: SavedDestructiveContextV1,
  token: SavedDestructiveCommandTokenV1,
  sessionId: string,
): boolean {
  return tokenOwnsCurrentAuthorityV1(state, token, context)
    && state.managedSavedSessionId === sessionId
    && state.pendingDeleteSessionId === sessionId;
}

export function recoverSavedDestructiveAuthorityV1(
  context: SavedDestructiveContextV1,
): SavedDestructiveAuthorityV1 {
  // Saved data and playback recovery are separate; destructive/manage authority is never persisted.
  return createSavedDestructiveAuthorityV1(context);
}
