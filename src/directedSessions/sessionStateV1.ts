import type {
  DirectedOutputProfileV1,
  DirectedSceneIdV1,
  DirectedSceneScoreV1,
  DirectedSteeringAxisV1,
} from "./sceneScoresV1";

export const DIRECTED_SESSION_STATE_STORAGE_KEY_V1 = "soundscape-mobile:directed-session-state:v1";
export const DIRECTED_SAVED_PATHS_STORAGE_KEY_V1 = "soundscape-mobile:directed-saved-paths:v1";
export const DIRECTED_FEEDBACK_STORAGE_KEY_V1 = "soundscape-mobile:directed-feedback:v1";

export type DirectedTransportV1 = "preparing" | "playing" | "paused" | "interrupted" | "completing" | "completed" | "failed" | "stopped";
export type DirectedEndedReasonV1 = "natural-completion" | "user-ended" | "required-asset-failed" | "scheduler-failed" | "process-ended" | null;
export type DirectedAxisLevelsV1 = Readonly<{ softer: 0 | 1 | 2; sparser: 0 | 1 | 2; closer: 0 | 1 | 2; steadier: 0 | 1 | 2 }>;
export type DirectedAppliedSteeringV1 = DirectedAxisLevelsV1 & Readonly<{ textureReplacements: Readonly<Record<string, string>> }>;
export type DirectedPendingSteeringV1 = Readonly<{
  axis: DirectedSteeringAxisV1 | "different-texture";
  level: 0 | 1 | 2 | null;
  fromAssetId: string | null;
  toAssetId: string | null;
  targetPhaseRevision: number;
  operationId: number;
  expectedPathRevision: number;
  idempotencyKey: string;
}>;
export type DirectedAcknowledgementStatusV1 = "accepted" | "applied" | "cancelled" | "duplicate" | "stale" | "rejected";
export type DirectedAcknowledgementV1 = Readonly<{
  status: DirectedAcknowledgementStatusV1;
  operationId: number;
  idempotencyKey: string;
  pathRevision: number;
  code: string | null;
  message: string | null;
  safeCheckpointWithinMs: number;
}>;
export type DirectedPathHistoryEntryV1 = Readonly<{
  axis: DirectedSteeringAxisV1 | "different-texture";
  before: number | string | null;
  after: number | string | null;
  operationId: number;
  appliedAtPhaseRevision: number;
}>;

export type DirectedSessionStateV1 = Readonly<{
  contractVersion: 1;
  sessionId: string;
  generation: number;
  scoreHash: string;
  sceneId: DirectedSceneIdV1;
  sceneVersion: 1;
  title: string;
  trajectory: string;
  durationMs: number;
  transport: DirectedTransportV1;
  playedElapsedMs: number;
  observedAtMonotonicMs: number;
  phaseId: string;
  phaseLabel: string;
  nextPhaseLabel: string | null;
  phaseIndex: number;
  phaseRevision: number;
  outputProfile: DirectedOutputProfileV1;
  hardAvoidanceIds: readonly string[];
  appliedSteering: DirectedAppliedSteeringV1;
  pendingSteering: DirectedPendingSteeringV1 | null;
  manualTrims: Readonly<Record<string, Readonly<{ enabled: boolean; trimDb: -3 | 0 | 3 }>>>;
  pathHistory: readonly DirectedPathHistoryEntryV1[];
  pathRevision: number;
  lastAcceptedOperationId: number;
  lastAcknowledgement: DirectedAcknowledgementV1 | null;
  acknowledgementsByKey: Readonly<Record<string, DirectedAcknowledgementV1>>;
  playingOffline: boolean;
  endedReason: DirectedEndedReasonV1;
  failureCopyKey: string | null;
  completionEligible: boolean;
}>;

export type DirectedSteeringCommandV1 = Readonly<{
  type: "steer";
  sessionId: string;
  generation: number;
  operationId: number;
  expectedPathRevision: number;
  idempotencyKey: string;
  axis: DirectedSteeringAxisV1;
  level: 0 | 1 | 2;
}>;
export type DirectedTextureCommandV1 = Readonly<{
  type: "different-texture";
  sessionId: string;
  generation: number;
  operationId: number;
  expectedPathRevision: number;
  idempotencyKey: string;
  fromAssetId: string;
  toAssetId: string;
}>;
export type DirectedReferenceCommandV1 = DirectedSteeringCommandV1 | DirectedTextureCommandV1;

export type SavedDirectedPathV1 = Readonly<{
  contractVersion: 1;
  pathId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  sceneId: DirectedSceneIdV1;
  sceneVersion: 1;
  scoreHash: string;
  title: string;
  trajectory: string;
  durationMs: number;
  outputProfile: DirectedOutputProfileV1;
  hardAvoidanceIds: readonly string[];
  appliedSteering: DirectedAppliedSteeringV1;
  steeringOperations: readonly DirectedPathHistoryEntryV1[];
  manualTrims: DirectedSessionStateV1["manualTrims"];
  fallbackHistory: readonly string[];
  assetManifestVersion: 1;
  summarySnapshot: string;
}>;

const ORIGINAL_AXES: DirectedAxisLevelsV1 = Object.freeze({ softer: 0, sparser: 0, closer: 0, steadier: 0 });
export const ORIGINAL_DIRECTED_STEERING_V1: DirectedAppliedSteeringV1 = Object.freeze({
  ...ORIGINAL_AXES,
  textureReplacements: Object.freeze({}),
});

const acknowledgement = (
  status: DirectedAcknowledgementStatusV1,
  operationId: number,
  idempotencyKey: string,
  pathRevision: number,
  code: string | null = null,
  message: string | null = null,
  safeCheckpointWithinMs = 0,
): DirectedAcknowledgementV1 => Object.freeze({ status, operationId, idempotencyKey, pathRevision, code, message, safeCheckpointWithinMs });

const withAck = (state: DirectedSessionStateV1, ack: DirectedAcknowledgementV1): DirectedSessionStateV1 => Object.freeze({
  ...state,
  lastAcknowledgement: ack,
  acknowledgementsByKey: Object.freeze({ ...state.acknowledgementsByKey, [ack.idempotencyKey]: ack }),
});

export function createInitialDirectedSessionStateV1(input: Readonly<{
  sessionId: string;
  generation: number;
  score: DirectedSceneScoreV1;
  outputProfile: DirectedOutputProfileV1;
  hardAvoidanceIds: readonly string[];
}>): DirectedSessionStateV1 {
  const firstPhase = input.score.phases[0];
  return Object.freeze({
    contractVersion: 1,
    sessionId: input.sessionId,
    generation: input.generation,
    scoreHash: input.score.scoreHash,
    sceneId: input.score.sceneId,
    sceneVersion: 1,
    title: input.score.title,
    trajectory: input.score.trajectory,
    durationMs: input.score.durationMs,
    transport: "preparing",
    playedElapsedMs: 0,
    observedAtMonotonicMs: 0,
    phaseId: firstPhase.phaseId,
    phaseLabel: firstPhase.label,
    nextPhaseLabel: input.score.phases[1]?.label ?? null,
    phaseIndex: 0,
    phaseRevision: 1,
    outputProfile: input.outputProfile,
    hardAvoidanceIds: Object.freeze([...input.hardAvoidanceIds]),
    appliedSteering: ORIGINAL_DIRECTED_STEERING_V1,
    pendingSteering: null,
    manualTrims: Object.freeze({}),
    pathHistory: Object.freeze([]),
    pathRevision: 0,
    lastAcceptedOperationId: 0,
    lastAcknowledgement: null,
    acknowledgementsByKey: Object.freeze({}),
    playingOffline: false,
    endedReason: null,
    failureCopyKey: null,
    completionEligible: false,
  });
}

export function createReferenceDirectedAuthorityV1(input: Readonly<{
  sessionId: string;
  generation: number;
  scoreHash: string;
  phaseIndex: number;
  phaseRevision: number;
}>): DirectedSessionStateV1 {
  return Object.freeze({
    contractVersion: 1,
    sessionId: input.sessionId,
    generation: input.generation,
    scoreHash: input.scoreHash,
    sceneId: "porcelain-table-v1",
    sceneVersion: 1,
    title: "Porcelain Table",
    trajectory: "Shells to Wood",
    durationMs: 900_000,
    transport: "playing",
    playedElapsedMs: 0,
    observedAtMonotonicMs: 0,
    phaseId: `phase-${input.phaseIndex}`,
    phaseLabel: `Phase ${input.phaseIndex + 1}`,
    nextPhaseLabel: `Phase ${input.phaseIndex + 2}`,
    phaseIndex: input.phaseIndex,
    phaseRevision: input.phaseRevision,
    outputProfile: "headphones",
    hardAvoidanceIds: Object.freeze([]),
    appliedSteering: ORIGINAL_DIRECTED_STEERING_V1,
    pendingSteering: null,
    manualTrims: Object.freeze({}),
    pathHistory: Object.freeze([]),
    pathRevision: 0,
    lastAcceptedOperationId: 0,
    lastAcknowledgement: null,
    acknowledgementsByKey: Object.freeze({}),
    playingOffline: false,
    endedReason: null,
    failureCopyKey: null,
    completionEligible: false,
  });
}

export function nextSteeringLevelV1(_axis: DirectedSteeringAxisV1, current: number): 0 | 1 | 2 {
  return current === 0 ? 1 : current === 1 ? 2 : 0;
}

export function createSteeringCommandV1(
  state: DirectedSessionStateV1,
  axis: DirectedSteeringAxisV1,
  level: 0 | 1 | 2,
  idempotencyKey: string,
): DirectedSteeringCommandV1 {
  return Object.freeze({
    type: "steer",
    sessionId: state.sessionId,
    generation: state.generation,
    operationId: state.lastAcceptedOperationId + 1,
    expectedPathRevision: state.pathRevision,
    idempotencyKey,
    axis,
    level,
  });
}

export function createTextureCommandV1(
  state: DirectedSessionStateV1,
  fromAssetId: string,
  toAssetId: string,
  idempotencyKey: string,
): DirectedTextureCommandV1 {
  return Object.freeze({
    type: "different-texture",
    sessionId: state.sessionId,
    generation: state.generation,
    operationId: state.lastAcceptedOperationId + 1,
    expectedPathRevision: state.pathRevision,
    idempotencyKey,
    fromAssetId,
    toAssetId,
  });
}

export function applyReferenceDirectedCommandV1(
  state: DirectedSessionStateV1,
  command: DirectedReferenceCommandV1,
): Readonly<{ state: DirectedSessionStateV1; ack: DirectedAcknowledgementV1 }> {
  const existing = state.acknowledgementsByKey[command.idempotencyKey];
  if (existing) {
    const duplicate = acknowledgement("duplicate", command.operationId, command.idempotencyKey, state.pathRevision, "DUPLICATE", null);
    return Object.freeze({ state: Object.freeze({ ...state, lastAcknowledgement: duplicate }), ack: duplicate });
  }
  if (command.sessionId !== state.sessionId || command.generation !== state.generation) {
    const rejected = acknowledgement("rejected", command.operationId, command.idempotencyKey, state.pathRevision, "SESSION_MISMATCH", "That change belonged to an earlier session and was ignored.");
    return Object.freeze({ state: withAck(state, rejected), ack: rejected });
  }
  if (command.operationId <= state.lastAcceptedOperationId) {
    const stale = acknowledgement("stale", command.operationId, command.idempotencyKey, state.pathRevision, "STALE", null);
    return Object.freeze({ state: withAck(state, stale), ack: stale });
  }
  if (command.expectedPathRevision !== state.pathRevision) {
    const stalePath = acknowledgement("rejected", command.operationId, command.idempotencyKey, state.pathRevision, "STALE_PATH", "The current path changed before that command arrived.");
    return Object.freeze({ state: withAck(state, stalePath), ack: stalePath });
  }
  const pending: DirectedPendingSteeringV1 = Object.freeze({
    axis: command.type === "steer" ? command.axis : "different-texture",
    level: command.type === "steer" ? command.level : null,
    fromAssetId: command.type === "different-texture" ? command.fromAssetId : null,
    toAssetId: command.type === "different-texture" ? command.toAssetId : null,
    targetPhaseRevision: state.phaseRevision + 1,
    operationId: command.operationId,
    expectedPathRevision: command.expectedPathRevision,
    idempotencyKey: command.idempotencyKey,
  });
  const accepted = acknowledgement("accepted", command.operationId, command.idempotencyKey, state.pathRevision);
  const next = withAck(Object.freeze({ ...state, pendingSteering: pending, lastAcceptedOperationId: command.operationId }), accepted);
  return Object.freeze({ state: next, ack: accepted });
}

export function cancelReferencePendingSteeringV1(
  state: DirectedSessionStateV1,
  command: Readonly<{ operationId: number; expectedPathRevision: number; idempotencyKey: string }>,
): Readonly<{ state: DirectedSessionStateV1; ack: DirectedAcknowledgementV1 }> {
  if (!state.pendingSteering || command.operationId <= state.lastAcceptedOperationId || command.expectedPathRevision !== state.pathRevision) {
    const rejected = acknowledgement("rejected", command.operationId, command.idempotencyKey, state.pathRevision, "STALE_PATH", "There is no current pending change to cancel.");
    return Object.freeze({ state: withAck(state, rejected), ack: rejected });
  }
  const accepted = acknowledgement("accepted", command.operationId, command.idempotencyKey, state.pathRevision, null, "Pending steering cancelled.");
  const next = withAck(Object.freeze({ ...state, pendingSteering: null, lastAcceptedOperationId: command.operationId }), accepted);
  return Object.freeze({ state: next, ack: accepted });
}

export function advanceReferenceDirectedPhaseV1(state: DirectedSessionStateV1, nextPhaseIndex: number): DirectedSessionStateV1 {
  const pending = state.pendingSteering;
  const base = Object.freeze({
    ...state,
    phaseIndex: nextPhaseIndex,
    phaseId: `phase-${nextPhaseIndex}`,
    phaseLabel: `Phase ${nextPhaseIndex + 1}`,
    nextPhaseLabel: `Phase ${nextPhaseIndex + 2}`,
    phaseRevision: state.phaseRevision + 1,
  });
  if (!pending || pending.targetPhaseRevision > base.phaseRevision) return base;
  let appliedSteering = state.appliedSteering;
  let before: number | string | null;
  let after: number | string | null;
  if (pending.axis === "different-texture") {
    before = pending.fromAssetId;
    after = pending.toAssetId;
    appliedSteering = Object.freeze({
      ...state.appliedSteering,
      textureReplacements: Object.freeze({
        ...state.appliedSteering.textureReplacements,
        [pending.fromAssetId ?? ""]: pending.toAssetId ?? "",
      }),
    });
  } else {
    before = state.appliedSteering[pending.axis];
    after = pending.level ?? 0;
    appliedSteering = Object.freeze({ ...state.appliedSteering, [pending.axis]: pending.level ?? 0 });
  }
  const pathRevision = state.pathRevision + 1;
  const appliedAck = acknowledgement("applied", pending.operationId, pending.idempotencyKey, pathRevision);
  return withAck(Object.freeze({
    ...base,
    pendingSteering: null,
    appliedSteering,
    pathRevision,
    pathHistory: Object.freeze([...state.pathHistory, Object.freeze({ axis: pending.axis, before, after, operationId: pending.operationId, appliedAtPhaseRevision: base.phaseRevision })]),
  }), appliedAck);
}

export function undoReferenceDirectedPathV1(
  state: DirectedSessionStateV1,
  command: Readonly<{ operationId: number; expectedPathRevision: number; idempotencyKey: string }>,
): Readonly<{ state: DirectedSessionStateV1; ack: DirectedAcknowledgementV1 }> {
  if (command.operationId <= state.lastAcceptedOperationId || command.expectedPathRevision !== state.pathRevision) {
    const rejected = acknowledgement("rejected", command.operationId, command.idempotencyKey, state.pathRevision, "STALE_PATH", "Couldn’t restore the previous path. The current authoritative state is still active.");
    return Object.freeze({ state: withAck(state, rejected), ack: rejected });
  }
  if (state.pendingSteering) {
    const accepted = acknowledgement("accepted", command.operationId, command.idempotencyKey, state.pathRevision, null, "Previous path restored.", 0);
    return Object.freeze({ state: withAck(Object.freeze({ ...state, pendingSteering: null, lastAcceptedOperationId: command.operationId }), accepted), ack: accepted });
  }
  const last = state.pathHistory[state.pathHistory.length - 1];
  if (!last) {
    const rejected = acknowledgement("rejected", command.operationId, command.idempotencyKey, state.pathRevision, "NOTHING_TO_UNDO", "There is no steering change to restore.");
    return Object.freeze({ state: withAck(state, rejected), ack: rejected });
  }
  let appliedSteering = state.appliedSteering;
  if (last.axis === "different-texture") {
    const replacements = { ...state.appliedSteering.textureReplacements };
    if (typeof last.before === "string" && typeof last.after === "string") delete replacements[last.before];
    appliedSteering = Object.freeze({ ...state.appliedSteering, textureReplacements: Object.freeze(replacements) });
  } else {
    appliedSteering = Object.freeze({ ...state.appliedSteering, [last.axis]: Number(last.before) as 0 | 1 | 2 });
  }
  const pathRevision = state.pathRevision + 1;
  const accepted = acknowledgement("accepted", command.operationId, command.idempotencyKey, pathRevision, null, "Previous path restored.", last.axis === "different-texture" ? 0 : 10_000);
  const next = withAck(Object.freeze({
    ...state,
    appliedSteering,
    pathHistory: Object.freeze(state.pathHistory.slice(0, -1)),
    pathRevision,
    lastAcceptedOperationId: command.operationId,
  }), accepted);
  return Object.freeze({ state: next, ack: accepted });
}

export function projectDirectedEndStateV1(state: DirectedSessionStateV1, reason: Exclude<DirectedEndedReasonV1, null>): DirectedSessionStateV1 {
  if (reason === "natural-completion" && state.playedElapsedMs >= state.durationMs) {
    return Object.freeze({ ...state, transport: "completed", playedElapsedMs: state.durationMs, endedReason: reason, failureCopyKey: null, completionEligible: true, pendingSteering: null });
  }
  if (reason === "user-ended") {
    return Object.freeze({ ...state, transport: "stopped", endedReason: reason, failureCopyKey: null, completionEligible: false, pendingSteering: null });
  }
  const failureCopyKey = reason === "required-asset-failed" ? "required-asset-failed" : reason === "scheduler-failed" ? "scheduler-failed" : "process-ended";
  return Object.freeze({ ...state, transport: "failed", endedReason: reason, failureCopyKey, completionEligible: false, pendingSteering: null });
}

export function summarizeDirectedPathV1(input: Pick<DirectedSessionStateV1, "title" | "appliedSteering" | "hardAvoidanceIds">): string {
  const parts: string[] = [input.title];
  if (input.appliedSteering.softer) parts.push(input.appliedSteering.softer === 2 ? "Much softer" : "Softer");
  if (input.appliedSteering.sparser) parts.push(input.appliedSteering.sparser === 2 ? "Much sparser" : "Sparser");
  if (input.appliedSteering.closer) parts.push(input.appliedSteering.closer === 2 ? "Foreground much closer" : "Foreground closer");
  if (input.appliedSteering.steadier) parts.push(input.appliedSteering.steadier === 2 ? "Even cadence" : "Steadier");
  for (const [from, to] of Object.entries(input.appliedSteering.textureReplacements)) parts.push(`${from} changed to ${to}`);
  for (const avoidance of input.hardAvoidanceIds) parts.push(avoidance.replaceAll("-", " "));
  return parts.join(" · ");
}

export function createSavedDirectedPathV1(
  state: DirectedSessionStateV1,
  options: Readonly<{ name: string; now: string }>,
): SavedDirectedPathV1 {
  if (!state.completionEligible || state.endedReason !== "natural-completion") throw new Error("Only a naturally completed path can be saved.");
  const safeStamp = options.now.replace(/[^0-9]/g, "");
  return Object.freeze({
    contractVersion: 1,
    pathId: `directed:${state.sceneId}:${safeStamp}`,
    name: options.name.trim() || state.title,
    createdAt: options.now,
    updatedAt: options.now,
    sceneId: state.sceneId,
    sceneVersion: 1,
    scoreHash: state.scoreHash,
    title: state.title,
    trajectory: state.trajectory,
    durationMs: state.durationMs,
    outputProfile: state.outputProfile,
    hardAvoidanceIds: Object.freeze([...state.hardAvoidanceIds]),
    appliedSteering: Object.freeze({ ...state.appliedSteering, textureReplacements: Object.freeze({ ...state.appliedSteering.textureReplacements }) }),
    steeringOperations: Object.freeze([...state.pathHistory]),
    manualTrims: Object.freeze({ ...state.manualTrims }),
    fallbackHistory: Object.freeze([]),
    assetManifestVersion: 1,
    summarySnapshot: summarizeDirectedPathV1(state),
  });
}

export function serializeSavedDirectedPathsV1(paths: readonly SavedDirectedPathV1[]): string {
  return JSON.stringify(paths);
}

const isStringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every((entry) => typeof entry === "string");
const isAppliedSteering = (value: unknown): value is DirectedAppliedSteeringV1 => {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return ["softer", "sparser", "closer", "steadier"].every((key) => Number.isInteger(row[key]) && Number(row[key]) >= 0 && Number(row[key]) <= 2)
    && Boolean(row.textureReplacements) && typeof row.textureReplacements === "object";
};

export function parseSavedDirectedPathsV1(raw: string | null): SavedDirectedPathV1[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((candidate): candidate is SavedDirectedPathV1 => {
      if (!candidate || typeof candidate !== "object") return false;
      const row = candidate as Record<string, unknown>;
      return row.contractVersion === 1
        && typeof row.pathId === "string"
        && typeof row.name === "string"
        && typeof row.sceneId === "string"
        && typeof row.scoreHash === "string"
        && /^[a-f0-9]{64}$/.test(row.scoreHash)
        && typeof row.title === "string"
        && typeof row.durationMs === "number"
        && isStringArray(row.hardAvoidanceIds)
        && isAppliedSteering(row.appliedSteering)
        && Array.isArray(row.steeringOperations);
    }).map((candidate) => Object.freeze(candidate));
  } catch {
    return [];
  }
}

export function createReplayDefinitionV1(path: SavedDirectedPathV1, mode: "path" | "original") {
  return Object.freeze({
    sceneId: path.sceneId,
    sceneVersion: path.sceneVersion,
    scoreHash: path.scoreHash,
    outputProfile: path.outputProfile,
    hardAvoidanceIds: Object.freeze([...path.hardAvoidanceIds]),
    appliedSteering: mode === "path" ? path.appliedSteering : ORIGINAL_DIRECTED_STEERING_V1,
    manualTrims: mode === "path" ? path.manualTrims : Object.freeze({}),
  });
}

export function serializeDirectedCheckpointV1(state: DirectedSessionStateV1): string {
  return JSON.stringify(state);
}

export function parseDirectedCheckpointV1(raw: string | null): DirectedSessionStateV1 | null {
  if (!raw) return null;
  try {
    const candidate: unknown = JSON.parse(raw);
    if (!candidate || typeof candidate !== "object") return null;
    const row = candidate as Record<string, unknown>;
    if (row.contractVersion !== 1 || typeof row.sessionId !== "string" || typeof row.scoreHash !== "string" || !/^[a-f0-9]{64}$/.test(row.scoreHash)) return null;
    if (typeof row.generation !== "number" || typeof row.pathRevision !== "number" || !isAppliedSteering(row.appliedSteering) || !isStringArray(row.hardAvoidanceIds)) return null;
    return Object.freeze(candidate as DirectedSessionStateV1);
  } catch {
    return null;
  }
}
