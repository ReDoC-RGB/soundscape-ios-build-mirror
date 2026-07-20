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

export const DIRECTED_SESSION_SCHEDULER_VERSION_V1 = 1 as const;
const DIRECTED_OFFLINE_QUOTA_BYTES = 250 * 1024 * 1024;
const DIRECTED_OFFLINE_RESERVE_BYTES = 25 * 1024 * 1024;

type DirectedStateListenerV1 = (state: NativeDirectedSessionStateV1 | null) => void;
type DirectedPackageListenerV1 = (sceneId: DirectedSceneIdV1, availability: DirectedAvailabilityProjectionV1) => void;

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

  async refreshCapability(): Promise<number> {
    try {
      this.capabilityVersion = NativeMedia.isAvailable() ? NativeMedia.directedSessionSchedulerVersion() : 0;
    } catch {
      this.capabilityVersion = 0;
    }
    return this.capabilityVersion;
  }

  async queryDirectedSession(): Promise<NativeDirectedSessionStateV1 | null> {
    if (await this.refreshCapability() < 1) {
      await this.acceptNativeState(null);
      return null;
    }
    try {
      const queried = await NativeMedia.getDirectedSessionState();
      await this.acceptNativeState(finiteNativeState(queried) ? queried : null);
    } catch {
      await this.acceptNativeState(null);
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
    const generationId = Math.max(1, (previous?.generationId ?? 0) + 1);
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
    const created = await NativeMedia.createDirectedSession(definition);
    if (!finiteNativeState(created) || created.sessionId !== sessionId || created.generationId !== generationId) throw new Error("We couldn’t prepare this session. Nothing started.");
    await this.acceptNativeState(created);
    const play: NativeDirectedTransportCommandV1 = {
      sessionId,
      generationId,
      operationId: created.lastAcceptedOperationId + 1,
      expectedPhaseRevision: created.phaseRevision,
      expectedPathRevision: created.pathRevision,
      idempotencyKey: `${sessionId}:play:${created.lastAcceptedOperationId + 1}`,
      type: "play",
    };
    const playing = await NativeMedia.dispatchDirectedSession(play);
    if (!finiteNativeState(playing)) throw new Error("We couldn’t prepare this session. Nothing started.");
    await this.acceptNativeState(playing);
    return playing;
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
    const next = await NativeMedia.dispatchDirectedSession(command);
    await this.acceptNativeState(next);
    return next;
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
    const next = await NativeMedia.undoDirectedSessionSteering(command);
    await this.acceptNativeState(next);
    return next;
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
    const next = await NativeMedia.adjustDirectedSession(command);
    await this.acceptNativeState(next);
    return next;
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
    const next = await NativeMedia.setDirectedSessionOutputProfile(command);
    await this.acceptNativeState(next);
    return next;
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
    const next = await NativeMedia.steerDirectedSession(command);
    await this.acceptNativeState(next);
    return next;
  }

  private requireCurrent(): NativeDirectedSessionStateV1 {
    if (!finiteNativeState(this.current)) throw new Error("No directed session is active.");
    return this.current;
  }

  private async acceptNativeState(state: NativeDirectedSessionStateV1 | null): Promise<void> {
    this.current = finiteNativeState(state) ? state : null;
    if (this.current) await AsyncStorage.setItem(DIRECTED_SESSION_STATE_STORAGE_KEY_V1, serializeDirectedCheckpointV1(nativeStateToCheckpoint(this.current)));
    for (const listener of this.listeners) listener(this.current);
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
