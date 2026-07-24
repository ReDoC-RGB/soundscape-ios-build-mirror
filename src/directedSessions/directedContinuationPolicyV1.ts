export type DirectedRecoverableCheckpointV1 = Readonly<{
  sessionId: string;
  generation: number;
  transport: string;
  endedReason: string | null;
  completionEligible: boolean;
}>;

export type DirectedTerminalProjectionV1 = Readonly<{
  sessionId: string;
  generationId: number;
  operationId: number;
  transport: string;
  endedReason?: string | null;
}>;

export type DirectedTerminalEndFenceV1 = Readonly<{
  sessionId: string;
  generationId: number;
  terminalOperationId: number;
}>;

export class DirectedCheckpointProjectionEpochV1 {
  private epoch = 0;

  capture(): number {
    return this.epoch;
  }

  supersede(): number {
    this.epoch += 1;
    return this.epoch;
  }

  isCurrent(capturedEpoch: number): boolean {
    return capturedEpoch === this.epoch;
  }
}

const RECOVERABLE_TRANSPORTS_V1 = Object.freeze(new Set(["preparing", "playing", "paused", "interrupted"]));

export function isRecoverableDirectedCheckpointV1(checkpoint: DirectedRecoverableCheckpointV1 | null): boolean {
  return Boolean(
    checkpoint
    && checkpoint.endedReason === null
    && checkpoint.completionEligible === false
    && RECOVERABLE_TRANSPORTS_V1.has(checkpoint.transport),
  );
}

export function createDirectedTerminalEndFenceV1(
  state: DirectedTerminalProjectionV1,
): DirectedTerminalEndFenceV1 {
  if (state.transport !== "stopped" || state.endedReason !== "user-ended") {
    throw new Error("A terminal End fence requires an accepted user-ended stopped projection.");
  }
  return Object.freeze({
    sessionId: state.sessionId,
    generationId: state.generationId,
    terminalOperationId: state.operationId,
  });
}

export function isDirectedProjectionFencedByTerminalEndV1(
  fence: DirectedTerminalEndFenceV1 | null,
  incoming: DirectedTerminalProjectionV1,
): boolean {
  return Boolean(
    fence
    && incoming.sessionId === fence.sessionId
    && incoming.generationId === fence.generationId,
  );
}
