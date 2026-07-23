import AsyncStorage from "@react-native-async-storage/async-storage";
import { Linking, PermissionsAndroid, Platform } from "react-native";
import NativeMedia from "../../modules/soundscape-layered-media";
import type {
  NativeAggregateState,
  NativeLayer,
  NativeNotificationPermissionState,
  NativeOwnership,
  NativeSessionDefinition,
} from "../../modules/soundscape-layered-media";
import { assertNoUndefinedNativePayload, buildNativeSessionDefinition } from "../../modules/soundscape-layered-media/src/nativePayload";
import { SoundscapeDomainError } from "../contracts/domainErrors";
import { classifyAggregateProjectionAcceptanceV1 } from "../navigation/classicNavigationOwnershipV1";

const NOTIFICATION_PERMISSION_ASKED_KEY = "soundscape.media-notification-permission-asked.v1";
export type MediaNotificationPermissionState = NativeNotificationPermissionState;

export type AudioOwnership = Readonly<{ sessionId: string; generation: number; operationId: number; layerId?: string }>;
export type ManagedPlaybackStatus =
  | { isLoaded: false; error?: string }
  | {
      isLoaded: true;
      isPlaying: boolean;
      isBuffering: boolean;
      positionMillis: number;
      durationMillis: number;
      didJustFinish: boolean;
      volume: number;
    };
export type AudioCreateOptions = {
  shouldPlay?: boolean;
  isLooping?: boolean;
  positionMillis?: number;
  volume?: number;
  progressUpdateIntervalMillis?: number;
  soundId?: string;
  title?: string;
  durationMillis?: number;
  loopEligible?: boolean;
};
export type AggregateCreateOptions = {
  sessionId: string;
  generation: number;
  operationId: number;
  sessionType: "single" | "layered";
  title: string;
  recipeId?: string;
  durationMillis: number;
  loopEnabled: boolean;
  layers: NativeLayer[];
};

type StatusListener = (status: ManagedPlaybackStatus, ownership: AudioOwnership) => void;
type AggregateListener = (state: NativeAggregateState) => void;

export function isFiniteNativeAggregateState(state: NativeAggregateState): boolean {
  try {
    assertNoUndefinedNativePayload(state);
  } catch {
    return false;
  }
  return [state.generationId, state.operationId, state.eventId, state.positionMillis, state.durationMillis]
    .every((value) => typeof value === "number" && Number.isFinite(value));
}

export interface ManagedAudioResource {
  readonly ownership: AudioOwnership;
  playAsync(): Promise<ManagedPlaybackStatus>;
  pauseAsync(): Promise<ManagedPlaybackStatus>;
  replayAsync(status?: { positionMillis?: number; shouldPlay?: boolean }): Promise<ManagedPlaybackStatus>;
  stopAsync(): Promise<ManagedPlaybackStatus>;
  unloadAsync(): Promise<ManagedPlaybackStatus>;
  getStatusAsync(): Promise<ManagedPlaybackStatus>;
  setStatusAsync(status: { positionMillis?: number; shouldPlay?: boolean }): Promise<ManagedPlaybackStatus>;
  setPositionAsync(positionMillis: number): Promise<ManagedPlaybackStatus>;
  setIsLoopingAsync(isLooping: boolean): Promise<ManagedPlaybackStatus>;
  setVolumeAsync(volume: number): Promise<ManagedPlaybackStatus>;
}

class NativeManagedAudioResource implements ManagedAudioResource {
  constructor(
    readonly ownership: AudioOwnership,
    private readonly service: AudioService,
    private readonly layerId: string,
  ) {}
  playAsync() { return this.service.transport(this.ownership, "play"); }
  pauseAsync() { return this.service.transport(this.ownership, "pause"); }
  replayAsync(status?: { positionMillis?: number; shouldPlay?: boolean }) {
    return this.service.seek(this.ownership, status?.positionMillis ?? 0, status?.shouldPlay ?? true);
  }
  stopAsync() { return this.service.transport(this.ownership, "stop"); }
  unloadAsync() { return this.service.dispose(this.ownership); }
  getStatusAsync() { return this.service.getStatus(this.ownership, this.layerId); }
  setStatusAsync(status: { positionMillis?: number; shouldPlay?: boolean }) {
    if (typeof status.positionMillis === "number") {
      return this.service.seek(this.ownership, status.positionMillis, status.shouldPlay ?? false);
    }
    return status.shouldPlay
      ? this.service.transport(this.ownership, "play")
      : this.service.transport(this.ownership, "pause");
  }
  setPositionAsync(positionMillis: number) { return this.service.seek(this.ownership, positionMillis, false); }
  setIsLoopingAsync(isLooping: boolean) { return this.service.setLoop(this.ownership, isLooping); }
  setVolumeAsync(volume: number) { return this.service.setLayer(this.ownership, this.layerId, undefined, volume); }
}

export class AudioService {
  private configured = false;
  private nativeGeneration = 0;
  private nativeOperation = 0;
  private activeOwner: AudioOwnership | null = null;
  private state: NativeAggregateState | null = null;
  private statusListeners = new Set<StatusListener>();
  private aggregateListeners = new Set<AggregateListener>();
  private permissionState: NativeNotificationPermissionState | null = null;
  private lastEventId = -1;
  private poll: ReturnType<typeof setInterval> | null = null;

  async configure(): Promise<void> {
    if (this.configured) return;
    if (!NativeMedia.isAvailable()) throw new Error("Native playback is unavailable in this build.");
    this.configured = true;
    this.permissionState = NativeMedia.ensureMediaNotificationChannel();
    NativeMedia.addListener("onNativeMediaEvent", (event) => this.acceptEvent(event));
    this.acceptEvent(await NativeMedia.queryState());
    // Foreground projection only. Playback, Timer and lifecycle ownership remain fully native.
    this.poll = setInterval(() => { void NativeMedia.queryState().then((state) => this.acceptEvent(state)).catch(() => undefined); }, 1000);
  }

  subscribe(listener: AggregateListener): () => void {
    this.aggregateListeners.add(listener);
    if (this.state) listener(this.state);
    return () => this.aggregateListeners.delete(listener);
  }

  notificationPermissionState(): NativeNotificationPermissionState | null {
    this.permissionState = NativeMedia.notificationPermissionState();
    return this.permissionState;
  }

  async requestNotificationPermissionForPlayback(): Promise<NativeNotificationPermissionState> {
    this.permissionState = NativeMedia.ensureMediaNotificationChannel();
    if (Platform.OS !== "android" || !this.permissionState.runtimePermissionRequired || this.permissionState.permissionGranted) {
      return this.permissionState;
    }
    const alreadyAsked = await AsyncStorage.getItem(NOTIFICATION_PERMISSION_ASKED_KEY);
    if (!alreadyAsked) {
      await AsyncStorage.setItem(NOTIFICATION_PERMISSION_ASKED_KEY, "1");
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS, {
        title: "Show playback controls",
        message: "Allow notifications so Soundscape can show playback controls on your lock screen and notification shade.",
        buttonPositive: "Allow controls",
        buttonNegative: "Not now",
      });
    }
    this.permissionState = NativeMedia.notificationPermissionState();
    return this.permissionState;
  }

  async openNotificationSettings(): Promise<void> {
    try { NativeMedia.openNotificationSettings(); } catch { await Linking.openSettings(); }
  }

  async create(
    uri: string,
    initialStatus: AudioCreateOptions,
    onStatus: StatusListener,
    ownership: AudioOwnership,
  ): Promise<{ resource: ManagedAudioResource; status: ManagedPlaybackStatus }> {
    const layerId = ownership.layerId ?? "primary";
    const created = await this.defineAggregateSession({
      sessionId: ownership.sessionId,
      generation: ownership.generation,
      operationId: ownership.operationId,
      sessionType: "single",
      title: initialStatus.title ?? "Soundscape",
      durationMillis: initialStatus.durationMillis ?? 0,
      loopEnabled: initialStatus.isLooping ?? false,
      layers: [{
        layerId,
        soundId: initialStatus.soundId ?? ownership.sessionId,
        sourceUri: uri,
        required: true,
        enabled: true,
        volume: initialStatus.volume ?? 1,
        loopEligible: initialStatus.loopEligible ?? false,
      }],
    }, onStatus);
    if (initialStatus.shouldPlay) await created.resources[0].playAsync();
    return { resource: created.resources[0], status: created.status };
  }

  async defineAggregateSession(
    options: AggregateCreateOptions,
    onStatus?: StatusListener,
  ): Promise<{ resources: ManagedAudioResource[]; status: ManagedPlaybackStatus }> {
    await this.configure();
    await this.requestNotificationPermissionForPlayback();
    const owner: AudioOwnership = {
      sessionId: options.sessionId,
      generation: Math.max(this.nativeGeneration + 1, options.generation),
      operationId: Math.max(this.nativeOperation + 1, options.operationId),
    };
    const previousOwner = this.activeOwner;
    const previousStatusListeners = this.statusListeners;
    const definition: NativeSessionDefinition = buildNativeSessionDefinition(options, {
      sessionId: owner.sessionId,
      generationId: owner.generation,
      operationId: owner.operationId,
    });
    let definedState: NativeAggregateState;
    try {
      definedState = await NativeMedia.defineSession(definition);
    } catch (cause) {
      this.activeOwner = previousOwner;
      this.statusListeners = previousStatusListeners;
      throw new SoundscapeDomainError(
        "playback",
        "PLAYBACK_LOAD_FAILED",
        "This sound could not be loaded. Please try again.",
        { cause },
      );
    }
    this.nativeGeneration = owner.generation;
    this.nativeOperation = owner.operationId;
    this.activeOwner = owner;
    this.statusListeners = new Set<StatusListener>();
    if (onStatus) this.statusListeners.add(onStatus);
    this.acceptEvent(definedState);
    const resources = options.layers.map((layer) => new NativeManagedAudioResource(
      { ...owner, layerId: layer.layerId }, this, layer.layerId,
    ));
    return { resources, status: this.toStatus(this.state, options.layers[0]?.layerId) };
  }

  async queryAuthoritativeState(): Promise<NativeAggregateState> {
    await this.configure();
    const state = await NativeMedia.queryState();
    this.acceptEvent(state);
    return state;
  }

  async setNativeTimer(durationMillis: number): Promise<void> {
    const owner = this.nextOwner();
    if (!owner) return;
    if (durationMillis <= 0) return this.cancelNativeTimer();
    await NativeMedia.setTimer({ ...this.toNative(owner), absoluteDeadlineElapsedRealtimeMs: NativeMedia.nativeElapsedRealtimeMs() + durationMillis });
  }

  nativeTimerRemainingMillis(state: NativeAggregateState | null = this.state): number {
    if (!state?.timerDeadlineElapsedRealtimeMs) return 0;
    return Math.max(0, state.timerDeadlineElapsedRealtimeMs - NativeMedia.nativeElapsedRealtimeMs());
  }

  async cancelNativeTimer(): Promise<void> {
    const owner = this.nextOwner();
    if (!owner) return;
    await NativeMedia.dispatch({ ...this.toNative(owner), type: "cancelTimer" });
  }

  invalidate(_ownership: AudioOwnership): void {
    // Native session/generation/operation ownership is authoritative; stale JavaScript handles are inert.
  }

  async teardown(resources: readonly ManagedAudioResource[]): Promise<void> {
    await Promise.allSettled(resources.map((resource) => resource.unloadAsync()));
  }

  async transport(owner: AudioOwnership, type: "play" | "pause" | "stop"): Promise<ManagedPlaybackStatus> {
    const next = this.nextOwner(owner);
    if (!next) return this.toStatus(this.state, owner.layerId);
    this.acceptEvent(await NativeMedia.dispatch({ ...this.toNative(next), type }));
    return this.toStatus(this.state, owner.layerId);
  }

  async dispose(owner: AudioOwnership): Promise<ManagedPlaybackStatus> {
    const next = this.nextOwner(owner);
    if (!next) return this.toStatus(this.state, owner.layerId);
    this.acceptEvent(await NativeMedia.dispose({ ...this.toNative(next), type: "dispose" }));
    return this.toStatus(this.state, owner.layerId);
  }

  async setLayer(owner: AudioOwnership, layerId: string, enabled?: boolean, volume?: number): Promise<ManagedPlaybackStatus> {
    const next = this.nextOwner(owner);
    if (!next) return this.toStatus(this.state, layerId);
    this.acceptEvent(await NativeMedia.setLayer({
      ...this.toNative(next),
      layerId,
      ...(enabled !== undefined ? { enabled } : {}),
      ...(volume !== undefined ? { volume } : {}),
    }));
    return this.toStatus(this.state, layerId);
  }

  async setLoop(owner: AudioOwnership, enabled: boolean): Promise<ManagedPlaybackStatus> {
    const next = this.nextOwner(owner);
    if (!next) return this.toStatus(this.state, owner.layerId);
    this.acceptEvent(await NativeMedia.setLoop({ ...this.toNative(next), enabled }));
    return this.toStatus(this.state, owner.layerId);
  }

  async seek(owner: AudioOwnership, positionMillis: number, shouldPlay: boolean): Promise<ManagedPlaybackStatus> {
    if (!Number.isFinite(positionMillis)) return this.toStatus(this.state, owner.layerId);
    const next = this.nextOwner(owner);
    if (!next) return this.toStatus(this.state, owner.layerId);
    this.acceptEvent(await NativeMedia.seek({ ...this.toNative(next), positionMillis: Math.max(0, positionMillis), shouldPlay }));
    return this.toStatus(this.state, owner.layerId);
  }

  async getStatus(owner: AudioOwnership, layerId?: string): Promise<ManagedPlaybackStatus> {
    if (!this.sameOwner(owner, this.activeOwner)) return { isLoaded: false };
    await this.queryAuthoritativeState();
    return this.toStatus(this.state, layerId);
  }

  private acceptEvent(event: NativeAggregateState): void {
    if (!event || typeof event !== "object") return;
    if (!isFiniteNativeAggregateState(event)) return;
    // Android startService returns the last published snapshot before onStartCommand processes the new intent.
    // Never let that stale bridge return clear or regress the JavaScript projection while native owns a command.
    if (this.activeOwner && !event.sessionId) return;
    if (event.sessionId) {
      const projectionClassification = classifyAggregateProjectionAcceptanceV1(
        this.activeOwner
          ? { sessionId: this.activeOwner.sessionId, generation: this.activeOwner.generation }
          : null,
        this.state?.sessionId
          ? { sessionId: this.state.sessionId, generation: this.state.generationId }
          : null,
        { sessionId: event.sessionId, generation: event.generationId },
      );
      if (projectionClassification === "stale-or-unrelated-owner") return;
      // A newer classic/directed definition is the one truthful aggregate owner.
      // Detach stale managed listeners without issuing a second native teardown.
      if (projectionClassification === "newer-owner-replacement" && this.activeOwner) {
        this.activeOwner = null;
        this.statusListeners.clear();
      }
    }
    if (this.activeOwner && event.operationId < this.activeOwner.operationId) return;
    if (event.eventId <= this.lastEventId && event.sessionId === this.state?.sessionId) return;
    this.lastEventId = Math.max(this.lastEventId, event.eventId);
    this.state = event;
    if (event.sessionId) {
      this.nativeGeneration = Math.max(this.nativeGeneration, event.generationId);
      this.nativeOperation = Math.max(this.nativeOperation, event.operationId);
    }
    for (const listener of this.aggregateListeners) listener(event);
    if (this.activeOwner) {
      const status = this.toStatus(event);
      for (const listener of this.statusListeners) listener(status, this.activeOwner);
    }
    if (event.phase === "stopped" || event.phase === "idle") {
      this.activeOwner = null;
      this.statusListeners.clear();
    }
  }

  private nextOwner(expected?: AudioOwnership): AudioOwnership | null {
    if (!this.activeOwner || (expected && !this.sameOwner(expected, this.activeOwner))) return null;
    this.nativeOperation += 1;
    this.activeOwner = { ...this.activeOwner, operationId: this.nativeOperation };
    return this.activeOwner;
  }

  private toNative(owner: AudioOwnership): NativeOwnership {
    return { sessionId: owner.sessionId, generationId: owner.generation, operationId: owner.operationId };
  }

  private sameOwner(a: AudioOwnership, b: AudioOwnership | null): boolean {
    return Boolean(b && a.sessionId === b.sessionId && a.generation === b.generation);
  }

  private sameNativeOwner(a: NativeOwnership, b: AudioOwnership): boolean {
    return a.sessionId === b.sessionId && a.generationId === b.generation;
  }

  private toStatus(state: NativeAggregateState | null, layerId?: string): ManagedPlaybackStatus {
    if (!state) return { isLoaded: false };
    const layer = state.layers?.find((candidate) => candidate.layerId === layerId) ?? state.layers?.[0];
    return {
      isLoaded: true,
      isPlaying: state.phase === "playing" && Boolean(layer?.playing),
      isBuffering: state.phase === "loading" || Boolean(layer?.buffering),
      positionMillis: state.positionMillis ?? 0,
      durationMillis: state.durationMillis ?? 0,
      didJustFinish: state.phase === "ended",
      volume: layer?.volume ?? 1,
    };
  }
}

export const audioService = new AudioService();
