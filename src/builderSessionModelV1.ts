export const BUILDER_SESSION_CONTRACT_VERSION = "1" as const;
export const BUILDER_SESSION_ORIGINS = ["generated", "curated", "manual", "playing", "saved"] as const;
export const BUILDER_SESSION_STATES = ["generated", "curated", "manual_edit", "playing", "saved"] as const;
export const BUILDER_SESSION_LAYER_ROLES = ["bed", "texture", "accent", "foreground"] as const;

export type BuilderSessionOrigin = typeof BUILDER_SESSION_ORIGINS[number];
export type BuilderSessionState = typeof BUILDER_SESSION_STATES[number];
export type BuilderSessionLayerRole = typeof BUILDER_SESSION_LAYER_ROLES[number];
export type BuilderSessionDensity = "minimal" | "balanced" | "textured";

export type BuilderCandidateGate = Readonly<{
  lifecycleState: "active" | "held" | "blocked" | "revoked" | "deprecated" | string;
  mobilePlayable: boolean;
  rightsAllowed: boolean;
  technicalQcAllowed: boolean;
  sensoryQcAllowed: boolean;
  activationAllowed: boolean;
  manualOnly: boolean;
  explicitChoice: boolean;
  warning: string | null;
}>;

export type BuilderSessionLayer = Readonly<{
  layerId: string;
  role: BuilderSessionLayerRole;
  soundId: string;
  title: string;
  volume: number;
  enabled: boolean;
  userChoiceOnly: boolean;
  reason: string;
  roleEligible: boolean;
  gate: BuilderCandidateGate;
}>;

export type BuilderSessionModelV1 = Readonly<{
  contractVersion: typeof BUILDER_SESSION_CONTRACT_VERSION;
  origin: BuilderSessionOrigin;
  state: BuilderSessionState;
  sourceRecipeId: string;
  recipeId: string;
  recipeRevision: number;
  editId: string;
  editRevision: number;
  title: string;
  intent: string;
  density: BuilderSessionDensity;
  seed: string;
  choiceGranted: boolean;
  layers: readonly BuilderSessionLayer[];
  why: readonly string[];
  warnings: readonly string[];
  editExplanations: readonly string[];
}>;

export type BuilderSessionCreateInput = Readonly<{
  origin: BuilderSessionOrigin;
  state: BuilderSessionState;
  sourceRecipeId: string;
  title: string;
  intent: string;
  density: BuilderSessionDensity;
  seed: string;
  choiceGranted: boolean;
  layers: readonly BuilderSessionLayer[];
  recipeRevision?: number;
  editRevision?: number;
  editExplanations?: readonly string[];
}>;

export type BuilderEdit =
  | Readonly<{ type: "set-enabled"; layerId: string; enabled: boolean }>
  | Readonly<{ type: "set-volume"; layerId: string; volume: number }>
  | Readonly<{ type: "swap"; layerId: string; candidate: BuilderSessionLayer }>;

export type BuilderEditRejectionCode =
  | "ROLE_INCOMPATIBLE"
  | "UNAVAILABLE"
  | "RIGHTS_RESTRICTED"
  | "TECHNICAL_QC_RESTRICTED"
  | "SENSORY_QC_RESTRICTED"
  | "ACTIVATION_RESTRICTED"
  | "LIFECYCLE_REVOKED"
  | "CHOICE_REQUIRED"
  | "BED_REQUIRED"
  | "INVALID_VOLUME"
  | "ROLE_NOT_FOUND";

export type BuilderEditResult =
  | Readonly<{ accepted: true; model: BuilderSessionModelV1; explanation: string }>
  | Readonly<{ accepted: false; model: BuilderSessionModelV1; code: BuilderEditRejectionCode; explanation: string }>;

const stableHash = (value: string): string => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
};

const roundVolume = (volume: number): number => Math.round(volume * 1000) / 1000;
const canonicalLayer = (layer: BuilderSessionLayer) => [
  layer.layerId,
  layer.role,
  layer.soundId,
  layer.title,
  roundVolume(layer.volume),
  layer.enabled,
  layer.userChoiceOnly,
  layer.reason,
  layer.roleEligible,
  layer.gate.lifecycleState,
  layer.gate.mobilePlayable,
  layer.gate.rightsAllowed,
  layer.gate.technicalQcAllowed,
  layer.gate.sensoryQcAllowed,
  layer.gate.activationAllowed,
  layer.gate.manualOnly,
  layer.gate.explicitChoice,
  layer.gate.warning,
];
const canonicalRecipe = (input: Pick<BuilderSessionCreateInput, "sourceRecipeId" | "intent" | "density" | "seed" | "choiceGranted" | "layers">): string =>
  JSON.stringify([input.sourceRecipeId, input.intent, input.density, input.seed, input.choiceGranted, input.layers.map(canonicalLayer)]);
const canonicalEdit = (recipeId: string, editRevision: number, layers: readonly BuilderSessionLayer[]): string =>
  JSON.stringify([recipeId, editRevision, layers.map(canonicalLayer)]);

const roleLabel = (role: BuilderSessionLayerRole): string =>
  role === "bed" ? "Background" : role === "texture" ? "Texture" : role === "foreground" ? "Foreground" : "Accent";

const deriveWhy = (layers: readonly BuilderSessionLayer[]): readonly string[] => Object.freeze(
  layers
    .filter((layer) => layer.enabled)
    .map((layer) => `${roleLabel(layer.role)}: ${layer.title} at ${Math.round(layer.volume * 100)}% — ${layer.reason}.`),
);

const deriveWarnings = (layers: readonly BuilderSessionLayer[]): readonly string[] => Object.freeze(
  Array.from(new Set(layers
    .filter((layer) => layer.enabled)
    .flatMap((layer) => [
      layer.gate.warning,
      layer.userChoiceOnly || layer.gate.explicitChoice ? `Choice: ${layer.title} was explicitly selected.` : null,
    ])
    .filter((warning): warning is string => Boolean(warning)))),
);

const rejectCandidate = (
  candidate: BuilderSessionLayer,
  role: BuilderSessionLayerRole,
  choiceGranted: boolean,
): { code: BuilderEditRejectionCode; explanation: string } | null => {
  if (candidate.role !== role || !candidate.roleEligible) {
    return { code: "ROLE_INCOMPATIBLE", explanation: `${candidate.title} is not eligible for the ${role} role. The current layer was kept.` };
  }
  if (candidate.gate.lifecycleState === "revoked" || candidate.gate.lifecycleState === "deprecated") {
    return { code: "LIFECYCLE_REVOKED", explanation: `${candidate.title} is ${candidate.gate.lifecycleState}. The current layer was kept.` };
  }
  if (candidate.gate.lifecycleState !== "active" || !candidate.gate.mobilePlayable) {
    return { code: "UNAVAILABLE", explanation: `${candidate.title} is unavailable for mobile playback. The current layer was kept.` };
  }
  if (!candidate.gate.rightsAllowed) {
    return { code: "RIGHTS_RESTRICTED", explanation: `${candidate.title} is restricted by the accepted rights gate. The current layer was kept.` };
  }
  if (!candidate.gate.technicalQcAllowed) {
    return { code: "TECHNICAL_QC_RESTRICTED", explanation: `${candidate.title} has not passed the accepted technical QC gate. The current layer was kept.` };
  }
  if (!candidate.gate.sensoryQcAllowed) {
    return { code: "SENSORY_QC_RESTRICTED", explanation: `${candidate.title} has not passed the accepted sensory QC gate. The current layer was kept.` };
  }
  if (!candidate.gate.activationAllowed) {
    return { code: "ACTIVATION_RESTRICTED", explanation: `${candidate.title} is not active through the accepted activation service. The current layer was kept.` };
  }
  if ((candidate.userChoiceOnly || candidate.gate.explicitChoice || candidate.gate.manualOnly) && !choiceGranted) {
    return { code: "CHOICE_REQUIRED", explanation: `${candidate.title} requires explicit Choice consent. The current layer was kept.` };
  }
  return null;
};

const freezeLayer = (layer: BuilderSessionLayer): BuilderSessionLayer => Object.freeze({
  ...layer,
  volume: roundVolume(layer.volume),
  gate: Object.freeze({ ...layer.gate }),
});

const freezeModel = (model: Omit<BuilderSessionModelV1, "why" | "warnings">): BuilderSessionModelV1 => Object.freeze({
  ...model,
  layers: Object.freeze(model.layers.map(freezeLayer)),
  why: deriveWhy(model.layers),
  warnings: deriveWarnings(model.layers),
  editExplanations: Object.freeze([...model.editExplanations]),
});

const assertCreateInput = (input: BuilderSessionCreateInput): void => {
  if (!BUILDER_SESSION_ORIGINS.includes(input.origin)) throw new Error("Unknown Builder origin");
  if (!BUILDER_SESSION_STATES.includes(input.state)) throw new Error("Unknown Builder state");
  if (!input.sourceRecipeId || !input.title || !input.seed) throw new Error("Builder identity is incomplete");
  if (!input.layers.length || !input.layers.some((layer) => layer.role === "bed" && layer.enabled)) {
    throw new Error("Builder session requires one enabled bed");
  }
  const layerIds = new Set<string>();
  const soundIds = new Set<string>();
  for (const layer of input.layers) {
    if (!layer.layerId || layerIds.has(layer.layerId)) throw new Error(`Duplicate or missing Builder layer identity: ${layer.layerId}`);
    if (soundIds.has(layer.soundId)) throw new Error(`Duplicate Builder sound: ${layer.soundId}`);
    layerIds.add(layer.layerId);
    soundIds.add(layer.soundId);
    if (!Number.isFinite(layer.volume) || layer.volume < 0.02 || layer.volume > 0.65) throw new Error(`Invalid Builder volume for ${layer.soundId}`);
    const rejection = rejectCandidate(layer, layer.role, input.choiceGranted);
    if (rejection) throw new Error(`${rejection.code}: ${rejection.explanation}`);
  }
};

export function createBuilderSessionModel(input: BuilderSessionCreateInput): BuilderSessionModelV1 {
  assertCreateInput(input);
  const layers = Object.freeze(input.layers.map(freezeLayer));
  const recipeId = `builder-recipe:${stableHash(canonicalRecipe({ ...input, layers }))}`;
  const editRevision = Math.max(0, Math.floor(input.editRevision ?? 0));
  return freezeModel({
    contractVersion: BUILDER_SESSION_CONTRACT_VERSION,
    origin: input.origin,
    state: input.state,
    sourceRecipeId: input.sourceRecipeId,
    recipeId,
    recipeRevision: Math.max(0, Math.floor(input.recipeRevision ?? 0)),
    editId: `builder-edit:${stableHash(canonicalEdit(recipeId, editRevision, layers))}`,
    editRevision,
    title: input.title,
    intent: input.intent,
    density: input.density,
    seed: input.seed,
    choiceGranted: input.choiceGranted,
    layers,
    editExplanations: Object.freeze([...(input.editExplanations ?? [])]),
  });
}

const withEditedLayers = (
  model: BuilderSessionModelV1,
  layers: readonly BuilderSessionLayer[],
  explanation: string,
): BuilderSessionModelV1 => {
  const editRevision = model.editRevision + 1;
  const frozenLayers = Object.freeze(layers.map(freezeLayer));
  return freezeModel({
    ...model,
    state: "manual_edit",
    recipeId: model.recipeId,
    recipeRevision: model.recipeRevision,
    editRevision,
    editId: `builder-edit:${stableHash(canonicalEdit(model.recipeId, editRevision, frozenLayers))}`,
    layers: frozenLayers,
    editExplanations: Object.freeze([...model.editExplanations, explanation]),
  });
};

export function applyBuilderEdit(model: BuilderSessionModelV1, edit: BuilderEdit): BuilderEditResult {
  const layerIndex = model.layers.findIndex((layer) => layer.layerId === edit.layerId);
  if (layerIndex < 0) {
    return Object.freeze({ accepted: false, model, code: "ROLE_NOT_FOUND", explanation: `No Builder layer ${edit.layerId} exists. The recipe was not changed.` });
  }
  const current = model.layers[layerIndex];
  const layers = [...model.layers];
  let explanation: string;
  if (edit.type === "set-enabled") {
    if (current.role === "bed" && !edit.enabled) {
      return Object.freeze({ accepted: false, model, code: "BED_REQUIRED", explanation: "The background bed is required. The recipe was not changed." });
    }
    layers[layerIndex] = freezeLayer({ ...current, enabled: edit.enabled });
    explanation = `${edit.enabled ? "Enabled" : "Disabled"} ${current.role} ${current.title}.`;
  } else if (edit.type === "set-volume") {
    if (!Number.isFinite(edit.volume) || edit.volume < 0.02 || edit.volume > 0.65) {
      return Object.freeze({ accepted: false, model, code: "INVALID_VOLUME", explanation: `Volume for ${current.title} must stay between 2% and 65%. The recipe was not changed.` });
    }
    const volume = roundVolume(edit.volume);
    layers[layerIndex] = freezeLayer({ ...current, volume });
    explanation = `Set ${current.title} ${current.role} volume to ${Math.round(volume * 100)}%.`;
  } else {
    const rejection = rejectCandidate(edit.candidate, current.role, model.choiceGranted);
    if (rejection) return Object.freeze({ accepted: false, model, ...rejection });
    const candidate = freezeLayer({ ...edit.candidate, layerId: current.layerId, role: current.role, volume: current.volume, enabled: current.enabled });
    if (model.layers.some((layer, index) => index !== layerIndex && layer.soundId === candidate.soundId)) {
      return Object.freeze({ accepted: false, model, code: "ROLE_INCOMPATIBLE", explanation: `${candidate.title} is already used in this recipe. The current layer was kept.` });
    }
    layers[layerIndex] = candidate;
    explanation = `Swapped ${current.role} from ${current.title} to ${candidate.title}; volume stayed at ${Math.round(current.volume * 100)}%.`;
  }
  return Object.freeze({ accepted: true, model: withEditedLayers(model, layers, explanation), explanation });
}

export type BuilderOperationState = Readonly<{
  sessionId: string;
  generation: number;
  operationId: number;
  model: BuilderSessionModelV1;
}>;
export type BuilderOperation = Readonly<{
  sessionId: string;
  generation: number;
  operationId: number;
  edit: BuilderEdit;
}>;
export type BuilderOperationResult =
  | Readonly<{ accepted: true; state: BuilderOperationState; explanation: string }>
  | Readonly<{ accepted: false; state: BuilderOperationState; code: "SESSION_MISMATCH" | "STALE_OPERATION" | BuilderEditRejectionCode; explanation: string }>;

export function createBuilderOperationState(model: BuilderSessionModelV1, generation: number): BuilderOperationState {
  return Object.freeze({ sessionId: `${model.recipeId}:${generation}`, generation, operationId: 0, model });
}

export function applyBuilderOperation(state: BuilderOperationState, operation: BuilderOperation): BuilderOperationResult {
  if (operation.sessionId !== state.sessionId || operation.generation !== state.generation) {
    return Object.freeze({ accepted: false, state, code: "SESSION_MISMATCH", explanation: "The edit belongs to a different Builder session and was ignored." });
  }
  if (operation.operationId <= state.operationId) {
    return Object.freeze({ accepted: false, state, code: "STALE_OPERATION", explanation: "A duplicate or stale Builder edit was ignored." });
  }
  const result = applyBuilderEdit(state.model, operation.edit);
  if (result.accepted === false) return Object.freeze({ accepted: false, state, code: result.code, explanation: result.explanation });
  return Object.freeze({
    accepted: true,
    state: Object.freeze({ ...state, operationId: operation.operationId, model: result.model }),
    explanation: result.explanation,
  });
}

export type BuilderPlaybackDescriptor = Readonly<{
  recipeId: string;
  editId: string;
  nativeSessionId: string;
  generation: number;
  operationId: number;
  ownerCount: 1;
  layers: readonly Readonly<{ layerId: string; role: BuilderSessionLayerRole; soundId: string; title: string; volume: number; enabled: true }>[];
}>;

export function createBuilderPlaybackDescriptor(
  model: BuilderSessionModelV1,
  generation: number,
  operationId: number,
): BuilderPlaybackDescriptor {
  const enabled = model.layers.filter((layer) => layer.enabled);
  if (!enabled.some((layer) => layer.role === "bed")) throw new Error("BED_REQUIRED: Builder playback requires an enabled bed");
  for (const layer of enabled) {
    const rejection = rejectCandidate(layer, layer.role, model.choiceGranted);
    if (rejection) throw new Error(`${rejection.code}: ${rejection.explanation}`);
  }
  if (new Set(enabled.map((layer) => layer.soundId)).size !== enabled.length) throw new Error("Builder playback cannot own duplicate sounds");
  return Object.freeze({
    recipeId: model.recipeId,
    editId: model.editId,
    nativeSessionId: `${model.recipeId}:${generation}`,
    generation,
    operationId,
    ownerCount: 1,
    layers: Object.freeze(enabled.map((layer) => Object.freeze({
      layerId: layer.layerId,
      role: layer.role,
      soundId: layer.soundId,
      title: layer.title,
      volume: layer.volume,
      enabled: true as const,
    }))),
  });
}

export function transitionBuilderSession(
  model: BuilderSessionModelV1,
  state: BuilderSessionState,
  origin: BuilderSessionOrigin = model.origin,
): BuilderSessionModelV1 {
  return freezeModel({ ...model, state, origin });
}

export function revalidateBuilderSessionModel(
  model: BuilderSessionModelV1,
  currentCandidates: readonly BuilderSessionLayer[],
): BuilderSessionModelV1 {
  const reopened = reopenBuilderSession(model);
  if (currentCandidates.length !== reopened.layers.length) {
    throw new Error("Builder definition no longer matches current accepted catalog gates: layer count changed");
  }
  const currentByLayerId = new Map(currentCandidates.map((candidate) => [candidate.layerId, candidate]));
  const layers = reopened.layers.map((storedLayer) => {
    const current = currentByLayerId.get(storedLayer.layerId);
    if (!current || current.role !== storedLayer.role || current.soundId !== storedLayer.soundId) {
      throw new Error(`Builder definition no longer matches current accepted catalog gates: ${storedLayer.layerId} identity changed`);
    }
    return freezeLayer({
      ...current,
      volume: storedLayer.volume,
      enabled: storedLayer.enabled,
      reason: storedLayer.reason,
    });
  });
  const input: BuilderSessionCreateInput = {
    origin: reopened.origin,
    state: reopened.state,
    sourceRecipeId: reopened.sourceRecipeId,
    title: reopened.title,
    intent: reopened.intent,
    density: reopened.density,
    seed: reopened.seed,
    choiceGranted: reopened.choiceGranted,
    layers,
    recipeRevision: reopened.recipeRevision,
    editRevision: reopened.editRevision,
    editExplanations: reopened.editExplanations,
  };
  assertCreateInput(input);
  const expectedEditId = `builder-edit:${stableHash(canonicalEdit(reopened.recipeId, reopened.editRevision, layers))}`;
  if (expectedEditId !== reopened.editId) {
    throw new Error("Builder definition no longer matches current accepted catalog gates");
  }
  return freezeModel({ ...reopened, layers });
}

export function reopenBuilderSession(raw: string | BuilderSessionModelV1): BuilderSessionModelV1 {
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!parsed || parsed.contractVersion !== BUILDER_SESSION_CONTRACT_VERSION) throw new Error("Unsupported Builder session contract");
  const input: BuilderSessionCreateInput = {
    origin: parsed.origin,
    state: parsed.state,
    sourceRecipeId: parsed.sourceRecipeId,
    title: parsed.title,
    intent: parsed.intent,
    density: parsed.density,
    seed: parsed.seed,
    choiceGranted: parsed.choiceGranted,
    layers: parsed.layers,
    recipeRevision: parsed.recipeRevision,
    editRevision: parsed.editRevision,
    editExplanations: parsed.editExplanations,
  };
  assertCreateInput(input);
  const layers = Object.freeze(input.layers.map(freezeLayer));
  const editRevision = Math.max(0, Math.floor(input.editRevision ?? 0));
  if (editRevision === 0) {
    const expectedRecipeId = `builder-recipe:${stableHash(canonicalRecipe({ ...input, layers }))}`;
    if (expectedRecipeId !== parsed.recipeId) {
      throw new Error("Builder recipe identity does not match its stored definition");
    }
  }
  const expectedEditId = `builder-edit:${stableHash(canonicalEdit(parsed.recipeId, editRevision, layers))}`;
  if (expectedEditId !== parsed.editId) {
    throw new Error("Builder edit identity does not match its stored definition");
  }
  return freezeModel({
    contractVersion: BUILDER_SESSION_CONTRACT_VERSION,
    origin: input.origin,
    state: input.state,
    sourceRecipeId: input.sourceRecipeId,
    recipeId: parsed.recipeId,
    recipeRevision: Math.max(0, Math.floor(input.recipeRevision ?? 0)),
    editId: expectedEditId,
    editRevision,
    title: input.title,
    intent: input.intent,
    density: input.density,
    seed: input.seed,
    choiceGranted: input.choiceGranted,
    layers,
    editExplanations: Object.freeze([...(input.editExplanations ?? [])]),
  });
}
