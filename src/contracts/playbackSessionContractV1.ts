import type { DomainErrorCode } from "./domainErrors";

export const PLAYBACK_SESSION_CONTRACT_VERSION = "1" as const;
export const SESSION_REPLACEMENT_FADE_MILLIS = 120;
export const EXPLICIT_STOP_FADE_MILLIS = 5000;
export type PlaybackPhase = "idle" | "loading" | "playing" | "paused" | "stopping" | "ended" | "error";
export type SessionSource = "Fast Start" | "Fast Start alternative" | "Presets/Builder" | "Browse" | "Saved" | "Recent" | "Player";
export type CurrentSession =
  | { type: "single"; title: string; source: SessionSource; soundId: string; updatedAt: number }
  | { type: "recipe"; title: string; source: SessionSource; recipeId: string; startingSoundId: string; updatedAt: number };
export type PlaybackLayer = { soundId: string; name: string; role: "bed" | "texture" | "accent"; volume: number; enabled: boolean };
export type PlaybackSession = {
  id: string; type: "single" | "layered"; title: string; source: SessionSource;
  soundId?: string; recipeId?: string; startingSoundId?: string; layers?: readonly PlaybackLayer[];
  generation: number; revision: number; provenance?: "saved" | "generated" | "curated" | "catalog";
};
export type PlaybackStatus = {
  phase: PlaybackPhase; positionMillis: number; durationMillis: number; buffering: boolean;
  layers: readonly { soundId: string; playing: boolean; buffering: boolean }[];
};
export type PlaybackEffect = { type: "fade-and-teardown"; generation: number; operationId: number; fadeMillis: number }
  | { type: "seek"; generation: number; operationId: number; positionMillis: number }
  | { type: "set-loop"; generation: number; operationId: number; enabled: boolean }
  | { type: "set-timer"; generation: number; operationId: number; minutes: number }
  | { type: "set-layer"; generation: number; operationId: number; soundId: string; enabled?: boolean; volume?: number };
export type PlaybackState = {
  contractVersion: typeof PLAYBACK_SESSION_CONTRACT_VERSION; session: PlaybackSession | null; currentSession: CurrentSession | null; status: PlaybackStatus;
  generation: number; operationId: number; loopEnabled: boolean; timerMinutes: number;
  pendingEffects: readonly PlaybackEffect[]; lastError: { code: DomainErrorCode; message: string } | null;
};
export type PlaybackCommand =
  | { type: "select"; session: PlaybackSession; currentSession: CurrentSession; operationId: number }
  | { type: "load" | "play" | "pause" | "resume" | "replay" | "teardown"; generation: number; operationId: number }
  | { type: "stop"; generation: number; operationId: number; fadeMillis?: number }
  | { type: "seek"; generation: number; operationId: number; positionMillis: number }
  | { type: "set-loop"; generation: number; operationId: number; enabled: boolean }
  | { type: "set-timer"; generation: number; operationId: number; minutes: number }
  | { type: "set-layer"; generation: number; operationId: number; soundId: string; enabled?: boolean; volume?: number }
  | { type: "adapter-status"; generation: number; operationId: number; status: PlaybackStatus }
  | { type: "adapter-error"; generation: number; operationId: number; message: string }
  | { type: "teardown-complete"; generation: number; operationId: number };

const idleStatus = (): PlaybackStatus => ({ phase: "idle", positionMillis: 0, durationMillis: 0, buffering: false, layers: [] });
export const createInitialPlaybackState = (): PlaybackState => ({
  contractVersion: PLAYBACK_SESSION_CONTRACT_VERSION, session: null, currentSession: null, status: idleStatus(), generation: 0, operationId: 0,
  loopEnabled: false, timerMinutes: 0, pendingEffects: [], lastError: null,
});
const stale = (state: PlaybackState, command: Exclude<PlaybackCommand, { type: "select" }>) =>
  command.generation !== state.generation || command.operationId < state.operationId;
const phase = (state: PlaybackState, next: PlaybackPhase): PlaybackState => ({ ...state, status: { ...state.status, phase: next }, lastError: null });

export function reducePlaybackSession(state: PlaybackState, command: PlaybackCommand): PlaybackState {
  if (command.type === "select") {
    if (command.session.generation < state.generation) return state;
    return { ...state, session: command.session, currentSession: command.currentSession, generation: command.session.generation, operationId: command.operationId,
      status: idleStatus(), loopEnabled: false, timerMinutes: 0, pendingEffects: [], lastError: null };
  }
  if (stale(state, command)) return state;
  const base = { ...state, operationId: Math.max(state.operationId, command.operationId), pendingEffects: [] as readonly PlaybackEffect[] };
  switch (command.type) {
    case "load": return phase(base, "loading");
    case "play": case "resume": case "replay": return phase(base, "playing");
    case "pause": return phase(base, "paused");
    case "stop": return { ...phase(base, "stopping"), pendingEffects: [{ type: "fade-and-teardown", generation: state.generation, operationId: command.operationId, fadeMillis: command.fadeMillis ?? EXPLICIT_STOP_FADE_MILLIS }] };
    case "seek":
      if (!Number.isFinite(command.positionMillis)) return state;
      if (state.session?.type === "layered") return { ...base, lastError: { code: "UNIFIED_SEEK_UNAVAILABLE", message: "Layered soundscapes do not have one shared seek position." } };
      return { ...base, status: { ...state.status, positionMillis: Math.max(0, command.positionMillis) }, pendingEffects: [{ type: "seek", generation: state.generation, operationId: command.operationId, positionMillis: Math.max(0, command.positionMillis) }] };
    case "set-loop": return { ...base, loopEnabled: command.enabled, pendingEffects: [{ type: "set-loop", generation: state.generation, operationId: command.operationId, enabled: command.enabled }] };
    case "set-timer": return { ...base, timerMinutes: Math.max(0, command.minutes), pendingEffects: [{ type: "set-timer", generation: state.generation, operationId: command.operationId, minutes: Math.max(0, command.minutes) }] };
    case "set-layer": return { ...base, pendingEffects: [{ type: "set-layer", generation: state.generation, operationId: command.operationId, soundId: command.soundId, enabled: command.enabled, volume: command.volume }] };
    case "adapter-status": return { ...base, status: command.status, lastError: null };
    case "adapter-error": return { ...base, status: { ...state.status, phase: "error", buffering: false }, lastError: { code: "PLAYBACK_LOAD_FAILED", message: command.message } };
    case "teardown": return { ...base, status: { ...idleStatus(), phase: "stopping" }, pendingEffects: [{ type: "fade-and-teardown", generation: state.generation, operationId: command.operationId, fadeMillis: 0 }] };
    case "teardown-complete": return { ...createInitialPlaybackState(), generation: state.generation, operationId: command.operationId };
  }
}
