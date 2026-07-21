import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeDirectedSessionStateV1 } from "../../modules/soundscape-layered-media";
import { canReachRemoteMediaSourceV1 } from "../services/offlineFileStoreV1";
import {
  directedSessionServiceV1,
  type CreateDirectedSessionInputV1,
} from "../services/directedSessionServiceV1";
import {
  DIRECTED_STEERING_POLICY_V1,
  directedSceneScoresV1,
  formatDirectedTimeV1,
  getDirectedSceneScoreV1,
  materializeDirectedSceneVariantV1,
  type DirectedOutputProfileV1,
  type DirectedSceneIdV1,
  type DirectedSteeringAxisV1,
} from "./sceneScoresV1";
import type { DirectedAvailabilityProjectionV1 } from "./eligibilityV1";
import {
  DIRECTED_FOREGROUND_PROJECTION_INTERVAL_MS,
  shouldRunDirectedForegroundProjectionV1,
  type DirectedProjectionAppStateV1,
} from "./foregroundProjectionPolicyV1";
import {
  ORIGINAL_DIRECTED_STEERING_V1,
  type DirectedSessionStateV1,
  type SavedDirectedPathV1,
} from "./sessionStateV1";

export type DirectedClassicRouteV1 = "fast-start" | "browse" | "presets" | "saved-mixes" | "saved-sounds" | "settings";
export type DirectedTabV1 = "sessions" | "library" | "saved";
type DirectedScreenV1 = "root" | "detail" | "player" | "adjust" | "completion" | "ended" | "failure";

export const directedNavigationV1: readonly Readonly<{ key: DirectedTabV1; label: string }>[] = [
  { key: "sessions", label: "Sessions" },
  { key: "library", label: "Library" },
  { key: "saved", label: "Saved" },
];

const initialAvailability = (sceneId: DirectedSceneIdV1): DirectedAvailabilityProjectionV1 => ({
  state: "checking",
  customerCopy: "Checking this session…",
  primaryLabel: "Checking…",
  secondaryLabel: null,
  startable: false,
  offlineReady: false,
  playingSourceMode: null,
  verifiedCount: 0,
  totalCount: getDirectedSceneScoreV1(sceneId).assets.length,
  missingAssetIds: [],
  corruptAssetIds: [],
});

const palette = Object.freeze({
  linen: "#F5F0E8",
  sand: "#E8DCCA",
  ink: "#2E2418",
  walnut: "#665746",
  earth: "#4A3828",
  candle: "#C4935A",
  sage: "#C8D4BE",
  forest: "#344830",
  warning: "#7A3E2D",
  white: "#FFFFFF",
});

const stripLayerPrefix = (value: string | null) => value?.replace(/^directed:/, "") ?? null;
const nextLevel = (value: 0 | 1 | 2): 0 | 1 | 2 => value === 0 ? 1 : value === 1 ? 2 : 0;

function DirectedButtonV1(props: Readonly<{
  label: string;
  onPress: () => void;
  disabled?: boolean;
  selected?: boolean;
  secondary?: boolean;
  destructive?: boolean;
  accessibilityHint?: string;
}>) {
  return (
    <Pressable
      accessibilityHint={props.accessibilityHint}
      accessibilityRole="button"
      accessibilityState={{ disabled: props.disabled, selected: props.selected }}
      disabled={props.disabled}
      onPress={props.onPress}
      style={({ pressed }) => [
        directedStyles.button,
        props.secondary ? directedStyles.buttonSecondary : null,
        props.destructive ? directedStyles.buttonDestructive : null,
        props.selected ? directedStyles.buttonSelected : null,
        props.disabled ? directedStyles.disabled : null,
        pressed ? directedStyles.pressed : null,
      ]}
    >
      <Text style={[directedStyles.buttonText, props.secondary ? directedStyles.buttonSecondaryText : null]}>{props.label}</Text>
    </Pressable>
  );
}

function RainSceneV1({ phaseIndex, reduceMotionEnabled, compact = false }: Readonly<{ phaseIndex: number; reduceMotionEnabled: boolean; compact?: boolean }>) {
  return (
    <View style={[directedStyles.scene, compact ? directedStyles.sceneCompact : null, directedStyles.rainScene, reduceMotionEnabled ? directedStyles.staticScene : null]}>
      <View style={[directedStyles.rainWindow, phaseIndex >= 4 ? directedStyles.rainWindowDark : null]} />
      {[0, 1, 2, 3, 4, 5].map((line) => <View key={line} style={[directedStyles.rainLine, { left: 22 + line * 42, top: 16 + (line % 3) * 32 }]} />)}
      {phaseIndex >= 1 ? <View style={directedStyles.paperSheet} /> : null}
      {phaseIndex >= 2 && phaseIndex < 4 ? <View style={directedStyles.pencilTrace} /> : null}
    </View>
  );
}

function PorcelainSceneV1({ phaseIndex, reduceMotionEnabled, compact = false }: Readonly<{ phaseIndex: number; reduceMotionEnabled: boolean; compact?: boolean }>) {
  return (
    <View style={[directedStyles.scene, compact ? directedStyles.sceneCompact : null, directedStyles.porcelainScene, reduceMotionEnabled ? directedStyles.staticScene : null]}>
      <View style={directedStyles.porcelainPlate} />
      <View style={[directedStyles.shellMark, { transform: [{ rotate: "18deg" }] }]} />
      {phaseIndex >= 1 ? <View style={directedStyles.woodArc} /> : null}
      {phaseIndex >= 2 && phaseIndex < 4 ? <View style={directedStyles.metalGlint} /> : null}
    </View>
  );
}

function WardrobeSceneV1({ phaseIndex, reduceMotionEnabled, compact = false }: Readonly<{ phaseIndex: number; reduceMotionEnabled: boolean; compact?: boolean }>) {
  return (
    <View style={[directedStyles.scene, compact ? directedStyles.sceneCompact : null, directedStyles.wardrobeScene, reduceMotionEnabled ? directedStyles.staticScene : null]}>
      {[0, 1, 2].map((fold) => <View key={fold} style={[directedStyles.fabricFold, { left: 34 + fold * 72, opacity: 0.72 - fold * 0.12 }]} />)}
      {phaseIndex >= 1 && phaseIndex < 4 ? <View style={directedStyles.leatherStitch} /> : null}
      {phaseIndex >= 2 && phaseIndex < 4 ? <View style={directedStyles.brushSweep} /> : null}
    </View>
  );
}

function AtmosphericSceneV1(props: Readonly<{ sceneId: DirectedSceneIdV1; phaseIndex: number; reduceMotionEnabled: boolean; compact?: boolean }>) {
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants">
      {props.sceneId === "rain-desk-v1" ? <RainSceneV1 {...props} /> : null}
      {props.sceneId === "porcelain-table-v1" ? <PorcelainSceneV1 {...props} /> : null}
      {props.sceneId === "soft-wardrobe-v1" ? <WardrobeSceneV1 {...props} /> : null}
    </View>
  );
}

function DirectedProgressV1({ state, compact = false }: Readonly<{ state: NativeDirectedSessionStateV1; compact?: boolean }>) {
  const progress = state.durationMs > 0 ? Math.max(0, Math.min(1, state.playedElapsedMs / state.durationMs)) : 0;
  return (
    <View
      accessibilityLabel={`${formatDirectedTimeV1(state.playedElapsedMs)} played of ${formatDirectedTimeV1(state.durationMs)}`}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: state.durationMs, now: state.playedElapsedMs, text: `${formatDirectedTimeV1(state.playedElapsedMs)} played of ${formatDirectedTimeV1(state.durationMs)}` }}
      style={[directedStyles.progressTrack, compact ? directedStyles.progressCompact : null]}
    >
      <View style={[directedStyles.progressFill, { width: `${progress * 100}%` }]} />
    </View>
  );
}

function DirectedMiniPlayerV1(props: Readonly<{
  state: NativeDirectedSessionStateV1;
  compact: boolean;
  onOpen: () => void;
  onTransport: () => void;
}>) {
  const pauseLabel = props.state.transport === "playing" ? "Pause" : "Resume";
  return (
    <View style={[directedStyles.miniPlayer, props.compact ? directedStyles.miniPlayerCompact : null]}>
      <Pressable accessibilityHint="Opens the directed session Player" accessibilityRole="button" onPress={props.onOpen} style={directedStyles.miniSummary}>
        <Text numberOfLines={1} style={directedStyles.miniTitle}>{props.state.title}</Text>
        <Text accessibilityLiveRegion="polite" numberOfLines={1} style={directedStyles.miniPhase}>{props.state.phaseLabel}</Text>
        {props.state.pendingSteering ? <Text style={directedStyles.pendingText}>● Change pending</Text> : null}
        <DirectedProgressV1 state={props.state} compact />
      </Pressable>
      <DirectedButtonV1 label={pauseLabel} onPress={props.onTransport} secondary />
    </View>
  );
}

function steeringMessage(state: NativeDirectedSessionStateV1): string | null {
  const pending = state.pendingSteering;
  if (pending) {
    if (pending.axis === "different-texture") return `Next phase will use ${stripLayerPrefix(pending.toLayerId) ?? "a different texture"}.`;
    const qualifier = pending.level === 2 ? "much " : "";
    return `Next phase will be ${qualifier}${pending.axis}.`;
  }
  const ack = state.lastAcknowledgement;
  if (ack?.status === "applied") return ack.message ?? "Steering change applied.";
  if (ack?.status === "rejected") return ack.message ?? "That change couldn’t be applied. Your current path is unchanged.";
  return null;
}

function DirectedPlayerV1(props: Readonly<{
  state: NativeDirectedSessionStateV1;
  reduceMotionEnabled: boolean;
  compact: boolean;
  sendingControl: string | null;
  backLabel: string;
  onBack: () => void;
  onTransport: () => void;
  onEnd: () => void;
  onSteer: (axis: DirectedSteeringAxisV1) => void;
  onTexture: () => void;
  onUndo: () => void;
  onProfile: (profile: DirectedOutputProfileV1) => void;
  onAdjust: () => void;
}>) {
  const message = steeringMessage(props.state);
  const remaining = Math.max(0, props.state.durationMs - props.state.playedElapsedMs);
  const score = getDirectedSceneScoreV1(props.state.sceneId as DirectedSceneIdV1);
  const texturePair = score.texturePairs[0];
  const pendingTexture = props.state.pendingSteering?.axis === "different-texture";
  return (
    <View>
      <DirectedButtonV1 label={props.backLabel} onPress={props.onBack} secondary />
      <Text style={directedStyles.eyebrow}>Now playing</Text>
      <Text accessibilityRole="header" style={directedStyles.title}>{props.state.title}</Text>
      <AtmosphericSceneV1 sceneId={props.state.sceneId as DirectedSceneIdV1} phaseIndex={props.state.phaseIndex} reduceMotionEnabled={props.reduceMotionEnabled} />
      <Text accessibilityLiveRegion="polite" style={directedStyles.phaseTitle}>{props.state.phaseLabel}</Text>
      <Text style={directedStyles.progressCopy}>{formatDirectedTimeV1(props.state.playedElapsedMs)} / {formatDirectedTimeV1(props.state.durationMs)} · {formatDirectedTimeV1(remaining)} left</Text>
      <DirectedProgressV1 state={props.state} />
      <Text style={directedStyles.nextCopy}>{props.state.nextPhaseLabel ? `Next · ${props.state.nextPhaseLabel}` : "Final phase"}</Text>
      {message ? <Text accessibilityLiveRegion="polite" style={directedStyles.statusBanner}>{message}</Text> : null}
      {props.state.pendingSteering || props.state.pathHistory.length ? (
        <DirectedButtonV1
          label="Undo last steering change"
          accessibilityHint="Restores the previous authoritative path at a safe audio checkpoint"
          onPress={props.onUndo}
          secondary
          disabled={props.sendingControl !== null}
        />
      ) : null}
      <View style={directedStyles.transportRow}>
        <DirectedButtonV1 label={props.state.transport === "playing" ? "Pause" : "Resume"} onPress={props.onTransport} disabled={props.sendingControl !== null} />
        <DirectedButtonV1 label="End session" onPress={props.onEnd} destructive disabled={props.sendingControl !== null} />
      </View>
      <Text accessibilityRole="header" style={directedStyles.sectionTitle}>Steering</Text>
      <Text style={directedStyles.body}>Changes take effect only after the native session acknowledges them.</Text>
      <View style={[directedStyles.steeringGrid, props.compact ? directedStyles.steeringGridCompact : null]}>
        {([
          ["softer", "Softer"],
          ["sparser", "Sparser"],
          ["closer", "Closer"],
          ["steadier", "Steadier"],
        ] as const).map(([axis, label]) => {
          const level = props.state.appliedSteering[axis];
          const pending = props.state.pendingSteering?.axis === axis ? props.state.pendingSteering.level : null;
          const value = pending !== null && pending !== undefined ? `Pending, level ${pending}` : level ? `Applied, level ${level}` : "Original";
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: props.sendingControl !== null, selected: Boolean(level || pending) }}
              accessibilityValue={{ text: value }}
              disabled={props.sendingControl !== null}
              key={axis}
              onPress={() => props.onSteer(axis)}
              style={({ pressed }) => [directedStyles.steeringControl, level || pending ? directedStyles.steeringSelected : null, pressed ? directedStyles.pressed : null]}
            >
              <Text style={directedStyles.steeringLabel}>{label}</Text>
              <Text style={directedStyles.steeringState}>{props.sendingControl === axis ? "Sending…" : pending ? `Pending · ${pending}` : level ? `Applied · ${level}` : "Original"}</Text>
            </Pressable>
          );
        })}
        <Pressable
          accessibilityHint={texturePair ? "Uses one prevalidated compatible replacement for upcoming phases." : "No compatible downloaded texture is available for the next phase."}
          accessibilityRole="button"
          accessibilityState={{ disabled: props.sendingControl !== null || !texturePair, selected: pendingTexture }}
          disabled={props.sendingControl !== null || !texturePair}
          onPress={props.onTexture}
          style={({ pressed }) => [directedStyles.steeringControl, pendingTexture ? directedStyles.steeringSelected : null, pressed ? directedStyles.pressed : null]}
        >
          <Text style={directedStyles.steeringLabel}>Different texture</Text>
          <Text style={directedStyles.steeringState}>{props.sendingControl === "different-texture" ? "Sending…" : pendingTexture ? "Pending · tap to cancel" : "Compatible pair"}</Text>
        </Pressable>
      </View>
      <Text style={directedStyles.statusRow}>Timer · {formatDirectedTimeV1(remaining)} left · ends with {score.phases.at(-1)?.label}</Text>
      <Text style={directedStyles.sectionLabel}>Listening profile</Text>
      <View accessibilityRole="radiogroup" style={directedStyles.choiceRow}>
        {(["headphones", "speakers"] as const).map((profile) => (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: props.state.outputProfile === profile }}
            key={profile}
            onPress={() => props.onProfile(profile)}
            style={[directedStyles.choice, props.state.outputProfile === profile ? directedStyles.choiceSelected : null]}
          >
            <Text style={directedStyles.choiceText}>{profile === "headphones" ? "Headphones" : "Speakers"}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={directedStyles.statusRow}>{props.state.playingOffline ? "Playing offline" : "Streaming"}</Text>
      <DirectedButtonV1 label="Adjust this session" onPress={props.onAdjust} secondary />
    </View>
  );
}

function DirectedCompletionV1(props: Readonly<{
  state: NativeDirectedSessionStateV1;
  saved: boolean;
  busy: boolean;
  message: string | null;
  onReplayPath: () => void;
  onReplayOriginal: () => void;
  onSave: () => void;
  onMore: () => void;
  onFeedback: (value: "too-busy" | "just-right" | "too-sparse" | "preferred-texture") => void;
}>) {
  return (
    <View>
      <Text accessibilityLiveRegion="polite" accessibilityRole="header" style={directedStyles.title}>Session complete.</Text>
      <Text style={directedStyles.body}>{props.state.title} · {formatDirectedTimeV1(props.state.durationMs)} · full session.</Text>
      <Text style={directedStyles.sectionTitle}>Your path.</Text>
      <Text style={directedStyles.statusBanner}>{props.state.pathHistory.length ? `${props.state.pathHistory.length} steering change${props.state.pathHistory.length === 1 ? "" : "s"} shaped this path.` : "Original authored path."}</Text>
      <DirectedButtonV1 label="Replay this path" onPress={props.onReplayPath} disabled={props.busy} />
      <DirectedButtonV1 label="Replay original" onPress={props.onReplayOriginal} disabled={props.busy} secondary />
      <DirectedButtonV1 label={props.saved ? "Saved" : "Save this path"} onPress={props.onSave} disabled={props.busy || props.saved} secondary />
      <DirectedButtonV1 label="More like this" onPress={props.onMore} disabled={props.busy} secondary />
      {props.message ? <Text accessibilityLiveRegion="polite" style={directedStyles.statusBanner}>{props.message}</Text> : null}
      <Text style={directedStyles.sectionLabel}>How did this path feel?</Text>
      <View accessibilityRole="radiogroup" style={directedStyles.feedbackRow}>
        <DirectedButtonV1 label="Too busy" onPress={() => props.onFeedback("too-busy")} secondary />
        <DirectedButtonV1 label="Just right" onPress={() => props.onFeedback("just-right")} secondary />
        <DirectedButtonV1 label="Too sparse" onPress={() => props.onFeedback("too-sparse")} secondary />
      </View>
      {Object.keys(props.state.appliedSteering.textureReplacements).length ? <DirectedButtonV1 label="Preferred this texture" onPress={() => props.onFeedback("preferred-texture")} secondary /> : null}
    </View>
  );
}

function DirectedAdjustV1(props: Readonly<{
  state: NativeDirectedSessionStateV1;
  busy: boolean;
  onBack: () => void;
  onTrim: (layerId: string, trimDb: -3 | 0 | 3) => void;
  onToggle: (layerId: string, enabled: boolean) => void;
}>) {
  const score = getDirectedSceneScoreV1(props.state.sceneId as DirectedSceneIdV1);
  return (
    <View>
      <Text accessibilityRole="header" style={directedStyles.title}>Adjust this session</Text>
      <Text style={directedStyles.body}>The current phase keeps playing. Adjustments use a safe 300 ms envelope and cannot change timing.</Text>
      {score.assets.map((asset) => {
        const layerId = `directed:${asset.assetId}`;
        const trim = props.state.manualTrims[layerId] ?? { enabled: true, trimDb: 0 as const };
        const role = score.events.find((event) => event.assetId === asset.assetId)?.role ?? "texture";
        const customerRole = role === "bed" ? "Background" : role[0].toUpperCase() + role.slice(1);
        return (
          <View key={asset.assetId} style={directedStyles.adjustCard}>
            <Text style={directedStyles.sectionLabel}>{customerRole}</Text>
            <Text style={directedStyles.cardTitle}>{asset.title}</Text>
            <View accessibilityRole="radiogroup" style={directedStyles.choiceRow}>
              {([[-3, "Quiet"], [0, "Balanced"], [3, "Present"]] as const).map(([value, label]) => (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: trim.trimDb === value, disabled: props.busy }}
                  disabled={props.busy}
                  key={label}
                  onPress={() => props.onTrim(layerId, value)}
                  style={[directedStyles.choice, trim.trimDb === value ? directedStyles.choiceSelected : null]}
                >
                  <Text style={directedStyles.choiceText}>{label}</Text>
                </Pressable>
              ))}
            </View>
            {!asset.required ? <DirectedButtonV1 label={trim.enabled ? "Disable" : "Enable"} onPress={() => props.onToggle(layerId, !trim.enabled)} secondary disabled={props.busy} /> : null}
          </View>
        );
      })}
      <DirectedButtonV1 label="Back to Player" onPress={props.onBack} />
    </View>
  );
}

function SessionCardV1(props: Readonly<{
  sceneId: DirectedSceneIdV1;
  availability: DirectedAvailabilityProjectionV1;
  reduceMotionEnabled: boolean;
  onOpen: () => void;
}>) {
  const score = getDirectedSceneScoreV1(props.sceneId);
  return (
    <Pressable accessibilityHint="Opens session details without starting audio" accessibilityRole="button" onPress={props.onOpen} style={({ pressed }) => [directedStyles.sessionCard, pressed ? directedStyles.pressed : null]}>
      <View style={directedStyles.sessionCardHeader}>
        <View style={directedStyles.sessionCardCopy}>
          <Text style={directedStyles.cardTitle}>{score.title}</Text>
          <Text style={directedStyles.cardTrajectory}>{score.trajectory}</Text>
        </View>
        <Text style={directedStyles.offlinePill}>{props.availability.state === "content-gated" ? "Not available" : props.availability.offlineReady ? "Offline ready" : props.availability.state === "downloading" ? "Downloading" : props.availability.state === "package-corrupt" ? "Retry download" : "Download"}</Text>
      </View>
      <Text style={directedStyles.body}>{score.cardCopy}</Text>
      <AtmosphericSceneV1 compact sceneId={props.sceneId} phaseIndex={0} reduceMotionEnabled={props.reduceMotionEnabled} />
      <Text style={directedStyles.meta}>{formatDirectedTimeV1(score.durationMs)} min · No voice · Headphones + speakers</Text>
    </Pressable>
  );
}

export function DirectedSessionsExperienceV1(props: Readonly<{
  initialTab?: DirectedTabV1;
  onOpenClassicLibraryRoute: (route: DirectedClassicRouteV1, returnTab: DirectedTabV1) => void;
}>) {
  const { width, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const compact = width <= 360 || fontScale > 1.2;
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);
  const [tab, setTab] = useState<DirectedTabV1>(props.initialTab ?? "sessions");
  const [screen, setScreen] = useState<DirectedScreenV1>("root");
  const [selectedSceneId, setSelectedSceneId] = useState<DirectedSceneIdV1>("rain-desk-v1");
  const [outputProfile, setOutputProfile] = useState<DirectedOutputProfileV1>("headphones");
  const [avoidances, setAvoidances] = useState<Record<DirectedSceneIdV1, string[]>>({ "rain-desk-v1": [], "porcelain-table-v1": [], "soft-wardrobe-v1": [] });
  const [availability, setAvailability] = useState<Record<DirectedSceneIdV1, DirectedAvailabilityProjectionV1>>({
    "rain-desk-v1": initialAvailability("rain-desk-v1"),
    "porcelain-table-v1": initialAvailability("porcelain-table-v1"),
    "soft-wardrobe-v1": initialAvailability("soft-wardrobe-v1"),
  });
  const [nativeState, setNativeState] = useState<NativeDirectedSessionStateV1 | null>(null);
  const [checkpoint, setCheckpoint] = useState<DirectedSessionStateV1 | null>(null);
  const [savedPaths, setSavedPaths] = useState<SavedDirectedPathV1[]>([]);
  const [renameDrafts, setRenameDrafts] = useState<Record<string, string>>({});
  const [capabilityReady, setCapabilityReady] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [sendingControl, setSendingControl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [completionSaved, setCompletionSaved] = useState(false);
  const [directedAppState, setDirectedAppState] = useState<DirectedProjectionAppStateV1>(AppState.currentState);
  const [bottomNavMeasuredHeight, setBottomNavMeasuredHeight] = useState(58 + insets.bottom);
  const [miniPlayerMeasuredHeight, setMiniPlayerMeasuredHeight] = useState(compact ? 118 : 82);
  const projectionInFlight = useRef<Promise<NativeDirectedSessionStateV1 | null> | null>(null);
  const mountedRef = useRef(false);
  const lifecycleEpochRef = useRef(0);

  const refreshAvailability = useCallback(async () => {
    const lifecycleEpoch = lifecycleEpochRef.current;
    const capability = await directedSessionServiceV1.refreshCapability();
    if (!mountedRef.current || lifecycleEpochRef.current !== lifecycleEpoch) return;
    setCapabilityReady(capability === 1);
    const rows = await Promise.all(directedSceneScoresV1.map(async (score) => {
      const online = score.productionEligible ? await canReachRemoteMediaSourceV1(score.assets[0].sourceUri) : true;
      return [score.sceneId, await directedSessionServiceV1.getAvailability(score.sceneId, online)] as const;
    }));
    if (mountedRef.current && lifecycleEpochRef.current === lifecycleEpoch) setAvailability(Object.fromEntries(rows) as Record<DirectedSceneIdV1, DirectedAvailabilityProjectionV1>);
  }, []);

  const projectCurrentFromNative = useCallback(async (): Promise<NativeDirectedSessionStateV1 | null> => {
    if (projectionInFlight.current) return projectionInFlight.current;
    const lifecycleEpoch = lifecycleEpochRef.current;
    const pending = directedSessionServiceV1.queryDirectedSession();
    projectionInFlight.current = pending;
    try {
      const state = await pending;
      if (mountedRef.current && lifecycleEpochRef.current === lifecycleEpoch) setNativeState(state);
      return state;
    } finally {
      if (projectionInFlight.current === pending) projectionInFlight.current = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const lifecycleEpoch = ++lifecycleEpochRef.current;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (mountedRef.current && lifecycleEpochRef.current === lifecycleEpoch) setReduceMotionEnabled(value); });
    const motion = AccessibilityInfo.addEventListener("reduceMotionChanged", (value) => {
      if (mountedRef.current && lifecycleEpochRef.current === lifecycleEpoch) setReduceMotionEnabled(value);
    });
    const removeState = directedSessionServiceV1.addListener((state) => {
      if (!mountedRef.current || lifecycleEpochRef.current !== lifecycleEpoch) return;
      setNativeState(state);
      if (state?.transport === "completed" && state.completionEligible) setScreen("completion");
      else if (state?.transport === "failed") setScreen("failure");
    });
    const removePackage = directedSessionServiceV1.addPackageListener((sceneId, next) => {
      if (mountedRef.current && lifecycleEpochRef.current === lifecycleEpoch) setAvailability((current) => ({ ...current, [sceneId]: next }));
    });
    void Promise.all([
      refreshAvailability(),
      projectCurrentFromNative(),
      directedSessionServiceV1.loadCheckpoint(),
      directedSessionServiceV1.loadSavedPaths(),
    ]).then(([, , storedCheckpoint, storedPaths]) => {
      if (!mountedRef.current || lifecycleEpochRef.current !== lifecycleEpoch) return;
      setNativeState(directedSessionServiceV1.currentDirectedSession());
      setCheckpoint(storedCheckpoint);
      setSavedPaths(storedPaths);
    });
    const appState = AppState.addEventListener("change", (next) => {
      if (!mountedRef.current || lifecycleEpochRef.current !== lifecycleEpoch) return;
      setDirectedAppState(next);
      if (next === "active") void projectCurrentFromNative();
    });
    return () => {
      mountedRef.current = false;
      if (lifecycleEpochRef.current === lifecycleEpoch) lifecycleEpochRef.current += 1;
      motion.remove();
      removeState();
      removePackage();
      appState.remove();
    };
  }, [projectCurrentFromNative, refreshAvailability]);

  useEffect(() => {
    if (!shouldRunDirectedForegroundProjectionV1(directedAppState, nativeState)) return;
    void projectCurrentFromNative();
    const projectionInterval = setInterval(projectCurrentFromNative, DIRECTED_FOREGROUND_PROJECTION_INTERVAL_MS);
    return () => clearInterval(projectionInterval);
  }, [directedAppState, nativeState?.generationId, nativeState?.sessionId, nativeState?.transport, projectCurrentFromNative]);

  const selectedScore = getDirectedSceneScoreV1(selectedSceneId);
  const selectedAvoidances = avoidances[selectedSceneId];
  const selectedVariant = useMemo(() => materializeDirectedSceneVariantV1(selectedScore, { hardAvoidanceIds: selectedAvoidances, outputProfile }), [selectedAvoidances, selectedScore, outputProfile]);
  const canSettleUi = (lifecycleEpoch: number, state?: NativeDirectedSessionStateV1): boolean => {
    if (!mountedRef.current || lifecycleEpochRef.current !== lifecycleEpoch) return false;
    if (!state) return true;
    const current = directedSessionServiceV1.currentDirectedSession();
    return Boolean(current && current.sessionId === state.sessionId && current.generationId === state.generationId && current.operationId === state.operationId);
  };
  const openClassic = (route: DirectedClassicRouteV1) => {
    mountedRef.current = false;
    lifecycleEpochRef.current += 1;
    props.onOpenClassicLibraryRoute(route, tab);
  };

  const start = async (input: CreateDirectedSessionInputV1) => {
    const lifecycleEpoch = lifecycleEpochRef.current;
    setBusy(true);
    setMessage(null);
    setCompletionSaved(false);
    try {
      const state = await directedSessionServiceV1.createDirectedSession(input);
      if (!canSettleUi(lifecycleEpoch, state)) return;
      setNativeState(state);
      setSelectedSceneId(state.sceneId as DirectedSceneIdV1);
      setScreen("player");
      AccessibilityInfo.announceForAccessibility(`${state.title} started. ${state.phaseLabel}.`);
    } catch (error) {
      if (canSettleUi(lifecycleEpoch)) setMessage(error instanceof Error ? error.message : "We couldn’t prepare this session. Playback status could not be verified.");
    } finally {
      if (canSettleUi(lifecycleEpoch)) setBusy(false);
    }
  };

  const handleTransport = async () => {
    if (!nativeState) return;
    const lifecycleEpoch = lifecycleEpochRef.current;
    setBusy(true);
    try {
      const next = await directedSessionServiceV1.dispatchDirectedSession(nativeState.transport === "playing" ? "pause" : "resume");
      if (canSettleUi(lifecycleEpoch, next)) setNativeState(next);
    } finally {
      if (canSettleUi(lifecycleEpoch)) setBusy(false);
    }
  };

  const endSession = () => Alert.alert("End this session?", undefined, [
    { text: "Keep listening", style: "cancel" },
    { text: "End session", style: "destructive", onPress: () => {
      const lifecycleEpoch = lifecycleEpochRef.current;
      setBusy(true);
      void directedSessionServiceV1.dispatchDirectedSession("stop", "user-ended").then((state) => {
        if (!canSettleUi(lifecycleEpoch, state)) return;
        setNativeState(state);
        setScreen("ended");
      }).finally(() => { if (canSettleUi(lifecycleEpoch)) setBusy(false); });
    } },
  ]);

  const steer = async (axis: DirectedSteeringAxisV1) => {
    if (!nativeState) return;
    const lifecycleEpoch = lifecycleEpochRef.current;
    setSendingControl(axis);
    try {
      const next = await directedSessionServiceV1.steerDirectedSession(axis, nextLevel(nativeState.appliedSteering[axis]));
      if (!canSettleUi(lifecycleEpoch, next)) return;
      setNativeState(next);
      AccessibilityInfo.announceForAccessibility("Steering change acknowledged and pending.");
    } catch {
      if (canSettleUi(lifecycleEpoch)) setMessage("That change couldn’t be applied. Your current path is unchanged.");
    } finally {
      if (canSettleUi(lifecycleEpoch)) setSendingControl(null);
    }
  };

  const texture = async () => {
    if (!nativeState) return;
    const lifecycleEpoch = lifecycleEpochRef.current;
    setSendingControl("different-texture");
    try {
      const score = getDirectedSceneScoreV1(nativeState.sceneId as DirectedSceneIdV1);
      const pair = score.texturePairs[0];
      if (!pair) return;
      const next = nativeState.pendingSteering?.axis === "different-texture"
        ? await directedSessionServiceV1.cancelPendingSteering()
        : await directedSessionServiceV1.differentTexture(pair.assetIds[0], pair.assetIds[1]);
      if (canSettleUi(lifecycleEpoch, next)) setNativeState(next);
    } catch {
      if (canSettleUi(lifecycleEpoch)) setMessage("That change couldn’t be applied. Your current path is unchanged.");
    } finally {
      if (canSettleUi(lifecycleEpoch)) setSendingControl(null);
    }
  };

  const undo = async () => {
    const lifecycleEpoch = lifecycleEpochRef.current;
    setSendingControl("undo");
    try {
      const next = await directedSessionServiceV1.undoDirectedSessionSteering();
      if (!canSettleUi(lifecycleEpoch, next)) return;
      setNativeState(next);
      AccessibilityInfo.announceForAccessibility("Previous path restored.");
    } catch {
      if (canSettleUi(lifecycleEpoch)) setMessage("Couldn’t restore the previous path. The current authoritative state is still active.");
    } finally {
      if (canSettleUi(lifecycleEpoch)) setSendingControl(null);
    }
  };

  const profile = async (nextProfile: DirectedOutputProfileV1) => {
    const lifecycleEpoch = lifecycleEpochRef.current;
    setSendingControl("profile");
    try {
      const next = await directedSessionServiceV1.setDirectedSessionOutputProfile(nextProfile);
      if (canSettleUi(lifecycleEpoch, next)) setNativeState(next);
    } finally {
      if (canSettleUi(lifecycleEpoch)) setSendingControl(null);
    }
  };

  const adjustLayer = async (layerId: string, change: Readonly<{ enabled?: boolean; trimDb?: -3 | 0 | 3 }>) => {
    const lifecycleEpoch = lifecycleEpochRef.current;
    setSendingControl(layerId);
    try {
      const next = await directedSessionServiceV1.adjustDirectedSession(layerId, change);
      if (canSettleUi(lifecycleEpoch, next)) setNativeState(next);
    } catch {
      if (canSettleUi(lifecycleEpoch)) setMessage("That layer adjustment couldn’t be applied. The current authoritative state is still active.");
    } finally {
      if (canSettleUi(lifecycleEpoch)) setSendingControl(null);
    }
  };

  const replay = async (mode: "path" | "original") => {
    if (!nativeState) return;
    await start({
      sceneId: nativeState.sceneId as DirectedSceneIdV1,
      outputProfile: nativeState.outputProfile,
      hardAvoidanceIds: nativeState.hardAvoidanceIds,
      allowRemote: !nativeState.playingOffline,
      initialAppliedSteering: mode === "path" ? nativeState.appliedSteering : ORIGINAL_DIRECTED_STEERING_V1,
      initialManualTrims: mode === "path" ? nativeState.manualTrims : {},
    });
  };

  const renderSessions = () => (
    <View>
      <Text accessibilityRole="header" style={directedStyles.title}>Sessions</Text>
      {nativeState && ["playing", "paused", "interrupted"].includes(nativeState.transport) ? (
        <View style={directedStyles.continueCard}>
          <Text style={directedStyles.sectionLabel}>Continue</Text>
          <Text style={directedStyles.cardTitle}>{nativeState.title}</Text>
          <Text style={directedStyles.body}>{nativeState.phaseLabel} · {formatDirectedTimeV1(nativeState.playedElapsedMs)} played · {formatDirectedTimeV1(Math.max(0, nativeState.durationMs - nativeState.playedElapsedMs))} left</Text>
          <DirectedButtonV1 label="Open Player" onPress={() => setScreen("player")} />
        </View>
      ) : checkpoint && !checkpoint.completionEligible && checkpoint.transport !== "completed" ? (
        <View style={directedStyles.continueCard}>
          <Text style={directedStyles.sectionLabel}>Continue</Text>
          <Text style={directedStyles.cardTitle}>{checkpoint.title}</Text>
          <Text style={directedStyles.body}>{checkpoint.phaseLabel} · Restart from this phase with verified sources.</Text>
          <DirectedButtonV1 label="Restart current phase" onPress={() => void start({ sceneId: checkpoint.sceneId, outputProfile: checkpoint.outputProfile, hardAvoidanceIds: checkpoint.hardAvoidanceIds, allowRemote: !checkpoint.playingOffline, initialAppliedSteering: checkpoint.appliedSteering, initialManualTrims: checkpoint.manualTrims, restartAtPhaseIndex: checkpoint.phaseIndex })} />
        </View>
      ) : null}
      <Text accessibilityRole="header" style={directedStyles.sectionTitle}>Choose a session</Text>
      {directedSceneScoresV1.map((score) => <SessionCardV1 key={score.sceneId} sceneId={score.sceneId} availability={availability[score.sceneId]} reduceMotionEnabled={reduceMotionEnabled} onOpen={() => { setSelectedSceneId(score.sceneId); setOutputProfile("headphones"); setScreen("detail"); setMessage(null); }} />)}
    </View>
  );

  const renderLibrary = () => (
    <View>
      <Text accessibilityRole="header" style={directedStyles.title}>Library</Text>
      <Text style={directedStyles.body}>Classic sounds and static mixes remain available here.</Text>
      <DirectedButtonV1 label="Find a sound" onPress={() => openClassic("fast-start")} />
      <DirectedButtonV1 label="Browse sounds" onPress={() => openClassic("browse")} secondary />
      <DirectedButtonV1 label="Presets" onPress={() => openClassic("presets")} secondary />
      <DirectedButtonV1 label="Build a mix" onPress={() => openClassic("presets")} secondary />
    </View>
  );

  const startSaved = (path: SavedDirectedPathV1, original: boolean) => void start({
    sceneId: path.sceneId,
    outputProfile: path.outputProfile,
    hardAvoidanceIds: path.hardAvoidanceIds,
    allowRemote: true,
    initialAppliedSteering: original ? ORIGINAL_DIRECTED_STEERING_V1 : path.appliedSteering,
    initialManualTrims: original ? {} : path.manualTrims,
  });

  const renderSaved = () => (
    <View>
      <Text accessibilityRole="header" style={directedStyles.title}>Saved</Text>
      <Text style={directedStyles.sectionTitle}>Session paths</Text>
      {!savedPaths.length ? <Text style={directedStyles.body}>Completed paths you save will appear here.</Text> : null}
      {savedPaths.map((path) => (
        <View key={path.pathId} style={directedStyles.savedCard}>
          <TextInput accessibilityLabel={`Name for ${path.name}`} onChangeText={(value) => setRenameDrafts((current) => ({ ...current, [path.pathId]: value }))} style={directedStyles.renameInput} value={renameDrafts[path.pathId] ?? path.name} />
          <Text style={directedStyles.body}>{path.title} · {formatDirectedTimeV1(path.durationMs)} · {path.summarySnapshot}</Text>
          <Text style={directedStyles.meta}>Availability is revalidated before replay.</Text>
          <DirectedButtonV1 label="Replay path" onPress={() => startSaved(path, false)} />
          <DirectedButtonV1 label="Replay original" onPress={() => startSaved(path, true)} secondary />
          <View style={directedStyles.savedActionRow}>
            <DirectedButtonV1 label="Rename" onPress={() => void directedSessionServiceV1.renameSavedPath(path.pathId, renameDrafts[path.pathId] ?? path.name).then(setSavedPaths)} secondary />
            <DirectedButtonV1 label="Duplicate" onPress={() => void directedSessionServiceV1.duplicateSavedPath(path.pathId).then(setSavedPaths)} secondary />
            <DirectedButtonV1 label="Delete" onPress={() => void directedSessionServiceV1.deleteSavedPath(path.pathId).then(setSavedPaths)} destructive />
          </View>
        </View>
      ))}
      <Text style={directedStyles.sectionTitle}>Mixes</Text>
      <DirectedButtonV1 label="Open saved mixes" onPress={() => openClassic("saved-mixes")} secondary />
      <Text style={directedStyles.sectionTitle}>Sounds</Text>
      <DirectedButtonV1 label="Open saved sounds" onPress={() => openClassic("saved-sounds")} secondary />
    </View>
  );

  const renderDetail = () => {
    const available = availability[selectedSceneId];
    return (
      <View>
        <DirectedButtonV1 label="Back" onPress={() => setScreen("root")} secondary />
        <AtmosphericSceneV1 sceneId={selectedSceneId} phaseIndex={0} reduceMotionEnabled={reduceMotionEnabled} />
        <Text accessibilityRole="header" style={directedStyles.title}>{selectedScore.title}</Text>
        <Text style={directedStyles.cardTrajectory}>{selectedVariant.trajectory}</Text>
        <Text style={directedStyles.meta}>{formatDirectedTimeV1(selectedScore.durationMs)} min · No voice · {available.offlineReady ? "Offline ready" : "Streaming available"}</Text>
        <Text style={directedStyles.sectionLabel}>Listening on</Text>
        <View accessibilityRole="radiogroup" style={directedStyles.choiceRow}>
          {(["headphones", "speakers"] as const).map((profileOption) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: outputProfile === profileOption }} key={profileOption} onPress={() => setOutputProfile(profileOption)} style={[directedStyles.choice, outputProfile === profileOption ? directedStyles.choiceSelected : null]}><Text style={directedStyles.choiceText}>{profileOption === "headphones" ? "Headphones" : "Speakers"}</Text></Pressable>)}
        </View>
        <Text style={directedStyles.sectionLabel}>Avoid sounds in this session</Text>
        <View style={directedStyles.chipWrap}>
          {selectedScore.hardAvoidances.map((rule) => {
            const selected = selectedAvoidances.includes(rule.avoidanceId);
            return <Pressable accessibilityRole="button" accessibilityState={{ selected }} key={rule.avoidanceId} onPress={() => setAvoidances((current) => ({ ...current, [selectedSceneId]: selected ? current[selectedSceneId].filter((id) => id !== rule.avoidanceId) : [...current[selectedSceneId], rule.avoidanceId] }))} style={[directedStyles.chip, selected ? directedStyles.chipSelected : null]}><Text style={directedStyles.chipText}>{rule.label}</Text></Pressable>;
          })}
        </View>
        <Text accessibilityLiveRegion="polite" style={selectedVariant.blocked || !available.startable ? directedStyles.warning : directedStyles.body}>{selectedVariant.blocked ? selectedVariant.customerCopy : available.customerCopy}</Text>
        <DirectedButtonV1 label={busy ? "Starting…" : selectedVariant.blocked || !available.startable ? "Start unavailable" : "Start session"} onPress={() => void start({ sceneId: selectedSceneId, outputProfile, hardAvoidanceIds: selectedAvoidances, allowRemote: available.playingSourceMode !== "local" })} disabled={busy || selectedVariant.blocked || !available.startable} />
        {available.secondaryLabel ? <DirectedButtonV1 label={available.secondaryLabel} onPress={() => {
          if (available.secondaryLabel === "Download for offline") {
            setBusy(true);
            void directedSessionServiceV1.downloadDirectedPackage(selectedSceneId).then((next) => setAvailability((current) => ({ ...current, [selectedSceneId]: next }))).catch(() => setMessage("A session sound needs to be downloaded again.")).finally(() => setBusy(false));
          } else void refreshAvailability();
        }} secondary /> : null}
        {available.state === "downloading" ? <DirectedButtonV1 label="Cancel download" onPress={() => directedSessionServiceV1.cancelDirectedPackageDownload(selectedSceneId)} secondary /> : null}
        {message ? <Text accessibilityLiveRegion="assertive" style={directedStyles.warning}>{message}</Text> : null}
      </View>
    );
  };

  const content = (() => {
    if (capabilityReady === null) return <View style={directedStyles.center}><ActivityIndicator color={palette.earth} /><Text style={directedStyles.body}>Checking this session…</Text></View>;
    if (!capabilityReady) return <View><Text accessibilityRole="alert" style={directedStyles.title}>Sessions are unavailable in this build.</Text><DirectedButtonV1 label="Open Library" onPress={() => setTab("library")} /><DirectedButtonV1 label="Try again" onPress={() => void refreshAvailability()} secondary /></View>;
    if (screen === "detail") return renderDetail();
    if (screen === "player" && nativeState) return <DirectedPlayerV1 state={nativeState} reduceMotionEnabled={reduceMotionEnabled} compact={compact} sendingControl={sendingControl} backLabel={`Back to ${tab === "sessions" ? "Sessions" : tab === "library" ? "Library" : "Saved"}`} onBack={() => setScreen("root")} onTransport={() => void handleTransport()} onEnd={endSession} onSteer={(axis) => void steer(axis)} onTexture={() => void texture()} onUndo={() => void undo()} onProfile={(next) => void profile(next)} onAdjust={() => setScreen("adjust")} />;
    if (screen === "adjust" && nativeState) return <DirectedAdjustV1 state={nativeState} busy={sendingControl !== null} onBack={() => setScreen("player")} onTrim={(layerId, trimDb) => void adjustLayer(layerId, { trimDb })} onToggle={(layerId, enabled) => void adjustLayer(layerId, { enabled })} />;
    if (screen === "completion" && nativeState) return <DirectedCompletionV1 state={nativeState} saved={completionSaved} busy={busy} message={message} onReplayPath={() => void replay("path")} onReplayOriginal={() => void replay("original")} onSave={() => { setBusy(true); void directedSessionServiceV1.saveCompletedPath(`${nativeState.title} path`).then((saved) => { setCompletionSaved(true); setMessage("Path saved on this device."); setSavedPaths((current) => [...current, saved]); }).catch(() => setMessage("This path wasn’t saved. Your completed session is unchanged.")).finally(() => setBusy(false)); }} onMore={() => { setScreen("root"); setTab("sessions"); }} onFeedback={(value) => void directedSessionServiceV1.saveFeedback(value).then(() => setMessage("Feedback saved on this device."))} />;
    if (screen === "ended") return <View><Text accessibilityRole="header" style={directedStyles.title}>Session ended early</Text><Text style={directedStyles.body}>This was not saved as a completed path.</Text><DirectedButtonV1 label="Start over" onPress={() => setScreen("detail")} /><DirectedButtonV1 label="Back to Sessions" onPress={() => { setScreen("root"); setTab("sessions"); }} secondary /></View>;
    if (screen === "failure") return <View><Text accessibilityLiveRegion="assertive" accessibilityRole="alert" style={directedStyles.title}>The session stopped because a sound became unavailable.</Text><Text style={directedStyles.body}>No completion was recorded.</Text><DirectedButtonV1 label="Retry" onPress={() => setScreen("detail")} /><DirectedButtonV1 label="Back to Sessions" onPress={() => { setScreen("root"); setTab("sessions"); }} secondary /></View>;
    const rootContent = tab === "sessions" ? renderSessions() : tab === "library" ? renderLibrary() : renderSaved();
    return <View>{rootContent}{message ? <Text accessibilityLiveRegion="assertive" accessibilityRole="alert" style={directedStyles.warning}>{message}</Text> : null}</View>;
  })();

  const showRootChrome = screen === "root";
  const showMini = nativeState && ["playing", "paused", "interrupted"].includes(nativeState.transport) && screen !== "player" && screen !== "adjust" && screen !== "completion";
  const miniPlayerBottom = showRootChrome ? bottomNavMeasuredHeight + 10 : insets.bottom + 12;
  const contentBottomPadding = showMini
    ? miniPlayerBottom + miniPlayerMeasuredHeight + 16
    : showRootChrome
      ? bottomNavMeasuredHeight + 20
      : 28 + insets.bottom;
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={directedStyles.safeAreaShell}>
      <View style={directedStyles.topBar}>
        <Text numberOfLines={1} style={directedStyles.brand}>Soundscape</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => openClassic("settings")}
          style={({ pressed }) => [directedStyles.headerSettings, pressed ? directedStyles.pressed : null]}
        >
          <Text style={directedStyles.headerSettingsText}>Settings</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={[directedStyles.content, { paddingBottom: contentBottomPadding }]}>{content}</ScrollView>
      {showMini && nativeState ? (
        <View
          onLayout={({ nativeEvent }) => setMiniPlayerMeasuredHeight(nativeEvent.layout.height)}
          style={[directedStyles.miniPlayerPlacement, { bottom: miniPlayerBottom }]}
        >
          <DirectedMiniPlayerV1 state={nativeState} compact={compact} onOpen={() => setScreen("player")} onTransport={() => void handleTransport()} />
        </View>
      ) : null}
      {showRootChrome ? (
        <SafeAreaView
          edges={["bottom", "left", "right"]}
          onLayout={({ nativeEvent }) => setBottomNavMeasuredHeight(nativeEvent.layout.height)}
          style={directedStyles.bottomNavSafeArea}
        >
          <View accessibilityLabel="Directed session navigation" accessibilityRole="tablist" style={directedStyles.bottomNav}>
            {directedNavigationV1.map((item) => (
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === item.key }}
                key={item.key}
                onPress={() => setTab(item.key)}
                style={[directedStyles.navTab, tab === item.key ? directedStyles.navTabSelected : null]}
              >
                <Text style={[directedStyles.navText, tab === item.key ? directedStyles.navTextSelected : null]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </SafeAreaView>
      ) : null}
    </SafeAreaView>
  );
}

const directedStyles = StyleSheet.create({
  safeAreaShell: { flex: 1, backgroundColor: palette.linen },
  topBar: { minHeight: 56, paddingHorizontal: 16, paddingVertical: 6, backgroundColor: palette.linen, borderBottomWidth: 1, borderBottomColor: palette.sand, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  brand: { color: palette.ink, fontSize: 21, lineHeight: 25, fontWeight: "800", flexShrink: 1 },
  headerSettings: { minHeight: 44, minWidth: 44, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: palette.earth, backgroundColor: palette.white, alignItems: "center", justifyContent: "center" },
  headerSettingsText: { color: palette.earth, fontSize: 14, lineHeight: 19, fontWeight: "800" },
  content: { padding: 16, paddingBottom: 28, gap: 12 },
  center: { minHeight: 280, alignItems: "center", justifyContent: "center", gap: 12 },
  title: { color: palette.ink, fontSize: 28, lineHeight: 34, fontWeight: "800", flexShrink: 1 },
  eyebrow: { color: palette.forest, fontSize: 13, lineHeight: 18, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1.2, marginTop: 12 },
  sectionTitle: { color: palette.ink, fontSize: 20, lineHeight: 26, fontWeight: "800", marginTop: 16 },
  sectionLabel: { color: palette.earth, fontSize: 16, lineHeight: 22, fontWeight: "800", marginTop: 12 },
  body: { color: palette.walnut, fontSize: 16, lineHeight: 24, flexShrink: 1 },
  meta: { color: palette.walnut, fontSize: 14, lineHeight: 21, fontWeight: "700", flexShrink: 1 },
  warning: { color: palette.warning, backgroundColor: palette.sand, borderRadius: 12, padding: 12, fontSize: 16, lineHeight: 23, fontWeight: "700" },
  button: { minHeight: 44, minWidth: 44, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: palette.earth, alignItems: "center", justifyContent: "center", marginTop: 8, flexShrink: 1 },
  buttonSecondary: { backgroundColor: palette.white, borderWidth: 1, borderColor: palette.earth },
  buttonDestructive: { backgroundColor: palette.warning },
  buttonSelected: { backgroundColor: palette.forest },
  buttonText: { color: palette.linen, fontSize: 16, lineHeight: 21, fontWeight: "800", textAlign: "center", flexShrink: 1 },
  buttonSecondaryText: { color: palette.ink },
  disabled: { opacity: 0.48 },
  pressed: { opacity: 0.74 },
  sessionCard: { backgroundColor: palette.white, borderRadius: 20, borderWidth: 1, borderColor: palette.sand, padding: 14, marginTop: 12, gap: 7, overflow: "hidden" },
  sessionCardHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  sessionCardCopy: { flex: 1, gap: 3 },
  continueCard: { backgroundColor: palette.white, borderRadius: 18, borderWidth: 1, borderColor: palette.sand, padding: 14, marginTop: 12 },
  savedCard: { backgroundColor: palette.white, borderRadius: 18, borderWidth: 1, borderColor: palette.sand, padding: 14, marginTop: 12 },
  cardTitle: { color: palette.ink, fontSize: 21, lineHeight: 27, fontWeight: "800", flexShrink: 1 },
  cardTrajectory: { color: palette.forest, fontSize: 16, lineHeight: 22, fontWeight: "800" },
  offlinePill: { alignSelf: "flex-start", color: palette.forest, backgroundColor: palette.sage, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, fontSize: 13, fontWeight: "800", overflow: "hidden" },
  scene: { height: 92, borderRadius: 16, overflow: "hidden", position: "relative", marginVertical: 6 },
  sceneCompact: { height: 76, borderRadius: 14, opacity: 0.88 },
  staticScene: { opacity: 1 },
  rainScene: { backgroundColor: "#7E8B8C" },
  rainWindow: { position: "absolute", inset: 14, borderWidth: 4, borderColor: "#DCE2DE", backgroundColor: "#66787C", borderRadius: 8 },
  rainWindowDark: { backgroundColor: "#3F5056" },
  rainLine: { position: "absolute", width: 2, height: 54, backgroundColor: "#D6E1DE", transform: [{ rotate: "-24deg" }], opacity: 0.72 },
  paperSheet: { position: "absolute", width: 104, height: 82, right: 30, bottom: 18, borderRadius: 5, backgroundColor: "#F2E8D4", transform: [{ rotate: "-5deg" }] },
  pencilTrace: { position: "absolute", width: 68, height: 3, right: 48, bottom: 58, backgroundColor: palette.earth, transform: [{ rotate: "12deg" }] },
  porcelainScene: { backgroundColor: "#65717A" },
  porcelainPlate: { position: "absolute", width: 132, height: 92, borderRadius: 66, backgroundColor: "#E6E0D5", left: 42, top: 38, borderWidth: 4, borderColor: "#C8BFAE" },
  shellMark: { position: "absolute", width: 42, height: 28, borderRadius: 21, borderWidth: 4, borderColor: "#F5F0E8", left: 92, top: 68 },
  woodArc: { position: "absolute", width: 120, height: 58, borderTopWidth: 8, borderColor: "#8A6747", right: 24, bottom: 20, borderRadius: 60 },
  metalGlint: { position: "absolute", width: 54, height: 3, right: 30, top: 28, backgroundColor: "#E9ECE8", transform: [{ rotate: "-18deg" }] },
  wardrobeScene: { backgroundColor: "#90786C" },
  fabricFold: { position: "absolute", top: 15, bottom: 10, width: 56, borderRadius: 28, backgroundColor: "#C7AEA0", transform: [{ rotate: "7deg" }] },
  leatherStitch: { position: "absolute", width: 170, height: 3, left: 44, top: 82, backgroundColor: "#4A3828", borderStyle: "dashed", borderWidth: 1 },
  brushSweep: { position: "absolute", width: 148, height: 12, right: 14, bottom: 30, borderRadius: 8, backgroundColor: "#D8C4AF", transform: [{ rotate: "-9deg" }] },
  progressTrack: { height: 12, borderRadius: 999, backgroundColor: palette.sand, overflow: "hidden", marginVertical: 8 },
  progressCompact: { height: 7, marginVertical: 5 },
  progressFill: { height: "100%", borderRadius: 999, backgroundColor: palette.forest },
  phaseTitle: { color: palette.ink, fontSize: 24, lineHeight: 30, fontWeight: "800" },
  progressCopy: { color: palette.earth, fontSize: 16, lineHeight: 23, fontWeight: "700" },
  nextCopy: { color: palette.forest, fontSize: 17, lineHeight: 24, fontWeight: "800" },
  statusBanner: { color: palette.ink, backgroundColor: palette.white, borderRadius: 14, borderWidth: 1, borderColor: palette.sand, padding: 12, fontSize: 15, lineHeight: 22, marginTop: 8 },
  statusRow: { color: palette.earth, fontSize: 15, lineHeight: 22, fontWeight: "700", marginTop: 12 },
  transportRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 8 },
  steeringGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  steeringGridCompact: { flexDirection: "column" },
  steeringControl: { minHeight: 72, minWidth: 140, flexGrow: 1, flexBasis: "46%", borderRadius: 16, borderWidth: 1, borderColor: palette.earth, backgroundColor: palette.linen, padding: 12, justifyContent: "center" },
  steeringSelected: { backgroundColor: palette.sage, borderWidth: 2, borderColor: palette.forest },
  steeringLabel: { color: palette.ink, fontSize: 16, lineHeight: 21, fontWeight: "800" },
  steeringState: { color: palette.walnut, fontSize: 13, lineHeight: 19, marginTop: 4 },
  choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  choice: { minHeight: 44, minWidth: 112, borderRadius: 999, borderWidth: 1, borderColor: palette.earth, paddingHorizontal: 14, paddingVertical: 10, alignItems: "center", justifyContent: "center" },
  choiceSelected: { backgroundColor: palette.sage, borderWidth: 2, borderColor: palette.forest },
  choiceText: { color: palette.ink, fontSize: 15, lineHeight: 20, fontWeight: "800", flexShrink: 1 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 44, minWidth: 44, borderRadius: 999, borderWidth: 1, borderColor: palette.earth, paddingHorizontal: 14, paddingVertical: 10, justifyContent: "center" },
  chipSelected: { backgroundColor: palette.sage, borderWidth: 2, borderColor: palette.forest },
  chipText: { color: palette.ink, fontSize: 14, lineHeight: 20, fontWeight: "700", flexShrink: 1 },
  feedbackRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  adjustCard: { backgroundColor: palette.white, borderRadius: 16, borderWidth: 1, borderColor: palette.sand, padding: 14, marginTop: 12 },
  renameInput: { minHeight: 44, color: palette.ink, borderWidth: 1, borderColor: palette.earth, borderRadius: 10, paddingHorizontal: 12, fontSize: 16, fontWeight: "700" },
  savedActionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  miniPlayerPlacement: { position: "absolute", left: 10, right: 10 },
  miniPlayer: { minHeight: 82, backgroundColor: palette.earth, borderRadius: 18, padding: 10, flexDirection: "row", alignItems: "center", gap: 10, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 8, elevation: 5 },
  miniPlayerCompact: { minHeight: 118, flexDirection: "column", alignItems: "stretch" },
  miniSummary: { flex: 1, minHeight: 44, justifyContent: "center" },
  miniTitle: { color: palette.linen, fontSize: 16, lineHeight: 21, fontWeight: "800" },
  miniPhase: { color: palette.sand, fontSize: 13, lineHeight: 18 },
  pendingText: { color: palette.sage, fontSize: 12, lineHeight: 16, fontWeight: "800" },
  bottomNavSafeArea: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: palette.linen, borderTopWidth: 1, borderColor: palette.sand },
  bottomNav: { minHeight: 58, paddingHorizontal: 10, paddingBottom: 6, paddingTop: 6, backgroundColor: palette.linen, flexDirection: "row", gap: 8 },
  navTab: { flex: 1, minHeight: 44, minWidth: 44, borderRadius: 999, borderWidth: 1, borderColor: "transparent", alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  navTabSelected: { backgroundColor: palette.sage, borderColor: palette.forest },
  navText: { color: palette.earth, fontSize: 14, lineHeight: 19, fontWeight: "700", flexShrink: 1 },
  navTextSelected: { color: palette.forest, fontWeight: "900" },
});
