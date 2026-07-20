export type RestartPlaybackStatus =
  | { isLoaded: false }
  | { isLoaded: true; isPlaying: boolean; isBuffering: boolean };

export type RestartPlaybackTruth = "unavailable" | "loading" | "playing" | "paused";

export type LayeredPlaybackEntryMode =
  | "create-initial"
  | "recreate-released"
  | "resume-existing"
  | "unavailable";

export type LayeredPlaybackEntryState = {
  currentRecipeId: string | null;
  selectedPresetId: string | null;
  selectedDefinitionAvailable: boolean;
  managedResourcePresent: boolean;
  managedResourceTruth: RestartPlaybackTruth | null;
  restartBlueprintPresetId: string | null;
};

export type LayeredSessionIdentity = {
  recipeId: string;
  title: string;
  source: string;
  startingSoundId: string;
};

export type NativeLayeredSessionIdentity = {
  sessionId: string;
  recipeId: string | null;
  title: string;
  startingSoundId: string;
};

export type LayeredTransportProjection = {
  fullLabel: "Pause" | "Resume" | "Play";
  miniLabel: "Pause" | "Resume" | "Play";
  action: "pause" | "resume" | "play";
};

export function reconcileLayeredSessionIdentity(input: {
  currentSession: LayeredSessionIdentity | null;
  nativeSession: NativeLayeredSessionIdentity;
}): LayeredSessionIdentity {
  const { currentSession, nativeSession } = input;
  if (currentSession) {
    return {
      ...currentSession,
      title: nativeSession.title,
      startingSoundId: nativeSession.startingSoundId,
    };
  }
  return {
    recipeId: nativeSession.recipeId ?? nativeSession.sessionId,
    title: nativeSession.title,
    source: "Player",
    startingSoundId: nativeSession.startingSoundId,
  };
}

export function projectLayeredTransport(
  phase: RestartPlaybackTruth | "idle" | "stopped" | "error",
): LayeredTransportProjection {
  if (phase === "playing") {
    return { fullLabel: "Pause", miniLabel: "Pause", action: "pause" };
  }
  if (phase === "paused") {
    return { fullLabel: "Resume", miniLabel: "Resume", action: "resume" };
  }
  return { fullLabel: "Play", miniLabel: "Play", action: "play" };
}

export function classifyRestartPlaybackStatus(status: RestartPlaybackStatus): RestartPlaybackTruth {
  if (!status.isLoaded) return "unavailable";
  if (status.isPlaying) return "playing";
  if (status.isBuffering) return "loading";
  return "paused";
}

export function classifyLayeredPlaybackEntry(
  state: LayeredPlaybackEntryState,
): LayeredPlaybackEntryMode {
  const selectedDefinitionMatches =
    state.selectedDefinitionAvailable &&
    state.currentRecipeId !== null &&
    state.currentRecipeId === state.selectedPresetId;
  if (!selectedDefinitionMatches) return "unavailable";
  if (!state.managedResourcePresent) return "create-initial";
  if (state.managedResourceTruth === "unavailable") {
    return state.restartBlueprintPresetId === state.currentRecipeId
      ? "recreate-released"
      : "unavailable";
  }
  return state.managedResourceTruth === null ? "unavailable" : "resume-existing";
}

type InFlightRestart = {
  key: string;
  token: number;
  promise: Promise<unknown>;
};

export class SessionRestartCoordinator {
  private token = 0;
  private inFlight: InFlightRestart | null = null;

  run<T>(key: string, task: (token: number) => Promise<T>): Promise<T> {
    if (this.inFlight?.key === key) {
      return this.inFlight.promise as Promise<T>;
    }

    const token = this.token + 1;
    this.token = token;
    const promise = task(token).finally(() => {
      if (this.inFlight?.token === token) {
        this.inFlight = null;
      }
    });
    this.inFlight = { key, token, promise };
    return promise;
  }

  isCurrent(token: number): boolean {
    return token === this.token;
  }

  invalidate(): void {
    this.token += 1;
    this.inFlight = null;
  }
}

export type LayeredPresetPreviewRequest<Result> = Readonly<{
  presetId: string;
  run: (token: number, isCurrent: () => boolean) => Promise<Result>;
  isAccepted: (result: Result) => boolean;
  onError?: (error: unknown) => void;
}>;

export function runLayeredPresetPreview<Result>(
  coordinator: SessionRestartCoordinator,
  request: LayeredPresetPreviewRequest<Result>,
): Promise<Result | false> {
  return coordinator.run(`layered-play:${request.presetId}`, async (token) => {
    const isCurrent = () => coordinator.isCurrent(token);
    try {
      const result = await request.run(token, isCurrent);
      if (!isCurrent()) return false;
      if (!request.isAccepted(result)) return false;
      return result;
    } catch (error: unknown) {
      if (isCurrent()) request.onError?.(error);
      return false;
    }
  });
}
