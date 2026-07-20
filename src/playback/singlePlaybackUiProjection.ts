export type SinglePlaybackProjectionInput = Readonly<{
  sessionType: "single" | "recipe" | null;
  phase: "idle" | "loading" | "playing" | "paused" | "stopping" | "ended" | "error";
  isPlaying: boolean;
  resourceLoaded: boolean;
  explicitlyStopped: boolean;
  positionMillis: number;
  durationMillis: number;
}>;

export function isSinglePlaybackCommandInFlight(input: Readonly<{
  reactIsLoading: boolean;
  contractPhase: SinglePlaybackProjectionInput["phase"];
}>): boolean {
  return input.reactIsLoading || input.contractPhase === "loading";
}

export function isSinglePlaybackReplayReady(input: SinglePlaybackProjectionInput): boolean {
  if (input.sessionType !== "single") return false;
  if (input.phase === "ended" || input.explicitlyStopped) return true;
  return Boolean(
    input.resourceLoaded
    && !input.isPlaying
    && Number.isFinite(input.positionMillis)
    && Number.isFinite(input.durationMillis)
    && input.durationMillis > 0
    && input.positionMillis >= Math.max(0, input.durationMillis - 250),
  );
}

export function getSinglePlaybackPrimaryLabel(input: SinglePlaybackProjectionInput): "Play" | "Pause" | "Resume" | "Replay" {
  if (isSinglePlaybackReplayReady(input)) return "Replay";
  if (input.isPlaying) return "Pause";
  return input.resourceLoaded ? "Resume" : "Play";
}

export function getSinglePlaybackPrimaryAction(input: SinglePlaybackProjectionInput): "play" | "pause" | "replay" {
  if (isSinglePlaybackReplayReady(input)) return "replay";
  return input.isPlaying ? "pause" : "play";
}
