export const DIRECTED_FOREGROUND_PROJECTION_INTERVAL_MS = 1_000 as const;
export const DIRECTED_CHECKPOINT_PROGRESS_INTERVAL_MS = 15_000 as const;

export type DirectedProjectionAppStateV1 = "active" | "background" | "inactive" | "unknown" | "extension";

export type DirectedProjectionFenceV1 = Readonly<{
  sessionId: string;
  generationId: number;
  operationId: number;
  phaseRevision: number;
  pathRevision: number;
  observedAtMonotonicMs: number;
  transport: string;
  playedElapsedMs?: number;
}>;

export function allocateDirectedGenerationV1(candidates: readonly (number | null | undefined)[]): number {
  const maximum = candidates.reduce<number>((current, candidate) => {
    if (!Number.isFinite(candidate) || (candidate ?? 0) < 0) return current;
    return Math.max(current, Math.trunc(candidate ?? 0));
  }, 0);
  return maximum + 1;
}

export function shouldRunDirectedForegroundProjectionV1(
  appState: DirectedProjectionAppStateV1,
  state: Pick<DirectedProjectionFenceV1, "transport"> | null,
): boolean {
  return appState === "active" && state?.transport === "playing";
}

export function shouldAcceptDirectedProjectionV1(
  current: DirectedProjectionFenceV1 | null,
  incoming: DirectedProjectionFenceV1,
): boolean {
  if (!current) return true;
  if (incoming.generationId !== current.generationId) return incoming.generationId > current.generationId;
  if (incoming.sessionId !== current.sessionId) return false;
  if (incoming.operationId < current.operationId) return false;
  if (incoming.phaseRevision < current.phaseRevision || incoming.pathRevision < current.pathRevision) return false;
  if (incoming.observedAtMonotonicMs < current.observedAtMonotonicMs) return false;
  return incoming.operationId > current.operationId
    || incoming.phaseRevision > current.phaseRevision
    || incoming.pathRevision > current.pathRevision
    || incoming.observedAtMonotonicMs > current.observedAtMonotonicMs
    || incoming.transport !== current.transport;
}

export function shouldPersistDirectedProjectionV1(
  previous: DirectedProjectionFenceV1 | null,
  incoming: DirectedProjectionFenceV1,
): boolean {
  if (!previous) return true;
  if (incoming.sessionId !== previous.sessionId || incoming.generationId !== previous.generationId) return true;
  if (
    incoming.operationId !== previous.operationId
    || incoming.phaseRevision !== previous.phaseRevision
    || incoming.pathRevision !== previous.pathRevision
    || incoming.transport !== previous.transport
  ) return true;
  const priorBucket = Math.floor((previous.playedElapsedMs ?? 0) / DIRECTED_CHECKPOINT_PROGRESS_INTERVAL_MS);
  const incomingBucket = Math.floor((incoming.playedElapsedMs ?? 0) / DIRECTED_CHECKPOINT_PROGRESS_INTERVAL_MS);
  return priorBucket !== incomingBucket;
}
