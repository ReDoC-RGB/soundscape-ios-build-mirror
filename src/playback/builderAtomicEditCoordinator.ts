import type { BuilderSessionModelV1 } from "../builderSessionModelV1";

export type BuilderAtomicOwnership = Readonly<{
  sessionId: string;
  generation: number;
  operationId: number;
}>;

export type BuilderPlayableLayer = Readonly<{
  layerId: string;
  role: string;
  soundId: string;
  volume: number;
  enabled: boolean;
}>;

export type BuilderPlayableDefinition = Readonly<{
  editId: string;
  recipeId: string;
  owner: BuilderAtomicOwnership;
  layers: readonly BuilderPlayableLayer[];
}>;

export type BuilderAtomicEditToken = Readonly<{
  sessionId: string;
  generation: number;
  operationId: number;
  editId: string;
}>;

export type BuilderAtomicEditState = Readonly<{
  displayedModel: BuilderSessionModelV1;
  playableDefinition: BuilderPlayableDefinition;
  pendingToken: BuilderAtomicEditToken | null;
  ownerCount: 1;
  playbackStatus: "playing" | "paused";
  uiError: null;
}>;

export type BuilderAtomicEditOperation = BuilderAtomicOwnership & Readonly<{
  model: BuilderSessionModelV1;
}>;

export type BuilderAtomicEditBeginResult =
  | Readonly<{ accepted: true; state: BuilderAtomicEditState; token: BuilderAtomicEditToken }>
  | Readonly<{ accepted: false; state: BuilderAtomicEditState; code: "SESSION_MISMATCH" | "STALE_OPERATION" }>;

export type BuilderAtomicEditCompletionResult =
  | Readonly<{ accepted: true; state: BuilderAtomicEditState }>
  | Readonly<{ accepted: false; state: BuilderAtomicEditState; code: "STALE_PREPARATION" | "DEFINITION_MISMATCH" }>;

const freezeDefinition = (definition: BuilderPlayableDefinition): BuilderPlayableDefinition => Object.freeze({
  ...definition,
  owner: Object.freeze({ ...definition.owner }),
  layers: Object.freeze(definition.layers.map((layer) => Object.freeze({ ...layer }))),
});

const freezeState = (state: BuilderAtomicEditState): BuilderAtomicEditState => Object.freeze({
  ...state,
  playableDefinition: freezeDefinition(state.playableDefinition),
  pendingToken: state.pendingToken ? Object.freeze({ ...state.pendingToken }) : null,
  ownerCount: 1,
  uiError: null,
});

export function createBuilderAtomicEditState(
  displayedModel: BuilderSessionModelV1,
  playableDefinition: BuilderPlayableDefinition,
  playbackStatus: "playing" | "paused" = "playing",
): BuilderAtomicEditState {
  if (displayedModel.recipeId !== playableDefinition.recipeId) {
    throw new Error("Builder playable definition must belong to the displayed recipe");
  }
  if (new Set(playableDefinition.layers.map((layer) => layer.layerId)).size !== playableDefinition.layers.length) {
    throw new Error("Builder playable definition contains duplicate physical layer identities");
  }
  return freezeState({
    displayedModel,
    playableDefinition,
    pendingToken: null,
    ownerCount: 1,
    playbackStatus,
    uiError: null,
  });
}

export function beginBuilderAtomicEdit(
  state: BuilderAtomicEditState,
  operation: BuilderAtomicEditOperation,
): BuilderAtomicEditBeginResult {
  const currentOwner = state.playableDefinition.owner;
  if (operation.sessionId !== currentOwner.sessionId || operation.generation !== currentOwner.generation) {
    return Object.freeze({ accepted: false, state, code: "SESSION_MISMATCH" });
  }
  const latestOperationId = Math.max(currentOwner.operationId, state.pendingToken?.operationId ?? 0);
  if (operation.operationId <= latestOperationId) {
    return Object.freeze({ accepted: false, state, code: "STALE_OPERATION" });
  }
  if (operation.model.recipeId !== state.displayedModel.recipeId) {
    return Object.freeze({ accepted: false, state, code: "SESSION_MISMATCH" });
  }
  const token = Object.freeze({
    sessionId: operation.sessionId,
    generation: operation.generation,
    operationId: operation.operationId,
    editId: operation.model.editId,
  });
  return Object.freeze({
    accepted: true,
    token,
    state: freezeState({ ...state, displayedModel: operation.model, pendingToken: token }),
  });
}

const tokenMatches = (left: BuilderAtomicEditToken | null, right: BuilderAtomicEditToken): boolean => Boolean(
  left &&
  left.sessionId === right.sessionId &&
  left.generation === right.generation &&
  left.operationId === right.operationId &&
  left.editId === right.editId,
);

export function acceptPreparedBuilderEdit(
  state: BuilderAtomicEditState,
  token: BuilderAtomicEditToken,
  preparedDefinition: BuilderPlayableDefinition,
): BuilderAtomicEditCompletionResult {
  if (!tokenMatches(state.pendingToken, token)) {
    return Object.freeze({ accepted: false, state, code: "STALE_PREPARATION" });
  }
  if (
    preparedDefinition.recipeId !== state.displayedModel.recipeId ||
    preparedDefinition.editId !== state.displayedModel.editId ||
    preparedDefinition.owner.sessionId !== token.sessionId ||
    preparedDefinition.owner.generation !== token.generation ||
    preparedDefinition.owner.operationId !== token.operationId
  ) {
    return Object.freeze({ accepted: false, state, code: "DEFINITION_MISMATCH" });
  }
  return Object.freeze({
    accepted: true,
    state: freezeState({ ...state, playableDefinition: preparedDefinition, pendingToken: null }),
  });
}

export function rejectPreparedBuilderEdit(
  state: BuilderAtomicEditState,
  token: BuilderAtomicEditToken,
  _reason: string,
): BuilderAtomicEditCompletionResult {
  if (!tokenMatches(state.pendingToken, token)) {
    return Object.freeze({ accepted: false, state, code: "STALE_PREPARATION" });
  }
  return Object.freeze({
    accepted: true,
    state: freezeState({ ...state, pendingToken: null }),
  });
}

export class BuilderAtomicEditCoordinator {
  private current: BuilderAtomicEditState | null = null;

  install(state: BuilderAtomicEditState): void {
    this.current = state;
  }

  state(): BuilderAtomicEditState | null {
    return this.current;
  }

  begin(operation: BuilderAtomicEditOperation): BuilderAtomicEditBeginResult | null {
    if (!this.current) return null;
    const result = beginBuilderAtomicEdit(this.current, operation);
    if (result.accepted) this.current = result.state;
    return result;
  }

  accept(token: BuilderAtomicEditToken, definition: BuilderPlayableDefinition): BuilderAtomicEditCompletionResult | null {
    if (!this.current) return null;
    const result = acceptPreparedBuilderEdit(this.current, token, definition);
    if (result.accepted) this.current = result.state;
    return result;
  }

  reject(token: BuilderAtomicEditToken, reason: string): BuilderAtomicEditCompletionResult | null {
    if (!this.current) return null;
    const result = rejectPreparedBuilderEdit(this.current, token, reason);
    if (result.accepted) this.current = result.state;
    return result;
  }
}
