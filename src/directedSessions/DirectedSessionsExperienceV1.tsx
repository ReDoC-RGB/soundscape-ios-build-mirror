import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  AppState,
  findNodeHandle,
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
import { projectDirectedActiveSessionAvailabilityV1, type DirectedAvailabilityProjectionV1 } from "./eligibilityV1";
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
import {
  createDirectedReadinessCoordinatorV1,
  projectDirectedRemoteFreshnessAvailabilityV1,
  type DirectedRemoteFreshnessStatusV1,
} from "./readinessCoordinatorV1";
import { DirectedCheckpointProjectionEpochV1, isRecoverableDirectedCheckpointV1 } from "./directedContinuationPolicyV1";
import {
  DirectedForegroundReconciliationCoordinatorV1,
  projectDirectedAvailabilityReconcilingV1,
} from "./foregroundAvailabilityLifecycleV1";
import {
  DirectedTransportLifecycleEpochV1,
  projectDirectedTransportControlsV1,
} from "./sessionTransportLifecycleV1";
import {
  classicComponentTokensV1,
  classicVisualPaletteV1,
  classicVisualThemeV1,
} from "../ui/classicVisualAuthorityV1";
import {
  resolveClassicMiniPlayerOverlayLayoutV1,
  type ClassicMiniPlayerOverlayLayoutV1,
  type ClassicMiniPlayerOverlayMetricsV1,
} from "../ui/classicMiniPlayerOverlayLayoutV1";
import {
  resolveAdaptiveActionClusterProvisionalHeightV1,
  resolveAdaptiveBrandHeadingProjectionV1,
  resolveAdaptiveDockHeightV1,
  resolveAdaptiveMiniPlayerProvisionalHeightV1,
  resolveAdaptiveNavigationHeightV1,
  resolveAdaptivePersistentDockViewportV1,
  resolveAdaptiveTextLayoutV1,
  resolveAdaptiveTextLinePolicyV1,
  type AdaptiveDockMeasurementV1,
} from "../ui/adaptiveTextLayoutV1";

export type DirectedClassicRouteV1 = "fast-start" | "browse" | "presets" | "player" | "saved-mixes" | "saved-sounds" | "settings";
export type DirectedTabV1 = "sessions" | "library" | "saved";
type DirectedScreenV1 = "root" | "detail" | "player" | "adjust" | "completion" | "ended" | "failure";
type DirectedHeadingRefV1 = React.RefObject<React.ElementRef<typeof Text> | null>;
type DirectedRemoteFreshnessUiV1 = "idle" | "checking" | DirectedRemoteFreshnessStatusV1;

export const directedNavigationV1: readonly Readonly<{ key: DirectedTabV1; label: string }>[] = [
  { key: "sessions", label: "Sessions" },
  { key: "library", label: "Library" },
  { key: "saved", label: "Saved" },
];

const initialAvailability = (sceneId: DirectedSceneIdV1): DirectedAvailabilityProjectionV1 => ({
  sceneId,
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

const DIRECTED_SCENE_IDS_V1 = Object.freeze(directedSceneScoresV1.map((score) => score.sceneId));

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
  busy?: boolean;
}>) {
  const { fontScale, width } = useWindowDimensions();
  const adaptiveTextLayout = resolveAdaptiveTextLayoutV1({ width, fontScale });
  return (
    <Pressable
      accessibilityHint={props.accessibilityHint}
      accessibilityRole="button"
      accessibilityState={{ busy: props.busy, disabled: props.disabled, selected: props.selected }}
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
      <Text
        android_hyphenationFrequency="none"
        lineBreakStrategyIOS="standard"
        numberOfLines={adaptiveTextLayout.allowConstrainedSingleLine ? 1 : undefined}
        style={[directedStyles.buttonText, props.secondary ? directedStyles.buttonSecondaryText : null]}
        textBreakStrategy="balanced"
      >
        {props.label}
      </Text>
    </Pressable>
  );
}

function RainDeskIllustrationV1({ phaseIndex, reduceMotionEnabled, compact = false }: Readonly<{ phaseIndex: number; reduceMotionEnabled: boolean; compact?: boolean }>) {
  return (
    <View style={[directedStyles.scene, compact ? directedStyles.sceneCompact : null, directedStyles.rainScene, reduceMotionEnabled ? directedStyles.staticScene : null]}>
      <View style={[directedStyles.rainWindow, phaseIndex >= 4 ? directedStyles.rainWindowDark : null]} />
      {[0, 1, 2, 3, 4, 5].map((line) => <View key={line} style={[directedStyles.rainLine, { left: 22 + line * 42, top: 16 + (line % 3) * 32 }]} />)}
      <View style={directedStyles.rainDeskSurface} />
      <View style={directedStyles.rainDeskCup} />
      <View style={directedStyles.rainDeskCupHandle} />
      <View style={directedStyles.rainDeskLampStem} />
      <View style={directedStyles.rainDeskLamp} />
      <View style={directedStyles.paperSheet} />
      <View style={[directedStyles.pencilTrace, phaseIndex >= 2 && phaseIndex < 4 ? directedStyles.pencilTraceActive : null]} />
    </View>
  );
}

function PorcelainTableIllustrationV1({ phaseIndex, reduceMotionEnabled, compact = false }: Readonly<{ phaseIndex: number; reduceMotionEnabled: boolean; compact?: boolean }>) {
  return (
    <View style={[directedStyles.scene, compact ? directedStyles.sceneCompact : null, directedStyles.porcelainScene, reduceMotionEnabled ? directedStyles.staticScene : null]}>
      <View style={directedStyles.porcelainTableSurface} />
      <View style={directedStyles.porcelainPlate} />
      <View style={[directedStyles.shellMark, { transform: [{ rotate: "18deg" }] }]} />
      <View style={directedStyles.porcelainCup} />
      <View style={directedStyles.porcelainCupHandle} />
      <View style={[directedStyles.woodArc, phaseIndex >= 1 ? directedStyles.woodArcActive : null]} />
      <View style={[directedStyles.metalGlint, phaseIndex >= 2 && phaseIndex < 4 ? directedStyles.metalGlintActive : null]} />
    </View>
  );
}

function SoftWardrobeIllustrationV1({ phaseIndex, reduceMotionEnabled, compact = false }: Readonly<{ phaseIndex: number; reduceMotionEnabled: boolean; compact?: boolean }>) {
  return (
    <View style={[directedStyles.scene, compact ? directedStyles.sceneCompact : null, directedStyles.wardrobeScene, reduceMotionEnabled ? directedStyles.staticScene : null]}>
      <View style={directedStyles.wardrobeRail} />
      {[0, 1, 2, 3].map((fold) => (
        <View key={fold}>
          <View style={[directedStyles.wardrobeHanger, { left: 32 + fold * 58 }]} />
          <View style={[directedStyles.fabricFold, { left: 24 + fold * 58, opacity: 0.82 - fold * 0.08 }]} />
        </View>
      ))}
      <View style={[directedStyles.leatherStitch, phaseIndex >= 1 && phaseIndex < 4 ? directedStyles.leatherStitchActive : null]} />
      <View style={[directedStyles.brushSweep, phaseIndex >= 2 && phaseIndex < 4 ? directedStyles.brushSweepActive : null]} />
    </View>
  );
}

function AtmosphericSceneV1(props: Readonly<{ sceneId: DirectedSceneIdV1; phaseIndex: number; reduceMotionEnabled: boolean; compact?: boolean }>) {
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants">
      {props.sceneId === "rain-desk-v1" ? <RainDeskIllustrationV1 {...props} /> : null}
      {props.sceneId === "porcelain-table-v1" ? <PorcelainTableIllustrationV1 {...props} /> : null}
      {props.sceneId === "soft-wardrobe-v1" ? <SoftWardrobeIllustrationV1 {...props} /> : null}
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
  disabled: boolean;
  onOpen: () => void;
  onTransport: () => void;
}>) {
  const { fontScale, width } = useWindowDimensions();
  const adaptiveTextLayout = resolveAdaptiveTextLayoutV1({ width, fontScale });
  const transportControls = projectDirectedTransportControlsV1(props.state, props.disabled);
  return (
    <View style={[directedStyles.miniPlayer, props.compact ? directedStyles.miniPlayerCompact : null]}>
      <View style={directedStyles.miniSummary}>
        <Pressable accessibilityHint="Opens the directed session Player" accessibilityRole="button" onPress={props.onOpen} style={directedStyles.miniSummaryOpen}>
          <Text
            android_hyphenationFrequency="none"
            lineBreakStrategyIOS="standard"
            numberOfLines={adaptiveTextLayout.allowConstrainedSingleLine ? 1 : undefined}
            style={directedStyles.miniTitle}
            textBreakStrategy="balanced"
          >
            {props.state.title}
          </Text>
          <Text
            accessibilityLiveRegion="polite"
            android_hyphenationFrequency="none"
            lineBreakStrategyIOS="standard"
            numberOfLines={adaptiveTextLayout.allowConstrainedSingleLine ? 1 : undefined}
            style={directedStyles.miniPhase}
            textBreakStrategy="balanced"
          >
            {props.state.phaseLabel}
          </Text>
          {props.state.pendingSteering ? <Text style={directedStyles.pendingText}>● Change pending</Text> : null}
        </Pressable>
        <DirectedProgressV1 state={props.state} compact />
      </View>
      <DirectedButtonV1 label={transportControls.primaryLabel} onPress={props.onTransport} busy={props.disabled} secondary disabled={!transportControls.primaryEnabled} />
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
  surfaceHeadingRef: DirectedHeadingRefV1;
  reduceMotionEnabled: boolean;
  compact: boolean;
  sendingControl: string | null;
  backLabel: string;
  onBack: () => void;
  onTransport: () => void;
  onRestartCurrentPhase: () => void;
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
  const transportControls = projectDirectedTransportControlsV1(props.state, props.sendingControl !== null);
  return (
    <View>
      <DirectedButtonV1 label={props.backLabel} onPress={props.onBack} secondary />
      <View style={directedStyles.playerCard}>
        <AtmosphericSceneV1 sceneId={props.state.sceneId as DirectedSceneIdV1} phaseIndex={props.state.phaseIndex} reduceMotionEnabled={props.reduceMotionEnabled} />
        <Text style={directedStyles.eyebrow}>Now playing · {props.state.title}</Text>
        <Text ref={props.surfaceHeadingRef} accessibilityLiveRegion="polite" accessibilityRole="header" style={directedStyles.phaseTitle}>{props.state.phaseLabel}</Text>
        <Text style={directedStyles.nextCopy}>{props.state.nextPhaseLabel ? `Next · ${props.state.nextPhaseLabel}` : "Final phase"}</Text>
        <View style={[
          directedStyles.progressCopyRow,
          props.compact ? directedStyles.progressCopyRowCompact : null,
        ]}>
          <Text style={directedStyles.progressCopy}>{formatDirectedTimeV1(props.state.playedElapsedMs)} / {formatDirectedTimeV1(props.state.durationMs)}</Text>
          <Text style={directedStyles.progressCopy}>{formatDirectedTimeV1(remaining)} left</Text>
        </View>
        <DirectedProgressV1 state={props.state} />
        <Text style={directedStyles.progressReadOnlyCopy}>Progress indicator · read-only</Text>
      </View>
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
      <View style={[directedStyles.transportRow, props.compact ? directedStyles.transportRowCompact : null]}>
        <DirectedButtonV1 label={transportControls.primaryLabel} onPress={props.onTransport} busy={props.sendingControl === "transport"} disabled={!transportControls.primaryEnabled} />
        <DirectedButtonV1 label="Restart current phase" onPress={props.onRestartCurrentPhase} busy={props.sendingControl === "transport"} secondary disabled={!transportControls.restartEnabled} />
        <DirectedButtonV1 label="End session" onPress={props.onEnd} busy={props.sendingControl === "transport"} destructive disabled={!transportControls.endEnabled} />
      </View>
      <Text accessibilityRole="header" style={directedStyles.sectionTitle}>Steering</Text>
      <Text style={directedStyles.body}>Changes apply at the next safe point.</Text>
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
          style={({ pressed }) => [directedStyles.steeringControl, directedStyles.steeringControlWide, pendingTexture ? directedStyles.steeringSelected : null, pressed ? directedStyles.pressed : null]}
        >
          <Text style={directedStyles.steeringLabel}>Different texture</Text>
          <Text style={directedStyles.steeringState}>{props.sendingControl === "different-texture" ? "Sending…" : pendingTexture ? "Pending · tap to cancel" : "Compatible pair"}</Text>
        </Pressable>
      </View>
      <View style={directedStyles.listeningStatusPanel}>
        <Text style={directedStyles.statusRow}>Session remaining · {formatDirectedTimeV1(remaining)} · ends with {score.phases.at(-1)?.label}</Text>
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
        <Text style={directedStyles.streamingState}>{props.state.playingOffline ? "Playing offline" : "Streaming"}</Text>
      </View>
      <DirectedButtonV1 label="Adjust this session" onPress={props.onAdjust} secondary />
    </View>
  );
}

function DirectedCompletionV1(props: Readonly<{
  state: NativeDirectedSessionStateV1;
  surfaceHeadingRef: DirectedHeadingRefV1;
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
      <Text ref={props.surfaceHeadingRef} accessibilityLiveRegion="polite" accessibilityRole="header" style={directedStyles.title}>Session complete.</Text>
      <Text style={directedStyles.body}>{props.state.title} · {formatDirectedTimeV1(props.state.durationMs)} · full session.</Text>
      <Text style={directedStyles.sectionTitle}>Your path.</Text>
      <Text style={directedStyles.statusBanner}>{props.state.pathHistory.length ? `${props.state.pathHistory.length} steering change${props.state.pathHistory.length === 1 ? "" : "s"} shaped this path.` : "Original authored path."}</Text>
      <DirectedButtonV1 label="Replay this path" onPress={props.onReplayPath} disabled={props.busy} />
      <DirectedButtonV1 label="Replay original" onPress={props.onReplayOriginal} disabled={props.busy} secondary />
      <DirectedButtonV1 label={props.saved ? "Saved" : "Save this path"} onPress={props.onSave} disabled={props.busy || props.saved} secondary />
      <DirectedButtonV1 label="More like this" onPress={props.onMore} disabled={props.busy} secondary />
      {props.message ? <Text accessibilityLiveRegion="polite" style={directedStyles.statusBanner}>{props.message}</Text> : null}
      <Text style={directedStyles.sectionLabel}>How did this path feel?</Text>
      <View style={directedStyles.feedbackRow}>
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
  surfaceHeadingRef: DirectedHeadingRefV1;
  busy: boolean;
  onBack: () => void;
  onTrim: (layerId: string, trimDb: -3 | 0 | 3) => void;
  onToggle: (layerId: string, enabled: boolean) => void;
}>) {
  const score = getDirectedSceneScoreV1(props.state.sceneId as DirectedSceneIdV1);
  return (
    <View>
      <Text ref={props.surfaceHeadingRef} accessibilityRole="header" style={directedStyles.title}>Adjust this session</Text>
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
  compact: boolean;
  onOpen: () => void;
  onDownload: () => void;
}>) {
  const score = getDirectedSceneScoreV1(props.sceneId);
  const featured = props.sceneId === "rain-desk-v1";
  const stateLabel = props.availability.state === "content-gated" || props.availability.state === "native-unavailable"
    ? "Not available"
    : props.availability.state === "active-session"
      ? "Session active"
      : props.availability.state === "reconciling" || props.availability.state === "checking"
        ? "Checking availability"
        : props.availability.offlineReady
          ? "Available offline"
          : props.availability.state === "downloading"
          ? `Downloading ${props.availability.verifiedCount} of ${props.availability.totalCount}`
        : props.availability.state === "package-corrupt"
          ? "Download needs attention"
          : props.availability.state === "offline-missing"
              ? "Streaming unavailable"
              : "Streaming available";
  const canDownload = props.availability.state === "ready-to-stream" || props.availability.state === "package-corrupt";
  return (
    <View
      style={[
        directedStyles.sessionCard,
        featured ? directedStyles.sessionCardFeatured : null,
        props.compact ? directedStyles.sessionCardCompact : null,
      ]}
    >
      <Pressable
        accessibilityHint={props.availability.state === "active-session" ? "Opens the active Directed Player" : "Opens session details without starting audio"}
        accessibilityLabel={`${score.title} session`}
        accessibilityRole="button"
        onPress={props.onOpen}
        style={({ pressed }) => pressed ? directedStyles.pressed : null}
      >
        <View style={[directedStyles.sessionCardMain, featured ? directedStyles.sessionCardMainFeatured : null, props.compact ? directedStyles.sessionCardMainCompact : null]}>
          <View style={[directedStyles.sessionArtwork, featured ? directedStyles.sessionArtworkFeatured : null, props.compact ? directedStyles.sessionArtworkCompact : null]}>
            <AtmosphericSceneV1 compact={!featured} sceneId={props.sceneId} phaseIndex={0} reduceMotionEnabled={props.reduceMotionEnabled} />
          </View>
          <View style={directedStyles.sessionCardCopy}>
            <View style={[
              directedStyles.sessionCardHeader,
              props.compact ? directedStyles.sessionCardHeaderCompact : null,
            ]}>
              <View style={directedStyles.sessionCardTitleBlock}>
                <Text style={directedStyles.cardTitle}>{score.title}</Text>
                <Text style={directedStyles.cardTrajectory}>{score.trajectory}</Text>
              </View>
              <Text
                accessibilityElementsHidden
                allowFontScaling={false}
                importantForAccessibility="no"
                style={directedStyles.chevron}
              >
                ›
              </Text>
            </View>
            <Text style={directedStyles.meta}>{Math.round(score.durationMs / 60_000)} min · No voice{featured ? " · Headphones + speakers" : ""}</Text>
            <Text style={directedStyles.body}>{score.cardCopy}</Text>
          </View>
        </View>
      </Pressable>
      <View style={directedStyles.sessionCardFooter}>
        <Text accessibilityLiveRegion="polite" style={directedStyles.downloadState}>{stateLabel}</Text>
        {props.availability.offlineReady || ["active-session", "checking", "reconciling"].includes(props.availability.state) ? null : (
          <Pressable
            accessibilityLabel={`Download ${score.title} for offline listening`}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canDownload }}
            disabled={!canDownload}
            onPress={(event) => {
              event.stopPropagation();
              props.onDownload();
            }}
            style={({ pressed }) => [directedStyles.downloadAction, !canDownload ? directedStyles.disabled : null, pressed ? directedStyles.pressed : null]}
          >
            <Text style={directedStyles.downloadActionText}>{props.availability.state === "package-corrupt" ? "Retry download" : "↓  Download"}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export function DirectedSessionsExperienceV1(props: Readonly<{
  initialTab?: DirectedTabV1;
  classicMiniPlayerOverlay: ClassicMiniPlayerOverlayMetricsV1;
  onClassicOverlayLayoutChange: (layout: ClassicMiniPlayerOverlayLayoutV1) => void;
  onOpenClassicLibraryRoute: (route: DirectedClassicRouteV1, returnTab: DirectedTabV1) => void;
}>) {
  const { width, height: screenHeight, fontScale } = useWindowDimensions();
  const adaptiveTextLayout = resolveAdaptiveTextLayoutV1({ width, fontScale });
  const brandHeadingProjection = resolveAdaptiveBrandHeadingProjectionV1({
    width,
    fontScale,
    baseFontSize: 28,
    horizontalInsets: 2 * (classicComponentTokensV1.sectionPadding + classicComponentTokensV1.cardPadding),
  });
  const constrainedEssentialTextPolicy = resolveAdaptiveTextLinePolicyV1({
    fontScale,
    constrained: true,
    essential: true,
  });
  const insets = useSafeAreaInsets();
  const compact = adaptiveTextLayout.stackHeader;
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
  const [remoteFreshness, setRemoteFreshness] = useState<Record<DirectedSceneIdV1, DirectedRemoteFreshnessUiV1>>({
    "rain-desk-v1": "idle",
    "porcelain-table-v1": "idle",
    "soft-wardrobe-v1": "idle",
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
  const [bottomNavigationMeasurement, setBottomNavigationMeasurement] = useState<AdaptiveDockMeasurementV1>({
    layoutKey: "",
    height: 0,
  });
  const [miniPlayerMeasurement, setMiniPlayerMeasurement] = useState<AdaptiveDockMeasurementV1>({
    layoutKey: "",
    height: 0,
  });
  const bottomNavigationContentHeight = resolveAdaptiveDockHeightV1({
    layoutKey: adaptiveTextLayout.layoutKey,
    measurement: bottomNavigationMeasurement,
    provisionalHeight: resolveAdaptiveNavigationHeightV1({
      itemCount: directedNavigationV1.length,
      fontScale,
      normalHeight: 58,
      minimumTouchTarget: classicComponentTokensV1.controlMinHeight,
    }),
  }).height;
  const miniPlayerMeasuredHeight = resolveAdaptiveDockHeightV1({
    layoutKey: adaptiveTextLayout.layoutKey,
    measurement: miniPlayerMeasurement,
    provisionalHeight: resolveAdaptiveMiniPlayerProvisionalHeightV1({
      actionCount: 1,
      fontScale,
      normalHeight: compact ? 118 : 82,
    }),
  }).height;
  const adaptiveDockViewport = useMemo(() => resolveAdaptivePersistentDockViewportV1({
    viewportHeight: screenHeight,
    fontScale,
    safeAreaBottom: insets.bottom,
    navigationHeight: bottomNavigationContentHeight,
    miniPlayerHeight: miniPlayerMeasuredHeight,
  }), [bottomNavigationContentHeight, fontScale, insets.bottom, miniPlayerMeasuredHeight, screenHeight]);
  const [bottomActionClusterMeasurement, setBottomActionClusterMeasurement] = useState<AdaptiveDockMeasurementV1>({
    layoutKey: "",
    height: 0,
  });
  const bottomActionClusterHeight = resolveAdaptiveDockHeightV1({
    layoutKey: adaptiveTextLayout.layoutKey,
    measurement: bottomActionClusterMeasurement,
    provisionalHeight: resolveAdaptiveActionClusterProvisionalHeightV1({
      actionCount: 2,
      fontScale,
      minimumTouchTarget: classicComponentTokensV1.controlMinHeight,
    }),
  }).height;
  const projectionInFlight = useRef<Promise<NativeDirectedSessionStateV1 | null> | null>(null);
  const mountedRef = useRef(false);
  const lifecycleEpochRef = useRef(0);
  const ownerProjectionRequestIdRef = useRef(0);
  const checkpointProjectionEpochRef = useRef(new DirectedCheckpointProjectionEpochV1());
  const availabilityRequestIdRef = useRef(0);
  const foregroundReconciliationCoordinatorRef = useRef(new DirectedForegroundReconciliationCoordinatorV1());
  const transportLifecycleEpochRef = useRef(new DirectedTransportLifecycleEpochV1());
  const readinessCoordinator = useMemo(() => createDirectedReadinessCoordinatorV1({
    loadStable: () => directedSessionServiceV1.getStableAvailabilities(DIRECTED_SCENE_IDS_V1),
    probeRemote: canReachRemoteMediaSourceV1,
  }), []);

  const refreshAvailability = useCallback(async () => {
    const lifecycleEpoch = lifecycleEpochRef.current;
    const requestId = ++availabilityRequestIdRef.current;
    const capability = await directedSessionServiceV1.refreshCapability();
    if (!mountedRef.current || lifecycleEpochRef.current !== lifecycleEpoch || availabilityRequestIdRef.current !== requestId) return;
    setCapabilityReady(capability === 1);
    if (capability !== 1) {
      setRemoteFreshness({ "rain-desk-v1": "idle", "porcelain-table-v1": "idle", "soft-wardrobe-v1": "idle" });
      return;
    }
    const stable = await readinessCoordinator.restoreStable();
    if (!mountedRef.current || lifecycleEpochRef.current !== lifecycleEpoch || availabilityRequestIdRef.current !== requestId) return;
    setAvailability(stable);
    setRemoteFreshness(Object.fromEntries(directedSceneScoresV1.map((score) => [
      score.sceneId,
      score.productionEligible && stable[score.sceneId].state !== "active-session" && stable[score.sceneId].startable && !stable[score.sceneId].offlineReady ? "checking" : "idle",
    ])) as Record<DirectedSceneIdV1, DirectedRemoteFreshnessUiV1>);
    for (const score of directedSceneScoresV1) {
      if (!score.productionEligible || stable[score.sceneId].state === "active-session" || !stable[score.sceneId].startable || stable[score.sceneId].offlineReady) continue;
      void readinessCoordinator.refreshRemote(score.assets[0].sourceUri).then(async (result) => {
        if (!result.current || !mountedRef.current || lifecycleEpochRef.current !== lifecycleEpoch || availabilityRequestIdRef.current !== requestId) return;
        setRemoteFreshness((current) => ({ ...current, [score.sceneId]: result.status }));
        if (result.status !== "unreachable") return;
        const unavailable = await directedSessionServiceV1.getAvailability(score.sceneId, false);
        if (!mountedRef.current || lifecycleEpochRef.current !== lifecycleEpoch || availabilityRequestIdRef.current !== requestId) return;
        setAvailability((current) => ({
          ...current,
          [score.sceneId]: projectDirectedRemoteFreshnessAvailabilityV1(current[score.sceneId], unavailable, result.status),
        }));
      });
    }
  }, [readinessCoordinator]);

  const projectCurrentFromNative = useCallback(async (): Promise<NativeDirectedSessionStateV1 | null> => {
    if (projectionInFlight.current) return projectionInFlight.current;
    const lifecycleEpoch = lifecycleEpochRef.current;
    const ownerProjectionRequestId = ownerProjectionRequestIdRef.current;
    const pending = directedSessionServiceV1.queryDirectedSession();
    projectionInFlight.current = pending;
    try {
      const state = await pending;
      if (
        mountedRef.current
        && lifecycleEpochRef.current === lifecycleEpoch
        && ownerProjectionRequestIdRef.current === ownerProjectionRequestId
      ) setNativeState(state);
      return state;
    } finally {
      if (projectionInFlight.current === pending) projectionInFlight.current = null;
    }
  }, []);

  const reconcileForeground = useCallback(async () => {
    const lifecycleEpoch = lifecycleEpochRef.current;
    const checkpointProjectionEpoch = checkpointProjectionEpochRef.current.capture();
    const transportLifecycleToken = transportLifecycleEpochRef.current.captureLifecycle();
    const requestId = ++availabilityRequestIdRef.current;
    ownerProjectionRequestIdRef.current += 1;
    readinessCoordinator.supersede();
    setAvailability((current) => Object.freeze(Object.fromEntries(DIRECTED_SCENE_IDS_V1.map((sceneId) => [
      sceneId,
      projectDirectedAvailabilityReconcilingV1(current[sceneId]),
    ])) as Record<DirectedSceneIdV1, DirectedAvailabilityProjectionV1>));
    setRemoteFreshness({ "rain-desk-v1": "idle", "porcelain-table-v1": "idle", "soft-wardrobe-v1": "idle" });
    try {
      const result = await foregroundReconciliationCoordinatorRef.current.reconcile(
        async () => directedSessionServiceV1.reconcileForegroundSnapshot(DIRECTED_SCENE_IDS_V1),
      );
      if (
        !result.current
        || !mountedRef.current
        || lifecycleEpochRef.current !== lifecycleEpoch
        || availabilityRequestIdRef.current !== requestId
        || !checkpointProjectionEpochRef.current.isCurrent(checkpointProjectionEpoch)
        || !transportLifecycleEpochRef.current.isLifecycleCurrent(transportLifecycleToken)
      ) return;
      const snapshot = result.value;
      const capability = Object.values(snapshot.availability).some((item) => item.state !== "native-unavailable");
      setCapabilityReady(capability);
      setAvailability(snapshot.availability);
      setNativeState(snapshot.nativeState);
      setCheckpoint(snapshot.checkpoint);
      const freshness = Object.fromEntries(directedSceneScoresV1.map((score) => {
        const stable = snapshot.availability[score.sceneId];
        const active = snapshot.nativeState?.sceneId === score.sceneId
          && ["playing", "paused", "interrupted"].includes(snapshot.nativeState.transport);
        return [score.sceneId, score.productionEligible && !active && stable.startable && !stable.offlineReady ? "checking" : "idle"];
      })) as Record<DirectedSceneIdV1, DirectedRemoteFreshnessUiV1>;
      setRemoteFreshness(freshness);
      for (const score of directedSceneScoresV1) {
        if (freshness[score.sceneId] !== "checking") continue;
        void readinessCoordinator.refreshRemote(score.assets[0].sourceUri).then(async (remote) => {
          if (
            !remote.current
            || !mountedRef.current
            || lifecycleEpochRef.current !== lifecycleEpoch
            || availabilityRequestIdRef.current !== requestId
          ) return;
          setRemoteFreshness((current) => ({ ...current, [score.sceneId]: remote.status }));
          if (remote.status !== "unreachable") return;
          const unavailable = await directedSessionServiceV1.getAvailability(score.sceneId, false);
          if (
            !mountedRef.current
            || lifecycleEpochRef.current !== lifecycleEpoch
            || availabilityRequestIdRef.current !== requestId
          ) return;
          setAvailability((current) => ({
            ...current,
            [score.sceneId]: projectDirectedRemoteFreshnessAvailabilityV1(current[score.sceneId], unavailable, remote.status),
          }));
        });
      }
    } catch {
      if (
        !mountedRef.current
        || lifecycleEpochRef.current !== lifecycleEpoch
        || availabilityRequestIdRef.current !== requestId
      ) return;
      setCapabilityReady((await directedSessionServiceV1.refreshCapability()) === 1);
    }
  }, [readinessCoordinator]);

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
      if (!mountedRef.current || lifecycleEpochRef.current !== lifecycleEpoch) return;
      foregroundReconciliationCoordinatorRef.current.supersede("package-mutation");
      availabilityRequestIdRef.current += 1;
      setAvailability((current) => ({ ...current, [sceneId]: next }));
    });
    void Promise.all([
      reconcileForeground(),
      directedSessionServiceV1.loadSavedPaths(),
    ]).then(([, storedPaths]) => {
      if (!mountedRef.current || lifecycleEpochRef.current !== lifecycleEpoch) return;
      setSavedPaths(storedPaths);
    });
    const appState = AppState.addEventListener("change", (next) => {
      if (!mountedRef.current || lifecycleEpochRef.current !== lifecycleEpoch) return;
      setDirectedAppState(next);
      if (next === "active") {
        void reconcileForeground();
      } else {
        transportLifecycleEpochRef.current.supersedeLifecycle();
        ownerProjectionRequestIdRef.current += 1;
        availabilityRequestIdRef.current += 1;
        foregroundReconciliationCoordinatorRef.current.supersede(next === "background" ? "background" : "inactive");
        readinessCoordinator.supersede();
      }
    });
    return () => {
      mountedRef.current = false;
      transportLifecycleEpochRef.current.supersedeLifecycle();
      checkpointProjectionEpochRef.current.supersede();
      ownerProjectionRequestIdRef.current += 1;
      availabilityRequestIdRef.current += 1;
      foregroundReconciliationCoordinatorRef.current.supersede("unmount");
      readinessCoordinator.supersede();
      if (lifecycleEpochRef.current === lifecycleEpoch) lifecycleEpochRef.current += 1;
      motion.remove();
      removeState();
      removePackage();
      appState.remove();
    };
  }, [reconcileForeground, readinessCoordinator]);

  const surfaceHeadingRef = useRef<React.ElementRef<typeof Text> | null>(null);
  const placeSurfaceFocus = useCallback(() => {
    const node = findNodeHandle(surfaceHeadingRef.current);
    if (node !== null) AccessibilityInfo.setAccessibilityFocus(node);
  }, []);

  useEffect(() => {
    if (capabilityReady === null) return;
    const focusTimer = setTimeout(placeSurfaceFocus, 0);
    return () => clearTimeout(focusTimer);
  }, [capabilityReady, directedAppState, placeSurfaceFocus, screen, tab]);

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
    directedSessionServiceV1.beginActivationTrace();
    directedSessionServiceV1.recordActivationCurrentness(mountedRef.current && lifecycleEpochRef.current === lifecycleEpoch);
    setBusy(true);
    setMessage(null);
    setCompletionSaved(false);
    try {
      const state = await directedSessionServiceV1.createDirectedSession(input);
      if (!canSettleUi(lifecycleEpoch, state)) return;
      checkpointProjectionEpochRef.current.supersede();
      setCheckpoint(null);
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
    const transportToken = transportLifecycleEpochRef.current.beginTransportAction();
    ownerProjectionRequestIdRef.current += 1;
    setBusy(true);
    try {
      const next = await directedSessionServiceV1.dispatchDirectedSession(
        nativeState.transport === "playing" ? "pause" : "resume",
        undefined,
        nativeState,
      );
      if (canSettleUi(lifecycleEpoch, next) && transportLifecycleEpochRef.current.isTransportCurrent(transportToken)) {
        setNativeState(next);
        AccessibilityInfo.announceForAccessibility(next.transport === "paused" ? "Session paused." : "Session resumed.");
      }
    } catch (error) {
      if (canSettleUi(lifecycleEpoch) && transportLifecycleEpochRef.current.isTransportCurrent(transportToken)) {
        setMessage(error instanceof Error && error.message === "DIRECTED_RENDERED_OWNER_STALE"
          ? "The Player changed. Its current controls were left unchanged."
          : "That playback control couldn’t be completed. Try again.");
      }
    } finally {
      if (canSettleUi(lifecycleEpoch) && transportLifecycleEpochRef.current.isTransportCurrent(transportToken)) setBusy(false);
    }
  };

  const restartCurrentPhase = async () => {
    if (!nativeState || !["playing", "paused", "interrupted"].includes(nativeState.transport)) return;
    const expectedOwner = nativeState;
    const lifecycleEpoch = lifecycleEpochRef.current;
    const transportToken = transportLifecycleEpochRef.current.beginTransportAction();
    ownerProjectionRequestIdRef.current += 1;
    setBusy(true);
    setMessage(null);
    try {
      const next = await directedSessionServiceV1.restartCurrentDirectedPhase(expectedOwner);
      if (!canSettleUi(lifecycleEpoch, next) || !transportLifecycleEpochRef.current.isTransportCurrent(transportToken)) return;
      setNativeState(next);
      AccessibilityInfo.announceForAccessibility(`${next.phaseLabel} restarted from the beginning.`);
    } catch (error) {
      if (canSettleUi(lifecycleEpoch) && transportLifecycleEpochRef.current.isTransportCurrent(transportToken)) {
        setMessage(error instanceof Error && error.message === "DIRECTED_RENDERED_OWNER_STALE"
          ? "The Player changed. The current phase was not restarted."
          : "The current phase couldn’t be restarted. Playback was left unchanged.");
      }
    } finally {
      if (canSettleUi(lifecycleEpoch) && transportLifecycleEpochRef.current.isTransportCurrent(transportToken)) setBusy(false);
    }
  };

  const endSession = () => {
    if (!nativeState) return;
    const expectedOwner = nativeState;
    Alert.alert("End this session?", undefined, [
    { text: "Keep listening", style: "cancel" },
    { text: "End session", style: "destructive", onPress: () => {
      const lifecycleEpoch = lifecycleEpochRef.current;
      const transportToken = transportLifecycleEpochRef.current.beginTransportAction();
      ownerProjectionRequestIdRef.current += 1;
      setBusy(true);
      void directedSessionServiceV1.endDirectedSession(expectedOwner).then((ended) => {
        if (!canSettleUi(lifecycleEpoch) || !transportLifecycleEpochRef.current.isTransportCurrent(transportToken)) return;
        if (ended.sessionId !== expectedOwner.sessionId || ended.generationId !== expectedOwner.generationId) return;
        const current = directedSessionServiceV1.currentDirectedSession();
        if (current && (current.sessionId !== expectedOwner.sessionId || current.generationId !== expectedOwner.generationId)) {
          setNativeState(current);
          setScreen("player");
          return;
        }
        checkpointProjectionEpochRef.current.supersede();
        setCheckpoint(null);
        setNativeState(null);
        setScreen("ended");
      }).catch(() => {
        if (canSettleUi(lifecycleEpoch) && transportLifecycleEpochRef.current.isTransportCurrent(transportToken)) setMessage("The session couldn’t be ended because its playback ownership changed. The current session was left unchanged.");
      }).finally(() => {
        if (canSettleUi(lifecycleEpoch) && transportLifecycleEpochRef.current.isTransportCurrent(transportToken)) setBusy(false);
      });
    } },
    ]);
  };

  const steer = async (axis: DirectedSteeringAxisV1) => {
    if (!nativeState) return;
    const lifecycleEpoch = lifecycleEpochRef.current;
    setSendingControl(axis);
    try {
      const next = await directedSessionServiceV1.steerDirectedSession(axis, nextLevel(nativeState.appliedSteering[axis]));
      if (!canSettleUi(lifecycleEpoch, next)) return;
      setNativeState(next);
      AccessibilityInfo.announceForAccessibility("Change pending. It will apply at the next safe point.");
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
      allowRemote: true,
      initialAppliedSteering: mode === "path" ? nativeState.appliedSteering : ORIGINAL_DIRECTED_STEERING_V1,
      initialManualTrims: mode === "path" ? nativeState.manualTrims : {},
    });
  };

  const downloadPackageForScene = async (sceneId: DirectedSceneIdV1) => {
    const current = availability[sceneId];
    if (current.state !== "ready-to-stream" && current.state !== "package-corrupt") return;
    setAvailability((previous) => ({
      ...previous,
      [sceneId]: {
        ...previous[sceneId],
        state: "downloading",
        customerCopy: `Downloading ${previous[sceneId].verifiedCount} of ${previous[sceneId].totalCount} sounds…`,
        primaryLabel: "Cancel download",
        secondaryLabel: null,
        startable: false,
        offlineReady: false,
        playingSourceMode: null,
      },
    }));
    try {
      const next = await directedSessionServiceV1.downloadDirectedPackage(sceneId);
      setAvailability((previous) => ({ ...previous, [sceneId]: next }));
    } catch {
      const next = await directedSessionServiceV1.getAvailability(sceneId, true);
      setAvailability((previous) => ({ ...previous, [sceneId]: next }));
      setMessage("A session sound needs to be downloaded again.");
    }
  };

  const visibleAvailabilityFor = (sceneId: DirectedSceneIdV1): DirectedAvailabilityProjectionV1 => (
    projectDirectedActiveSessionAvailabilityV1(availability[sceneId], nativeState)
  );

  const openScene = (sceneId: DirectedSceneIdV1) => {
    const activeSceneSelected = Boolean(
      nativeState
      && nativeState.sceneId === sceneId
      && ["playing", "paused", "interrupted"].includes(nativeState.transport),
    );
    setSelectedSceneId(sceneId);
    setOutputProfile("headphones");
    setMessage(null);
    setScreen(activeSceneSelected ? "player" : "detail");
  };

  const renderSessions = () => (
    <View>
      <Text ref={surfaceHeadingRef} accessibilityRole="header" style={directedStyles.title}>Directed Sessions</Text>
      <Text style={directedStyles.body}>Choose an authored sound path.</Text>
      {nativeState && ["playing", "paused", "interrupted"].includes(nativeState.transport) ? (
        <View style={directedStyles.continueCard}>
          <Text style={directedStyles.sectionLabel}>Continue</Text>
          <Text style={directedStyles.cardTitle}>{nativeState.title}</Text>
          <Text style={directedStyles.body}>{nativeState.phaseLabel} · {formatDirectedTimeV1(nativeState.playedElapsedMs)} played · {formatDirectedTimeV1(Math.max(0, nativeState.durationMs - nativeState.playedElapsedMs))} left</Text>
          <DirectedButtonV1 label="Open Player" onPress={() => setScreen("player")} />
        </View>
      ) : checkpoint && isRecoverableDirectedCheckpointV1(checkpoint) ? (
        <View style={directedStyles.continueCard}>
          <Text style={directedStyles.sectionLabel}>Continue</Text>
          <Text style={directedStyles.cardTitle}>{checkpoint.title}</Text>
          <Text style={directedStyles.body}>{checkpoint.phaseLabel} · Restart from this phase with verified sources.</Text>
          <DirectedButtonV1
            label={busy ? "Restarting…" : "Restart current phase"}
            busy={busy}
            disabled={busy}
            onPress={() => void start({
              sceneId: checkpoint.sceneId,
              outputProfile: checkpoint.outputProfile,
              hardAvoidanceIds: checkpoint.hardAvoidanceIds,
              allowRemote: true,
              initialAppliedSteering: checkpoint.appliedSteering,
              initialManualTrims: checkpoint.manualTrims,
              restartAtPhaseIndex: checkpoint.phaseIndex,
              requireAggregateOwnerAbsent: true,
            })}
          />
        </View>
      ) : null}
      <Text style={directedStyles.listSectionLabel}>Featured session</Text>
      {directedSceneScoresV1.filter((score) => score.sceneId === "rain-desk-v1").map((score) => (
        <SessionCardV1
          key={score.sceneId}
          sceneId={score.sceneId}
          availability={visibleAvailabilityFor(score.sceneId)}
          reduceMotionEnabled={reduceMotionEnabled}
          compact={compact}
          onOpen={() => openScene(score.sceneId)}
          onDownload={() => { void downloadPackageForScene(score.sceneId); }}
        />
      ))}
      <Text style={directedStyles.listSectionLabel}>More sessions</Text>
      {directedSceneScoresV1.filter((score) => score.sceneId !== "rain-desk-v1").map((score) => (
        <SessionCardV1
          key={score.sceneId}
          sceneId={score.sceneId}
          availability={visibleAvailabilityFor(score.sceneId)}
          reduceMotionEnabled={reduceMotionEnabled}
          compact={compact}
          onOpen={() => openScene(score.sceneId)}
          onDownload={() => { void downloadPackageForScene(score.sceneId); }}
        />
      ))}
    </View>
  );

  const renderLibrary = () => (
    <View>
      <Text ref={surfaceHeadingRef} accessibilityRole="header" style={directedStyles.title}>Library</Text>
      <Text style={directedStyles.body}>Classic sounds and static mixes remain available here.</Text>
      <View style={directedStyles.gatewayCard}>
        <Text style={directedStyles.sectionTitle}>Choose how to listen</Text>
        <DirectedButtonV1 label="Find a sound" onPress={() => openClassic("fast-start")} />
        <DirectedButtonV1 label="Browse sounds" onPress={() => openClassic("browse")} secondary />
        <DirectedButtonV1 label="Presets" onPress={() => openClassic("presets")} secondary />
        <DirectedButtonV1 label="Build a mix" onPress={() => openClassic("presets")} secondary />
      </View>
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
      <Text ref={surfaceHeadingRef} accessibilityRole="header" style={directedStyles.title}>Saved</Text>
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
      <View style={directedStyles.gatewayCard}>
        <Text style={directedStyles.sectionTitle}>Mixes</Text>
        <DirectedButtonV1 label="Open saved mixes" onPress={() => openClassic("saved-mixes")} secondary />
        <Text style={directedStyles.sectionTitle}>Sounds</Text>
        <DirectedButtonV1 label="Open saved sounds" onPress={() => openClassic("saved-sounds")} secondary />
      </View>
    </View>
  );

  const renderDetail = () => {
    const available = visibleAvailabilityFor(selectedSceneId);
    const activeSceneSelected = Boolean(
      nativeState
      && nativeState.sceneId === selectedSceneId
      && ["playing", "paused", "interrupted"].includes(nativeState.transport),
    );
    const freshness = remoteFreshness[selectedSceneId];
    const transportAvailability = available.offlineReady
      ? "Available offline"
      : !available.startable
        ? "Streaming unavailable"
        : freshness === "checking"
          ? "Checking connection…"
          : freshness === "reachable"
            ? "Streaming available"
            : freshness === "unreachable"
              ? "Connection unavailable"
              : freshness === "timeout"
                ? "Connection not confirmed"
                : "Streaming available";
    const customerReadinessCopy = available.offlineReady || !available.startable
      ? available.customerCopy
      : freshness === "checking"
        ? "Ready to start. Checking the connection in the background…"
        : freshness === "timeout"
          ? "Ready to start. The connection could not be confirmed."
          : available.customerCopy;
    const downloadActionLabel = activeSceneSelected
      ? null
      : available.state === "ready-to-stream"
        ? "Download"
        : available.state === "package-corrupt"
          ? "Retry download"
          : null;
    return (
      <View>
        <DirectedButtonV1 label="Back" onPress={() => setScreen("root")} secondary />
        <View style={directedStyles.detailCard}>
          <AtmosphericSceneV1 sceneId={selectedSceneId} phaseIndex={0} reduceMotionEnabled={reduceMotionEnabled} />
          <Text ref={surfaceHeadingRef} accessibilityRole="header" style={directedStyles.title}>{selectedScore.title}</Text>
          <Text style={directedStyles.cardTrajectory}>{selectedVariant.trajectory}</Text>
          <Text style={directedStyles.meta}>{Math.round(selectedScore.durationMs / 60_000)} min · No voice · {transportAvailability}</Text>
          <View style={directedStyles.sessionPathCard}>
            <Text style={directedStyles.sectionLabel}>Session path</Text>
            <Text style={directedStyles.sessionPathCopy}>{selectedScore.phases.map((phase) => phase.label).join("  →  ")}</Text>
          </View>
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
          <Text accessibilityLiveRegion="polite" style={selectedVariant.blocked || !available.startable ? directedStyles.warning : directedStyles.statusBanner}>{selectedVariant.blocked ? selectedVariant.customerCopy : customerReadinessCopy}</Text>
          <View
            onLayout={({ nativeEvent }) => setBottomActionClusterMeasurement({
              layoutKey: adaptiveTextLayout.layoutKey,
              height: nativeEvent.layout.height,
            })}
            style={directedStyles.bottomActionCluster}
          >
            <DirectedButtonV1
              label={activeSceneSelected ? "Open Player" : busy ? "Starting…" : selectedVariant.blocked || !available.startable ? "Start unavailable" : "Start session"}
              onPress={() => activeSceneSelected ? setScreen("player") : void start({ sceneId: selectedSceneId, outputProfile, hardAvoidanceIds: selectedAvoidances, allowRemote: true })}
              busy={busy}
              disabled={busy || (!activeSceneSelected && (selectedVariant.blocked || !available.startable))}
            />
            {downloadActionLabel ? <DirectedButtonV1 label={downloadActionLabel} onPress={() => { void downloadPackageForScene(selectedSceneId); }} secondary /> : null}
            {available.state === "offline-missing" ? <DirectedButtonV1 label="Try again when online" onPress={() => void refreshAvailability()} secondary /> : null}
            {available.state === "downloading" ? <DirectedButtonV1 label="Cancel download" onPress={() => directedSessionServiceV1.cancelDirectedPackageDownload(selectedSceneId)} secondary /> : null}
          </View>
          {message ? <Text accessibilityLiveRegion="assertive" style={directedStyles.warning}>{message}</Text> : null}
        </View>
      </View>
    );
  };

  const content = (() => {
    if (capabilityReady === null) return <View accessibilityLabel="Checking this session availability" accessibilityState={{ busy: true }} accessible style={directedStyles.center}><ActivityIndicator color={classicVisualThemeV1.accentDeep} /><Text style={directedStyles.body}>Checking this session…</Text></View>;
    if (!capabilityReady) return <View><Text ref={surfaceHeadingRef} accessibilityRole="alert" style={directedStyles.title}>Sessions are unavailable in this build.</Text><DirectedButtonV1 label="Open Library" onPress={() => setTab("library")} /><DirectedButtonV1 label="Try again" onPress={() => void refreshAvailability()} secondary /></View>;
    if (screen === "detail") return renderDetail();
    if (screen === "player" && nativeState) return <DirectedPlayerV1 state={nativeState} surfaceHeadingRef={surfaceHeadingRef} reduceMotionEnabled={reduceMotionEnabled} compact={compact} sendingControl={sendingControl ?? (busy ? "transport" : null)} backLabel={`Back to ${tab === "sessions" ? "Sessions" : tab === "library" ? "Library" : "Saved"}`} onBack={() => setScreen("root")} onTransport={() => void handleTransport()} onRestartCurrentPhase={() => void restartCurrentPhase()} onEnd={endSession} onSteer={(axis) => void steer(axis)} onTexture={() => void texture()} onUndo={() => void undo()} onProfile={(next) => void profile(next)} onAdjust={() => setScreen("adjust")} />;
    if (screen === "adjust" && nativeState) return <DirectedAdjustV1 state={nativeState} surfaceHeadingRef={surfaceHeadingRef} busy={sendingControl !== null} onBack={() => setScreen("player")} onTrim={(layerId, trimDb) => void adjustLayer(layerId, { trimDb })} onToggle={(layerId, enabled) => void adjustLayer(layerId, { enabled })} />;
    if (screen === "completion" && nativeState) return <DirectedCompletionV1 state={nativeState} surfaceHeadingRef={surfaceHeadingRef} saved={completionSaved} busy={busy} message={message} onReplayPath={() => void replay("path")} onReplayOriginal={() => void replay("original")} onSave={() => { setBusy(true); void directedSessionServiceV1.saveCompletedPath(`${nativeState.title} path`).then((saved) => { setCompletionSaved(true); setMessage("Path saved on this device."); setSavedPaths((current) => [...current, saved]); }).catch(() => setMessage("This path wasn’t saved. Your completed session is unchanged.")).finally(() => setBusy(false)); }} onMore={() => { setScreen("root"); setTab("sessions"); }} onFeedback={(value) => void directedSessionServiceV1.saveFeedback(value).then(() => setMessage("Feedback saved on this device."))} />;
    if (screen === "ended") return <View style={directedStyles.endedCard}><Text ref={surfaceHeadingRef} accessibilityRole="header" style={directedStyles.title}>Session ended early</Text><Text style={directedStyles.body}>This was not saved as a completed path.</Text><DirectedButtonV1 label="Start over" onPress={() => setScreen("detail")} /><DirectedButtonV1 label="Back to Sessions" onPress={() => { setScreen("root"); setTab("sessions"); }} secondary /></View>;
    if (screen === "failure") return <View><Text ref={surfaceHeadingRef} accessibilityLiveRegion="assertive" accessibilityRole="alert" style={directedStyles.title}>The session stopped because a sound became unavailable.</Text><Text style={directedStyles.body}>No completion was recorded.</Text><DirectedButtonV1 label="Retry" onPress={() => setScreen("detail")} /><DirectedButtonV1 label="Back to Sessions" onPress={() => { setScreen("root"); setTab("sessions"); }} secondary /></View>;
    const rootContent = tab === "sessions" ? renderSessions() : tab === "library" ? renderLibrary() : renderSaved();
    return <View>{rootContent}{message ? <Text accessibilityLiveRegion="assertive" accessibilityRole="alert" style={directedStyles.warning}>{message}</Text> : null}</View>;
  })();

  const showRootChrome = screen === "root";
  const showMini = nativeState && ["playing", "paused", "interrupted"].includes(nativeState.transport) && screen !== "player" && screen !== "adjust" && screen !== "completion";
  const anyMiniPlayerPresent = Boolean(showMini || props.classicMiniPlayerOverlay.present);
  const activeMiniPlayerHeight = Math.max(
    showMini ? adaptiveDockViewport.miniPlayerViewportHeight : 0,
    props.classicMiniPlayerOverlay.present ? props.classicMiniPlayerOverlay.height : 0,
  );
  const overlayLayout = resolveClassicMiniPlayerOverlayLayoutV1({
    miniPlayerPresent: anyMiniPlayerPresent,
    miniPlayerHeight: activeMiniPlayerHeight,
    bottomNavigationVisible: showRootChrome,
    bottomNavigationContentHeight,
    safeAreaBottom: insets.bottom,
    spacing: classicComponentTokensV1.spacing.md,
    stableActionClusterHeight: screen === "detail" ? bottomActionClusterHeight : 0,
  });
  const miniPlayerBottom = overlayLayout.interactiveBottom;
  const contentBottomPadding = overlayLayout.contentBottomPadding;
  useEffect(() => {
    props.onClassicOverlayLayoutChange(overlayLayout);
  }, [
    overlayLayout.contentBottomPadding,
    overlayLayout.exposedContentGap,
    overlayLayout.interactiveBottom,
    overlayLayout.safeAreaBackgroundExtension,
    overlayLayout.visualSurfaceBottom,
    props.onClassicOverlayLayoutChange,
  ]);
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={directedStyles.safeAreaShell}>
      <View style={[directedStyles.topBar, adaptiveTextLayout.stackHeader ? directedStyles.topBarStacked : null]}>
        <Text
          android_hyphenationFrequency="none"
          lineBreakStrategyIOS="standard"
          maxFontSizeMultiplier={brandHeadingProjection.maximumFontSizeMultiplier}
          numberOfLines={1}
          style={directedStyles.brand}
          textBreakStrategy="balanced"
        >
          Soundscape
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => openClassic("settings")}
          style={({ pressed }) => [directedStyles.headerSettings, pressed ? directedStyles.pressed : null]}
        >
          <Text style={directedStyles.headerSettingsText}>Settings</Text>
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={[
          directedStyles.content,
          adaptiveTextLayout.mode === "accessibility" ? directedStyles.contentAccessibility : null,
          { paddingBottom: contentBottomPadding },
        ]}
      >
        {content}
      </ScrollView>
      {showMini && nativeState && overlayLayout.safeAreaBackgroundExtension > 0 ? (
        <View
          pointerEvents="none"
          style={[
            directedStyles.miniPlayerSafeAreaBackground,
            {
              bottom: overlayLayout.visualSurfaceBottom,
              height: overlayLayout.safeAreaBackgroundExtension,
            },
          ]}
        />
      ) : null}
      {showMini && nativeState ? (
        <ScrollView
          accessibilityLabel="Directed compact Player controls"
          nestedScrollEnabled
          onContentSizeChange={(_width, height) => {
            if (adaptiveTextLayout.mode === "accessibility") {
              setMiniPlayerMeasurement({ layoutKey: adaptiveTextLayout.layoutKey, height });
            }
          }}
          onLayout={({ nativeEvent }) => {
            if (adaptiveTextLayout.mode === "normal") {
              setMiniPlayerMeasurement({
                layoutKey: adaptiveTextLayout.layoutKey,
                height: nativeEvent.layout.height,
              });
            }
          }}
          scrollEnabled={adaptiveDockViewport.miniPlayerScrollEnabled}
          showsVerticalScrollIndicator={adaptiveDockViewport.miniPlayerScrollEnabled}
          style={[
            directedStyles.miniPlayerPlacement,
            { bottom: miniPlayerBottom },
            adaptiveTextLayout.mode === "accessibility"
              ? { maxHeight: adaptiveDockViewport.miniPlayerViewportHeight }
              : null,
          ]}
        >
          <DirectedMiniPlayerV1 state={nativeState} compact={compact} disabled={busy} onOpen={() => setScreen("player")} onTransport={() => void handleTransport()} />
        </ScrollView>
      ) : null}
      {showRootChrome ? (
        <SafeAreaView
          edges={["bottom", "left", "right"]}
          style={directedStyles.bottomNavSafeArea}
        >
          <ScrollView
            accessibilityLabel="Directed session navigation"
            accessibilityRole="tablist"
            contentContainerStyle={[
              directedStyles.bottomNav,
              adaptiveTextLayout.navigationMode === "stacked" ? directedStyles.bottomNavStacked : null,
            ]}
            nestedScrollEnabled
            onContentSizeChange={(_width, height) => {
              if (adaptiveTextLayout.mode === "accessibility") {
                setBottomNavigationMeasurement({ layoutKey: adaptiveTextLayout.layoutKey, height });
              }
            }}
            onLayout={({ nativeEvent }) => {
              if (adaptiveTextLayout.mode === "normal") {
                setBottomNavigationMeasurement({
                  layoutKey: adaptiveTextLayout.layoutKey,
                  height: nativeEvent.layout.height,
                });
              }
            }}
            scrollEnabled={adaptiveDockViewport.navigationScrollEnabled}
            showsVerticalScrollIndicator={adaptiveDockViewport.navigationScrollEnabled}
            style={adaptiveTextLayout.mode === "accessibility"
              ? { maxHeight: adaptiveDockViewport.navigationViewportHeight }
              : undefined}
          >
            {directedNavigationV1.map((item) => (
              <Pressable
                accessibilityLabel={item.label}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === item.key }}
                key={item.key}
                onPress={() => setTab(item.key)}
                style={[
                  directedStyles.navTab,
                  adaptiveTextLayout.navigationMode === "stacked" ? directedStyles.navTabStacked : null,
                  tab === item.key ? directedStyles.navTabSelected : null,
                ]}
              >
                <Text
                  android_hyphenationFrequency="none"
                  lineBreakStrategyIOS="standard"
                  numberOfLines={constrainedEssentialTextPolicy.numberOfLines}
                  style={[directedStyles.navText, tab === item.key ? directedStyles.navTextSelected : null]}
                  textBreakStrategy="balanced"
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </SafeAreaView>
      ) : null}
    </SafeAreaView>
  );
}

const directedStyles = StyleSheet.create({
  safeAreaShell: { flex: 1, backgroundColor: classicVisualThemeV1.background },
  topBar: { minHeight: classicComponentTokensV1.controlMinHeight, paddingHorizontal: classicComponentTokensV1.cardPadding, paddingVertical: classicComponentTokensV1.spacing.xs, marginHorizontal: classicComponentTokensV1.sectionPadding, marginTop: classicComponentTokensV1.spacing.xs, backgroundColor: classicVisualThemeV1.elevated, borderRadius: classicComponentTokensV1.radius.card, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: classicComponentTokensV1.spacing.sm },
  topBarStacked: { alignItems: "stretch", flexDirection: "column" },
  brand: { color: classicVisualThemeV1.text, fontSize: 28, lineHeight: 34, fontWeight: "900", flexShrink: 1 },
  headerSettings: { minHeight: classicComponentTokensV1.controlMinHeight, minWidth: classicComponentTokensV1.controlMinHeight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: classicComponentTokensV1.radius.chip, borderWidth: 1, borderColor: classicVisualPaletteV1.darkEarth, backgroundColor: classicVisualThemeV1.elevated, alignItems: "center", justifyContent: "center" },
  headerSettingsText: { color: classicVisualPaletteV1.darkEarth, fontSize: 13, lineHeight: 18, fontWeight: "900" },
  content: { padding: classicComponentTokensV1.sectionPadding, paddingBottom: 28, gap: classicComponentTokensV1.spacing.md },
  contentAccessibility: { paddingHorizontal: 10 },
  center: { minHeight: 280, alignItems: "center", justifyContent: "center", gap: 12 },
  title: { color: classicVisualThemeV1.text, fontSize: 28, lineHeight: 34, fontWeight: "800", flexShrink: 1 },
  eyebrow: { color: classicVisualThemeV1.accentMist, fontSize: 12, lineHeight: 17, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.4, marginTop: 12 },
  sectionTitle: { color: classicVisualThemeV1.text, fontSize: 20, lineHeight: 26, fontWeight: "800", marginTop: 16 },
  listSectionLabel: { color: classicVisualPaletteV1.darkEarth, fontSize: 17, lineHeight: 23, fontWeight: "800", marginTop: 22, marginBottom: 1 },
  sectionLabel: { color: classicVisualPaletteV1.darkEarth, fontSize: 16, lineHeight: 22, fontWeight: "800", marginTop: 12 },
  body: { color: classicVisualPaletteV1.darkEarth, fontSize: 16, lineHeight: 24, flexShrink: 1 },
  meta: { color: classicVisualPaletteV1.darkEarth, fontSize: 14, lineHeight: 21, fontWeight: "700", flexShrink: 1 },
  warning: { color: classicVisualThemeV1.dangerText, backgroundColor: classicVisualThemeV1.warningSurface, borderRadius: classicComponentTokensV1.radius.control, borderWidth: 1, borderColor: classicVisualThemeV1.dangerText, padding: 12, fontSize: 16, lineHeight: 23, fontWeight: "700" },
  button: { minHeight: classicComponentTokensV1.controlMinHeight, minWidth: classicComponentTokensV1.controlMinHeight, borderRadius: classicComponentTokensV1.radius.chip, borderWidth: 1, borderColor: classicVisualPaletteV1.darkEarth, paddingHorizontal: 20, paddingVertical: 14, backgroundColor: classicVisualThemeV1.accentDeep, alignItems: "center", justifyContent: "center", marginTop: 8, flexShrink: 1 },
  buttonSecondary: { backgroundColor: classicVisualThemeV1.elevated, borderWidth: 1, borderColor: classicVisualPaletteV1.darkEarth },
  buttonDestructive: { backgroundColor: classicVisualThemeV1.warningSurface, borderWidth: 2, borderColor: classicVisualThemeV1.dangerText },
  buttonSelected: { backgroundColor: classicVisualThemeV1.selectedSurface, borderWidth: 3, borderColor: classicVisualPaletteV1.darkEarth },
  buttonText: { color: classicVisualThemeV1.text, fontSize: 16, lineHeight: 21, fontWeight: "800", textAlign: "center", flexShrink: 1 },
  buttonSecondaryText: { color: classicVisualPaletteV1.darkEarth },
  disabled: { opacity: 0.48 },
  pressed: { opacity: 0.74 },
  sessionCard: { backgroundColor: classicVisualThemeV1.elevated, borderRadius: classicComponentTokensV1.radius.card, borderWidth: 1, borderColor: classicVisualThemeV1.borderStrong, marginTop: 12, padding: classicComponentTokensV1.cardPadding, gap: 10, overflow: "hidden" },
  sessionCardFeatured: { padding: 12 },
  sessionCardCompact: { flexDirection: "column", padding: 12 },
  sessionCardMain: { flexDirection: "row", alignItems: "stretch", gap: 12 },
  sessionCardMainFeatured: { flexDirection: "column" },
  sessionCardMainCompact: { flexDirection: "column" },
  sessionArtwork: { width: 132, flexShrink: 0 },
  sessionArtworkFeatured: { width: "100%" },
  sessionArtworkCompact: { width: "100%" },
  sessionCardHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  sessionCardHeaderCompact: { alignItems: "stretch", flexDirection: "column" },
  sessionCardTitleBlock: { flex: 1, minWidth: 0, gap: 2 },
  sessionCardCopy: { flex: 1, minWidth: 0, gap: 5 },
  chevron: { color: classicVisualThemeV1.accentSeaGlass, width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: classicVisualThemeV1.accentDeep, fontSize: 31, lineHeight: 40, fontWeight: "700", textAlign: "center", overflow: "hidden" },
  sessionCardFooter: { borderTopWidth: 1, borderTopColor: classicVisualPaletteV1.sand, paddingTop: 10, flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10 },
  downloadState: { color: classicVisualThemeV1.accentMist, fontSize: 14, lineHeight: 20, fontWeight: "800", flexShrink: 1 },
  downloadAction: { minHeight: classicComponentTokensV1.controlMinHeight, minWidth: 132, borderRadius: classicComponentTokensV1.radius.control, borderWidth: 1, borderColor: classicVisualPaletteV1.darkEarth, paddingHorizontal: 16, paddingVertical: 10, alignItems: "center", justifyContent: "center", backgroundColor: classicVisualThemeV1.elevated },
  downloadActionText: { color: classicVisualThemeV1.text, fontSize: 15, lineHeight: 20, fontWeight: "800" },
  detailCard: { backgroundColor: classicVisualThemeV1.elevated, borderRadius: classicComponentTokensV1.radius.card, borderWidth: 1, borderColor: classicVisualThemeV1.borderStrong, padding: classicComponentTokensV1.sectionPadding, marginTop: 12 },
  sessionPathCard: { backgroundColor: classicVisualThemeV1.surface, borderRadius: classicComponentTokensV1.radius.card, borderWidth: 1, borderColor: classicVisualThemeV1.border, padding: 12, marginTop: 12 },
  sessionPathCopy: { color: classicVisualPaletteV1.darkEarth, fontSize: 15, lineHeight: 23, fontWeight: "700", marginTop: 5 },
  continueCard: { backgroundColor: classicVisualThemeV1.elevated, borderRadius: classicComponentTokensV1.radius.card, borderWidth: 1, borderColor: classicVisualThemeV1.borderStrong, padding: 14, marginTop: 12 },
  savedCard: { backgroundColor: classicVisualThemeV1.elevated, borderRadius: classicComponentTokensV1.radius.card, borderWidth: 1, borderColor: classicVisualThemeV1.border, padding: 14, marginTop: 12 },
  gatewayCard: { backgroundColor: classicVisualThemeV1.elevated, borderRadius: classicComponentTokensV1.radius.card, borderWidth: 1, borderColor: classicVisualThemeV1.borderStrong, gap: 8, padding: 14, marginTop: 12 },
  endedCard: { backgroundColor: classicVisualThemeV1.elevated, borderRadius: classicComponentTokensV1.radius.card, borderWidth: 1, borderColor: classicVisualThemeV1.borderStrong, gap: 8, padding: 14, marginTop: 12 },
  cardTitle: { color: classicVisualThemeV1.text, fontSize: 21, lineHeight: 27, fontWeight: "800", flexShrink: 1 },
  cardTrajectory: { color: classicVisualThemeV1.accentMist, fontSize: 16, lineHeight: 22, fontWeight: "800" },
  offlinePill: { alignSelf: "flex-start", color: classicVisualPaletteV1.forestDeep, backgroundColor: classicVisualPaletteV1.sageMist, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, fontSize: 13, fontWeight: "800", overflow: "hidden" },
  scene: { height: 92, borderRadius: 16, overflow: "hidden", position: "relative", marginVertical: 6 },
  sceneCompact: { height: 76, borderRadius: 14, opacity: 0.88 },
  staticScene: { opacity: 1 },
  rainScene: { backgroundColor: "#596F70" },
  rainWindow: { position: "absolute", left: 18, right: 94, top: 10, height: 58, borderWidth: 3, borderColor: "#DCE2DE", backgroundColor: "#667F80", borderRadius: 8 },
  rainWindowDark: { backgroundColor: "#3F5056" },
  rainLine: { position: "absolute", width: 1.5, height: 25, backgroundColor: "#E8EEEA", transform: [{ rotate: "12deg" }], opacity: 0.78 },
  rainDeskSurface: { position: "absolute", left: 0, right: 0, bottom: 0, height: 35, backgroundColor: "#7B593F" },
  rainDeskCup: { position: "absolute", left: 35, bottom: 10, width: 48, height: 20, borderRadius: 24, borderWidth: 3, borderColor: "#F2E5CF", backgroundColor: "#CBB79B" },
  rainDeskCupHandle: { position: "absolute", left: 78, bottom: 12, width: 20, height: 14, borderRadius: 9, borderWidth: 2, borderColor: "#F2E5CF" },
  rainDeskLampStem: { position: "absolute", right: 45, bottom: 25, width: 6, height: 48, backgroundColor: "#5B422F", transform: [{ rotate: "14deg" }] },
  rainDeskLamp: { position: "absolute", right: 18, top: 13, width: 62, height: 24, backgroundColor: "#C99759", transform: [{ rotate: "-4deg" }] },
  paperSheet: { position: "absolute", width: 112, height: 30, left: 102, bottom: 4, borderRadius: 2, backgroundColor: "#F2E8D4", transform: [{ rotate: "-2deg" }] },
  pencilTrace: { position: "absolute", width: 80, height: 3, left: 130, bottom: 16, backgroundColor: classicVisualPaletteV1.darkEarth, transform: [{ rotate: "-8deg" }], opacity: 0.76 },
  pencilTraceActive: { opacity: 1, height: 4 },
  porcelainScene: { backgroundColor: "#718083" },
  porcelainTableSurface: { position: "absolute", left: 0, right: 0, bottom: 0, height: 31, backgroundColor: "#866344" },
  porcelainPlate: { position: "absolute", width: 74, height: 74, borderRadius: 38, backgroundColor: "#E9E5DA", left: 24, top: 10, borderWidth: 4, borderColor: "#C9C5B9" },
  shellMark: { position: "absolute", width: 30, height: 20, borderRadius: 15, borderWidth: 3, borderColor: "#A99A88", left: 46, top: 38 },
  porcelainCup: { position: "absolute", width: 38, height: 46, borderRadius: 14, backgroundColor: "#DFDDD5", right: 54, bottom: 12, borderWidth: 3, borderColor: "#BEB9AD" },
  porcelainCupHandle: { position: "absolute", width: 18, height: 24, borderRadius: 10, right: 40, bottom: 22, borderWidth: 3, borderColor: "#DAD7CD" },
  woodArc: { position: "absolute", width: 92, height: 28, borderTopWidth: 6, borderColor: "#D0A25F", right: 74, top: 22, borderRadius: 46, opacity: 0.76 },
  woodArcActive: { opacity: 1 },
  metalGlint: { position: "absolute", width: 48, height: 3, right: 108, top: 31, backgroundColor: "#F2E9D6", transform: [{ rotate: "18deg" }], opacity: 0.72 },
  metalGlintActive: { opacity: 1, height: 4 },
  wardrobeScene: { backgroundColor: "#7F6962" },
  wardrobeRail: { position: "absolute", left: 18, right: 18, top: 15, height: 5, backgroundColor: "#5B4035" },
  wardrobeHanger: { position: "absolute", top: 11, width: 34, height: 22, borderTopWidth: 2, borderLeftWidth: 2, borderRightWidth: 2, borderColor: "#D8C3AF", borderRadius: 18 },
  fabricFold: { position: "absolute", top: 29, bottom: 7, width: 44, borderRadius: 5, backgroundColor: "#C4A99B", transform: [{ rotate: "3deg" }] },
  leatherStitch: { position: "absolute", width: 66, height: 25, left: 20, bottom: 5, backgroundColor: "#79553E", borderRadius: 4, borderStyle: "dashed", borderWidth: 1, borderColor: "#E6CFB8", opacity: 0.76 },
  leatherStitchActive: { opacity: 1 },
  brushSweep: { position: "absolute", width: 86, height: 9, right: 12, bottom: 15, borderRadius: 8, backgroundColor: "#D8C4AF", transform: [{ rotate: "-14deg" }], opacity: 0.76 },
  brushSweepActive: { opacity: 1, height: 11 },
  progressTrack: { height: 12, borderRadius: classicComponentTokensV1.radius.chip, borderWidth: 1, borderColor: classicVisualPaletteV1.darkEarth, backgroundColor: classicVisualThemeV1.surface, overflow: "hidden", marginVertical: 8 },
  progressCompact: { height: 7, marginVertical: 5 },
  progressFill: { height: "100%", borderRadius: classicComponentTokensV1.radius.chip, backgroundColor: classicVisualPaletteV1.darkEarth },
  playerCard: { backgroundColor: classicVisualThemeV1.elevated, borderRadius: classicComponentTokensV1.radius.card, borderWidth: 1, borderColor: classicVisualThemeV1.borderStrong, padding: 12, marginTop: 12 },
  phaseTitle: { color: classicVisualThemeV1.text, fontSize: 24, lineHeight: 30, fontWeight: "800" },
  progressCopyRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, marginTop: 8 },
  progressCopyRowCompact: { alignItems: "flex-start", flexDirection: "column" },
  progressCopy: { color: classicVisualPaletteV1.darkEarth, fontSize: 16, lineHeight: 23, fontWeight: "700" },
  progressReadOnlyCopy: { color: classicVisualPaletteV1.darkEarth, fontSize: 13, lineHeight: 18, fontWeight: "700" },
  nextCopy: { color: classicVisualThemeV1.accentMist, fontSize: 17, lineHeight: 24, fontWeight: "800" },
  statusBanner: { color: classicVisualThemeV1.text, backgroundColor: classicVisualThemeV1.surface, borderRadius: classicComponentTokensV1.radius.card, borderWidth: 1, borderColor: classicVisualThemeV1.border, padding: 12, fontSize: 15, lineHeight: 22, marginTop: 8 },
  bottomActionCluster: { gap: 0 },
  statusRow: { color: classicVisualPaletteV1.darkEarth, fontSize: 15, lineHeight: 22, fontWeight: "700", marginTop: 12 },
  transportRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 8 },
  transportRowCompact: { flexDirection: "column", alignItems: "stretch" },
  steeringGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  steeringGridCompact: { flexDirection: "column" },
  steeringControl: { minHeight: 72, minWidth: 140, flexGrow: 1, flexBasis: "46%", borderRadius: classicComponentTokensV1.radius.card, borderWidth: 1, borderColor: classicVisualPaletteV1.darkEarth, backgroundColor: classicVisualThemeV1.elevated, padding: 12, justifyContent: "center" },
  steeringControlWide: { flexBasis: "100%" },
  steeringSelected: { backgroundColor: classicVisualThemeV1.selectedSurface, borderWidth: 3, borderColor: classicVisualPaletteV1.darkEarth },
  steeringLabel: { color: classicVisualThemeV1.text, fontSize: 16, lineHeight: 21, fontWeight: "800" },
  steeringState: { color: classicVisualPaletteV1.darkEarth, fontSize: 13, lineHeight: 19, marginTop: 4 },
  choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  choice: { minHeight: classicComponentTokensV1.controlMinHeight, minWidth: 112, borderRadius: classicComponentTokensV1.radius.chip, borderWidth: 1, borderColor: classicVisualPaletteV1.darkEarth, backgroundColor: classicVisualThemeV1.elevated, paddingHorizontal: 14, paddingVertical: 10, alignItems: "center", justifyContent: "center" },
  choiceSelected: { backgroundColor: classicVisualThemeV1.selectedSurface, borderWidth: 3, borderColor: classicVisualPaletteV1.darkEarth },
  choiceText: { color: classicVisualThemeV1.text, fontSize: 15, lineHeight: 20, fontWeight: "800", flexShrink: 1 },
  listeningStatusPanel: { backgroundColor: classicVisualThemeV1.surface, borderRadius: classicComponentTokensV1.radius.card, borderWidth: 1, borderColor: classicVisualThemeV1.border, padding: 14, marginTop: 14 },
  streamingState: { color: classicVisualThemeV1.accentMist, fontSize: 15, lineHeight: 22, fontWeight: "800", marginTop: 12 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: classicComponentTokensV1.controlMinHeight, minWidth: classicComponentTokensV1.controlMinHeight, borderRadius: classicComponentTokensV1.radius.chip, borderWidth: 1, borderColor: classicVisualPaletteV1.darkEarth, backgroundColor: classicVisualThemeV1.elevated, paddingHorizontal: 14, paddingVertical: 10, justifyContent: "center" },
  chipSelected: { backgroundColor: classicVisualThemeV1.selectedSurface, borderWidth: 3, borderColor: classicVisualPaletteV1.darkEarth },
  chipText: { color: classicVisualThemeV1.text, fontSize: 14, lineHeight: 20, fontWeight: "700", flexShrink: 1 },
  feedbackRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  adjustCard: { backgroundColor: classicVisualThemeV1.elevated, borderRadius: classicComponentTokensV1.radius.card, borderWidth: 1, borderColor: classicVisualThemeV1.border, padding: 14, marginTop: 12 },
  renameInput: { minHeight: classicComponentTokensV1.controlMinHeight, color: classicVisualThemeV1.text, borderWidth: 1, borderColor: classicVisualThemeV1.border, borderRadius: classicComponentTokensV1.radius.control, paddingHorizontal: 12, fontSize: 16, fontWeight: "700" },
  savedActionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  miniPlayerPlacement: { position: "absolute", left: 10, right: 10 },
  miniPlayerSafeAreaBackground: { position: "absolute", left: 0, right: 0, backgroundColor: classicVisualPaletteV1.midnightOak },
  miniPlayer: { minHeight: 82, backgroundColor: classicVisualPaletteV1.midnightOak, borderColor: classicVisualPaletteV1.darkEarth, borderWidth: 1, borderRadius: classicComponentTokensV1.radius.card, padding: 10, flexDirection: "row", alignItems: "center", gap: 10, shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 8, elevation: 14 },
  miniPlayerCompact: { minHeight: 118, flexDirection: "column", alignItems: "stretch" },
  miniSummary: { flex: 1, minHeight: 44, justifyContent: "center" },
  miniSummaryOpen: { minHeight: 44, justifyContent: "center" },
  miniTitle: { color: classicVisualThemeV1.textOnDark, fontSize: 16, lineHeight: 21, fontWeight: "800" },
  miniPhase: { color: classicVisualPaletteV1.sand, fontSize: 13, lineHeight: 18 },
  pendingText: { color: classicVisualPaletteV1.sageMist, fontSize: 12, lineHeight: 16, fontWeight: "800" },
  bottomNavSafeArea: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: classicVisualThemeV1.background, borderTopWidth: 1, borderColor: classicVisualThemeV1.border },
  bottomNav: { minHeight: 58, paddingHorizontal: 10, paddingBottom: 6, paddingTop: 6, backgroundColor: classicVisualThemeV1.background, flexDirection: "row", gap: 6 },
  bottomNavStacked: { alignItems: "stretch", flexDirection: "column" },
  navTab: { flex: 1, minHeight: classicComponentTokensV1.controlMinHeight, minWidth: classicComponentTokensV1.controlMinHeight, borderRadius: classicComponentTokensV1.radius.chip, borderWidth: 1, borderColor: classicVisualPaletteV1.darkEarth, backgroundColor: classicVisualThemeV1.elevated, alignItems: "center", justifyContent: "center", paddingHorizontal: 4, paddingVertical: 6 },
  navTabStacked: { alignSelf: "stretch", flex: 0, width: "100%" },
  navTabSelected: { backgroundColor: classicVisualThemeV1.accentDeep, borderWidth: 3, borderColor: classicVisualPaletteV1.darkEarth },
  navText: { color: classicVisualPaletteV1.darkEarth, fontSize: 12, lineHeight: 17, fontWeight: "900", flexShrink: 1, textAlign: "center" },
  navTextSelected: { color: classicVisualThemeV1.text, fontWeight: "900" },
});
