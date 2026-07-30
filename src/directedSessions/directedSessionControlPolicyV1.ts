export type DirectedControlActionV1 = "pause" | "resume" | "restart-current-phase" | "end";

export type DirectedControlOwnerV1 = Readonly<{
  sessionId: string;
  generationId: number;
}>;

export type DirectedAggregateOwnerV1 = Readonly<{
  sessionType: string | null;
  sessionId: string | null;
  generationId: number | null;
}>;

export type DirectedSessionControlPlanV1 = Readonly<{
  kind:
    | "dispatch-current"
    | "recover-current"
    | "recover-current-paused"
    | "retire-missing"
    | "retry-query"
    | "reject-stale";
}>;

const sameOwner = (left: DirectedControlOwnerV1, right: DirectedControlOwnerV1 | null): boolean => Boolean(
  right
  && left.sessionId === right.sessionId
  && left.generationId === right.generationId,
);

/**
 * Plans a control from identities, not elapsed wall-clock time. A still-current owner remains
 * controllable no matter how long the foreground UI was idle. A missing native owner can be
 * recovered only when the aggregate authority proves that no directed generation replaced it.
 */
export function planDirectedSessionControlV1(input: Readonly<{
  renderedOwner: DirectedControlOwnerV1;
  nativeOwner: DirectedControlOwnerV1 | null;
  aggregateOwner: DirectedAggregateOwnerV1;
  action: DirectedControlActionV1;
}>): DirectedSessionControlPlanV1 {
  if (sameOwner(input.renderedOwner, input.nativeOwner)) {
    if (
      input.aggregateOwner.sessionType === "directed"
      && input.aggregateOwner.sessionId === input.renderedOwner.sessionId
      && input.aggregateOwner.generationId === input.renderedOwner.generationId
    ) return Object.freeze({ kind: "dispatch-current" });
    return Object.freeze({ kind: "retry-query" });
  }
  if (input.nativeOwner) return Object.freeze({ kind: "reject-stale" });
  if (input.aggregateOwner.sessionType === "directed") {
    if (
      input.aggregateOwner.sessionId === input.renderedOwner.sessionId
      && input.aggregateOwner.generationId === input.renderedOwner.generationId
    ) return Object.freeze({ kind: "retry-query" });
    return Object.freeze({ kind: "reject-stale" });
  }
  if (input.aggregateOwner.sessionType !== null) return Object.freeze({ kind: "reject-stale" });
  if (input.action === "end") return Object.freeze({ kind: "retire-missing" });
  if (input.action === "restart-current-phase") return Object.freeze({ kind: "reject-stale" });
  if (input.action === "pause") return Object.freeze({ kind: "recover-current-paused" });
  return Object.freeze({ kind: "recover-current" });
}