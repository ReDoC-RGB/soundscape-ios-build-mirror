export type DirectedLifecycleTransportV1 =
  | "preparing"
  | "playing"
  | "paused"
  | "interrupted"
  | "completing"
  | "completed"
  | "failed"
  | "stopped";

export type DirectedLifecycleAuthorityV1 = "native-owner" | "checkpoint-only";
export type DirectedResumePolicyV1 = "platform-authorized" | "manual-only";

export type DirectedLifecycleStateV1 = Readonly<{
  authority: DirectedLifecycleAuthorityV1;
  sessionId: string;
  generationId: number;
  operationId: number;
  phaseIndex: number;
  phaseRevision: number;
  pathRevision: number;
  playedElapsedMs: number;
  phaseStartMs: number;
  transport: DirectedLifecycleTransportV1;
  completionEligible: boolean;
  endedReason: string | null;
  resumeRequiresUserAction?: boolean;
  resumePolicy?: DirectedResumePolicyV1;
}>;

export type DirectedTransportControlsV1 = Readonly<{
  primary: "pause" | "resume";
  primaryLabel: "Pause" | "Resume";
  primaryEnabled: boolean;
  restartLabel: "Restart current phase";
  restartEnabled: boolean;
  endLabel: "End session";
  endEnabled: boolean;
}>;

const INTERACTIVE_TRANSPORTS_V1 = new Set<DirectedLifecycleTransportV1>(["playing", "paused", "interrupted"]);

/** Projects labels and availability from authoritative transport truth only. */
export function projectDirectedTransportControlsV1(
  state: Pick<DirectedLifecycleStateV1, "transport">,
  reconciling: boolean,
): DirectedTransportControlsV1 {
  const interactive = INTERACTIVE_TRANSPORTS_V1.has(state.transport);
  const enabled = interactive && !reconciling;
  const playing = state.transport === "playing";
  return Object.freeze({
    primary: playing ? "pause" : "resume",
    primaryLabel: playing ? "Pause" : "Resume",
    primaryEnabled: enabled,
    restartLabel: "Restart current phase",
    restartEnabled: enabled,
    endLabel: "End session",
    endEnabled: enabled,
  });
}

export type DirectedRestartFenceV1 = Readonly<{
  expectedSessionId: string;
  expectedGenerationId: number;
  expectedOperationId: number;
  expectedPhaseRevision: number;
  expectedPathRevision: number;
}>;

export type DirectedRestartPlanV1 = Readonly<{
  kind: "dispatch-current" | "reject-stale" | "reject-terminal";
  nextOperationId?: number;
  restartElapsedMs?: number;
  preserveTransport?: "playing" | "paused" | "interrupted";
  preserveSessionId?: string;
  preserveGenerationId?: number;
  preservePathRevision?: number;
}>;

export function createDirectedRestartRequestIdV1(
  sessionId: string,
  generationId: number,
  operationId: number,
): string {
  const random = Math.random().toString(36).slice(2);
  return `${sessionId}:restart:${generationId}:${operationId}:${Date.now().toString(36)}:${random}`;
}

type RestartCandidateV1 = Readonly<{
  sessionId: string; generationId: number; operationId: number; lastAcceptedOperationId: number;
  phaseIndex: number; phaseId: string; phaseRevision: number; pathRevision: number; transport: string;
  transportGeneration: number; completionEligible: boolean; endedReason: string | null; failureCopyKey?: string | null;
  lastAcknowledgement: Readonly<{ status: string; operationId: number; idempotencyKey: string; pathRevision?: number }> | null;
  restartCommit: Readonly<{ restartRequestId: string; sessionId: string; generationId: number; operationId: number;
    phaseIndex: number; phaseId: string; predecessorPhaseRevision: number; successorPhaseRevision: number;
    pathRevision: number; transportGeneration: number }> | null;
}>;

const safeInteger = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
const exactKeys = (value: object, expected: readonly string[]): boolean => {
  const actual = Object.keys(value).sort();
  return actual.length === expected.length && actual.every((key, index) => key === [...expected].sort()[index]);
};

export function isDirectedRestartCommitCandidateV1(
  candidate: RestartCandidateV1 | null,
  predecessor: RestartCandidateV1,
  command: Readonly<{ sessionId: string; generationId: number; operationId: number; idempotencyKey: string;
    restartRequestId?: string; expectedPhaseId?: string; expectedTransportGeneration?: number }>,
): candidate is RestartCandidateV1 {
  if (!candidate || !candidate.restartCommit || !candidate.lastAcknowledgement) return false;
  const commit = candidate.restartCommit;
  const acknowledgement = candidate.lastAcknowledgement;
  const integerValues = [candidate.generationId, candidate.operationId, candidate.lastAcceptedOperationId,
    candidate.phaseIndex, candidate.phaseRevision, candidate.pathRevision, candidate.transportGeneration,
    commit.generationId, commit.operationId, commit.phaseIndex, commit.predecessorPhaseRevision,
    commit.successorPhaseRevision, commit.pathRevision, commit.transportGeneration];
  return typeof command.restartRequestId === "string" && command.restartRequestId.length > 0 && command.restartRequestId.length <= 240
    && typeof command.expectedPhaseId === "string" && command.expectedPhaseId.length > 0
    && safeInteger(command.expectedTransportGeneration) && integerValues.every(safeInteger)
    && exactKeys(commit, ["restartRequestId", "sessionId", "generationId", "operationId", "phaseIndex", "phaseId",
      "predecessorPhaseRevision", "successorPhaseRevision", "pathRevision", "transportGeneration"])
    && candidate.sessionId === predecessor.sessionId && candidate.sessionId === command.sessionId
    && candidate.generationId === predecessor.generationId && candidate.generationId === command.generationId
    && candidate.operationId === command.operationId && candidate.lastAcceptedOperationId === command.operationId
    && candidate.phaseIndex === predecessor.phaseIndex && candidate.phaseId === predecessor.phaseId
    && candidate.phaseId === command.expectedPhaseId
    && candidate.phaseRevision === predecessor.phaseRevision + 1 && candidate.pathRevision === predecessor.pathRevision
    && candidate.transport === predecessor.transport && candidate.transportGeneration === command.expectedTransportGeneration + 1
    && candidate.completionEligible === false && candidate.endedReason === null && candidate.failureCopyKey == null
    && acknowledgement.status === "accepted" && acknowledgement.operationId === command.operationId
    && acknowledgement.idempotencyKey === command.idempotencyKey && acknowledgement.pathRevision === candidate.pathRevision
    && commit.restartRequestId === command.restartRequestId && commit.sessionId === command.sessionId
    && commit.generationId === command.generationId && commit.operationId === command.operationId
    && commit.phaseIndex === predecessor.phaseIndex && commit.phaseId === predecessor.phaseId
    && commit.predecessorPhaseRevision === predecessor.phaseRevision
    && commit.successorPhaseRevision === candidate.phaseRevision && commit.pathRevision === predecessor.pathRevision
    && commit.transportGeneration === candidate.transportGeneration;
}

/**
 * A restart is an in-owner, phase-local transport mutation. It never allocates a generation,
 * reconstructs an absent player, changes authored path state, or silently resumes paused audio.
 */
export function planDirectedRestartCurrentPhaseV1(
  state: DirectedLifecycleStateV1,
  fence: DirectedRestartFenceV1,
): DirectedRestartPlanV1 {
  if (!INTERACTIVE_TRANSPORTS_V1.has(state.transport)) return Object.freeze({ kind: "reject-terminal" });
  if (
    state.authority !== "native-owner"
    || state.sessionId !== fence.expectedSessionId
    || state.generationId !== fence.expectedGenerationId
    || state.operationId !== fence.expectedOperationId
    || state.phaseRevision !== fence.expectedPhaseRevision
    || state.pathRevision !== fence.expectedPathRevision
  ) return Object.freeze({ kind: "reject-stale" });
  return Object.freeze({
    kind: "dispatch-current",
    nextOperationId: state.operationId + 1,
    restartElapsedMs: state.phaseStartMs,
    preserveTransport: state.transport as "playing" | "paused" | "interrupted",
    preserveSessionId: state.sessionId,
    preserveGenerationId: state.generationId,
    preservePathRevision: state.pathRevision,
  });
}

export type DirectedLifecycleEventV1 =
  | Readonly<{ type: "backgrounded" | "foregrounded" | "device-locked" | "device-unlocked" | "process-terminated" | "cold-relaunch" | "manual-end" | "natural-completion" }>
  | Readonly<{ type: "platform-interruption-began"; kind: "call" | "alarm" | "focus-loss" | "headphones-disconnected" | "bluetooth-disconnected" | "route-changed" }>
  | Readonly<{ type: "platform-interruption-ended"; platformExplicitlyAllowsResume: boolean }>;

const manualResumeInterruptionKindsV1 = new Set([
  "headphones-disconnected",
  "bluetooth-disconnected",
  "route-changed",
]);

/**
 * Conservative cross-platform lifecycle reducer. App visibility and lock do not own playback.
 * Process death demotes native truth to checkpoint-only paused truth; no event creates a session.
 */
export function reduceDirectedLifecycleV1(
  current: DirectedLifecycleStateV1 | null,
  event: DirectedLifecycleEventV1,
): DirectedLifecycleStateV1 | null {
  if (!current) return null;
  if (["backgrounded", "foregrounded", "device-locked", "device-unlocked"].includes(event.type)) return current;
  if (event.type === "process-terminated" || event.type === "cold-relaunch") {
    return Object.freeze({
      ...current,
      authority: "checkpoint-only",
      transport: "paused",
      resumeRequiresUserAction: true,
      resumePolicy: "manual-only",
      completionEligible: false,
      endedReason: null,
    });
  }
  if (event.type === "platform-interruption-began") {
    if (current.transport !== "playing") return current;
    const manualOnly = manualResumeInterruptionKindsV1.has(event.kind);
    return Object.freeze({
      ...current,
      transport: "interrupted",
      resumeRequiresUserAction: manualOnly,
      resumePolicy: manualOnly ? "manual-only" : "platform-authorized",
      completionEligible: false,
      endedReason: null,
    });
  }
  if (event.type === "platform-interruption-ended") {
    if (
      current.authority === "native-owner"
      && current.transport === "interrupted"
      && current.resumePolicy !== "manual-only"
      && event.platformExplicitlyAllowsResume
    ) {
      return Object.freeze({
        ...current,
        transport: "playing",
        resumeRequiresUserAction: false,
        resumePolicy: "platform-authorized",
      });
    }
    return current;
  }
  if (event.type === "manual-end") {
    return Object.freeze({
      ...current,
      transport: "stopped",
      completionEligible: false,
      endedReason: "user-ended",
      resumeRequiresUserAction: false,
      resumePolicy: "manual-only",
    });
  }
  if (event.type === "natural-completion") {
    return Object.freeze({
      ...current,
      transport: "completed",
      completionEligible: true,
      endedReason: "natural-completion",
      resumeRequiresUserAction: false,
      resumePolicy: "manual-only",
    });
  }
  return current;
}

/** Rejects stale lifecycle/transport completions without wall-clock ordering. */
export class DirectedTransportLifecycleEpochV1 {
  private lifecycleEpoch = 0;
  private transportEpoch = 0;

  captureLifecycle(): Readonly<{ lifecycleEpoch: number; transportEpoch: number }> {
    return Object.freeze({ lifecycleEpoch: this.lifecycleEpoch, transportEpoch: this.transportEpoch });
  }

  beginTransportAction(): Readonly<{ transportEpoch: number }> {
    this.transportEpoch += 1;
    this.lifecycleEpoch += 1;
    return Object.freeze({ transportEpoch: this.transportEpoch });
  }

  supersedeLifecycle(): number {
    this.lifecycleEpoch += 1;
    return this.lifecycleEpoch;
  }

  isLifecycleCurrent(token: Readonly<{ lifecycleEpoch: number; transportEpoch: number }>): boolean {
    return token.lifecycleEpoch === this.lifecycleEpoch && token.transportEpoch === this.transportEpoch;
  }

  isTransportCurrent(token: Readonly<{ transportEpoch: number }>): boolean {
    return token.transportEpoch === this.transportEpoch;
  }
}
