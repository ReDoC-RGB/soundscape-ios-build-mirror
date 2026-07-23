export type NativeOwnership = {
  sessionId: string;
  generationId: number;
  operationId: number;
};

export type NativeLayer = {
  layerId: string;
  soundId: string;
  sourceUri: string;
  required: boolean;
  enabled: boolean;
  volume: number;
  loopEligible: boolean;
};

export type NativeMediaMetadata = {
  title: string;
  artist?: string;
  recipeId?: string;
  subtitle?: string;
};

export type NativeSessionDefinition = NativeOwnership & {
  sessionType: 'single' | 'layered';
  layers: NativeLayer[];
  loopEnabled: boolean;
  durationMillis: number;
  metadata: NativeMediaMetadata;
};

export type NativeCommand = NativeOwnership & {
  type: 'play' | 'pause' | 'resume' | 'stop' | 'cancelTimer' | 'dispose';
};

export type NativeTimerCommand = NativeOwnership & {
  absoluteDeadlineElapsedRealtimeMs: number;
};

export type NativeLayerCommand = NativeOwnership & {
  layerId: string;
  enabled?: boolean;
  volume?: number;
};

export type NativeLoopCommand = NativeOwnership & { enabled: boolean };
export type NativeSeekCommand = NativeOwnership & { positionMillis: number; shouldPlay: boolean };

export type NativeLayerState = {
  layerId: string;
  soundId: string;
  enabled: boolean;
  volume: number;
  playing: boolean;
  buffering: boolean;
};

export type NativeTimerDiagnostic = {
  kind: string;
  atElapsedRealtimeMs: number;
  sessionId: string;
  generationId: number;
  operationId: number;
  detail: Record<string, string | number | boolean | null>;
};

export type NativeDirectedPhaseV1 = {
  phaseId: string;
  label: string;
  startMs: number;
  endMs: number;
  visualStateId: string;
  nextPhaseCopy: string | null;
};

export type NativeDirectedAssetV1 = {
  layerId: string;
  assetId: string;
  title: string;
  sourceUri: string;
  durationMs: number;
  loopEligible: boolean;
  required: boolean;
};

export type NativeDirectedEventV1 = {
  eventId: string;
  phaseIndex: number;
  startMs: number;
  layerId: string;
  assetId: string;
  role: 'bed' | 'anchor' | 'texture' | 'accent' | 'foreground';
  gain: number;
  required: boolean;
  continuous: boolean;
  densityRank: 0 | 1 | 2 | 3;
  timingVariationMs: number;
  gainVariationDb: number;
  fadeInMs: number;
  fadeOutMs: number;
};

export type NativeDirectedTexturePairV1 = {
  pairId: string;
  layerIds: [string, string];
};

export type NativeDirectedSessionDefinitionV1 = NativeOwnership & {
  expectedPhaseRevision: number;
  expectedPathRevision: number;
  idempotencyKey: string;
  sessionType: 'directed';
  contractVersion: 1;
  sceneId: string;
  sceneVersion: 1;
  scoreHash: string;
  title: string;
  trajectory: string;
  durationMs: number;
  initialPlayedElapsedMs: number;
  finalFadeStartMs: number;
  outputProfile: 'headphones' | 'speakers';
  hardAvoidanceIds: string[];
  initialAppliedSteering: {
    softer: 0 | 1 | 2;
    sparser: 0 | 1 | 2;
    closer: 0 | 1 | 2;
    steadier: 0 | 1 | 2;
    textureReplacements: Record<string, string>;
  };
  initialManualTrims: Record<string, { enabled: boolean; trimDb: -3 | 0 | 3 }>;
  playingOffline: boolean;
  maxLayerGain: number;
  minimumOptionalGain: number;
  phaseCrossfadeMs: number;
  assets: NativeDirectedAssetV1[];
  phases: NativeDirectedPhaseV1[];
  events: NativeDirectedEventV1[];
  texturePairs: NativeDirectedTexturePairV1[];
};

export type NativeDirectedTransportCommandV1 = NativeOwnership & {
  expectedPhaseRevision: number;
  expectedPathRevision: number;
  idempotencyKey: string;
  type: 'play' | 'pause' | 'resume' | 'stop';
  endedReason?: 'user-ended' | 'required-asset-failed' | 'scheduler-failed';
};

export type NativeDirectedSteeringCommandV1 = NativeOwnership & {
  expectedPhaseRevision: number;
  expectedPathRevision: number;
  idempotencyKey: string;
  type: 'steer' | 'different-texture' | 'cancel-pending';
  axis?: 'softer' | 'sparser' | 'closer' | 'steadier';
  level?: 0 | 1 | 2;
  fromLayerId?: string;
  toLayerId?: string;
};

export type NativeDirectedUndoCommandV1 = NativeOwnership & {
  expectedPhaseRevision: number;
  expectedPathRevision: number;
  idempotencyKey: string;
};

export type NativeDirectedAdjustCommandV1 = NativeOwnership & {
  expectedPhaseRevision: number;
  expectedPathRevision: number;
  idempotencyKey: string;
  layerId: string;
  enabled?: boolean;
  trimDb?: -3 | 0 | 3;
};

export type NativeDirectedOutputProfileCommandV1 = NativeOwnership & {
  expectedPhaseRevision: number;
  expectedPathRevision: number;
  idempotencyKey: string;
  outputProfile: 'headphones' | 'speakers';
};

export type NativeDirectedAcknowledgementV1 = {
  status: 'accepted' | 'applied' | 'cancelled' | 'duplicate' | 'stale' | 'rejected';
  operationId: number;
  idempotencyKey: string;
  pathRevision: number;
  code: string | null;
  message: string | null;
  safeCheckpointWithinMs: number;
};

export type NativeDirectedActivationDiagnosticV1 = {
  stage: string;
  code: string;
  activationTrace?: {
    schema: 'soundscape-directed-activation-trace-v1';
    status: 'empty' | 'current' | 'stale';
    traceToken?: number;
    requestKind?: string;
    startedAtMonotonicMs?: number;
    entries: Array<{
      atMonotonicMs: number;
      stage: string;
      code: string;
      exceptionClass: string | null;
    }>;
  };
};

export type NativeDirectedPendingSteeringV1 = {
  axis: 'softer' | 'sparser' | 'closer' | 'steadier' | 'different-texture';
  level: 0 | 1 | 2 | null;
  fromLayerId: string | null;
  toLayerId: string | null;
  targetPhaseRevision: number;
  operationId: number;
  idempotencyKey: string;
};

export type NativeDirectedSessionStateV1 = NativeOwnership & {
  directedSessionSchedulerVersion: 1;
  scoreHash: string;
  sceneId: string;
  sceneVersion: 1;
  title: string;
  trajectory: string;
  transport: 'preparing' | 'playing' | 'paused' | 'interrupted' | 'completing' | 'completed' | 'failed' | 'stopped';
  playedElapsedMs: number;
  observedAtMonotonicMs: number;
  durationMs: number;
  phaseId: string;
  phaseLabel: string;
  nextPhaseLabel: string | null;
  phaseIndex: number;
  phaseRevision: number;
  pathRevision: number;
  outputProfile: 'headphones' | 'speakers';
  hardAvoidanceIds: string[];
  appliedSteering: {
    softer: 0 | 1 | 2;
    sparser: 0 | 1 | 2;
    closer: 0 | 1 | 2;
    steadier: 0 | 1 | 2;
    textureReplacements: Record<string, string>;
  };
  pendingSteering: NativeDirectedPendingSteeringV1 | null;
  manualTrims: Record<string, { enabled: boolean; trimDb: -3 | 0 | 3 }>;
  pathHistory: Array<{ axis: string; before: number | string | null; after: number | string | null; operationId: number; appliedAtPhaseRevision: number }>;
  playingOffline: boolean;
  lastAcceptedOperationId: number;
  lastAcknowledgement: NativeDirectedAcknowledgementV1 | null;
  endedReason: string | null;
  failureCopyKey: string | null;
  completionEligible: boolean;
};

export type NativeAggregateState = NativeOwnership & {
  kind: string;
  eventId: number;
  phase: 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'stopped' | 'error';
  sessionType: 'single' | 'layered' | 'directed' | null;
  layers: NativeLayerState[];
  positionMillis: number;
  durationMillis: number;
  loopEnabled: boolean;
  timerDeadlineElapsedRealtimeMs: number | null;
  timerDiagnostics: NativeTimerDiagnostic[];
  userPausedOrStopped: boolean;
  interruptionMayResume: boolean;
  metadata: NativeMediaMetadata | null;
  directedSessionState?: NativeDirectedSessionStateV1 | null;
  lastError?: { code: string; message: string };
};

export type SoundscapeLayeredMediaEvents = {
  onNativeMediaEvent: (event: NativeAggregateState & { kind: string; acknowledgedAtElapsedRealtimeMs: number }) => void;
};

export type NativeNotificationPermissionState = {
  status: 'not-required' | 'granted' | 'denied' | 'blocked';
  runtimePermissionRequired: boolean;
  permissionGranted: boolean;
  notificationsEnabled: boolean;
  channelCreated: boolean;
  channelId: string;
  channelImportance?: number | null;
};

export interface SoundscapeLayeredMediaNativeModule {
  isAvailable(): boolean;
  nativeElapsedRealtimeMs(): number;
  directedSessionSchedulerVersion(): number;
  notificationPermissionState(): NativeNotificationPermissionState;
  ensureMediaNotificationChannel(): NativeNotificationPermissionState;
  openNotificationSettings(): void;
  defineSession(session: NativeSessionDefinition): Promise<NativeAggregateState>;
  dispatch(command: NativeCommand): Promise<NativeAggregateState>;
  setLayer(command: NativeLayerCommand): Promise<NativeAggregateState>;
  setLoop(command: NativeLoopCommand): Promise<NativeAggregateState>;
  seek(command: NativeSeekCommand): Promise<NativeAggregateState>;
  setTimer(command: NativeTimerCommand): Promise<NativeAggregateState>;
  setTimerDiagnosticsEnabled(enabled: boolean): Promise<NativeAggregateState>;
  queryState(): Promise<NativeAggregateState>;
  dispose(command: NativeCommand): Promise<NativeAggregateState>;
  createDirectedSession(definition: NativeDirectedSessionDefinitionV1): Promise<NativeDirectedSessionStateV1>;
  dispatchDirectedSession(command: NativeDirectedTransportCommandV1): Promise<NativeDirectedSessionStateV1>;
  steerDirectedSession(command: NativeDirectedSteeringCommandV1): Promise<NativeDirectedSessionStateV1>;
  undoDirectedSessionSteering(command: NativeDirectedUndoCommandV1): Promise<NativeDirectedSessionStateV1>;
  adjustDirectedSession(command: NativeDirectedAdjustCommandV1): Promise<NativeDirectedSessionStateV1>;
  setDirectedSessionOutputProfile(command: NativeDirectedOutputProfileCommandV1): Promise<NativeDirectedSessionStateV1>;
  getDirectedSessionState(): Promise<NativeDirectedSessionStateV1 | null>;
  beginDirectedActivationTrace(stage: string, classification: string): number;
  recordDirectedActivationStage(stage: string, classification: string, diagnosticCode: string | null, exceptionClass: string | null): void;
  recordDirectedActivationProjection(stage: string, outcome: string, code: string, exceptionClass: string | null): void;
  clearDirectedActivationTrace(): void;
  getDirectedActivationDiagnostic(): Promise<NativeDirectedActivationDiagnosticV1>;
}
