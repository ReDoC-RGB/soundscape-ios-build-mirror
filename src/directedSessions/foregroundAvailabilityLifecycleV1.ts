import type { DirectedAvailabilityProjectionV1 } from "./eligibilityV1";
import type { DirectedAggregateOwnerV1, DirectedControlOwnerV1 } from "./directedSessionControlPolicyV1";

export type DirectedForegroundOwnerReconciliationPlanV1 = Readonly<{
  kind:
    | "accept-native"
    | "retain-current-retry"
    | "clear-directed"
    | "preserve-classic"
    | "none";
  projectedDirectedOwner: DirectedControlOwnerV1 | null;
  recovery: "native-current" | "checkpoint-only" | "none";
}>;

/**
 * Reconciles Directed projection identity without ever treating an absent/uncertain native query as
 * package authority. Aggregate Classic ownership wins, mismatched Directed queries stay retryable,
 * and only two conclusive empty native authorities retire a retained JS owner to checkpoint-only.
 */
export function planDirectedForegroundOwnerReconciliationV1(input: Readonly<{
  currentOwner: DirectedControlOwnerV1 | null;
  nativeOwner: DirectedControlOwnerV1 | null;
  aggregateOwner: DirectedAggregateOwnerV1;
  queriesConclusive: boolean;
}>): DirectedForegroundOwnerReconciliationPlanV1 {
  if (!input.queriesConclusive) {
    return Object.freeze({
      kind: "retain-current-retry",
      projectedDirectedOwner: input.currentOwner,
      recovery: input.currentOwner ? "native-current" : "none",
    });
  }
  if (input.aggregateOwner.sessionType !== null && input.aggregateOwner.sessionType !== "directed") {
    return Object.freeze({ kind: "preserve-classic", projectedDirectedOwner: null, recovery: input.currentOwner ? "checkpoint-only" : "none" });
  }
  if (input.nativeOwner) {
    const aggregateMatches = input.aggregateOwner.sessionType === "directed"
      && input.aggregateOwner.sessionId === input.nativeOwner.sessionId
      && input.aggregateOwner.generationId === input.nativeOwner.generationId;
    if (!aggregateMatches) {
      return Object.freeze({
        kind: "retain-current-retry",
        projectedDirectedOwner: input.currentOwner,
        recovery: input.currentOwner ? "native-current" : "none",
      });
    }
    return Object.freeze({ kind: "accept-native", projectedDirectedOwner: input.nativeOwner, recovery: "native-current" });
  }
  if (input.aggregateOwner.sessionType === "directed") {
    return Object.freeze({
      kind: "retain-current-retry",
      projectedDirectedOwner: input.currentOwner,
      recovery: input.currentOwner ? "native-current" : "none",
    });
  }
  if (input.currentOwner) {
    return Object.freeze({ kind: "clear-directed", projectedDirectedOwner: null, recovery: "checkpoint-only" });
  }
  return Object.freeze({ kind: "none", projectedDirectedOwner: null, recovery: "none" });
}

/**
 * Unknown local access or owner reconstruction is neither package corruption nor streaming absence.
 * Retained download truth stays visible to accessibility/status projection while all start/download
 * mutations remain disabled until the current generation settles.
 */
export function projectDirectedAvailabilityReconcilingV1(
  stable: DirectedAvailabilityProjectionV1,
): DirectedAvailabilityProjectionV1 {
  return Object.freeze({
    ...stable,
    state: "reconciling",
    customerCopy: "Checking saved availability…",
    primaryLabel: "Checking…",
    secondaryLabel: null,
    startable: false,
  });
}

export type DirectedForegroundReconciliationResultV1<T> = Readonly<{
  generation: number;
  current: boolean;
  value: T;
}>;

type DirectedForegroundReconciliationEntryV1<T> = Readonly<{
  generation: number;
  promise: Promise<DirectedForegroundReconciliationResultV1<T>>;
}>;

/**
 * Exactly one hydration/foreground reconciliation may own a lifecycle generation. Repeated active
 * events join it; inactive/background supersede it immediately; late results remain observable for
 * diagnostics but are marked non-current and cannot be committed by the UI.
 */
export class DirectedForegroundReconciliationCoordinatorV1 {
  private generation = 0;
  private inFlight: DirectedForegroundReconciliationEntryV1<unknown> | null = null;

  reconcile<T>(work: (generation: number) => Promise<T>): Promise<DirectedForegroundReconciliationResultV1<T>> {
    if (this.inFlight?.generation === this.generation) {
      return this.inFlight.promise as Promise<DirectedForegroundReconciliationResultV1<T>>;
    }
    const generation = this.generation + 1;
    this.generation = generation;
    let entry: DirectedForegroundReconciliationEntryV1<T>;
    const promise = (async () => work(generation))()
      .then((value) => Object.freeze({ generation, current: this.generation === generation, value }))
      .finally(() => {
        if (this.inFlight === entry) this.inFlight = null;
      });
    entry = Object.freeze({ generation, promise });
    this.inFlight = entry as DirectedForegroundReconciliationEntryV1<unknown>;
    return promise;
  }

  supersede(_reason: "inactive" | "background" | "unmount" | "package-mutation" | "manual" = "manual"): number {
    this.generation += 1;
    this.inFlight = null;
    return this.generation;
  }

  currentGeneration(): number {
    return this.generation;
  }
}
