export type DirectedCurrentnessExpectationV1 = Readonly<{
  sessionId: string;
  generationId: number;
  operationId: number;
  idempotencyKey: string;
  expectedTransports?: readonly string[];
}>;

type DirectedCurrentnessProjectionV1 = Readonly<{
  sessionId?: unknown;
  generationId?: unknown;
  operationId?: unknown;
  transport?: unknown;
  lastAcceptedOperationId?: unknown;
  endedReason?: unknown;
  failureCopyKey?: unknown;
  lastAcknowledgement?: Readonly<{
    status?: unknown;
    operationId?: unknown;
    idempotencyKey?: unknown;
  }> | null;
}> | null | undefined;

export type DirectedNativeCurrentnessCodeV1 =
  | "DIRECTED_NATIVE_STATE_MISSING"
  | "DIRECTED_NATIVE_OWNER_MISMATCH"
  | "DIRECTED_NATIVE_REQUIRED_ASSET_FAILED"
  | "DIRECTED_NATIVE_SCHEDULER_FAILED"
  | "DIRECTED_NATIVE_OPERATION_MISMATCH"
  | "DIRECTED_NATIVE_ACKNOWLEDGEMENT_MISMATCH"
  | "DIRECTED_NATIVE_TRANSPORT_MISMATCH"
  | "DIRECTED_NATIVE_CURRENTNESS_MISMATCH";

/**
 * Stable internal reason map for a consumer-facing generic Directed rejection.
 * This preserves fail-closed authority: it only identifies why the already-required
 * acknowledgement/currentness predicate rejected the native projection.
 */
export const directedNativeCurrentnessCodeV1 = (
  current: DirectedCurrentnessProjectionV1,
  expected: DirectedCurrentnessExpectationV1,
): DirectedNativeCurrentnessCodeV1 => {
  if (!current) return "DIRECTED_NATIVE_STATE_MISSING";
  if (current.sessionId !== expected.sessionId || current.generationId !== expected.generationId) {
    return "DIRECTED_NATIVE_OWNER_MISMATCH";
  }
  if (current.failureCopyKey === "required-asset-failed") {
    return "DIRECTED_NATIVE_REQUIRED_ASSET_FAILED";
  }
  if (current.transport === "failed" || current.endedReason === "scheduler-failed") {
    return "DIRECTED_NATIVE_SCHEDULER_FAILED";
  }
  if (current.operationId !== expected.operationId || current.lastAcceptedOperationId !== expected.operationId) {
    return "DIRECTED_NATIVE_OPERATION_MISMATCH";
  }
  const acknowledgement = current.lastAcknowledgement;
  if (
    acknowledgement?.status !== "accepted"
    || acknowledgement.operationId !== expected.operationId
    || acknowledgement.idempotencyKey !== expected.idempotencyKey
  ) {
    return "DIRECTED_NATIVE_ACKNOWLEDGEMENT_MISMATCH";
  }
  if (expected.expectedTransports && !expected.expectedTransports.includes(String(current.transport))) {
    return "DIRECTED_NATIVE_TRANSPORT_MISMATCH";
  }
  return "DIRECTED_NATIVE_CURRENTNESS_MISMATCH";
};
