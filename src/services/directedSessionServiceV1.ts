import AsyncStorage from "@react-native-async-storage/async-storage";
import NativeMedia from "../../modules/soundscape-layered-media";
import type {
  NativeDirectedAdjustCommandV1,
  NativeDirectedOutputProfileCommandV1,
  NativeDirectedSessionDefinitionV1,
  NativeDirectedSessionStateV1,
  NativeDirectedSteeringCommandV1,
  NativeDirectedTransportCommandV1,
  NativeDirectedUndoCommandV1,
} from "../../modules/soundscape-layered-media";
import { recoverOfflineManifestItem, type OfflineManifestItemV1 } from "../contracts/offlineManifestContractV1";
import { appPersistence } from "./appPersistence";
import { OfflineDownloadManager } from "./offlineDownloadManagerV1";
import { expoOfflineFilePortV1, expoOfflineNetworkPortV1 } from "./offlineFileStoreV1";
import {
  DIRECTED_STEERING_POLICY_V1,
  getDirectedSceneScoreV1,
  materializeDirectedSceneVariantV1,
  type DirectedOutputProfileV1,
  type DirectedSceneIdV1,
  type DirectedSteeringAxisV1,
} from "../directedSessions/sceneScoresV1";
import {
  createDirectedDownloadInputsV1,
  projectDirectedAvailabilityV1,
  resolveDirectedAssetSourcesV1,
  type DirectedAvailabilityProjectionV1,
} from "../directedSessions/eligibilityV1";
import {
  DIRECTED_FEEDBACK_STORAGE_KEY_V1,
  DIRECTED_SAVED_PATHS_STORAGE_KEY_V1,
  DIRECTED_SESSION_STATE_STORAGE_KEY_V1,
  ORIGINAL_DIRECTED_STEERING_V1,
  createSavedDirectedPathV1,
  parseDirectedCheckpointV1,
  parseSavedDirectedPathsV1,
  serializeDirectedCheckpointV1,
  serializeSavedDirectedPathsV1,
  type DirectedAppliedSteeringV1,
  type DirectedSessionStateV1,
  type SavedDirectedPathV1,
} from "../directedSessions/sessionStateV1";
import {
  allocateDirectedGenerationV1,
  shouldAcceptDirectedProjectionV1,
  shouldPersistDirectedProjectionV1,
} from "../directedSessions/foregroundProjectionPolicyV1";

export const DIRECTED_SESSION_SCHEDULER_VERSION_V1 = 1 as const;
const DIRECTED_OFFLINE_QUOTA_BYTES = 250 * 1024 * 1024;
const DIRECTED_OFFLINE_RESERVE_BYTES = 25 * 1024 * 1024;

type DirectedStateListenerV1 = (state: NativeDirectedSessionStateV1 | null) => void;
type DirectedPackageListenerV1 = (sceneId: DirectedSceneIdV1, availability: DirectedAvailabilityProjectionV1) => void;
type NativeDirectedCommandFenceV1 = Readonly<{
  sessionId: string;
  generationId: number;
  operationId: number;
  idempotencyKey: string;
}>;

export type CreateDirectedSessionInputV1 = Readonly<{
  sceneId: DirectedSceneIdV1;
  outputProfile: DirectedOutputProfileV1;
  hardAvoidanceIds: readonly string[];
  allowRemote: boolean;
  allowContentGatedFixture?: boolean;
  initialAppliedSteering?: DirectedAppliedSteeringV1;
  initialManualTrims?: Readonly<Record<string, Readonly<{ enabled: boolean; trimDb: -3 | 0 | 3 }>>>;
  restartAtPhaseIndex?: number;
}>;

const finiteNativeState = (state: NativeDirectedSessionStateV1 | null): state is NativeDirectedSessionStateV1 => Boolean(
  state
  && state.directedSessionSchedulerVersion === 1
  && typeof state.sessionId === "string"
  && Number.isFinite(state.generationId)
  && Number.isFinite(state.operationId)
  && Number.isFinite(state.playedElapsedMs)
  && Number.isFinite(state.durationMs)
  && Number.isFinite(state.phaseRevision)
  && Number.isFinite(state.pathRevision),
);

const nativeStateToCheckpoint = (native: NativeDirectedSessionStateV1): DirectedSessionStateV1 => {
  return Object.freeze({
    contractVersion: 1,
    sessionId: native.sessionId,
    generation: native.generationId,
    scoreHash: native.scoreHash,
    sceneId: native.sceneId as DirectedSceneIdV1,
    sceneVersion: 1,
    title: native.title,
    trajectory: native.trajectory,
    durationMs: native.durationMs,
    transport: native.transport,
    playedElapsedMs: native.playedElapsedMs,
    observedAtMonotonicMs: native.observedAtMonotonicMs,
    phaseId: native.phaseId,
    phaseLabel: native.phaseLabel,
    nextPhaseLabel: native.nextPhaseLabel,
    phaseIndex: native.phaseIndex,
    phaseRevision: native.phaseRevision,
    outputProfile: native.outputProfile,
    hardAvoidanceIds: Object.freeze([...native.hardAvoidanceIds]),
    appliedSteering: Object.freeze({ ...native.appliedSteering, textureReplacements: Object.freeze({ ...native.appliedSteering.textureReplacements }) }),
    pendingSteering: native.pendingSteering ? Object.freeze({
      axis: native.pendingSteering.axis,
      level: native.pendingSteering.level,
      fromAssetId: native.pendingSteering.fromLayerId,
      toAssetId: native.pendingSteering.toLayerId,
      targetPhaseRevision: native.pendingSteering.targetPhaseRevision,
      operationId: native.pendingSteering.operationId,
      expectedPathRevision: native.pathRevision,
      idempotencyKey: native.pendingSteering.idempotencyKey,
    }) : null,
    manualTrims: Object.freeze({ ...native.manualTrims }),
    pathHistory: Object.freeze(native.pathHistory.map((entry) => Object.freeze({
      axis: entry.axis as "softer" | "sparser" | "closer" | "steadier" | "different-texture",
      before: entry.before,
      after: entry.after,
      operationId: entry.operationId,
      appliedAtPhaseRevision: entry.appliedAtPhaseRevision,
    }))),
    pathRevision: native.pathRevision,
    lastAcceptedOperationId: native.lastAcceptedOperationId,
    lastAcknowledgement: native.lastAcknowledgement ? Object.freeze({ ...native.lastAcknowledgement }) : null,
    acknowledgementsByKey: Object.freeze(native.lastAcknowledgement ? { [native.lastAcknowledgement.idempotencyKey]: Object.freeze({ ...native.lastAcknowledgement }) } : {}),
    playingOffline: native.playingOffline,
    endedReason: native.endedReason as DirectedSessionStateV1["endedReason"],
    failureCopyKey: native.failureCopyKey,
    completionEligible: native.completionEligible,
  });
};

const recoveredManifest = (raw: string | null): OfflineManifestItemV1[] => {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    const now = new Date().toISOString();
    return value.flatMap((candidate) => {
      try {
        if (!candidate || typeof candidate !== "object" || typeof (candidate as { assetId?: unknown }).assetId !== "string") return [];
        return [recoverOfflineManifestItem(candidate as OfflineManifestItemV1, now)];
      } catch {
        return [];
      }
    });
  } catch {
    return [];
  }
};

export class DirectedSessionServiceV1 {
  private capabilityVersion = 0;
  private current: NativeDirectedSessionStateV1 | null = null;
  private nativeListenerHandle: { remove(): void } | null = null;
  private readonly listeners = new Set<DirectedStateListenerV1>();
  private readonly packageListeners = new Set<DirectedPackageListenerV1>();
  private offlineManager: OfflineDownloadManager | null = null;
  private offlineManagerLoading: Promise<OfflineDownloadManager> | null = null;
  private readonly cancelledPackageScenes = new Set<DirectedSceneIdV1>();
  private nativeStateAcceptance: Promise<void> = Promise.resolve();
  private nativeStateEpoch = 0;
  private lastPersistedNativeState: NativeDirectedSessionStateV1 | null = null;

  constructor() {
    try {
      this.nativeListenerHandle = NativeMedia.addListener("onNativeMediaEvent", (event) => {
        if (event.sessionType !== "directed" || !finiteNativeState(event.directedSessionState ?? null)) return;
        void this.acceptNativeState(event.directedSessionState ?? null);
      });
    } catch {
      this.nativeListenerHandle = null;
    }
  }

  dispose(): void {
    this.nativeStateEpoch += 1;
    this.nativeListenerHandle?.remove();
    this.nativeListenerHandle = null;
    this.listeners.clear();
    this.packageListeners.clear();
  }

  addListener(listener: DirectedStateListenerV1): () => void {
    this.listeners.add(listener);
    listener(this.current);
    return () => this.listeners.delete(listener);
  }

  addPackageListener(listener: DirectedPackageListenerV1): () => void {
    this.packageListeners.add(listener);
    return () => this.packageListeners.delete(listener);
  }

  currentDirectedSession(): NativeDirectedSessionStateV1 | null {
    return this.current;
  }

  async refreshCapability(): Promise<number> {
    try {
      this.capabilityVersion = NativeMedia.isAvailable() ? NativeMedia.directedSessionSchedulerVersion() : 0;
    } catch {
      this.capabilityVersion = 0;
    }
    return this.capabilityVersion;
  }

  async queryDirectedSession(): Promise<NativeDirectedSessionStateV1 | null> {
    if (await this.refreshCapability() < 1) return this.current;
    try {
      const queried = await NativeMedia.getDirectedSessionState();
      if (finiteNativeState(queried)) await this.acceptNativeState(queried);
    } catch {
      // A transient bridge/query failure must not erase a still-authoritative state.
      // The next native event or foreground projection query will reconcile it.
    }
    return this.current;
  }

  async loadCheckpoint(): Promise<DirectedSessionStateV1 | null> {
    return parseDirectedCheckpointV1(await AsyncStorage.getItem(DIRECTED_SESSION_STATE_STORAGE_KEY_V1));
  }

  async getManifestItems(): Promise<readonly OfflineManifestItemV1[]> {
    return (await this.getOfflineManager()).enumerate();
  }

  async getAvailability(sceneId: DirectedSceneIdV1, networkAvailable: boolean): Promise<DirectedAvailabilityProjectionV1> {
    const availability = projectDirectedAvailabilityV1({
      sceneId,
      capabilityVersion: await this.refreshCapability(),
      networkAvailable,
      manifestItems: await this.getManifestItems(),
    });
    return availability;
  }

  async createDirectedSession(input: CreateDirectedSessionInputV1): Promise<NativeDirectedSessionStateV1> {
    if (await this.refreshCapability() !== DIRECTED_SESSION_SCHEDULER_VERSION_V1) throw new Error("Sessions are unavailable in this build.");
    const score = getDirectedSceneScoreV1(input.sceneId);
    const variant = materializeDirectedSceneVariantV1(score, {
      hardAvoidanceIds: input.hardAvoidanceIds,
      outputProfile: input.outputProfile,
      allowContentGatedFixture: input.allowContentGatedFixture,
    });
    if (variant.blocked) throw new Error(variant.customerCopy);
    const manifestItems = await this.getManifestItems();
    const sources = resolveDirectedAssetSourcesV1({ sceneId: input.sceneId, manifestItems, allowRemote: input.allowRemote });
    if (!sources.usable) throw new Error("We couldn’t prepare this session. Nothing started.");
    const previous = await this.queryDirectedSession();
    let aggregateGeneration: number | null = null;
    try {
      const aggregate = await NativeMedia.queryState();
      aggregateGeneration = Number.isFinite(aggregate.generationId) ? aggregate.generationId : null;
    } catch {
      aggregateGeneration = null;
    }
    // Android's existing aggregate owner fences every classic and directed definition
    // with one monotonically increasing generation. Allocate above both authorities;
    // starting at 1 after a retained classic owner was the released Android failure.
    const generationId = allocateDirectedGenerationV1([previous?.generationId, aggregateGeneration]);
    const sessionId = `directed:${input.sceneId}:${generationId}`;
    const layerIdByAsset = new Map(variant.assets.map((candidate) => [candidate.assetId, `directed:${candidate.assetId}`]));
    const definition: NativeDirectedSessionDefinitionV1 = {
      sessionId,
      generationId,
      operationId: 1,
      expectedPhaseRevision: 1,
      expectedPathRevision: 0,
      idempotencyKey: `${sessionId}:create:1`,
      sessionType: "directed",
      contractVersion: 1,
      sceneId: variant.sceneId,
      sceneVersion: 1,
      scoreHash: variant.scoreHash,
      title: variant.title,
      trajectory: variant.trajectory,
      durationMs: variant.durationMs,
      initialPlayedElapsedMs: variant.phases[Math.max(0, Math.min(variant.phases.length - 1, input.restartAtPhaseIndex ?? 0))].startMs,
      finalFadeStartMs: variant.finalFadeStartMs,
      outputProfile: input.outputProfile,
      hardAvoidanceIds: [...input.hardAvoidanceIds],
      initialAppliedSteering: { ...(input.initialAppliedSteering ?? ORIGINAL_DIRECTED_STEERING_V1), textureReplacements: { ...(input.initialAppliedSteering?.textureReplacements ?? {}) } },
      initialManualTrims: { ...(input.initialManualTrims ?? {}) },
      playingOffline: sources.sourceMode === "local",
      maxLayerGain: DIRECTED_STEERING_POLICY_V1.maxLayerGain,
      minimumOptionalGain: DIRECTED_STEERING_POLICY_V1.minimumOptionalGain,
      phaseCrossfadeMs: DIRECTED_STEERING_POLICY_V1.phaseCrossfadeMs,
      assets: variant.assets.map((candidate) => ({
        layerId: layerIdByAsset.get(candidate.assetId) ?? candidate.assetId,
        assetId: candidate.assetId,
        title: candidate.title,
        sourceUri: sources.sourceByAssetId[candidate.assetId],
        durationMs: candidate.durationMs,
        loopEligible: candidate.loopEligible,
        required: candidate.required,
      })),
      phases: variant.phases.map((candidate) => ({ ...candidate })),
      events: variant.events.map((candidate) => ({
        ...candidate,
        layerId: layerIdByAsset.get(candidate.assetId) ?? candidate.assetId,
      })),
      texturePairs: variant.texturePairs.map((pair) => ({
        pairId: pair.pairId,
        layerIds: [layerIdByAsset.get(pair.assetIds[0]) ?? pair.assetIds[0], layerIdByAsset.get(pair.assetIds[1]) ?? pair.assetIds[1]],
      })),
    };
    let definitionIssued = false;
    try {
      definitionIssued = true;
      const created = await this.acceptAcknowledgedNativeState(
        await NativeMedia.createDirectedSession(definition),
        definition,
        ["preparing"],
      );
      const play: NativeDirectedTransportCommandV1 = {
        sessionId,
        generationId,
        operationId: created.lastAcceptedOperationId + 1,
        expectedPhaseRevision: created.phaseRevision,
        expectedPathRevision: created.pathRevision,
        idempotencyKey: `${sessionId}:play:${created.lastAcceptedOperationId + 1}`,
        type: "play",
      };
      const playing = await this.acceptAcknowledgedNativeState(
        await NativeMedia.dispatchDirectedSession(play),
        play,
        ["playing"],
      );
      return playing;
    } catch (error) {
      if (definitionIssued) {
        try {
          await this.stopFailedStartOwner(sessionId, generationId);
        } catch (cleanupError) {
          const original = error instanceof Error ? error : new Error(String(error));
          const combined = new Error("We couldn’t verify that directed playback stopped. Use system media controls to stop Soundscape before trying again.") as Error & { cause?: unknown };
          combined.cause = Object.freeze({ original, cleanupError });
          throw combined;
        }
      }
      const reconciled = new Error("We couldn’t prepare this session. Directed playback is not active.") as Error & { cause?: unknown };
      reconciled.cause = error;
      throw reconciled;
    }
  }

  async dispatchDirectedSession(type: "play" | "pause" | "resume" | "stop", endedReason?: NativeDirectedTransportCommandV1["endedReason"]): Promise<NativeDirectedSessionStateV1> {
    const state = this.requireCurrent();
    const operationId = state.lastAcceptedOperationId + 1;
    const command: NativeDirectedTransportCommandV1 = {
      sessionId: state.sessionId,
      generationId: state.generationId,
      operationId,
      expectedPhaseRevision: state.phaseRevision,
      expectedPathRevision: state.pathRevision,
      idempotencyKey: `${state.sessionId}:${type}:${operationId}`,
      type,
      ...(endedReason ? { endedReason } : {}),
    };
    const expectedTransport: NativeDirectedSessionStateV1["transport"] = type === "pause" ? "paused" : type === "stop" ? "stopped" : "playing";
    return this.acceptAcknowledgedNativeState(await NativeMedia.dispatchDirectedSession(command), command, [expectedTransport]);
  }

  async steerDirectedSession(axis: DirectedSteeringAxisV1, level: 0 | 1 | 2): Promise<NativeDirectedSessionStateV1> {
    const state = this.requireCurrent();
    const operationId = state.lastAcceptedOperationId + 1;
    return this.sendSteering({
      sessionId: state.sessionId,
      generationId: state.generationId,
      operationId,
      expectedPhaseRevision: state.phaseRevision,
      expectedPathRevision: state.pathRevision,
      idempotencyKey: `${state.sessionId}:${axis}:${operationId}`,
      type: "steer",
      axis,
      level,
    });
  }

  async differentTexture(fromAssetId: string, toAssetId: string): Promise<NativeDirectedSessionStateV1> {
    const state = this.requireCurrent();
    const operationId = state.lastAcceptedOperationId + 1;
    return this.sendSteering({
      sessionId: state.sessionId,
      generationId: state.generationId,
      operationId,
      expectedPhaseRevision: state.phaseRevision,
      expectedPathRevision: state.pathRevision,
      idempotencyKey: `${state.sessionId}:texture:${operationId}`,
      type: "different-texture",
      fromLayerId: `directed:${fromAssetId}`,
      toLayerId: `directed:${toAssetId}`,
    });
  }

  async cancelPendingSteering(): Promise<NativeDirectedSessionStateV1> {
    const state = this.requireCurrent();
    const operationId = state.lastAcceptedOperationId + 1;
    return this.sendSteering({
      sessionId: state.sessionId,
      generationId: state.generationId,
      operationId,
      expectedPhaseRevision: state.phaseRevision,
      expectedPathRevision: state.pathRevision,
      idempotencyKey: `${state.sessionId}:cancel-pending:${operationId}`,
      type: "cancel-pending",
    });
  }

  async undoDirectedSessionSteering(): Promise<NativeDirectedSessionStateV1> {
    const state = this.requireCurrent();
    const operationId = state.lastAcceptedOperationId + 1;
    const command: NativeDirectedUndoCommandV1 = {
      sessionId: state.sessionId,
      generationId: state.generationId,
      operationId,
      expectedPhaseRevision: state.phaseRevision,
      expectedPathRevision: state.pathRevision,
      idempotencyKey: `${state.sessionId}:undo:${operationId}`,
    };
    return this.acceptAcknowledgedNativeState(await NativeMedia.undoDirectedSessionSteering(command), command);
  }

  async adjustDirectedSession(layerId: string, change: Readonly<{ enabled?: boolean; trimDb?: -3 | 0 | 3 }>): Promise<NativeDirectedSessionStateV1> {
    const state = this.requireCurrent();
    const operationId = state.lastAcceptedOperationId + 1;
    const command: NativeDirectedAdjustCommandV1 = {
      sessionId: state.sessionId,
      generationId: state.generationId,
      operationId,
      expectedPhaseRevision: state.phaseRevision,
      expectedPathRevision: state.pathRevision,
      idempotencyKey: `${state.sessionId}:adjust:${layerId}:${operationId}`,
      layerId,
      ...change,
    };
    return this.acceptAcknowledgedNativeState(await NativeMedia.adjustDirectedSession(command), command);
  }

  async setDirectedSessionOutputProfile(outputProfile: DirectedOutputProfileV1): Promise<NativeDirectedSessionStateV1> {
    const state = this.requireCurrent();
    const operationId = state.lastAcceptedOperationId + 1;
    const command: NativeDirectedOutputProfileCommandV1 = {
      sessionId: state.sessionId,
      generationId: state.generationId,
      operationId,
      expectedPhaseRevision: state.phaseRevision,
      expectedPathRevision: state.pathRevision,
      idempotencyKey: `${state.sessionId}:profile:${operationId}`,
      outputProfile,
    };
    return this.acceptAcknowledgedNativeState(await NativeMedia.setDirectedSessionOutputProfile(command), command);
  }

  async saveCompletedPath(name: string): Promise<SavedDirectedPathV1> {
    const native = this.requireCurrent();
    const checkpoint = nativeStateToCheckpoint(native);
    const saved = createSavedDirectedPathV1(checkpoint, { name, now: new Date().toISOString() });
    const existing = await this.loadSavedPaths();
    await AsyncStorage.setItem(DIRECTED_SAVED_PATHS_STORAGE_KEY_V1, serializeSavedDirectedPathsV1([...existing, saved]));
    return saved;
  }

  async loadSavedPaths(): Promise<SavedDirectedPathV1[]> {
    return parseSavedDirectedPathsV1(await AsyncStorage.getItem(DIRECTED_SAVED_PATHS_STORAGE_KEY_V1));
  }

  async renameSavedPath(pathId: string, name: string): Promise<SavedDirectedPathV1[]> {
    const now = new Date().toISOString();
    const next = (await this.loadSavedPaths()).map((path) => path.pathId === pathId
      ? Object.freeze({ ...path, name: name.trim() || path.name, updatedAt: now })
      : path);
    await AsyncStorage.setItem(DIRECTED_SAVED_PATHS_STORAGE_KEY_V1, serializeSavedDirectedPathsV1(next));
    return next;
  }

  async duplicateSavedPath(pathId: string): Promise<SavedDirectedPathV1[]> {
    const current = await this.loadSavedPaths();
    const source = current.find((path) => path.pathId === pathId);
    if (!source) return current;
    const now = new Date().toISOString();
    const duplicate: SavedDirectedPathV1 = Object.freeze({
      ...source,
      pathId: `${source.pathId}:copy:${now.replace(/[^0-9]/g, "")}`,
      name: `${source.name} copy`,
      createdAt: now,
      updatedAt: now,
    });
    const next = [...current, duplicate];
    await AsyncStorage.setItem(DIRECTED_SAVED_PATHS_STORAGE_KEY_V1, serializeSavedDirectedPathsV1(next));
    return next;
  }

  async deleteSavedPath(pathId: string): Promise<SavedDirectedPathV1[]> {
    const next = (await this.loadSavedPaths()).filter((path) => path.pathId !== pathId);
    await AsyncStorage.setItem(DIRECTED_SAVED_PATHS_STORAGE_KEY_V1, serializeSavedDirectedPathsV1(next));
    return next;
  }

  async saveFeedback(value: "too-busy" | "just-right" | "too-sparse" | "preferred-texture"): Promise<void> {
    const native = this.requireCurrent();
    let rows: unknown[] = [];
    try {
      const parsed = JSON.parse(await AsyncStorage.getItem(DIRECTED_FEEDBACK_STORAGE_KEY_V1) ?? "[]");
      if (Array.isArray(parsed)) rows = parsed;
    } catch {
      rows = [];
    }
    await AsyncStorage.setItem(DIRECTED_FEEDBACK_STORAGE_KEY_V1, JSON.stringify([...rows, { sceneId: native.sceneId, scoreHash: native.scoreHash, value, recordedAt: new Date().toISOString() }]));
  }

  async downloadDirectedPackage(sceneId: DirectedSceneIdV1): Promise<DirectedAvailabilityProjectionV1> {
    this.cancelledPackageScenes.delete(sceneId);
    const manager = await this.getOfflineManager();
    for (const input of createDirectedDownloadInputsV1(sceneId, new Date().toISOString())) {
      if (this.cancelledPackageScenes.has(sceneId)) break;
      await manager.download(input);
      await appPersistence.saveOfflineManifestRaw(JSON.stringify(manager.enumerate()));
      await this.publishPackage(sceneId, true);
    }
    return this.publishPackage(sceneId, true);
  }

  cancelDirectedPackageDownload(sceneId: DirectedSceneIdV1): void {
    this.cancelledPackageScenes.add(sceneId);
  }

  private async sendSteering(command: NativeDirectedSteeringCommandV1): Promise<NativeDirectedSessionStateV1> {
    return this.acceptAcknowledgedNativeState(await NativeMedia.steerDirectedSession(command), command);
  }

  private requireCurrent(): NativeDirectedSessionStateV1 {
    if (!finiteNativeState(this.current)) throw new Error("No directed session is active.");
    return this.current;
  }

  private enqueueNativeState(work: () => Promise<void> | void): Promise<void> {
    const epoch = this.nativeStateEpoch;
    const next = this.nativeStateAcceptance.then(async () => {
      if (epoch !== this.nativeStateEpoch) return;
      await work();
    });
    this.nativeStateAcceptance = next.catch(() => undefined);
    return next;
  }

  private async acceptNativeState(state: NativeDirectedSessionStateV1 | null): Promise<NativeDirectedSessionStateV1 | null> {
    if (!finiteNativeState(state)) return this.current;
    await this.enqueueNativeState(async () => {
      const previous = this.current;
      if (!shouldAcceptDirectedProjectionV1(previous, state)) return;
      this.current = state;
      for (const listener of this.listeners) listener(state);
      if (!shouldPersistDirectedProjectionV1(this.lastPersistedNativeState, state)) return;
      try {
        await AsyncStorage.setItem(DIRECTED_SESSION_STATE_STORAGE_KEY_V1, serializeDirectedCheckpointV1(nativeStateToCheckpoint(state)));
        this.lastPersistedNativeState = state;
      } catch {
        // Native state and listeners remain authoritative. Because the persisted fence is not
        // advanced, the next accepted projection retries this checkpoint instead of publishing
        // a preparation failure after native playback has already started.
      }
    });
    return this.current;
  }

  private clearExactLocalOwner(sessionId: string, generationId: number): Promise<void> {
    return this.enqueueNativeState(() => {
      if (this.current?.sessionId !== sessionId || this.current.generationId !== generationId) return;
      this.current = null;
      for (const listener of this.listeners) listener(null);
    });
  }

  private async acceptAcknowledgedNativeState(
    state: NativeDirectedSessionStateV1 | null,
    command: NativeDirectedCommandFenceV1,
    expectedTransports?: readonly NativeDirectedSessionStateV1["transport"][],
  ): Promise<NativeDirectedSessionStateV1> {
    const acknowledgement = state?.lastAcknowledgement;
    if (
      !finiteNativeState(state)
      || state.sessionId !== command.sessionId
      || state.generationId !== command.generationId
      || state.operationId !== command.operationId
      || state.lastAcceptedOperationId !== command.operationId
      || acknowledgement?.status !== "accepted"
      || acknowledgement.operationId !== command.operationId
      || acknowledgement.idempotencyKey !== command.idempotencyKey
      || (expectedTransports && !expectedTransports.includes(state.transport))
    ) throw new Error("DIRECTED_NATIVE_ACKNOWLEDGEMENT_MISMATCH");
    await this.acceptNativeState(state);
    const aggregate = await NativeMedia.queryState();
    if (
      aggregate.sessionType !== "directed"
      || aggregate.sessionId !== command.sessionId
      || aggregate.generationId !== command.generationId
      || aggregate.operationId !== command.operationId
    ) throw new Error("DIRECTED_NATIVE_OWNER_MISMATCH");
    const current = this.current;
    const currentAcknowledgement = current?.lastAcknowledgement;
    if (
      !finiteNativeState(current)
      || current.sessionId !== command.sessionId
      || current.generationId !== command.generationId
      || current.operationId !== command.operationId
      || current.lastAcceptedOperationId !== command.operationId
      || currentAcknowledgement?.status !== "accepted"
      || currentAcknowledgement.operationId !== command.operationId
      || currentAcknowledgement.idempotencyKey !== command.idempotencyKey
      || (expectedTransports && !expectedTransports.includes(current.transport))
    ) throw new Error("DIRECTED_NATIVE_CURRENTNESS_MISMATCH");
    return current;
  }

  private async stopFailedStartOwner(sessionId: string, generationId: number): Promise<void> {
    const state = await NativeMedia.getDirectedSessionState();
    if (!finiteNativeState(state) || state.sessionId !== sessionId || state.generationId !== generationId) {
      const aggregate = await NativeMedia.queryState();
      if (aggregate.sessionType === "directed" && aggregate.sessionId === sessionId && aggregate.generationId === generationId) {
        throw new Error("FAILED_START_OWNER_STATE_UNAVAILABLE");
      }
      await this.clearExactLocalOwner(sessionId, generationId);
      return;
    }
    if (["completed", "failed", "stopped"].includes(state.transport)) {
      await this.acceptNativeState(state);
      return;
    }
    const operationId = state.lastAcceptedOperationId + 1;
    const command: NativeDirectedTransportCommandV1 = {
      sessionId,
      generationId,
      operationId,
      expectedPhaseRevision: state.phaseRevision,
      expectedPathRevision: state.pathRevision,
      idempotencyKey: `${sessionId}:rollback:${operationId}`,
      type: "stop",
      endedReason: "scheduler-failed",
    };
    try {
      await this.acceptAcknowledgedNativeState(await NativeMedia.dispatchDirectedSession(command), command, ["stopped"]);
    } catch (error) {
      const rollback = new Error("FAILED_START_ROLLBACK_NOT_ACKNOWLEDGED") as Error & { cause?: unknown };
      rollback.cause = error;
      throw rollback;
    }
  }

  private async getOfflineManager(): Promise<OfflineDownloadManager> {
    if (this.offlineManager) return this.offlineManager;
    if (!this.offlineManagerLoading) {
      this.offlineManagerLoading = (async () => {
        const manager = new OfflineDownloadManager({
          filePort: expoOfflineFilePortV1,
          network: expoOfflineNetworkPortV1,
          quotaBytes: DIRECTED_OFFLINE_QUOTA_BYTES,
          reserveBytes: DIRECTED_OFFLINE_RESERVE_BYTES,
          initialItems: recoveredManifest(await appPersistence.loadOfflineManifestRaw()),
        });
        this.offlineManager = manager;
        return manager;
      })();
    }
    return this.offlineManagerLoading;
  }

  private async publishPackage(sceneId: DirectedSceneIdV1, networkAvailable: boolean): Promise<DirectedAvailabilityProjectionV1> {
    const availability = projectDirectedAvailabilityV1({
      sceneId,
      capabilityVersion: await this.refreshCapability(),
      networkAvailable,
      manifestItems: await this.getManifestItems(),
    });
    for (const listener of this.packageListeners) listener(sceneId, availability);
    return availability;
  }
}

export const directedSessionServiceV1 = new DirectedSessionServiceV1();
