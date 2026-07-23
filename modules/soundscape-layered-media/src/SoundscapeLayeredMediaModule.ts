import { requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';
import type { NativeDirectedSessionDefinitionV1, NativeDirectedSessionStateV1, SoundscapeLayeredMediaEvents, SoundscapeLayeredMediaNativeModule } from './SoundscapeLayeredMedia.types';
import {
  serializeDirectedSessionDefinitionV1,
} from './directedSessionJsonBridgeV1';
import { assertNoUndefinedNativePayload } from './nativePayload';

export type * from './SoundscapeLayeredMedia.types';

export {
  DirectedJsonBridgePreNativeErrorV1,
  DIRECTED_SESSION_JSON_MAX_UTF8_BYTES_V1,
  isDirectedJsonBridgePreNativeErrorV1,
  serializeDirectedSessionDefinitionV1,
} from './directedSessionJsonBridgeV1';

type ListenerModule = {
  addListener<EventName extends keyof SoundscapeLayeredMediaEvents>(
    eventName: EventName,
    listener: SoundscapeLayeredMediaEvents[EventName],
  ): { remove(): void };
};

type NativeModule = SoundscapeLayeredMediaNativeModule & ListenerModule;

type ExpoNativeModule = Omit<SoundscapeLayeredMediaNativeModule, 'createDirectedSession'> & ListenerModule & {
  createDirectedSession(definition: NativeDirectedSessionDefinitionV1 | string): Promise<NativeDirectedSessionStateV1>;
};

const nativeModule = requireNativeModule<ExpoNativeModule>('SoundscapeLayeredMedia');


const traceStage = (stage: string, classification: string, diagnosticCode?: string, error?: unknown): void => {
  try {
    nativeModule.recordDirectedActivationStage(
      stage,
      classification,
      diagnosticCode ?? null,
      error instanceof Error ? error.name : null,
    );
  } catch {
    // Diagnostic projection must never change activation behavior.
  }
};

const tracedDirectedCall = async <Result>(wrapperStage: string, invoke: () => Promise<Result>): Promise<Result> => {
  traceStage(wrapperStage, 'ENTERED');
  return invoke();
};

const guardedModule: NativeModule = {
  isAvailable: () => nativeModule.isAvailable(),
  nativeElapsedRealtimeMs: () => nativeModule.nativeElapsedRealtimeMs(),
  directedSessionSchedulerVersion: () => nativeModule.directedSessionSchedulerVersion(),
  notificationPermissionState: () => nativeModule.notificationPermissionState(),
  ensureMediaNotificationChannel: () => nativeModule.ensureMediaNotificationChannel(),
  openNotificationSettings: () => nativeModule.openNotificationSettings(),
  defineSession(session) {
    assertNoUndefinedNativePayload(session);
    return nativeModule.defineSession(session);
  },
  dispatch(command) {
    assertNoUndefinedNativePayload(command);
    return nativeModule.dispatch(command);
  },
  setLayer(command) {
    assertNoUndefinedNativePayload(command);
    return nativeModule.setLayer(command);
  },
  setLoop(command) {
    assertNoUndefinedNativePayload(command);
    return nativeModule.setLoop(command);
  },
  seek(command) {
    assertNoUndefinedNativePayload(command);
    return nativeModule.seek(command);
  },
  setTimer(command) {
    assertNoUndefinedNativePayload(command);
    return nativeModule.setTimer(command);
  },
  setTimerDiagnosticsEnabled: (enabled) => nativeModule.setTimerDiagnosticsEnabled(enabled),
  queryState: () => nativeModule.queryState(),
  dispose(command) {
    assertNoUndefinedNativePayload(command);
    return nativeModule.dispose(command);
  },
  async createDirectedSession(definition) {
    assertNoUndefinedNativePayload(definition);
    return tracedDirectedCall('NATIVE_WRAPPER_CREATE_ENTERED', () => {
      const nativeDefinition = Platform.OS === 'android'
        ? serializeDirectedSessionDefinitionV1(definition)
        : definition;
      return nativeModule.createDirectedSession(nativeDefinition);
    });
  },
  async dispatchDirectedSession(command) {
    assertNoUndefinedNativePayload(command);
    return nativeModule.dispatchDirectedSession(command);
  },
  async steerDirectedSession(command) {
    assertNoUndefinedNativePayload(command);
    return nativeModule.steerDirectedSession(command);
  },
  async undoDirectedSessionSteering(command) {
    assertNoUndefinedNativePayload(command);
    return nativeModule.undoDirectedSessionSteering(command);
  },
  async adjustDirectedSession(command) {
    assertNoUndefinedNativePayload(command);
    return nativeModule.adjustDirectedSession(command);
  },
  async setDirectedSessionOutputProfile(command) {
    assertNoUndefinedNativePayload(command);
    return nativeModule.setDirectedSessionOutputProfile(command);
  },
  getDirectedSessionState: () => nativeModule.getDirectedSessionState(),
  beginDirectedActivationTrace: (stage, classification) => nativeModule.beginDirectedActivationTrace(stage, classification),
  recordDirectedActivationStage: (stage, classification, diagnosticCode, exceptionClass) => nativeModule.recordDirectedActivationStage(stage, classification, diagnosticCode, exceptionClass),
  recordDirectedActivationProjection: (stage, outcome, code, exceptionClass) => nativeModule.recordDirectedActivationProjection(stage, outcome, code, exceptionClass),
  clearDirectedActivationTrace: () => nativeModule.clearDirectedActivationTrace(),
  getDirectedActivationDiagnostic: () => nativeModule.getDirectedActivationDiagnostic(),
  addListener<EventName extends keyof SoundscapeLayeredMediaEvents>(
    eventName: EventName,
    listener: SoundscapeLayeredMediaEvents[EventName],
  ) {
    return nativeModule.addListener(eventName, listener);
  },
};

export default guardedModule;
