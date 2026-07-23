export type AggregateOwnerKindV1 = "classic" | "directed";
export type AggregateOwnerPhaseV1 = "loading" | "playing" | "paused" | "ended";

export type AggregateOwnerV1 = Readonly<{
  id: string;
  generation: number;
  kind: AggregateOwnerKindV1;
  phase: AggregateOwnerPhaseV1;
}>;

export type AggregateOwnershipStateV1 = Readonly<{
  owner: AggregateOwnerV1 | null;
  replacementCount: number;
}>;

export type AggregateOwnershipEventV1 =
  | Readonly<{ type: "navigate"; destination: string }>
  | Readonly<{ type: "view-cleanup"; viewId: string }>
  | Readonly<{ type: "dispose-request"; ownerId: string; generation: number }>
  | Readonly<{ type: "explicit-stop" | "timer-terminal" | "fatal-owner-failure" | "lifecycle-teardown" | "terminal-end"; ownerId: string; generation: number }>
  | Readonly<{ type: "replace"; owner: AggregateOwnerV1 }>;

export type IncomingAggregateOwnerClassificationV1 =
  | "no-current-owner"
  | "same-owner"
  | "newer-owner-replacement"
  | "stale-or-unrelated-owner";

export function classifyIncomingAggregateOwnerV1(
  current: Readonly<{ sessionId: string; generation: number }> | null,
  incoming: Readonly<{ sessionId: string; generation: number }>,
): IncomingAggregateOwnerClassificationV1 {
  if (!current) return "no-current-owner";
  if (current.sessionId === incoming.sessionId && current.generation === incoming.generation) return "same-owner";
  if (incoming.generation > current.generation) return "newer-owner-replacement";
  return "stale-or-unrelated-owner";
}

export function selectCurrentAggregateOwnerV1(
  activeOwner: Readonly<{ sessionId: string; generation: number }> | null,
  projectedOwner: Readonly<{ sessionId: string; generation: number }> | null,
): Readonly<{ sessionId: string; generation: number }> | null {
  // The managed handle can be detached when a Directed owner replaces Classic,
  // but the accepted aggregate projection remains the generation high-water mark.
  return activeOwner ?? projectedOwner;
}

export function classifyAggregateProjectionAcceptanceV1(
  activeOwner: Readonly<{ sessionId: string; generation: number }> | null,
  projectedOwner: Readonly<{ sessionId: string; generation: number }> | null,
  incoming: Readonly<{ sessionId: string; generation: number }>,
): IncomingAggregateOwnerClassificationV1 {
  return classifyIncomingAggregateOwnerV1(
    selectCurrentAggregateOwnerV1(activeOwner, projectedOwner),
    incoming,
  );
}

export function planClassicPlayerOpenV1(surfaceVisible: boolean): Readonly<{
  revealRetainedSurface: boolean;
  route: "player";
  section: "player";
}> {
  return Object.freeze({
    revealRetainedSurface: !surfaceVisible,
    route: "player",
    section: "player",
  });
}

function eventOwnsCurrent(
  owner: AggregateOwnerV1 | null,
  event: Readonly<{ ownerId: string; generation: number }>,
): boolean {
  return Boolean(owner && owner.id === event.ownerId && owner.generation === event.generation);
}

export function applyAggregateOwnershipEventV1(
  state: AggregateOwnershipStateV1,
  event: AggregateOwnershipEventV1,
): AggregateOwnershipStateV1 {
  if (event.type === "navigate" || event.type === "view-cleanup") return state;
  if (event.type === "dispose-request") {
    return eventOwnsCurrent(state.owner, event) ? { ...state, owner: null } : state;
  }
  if (event.type === "replace") {
    if (state.owner && event.owner.generation <= state.owner.generation) return state;
    return {
      owner: event.owner,
      replacementCount: state.replacementCount + (state.owner?.id === event.owner.id ? 0 : 1),
    };
  }
  return eventOwnsCurrent(state.owner, event) ? { ...state, owner: null } : state;
}

export type ClassicNavigationRouteV1 = "fast-start" | "browse" | "presets" | "player" | "saved-mixes" | "saved-sounds" | "settings";

export type ClassicNavigationSurfacePlanV1 = Readonly<{
  mountClassic: boolean;
  classicVisible: boolean;
  directedVisible: boolean;
  section: "fast-start" | "browse" | "presets" | "player";
  savedTab: "sounds" | "sessions";
}>;

export function planClassicNavigationSurfaceV1(input: Readonly<{
  directedEnabled: boolean;
  classicEverMounted: boolean;
  classicRoute: ClassicNavigationRouteV1 | null;
}>): ClassicNavigationSurfacePlanV1 {
  const classicVisible = !input.directedEnabled || input.classicRoute !== null;
  const route = input.classicRoute;
  return Object.freeze({
    mountClassic: !input.directedEnabled || input.classicEverMounted || route !== null,
    classicVisible,
    directedVisible: input.directedEnabled && !classicVisible,
    section: route === "player"
      ? "player"
      : route === "browse"
      ? "browse"
      : route === "presets"
        ? "presets"
        : route === "saved-mixes" || route === "saved-sounds"
          ? "player"
          : "fast-start",
    savedTab: route === "saved-sounds" ? "sounds" : "sessions",
  });
}
