import { requireNativeModule } from 'expo-modules-core';
import type { SoundscapeLayeredMediaEvents, SoundscapeLayeredMediaNativeModule } from './SoundscapeLayeredMedia.types';
import { assertNoUndefinedNativePayload } from './nativePayload';

export type * from './SoundscapeLayeredMedia.types';

type NativeModule = SoundscapeLayeredMediaNativeModule & {
  addListener<EventName extends keyof SoundscapeLayeredMediaEvents>(
    eventName: EventName,
    listener: SoundscapeLayeredMediaEvents[EventName],
  ): { remove(): void };
};

const nativeModule = requireNativeModule<NativeModule>('SoundscapeLayeredMedia');

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
  createDirectedSession(definition) {
    assertNoUndefinedNativePayload(definition);
    return nativeModule.createDirectedSession(definition);
  },
  dispatchDirectedSession(command) {
    assertNoUndefinedNativePayload(command);
    return nativeModule.dispatchDirectedSession(command);
  },
  steerDirectedSession(command) {
    assertNoUndefinedNativePayload(command);
    return nativeModule.steerDirectedSession(command);
  },
  undoDirectedSessionSteering(command) {
    assertNoUndefinedNativePayload(command);
    return nativeModule.undoDirectedSessionSteering(command);
  },
  adjustDirectedSession(command) {
    assertNoUndefinedNativePayload(command);
    return nativeModule.adjustDirectedSession(command);
  },
  setDirectedSessionOutputProfile(command) {
    assertNoUndefinedNativePayload(command);
    return nativeModule.setDirectedSessionOutputProfile(command);
  },
  getDirectedSessionState: () => nativeModule.getDirectedSessionState(),
  addListener<EventName extends keyof SoundscapeLayeredMediaEvents>(
    eventName: EventName,
    listener: SoundscapeLayeredMediaEvents[EventName],
  ) {
    return nativeModule.addListener(eventName, listener);
  },
};

export default guardedModule;
