import { StatusBar } from "expo-status-bar";
import * as Updates from "expo-updates";

import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  AppState,
  findNodeHandle,
  FlatList,

  Keyboard,
  LayoutChangeEvent,
  Linking,
  ListRenderItemInfo,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import {
  CATALOG_CONTRACT_VERSION,
  catalogRepository,
  type MobileCatalogSound,
} from "./src/contracts/catalogContractV2";
import { PROVENANCE_CONTRACT_VERSION } from "./src/contracts/provenanceContractV1";
import { RIGHTS_EVIDENCE_CONTRACT_VERSION } from "./src/contracts/rightsEvidenceContractV1";
import { SENSORY_QC_CONTRACT_VERSION, TECHNICAL_QC_CONTRACT_VERSION } from "./src/contracts/qcContractV1";
import { ACTIVATION_ELIGIBILITY_VERSION } from "./src/services/activationEligibilityV1";
import { INGESTION_MANIFEST_VERSION } from "./src/services/ingestionManifestV1";
import {
  RECONCILIATION_CONTRACT_VERSION,
  activationGatedDefaultMobileCatalogSoundV1 as defaultMobileCatalogSound,
  activationGatedMobileCatalogSoundsV1 as baselineMobileCatalogSounds,
  catalogEvidenceRepository,
} from "./src/services/catalogEvidenceReconciliationV1";
import { m6ProtectedDiscoveryIndexV1 } from "./src/catalog/m6ProtectedDiscoveryV1";
import {
  getM6ProductBuilderDescriptor,
  m6ProductCatalogSoundsV1,
} from "./src/catalog/m6ProductCatalogV1";
import { getDefaultSafeM6BuilderDiscoveryCandidatesV1 } from "./src/catalog/m6BuilderDiscoveryV1";
import {
  DirectedSessionsExperienceV1,
  type DirectedClassicRouteV1,
  type DirectedTabV1,
} from "./src/directedSessions/DirectedSessionsExperienceV1";
import {
  DIRECTED_SESSIONS_RELEASE_CONFIG_V1,
  evaluateDirectedSessionsBetaV1,
} from "./src/directedSessions/releaseGateV1";
import {
  createSavedDestinationIntentV1,
  planSavedDestinationApplicationV1,
  type SavedDestinationIntentV1,
} from "./src/navigation/savedDestinationIntentV1";
import { planClassicNavigationSurfaceV1, planClassicPlayerOpenV1 } from "./src/navigation/classicNavigationOwnershipV1";

const mobileCatalogSounds: MobileCatalogSound[] = [
  ...baselineMobileCatalogSounds,
  ...m6ProductCatalogSoundsV1,
];
const mobileCatalogLanes: string[] = Array.from(new Set(mobileCatalogSounds.map((sound) => sound.lane)));
import {
  getPreparedColdStartUri,
  type ColdStartCacheEvent,
} from "./src/coldStartAudioCache";
import {
  RECOMMENDATION_CONTRACT_VERSION,
  recommendationService,
  type GeneratedRecipe,
  type RecipeDensity,
  type RecipeEnginePreferenceOptions,
  type RecipeEngineResult,
  type RecipeLayer,
  type RecipeLayerRole,
} from "./src/contracts/recommendationContractV1";
import {
  PREFERENCE_CONTRACT_VERSION,
  DEFAULT_STORED_PREFERENCE_PROFILE as defaultLocalPreferenceFeedback,
  deserializeStoredPreferenceProfile,
  type StoredPreferenceProfile as LocalPreferenceFeedback,
} from "./src/contracts/preferenceContractV1";
import {
  PLAYBACK_SESSION_CONTRACT_VERSION,
  createInitialPlaybackState,
  reducePlaybackSession,
  type CurrentSession,
  type PlaybackSession,
  type PlaybackStatus,
  type SessionSource,
} from "./src/contracts/playbackSessionContractV1";
import {
  PERSISTENCE_CONTRACT_VERSION,
  DEFAULT_LOCAL_SETTINGS as defaultLocalSettings,
  type LocalSettings,
  type MobileSectionKey,
} from "./src/contracts/persistenceContractV1";
import { appPersistence, commitImportedLocalSnapshotV1, resetSupportedLocalDataV1 } from "./src/services/appPersistence";
import {
  createLocalBackupV1,
  applyLocalBackupV1,
  serializeLocalBackupV1,
  validateLocalBackupV1,
  type LocalBackupModeV1,
} from "./src/contracts/localBackupContractV1";
import {
  migrateLocalStateV1,
  readLocalStateRollbackSafe,
  serializeLocalStateV1,
  type LocalStateEnvelopeV1,
} from "./src/contracts/localProfileContractV1";
import { recoverOfflineManifestItem, type OfflineManifestItemV1 } from "./src/contracts/offlineManifestContractV1";
import { getM7OfflineAssetDescriptor } from "./src/catalog/m7OfflineDeliveryCatalogV1";
import {
  PERSISTENT_DOWNLOAD_RIGHTS_CATALOG_VERSION,
  persistentDownloadRightsCatalogV1,
  resolvePersistentDownloadRightsV1,
} from "./src/catalog/persistentDownloadRightsCatalogV1";
import { OFFLINE_DOWNLOAD_CUSTOMER_COPY_V1, OfflineDownloadManager } from "./src/services/offlineDownloadManagerV1";
import {
  LayerOfflineOperationCoordinatorV1,
  projectLayerOfflineStateV1,
  type LayerOfflineOperationOwnerV1,
} from "./src/layerOfflineProjectionV1";
import {
  expoOfflineFilePortV1,
  expoOfflineNetworkPortV1,
  pickLocalBackupTextV1,
  shareLocalBackupFileV1,
  writeLocalBackupFileV1,
} from "./src/services/offlineFileStoreV1";
import {
  OFFLINE_PLAYBACK_COPY_V1,
  OfflinePlaybackPreparationErrorV1,
  formatUnavailableOfflineLayersV1,
  userFacingPlaybackErrorV1,
} from "./src/offlinePlaybackResolverV1";
import {
  audioService,
  type AggregateCreateOptions,
  type ManagedAudioResource,
  type ManagedPlaybackStatus,
  type MediaNotificationPermissionState,
} from "./src/services/audioService";
import {
  applyRecipePreferenceFeedback,
  applyRecipeQuickFeedbackState,
  applySoundPreferenceFeedback,
  applySoundQuickFeedbackState,
  buildRecipeFingerprint,
} from "./src/services/preferenceTransitions";
import { transferGeneratedRecipeLayers } from "./src/generatedRecipeTransfer";
import {
  applyBuilderEdit,
  createBuilderSessionModel,
  createBuilderPlaybackDescriptor,
  reopenBuilderSession,
  transitionBuilderSession,
  type BuilderSessionLayerRole,
  type BuilderSessionModelV1,
} from "./src/builderSessionModelV1";
import {
  builderPresetDefinitionFromMobile,
  createBuilderCandidate,
  createBuilderSessionModelFromGenerated,
  createBuilderSessionModelFromPreset,
  getSavedSessionEligibility,
  revalidateBuilderSessionAgainstCatalog,
} from "./src/builderSessionAdapterV1";
import { getLayerPlaybackVolume, isLayeredLoopEligible } from "./src/layeredPlaybackPolicy";
import {
  getMiniPlayerStatusMetadata,
  getPresetLayerChoiceLayout,
  mobileUxBreakpoints,
  mobileUxTokens,
  shouldStackMiniPlayer,
} from "./src/mobileUxFoundation";
import {
  LatestKeyedAfterPaintQueue,
  LatestIntentPersistenceQueue,
  getNextQuickFeedbackState,
  getQuickFeedbackMessage,
  type QuickFeedbackDirection,
  type QuickFeedbackState,
} from "./src/quickFeedback";
import { BoundedPlaybackTraceBuffer } from "./src/playbackTrace";
import { getFiniteSeekPositionMillis } from "./src/playback/finitePlaybackNumbers";
import {
  FOREGROUND_POSITION_PROJECTION_INTERVAL_MILLIS,
  projectAuthoritativePositionMillis,
} from "./src/playback/authoritativePositionProjection";
import {
  getSinglePlaybackPrimaryLabel,
  isSinglePlaybackCommandInFlight,
  isSinglePlaybackReplayReady,
} from "./src/playback/singlePlaybackUiProjection";
import {
  SessionRestartCoordinator,
  classifyLayeredPlaybackEntry,
  classifyRestartPlaybackStatus,
  projectLayeredTransport,
  reconcileLayeredSessionIdentity,
  runLayeredPresetPreview,
} from "./src/playback/sessionRestartCoordinator";
import {
  BuilderAtomicEditCoordinator,
  createBuilderAtomicEditState,
  type BuilderPlayableDefinition,
} from "./src/playback/builderAtomicEditCoordinator";
import { runSinglePreviewStart } from "./src/playback/singlePreviewStartCoordinator";
import { resolveClassicPlaybackSourceV1 } from "./src/playback/classicPlaybackSourceV1";
import { teardownResourcesConcurrently } from "./src/sessionReplacement";
import { runOperationScopedCleanup } from "./src/playback/operationScopedCleanup";
import { RecipeDerivationCoordinator } from "./src/recipeDerivation";
import {
  browseFilterGroups,
  clearBrowseFilterState,
  defaultBrowseFilterState,
  discoveryCollections,
  formatDiscoveryMeta,
  getActiveBrowseFilterLabels,
  getBrowseFilterOptionCounts,
  getDiscoveryTags,
  librarySortOptions,
  selectBrowseCollectionState,
  sortLibrarySounds,
  soundMatchesBrowseFilters,
  soundMatchesDiscoveryCollection,
  toggleBrowseFilterState,
  type BrowseFilterGroupKey,
  type BrowseFilterKey,
  type BrowseFilterState,
  type DiscoveryCollectionId,
  type LibrarySortMode,
} from "./src/libraryDiscovery";
import {
  SAVED_SESSIONS_STORAGE_KEY,
  createSavedSession,
  deleteSavedSession,
  deriveQuickMixes,
  duplicateSavedSession,
  getMainSessionLane,
  loadSavedSessions,
  parseSavedSessions,
  persistSavedSessions,
  recordSavedSessionStarted,
  renameSavedSession,
  resolveSavedSession,
  saveAsNewSavedSession,
  sortSavedSessions,
  updateSavedSession,
  type SavedSession,
  type SavedSessionDraft,
  type SavedSessionSortMode,
} from "./src/savedSessions";

type NowPlayingStatus = "idle" | "loading" | "playing" | "paused" | "error";
type SessionStopPhase = "idle" | "stopping" | "stopped";
type AVPlaybackStatus = ManagedPlaybackStatus;


type LocalClearAction = "saved" | "recent" | null;
type LocalDataResetPhase = "idle" | "confirm" | "deleting";
type BackupImportState = Readonly<{ mode: LocalBackupModeV1; status: string | null; busy: boolean }>;
type SavedAreaTab = "sounds" | "sessions";
type SavedSessionDialogMode = "create" | "update" | "save-new" | "rename";
type SavedSessionDialogState = {
  mode: SavedSessionDialogMode;
  draft?: SavedSessionDraft;
  sessionId?: string;
  linkToCurrent?: boolean;
};
type PendingSavedSessionStart = {
  sessionId: string;
  needsChoiceConsent: boolean;
  needsMissingAcknowledgement: boolean;
  generation: number;
};
type SavedSessionStartRequest = {
  sessionId: string;
  soundId: string;
  preset: MobileBuilderPreset | null;
  generation: number;
  partialNotice: string | null;
  wasAlreadyPlaying: boolean;
  loopEnabled: boolean;
  timerMinutes: SessionTimerOptionMinutes;
};
type BrowseListItem =
  | { type: "lane"; lane: string; count: number }
  | { type: "sound"; lane: string; sound: MobileCatalogSound };
const getBrowseListItemKey = (item: BrowseListItem) =>
  item.type === "lane" ? `lane-${item.lane}` : `sound-${item.sound.id}`;
type PendingSavedSessionPlaybackConfirmation = SavedSessionStartRequest;
type TransientNotification = {
  message: string;
  token: number;
};
type QuickFeedbackPersistenceValue = {
  feedbackKey: string;
  feedbackState: QuickFeedbackState;
  preferenceFeedback: LocalPreferenceFeedback;
};
type DeferredQuickFeedbackIntent = {
  feedbackKey: string;
  feedbackState: QuickFeedbackState;
  sessionType: CurrentSession["type"];
  sound: MobileCatalogSound;
  preset: MobileBuilderPreset | null;
};

type PlaybackTimingTraceStatusMilestones = {
  command: string;
  loaded: boolean;
  playing: boolean;
  bufferingFalse: boolean;
};

const formatPlaybackTraceUri = (uri: string) => {
  try {
    const parsedUri = new URL(uri);
    return `${parsedUri.host}${parsedUri.pathname}`;
  } catch {
    return uri.split("?")[0] ?? uri;
  }
};

const summarizePlaybackTraceStatus = (status: AVPlaybackStatus) => {
  if (!status.isLoaded) {
    return status.error ? `not_loaded error=${status.error}` : "not_loaded";
  }

  return [
    `loaded=${status.isLoaded}`,
    `playing=${status.isPlaying}`,
    `buffering=${status.isBuffering}`,
    `positionMillis=${status.positionMillis ?? 0}`,
    status.didJustFinish ? "didJustFinish=true" : null,
  ].filter(Boolean).join(" ");
};


const transientNotificationDurationMillis = 4000;
const playbackTraceDisplayRefreshMillis = 250;
const playbackTraceEventLoopGapThresholdMillis = 250;
const sessionReplacementFadeMillis = 120;
const appIterationInfo = {
  label: "Alpha 0.15.0",
  displayLabel: "Alpha 0.15.0 — Directed Sessions Visual Convergence v1",
  currentUpdate: "Alpha 0.15.0 — Directed Sessions Visual Convergence v1",
  codename: "directed-sessions-visual-convergence-v1",
  fullInternalLabel: "Alpha 0.15.0+directed-sessions-visual-convergence-v1",
  acceptedNativeBaseline: {
    label: "Alpha 0.11.7",
    displayLabel: "Alpha 0.11.7 — Single Preview Selection-Ready Fix",
    currentUpdate: "Alpha 0.11.7 — Single Preview Selection-Ready Fix",
    codename: "single-preview-selection-ready-fix-v1",
    fullInternalLabel: "Alpha 0.11.7+single-preview-selection-ready-fix-v1",
  },
  contractVersions: `catalog=${CATALOG_CONTRACT_VERSION} recommendation=${RECOMMENDATION_CONTRACT_VERSION} preference=${PREFERENCE_CONTRACT_VERSION} playback=${PLAYBACK_SESSION_CONTRACT_VERSION} persistence=${PERSISTENCE_CONTRACT_VERSION} provenance=${PROVENANCE_CONTRACT_VERSION} rights=${RIGHTS_EVIDENCE_CONTRACT_VERSION} persistentDownloadRights=${PERSISTENT_DOWNLOAD_RIGHTS_CATALOG_VERSION} ingestion=${INGESTION_MANIFEST_VERSION} technicalQc=${TECHNICAL_QC_CONTRACT_VERSION} sensoryQc=${SENSORY_QC_CONTRACT_VERSION} activation=${ACTIVATION_ELIGIBILITY_VERSION} reconciliation=${RECONCILIATION_CONTRACT_VERSION}`,
  evidenceStatus: `${persistentDownloadRightsCatalogV1.counts.eligible_persistent_download} exact accepted persistent-download records; ${persistentDownloadRightsCatalogV1.counts.rights_unknown} legacy records remain fail-closed pending M3 evidence; ${m6ProtectedDiscoveryIndexV1.length} accepted M6 identities remain product-active with 11 default-safe and 20 explicit Choice/manual-only`,
} as const;
export const directedSessionsBetaV1 = evaluateDirectedSessionsBetaV1({
  channel: Updates.channel,
  distribution: DIRECTED_SESSIONS_RELEASE_CONFIG_V1.distribution,
}).enabled;
const offlineQuotaBytes = 250 * 1024 * 1024;
const offlineStorageReserveBytes = 25 * 1024 * 1024;
const offlineConsumerStatusLabels = Object.freeze({
  downloaded: "Downloaded",
  downloading: "Downloading",
  online: "Available online",
  streaming: "Streaming only",
  unavailable: "Unavailable offline",
  revoked: "Removed/revoked",
});
const appPlaybackCopyV1 = Object.freeze({
  notDownloaded: "This sound isn't downloaded. Connect to the internet or download it first.",
  layeredUnavailablePrefix: "Some layers aren't available offline:",
  offlineCopyUnusable: "The offline copy couldn't be used. Connect to the internet and download it again.",
  onlineSingleUnknown: "Couldn't play this sound. Check your connection and try again.",
  onlineLayeredUnknown: "Couldn't play this soundscape. Check your connection and try again.",
});
const formatStorageBytes = (bytes: number) => bytes >= 1024 * 1024
  ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  : `${Math.max(0, Math.round(bytes / 1024))} KB`;
const updateDiagnostics = {
  channel: Updates.channel ?? "Development / Expo Go",
  runtimeVersion: Updates.runtimeVersion ?? "Development / Expo Go",
  updateId: Updates.updateId ?? "Embedded / development",
  launchSource: Updates.isEmbeddedLaunch
    ? "Built into this app"
    : Updates.updateId
      ? "Downloaded update"
      : "Development / Expo Go",
  recoveryLaunch: Updates.isEmergencyLaunch
    ? `Yes — ${Updates.emergencyLaunchReason ?? "Not available"}`
    : "No",
} as const;
const savedSessionQuickMixLabels = {
  "resume-last": "Resume last session",
  "most-played": "Most played saved session",
  "recently-saved": "Recently saved",
  "favorite-category": "Favorite category session",
} as const;
const replayOptimisticNativeMinimumTrustMillis = 500;
const replayOptimisticNativeCatchupToleranceMillis = 500;
const recentSoundLimit = 12;
const builderBalanceOptions: BuilderLayerBalance[] = ["Quiet", "Balanced", "Present"];
const builderDensityOptions: { key: RecipeDensity; label: string; helper: string }[] = [
  { key: "minimal", label: "Light", helper: "1–2 layers" },
  { key: "balanced", label: "Balanced", helper: "steady base + detail" },
  { key: "textured", label: "Rich", helper: "more texture" },
];

type BuilderIntentOption = {
  key: string;
  label: string;
  intent: string;
  helper: string;
  allowUserChoice?: boolean;
};

type OnboardingStepKey = "intro" | "intent" | "avoidances";
type OnboardingIntentOption = {
  key: string;
  label: string;
  query: string;
  helper: string;
};
type OnboardingAvoidanceOption = {
  key: string;
  label: string;
  query: string;
};

const onboardingSteps: { key: OnboardingStepKey; label: string }[] = [
  { key: "intro", label: "Welcome" },
  { key: "intent", label: "Start" },
  { key: "avoidances", label: "Avoidances" },
];

const onboardingIntentOptions: OnboardingIntentOption[] = [
  { key: "rain", label: "Rain", query: "rain", helper: "Soft rain beds and steady water detail." },
  { key: "fan", label: "Fan / room hum", query: "fan room hum", helper: "Steady air, room tone, and appliance hum." },
  { key: "water", label: "Water", query: "river water", helper: "River, creek, and flowing water beds." },
  { key: "forest", label: "Forest night", query: "forest night", helper: "Forest ambience with night texture." },
  { key: "paper", label: "Paper / writing", query: "paper writing", helper: "Pages, pencils, and desk texture." },
  { key: "texture", label: "Soft texture", query: "soft texture", helper: "Fabric and close tactile movement." },
  { key: "brown-noise", label: "Brown noise", query: "brown noise", helper: "Warm steady noise bed." },
  { key: "surprise", label: "Surprise me", query: "fan", helper: "Start simple with a steady base." },
];

const onboardingAvoidanceOptions: OnboardingAvoidanceOption[] = [
  { key: "rain", label: "No rain", query: "rain" },
  { key: "chime", label: "No chime", query: "chime" },
  { key: "fire", label: "No fire", query: "fire" },
  { key: "voice", label: "No voice", query: "voice" },
  { key: "tones", label: "No tones", query: "tones" },
  { key: "typing", label: "No typing", query: "typing" },
  { key: "tapping", label: "No tapping", query: "tapping" },
];
const builderIntentOptions: BuilderIntentOption[] = [
  { key: "rainy", label: "Rainy", intent: "soft rainy background", helper: "Rain bed with gentle detail." },
  { key: "airy", label: "Airy", intent: "soft air fan room hum", helper: "Air, fan, or room tone." },
  { key: "forest", label: "Forest", intent: "forest night soft background", helper: "Nature bed, kept calm." },
  { key: "paper", label: "Paper", intent: "paper pages soft texture", helper: "Pages and desk texture." },
  { key: "writing", label: "Writing", intent: "writing pencil soft texture", helper: "Writing or typing detail." },
  { key: "soft-texture", label: "Soft texture", intent: "fabric soft texture", helper: "Fabric and tactile texture." },
  {
    key: "bowl-tone-choice",
    label: "Bowl / Tone Choice",
    intent: "singing bowl tone resonance chime bell",
    helper: "Explicit opt-in Choice path only.",
    allowUserChoice: true,
  },
];

const sessionTimerOptions: SessionTimerOptionMinutes[] = [0, 5, 15, 30, 60];
const sessionTimerFadeMillis = 5000;
const sessionTimerTickMillis = 1000;
const browseColdStartInitialSoundsPerLane = 4;

type FastStartOption = {
  label: string;
  soundId: string;
  matched: string;
};

type FastStartSearchResult =
  | {
      status: "matched";
      sound: MobileCatalogSound;
      alternatives: MobileCatalogSound[];
      whyMatched: string;
      avoidedIntents: FastStartIntent[];
      recipeIntent: string;
      allowUserChoice: boolean;
    }
  | {
      status: "conflict";
      message: string;
      avoidedIntents: FastStartIntent[];
      suggestedAlternatives: MobileCatalogSound[];
    }
  | { status: "no-match"; message: string; avoidedIntents: FastStartIntent[]; suggestedAlternatives: MobileCatalogSound[] };

type FastStartRecommendation = {
  sound: MobileCatalogSound;
  alternatives: MobileCatalogSound[];
  whyMatched: string;
  recipeIntent: string;
  allowUserChoice: boolean;
  sourceLabel: string;
};

type FastStartPrimaryRecommendation = "sound" | "recipe";
type FastStartRecipeRefinement = "balanced" | "more-texture" | "softer" | "less-water";

type FastStartRecipeAvailability = {
  available: boolean;
  note: string | null;
};

type FastStartRecipeStartMode = "start" | "open-player";

type FastStartMessageTone = "matched" | "notice" | "no-match";

type FastStartIntent = {
  key: string;
  label: string;
  aliases: string[];
  soundAliases?: string[];
};

type MobileBuilderPresetLayerRole = "Background" | "Texture" | "Accent" | "Foreground";

type BuilderLayerBalance = "Quiet" | "Balanced" | "Present";

type MobileBuilderPresetLayer = {
  role: MobileBuilderPresetLayerRole;
  name: string;
  soundId?: string;
  balanceLabel: string;
};

type LayeredPreviewLayer = {
  builderLayerId?: string;
  role: MobileBuilderPresetLayerRole;
  soundId: string;
  label: string;
  volume: number;
  balanceLabel: string;
  savedVolume?: number;
};

type LayeredPreviewConfig = {
  label: string;
  availabilityLabel: string;
  recipeAccuracy: "Close recipe" | "Playback preview";
  note: string;
  layers: LayeredPreviewLayer[];
};

type LayeredPreviewStatus = "idle" | "loading" | "playing" | "paused" | "stopped" | "error";
type SessionTimerOptionMinutes = 0 | 5 | 15 | 30 | 60;

type RetainedSingleRestartBlueprint = {
  key: string;
  sound: MobileCatalogSound;
  preparedAudioUri: string;
};

type RetainedLayeredRestartBlueprint = {
  key: string;
  presetId: string;
  startingSoundId: string;
  editId: string | null;
  playableDefinition: BuilderPlayableDefinition | null;
  options: Omit<AggregateCreateOptions, "sessionId" | "generation" | "operationId">;
};

type MobileBuilderPreset = {
  id: string;
  title: string;
  subtitle: string;
  useCase: string;
  layerSummary: string;
  startingSoundId: string;
  startingSoundLabel: string;
  layers: MobileBuilderPresetLayer[];
  clearLabelRequired: boolean;
  userChoiceOnly: boolean;
  layeredPreview?: LayeredPreviewConfig;
  generatedRecipe?: GeneratedRecipe;
  generatedWhy?: string[];
  generatedWarnings?: string[];
};

const mobileSectionNavOptions: { key: MobileSectionKey; label: string }[] = [
  { key: "fast-start", label: "Fast" },
  { key: "presets", label: "Presets" },
  { key: "player", label: "Player" },
  { key: "browse", label: "Browse" },
];

const fastStartOptions: FastStartOption[] = [
  { label: "Rain", soundId: "freesound-soft-rain-loop", matched: "rain" },
  { label: "Fan / Air / Room", soundId: "rbb-022-small-stove-extractor-fan", matched: "fan / air / room" },
  { label: "River / Water / Creek", soundId: "bb10-040-gentle-river-flow", matched: "river / water / creek" },
  { label: "Forest / Nature", soundId: "bulk6-003-european-forest-ambience", matched: "forest / nature" },
  { label: "Brown Noise", soundId: "brown-noise-soft-shell", matched: "brown noise" },
  { label: "Pink Noise", soundId: "rbb-014-pink-noise-smooth-bed-a", matched: "pink noise" },
  { label: "White Noise", soundId: "rbb-017-white-noise-soft-bed-a", matched: "white noise" },
  { label: "Typing / Writing", soundId: "bb11-003-very-slow-typing", matched: "typing / writing" },
  { label: "Paper / Pages", soundId: "bb10-011-quick-book-page-turning", matched: "paper / pages" },
  { label: "Fabric / Soft Texture", soundId: "bulk3-016-fabric-rustling", matched: "fabric / soft texture" },
  { label: "Soft Tapping", soundId: "asmr50-002-ribbon-box-tapping-asmr", matched: "soft tapping" },
];

const fastStartIntents: FastStartIntent[] = [
  { key: "rain", label: "rain", aliases: ["rain", "rainy", "drizzle", "storm", "soft rain", "heavy rain", "background rain", "rain background"], soundAliases: ["rain", "rainy", "drizzle", "storm"] },
  { key: "fan-air", label: "fan, air, or room", aliases: ["fan", "air", "airflow", "vent", "appliance", "room", "room hum", "hum", "background", "soft background", "steady"], soundAliases: ["fan", "air", "airflow", "appliance", "room", "room tone", "hum", "interior air"] },
  { key: "water", label: "river, water, or creek", aliases: ["river", "water", "creek", "stream", "flowing", "flow", "waterfall"], soundAliases: ["river", "water", "creek", "stream", "flowing", "waterfall"] },
  { key: "forest", label: "forest or nature", aliases: ["forest", "nature", "woods", "outdoors", "wind", "night", "crickets", "frogs"], soundAliases: ["forest", "nature", "woods", "outdoors", "wind", "crickets", "frogs"] },
  { key: "insects", label: "insects", aliases: ["insect", "insects", "bug", "bugs", "cricket", "crickets"], soundAliases: ["insect", "insects", "bug", "bugs", "cricket", "crickets"] },
  { key: "brown-noise", label: "brown noise", aliases: ["brown noise", "brown", "deep noise"], soundAliases: ["brown noise", "brown"] },
  { key: "pink-noise", label: "pink noise", aliases: ["pink noise", "pink"], soundAliases: ["pink noise", "pink"] },
  { key: "white-noise", label: "white noise", aliases: ["white noise", "white"], soundAliases: ["white noise", "white"] },
  { key: "relax", label: "safe default background", aliases: ["relax", "relaxing", "calm", "unwind", "chill"], soundAliases: ["soft background", "background", "fan", "air", "room", "brown noise", "pink noise", "white noise"] },
  { key: "typing-writing", label: "typing or writing", aliases: ["typing", "type", "keyboard", "writing", "pen", "pencil", "notebook"], soundAliases: ["typing", "keyboard", "writing", "pen", "pencil", "notebook"] },
  { key: "paper", label: "paper or pages", aliases: ["paper", "page", "pages", "book", "cardboard", "box"], soundAliases: ["paper", "page", "pages", "book", "cardboard", "box"] },
  { key: "fabric", label: "fabric or soft texture", aliases: ["fabric", "cloth", "clothes", "rustle", "soft texture", "texture", "tactile"], soundAliases: ["fabric", "cloth", "clothes", "rustle", "soft texture", "texture", "tactile"] },
  { key: "tapping", label: "soft tapping", aliases: ["tapping", "tap", "object foley", "object", "ribbon", "plastic"], soundAliases: ["tapping", "tap", "object foley", "ribbon", "plastic"] },
  { key: "voice", label: "voice", aliases: ["voice", "voices", "talking", "spoken", "speech"] },
  { key: "chime", label: "chime", aliases: ["chime", "chimes", "bell", "bells"] },
  { key: "fire", label: "fire", aliases: ["fire", "fireplace", "campfire", "flame", "crackle"] },
  { key: "tones", label: "tones or resonance", aliases: ["tone", "tones", "tonal", "drone", "bowl", "bowls", "singing bowl", "resonance", "resonant", "chime", "bell"] },
  { key: "thunder", label: "thunder", aliases: ["thunder", "lightning"] },
];

const noMatchSuggestionText =
  "Try rain, soft rain, heavy rain, fan, room hum, river, creek, forest, crickets, brown noise, pink noise, white noise, typing, writing, paper, fabric, or soft tapping.";

const optInToneBowlTriggerTerms = [
  "bowl",
  "bowls",
  "singing bowl",
  "tone",
  "tones",
  "resonance",
  "resonant",
  "chime",
  "bell",
];
const optInVoiceTriggerTerms = ["voice", "voices", "whisper", "whispered", "soft spoken", "soft-spoken"];

const mobileBuilderPresets: MobileBuilderPreset[] = [
  {
    id: "rain-soft-writing",
    title: "Rain with Soft Writing",
    subtitle: "Soft rain bed with close writing texture.",
    useCase: "Rain base with a light desk texture.",
    layerSummary: "3 layers · Close recipe · Layered preview available",
    startingSoundId: "freesound-slow-rain-loop",
    startingSoundLabel: "Slow Rain",
    layers: [
      { role: "Background", name: "Slow Rain", soundId: "freesound-slow-rain-loop", balanceLabel: "normal" },
      { role: "Texture", name: "Pencil Writing Two", soundId: "bb10-013-pencil-writing-two", balanceLabel: "lower" },
      { role: "Accent", name: "Quick Book Page Turning", soundId: "bb10-011-quick-book-page-turning", balanceLabel: "quiet" },
    ],
    clearLabelRequired: false,
    userChoiceOnly: false,
    layeredPreview: {
      label: "Rain + writing + page turn preview",
      availabilityLabel: "Layered preview available",
      recipeAccuracy: "Close recipe",
      note: "A close preview of the recipe using rain as the bed, writing as texture, and a quiet page-turn accent.",
      layers: [
        { role: "Background", soundId: "freesound-slow-rain-loop", label: "Slow Rain", volume: 0.46, balanceLabel: "normal" },
        { role: "Texture", soundId: "bb10-013-pencil-writing-two", label: "Pencil Writing Two", volume: 0.22, balanceLabel: "lower" },
        { role: "Accent", soundId: "bb10-011-quick-book-page-turning", label: "Quick Book Page Turning", volume: 0.12, balanceLabel: "quiet" },
      ],
    },
  },
  {
    id: "soft-air-cotton-texture",
    title: "Soft Air with Fabric Texture",
    subtitle: "Soft airflow bed with fabric movement texture.",
    useCase: "Steady air with gentle fabric movement.",
    layerSummary: "2 layers · Close recipe · Layered preview available",
    startingSoundId: "rbb-007-generated-soft-airflow-bed-a",
    startingSoundLabel: "Soft Airflow A",
    layers: [
      { role: "Background", name: "Soft Airflow A", soundId: "rbb-007-generated-soft-airflow-bed-a", balanceLabel: "normal" },
      { role: "Texture", name: "Fabric Rustling", soundId: "bulk3-016-fabric-rustling", balanceLabel: "lower" },
    ],
    clearLabelRequired: false,
    userChoiceOnly: false,
    layeredPreview: {
      label: "Soft air + fabric preview",
      availabilityLabel: "Layered preview available",
      recipeAccuracy: "Close recipe",
      note: "A close preview using steady air as the background and fabric rustling as a lower texture layer.",
      layers: [
        { role: "Background", soundId: "rbb-007-generated-soft-airflow-bed-a", label: "Soft Airflow A", volume: 0.46, balanceLabel: "normal" },
        { role: "Texture", soundId: "bulk3-016-fabric-rustling", label: "Fabric Rustling", volume: 0.2, balanceLabel: "lower" },
      ],
    },
  },
  {
    id: "room-tone-slow-typing",
    title: "Room Tone with Slow Typing",
    subtitle: "Low room hum with sparse typing texture.",
    useCase: "Quiet room bed with typing kept secondary.",
    layerSummary: "2 layers · Close recipe · Layered preview available",
    startingSoundId: "rbb-009-generated-low-room-hum-bed",
    startingSoundLabel: "Low Room Hum",
    layers: [
      { role: "Background", name: "Low Room Hum", soundId: "rbb-009-generated-low-room-hum-bed", balanceLabel: "normal" },
      { role: "Texture", name: "Very Slow Typing", soundId: "bb11-003-very-slow-typing", balanceLabel: "lower" },
    ],
    clearLabelRequired: false,
    userChoiceOnly: false,
    layeredPreview: {
      label: "Room hum + slow typing preview",
      availabilityLabel: "Layered preview available",
      recipeAccuracy: "Close recipe",
      note: "A close preview using low room hum as the bed with very slow typing kept lower in the mix.",
      layers: [
        { role: "Background", soundId: "rbb-009-generated-low-room-hum-bed", label: "Low Room Hum", volume: 0.46, balanceLabel: "normal" },
        { role: "Texture", soundId: "bb11-003-very-slow-typing", label: "Very Slow Typing", volume: 0.18, balanceLabel: "lower" },
      ],
    },
  },
  {
    id: "creek-soft-object-taps",
    title: "Creek with Soft Object Taps",
    subtitle: "Creek bed with a quiet tapping accent.",
    useCase: "Water base with a separate soft-tap accent.",
    layerSummary: "2 layers · Close recipe · Layered preview available",
    startingSoundId: "bb10-041-small-flowing-creek-loop",
    startingSoundLabel: "Small Flowing Creek",
    layers: [
      { role: "Background", name: "Small Flowing Creek", soundId: "bb10-041-small-flowing-creek-loop", balanceLabel: "normal" },
      { role: "Accent", name: "Ribbon Box Tapping", soundId: "asmr50-002-ribbon-box-tapping-asmr", balanceLabel: "quiet" },
    ],
    clearLabelRequired: false,
    userChoiceOnly: false,
    layeredPreview: {
      label: "Creek + soft tapping preview",
      availabilityLabel: "Layered preview available",
      recipeAccuracy: "Close recipe",
      note: "A close preview using creek water as the background and a quiet object-tapping accent.",
      layers: [
        { role: "Background", soundId: "bb10-041-small-flowing-creek-loop", label: "Small Flowing Creek", volume: 0.46, balanceLabel: "normal" },
        { role: "Accent", soundId: "asmr50-002-ribbon-box-tapping-asmr", label: "Ribbon Box Tapping", volume: 0.1, balanceLabel: "quiet" },
      ],
    },
  },
  {
    id: "forest-night-crickets-water",
    title: "Forest Night with Water Texture",
    subtitle: "Forest ambience with a low water layer.",
    useCase: "Forest base with a low water texture.",
    layerSummary: "2 layers · Close recipe · Layered preview available",
    startingSoundId: "bulk6-003-european-forest-ambience",
    startingSoundLabel: "European Forest",
    layers: [
      { role: "Background", name: "European Forest", soundId: "bulk6-003-european-forest-ambience", balanceLabel: "normal" },
      { role: "Background", name: "Water Flowing", soundId: "rbb-040-water-flowing-ambience-loop", balanceLabel: "lower" },
    ],
    clearLabelRequired: false,
    userChoiceOnly: false,
    layeredPreview: {
      label: "Forest + water texture preview",
      availabilityLabel: "Layered preview available",
      recipeAccuracy: "Close recipe",
      note: "A close preview using forest ambience with a lower water texture layer; it is still a preview, not a mastered final mix.",
      layers: [
        { role: "Background", soundId: "bulk6-003-european-forest-ambience", label: "European Forest", volume: 0.44, balanceLabel: "normal" },
        { role: "Background", soundId: "rbb-040-water-flowing-ambience-loop", label: "Water Flowing", volume: 0.18, balanceLabel: "lower" },
      ],
    },
  },
  {
    id: "fan-quiet-chime-test",
    title: "Fan with Quiet Typing",
    subtitle: "Fan base with a quiet typing layer.",
    useCase: "Fan base with quiet typing kept secondary.",
    layerSummary: "2 layers · Playback preview · Layered preview available",
    startingSoundId: "rbb-022-small-stove-extractor-fan",
    startingSoundLabel: "Small Stove Extractor Fan",
    layers: [
      { role: "Background", name: "Small Stove Extractor Fan", soundId: "rbb-022-small-stove-extractor-fan", balanceLabel: "normal" },
      { role: "Texture", name: "Very Slow Typing", soundId: "bb11-003-very-slow-typing", balanceLabel: "quiet" },
    ],
    clearLabelRequired: false,
    userChoiceOnly: false,
    layeredPreview: {
      label: "Fan + very slow typing preview",
      availabilityLabel: "Layered preview available",
      recipeAccuracy: "Playback preview",
      note: "Layered playback using fan plus a quiet typing layer; useful for comparing simultaneous playback and cleanup.",
      layers: [
        { role: "Background", soundId: "rbb-022-small-stove-extractor-fan", label: "Small Stove Extractor Fan", volume: 0.42, balanceLabel: "normal" },
        { role: "Texture", soundId: "bb11-003-very-slow-typing", label: "Very Slow Typing", volume: 0.12, balanceLabel: "quiet" },
      ],
    },
  },
  {
    id: "white-noise-paper-handling",
    title: "White Noise with Paper Handling",
    subtitle: "White-noise bed with paper texture direction.",
    useCase: "Paper direction; Player starts the base.",
    layerSummary: "2 layers · Recipe only · Layered preview not available yet",
    startingSoundId: "rbb-017-white-noise-soft-bed-a",
    startingSoundLabel: "White Noise Soft A",
    layers: [
      { role: "Background", name: "White Noise Soft A", soundId: "rbb-017-white-noise-soft-bed-a", balanceLabel: "normal" },
      { role: "Texture", name: "Paper Handling", soundId: "bb10-011-quick-book-page-turning", balanceLabel: "lower" },
    ],
    clearLabelRequired: false,
    userChoiceOnly: false,
  },
  {
    id: "pink-noise-object-tapping",
    title: "Pink Noise with Object Tapping",
    subtitle: "Pink-noise bed with soft tapping direction.",
    useCase: "Noise-plus-tap direction for later layering.",
    layerSummary: "2 layers · Recipe only · Layered preview not available yet",
    startingSoundId: "rbb-014-pink-noise-smooth-bed-a",
    startingSoundLabel: "Pink Noise Smooth A",
    layers: [
      { role: "Background", name: "Pink Noise Smooth A", soundId: "rbb-014-pink-noise-smooth-bed-a", balanceLabel: "normal" },
      { role: "Accent", name: "Plastic Container Tapping", soundId: "asmr50-052-plastic-container-tapping-asmr", balanceLabel: "quiet" },
    ],
    clearLabelRequired: false,
    userChoiceOnly: false,
  },
];

type ReplayOptimisticProgressDisplayHandle = {
  start: (startedAtMillis: number, durationMillis: number) => void;
  stop: (positionMillis: number) => void;
  sync: (positionMillis: number) => void;
};

type ReplayOptimisticProgressDisplayProps = {
  positionMillis: number;
  progressDurationMillis: number;
  isPlaying: boolean;
  isForeground: boolean;
  isRecipeSession: boolean;
  hasProgressDuration: boolean;
  disabled: boolean;
  compact?: boolean;
  miniSeekable?: boolean;
  seekPanResponder?: ReturnType<typeof PanResponder.create>;
  onLayout?: (event: LayoutChangeEvent) => void;
  onAccessibilityAdjust?: (direction: "increment" | "decrement") => void;
  onOptimisticTick?: (elapsedMillis: number, positionMillis: number) => void;
  onCommit?: (positionMillis: number) => void;
};

const ReplayOptimisticProgressDisplayBase = React.forwardRef<
  ReplayOptimisticProgressDisplayHandle,
  ReplayOptimisticProgressDisplayProps
>(function ReplayOptimisticProgressDisplay(
  {
    positionMillis,
    progressDurationMillis,
    isPlaying,
    isForeground,
    isRecipeSession,
    hasProgressDuration,
    disabled,
    compact,
    miniSeekable,
    seekPanResponder,
    onLayout,
    onAccessibilityAdjust,
    onOptimisticTick = () => undefined,
    onCommit,
  },
  ref,
) {
  const [displayPositionMillis, setDisplayPositionMillis] = useState(positionMillis);
  const optimisticActiveRef = useRef(false);
  const optimisticStartedAtMillisRef = useRef(0);
  const optimisticDurationMillisRef = useRef(0);
  const optimisticTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const optimisticFirstTickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const authoritativeProjectionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearOptimisticTimers = useCallback(() => {
    if (optimisticTimerRef.current) {
      clearInterval(optimisticTimerRef.current);
      optimisticTimerRef.current = null;
    }
    if (optimisticFirstTickTimerRef.current) {
      clearTimeout(optimisticFirstTickTimerRef.current);
      optimisticFirstTickTimerRef.current = null;
    }
  }, []);

  const clearAuthoritativeProjectionTimer = useCallback(() => {
    if (authoritativeProjectionTimerRef.current) {
      clearInterval(authoritativeProjectionTimerRef.current);
      authoritativeProjectionTimerRef.current = null;
    }
  }, []);

  React.useImperativeHandle(ref, () => ({
    start(startedAtMillis, durationMillis) {
      clearOptimisticTimers();
      optimisticActiveRef.current = true;
      optimisticStartedAtMillisRef.current = startedAtMillis;
      optimisticDurationMillisRef.current = durationMillis;
      setDisplayPositionMillis(0);

      const tickOptimisticProgress = () => {
        if (!optimisticActiveRef.current) {
          return;
        }
        const elapsedMillis = Date.now() - optimisticStartedAtMillisRef.current;
        const optimisticPositionMillis = Math.min(optimisticDurationMillisRef.current, elapsedMillis);
        setDisplayPositionMillis(optimisticPositionMillis);
        onOptimisticTick(elapsedMillis, optimisticPositionMillis);
        if (optimisticPositionMillis >= optimisticDurationMillisRef.current) {
          clearOptimisticTimers();
        }
      };

      optimisticFirstTickTimerRef.current = setTimeout(() => {
        optimisticFirstTickTimerRef.current = null;
        tickOptimisticProgress();
      }, 0);
      optimisticTimerRef.current = setInterval(
        tickOptimisticProgress,
        FOREGROUND_POSITION_PROJECTION_INTERVAL_MILLIS,
      );
    },
    stop(nextPositionMillis) {
      clearOptimisticTimers();
      optimisticActiveRef.current = false;
      setDisplayPositionMillis(nextPositionMillis);
    },
    sync(nextPositionMillis) {
      if (!optimisticActiveRef.current) {
        setDisplayPositionMillis(nextPositionMillis);
      }
    },
  }), [clearOptimisticTimers, onOptimisticTick]);

  useEffect(() => {
    clearAuthoritativeProjectionTimer();
    if (optimisticActiveRef.current) return;
    const authoritativeObservedAtMillis = Date.now();
    setDisplayPositionMillis(positionMillis);
    if (!isPlaying || !isForeground || progressDurationMillis <= 0) return;
    authoritativeProjectionTimerRef.current = setInterval(() => {
      setDisplayPositionMillis(projectAuthoritativePositionMillis({
        authoritativePositionMillis: positionMillis,
        authoritativeObservedAtMillis,
        nowMillis: Date.now(),
        durationMillis: progressDurationMillis,
        playing: isPlaying,
        foreground: isForeground,
      }));
    }, FOREGROUND_POSITION_PROJECTION_INTERVAL_MILLIS);
    return clearAuthoritativeProjectionTimer;
  }, [clearAuthoritativeProjectionTimer, isForeground, isPlaying, positionMillis, progressDurationMillis]);

  useLayoutEffect(() => {
    onCommit?.(displayPositionMillis);
  }, [displayPositionMillis, onCommit]);

  useEffect(() => () => {
    optimisticActiveRef.current = false;
    clearOptimisticTimers();
    clearAuthoritativeProjectionTimer();
  }, [clearAuthoritativeProjectionTimer, clearOptimisticTimers]);

  const displayProgressPercent = progressDurationMillis
    ? Math.min(100, Math.max(0, (displayPositionMillis / progressDurationMillis) * 100))
    : 0;

  if (compact) {
    return (
      <View
        accessibilityLabel={`Playback progress ${Math.round(displayProgressPercent)} percent, ${formatDurationFromMillis(displayPositionMillis)} of ${hasProgressDuration ? formatDurationFromMillis(progressDurationMillis) : "unknown duration"}`}
        style={styles.compactProgressSummary}
      >
        <View style={styles.compactProgressTimesRow}>
          <Text style={styles.compactProgressTime}>{formatDurationFromMillis(displayPositionMillis)}</Text>
          <Text style={styles.compactProgressTime}>
            {hasProgressDuration ? formatDurationFromMillis(progressDurationMillis) : "--:--"}
          </Text>
        </View>
        <View style={styles.compactProgressTrack}>
          <View style={[styles.progressFill, { width: `${displayProgressPercent}%` }]} />
        </View>
      </View>
    );
  }

  return (
    <>
      <View style={miniSeekable ? styles.compactProgressTimesRow : styles.progressTimesRow}>
        <Text style={miniSeekable ? styles.compactProgressTime : styles.progressTime}>
          {isRecipeSession ? "--:--" : formatDurationFromMillis(displayPositionMillis)}
        </Text>
        <Text style={miniSeekable ? styles.compactProgressTime : styles.progressTime}>
          {isRecipeSession ? "layered" : hasProgressDuration ? formatDurationFromMillis(progressDurationMillis) : "--:--"}
        </Text>
      </View>
      <View
        {...(seekPanResponder?.panHandlers ?? {})}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        accessibilityHint="Tap or drag to seek. Swipe up or down to adjust in five percent steps."
        accessibilityLabel={`Playback scrubber ${Math.round(displayProgressPercent)} percent`}
        accessibilityRole="adjustable"
        accessibilityState={{ disabled }}
        accessibilityValue={{
          min: 0,
          max: progressDurationMillis,
          now: Math.round(displayPositionMillis),
          text: `${formatDurationFromMillis(displayPositionMillis)} of ${hasProgressDuration ? formatDurationFromMillis(progressDurationMillis) : "unknown duration"}`,
        }}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === "increment" || event.nativeEvent.actionName === "decrement") {
            onAccessibilityAdjust?.(event.nativeEvent.actionName);
          }
        }}
        onLayout={onLayout}
        style={[
          styles.progressTouchTarget,
          miniSeekable ? styles.miniPlayerSeekControl : null,
          disabled ? styles.progressTouchTargetDisabled : null,
        ]}
      >
        <View style={styles.progressTrackShell}>
          <View style={[styles.progressTrack, miniSeekable ? styles.miniPlayerSeekTrack : null]}>
            <View style={[styles.progressFill, { width: `${displayProgressPercent}%` }]} />
          </View>
          <View
            pointerEvents="none"
            style={[styles.progressThumb, { left: `${displayProgressPercent}%` }]}
          />
        </View>
        {!miniSeekable ? (
          <Text style={styles.scrubberLabel}>
            {hasProgressDuration ? "seek" : "duration unavailable"}
          </Text>
        ) : null}
      </View>
    </>
  );
});
const ReplayOptimisticProgressDisplay = React.memo(ReplayOptimisticProgressDisplayBase);

type PlaybackTimingTraceDisplayHandle = {
  replace: (entries: string[]) => void;
};

type PlaybackTimingTraceDisplayProps = {
  entries: string[];
};

const emptyPlaybackTimingTraceText =
  "Trace is empty. Run Fast Start, Start, Replay, Pause, Resume, then paste this trace.";

const PlaybackTimingTraceDisplay = React.forwardRef<
  PlaybackTimingTraceDisplayHandle,
  PlaybackTimingTraceDisplayProps
>(function PlaybackTimingTraceDisplay({ entries }, ref) {
  const [visibleEntries, setVisibleEntries] = useState(entries);
  const pendingEntriesRef = useRef(entries);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useImperativeHandle(ref, () => ({
    replace(nextEntries) {
      pendingEntriesRef.current = nextEntries;
      if (refreshTimerRef.current) return;
      refreshTimerRef.current = setTimeout(() => {
        refreshTimerRef.current = null;
        setVisibleEntries(pendingEntriesRef.current);
      }, playbackTraceDisplayRefreshMillis);
    },
  }), []);

  useEffect(() => {
    pendingEntriesRef.current = entries;
    setVisibleEntries(entries);
  }, [entries]);

  useEffect(() => () => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
  }, []);

  return (
    <Text selectable style={styles.playbackTimingTraceText}>
      {visibleEntries.length ? visibleEntries.join("\n") : emptyPlaybackTimingTraceText}
    </Text>
  );
});

// Visual pass direction: warm-dark, tactile, calm, sound-first; teal/gold only
// as restrained accents so the Expo proof feels less like a generic AI dashboard.
// Mobile layout: bottom tabs switch section views so Browse can hold the expanded sound list.

type SoundscapeAppProps = Readonly<{
  initialSectionKey?: MobileSectionKey;
  initialSavedAreaTab?: SavedAreaTab;
  initialSettingsOpen?: boolean;
  surfaceVisible?: boolean;
  directedClassicRoute?: DirectedClassicRouteV1 | null;
  onOpenRetainedClassicPlayer?: () => void;
  directedModeBack?: () => void;
  directedModeBackLabel?: string;
  savedDestinationIntent?: SavedDestinationIntentV1 | null;
  onSavedDestinationConsumed?: (requestId: number) => void;
}>;

function SoundscapeApp({
  initialSectionKey = "fast-start",
  initialSavedAreaTab = "sessions",
  initialSettingsOpen = false,
  surfaceVisible = true,
  directedClassicRoute = null,
  onOpenRetainedClassicPlayer,
  directedModeBack,
  directedModeBackLabel = "Back to Sessions",
  savedDestinationIntent = null,
  onSavedDestinationConsumed,
}: SoundscapeAppProps = {}) {
  const { fontScale, width: screenWidth } = useWindowDimensions();
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReduceMotionEnabled(enabled);
      })
      .catch(() => {
        // Static text and color still carry every feedback state if this query is unavailable.
      });
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotionEnabled);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);
  // Normal phones use one compact horizontal mini-player. Narrow screens and
  // enlarged text use a deliberate two-row fallback; controls never wrap 3+1.
  const useCompactMiniPlayerFallback = shouldStackMiniPlayer(screenWidth, fontScale);
  const useCompactThreeColumnFallback = screenWidth < mobileUxBreakpoints.compactThreeColumnWidth || fontScale > mobileUxBreakpoints.largeTextScale;
  const presetLayerChoiceLayout = getPresetLayerChoiceLayout(screenWidth, fontScale);
  const useStackedSavedSessionManageActions =
    screenWidth < mobileUxBreakpoints.savedManageStackWidth || fontScale > mobileUxBreakpoints.largeTextScale;
  const useStackedClassicHeader = screenWidth <= 360 || fontScale >= 1.35;
  const [bottomNavigationHeight, setBottomNavigationHeight] = useState<number>(mobileUxTokens.bottomNavigationContentHeight);
  const [miniPlayerHeight, setMiniPlayerHeight] = useState<number>(mobileUxTokens.miniPlayerEstimatedHeight);
  const handleBottomNavigationLayout = (event: LayoutChangeEvent) => {
    setBottomNavigationHeight(event.nativeEvent.layout.height);
  };
  const handleMiniPlayerLayout = (event: LayoutChangeEvent) => {
    setMiniPlayerHeight(event.nativeEvent.layout.height);
  };
  const [sound, setSound] = useState<ManagedAudioResource | null>(null);
  const soundRef = useRef<ManagedAudioResource | null>(null);
  const sessionRestartCoordinatorRef = useRef(new SessionRestartCoordinator());
  const layeredPresetPreviewCoordinatorRef = useRef(new SessionRestartCoordinator());
  const builderAtomicEditCoordinatorRef = useRef(new BuilderAtomicEditCoordinator());
  const singlePreviewStartCoordinatorRef = useRef(new SessionRestartCoordinator());
  const singlePreviewLoadingKeyRef = useRef<string | null>(null);
  const retainedSingleRestartBlueprintRef = useRef<RetainedSingleRestartBlueprint | null>(null);
  const retainedLayeredRestartBlueprintRef = useRef<RetainedLayeredRestartBlueprint | null>(null);
  const playbackStatusCallbackGenerationRef = useRef(0);
  const scrollViewRef = useRef<FlatList<BrowseListItem> | null>(null);
  const savedDestinationRevisionRef = useRef(savedDestinationIntent?.requestId ?? 0);
  const consumedSavedDestinationRequestRef = useRef<number | null>(null);
  const pendingSavedDestinationRequestRef = useRef<number | null>(null);
  const savedAreaContainerLayoutYRef = useRef<number | null>(null);
  const savedDestinationLayoutYRef = useRef<Record<SavedAreaTab, number | null>>({ sessions: null, sounds: null });
  const savedMixesDestinationRef = useRef<View | null>(null);
  const savedSoundsDestinationRef = useRef<View | null>(null);
  const isScrubbingRef = useRef(false);
  const scrubWasPlayingRef = useRef(false);
  const scrubPositionMillisRef = useRef(0);
  const layeredSoundsRef = useRef<ManagedAudioResource[]>([]);
  const layeredPreviewStatusRef = useRef<LayeredPreviewStatus>("idle");
  const layeredPreviewOperationIdRef = useRef(0);
  const builderEditOperationIdRef = useRef(0);
  const layeredReplacementInFlightRef = useRef<{ presetId: string; operationId: number } | null>(null);
  const singlePlaybackOperationIdRef = useRef(0);
  const fastStartBestSoundInFlightRef = useRef<string | null>(null);
  const savedSessionPreparedAudioUriRef = useRef<string | null>(null);
  const savedSessionStartGenerationRef = useRef(0);
  const coldStartTraceSoundIdRef = useRef<string | null>(null);
  const pendingPlayerTopScrollRef = useRef(false);
  const transientNotificationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transientNotificationTokenRef = useRef(0);
  const soundscapeAppMountedRef = useRef(true);
  const [layeredPreviewPresetId, setLayeredPreviewPresetId] = useState<string | null>(null);
  const [layeredPreviewStatus, setLayeredPreviewStatus] = useState<LayeredPreviewStatus>("idle");
  const [layeredPreviewError, setLayeredPreviewError] = useState<string | null>(null);
  const [layeredUnavailableSoundIds, setLayeredUnavailableSoundIds] = useState<readonly string[]>([]);
  const updateLayeredPreviewStatus = (nextStatus: LayeredPreviewStatus) => {
    layeredPreviewStatusRef.current = nextStatus;
    setLayeredPreviewStatus(nextStatus);
    syncPlaybackContractStatus({
      phase: nextStatus === "stopped" ? "ended" : nextStatus,
      positionMillis: 0,
      durationMillis: 0,
      buffering: nextStatus === "loading",
      layers: layeredSoundsRef.current.map((_, index) => ({
        soundId: `${layeredPreviewPresetId ?? "layered"}:${index}`,
        playing: nextStatus === "playing",
        buffering: nextStatus === "loading",
      })),
    });
  };
  const [selectedSound, setSelectedSound] = useState<MobileCatalogSound>(
    defaultMobileCatalogSound,
  );
  const selectedSoundRef = useRef(selectedSound);
  const [playbackContractState, dispatchPlaybackContract] = useReducer(
    reducePlaybackSession,
    createInitialPlaybackState(),
  );
  const currentSession = playbackContractState.currentSession;
  const currentSessionRef = useRef<CurrentSession | null>(currentSession);
  const playbackContractOperationIdRef = useRef(0);
  const playbackContractGenerationRef = useRef(0);
  const setCurrentSession = (nextSession: CurrentSession | null) => {
    currentSessionRef.current = nextSession;
    playbackContractOperationIdRef.current += 1;
    const operationId = playbackContractOperationIdRef.current;
    if (!nextSession) {
      dispatchPlaybackContract({
        type: "teardown-complete",
        generation: playbackContractState.generation,
        operationId,
      });
      return;
    }
    const generation = Math.max(playbackContractGenerationRef.current + 1, sessionReplacementGenerationRef.current, 1);
    playbackContractGenerationRef.current = generation;
    const session: PlaybackSession = nextSession.type === "single"
      ? {
          id: `${nextSession.soundId}:${nextSession.updatedAt}`,
          type: "single",
          title: nextSession.title,
          source: nextSession.source,
          soundId: nextSession.soundId,
          generation,
          revision: operationId,
          provenance: "catalog",
        }
      : {
          id: `${nextSession.recipeId}:${nextSession.updatedAt}`,
          type: "layered",
          title: nextSession.title,
          source: nextSession.source,
          recipeId: nextSession.recipeId,
          startingSoundId: nextSession.startingSoundId,
          generation,
          revision: operationId,
          provenance: nextSession.source === "Saved" ? "saved" : "curated",
        };
    dispatchPlaybackContract({ type: "select", session, currentSession: nextSession, operationId });
  };
  const nextPlaybackContractOperation = () => {
    playbackContractOperationIdRef.current += 1;
    return playbackContractOperationIdRef.current;
  };
  const dispatchPlaybackTransport = (type: "load" | "play" | "pause" | "resume" | "replay" | "teardown") => {
    dispatchPlaybackContract({
      type,
      generation: playbackContractGenerationRef.current,
      operationId: nextPlaybackContractOperation(),
    });
  };
  const syncPlaybackContractStatus = (status: PlaybackStatus) => {
    dispatchPlaybackContract({
      type: "adapter-status",
      generation: playbackContractGenerationRef.current,
      operationId: nextPlaybackContractOperation(),
      status,
    });
  };
  const dispatchPlaybackSeek = (positionMillis: number) => {
    dispatchPlaybackContract({ type: "seek", generation: playbackContractGenerationRef.current, operationId: nextPlaybackContractOperation(), positionMillis });
  };
  const dispatchPlaybackLoop = (enabled: boolean) => {
    dispatchPlaybackContract({ type: "set-loop", generation: playbackContractGenerationRef.current, operationId: nextPlaybackContractOperation(), enabled });
  };
  const dispatchPlaybackTimer = (minutes: number) => {
    dispatchPlaybackContract({ type: "set-timer", generation: playbackContractGenerationRef.current, operationId: nextPlaybackContractOperation(), minutes });
  };
  const dispatchPlaybackLayer = (soundId: string, enabled?: boolean, volume?: number) => {
    dispatchPlaybackContract({ type: "set-layer", generation: playbackContractGenerationRef.current, operationId: nextPlaybackContractOperation(), soundId, enabled, volume });
  };
  const dispatchPlaybackStop = () => {
    dispatchPlaybackContract({ type: "stop", generation: playbackContractGenerationRef.current, operationId: nextPlaybackContractOperation(), fadeMillis: 5000 });
  };
  const shellContentBottomReservation = bottomNavigationHeight
    + (currentSession ? miniPlayerHeight : 0)
    + mobileUxTokens.shellContentGap;
  const [loadedSoundId, setLoadedSoundId] = useState<string | null>(null);
  const loadedSoundIdRef = useRef<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProjectionForeground, setPlaybackProjectionForeground] = useState(
    AppState.currentState === "active",
  );
  const [isLoopEnabled, setIsLoopEnabled] = useState(false);
  const isLoopEnabledRef = useRef(false);
  const [activeSectionKey, setActiveSectionKey] = useState<MobileSectionKey>(initialSectionKey);
  const activeSectionKeyRef = useRef<MobileSectionKey>(initialSectionKey);
  const [fastStartSearchText, setFastStartSearchText] = useState("");
  const [browseSearchText, setBrowseSearchText] = useState("");
  const [browseFilters, setBrowseFilters] = useState<BrowseFilterState>(defaultBrowseFilterState);
  const [activeBrowseCollectionId, setActiveBrowseCollectionId] = useState<DiscoveryCollectionId | null>(null);
  const [librarySortMode, setLibrarySortMode] = useState<LibrarySortMode>("recent");
  const [browseFiltersOpen, setBrowseFiltersOpen] = useState(false);
  const [fastStartMessage, setFastStartMessage] = useState<string | null>(null);
  const [fastStartMessageTone, setFastStartMessageTone] =
    useState<FastStartMessageTone>("matched");
  const [fastStartAlternatives, setFastStartAlternatives] = useState<MobileCatalogSound[]>([]);
  const [fastStartResultSound, setFastStartResultSound] = useState<MobileCatalogSound | null>(null);
  const [fastStartResultWhy, setFastStartResultWhy] = useState<string | null>(null);
  const [fastStartStartingSoundId, setFastStartStartingSoundId] = useState<string | null>(null);
  const [fastStartStartFailedSoundId, setFastStartStartFailedSoundId] = useState<string | null>(null);
  const [fastStartRecommendation, setFastStartRecommendation] = useState<FastStartRecommendation | null>(null);
  const [fastStartGeneratedRecipeResult, setFastStartGeneratedRecipeResult] = useState<RecipeEngineResult | null>(null);
  const [fastStartRecipeGenerating, setFastStartRecipeGenerating] = useState(false);
  const [fastStartRecipeSeed, setFastStartRecipeSeed] = useState(0);
  const [fastStartRecipeRefinement, setFastStartRecipeRefinement] = useState<FastStartRecipeRefinement>("balanced");
  const fastStartRecipeSeedRef = useRef(0);
  const fastStartRecipeInputRevisionRef = useRef(0);
  const [activeAvoidedIntents, setActiveAvoidedIntents] = useState<FastStartIntent[]>([]);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(
    secondsToMillis(defaultMobileCatalogSound.durationSeconds),
  );
  const [progressTrackWidth, setProgressTrackWidth] = useState(0);
  const [miniProgressTrackWidth, setMiniProgressTrackWidth] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<MobileBuilderPreset | null>(
    null,
  );
  const presetSelectionOperationIdRef = useRef(0);
  const pendingLayeredPresetIdRef = useRef<string | null>(null);
  const [pendingLayeredPresetId, setPendingLayeredPresetId] = useState<string | null>(null);
  const [builderIntentKey, setBuilderIntentKey] = useState("rainy");
  const [builderDensity, setBuilderDensity] = useState<RecipeDensity>("balanced");
  const [builderSeed, setBuilderSeed] = useState(0);
  const [generatedBuilderRecipeResult, setGeneratedBuilderRecipeResult] = useState<RecipeEngineResult | null>(null);
  const [builderRecipeGenerating, setBuilderRecipeGenerating] = useState(false);
  const builderRecipeInputRevisionRef = useRef(0);
  const recipeDerivationCoordinatorRef = useRef<RecipeDerivationCoordinator | null>(null);
  const [whyThisMixOpen, setWhyThisMixOpen] = useState(false);
  const [recipeFeedbackOpen, setRecipeFeedbackOpen] = useState(false);
  const [recipeTuningOpen, setRecipeTuningOpen] = useState(false);
  const [optimisticQuickFeedbackByKey, setOptimisticQuickFeedbackByKey] = useState<Record<string, QuickFeedbackState>>({});
  const [builderEnabledLayerKeys, setBuilderEnabledLayerKeys] = useState<Record<string, boolean>>({});
  const [builderLayerBalances, setBuilderLayerBalances] = useState<Record<string, BuilderLayerBalance>>({});
  const [builderLayerSwaps, setBuilderLayerSwaps] = useState<Record<string, string>>({});
  const [activeBuilderModel, setActiveBuilderModel] = useState<BuilderSessionModelV1 | null>(null);
  const activeBuilderModelRef = useRef<BuilderSessionModelV1 | null>(null);
  const [savedSoundIds, setSavedSoundIds] = useState<string[]>([]);
  const [recentSoundIds, setRecentSoundIds] = useState<string[]>([]);
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);
  const [savedSessionsStorageReady, setSavedSessionsStorageReady] = useState(false);
  const [savedAreaTab, setSavedAreaTab] = useState<SavedAreaTab>(initialSavedAreaTab);
  const [savedDestinationLayoutRevision, setSavedDestinationLayoutRevision] = useState(0);
  const [savedSessionSortMode, setSavedSessionSortMode] = useState<SavedSessionSortMode>("Recently used");
  const [savedSessionDialog, setSavedSessionDialog] = useState<SavedSessionDialogState | null>(null);
  const [savedSessionNameInput, setSavedSessionNameInput] = useState("");
  const [savedSessionNoteInput, setSavedSessionNoteInput] = useState("");
  const [savedSessionStorageError, setSavedSessionStorageError] = useState<string | null>(null);
  const [pendingDeleteSessionId, setPendingDeleteSessionId] = useState<string | null>(null);
  const [managedSavedSessionId, setManagedSavedSessionId] = useState<string | null>(null);
  const [pendingSavedSessionStart, setPendingSavedSessionStart] = useState<PendingSavedSessionStart | null>(null);
  const [currentSavedSessionId, setCurrentSavedSessionId] = useState<string | null>(null);
  const [savedSessionStartRequest, setSavedSessionStartRequest] = useState<SavedSessionStartRequest | null>(null);
  const [pendingSavedSessionPlaybackConfirmation, setPendingSavedSessionPlaybackConfirmation] = useState<PendingSavedSessionPlaybackConfirmation | null>(null);
  const [preferenceFeedback, setPreferenceFeedback] = useState<LocalPreferenceFeedback>(defaultLocalPreferenceFeedback);
  const preferenceFeedbackRef = useRef<LocalPreferenceFeedback>(defaultLocalPreferenceFeedback);
  const quickFeedbackDesiredPreferenceRef = useRef<LocalPreferenceFeedback>(defaultLocalPreferenceFeedback);
  const quickFeedbackDesiredStateByKeyRef = useRef<Record<string, QuickFeedbackState>>({});
  const quickFeedbackRevisionRef = useRef(0);
  const quickFeedbackPersistenceQueueRef = useRef<LatestIntentPersistenceQueue<QuickFeedbackPersistenceValue> | null>(null);
  const quickFeedbackAfterPaintQueueRef = useRef<LatestKeyedAfterPaintQueue<DeferredQuickFeedbackIntent> | null>(null);
  const [transientNotification, setTransientNotification] = useState<TransientNotification | null>(null);
  const [preferenceFeedbackStorageReady, setPreferenceFeedbackStorageReady] = useState(false);
  const [localStorageReady, setLocalStorageReady] = useState(false);
  const [onboardingStorageReady, setOnboardingStorageReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStepIndex, setOnboardingStepIndex] = useState(0);
  const [selectedOnboardingIntentKey, setSelectedOnboardingIntentKey] = useState("fan");
  const [selectedOnboardingAvoidanceKeys, setSelectedOnboardingAvoidanceKeys] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(initialSettingsOpen);
  const [settingsStorageReady, setSettingsStorageReady] = useState(false);
  const [defaultTimerPreference, setDefaultTimerPreference] = useState<SessionTimerOptionMinutes>(defaultLocalSettings.defaultTimerMinutes);
  const [startTabPreference, setStartTabPreference] = useState<MobileSectionKey>(defaultLocalSettings.startTabKey);
  const [pendingLocalClearAction, setPendingLocalClearAction] = useState<LocalClearAction>(null);
  const [localState, setLocalState] = useState<LocalStateEnvelopeV1 | null>(null);
  const [offlineManifestItems, setOfflineManifestItems] = useState<OfflineManifestItemV1[]>([]);
  const offlineManifestItemsRef = useRef<OfflineManifestItemV1[]>([]);
  const [offlineManifestReady, setOfflineManifestReady] = useState(false);
  const [offlineActionStatus, setOfflineActionStatus] = useState<string | null>(null);
  const [backupImportState, setBackupImportState] = useState<BackupImportState>({ mode: "merge", status: null, busy: false });
  const [localDataResetPhase, setLocalDataResetPhase] = useState<LocalDataResetPhase>("idle");
  const offlineManagerRef = useRef(new OfflineDownloadManager({
    filePort: expoOfflineFilePortV1,
    network: expoOfflineNetworkPortV1,
    quotaBytes: offlineQuotaBytes,
    reserveBytes: offlineStorageReserveBytes,
  }));
  const layerOfflineOperationCoordinatorRef = useRef(new LayerOfflineOperationCoordinatorV1());
  const [timerOptionMinutes, setTimerOptionMinutes] = useState<SessionTimerOptionMinutes>(0);
  const [timerRemainingMillis, setTimerRemainingMillis] = useState(0);
  const [timerIsRunning, setTimerIsRunning] = useState(false);
  const [sessionStopPhase, setSessionStopPhase] = useState<SessionStopPhase>("idle");
  const [mediaNotificationPermission, setMediaNotificationPermission] =
    useState<MediaNotificationPermissionState | null>(null);
  const [aggregateSessionType, setAggregateSessionType] = useState<"single" | "layered" | "directed" | null>(null);
  const nativeReconciledSessionIdRef = useRef<string | null>(null);
  const startTabPreferenceAppliedRef = useRef(Boolean(directedModeBack));
  const timerEndsAtMillisRef = useRef<number | null>(null);
  const timerFinishHandledRef = useRef(false);
  const sessionStopInProgressRef = useRef(false);
  const sessionStopOperationIdRef = useRef(0);
  const sessionClearOperationIdRef = useRef(0);
  const sessionReplacementGenerationRef = useRef(0);
  const playbackTraceStartedAtMillisRef = useRef(Date.now());
  const playbackTracePendingStatusRef = useRef<PlaybackTimingTraceStatusMilestones | null>(null);
  const [playbackTraceEnabled, setPlaybackTraceEnabled] = useState(false);
  const playbackTraceEnabledRef = useRef(false);
  const playbackTraceSequenceRef = useRef(0);
  const playbackTraceBufferRef = useRef(new BoundedPlaybackTraceBuffer(480));
  const replayOptimisticProgressDisplayRef = useRef<ReplayOptimisticProgressDisplayHandle | null>(null);
  const replayOptimisticProgressActiveRef = useRef(false);
  const replayOptimisticProgressGenerationRef = useRef(0);
  const loadedReplayCommandInFlightGenerationRef = useRef<number | null>(null);
  const replayOptimisticNativeProbeInFlightGenerationRef = useRef<number | null>(null);
  const replayOptimisticDurationSaturatedGenerationRef = useRef<number | null>(null);
  const replayOptimisticProgressStartedAtMillisRef = useRef(0);
  const replayOptimisticProgressSoundIdRef = useRef<string | null>(null);
  const replayOptimisticProgressPreviousPositionMillisRef = useRef(0);
  const replayOptimisticLastDisplayedPositionMillisRef = useRef(0);
  const replayOptimisticDeferredStatusTracedRef = useRef(false);
  const replayOptimisticFirstTickTracedRef = useRef(false);
  const replayOptimisticOneSecondSampleTracedRef = useRef(false);
  const replayOptimisticTwoSecondSampleTracedRef = useRef(false);
  const playbackTimingTraceEntriesRef = useRef<string[]>([]);
  const playbackTimingTraceDisplayRef = useRef<PlaybackTimingTraceDisplayHandle | null>(null);

  const clearTransientNotificationTimer = useCallback(() => {
    if (transientNotificationTimerRef.current) {
      clearTimeout(transientNotificationTimerRef.current);
      transientNotificationTimerRef.current = null;
    }
  }, []);

  const dismissTransientNotification = useCallback(() => {
    transientNotificationTokenRef.current += 1;
    clearTransientNotificationTimer();
    if (soundscapeAppMountedRef.current) {
      setTransientNotification(null);
    }
  }, [clearTransientNotificationTimer]);

  const showTransientNotification = useCallback((message: string) => {
    clearTransientNotificationTimer();
    const notificationToken = transientNotificationTokenRef.current + 1;
    transientNotificationTokenRef.current = notificationToken;
    if (soundscapeAppMountedRef.current) {
      setTransientNotification({ message, token: notificationToken });
    }
    transientNotificationTimerRef.current = setTimeout(() => {
      transientNotificationTimerRef.current = null;
      if (
        soundscapeAppMountedRef.current &&
        notificationToken === transientNotificationTokenRef.current
      ) {
        setTransientNotification(null);
      }
    }, transientNotificationDurationMillis);
  }, [clearTransientNotificationTimer]);

  useEffect(() => {
    soundscapeAppMountedRef.current = true;
    return () => {
      soundscapeAppMountedRef.current = false;
      transientNotificationTokenRef.current += 1;
      clearTransientNotificationTimer();
    };
  }, [clearTransientNotificationTimer]);

  const validSoundIds = useMemo(
    () => new Set(mobileCatalogSounds.map((catalogSound) => catalogSound.id)),
    [],
  );

  const soundById = useMemo(
    () => new Map(mobileCatalogSounds.map((catalogSound) => [catalogSound.id, catalogSound])),
    [],
  );

  const recordPlaybackTimingTrace = useCallback((
    event: string,
    options: {
      sound?: MobileCatalogSound | null;
      command?: string;
      status?: AVPlaybackStatus;
      error?: unknown;
      positionMillis?: number;
    } = {},
  ) => {
    if (!playbackTraceEnabledRef.current) return;
    const traceSound = options.sound ?? selectedSoundRef.current;
    const elapsedMillis = Date.now() - playbackTraceStartedAtMillisRef.current;
    playbackTraceSequenceRef.current += 1;
    const details = [
      `seq=${playbackTraceSequenceRef.current}`,
      `+${elapsedMillis}ms`,
      event,
      `sound=${traceSound.id}`,
      `title=${traceSound.title}`,
      `uri=${formatPlaybackTraceUri(traceSound.audioUrl)}`,
      options.command ? `command=${options.command}` : null,
      typeof options.positionMillis === "number" ? `positionMillis=${options.positionMillis}` : null,
      options.status ? `status=${summarizePlaybackTraceStatus(options.status)}` : null,
      options.error ? `error=${formatError(options.error)}` : null,
    ].filter(Boolean).join(" | ");

    playbackTraceBufferRef.current.record(details);
    const nextEntries = playbackTraceBufferRef.current.entries();
    playbackTimingTraceEntriesRef.current = nextEntries;
    playbackTimingTraceDisplayRef.current?.replace(nextEntries);
  }, []);

  const markPlaybackCommandForStatusTrace = useCallback((command: string) => {
    playbackTracePendingStatusRef.current = {
      command,
      loaded: false,
      playing: false,
      bufferingFalse: false,
    };
  }, []);

  const recordColdStartCacheEvent = useCallback((
    cacheSound: MobileCatalogSound,
    event: ColdStartCacheEvent,
  ) => {
    recordPlaybackTimingTrace(`cold start cache ${event}`, {
      sound: cacheSound,
      command: `cold-cache-${event.replace(/ /g, "-")}`,
    });
  }, [recordPlaybackTimingTrace]);

  const recordPlaybackStatusMilestones = useCallback((status: AVPlaybackStatus) => {
    const pendingStatus = playbackTracePendingStatusRef.current;
    if (!pendingStatus) {
      return;
    }

    if (!status.isLoaded) {
      if (status.error) {
        recordPlaybackTimingTrace("command error", {
          command: pendingStatus.command,
          error: status.error,
          status,
        });
        playbackTracePendingStatusRef.current = null;
      }
      return;
    }

    if (!pendingStatus.loaded) {
      pendingStatus.loaded = true;
      recordPlaybackTimingTrace("first loaded status after command", {
        command: pendingStatus.command,
        positionMillis: status.positionMillis ?? 0,
        status,
      });
    }

    if (!pendingStatus.playing && status.isPlaying) {
      pendingStatus.playing = true;
      recordPlaybackTimingTrace("first playing status after command", {
        command: pendingStatus.command,
        positionMillis: status.positionMillis ?? 0,
        status,
      });
      if (coldStartTraceSoundIdRef.current === selectedSoundRef.current.id) {
        recordPlaybackTimingTrace("cold start first playing status", {
          command: pendingStatus.command,
          positionMillis: status.positionMillis ?? 0,
          status,
        });
        coldStartTraceSoundIdRef.current = null;
      }
    }

    if (!pendingStatus.bufferingFalse && status.isBuffering === false) {
      pendingStatus.bufferingFalse = true;
      recordPlaybackTimingTrace("first buffering false after command", {
        command: pendingStatus.command,
        positionMillis: status.positionMillis ?? 0,
        status,
      });
    }

    const isPlayMilestone = ["play", "resume", "replay"].includes(pendingStatus.command);
    const commandReachedTruth = isPlayMilestone
      ? pendingStatus.playing
      : !status.isPlaying;
    if (pendingStatus.loaded && pendingStatus.bufferingFalse && commandReachedTruth) {
      playbackTracePendingStatusRef.current = null;
    }
  }, [recordPlaybackTimingTrace]);

  const handleClearPlaybackTimingTrace = useCallback(() => {
    playbackTraceStartedAtMillisRef.current = Date.now();
    playbackTracePendingStatusRef.current = null;
    playbackTraceSequenceRef.current = 0;
    playbackTimingTraceEntriesRef.current = [];
    playbackTraceBufferRef.current.clear();
    playbackTimingTraceDisplayRef.current?.replace([]);
  }, []);

  const handleTogglePlaybackTimingTrace = useCallback(() => {
    const nextEnabled = !playbackTraceEnabledRef.current;
    playbackTraceEnabledRef.current = nextEnabled;
    playbackTraceBufferRef.current.setEnabled(nextEnabled);
    setPlaybackTraceEnabled(nextEnabled);
    if (nextEnabled) {
      playbackTraceStartedAtMillisRef.current = Date.now();
      playbackTraceSequenceRef.current = 0;
      playbackTraceBufferRef.current.clear();
      playbackTimingTraceEntriesRef.current = [];
      recordPlaybackTimingTrace("TRACE_ENABLED");
    }
  }, [recordPlaybackTimingTrace]);

  useEffect(() => {
    if (!playbackTraceEnabled) return;
    let expectedAt = Date.now() + 100;
    const timer = setInterval(() => {
      const now = Date.now();
      const gapMillis = now - expectedAt;
      expectedAt = now + 100;
      if (gapMillis >= playbackTraceEventLoopGapThresholdMillis) {
        recordPlaybackTimingTrace(`EVENT_LOOP_GAP durationMillis=${gapMillis}`);
      }
    }, 100);
    return () => clearInterval(timer);
  }, [playbackTraceEnabled, recordPlaybackTimingTrace]);

  function stopLoadedReplayOptimisticProgressClock(
    reason: string,
    status?: AVPlaybackStatus,
    traceStop = true,
    displayPositionOverride?: number,
  ) {
    const wasActive = replayOptimisticProgressActiveRef.current;
    const displayPositionMillis = typeof displayPositionOverride === "number"
      ? displayPositionOverride
      : status?.isLoaded
        ? status.positionMillis ?? 0
        : reason === "pause"
          ? replayOptimisticLastDisplayedPositionMillisRef.current
          : reason === "error"
            ? replayOptimisticProgressPreviousPositionMillisRef.current
            : positionMillis;
    const shouldReconcileDisplay =
      wasActive || typeof displayPositionOverride === "number" || Boolean(status?.isLoaded);
    if (shouldReconcileDisplay) {
      replayOptimisticProgressDisplayRef.current?.stop(displayPositionMillis);
    }
    replayOptimisticProgressActiveRef.current = false;
    replayOptimisticProgressSoundIdRef.current = null;
    replayOptimisticDeferredStatusTracedRef.current = false;
    replayOptimisticFirstTickTracedRef.current = false;
    replayOptimisticOneSecondSampleTracedRef.current = false;
    replayOptimisticTwoSecondSampleTracedRef.current = false;

    if (wasActive && traceStop) {
      recordPlaybackTimingTrace("replay optimistic timer stop/reconciled", {
        command: `replay-${reason}`,
        positionMillis: displayPositionMillis,
        status,
      });
    }
  }

  function getReplaySaturationDisplayOverride() {
    return replayOptimisticDurationSaturatedGenerationRef.current ===
      replayOptimisticProgressGenerationRef.current
      ? replayOptimisticProgressPreviousPositionMillisRef.current
      : undefined;
  }

  function startLoadedReplayOptimisticProgressClock(soundToReplay: MobileCatalogSound) {
    stopLoadedReplayOptimisticProgressClock("restart", undefined, false, 0);
    replayOptimisticProgressActiveRef.current = true;
    replayOptimisticProgressPreviousPositionMillisRef.current = positionMillis;
    replayOptimisticLastDisplayedPositionMillisRef.current = 0;
    replayOptimisticProgressStartedAtMillisRef.current = Date.now();
    replayOptimisticProgressSoundIdRef.current = soundToReplay.id;
    replayOptimisticDeferredStatusTracedRef.current = false;
    replayOptimisticFirstTickTracedRef.current = false;
    replayOptimisticOneSecondSampleTracedRef.current = false;
    replayOptimisticTwoSecondSampleTracedRef.current = false;
    replayOptimisticProgressDisplayRef.current?.start(
      replayOptimisticProgressStartedAtMillisRef.current,
      secondsToMillis(soundToReplay.durationSeconds),
    );
    recordPlaybackTimingTrace("replay optimistic timer start", {
      sound: soundToReplay,
      command: "replay",
      positionMillis: 0,
    });
  }

  const handleLoadedReplayOptimisticProgressDisplayTick = useCallback((
    elapsedMillis: number,
    optimisticPositionMillis: number,
  ) => {
    if (!replayOptimisticProgressActiveRef.current) {
      return;
    }
    replayOptimisticLastDisplayedPositionMillisRef.current = optimisticPositionMillis;
    void probeLoadedReplayOptimisticNativeStatus();
    if (!replayOptimisticFirstTickTracedRef.current) {
      replayOptimisticFirstTickTracedRef.current = true;
      recordPlaybackTimingTrace("replay optimistic first tick", {
        command: "replay",
        positionMillis: optimisticPositionMillis,
      });
    }
    if (!replayOptimisticOneSecondSampleTracedRef.current && elapsedMillis >= 1000) {
      replayOptimisticOneSecondSampleTracedRef.current = true;
      recordPlaybackTimingTrace("replay optimistic sample tick", {
        command: "replay-sample-1000ms",
        positionMillis: optimisticPositionMillis,
      });
    }
    if (!replayOptimisticTwoSecondSampleTracedRef.current && elapsedMillis >= 2000) {
      replayOptimisticTwoSecondSampleTracedRef.current = true;
      recordPlaybackTimingTrace("replay optimistic sample tick", {
        command: "replay-sample-2000ms",
        positionMillis: optimisticPositionMillis,
      });
    }
    if (optimisticPositionMillis >= secondsToMillis(selectedSoundRef.current.durationSeconds)) {
      replayOptimisticDurationSaturatedGenerationRef.current = replayOptimisticProgressGenerationRef.current;
      stopLoadedReplayOptimisticProgressClock("duration", undefined, true, optimisticPositionMillis);
    }
  }, [recordPlaybackTimingTrace]);

  function shouldDeferLoadedReplayOptimisticStatus(status: AVPlaybackStatus) {
    if (!replayOptimisticProgressActiveRef.current || !status.isLoaded) {
      return false;
    }

    const nativePositionMillis = status.positionMillis ?? 0;
    const replaySoundStillCurrent =
      replayOptimisticProgressSoundIdRef.current === loadedSoundIdRef.current &&
      replayOptimisticProgressSoundIdRef.current === selectedSoundRef.current.id;

    if (!replaySoundStillCurrent) {
      stopLoadedReplayOptimisticProgressClock("sound-change", status, true, 0);
      return false;
    }

    const optimisticElapsedMillis = Date.now() - replayOptimisticProgressStartedAtMillisRef.current;
    if (status.didJustFinish) {
      const finishDurationMillis =
        status.durationMillis ?? secondsToMillis(selectedSoundRef.current.durationSeconds);
      const minimumTrustworthyFinishElapsedMillis = Math.max(
        0,
        finishDurationMillis - replayOptimisticNativeCatchupToleranceMillis,
      );
      if (optimisticElapsedMillis >= minimumTrustworthyFinishElapsedMillis) {
        stopLoadedReplayOptimisticProgressClock("didJustFinish", status);
        return false;
      }
      if (!replayOptimisticDeferredStatusTracedRef.current) {
        replayOptimisticDeferredStatusTracedRef.current = true;
        recordPlaybackTimingTrace("replay optimistic status ignored/deferred", {
          command: "replay-stale-didJustFinish",
          positionMillis: nativePositionMillis,
          status,
        });
      }
      return true;
    }

    if (!status.isPlaying && !status.isBuffering) {
      stopLoadedReplayOptimisticProgressClock("native-not-playing", status);
      return false;
    }

    const minimumTrustworthyNativePositionMillis = Math.max(
      replayOptimisticNativeMinimumTrustMillis,
      optimisticElapsedMillis - replayOptimisticNativeCatchupToleranceMillis,
    );
    const maximumTrustworthyNativePositionMillis =
      optimisticElapsedMillis + replayOptimisticNativeCatchupToleranceMillis;

    if (
      nativePositionMillis >= minimumTrustworthyNativePositionMillis &&
      nativePositionMillis <= maximumTrustworthyNativePositionMillis
    ) {
      stopLoadedReplayOptimisticProgressClock("status-reconciled", status);
      return false;
    }

    const deferredReason = nativePositionMillis === 0
      ? "position-still-zero"
      : nativePositionMillis > maximumTrustworthyNativePositionMillis
        ? "native-ahead-of-wall-clock"
        : "native-behind-wall-clock";
    if (!replayOptimisticDeferredStatusTracedRef.current) {
      replayOptimisticDeferredStatusTracedRef.current = true;
      recordPlaybackTimingTrace("replay optimistic status ignored/deferred", {
        command: `replay-${deferredReason}`,
        positionMillis: nativePositionMillis,
        status,
      });
    }
    return true;
  }

  async function probeLoadedReplayOptimisticNativeStatus() {
    if (!replayOptimisticProgressActiveRef.current) {
      return;
    }
    const probeGeneration = replayOptimisticProgressGenerationRef.current;
    if (replayOptimisticNativeProbeInFlightGenerationRef.current !== null) {
      return;
    }
    const soundToProbe = soundRef.current;
    if (!soundToProbe) {
      return;
    }

    replayOptimisticNativeProbeInFlightGenerationRef.current = probeGeneration;
    try {
      const status = await soundToProbe.getStatusAsync();
      if (
        probeGeneration !== replayOptimisticProgressGenerationRef.current ||
        soundRef.current !== soundToProbe ||
        !replayOptimisticProgressActiveRef.current
      ) {
        return;
      }
      if (!status.isLoaded) {
        if (status.error) {
          stopLoadedReplayOptimisticProgressClock(
            "error",
            undefined,
            false,
            replayOptimisticProgressPreviousPositionMillisRef.current,
          );
          setIsPlaying(false);
          setError(status.error);
        }
        return;
      }
      if (shouldDeferLoadedReplayOptimisticStatus(status)) {
        return;
      }

      setIsPlaying(status.isPlaying);
      if (!isScrubbingRef.current) {
        replayOptimisticProgressDisplayRef.current?.sync(status.positionMillis ?? 0);
        setPositionMillis(status.positionMillis ?? 0);
      }
      setDurationMillis(
        status.durationMillis ?? secondsToMillis(selectedSoundRef.current.durationSeconds),
      );
    } catch {
      // A failed probe is non-authoritative; the optimistic clock keeps running.
    } finally {
      if (replayOptimisticNativeProbeInFlightGenerationRef.current === probeGeneration) {
        replayOptimisticNativeProbeInFlightGenerationRef.current = null;
      }
    }
  }

  const preferenceSummary = useMemo(() => ({
    likedSounds: preferenceFeedback.likedSoundIds.length,
    notForMeSounds: preferenceFeedback.dislikedSoundIds.length,
    avoidedSounds: preferenceFeedback.avoidedSoundIds.length,
    likedRecipes: preferenceFeedback.likedRecipeFingerprints.length,
    notForMeRecipes: preferenceFeedback.dislikedRecipeFingerprints.length,
    boostedPreferences: preferenceFeedback.tagBoosts.length,
    reducedPreferences: preferenceFeedback.tagAvoids.length,
  }), [preferenceFeedback]);

  if (!recipeDerivationCoordinatorRef.current) {
    recipeDerivationCoordinatorRef.current = new RecipeDerivationCoordinator({
      requestFrame: (callback) => requestAnimationFrame(callback),
      postTask: (callback) => setTimeout(callback, 0),
      onTrace: (event) => {
        recordPlaybackTimingTrace(
          `${event.type} surface=${event.surface} action=${event.action} inputRevision=${event.inputRevision} requestRevision=${event.requestRevision} reason=${event.reason}${typeof event.durationMillis === "number" ? ` durationMillis=${event.durationMillis}` : ""}`,
          { command: "recipe-generation" },
        );
      },
    });
  }
  const recipeDerivationCoordinator = recipeDerivationCoordinatorRef.current!;
  const currentRecipePreferences = (): RecipeEnginePreferenceOptions => ({
    likedSoundIds: preferenceFeedbackRef.current.likedSoundIds,
    dislikedSoundIds: preferenceFeedbackRef.current.dislikedSoundIds,
    avoidedSoundIds: preferenceFeedbackRef.current.avoidedSoundIds,
    boostedTags: preferenceFeedbackRef.current.tagBoosts,
    reducedTags: preferenceFeedbackRef.current.tagAvoids,
  });
  const publishBuilderModel = (model: BuilderSessionModelV1 | null) => {
    activeBuilderModelRef.current = model;
    setActiveBuilderModel(model);
  };

  const selectedBuilderIntent = builderIntentOptions.find((option) => option.key === builderIntentKey) ?? builderIntentOptions[0];
  const requestBuilderRecipeGeneration = (
    intentOption: BuilderIntentOption,
    density: RecipeDensity,
    seed: number,
    action: "mood" | "layers" | "try-another",
  ) => {
    builderRecipeInputRevisionRef.current += 1;
    const inputRevision = builderRecipeInputRevisionRef.current;
    const input = {
      intent: intentOption.intent,
      density,
      allowUserChoice: intentOption.allowUserChoice === true,
      requestedOptInTags: intentOption.allowUserChoice ? optInToneBowlTriggerTerms : [],
      preferences: currentRecipePreferences(),
      recentSoundIds: [...recentSoundIds],
      seed: `builder-v3-${intentOption.key}-${density}-${seed}`,
    };
    recipeDerivationCoordinator.request({
      surface: "Builder",
      action,
      reason: "explicit-user-request",
      inputRevision,
      inputKey: JSON.stringify(input),
      acknowledge: () => {
        setBuilderRecipeGenerating(true);
        AccessibilityInfo.announceForAccessibility("Building a soundscape");
      },
      derive: () => recommendationService.derive(
        input,
        "Builder",
        inputRevision,
        quickFeedbackRevisionRef.current,
        catalogRepository.revision,
      ),
      store: (result) => {
        const recipe = result.bestRecipe;
        const preset = recipeToMobileBuilderPreset(recipe, soundById);
        if (recipe && preset) {
          try {
            publishBuilderModel(createBuilderSessionModelFromGenerated(recipe, {
              title: preset.title,
              intent: intentOption.intent,
              density,
              seed: `builder-v3-${intentOption.key}-${density}-${seed}`,
              choiceGranted: intentOption.allowUserChoice === true,
            }));
          } catch (builderContractError: unknown) {
            publishBuilderModel(null);
            setError(`Builder contract rejected this recipe. ${formatError(builderContractError)}`);
          }
        } else {
          publishBuilderModel(null);
        }
        setGeneratedBuilderRecipeResult(result);
        setBuilderRecipeGenerating(false);
      },
    });
  };

  const requestFastStartRecipeGeneration = (
    recommendation: FastStartRecommendation,
    refinement: FastStartRecipeRefinement,
    seed: number,
    avoidedIntents: FastStartIntent[],
    action: "chip" | "search" | "alternative" | "try-another" | "refine",
    retainCurrentIfUnavailable = false,
  ) => {
    fastStartRecipeInputRevisionRef.current += 1;
    const inputRevision = fastStartRecipeInputRevisionRef.current;
    const input = {
      intent: buildFastStartRecipeIntent(recommendation, refinement),
      density: getFastStartRecipeDensity(recommendation, refinement),
      allowUserChoice: recommendation.allowUserChoice,
      requestedOptInTags: recommendation.allowUserChoice ? optInToneBowlTriggerTerms : [],
      positiveTags: getFastStartRecipePositiveTags(refinement),
      avoidanceTags: getFastStartRecipeAvoidanceTags(avoidedIntents, refinement),
      preferences: currentRecipePreferences(),
      recentSoundIds: [...recentSoundIds],
      seed: `fast-start-v3-${recommendation.sourceLabel}-${refinement}-${seed}`,
    };
    recipeDerivationCoordinator.request({
      surface: "Fast",
      action,
      reason: "explicit-user-request",
      inputRevision,
      inputKey: JSON.stringify(input),
      acknowledge: () => {
        setFastStartRecipeGenerating(true);
        AccessibilityInfo.announceForAccessibility("Generating a recipe");
      },
      derive: () => recommendationService.derive(
        input,
        "Fast",
        inputRevision,
        quickFeedbackRevisionRef.current,
        catalogRepository.revision,
      ),
      store: (result) => {
        const candidateRecipe = result.bestRecipe;
        const candidatePreset = recipeToMobileBuilderPreset(candidateRecipe, soundById);
        const candidateAvailability = getFastStartRecipeAvailability(candidatePreset, candidateRecipe);
        if (retainCurrentIfUnavailable && (!candidateAvailability.available || !candidatePreset?.layeredPreview)) {
          setFastStartMessage(
            refinement === "less-water"
              ? "No safer less-water mix found; keeping the current recipe."
              : "No safer replacement mix found; keeping the current recipe.",
          );
          setFastStartMessageTone("notice");
          setFastStartRecipeGenerating(false);
          return;
        }
        setFastStartGeneratedRecipeResult(result);
        fastStartRecipeSeedRef.current = seed;
        setFastStartRecipeRefinement(refinement);
        setFastStartRecipeSeed(seed);
        setFastStartRecipeGenerating(false);
        if (action === "try-another" || action === "refine") {
          setFastStartMessage("Recipe updated. Press Start generated recipe when ready.");
          setFastStartMessageTone("matched");
        }
      },
    });
  };

  const generatedBuilderRecipe = generatedBuilderRecipeResult?.bestRecipe;
  const generatedBuilderPreset = useMemo(
    () => recipeToMobileBuilderPreset(generatedBuilderRecipe, soundById),
    [generatedBuilderRecipe, soundById],
  );
  const fastStartGeneratedRecipe = fastStartGeneratedRecipeResult?.bestRecipe;
  const fastStartGeneratedRecipePreset = useMemo(
    () => recipeToMobileBuilderPreset(fastStartGeneratedRecipe, soundById),
    [fastStartGeneratedRecipe, soundById],
  );
  const fastStartRecipeAvailability = useMemo(
    () => getFastStartRecipeAvailability(fastStartGeneratedRecipePreset, fastStartGeneratedRecipe),
    [fastStartGeneratedRecipePreset, fastStartGeneratedRecipe],
  );
  const fastStartPrimaryRecommendation = useMemo<FastStartPrimaryRecommendation>(
    () => decideFastStartPrimaryRecommendation(fastStartRecommendation, fastStartGeneratedRecipePreset, fastStartRecipeAvailability),
    [fastStartRecommendation, fastStartGeneratedRecipePreset, fastStartRecipeAvailability],
  );

  const savedSounds = useMemo(
    () => savedSoundIds.map((soundId) => soundById.get(soundId)).filter(isMobileCatalogSound),
    [savedSoundIds, soundById],
  );
  const sortedSavedSounds = useMemo(
    () => sortLibrarySounds(savedSounds, librarySortMode),
    [librarySortMode, savedSounds],
  );
  const sortedSavedSessions = useMemo(
    () => sortSavedSessions(savedSessions, savedSessionSortMode),
    [savedSessionSortMode, savedSessions],
  );
  const quickMixes = useMemo(() => deriveQuickMixes(savedSessions), [savedSessions]);
  const duplicateSavedSessionName = useMemo(() => {
    const normalizedName = savedSessionNameInput.trim().toLocaleLowerCase();
    if (!normalizedName) return false;
    return savedSessions.some((session) =>
      session.id !== savedSessionDialog?.sessionId && session.name.toLocaleLowerCase() === normalizedName,
    );
  }, [savedSessionDialog?.sessionId, savedSessionNameInput, savedSessions]);

  const recentSounds = useMemo(
    () => recentSoundIds.map((soundId) => soundById.get(soundId)).filter(isMobileCatalogSound),
    [recentSoundIds, soundById],
  );
  const sortedRecentSounds = useMemo(
    () => sortLibrarySounds(recentSounds, librarySortMode),
    [librarySortMode, recentSounds],
  );

  const selectedSoundIsSaved = savedSoundIds.includes(selectedSound.id);
  const selectedOnboardingIntent = onboardingIntentOptions.find(
    (option) => option.key === selectedOnboardingIntentKey,
  ) ?? onboardingIntentOptions[1];
  const selectedOnboardingAvoidanceOptions = onboardingAvoidanceOptions.filter((option) =>
    selectedOnboardingAvoidanceKeys.includes(option.key),
  );
  const onboardingStep = onboardingSteps[onboardingStepIndex] ?? onboardingSteps[0];
  const onboardingFastStartQuery = buildOnboardingFastStartQuery(
    selectedOnboardingIntent,
    selectedOnboardingAvoidanceOptions,
  );

  const normalizedBrowseSearchText = normalizeFastStartText(browseSearchText);
  const browseSearchExplicitlyAllowsChoice = normalizedBrowseSearchText
    ? isExplicitOptInChoiceQuery(normalizedBrowseSearchText, [])
    : false;
  const browseFiltersExplicitlyAllowChoice =
    browseFilters.availability.includes("choice-only") ||
    browseFilters.category.includes("choice-tones-bowls") ||
    browseFilters.category.includes("voice-whisper-soft-spoken") ||
    activeBrowseCollectionId === "choice-tones" ||
    activeBrowseCollectionId === "choice-voice";
  const browseAllowsUserChoice = browseSearchExplicitlyAllowsChoice || browseFiltersExplicitlyAllowChoice;
  const activeBrowseFilterChips = useMemo(
    () => getActiveBrowseFilterLabels(browseFilters, activeBrowseCollectionId),
    [activeBrowseCollectionId, browseFilters],
  );
  const effectiveBrowseFilters = useMemo<BrowseFilterState>(() => {
    if (!browseSearchExplicitlyAllowsChoice || !browseFilters.availability.includes("default-safe")) {
      return browseFilters;
    }
    return { ...browseFilters, availability: [] };
  }, [browseFilters, browseSearchExplicitlyAllowsChoice]);
  const browseSectionIsActive = !settingsOpen && activeSectionKey === "browse";
  const filteredBrowseSounds = useMemo(
    () => browseSectionIsActive
      ? mobileCatalogSounds
          .filter((catalogSound) => !catalogSound.userChoiceOnly || browseAllowsUserChoice)
          .filter((catalogSound) => matchesBrowseSearch(catalogSound, normalizedBrowseSearchText))
          .filter((catalogSound) => soundMatchesBrowseFilters(catalogSound, effectiveBrowseFilters))
          .filter((catalogSound) => soundMatchesDiscoveryCollection(catalogSound, activeBrowseCollectionId))
      : [],
    [
      activeBrowseCollectionId,
      browseAllowsUserChoice,
      browseSectionIsActive,
      effectiveBrowseFilters,
      normalizedBrowseSearchText,
    ],
  );
  const browseFilterOptionCounts = useMemo(
    () => getBrowseFilterOptionCounts(
      mobileCatalogSounds,
      browseFilters,
      activeBrowseCollectionId,
      (catalogSound) => matchesBrowseSearch(catalogSound, normalizedBrowseSearchText),
      browseSearchExplicitlyAllowsChoice,
    ),
    [
      activeBrowseCollectionId,
      browseFilters,
      browseSearchExplicitlyAllowsChoice,
      normalizedBrowseSearchText,
    ],
  );

  const visibleBrowseGroups = useMemo(
    () => browseSectionIsActive
      ? mobileCatalogLanes
          .map((lane) => ({
            lane,
            sounds: filteredBrowseSounds.filter((catalogSound) => catalogSound.lane === lane),
          }))
          .filter((group) => group.sounds.length > 0)
      : [],
    [browseSectionIsActive, filteredBrowseSounds],
  );
  const browseListItems = useMemo<BrowseListItem[]>(
    () => visibleBrowseGroups.flatMap((group) => [
      { type: "lane" as const, lane: group.lane, count: group.sounds.length },
      ...group.sounds.map((sound) => ({ type: "sound" as const, lane: group.lane, sound })),
    ]),
    [visibleBrowseGroups],
  );
  const browseVisibleSoundCount = filteredBrowseSounds.length;

  const contractPlaybackPhase = playbackContractState.status.phase;
  const nowPlayingStatus: NowPlayingStatus = error || layeredPreviewError || contractPlaybackPhase === "error"
    ? "error"
    : contractPlaybackPhase === "loading"
      ? "loading"
      : contractPlaybackPhase === "playing"
        ? "playing"
        : contractPlaybackPhase === "paused" || contractPlaybackPhase === "stopping" || contractPlaybackPhase === "ended"
          ? "paused"
          : "idle";

  const progressDurationMillis = durationMillis || secondsToMillis(selectedSound.durationSeconds);
  const hasProgressDuration = progressDurationMillis > 0;
  const activeAvoidanceLabel = formatIntentLabels(activeAvoidedIntents);
  const selectedLayeredPreview = selectedPreset?.layeredPreview;
  const activeLayeredPreviewLayers = selectedPreset && selectedLayeredPreview
    ? getActiveLayeredPreviewLayers(
        selectedPreset,
        selectedLayeredPreview,
        builderEnabledLayerKeys,
        builderLayerBalances,
        builderLayerSwaps,
      ).filter((layer) => !layeredUnavailableSoundIds.includes(layer.soundId))
    : [];
  const selectedRecipeConflictSound = selectedPreset
    ? getPresetAvoidedConflictSound(selectedPreset, activeAvoidedIntents)
    : null;
  const selectedSoundLoopEligible = selectedSound.loopEligible;
  const activeLayeredLoopSounds = activeLayeredPreviewLayers
    .map((layer) => soundById.get(layer.soundId))
    .filter((catalogSound): catalogSound is MobileCatalogSound => Boolean(catalogSound));
  const layeredLoopEligible = activeLayeredLoopSounds.length === activeLayeredPreviewLayers.length
    && isLayeredLoopEligible(activeLayeredLoopSounds);
  const activeSessionLoopEligible = currentSession?.type === "recipe"
    ? layeredLoopEligible
    : selectedSoundLoopEligible;
  const loopStatusLabel = !currentSession
    ? "Loop off"
    : activeSessionLoopEligible
      ? isLoopEnabled
        ? "Loop on"
        : "Loop off"
      : "Loop unavailable";
  const sessionStopInProgress = sessionStopPhase === "stopping";
  const singlePlaybackStopped = currentSession?.type === "single" && sessionStopPhase === "stopped";
  const singlePlaybackStatusLabel = sessionStopInProgress
    ? "Fading out…"
    : isLoading || contractPlaybackPhase === "loading"
      ? "Loading"
      : isPlaying
        ? "Playing"
        : sound
          ? "Paused"
          : "Stopped";
  const layeredSelectionPending = pendingLayeredPresetId !== null;
  const layeredPlaybackStatusLabel = sessionStopInProgress
    ? "Fading out…"
    : layeredSelectionPending
      ? "Preparing selected preset…"
      : layeredPreviewStatus === "playing"
        ? "Layered preview playing"
        : layeredPreviewStatus === "paused"
          ? "Layered preview paused"
          : layeredPreviewStatus === "loading"
            ? "Layered preview loading"
            : layeredPreviewStatus === "error"
              ? "Layered preview error"
              : "Layered preview stopped";
  const activePlaybackStatusLabel = currentSession?.type === "recipe"
    ? layeredPlaybackStatusLabel
    : singlePlaybackStatusLabel;
  const primaryPlaybackError = currentSession?.type === "recipe" ? layeredPreviewError : error;
  const singlePlaybackCommandInFlight = isSinglePlaybackCommandInFlight({
    reactIsLoading: isLoading,
    contractPhase: contractPlaybackPhase,
  });
  const singlePlaybackProjection = {
    sessionType: currentSession?.type ?? null,
    phase: contractPlaybackPhase,
    isPlaying,
    resourceLoaded: Boolean(sound),
    explicitlyStopped: singlePlaybackStopped,
    positionMillis,
    durationMillis: progressDurationMillis,
  } as const;
  const singlePlaybackEnded = isSinglePlaybackReplayReady(singlePlaybackProjection);
  const singlePlayButtonLabel = getSinglePlaybackPrimaryLabel(singlePlaybackProjection);
  const startingThisBestSound = Boolean(
    fastStartResultSound && fastStartStartingSoundId === fastStartResultSound.id,
  );
  const failedStartingThisBestSound = Boolean(
    fastStartResultSound && fastStartStartFailedSoundId === fastStartResultSound.id,
  );
  const layeredPlaybackEnded = !layeredSelectionPending && currentSession?.type === "recipe" && layeredPreviewStatus === "stopped";
  const layeredTransportProjection = projectLayeredTransport(layeredPreviewStatus);
  const layeredPlayButtonLabel = layeredSelectionPending
    ? "Loading…"
    : layeredPlaybackEnded
      ? "Replay"
      : layeredTransportProjection.fullLabel;
  const layeredPlayAccessibilityLabel = layeredSelectionPending
    ? "Preparing selected layered preset"
    : layeredPlaybackEnded
      ? "Replay layered soundscape"
      : layeredPreviewStatus === "playing"
        ? "Pause layered soundscape"
        : layeredPreviewStatus === "paused"
          ? "Resume layered soundscape"
          : "Play layered soundscape";
  const miniPrimaryButtonLabel = currentSession?.type === "recipe"
    ? layeredSelectionPending ? "Loading…" : layeredPlaybackEnded ? "Replay" : layeredTransportProjection.miniLabel
    : singlePlaybackEnded ? "Replay" : isPlaying ? "Pause" : sound ? "Resume" : "Play";
  const miniPrimaryButtonAction = () => {
    if (sessionStopInProgressRef.current) {
      return;
    }
    if (currentSession?.type === "recipe") {
      runUserPlaybackAction(
        layeredSelectionPending
          ? handleLayeredPreviewResume
          : layeredPreviewStatus === "playing"
            ? handleLayeredPreviewPause
            : layeredPlaybackEnded
              ? handleLayeredPreviewReplay
              : handleLayeredPreviewResume,
      );
      return;
    }
    runUserPlaybackAction(isPlaying ? handlePause : singlePlaybackEnded ? handleReplay : handlePlay);
  };
  const miniLoopButtonLabel = !activeSessionLoopEligible ? "Loop N/A" : isLoopEnabled ? "Loop On" : "Loop Off";
  const timerIsCounting = timerOptionMinutes > 0 && timerIsRunning && timerEndsAtMillisRef.current !== null;
  const timerStatusLabel = timerOptionMinutes === 0
    ? "Timer off"
    : timerIsCounting
      ? `Ends in ${formatDurationFromMillis(timerRemainingMillis)}`
      : `${timerOptionMinutes}m ready`;
  const miniChoiceRequired = Boolean(
    selectedSound.clearLabelRequired
    || selectedSound.userChoiceOnly
    || selectedPreset?.clearLabelRequired
    || selectedPreset?.userChoiceOnly,
  );
  const miniStatusMetadata = sessionStopInProgress
    ? "Fading out…"
    : getMiniPlayerStatusMetadata({
        sessionType: currentSession?.type ?? "single",
        activeLayerCount: activeLayeredPreviewLayers.length,
        activePlaybackStatusLabel,
        choiceRequired: miniChoiceRequired,
        timerLabel: timerIsCounting
          ? `Ends in ${formatDurationFromMillis(timerRemainingMillis)}`
          : null,
      });
  const loopHelperLabel = currentSession
    ? timerIsCounting
      ? "Timer overrides loop."
      : activeSessionLoopEligible
        ? currentSession.type === "recipe"
          ? "Restarts every supported layer for longer sessions."
          : "Restarts this sound for longer sessions."
        : currentSession.type === "recipe"
          ? "One or more active layers are not approved for looping."
          : getLoopUnavailableHelperLabel(selectedSound)
    : "Choose a session.";
  const currentSessionModeLabel = currentSession?.type === "recipe" ? "Layered recipe" : "Single sound";
  const currentSessionSourceLabel = currentSession?.source ?? "Choose";
  const setLoadedSingleSoundId = useCallback((nextSoundId: string | null) => {
    loadedSoundIdRef.current = nextSoundId;
    setLoadedSoundId(nextSoundId);
  }, []);
  const relatedSounds = useMemo(
    () =>
      currentSession?.type === "single"
        ? mobileCatalogSounds
            .filter((catalogSound) => catalogSound.lane === selectedSound.lane)
            .filter((catalogSound) => catalogSound.id !== selectedSound.id)
            .filter((catalogSound) => !preferenceFeedback.avoidedSoundIds.includes(catalogSound.id))
            .filter((catalogSound) => !matchesAnyIntent(catalogSound, activeAvoidedIntents))
            .slice(0, 3)
        : [],
    [activeAvoidedIntents, currentSession, preferenceFeedback.avoidedSoundIds, selectedSound],
  );

  const invalidateSavedSessionStartForUserAction = () => {
    savedSessionStartGenerationRef.current += 1;
    savedSessionPreparedAudioUriRef.current = null;
    setPendingSavedSessionStart(null);
    setSavedSessionStartRequest(null);
    setPendingSavedSessionPlaybackConfirmation(null);
  };

  const runUserPlaybackAction = (action: () => void | Promise<unknown>) => {
    invalidateSavedSessionStartForUserAction();
    void action();
  };

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      setPlaybackProjectionForeground(nextState === "active");
      if (nextState === "active") {
        void audioService.queryAuthoritativeState().catch((queryError: unknown) => {
          setError(`Couldn’t reconcile native playback state. ${formatError(queryError)}`);
        });
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    audioService.configure().catch((audioModeError: unknown) => {
      setError(formatError(audioModeError));
    });
  }, []);

  useEffect(() => {
    selectedSoundRef.current = selectedSound;
  }, [selectedSound]);

  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);


  useEffect(() => {
    isLoopEnabledRef.current = isLoopEnabled;
  }, [isLoopEnabled]);

  useEffect(() => {
    activeSectionKeyRef.current = activeSectionKey;
  }, [activeSectionKey]);


  useEffect(() => {
    if (activeSectionKey !== "player" || !pendingPlayerTopScrollRef.current) {
      return;
    }

    pendingPlayerTopScrollRef.current = false;
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollToOffset({ offset: 0, animated: false });
    });
  }, [activeSectionKey, currentSession?.updatedAt]);

  useEffect(() => {
    let cancelled = false;

    const loadLocalSoundState = async () => {
      try {
        const [storedSavedIds, storedRecentIds] = await Promise.all([
          appPersistence.loadSoundIds("saved"),
          appPersistence.loadSoundIds("recent"),
        ]);

        if (cancelled) {
          return;
        }

        setSavedSoundIds(storedSavedIds.filter((soundId) => validSoundIds.has(soundId)));
        setRecentSoundIds(storedRecentIds.filter((soundId) => validSoundIds.has(soundId)).slice(0, recentSoundLimit));
      } catch {
        if (!cancelled) {
          setSavedSoundIds([]);
          setRecentSoundIds([]);
        }
      } finally {
        if (!cancelled) {
          setLocalStorageReady(true);
        }
      }
    };

    loadLocalSoundState().catch(() => {
      if (!cancelled) {
        setLocalStorageReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [validSoundIds]);

  useEffect(() => {
    let cancelled = false;
    const loadSavedSessionsState = async () => {
      try {
        const storedSessions = await loadSavedSessions(appPersistence.storage);
        if (!cancelled) {
          setSavedSessions(storedSessions);
          setSavedSessionsStorageReady(true);
          setSavedSessionStorageError(null);
        }
      } catch (storageError: unknown) {
        if (!cancelled) {
          setSavedSessionStorageError(`Couldn’t load saved sessions. ${formatError(storageError)}`);
        }
      }
    };
    loadSavedSessionsState().catch((storageError: unknown) => {
      if (!cancelled) {
        setSavedSessionStorageError(`Couldn’t load saved sessions. ${formatError(storageError)}`);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const unsubscribe = audioService.subscribe((nativeState) => {
      if (!mounted) return;
      setAggregateSessionType(nativeState.sessionType);
      setMediaNotificationPermission(audioService.notificationPermissionState());
      if (nativeState.sessionType === "directed") {
        // A newer Directed owner truthfully supersedes classic handles. Clear only
        // the stale view projection; native generation fencing makes stale handles inert.
        soundRef.current = null;
        setSound(null);
        setLoadedSingleSoundId(null);
        layeredSoundsRef.current = [];
        setCurrentSession(null);
        setIsPlaying(false);
        layeredPreviewStatusRef.current = "idle";
        setLayeredPreviewStatus("idle");
        return;
      }
      const timerRemaining = audioService.nativeTimerRemainingMillis(nativeState);
      if (nativeState.timerDeadlineElapsedRealtimeMs) {
        timerEndsAtMillisRef.current = Date.now() + timerRemaining;
        setTimerRemainingMillis(timerRemaining);
        setTimerIsRunning(timerRemaining > 0);
      } else {
        timerEndsAtMillisRef.current = null;
        setTimerRemainingMillis(0);
        setTimerIsRunning(false);
      }

      if (nativeState.phase === "playing") {
        setSessionStopPhase(nativeState.kind === "timer_fade_started" ? "stopping" : "idle");
        if (nativeState.sessionType === "layered") {
          layeredPreviewStatusRef.current = "playing";
          setLayeredPreviewStatus("playing");
        } else {
          setIsPlaying(true);
        }
      } else if (nativeState.phase === "paused") {
        if (nativeState.sessionType === "layered") {
          layeredPreviewStatusRef.current = "paused";
          setLayeredPreviewStatus("paused");
        } else {
          setIsPlaying(false);
        }
      } else if (nativeState.phase === "stopped" || nativeState.phase === "idle") {
        setIsPlaying(false);
        layeredPreviewStatusRef.current = nativeState.phase === "stopped" ? "stopped" : "idle";
        setLayeredPreviewStatus(nativeState.phase === "stopped" ? "stopped" : "idle");
        timerEndsAtMillisRef.current = null;
        setTimerRemainingMillis(0);
        setTimerIsRunning(false);
        if (nativeState.phase === "stopped") setSessionStopPhase("stopped");
      }

      if (
        nativeState.sessionId &&
        nativeState.metadata &&
        nativeState.phase !== "idle" &&
        nativeState.phase !== "stopped" &&
        nativeReconciledSessionIdRef.current !== nativeState.sessionId
      ) {
        nativeReconciledSessionIdRef.current = nativeState.sessionId;
        if (nativeState.sessionType === "layered") {
          const currentLayeredSession = currentSessionRef.current?.type === "recipe"
            ? currentSessionRef.current
            : null;
          const reconciledIdentity = reconcileLayeredSessionIdentity({
            currentSession: currentLayeredSession
              ? {
                  recipeId: currentLayeredSession.recipeId,
                  title: currentLayeredSession.title,
                  source: currentLayeredSession.source,
                  startingSoundId: currentLayeredSession.startingSoundId,
                }
              : null,
            nativeSession: {
              sessionId: nativeState.sessionId,
              recipeId: nativeState.metadata.recipeId ?? null,
              title: nativeState.metadata.title,
              startingSoundId: nativeState.layers[0]?.soundId ?? selectedSoundRef.current.id,
            },
          });
          setCurrentSession({
            type: "recipe",
            title: reconciledIdentity.title,
            source: reconciledIdentity.source as SessionSource,
            recipeId: reconciledIdentity.recipeId,
            startingSoundId: reconciledIdentity.startingSoundId,
            updatedAt: Date.now(),
          });
        } else {
          setCurrentSession({
            type: "single",
            title: nativeState.metadata.title,
            source: "Player",
            soundId: nativeState.layers[0]?.soundId ?? selectedSoundRef.current.id,
            updatedAt: Date.now(),
          });
        }
      }
    });

    void audioService.configure()
      .then(() => {
        if (mounted) setMediaNotificationPermission(audioService.notificationPermissionState());
      })
      .catch((nativeError: unknown) => {
        if (mounted) setError(`Native playback is unavailable. ${formatError(nativeError)}`);
      });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!savedSessionsStorageReady) return;
    persistSavedSessions(appPersistence.storage, savedSessions)
      .then(() => setSavedSessionStorageError(null))
      .catch((storageError: unknown) => {
        setSavedSessionStorageError(`Couldn’t save sessions. Your current edits are still here; try again. ${formatError(storageError)}`);
      });
  }, [savedSessions, savedSessionsStorageReady]);

  useEffect(() => {
    let cancelled = false;

    const loadOnboardingState = async () => {
      try {
        const storedComplete = await appPersistence.loadOnboardingComplete();
        if (cancelled) {
          return;
        }
        setShowOnboarding(!storedComplete);
      } catch {
        if (!cancelled) {
          setShowOnboarding(true);
        }
      } finally {
        if (!cancelled) {
          setOnboardingStorageReady(true);
        }
      }
    };

    loadOnboardingState().catch(() => {
      if (!cancelled) {
        setShowOnboarding(true);
        setOnboardingStorageReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadLocalSettingsState = async () => {
      try {
        const parsedSettings = await appPersistence.loadSettings();
        if (cancelled) {
          return;
        }
        setDefaultTimerPreference(parsedSettings.defaultTimerMinutes);
        setStartTabPreference(parsedSettings.startTabKey);
        setTimerOptionMinutes(parsedSettings.defaultTimerMinutes);
        setTimerRemainingMillis(parsedSettings.defaultTimerMinutes * 60 * 1000);
      } catch {
        if (!cancelled) {
          setDefaultTimerPreference(defaultLocalSettings.defaultTimerMinutes);
          setStartTabPreference(defaultLocalSettings.startTabKey);
        }
      } finally {
        if (!cancelled) {
          setSettingsStorageReady(true);
        }
      }
    };

    loadLocalSettingsState().catch(() => {
      if (!cancelled) {
        setSettingsStorageReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadM7LocalState = async () => {
      const now = new Date().toISOString();
      let seed = await appPersistence.loadLocalProfileSeed();
      if (!seed) {
        seed = `soundscape-${Date.now().toString(36)}`;
        await appPersistence.saveLocalProfileSeed(seed);
      }
      const rawState = await appPersistence.loadLocalStateRaw();
      const state = rawState
        ? readLocalStateRollbackSafe(rawState, { seed, now })
        : migrateLocalStateV1({
            seed,
            now,
            legacy: {
              savedSoundIds: await appPersistence.loadSoundIds("saved"),
              recentSoundIds: await appPersistence.loadSoundIds("recent"),
              settings: await appPersistence.loadSettings(),
              preferencesRaw: await appPersistence.loadPreferencesRaw(),
              savedSessionsRaw: await appPersistence.storage.getItem(SAVED_SESSIONS_STORAGE_KEY),
              currentSessionRaw: null,
              catalogRevision: catalogRepository.revision,
              offlineManifest: [],
            },
          });
      if (!rawState) await appPersistence.saveLocalStateRaw(serializeLocalStateV1(state));
      const rawManifest = await appPersistence.loadOfflineManifestRaw();
      let parsedItems: OfflineManifestItemV1[] = [];
      try {
        const parsed = rawManifest ? JSON.parse(rawManifest) : [];
        if (Array.isArray(parsed)) {
          parsedItems = parsed
            .filter((item): item is OfflineManifestItemV1 => item?.version === 1 && typeof item.assetId === "string" && typeof item.expectedBytes === "number")
            .map((item) => recoverOfflineManifestItem(item, now));
        }
      } catch {
        setOfflineActionStatus("Offline records were corrupt and were ignored without deleting media files.");
      }
      if (cancelled) return;
      setLocalState(state);
      offlineManifestItemsRef.current = parsedItems;
      setOfflineManifestItems(parsedItems);
      offlineManagerRef.current = new OfflineDownloadManager({
        filePort: expoOfflineFilePortV1,
        network: expoOfflineNetworkPortV1,
        quotaBytes: offlineQuotaBytes,
        reserveBytes: offlineStorageReserveBytes,
        initialItems: parsedItems,
      });
      setOfflineManifestReady(true);
    };
    loadM7LocalState().catch((loadError: unknown) => {
      if (!cancelled) {
        setOfflineActionStatus(`Local profile could not be loaded. ${formatError(loadError)}`);
        setOfflineManifestReady(true);
      }
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    offlineManifestItemsRef.current = offlineManifestItems;
    if (offlineManifestReady) appPersistence.saveOfflineManifestRaw(JSON.stringify(offlineManifestItems)).catch(() => undefined);
  }, [offlineManifestItems, offlineManifestReady]);

  useEffect(() => {
    if (!settingsStorageReady) {
      return;
    }

    const settingsPayload: LocalSettings = {
      defaultTimerMinutes: defaultTimerPreference,
      startTabKey: startTabPreference,
    };
    appPersistence.saveSettings(settingsPayload).catch(() => undefined);
  }, [defaultTimerPreference, settingsStorageReady, startTabPreference]);

  useEffect(() => {
    let cancelled = false;

    const loadPreferenceFeedbackState = async () => {
      try {
        const storedFeedback = await appPersistence.loadPreferencesRaw();
        if (cancelled) {
          return;
        }
        const sanitizedFeedback = deserializeStoredPreferenceProfile(storedFeedback, validSoundIds);
        preferenceFeedbackRef.current = sanitizedFeedback;
        quickFeedbackDesiredPreferenceRef.current = sanitizedFeedback;
        setPreferenceFeedback(sanitizedFeedback);
      } catch {
        if (!cancelled) {
          preferenceFeedbackRef.current = defaultLocalPreferenceFeedback;
          quickFeedbackDesiredPreferenceRef.current = defaultLocalPreferenceFeedback;
          setPreferenceFeedback(defaultLocalPreferenceFeedback);
        }
      } finally {
        if (!cancelled) {
          setPreferenceFeedbackStorageReady(true);
        }
      }
    };

    loadPreferenceFeedbackState().catch(() => {
      if (!cancelled) {
        setPreferenceFeedbackStorageReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [validSoundIds]);


  useEffect(() => {
    if (
      !settingsStorageReady ||
      !onboardingStorageReady ||
      showOnboarding ||
      startTabPreferenceAppliedRef.current
    ) {
      return;
    }

    startTabPreferenceAppliedRef.current = true;
    setActiveSection(startTabPreference);
  }, [onboardingStorageReady, settingsStorageReady, showOnboarding, startTabPreference]);

  useEffect(() => {
    if (!localStorageReady) {
      return;
    }

    appPersistence.saveSoundIds("saved", savedSoundIds).catch(() => undefined);
  }, [localStorageReady, savedSoundIds]);

  useEffect(() => {
    if (!localStorageReady) {
      return;
    }

    appPersistence.saveSoundIds("recent", recentSoundIds).catch(() => undefined);
  }, [localStorageReady, recentSoundIds]);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync().catch(() => undefined);
      }
    };
  }, [sound]);

  useEffect(() => {
    return () => {
      layeredPresetPreviewCoordinatorRef.current.invalidate();
      sessionRestartCoordinatorRef.current.invalidate();
      singlePreviewStartCoordinatorRef.current.invalidate();
      presetSelectionOperationIdRef.current += 1;
      pendingLayeredPresetIdRef.current = null;
      sessionClearOperationIdRef.current += 1;
      layeredPreviewOperationIdRef.current += 1;
      singlePlaybackOperationIdRef.current += 1;
      replayOptimisticProgressGenerationRef.current += 1;
      loadedReplayCommandInFlightGenerationRef.current = null;
      replayOptimisticNativeProbeInFlightGenerationRef.current = null;
      replayOptimisticDurationSaturatedGenerationRef.current = null;
      playbackStatusCallbackGenerationRef.current += 1;
      stopLoadedReplayOptimisticProgressClock("unmount", undefined, false, 0);
      layeredSoundsRef.current.forEach((layeredSound) => {
        layeredSound.unloadAsync().catch(() => undefined);
      });
      layeredSoundsRef.current = [];
    };
  }, []);

  const onPlaybackStatusUpdate = (
    status: AVPlaybackStatus,
    statusCallbackGeneration: number,
  ) => {
    if (statusCallbackGeneration !== playbackStatusCallbackGenerationRef.current) {
      return;
    }
    recordPlaybackTimingTrace("AUDIO_STATUS_CALLBACK", {
      command: `status-seq-${playbackTraceSequenceRef.current + 1}`,
      status,
      positionMillis: status.isLoaded ? status.positionMillis ?? 0 : undefined,
    });
    if (replayOptimisticProgressActiveRef.current && shouldDeferLoadedReplayOptimisticStatus(status)) {
      return;
    }
    recordPlaybackStatusMilestones(status);
    if (!status.isLoaded) {
      if (status.error) {
        dispatchPlaybackContract({
          type: "adapter-error",
          generation: playbackContractGenerationRef.current,
          operationId: nextPlaybackContractOperation(),
          message: status.error,
        });
        const replayErrorDisplayOverride =
          replayOptimisticDurationSaturatedGenerationRef.current ===
          replayOptimisticProgressGenerationRef.current
            ? replayOptimisticProgressPreviousPositionMillisRef.current
            : undefined;
        stopLoadedReplayOptimisticProgressClock(
          "error",
          undefined,
          false,
          replayErrorDisplayOverride,
        );
        replayOptimisticDurationSaturatedGenerationRef.current = null;
        setError(status.error);
      } else {
        syncPlaybackContractStatus({ phase: "idle", positionMillis: 0, durationMillis: 0, buffering: false, layers: [] });
      }
      setIsPlaying(false);
      return;
    }

    replayOptimisticDurationSaturatedGenerationRef.current = null;
    setIsPlaying(status.isPlaying);
    if (!isScrubbingRef.current) {
      replayOptimisticProgressDisplayRef.current?.sync(status.positionMillis ?? 0);
      recordPlaybackTimingTrace("POSITION_STATE_DISPATCH", {
        command: "status",
        positionMillis: status.positionMillis ?? 0,
        status,
      });
      setPositionMillis(status.positionMillis ?? 0);
    }
    setDurationMillis(
      status.durationMillis ?? secondsToMillis(selectedSoundRef.current.durationSeconds),
    );
    syncPlaybackContractStatus({
      phase: status.didJustFinish ? "ended" : status.isBuffering ? "loading" : status.isPlaying ? "playing" : "paused",
      positionMillis: status.positionMillis ?? 0,
      durationMillis: status.durationMillis ?? secondsToMillis(selectedSoundRef.current.durationSeconds),
      buffering: status.isBuffering,
      layers: [],
    });

    if (status.didJustFinish) {
      recordPlaybackTimingTrace("didJustFinish / ended", {
        command: "status",
        positionMillis: status.positionMillis ?? 0,
        status,
      });
      setIsPlaying(false);
    }
  };

  const resetProgressForSelection = (catalogSound: MobileCatalogSound) => {
    replayOptimisticProgressGenerationRef.current += 1;
    loadedReplayCommandInFlightGenerationRef.current = null;
    replayOptimisticNativeProbeInFlightGenerationRef.current = null;
    replayOptimisticDurationSaturatedGenerationRef.current = null;
    stopLoadedReplayOptimisticProgressClock("selection", undefined, true, 0);
    setPositionMillis(0);
    setDurationMillis(secondsToMillis(catalogSound.durationSeconds));
  };

  const addRecentSound = useCallback((catalogSound: MobileCatalogSound) => {
    setRecentSoundIds((currentRecentSoundIds) => {
      const nextRecentSoundIds = [
        catalogSound.id,
        ...currentRecentSoundIds.filter((soundId) => soundId !== catalogSound.id && validSoundIds.has(soundId)),
      ].slice(0, recentSoundLimit);
      if (
        nextRecentSoundIds.length === currentRecentSoundIds.length &&
        nextRecentSoundIds.every((soundId, index) => soundId === currentRecentSoundIds[index])
      ) {
        return currentRecentSoundIds;
      }
      return nextRecentSoundIds;
    });
  }, [validSoundIds]);

  const toggleSavedSound = (catalogSound: MobileCatalogSound) => {
    setSavedSoundIds((currentSavedSoundIds) => {
      if (currentSavedSoundIds.includes(catalogSound.id)) {
        return currentSavedSoundIds.filter((soundId) => soundId !== catalogSound.id);
      }

      return [catalogSound.id, ...currentSavedSoundIds.filter((soundId) => validSoundIds.has(soundId))];
    });
  };

  const clearSessionTimer = useCallback(() => {
    dispatchPlaybackTimer(0);
    timerEndsAtMillisRef.current = null;
    timerFinishHandledRef.current = false;
    setTimerIsRunning(false);
    setTimerOptionMinutes(0);
    setTimerRemainingMillis(0);
    void audioService.cancelNativeTimer().catch(() => undefined);
  }, []);

  const clearTimerCountdownOnly = useCallback(() => {
    timerEndsAtMillisRef.current = null;
    setTimerIsRunning(false);
    setTimerRemainingMillis(0);
  }, []);

  const prepareTimerForNewSession = useCallback(() => {
    if (defaultTimerPreference === 0) {
      clearSessionTimer();
      return;
    }

    timerFinishHandledRef.current = false;
    timerEndsAtMillisRef.current = null;
    setTimerIsRunning(false);
    setTimerOptionMinutes(defaultTimerPreference);
    setTimerRemainingMillis(defaultTimerPreference * 60 * 1000);
  }, [clearSessionTimer, defaultTimerPreference]);

  const startSessionTimer = useCallback((durationMinutes: SessionTimerOptionMinutes = timerOptionMinutes) => {
    if (durationMinutes === 0) {
      clearSessionTimer();
      return;
    }

    const durationMillis = durationMinutes * 60 * 1000;
    dispatchPlaybackTimer(durationMinutes);
    timerFinishHandledRef.current = false;
    timerEndsAtMillisRef.current = Date.now() + durationMillis;
    setTimerRemainingMillis(durationMillis);
    setTimerIsRunning(true);
    void audioService.setNativeTimer(durationMillis).catch((nativeTimerError: unknown) => {
      setError(`Could not start the background Timer. ${formatError(nativeTimerError)}`);
    });
  }, [clearSessionTimer, timerOptionMinutes]);

  const armSelectedTimerForActivePlayback = useCallback(() => {
    if (timerOptionMinutes === 0 || timerIsRunning) {
      return;
    }

    startSessionTimer(timerOptionMinutes);
  }, [startSessionTimer, timerIsRunning, timerOptionMinutes]);

  const waitForTruthfulNativePlaying = async (
    resource: ManagedAudioResource,
    isCurrent: () => boolean,
    initialStatus?: ManagedPlaybackStatus,
  ): Promise<ManagedPlaybackStatus> => {
    const deadlineMillis = Date.now() + 8000;
    let status = initialStatus ?? await resource.getStatusAsync();
    while (isCurrent()) {
      const truth = classifyRestartPlaybackStatus(status);
      if (truth === "playing" || truth === "unavailable") {
        return status;
      }
      if (Date.now() >= deadlineMillis) {
        return status;
      }
      await wait(100);
      status = await resource.getStatusAsync();
    }
    return { isLoaded: false };
  };

  const rearmReadyTimerAfterTruthfulPlayback = async (
    expectedSessionId: string,
    isCurrent: () => boolean,
    durationMinutes: SessionTimerOptionMinutes = timerOptionMinutes,
    timerAlreadyRunning = timerIsRunning,
  ) => {
    if (!isCurrent()) {
      return false;
    }
    if (durationMinutes === 0 || timerAlreadyRunning) {
      return true;
    }
    const durationMillis = durationMinutes * 60 * 1000;
    await audioService.setNativeTimer(durationMillis);
    const nativeState = await audioService.queryAuthoritativeState();
    if (!isCurrent()) {
      return false;
    }
    const nativeTimerRemainingMillis = audioService.nativeTimerRemainingMillis(nativeState);
    if (
      nativeState.sessionId !== expectedSessionId ||
      nativeState.phase !== "playing" ||
      !nativeState.timerDeadlineElapsedRealtimeMs ||
      nativeTimerRemainingMillis <= 0
    ) {
      clearTimerCountdownOnly();
      return false;
    }
    dispatchPlaybackTimer(durationMinutes);
    timerFinishHandledRef.current = false;
    timerEndsAtMillisRef.current = Date.now() + nativeTimerRemainingMillis;
    setTimerRemainingMillis(nativeTimerRemainingMillis);
    setTimerIsRunning(true);
    return true;
  };

  const startOrArmSinglePlaybackTimer = useCallback(
    (startingNewSession: boolean, restartExistingTimer = false) => {
      if (startingNewSession && defaultTimerPreference > 0) {
        startSessionTimer(defaultTimerPreference);
        return;
      }

      if (restartExistingTimer && timerOptionMinutes > 0) {
        startSessionTimer(timerOptionMinutes);
        return;
      }

      armSelectedTimerForActivePlayback();
    },
    [armSelectedTimerForActivePlayback, defaultTimerPreference, startSessionTimer, timerOptionMinutes],
  );

  const handleSelectTimerOption = (durationMinutes: SessionTimerOptionMinutes) => {
    setTimerOptionMinutes(durationMinutes);
    if (durationMinutes === 0) {
      clearSessionTimer();
      return;
    }

    dispatchPlaybackTimer(durationMinutes);
    const durationMillis = durationMinutes * 60 * 1000;
    timerFinishHandledRef.current = false;
    timerEndsAtMillisRef.current = null;
    setTimerIsRunning(false);
    setTimerRemainingMillis(durationMillis);
    if (currentSession && (isPlaying || layeredPreviewStatus === "playing")) {
      timerEndsAtMillisRef.current = Date.now() + durationMillis;
      setTimerIsRunning(true);
      void audioService.setNativeTimer(durationMillis).catch((nativeTimerError: unknown) => {
        setError(`Could not start the background Timer. ${formatError(nativeTimerError)}`);
      });
    }
  };

  const handleProgressTrackLayout = (event: LayoutChangeEvent) => {
    setProgressTrackWidth(event.nativeEvent.layout.width);
  };

  const handleMiniProgressTrackLayout = (event: LayoutChangeEvent) => {
    setMiniProgressTrackWidth(event.nativeEvent.layout.width);
  };

  const handleMiniClockCommit = useCallback((committedPositionMillis: number) => {
    recordPlaybackTimingTrace("MINI_CLOCK_COMMIT", {
      command: "clock-commit",
      positionMillis: committedPositionMillis,
    });
  }, [recordPlaybackTimingTrace]);

  const handleFullClockCommit = useCallback((committedPositionMillis: number) => {
    recordPlaybackTimingTrace("FULL_CLOCK_COMMIT", {
      command: "clock-commit",
      positionMillis: committedPositionMillis,
    });
  }, [recordPlaybackTimingTrace]);

  const unloadCurrentSound = async (soundToUnload: ManagedAudioResource | null = soundRef.current) => {
    if (!soundToUnload) {
      return;
    }

    if (soundRef.current === soundToUnload) {
      playbackStatusCallbackGenerationRef.current += 1;
      replayOptimisticProgressGenerationRef.current += 1;
      loadedReplayCommandInFlightGenerationRef.current = null;
      replayOptimisticNativeProbeInFlightGenerationRef.current = null;
      replayOptimisticDurationSaturatedGenerationRef.current = null;
    }
    stopLoadedReplayOptimisticProgressClock("unload", undefined, true, 0);
    try {
      await soundToUnload.unloadAsync();
    } catch {
      // Best effort cleanup before replacing the selected hosted audio.
    }

    if (soundRef.current === soundToUnload) {
      soundRef.current = null;
      setSound(null);
      setLoadedSingleSoundId(null);
      setIsPlaying(false);
    }
  };

  const releaseCurrentSoundForReplacement = (
    replacementGeneration = sessionReplacementGenerationRef.current,
  ) => {
    const soundToRelease = soundRef.current;
    if (!soundToRelease) {
      return;
    }

    recordPlaybackTimingTrace(
      `OLD_SESSION_TEARDOWN_START transitionMode=replacement generation=${replacementGeneration} layers=1`,
      { command: "session-replacement-single" },
    );
    stopLoadedReplayOptimisticProgressClock("sound-change", undefined, true, 0);
    playbackStatusCallbackGenerationRef.current += 1;
    replayOptimisticProgressGenerationRef.current += 1;
    loadedReplayCommandInFlightGenerationRef.current = null;
    replayOptimisticNativeProbeInFlightGenerationRef.current = null;
    replayOptimisticDurationSaturatedGenerationRef.current = null;
    soundRef.current = null;
    setSound(null);
    setLoadedSingleSoundId(null);
    setIsPlaying(false);
    void unloadCurrentSound(soundToRelease).finally(() => {
      recordPlaybackTimingTrace(
        `OLD_SESSION_TEARDOWN_END transitionMode=replacement generation=${replacementGeneration} layers=1`,
        { command: "session-replacement-single" },
      );
    });
  };

  const beginSinglePlaybackOperation = () => {
    playbackStatusCallbackGenerationRef.current += 1;
    replayOptimisticProgressGenerationRef.current += 1;
    loadedReplayCommandInFlightGenerationRef.current = null;
    replayOptimisticNativeProbeInFlightGenerationRef.current = null;
    replayOptimisticDurationSaturatedGenerationRef.current = null;
    singlePlaybackOperationIdRef.current += 1;
    return singlePlaybackOperationIdRef.current;
  };

  const isCurrentSinglePlaybackOperation = (operationId: number) =>
    singlePlaybackOperationIdRef.current === operationId;

  const requestPlayerTopScrollForSelection = () => {
    pendingPlayerTopScrollRef.current = true;
    requestAnimationFrame(() => {
      if (activeSectionKeyRef.current === "player" && pendingPlayerTopScrollRef.current) {
        pendingPlayerTopScrollRef.current = false;
        scrollViewRef.current?.scrollToOffset({ offset: 0, animated: false });
      }
    });
  };

  const beginLayeredPreviewOperation = () => {
    layeredPreviewOperationIdRef.current += 1;
    return layeredPreviewOperationIdRef.current;
  };

  const isCurrentLayeredPreviewOperation = (operationId: number) =>
    layeredPreviewOperationIdRef.current === operationId;

  const detachLayeredPreviewForReplacement = (nextStatus: LayeredPreviewStatus = "idle") => {
    const layeredSounds = [...layeredSoundsRef.current];
    const operationId = beginLayeredPreviewOperation();
    layeredSoundsRef.current = [];
    setLayeredPreviewPresetId(null);
    updateLayeredPreviewStatus(nextStatus);
    return { layeredSounds, operationId };
  };

  const teardownDetachedLayeredSounds = async (
    layeredSounds: ManagedAudioResource[],
    replacementGeneration: number,
  ) => {
    recordPlaybackTimingTrace(
      `OLD_SESSION_TEARDOWN_START transitionMode=replacement generation=${replacementGeneration} layers=${layeredSounds.length}`,
      { command: "session-replacement" },
    );
    await teardownResourcesConcurrently(layeredSounds, async (layeredSound, layerIndex) => {
      recordPlaybackTimingTrace(
        `OLD_LAYER_FADE_START transitionMode=replacement generation=${replacementGeneration} layerIndex=${layerIndex} durationMillis=${sessionReplacementFadeMillis}`,
        { command: "session-replacement" },
      );
      try {
        const status = await layeredSound.getStatusAsync();
        const startingVolume = status.isLoaded ? status.volume : 0;
        const fadeSteps = 3;
        for (let step = 1; step <= fadeSteps; step += 1) {
          await layeredSound.setVolumeAsync(Math.max(0, startingVolume * (1 - step / fadeSteps)));
          await wait(sessionReplacementFadeMillis / fadeSteps);
        }
      } catch {
        // The replacement stop boundary below still prevents ghost audio.
      }
      recordPlaybackTimingTrace(
        `OLD_LAYER_FADE_END transitionMode=replacement generation=${replacementGeneration} layerIndex=${layerIndex}`,
        { command: "session-replacement" },
      );
      try {
        await layeredSound.stopAsync();
      } catch {
        // Best effort stop of the detached old-session owner.
      }
      recordPlaybackTimingTrace(
        `OLD_LAYER_UNLOAD_START transitionMode=replacement generation=${replacementGeneration} layerIndex=${layerIndex}`,
        { command: "session-replacement" },
      );
      try {
        await layeredSound.unloadAsync();
      } catch {
        // Best effort unload of the detached old-session owner.
      }
      recordPlaybackTimingTrace(
        `OLD_LAYER_UNLOAD_END transitionMode=replacement generation=${replacementGeneration} layerIndex=${layerIndex}`,
        { command: "session-replacement" },
      );
    });
    recordPlaybackTimingTrace(
      `OLD_SESSION_TEARDOWN_END transitionMode=replacement generation=${replacementGeneration} layers=${layeredSounds.length}`,
      { command: "session-replacement" },
    );
  };

  const releaseLayeredPreviewForReplacement = (
    nextStatus: LayeredPreviewStatus = "idle",
    replacementGeneration = sessionReplacementGenerationRef.current,
  ) => {
    if (!layeredSoundsRef.current.length && layeredPreviewStatusRef.current === "idle") {
      return;
    }
    const detached = detachLayeredPreviewForReplacement(nextStatus);
    void teardownDetachedLayeredSounds(detached.layeredSounds, replacementGeneration);
  };

  const stopOrUnloadLayeredPreview = async (
    nextStatus: LayeredPreviewStatus = "idle",
    isCurrent: () => boolean = () => true,
  ) => {
    const layeredSounds = layeredSoundsRef.current;
    layeredSoundsRef.current = [];

    return await runOperationScopedCleanup({
      resources: layeredSounds,
      cleanupResource: async (layeredSound) => {
        try {
          const status = await layeredSound.getStatusAsync();
          if (status.isLoaded) {
            await layeredSound.stopAsync();
          }
        } catch {
          // Best effort stop before unloading a layered preview sound.
        }
        try {
          await layeredSound.unloadAsync();
        } catch {
          // Best effort cleanup before leaving the preset or replaying.
        }
      },
      isCurrent,
      projectCurrent: () => {
        setLayeredPreviewPresetId(null);
        updateLayeredPreviewStatus(nextStatus);
      },
    });
  };

  const unloadLayeredPreview = async () => {
    const operationId = beginLayeredPreviewOperation();
    await stopOrUnloadLayeredPreview("idle", () => isCurrentLayeredPreviewOperation(operationId));
  };

  const pauseAllLayeredSounds = async () => {
    const layeredSounds = [...layeredSoundsRef.current];
    await Promise.all(
      layeredSounds.map(async (layeredSound) => {
        const status = await layeredSound.getStatusAsync();
        if (status.isLoaded) {
          await layeredSound.pauseAsync();
        }
      }),
    );
  };

  const resumeAllLayeredSounds = async () => {
    const layeredSounds = [...layeredSoundsRef.current];
    await Promise.all(
      layeredSounds.map(async (layeredSound) => {
        const status = await layeredSound.getStatusAsync();
        if (status.isLoaded) {
          await layeredSound.playAsync();
        }
      }),
    );
  };

  const fadeOutStopAndReleaseCurrentSound = async () => {
    const activeSound = soundRef.current;
    if (!activeSound) {
      setSound(null);
      setLoadedSingleSoundId(null);
      setIsPlaying(false);
      setPositionMillis(0);
      setDurationMillis(secondsToMillis(selectedSoundRef.current.durationSeconds));
      return;
    }

    const fadeSteps = 5;
    playbackStatusCallbackGenerationRef.current += 1;
    replayOptimisticProgressGenerationRef.current += 1;
    loadedReplayCommandInFlightGenerationRef.current = null;
    replayOptimisticNativeProbeInFlightGenerationRef.current = null;
    replayOptimisticDurationSaturatedGenerationRef.current = null;
    stopLoadedReplayOptimisticProgressClock("stop", undefined, true, 0);
    try {
      for (let step = 1; step <= fadeSteps; step += 1) {
        await activeSound.setVolumeAsync(Math.max(0, 1 - step / fadeSteps));
        await wait(sessionTimerFadeMillis / fadeSteps);
      }
    } catch {
      // Fade is best effort; the explicit stop boundary below still prevents ghost audio.
    }

    try {
      await activeSound.stopAsync();
    } catch {
      // Best effort stop before detached cleanup.
    }

    if (soundRef.current === activeSound) {
      soundRef.current = null;
      setSound(null);
      setLoadedSingleSoundId(null);
      setIsPlaying(false);
      setPositionMillis(0);
      setDurationMillis(secondsToMillis(selectedSoundRef.current.durationSeconds));
    }
    void activeSound.unloadAsync().catch(() => undefined);
  };

  const fadeOutStopAndReleaseLayeredPreview = async () => {
    const stopLayeredOperationId = beginLayeredPreviewOperation();
    const layeredSounds = [...layeredSoundsRef.current];
    if (!layeredSounds.length) {
      setLayeredPreviewPresetId(null);
      updateLayeredPreviewStatus("stopped");
      return;
    }

    const fadeSteps = 5;
    const startingVolumes = layeredSounds.map((_, index) => activeLayeredPreviewLayers[index]?.volume ?? 0.46);
    try {
      for (let step = 1; step <= fadeSteps; step += 1) {
        await Promise.all(
          layeredSounds.map((layeredSound, index) =>
            layeredSound.setVolumeAsync(Math.max(0, startingVolumes[index] * (1 - step / fadeSteps))),
          ),
        );
        await wait(sessionTimerFadeMillis / fadeSteps);
      }
    } catch {
      // Fade is best effort; the concurrent stop boundary below still prevents ghost audio.
    }

    if (isCurrentLayeredPreviewOperation(stopLayeredOperationId)) {
      layeredSoundsRef.current = [];
    }
    await Promise.all(
      layeredSounds.map((layeredSound) => layeredSound.stopAsync().catch(() => undefined)),
    );
    if (isCurrentLayeredPreviewOperation(stopLayeredOperationId)) {
      setLayeredPreviewPresetId(null);
      updateLayeredPreviewStatus("stopped");
    }
    void Promise.all(
      layeredSounds.map((layeredSound) => layeredSound.unloadAsync().catch(() => undefined)),
    );
  };

  const selectSound = async (
    catalogSound: MobileCatalogSound,
    message: string | null = null,
    preset: MobileBuilderPreset | null = null,
    source: SessionSource = "Player",
    openPlayer = false,
    preserveFastStartResult = false,
    currentSoundCleanup: "await" | "defer" | "skip" = "defer",
    preserveSavedSessionStartGeneration = false,
    preserveSinglePreviewStart = false,
  ) => {
    sessionClearOperationIdRef.current += 1;
    layeredPresetPreviewCoordinatorRef.current.invalidate();
    sessionRestartCoordinatorRef.current.invalidate();
    beginLayeredPreviewOperation();
    presetSelectionOperationIdRef.current += 1;
    pendingLayeredPresetIdRef.current = null;
    setPendingLayeredPresetId(null);
    const supersedingSinglePreview =
      !preserveSinglePreviewStart && singlePreviewLoadingKeyRef.current !== null;
    if (!preserveSinglePreviewStart) {
      singlePreviewStartCoordinatorRef.current.invalidate();
    }
    if (supersedingSinglePreview) {
      singlePreviewLoadingKeyRef.current = null;
      setIsLoading(false);
    }
    sessionReplacementGenerationRef.current += 1;
    const replacementGeneration = sessionReplacementGenerationRef.current;
    sessionStopOperationIdRef.current += 1;
    sessionStopInProgressRef.current = false;
    recordPlaybackTimingTrace(
      `SESSION_REPLACEMENT_PRESS source=${source} oldSessionType=${currentSession?.type ?? "idle"} newSessionType=${preset ? "recipe" : "single"} generation=${replacementGeneration}`,
      { sound: catalogSound, command: "session-replacement" },
    );
    setSessionStopPhase("idle");
    if (!preserveSavedSessionStartGeneration) {
      invalidateSavedSessionStartForUserAction();
    }
    const selectedSoundChanged = catalogSound.id !== selectedSoundRef.current.id;
    if (selectedSoundChanged || supersedingSinglePreview) {
      beginSinglePlaybackOperation();
    }
    setError(null);
    setLayeredPreviewError(null);
    setCurrentSavedSessionId(null);
    prepareTimerForNewSession();
    const previousSoundForDeferredCleanup = soundRef.current;
    setSelectedPreset(preset);
    if (!preset || source === "Fast Start") {
      publishBuilderModel(null);
    }
    setCurrentSession(
      preset
        ? {
            type: "recipe",
            title: preset.title,
            source,
            recipeId: preset.id,
            startingSoundId: catalogSound.id,
            updatedAt: Date.now(),
          }
        : {
            type: "single",
            title: catalogSound.title,
            source,
            soundId: catalogSound.id,
            updatedAt: Date.now(),
          },
    );
    if (message) {
      setFastStartMessage(message);
      setFastStartMessageTone("matched");
    } else {
      setFastStartMessage(null);
    }
    if (!preserveFastStartResult) {
      setFastStartAlternatives([]);
      setFastStartResultSound(null);
      setFastStartResultWhy(null);
      setFastStartRecommendation(null);
    }
    addRecentSound(catalogSound);
    setIsLoopEnabled(false);
    isLoopEnabledRef.current = false;
    if (openPlayer) {
      requestPlayerTopScrollForSelection();
      setActiveSection("player");
    }

    if (selectedSoundChanged) {
      selectedSoundRef.current = catalogSound;
      setSelectedSound(catalogSound);
    }
    resetProgressForSelection(catalogSound);

    if (currentSoundCleanup === "await") {
      const cleanupPromises: Promise<void>[] = [unloadLayeredPreview()];
      if (selectedSoundChanged) {
        cleanupPromises.push(unloadCurrentSound(previousSoundForDeferredCleanup));
      }
      await Promise.all(cleanupPromises);
      return;
    }

    releaseLayeredPreviewForReplacement("idle", replacementGeneration);
    if (selectedSoundChanged && currentSoundCleanup === "defer") {
      releaseCurrentSoundForReplacement(replacementGeneration);
    }
    recordPlaybackTimingTrace(
      `SESSION_REPLACEMENT_READY source=${source} generation=${replacementGeneration}`,
      { sound: catalogSound, command: "session-replacement" },
    );
  };

  const prepareFastStartResult = (
    catalogSound: MobileCatalogSound,
    whyMatched: string,
    alternatives: MobileCatalogSound[],
    recipeIntent: string,
    allowUserChoice = false,
    sourceLabel = "fast-start",
    avoidedIntents = activeAvoidedIntents,
  ) => {
    const nextAlternatives = alternatives.filter((sound) => sound.id !== catalogSound.id).slice(0, 3);
    recordPlaybackTimingTrace("Fast Start result selected / best sound displayed", {
      sound: catalogSound,
      command: "fast-start-result",
    });
    setError(null);
    setFastStartStartFailedSoundId(null);
    setSelectedPreset(null);
    setFastStartMessage(`${whyMatched} Review the best sound, generated recipe, and alternatives here.`);
    setFastStartMessageTone("matched");
    setFastStartResultSound(catalogSound);
    setFastStartResultWhy(whyMatched);
    setFastStartAlternatives(nextAlternatives);
    const recommendation: FastStartRecommendation = {
      sound: catalogSound,
      alternatives: nextAlternatives,
      whyMatched,
      recipeIntent,
      allowUserChoice,
      sourceLabel,
    };
    setFastStartRecommendation(recommendation);
    setFastStartGeneratedRecipeResult(null);
    fastStartRecipeSeedRef.current = 0;
    setFastStartRecipeRefinement("balanced");
    setFastStartRecipeSeed(0);
    const action = sourceLabel.startsWith("chip-")
      ? "chip"
      : sourceLabel.startsWith("alternative-")
        ? "alternative"
        : "search";
    requestFastStartRecipeGeneration(recommendation, "balanced", 0, avoidedIntents, action);
  };

  const handleStartFastStartBestSound = async () => {
    const bestSound = fastStartResultSound;
    if (!bestSound) {
      return;
    }

    if (matchesAnyIntent(bestSound, activeAvoidedIntents)) {
      showAvoidanceBlockedMessage(bestSound.title);
      return;
    }

    recordPlaybackTimingTrace("Start tapped", {
      sound: bestSound,
      command: "start",
    });
    recordPlaybackTimingTrace("RECIPE_RESULT_REUSED surface=Fast action=StartBestSound reason=displayed-result", {
      sound: bestSound,
      command: "recipe-reuse",
    });

    const sameBestSoundAlreadySelected = selectedSoundRef.current.id === bestSound.id;
    if (
      fastStartBestSoundInFlightRef.current === bestSound.id ||
      (sameBestSoundAlreadySelected && isLoading)
    ) {
      recordPlaybackTimingTrace("DUPLICATE_REPLACEMENT_BLOCKED source=Fast", {
        sound: bestSound,
        command: "session-replacement",
      });
      setFastStartMessage("That best sound is already loading. Keep the current control state instead of starting a duplicate.");
      setFastStartMessageTone("notice");
      return;
    }

    const startingNewSession = !currentSession;
    if (sameBestSoundAlreadySelected && isLoadedSelectedSingleSound(bestSound)) {
      if (startingNewSession) {
        prepareTimerForNewSession();
        setCurrentSession({
          type: "single",
          title: bestSound.title,
          source: "Fast Start",
          soundId: bestSound.id,
          updatedAt: Date.now(),
        });
      }
      setFastStartMessage(`Now playing the best sound from Fast Start. Player remains ready after you start playback.`);
      setFastStartMessageTone("matched");

      if (isPlaying) {
        void replayLoadedSelectedSoundNow(bestSound, startingNewSession);
      } else {
        void playLoadedSelectedSoundNow(bestSound, "play", startingNewSession);
      }
      return;
    }

    fastStartBestSoundInFlightRef.current = bestSound.id;
    coldStartTraceSoundIdRef.current = bestSound.id;
    setFastStartStartingSoundId(bestSound.id);
    setFastStartStartFailedSoundId(null);
    setError(null);
    setFastStartMessage(`Starting ${bestSound.title}…`);
    setFastStartMessageTone("matched");
    recordPlaybackTimingTrace("cold start loading UI state", {
      sound: bestSound,
      command: "start-ui",
    });

    try {
      const replacementGeneration = sessionReplacementGenerationRef.current + 1;
      void selectSound(
        bestSound,
        `Fast Start: ${bestSound.title} is starting.`,
        null,
        "Fast Start",
        false,
        true,
        "skip",
      );

      const synchronouslyPreparedUri = getPreparedColdStartUri(bestSound.id);
      recordPlaybackTimingTrace(
        `CACHE_HELPER_RETURNED synchronousPreparedHit=${Boolean(synchronouslyPreparedUri)}`,
        { sound: bestSound, command: "cold-cache-accessor" },
      );
      let playableSoundPromise: ReturnType<typeof ensureSound>;
      if (synchronouslyPreparedUri) {
        recordPlaybackTimingTrace("CACHE_CONTINUATION_RESUMED synchronousPreparedHit=true", {
          sound: bestSound,
          command: "cold-cache-sync",
        });
        recordPlaybackTimingTrace("NEW_SESSION_LOAD_DISPATCH source=Fast prepared=true", {
          sound: bestSound,
          command: "session-replacement",
        });
        playableSoundPromise = ensureSound(true, bestSound, synchronouslyPreparedUri);
      } else {
        // Unprepared audio may spend time in file preparation. Detach the old
        // layered owner now so it cannot remain audible invisibly during that wait.
        releaseLayeredPreviewForReplacement("idle", replacementGeneration);
        let preparedAudioUri: string;
        try {
          preparedAudioUri = await preparePreferredPlaybackUri(bestSound);
          recordPlaybackTimingTrace("CACHE_CONTINUATION_RESUMED synchronousPreparedHit=false", {
            sound: bestSound,
            command: "cold-cache-async",
          });
        } catch (preparationError: unknown) {
          coldStartTraceSoundIdRef.current = null;
          setFastStartStartFailedSoundId(bestSound.id);
          setFastStartMessage(`Could not prepare ${bestSound.title}. Tap Retry.`);
          setFastStartMessageTone("notice");
          setError(userFacingPlaybackErrorV1(preparationError, "single"));
          recordPlaybackTimingTrace("cold start preparation failed", {
            sound: bestSound,
            command: "cold-prepare",
            error: preparationError,
          });
          return;
        }
        recordPlaybackTimingTrace("NEW_SESSION_LOAD_DISPATCH source=Fast prepared=false", {
          sound: bestSound,
          command: "session-replacement",
        });
        playableSoundPromise = ensureSound(true, bestSound, preparedAudioUri);
      }
      // createAsync has already been invoked synchronously by ensureSound. Old
      // layered teardown now starts in the background and cannot queue ahead of it.
      releaseLayeredPreviewForReplacement("idle", replacementGeneration);

      const playableSound = await playableSoundPromise;
      if (!playableSound) {
        coldStartTraceSoundIdRef.current = null;
        setFastStartStartFailedSoundId(bestSound.id);
        setFastStartMessage(`Could not start ${bestSound.title}. Tap Retry.`);
        setFastStartMessageTone("notice");
        return;
      }

      try {
        markPlaybackCommandForStatusTrace("play");
        recordPlaybackTimingTrace("NEW_SESSION_PLAY_START source=Fast", {
          sound: bestSound,
          command: "session-replacement",
        });
        recordPlaybackTimingTrace("playAsync start", {
          sound: bestSound,
          command: "play",
        });
        await playableSound.playAsync();
        recordPlaybackTimingTrace("NEW_SESSION_PLAY_RESOLVED source=Fast", {
          sound: bestSound,
          command: "session-replacement",
        });
        recordPlaybackTimingTrace("playAsync resolved", {
          sound: bestSound,
          command: "play",
        });
        setFastStartStartFailedSoundId(null);
        setFastStartMessage(`Now playing the best sound from Fast Start. Player remains ready after you start playback.`);
        setFastStartMessageTone("matched");
        if (sessionReplacementGenerationRef.current === replacementGeneration) {
          recordPlaybackTimingTrace("SESSION_REPLACEMENT_READY source=Fast", {
            sound: bestSound,
            command: "session-replacement",
          });
        }
        if (defaultTimerPreference > 0) {
          startSessionTimer(defaultTimerPreference);
        } else {
          armSelectedTimerForActivePlayback();
        }
      } catch (playError: unknown) {
        coldStartTraceSoundIdRef.current = null;
        setFastStartStartFailedSoundId(bestSound.id);
        setFastStartMessage(`Could not start ${bestSound.title}. Tap Retry.`);
        setFastStartMessageTone("notice");
        recordPlaybackTimingTrace("command error", {
          sound: bestSound,
          command: "play",
          error: playError,
        });
        setError(userFacingPlaybackErrorV1(playError, "single"));
      }
    } finally {
      if (fastStartBestSoundInFlightRef.current === bestSound.id) {
        fastStartBestSoundInFlightRef.current = null;
      }
      setFastStartStartingSoundId((currentSoundId) =>
        currentSoundId === bestSound.id ? null : currentSoundId,
      );
    }
  };

  const handlePlayFastStartResult = async () => handleStartFastStartBestSound();

  const handleStartFastStartGeneratedRecipe = async (mode: FastStartRecipeStartMode = "start") => {
    if (!fastStartGeneratedRecipePreset) {
      setFastStartMessage(fastStartRecipeAvailability.note ?? "A single sound is safer than a forced mix for this request.");
      setFastStartMessageTone("notice");
      return;
    }
    recordPlaybackTimingTrace(`RECIPE_RESULT_REUSED surface=Fast action=${mode === "start" ? "StartGeneratedRecipe" : "OpenGeneratedRecipe"} reason=stored-result`, {
      command: "recipe-reuse",
    });

    const recipeConflictSound = getPresetAvoidedConflictSound(fastStartGeneratedRecipePreset, activeAvoidedIntents);
    if (recipeConflictSound) {
      showRecipeConflictMessage(fastStartGeneratedRecipePreset, recipeConflictSound);
      return;
    }

    const recipeStartingSound = soundById.get(fastStartGeneratedRecipePreset.startingSoundId);
    if (!recipeStartingSound) {
      setFastStartMessage("Generated recipe is missing a playable starting sound. Start the best sound instead.");
      setFastStartMessageTone("notice");
      return;
    }

    await selectSound(
      recipeStartingSound,
      mode === "open-player"
        ? `Fast Start: ${fastStartGeneratedRecipePreset.title} is ready in Player.`
        : `Fast Start: ${fastStartGeneratedRecipePreset.title} is now playing.`,
      fastStartGeneratedRecipePreset,
      "Fast Start",
      mode === "open-player",
      true,
    );

    if (mode === "open-player") {
      return;
    }

    setFastStartMessage("Now playing the generated recipe from Fast Start. Player remains ready after you start playback.");
    setFastStartMessageTone("matched");
    await handleLayeredPreviewPlay(
      fastStartGeneratedRecipePreset,
      undefined,
      undefined,
      undefined,
      { loopEnabled: false, timerMinutes: defaultTimerPreference },
    );
  };

  const applyFastStartRecipeSeed = async (refinement: FastStartRecipeRefinement, nextSeed: number) => {
    if (!fastStartRecommendation) {
      return;
    }
    if (refinement === "less-water" && fastStartGeneratedRecipePreset && !presetHasWaterLayer(fastStartGeneratedRecipePreset)) {
      setFastStartMessage("No water layer to reduce; keeping the current recipe.");
      setFastStartMessageTone("notice");
      return;
    }
    requestFastStartRecipeGeneration(
      fastStartRecommendation,
      refinement,
      nextSeed,
      activeAvoidedIntents,
      refinement === fastStartRecipeRefinement ? "try-another" : "refine",
      true,
    );
  };

  const handleTryAnotherFastStartRecipe = async () => {
    await applyFastStartRecipeSeed(fastStartRecipeRefinement, fastStartRecipeSeedRef.current + 1);
  };

  const handleRefineFastStartRecipe = async (refinement: FastStartRecipeRefinement) => {
    await applyFastStartRecipeSeed(refinement, fastStartRecipeSeedRef.current + 1);
  };

  const handleOpenFastStartResultInPlayer = async () => {
    if (fastStartPrimaryRecommendation === "recipe" && fastStartGeneratedRecipePreset) {
      await handleStartFastStartGeneratedRecipe("open-player");
      return;
    }

    if (fastStartResultSound && currentSession?.type !== "single") {
      await selectSound(
        fastStartResultSound,
        `Fast Start: ${fastStartResultSound.title} is ready in Player.`,
        null,
        "Fast Start",
        true,
        true,
      );
      return;
    }

    if (fastStartResultSound && currentSession?.type === "single" && currentSession.soundId !== fastStartResultSound.id) {
      await selectSound(
        fastStartResultSound,
        `Fast Start: ${fastStartResultSound.title} is ready in Player.`,
        null,
        "Fast Start",
        true,
        true,
      );
      return;
    }

    requestPlayerTopScrollForSelection();
    setActiveSection("player");
  };

  const updatePreferenceFeedback = (updater: (currentFeedback: LocalPreferenceFeedback) => LocalPreferenceFeedback) => {
    const nextFeedback = {
      ...updater(preferenceFeedbackRef.current),
      updatedAt: new Date().toISOString(),
    };
    preferenceFeedbackRef.current = nextFeedback;
    quickFeedbackDesiredPreferenceRef.current = nextFeedback;
    setPreferenceFeedback(nextFeedback);
    if (preferenceFeedbackStorageReady) {
      appPersistence.savePreferencesRaw(JSON.stringify(nextFeedback)).catch(() => undefined);
    }
  };

  const handleLikeSound = (catalogSound: MobileCatalogSound) => {
    const alreadyLiked = preferenceFeedback.likedSoundIds.includes(catalogSound.id);
    updatePreferenceFeedback((currentFeedback) => applySoundPreferenceFeedback(currentFeedback, catalogSound, "like"));
    const message = alreadyLiked
      ? `${catalogSound.title}: Like removed.`
      : `${catalogSound.title}: Liked. Like clears Avoid and Not for me.`;
    showTransientNotification(message);
    setFastStartMessage(message);
    setFastStartMessageTone("matched");
  };

  const handleDislikeSound = (catalogSound: MobileCatalogSound) => {
    const alreadyDisliked = preferenceFeedback.dislikedSoundIds.includes(catalogSound.id);
    updatePreferenceFeedback((currentFeedback) => applySoundPreferenceFeedback(currentFeedback, catalogSound, "dislike"));
    const message = alreadyDisliked
      ? `${catalogSound.title}: Not for me removed.`
      : `${catalogSound.title}: Not for me saved. Not for me clears Avoid and Like.`;
    showTransientNotification(message);
    setFastStartMessage(message);
    setFastStartMessageTone("notice");
  };

  const handleAvoidSound = (catalogSound: MobileCatalogSound) => {
    const alreadyAvoided = preferenceFeedback.avoidedSoundIds.includes(catalogSound.id);
    updatePreferenceFeedback((currentFeedback) => applySoundPreferenceFeedback(currentFeedback, catalogSound, "avoid"));
    const message = alreadyAvoided
      ? `${catalogSound.title}: Avoid removed.`
      : `${catalogSound.title}: Avoided. Tap Remove avoid to undo.`;
    showTransientNotification(message);
    setFastStartMessage(message);
    setFastStartMessageTone("notice");
  };

  const handleLikeRecipe = (recipe: GeneratedRecipe | undefined, preset: MobileBuilderPreset | null | undefined) => {
    if (!recipe && !preset) {
      return;
    }
    const alreadyLikedRecipe = preferenceFeedback.likedRecipeFingerprints.includes(buildRecipeFingerprint(recipe, preset));
    updatePreferenceFeedback((currentFeedback) => applyRecipePreferenceFeedback(currentFeedback, recipe, preset, soundById, "like"));
    const message = alreadyLikedRecipe
      ? "Recipe like removed."
      : "Recipe liked. Future recipes will lean toward these layers.";
    showTransientNotification(message);
    setFastStartMessage(message);
    setFastStartMessageTone("matched");
  };

  const handleDislikeRecipe = (recipe: GeneratedRecipe | undefined, preset: MobileBuilderPreset | null | undefined) => {
    if (!recipe && !preset) {
      return;
    }
    const alreadyDislikedRecipe = preferenceFeedback.dislikedRecipeFingerprints.includes(buildRecipeFingerprint(recipe, preset));
    updatePreferenceFeedback((currentFeedback) => applyRecipePreferenceFeedback(currentFeedback, recipe, preset, soundById, "dislike"));
    const message = alreadyDislikedRecipe
      ? "Recipe not-for-me removed."
      : "Recipe marked not for me. Future recipes will reduce similar layers.";
    showTransientNotification(message);
    setFastStartMessage(message);
    setFastStartMessageTone("notice");
  };

  const handleMoreLikeRecipe = (recipe: GeneratedRecipe | undefined, preset: MobileBuilderPreset | null | undefined) => {
    if (!recipe && !preset) {
      return;
    }
    updatePreferenceFeedback((currentFeedback) => applyRecipePreferenceFeedback(currentFeedback, recipe, preset, soundById, "more"));
    const message = "More like this saved. Future recipes will lean toward these layers.";
    showTransientNotification(message);
    setFastStartMessage(message);
    setFastStartMessageTone("matched");
  };

  const handleLessLikeRecipe = (recipe: GeneratedRecipe | undefined, preset: MobileBuilderPreset | null | undefined) => {
    if (!recipe && !preset) {
      return;
    }
    updatePreferenceFeedback((currentFeedback) => applyRecipePreferenceFeedback(currentFeedback, recipe, preset, soundById, "less"));
    const message = "Less like this saved. Future recipes will reduce similar layers.";
    showTransientNotification(message);
    setFastStartMessage(message);
    setFastStartMessageTone("notice");
  };

  const handleResetPersonalization = () => {
    updatePreferenceFeedback(() => defaultLocalPreferenceFeedback);
    const message = "Reset personalization clears preference state only. Saved and Recent stay as they are.";
    showTransientNotification(message);
    setFastStartMessage("Personalization reset. Saved and Recent stay as they are.");
    setFastStartMessageTone("notice");
  };

  const showAvoidanceBlockedMessage = (label: string, avoidedIntents = activeAvoidedIntents) => {
    const avoidanceLabel = formatIntentLabels(avoidedIntents);
    setFastStartMessage(
      `${label} is currently avoided. Clear ${avoidanceLabel} to use it.`,
    );
    setFastStartMessageTone("notice");
  };

  const showRecipeConflictMessage = (preset: MobileBuilderPreset, conflictSound: MobileCatalogSound) => {
    setFastStartMessage(
      `${preset.title} uses ${conflictSound.title}, which is currently avoided. Choose a different recipe or clear the avoidance.`,
    );
    setFastStartMessageTone("notice");
  };

  const handleSelectSound = async (catalogSound: MobileCatalogSound, source: SessionSource = "Player", openPlayer = true) => {
    if (matchesAnyIntent(catalogSound, activeAvoidedIntents)) {
      showAvoidanceBlockedMessage(catalogSound.title);
      return;
    }

    const previewKey = `single-preview:${source}:${catalogSound.id}`;
    singlePreviewLoadingKeyRef.current = previewKey;
    setIsLoading(true);
    setError(null);
    try {
      await runSinglePreviewStart(singlePreviewStartCoordinatorRef.current, {
        key: previewKey,
        select: () => selectSound(
          catalogSound,
          `${source}: ${catalogSound.title} is the current session.`,
          null,
          source,
          openPlayer,
          false,
          "defer",
          false,
          true,
        ),
        prepare: () => preparePreferredPlaybackUri(catalogSound),
        start: (preparedAudioUri, isPreviewCurrent) =>
          handlePlay(catalogSound, true, preparedAudioUri, isPreviewCurrent),
        isSelectedCurrent: () =>
          selectedSoundRef.current.id === catalogSound.id &&
          currentSessionRef.current?.type === "single" &&
          currentSessionRef.current.soundId === catalogSound.id,
      });
    } catch (previewError: unknown) {
      if (
        selectedSoundRef.current.id === catalogSound.id &&
        currentSessionRef.current?.type === "single" &&
        currentSessionRef.current.soundId === catalogSound.id
      ) {
        setError(userFacingPlaybackErrorV1(previewError, "single"));
      }
    } finally {
      if (singlePreviewLoadingKeyRef.current === previewKey) {
        singlePreviewLoadingKeyRef.current = null;
        setIsLoading(false);
      }
    }
  };

  const handleStartM6VoiceForeground = async (voiceSound: MobileCatalogSound) => {
    const descriptor = getM6ProductBuilderDescriptor(voiceSound.id);
    if (!descriptor || !voiceSound.containsVoice || descriptor.role !== "foreground") {
      throw new Error("Only an active explicit-Choice M6 Voice identity can enter the Builder foreground path.");
    }

    const bedSound = defaultMobileCatalogSound;
    const acceptedBedCandidate = createBuilderCandidate(
      bedSound.id,
      "bed",
      0.12,
      true,
      "low-volume default-safe bed selected for an explicit Voice foreground session",
      "m6-voice-builder:bed",
    );
    const voiceCandidate = createBuilderCandidate(
      voiceSound.id,
      "foreground",
      0.18,
      true,
      "explicit current-session Voice foreground choice",
      `m6-voice-builder:foreground:${voiceSound.id}`,
    );
    const voiceModel = createBuilderSessionModel({
      origin: "manual",
      state: "manual_edit",
      sourceRecipeId: `m6-voice-builder:${voiceSound.id}`,
      title: `${voiceSound.title} · Voice foreground`,
      intent: "Explicit Voice foreground session",
      density: "minimal",
      seed: `m6-voice-builder:${voiceSound.id}`,
      choiceGranted: true,
      layers: [acceptedBedCandidate, voiceCandidate],
    });
    const voicePreset: MobileBuilderPreset = {
      id: `m6-voice-builder:${voiceSound.id}`,
      title: `${voiceSound.title} · Voice foreground`,
      subtitle: "Explicit Choice · Voice foreground",
      useCase: "Manual Voice foreground with a quiet default-safe bed.",
      layerSummary: "2 layers · accepted bed + Voice foreground",
      startingSoundId: bedSound.id,
      startingSoundLabel: bedSound.title,
      layers: voiceModel.layers.map((layer) => ({
        role: layer.role === "bed" ? "Background" : "Foreground",
        name: layer.title,
        soundId: layer.soundId,
        balanceLabel: layer.volume <= 0.14 ? "Quiet" : "Balanced",
      })),
      clearLabelRequired: true,
      userChoiceOnly: true,
      layeredPreview: {
        label: `${voiceSound.title} · Voice foreground`,
        availabilityLabel: "Choice enabled for this session",
        recipeAccuracy: "Playback preview",
        note: "Voice remains foreground, non-looping, and starts only from this explicit current-session choice.",
        layers: voiceModel.layers.map((layer) => ({
          builderLayerId: layer.layerId,
          role: layer.role === "bed" ? "Background" : "Foreground",
          soundId: layer.soundId,
          label: layer.title,
          volume: layer.volume,
          balanceLabel: layer.volume <= 0.14 ? "Quiet" : "Balanced",
        })),
      },
    };

    setSettingsOpen(false);
    requestPlayerTopScrollForSelection();
    setActiveSection("player");
    const started = await handleLayeredPreviewPlay(
      voicePreset,
      voiceModel,
      () => {
        singlePreviewStartCoordinatorRef.current.invalidate();
        invalidateSavedSessionStartForUserAction();
        setError(null);
        setLayeredPreviewError(null);
        setCurrentSavedSessionId(null);
        prepareTimerForNewSession();
        setSelectedPreset(voicePreset);
        publishBuilderModel(voiceModel);
        setCurrentSession({
          type: "recipe",
          title: voicePreset.title,
          source: "Presets/Builder",
          recipeId: voicePreset.id,
          startingSoundId: bedSound.id,
          updatedAt: Date.now(),
        });
        selectedSoundRef.current = bedSound;
        setSelectedSound(bedSound);
        addRecentSound(voiceSound);
        setIsLoopEnabled(false);
        isLoopEnabledRef.current = false;
        resetProgressForSelection(bedSound);
        return true;
      },
      () => true,
      { loopEnabled: false, timerMinutes: defaultTimerPreference },
    );
    if (!started) {
      setLayeredPreviewError(OFFLINE_PLAYBACK_COPY_V1.onlineLayeredUnknown);
    }
  };

  const handleFastStart = async (option: FastStartOption) => {
    const matchedSound = mobileCatalogSounds.find(
      (catalogSound) => catalogSound.id === option.soundId,
    );

    if (!matchedSound) {
      setError(`Fast Start match missing for ${option.label}`);
      return;
    }

    if (preferenceFeedback.avoidedSoundIds.includes(matchedSound.id)) {
      const fallback = getFallbackSuggestions([], activeAvoidedIntents, preferenceFeedback);
      const fallbackSound = fallback[0];
      if (fallbackSound) {
        prepareFastStartResult(
          fallbackSound,
          `Fast Start: ${option.matched}. ${matchedSound.title} is avoided locally, so this is the closest alternative.`,
          fallback,
          option.matched,
          false,
          `chip-${option.label}-personalized`,
        );
        return;
      }
      setFastStartMessage(`${matchedSound.title} is avoided locally and no safer alternative was found.`);
      setFastStartMessageTone("notice");
      return;
    }

    if (matchesAnyIntent(matchedSound, activeAvoidedIntents)) {
      showAvoidanceBlockedMessage(option.label);
      return;
    }

    prepareFastStartResult(
      matchedSound,
      `Fast Start: ${option.matched}.`,
      getFallbackSuggestions([], activeAvoidedIntents),
      option.matched,
      false,
      `chip-${option.label}`,
    );
  };

  const handleSelectPreset = async (preset: MobileBuilderPreset) => {
    recordPlaybackTimingTrace("RECIPE_RESULT_REUSED surface=curated action=SelectPreviewUse reason=fixed-definition", {
      command: "recipe-reuse",
    });
    recordPlaybackTimingTrace(
      `SESSION_REPLACEMENT_PRESS source=curated oldSessionType=${currentSession?.type ?? "idle"} newSessionType=recipe`,
      { command: "session-replacement" },
    );
    const pendingPresetId = pendingLayeredPresetIdRef.current;
    if (pendingPresetId === preset.id) {
      recordPlaybackTimingTrace("DUPLICATE_REPLACEMENT_BLOCKED source=curated", {
        command: "session-replacement",
      });
      setFastStartMessage(`Applying ${preset.title} is already in progress.`);
      setFastStartMessageTone("notice");
      return;
    }
    sessionClearOperationIdRef.current += 1;
    if (pendingPresetId) {
      layeredPresetPreviewCoordinatorRef.current.invalidate();
      sessionRestartCoordinatorRef.current.invalidate();
      beginLayeredPreviewOperation();
    }
    presetSelectionOperationIdRef.current += 1;
    const selectionOperationId = presetSelectionOperationIdRef.current;
    pendingLayeredPresetIdRef.current = preset.id;
    setPendingLayeredPresetId(preset.id);

    try {
      const presetStartingSound = mobileCatalogSounds.find(
        (catalogSound) => catalogSound.id === preset.startingSoundId,
      );

      if (!presetStartingSound) {
        setError(`Preset starting sound missing for ${preset.title}`);
        return;
      }

      const presetConflictSound = getPresetAvoidedConflictSound(preset, activeAvoidedIntents);
      if (presetConflictSound) {
        showRecipeConflictMessage(preset, presetConflictSound);
        return;
      }

      const definition = builderPresetDefinitionFromMobile(preset);
      let nextBuilderModel: BuilderSessionModelV1 | null = null;
      if (definition) {
        try {
          const currentModel = activeBuilderModelRef.current;
          const generatedModelMatchesPreset = Boolean(
            currentModel && preset.generatedRecipe && currentModel.sourceRecipeId === preset.generatedRecipe.id,
          );
          nextBuilderModel = generatedModelMatchesPreset && currentModel
            ? currentModel
            : createBuilderSessionModelFromPreset(definition);
        } catch (builderContractError: unknown) {
          setError(`Builder contract rejected ${preset.title}. ${formatError(builderContractError)}`);
          return;
        }
      }

      setFastStartMessage(`Applying ${preset.title}…`);
      setFastStartMessageTone("matched");
      AccessibilityInfo.announceForAccessibility(`Applying ${preset.title}`);
      requestPlayerTopScrollForSelection();
      setActiveSection("player");

      if (!definition || !nextBuilderModel) {
        await selectSound(
          presetStartingSound,
          `Preset direction selected: ${preset.title}. Only ${presetStartingSound.title} is playable, so Player opened as a truthful single sound.`,
          null,
          "Presets/Builder",
          true,
        );
        return;
      }

      sessionRestartCoordinatorRef.current.invalidate();
      const started = await runLayeredPresetPreview(layeredPresetPreviewCoordinatorRef.current, {
        presetId: preset.id,
        run: async (_token, isCurrent) => handleLayeredPreviewPlay(
          preset,
          nextBuilderModel,
          () => {
            if (!isCurrent()) return false;
            singlePreviewStartCoordinatorRef.current.invalidate();
            invalidateSavedSessionStartForUserAction();
            setError(null);
            setLayeredPreviewError(null);
            setCurrentSavedSessionId(null);
            prepareTimerForNewSession();
            setSelectedPreset(preset);
            publishBuilderModel(nextBuilderModel);
            setCurrentSession({
              type: "recipe",
              title: preset.title,
              source: "Presets/Builder",
              recipeId: preset.id,
              startingSoundId: presetStartingSound.id,
              updatedAt: Date.now(),
            });
            selectedSoundRef.current = presetStartingSound;
            setSelectedSound(presetStartingSound);
            addRecentSound(presetStartingSound);
            setIsLoopEnabled(false);
            isLoopEnabledRef.current = false;
            resetProgressForSelection(presetStartingSound);
            return true;
          },
          isCurrent,
          { loopEnabled: false, timerMinutes: defaultTimerPreference },
        ),
        isAccepted: (result) => result === true,
        onError: (previewError) => setLayeredPreviewError(userFacingPlaybackErrorV1(previewError, "layered")),
      });
      if (started) {
        setFastStartMessage(`Preset selected: ${preset.title}. Playback started.`);
        setFastStartMessageTone("matched");
        recordPlaybackTimingTrace("SESSION_REPLACEMENT_READY source=curated", {
          sound: presetStartingSound,
          command: "session-replacement",
        });
      }
    } finally {
      if (presetSelectionOperationIdRef.current === selectionOperationId) {
        pendingLayeredPresetIdRef.current = null;
        setPendingLayeredPresetId(null);
      }
    }
  };

  const handleUseGeneratedBuilderResult = async () => {
    if (!generatedBuilderPreset || !generatedBuilderRecipe || !activeBuilderModel) {
      const missingLayerNames = generatedBuilderRecipe?.layers
        .filter((layer) => !soundById.has(layer.soundId))
        .map((layer) => layer.title) ?? [];
      setFastStartMessage(
        missingLayerNames.length > 0
          ? `This result cannot be used because ${missingLayerNames.join(", ")} is unavailable in the mobile player.`
          : "Builder could not make a safe generated result for this choice. Try a different intent or density.",
      );
      setFastStartMessageTone("notice");
      return;
    }
    recordPlaybackTimingTrace("RECIPE_RESULT_REUSED surface=Builder action=UseThisMix reason=stored-result", {
      command: "recipe-reuse",
    });

    if (generatedBuilderRecipe.layers.length === 1) {
      const generatedModel = activeBuilderModel;
      const singleSound = soundById.get(generatedBuilderRecipe.layers[0].soundId);
      if (!singleSound) {
        setFastStartMessage(`${generatedBuilderRecipe.layers[0].title} is unavailable in the mobile player.`);
        setFastStartMessageTone("notice");
        return;
      }
      await selectSound(
        singleSound,
        `Single-sound fallback selected: ${singleSound.title}. Player opened for normal sound controls.`,
        null,
        "Presets/Builder",
        true,
      );
      publishBuilderModel(transitionBuilderSession(generatedModel, "generated"));
      return;
    }

    await handleSelectPreset(generatedBuilderPreset);
  };

  const handleTryAnotherGeneratedRecipe = async () => {
    const nextSeed = builderSeed + 1;
    setBuilderSeed(nextSeed);
    requestBuilderRecipeGeneration(selectedBuilderIntent, builderDensity, nextSeed, "try-another");
  };

  const handleSearchSubmit = async () => {
    Keyboard.dismiss();

    const result = matchFastStartQuery(fastStartSearchText, preferenceFeedback);

    setActiveAvoidedIntents(result.avoidedIntents);

    if (result.status === "conflict") {
      recipeDerivationCoordinator.cancel("Fast");
      setFastStartGeneratedRecipeResult(null);
      setFastStartRecipeGenerating(false);
      setFastStartMessage(result.message);
      setFastStartMessageTone("notice");
      setFastStartAlternatives(result.suggestedAlternatives);
      setFastStartResultSound(null);
      setFastStartResultWhy(null);
      setFastStartRecommendation(null);
      return;
    }

    if (result.status === "no-match") {
      recipeDerivationCoordinator.cancel("Fast");
      setFastStartGeneratedRecipeResult(null);
      setFastStartRecipeGenerating(false);
      setFastStartMessage(result.message);
      setFastStartMessageTone("no-match");
      setFastStartAlternatives(result.suggestedAlternatives);
      setFastStartResultSound(null);
      setFastStartResultWhy(null);
      setFastStartRecommendation(null);
      return;
    }

    prepareFastStartResult(
      result.sound,
      result.whyMatched,
      result.alternatives,
      result.recipeIntent,
      result.allowUserChoice,
      `search-${normalizeFastStartText(result.recipeIntent)}`,
      result.avoidedIntents,
    );
  };

  const handleSelectAlternative = async (catalogSound: MobileCatalogSound) => {
    if (matchesAnyIntent(catalogSound, activeAvoidedIntents)) {
      showAvoidanceBlockedMessage(catalogSound.title);
      return;
    }

    prepareFastStartResult(
      catalogSound,
      `Alternative selected: ${catalogSound.title}.`,
      fastStartAlternatives,
      `${catalogSound.title} ${catalogSound.lane} ${catalogSound.subtitle}`,
      catalogSound.userChoiceOnly,
      `alternative-${catalogSound.id}`,
    );
  };

  const handleClearSearch = () => {
    recipeDerivationCoordinator.cancel("Fast");
    setFastStartGeneratedRecipeResult(null);
    setFastStartRecipeGenerating(false);
    setFastStartSearchText("");
    setFastStartMessage(null);
    setFastStartAlternatives([]);
    setFastStartResultSound(null);
    setFastStartResultWhy(null);
    setFastStartRecommendation(null);
    fastStartRecipeSeedRef.current = 0;
    setFastStartRecipeRefinement("balanced");
    setFastStartRecipeSeed(0);
    setActiveAvoidedIntents([]);
  };

  const markOnboardingComplete = async () => {
    setShowOnboarding(false);
    setOnboardingStorageReady(true);
    await appPersistence.saveOnboardingComplete().catch(() => undefined);
  };

  const handleSkipOnboarding = async () => {
    await markOnboardingComplete();
    setActiveSection("fast-start");
  };

  const toggleOnboardingAvoidance = (avoidanceKey: string) => {
    setSelectedOnboardingAvoidanceKeys((currentKeys) =>
      currentKeys.includes(avoidanceKey)
        ? currentKeys.filter((key) => key !== avoidanceKey)
        : [...currentKeys, avoidanceKey],
    );
  };

  const handleFinishOnboarding = async () => {
    Keyboard.dismiss();
    const query = onboardingFastStartQuery;
    const result = matchFastStartQuery(query, preferenceFeedback);

    await markOnboardingComplete();
    setActiveSection("fast-start");
    setFastStartSearchText(query);
    setActiveAvoidedIntents(result.avoidedIntents);

    if (result.status === "matched") {
      prepareFastStartResult(
        result.sound,
        result.whyMatched,
        result.alternatives,
        result.recipeIntent,
        result.allowUserChoice,
        `search-${normalizeFastStartText(result.recipeIntent)}`,
        result.avoidedIntents,
      );
      return;
    }

    setFastStartMessage(result.message);
    setFastStartMessageTone(result.status === "conflict" ? "notice" : "no-match");
    setFastStartResultSound(null);
    setFastStartResultWhy(null);
    setFastStartRecommendation(null);
    setFastStartAlternatives(result.suggestedAlternatives);
  };

  const isLoadedSelectedSingleSound = (soundToCheck: MobileCatalogSound = selectedSoundRef.current) => {
    const loadedSingleSoundId = loadedSoundIdRef.current ?? loadedSoundId;
    return Boolean(
      soundRef.current &&
      selectedSoundRef.current.id === soundToCheck.id &&
      loadedSingleSoundId === soundToCheck.id,
    );
  };

  const hasLayeredPreviewCleanupTarget = () =>
    layeredSoundsRef.current.length > 0 || layeredPreviewStatusRef.current !== "idle";

  const scheduleDeferredSingleSoundCleanup = () => {
    if (!hasLayeredPreviewCleanupTarget()) {
      return;
    }

    recordPlaybackTimingTrace("deferred cleanup scheduled", {
      sound: selectedSoundRef.current,
      command: "cleanup",
    });
    setTimeout(() => {
      releaseLayeredPreviewForReplacement();
    }, 0);
  };

  const runLoadedSingleSoundPostCommandCleanup = (deferUntilNextTick = false) => {
    addRecentSound(selectedSoundRef.current);
    if (!hasLayeredPreviewCleanupTarget()) {
      return;
    }

    if (deferUntilNextTick) {
      setTimeout(scheduleDeferredSingleSoundCleanup, 0);
      return;
    }

    scheduleDeferredSingleSoundCleanup();
  };

  const recreateSingleSessionAfterTimerExpiry = async (
    blueprint: RetainedSingleRestartBlueprint,
    restartToken: number,
    isOperationCurrent: () => boolean = () => true,
  ) => {
    const isRestartCurrent = () =>
      sessionRestartCoordinatorRef.current.isCurrent(restartToken) &&
      isOperationCurrent() &&
      currentSessionRef.current?.type === "single" &&
      currentSessionRef.current.soundId === blueprint.sound.id;
    if (!isRestartCurrent()) {
      return null;
    }

    const staleResource = soundRef.current;
    soundRef.current = null;
    setSound(null);
    setLoadedSingleSoundId(null);
    setIsPlaying(false);
    if (staleResource) {
      await staleResource.unloadAsync().catch(() => undefined);
    }
    if (!isRestartCurrent()) {
      return null;
    }
    const refreshedPreparedAudioUri = await preparePreferredPlaybackUri(blueprint.sound);
    if (!isRestartCurrent()) return null;
    const recreatedResource = await ensureSound(false, blueprint.sound, refreshedPreparedAudioUri);
    if (recreatedResource && !isRestartCurrent()) {
      await recreatedResource.unloadAsync().catch(() => undefined);
      return null;
    }
    if (recreatedResource && isLoopEnabledRef.current) {
      await recreatedResource.setIsLoopingAsync(true);
    }
    return recreatedResource;
  };

  const playLoadedSelectedSoundNow = async (
    soundToPlay: MobileCatalogSound,
    commandSource: "play" | "resume",
    startingNewSession: boolean,
    isOperationCurrent: () => boolean = () => true,
  ) => {
    const loadedSelectedSound = soundRef.current;
    if (!loadedSelectedSound || !isLoadedSelectedSingleSound(soundToPlay)) {
      return false;
    }

    const replaySupersessionDisplayOverride = getReplaySaturationDisplayOverride();
    replayOptimisticProgressGenerationRef.current += 1;
    loadedReplayCommandInFlightGenerationRef.current = null;
    replayOptimisticNativeProbeInFlightGenerationRef.current = null;
    replayOptimisticDurationSaturatedGenerationRef.current = null;
    stopLoadedReplayOptimisticProgressClock(
      commandSource,
      undefined,
      false,
      replaySupersessionDisplayOverride,
    );
    setError(null);
    try {
      const livenessStatus = await loadedSelectedSound.getStatusAsync();
      if (!isOperationCurrent()) return false;
      if (classifyRestartPlaybackStatus(livenessStatus) === "unavailable") {
        const blueprint = retainedSingleRestartBlueprintRef.current;
        if (!blueprint || blueprint.sound.id !== soundToPlay.id) {
          throw new Error("The selected sound definition is unavailable. Select the sound again.");
        }
        return await sessionRestartCoordinatorRef.current.run(blueprint.key, async (restartToken) => {
          const isRestartCurrent = () =>
            sessionRestartCoordinatorRef.current.isCurrent(restartToken) &&
            isOperationCurrent() &&
            currentSessionRef.current?.type === "single" &&
            currentSessionRef.current.soundId === blueprint.sound.id;
          const recreatedResource = await recreateSingleSessionAfterTimerExpiry(
            blueprint,
            restartToken,
            isOperationCurrent,
          );
          if (!recreatedResource || !isRestartCurrent()) {
            return false;
          }
          const playStatus = await recreatedResource.playAsync();
          const truthfulStatus = await waitForTruthfulNativePlaying(
            recreatedResource,
            isRestartCurrent,
            playStatus,
          );
          if (classifyRestartPlaybackStatus(truthfulStatus) !== "playing" || !isRestartCurrent()) {
            throw new Error("SINGLE_PLAYBACK_ACTIVATION_UNCONFIRMED");
          }
          dispatchPlaybackTransport(commandSource);
          setIsPlaying(true);
          const timerDuration = startingNewSession && defaultTimerPreference > 0
            ? defaultTimerPreference
            : timerOptionMinutes;
          const timerRearmed = await rearmReadyTimerAfterTruthfulPlayback(
            recreatedResource.ownership.sessionId,
            isRestartCurrent,
            timerDuration,
          );
          if (!timerRearmed && timerDuration > 0 && isRestartCurrent()) {
            throw new Error("Playback restarted, but the Timer could not be rearmed.");
          }
          runLoadedSingleSoundPostCommandCleanup();
          return true;
        });
      }

      markPlaybackCommandForStatusTrace(commandSource);
      recordPlaybackTimingTrace("loaded fast path play start", {
        sound: soundToPlay,
        command: commandSource,
      });
      recordPlaybackTimingTrace(commandSource === "resume" ? "playAsync resume start" : "playAsync start", {
        sound: soundToPlay,
        command: commandSource,
      });
      const playStatus = await loadedSelectedSound.playAsync();
      const truthfulStatus = await waitForTruthfulNativePlaying(
        loadedSelectedSound,
        () => soundRef.current === loadedSelectedSound && isOperationCurrent(),
        playStatus,
      );
      if (!isOperationCurrent()) return false;
      if (classifyRestartPlaybackStatus(truthfulStatus) !== "playing") {
        throw new Error("SINGLE_PLAYBACK_ACTIVATION_UNCONFIRMED");
      }
      dispatchPlaybackTransport(commandSource);
      recordPlaybackTimingTrace(commandSource === "resume" ? "playAsync resume resolved" : "playAsync resolved", {
        sound: soundToPlay,
        command: commandSource,
      });
      setIsPlaying(true);
      const timerDuration = startingNewSession && defaultTimerPreference > 0
        ? defaultTimerPreference
        : timerOptionMinutes;
      const timerRearmed = await rearmReadyTimerAfterTruthfulPlayback(
        loadedSelectedSound.ownership.sessionId,
        () => soundRef.current === loadedSelectedSound && isOperationCurrent(),
        timerDuration,
      );
      if (
        !timerRearmed &&
        timerDuration > 0 &&
        soundRef.current === loadedSelectedSound &&
        isOperationCurrent()
      ) {
        throw new Error("Playback started, but the Timer could not be armed.");
      }
      runLoadedSingleSoundPostCommandCleanup();
      return true;
    } catch (playError: unknown) {
      if (!isOperationCurrent()) return false;
      recordPlaybackTimingTrace("command error", {
        sound: soundToPlay,
        command: commandSource,
        error: playError,
      });
      setIsPlaying(false);
      clearTimerCountdownOnly();
      const retainedSourceUri = retainedSingleRestartBlueprintRef.current?.preparedAudioUri;
      setError(retainedSourceUri?.startsWith("file:")
        ? appPlaybackCopyV1.offlineCopyUnusable
        : userFacingPlaybackErrorV1(playError, "single"));
      return false;
    }
  };

  const replayLoadedSelectedSoundNow = async (soundToReplay: MobileCatalogSound, startingNewSession: boolean) => {
    const loadedSelectedSound = soundRef.current;
    if (!loadedSelectedSound || !isLoadedSelectedSingleSound(soundToReplay)) {
      return false;
    }
    if (loadedReplayCommandInFlightGenerationRef.current !== null) {
      recordPlaybackTimingTrace("replay command ignored/in flight", {
        sound: soundToReplay,
        command: "replay",
      });
      return false;
    }

    const replayGeneration = replayOptimisticProgressGenerationRef.current + 1;
    replayOptimisticProgressGenerationRef.current = replayGeneration;
    loadedReplayCommandInFlightGenerationRef.current = replayGeneration;
    replayOptimisticNativeProbeInFlightGenerationRef.current = null;
    replayOptimisticDurationSaturatedGenerationRef.current = null;
    setError(null);
    try {
      markPlaybackCommandForStatusTrace("replay");
      recordPlaybackTimingTrace("loaded fast path replay start", {
        sound: soundToReplay,
        command: "replay",
      });
      recordPlaybackTimingTrace("replayAsync start", {
        sound: soundToReplay,
        command: "replay",
      });
      const replayStatus = await loadedSelectedSound.replayAsync();
      if (
        replayGeneration !== replayOptimisticProgressGenerationRef.current ||
        soundRef.current !== loadedSelectedSound
      ) {
        return false;
      }
      if (replayStatus.isLoaded && replayStatus.isPlaying) {
        startLoadedReplayOptimisticProgressClock(soundToReplay);
      }
      recordPlaybackTimingTrace("replayAsync resolved", {
        sound: soundToReplay,
        command: "replay",
      });
      startOrArmSinglePlaybackTimer(startingNewSession, true);
      runLoadedSingleSoundPostCommandCleanup(true);
      return true;
    } catch (replayError: unknown) {
      if (
        replayGeneration !== replayOptimisticProgressGenerationRef.current ||
        soundRef.current !== loadedSelectedSound
      ) {
        return false;
      }
      stopLoadedReplayOptimisticProgressClock(
        "error",
        undefined,
        false,
        replayOptimisticProgressPreviousPositionMillisRef.current,
      );
      recordPlaybackTimingTrace("command error", {
        sound: soundToReplay,
        command: "replay",
        error: replayError,
      });
      const retainedSourceUri = retainedSingleRestartBlueprintRef.current?.preparedAudioUri;
      setError(retainedSourceUri?.startsWith("file:")
        ? appPlaybackCopyV1.offlineCopyUnusable
        : userFacingPlaybackErrorV1(replayError, "single"));
      return false;
    } finally {
      if (loadedReplayCommandInFlightGenerationRef.current === replayGeneration) {
        loadedReplayCommandInFlightGenerationRef.current = null;
      }
    }
  };

  const ensureSound = async (
    _shouldPlay: boolean,
    soundOverride: MobileCatalogSound = selectedSound,
    preparedAudioUriOverride?: string,
  ) => {
    const soundToLoad = soundOverride;
    let preparedAudioUri = preparedAudioUriOverride;
    try {
      preparedAudioUri = preparedAudioUri ?? await preparePreferredPlaybackUri(soundToLoad);
    } catch (preparationError: unknown) {
      setError(userFacingPlaybackErrorV1(preparationError, "single"));
      return null;
    }
    recordPlaybackTimingTrace("ENSURE_SOUND_ENTERED", {
      sound: soundToLoad,
      command: preparedAudioUri === soundToLoad.audioUrl ? "ensure-remote" : "ensure-prepared",
    });
    if (soundRef.current && loadedSoundIdRef.current === soundToLoad.id) {
      return soundRef.current;
    }
    const operationId = beginSinglePlaybackOperation();

    if (soundRef.current) {
      releaseCurrentSoundForReplacement();
    }
    if (!isCurrentSinglePlaybackOperation(operationId)) {
      return null;
    }
    resetProgressForSelection(soundToLoad);
    setIsLoading(true);
    setError(null);

    try {
      markPlaybackCommandForStatusTrace("load");
      recordPlaybackTimingTrace("createAsync/load start", {
        sound: soundToLoad,
        command: "load",
      });
      recordPlaybackTimingTrace(
        preparedAudioUri === soundToLoad.audioUrl
          ? "cold start createAsync remote source"
          : "cold start createAsync local source",
        {
          sound: soundToLoad,
          command: preparedAudioUri === soundToLoad.audioUrl ? "load-remote" : "load-local-cache",
        },
      );
      const statusCallbackGeneration = playbackStatusCallbackGenerationRef.current + 1;
      playbackStatusCallbackGenerationRef.current = statusCallbackGeneration;
      const singleSessionId = currentSessionRef.current?.type === "single"
        ? currentSessionRef.current.updatedAt.toString()
        : soundToLoad.id;
      retainedSingleRestartBlueprintRef.current = null;
      const created = await audioService.create(
        preparedAudioUri,
        {
          shouldPlay: false,
          progressUpdateIntervalMillis: 500,
          soundId: soundToLoad.id,
          title: soundToLoad.title,
          durationMillis: secondsToMillis(soundToLoad.durationSeconds),
          loopEligible: soundToLoad.loopEligible,
        },
        (status) => onPlaybackStatusUpdate(status, statusCallbackGeneration),
        {
          sessionId: singleSessionId,
          generation: statusCallbackGeneration,
          operationId,
        },
      );
      if (!isCurrentSinglePlaybackOperation(operationId)) {
        recordPlaybackTimingTrace("stale/ignored status", {
          sound: soundToLoad,
          command: "load",
        });
        await created.resource.unloadAsync().catch(() => undefined);
        return null;
      }
      recordPlaybackTimingTrace("createAsync/load resolved", {
        sound: soundToLoad,
        command: "load",
      });
      soundRef.current = created.resource;
      setSound(created.resource);
      setLoadedSingleSoundId(soundToLoad.id);
      retainedSingleRestartBlueprintRef.current = {
        key: singleSessionId,
        sound: soundToLoad,
        preparedAudioUri,
      };
      retainedLayeredRestartBlueprintRef.current = null;
      return created.resource;
    } catch (loadError: unknown) {
      if (!isCurrentSinglePlaybackOperation(operationId)) {
        return null;
      }
      recordPlaybackTimingTrace("command error", {
        sound: soundToLoad,
        command: "load",
        error: loadError,
      });
      setError(preparedAudioUri.startsWith("file:")
        ? appPlaybackCopyV1.offlineCopyUnusable
        : userFacingPlaybackErrorV1(loadError, "single"));
      return null;
    } finally {
      if (isCurrentSinglePlaybackOperation(operationId)) {
        setIsLoading(false);
      }
    }
  };

  const setActiveSection = (sectionKey: MobileSectionKey) => {
    activeSectionKeyRef.current = sectionKey;
    setActiveSectionKey(sectionKey);
  };

  useEffect(() => {
    if (!directedClassicRoute) return;
    startTabPreferenceAppliedRef.current = true;
    if (directedClassicRoute === "saved-mixes" || directedClassicRoute === "saved-sounds") {
      setSettingsOpen(false);
      return;
    }
    setSettingsOpen(directedClassicRoute === "settings");
    const section: MobileSectionKey = directedClassicRoute === "player"
      ? "player"
      : directedClassicRoute === "browse"
        ? "browse"
        : directedClassicRoute === "presets"
          ? "presets"
          : "fast-start";
    setActiveSection(section);
    requestAnimationFrame(() => scrollViewRef.current?.scrollToOffset({ offset: 0, animated: false }));
  }, [directedClassicRoute]);

  const invalidateSavedDestinationIntent = useCallback(() => {
    const requestId = savedDestinationIntent?.requestId;
    savedDestinationRevisionRef.current += 1;
    if (requestId) {
      consumedSavedDestinationRequestRef.current = requestId;
      onSavedDestinationConsumed?.(requestId);
    }
  }, [onSavedDestinationConsumed, savedDestinationIntent?.requestId]);

  const consumeSavedDestinationIntent = useCallback((intent: SavedDestinationIntentV1) => {
    if (savedDestinationRevisionRef.current !== intent.requestId) return false;
    const target = intent.tab === "sessions" ? savedMixesDestinationRef.current : savedSoundsDestinationRef.current;
    const targetHandle = target ? findNodeHandle(target) : null;
    if (!targetHandle) return false;
    AccessibilityInfo.setAccessibilityFocus(targetHandle);
    AccessibilityInfo.announceForAccessibility(`${intent.label}. Destination reached.`);
    consumedSavedDestinationRequestRef.current = intent.requestId;
    pendingSavedDestinationRequestRef.current = null;
    onSavedDestinationConsumed?.(intent.requestId);
    return true;
  }, [onSavedDestinationConsumed]);

  useEffect(() => {
    if (!savedDestinationIntent) return;
    savedDestinationRevisionRef.current = savedDestinationIntent.requestId;
    consumedSavedDestinationRequestRef.current = null;
    pendingSavedDestinationRequestRef.current = null;
    startTabPreferenceAppliedRef.current = true;
    setSettingsOpen(false);
    const plan = planSavedDestinationApplicationV1(savedDestinationIntent, {
      currentRequestId: savedDestinationIntent.requestId,
      consumedRequestId: null,
      activeSectionKey: activeSectionKeyRef.current,
      activeTab: savedAreaTab,
      containerLayoutY: savedAreaContainerLayoutYRef.current,
      headingLayoutY: savedDestinationLayoutYRef.current[savedDestinationIntent.tab],
    });
    if (plan?.needsSectionSelection) setActiveSection("player");
    if (plan?.needsTabSelection) setSavedAreaTab(plan.tab);
  }, [savedDestinationIntent?.requestId, savedDestinationIntent?.tab]);

  useEffect(() => () => {
    savedDestinationRevisionRef.current += 1;
    consumedSavedDestinationRequestRef.current = savedDestinationIntent?.requestId ?? consumedSavedDestinationRequestRef.current;
    pendingSavedDestinationRequestRef.current = null;
  }, [savedDestinationIntent?.requestId]);

  useEffect(() => {
    if (!localStorageReady || !savedSessionsStorageReady) return;
    const plan = planSavedDestinationApplicationV1(savedDestinationIntent, {
      currentRequestId: savedDestinationRevisionRef.current,
      consumedRequestId: consumedSavedDestinationRequestRef.current,
      activeSectionKey,
      activeTab: savedAreaTab,
      containerLayoutY: savedAreaContainerLayoutYRef.current,
      headingLayoutY: savedDestinationIntent ? savedDestinationLayoutYRef.current[savedDestinationIntent.tab] : null,
    });
    if (!savedDestinationIntent || !plan?.ready || plan.scrollOffset === null) return;
    if (pendingSavedDestinationRequestRef.current === plan.requestId) return;
    const intent = savedDestinationIntent;
    const scrollOffset = plan.scrollOffset;
    pendingSavedDestinationRequestRef.current = intent.requestId;
    requestAnimationFrame(() => {
      if (savedDestinationRevisionRef.current !== intent.requestId) {
        if (pendingSavedDestinationRequestRef.current === intent.requestId) pendingSavedDestinationRequestRef.current = null;
        return;
      }
      scrollViewRef.current?.scrollToOffset({ offset: scrollOffset, animated: false });
      requestAnimationFrame(() => {
        if (savedDestinationRevisionRef.current !== intent.requestId || !consumeSavedDestinationIntent(intent)) {
          if (pendingSavedDestinationRequestRef.current === intent.requestId) pendingSavedDestinationRequestRef.current = null;
        }
      });
    });
  }, [
    activeSectionKey,
    consumeSavedDestinationIntent,
    localStorageReady,
    savedAreaTab,
    savedDestinationIntent,
    savedDestinationLayoutRevision,
    savedSessionsStorageReady,
  ]);

  const handleSectionJump = (sectionKey: MobileSectionKey) => {
    invalidateSavedDestinationIntent();
    setSettingsOpen(false);
    setPendingDeleteSessionId(null);
    setManagedSavedSessionId(null);
    setActiveSection(sectionKey);
    scrollViewRef.current?.scrollToOffset({ offset: 0, animated: false });
  };

  const handleOpenPlayer = () => {
    const action = planClassicPlayerOpenV1(surfaceVisible);
    if (action.revealRetainedSurface) onOpenRetainedClassicPlayer?.();
    handleSectionJump(action.section);
  };

  const handleToggleBrowseFilter = (groupKey: BrowseFilterGroupKey, optionKey: BrowseFilterKey) => {
    const optionIsAlreadyActive = browseFilters[groupKey].includes(optionKey);
    if (!optionIsAlreadyActive && (browseFilterOptionCounts[groupKey][optionKey] ?? 0) === 0) {
      return;
    }
    const nextState = toggleBrowseFilterState(browseFilters, activeBrowseCollectionId, groupKey, optionKey);
    setBrowseFilters(nextState.filters);
    setActiveBrowseCollectionId(nextState.collectionId);
  };

  const handleSelectBrowseCollection = (collectionId: DiscoveryCollectionId) => {
    const nextState = selectBrowseCollectionState(browseFilters, activeBrowseCollectionId, collectionId);
    setBrowseFilters(nextState.filters);
    setActiveBrowseCollectionId(nextState.collectionId);
  };

  const handleClearBrowseFilterChip = (chip: (typeof activeBrowseFilterChips)[number]) => {
    const nextState = clearBrowseFilterState(browseFilters, activeBrowseCollectionId, chip);
    setBrowseFilters(nextState.filters);
    setActiveBrowseCollectionId(nextState.collectionId);
  };

  const handleClearAllBrowseDiscovery = () => {
    setBrowseSearchText("");
    setBrowseFilters(defaultBrowseFilterState);
    setActiveBrowseCollectionId(null);
  };

  const handleToggleLoop = async () => {
    if (sessionStopInProgressRef.current) {
      return;
    }
    if (!activeSessionLoopEligible) {
      setFastStartMessage(
        currentSession?.type === "recipe"
          ? "Loop unavailable: one or more active layers are not approved for looping."
          : `${selectedSound.title}: Loop unavailable for this sound.`,
      );
      setFastStartMessageTone("notice");
      setIsLoopEnabled(false);
      isLoopEnabledRef.current = false;
      return;
    }

    const nextLoopEnabled = !isLoopEnabledRef.current;
    try {
      if (currentSession?.type === "recipe") {
        if (layeredSoundsRef.current.length > 0) {
          await Promise.all(
            layeredSoundsRef.current.map((layeredSound) => layeredSound.setIsLoopingAsync(nextLoopEnabled)),
          );
        }
      } else {
        const activeSingleSound = soundRef.current;
        if (!activeSingleSound || loadedSoundIdRef.current !== selectedSound.id) {
          setError("Could not change Loop because this sound is not loaded.");
          return;
        }
        await activeSingleSound.setIsLoopingAsync(nextLoopEnabled);
      }
    } catch (loopError: unknown) {
      if (currentSession?.type === "recipe") {
        setLayeredPreviewError(`Could not change Loop: ${formatError(loopError)}`);
      } else {
        setError(`Could not change Loop: ${formatError(loopError)}`);
      }
      return;
    }

    dispatchPlaybackLoop(nextLoopEnabled);
    isLoopEnabledRef.current = nextLoopEnabled;
    setIsLoopEnabled(nextLoopEnabled);
    if (currentSession?.type === "recipe") {
      const retainedLayeredBlueprint = retainedLayeredRestartBlueprintRef.current;
      if (retainedLayeredBlueprint?.presetId === currentSession.recipeId) {
        retainedLayeredRestartBlueprintRef.current = {
          ...retainedLayeredBlueprint,
          options: { ...retainedLayeredBlueprint.options, loopEnabled: nextLoopEnabled },
        };
      }
    }
  };

  const handlePlay = async (
    soundOverride?: MobileCatalogSound,
    startingNewSessionOverride?: boolean,
    preparedAudioUriOverride?: string,
    isOperationCurrent: () => boolean = () => true,
  ): Promise<boolean> => {
    const soundToPlay = soundOverride ?? selectedSound;
    if (sessionStopInProgressRef.current) {
      return false;
    }
    setSessionStopPhase("idle");
    if (matchesAnyIntent(soundToPlay, activeAvoidedIntents)) {
      showAvoidanceBlockedMessage(soundToPlay.title);
      return false;
    }
    sessionClearOperationIdRef.current += 1;

    const playCommand = soundRef.current && loadedSoundIdRef.current === soundToPlay.id ? "resume" : "play";
    recordPlaybackTimingTrace(
      playCommand === "resume"
        ? "TRANSPORT_HANDLER_ENTRY command=Resume"
        : "TRANSPORT_HANDLER_ENTRY command=Play",
      { sound: soundToPlay, command: playCommand },
    );
    recordPlaybackTimingTrace(playCommand === "resume" ? "Resume tapped" : "Start tapped", {
      sound: soundToPlay,
      command: playCommand,
    });

    const existingSession = currentSessionRef.current;
    const startingNewSession = startingNewSessionOverride ?? !existingSession;
    if (!existingSession) {
      prepareTimerForNewSession();
      setCurrentSession({
        type: "single",
        title: soundToPlay.title,
        source: "Player",
        soundId: soundToPlay.id,
        updatedAt: Date.now(),
      });
    }
    if (!isOperationCurrent()) return false;
    dispatchPlaybackTransport("load");

    if (isLoadedSelectedSingleSound(soundToPlay)) {
      savedSessionPreparedAudioUriRef.current = null;
      return await playLoadedSelectedSoundNow(
        soundToPlay,
        playCommand,
        startingNewSession,
        isOperationCurrent,
      );
    }

    addRecentSound(soundToPlay);
    releaseLayeredPreviewForReplacement();
    const savedPreparedAudioUri = savedSessionPreparedAudioUriRef.current;
    savedSessionPreparedAudioUriRef.current = null;
    const playableSound = await ensureSound(
      true,
      soundToPlay,
      preparedAudioUriOverride ?? savedPreparedAudioUri ?? undefined,
    );
    if (!playableSound || !isOperationCurrent()) {
      return false;
    }

    setError(null);
    try {
      markPlaybackCommandForStatusTrace(playCommand);
      recordPlaybackTimingTrace(playCommand === "resume" ? "playAsync resume start" : "playAsync start", {
        sound: soundToPlay,
        command: playCommand,
      });
      const playStatus = await playableSound.playAsync();
      const truthfulStatus = await waitForTruthfulNativePlaying(
        playableSound,
        () => soundRef.current === playableSound && isOperationCurrent(),
        playStatus,
      );
      if (!isOperationCurrent()) return false;
      if (classifyRestartPlaybackStatus(truthfulStatus) !== "playing") {
        throw new Error("SINGLE_PLAYBACK_ACTIVATION_UNCONFIRMED");
      }
      dispatchPlaybackTransport(playCommand);
      recordPlaybackTimingTrace(playCommand === "resume" ? "playAsync resume resolved" : "playAsync resolved", {
        sound: soundToPlay,
        command: playCommand,
      });
      setIsPlaying(true);
      const timerDuration = startingNewSession && defaultTimerPreference > 0
        ? defaultTimerPreference
        : timerOptionMinutes;
      const timerRearmed = await rearmReadyTimerAfterTruthfulPlayback(
        playableSound.ownership.sessionId,
        () => soundRef.current === playableSound && isOperationCurrent(),
        timerDuration,
      );
      if (
        !timerRearmed &&
        timerDuration > 0 &&
        soundRef.current === playableSound &&
        isOperationCurrent()
      ) {
        throw new Error("Playback started, but the Timer could not be armed.");
      }
      return true;
    } catch (playError: unknown) {
      if (!isOperationCurrent()) return false;
      recordPlaybackTimingTrace("command error", {
        sound: soundToPlay,
        command: playCommand,
        error: playError,
      });
      const retainedSourceUri = retainedSingleRestartBlueprintRef.current?.preparedAudioUri;
      setError(retainedSourceUri?.startsWith("file:")
        ? appPlaybackCopyV1.offlineCopyUnusable
        : userFacingPlaybackErrorV1(playError, "single"));
      return false;
    }
  };

  const handlePause = async () => {
    recordPlaybackTimingTrace("TRANSPORT_HANDLER_ENTRY command=Pause", {
      sound: selectedSound,
      command: "pause",
    });
    if (sessionStopInProgressRef.current) {
      return;
    }
    if (!sound) {
      return;
    }
    sessionClearOperationIdRef.current += 1;
    dispatchPlaybackTransport("pause");

    setError(null);
    const replaySupersessionDisplayOverride = getReplaySaturationDisplayOverride();
    replayOptimisticProgressGenerationRef.current += 1;
    loadedReplayCommandInFlightGenerationRef.current = null;
    replayOptimisticNativeProbeInFlightGenerationRef.current = null;
    replayOptimisticDurationSaturatedGenerationRef.current = null;
    stopLoadedReplayOptimisticProgressClock(
      "pause",
      undefined,
      false,
      replaySupersessionDisplayOverride,
    );
    try {
      recordPlaybackTimingTrace("Pause tapped", {
        sound: selectedSound,
        command: "pause",
      });
      markPlaybackCommandForStatusTrace("pause");
      recordPlaybackTimingTrace("pauseAsync start", {
        sound: selectedSound,
        command: "pause",
      });
      await sound.pauseAsync();
      recordPlaybackTimingTrace("pauseAsync resolved", {
        sound: selectedSound,
        command: "pause",
      });
    } catch (pauseError: unknown) {
      recordPlaybackTimingTrace("command error", {
        sound: selectedSound,
        command: "pause",
        error: pauseError,
      });
      setError(formatError(pauseError));
    }
  };

  const handleReplay = async () => {
    if (sessionStopInProgressRef.current) {
      return;
    }
    setSessionStopPhase("idle");
    if (matchesAnyIntent(selectedSound, activeAvoidedIntents)) {
      showAvoidanceBlockedMessage(selectedSound.title);
      return;
    }

    recordPlaybackTimingTrace("Replay tapped", {
      sound: selectedSound,
      command: "replay",
    });

    const startingNewSession = !currentSession;
    if (startingNewSession) {
      prepareTimerForNewSession();
      setCurrentSession({
        type: "single",
        title: selectedSound.title,
        source: "Player",
        soundId: selectedSound.id,
        updatedAt: Date.now(),
      });
    }
    dispatchPlaybackTransport("replay");

    if (isLoadedSelectedSingleSound(selectedSound)) {
      void replayLoadedSelectedSoundNow(selectedSound, startingNewSession);
      return;
    }

    addRecentSound(selectedSound);
    releaseLayeredPreviewForReplacement();
    const playableSound = await ensureSound(false);
    if (!playableSound) {
      return;
    }

    setError(null);
    setPositionMillis(0);
    try {
      markPlaybackCommandForStatusTrace("replay");
      recordPlaybackTimingTrace("replayAsync start", {
        sound: selectedSound,
        command: "replay",
      });
      await playableSound.replayAsync();
      recordPlaybackTimingTrace("replayAsync resolved", {
        sound: selectedSound,
        command: "replay",
      });
      startOrArmSinglePlaybackTimer(startingNewSession, true);
    } catch (replayError: unknown) {
      stopLoadedReplayOptimisticProgressClock("error");
      recordPlaybackTimingTrace("command error", {
        sound: selectedSound,
        command: "replay",
        error: replayError,
      });
      const retainedSourceUri = retainedSingleRestartBlueprintRef.current?.preparedAudioUri;
      setError(retainedSourceUri?.startsWith("file:")
        ? appPlaybackCopyV1.offlineCopyUnusable
        : userFacingPlaybackErrorV1(replayError, "single"));
    }
  };

  const canSeekSinglePlayback = currentSession?.type === "single"
    && hasProgressDuration
    && !singlePlaybackCommandInFlight;
  const canUseSeekControl = canSeekSinglePlayback && progressTrackWidth > 0;
  const canUseMiniSeekControl = canSeekSinglePlayback && miniProgressTrackWidth > 0;

  const getSeekPositionMillis = useCallback(
    (locationX: number, trackWidth: number) => getFiniteSeekPositionMillis(
      locationX,
      trackWidth,
      progressDurationMillis,
    ),
    [progressDurationMillis],
  );

  const commitSeekPosition = useCallback(async (
    nextPositionMillis: number,
    shouldPlayAfterSeek: boolean,
  ) => {
    if (!Number.isFinite(nextPositionMillis)) {
      return;
    }
    dispatchPlaybackSeek(nextPositionMillis);
    await unloadLayeredPreview();
    const playableSound = await ensureSound(false);
    if (!playableSound) {
      return;
    }

    setError(null);
    setPositionMillis(nextPositionMillis);
    try {
      await playableSound.setStatusAsync({
        positionMillis: nextPositionMillis,
        shouldPlay: shouldPlayAfterSeek,
      });
    } catch (seekError: unknown) {
      if (!isExpectedSeekInterruption(seekError)) {
        setError(formatError(seekError));
      }
    }
  }, [ensureSound, unloadLayeredPreview]);

  const prepareSeekPosition = useCallback((nextPositionMillis: number) => {
    if (!Number.isFinite(nextPositionMillis)) {
      return false;
    }
    replayOptimisticProgressGenerationRef.current += 1;
    loadedReplayCommandInFlightGenerationRef.current = null;
    replayOptimisticNativeProbeInFlightGenerationRef.current = null;
    replayOptimisticDurationSaturatedGenerationRef.current = null;
    stopLoadedReplayOptimisticProgressClock("seek", undefined, true, nextPositionMillis);
    setError(null);
    setPositionMillis(nextPositionMillis);
    return true;
  }, []);

  const beginSeekDrag = useCallback(
    (locationX: number, trackWidth: number) => {
      if (sessionStopInProgressRef.current || !canSeekSinglePlayback || trackWidth <= 0) {
        return false;
      }

      if (matchesAnyIntent(selectedSound, activeAvoidedIntents)) {
        showAvoidanceBlockedMessage(selectedSound.title);
        return false;
      }

      const nextPositionMillis = getSeekPositionMillis(locationX, trackWidth);
      if (nextPositionMillis === null || !prepareSeekPosition(nextPositionMillis)) {
        return false;
      }
      isScrubbingRef.current = true;
      scrubWasPlayingRef.current = isPlaying;
      scrubPositionMillisRef.current = nextPositionMillis;
      return true;
    },
    [activeAvoidedIntents, canSeekSinglePlayback, getSeekPositionMillis, isPlaying, prepareSeekPosition, selectedSound],
  );

  const updateSeekDrag = useCallback(
    (locationX: number, trackWidth: number) => {
      if (!isScrubbingRef.current || !canSeekSinglePlayback || trackWidth <= 0) {
        return;
      }

      const nextPositionMillis = getSeekPositionMillis(locationX, trackWidth);
      if (nextPositionMillis === null) {
        return;
      }
      scrubPositionMillisRef.current = nextPositionMillis;
      setPositionMillis(nextPositionMillis);
    },
    [canSeekSinglePlayback, getSeekPositionMillis],
  );

  const finishSeekDrag = useCallback(async () => {
    if (!isScrubbingRef.current || !canSeekSinglePlayback) {
      isScrubbingRef.current = false;
      return;
    }

    const nextPositionMillis = scrubPositionMillisRef.current;
    const shouldPlayAfterSeek = scrubWasPlayingRef.current;
    isScrubbingRef.current = false;
    await commitSeekPosition(nextPositionMillis, shouldPlayAfterSeek);
  }, [canSeekSinglePlayback, commitSeekPosition]);

  const handleAccessibleSeek = useCallback((direction: "increment" | "decrement") => {
    if (!canSeekSinglePlayback || sessionStopInProgressRef.current) {
      return;
    }
    const seekStepMillis = Math.max(5000, Math.round(progressDurationMillis * 0.05));
    const directionMultiplier = direction === "increment" ? 1 : -1;
    const nextPositionMillis = Math.min(
      progressDurationMillis,
      Math.max(0, positionMillis + (seekStepMillis * directionMultiplier)),
    );
    prepareSeekPosition(nextPositionMillis);
    void commitSeekPosition(nextPositionMillis, isPlaying);
  }, [canSeekSinglePlayback, commitSeekPosition, isPlaying, positionMillis, prepareSeekPosition, progressDurationMillis]);

  const seekPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: () => canUseSeekControl,
        onMoveShouldSetPanResponderCapture: () => canUseSeekControl,
        onPanResponderGrant: (event) => {
          beginSeekDrag(event.nativeEvent.locationX, progressTrackWidth);
        },
        onPanResponderMove: (event) => {
          updateSeekDrag(event.nativeEvent.locationX, progressTrackWidth);
        },
        onPanResponderRelease: () => {
          finishSeekDrag().catch((seekError: unknown) => {
            if (!isExpectedSeekInterruption(seekError)) setError(formatError(seekError));
          });
        },
        onPanResponderTerminate: () => {
          finishSeekDrag().catch((seekError: unknown) => {
            if (!isExpectedSeekInterruption(seekError)) setError(formatError(seekError));
          });
        },
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onStartShouldSetPanResponder: () => canUseSeekControl,
        onStartShouldSetPanResponderCapture: () => canUseSeekControl,
      }),
    [beginSeekDrag, canUseSeekControl, finishSeekDrag, progressTrackWidth, updateSeekDrag],
  );

  const miniSeekPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: () => canUseMiniSeekControl,
        onMoveShouldSetPanResponderCapture: () => canUseMiniSeekControl,
        onPanResponderGrant: (event) => {
          beginSeekDrag(event.nativeEvent.locationX, miniProgressTrackWidth);
        },
        onPanResponderMove: (event) => {
          updateSeekDrag(event.nativeEvent.locationX, miniProgressTrackWidth);
        },
        onPanResponderRelease: () => {
          finishSeekDrag().catch((seekError: unknown) => {
            if (!isExpectedSeekInterruption(seekError)) setError(formatError(seekError));
          });
        },
        onPanResponderTerminate: () => {
          finishSeekDrag().catch((seekError: unknown) => {
            if (!isExpectedSeekInterruption(seekError)) setError(formatError(seekError));
          });
        },
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onStartShouldSetPanResponder: () => canUseMiniSeekControl,
        onStartShouldSetPanResponderCapture: () => canUseMiniSeekControl,
      }),
    [beginSeekDrag, canUseMiniSeekControl, finishSeekDrag, miniProgressTrackWidth, updateSeekDrag],
  );

  const getLayeredPreviewSounds = (layers: LayeredPreviewLayer[]) =>
    layers.map((layer) => ({
      layer,
      catalogSound: mobileCatalogSounds.find((catalogSound) => catalogSound.id === layer.soundId),
    }));

  const prepareBuilderReplacementDefinition = async (
    sounds: readonly MobileCatalogSound[],
  ): Promise<Readonly<{
    sourceUris: ReadonlyMap<string, string>;
    unavailable: readonly Readonly<{ sound: MobileCatalogSound; error: OfflinePlaybackPreparationErrorV1 }>[];
  }>> => {
    const results = await Promise.all(sounds.map(async (catalogSound) => {
      try {
        const sourceUri = await preparePreferredPlaybackUri(catalogSound);
        if (!sourceUri || (!sourceUri.startsWith("file:") && !sourceUri.startsWith("http://") && !sourceUri.startsWith("https://"))) {
          throw new Error(`${catalogSound.title} has no playable local or remote source.`);
        }
        return { state: "playable" as const, sound: catalogSound, sourceUri };
      } catch (error: unknown) {
        if (!(error instanceof OfflinePlaybackPreparationErrorV1)) throw error;
        return { state: "unavailable" as const, sound: catalogSound, error };
      }
    }));
    const sourceUris = new Map(
      results
        .filter((result): result is Extract<(typeof results)[number], { state: "playable" }> => result.state === "playable")
        .map((result) => [result.sound.id, result.sourceUri] as const),
    );
    const unavailable = results
      .filter((result): result is Extract<(typeof results)[number], { state: "unavailable" }> => result.state === "unavailable")
      .map(({ sound, error }) => Object.freeze({ sound, error }));
    if (!sourceUris.size) {
      const message = formatUnavailableOfflineLayersV1(unavailable.map(({ sound }) => sound.title))
        ?? appPlaybackCopyV1.onlineLayeredUnknown;
      throw new OfflinePlaybackPreparationErrorV1(
        unavailable[0]?.error.code ?? "NOT_DOWNLOADED",
        message,
        `No layer passed current manifest and network preparation (${unavailable.map(({ sound, error }) => `${sound.id}:${error.code}`).join(",")}).`,
      );
    }
    return Object.freeze({ sourceUris, unavailable: Object.freeze(unavailable) });
  };

  const recordPendingBuilderEdit = (model: BuilderSessionModelV1) => {
    const state = builderAtomicEditCoordinatorRef.current.state();
    if (!state) return;
    builderEditOperationIdRef.current = Math.max(
      builderEditOperationIdRef.current + 1,
      state.playableDefinition.owner.operationId + 1,
      (state.pendingToken?.operationId ?? 0) + 1,
    );
    builderAtomicEditCoordinatorRef.current.begin({
      ...state.playableDefinition.owner,
      operationId: builderEditOperationIdRef.current,
      model,
    });
  };

  const getBuilderLayerKey = (layer: LayeredPreviewLayer) =>
    selectedPreset ? buildBuilderLayerKey(selectedPreset, layer) : getBuilderLayerId(null, layer);

  const toggleBuilderLayer = async (layer: LayeredPreviewLayer) => {
    const role = layer.role;
    if (role === "Background") {
      return;
    }
    const model = activeBuilderModelRef.current;
    const layerId = getBuilderLayerId(selectedPreset, layer);
    if (!model) {
      showTransientNotification("This recipe has no editable Builder definition. The layer was kept.");
      return;
    }
    const currentLayer = model.layers.find((modelLayer) => modelLayer.layerId === layerId);
    if (!currentLayer) return;
    const editResult = applyBuilderEdit(model, { type: "set-enabled", layerId, enabled: !currentLayer.enabled });
    if (!editResult.accepted) {
      showTransientNotification(editResult.explanation);
      return;
    }
    publishBuilderModel(editResult.model);
    recordPendingBuilderEdit(editResult.model);
    const layerKey = getBuilderLayerKey(layer);
    const enabled = editResult.model.layers.find((modelLayer) => modelLayer.layerId === layerId)?.enabled ?? !currentLayer.enabled;
    dispatchPlaybackLayer(layerKey, enabled);
    setBuilderEnabledLayerKeys((current) => ({ ...current, [layerKey]: enabled }));
    showTransientNotification(editResult.explanation);
  };

  const setBuilderLayerBalance = async (layer: LayeredPreviewLayer, balance: BuilderLayerBalance) => {
    const role = layer.role;
    const model = activeBuilderModelRef.current;
    const layerId = getBuilderLayerId(selectedPreset, layer);
    const volume = getBuilderBalanceVolume(role, balance);
    if (!model) {
      showTransientNotification("This recipe has no editable Builder definition. The balance was kept.");
      return;
    }
    const editResult = applyBuilderEdit(model, { type: "set-volume", layerId, volume });
    if (!editResult.accepted) {
      showTransientNotification(editResult.explanation);
      return;
    }
    publishBuilderModel(editResult.model);
    recordPendingBuilderEdit(editResult.model);
    dispatchPlaybackLayer(getBuilderLayerKey(layer), undefined, volume);
    setBuilderLayerBalances((current) => ({ ...current, [getBuilderLayerKey(layer)]: balance }));
    showTransientNotification(editResult.explanation);
  };

  const swapBuilderLayer = async (layer: LayeredPreviewLayer) => {
    const role = layer.role;
    if (!selectedPreset || !selectedLayeredPreview) {
      return;
    }

    if (!selectedLayeredPreview.layers.includes(layer)) return;

    const layerKey = getBuilderLayerKey(layer);
    const currentSoundId = builderLayerSwaps[layerKey] ?? layer.soundId;
    const swapOptions = getLayerSwapOptionsForPreset(selectedPreset, layer).filter((catalogSound) => !matchesAnyIntent(catalogSound, activeAvoidedIntents));
    if (swapOptions.length <= 1) {
      return;
    }

    const currentIndex = Math.max(0, swapOptions.findIndex((catalogSound) => catalogSound.id === currentSoundId));
    const nextSound = swapOptions[(currentIndex + 1) % swapOptions.length];
    const model = activeBuilderModelRef.current;
    const layerId = getBuilderLayerId(selectedPreset, layer);
    const recipeRole = builderRoleToRecipeRole(role) as BuilderSessionLayerRole;
    const currentModelLayer = model?.layers.find((modelLayer) => modelLayer.layerId === layerId);
    if (!model || !currentModelLayer) {
      showTransientNotification("This recipe has no editable Builder definition. The current layer was kept.");
      return;
    }
    const editResult = applyBuilderEdit(model, {
      type: "swap",
      layerId,
      candidate: createBuilderCandidate(
        nextSound.id,
        recipeRole,
        currentModelLayer.volume,
        currentModelLayer.enabled,
        `${nextSound.title} is the selected ${recipeRole} replacement.`,
        currentModelLayer.layerId,
      ),
    });
    if (!editResult.accepted) {
      showTransientNotification(editResult.explanation);
      return;
    }
    try {
      await prepareBuilderReplacementDefinition([nextSound]);
    } catch (preparationError: unknown) {
      showTransientNotification(`Could not prepare ${nextSound.title}. The current playable recipe was kept.`);
      recordPlaybackTimingTrace("BUILDER_EDIT_PREPARATION_FAILED", {
        sound: nextSound,
        command: "builder-edit",
        error: preparationError,
      });
      return;
    }
    if (activeBuilderModelRef.current?.editId !== model.editId) {
      recordPlaybackTimingTrace("BUILDER_EDIT_STALE_PREPARATION_IGNORED", {
        sound: nextSound,
        command: "builder-edit",
      });
      return;
    }
    publishBuilderModel(editResult.model);
    recordPendingBuilderEdit(editResult.model);
    setBuilderLayerSwaps((current) => ({ ...current, [layerKey]: nextSound.id }));
    showTransientNotification(editResult.explanation);
  };

  const handleLayeredPreviewPlay = async (
    presetOverride?: MobileBuilderPreset,
    builderModelOverride?: BuilderSessionModelV1,
    onNativeDefinitionAccepted?: () => boolean,
    isPlaybackIntentCurrent: () => boolean = () => true,
    newSessionPolicy?: Readonly<{
      loopEnabled: boolean;
      timerMinutes: SessionTimerOptionMinutes;
    }>,
  ): Promise<boolean> => {
    if (sessionStopInProgressRef.current || !isPlaybackIntentCurrent()) {
      return false;
    }
    setSessionStopPhase("idle");
    const previewPreset = presetOverride ?? selectedPreset;
    if (!previewPreset?.layeredPreview) {
      return false;
    }
    if (layeredReplacementInFlightRef.current?.presetId === previewPreset.id) {
      recordPlaybackTimingTrace("DUPLICATE_REPLACEMENT_BLOCKED source=layered", {
        command: "session-replacement",
      });
      return false;
    }

    const preview = previewPreset.layeredPreview;
    let builderPlaybackDescriptor: ReturnType<typeof createBuilderPlaybackDescriptor> | null = null;
    const activeModelForPlayback = builderModelOverride ?? activeBuilderModelRef.current;
    if (!presetOverride && !activeModelForPlayback) {
      setLayeredPreviewError("This recipe has no accepted Builder definition. No playback session was created.");
      updateLayeredPreviewStatus("error");
      return false;
    }
    const shouldUseBuilderDescriptor = Boolean(
      activeModelForPlayback && (builderModelOverride || !presetOverride || presetOverride.id === selectedPreset?.id),
    );
    if (shouldUseBuilderDescriptor && activeModelForPlayback) {
      try {
        builderPlaybackDescriptor = createBuilderPlaybackDescriptor(
          activeModelForPlayback,
          sessionReplacementGenerationRef.current + 1,
          layeredPreviewOperationIdRef.current + 1,
        );
      } catch (builderPlaybackError: unknown) {
        setLayeredPreviewError(formatError(builderPlaybackError));
        updateLayeredPreviewStatus("error");
        return false;
      }
    }

    if (!onNativeDefinitionAccepted) {
      setCurrentSession({
        type: "recipe",
        title: previewPreset.title,
        source: currentSession?.type === "recipe"
          ? currentSession.source
          : presetOverride
            ? "Fast Start"
            : "Presets/Builder",
        recipeId: previewPreset.id,
        startingSoundId: previewPreset.startingSoundId,
        updatedAt: Date.now(),
      });
      dispatchPlaybackTransport("load");
    }
    const activePreviewLayers = builderPlaybackDescriptor
      ? builderPlaybackDescriptor.layers.map((layer) => ({
          builderLayerId: layer.layerId,
          role: roleToBuilderRole(layer.role),
          soundId: layer.soundId,
          label: layer.title,
          volume: layer.volume,
          balanceLabel: layer.volume <= 0.14 ? "Quiet" : layer.volume >= 0.3 ? "Present" : "Balanced",
        }))
      : getActiveLayeredPreviewLayers(
          previewPreset,
          preview,
          builderEnabledLayerKeys,
          builderLayerBalances,
          builderLayerSwaps,
        );
    const previewSoundRows = getLayeredPreviewSounds(activePreviewLayers);
    const missingLayer = previewSoundRows.find((previewSoundRow) => !previewSoundRow.catalogSound);
    if (missingLayer) {
      setLayeredPreviewError(`${missingLayer.layer.label} is missing from the mobile sound list.`);
      updateLayeredPreviewStatus("error");
      return false;
    }

    if (
      previewSoundRows.some(
        (previewSoundRow) =>
          previewSoundRow.catalogSound && matchesAnyIntent(previewSoundRow.catalogSound, activeAvoidedIntents),
      )
    ) {
      showAvoidanceBlockedMessage(previewPreset.title);
      return false;
    }

    setLayeredPreviewError(null);
    const retainedPlayableDefinition = retainedLayeredRestartBlueprintRef.current?.playableDefinition;
    const retainedDefinitionMatchesDisplayedRecipe = !activeModelForPlayback ||
      retainedPlayableDefinition?.editId === activeBuilderModelRef.current?.editId;
    if (
      layeredSoundsRef.current.length &&
      layeredPreviewPresetId === previewPreset.id &&
      retainedDefinitionMatchesDisplayedRecipe
    ) {
      return await performLayeredPreviewResume(isPlaybackIntentCurrent);
    }

    sessionReplacementGenerationRef.current += 1;
    const replacementGeneration = sessionReplacementGenerationRef.current;
    sessionStopOperationIdRef.current += 1;
    sessionStopInProgressRef.current = false;
    recordPlaybackTimingTrace(
      `SESSION_REPLACEMENT_PRESS source=${presetOverride ? "Fast" : "curated/other"} oldSessionType=${currentSession?.type ?? "idle"} newSessionType=recipe generation=${replacementGeneration}`,
      { command: "session-replacement" },
    );
    const previousLayeredSounds = [...layeredSoundsRef.current];
    const previousBlueprint = retainedLayeredRestartBlueprintRef.current;
    const previousLayeredStatus = layeredPreviewStatusRef.current;
    const previousUnavailableSoundIds = [...layeredUnavailableSoundIds];
    const previousLayeredError = layeredPreviewError;
    const operationId = beginLayeredPreviewOperation();
    const isInitialPlayCurrent = () =>
      isPlaybackIntentCurrent() && isCurrentLayeredPreviewOperation(operationId);
    layeredReplacementInFlightRef.current = { presetId: previewPreset.id, operationId };
    const loadedLayeredSounds: ManagedAudioResource[] = [];
    let nativeDefinitionAccepted = false;

    try {
      if (!isInitialPlayCurrent()) {
        return false;
      }

      previewSoundRows.forEach((previewSoundRow, layerIndex) => {
        if (!previewSoundRow.catalogSound) {
          throw new Error(`${previewSoundRow.layer.label} is missing from the mobile sound list.`);
        }
        recordPlaybackTimingTrace(
          `NEW_LAYER_LOAD_START generation=${replacementGeneration} layerIndex=${layerIndex} role=${previewSoundRow.layer.role}`,
          { sound: previewSoundRow.catalogSound, command: "session-replacement" },
        );
      });

      const preparedSources = await prepareBuilderReplacementDefinition(
        previewSoundRows.map((row) => {
          if (!row.catalogSound) throw new Error(`${row.layer.label} is missing from the mobile sound list.`);
          return row.catalogSound;
        }),
      );
      if (!isInitialPlayCurrent()) {
        throw new Error("Layered preview operation superseded");
      }
      const unavailableSoundIds = preparedSources.unavailable.map(({ sound }) => sound.id);
      const unavailableLayerNames = preparedSources.unavailable.map(({ sound }) => sound.title);
      setLayeredUnavailableSoundIds(Object.freeze(unavailableSoundIds));
      const partialOfflineMessage = formatUnavailableOfflineLayersV1(unavailableLayerNames);
      const playablePreviewSoundRows = previewSoundRows
        .map((row, originalLayerIndex) => ({ ...row, originalLayerIndex }))
        .filter((row): row is typeof row & { catalogSound: MobileCatalogSound } =>
          Boolean(row.catalogSound && preparedSources.sourceUris.has(row.catalogSound.id)));

      const aggregateSessionId = builderPlaybackDescriptor?.nativeSessionId ?? `${previewPreset.id}:${replacementGeneration}`;
      const aggregateOptions: RetainedLayeredRestartBlueprint["options"] = {
        sessionType: "layered",
        title: previewPreset.title,
        recipeId: builderPlaybackDescriptor?.recipeId ?? previewPreset.id,
        loopEnabled: newSessionPolicy?.loopEnabled ?? isLoopEnabledRef.current,
        durationMillis: Math.max(
          ...playablePreviewSoundRows.map((row) => secondsToMillis(row.catalogSound.durationSeconds)),
        ),
        layers: playablePreviewSoundRows.map((previewSoundRow) => {
          const catalogSound = previewSoundRow.catalogSound;
          const layerIndex = previewSoundRow.originalLayerIndex;
          return {
            layerId: builderPlaybackDescriptor?.layers[layerIndex]?.layerId
              ? `${builderPlaybackDescriptor.recipeId}:${builderPlaybackDescriptor.layers[layerIndex].layerId}`
              : `${previewPreset.id}:${layerIndex}`,
            soundId: catalogSound.id,
            sourceUri: preparedSources.sourceUris.get(catalogSound.id)!,
            required: true,
            enabled: true,
            volume: getLayerPlaybackVolume(previewSoundRow.layer.volume, catalogSound),
            loopEligible: catalogSound.loopEligible,
          };
        }),
      };
      const aggregateCreated = await audioService.defineAggregateSession({
        sessionId: aggregateSessionId,
        generation: replacementGeneration,
        operationId,
        ...aggregateOptions,
      });
      const aggregateResources = aggregateCreated.resources;

      aggregateResources.forEach((resource, layerIndex) => {
        const previewSoundRow = playablePreviewSoundRows[layerIndex];
        loadedLayeredSounds.push(resource);
        recordPlaybackTimingTrace(
          `NEW_LAYER_LOAD_RESOLVED generation=${replacementGeneration} layerIndex=${layerIndex} role=${previewSoundRow.layer.role}`,
          { sound: previewSoundRow.catalogSound ?? undefined, command: "session-replacement" },
        );
      });
      if (!isInitialPlayCurrent()) {
        throw new Error("Layered preview operation superseded");
      }
      const primaryResource = aggregateResources[0];
      if (!primaryResource) {
        throw new Error("The layered session did not create any playable resources.");
      }
      nativeDefinitionAccepted = true;
      if (onNativeDefinitionAccepted && !onNativeDefinitionAccepted()) {
        throw new Error("Layered preview operation superseded");
      }
      if (!isInitialPlayCurrent()) {
        throw new Error("Layered preview operation superseded");
      }
      if (onNativeDefinitionAccepted) {
        dispatchPlaybackTransport("load");
      }
      const playableDefinition: BuilderPlayableDefinition | null = activeModelForPlayback
        ? {
            editId: activeModelForPlayback.editId,
            recipeId: activeModelForPlayback.recipeId,
            owner: {
              sessionId: primaryResource.ownership.sessionId,
              generation: primaryResource.ownership.generation,
              operationId: primaryResource.ownership.operationId,
            },
            layers: activeModelForPlayback.layers
              .filter((layer) => preparedSources.sourceUris.has(layer.soundId))
              .map((layer) => ({
                layerId: layer.layerId,
                role: layer.role,
                soundId: layer.soundId,
                volume: layer.volume,
                enabled: layer.enabled,
              })),
          }
        : null;
      retainedLayeredRestartBlueprintRef.current = {
        key: aggregateSessionId,
        presetId: previewPreset.id,
        startingSoundId: previewPreset.startingSoundId,
        editId: activeModelForPlayback?.editId ?? null,
        playableDefinition,
        options: aggregateOptions,
      };
      if (activeModelForPlayback && playableDefinition) {
        builderEditOperationIdRef.current = Math.max(
          builderEditOperationIdRef.current,
          playableDefinition.owner.operationId,
        );
        builderAtomicEditCoordinatorRef.current.install(
          createBuilderAtomicEditState(activeModelForPlayback, playableDefinition),
        );
      }
      retainedSingleRestartBlueprintRef.current = null;

      // Native definition atomically replaced the prior aggregate owner. Any old
      // JS cleanup below is fenced by its old session/generation and cannot stop it.
      layeredSoundsRef.current = [...loadedLayeredSounds];
      releaseCurrentSoundForReplacement(replacementGeneration);
      void teardownDetachedLayeredSounds(previousLayeredSounds, replacementGeneration);

      recordPlaybackTimingTrace(
        `NEW_SESSION_PLAY_START generation=${replacementGeneration} layers=${aggregateResources.length}`,
        { command: "session-replacement" },
      );
      const playStatus = await primaryResource.playAsync();
      const truthfulStatus = await waitForTruthfulNativePlaying(
        primaryResource,
        isInitialPlayCurrent,
        playStatus,
      );
      if (classifyRestartPlaybackStatus(truthfulStatus) !== "playing" || !isInitialPlayCurrent()) {
        throw new Error("LAYERED_PLAYBACK_ACTIVATION_UNCONFIRMED");
      }
      recordPlaybackTimingTrace(
        `NEW_SESSION_PLAY_RESOLVED generation=${replacementGeneration} layers=${aggregateResources.length}`,
        { command: "session-replacement" },
      );

      if (!isInitialPlayCurrent()) {
        throw new Error("Layered preview operation superseded");
      }
      const replacementTimerMinutes = newSessionPolicy?.timerMinutes ?? timerOptionMinutes;
      const timerRearmed = await rearmReadyTimerAfterTruthfulPlayback(
        aggregateSessionId,
        isInitialPlayCurrent,
        replacementTimerMinutes,
        newSessionPolicy ? false : timerIsRunning,
      );
      if (!timerRearmed && replacementTimerMinutes > 0 && isInitialPlayCurrent()) {
        throw new Error("Layered playback started, but the Timer could not be armed.");
      }

      const loadedLayerResults = aggregateResources.map((resource, layerIndex) => ({ layerIndex, sound: resource }));
      if (!isInitialPlayCurrent()) {
        throw new Error("Layered preview operation superseded");
      }

      layeredSoundsRef.current = loadedLayerResults
        .sort((a, b) => a.layerIndex - b.layerIndex)
        .map((loadedLayer) => loadedLayer.sound);
      setLayeredPreviewPresetId(previewPreset.id);
      updateLayeredPreviewStatus("playing");
      setLayeredPreviewError(partialOfflineMessage);
      if (builderPlaybackDescriptor && activeBuilderModelRef.current) {
        publishBuilderModel(transitionBuilderSession(activeBuilderModelRef.current, "playing"));
      }
      recordPlaybackTimingTrace(
        `SESSION_REPLACEMENT_READY source=${presetOverride ? "Fast" : "curated/other"} generation=${replacementGeneration}`,
        { command: "session-replacement" },
      );
      return true;
    } catch (layeredError: unknown) {
      const operationWasSuperseded = layeredError instanceof Error && layeredError.message === "Layered preview operation superseded";
      await Promise.all(
        loadedLayeredSounds.map(async (layeredSound) => {
          try {
            await layeredSound.stopAsync();
          } catch {
            // Best effort stop before cleanup when any layered source fails.
          }
          try {
            await layeredSound.unloadAsync();
          } catch {
            // Best effort cleanup when any layered source fails.
          }
        }),
      );
      if (isInitialPlayCurrent()) {
        if (!nativeDefinitionAccepted && previousLayeredSounds.length && previousBlueprint) {
          layeredSoundsRef.current = previousLayeredSounds;
          retainedLayeredRestartBlueprintRef.current = previousBlueprint;
          setLayeredPreviewPresetId(previousBlueprint.presetId);
          setLayeredUnavailableSoundIds(Object.freeze(previousUnavailableSoundIds));
          updateLayeredPreviewStatus(previousLayeredStatus);
          setLayeredPreviewError(previousLayeredError);
          showTransientNotification("The replacement could not be prepared. The previous playable recipe was kept.");
        } else if (nativeDefinitionAccepted) {
          // Once native accepts a definition, the former owner is no longer
          // restorable. Keep the exact new blueprint/selection and fail closed
          // with released resources so the next Play recreates that definition.
          layeredSoundsRef.current = [];
          setLayeredPreviewPresetId(previewPreset.id);
          if (operationWasSuperseded) {
            updateLayeredPreviewStatus("stopped");
          } else {
            setLayeredPreviewError(userFacingPlaybackErrorV1(layeredError, "layered"));
            updateLayeredPreviewStatus("error");
          }
        } else {
          layeredSoundsRef.current = [];
          setLayeredUnavailableSoundIds(Object.freeze([]));
          setLayeredPreviewPresetId(null);
          if (operationWasSuperseded) {
            updateLayeredPreviewStatus("stopped");
          } else {
            setLayeredPreviewError(userFacingPlaybackErrorV1(layeredError, "layered"));
            updateLayeredPreviewStatus("error");
          }
        }
      }
      return false;
    } finally {
      if (layeredReplacementInFlightRef.current?.operationId === operationId) {
        layeredReplacementInFlightRef.current = null;
      }
    }
  };

  const handleLayeredPreviewPause = async () => {
    if (sessionStopInProgressRef.current) {
      return;
    }
    sessionClearOperationIdRef.current += 1;
    layeredPresetPreviewCoordinatorRef.current.invalidate();
    sessionRestartCoordinatorRef.current.invalidate();
    presetSelectionOperationIdRef.current += 1;
    pendingLayeredPresetIdRef.current = null;
    setPendingLayeredPresetId(null);
    const operationId = beginLayeredPreviewOperation();
    dispatchPlaybackTransport("pause");
    if (!layeredSoundsRef.current.length) {
      updateLayeredPreviewStatus("stopped");
      return;
    }

    if (!layeredUnavailableSoundIds.length) setLayeredPreviewError(null);
    try {
      await pauseAllLayeredSounds();
      if (isCurrentLayeredPreviewOperation(operationId)) {
        updateLayeredPreviewStatus("paused");
      }
    } catch (pauseError: unknown) {
      if (isCurrentLayeredPreviewOperation(operationId)) {
        const cleanupCurrent = await stopOrUnloadLayeredPreview(
          "error",
          () => isCurrentLayeredPreviewOperation(operationId),
        );
        if (cleanupCurrent && isCurrentLayeredPreviewOperation(operationId)) {
          setLayeredPreviewError(formatError(pauseError));
        }
      }
    }
  };

  const recreateLayeredSessionAfterTimerExpiry = async (
    blueprint: RetainedLayeredRestartBlueprint,
    restartToken: number,
    operationId: number,
    isPlaybackIntentCurrent: () => boolean = () => true,
  ) => {
    const isRestartCurrent = () =>
      isPlaybackIntentCurrent() &&
      sessionRestartCoordinatorRef.current.isCurrent(restartToken) &&
      isCurrentLayeredPreviewOperation(operationId) &&
      currentSessionRef.current?.type === "recipe" &&
      currentSessionRef.current.recipeId === blueprint.presetId;
    if (!isRestartCurrent()) {
      return null;
    }

    const staleResources = [...layeredSoundsRef.current];
    layeredSoundsRef.current = [];
    setLayeredPreviewPresetId(null);
    updateLayeredPreviewStatus("loading");
    sessionReplacementGenerationRef.current += 1;
    const replacementGeneration = sessionReplacementGenerationRef.current;
    const aggregateSessionId = `${blueprint.presetId}:timer-restart:${replacementGeneration}`;
    const restartSounds = blueprint.options.layers.map((layer) => {
      const catalogSound = soundById.get(layer.soundId);
      if (!catalogSound) throw new Error(`${layer.soundId} is missing from the current catalog.`);
      return catalogSound;
    });
    const refreshedSources = await prepareBuilderReplacementDefinition(restartSounds);
    if (!isRestartCurrent()) return null;
    const refreshedLayers = blueprint.options.layers
      .filter((layer) => refreshedSources.sourceUris.has(layer.soundId))
      .map((layer) => ({ ...layer, sourceUri: refreshedSources.sourceUris.get(layer.soundId)! }));
    const refreshedOptions = { ...blueprint.options, layers: refreshedLayers };
    const unavailableSoundIds = refreshedSources.unavailable.map(({ sound }) => sound.id);
    setLayeredUnavailableSoundIds(Object.freeze(unavailableSoundIds));
    setLayeredPreviewError(formatUnavailableOfflineLayersV1(
      refreshedSources.unavailable.map(({ sound }) => sound.title),
    ));
    const aggregateCreated = await audioService.defineAggregateSession({
      sessionId: aggregateSessionId,
      generation: replacementGeneration,
      operationId,
      ...refreshedOptions,
    });
    const aggregateResources = aggregateCreated.resources;
    const primaryResource = aggregateResources[0];
    if (!primaryResource || !isRestartCurrent()) {
      await Promise.all(aggregateResources.map((resource) => resource.unloadAsync().catch(() => undefined)));
      return null;
    }

    layeredSoundsRef.current = aggregateResources;
    setLayeredPreviewPresetId(blueprint.presetId);
    retainedLayeredRestartBlueprintRef.current = {
      ...blueprint,
      key: aggregateSessionId,
      options: refreshedOptions,
      playableDefinition: blueprint.playableDefinition
        ? {
            ...blueprint.playableDefinition,
            layers: blueprint.playableDefinition.layers.filter((layer) =>
              refreshedSources.sourceUris.has(layer.soundId)),
            owner: {
              sessionId: primaryResource.ownership.sessionId,
              generation: primaryResource.ownership.generation,
              operationId: primaryResource.ownership.operationId,
            },
          }
        : null,
    };
    releaseCurrentSoundForReplacement(replacementGeneration);
    void Promise.all(staleResources.map((resource) => resource.unloadAsync().catch(() => undefined)));
    return { aggregateResources, aggregateSessionId, primaryResource };
  };

  const performLayeredPreviewResume = async (
    isPlaybackIntentCurrent: () => boolean = () => true,
  ): Promise<boolean> => {
    if (sessionStopInProgressRef.current || !isPlaybackIntentCurrent()) {
      return false;
    }
    setSessionStopPhase("idle");
    dispatchPlaybackTransport("load");
    if (!layeredUnavailableSoundIds.length) setLayeredPreviewError(null);
    updateLayeredPreviewStatus("loading");

    const retainedResources = [...layeredSoundsRef.current];
    const retainedPrimaryResource = retainedResources[0];
    const livenessStatus = retainedPrimaryResource
      ? await retainedPrimaryResource.getStatusAsync()
      : null;
    if (!isPlaybackIntentCurrent()) {
      return false;
    }
    const livenessTruth = livenessStatus
      ? classifyRestartPlaybackStatus(livenessStatus)
      : null;
    const blueprint = retainedLayeredRestartBlueprintRef.current;
    const playableDefinition = blueprint?.playableDefinition;
    const displayedDefinitionCurrent = !activeBuilderModelRef.current ||
      playableDefinition?.editId === activeBuilderModelRef.current?.editId;
    if (!displayedDefinitionCurrent && selectedPreset?.layeredPreview) {
      return await handleLayeredPreviewPlay(undefined, undefined, undefined, isPlaybackIntentCurrent);
    }
    const selectedDefinitionAvailable = Boolean(selectedPreset?.layeredPreview);
    const entryMode = classifyLayeredPlaybackEntry({
      currentRecipeId: currentSessionRef.current?.type === "recipe"
        ? currentSessionRef.current.recipeId
        : null,
      selectedPresetId: selectedPreset?.id ?? null,
      selectedDefinitionAvailable,
      managedResourcePresent: Boolean(retainedPrimaryResource),
      managedResourceTruth: livenessTruth,
      restartBlueprintPresetId: blueprint?.presetId ?? null,
    });

    if (entryMode === "create-initial" && selectedPreset?.layeredPreview) {
      return await sessionRestartCoordinatorRef.current.run(
        `layered-initial:${selectedPreset.id}`,
        async (startToken) => {
          const isInitialStartCurrent = () =>
            isPlaybackIntentCurrent() &&
            sessionRestartCoordinatorRef.current.isCurrent(startToken) &&
            currentSessionRef.current?.type === "recipe" &&
            currentSessionRef.current.recipeId === selectedPreset.id;
          if (!isInitialStartCurrent()) {
            return false;
          }
          const started = await handleLayeredPreviewPlay(
            selectedPreset,
            undefined,
            undefined,
            isPlaybackIntentCurrent,
          );
          return started && isInitialStartCurrent();
        },
      );
    }

    if (entryMode === "resume-existing" && retainedPrimaryResource) {
      const resumeKey = blueprint?.key ?? retainedPrimaryResource.ownership.sessionId;
      const expectedPresetId = blueprint?.presetId ?? selectedPreset?.id ?? null;
      return await sessionRestartCoordinatorRef.current.run(resumeKey, async (resumeToken) => {
        const operationId = beginLayeredPreviewOperation();
        const isResumeOperationCurrent = () =>
          isPlaybackIntentCurrent() &&
          sessionRestartCoordinatorRef.current.isCurrent(resumeToken) &&
          isCurrentLayeredPreviewOperation(operationId) &&
          (expectedPresetId === null || (
            currentSessionRef.current?.type === "recipe" &&
            currentSessionRef.current.recipeId === expectedPresetId
          ));
        const isResumeCurrent = () =>
          isResumeOperationCurrent() && layeredSoundsRef.current[0] === retainedPrimaryResource;
        try {
          const playStatus = await retainedPrimaryResource.playAsync();
          const truthfulStatus = await waitForTruthfulNativePlaying(
            retainedPrimaryResource,
            isResumeCurrent,
            playStatus,
          );
          if (classifyRestartPlaybackStatus(truthfulStatus) !== "playing" || !isResumeCurrent()) {
            throw new Error("LAYERED_PLAYBACK_ACTIVATION_UNCONFIRMED");
          }
          const timerRearmed = await rearmReadyTimerAfterTruthfulPlayback(
            retainedPrimaryResource.ownership.sessionId,
            isResumeCurrent,
          );
          if (!timerRearmed && timerOptionMinutes > 0 && isResumeCurrent()) {
            throw new Error("Layered playback started, but the Timer could not be armed.");
          }
          updateLayeredPreviewStatus("playing");
          return true;
        } catch (resumeError: unknown) {
          if (isResumeOperationCurrent()) {
            const cleanupCurrent = await stopOrUnloadLayeredPreview("error", isResumeOperationCurrent);
            if (cleanupCurrent && isResumeOperationCurrent()) {
              clearTimerCountdownOnly();
              setLayeredPreviewError(userFacingPlaybackErrorV1(resumeError, "layered"));
            }
          }
          return false;
        }
      });
    }

    if (entryMode === "unavailable" || !selectedDefinitionAvailable) {
      updateLayeredPreviewStatus("error");
      setLayeredPreviewError("The selected layered session definition is unavailable. Select the session again.");
      return false;
    }

    if (entryMode === "recreate-released" && blueprint) {

      return await sessionRestartCoordinatorRef.current.run(blueprint.key, async (restartToken) => {
        const operationId = beginLayeredPreviewOperation();
        const isRestartCurrent = () =>
          isPlaybackIntentCurrent() &&
          sessionRestartCoordinatorRef.current.isCurrent(restartToken) &&
          isCurrentLayeredPreviewOperation(operationId) &&
          currentSessionRef.current?.type === "recipe" &&
          currentSessionRef.current.recipeId === blueprint.presetId;
        try {
          const recreated = await recreateLayeredSessionAfterTimerExpiry(
            blueprint,
            restartToken,
            operationId,
            isPlaybackIntentCurrent,
          );
          if (!recreated || !isRestartCurrent()) {
            return false;
          }
          const playStatus = await recreated.primaryResource.playAsync();
          const truthfulStatus = await waitForTruthfulNativePlaying(
            recreated.primaryResource,
            isRestartCurrent,
            playStatus,
          );
          if (classifyRestartPlaybackStatus(truthfulStatus) !== "playing" || !isRestartCurrent()) {
            throw new Error("LAYERED_PLAYBACK_ACTIVATION_UNCONFIRMED");
          }
          const timerRearmed = await rearmReadyTimerAfterTruthfulPlayback(
            recreated.aggregateSessionId,
            isRestartCurrent,
          );
          if (!timerRearmed && timerOptionMinutes > 0 && isRestartCurrent()) {
            throw new Error("Layered playback restarted, but the Timer could not be rearmed.");
          }
          updateLayeredPreviewStatus("playing");
          return true;
        } catch (resumeError: unknown) {
          if (isRestartCurrent()) {
            const cleanupCurrent = await stopOrUnloadLayeredPreview("error", isRestartCurrent);
            if (cleanupCurrent && isRestartCurrent()) {
              clearTimerCountdownOnly();
              setLayeredPreviewError(userFacingPlaybackErrorV1(resumeError, "layered"));
            }
          }
          return false;
        }
      });
    }

    updateLayeredPreviewStatus("error");
    setLayeredPreviewError("The selected layered session definition is unavailable. Select the session again.");
    return false;
  };

  const handleLayeredPreviewResume = async (): Promise<boolean> => {
    const presetId = pendingLayeredPresetIdRef.current
      ?? selectedPreset?.id
      ?? (currentSessionRef.current?.type === "recipe" ? currentSessionRef.current.recipeId : null);
    if (!presetId) return false;
    sessionClearOperationIdRef.current += 1;
    return await runLayeredPresetPreview(layeredPresetPreviewCoordinatorRef.current, {
      presetId,
      run: async (_token, isCurrent) => pendingLayeredPresetIdRef.current
        ? false
        : performLayeredPreviewResume(isCurrent),
      isAccepted: (result) => result === true,
    });
  };

  const handleLayeredPreviewReplay = async () => {
    if (sessionStopInProgressRef.current) {
      return;
    }
    setSessionStopPhase("idle");
    if (!selectedPreset?.layeredPreview) {
      return;
    }

    sessionClearOperationIdRef.current += 1;
    layeredPresetPreviewCoordinatorRef.current.invalidate();
    sessionRestartCoordinatorRef.current.invalidate();
    presetSelectionOperationIdRef.current += 1;
    pendingLayeredPresetIdRef.current = null;
    setPendingLayeredPresetId(null);
    const operationId = beginLayeredPreviewOperation();
    dispatchPlaybackTransport("replay");
    setLayeredPreviewError(null);
    updateLayeredPreviewStatus("loading");
    try {
      await stopOrUnloadLayeredPreview("loading", () => isCurrentLayeredPreviewOperation(operationId));
      if (!isCurrentLayeredPreviewOperation(operationId)) {
        return;
      }
      await handleLayeredPreviewPlay();
    } catch (replayError: unknown) {
      if (isCurrentLayeredPreviewOperation(operationId)) {
        const cleanupCurrent = await stopOrUnloadLayeredPreview(
          "error",
          () => isCurrentLayeredPreviewOperation(operationId),
        );
        if (cleanupCurrent && isCurrentLayeredPreviewOperation(operationId)) {
          setLayeredPreviewError(userFacingPlaybackErrorV1(replayError, "layered"));
        }
      }
    }
  };

  const handleStopSession = async () => {
    recordPlaybackTimingTrace("TRANSPORT_HANDLER_ENTRY command=Stop", {
      sound: selectedSoundRef.current,
      command: "stop",
    });
    if (sessionStopInProgressRef.current) {
      return;
    }

    sessionClearOperationIdRef.current += 1;
    sessionRestartCoordinatorRef.current.invalidate();
    layeredPresetPreviewCoordinatorRef.current.invalidate();
    singlePreviewStartCoordinatorRef.current.invalidate();
    presetSelectionOperationIdRef.current += 1;
    pendingLayeredPresetIdRef.current = null;
    setPendingLayeredPresetId(null);
    sessionStopInProgressRef.current = true;
    dispatchPlaybackStop();
    sessionStopOperationIdRef.current += 1;
    const stopOperationId = sessionStopOperationIdRef.current;
    recordPlaybackTimingTrace("OLD_SESSION_TEARDOWN_START transitionMode=explicit-stop durationMillis=5000", {
      sound: selectedSoundRef.current,
      command: "stop",
    });
    setSessionStopPhase("stopping");
    AccessibilityInfo.announceForAccessibility("Stopping playback");
    setError(null);
    setLayeredPreviewError(null);
    setLayeredUnavailableSoundIds(Object.freeze([]));
    clearSessionTimer();
    try {
      await Promise.all([
        fadeOutStopAndReleaseCurrentSound(),
        fadeOutStopAndReleaseLayeredPreview(),
      ]);
    } finally {
      recordPlaybackTimingTrace("OLD_SESSION_TEARDOWN_END transitionMode=explicit-stop", {
        sound: selectedSoundRef.current,
        command: "stop",
      });
      if (sessionStopOperationIdRef.current === stopOperationId) {
        setSessionStopPhase("stopped");
        sessionStopInProgressRef.current = false;
      }
    }
  };

  const handleClearCurrentSessionFromSettings = async (): Promise<boolean> => {
    sessionClearOperationIdRef.current += 1;
    const clearOperationId = sessionClearOperationIdRef.current;
    sessionRestartCoordinatorRef.current.invalidate();
    layeredPresetPreviewCoordinatorRef.current.invalidate();
    singlePreviewStartCoordinatorRef.current.invalidate();
    beginSinglePlaybackOperation();
    const layeredClearOperationId = beginLayeredPreviewOperation();
    const isClearCurrent = () =>
      sessionClearOperationIdRef.current === clearOperationId &&
      isCurrentLayeredPreviewOperation(layeredClearOperationId);
    presetSelectionOperationIdRef.current += 1;
    pendingLayeredPresetIdRef.current = null;
    setPendingLayeredPresetId(null);
    retainedSingleRestartBlueprintRef.current = null;
    retainedLayeredRestartBlueprintRef.current = null;
    setSettingsOpen(false);
    setPendingLocalClearAction(null);
    setError(null);
    setLayeredPreviewError(null);
    setLayeredUnavailableSoundIds(Object.freeze([]));
    clearSessionTimer();
    const soundToClear = soundRef.current;
    await Promise.all([
      unloadCurrentSound(soundToClear),
      stopOrUnloadLayeredPreview("idle", isClearCurrent),
    ]);
    if (!isClearCurrent()) {
      return false;
    }
    setCurrentSession(null);
    setSessionStopPhase("idle");
    setSelectedPreset(null);
    setIsLoopEnabled(false);
    isLoopEnabledRef.current = false;
    resetProgressForSelection(selectedSoundRef.current);
    setActiveSection("player");
    return true;
  };

  const handleReplayOnboardingFromSettings = async () => {
    const cleared = await handleClearCurrentSessionFromSettings();
    if (!cleared) {
      return;
    }
    await appPersistence.clearOnboardingComplete().catch(() => undefined);
    setOnboardingStepIndex(0);
    setSelectedOnboardingIntentKey("fan");
    setSelectedOnboardingAvoidanceKeys([]);
    setShowOnboarding(true);
    setOnboardingStorageReady(true);
  };

  const handleClearSavedSoundsFromSettings = () => {
    if (pendingLocalClearAction !== "saved") {
      setPendingLocalClearAction("saved");
      return;
    }
    setSavedSoundIds([]);
    setPendingLocalClearAction(null);
  };

  const handleClearRecentSoundsFromSettings = () => {
    if (pendingLocalClearAction !== "recent") {
      setPendingLocalClearAction("recent");
      return;
    }
    setRecentSoundIds([]);
    setPendingLocalClearAction(null);
  };

  const publishOfflineManagerState = () => {
    const next = [...offlineManagerRef.current.enumerate()];
    offlineManifestItemsRef.current = next;
    setOfflineManifestItems(next);
  };

  async function preparePreferredPlaybackUri(catalogSound: MobileCatalogSound): Promise<string> {
    const descriptor = getM7OfflineAssetDescriptor(catalogSound.id);
    recordPlaybackTimingTrace("CLASSIC_SOURCE_RESOLUTION_ENTER", {
      sound: catalogSound,
      command: "classic-source-resolution",
    });
    const resolution = await resolveClassicPlaybackSourceV1({
      sound: catalogSound,
      offlineDescriptorPresent: Boolean(descriptor),
      resolveVerifiedLocal: async () => {
        if (!descriptor) return { state: "not-downloaded" } as const;
        const localResolution = await offlineManagerRef.current.resolveVerifiedLocal({
          assetId: descriptor.assetId,
          remoteUri: descriptor.remoteUri,
          catalogRevision: descriptor.catalogRevision,
          sourceRevision: descriptor.sourceRevision,
          expectedBytes: descriptor.expectedBytes,
          checksumSha256: descriptor.checksumSha256,
          mediaType: descriptor.mediaType,
          fileExtension: descriptor.fileExtension,
        }, new Date().toISOString());
        publishOfflineManagerState();
        return localResolution;
      },
      getPreparedCacheUri: () => getPreparedColdStartUri(catalogSound.id),
      onStage: (stage) => recordPlaybackTimingTrace(
        `CLASSIC_SOURCE_RESOLUTION_STAGE stage=${stage}`,
        { sound: catalogSound, command: "classic-source-resolution" },
      ),
    });
    if (resolution.state === "blocked") {
      throw new OfflinePlaybackPreparationErrorV1(
        "OFFLINE_COPY_UNUSABLE",
        appPlaybackCopyV1.offlineCopyUnusable,
        `${catalogSound.id}: ${resolution.reason}`,
      );
    }
    recordPlaybackTimingTrace(
      `CLASSIC_PLAYER_PREPARATION_URI_READY authority=${resolution.authority}`,
      { sound: catalogSound, command: "classic-source-resolution" },
    );
    return resolution.uri;
  }

  const activeOfflineAssetIds = () => {
    if (!isPlaying) return new Set<string>();
    const activeBuilderLayerIds = activeBuilderModelRef.current?.layers
      .filter((layer) => layer.enabled)
      .map((layer) => layer.soundId) ?? [];
    return new Set([
      selectedSoundRef.current.id,
      ...activeBuilderLayerIds,
      ...(!activeBuilderLayerIds.length ? (selectedPreset?.layeredPreview?.layers.map((layer) => layer.soundId) ?? []) : []),
    ]);
  };

  const handleDownloadSoundOffline = async (catalogSound: MobileCatalogSound) => {
    const resolution = resolvePersistentDownloadRightsV1(catalogSound.id, catalogSound.audioUrl);
    const descriptor = resolution.eligible ? getM7OfflineAssetDescriptor(catalogSound.id) : null;
    if (!descriptor || !resolution.eligible) {
      setOfflineActionStatus(resolution.customerCopy);
      AccessibilityInfo.announceForAccessibility(resolution.customerCopy);
      return;
    }
    setOfflineActionStatus(`${offlineConsumerStatusLabels.downloading} ${catalogSound.title}…`);
    AccessibilityInfo.announceForAccessibility(`Downloading ${catalogSound.title}`);
    const pending = offlineManagerRef.current.download({
      ...descriptor,
      attributionRequired: descriptor.rights.attributionRequired,
      now: new Date().toISOString(),
    }, activeOfflineAssetIds());
    await Promise.resolve();
    publishOfflineManagerState();
    const result = await pending;
    publishOfflineManagerState();
    if (result.state === "available") {
      const message = `${offlineConsumerStatusLabels.downloaded}: ${catalogSound.title} is ready offline.`;
      setOfflineActionStatus(message);
      AccessibilityInfo.announceForAccessibility(message);
      return;
    }
    if (result.state === "revoked") {
      const message = "This sound isn't available.";
      setOfflineActionStatus(null);
      AccessibilityInfo.announceForAccessibility(message);
      return;
    }
    const message = result.lastErrorCustomerCopy ?? OFFLINE_DOWNLOAD_CUSTOMER_COPY_V1.unknown;
    // The manifest-owned card message is the sole visual failure projection.
    setOfflineActionStatus(null);
    AccessibilityInfo.announceForAccessibility(message);
  };

  const handleDownloadSelectedOffline = async () => handleDownloadSoundOffline(selectedSoundRef.current);

  const buildLayerOfflineOperationOwner = (
    layerId: string,
    catalogSound: MobileCatalogSound,
  ): LayerOfflineOperationOwnerV1 => Object.freeze({
    sessionId: currentSessionRef.current?.type === "recipe"
      ? currentSessionRef.current.recipeId
      : "no-layered-session",
    generation: sessionReplacementGenerationRef.current,
    editId: activeBuilderModelRef.current?.editId
      ?? `curated:${currentSessionRef.current?.type === "recipe" ? currentSessionRef.current.recipeId : "none"}`,
    layerId,
    catalogId: catalogSound.id,
    mediaUri: catalogSound.audioUrl,
  });

  const handleDownloadLayerOffline = async (layerId: string, catalogSound: MobileCatalogSound) => {
    const owner = buildLayerOfflineOperationOwner(layerId, catalogSound);
    const token = layerOfflineOperationCoordinatorRef.current.begin(owner);
    const resolution = resolvePersistentDownloadRightsV1(catalogSound.id, catalogSound.audioUrl);
    const descriptor = resolution.eligible ? getM7OfflineAssetDescriptor(catalogSound.id) : null;
    if (!descriptor || !resolution.eligible) {
      if (layerOfflineOperationCoordinatorRef.current.isCurrent(token, buildLayerOfflineOperationOwner(layerId, catalogSound))) {
        AccessibilityInfo.announceForAccessibility(
          resolution.state === "rights_unknown"
            ? "Offline download isn't available for this layer."
            : "This layer isn't available.",
        );
      }
      layerOfflineOperationCoordinatorRef.current.finish(token);
      return;
    }
    const pending = offlineManagerRef.current.download({
      ...descriptor,
      attributionRequired: descriptor.rights.attributionRequired,
      now: new Date().toISOString(),
    }, activeOfflineAssetIds());
    const progressTimer: ReturnType<typeof setInterval> | null = token.joined
      ? null
      : setInterval(publishOfflineManagerState, 200);
    try {
      await Promise.resolve();
      publishOfflineManagerState();
      const result = await pending;
      publishOfflineManagerState();
      const stillCurrent = layerOfflineOperationCoordinatorRef.current.isCurrent(
        token,
        buildLayerOfflineOperationOwner(layerId, catalogSound),
      );
      if (stillCurrent) {
        const message = result.state === "available"
          ? `${catalogSound.title} is available offline.`
          : result.state === "revoked"
            ? "This layer isn't available."
            : result.lastErrorCustomerCopy ?? OFFLINE_DOWNLOAD_CUSTOMER_COPY_V1.unknown;
        AccessibilityInfo.announceForAccessibility(message);
      }
    } finally {
      if (progressTimer) clearInterval(progressTimer);
      layerOfflineOperationCoordinatorRef.current.finish(token);
    }
  };

  const handleDeleteLayerOffline = async (layerId: string, catalogSound: MobileCatalogSound) => {
    const owner = buildLayerOfflineOperationOwner(layerId, catalogSound);
    const token = layerOfflineOperationCoordinatorRef.current.begin(owner);
    const result = await offlineManagerRef.current.delete(catalogSound.id, new Date().toISOString(), activeOfflineAssetIds());
    publishOfflineManagerState();
    if (layerOfflineOperationCoordinatorRef.current.isCurrent(token, buildLayerOfflineOperationOwner(layerId, catalogSound))) {
      AccessibilityInfo.announceForAccessibility(
        result?.lastErrorCustomerCopy ?? `${catalogSound.title} was deleted from offline storage.`,
      );
    }
    layerOfflineOperationCoordinatorRef.current.finish(token);
  };

  const handleDeleteSelectedOffline = async () => {
    const title = selectedSoundRef.current.title;
    const result = await offlineManagerRef.current.delete(selectedSoundRef.current.id, new Date().toISOString(), activeOfflineAssetIds());
    publishOfflineManagerState();
    const message = result?.lastError ?? `${title} was deleted from offline storage.`;
    setOfflineActionStatus(message);
    AccessibilityInfo.announceForAccessibility(message);
  };

  const buildCurrentBackupSnapshot = () => ({
    profile: localState?.profile ?? null,
    preferences: preferenceFeedback,
    feedback: optimisticQuickFeedbackByKey,
    savedSessions,
    builderSessions: activeBuilderModel ? [activeBuilderModel] : [],
    savedSoundIds,
    recentSoundIds,
    settings: { defaultTimerMinutes: defaultTimerPreference, startTabKey: startTabPreference },
    currentSession,
    catalogRevision: catalogRepository.revision,
    offlineManifest: offlineManifestItems,
  });

  const handleExportLocalBackup = async () => {
    if (!localState) {
      setBackupImportState((current) => ({ ...current, status: "Local profile is still loading." }));
      return;
    }
    const createdAt = new Date().toISOString();
    const backup = createLocalBackupV1(buildCurrentBackupSnapshot(), {
      createdAt,
      appReleaseIdentity: appIterationInfo.fullInternalLabel,
    });
    const text = serializeLocalBackupV1(backup);
    const file = await writeLocalBackupFileV1(text, createdAt);
    await shareLocalBackupFileV1(file);
    const status = "Local backup exported. Media files are not embedded; eligible sounds must be downloaded again after import.";
    setBackupImportState((current) => ({ ...current, status }));
    AccessibilityInfo.announceForAccessibility(status);
  };

  const handleImportLocalBackup = async () => {
    setBackupImportState((current) => ({ ...current, busy: true, status: "Validating backup before import…" }));
    try {
      const candidate = await pickLocalBackupTextV1();
      if (!candidate) {
        setBackupImportState((current) => ({ ...current, busy: false, status: "Import canceled before any local data changed." }));
        return;
      }
      const validated = validateLocalBackupV1(candidate.text);
      if (!validated.ok) throw new Error(validated.reason);
      const currentSnapshot = buildCurrentBackupSnapshot();
      const next = applyLocalBackupV1(currentSnapshot, validated.backup, backupImportState.mode);
      const nextSettings: LocalSettings = {
        defaultTimerMinutes: sessionTimerOptions.includes(next.settings?.defaultTimerMinutes) ? next.settings.defaultTimerMinutes : 0,
        startTabKey: mobileSectionNavOptions.some((option) => option.key === next.settings?.startTabKey) ? next.settings.startTabKey : "fast-start",
      };
      const nextSavedSoundIds = Array.isArray(next.savedSoundIds) ? next.savedSoundIds.filter((id: unknown): id is string => typeof id === "string") : [];
      const nextRecentSoundIds = Array.isArray(next.recentSoundIds) ? next.recentSoundIds.filter((id: unknown): id is string => typeof id === "string") : [];
      const nextSavedSessions = parseSavedSessions(JSON.stringify({ schemaVersion: 1, sessions: next.savedSessions ?? [] }));
      const nextPreferences = deserializeStoredPreferenceProfile(JSON.stringify(next.preferences ?? {}), validSoundIds);
      const nextManifest = (Array.isArray(next.offlineManifest) ? next.offlineManifest : [])
        .filter((item: any): item is OfflineManifestItemV1 => item?.version === 1 && typeof item.assetId === "string" && typeof item.expectedBytes === "number");
      const now = new Date().toISOString();
      const currentProfile = localState?.profile ?? migrateLocalStateV1({ legacy: {}, seed: validated.backup.profileReference, now }).profile;
      const nextLocalState: LocalStateEnvelopeV1 = Object.freeze({
        schemaVersion: 1,
        profile: Object.freeze({ ...currentProfile, revision: currentProfile.revision + 1, updatedAt: now }),
        data: Object.freeze({
          savedSoundIds: nextSavedSoundIds,
          recentSoundIds: nextRecentSoundIds,
          settings: nextSettings,
          preferencesRaw: JSON.stringify(nextPreferences),
          savedSessionsRaw: JSON.stringify({ schemaVersion: 1, sessions: nextSavedSessions }),
          currentSessionRaw: next.currentSession ? JSON.stringify(next.currentSession) : null,
          catalogRevision: typeof next.catalogRevision === "string" ? next.catalogRevision : catalogRepository.revision,
          offlineManifest: nextManifest,
        }),
        requiresSignIn: false,
        corruptionRecovered: false,
        migrationWarnings: Object.freeze([]),
      });
      await commitImportedLocalSnapshotV1({
        localStateRaw: serializeLocalStateV1(nextLocalState),
        savedSoundIds: nextSavedSoundIds,
        recentSoundIds: nextRecentSoundIds,
        settings: nextSettings,
        preferencesRaw: JSON.stringify(nextPreferences),
        savedSessionsRaw: JSON.stringify({ schemaVersion: 1, sessions: nextSavedSessions }),
        offlineManifestRaw: JSON.stringify(nextManifest),
      });
      setLocalState(nextLocalState);
      setSavedSoundIds(nextSavedSoundIds);
      setRecentSoundIds(nextRecentSoundIds);
      setSavedSessions(nextSavedSessions);
      preferenceFeedbackRef.current = nextPreferences;
      setPreferenceFeedback(nextPreferences);
      setDefaultTimerPreference(nextSettings.defaultTimerMinutes);
      setStartTabPreference(nextSettings.startTabKey);
      offlineManifestItemsRef.current = nextManifest;
      setOfflineManifestItems(nextManifest);
      offlineManagerRef.current = new OfflineDownloadManager({
        filePort: expoOfflineFilePortV1,
        network: expoOfflineNetworkPortV1,
        quotaBytes: offlineQuotaBytes,
        reserveBytes: offlineStorageReserveBytes,
        initialItems: nextManifest,
      });
      const status = `Backup ${backupImportState.mode === "merge" ? "merged with" : "replaced"} this device after complete validation. Offline media bytes were not imported.`;
      setBackupImportState((current) => ({ ...current, busy: false, status }));
      AccessibilityInfo.announceForAccessibility(status);
    } catch (importError: unknown) {
      const status = `Import rejected; current data was not changed. ${formatError(importError)}`;
      setBackupImportState((current) => ({ ...current, busy: false, status }));
      AccessibilityInfo.announceForAccessibility(status);
    }
  };

  const handleResetLocalData = async () => {
    if (localDataResetPhase !== "confirm") {
      setLocalDataResetPhase("confirm");
      return;
    }
    setLocalDataResetPhase("deleting");
    AccessibilityInfo.announceForAccessibility("Resetting local Soundscape data");
    try {
      await handleClearCurrentSessionFromSettings();
      await offlineManagerRef.current.deleteAll(new Date().toISOString(), new Set());
      await resetSupportedLocalDataV1();
      const now = new Date().toISOString();
      const seed = `soundscape-${Date.now().toString(36)}`;
      const fresh = migrateLocalStateV1({ legacy: {}, seed, now });
      await appPersistence.saveLocalProfileSeed(seed);
      await appPersistence.saveLocalStateRaw(serializeLocalStateV1(fresh));
      setLocalState(fresh);
      setSavedSoundIds([]);
      setRecentSoundIds([]);
      setSavedSessions([]);
      preferenceFeedbackRef.current = defaultLocalPreferenceFeedback;
      setPreferenceFeedback(defaultLocalPreferenceFeedback);
      offlineManifestItemsRef.current = [];
      setOfflineManifestItems([]);
      offlineManagerRef.current = new OfflineDownloadManager({
        filePort: expoOfflineFilePortV1,
        network: expoOfflineNetworkPortV1,
        quotaBytes: offlineQuotaBytes,
        reserveBytes: offlineStorageReserveBytes,
      });
      setDefaultTimerPreference(defaultLocalSettings.defaultTimerMinutes);
      setStartTabPreference(defaultLocalSettings.startTabKey);
      setShowOnboarding(true);
      setSettingsOpen(true);
      setLocalDataResetPhase("idle");
      const status = "Local profile, preferences, feedback, Saved Sessions, recent history, and offline media were reset.";
      setBackupImportState((current) => ({ ...current, status }));
    } catch (resetError: unknown) {
      setSettingsOpen(true);
      setLocalDataResetPhase("idle");
      setBackupImportState((current) => ({ ...current, status: `Reset did not complete. ${formatError(resetError)}` }));
    }
  };

  const handleRetrySavedSessionStorage = async () => {
    try {
      if (savedSessionsStorageReady) {
        await persistSavedSessions(appPersistence.storage, savedSessions);
      } else {
        const storedSessions = await loadSavedSessions(appPersistence.storage);
        setSavedSessions(storedSessions);
        setSavedSessionsStorageReady(true);
      }
      setSavedSessionStorageError(null);
    } catch (storageError: unknown) {
      setSavedSessionStorageError(
        savedSessionsStorageReady
          ? `Couldn’t save sessions. Your current edits are still here; try again. ${formatError(storageError)}`
          : `Couldn’t load saved sessions. ${formatError(storageError)}`,
      );
    }
  };

  const savedSessionSourceForCurrentState = (): SavedSessionDraft["source"] => {
    const restoredSession = currentSavedSessionId
      ? savedSessions.find((session) => session.id === currentSavedSessionId)
      : null;
    if (restoredSession) return restoredSession.source;
    if (selectedPreset?.generatedRecipe) return "Generated Recipe";
    if (currentSession?.source === "Fast Start") return "Fast Start";
    if (currentSession?.source === "Presets/Builder") return "Builder";
    return "Manual";
  };

  const buildSavedSessionDraftForSound = (
    catalogSound: MobileCatalogSound,
    source: SavedSessionDraft["source"],
    builderModel?: BuilderSessionModelV1 | null,
  ): SavedSessionDraft => ({
    name: catalogSound.title,
    source,
    type: "Single sound",
    sounds: [{
      soundId: catalogSound.id,
      titleSnapshot: catalogSound.title,
      laneSnapshot: catalogSound.lane,
      sourceUri: catalogSound.audioUrl,
      volume: 1,
      enabled: true,
      userChoiceOnly: catalogSound.userChoiceOnly,
      role: "bed",
    }],
    loop: isLoopEnabled && catalogSound.loopEligible,
    timerMinutes: timerOptionMinutes,
    ...(builderModel ? { builderModel: transitionBuilderSession(builderModel, "saved") } : {}),
  });

  const buildSavedSessionDraftForPreset = (
    preset: MobileBuilderPreset,
    source: SavedSessionDraft["source"],
  ): SavedSessionDraft | null => {
    const previewLayers = preset.layeredPreview?.layers ?? [];
    const sounds = previewLayers.map((layer) => {
      const controlledLayer = getControlledPreviewLayer(preset, layer, builderLayerBalances, builderLayerSwaps);
      const catalogSound = soundById.get(controlledLayer.soundId);
      if (!catalogSound) return null;
      return {
        soundId: catalogSound.id,
        titleSnapshot: catalogSound.title,
        laneSnapshot: catalogSound.lane,
        sourceUri: catalogSound.audioUrl,
        volume: controlledLayer.volume,
        enabled: isBuilderLayerEnabled(preset, layer, builderEnabledLayerKeys),
        userChoiceOnly: catalogSound.userChoiceOnly,
        role: builderRoleToRecipeRole(layer.role),
        builderLayerId: getBuilderLayerId(preset, layer),
      };
    }).filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
    if (!sounds.length) return null;
    const candidateModel = activeBuilderModelRef.current;
    const modelMatchesPreset = Boolean(candidateModel && (
      candidateModel.sourceRecipeId === preset.id ||
      candidateModel.sourceRecipeId === preset.generatedRecipe?.id ||
      currentSavedSessionId
    ));
    return {
      name: preset.title,
      source,
      type: "Layered recipe",
      sounds,
      loop: false,
      timerMinutes: timerOptionMinutes,
      ...(candidateModel && modelMatchesPreset
        ? { builderModel: transitionBuilderSession(candidateModel, "saved") }
        : {}),
    };
  };

  const buildSavedSessionDraftForGeneratedBuilderResult = (): SavedSessionDraft | null => {
    if (!generatedBuilderRecipe || !generatedBuilderPreset) return null;
    if (generatedBuilderRecipe.layers.length !== 1) {
      return buildSavedSessionDraftForPreset(generatedBuilderPreset, "Generated Recipe");
    }
    const singleSound = soundById.get(generatedBuilderRecipe.layers[0].soundId);
    return singleSound ? buildSavedSessionDraftForSound(singleSound, "Generated Recipe", activeBuilderModel) : null;
  };

  const buildCurrentSavedSessionDraft = (): SavedSessionDraft | null => {
    if (!currentSession) return null;
    if (currentSession.type === "recipe" && selectedPreset) {
      const draft = buildSavedSessionDraftForPreset(selectedPreset, savedSessionSourceForCurrentState());
      const restoredSession = currentSavedSessionId
        ? savedSessions.find((session) => session.id === currentSavedSessionId)
        : null;
      if (!draft || !restoredSession) return draft;
      const unavailableSoundIds = new Set(
        resolveSavedSession(
          restoredSession,
          mobileCatalogSounds,
          true,
          getSavedSessionEligibility,
        )
          .unavailableEntries
          .map(({ entry }) => entry.soundId),
      );
      const assignedDraftIndexes = new Set<number>();
      const editedEntryByStoredIndex = new Map<number, SavedSessionDraft["sounds"][number]>();
      restoredSession.sounds.forEach((storedEntry, storedIndex) => {
        if (unavailableSoundIds.has(storedEntry.soundId)) return;
        const matchingDraftIndex = draft.sounds.findIndex(
          (editedEntry, draftIndex) => !assignedDraftIndexes.has(draftIndex) && editedEntry.soundId === storedEntry.soundId,
        );
        if (matchingDraftIndex < 0) return;
        assignedDraftIndexes.add(matchingDraftIndex);
        editedEntryByStoredIndex.set(storedIndex, draft.sounds[matchingDraftIndex]);
      });
      restoredSession.sounds.forEach((storedEntry, storedIndex) => {
        if (unavailableSoundIds.has(storedEntry.soundId) || editedEntryByStoredIndex.has(storedIndex)) return;
        const nextDraftIndex = draft.sounds.findIndex((_, draftIndex) => !assignedDraftIndexes.has(draftIndex));
        if (nextDraftIndex < 0) return;
        assignedDraftIndexes.add(nextDraftIndex);
        editedEntryByStoredIndex.set(storedIndex, draft.sounds[nextDraftIndex]);
      });
      const mergedSounds = restoredSession.sounds.map((storedEntry, storedIndex) =>
        unavailableSoundIds.has(storedEntry.soundId)
          ? storedEntry
          : editedEntryByStoredIndex.get(storedIndex) ?? storedEntry,
      );
      const addedSounds = draft.sounds.filter((_, draftIndex) => !assignedDraftIndexes.has(draftIndex));
      return { ...draft, sounds: [...mergedSounds, ...addedSounds] };
    }
    const candidateModel = activeBuilderModelRef.current;
    const singleBuilderModel = candidateModel?.layers.length === 1 && candidateModel.layers[0].soundId === selectedSound.id
      ? candidateModel
      : null;
    return buildSavedSessionDraftForSound(selectedSound, savedSessionSourceForCurrentState(), singleBuilderModel);
  };

  const openSavedSessionDialog = (
    mode: SavedSessionDialogMode,
    draft?: SavedSessionDraft | null,
    sessionId?: string,
    linkToCurrent: boolean = false,
  ) => {
    setPendingDeleteSessionId(null);
    const existingSession = sessionId ? savedSessions.find((session) => session.id === sessionId) : null;
    const effectiveDraft = draft ?? (existingSession ? {
      name: existingSession.name,
      source: existingSession.source,
      type: existingSession.type,
      sounds: existingSession.sounds,
      loop: existingSession.loop,
      timerMinutes: existingSession.timerMinutes,
      note: existingSession.note,
      builderModel: existingSession.builderModel,
    } : undefined);
    if (mode !== "rename" && !effectiveDraft) {
      showTransientNotification("Choose a playable sound or layered recipe before saving.");
      return;
    }
    setSavedSessionDialog({ mode, draft: effectiveDraft, sessionId, linkToCurrent });
    setSavedSessionNameInput(
      mode === "save-new"
        ? `${existingSession?.name ?? effectiveDraft?.name ?? "Soundscape"} Copy`
        : existingSession?.name ?? effectiveDraft?.name ?? "Soundscape",
    );
    setSavedSessionNoteInput(existingSession?.note ?? effectiveDraft?.note ?? "");
    dismissTransientNotification();
  };

  const handleSubmitSavedSessionDialog = () => {
    if (!savedSessionDialog || !savedSessionNameInput.trim()) return;
    const now = new Date().toISOString();
    if (savedSessionDialog.mode === "rename" && savedSessionDialog.sessionId) {
      setSavedSessions((current) => renameSavedSession(current, savedSessionDialog.sessionId!, savedSessionNameInput, now));
      showTransientNotification("Session renamed.");
      setSavedSessionDialog(null);
      return;
    }
    const draft = savedSessionDialog.draft;
    if (!draft) return;
    const namedDraft: SavedSessionDraft = {
      ...draft,
      name: savedSessionNameInput,
      note: savedSessionNoteInput,
    };
    if (savedSessionDialog.mode === "update" && savedSessionDialog.sessionId) {
      setSavedSessions((current) => updateSavedSession(current, savedSessionDialog.sessionId!, namedDraft, now));
      setCurrentSavedSessionId(savedSessionDialog.sessionId);
      showTransientNotification("Session updated.");
    } else if (savedSessionDialog.mode === "save-new" && savedSessionDialog.sessionId) {
      const existingSession = savedSessions.find((session) => session.id === savedSessionDialog.sessionId);
      if (existingSession) {
        const editedSource: SavedSession = { ...existingSession, ...namedDraft };
        const savedAsNew = saveAsNewSavedSession(editedSource, namedDraft.name, {
          now,
          existingIds: savedSessions.map((session) => session.id),
        });
        if (savedAsNew) {
          setSavedSessions((current) => [...current, savedAsNew]);
          setCurrentSavedSessionId(savedAsNew.id);
          showTransientNotification("Saved as a new session.");
        }
      }
    } else {
      const created = createSavedSession(namedDraft, {
        now,
        existingIds: savedSessions.map((session) => session.id),
      });
      if (created) {
        setSavedSessions((current) => [...current, created]);
        if (savedSessionDialog.linkToCurrent) setCurrentSavedSessionId(created.id);
        showTransientNotification("Session saved.");
      }
    }
    setSavedAreaTab("sessions");
    setSavedSessionDialog(null);
  };

  const handleDuplicateSavedSession = (sessionId: string) => {
    setSavedSessions((current) => duplicateSavedSession(current, sessionId));
    showTransientNotification("Session duplicated with a new ID.");
    setPendingDeleteSessionId(null);
  };

  const handleDeleteSavedSession = (sessionId: string) => {
    if (pendingDeleteSessionId !== sessionId) {
      setPendingDeleteSessionId(sessionId);
      showTransientNotification("Delete requires confirmation.");
      return;
    }
    setSavedSessions((current) => deleteSavedSession(current, sessionId));
    if (currentSavedSessionId === sessionId) setCurrentSavedSessionId(null);
    setPendingDeleteSessionId(null);
    showTransientNotification("Session deleted.");
  };

  const handleCancelDeleteSavedSession = (sessionId: string) => {
    if (pendingDeleteSessionId !== sessionId) return;
    setPendingDeleteSessionId(null);
    showTransientNotification("Delete canceled.");
  };

  const buildPresetForSavedSession = (
    session: SavedSession,
    resolution: ReturnType<typeof resolveSavedSession>,
  ): MobileBuilderPreset => {
    const firstEnabledIndex = resolution.validEntries.findIndex((entry) => entry.enabled);
    const orderedEntries = firstEnabledIndex > 0
      ? [
          resolution.validEntries[firstEnabledIndex],
          ...resolution.validEntries.filter((_, index) => index !== firstEnabledIndex),
        ]
      : [...resolution.validEntries];
    const layers: LayeredPreviewLayer[] = orderedEntries.map((entry, index) => ({
      builderLayerId: entry.builderLayerId ?? `${entry.role ?? (index === 0 ? "bed" : index === 1 ? "texture" : "accent")}:${index}`,
      role: roleToBuilderRole(entry.role ?? (index === 0 ? "bed" : index === 1 ? "texture" : "accent")),
      soundId: entry.soundId,
      label: entry.title,
      volume: entry.volume,
      balanceLabel: entry.volume <= 0.14 ? "Quiet" : entry.volume >= 0.3 ? "Present" : "Balanced",
      savedVolume: entry.volume,
    }));
    const starting = orderedEntries[0];
    return {
      id: `saved-session-${session.id}`,
      title: session.name,
      subtitle: `${layers.length} saved layer${layers.length === 1 ? "" : "s"}`,
      useCase: session.note ?? "Saved on this device.",
      layerSummary: `${layers.length} layers · Saved session`,
      startingSoundId: starting.soundId,
      startingSoundLabel: starting.title,
      layers: layers.map((layer) => ({
        role: layer.role,
        name: layer.label,
        soundId: layer.soundId,
        balanceLabel: layer.balanceLabel,
      })),
      clearLabelRequired: resolution.choiceRequired,
      userChoiceOnly: resolution.choiceRequired,
      layeredPreview: {
        label: session.name,
        availabilityLabel: "Saved layered session",
        recipeAccuracy: "Close recipe",
        note: session.note ?? "Restored from the saved local definition.",
        layers,
      },
    };
  };

  const beginSavedSessionStartGeneration = (): number => {
    const generation = savedSessionStartGenerationRef.current + 1;
    savedSessionStartGenerationRef.current = generation;
    savedSessionPreparedAudioUriRef.current = null;
    setPendingSavedSessionStart(null);
    setPendingSavedSessionPlaybackConfirmation(null);
    return generation;
  };

  const executeSavedSessionStart = async (
    session: SavedSession,
    choiceConsentGranted: boolean,
    generation: number,
  ) => {
    if (generation !== savedSessionStartGenerationRef.current) return;
    const resolution = resolveSavedSession(
      session,
      mobileCatalogSounds,
      choiceConsentGranted,
      getSavedSessionEligibility,
    );
    const activeValidEntries = resolution.validEntries.filter((entry) => entry.enabled);
    if (!resolution.canStart || !activeValidEntries.length) {
      showTransientNotification(
        resolution.choiceRequired && !choiceConsentGranted
          ? "Choice · explicit consent required before this session can start."
          : resolution.issueSummary || "This session has zero enabled, available sounds and cannot start.",
      );
      return;
    }
    const avoidedEntry = activeValidEntries.find((entry) => {
      const catalogSound = soundById.get(entry.soundId);
      return catalogSound ? matchesAnyIntent(catalogSound, activeAvoidedIntents) : false;
    });
    if (avoidedEntry) {
      showTransientNotification(`${avoidedEntry.title} is currently avoided. Change that local preference before starting this session.`);
      return;
    }
    const firstCatalogSound = soundById.get(activeValidEntries[0].soundId);
    if (!firstCatalogSound) {
      showTransientNotification("This session has zero available sounds and cannot start.");
      return;
    }
    let preset: MobileBuilderPreset | null = null;
    let restoredBuilderModel: BuilderSessionModelV1 | null = null;
    if (session.type === "Layered recipe") {
      preset = buildPresetForSavedSession(session, resolution);
      if (!resolution.unavailableEntries.length) {
        try {
          restoredBuilderModel = session.builderModel
            ? transitionBuilderSession(
                revalidateBuilderSessionAgainstCatalog(reopenBuilderSession(session.builderModel)),
                "saved",
                "saved",
              )
            : (() => {
                const definition = builderPresetDefinitionFromMobile(preset!);
                return definition
                  ? createBuilderSessionModelFromPreset(definition, { origin: "saved", state: "saved", choiceGranted: resolution.choiceRequired })
                  : null;
              })();
        } catch (builderRestoreError: unknown) {
          showTransientNotification(`Stored Builder definition could not be reopened exactly. ${formatError(builderRestoreError)}`);
          return;
        }
      }
      const presetKeyPrefix = `${preset.id}:`;
      const restoredEnabledLayerKeys = Object.fromEntries(
        (preset.layeredPreview?.layers ?? []).map((layer) => [
          buildBuilderLayerKey(preset!, layer),
          resolution.validEntries.find((entry) => entry.soundId === layer.soundId)?.enabled !== false,
        ]),
      );
      setBuilderEnabledLayerKeys((current) => ({
        ...Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(presetKeyPrefix))),
        ...restoredEnabledLayerKeys,
      }));
      setBuilderLayerBalances((current) => Object.fromEntries(
        Object.entries(current).filter(([key]) => !key.startsWith(presetKeyPrefix)),
      ));
      setBuilderLayerSwaps((current) => Object.fromEntries(
        Object.entries(current).filter(([key]) => !key.startsWith(presetKeyPrefix)),
      ));
    }
    const wasAlreadyPlaying = !preset
      && selectedSoundRef.current.id === firstCatalogSound.id
      && loadedSoundIdRef.current === firstCatalogSound.id
      && isPlaying;
    if (!preset && !wasAlreadyPlaying) {
      try {
        const preparedAudioUri = await preparePreferredPlaybackUri(firstCatalogSound);
        if (generation !== savedSessionStartGenerationRef.current) return;
        savedSessionPreparedAudioUriRef.current = preparedAudioUri;
      } catch {
        if (generation !== savedSessionStartGenerationRef.current) return;
        savedSessionPreparedAudioUriRef.current = null;
      }
    }
    if (generation !== savedSessionStartGenerationRef.current) return;
    await selectSound(
      firstCatalogSound,
      `Saved session: ${session.name} is ready.`,
      preset,
      "Saved",
      true,
      false,
      "defer",
      true,
    );
    publishBuilderModel(restoredBuilderModel);
    if (generation !== savedSessionStartGenerationRef.current) return;
    const restoredTimer = sessionTimerOptions.includes(session.timerMinutes as SessionTimerOptionMinutes)
      ? session.timerMinutes as SessionTimerOptionMinutes
      : 0;
    setTimerOptionMinutes(restoredTimer);
    setTimerRemainingMillis(restoredTimer * 60 * 1000);
    const restoredLayeredLoopSounds = activeValidEntries
      .map((entry) => soundById.get(entry.soundId))
      .filter((catalogSound): catalogSound is MobileCatalogSound => Boolean(catalogSound));
    const restoredLoopEligible = preset
      ? restoredLayeredLoopSounds.length === activeValidEntries.length && isLayeredLoopEligible(restoredLayeredLoopSounds)
      : firstCatalogSound.loopEligible;
    const restoredLoopEnabled = session.loop && restoredLoopEligible;
    setIsLoopEnabled(restoredLoopEnabled);
    isLoopEnabledRef.current = restoredLoopEnabled;
    setPendingSavedSessionStart(null);
    setSavedSessionStartRequest({
      sessionId: session.id,
      soundId: firstCatalogSound.id,
      preset,
      generation,
      partialNotice: resolution.isPartial
        ? `${resolution.issueSummary} Started the available sounds.`
        : null,
      wasAlreadyPlaying,
      loopEnabled: restoredLoopEnabled,
      timerMinutes: restoredTimer,
    });
    showTransientNotification(resolution.isPartial
      ? `${resolution.issueSummary} Starting the available sounds.`
      : `Starting ${session.name}.`);
  };

  const handleStartSavedSession = (session: SavedSession) => {
    setPendingDeleteSessionId(null);
    const resolution = resolveSavedSession(
      session,
      mobileCatalogSounds,
      false,
      getSavedSessionEligibility,
    );
    const activeValidEntries = resolution.validEntries.filter((entry) => entry.enabled);
    if (!activeValidEntries.length) {
      showTransientNotification(resolution.issueSummary || "This session has zero enabled, available sounds and cannot start.");
      return;
    }
    const avoidedEntry = activeValidEntries.find((entry) => {
      const catalogSound = soundById.get(entry.soundId);
      return catalogSound ? matchesAnyIntent(catalogSound, activeAvoidedIntents) : false;
    });
    if (avoidedEntry) {
      showTransientNotification(`${avoidedEntry.title} is currently avoided. Change that local preference before starting this session.`);
      return;
    }
    const generation = beginSavedSessionStartGeneration();
    if (resolution.choiceRequired || resolution.isPartial) {
      setPendingSavedSessionStart({
        sessionId: session.id,
        needsChoiceConsent: resolution.choiceRequired,
        needsMissingAcknowledgement: resolution.isPartial,
        generation,
      });
      showTransientNotification(resolution.isPartial
        ? resolution.issueSummary
        : "Choice · explicit consent required before this session can start.");
      return;
    }
    executeSavedSessionStart(session, true, generation).catch((startError: unknown) => {
      if (generation === savedSessionStartGenerationRef.current) {
        showTransientNotification(`Couldn’t start session. ${formatError(startError)}`);
      }
    });
  };

  const handleConfirmSavedSessionStart = () => {
    if (!pendingSavedSessionStart) return;
    const pendingStart = pendingSavedSessionStart;
    const session = savedSessions.find((savedSession) => savedSession.id === pendingStart.sessionId);
    if (!session || pendingStart.generation !== savedSessionStartGenerationRef.current) return;
    executeSavedSessionStart(session, true, pendingStart.generation).catch((startError: unknown) => {
      if (pendingStart.generation === savedSessionStartGenerationRef.current) {
        showTransientNotification(`Couldn’t start session. ${formatError(startError)}`);
      }
    });
  };

  const handleSelectDefaultTimerPreference = (durationMinutes: SessionTimerOptionMinutes) => {
    setDefaultTimerPreference(durationMinutes);
    if (!currentSession) {
      setTimerOptionMinutes(durationMinutes);
      timerEndsAtMillisRef.current = null;
      setTimerIsRunning(false);
      setTimerRemainingMillis(durationMinutes * 60 * 1000);
    }
  };

  const handleSelectStartTabPreference = (sectionKey: MobileSectionKey) => {
    setStartTabPreference(sectionKey);
    startTabPreferenceAppliedRef.current = true;
  };

  const getSoundFeedbackState = (catalogSound: MobileCatalogSound) => ({
    liked: preferenceFeedback.likedSoundIds.includes(catalogSound.id),
    disliked: preferenceFeedback.dislikedSoundIds.includes(catalogSound.id),
    avoided: preferenceFeedback.avoidedSoundIds.includes(catalogSound.id),
  });

  const getRecipeFeedbackState = (recipe: GeneratedRecipe | undefined, preset: MobileBuilderPreset | null | undefined) => {
    const fingerprint = buildRecipeFingerprint(recipe, preset);
    return {
      liked: preferenceFeedback.likedRecipeFingerprints.includes(fingerprint),
      disliked: preferenceFeedback.dislikedRecipeFingerprints.includes(fingerprint),
    };
  };

  const activeQuickFeedbackKey = currentSession?.type === "recipe"
    ? `recipe:${buildRecipeFingerprint(selectedPreset?.generatedRecipe, selectedPreset)}`
    : currentSession?.type === "single"
      ? `sound:${selectedSound.id}`
      : null;
  const persistedActiveSessionFeedbackState = currentSession?.type === "recipe"
    ? getRecipeFeedbackState(selectedPreset?.generatedRecipe, selectedPreset)
    : currentSession?.type === "single"
      ? getSoundFeedbackState(selectedSound)
      : { liked: false, disliked: false };
  const persistedActiveQuickFeedbackState: QuickFeedbackState = persistedActiveSessionFeedbackState.liked
    ? "up"
    : persistedActiveSessionFeedbackState.disliked
      ? "down"
      : "neutral";
  const activeQuickFeedbackState = activeQuickFeedbackKey
    ? optimisticQuickFeedbackByKey[activeQuickFeedbackKey] ?? persistedActiveQuickFeedbackState
    : "neutral";
  const activeSessionFeedbackState = {
    liked: activeQuickFeedbackState === "up",
    disliked: activeQuickFeedbackState === "down",
  };

  if (!quickFeedbackPersistenceQueueRef.current) {
    quickFeedbackPersistenceQueueRef.current = new LatestIntentPersistenceQueue<QuickFeedbackPersistenceValue>({
      persist: async ({ value }) => {
        await appPersistence.savePreferencesRaw(JSON.stringify(value.preferenceFeedback));
      },
      onCommitted: ({ value }, isLatest) => {
        preferenceFeedbackRef.current = value.preferenceFeedback;
        if (!isLatest) return;
        quickFeedbackDesiredPreferenceRef.current = value.preferenceFeedback;
        delete quickFeedbackDesiredStateByKeyRef.current[value.feedbackKey];
        recordPlaybackTimingTrace("ROOT_PREFERENCE_PUBLISH_START", { command: "feedback-publish" });
        React.startTransition(() => {
          setPreferenceFeedback(value.preferenceFeedback);
          setOptimisticQuickFeedbackByKey((current) => {
            const next = { ...current };
            delete next[value.feedbackKey];
            return next;
          });
        });
        setTimeout(() => {
          recordPlaybackTimingTrace("ROOT_PREFERENCE_PUBLISH_END", { command: "feedback-publish" });
        }, 0);
      },
      onFailed: ({ value }, _error, isLatest) => {
        if (!isLatest) return;
        quickFeedbackDesiredPreferenceRef.current = preferenceFeedbackRef.current;
        delete quickFeedbackDesiredStateByKeyRef.current[value.feedbackKey];
        setOptimisticQuickFeedbackByKey((current) => {
          const next = { ...current };
          delete next[value.feedbackKey];
          return next;
        });
        showTransientNotification("Quick feedback could not be saved. Your latest saved choice was restored.");
      },
    });
  }
  const quickFeedbackPersistenceQueue = quickFeedbackPersistenceQueueRef.current!;

  if (!quickFeedbackAfterPaintQueueRef.current) {
    quickFeedbackAfterPaintQueueRef.current = new LatestKeyedAfterPaintQueue<DeferredQuickFeedbackIntent>({
      requestFrame: (callback) => requestAnimationFrame(() => {
        recordPlaybackTimingTrace("RAF_FIRE", { command: "feedback" });
        callback();
      }),
      postTask: (callback) => setTimeout(callback, 0),
      onReady: ({ revision, value }) => {
        recordPlaybackTimingTrace("POST_PAINT_TASK_RELEASE", { command: "feedback" });
        recordPlaybackTimingTrace("DURABLE_FEEDBACK_START", { command: `feedback-${revision}` });
        const currentDesiredFeedback = quickFeedbackDesiredPreferenceRef.current;
        const nextPreferenceFeedback = value.sessionType === "single"
          ? applySoundQuickFeedbackState(currentDesiredFeedback, value.sound, value.feedbackState)
          : applyRecipeQuickFeedbackState(
              currentDesiredFeedback,
              value.preset?.generatedRecipe,
              value.preset,
              soundById,
              value.feedbackState,
            );
        const timestampedFeedback = { ...nextPreferenceFeedback, updatedAt: new Date().toISOString() };
        quickFeedbackDesiredPreferenceRef.current = timestampedFeedback;
        quickFeedbackPersistenceQueue.enqueue({
          revision,
          value: {
            feedbackKey: value.feedbackKey,
            feedbackState: value.feedbackState,
            preferenceFeedback: timestampedFeedback,
          },
        });
        recordPlaybackTimingTrace("DURABLE_FEEDBACK_END", { command: `feedback-${revision}` });
      },
    });
  }
  const quickFeedbackAfterPaintQueue = quickFeedbackAfterPaintQueueRef.current!;

  const handleQuickSessionFeedback = (direction: QuickFeedbackDirection) => {
    recordPlaybackTimingTrace(`FEEDBACK_PRESS direction=${direction}`, {
      sound: selectedSoundRef.current,
      command: "feedback",
    });
    if (!currentSession || !activeQuickFeedbackKey) return;
    if (currentSession.type === "recipe" && !selectedPreset) {
      showTransientNotification("This recipe is not ready for feedback yet.");
      return;
    }

    const currentDesiredFeedback = quickFeedbackDesiredPreferenceRef.current;
    const desiredRecipeFingerprint = currentSession.type === "recipe"
      ? buildRecipeFingerprint(selectedPreset?.generatedRecipe, selectedPreset)
      : null;
    const persistedDesiredState: QuickFeedbackState = currentSession.type === "single"
      ? currentDesiredFeedback.likedSoundIds.includes(selectedSound.id)
        ? "up"
        : currentDesiredFeedback.dislikedSoundIds.includes(selectedSound.id)
          ? "down"
          : "neutral"
      : desiredRecipeFingerprint && currentDesiredFeedback.likedRecipeFingerprints.includes(desiredRecipeFingerprint)
        ? "up"
        : desiredRecipeFingerprint && currentDesiredFeedback.dislikedRecipeFingerprints.includes(desiredRecipeFingerprint)
          ? "down"
          : "neutral";
    const previousState = quickFeedbackDesiredStateByKeyRef.current[activeQuickFeedbackKey]
      ?? persistedDesiredState;
    const nextState = getNextQuickFeedbackState(previousState, direction);
    quickFeedbackDesiredStateByKeyRef.current[activeQuickFeedbackKey] = nextState;
    setOptimisticQuickFeedbackByKey((current) => ({ ...current, [activeQuickFeedbackKey]: nextState }));
    showTransientNotification(getQuickFeedbackMessage(previousState, direction));
    quickFeedbackRevisionRef.current += 1;
    quickFeedbackAfterPaintQueue.enqueue({
      key: activeQuickFeedbackKey,
      revision: quickFeedbackRevisionRef.current,
      value: {
        feedbackKey: activeQuickFeedbackKey,
        feedbackState: nextState,
        sessionType: currentSession.type,
        sound: selectedSound,
        preset: selectedPreset,
      },
    });
  };

  const renderActiveQuickFeedbackControls = (mini = false) => {
    if (!currentSession) return null;
    const sessionTitle = currentSession.title;
    return (
      <View
        accessibilityLabel={`Quick feedback for ${sessionTitle}`}
        style={[styles.quickFeedbackRow, mini ? styles.miniQuickFeedbackControls : styles.playerQuickFeedbackControls]}
      >
        <QuickFeedbackButton
          icon="👍"
          selected={activeSessionFeedbackState.liked}
          onPress={() => handleQuickSessionFeedback("up")}
          accessibilityLabel={`${activeSessionFeedbackState.liked ? "Clear More like this feedback for" : "More like this"} ${sessionTitle}`}
        />
        <QuickFeedbackButton
          icon="👎"
          selected={activeSessionFeedbackState.disliked}
          onPress={() => handleQuickSessionFeedback("down")}
          accessibilityLabel={`${activeSessionFeedbackState.disliked ? "Clear Less like this feedback for" : "Less like this"} ${sessionTitle}`}
        />
      </View>
    );
  };

  // Player feedback controls stay in a compact row near the sound info.
  // Browse sound rows use compactSoundRow so feedback chips cannot create blank panels.
  const renderSoundFeedbackControls = (catalogSound: MobileCatalogSound) => {
    const feedbackState = getSoundFeedbackState(catalogSound);
    return (
      <View style={styles.feedbackChipRow}>
        <FeedbackChip
          label="👍 More like this"
          activeLabel="✓ More like this"
          selected={feedbackState.liked}
          onPress={() => handleLikeSound(catalogSound)}
          accessibilityLabel={feedbackState.liked ? `Remove more-like-this preference for ${catalogSound.title}` : `More like ${catalogSound.title}. This clears Avoid.`}
        />
        <FeedbackChip
          label="👎 Less like this"
          activeLabel="✓ Less like this"
          selected={feedbackState.disliked}
          onPress={() => handleDislikeSound(catalogSound)}
          accessibilityLabel={feedbackState.disliked ? `Remove less-like-this preference for ${catalogSound.title}` : `Less like ${catalogSound.title}. This clears Avoid.`}
        />
        <FeedbackChip
          label={feedbackState.avoided ? "Remove avoid" : "🚫 Avoid"}
          activeLabel="✓ Avoided"
          selected={feedbackState.avoided}
          onPress={() => handleAvoidSound(catalogSound)}
          accessibilityLabel={feedbackState.avoided ? `Remove avoid for ${catalogSound.title}` : `Avoid ${catalogSound.title}`}
          danger
        />
      </View>
    );
  };

  const renderRecipeFeedbackControls = (recipe: GeneratedRecipe | undefined, preset: MobileBuilderPreset | null | undefined) => {
    if (!recipe && !preset) {
      return null;
    }
    const feedbackState = getRecipeFeedbackState(recipe, preset);
    return (
      <View style={styles.feedbackChipStack}>
        <Text style={styles.feedbackHelperText}>Thumbs train this whole recipe. Playback changes only when you start or try another mix.</Text>
        <View style={styles.feedbackChipRow}>
          <FeedbackChip
            label="👍 More like this"
            activeLabel="✓ More like this"
            selected={feedbackState.liked}
            onPress={() => handleLikeRecipe(recipe, preset)}
            accessibilityLabel={feedbackState.liked ? "Remove more-like-this recipe preference" : "More like this complete recipe"}
          />
          <FeedbackChip
            label="👎 Less like this"
            activeLabel="✓ Less like this"
            selected={feedbackState.disliked}
            onPress={() => handleDislikeRecipe(recipe, preset)}
            accessibilityLabel={feedbackState.disliked ? "Remove less-like-this recipe preference" : "Less like this complete recipe"}
          />
        </View>
        <Pressable
          accessibilityLabel="Tune recommendations"
          accessibilityRole="button"
          accessibilityState={{ expanded: recipeTuningOpen }}
          onPress={() => setRecipeTuningOpen((open) => !open)}
          style={({ pressed }) => [styles.tertiaryDisclosureButton, pressed ? styles.pressedSoundRow : null]}
        >
          <Text style={styles.tertiaryDisclosureText}>Tune recommendations {recipeTuningOpen ? "−" : "+"}</Text>
        </Pressable>
        {recipeTuningOpen ? (
          <View style={styles.feedbackChipStack}>
            <Text style={styles.feedbackHelperText}>These lighter controls tune shared layer traits without saving the whole recipe as liked or disliked.</Text>
            <View style={styles.feedbackChipRow}>
              <FeedbackChip
                label="Boost layer traits"
                activeLabel="Boost layer traits"
                selected={false}
                onPress={() => handleMoreLikeRecipe(recipe, preset)}
                accessibilityLabel="Boost the recommendation traits shared by these layers"
              />
              <FeedbackChip
                label="Reduce layer traits"
                activeLabel="Reduce layer traits"
                selected={false}
                onPress={() => handleLessLikeRecipe(recipe, preset)}
                accessibilityLabel="Reduce the recommendation traits shared by these layers"
                danger
              />
            </View>
          </View>
        ) : null}
      </View>
    );
  };

  const renderFastStartCurrentSessionControls = () => {
    if (!currentSession) {
      return null;
    }

    const sessionStatusLabel = currentSession.type === "recipe" ? layeredPlaybackStatusLabel : singlePlaybackStatusLabel;

    return (
      <View style={styles.fastStartCurrentSessionBox}>
        <Text style={styles.fastStartResultEyebrow}>Current session</Text>
        <Text style={styles.fastStartWhyText}>
          {getCurrentSessionTitle(currentSession, selectedSound)} · {currentSession.type === "recipe" ? "Layered recipe" : "Single sound"} · {sessionStatusLabel}
        </Text>
      </View>
    );
  };

  const getCurrentSessionTitle = (session: CurrentSession, fallbackSound: MobileCatalogSound) =>
    session.type === "recipe" ? session.title : fallbackSound.title;

  useEffect(() => {
    if (!savedSessionStartRequest) return;
    const request = savedSessionStartRequest;
    setSavedSessionStartRequest(null);
    if (request.generation !== savedSessionStartGenerationRef.current) return;
    setPendingSavedSessionPlaybackConfirmation(request);
    const startRestoredDefinition = async () => {
      if (request.wasAlreadyPlaying) return;
      if (request.preset) {
        await handleLayeredPreviewPlay(
          request.preset,
          activeBuilderModelRef.current ?? undefined,
          undefined,
          () => request.generation === savedSessionStartGenerationRef.current,
          { loopEnabled: request.loopEnabled, timerMinutes: request.timerMinutes },
        );
      } else {
        await handlePlay();
      }
    };
    startRestoredDefinition()
      .catch((startError: unknown) => {
        if (request.generation === savedSessionStartGenerationRef.current) {
          setPendingSavedSessionPlaybackConfirmation(null);
          showTransientNotification(`Couldn’t start session. ${formatError(startError)}`);
        }
      });
  }, [savedSessionStartRequest]);

  useEffect(() => {
    const pending = pendingSavedSessionPlaybackConfirmation;
    if (!pending) return;
    if (pending.generation !== savedSessionStartGenerationRef.current) {
      setPendingSavedSessionPlaybackConfirmation(null);
      return;
    }
    const confirmedPlaying = pending.preset
      ? layeredPreviewPresetId === pending.preset.id && layeredPreviewStatus === "playing"
      : loadedSoundId === pending.soundId && (pending.wasAlreadyPlaying || isPlaying);
    if (!confirmedPlaying) return;
    setSavedSessions((current) => recordSavedSessionStarted(current, pending.sessionId));
    setCurrentSavedSessionId(pending.sessionId);
    showTransientNotification(pending.partialNotice ?? "Saved session started.");
    setPendingSavedSessionPlaybackConfirmation(null);
  }, [
    isPlaying,
    layeredPreviewPresetId,
    layeredPreviewStatus,
    loadedSoundId,
    pendingSavedSessionPlaybackConfirmation,
  ]);

  useEffect(() => {
    if (!timerIsRunning || timerOptionMinutes === 0) {
      return;
    }

    const interval = setInterval(() => {
      const endsAt = timerEndsAtMillisRef.current;
      if (!endsAt) {
        setTimerIsRunning(false);
        return;
      }

      const remainingMillis = Math.max(0, endsAt - Date.now());
      const displayRemainingMillis = Math.ceil(remainingMillis / 1000) * 1000;
      setTimerRemainingMillis((currentRemainingMillis) =>
        currentRemainingMillis === displayRemainingMillis ? currentRemainingMillis : displayRemainingMillis,
      );

      if (remainingMillis <= 0 && !timerFinishHandledRef.current) {
        timerFinishHandledRef.current = true;
        // Display-only countdown: the fenced native Timer owns fade, Stop, and cleanup.
        clearTimerCountdownOnly();
      }
    }, sessionTimerTickMillis);

    return () => {
      clearInterval(interval);
    };
  }, [clearTimerCountdownOnly, timerIsRunning, timerOptionMinutes]);

  const renderBrowseListItem = useCallback(({ item }: ListRenderItemInfo<BrowseListItem>) => {
    if (item.type === "lane") {
      return (
        <View style={styles.virtualizedLaneHeader}>
          <Text style={styles.laneTitle}>{item.lane}</Text>
          <Text style={styles.laneCountPill}>{item.count}</Text>
        </View>
      );
    }

    const catalogSound = item.sound;
    return (
      <MemoizedLocalSoundRow
        sound={catalogSound}
        selected={catalogSound.id === selectedSound.id}
        saved={savedSoundIds.includes(catalogSound.id)}
        avoided={matchesAnyIntent(catalogSound, activeAvoidedIntents)}
        onSelect={() => handleSelectSound(catalogSound, "Browse", true)}
        onToggleSaved={() => toggleSavedSound(catalogSound)}
        feedbackControls={renderSoundFeedbackControls(catalogSound)}
      />
    );
  }, [activeAvoidedIntents, preferenceFeedback, savedSoundIds, selectedSound.id]);

  const selectedPersistentDownloadResolution = resolvePersistentDownloadRightsV1(selectedSound.id, selectedSound.audioUrl);
  const selectedOfflineDescriptor = selectedPersistentDownloadResolution.eligible
    ? getM7OfflineAssetDescriptor(selectedSound.id)
    : null;
  const selectedOfflineManifestItem = offlineManifestItems.find((item) => item.assetId === selectedSound.id) ?? null;
  const selectedOfflineStatus = selectedOfflineManifestItem?.state === "available"
    ? offlineConsumerStatusLabels.downloaded
    : selectedOfflineManifestItem && ["queued", "downloading", "verifying"].includes(selectedOfflineManifestItem.state)
      ? offlineConsumerStatusLabels.downloading
      : selectedOfflineManifestItem?.state === "revoked"
        ? offlineConsumerStatusLabels.revoked
        : selectedPersistentDownloadResolution.eligible
          ? offlineConsumerStatusLabels.online
          : selectedPersistentDownloadResolution.state === "streaming_only"
            ? offlineConsumerStatusLabels.streaming
            : offlineConsumerStatusLabels.unavailable;
  const selectedOfflineCustomerCopy = selectedOfflineManifestItem?.state === "available"
    ? "Available offline"
    : selectedOfflineManifestItem?.state === "failed/retryable"
      ? selectedOfflineManifestItem.lastErrorCustomerCopy ?? "Offline download failed. Try again."
      : selectedOfflineManifestItem?.state === "revoked"
        ? "This sound isn't available."
        : selectedPersistentDownloadResolution.customerCopy;
  const selectedLayerOfflineProjections = selectedPreset && selectedLayeredPreview
    ? selectedLayeredPreview.layers.map((layer) => {
        const currentLayer = getControlledPreviewLayer(selectedPreset, layer, builderLayerBalances, builderLayerSwaps);
        const catalogSound = soundById.get(currentLayer.soundId) ?? null;
        const layerId = getBuilderLayerId(selectedPreset, layer);
        const projection = catalogSound
          ? projectLayerOfflineStateV1({
              layerId,
              layerName: catalogSound.title,
              catalogId: catalogSound.id,
              mediaUri: catalogSound.audioUrl,
              role: builderRoleToRecipeRole(currentLayer.role),
              enabled: isBuilderLayerEnabled(selectedPreset, layer, builderEnabledLayerKeys),
              rights: resolvePersistentDownloadRightsV1(catalogSound.id, catalogSound.audioUrl),
              manifestItem: offlineManifestItems.find((item) => item.assetId === catalogSound.id) ?? null,
            })
          : null;
        return Object.freeze({ layer, currentLayer, catalogSound, projection });
      })
    : [];
  const offlineStorageTotals = offlineManifestItems
    .filter((item) => item.state === "available")
    .reduce((totals, item) => ({ count: totals.count + 1, bytes: totals.bytes + (item.verifiedBytes ?? item.expectedBytes) }), { count: 0, bytes: 0 });

  if (!onboardingStorageReady) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.onboardingLoadingShell}>
          <ActivityIndicator color={visualTheme.accentSeaGlass} />
          <Text style={styles.onboardingLoadingText}>Opening Soundscape…</Text>
        </View>
        <StatusBar style="light" />
      </SafeAreaView>
    );
  }

  if (showOnboarding) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.onboardingContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.onboardingHeroCard}>
            <Text style={styles.appLabel}>Soundscape Mobile</Text>
            <Text style={styles.onboardingTitle}>Build a sound session fast.</Text>
            <Text style={styles.onboardingBody}>
              Fast starts, recipes, browse, and the player help you get to a useful mix quickly.
            </Text>
            <View style={styles.onboardingStepRow}>
              {onboardingSteps.map((step, index) => {
                const selected = step.key === onboardingStep.key;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={step.key}
                    onPress={() => setOnboardingStepIndex(index)}
                    style={[styles.onboardingStepPill, selected ? styles.onboardingStepPillSelected : null]}
                  >
                    <Text style={[styles.onboardingStepText, selected ? styles.onboardingStepTextSelected : null]}>
                      {index + 1}. {step.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {onboardingStep.key === "intro" ? (
            <View style={styles.onboardingCard}>
              <Text style={styles.onboardingEyebrow}>What this is</Text>
              <Text style={styles.onboardingCardTitle}>A quick sound-session builder.</Text>
              <Text style={styles.onboardingBody}>
                Fast Start matches typed requests and avoidances. Presets are layered recipes you can adjust.
                Browse lets you explore by category. Player holds the current session, timer, save, loop, and controls.
              </Text>
              <Text style={styles.onboardingNote}>Start listening right away.</Text>
            </View>
          ) : null}

          {onboardingStep.key === "intent" ? (
            <View style={styles.onboardingCard}>
              <Text style={styles.onboardingEyebrow}>Starting direction</Text>
              <Text style={styles.onboardingCardTitle}>Pick a first feel.</Text>
              <Text style={styles.onboardingBody}>This becomes your first Fast Start query. You can edit it after the intro.</Text>
              <View style={styles.onboardingChipWrap}>
                {onboardingIntentOptions.map((option) => {
                  const selected = option.key === selectedOnboardingIntentKey;
                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      key={option.key}
                      onPress={() => setSelectedOnboardingIntentKey(option.key)}
                      style={[styles.onboardingChoiceChip, selected ? styles.onboardingChoiceChipSelected : null]}
                    >
                      <Text style={[styles.onboardingChoiceText, selected ? styles.onboardingChoiceTextSelected : null]}>
                        {option.label}
                      </Text>
                      <Text style={[styles.onboardingChoiceHelper, selected ? styles.onboardingChoiceHelperSelected : null]}>
                        {option.helper}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          {onboardingStep.key === "avoidances" ? (
            <View style={styles.onboardingCard}>
              <Text style={styles.onboardingEyebrow}>Optional avoidances</Text>
              <Text style={styles.onboardingCardTitle}>Anything to avoid?</Text>
              <Text style={styles.onboardingBody}>Optional — we’ll add this to Fast Start. Example: “fan no chime”.</Text>
              <View style={styles.onboardingChipWrap}>
                {onboardingAvoidanceOptions.map((option) => {
                  const selected = selectedOnboardingAvoidanceKeys.includes(option.key);
                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      key={option.key}
                      onPress={() => toggleOnboardingAvoidance(option.key)}
                      style={[styles.onboardingAvoidChip, selected ? styles.onboardingAvoidChipSelected : null]}
                    >
                      <Text style={[styles.onboardingAvoidText, selected ? styles.onboardingAvoidTextSelected : null]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          <View style={styles.onboardingQueryCard}>
            <Text style={styles.onboardingEyebrow}>Ready for Fast Start</Text>
            <Text style={styles.onboardingQueryText}>{onboardingFastStartQuery}</Text>
            <Text style={styles.onboardingBody}>Finishing updates Fast Start and prepares a session without autoplay.</Text>
            <View style={styles.onboardingActionRow}>
              {onboardingStepIndex > 0 ? (
                <ProofButton label="Back" onPress={() => setOnboardingStepIndex(onboardingStepIndex - 1)} secondary compact />
              ) : null}
              {onboardingStepIndex < onboardingSteps.length - 1 ? (
                <ProofButton label="Next" onPress={() => setOnboardingStepIndex(onboardingStepIndex + 1)} compact />
              ) : (
                <ProofButton label="Start session" onPress={handleFinishOnboarding} compact />
              )}
              <ProofButton label="Skip" onPress={handleSkipOnboarding} secondary compact />
            </View>
          </View>
        </ScrollView>
        <StatusBar style="light" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      pointerEvents={surfaceVisible ? "auto" : "box-none"}
      style={surfaceVisible ? styles.safeArea : styles.classicNavigationOwnerOverlay}
    >
      <FlatList
        ref={scrollViewRef}
        data={browseSectionIsActive ? browseListItems : []}
        keyExtractor={getBrowseListItemKey}
        renderItem={renderBrowseListItem}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={40}
        windowSize={7}
        removeClippedSubviews={Platform.OS === "android"}
        style={surfaceVisible ? undefined : styles.classicNavigationOwnedViewHidden}
        contentContainerStyle={[
          styles.container,
          { paddingBottom: shellContentBottomReservation },
        ]}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={(
          <>
        {directedModeBack ? (
          <View style={styles.directedReturnRow}>
            <ProofButton label={directedModeBackLabel} onPress={directedModeBack} secondary compact />
          </View>
        ) : null}
        <View style={[styles.compactAppHeader, useStackedClassicHeader ? styles.classicHeaderStacked : null]}>
          <View style={styles.topHeaderTitleBlock}>
            <Text numberOfLines={1} style={styles.title}>Soundscape</Text>
          </View>
          <Pressable
            accessibilityLabel={settingsOpen ? "Close settings" : "Settings"}
            accessibilityRole="button"
            accessibilityState={{ expanded: settingsOpen }}
            onPress={() => {
              setPendingDeleteSessionId(null);
              setManagedSavedSessionId(null);
              setSettingsOpen((currentSettingsOpen) => !currentSettingsOpen);
            }}
            style={({ pressed }) => [
              styles.settingsEntryButton,
              settingsOpen ? styles.settingsEntryButtonActive : null,
              pressed ? styles.pressedSoundRow : null,
            ]}
          >
            <Text style={[styles.settingsEntryText, settingsOpen ? styles.settingsEntryTextActive : null]}>Settings</Text>
          </Pressable>
        </View>

        {savedSessionStorageError && !settingsOpen ? (
          <View style={styles.savedSessionStorageErrorBox}>
            <Text accessibilityLiveRegion="polite" style={styles.savedSessionErrorText}>{savedSessionStorageError}</Text>
            <ProofButton
              label={savedSessionsStorageReady ? "Retry save" : "Retry load"}
              onPress={() => {
                handleRetrySavedSessionStorage().catch(() => undefined);
              }}
              secondary
              compact
            />
          </View>
        ) : null}
        {savedSessionDialog && !settingsOpen ? (
          <Modal
            animationType="fade"
            onRequestClose={() => setSavedSessionDialog(null)}
            statusBarTranslucent
            transparent
            visible
          >
            <View style={styles.savedSessionModalBackdrop}>
              <View accessibilityViewIsModal style={styles.savedSessionDialog}>
            <Text style={styles.localLibraryEyebrow}>
              {savedSessionDialog.mode === "rename"
                ? "Rename session"
                : savedSessionDialog.mode === "update"
                  ? "Update session"
                  : savedSessionDialog.mode === "save-new"
                    ? "Save as new"
                    : "Save session"}
            </Text>
            <TextInput
              accessibilityLabel="Saved session name"
              autoCapitalize="sentences"
              maxLength={80}
              onChangeText={setSavedSessionNameInput}
              placeholder="Session name"
              placeholderTextColor={visualTheme.textSubtle}
              style={styles.savedSessionInput}
              value={savedSessionNameInput}
            />
            {savedSessionDialog.mode !== "rename" ? (
              <TextInput
                accessibilityLabel="Optional saved session note"
                maxLength={160}
                onChangeText={setSavedSessionNoteInput}
                placeholder="Optional short note"
                placeholderTextColor={visualTheme.textSubtle}
                style={styles.savedSessionInput}
                value={savedSessionNoteInput}
              />
            ) : null}
            {!savedSessionNameInput.trim() ? <Text style={styles.savedSessionErrorText}>Enter a name to continue.</Text> : null}
            {duplicateSavedSessionName ? <Text style={styles.savedSessionDuplicateText}>Another session has this name. You can still save it.</Text> : null}
            <View style={styles.savedSessionActionRow}>
              <ProofButton
                label={savedSessionDialog.mode === "rename" ? "Rename" : savedSessionDialog.mode === "update" ? "Update session" : savedSessionDialog.mode === "save-new" ? "Save as new" : "Save session"}
                onPress={handleSubmitSavedSessionDialog}
                disabled={!savedSessionNameInput.trim()}
                compact
              />
              <ProofButton label="Cancel" onPress={() => setSavedSessionDialog(null)} secondary compact />
            </View>
              </View>
            </View>
          </Modal>
        ) : null}

        {settingsOpen ? (
          <View style={styles.settingsPanel}>
            <View style={styles.settingsHeaderRow}>
              <View style={styles.settingsHeaderTextBlock}>
                <Text style={styles.settingsEyebrow}>Settings</Text>
                <Text style={styles.settingsTitle}>Preferences</Text>
                <Text style={styles.settingsBodyText}>Only this device.</Text>
              </View>
              <ProofButton label="Close settings" onPress={() => setSettingsOpen(false)} secondary compact />
            </View>

            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>First-run</Text>
              <Text style={styles.settingsBodyText}>Replay the intro and keep Saved and Recent as they are.</Text>
              <ProofButton label="Replay onboarding" onPress={handleReplayOnboardingFromSettings} compact />
            </View>

            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>Library</Text>
              <Text style={styles.settingsBodyText}>Saved: {savedSoundIds.length} sounds · Saved sessions: {savedSessions.length} · Recent: {recentSoundIds.length}</Text>
              <View style={styles.settingsActionRow}>
                <ProofButton
                  label={pendingLocalClearAction === "saved" ? "Confirm clear Saved" : "Clear Saved"}
                  onPress={handleClearSavedSoundsFromSettings}
                  secondary
                  compact
                />
                <ProofButton
                  label={pendingLocalClearAction === "recent" ? "Confirm clear Recent" : "Clear Recent"}
                  onPress={handleClearRecentSoundsFromSettings}
                  secondary
                  compact
                />
              </View>
              {pendingLocalClearAction ? (
                <Text style={styles.settingsConfirmText}>Tap confirm to remove that local list only.</Text>
              ) : null}
            </View>

            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>Local profile</Text>
              <Text style={styles.settingsBodyText}>No account required. Soundscape stays fully usable without registration or sign-in.</Text>
              <Text selectable style={styles.settingsBodyText}>Profile reference: {localState?.profile.id ?? "Loading local profile…"}</Text>
              <Text style={styles.settingsBodyText}>Local data may be lost after uninstall or device reset unless you explicitly export and keep a backup.</Text>
            </View>

            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>Offline & storage</Text>
              <Text style={styles.settingsBodyText}>
                {offlineStorageTotals.count} downloaded · {formatStorageBytes(offlineStorageTotals.bytes)} of {formatStorageBytes(offlineQuotaBytes)} quota
              </Text>
              <Text accessibilityLiveRegion="polite" style={styles.settingsBodyText}>
                Selected: {selectedSound.title} · {selectedOfflineStatus}
              </Text>
              <Text style={styles.settingsBodyText}>
                {selectedOfflineCustomerCopy}
              </Text>
              {selectedOfflineDescriptor?.attributionText ? <Text style={styles.settingsBodyText}>{selectedOfflineDescriptor.attributionText}</Text> : null}
              <View style={styles.settingsActionRow}>
                <ProofButton
                  label={selectedOfflineManifestItem?.state === "failed/retryable" ? "Retry download" : "Download for offline"}
                  onPress={() => { handleDownloadSelectedOffline().catch(() => undefined); }}
                  disabled={!offlineManifestReady || !selectedPersistentDownloadResolution.eligible || ["queued", "downloading", "verifying"].includes(selectedOfflineManifestItem?.state ?? "")}
                  compact
                />
                {selectedOfflineManifestItem?.state === "available" ? (
                  <ProofButton
                    label="Delete download"
                    onPress={() => { handleDeleteSelectedOffline().catch((deleteError: unknown) => setOfflineActionStatus(formatError(deleteError))); }}
                    secondary
                    compact
                  />
                ) : null}
              </View>
              {selectedLayerOfflineProjections.length > 0 ? (
                <View>
                  <Text style={styles.settingsBodyText}>Layers in this soundscape:</Text>
                  {selectedLayerOfflineProjections.map(({ catalogSound, projection }) => {
                    if (!catalogSound || !projection) return null;
                    return (
                      <View key={`offline-layer-${projection.layerId}`} style={styles.settingsActionRow}>
                        <Text numberOfLines={3} accessibilityLiveRegion="polite" style={styles.settingsBodyText}>
                          {projection.layerName}: {projection.customerCopy}
                        </Text>
                        {projection.primaryAction ? (
                          <ProofButton
                            label={projection.primaryAction.kind === "retry" ? "Retry download" : "Download for offline"}
                            onPress={() => { handleDownloadLayerOffline(projection.layerId, catalogSound).catch(() => undefined); }}
                            disabled={!offlineManifestReady || projection.primaryAction.disabled}
                            compact
                          />
                        ) : null}
                        {projection.secondaryAction ? (
                          <ProofButton
                            label="Delete download"
                            onPress={() => { handleDeleteLayerOffline(projection.layerId, catalogSound).catch(() => undefined); }}
                            disabled={!offlineManifestReady || projection.secondaryAction.disabled}
                            secondary
                            compact
                          />
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              ) : null}
              {offlineActionStatus ? <Text accessibilityLiveRegion="polite" style={styles.settingsConfirmText}>{offlineActionStatus}</Text> : null}
              <Text style={styles.settingsBodyText}>
                Status guide: {offlineConsumerStatusLabels.downloaded} · {offlineConsumerStatusLabels.downloading} · {offlineConsumerStatusLabels.online} · {offlineConsumerStatusLabels.streaming} · {offlineConsumerStatusLabels.unavailable} · {offlineConsumerStatusLabels.revoked}
              </Text>
              <Text style={styles.settingsBodyText}>Voice and sensitive Choice sounds stay manual-only; downloading never adds them to autoplay or recommendations.</Text>
            </View>

            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>Backup & import</Text>
              <Text style={styles.settingsBodyText}>Export supported profile data, preferences, feedback, Saved Sessions, Builder state, catalog references, and offline metadata. Media bytes are never embedded.</Text>
              <View style={styles.settingsActionRow}>
                <ProofButton label="Export local backup" onPress={() => { handleExportLocalBackup().catch((exportError: unknown) => setBackupImportState((current) => ({ ...current, status: formatError(exportError) }))); }} compact />
                <ProofButton label="Import backup" onPress={() => { handleImportLocalBackup().catch(() => undefined); }} disabled={backupImportState.busy} secondary compact />
              </View>
              <View style={styles.settingsChipRow}>
                {(["merge", "replace"] as LocalBackupModeV1[]).map((mode) => {
                  const selected = backupImportState.mode === mode;
                  const label = mode === "merge" ? "Merge with this device" : "Replace this device data";
                  return (
                    <Pressable
                      accessibilityLabel={label}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      key={`backup-mode-${mode}`}
                      onPress={() => setBackupImportState((current) => ({ ...current, mode, status: null }))}
                      style={[styles.settingsChip, selected ? styles.settingsChipSelected : null]}
                    >
                      <Text style={[styles.settingsChipText, selected ? styles.settingsChipTextSelected : null]}>{label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.settingsBodyText}>{backupImportState.mode === "merge" ? "Merge keeps current records and adds nonconflicting backup records." : "Replace validates the whole backup first, then replaces supported local data."}</Text>
              {backupImportState.status ? <Text accessibilityLiveRegion="polite" style={styles.settingsConfirmText}>{backupImportState.status}</Text> : null}
            </View>

            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>Reset local data</Text>
              <Text style={styles.settingsBodyText}>Removes this local profile, preferences, feedback, Saved Sessions, recent history, current session, and downloaded media. There is no automatic account recovery.</Text>
              <View style={styles.settingsActionRow}>
                <ProofButton
                  label={localDataResetPhase === "confirm" ? "Confirm reset local data" : localDataResetPhase === "deleting" ? "Resetting local data…" : "Reset local data"}
                  onPress={() => { handleResetLocalData().catch(() => undefined); }}
                  disabled={localDataResetPhase === "deleting"}
                  secondary
                  compact
                />
                {localDataResetPhase === "confirm" ? <ProofButton label="Cancel reset" onPress={() => setLocalDataResetPhase("idle")} compact /> : null}
              </View>
              {localDataResetPhase === "confirm" ? <Text style={styles.settingsConfirmText}>Nothing has been deleted yet. Confirm to begin irreversible local deletion, or cancel.</Text> : null}
            </View>

            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>Session</Text>
              <Text style={styles.settingsBodyText}>Stops audio + timer and returns Player to no session. Saved and Recent stay.</Text>
              <ProofButton label="Clear current session" onPress={handleClearCurrentSessionFromSettings} secondary compact />
            </View>

            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>Preferences</Text>
              <Text style={styles.settingsBodyText}>Default timer</Text>
              <View style={styles.settingsChipRow}>
                {sessionTimerOptions.map((durationMinutes) => {
                  const selected = defaultTimerPreference === durationMinutes;
                  return (
                    <Pressable
                      accessibilityLabel={durationMinutes === 0 ? "Default timer Off" : `Default timer ${durationMinutes} minutes`}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      key={`settings-default-timer-${durationMinutes}`}
                      onPress={() => handleSelectDefaultTimerPreference(durationMinutes)}
                      style={({ pressed }) => [
                        styles.settingsChip,
                        selected ? styles.settingsChipSelected : null,
                        pressed ? styles.pressedSoundRow : null,
                      ]}
                    >
                      <Text style={[styles.settingsChipText, selected ? styles.settingsChipTextSelected : null]}>
                        {durationMinutes === 0 ? "Off" : `${durationMinutes}m`}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.settingsBodyText}>Start tab</Text>
              <View style={styles.settingsChipRow}>
                {mobileSectionNavOptions.map((option) => {
                  const selected = startTabPreference === option.key;
                  return (
                    <Pressable
                      accessibilityLabel={`Start tab ${option.label}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      key={`settings-start-tab-${option.key}`}
                      onPress={() => handleSelectStartTabPreference(option.key)}
                      style={({ pressed }) => [
                        styles.settingsChip,
                        selected ? styles.settingsChipSelected : null,
                        pressed ? styles.pressedSoundRow : null,
                      ]}
                    >
                      <Text style={[styles.settingsChipText, selected ? styles.settingsChipTextSelected : null]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>Personalization</Text>
              <Text style={styles.settingsBodyText}>Personalization stays on this device.</Text>
              <Text style={styles.settingsBodyText}>Stored on this device.</Text>
              <Text style={styles.settingsBodyText}>
                {preferenceSummary.likedSounds} liked sounds · {preferenceSummary.notForMeSounds} not-for-me sounds · {preferenceSummary.avoidedSounds} avoided sounds
              </Text>
              <Text style={styles.settingsBodyText}>
                {preferenceSummary.likedRecipes} liked recipes · {preferenceSummary.notForMeRecipes} not-for-me recipes
              </Text>
              <Text style={styles.settingsBodyText}>
                {preferenceSummary.boostedPreferences} boosted preferences · {preferenceSummary.reducedPreferences} reduced preferences
              </Text>
              <ProofButton label="Reset personalization" onPress={handleResetPersonalization} secondary compact />
            </View>

            {mediaNotificationPermission?.status === "denied" || mediaNotificationPermission?.status === "blocked" ? (
              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>System media controls</Text>
                <Text style={styles.settingsBodyText}>
                  Soundscape can keep playing, but System media controls are unavailable. Enable notifications in Settings to use notification and lock-screen controls.
                </Text>
                <ProofButton
                  label="Open notification settings"
                  onPress={() => {
                    void audioService.openNotificationSettings().catch(() => Linking.openSettings());
                  }}
                  secondary
                  compact
                />
              </View>
            ) : null}

            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>About voice recordings</Text>
              <Text style={styles.settingsBodyText}>
                Voice recordings are Choice-only and never start automatically; synthetic voices are labeled in Browse and sound details.
              </Text>
              <Text style={styles.settingsBodyText}>
                A Synthetic voice label describes how the audio was generated. It does not claim a human performer or imitate a named person.
              </Text>
            </View>

            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>Build & diagnostics</Text>
              <Text style={styles.settingsBodyText}>{appIterationInfo.displayLabel}</Text>
              <Text style={styles.settingsBodyText}>Update channel: {updateDiagnostics.channel}</Text>
              <Text style={styles.settingsBodyText}>Runtime: {updateDiagnostics.runtimeVersion}</Text>
              <Text style={styles.settingsBodyText}>Update ID: {updateDiagnostics.updateId}</Text>
              <Text style={styles.settingsBodyText}>Launch source: {updateDiagnostics.launchSource}</Text>
              <Text style={styles.settingsBodyText}>Recovery launch: {updateDiagnostics.recoveryLaunch}</Text>
              <Text style={styles.settingsBodyText}>Codename: {appIterationInfo.codename}</Text>
              <Text style={styles.settingsBodyText}>Contracts: {appIterationInfo.contractVersions}</Text>
              <Text style={styles.settingsBodyText}>Catalog evidence: {appIterationInfo.evidenceStatus}</Text>
              <Text style={styles.settingsBodyText}>Preview build for device review.</Text>
            </View>

            <View style={[styles.settingsSection, styles.settingsDiagnosticSection]}>
              <Text style={styles.settingsDiagnosticTitle}>Alpha diagnostic · Playback timing trace</Text>
              <Text style={styles.settingsDiagnosticHelper}>Only needed when playback feels delayed.</Text>
              <ProofButton
                label={playbackTraceEnabled ? "Disable playback trace" : "Enable playback trace"}
                onPress={handleTogglePlaybackTimingTrace}
                secondary={!playbackTraceEnabled}
                compact
              />
              <Text style={styles.settingsBodyText}>
                Run Fast Start, Start, Replay, Pause, Resume, then paste this trace.
              </Text>
              <PlaybackTimingTraceDisplay
                ref={playbackTimingTraceDisplayRef}
                entries={playbackTimingTraceEntriesRef.current}
              />
              <ProofButton label="Clear playback timing trace" onPress={handleClearPlaybackTimingTrace} secondary compact />
            </View>

          </View>
        ) : null}

        {!settingsOpen && activeSectionKey === "fast-start" ? (
        <View style={styles.fastStartCard}>
          <Text style={styles.fastStartEyebrow}>Quick start</Text>
          <Text style={styles.fastStartTitle}>What sounds good right now?</Text>
          <Text style={styles.fastStartDescription}>
            Describe a sound and add an avoidance like “no rain.”
          </Text>
          <View style={styles.fastStartSearchBox}>
            <TextInput
              accessibilityLabel="Fast Start search"
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setFastStartSearchText}
              multiline={false}
              numberOfLines={1}
              onSubmitEditing={() => {
                handleSearchSubmit().catch((searchError: unknown) => {
                  setError(formatError(searchError));
                });
              }}
              placeholder="Try rain, fan, paper..."
              placeholderTextColor={visualTheme.textSubtle}
              returnKeyType="search"
              style={styles.fastStartInput}
              value={fastStartSearchText}
            />
            <View style={styles.fastStartSearchActions}>
              <ProofButton label="Find sounds" onPress={handleSearchSubmit} compact />
              {fastStartSearchText || activeAvoidedIntents.length ? (
                <ProofButton label="Clear" onPress={handleClearSearch} secondary compact />
              ) : null}
            </View>
          </View>

          {activeAvoidedIntents.length ? (
            <View style={styles.activeAvoidanceBox}>
              <Text style={styles.activeAvoidanceTitle}>Avoiding: {activeAvoidanceLabel}</Text>
              <Text style={styles.activeAvoidanceText}>
                Avoided sounds are marked and unavailable in Fast Start chips, alternatives,
                presets, and browse until you tap Clear.
              </Text>
            </View>
          ) : null}

          <View style={styles.fastStartChipWrap}>
            {fastStartOptions.map((option) => {
              const selected = option.soundId === (fastStartResultSound?.id ?? selectedSound.id);
              const optionSound = mobileCatalogSounds.find(
                (catalogSound) => catalogSound.id === option.soundId,
              );
              const avoided = optionSound
                ? matchesAnyIntent(optionSound, activeAvoidedIntents)
                : false;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected, disabled: avoided }}
                  key={option.label}
                  onPress={() => {
                    handleFastStart(option).catch((fastStartError: unknown) => {
                      setError(formatError(fastStartError));
                    });
                  }}
                  style={({ pressed }) => [
                    styles.fastStartChip,
                    selected ? styles.fastStartChipSelected : null,
                    avoided ? styles.avoidedRow : null,
                    pressed ? styles.pressedSoundRow : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.fastStartChipText,
                      selected ? styles.fastStartChipTextSelected : null,
                      avoided ? styles.avoidedText : null,
                    ]}
                  >
                    {option.label}{avoided ? " · Avoided" : ""}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {fastStartMessage ? (
            <Text
              style={[
                styles.fastStartMatchNote,
                fastStartMessageTone === "notice" ? styles.fastStartNoticeNote : null,
                fastStartMessageTone === "no-match" ? styles.fastStartNoMatchNote : null,
              ]}
            >
              {fastStartMessage}
            </Text>
          ) : null}
          {fastStartResultSound ? (
            <View style={styles.fastStartResultCard}>
              <Text style={styles.fastStartResultEyebrow}>Fast Start result</Text>
              <Text style={styles.fastStartWhyText}>{getFastStartPrimaryRecommendationCopy(fastStartPrimaryRecommendation)}</Text>
              <Text style={styles.fastStartHelperText}>Start one sound now, or choose the layered recipe below.</Text>
              <View style={styles.fastStartResultSection}>
                <Text style={styles.fastStartResultEyebrow}>Best sound · Quickest start</Text>
                <View style={styles.fastStartResultHeader}>
                  <View style={styles.soundRowText}>
                    <Text style={styles.soundTitle}>{fastStartResultSound.title}</Text>
                    <Text style={styles.soundSubtitle}>
                      {fastStartResultSound.lane} · {fastStartResultSound.subtitle}
                    </Text>
                  </View>
                </View>
                <View style={styles.fastStartResultPillRow}>
                  {fastStartPrimaryRecommendation === "sound" ? <Text style={styles.savedResultPill}>Recommended</Text> : null}
                  {fastStartResultSound.userChoiceOnly ? <Text style={styles.clearLabelPill}>Choice</Text> : null}
                  {savedSoundIds.includes(fastStartResultSound.id) ? (
                    <Text style={styles.savedResultPill}>Saved</Text>
                  ) : null}
                </View>
                {fastStartResultSound.userChoiceOnly ? (
                  <Text style={styles.fastStartChoiceNote}>Opt-in sound — shown because you searched for this type.</Text>
                ) : null}
                <Text style={styles.fastStartResultTags}>
                  {formatSoundUserTags(fastStartResultSound)}
                </Text>
                {fastStartResultWhy ? (
                  <View style={styles.fastStartWhyBox}>
                    <Text style={styles.fastStartResultEyebrow}>Why it matched</Text>
                    <Text style={styles.fastStartWhyText}>{fastStartResultWhy}</Text>
                    <Text style={styles.fastStartWhyText}>Player remains ready after you start playback.</Text>
                  </View>
                ) : null}
                <View style={styles.fastStartResultActions}>
                  <ProofButton
                    label={
                      fastStartResultSound && loadedSoundId === fastStartResultSound.id && isPlaying
                        ? "Replay sound"
                        : startingThisBestSound
                          ? "Starting..."
                          : failedStartingThisBestSound
                            ? "Retry"
                            : "Start best sound"
                    }
                    onPress={() => {
                      handleStartFastStartBestSound().catch((fastStartPlayError: unknown) => {
                        setError(formatError(fastStartPlayError));
                      });
                    }}
                    compact
                    disabled={startingThisBestSound}
                  />
                  <ProofButton
                    label="Open Player"
                    onPress={() => {
                      handleOpenFastStartResultInPlayer().catch((fastStartOpenPlayerError: unknown) => {
                        setError(formatError(fastStartOpenPlayerError));
                      });
                    }}
                    secondary
                    compact
                  />
                  <ProofButton
                    label={savedSoundIds.includes(fastStartResultSound.id) ? "Saved ✓" : "Save"}
                    onPress={() => toggleSavedSound(fastStartResultSound)}
                    secondary={savedSoundIds.includes(fastStartResultSound.id)}
                    compact
                  />
                  <ProofButton
                    label="Save as session"
                    onPress={() => openSavedSessionDialog(
                      "create",
                      buildSavedSessionDraftForSound(fastStartResultSound, "Fast Start"),
                    )}
                    secondary
                    compact
                  />
                </View>
                {renderSoundFeedbackControls(fastStartResultSound)}
              </View>

              <View style={styles.fastStartResultSection}>
                <View style={styles.fastStartResultHeader}>
                  <View style={styles.soundRowText}>
                    <Text style={styles.fastStartResultEyebrow}>Generated recipe · Layered option</Text>
                    <Text style={styles.soundTitle}>
                      {fastStartRecipeGenerating
                        ? "Generating recipe…"
                        : fastStartRecipeAvailability.available && fastStartGeneratedRecipePreset
                        ? fastStartGeneratedRecipePreset.title
                        : "No safe mix generated"}
                    </Text>
                    <Text style={styles.soundSubtitle}>
                      {fastStartRecipeGenerating
                        ? "Your sound result is ready now. The layered option is being generated after this screen updates."
                        : fastStartRecipeAvailability.available && fastStartGeneratedRecipePreset
                        ? fastStartGeneratedRecipePreset.subtitle
                        : fastStartRecipeAvailability.note ?? "A single sound is safer than a forced mix for this request."}
                    </Text>
                  </View>
                </View>
                {fastStartPrimaryRecommendation === "recipe" ? (
                  <View style={styles.fastStartResultPillRow}>
                    <Text style={styles.savedResultPill}>Recommended</Text>
                  </View>
                ) : null}

                {fastStartRecommendation?.allowUserChoice ? (
                  <Text style={styles.fastStartChoiceNote}>Choice sounds require an explicit request. Choice/opt-in layer labels are shown below.</Text>
                ) : null}
                {!fastStartRecommendation?.allowUserChoice && fastStartRecommendation?.recipeIntent && isExplicitOptInChoiceQuery(normalizeFastStartText(fastStartRecommendation.recipeIntent), activeAvoidedIntents) ? (
                  <Text style={styles.fastStartChoiceNote}>Choice sounds require an explicit request.</Text>
                ) : null}

                {fastStartRecipeAvailability.available && fastStartGeneratedRecipePreset?.layeredPreview ? (
                  <>
                    <View style={styles.generatedLayerList}>
                      {fastStartGeneratedRecipePreset.layeredPreview.layers.map((layer) => {
                        const layerSound = soundById.get(layer.soundId);
                        return (
                          <View style={styles.generatedLayerRow} key={`${fastStartGeneratedRecipePreset.id}-${layer.role}-${layer.soundId}`}>
                            <View style={styles.soundRowText}>
                              <Text style={styles.fastStartResultEyebrow}>{formatFastStartRecipeLayerRole(layer.role)}</Text>
                              <Text style={styles.soundTitle}>{layer.label}</Text>
                              <Text style={styles.soundSubtitle}>
                                {layerSound?.userChoiceOnly ? "Choice/opt-in layer · " : ""}{layer.balanceLabel.toLowerCase()} blend
                              </Text>
                            </View>
                            {layerSound?.userChoiceOnly ? (
                              <View style={styles.fastStartResultPillRow}>
                                <Text style={styles.clearLabelPill}>Choice</Text>
                              </View>
                            ) : null}
                          </View>
                        );
                      })}
                    </View>
                    <View style={styles.fastStartWhyBox}>
                      <Text style={styles.fastStartResultEyebrow}>Why this recipe</Text>
                      {(fastStartGeneratedRecipePreset.generatedWhy ?? []).slice(0, 3).map((whyLine) => (
                        <Text style={styles.fastStartWhyText} key={whyLine}>• {whyLine}</Text>
                      ))}
                      {(fastStartGeneratedRecipePreset.generatedWarnings ?? []).slice(0, 2).map((warningLine) => (
                        <Text style={styles.fastStartWhyText} key={warningLine}>• {warningLine}</Text>
                      ))}
                    </View>
                    <View style={styles.fastStartResultActions}>
                      <ProofButton
                        label="Start generated recipe"
                        onPress={() => {
                          handleStartFastStartGeneratedRecipe().catch((recipeStartError: unknown) => {
                            setError(formatError(recipeStartError));
                          });
                        }}
                        compact
                      />
                      <ProofButton
                        label="Try another recipe"
                        onPress={() => {
                          handleTryAnotherFastStartRecipe().catch((recipeSeedError: unknown) => {
                            setError(formatError(recipeSeedError));
                          });
                        }}
                        secondary
                        compact
                      />
                      <ProofButton
                        label="Open Player"
                        onPress={() => {
                          handleStartFastStartGeneratedRecipe("open-player").catch((recipeOpenError: unknown) => {
                            setError(formatError(recipeOpenError));
                          });
                        }}
                        secondary
                        compact
                      />
                      <ProofButton
                        label="Save session"
                        onPress={() => openSavedSessionDialog(
                          "create",
                          buildSavedSessionDraftForPreset(fastStartGeneratedRecipePreset, "Generated Recipe"),
                        )}
                        secondary
                        compact
                      />
                    </View>
                    <View style={styles.fastStartResultActions}>
                      <ProofButton label="More texture" onPress={() => handleRefineFastStartRecipe("more-texture")} secondary compact />
                      <ProofButton label="Softer" onPress={() => handleRefineFastStartRecipe("softer")} secondary compact />
                      <ProofButton label="Less water" onPress={() => handleRefineFastStartRecipe("less-water")} secondary compact />
                    </View>
                    {renderRecipeFeedbackControls(fastStartGeneratedRecipe, fastStartGeneratedRecipePreset)}
                  </>
                ) : (
                  <Text style={styles.fastStartWhyText}>
                    {fastStartRecipeGenerating
                      ? "Generating the layered option… playback controls remain available."
                      : fastStartRecipeAvailability.note ?? "A single sound is safer than a forced mix for this request."}
                  </Text>
                )}
              </View>
            </View>
          ) : null}

          {fastStartAlternatives.length ? (
            <View style={styles.fastStartAlternativesBox}>
              <Text style={styles.fastStartAlternativesTitle}>Alternatives — tap to preview here</Text>
              {fastStartAlternatives.map((catalogSound) => (
                <Pressable
                  accessibilityRole="button"
                  key={`fast-start-alternative-${catalogSound.id}`}
                  onPress={() => {
                    handleSelectAlternative(catalogSound).catch((alternativeError: unknown) => {
                      setError(formatError(alternativeError));
                    });
                  }}
                  style={({ pressed }) => [
                    styles.fastStartAlternativeRow,
                    pressed ? styles.pressedSoundRow : null,
                  ]}
                >
                  <View style={styles.fastStartAlternativeTextBlock}>
                    <Text style={styles.soundTitle}>{catalogSound.title}</Text>
                    <Text style={styles.soundSubtitle}>
                      {catalogSound.lane} · {catalogSound.subtitle}
                    </Text>
                    <Text style={styles.fastStartAlternativeMeta}>
                      {formatSoundUserTags(catalogSound)}{savedSoundIds.includes(catalogSound.id) ? " · Saved" : ""}
                    </Text>
                  </View>
                  {catalogSound.clearLabelRequired || catalogSound.userChoiceOnly ? (
                    <View style={styles.fastStartResultPillRow}>
                      <Text style={styles.clearLabelPill}>Choice</Text>
                    </View>
                  ) : null}
                  {renderSoundFeedbackControls(catalogSound)}
                </Pressable>
              ))}
            </View>
          ) : null}
          {renderFastStartCurrentSessionControls()}
        </View>
        ) : null}

        {!settingsOpen && activeSectionKey === "presets" ? (
        <View style={styles.presetCard}>
          <Text style={styles.presetEyebrow}>Presets</Text>
          <Text style={styles.presetTitle}>Create a soundscape</Text>
          <Text style={styles.presetDescription}>
            Choose a mood and how layered you want the mix.
          </Text>

          <View style={styles.builderControlBox}>
            <Text style={styles.builderControlLabel}>Mood</Text>
            <View style={styles.builderChipWrap}>
              {builderIntentOptions.map((option) => {
                const selected = option.key === builderIntentKey;
                return (
                  <Pressable
                    accessibilityLabel={`${option.label}. ${selected ? "Selected intent" : "Select intent"}. ${option.helper}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={option.key}
                    onPress={() => {
                      setBuilderIntentKey(option.key);
                      setBuilderSeed(0);
                      requestBuilderRecipeGeneration(option, builderDensity, 0, "mood");
                    }}
                    style={({ pressed }) => [
                      styles.builderIntentChip,
                      styles.presetSelectableOption,
                      selected ? styles.builderIntentChipSelected : null,
                      pressed ? styles.pressedSoundRow : null,
                    ]}
                  >
                    <View style={styles.builderIntentHeaderRow}>
                      <Text style={[styles.builderIntentText, selected ? styles.builderIntentTextSelected : null]}>
                        {option.label}
                      </Text>
                    </View>
                    <Text style={[styles.builderIntentHelper, selected ? styles.builderIntentHelperSelected : null]}>
                      {option.helper}
                    </Text>
                    <PresetSelectedIndicator selected={selected} />
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.builderControlLabel}>Layers</Text>
            <View style={[
              styles.builderDensityRow,
              styles.presetLayerChoiceRow,
              presetLayerChoiceLayout.mode === "stacked" ? styles.compactThreeColumnRowStacked : null,
            ]}>
              {builderDensityOptions.map((option) => {
                const selected = option.key === builderDensity;
                return (
                  <Pressable
                    accessibilityLabel={`${option.label}. ${selected ? "Selected density" : "Select density"}. ${option.helper}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={option.key}
                    onPress={() => {
                      setBuilderDensity(option.key);
                      setBuilderSeed(0);
                      requestBuilderRecipeGeneration(selectedBuilderIntent, option.key, 0, "layers");
                    }}
                    style={({ pressed }) => [
                      styles.builderDensityChip,
                      styles.presetSelectableOption,
                      presetLayerChoiceLayout.mode === "stacked"
                        ? styles.presetLayerChoiceItemStacked
                        : styles.presetLayerChoiceItem,
                      selected ? styles.builderDensityChipSelected : null,
                      pressed ? styles.pressedSoundRow : null,
                    ]}
                  >
                    <View style={styles.builderDensityHeaderRow}>
                      <Text
                        adjustsFontSizeToFit
                        ellipsizeMode="clip"
                        minimumFontScale={0.84}
                        numberOfLines={1}
                        style={[styles.builderDensityText, selected ? styles.builderDensityTextSelected : null]}
                      >
                        {option.label}
                      </Text>
                    </View>
                    <Text style={[styles.builderDensityHelper, selected ? styles.builderDensityHelperSelected : null]}>
                      {option.helper}
                    </Text>
                    <PresetSelectedIndicator selected={selected} />
                  </Pressable>
                );
              })}
            </View>
          </View>

          {generatedBuilderPreset && generatedBuilderRecipe ? (
            <View style={styles.generatedRecipeCard}>
              <View style={styles.generatedRecipeHeaderRow}>
                <View style={styles.generatedRecipeTitleBlock}>
                  <Text style={styles.generatedRecipeEyebrow}>
                    {generatedBuilderRecipe.layers.length === 1 ? "Single sound ready" : "Recipe ready"}
                  </Text>
                  <Text style={styles.generatedRecipeTitle}>{generatedBuilderPreset.title}</Text>
                  <Text style={styles.generatedRecipeSummary}>{generatedBuilderPreset.subtitle}</Text>
                </View>
                <View accessibilityLiveRegion="polite" style={styles.generatedRecipeStatusSlot}>
                  <Text style={styles.generatedRecipeStatusText}>{builderRecipeGenerating ? "Building…" : "Recipe ready"}</Text>
                </View>
                {generatedBuilderPreset.userChoiceOnly ? <Text style={styles.clearLabelPill}>Choice</Text> : null}
              </View>
              <Pressable
                accessibilityLabel="Why this mix"
                accessibilityRole="button"
                accessibilityState={{ expanded: whyThisMixOpen }}
                onPress={() => setWhyThisMixOpen((open) => !open)}
                style={({ pressed }) => [styles.disclosureButton, pressed ? styles.pressedSoundRow : null]}
              >
                <Text style={styles.disclosureButtonText}>Why this mix {whyThisMixOpen ? "−" : "+"}</Text>
              </Pressable>
              {whyThisMixOpen ? (
                <View style={styles.generatedWhyBox}>
                  {(activeBuilderModel?.why ?? generatedBuilderRecipe.whyThisRecipe).map((reason) => (
                    <Text key={reason} style={styles.generatedWhyText}>• {reason}</Text>
                  ))}
                  {(activeBuilderModel?.warnings ?? generatedBuilderRecipe.warnings).map((warning) => (
                    <Text key={warning} style={styles.generatedWarningText}>• {warning}</Text>
                  ))}
                </View>
              ) : null}
              <View style={styles.generatedLayerList}>
                {generatedBuilderRecipe.layers.map((layer) => {
                  const catalogSound = soundById.get(layer.soundId);
                  return (
                    <View key={`${generatedBuilderRecipe.id}-${layer.role}-${layer.soundId}`} style={styles.generatedLayerRow}>
                      <View style={styles.recipeLayerTextBlock}>
                        <Text style={styles.recipeLayerRole}>{formatRecipeRoleLabel(layer.role)}</Text>
                        <Text style={styles.recipeLayerName}>{layer.title}</Text>
                        <Text style={styles.layeredPreviewLayerMeta}>
                          {catalogSound?.lane ?? "Library"} · {getConsumerLayerExplanation(layer.role)}
                        </Text>
                      </View>
                      {layer.userChoiceOnly || catalogSound?.userChoiceOnly ? <Text style={styles.clearLabelPill}>Choice</Text> : null}
                    </View>
                  );
                })}
              </View>
              {generatedBuilderPreset.userChoiceOnly ? (
                <Text style={styles.fastStartChoiceNote}>Choice · explicit opt-in for tones and bowls. Nothing starts automatically.</Text>
              ) : null}
              <View style={[
                styles.generatedRecipeActions,
                styles.compactThreeColumnRow,
                useCompactThreeColumnFallback ? styles.compactThreeColumnRowStacked : null,
              ]}>
                <ProofButton
                  label={generatedBuilderRecipe.layers.length === 1 ? "Use single sound" : "Use this mix"}
                  onPress={handleUseGeneratedBuilderResult}
                  balancedAction={!useCompactThreeColumnFallback}
                  fullWidth={useCompactThreeColumnFallback}
                  compact
                />
                <ProofButton
                  label="Try another"
                  onPress={handleTryAnotherGeneratedRecipe}
                  balancedAction={!useCompactThreeColumnFallback}
                  fullWidth={useCompactThreeColumnFallback}
                  secondary
                  compact
                />
                <ProofButton
                  label="Save session"
                  onPress={() => openSavedSessionDialog(
                    "create",
                    buildSavedSessionDraftForGeneratedBuilderResult(),
                  )}
                  balancedAction={!useCompactThreeColumnFallback}
                  fullWidth={useCompactThreeColumnFallback}
                  secondary
                  compact
                />
              </View>
              <Pressable
                accessibilityLabel={recipeFeedbackOpen ? "Hide mix feedback" : "Mix feedback"}
                accessibilityRole="button"
                accessibilityState={{ expanded: recipeFeedbackOpen }}
                onPress={() => setRecipeFeedbackOpen((open) => !open)}
                style={({ pressed }) => [styles.tertiaryDisclosureButton, pressed ? styles.pressedSoundRow : null]}
              >
                <Text style={styles.tertiaryDisclosureText}>{recipeFeedbackOpen ? "Hide feedback" : "Feedback"}</Text>
              </Pressable>
              {recipeFeedbackOpen ? renderRecipeFeedbackControls(generatedBuilderRecipe, generatedBuilderPreset) : null}
            </View>
          ) : (
            <View style={styles.generatedRecipeCard}>
              <Text style={styles.generatedRecipeEyebrow}>Mix status</Text>
              <Text style={styles.generatedRecipeTitle}>
                {builderRecipeGenerating ? "Building your mix…" : generatedBuilderRecipe ? "Recipe unavailable" : "Choose Mood or Layers"}
              </Text>
              <Text style={styles.generatedRecipeSummary}>
                {builderRecipeGenerating
                  ? "Your selection is visible now. Generation begins after this screen updates."
                  : generatedBuilderRecipe
                  ? `Unavailable in Player: ${generatedBuilderRecipe.layers.filter((layer) => !soundById.has(layer.soundId)).map((layer) => layer.title).join(", ")}. No layer was transferred.`
                  : generatedBuilderRecipeResult?.rejectedReasonSummary ?? "Tap a Mood or Layers choice to build a mix."}
              </Text>
            </View>
          )}

          <Text style={styles.curatedPresetHeading}>Curated presets</Text>
          <View style={styles.presetList}>
            {mobileBuilderPresets.map((preset) => {
              const selected = selectedPreset?.id === preset.id;
              const avoidedConflictSound = getPresetAvoidedConflictSound(preset, activeAvoidedIntents);
              const avoided = Boolean(avoidedConflictSound);
              return (
                <Pressable
                  accessibilityLabel={`${preset.title}. ${selected ? "Selected preset" : avoided ? "Unavailable because it conflicts with an avoidance" : "Select preset"}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected, disabled: avoided }}
                  disabled={avoided}
                  key={preset.id}
                  onPress={() => {
                    handleSelectPreset(preset).catch((presetError: unknown) => {
                      setError(formatError(presetError));
                    });
                  }}
                  style={({ pressed }) => [
                    styles.presetRow,
                    selected ? styles.selectedPresetRow : null,
                    avoided ? styles.avoidedRow : null,
                    pressed ? styles.pressedSoundRow : null,
                  ]}
                >
                  <View style={styles.presetRowText}>
                    <Text style={styles.presetRowTitle}>{preset.title}</Text>
                    <Text style={styles.presetRowSubtitle}>{preset.subtitle}</Text>
                    <Text style={styles.presetLayerSummary}>
                      {preset.layers.length} layers · {Array.from(new Set(preset.layers.map((layer) => layer.role))).join(" + ")}
                    </Text>
                    <View style={styles.compactPresetActionRow}>
                      <ProofButton
                        accessibilityLabel={`Preview ${preset.title}`}
                        label="Preview"
                        onPress={() => {
                          handleSelectPreset(preset).catch((presetError: unknown) => setError(formatError(presetError)));
                        }}
                        disabled={avoided}
                        compact
                      />
                      {selected ? <Text accessibilityLiveRegion="polite" style={styles.presetSelectedText}>Selected ✓</Text> : null}
                      {preset.layeredPreview && !avoided ? <Text style={styles.layeredPreviewPill}>Layered</Text> : null}
                      {avoided ? <Text style={styles.avoidedPill}>Avoided</Text> : null}
                      {preset.clearLabelRequired || preset.userChoiceOnly ? <Text style={styles.clearLabelPill}>Choice</Text> : null}
                    </View>
                  </View>
                  <View
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                    pointerEvents="none"
                    style={[styles.presetSelectionIndicatorSlot, selected ? styles.selectionIndicatorSlotSelected : null]}
                  >
                    <Text style={styles.selectionIndicatorText}>{selected ? "✓" : ""}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
        ) : null}

        {!settingsOpen && activeSectionKey === "player" ? (
        <View style={styles.selectedCard}>
          {currentSession ? (
            <>
              <View style={styles.currentSessionHeader}>
                <View style={styles.currentSessionTitleBlock}>
                  <Text style={styles.contractLabel}>Current session</Text>
                  <Text style={styles.selectedTitle}>{currentSession.title}</Text>
                  <Text style={styles.sessionMetaLine}>
                    {currentSessionModeLabel} · From {currentSessionSourceLabel}
                  </Text>
                </View>
                <Text style={styles.sessionModePill}>{currentSessionModeLabel}</Text>
              </View>

              <View accessibilityLabel="Player transport controls" style={styles.playerTransportBox}>
                <View style={styles.sessionControlHeaderRow}>
                  <View style={styles.sessionControlTitleBlock}>
                    <Text style={[styles.sessionControlEyebrow, styles.playerTransportEyebrow]}>Playback</Text>
                    <Text accessibilityLiveRegion="polite" style={styles.playerTransportStatus}>
                      {activePlaybackStatusLabel}
                    </Text>
                  </View>
                </View>
                <View style={styles.playerTransportRow}>
                  {currentSession.type === "single" ? (
                    <ProofButton
                      accessibilityLabel={`${singlePlayButtonLabel} ${selectedSound.title}`}
                      label={singlePlayButtonLabel}
                      onPress={isPlaying ? handlePause : singlePlaybackEnded ? handleReplay : handlePlay}
                      disabled={sessionStopInProgress || singlePlaybackCommandInFlight}
                      fixedTransportAction
                      compact
                    />
                  ) : (
                    <ProofButton
                      accessibilityLabel={layeredPlayAccessibilityLabel}
                      label={layeredPlayButtonLabel}
                      onPress={() => runUserPlaybackAction(
                        layeredSelectionPending
                          ? handleLayeredPreviewResume
                          : layeredPreviewStatus === "playing"
                            ? handleLayeredPreviewPause
                            : layeredPlaybackEnded
                              ? handleLayeredPreviewReplay
                              : handleLayeredPreviewResume,
                      )}
                      disabled={sessionStopInProgress || layeredSelectionPending || layeredPreviewStatus === "loading"}
                      fixedTransportAction
                      compact
                    />
                  )}
                  <ProofButton
                    accessibilityLabel={sessionStopInProgress ? "Stopping playback" : "Stop playback"}
                    label={sessionStopInProgress ? "Stopping…" : "Stop"}
                    onPress={() => runUserPlaybackAction(handleStopSession)}
                    disabled={sessionStopInProgress}
                    busy={sessionStopInProgress}
                    fixedTransportAction
                    secondary
                    compact
                  />
                  <ProofButton
                    accessibilityLabel={activeSessionLoopEligible
                      ? isLoopEnabled ? "Turn Loop Off" : "Turn Loop On"
                      : "Loop unavailable because an active sound is not loop-approved"}
                    accessibilityHint={loopHelperLabel}
                    label={miniLoopButtonLabel}
                    onPress={() => runUserPlaybackAction(handleToggleLoop)}
                    disabled={sessionStopInProgress || singlePlaybackCommandInFlight || layeredPreviewStatus === "loading" || !activeSessionLoopEligible}
                    unavailable={!activeSessionLoopEligible}
                    secondary={!isLoopEnabled}
                    fixedTransportAction
                    compact
                  />
                </View>
                {currentSession.type === "single" ? (
                  <ReplayOptimisticProgressDisplay
                    positionMillis={positionMillis}
                    progressDurationMillis={progressDurationMillis}
                    isPlaying={isPlaying}
                    isForeground={playbackProjectionForeground}
                    isRecipeSession={false}
                    hasProgressDuration={hasProgressDuration}
                    disabled={!hasProgressDuration || singlePlaybackCommandInFlight}
                    seekPanResponder={seekPanResponder}
                    onLayout={handleProgressTrackLayout}
                    onAccessibilityAdjust={handleAccessibleSeek}
                    onCommit={handleFullClockCommit}
                  />
                ) : (
                  <Text style={styles.playerTransportMeta}>
                    Layered soundscape · {activeLayeredPreviewLayers.length} active layer{activeLayeredPreviewLayers.length === 1 ? "" : "s"}
                  </Text>
                )}
                {currentSession.type === "single" ? (
                  <Text style={styles.playerTransportMeta}>
                    {selectedSound.lane} · {formatDurationFromSeconds(selectedSound.durationSeconds)}
                  </Text>
                ) : null}
                {layeredSelectionPending || layeredPreviewStatus === "loading" ? <ActivityIndicator color={visualTheme.accentSeaGlass} /> : null}
                {layeredPreviewError ? (
                  <Text accessibilityLiveRegion="polite" numberOfLines={3} style={styles.miniErrorText}>
                    {layeredPreviewError}
                  </Text>
                ) : null}
              </View>

              <View style={styles.playerQuickFeedbackBox}>
                <Text style={styles.sessionControlEyebrow}>Quick feedback</Text>
                <Text style={styles.feedbackHelperText}>One tap trains the current sound or complete recipe.</Text>
                {renderActiveQuickFeedbackControls()}
              </View>

              <View style={styles.sessionControlBox}>
                <View style={styles.sessionControlHeaderRow}>
                  <View style={styles.sessionControlTitleBlock}>
                    <Text style={styles.sessionControlEyebrow}>Timer</Text>
                    <Text accessibilityLiveRegion="polite" style={styles.sessionControlStatus}>
                      {timerStatusLabel}
                    </Text>
                  </View>
                </View>
                <View accessibilityHint="The timer keeps counting while playback is paused." style={styles.timerChipRow}>
                  {sessionTimerOptions.map((durationMinutes) => {
                    const selected = timerOptionMinutes === durationMinutes;
                    return (
                      <Pressable
                        accessibilityLabel={durationMinutes === 0 ? "Timer Off" : `Timer ${durationMinutes} minutes`}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        key={`timer-${durationMinutes}`}
                        onPress={() => handleSelectTimerOption(durationMinutes)}
                        style={({ pressed }) => [
                          styles.timerChip,
                          selected ? styles.timerChipSelected : null,
                          pressed ? styles.pressedSoundRow : null,
                        ]}
                      >
                        <Text style={[styles.timerChipText, selected ? styles.timerChipTextSelected : null]}>
                          {durationMinutes === 0 ? "Off" : `${durationMinutes}m`}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={styles.sessionControlHint}>Audio fades out when the timer ends. Timer overrides loop.</Text>
              </View>

              <View style={styles.savedSessionCurrentActions}>
                <Text style={styles.savedSessionCurrentHint}>
                  {currentSavedSessionId
                    ? "This player was restored from a saved session. Keep your edits here or save a separate copy."
                    : "Keep this soundscape as a reusable local session."}
                </Text>
                <View style={styles.savedSessionActionRow}>
                  {currentSavedSessionId ? (
                    <>
                      <ProofButton
                        label="Update session"
                        onPress={() => openSavedSessionDialog(
                          "update",
                          buildCurrentSavedSessionDraft(),
                          currentSavedSessionId,
                        )}
                        compact
                      />
                      <ProofButton
                        label="Save as new"
                        onPress={() => openSavedSessionDialog(
                          "save-new",
                          buildCurrentSavedSessionDraft(),
                          currentSavedSessionId,
                        )}
                        secondary
                        compact
                      />
                    </>
                  ) : (
                    <ProofButton
                      label={currentSession.type === "recipe" ? "Save session" : "Save as session"}
                      onPress={() => openSavedSessionDialog("create", buildCurrentSavedSessionDraft(), undefined, true)}
                      compact
                    />
                  )}
                </View>
              </View>

              {selectedPreset ? (
                <>
                  {renderRecipeFeedbackControls(selectedPreset.generatedRecipe, selectedPreset)}
                  <Text style={styles.contractMeta}>{selectedPreset.subtitle}</Text>
                  <Text style={styles.contractMeta}>Single sound: {selectedSound.title}</Text>
                  {activeBuilderModel ? (
                    <View accessibilityLabel="Why this exact mix" style={styles.generatedWhyBox}>
                      <Text style={styles.generatedWhyTitle}>Why this exact mix</Text>
                      {activeBuilderModel.why.map((reason) => (
                        <Text key={reason} style={styles.generatedWhyText}>• {reason}</Text>
                      ))}
                      {activeBuilderModel.warnings.map((warning) => (
                        <Text key={warning} style={styles.generatedWarningText}>• {warning}</Text>
                      ))}
                      {activeBuilderModel.editExplanations.slice(-3).map((explanation) => (
                        <Text key={`${activeBuilderModel.editId}-${explanation}`} style={styles.layeredPreviewLayerHint}>Edit: {explanation}</Text>
                      ))}
                    </View>
                  ) : null}
                  {selectedRecipeConflictSound ? (
                    <Text style={styles.noticeText}>
                      This recipe uses {selectedRecipeConflictSound.title}, which is currently avoided. Choose a different recipe/layer or clear the avoidance.
                    </Text>
                  ) : null}
                  {selectedLayeredPreview ? (
                    <View style={styles.layeredPreviewBox}>
                      <Text style={styles.layeredPreviewText}>
                        Layers update the next play. The mini-player follows the active layered session.
                      </Text>
                      <View style={styles.layeredPreviewLayerList}>
                        {selectedLayeredPreview.layers.map((layer) => {
                          const layerKey = buildBuilderLayerKey(selectedPreset, layer);
                          const layerEnabled = isBuilderLayerEnabled(selectedPreset, layer, builderEnabledLayerKeys);
                          const currentLayer = getControlledPreviewLayer(selectedPreset, layer, builderLayerBalances, builderLayerSwaps);
                          const currentCatalogSound = soundById.get(currentLayer.soundId);
                          const offlineProjection = currentCatalogSound
                            ? projectLayerOfflineStateV1({
                                layerId: getBuilderLayerId(selectedPreset, layer),
                                layerName: currentCatalogSound.title,
                                catalogId: currentLayer.soundId,
                                mediaUri: currentCatalogSound.audioUrl,
                                role: builderRoleToRecipeRole(currentLayer.role),
                                enabled: layerEnabled,
                                rights: resolvePersistentDownloadRightsV1(currentLayer.soundId, currentCatalogSound.audioUrl),
                                manifestItem: offlineManifestItems.find((item) => item.assetId === currentLayer.soundId) ?? null,
                              })
                            : null;
                          const builderLayer = activeBuilderModel?.layers.find(
                            (modelLayer) => modelLayer.layerId === getBuilderLayerId(selectedPreset, layer),
                          );
                          const swapOptions = getLayerSwapOptionsForPreset(selectedPreset, layer).filter(
                            (catalogSound) => !matchesAnyIntent(catalogSound, activeAvoidedIntents),
                          );
                          return (
                            <View key={layerKey} style={styles.layeredPreviewLayerRowStack}>
                              <View style={styles.layeredPreviewLayerHeaderRow}>
                                <View style={styles.recipeLayerTextBlock}>
                                  <Text style={styles.layeredPreviewLayerName}>
                                    {layer.role}: {currentLayer.label}
                                  </Text>
                                  <Text style={styles.layeredPreviewLayerMeta}>
                                    {formatLayerRoleLabel(layer.role)} · {currentCatalogSound?.lane ?? "Library"} · {layer.role === "Background" ? "Required" : layerEnabled ? "Enabled" : "Disabled"}
                                  </Text>
                                  {builderLayer ? (
                                    <Text style={styles.layeredPreviewLayerHint}>Why: {builderLayer.reason}</Text>
                                  ) : null}
                                  {builderLayer?.userChoiceOnly || currentCatalogSound?.userChoiceOnly ? (
                                    <Text style={styles.fastStartChoiceNote}>Choice layer — explicitly selected.</Text>
                                  ) : null}
                                  {offlineProjection ? (
                                    <Text
                                      accessibilityLiveRegion="polite"
                                      numberOfLines={3}
                                      style={[styles.layeredPreviewLayerHint, styles.layerOfflineStatusText]}
                                    >
                                      {offlineProjection.customerCopy}
                                    </Text>
                                  ) : null}
                                </View>
                                <Text style={styles.layeredPreviewLayerBalance}>{currentLayer.balanceLabel}</Text>
                              </View>
                              <View style={styles.layerControlRow}>
                                {offlineProjection?.primaryAction && currentCatalogSound ? (
                                  <ProofButton
                                    label={offlineProjection.primaryAction.kind === "retry" ? "Retry download" : "Download for offline"}
                                    onPress={() => { handleDownloadLayerOffline(offlineProjection.layerId, currentCatalogSound).catch(() => undefined); }}
                                    disabled={!offlineManifestReady || offlineProjection.primaryAction.disabled}
                                    compact
                                  />
                                ) : null}
                                {offlineProjection?.secondaryAction && currentCatalogSound ? (
                                  <ProofButton
                                    label="Delete download"
                                    onPress={() => { handleDeleteLayerOffline(offlineProjection.layerId, currentCatalogSound).catch(() => undefined); }}
                                    disabled={!offlineManifestReady || offlineProjection.secondaryAction.disabled}
                                    secondary
                                    compact
                                  />
                                ) : null}
                                {layer.role !== "Background" ? (
                                  <ProofButton
                                    label={layerEnabled ? "Disable" : "Enable"}
                                    onPress={() => toggleBuilderLayer(layer)}
                                    secondary={layerEnabled}
                                    compact
                                  />
                                ) : null}
                                <View style={styles.balanceControlGroup}>
                                  <Text style={styles.layeredPreviewLayerHint}>
                                    Balance = how noticeable.
                                  </Text>
                                  <View style={styles.balanceChipRow}>
                                    {builderBalanceOptions.map((balance) => (
                                      <Pressable
                                        accessibilityLabel={`${balance}: ${getBalanceDescription(balance)}`}
                                        accessibilityRole="button"
                                        accessibilityState={{ selected: currentLayer.balanceLabel === balance }}
                                        key={`${layerKey}-${balance}`}
                                        onPress={() => {
                                          setBuilderLayerBalance(layer, balance).catch((balanceError: unknown) => {
                                            setLayeredPreviewError(formatError(balanceError));
                                          });
                                        }}
                                        style={[
                                          styles.balanceChip,
                                          currentLayer.balanceLabel === balance ? styles.balanceChipSelected : null,
                                        ]}
                                      >
                                        <Text
                                          style={[
                                            styles.balanceChipText,
                                            currentLayer.balanceLabel === balance ? styles.balanceChipTextSelected : null,
                                          ]}
                                        >
                                          {balance}
                                        </Text>
                                        <Text
                                          style={[
                                            styles.balanceChipSubtext,
                                            currentLayer.balanceLabel === balance ? styles.balanceChipSubtextSelected : null,
                                          ]}
                                        >
                                          {getBalanceDescription(balance)}
                                        </Text>
                                      </Pressable>
                                    ))}
                                  </View>
                                </View>
                                {swapOptions.length > 1 ? (
                                  <ProofButton
                                    label={`Try another ${layer.role.toLowerCase()}`}
                                    onPress={() => {
                                      swapBuilderLayer(layer).catch((swapError: unknown) => {
                                        setLayeredPreviewError(formatError(swapError));
                                      });
                                    }}
                                    secondary
                                    compact
                                  />
                                ) : null}
                              </View>
                              {swapOptions.length > 1 ? (
                                <Text style={styles.layeredPreviewLayerHint}>
                                  Swaps only this layer.
                                </Text>
                              ) : null}
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  ) : selectedPreset ? (
                    <Text style={styles.noticeText}>
                      This recipe does not have layered preview controls yet. Use the full Player for the starting sound.
                    </Text>
                  ) : null}
                </>
              ) : (
                <>
                  <View style={styles.playerSoundInfoBox}>
                    <Text style={styles.contractMeta}>{selectedSound.subtitle}</Text>
                    <Text style={styles.contractMeta}>
                      Lane: {selectedSound.lane} · Category: {selectedSound.category}
                    </Text>
                    <Text style={styles.soundTagLine}>{formatSoundUserTags(selectedSound)}</Text>
                    <View style={styles.playerActionRow}>
                      <ProofButton
                        label={selectedSoundIsSaved ? "Saved ✓" : "Save"}
                        onPress={() => toggleSavedSound(selectedSound)}
                        secondary={selectedSoundIsSaved}
                        compact
                      />
                    </View>
                    <View style={styles.compactSoundFeedbackControls}>{renderSoundFeedbackControls(selectedSound)}</View>
                  </View>
                  {relatedSounds.length ? (
                    <View style={styles.relatedSoundsBox}>
                      <Text style={styles.relatedSoundsTitle}>Try next</Text>
                      {relatedSounds.map((catalogSound) => (
                        <Pressable
                          accessibilityRole="button"
                          key={`related-${catalogSound.id}`}
                          onPress={() => {
                            handleSelectSound(catalogSound, "Player", false).catch((selectError: unknown) => {
                              setError(formatError(selectError));
                            });
                          }}
                          style={({ pressed }) => [styles.relatedSoundRow, pressed ? styles.pressedSoundRow : null]}
                        >
                          <Text numberOfLines={1} style={styles.relatedSoundTitle}>{catalogSound.title}</Text>
                          <Text style={styles.relatedSoundMeta}>{catalogSound.lane}</Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </>
              )}

              {selectedSound.clearLabelRequired ||
              selectedSound.userChoiceOnly ||
              selectedPreset?.clearLabelRequired ||
              selectedPreset?.userChoiceOnly ? (
                <Text style={styles.noticeText}>
                  Choice notice: {selectedPreset?.title ?? selectedSound.title} needs an explicit selection.
                  Play it only if you want this sound.
                </Text>
              ) : null}
            </>
          ) : (
            <View style={styles.emptySessionBox}>
              <Text style={styles.contractLabel}>Current session</Text>
              <Text style={styles.selectedTitle}>No session yet</Text>
              <Text style={styles.contractMeta}>Start quickly, or choose from Presets and Browse.</Text>
              <View style={styles.playerActionRow}>
                <ProofButton label="Fast Start" onPress={() => handleSectionJump("fast-start")} compact />
              </View>
              <View style={styles.emptySessionSecondaryRow}>
                <Pressable
                  accessibilityLabel="Open Presets"
                  accessibilityRole="button"
                  onPress={() => handleSectionJump("presets")}
                  style={({ pressed }) => [styles.emptySessionLink, pressed ? styles.pressedSoundRow : null]}
                >
                  <Text style={styles.emptySessionLinkText}>Presets</Text>
                </Pressable>
                <Pressable
                  accessibilityLabel="Open Browse"
                  accessibilityRole="button"
                  onPress={() => handleSectionJump("browse")}
                  style={({ pressed }) => [styles.emptySessionLink, pressed ? styles.pressedSoundRow : null]}
                >
                  <Text style={styles.emptySessionLinkText}>Browse</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
        ) : null}

        {!settingsOpen && activeSectionKey === "player" ? (
        <View
          onLayout={(event) => {
            const nextY = event.nativeEvent.layout.y;
            if (savedAreaContainerLayoutYRef.current === nextY) return;
            savedAreaContainerLayoutYRef.current = nextY;
            setSavedDestinationLayoutRevision((current) => current + 1);
          }}
          style={styles.localLibraryCard}
        >
          <Text style={styles.localLibraryEyebrow}>Saved area</Text>
          <Text style={styles.localLibraryDescription}>Saved on this device. Saved sounds are bookmarks; saved mixes restore your soundscape.</Text>
          <View accessibilityLabel="Saved area tabs" style={styles.savedAreaTabRow}>
            {([
              { key: "sounds" as const, label: "Saved sounds" },
              { key: "sessions" as const, label: "Saved mixes" },
            ]).map((tab) => {
              const selected = savedAreaTab === tab.key;
              return (
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  key={tab.key}
                  onPress={() => {
                    invalidateSavedDestinationIntent();
                    setPendingDeleteSessionId(null);
                    setManagedSavedSessionId(null);
                    setSavedAreaTab(tab.key);
                  }}
                  style={({ pressed }) => [
                    styles.savedAreaTab,
                    selected ? styles.savedAreaTabSelected : null,
                    pressed ? styles.pressedSoundRow : null,
                  ]}
                >
                  <Text style={[styles.savedAreaTabText, selected ? styles.savedAreaTabTextSelected : null]}>{tab.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <View
            accessible
            accessibilityLabel={savedAreaTab === "sessions" ? "Saved mixes" : "Saved sounds"}
            accessibilityRole="header"
            onLayout={(event) => {
              const nextY = event.nativeEvent.layout.y;
              if (savedDestinationLayoutYRef.current[savedAreaTab] === nextY) return;
              savedDestinationLayoutYRef.current[savedAreaTab] = nextY;
              setSavedDestinationLayoutRevision((current) => current + 1);
            }}
            ref={savedAreaTab === "sessions" ? savedMixesDestinationRef : savedSoundsDestinationRef}
            style={styles.savedDestinationHeading}
          >
            <Text style={styles.savedDestinationHeadingText}>{savedAreaTab === "sessions" ? "Saved mixes" : "Saved sounds"}</Text>
            <Text style={styles.savedDestinationHeadingMeta}>{savedAreaTab === "sessions" ? "Layered and single-sound mixes saved on this device." : "Bookmarked sounds saved on this device."}</Text>
          </View>

          {savedAreaTab === "sessions" ? (
            <>
              {quickMixes.length ? (
                <View style={styles.quickMixSection}>
                  <Text style={styles.localLibraryEyebrow}>Quick Mixes</Text>
                  <Text style={styles.localLibraryDescription}>Suggestions from your saved-session history. Nothing starts until you tap Start.</Text>
                  <View style={styles.quickMixList}>
                    {quickMixes.map((mix) => {
                      const session = savedSessions.find((savedSession) => savedSession.id === mix.sessionId);
                      if (!session) return null;
                      return (
                        <View key={mix.sessionId} style={styles.quickMixCard}>
                          <View style={styles.quickMixTextBlock}>
                            <Text style={styles.quickMixLabel}>{savedSessionQuickMixLabels[mix.kind]}</Text>
                            <Text style={styles.quickMixName}>{mix.sessionName}</Text>
                            <Text style={styles.quickMixDetail}>{mix.detail}</Text>
                          </View>
                          <ProofButton label="Start" onPress={() => handleStartSavedSession(session)} compact />
                        </View>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              <Text style={styles.librarySortLabel}>Sort saved mixes</Text>
              <View accessibilityLabel="Saved session sort options" style={styles.librarySortRow}>
                {(["Recently used", "Recently updated", "A–Z"] as SavedSessionSortMode[]).map((mode) => {
                  const selected = savedSessionSortMode === mode;
                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      key={mode}
                      onPress={() => setSavedSessionSortMode(mode)}
                      style={({ pressed }) => [
                        styles.librarySortChip,
                        selected ? styles.librarySortChipSelected : null,
                        pressed ? styles.pressedSoundRow : null,
                      ]}
                    >
                      <Text style={[styles.librarySortChipText, selected ? styles.librarySortChipTextSelected : null]}>{mode}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {sortedSavedSessions.length ? (
                <View style={styles.savedSessionList}>
                  {sortedSavedSessions.map((session) => {
                    const pendingStart = pendingSavedSessionStart?.sessionId === session.id;
                    return (
                      <View key={session.id} style={styles.savedSessionCard}>
                        <View style={styles.savedSessionHeaderRow}>
                          <View style={styles.savedSessionTitleBlock}>
                            <Text style={styles.savedSessionName}>{session.name}</Text>
                            <Text style={styles.savedSessionMeta}>
                              {session.source} · {session.sounds.length} sound{session.sounds.length === 1 ? "" : "s"} · {getMainSessionLane(session) || "Library"}
                            </Text>
                            <Text style={styles.savedSessionMeta}>
                              {session.lastPlayedAt
                                ? `Last played ${formatSavedSessionDate(session.lastPlayedAt)}`
                                : `Saved ${formatSavedSessionDate(session.updatedAt)}`} · Loop {session.loop ? "on" : "off"}
                            </Text>
                          </View>
                          <View style={styles.savedSessionPillStack}>
                            <Text style={styles.savedSessionTypePill}>{session.type}</Text>
                            {session.sounds.some((entry) => entry.enabled && (entry.userChoiceOnly || soundById.get(entry.soundId)?.userChoiceOnly)) ? (
                              <Text style={styles.savedSessionChoicePill}>Choice · explicit consent required</Text>
                            ) : null}
                          </View>
                        </View>
                        {session.note ? <Text style={styles.savedSessionNote}>{session.note}</Text> : null}
                        <View style={styles.savedSessionActionRow}>
                          <ProofButton label="Start" onPress={() => handleStartSavedSession(session)} compact />
                          <ProofButton
                            accessibilityLabel={`Manage ${session.name}`}
                            label={managedSavedSessionId === session.id ? "Close" : "Manage"}
                            onPress={() => {
                              setManagedSavedSessionId((current) => current === session.id ? null : session.id);
                              setPendingDeleteSessionId(null);
                            }}
                            secondary
                            compact
                          />
                        </View>
                        {managedSavedSessionId === session.id ? (
                          <View accessibilityLabel={`Manage actions for ${session.name}`} style={styles.savedSessionManageBox}>
                            <Text style={styles.savedSessionManageLabel}>Session actions</Text>
                            {pendingDeleteSessionId === session.id ? (
                              <View style={styles.savedSessionDeleteConfirmBox}>
                                <Text accessibilityLiveRegion="assertive" style={styles.savedSessionDeleteConfirmText}>
                                  Delete this saved session?
                                </Text>
                                <View style={styles.savedSessionActionRow}>
                                  <ProofButton
                                    accessibilityLabel={`Confirm delete ${session.name}. Destructive action`}
                                    accessibilityHint="Deletes only this saved session."
                                    label="Confirm delete"
                                    onPress={() => handleDeleteSavedSession(session.id)}
                                    destructive
                                    compact
                                  />
                                  <ProofButton
                                    accessibilityLabel={`Cancel delete ${session.name}`}
                                    label="Cancel"
                                    onPress={() => handleCancelDeleteSavedSession(session.id)}
                                    secondary
                                    compact
                                  />
                                </View>
                              </View>
                            ) : (
                              <View style={[
                                styles.savedSessionManageActions,
                                useStackedSavedSessionManageActions ? styles.savedSessionManageActionsStacked : null,
                              ]}>
                                <ProofButton
                                  label="Rename"
                                  onPress={() => openSavedSessionDialog("rename", null, session.id)}
                                  balancedAction={!useStackedSavedSessionManageActions}
                                  fullWidth={useStackedSavedSessionManageActions}
                                  secondary
                                  compact
                                />
                                <ProofButton
                                  label="Duplicate"
                                  onPress={() => handleDuplicateSavedSession(session.id)}
                                  balancedAction={!useStackedSavedSessionManageActions}
                                  fullWidth={useStackedSavedSessionManageActions}
                                  secondary
                                  compact
                                />
                                <ProofButton
                                  accessibilityLabel={`Delete ${session.name}. Destructive action, confirmation required`}
                                  accessibilityHint="Requires confirmation before deleting."
                                  label="Delete"
                                  onPress={() => handleDeleteSavedSession(session.id)}
                                  balancedAction={!useStackedSavedSessionManageActions}
                                  fullWidth={useStackedSavedSessionManageActions}
                                  secondary
                                  compact
                                />
                              </View>
                            )}
                          </View>
                        ) : null}
                        {pendingStart ? (
                          <View style={styles.savedSessionConfirmBox}>
                            {pendingSavedSessionStart?.needsMissingAcknowledgement ? (
                              <Text style={styles.savedSessionErrorText}>Some sounds are unavailable. Only the named available sounds will start.</Text>
                            ) : null}
                            {pendingSavedSessionStart?.needsChoiceConsent ? (
                              <Text style={styles.savedSessionChoiceText}>Choice · explicit consent required. Start only if you want this content.</Text>
                            ) : null}
                            <View style={styles.savedSessionActionRow}>
                              <ProofButton label="Continue and start" onPress={handleConfirmSavedSessionStart} compact />
                              <ProofButton label="Cancel" onPress={() => setPendingSavedSessionStart(null)} secondary compact />
                            </View>
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyLibraryBox}>
                  <Text style={styles.emptyLibraryText}>No saved mixes yet. Start with one sound, build a layered recipe, then save it for later.</Text>
                  <View style={styles.savedSessionActionRow}>
                    <ProofButton label="Fast Start" onPress={() => handleSectionJump("fast-start")} compact />
                    <ProofButton label="Browse" onPress={() => handleSectionJump("browse")} secondary compact />
                    <ProofButton label="Builder" onPress={() => handleSectionJump("presets")} secondary compact />
                  </View>
                </View>
              )}
            </>
          ) : (
            <>
              <Text style={styles.librarySortLabel}>Sort Saved / Recent sounds</Text>
              <View accessibilityLabel="Saved and Recent sort options" style={styles.librarySortRow}>
                {librarySortOptions.map((option) => {
                  const selected = librarySortMode === option.key;
                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      key={`library-sort-${option.key}`}
                      onPress={() => setLibrarySortMode(option.key)}
                      style={({ pressed }) => [
                        styles.librarySortChip,
                        selected ? styles.librarySortChipSelected : null,
                        pressed ? styles.pressedSoundRow : null,
                      ]}
                    >
                      <Text style={[styles.librarySortChipText, selected ? styles.librarySortChipTextSelected : null]}>{option.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.localLibraryEyebrow}>Saved sounds</Text>
              <Text style={styles.localLibraryDescription}>Saved on this device · each row shows its category.</Text>
              {sortedSavedSounds.length ? (
                <View style={styles.localSoundList}>
                  {sortedSavedSounds.map((catalogSound) => (
                    <LocalSoundRow
                      key={`saved-${catalogSound.id}`}
                      sound={catalogSound}
                      selected={catalogSound.id === selectedSound.id}
                      saved={savedSoundIds.includes(catalogSound.id)}
                      avoided={matchesAnyIntent(catalogSound, activeAvoidedIntents)}
                      onSelect={() => handleSelectSound(catalogSound, "Saved", true)}
                      onToggleSaved={() => toggleSavedSound(catalogSound)}
                      feedbackControls={renderSoundFeedbackControls(catalogSound)}
                    />
                  ))}
                </View>
              ) : (
                <View style={styles.emptyLibraryBox}>
                  <Text style={styles.emptyLibraryText}>No saved sounds yet. Save a sound to keep it here.</Text>
                  <ProofButton label="Browse sounds" onPress={() => handleSectionJump("browse")} secondary compact />
                </View>
              )}

              <Text style={styles.localLibraryEyebrow}>Recent sounds</Text>
              <Text style={styles.localLibraryDescription}>Recently used on this device · newest first in the recent sort.</Text>
              {sortedRecentSounds.length ? (
                <View style={styles.localSoundList}>
                  {sortedRecentSounds.map((catalogSound) => (
                    <LocalSoundRow
                      key={`recent-${catalogSound.id}`}
                      sound={catalogSound}
                      selected={catalogSound.id === selectedSound.id}
                      saved={savedSoundIds.includes(catalogSound.id)}
                      avoided={matchesAnyIntent(catalogSound, activeAvoidedIntents)}
                      onSelect={() => handleSelectSound(catalogSound, "Recent", true)}
                      onToggleSaved={() => toggleSavedSound(catalogSound)}
                      feedbackControls={renderSoundFeedbackControls(catalogSound)}
                    />
                  ))}
                </View>
              ) : (
                <View style={styles.emptyLibraryBox}>
                  <Text style={styles.emptyLibraryText}>No recent sounds yet. Choose a sound in Browse to start exploring.</Text>
                  <ProofButton label="Browse sounds" onPress={() => handleSectionJump("browse")} secondary compact />
                </View>
              )}
            </>
          )}
        </View>
        ) : null}

        {!settingsOpen && activeSectionKey === "browse" ? (
        <View style={styles.catalogCard}>
          <Text style={styles.catalogEyebrow}>Browse sounds</Text>
          <Text style={styles.browseIntroText}>Search or choose a collection. Nothing starts until you preview a sound.</Text>
          <TextInput
            accessibilityLabel="Browse search"
            autoCapitalize="none"
            autoCorrect={false}
            multiline={false}
            numberOfLines={1}
            onChangeText={setBrowseSearchText}
            placeholder="Search sounds"
            placeholderTextColor={visualTheme.textSubtle}
            returnKeyType="search"
            style={styles.fastStartInput}
            value={browseSearchText}
          />

          <View style={styles.discoverySection}>
            <Text style={styles.discoverySectionTitle}>Collections</Text>
            <View accessibilityLabel="Compact collections" style={styles.collectionGrid}>
              {discoveryCollections.map((collection) => {
                const selected = collection.id === activeBrowseCollectionId;
                return (
                  <Pressable
                    accessibilityHint="Filters the sound list without playing audio"
                    accessibilityLabel={`${collection.label}${collection.choiceOptIn ? ", Choice opt-in" : ""}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={collection.id}
                    onPress={() => handleSelectBrowseCollection(collection.id)}
                    style={({ pressed }) => [
                      styles.collectionCard,
                      selected ? styles.collectionCardSelected : null,
                      pressed ? styles.pressedSoundRow : null,
                    ]}
                  >
                    <Text style={[styles.collectionTitle, selected ? styles.collectionTitleSelected : null]}>{collection.label}</Text>
                    {collection.choiceOptIn ? <Text style={styles.collectionChoiceLabel}>Opt-in</Text> : null}
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.discoverySection}>
            <Pressable
              accessibilityLabel="Filters"
              accessibilityRole="button"
              accessibilityState={{ expanded: browseFiltersOpen }}
              onPress={() => setBrowseFiltersOpen((open) => !open)}
              style={({ pressed }) => [styles.filterDisclosureButton, pressed ? styles.pressedSoundRow : null]}
            >
              <Text style={styles.discoverySectionTitle}>Filters {browseFiltersOpen ? "−" : "+"}</Text>
              <Text style={styles.filterDisclosureSummary}>{activeBrowseFilterChips.length} active</Text>
            </Pressable>
            {browseFiltersOpen ? (
              <View style={styles.expandedFilterGroups}>
            {browseFilterGroups.map((group) => (
              <View key={group.key} style={styles.filterGroup}>
                <Text style={styles.filterGroupLabel}>{group.label}</Text>
                <View style={[
                  styles.filterChipWrap,
                  group.key === "intensity" ? styles.browseIntensityRow : null,
                  group.key === "intensity" && useCompactThreeColumnFallback ? styles.compactThreeColumnRowStacked : null,
                ]}>
                  {group.options.map((option) => {
                    const selected = browseFilters[group.key].includes(option.key);
                    const optionCount = browseFilterOptionCounts[group.key][option.key] ?? 0;
                    const disabled = optionCount === 0 && !selected;
                    return (
                      <Pressable
                        accessibilityLabel={`${group.label}: ${option.label}, ${optionCount} results${option.choiceOptIn ? ", explicit Choice opt-in" : ""}`}
                        accessibilityRole="button"
                        accessibilityState={{ selected, disabled }}
                        disabled={disabled}
                        key={`${group.key}-${option.key}`}
                        onPress={() => handleToggleBrowseFilter(group.key, option.key)}
                        style={({ pressed }) => [
                          styles.filterChip,
                          group.key === "intensity" ? styles.browseIntensityChip : null,
                          group.key === "intensity"
                            ? useCompactThreeColumnFallback
                              ? styles.compactThreeColumnItemStacked
                              : styles.compactThreeColumnItem
                            : null,
                          selected ? styles.filterChipSelected : null,
                          option.choiceOptIn ? styles.filterChipChoice : null,
                          disabled ? styles.disabledButton : null,
                          pressed ? styles.pressedSoundRow : null,
                        ]}
                      >
                        <Text style={[styles.filterChipText, selected ? styles.filterChipTextSelected : null]}>{option.label} ({optionCount})</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
              </View>
            ) : null}
          </View>

          <Text style={styles.localLibraryDescription}>
            {browseAllowsUserChoice
              ? "Choice sounds are visible by explicit opt-in. Voice / Whisper / Soft-Spoken items and synthetic voices are labeled."
              : "Standard sounds are shown first. Tones, bowls, and Voice items require explicit Choice opt-in."}
          </Text>

          {activeBrowseFilterChips.length ? (
            <View style={styles.activeFilterSection}>
              <Text style={styles.activeFilterLabel}>Active filters</Text>
              <View style={styles.activeFilterChipWrap}>
                {activeBrowseFilterChips.map((chip) => (
                  <Pressable
                    accessibilityHint="Clears this active Browse filter"
                    accessibilityLabel={chip.removeAccessibilityLabel}
                    accessibilityRole="button"
                    key={chip.key}
                    onPress={() => handleClearBrowseFilterChip(chip)}
                    style={({ pressed }) => [styles.activeFilterChip, pressed ? styles.pressedSoundRow : null]}
                  >
                    <Text style={styles.activeFilterChipText}>{chip.label} ×</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.browseResultHeader}>
            <Text accessibilityLiveRegion="polite" style={styles.browseResultSummary}>
              {browseVisibleSoundCount} result{browseVisibleSoundCount === 1 ? "" : "s"} · {visibleBrowseGroups.length} {visibleBrowseGroups.length === 1 ? "group" : "groups"}
            </Text>
            {browseSearchText || activeBrowseFilterChips.length ? (
              <ProofButton label="Clear all" onPress={handleClearAllBrowseDiscovery} secondary compact />
            ) : null}
          </View>

          {!visibleBrowseGroups.length ? (
            <View style={styles.emptyLibraryBox}>
              <Text accessibilityLiveRegion="polite" style={styles.emptyLibraryText}>
                No sounds match this search, filter, and collection combination. Clear filters to return to Browse.
              </Text>
              <ProofButton label="Clear filters" onPress={handleClearAllBrowseDiscovery} secondary compact />
            </View>
          ) : null}
        </View>
        ) : null}
          </>
        )}
      />

      {surfaceVisible && transientNotification ? (
        <View
          pointerEvents="none"
          style={[
            styles.transientNotificationOverlay,
            { bottom: bottomNavigationHeight + (currentSession ? miniPlayerHeight : 0) + 8 },
          ]}
        >
          <Text
            key={transientNotification.token}
            accessibilityLabel={transientNotification.message}
            accessibilityLiveRegion="polite"
            style={styles.transientNotificationToast}
          >
            {transientNotification.message}
          </Text>
        </View>
      ) : null}

      {currentSession && aggregateSessionType !== "directed" ? (
        <View
          onLayout={handleMiniPlayerLayout}
          style={[styles.miniPlayer, { bottom: bottomNavigationHeight }]}
        >
          <View style={styles.miniPlayerMainRow}>
            <View style={[styles.miniPlayerContent, useCompactMiniPlayerFallback ? styles.miniPlayerContentFallback : null]}>
            <Pressable
              accessibilityHint="Opens detailed playback, Timer, seek, save, and layer controls"
              accessibilityLabel="Open Player"
              accessibilityRole="button"
              onPress={handleOpenPlayer}
              style={({ pressed }) => [
                styles.miniPlayerSummary,
                useCompactMiniPlayerFallback ? styles.miniPlayerSummaryFallback : null,
                pressed ? styles.miniPlayerSummaryPressed : null,
              ]}
            >
              <View style={styles.miniTitleBlock}>
                <Text ellipsizeMode="tail" numberOfLines={1} style={styles.miniTitle}>
                  {getCurrentSessionTitle(currentSession, selectedSound)}
                </Text>
                <Text accessibilityLiveRegion="polite" ellipsizeMode="tail" numberOfLines={1} style={styles.miniMetadata}>
                  {miniStatusMetadata}
                </Text>
              </View>
            </Pressable>

            {renderActiveQuickFeedbackControls(true)}

            <View
              style={[
                styles.miniControls,
                useCompactMiniPlayerFallback ? styles.miniControlsFallback : styles.miniControlsInline,
              ]}
            >
              <ProofButton
                accessibilityLabel={`${miniPrimaryButtonLabel} ${currentSession.type === "recipe" ? "layered recipe" : selectedSound.title}`}
                label={miniPrimaryButtonLabel}
                onPress={miniPrimaryButtonAction}
                disabled={sessionStopInProgress || singlePlaybackCommandInFlight || layeredSelectionPending || layeredPreviewStatus === "loading"}
                compact
                miniPlayerAction
                reduceMotionEnabled={reduceMotionEnabled}
              />
              <ProofButton
                accessibilityLabel={sessionStopInProgress
                  ? "Stopping playback"
                  : `Stop ${currentSession.type === "recipe" ? "layered recipe" : selectedSound.title}`}
                label={sessionStopInProgress ? "Stopping…" : "Stop"}
                onPress={() => runUserPlaybackAction(handleStopSession)}
                disabled={sessionStopInProgress}
                busy={sessionStopInProgress}
                secondary
                compact
                miniPlayerAction
                reduceMotionEnabled={reduceMotionEnabled}
              />
              <ProofButton
                accessibilityLabel={activeSessionLoopEligible
                  ? isLoopEnabled ? "Turn Loop Off" : "Turn Loop On"
                  : "Loop unavailable because an active sound is not loop-approved"}
                accessibilityHint={loopHelperLabel}
                label={miniLoopButtonLabel}
                onPress={() => runUserPlaybackAction(handleToggleLoop)}
                disabled={sessionStopInProgress || singlePlaybackCommandInFlight || layeredPreviewStatus === "loading" || !activeSessionLoopEligible}
                unavailable={!activeSessionLoopEligible}
                secondary={!isLoopEnabled}
                compact
                miniPlayerAction
                reduceMotionEnabled={reduceMotionEnabled}
              />
            </View>
            </View>
          </View>
          {currentSession.type === "single" ? (
            <View style={styles.miniPlayerSeekRow}>
              {/* Dedicated full-width seek row with a visible thumb. Seeking remains available now; this boundary can support future membership handling without adding entitlement UI here. */}
              <ReplayOptimisticProgressDisplay
                ref={replayOptimisticProgressDisplayRef}
                positionMillis={positionMillis}
                progressDurationMillis={progressDurationMillis}
                isPlaying={isPlaying}
                isForeground={playbackProjectionForeground}
                isRecipeSession={false}
                hasProgressDuration={hasProgressDuration}
                disabled={!hasProgressDuration || singlePlaybackCommandInFlight}
                miniSeekable
                seekPanResponder={miniSeekPanResponder}
                onLayout={handleMiniProgressTrackLayout}
                onAccessibilityAdjust={handleAccessibleSeek}
                onOptimisticTick={handleLoadedReplayOptimisticProgressDisplayTick}
                onCommit={handleMiniClockCommit}
              />
            </View>
          ) : null}
          {primaryPlaybackError ? (
            <Text accessibilityLiveRegion="polite" numberOfLines={3} style={styles.miniErrorText}>
              {primaryPlaybackError}
            </Text>
          ) : null}
        </View>
      ) : null}

      {surfaceVisible ? <SafeAreaView
        edges={["bottom", "left", "right"]}
        onLayout={handleBottomNavigationLayout}
        style={styles.persistentSectionNavSafeArea}
      >
        <View accessibilityLabel="Persistent section navigation" style={styles.persistentSectionNav}>
          {mobileSectionNavOptions.map((option) => {
            const selected = option.key === activeSectionKey;
            return (
              <Pressable
                accessibilityLabel={`Jump to ${option.label}`}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={option.key}
                onPress={option.key === "player" ? handleOpenPlayer : () => handleSectionJump(option.key)}
                style={({ pressed }) => [
                  styles.persistentSectionTab,
                  selected ? styles.persistentSectionTabSelected : null,
                  pressed ? styles.pressedSoundRow : null,
                ]}
              >
                <Text
                  style={[
                    styles.persistentSectionTabText,
                    selected ? styles.persistentSectionTabTextSelected : null,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView> : null}

      {surfaceVisible ? <StatusBar style="light" /> : null}
    </SafeAreaView>
  );
}

class SoundscapeErrorBoundary extends React.Component<React.PropsWithChildren, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (__DEV__) console.error("Soundscape UI boundary", error, info.componentStack);
  }

  render() {
    if (this.state.failed) {
      return (
        <SafeAreaView style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#090d14" }}>
          <Text accessibilityRole="alert" style={{ color: "#f7f9fc", fontSize: 20, fontWeight: "700", textAlign: "center" }}>
            Soundscape needs a fresh start
          </Text>
          <Text style={{ color: "#aeb8c7", marginTop: 10, textAlign: "center" }}>
            Close and reopen the app. Your saved sounds and sessions remain on this device.
          </Text>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [classicRoute, setClassicRoute] = useState<DirectedClassicRouteV1 | null>(null);
  const [classicReturnTab, setClassicReturnTab] = useState<DirectedTabV1>("sessions");
  const [classicEverMounted, setClassicEverMounted] = useState(!directedSessionsBetaV1);
  const savedDestinationRequestRef = useRef(0);
  const [savedDestinationIntent, setSavedDestinationIntent] = useState<SavedDestinationIntentV1 | null>(null);
  const openClassicRoute = (route: DirectedClassicRouteV1, returnTab: DirectedTabV1) => {
    setClassicEverMounted(true);
    setClassicReturnTab(returnTab);
    if (route === "saved-mixes" || route === "saved-sounds") {
      const requestId = savedDestinationRequestRef.current + 1;
      savedDestinationRequestRef.current = requestId;
      setSavedDestinationIntent(createSavedDestinationIntentV1(route, requestId));
    } else {
      setSavedDestinationIntent(null);
    }
    setClassicRoute(route);
  };
  const handleSavedDestinationConsumed = (requestId: number) => {
    setSavedDestinationIntent((current) => current?.requestId === requestId ? null : current);
  };
  const returnToDirectedSessions = () => {
    setSavedDestinationIntent(null);
    setClassicRoute(null);
  };
  const navigationSurface = planClassicNavigationSurfaceV1({
    directedEnabled: directedSessionsBetaV1,
    classicEverMounted,
    classicRoute,
  });
  return (
    <SafeAreaProvider>
      <SoundscapeErrorBoundary>
        {navigationSurface.directedVisible ? (
          <DirectedSessionsExperienceV1 initialTab={classicReturnTab} onOpenClassicLibraryRoute={openClassicRoute} />
        ) : null}
        {navigationSurface.mountClassic ? (
          <SoundscapeApp
            key="classic"
            initialSectionKey={navigationSurface.section}
            initialSavedAreaTab={navigationSurface.savedTab}
            initialSettingsOpen={classicRoute === "settings"}
            surfaceVisible={navigationSurface.classicVisible}
            directedClassicRoute={classicRoute}
            onOpenRetainedClassicPlayer={() => openClassicRoute("player", classicReturnTab)}
            directedModeBack={directedSessionsBetaV1 ? returnToDirectedSessions : undefined}
            directedModeBackLabel={`Back to ${classicReturnTab === "sessions" ? "Sessions" : classicReturnTab === "library" ? "Library" : "Saved"}`}
            savedDestinationIntent={savedDestinationIntent}
            onSavedDestinationConsumed={handleSavedDestinationConsumed}
          />
        ) : null}
      </SoundscapeErrorBoundary>
    </SafeAreaProvider>
  );
}

type ProofButtonProps = {
  accessibilityLabel?: string;
  accessibilityHint?: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  secondary?: boolean;
  compact?: boolean;
  miniPlayerAction?: boolean;
  fixedTransportAction?: boolean;
  balancedAction?: boolean;
  fullWidth?: boolean;
  unavailable?: boolean;
  destructive?: boolean;
  reduceMotionEnabled?: boolean;
};

function ProofButton({
  accessibilityLabel,
  accessibilityHint,
  label,
  onPress,
  disabled,
  busy,
  secondary,
  compact,
  miniPlayerAction,
  fixedTransportAction,
  balancedAction,
  fullWidth,
  unavailable,
  destructive,
  reduceMotionEnabled,
}: ProofButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      accessibilityState={{ disabled, busy }}
      disabled={disabled}
      onPress={(event) => {
        event.stopPropagation();
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        compact ? styles.compactButton : null,
        miniPlayerAction ? styles.miniPlayerAction : null,
        fixedTransportAction ? styles.fixedTransportAction : null,
        balancedAction ? styles.balancedActionButton : null,
        fullWidth ? styles.fullWidthButton : null,
        secondary ? styles.secondaryButton : null,
        destructive ? styles.destructiveButton : null,
        disabled ? styles.disabledButton : null,
        unavailable ? styles.unavailableButton : null,
        pressed && !disabled ? (reduceMotionEnabled ? null : styles.pressedButton) : null,
      ]}
    >
      <Text
        adjustsFontSizeToFit={miniPlayerAction || balancedAction}
        minimumFontScale={miniPlayerAction ? 0.72 : balancedAction ? 0.82 : undefined}
        numberOfLines={miniPlayerAction || fixedTransportAction || balancedAction ? 1 : undefined}
        style={[
          styles.buttonText,
          compact ? styles.compactButtonText : null,
          secondary ? styles.secondaryButtonText : null,
          destructive ? styles.destructiveButtonText : null,
          unavailable ? styles.unavailableButtonText : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

type FeedbackChipProps = {
  label: string;
  activeLabel: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  danger?: boolean;
};

function FeedbackChip({ label, activeLabel, selected, onPress, accessibilityLabel, danger }: FeedbackChipProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={(event) => {
        event.stopPropagation();
        onPress();
      }}
      style={({ pressed }) => [
        styles.feedbackChip,
        selected ? styles.feedbackChipSelected : null,
        selected && danger ? styles.feedbackChipDangerSelected : null,
        pressed ? styles.pressedSoundRow : null,
      ]}
    >
      <Text style={[styles.feedbackChipText, selected ? styles.feedbackChipTextSelected : null]}>
        {selected ? activeLabel : label}
      </Text>
    </Pressable>
  );
}

type QuickFeedbackButtonProps = {
  icon: "👍" | "👎";
  selected: boolean;
  onPress: () => void;
  accessibilityLabel: string;
};

function QuickFeedbackButton({ icon, selected, onPress, accessibilityLabel }: QuickFeedbackButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={(event) => {
        event.stopPropagation();
        onPress();
      }}
      style={({ pressed }) => [
        styles.quickFeedbackButton,
        selected ? styles.quickFeedbackButtonSelected : null,
        pressed ? styles.pressedSoundRow : null,
      ]}
    >
      <Text style={[styles.quickFeedbackIcon, selected ? styles.quickFeedbackIconSelected : null]}>
        {selected ? `✓${icon}` : icon}
      </Text>
    </Pressable>
  );
}

function PresetSelectedIndicator({ selected }: { selected: boolean }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[styles.presetOptionSelectionIndicator, selected ? styles.selectionIndicatorSlotSelected : null]}
    >
      <Text style={styles.selectionIndicatorText}>{selected ? "✓" : ""}</Text>
    </View>
  );
}


type LocalSoundRowProps = {
  sound: MobileCatalogSound;
  selected: boolean;
  saved: boolean;
  avoided: boolean;
  onSelect: () => Promise<void>;
  onToggleSaved: () => void;
  feedbackControls?: React.ReactNode;
};

function LocalSoundRow({ sound, selected, saved, avoided, onSelect, onToggleSaved, feedbackControls }: LocalSoundRowProps) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const discoveryTags = Array.from(new Set([
    ...getDiscoveryTags(sound),
    ...formatSoundUserTags(sound).split(" · "),
  ])).slice(0, 3);
  return (
    <Pressable
      accessibilityHint="Previews this sound and opens Player"
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: avoided }}
      disabled={avoided}
      onPress={() => {
        onSelect().catch(() => undefined);
      }}
      style={({ pressed }) => [
        styles.compactSoundRow,
        selected ? styles.selectedSoundRow : null,
        avoided ? styles.avoidedRow : null,
        pressed ? styles.pressedSoundRow : null,
      ]}
    >
      <View style={styles.compactSoundRowHeader}>
        <View style={styles.compactSoundRowBody}>
          <Text style={styles.soundTitle}>{sound.title}</Text>
          <Text style={styles.soundSubtitle}>{sound.subtitle}</Text>
          {sound.voiceMetadata ? (
            <Text style={styles.fastStartChoiceNote}>
              {sound.voiceMetadata.synthetic ? "Synthetic voice" : "Human voice"} · {sound.voiceMetadata.modality === "whisper" ? "Whisper" : "Soft-spoken"} · Choice
            </Text>
          ) : null}
          <Text style={styles.soundDiscoveryMeta}>{formatDiscoveryMeta(sound)}</Text>
          <Text style={styles.soundTagLine}>{discoveryTags.join(" · ")}</Text>
        </View>
        <View style={styles.compactSoundRowActions}>
          {avoided ? <Text style={styles.avoidedPill}>Avoided</Text> : null}
          <Pressable
            accessibilityLabel={`${saved ? "Unsave" : "Save"} ${sound.title}`}
            accessibilityRole="button"
            onPress={(event) => {
              event.stopPropagation();
              onToggleSaved();
            }}
            style={[styles.savePill, saved ? styles.savePillActive : null]}
          >
            <Text style={[styles.savePillText, saved ? styles.savePillTextActive : null]}>
              {saved ? "Saved" : "Save"}
            </Text>
          </Pressable>
          {sound.clearLabelRequired || sound.userChoiceOnly ? <Text style={styles.clearLabelPill}>Choice</Text> : null}
        </View>
      </View>
      <View style={styles.compactSoundPrimaryActions}>
        <ProofButton
          accessibilityLabel={`Preview ${sound.title}`}
          label="Preview"
          onPress={() => onSelect().catch(() => undefined)}
          disabled={avoided}
          compact
        />
        <ProofButton
          accessibilityLabel={feedbackOpen ? `Hide feedback for ${sound.title}` : `Feedback for ${sound.title}`}
          label={feedbackOpen ? "Hide feedback" : "Feedback"}
          onPress={() => setFeedbackOpen((open) => !open)}
          secondary
          compact
        />
        {sound.voiceMetadata ? (
          <ProofButton
            accessibilityLabel={detailsOpen ? `Hide voice details for ${sound.title}` : `Voice details for ${sound.title}`}
            label={detailsOpen ? "Hide details" : "Details"}
            onPress={() => setDetailsOpen((open) => !open)}
            secondary
            compact
          />
        ) : null}
      </View>
      {detailsOpen && sound.voiceMetadata ? (
        <View style={styles.compactSoundFeedbackControls}>
          <Text style={styles.soundSubtitle}>Provenance</Text>
          <Text style={styles.settingsBodyText}>{sound.voiceMetadata.provenanceSummary}</Text>
          <Text style={styles.soundSubtitle}>Transcript</Text>
          <Text style={styles.settingsBodyText}>{sound.voiceMetadata.transcript}</Text>
        </View>
      ) : null}
      {feedbackOpen ? <View style={styles.compactSoundFeedbackControls}>{feedbackControls}</View> : null}
    </Pressable>
  );
}
const MemoizedLocalSoundRow = React.memo(LocalSoundRow);
function isMobileCatalogSound(sound: MobileCatalogSound | undefined): sound is MobileCatalogSound {
  return Boolean(sound);
}

function formatSavedSessionDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "recently";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatError(errorValue: unknown): string {
  if (errorValue instanceof Error) {
    return errorValue.message;
  }
  return String(errorValue);
}


function isExpectedSeekInterruption(errorValue: unknown): boolean {
  return formatError(errorValue).toLowerCase().includes("seeking interrupted");
}

function wait(durationMillisValue: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMillisValue);
  });
}

function secondsToMillis(durationSeconds: number): number {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return 0;
  }

  return Math.round(durationSeconds * 1000);
}

function formatDurationFromSeconds(durationSeconds: number): string {
  return formatDurationFromMillis(secondsToMillis(durationSeconds));
}

function formatDurationFromMillis(durationMillisValue: number): string {
  if (!Number.isFinite(durationMillisValue) || durationMillisValue <= 0) {
    return "0:00";
  }

  const totalSeconds = Math.round(durationMillisValue / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function buildOnboardingFastStartQuery(
  intent: OnboardingIntentOption,
  avoidances: OnboardingAvoidanceOption[],
): string {
  return [
    intent.query,
    ...avoidances.map((avoidance) => `no ${avoidance.query}`),
  ].join(" ");
}

function matchFastStartQuery(query: string, preferences: LocalPreferenceFeedback = defaultLocalPreferenceFeedback): FastStartSearchResult {
  const normalizedQuery = normalizeFastStartText(query);

  if (!normalizedQuery) {
    return {
      status: "no-match",
      message: `No Fast Start text entered. ${noMatchSuggestionText}`,
      avoidedIntents: [],
      suggestedAlternatives: getFallbackSuggestions([], [], preferences),
    };
  }

  const queryTokens = normalizedQuery.split(" ").filter(Boolean);
  const avoidedIntents = detectAvoidedFastStartIntents(normalizedQuery);
  const avoidsVoice = avoidedIntents.some((intent) => intent.key === "voice");
  const avoidedPlayableIntents = avoidedIntents.filter((intent) => intent.key !== "voice");
  const positiveIntents = detectFastStartIntents(normalizedQuery).filter(
    (intent) =>
      intent.key !== "voice" && !avoidedIntents.some((avoided) => avoided.key === intent.key),
  );

  if (avoidsVoice && positiveIntents.length === 0 && avoidedPlayableIntents.length === 0) {
    return {
      status: "conflict",
      message: "Voice sounds are not available here. Try rain, fan, river, creek, forest, noise, typing, paper, fabric, or soft tapping.",
      avoidedIntents,
      suggestedAlternatives: getFallbackSuggestions([], avoidedIntents, preferences),
    };
  }

  const explicitOptInSearch = isExplicitOptInChoiceQuery(normalizedQuery, avoidedPlayableIntents);
  const candidates = mobileCatalogSounds
    .filter((catalogSound) => isFastStartSearchCandidate(catalogSound, normalizedQuery, explicitOptInSearch))
    .filter((catalogSound) => !preferences.avoidedSoundIds.includes(catalogSound.id))
    .map((catalogSound) => ({
      catalogSound,
      score: scoreFastStartMatch(catalogSound, normalizedQuery, queryTokens, positiveIntents, preferences),
    }))
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score || a.catalogSound.title.localeCompare(b.catalogSound.title));

  const filteredMatches = candidates.filter(
    (match) => !matchesAnyIntent(match.catalogSound, avoidedPlayableIntents),
  );
  const fanIntentRequested = positiveIntents.some((intent) => intent.key === "fan-air");
  const fanDominantMatches = fanIntentRequested
    ? filteredMatches.filter((match) => isFanAirHumNoiseFamily(match.catalogSound))
    : filteredMatches;
  const rankedMatches = fanIntentRequested && fanDominantMatches.length > 0 ? fanDominantMatches : filteredMatches;

  if (candidates.length > 0 && filteredMatches.length === 0) {
    return {
      status: "conflict",
      message: `Avoiding: ${formatIntentLabels(avoidedPlayableIntents)}. That search only found sounds you asked to avoid. Clear the avoidance or try a different term.`,
      avoidedIntents,
      suggestedAlternatives: getFallbackSuggestions(positiveIntents, avoidedIntents, preferences),
    };
  }

  const bestMatch = rankedMatches[0];
  if (!bestMatch) {
    return {
      status: "no-match",
      message: `No match found. ${noMatchSuggestionText}`,
      avoidedIntents,
      suggestedAlternatives: getFallbackSuggestions([], avoidedIntents, preferences),
    };
  }

  const matchedLabels = bestMatch.catalogSound.userChoiceOnly
    ? normalizedQuery
    : positiveIntents.length
      ? formatIntentLabels(positiveIntents)
      : normalizedQuery;
  const avoidedCopy = avoidedPlayableIntents.length
    ? ` Avoided ${formatIntentLabels(avoidedPlayableIntents)}.`
    : "";

  return {
    status: "matched",
    sound: bestMatch.catalogSound,
    alternatives: rankedMatches.slice(1, 4).map((match) => match.catalogSound),
    whyMatched: buildWhyMatchedCopy(bestMatch.catalogSound, positiveIntents, matchedLabels, avoidedPlayableIntents),
    avoidedIntents,
    recipeIntent: normalizedQuery,
    allowUserChoice: explicitOptInSearch,
  };
}

function buildWhyMatchedCopy(
  catalogSound: MobileCatalogSound,
  positiveIntents: FastStartIntent[],
  matchedLabels: string,
  avoidedPlayableIntents: FastStartIntent[],
): string {
  const intentKeys = new Set(positiveIntents.map((intent) => intent.key));
  let baseCopy = catalogSound.userChoiceOnly
    ? `You searched for ${matchedLabels}, so this opt-in sound is shown.`
    : `Matched because you asked for ${matchedLabels}.`;

  if (!catalogSound.userChoiceOnly && intentKeys.has("rain") && intentKeys.has("fan-air")) {
    baseCopy = "Matched because you asked for rain and a soft background.";
  } else if (!catalogSound.userChoiceOnly && intentKeys.has("fan-air")) {
    baseCopy = "Matched because you asked for room/fan ambience.";
  } else if (!catalogSound.userChoiceOnly && intentKeys.has("relax")) {
    baseCopy = "Matched to a safe default background.";
  } else if (!catalogSound.userChoiceOnly && (intentKeys.has("typing-writing") || intentKeys.has("paper"))) {
    baseCopy = "Matched because you asked for paper, writing, or desk texture.";
  } else if (!catalogSound.userChoiceOnly && intentKeys.has("water")) {
    baseCopy = "Matched because you asked for river, creek, or water ambience.";
  } else if (!catalogSound.userChoiceOnly && intentKeys.has("forest")) {
    baseCopy = "Matched because you asked for forest, nature, night, or crickets.";
  } else if (!catalogSound.userChoiceOnly && intentKeys.has("fabric")) {
    baseCopy = "Matched because you asked for fabric or soft texture.";
  } else if (!catalogSound.userChoiceOnly && intentKeys.has("tapping")) {
    baseCopy = "Matched because you asked for soft tapping.";
  }

  return avoidedPlayableIntents.length
    ? `${baseCopy} Avoiding: ${formatIntentLabels(avoidedPlayableIntents)}.`
    : baseCopy;
}

function detectFastStartIntents(normalizedQuery: string): FastStartIntent[] {
  return fastStartIntents.filter((intent) =>
    intent.aliases.some((alias) => includesFastStartPhrase(normalizedQuery, alias)),
  );
}

function detectAvoidedFastStartIntents(normalizedQuery: string): FastStartIntent[] {
  const avoidedIntents: FastStartIntent[] = [];
  for (const intent of fastStartIntents) {
    const avoided = intent.aliases.some((alias) => {
      const normalizedAlias = normalizeFastStartText(alias);
      return [
        `avoid ${normalizedAlias}`,
        `no ${normalizedAlias}`,
        `without ${normalizedAlias}`,
      ].some((phrase) => includesFastStartPhrase(normalizedQuery, phrase));
    });

    if (avoided) {
      avoidedIntents.push(intent);
    }
  }

  return avoidedIntents;
}


function isFastStartSearchCandidate(
  catalogSound: MobileCatalogSound,
  normalizedQuery: string,
  explicitOptInSearch: boolean,
): boolean {
  if (!catalogSound.userChoiceOnly) {
    return true;
  }

  return explicitOptInSearch && (
    (isOptInToneBowlSound(catalogSound) && optInToneBowlSearchMatches(catalogSound, normalizedQuery)) ||
    (isOptInVoiceSound(catalogSound) && optInVoiceSearchMatches(catalogSound, normalizedQuery))
  );
}

function isExplicitOptInChoiceQuery(normalizedQuery: string, avoidedPlayableIntents: FastStartIntent[]): boolean {
  const toneAllowed = !avoidedPlayableIntents.some((intent) => ["tones", "chime"].includes(intent.key));
  const voiceAllowed = !avoidedPlayableIntents.some((intent) => intent.key === "voice");
  return (toneAllowed && optInToneBowlTriggerTerms.some((term) => includesFastStartPhrase(normalizedQuery, term))) ||
    (voiceAllowed && optInVoiceTriggerTerms.some((term) => includesFastStartPhrase(normalizedQuery, term)));
}

function isOptInToneBowlSound(catalogSound: MobileCatalogSound): boolean {
  const searchableText = buildSearchableFastStartText(catalogSound);
  return catalogSound.userChoiceOnly && optInToneBowlTriggerTerms.some((term) => includesFastStartPhrase(searchableText, term));
}

function optInToneBowlSearchMatches(catalogSound: MobileCatalogSound, normalizedQuery: string): boolean {
  const searchableText = buildSearchableFastStartText(catalogSound);
  return optInToneBowlTriggerTerms.some(
    (term) => includesFastStartPhrase(normalizedQuery, term) && includesFastStartPhrase(searchableText, term),
  );
}

function isOptInVoiceSound(catalogSound: MobileCatalogSound): boolean {
  return catalogSound.userChoiceOnly && catalogSound.containsVoice;
}

function optInVoiceSearchMatches(catalogSound: MobileCatalogSound, normalizedQuery: string): boolean {
  const searchableText = buildSearchableFastStartText(catalogSound);
  return optInVoiceTriggerTerms.some(
    (term) => includesFastStartPhrase(normalizedQuery, term) && includesFastStartPhrase(searchableText, term),
  );
}

function scoreFastStartMatch(
  catalogSound: MobileCatalogSound,
  normalizedQuery: string,
  queryTokens: string[],
  positiveIntents: FastStartIntent[],
  preferences: LocalPreferenceFeedback = defaultLocalPreferenceFeedback,
): number {
  const searchableText = buildSearchableFastStartText(catalogSound);
  const primaryText = normalizeFastStartText(
    [catalogSound.title, catalogSound.category, ...catalogSound.tags].join(" "),
  );
  let score = searchableText.includes(normalizedQuery) ? 30 : 0;

  const normalizedLane = normalizeFastStartText(catalogSound.lane);
  for (const intent of positiveIntents) {
    if (matchesIntent(catalogSound, intent)) {
      score += 50;
    }
    if (intentMatchesPreferredLane(intent, normalizedLane)) {
      score += 34;
    }
  }

  for (const token of queryTokens) {
    if (["avoid", "no", "without"].includes(token)) {
      continue;
    }
    if (primaryText.split(" ").includes(token)) {
      score += 18;
    }
    if (searchableText.split(" ").includes(token)) {
      score += 12;
    } else if (searchableText.includes(token)) {
      score += 6;
    }
  }

  return score + getFastStartQueryBoost(catalogSound, normalizedQuery) + getFastStartPreferenceScore(catalogSound, preferences);
}

function isFanAirHumNoiseFamily(catalogSound: MobileCatalogSound): boolean {
  const lane = normalizeFastStartText(catalogSound.lane);
  const category = normalizeFastStartText(catalogSound.category);
  if (lane.includes("fan") || lane.includes("noise") || category.includes("fan air room") || category.includes("noise colors")) {
    return true;
  }

  const familyText = normalizeFastStartText([
    catalogSound.title,
    catalogSound.subtitle,
    ...catalogSound.tags.filter((tag) => !normalizeFastStartText(tag).includes("background noise")),
  ].join(" "));
  return [
    "fan",
    "airflow",
    "soft air",
    "interior air",
    "room hum",
    "room tone",
    "hvac",
    "extractor",
    "appliance hum",
    "white noise",
    "brown noise",
    "pink noise",
    "steady noise",
  ].some((term) => includesFastStartPhrase(familyText, term));
}

function intentMatchesPreferredLane(intent: FastStartIntent, normalizedLane: string): boolean {
  if (intent.key === "rain") return normalizedLane.includes("rain");
  if (intent.key === "fan-air") return normalizedLane.includes("fan");
  if (intent.key === "water") return normalizedLane.includes("water");
  if (intent.key === "forest") return normalizedLane.includes("forest");
  if (["brown-noise", "pink-noise", "white-noise"].includes(intent.key)) return normalizedLane.includes("noise");
  if (intent.key === "relax") return normalizedLane.includes("fan") || normalizedLane.includes("noise");
  if (intent.key === "typing-writing") return normalizedLane.includes("writing");
  if (intent.key === "paper") return normalizedLane.includes("paper");
  if (intent.key === "fabric") return normalizedLane.includes("fabric");
  if (intent.key === "tapping") return normalizedLane.includes("tapping");
  return false;
}

function getFastStartPreferenceScore(catalogSound: MobileCatalogSound, preferences: LocalPreferenceFeedback): number {
  if (preferences.avoidedSoundIds.includes(catalogSound.id)) {
    return -1000;
  }

  const searchable = buildSearchableFastStartText(catalogSound);
  let score = 0;
  if (preferences.likedSoundIds.includes(catalogSound.id)) score += 36;
  if (preferences.dislikedSoundIds.includes(catalogSound.id)) score -= 34;
  for (const tag of preferences.tagBoosts) {
    if (includesFastStartPhrase(searchable, tag)) score += 12;
  }
  for (const tag of preferences.tagAvoids) {
    if (includesFastStartPhrase(searchable, tag)) score -= 14;
  }
  return score;
}

function getFastStartQueryBoost(catalogSound: MobileCatalogSound, normalizedQuery: string): number {
  const title = normalizeFastStartText(catalogSound.title);
  const lane = normalizeFastStartText(catalogSound.lane);
  let boost = 0;

  if (includesFastStartPhrase(normalizedQuery, "soft rain") && title.includes("soft rain")) boost += 40;
  if (includesFastStartPhrase(normalizedQuery, "heavy rain") && (title.includes("long rain") || title.includes("rain on tarp"))) boost += 36;
  if (includesFastStartPhrase(normalizedQuery, "room hum") && title.includes("low room hum")) boost += 42;
  if (includesFastStartPhrase(normalizedQuery, "fan") && title.includes("fan")) boost += 32;
  if (includesFastStartPhrase(normalizedQuery, "air") && title.includes("air")) boost += 30;
  if (includesFastStartPhrase(normalizedQuery, "creek") && title.includes("creek")) boost += 42;
  if (includesFastStartPhrase(normalizedQuery, "river") && title.includes("river")) boost += 36;
  if (includesFastStartPhrase(normalizedQuery, "night") && title.includes("night")) boost += 34;
  if (includesFastStartPhrase(normalizedQuery, "crickets") && title.includes("crickets")) boost += 36;
  if (includesFastStartPhrase(normalizedQuery, "typing") && title.includes("typing")) boost += 38;
  if (includesFastStartPhrase(normalizedQuery, "writing") && title.includes("writing")) boost += 38;
  if ((includesFastStartPhrase(normalizedQuery, "paper") || includesFastStartPhrase(normalizedQuery, "pages")) && lane.includes("paper")) boost += 34;
  if ((includesFastStartPhrase(normalizedQuery, "paper") || includesFastStartPhrase(normalizedQuery, "pages")) && (title.includes("page") || title.includes("book"))) boost += 42;
  if (includesFastStartPhrase(normalizedQuery, "brown noise") && title.includes("brown noise soft shell")) boost += 34;
  if (includesFastStartPhrase(normalizedQuery, "pink noise") && title.includes("pink noise smooth a")) boost += 34;
  if (includesFastStartPhrase(normalizedQuery, "white noise") && title.includes("white noise soft a")) boost += 34;
  if (includesFastStartPhrase(normalizedQuery, "fabric") && title.includes("fabric")) boost += 38;
  if (includesFastStartPhrase(normalizedQuery, "soft texture") && lane.includes("fabric")) boost += 28;
  if (includesFastStartPhrase(normalizedQuery, "tapping") && lane.includes("tapping")) boost += 36;
  if (includesFastStartPhrase(normalizedQuery, "soft tapping") && lane.includes("tapping")) boost += 60;
  if (includesFastStartPhrase(normalizedQuery, "soft tapping") && title.includes("tapping")) boost += 34;

  return boost;
}

function formatSoundUserTags(catalogSound: MobileCatalogSound): string {
  const normalizedLane = normalizeFastStartText(catalogSound.lane);
  if (normalizedLane.includes("rain")) return "rain · background";
  if (normalizedLane.includes("fan")) return "fan / air · room ambience";
  if (normalizedLane.includes("water")) return "water · river / creek";
  if (normalizedLane.includes("forest")) return "nature · night ambience";
  if (normalizedLane.includes("noise")) return "steady noise · background";
  if (normalizedLane.includes("writing")) return "typing / writing · texture";
  if (normalizedLane.includes("paper")) return "paper / pages · texture";
  if (normalizedLane.includes("fabric")) return "fabric · soft texture";
  if (normalizedLane.includes("tapping")) return "soft tapping · accent";
  return catalogSound.lane;
}

function getLoopUnavailableHelperLabel(catalogSound: MobileCatalogSound): string {
  const searchableText = normalizeFastStartText(
    [catalogSound.lane, catalogSound.category, catalogSound.subtitle, ...catalogSound.tags].join(" "),
  );

  if (searchableText.includes("accent") || searchableText.includes("tapping")) {
    return "Best as a short accent.";
  }

  if (
    searchableText.includes("texture") ||
    searchableText.includes("writing") ||
    searchableText.includes("typing") ||
    searchableText.includes("paper") ||
    searchableText.includes("fabric")
  ) {
    return "Best as a short texture.";
  }

  return "Plays once.";
}

function getFallbackSuggestions(
  positiveIntents: FastStartIntent[],
  avoidedIntents: FastStartIntent[],
  preferences: LocalPreferenceFeedback = defaultLocalPreferenceFeedback,
): MobileCatalogSound[] {
  const preferredIntents = positiveIntents.length
    ? positiveIntents
    : fastStartIntents.filter((intent) =>
        ["rain", "fan-air", "water", "forest", "brown-noise", "pink-noise", "white-noise", "paper", "fabric", "tapping"].includes(intent.key),
      );

  return mobileCatalogSounds
    .filter((catalogSound) => !catalogSound.userChoiceOnly)
    .filter((catalogSound) => !preferences.avoidedSoundIds.includes(catalogSound.id))
    .filter((catalogSound) => !matchesAnyIntent(catalogSound, avoidedIntents))
    .map((catalogSound) => ({
      catalogSound,
      score: preferredIntents.reduce(
        (currentScore, intent) => currentScore + (matchesIntent(catalogSound, intent) ? 1 : 0),
        0,
      ),
    }))
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score || a.catalogSound.title.localeCompare(b.catalogSound.title))
    .slice(0, 3)
    .map((match) => match.catalogSound);
}

function buildSearchableFastStartText(catalogSound: MobileCatalogSound): string {
  return normalizeFastStartText(
    [
      catalogSound.title,
      catalogSound.subtitle,
      catalogSound.lane,
      catalogSound.category,
      ...catalogSound.tags,
      catalogSound.clearLabelRequired ? "clear label" : "",
      catalogSound.userChoiceOnly ? "user choice" : "",
    ].join(" "),
  );
}

function matchesBrowseSearch(catalogSound: MobileCatalogSound, normalizedSearchText: string): boolean {
  if (!normalizedSearchText) {
    return true;
  }

  return buildSearchableFastStartText(catalogSound).includes(normalizedSearchText);
}

function matchesAnyIntent(catalogSound: MobileCatalogSound, intents: FastStartIntent[]): boolean {
  return intents.some((intent) => matchesIntent(catalogSound, intent));
}

function buildFastStartRecipeIntent(
  recommendation: FastStartRecommendation | null,
  refinement: FastStartRecipeRefinement,
): string {
  if (!recommendation) {
    return "soft background";
  }

  const baseIntent = recommendation.recipeIntent;
  if (refinement === "more-texture") return `${baseIntent} soft texture paper fabric`;
  if (refinement === "softer") return `${baseIntent} soft steady quiet background`;
  if (refinement === "less-water") return `${baseIntent} no water no rain`;
  return baseIntent;
}

function getFastStartRecipeDensity(
  recommendation: FastStartRecommendation,
  refinement: FastStartRecipeRefinement,
): RecipeDensity {
  if (refinement === "more-texture") return "textured";
  if (refinement === "softer" || refinement === "less-water") return "minimal";
  if (isTextureRichFastStartIntent(recommendation.recipeIntent)) return "textured";
  if (isNarrowSingleSoundIntent(recommendation.recipeIntent)) return "minimal";
  return "balanced";
}

function getFastStartRecipePositiveTags(refinement: FastStartRecipeRefinement): string[] {
  if (refinement === "more-texture") return ["texture", "paper", "fabric", "soft"];
  if (refinement === "softer") return ["soft", "stable_bed", "steady"];
  return [];
}

function getFastStartRecipeAvoidanceTags(
  avoidedIntents: FastStartIntent[],
  refinement: FastStartRecipeRefinement,
): string[] {
  const avoidanceTags = avoidedIntents.flatMap((intent) => intent.aliases.slice(0, 2));
  if (refinement === "less-water") {
    avoidanceTags.push("water", "rain", "river", "creek");
  }
  return avoidanceTags;
}

function presetHasWaterLayer(preset: MobileBuilderPreset): boolean {
  const waterTerms = ["water", "rain", "river", "creek", "stream"];
  const layerText = normalizeFastStartText(
    [
      preset.title,
      preset.subtitle,
      ...(preset.layeredPreview?.layers ?? []).flatMap((layer) => [layer.label, layer.soundId]),
    ].join(" "),
  );
  return waterTerms.some((term) => layerText.includes(term));
}

function getFastStartRecipeAvailability(
  preset: MobileBuilderPreset | null,
  recipe: GeneratedRecipe | undefined,
): FastStartRecipeAvailability {
  if (!recipe || !preset?.layeredPreview) {
    return { available: false, note: "A single sound is safer than a forced mix for this request." };
  }

  const playableLayerCount = preset.layeredPreview.layers.length;
  const hasChoiceLayer = preset.userChoiceOnly;
  if (playableLayerCount >= 2 || hasChoiceLayer) {
    return { available: true, note: null };
  }

  return {
    available: false,
    note: recipe.rejectedReasonSummary ?? "A single sound is safer than a forced mix for this request.",
  };
}

function decideFastStartPrimaryRecommendation(
  recommendation: FastStartRecommendation | null,
  preset: MobileBuilderPreset | null,
  availability: FastStartRecipeAvailability,
): FastStartPrimaryRecommendation {
  if (!recommendation || !preset || !availability.available) return "sound";
  if (recommendation.allowUserChoice) return "sound";
  if (isNarrowSingleSoundIntent(recommendation.recipeIntent)) return "sound";
  if (isTextureRichFastStartIntent(recommendation.recipeIntent) && recipeHasBedAndTexture(preset)) return "recipe";
  return "sound";
}

function isNarrowSingleSoundIntent(intent: string): boolean {
  const normalizedIntent = normalizeFastStartText(intent);
  return ["white noise", "pink noise", "brown noise", "rain", "fan", "room hum", "river", "creek"].some((term) =>
    includesFastStartPhrase(normalizedIntent, term),
  );
}

function isTextureRichFastStartIntent(intent: string): boolean {
  const normalizedIntent = normalizeFastStartText(intent);
  return ["paper", "writing", "pencil", "typing", "soft texture", "texture", "fabric", "forest with texture"].some((term) =>
    includesFastStartPhrase(normalizedIntent, term),
  );
}

function recipeHasBedAndTexture(preset: MobileBuilderPreset): boolean {
  const roles = new Set(preset.layeredPreview?.layers.map((layer) => layer.role) ?? []);
  return roles.has("Background") && (roles.has("Texture") || roles.has("Accent"));
}

function getFastStartPrimaryRecommendationCopy(primary: FastStartPrimaryRecommendation): string {
  return primary === "recipe"
    ? "Recommended: layered recipe."
    : "Recommended: best sound.";
}

function formatFastStartRecipeLayerRole(role: MobileBuilderPresetLayerRole): string {
  if (role === "Background") return "Background";
  if (role === "Texture") return "Texture";
  return "Accent";
}

function recipeToMobileBuilderPreset(
  recipe: GeneratedRecipe | undefined,
  soundById: Map<string, MobileCatalogSound>,
): MobileBuilderPreset | null {
  if (!recipe) {
    return null;
  }

  const transfer = transferGeneratedRecipeLayers(recipe, soundById);
  if (transfer.status === "unavailable") {
    return null;
  }
  const playableLayers = transfer.layers;

  const previewLayers: LayeredPreviewLayer[] = playableLayers.map(({ layer, catalogSound }, index) => ({
    builderLayerId: `${layer.role}:${index}`,
    role: roleToBuilderRole(layer.role),
    soundId: layer.soundId,
    label: catalogSound.title,
    volume: layer.volumeDefault,
    balanceLabel: normalizeBuilderBalanceLabel(balanceLabelForRecipeLayer(layer)),
  }));
  const startingSound = playableLayers[0].catalogSound;
  const hasChoiceLayer = playableLayers.some(({ layer, catalogSound }) => layer.userChoiceOnly || catalogSound.userChoiceOnly);
  const densityLabel = formatBuilderDensity(recipe.density);
  const roleSummary = previewLayers.map((layer) => layer.role).join(" / ");

  return {
    id: `builder-v3-${recipe.id}`,
    title: `Generated ${densityLabel} Recipe`,
    subtitle: `${recipe.normalizedIntent} · ${previewLayers.length} layer${previewLayers.length === 1 ? "" : "s"}`,
    useCase: recipe.whyThisRecipe[0] ?? `Generated from ${recipe.normalizedIntent}.`,
    layerSummary: `${previewLayers.length} layers · Generated recipe · ${roleSummary}`,
    startingSoundId: startingSound.id,
    startingSoundLabel: startingSound.title,
    layers: playableLayers.map(({ layer, catalogSound }) => ({
      role: roleToBuilderRole(layer.role),
      name: catalogSound.title,
      soundId: catalogSound.id,
      balanceLabel: balanceLabelForRecipeLayer(layer),
    })),
    clearLabelRequired: hasChoiceLayer,
    userChoiceOnly: hasChoiceLayer,
    layeredPreview: {
      label: `Generated ${densityLabel.toLowerCase()} preview`,
      availabilityLabel: "Layered preview available",
      recipeAccuracy: "Close recipe",
      note: "Generated by Local Recipe Engine v1. Layers use conservative volumes and existing playback controls.",
      layers: previewLayers,
    },
    generatedRecipe: recipe,
    generatedWhy: recipe.whyThisRecipe,
    generatedWarnings: recipe.warnings,
  };
}

function roleToBuilderRole(role: RecipeLayerRole | BuilderSessionLayerRole): MobileBuilderPresetLayerRole {
  if (role === "bed") return "Background";
  if (role === "texture") return "Texture";
  if (role === "foreground") return "Foreground";
  return "Accent";
}

function builderRoleToRecipeRole(role: MobileBuilderPresetLayerRole): BuilderSessionLayerRole {
  if (role === "Background") return "bed";
  if (role === "Texture") return "texture";
  if (role === "Foreground") return "foreground";
  return "accent";
}

function formatRecipeRoleLabel(role: RecipeLayerRole): string {
  return roleToBuilderRole(role);
}

function getConsumerLayerExplanation(role: RecipeLayerRole): string {
  if (role === "bed") return "A steady foundation for the mix.";
  if (role === "texture") return "Adds soft, noticeable detail.";
  return "Adds a light finishing note.";
}

function formatBuilderDensity(density: RecipeDensity): string {
  if (density === "minimal") return "Minimal";
  if (density === "textured") return "Textured";
  return "Balanced";
}

function balanceLabelForRecipeLayer(layer: RecipeLayer): string {
  if (layer.role === "bed") return "Balanced";
  if (layer.volumeDefault <= 0.12) return "Quiet";
  if (layer.volumeDefault >= 0.3) return "Present";
  return "Balanced";
}

function getLayerSwapOptionsForPreset(preset: MobileBuilderPreset, layer: LayeredPreviewLayer): MobileCatalogSound[] {
  const currentSound = mobileCatalogSounds.find((catalogSound) => catalogSound.id === layer.soundId);
  const recipeRole = builderRoleToRecipeRole(layer.role);
  const defaultSafeM6 = getDefaultSafeM6BuilderDiscoveryCandidatesV1(recipeRole);
  const generatedAlternativeIds = recipeRole === "foreground"
    ? []
    : preset.generatedRecipe?.alternatives[recipeRole]?.map((alternative) => alternative.soundId) ?? [];
  const generatedAlternatives = generatedAlternativeIds
    .map((soundId) => mobileCatalogSounds.find((catalogSound) => catalogSound.id === soundId))
    .filter(isMobileCatalogSound);

  if (currentSound && generatedAlternatives.length > 0) {
    return Array.from(new Map(
      [currentSound, ...defaultSafeM6, ...generatedAlternatives].map((catalogSound) => [catalogSound.id, catalogSound]),
    ).values()).slice(0, 6);
  }

  return getLayerSwapOptions(layer);
}

function getPresetAvoidedConflictSound(
  preset: MobileBuilderPreset,
  intents: FastStartIntent[],
): MobileCatalogSound | null {
  if (!intents.length) {
    return null;
  }

  const presetSoundIds = new Set<string>([preset.startingSoundId]);
  preset.layers.forEach((layer) => {
    if (layer.soundId) {
      presetSoundIds.add(layer.soundId);
    }
  });
  preset.layeredPreview?.layers.forEach((layer) => presetSoundIds.add(layer.soundId));

  for (const soundId of presetSoundIds) {
    const catalogSound = mobileCatalogSounds.find((soundRow) => soundRow.id === soundId);
    if (catalogSound && matchesAnyIntent(catalogSound, intents)) {
      return catalogSound;
    }
  }

  return null;
}

function getBuilderLayerId(preset: MobileBuilderPreset | null, layer: LayeredPreviewLayer): string {
  if (layer.builderLayerId) return layer.builderLayerId;
  const layerIndex = preset?.layeredPreview?.layers.indexOf(layer) ?? -1;
  return `${builderRoleToRecipeRole(layer.role)}:${Math.max(0, layerIndex)}`;
}

function buildBuilderLayerKey(preset: MobileBuilderPreset, layer: LayeredPreviewLayer): string {
  return `${preset.id}:${getBuilderLayerId(preset, layer)}`;
}

function isBuilderLayerEnabled(
  preset: MobileBuilderPreset,
  layer: LayeredPreviewLayer,
  enabledLayerKeys: Record<string, boolean>,
): boolean {
  if (layer.role === "Background") {
    return true;
  }

  return enabledLayerKeys[buildBuilderLayerKey(preset, layer)] ?? true;
}

function normalizeBuilderBalanceLabel(balanceLabel: string): BuilderLayerBalance {
  const normalized = balanceLabel.toLowerCase();
  if (normalized.includes("quiet")) return "Quiet";
  if (normalized.includes("present")) return "Present";
  return "Balanced";
}

function getBuilderBalanceVolume(role: MobileBuilderPresetLayerRole, balance: BuilderLayerBalance): number {
  const volumeByRole: Record<MobileBuilderPresetLayerRole, Record<BuilderLayerBalance, number>> = {
    Background: { Quiet: 0.34, Balanced: 0.46, Present: 0.54 },
    Texture: { Quiet: 0.12, Balanced: 0.2, Present: 0.3 },
    Accent: { Quiet: 0.08, Balanced: 0.12, Present: 0.18 },
    Foreground: { Quiet: 0.1, Balanced: 0.16, Present: 0.22 },
  };

  return volumeByRole[role][balance];
}

function getBalanceDescription(balance: BuilderLayerBalance): string {
  if (balance === "Quiet") return "subtle";
  if (balance === "Present") return "more noticeable";
  return "normal blend";
}

function formatLayerRoleLabel(role: MobileBuilderPresetLayerRole): string {
  if (role === "Background") return "Background · base";
  if (role === "Texture") return "Texture · detail";
  return "Accent · extra";
}

function getControlledPreviewLayer(
  preset: MobileBuilderPreset,
  layer: LayeredPreviewLayer,
  balances: Record<string, BuilderLayerBalance>,
  swaps: Record<string, string>,
): LayeredPreviewLayer {
  const layerKey = buildBuilderLayerKey(preset, layer);
  const balance = balances[layerKey] ?? normalizeBuilderBalanceLabel(layer.balanceLabel);
  const swappedSoundId = swaps[layerKey] ?? layer.soundId;
  const swappedSound = mobileCatalogSounds.find((catalogSound) => catalogSound.id === swappedSoundId);

  return {
    ...layer,
    soundId: swappedSound?.id ?? layer.soundId,
    label: swappedSound?.title ?? layer.label,
    volume: balances[layerKey] === undefined && swaps[layerKey] === undefined && layer.savedVolume !== undefined
      ? layer.savedVolume
      : getBuilderBalanceVolume(layer.role, balance),
    balanceLabel: balance,
  };
}

function getActiveLayeredPreviewLayers(
  preset: MobileBuilderPreset,
  preview: LayeredPreviewConfig,
  enabledLayerKeys: Record<string, boolean>,
  balances: Record<string, BuilderLayerBalance>,
  swaps: Record<string, string>,
): LayeredPreviewLayer[] {
  return preview.layers
    .filter((layer) => isBuilderLayerEnabled(preset, layer, enabledLayerKeys))
    .map((layer) => getControlledPreviewLayer(preset, layer, balances, swaps));
}

function getLayerSwapOptions(layer: LayeredPreviewLayer): MobileCatalogSound[] {
  const currentSound = mobileCatalogSounds.find((catalogSound) => catalogSound.id === layer.soundId);
  if (!currentSound) {
    return [];
  }

  const compatibleLanes = new Set([currentSound.lane]);
  if (currentSound.lane === "Writing / Typing") compatibleLanes.add("Paper / Pages");
  if (currentSound.lane === "Paper / Pages") compatibleLanes.add("Writing / Typing");
  if (currentSound.lane === "Fabric / Soft Texture") compatibleLanes.add("Fabric / Soft Texture");
  if (currentSound.lane === "Fan / Air / Room") compatibleLanes.add("Fan / Air / Room");
  if (currentSound.lane === "Water") compatibleLanes.add("Water");
  if (currentSound.lane === "Rain") compatibleLanes.add("Rain");
  if (currentSound.lane === "Tapping / Object Foley") compatibleLanes.add("Tapping / Object Foley");

  const defaultSafeM6 = getDefaultSafeM6BuilderDiscoveryCandidatesV1(builderRoleToRecipeRole(layer.role));
  const legacyOptions = mobileCatalogSounds
    .filter((catalogSound) => compatibleLanes.has(catalogSound.lane))
    .filter((catalogSound) => {
      if (layer.role === "Background") {
        return catalogSound.tags.includes("background") || catalogSound.tags.includes("background_bed");
      }
      if (layer.role === "Accent") {
        return catalogSound.tags.includes("accent") || catalogSound.lane === "Tapping / Object Foley" || catalogSound.lane === "Paper / Pages";
      }
      return catalogSound.tags.includes("texture") || catalogSound.tags.includes("background_bed") || catalogSound.lane === currentSound.lane;
    })
    .slice(0, 6);
  return Array.from(new Map(
    [currentSound, ...defaultSafeM6, ...legacyOptions].map((catalogSound) => [catalogSound.id, catalogSound]),
  ).values()).slice(0, 6);
}

function matchesIntent(catalogSound: MobileCatalogSound, intent: FastStartIntent): boolean {
  const searchableText = buildSearchableFastStartText(catalogSound);
  const soundAliases = intent.soundAliases ?? intent.aliases;
  return soundAliases.some((alias) => includesFastStartPhrase(searchableText, alias));
}

function includesFastStartPhrase(text: string, phrase: string): boolean {
  const normalizedText = ` ${normalizeFastStartText(text)} `;
  const normalizedPhrase = normalizeFastStartText(phrase);
  return normalizedPhrase ? normalizedText.includes(` ${normalizedPhrase} `) : false;
}

function formatIntentLabels(intents: FastStartIntent[]): string {
  return Array.from(new Set(intents.map((intent) => intent.label))).join(", ");
}

function normalizeFastStartText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

const warmStonePalette = {
  midnightOak: "#2E2418",
  candlelight: "#C4935A",
  linen: "#F5F0E8",
  sand: "#E8DCCA",
  walnut: "#7A6A52",
  sageMist: "#C8D4BE",
  dustyRose: "#D8C4BC",
  darkEarth: "#4A3828",
  amberGlow: "#C4935A33",
  forestDeep: "#344830",
} as const;

const visualTheme = {
  ...warmStonePalette,
  background: warmStonePalette.linen,
  surface: warmStonePalette.sand,
  elevated: "#EFE5D6",
  panelBotanical: warmStonePalette.amberGlow,
  selectedSurface: warmStonePalette.amberGlow,
  selectionSurface: warmStonePalette.darkEarth,
  presetSelectedSurface: "#E4CDA6",
  border: "#D1C1A9",
  borderStrong: warmStonePalette.darkEarth,
  accentDeep: warmStonePalette.candlelight,
  accentSeaGlass: warmStonePalette.candlelight,
  accentSeaGlassSoft: warmStonePalette.amberGlow,
  accentSand: warmStonePalette.candlelight,
  accentSandDeep: warmStonePalette.darkEarth,
  accentMist: warmStonePalette.darkEarth,
  accentMistSoft: warmStonePalette.darkEarth,
  accentSage: warmStonePalette.sageMist,
  accentRose: warmStonePalette.dustyRose,
  labelText: warmStonePalette.darkEarth,
  warningSurface: "#F2E4CE",
  dangerText: "#8A3E2E",
  text: warmStonePalette.midnightOak,
  textOnDark: warmStonePalette.linen,
  textMuted: warmStonePalette.walnut,
  textSubtle: warmStonePalette.walnut,
  inkText: warmStonePalette.midnightOak,
} as const;

const styles = StyleSheet.create({
  classicNavigationOwnerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
    zIndex: 20,
  },
  classicNavigationOwnedViewHidden: {
    display: "none",
  },
  safeArea: {
    flex: 1,
    backgroundColor: visualTheme.background,
  },
  container: {
    padding: mobileUxTokens.sectionPadding,
    gap: mobileUxTokens.spacing.md,
  },
  onboardingLoadingShell: {
    alignItems: "center",
    flex: 1,
    gap: 12,
    justifyContent: "center",
    padding: 20,
  },
  onboardingLoadingText: {
    color: visualTheme.textMuted,
    fontSize: 14,
    fontWeight: "800",
  },
  onboardingContainer: {
    gap: 12,
    padding: 14,
    paddingBottom: 26,
  },
  onboardingHeroCard: {
    backgroundColor: visualTheme.elevated,
    borderColor: visualTheme.borderStrong,
    borderRadius: 22,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  onboardingCard: {
    backgroundColor: visualTheme.surface,
    borderColor: visualTheme.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  onboardingQueryCard: {
    backgroundColor: visualTheme.panelBotanical,
    borderColor: visualTheme.accentDeep,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  onboardingTitle: {
    color: visualTheme.text,
    fontSize: 26,
    fontWeight: "900",
    lineHeight: 31,
  },
  onboardingCardTitle: {
    color: visualTheme.text,
    fontSize: 19,
    fontWeight: "900",
    lineHeight: 24,
  },
  onboardingEyebrow: {
    color: visualTheme.accentMist,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  onboardingBody: {
    color: visualTheme.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  onboardingNote: {
    alignSelf: "flex-start",
    backgroundColor: visualTheme.accentSage,
    borderRadius: 999,
    color: visualTheme.darkEarth,
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  onboardingStepRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  onboardingStepPill: {
    backgroundColor: visualTheme.surface,
    borderColor: visualTheme.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  onboardingStepPillSelected: {
    backgroundColor: visualTheme.accentDeep,
    borderColor: visualTheme.accentSeaGlass,
  },
  onboardingStepText: {
    color: visualTheme.textMuted,
    fontSize: 12,
    fontWeight: "900",
  },
  onboardingStepTextSelected: {
    color: visualTheme.text,
  },
  onboardingChipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  onboardingChoiceChip: {
    backgroundColor: visualTheme.elevated,
    borderColor: visualTheme.border,
    borderRadius: 14,
    borderWidth: 1,
    flexBasis: "47%",
    flexGrow: 1,
    gap: 3,
    minWidth: 132,
    padding: 10,
  },
  onboardingChoiceChipSelected: {
    backgroundColor: visualTheme.selectedSurface,
    borderColor: visualTheme.accentDeep,
    borderWidth: 2,
  },
  onboardingChoiceText: {
    color: visualTheme.text,
    fontSize: 13,
    fontWeight: "900",
  },
  onboardingChoiceTextSelected: {
    color: visualTheme.text,
  },
  onboardingChoiceHelper: {
    color: visualTheme.textMuted,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 15,
  },
  onboardingChoiceHelperSelected: {
    color: visualTheme.darkEarth,
  },
  onboardingAvoidChip: {
    backgroundColor: visualTheme.elevated,
    borderColor: visualTheme.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  onboardingAvoidChipSelected: {
    backgroundColor: visualTheme.warningSurface,
    borderColor: visualTheme.accentSandDeep,
  },
  onboardingAvoidText: {
    color: visualTheme.textMuted,
    fontSize: 13,
    fontWeight: "900",
  },
  onboardingAvoidTextSelected: {
    color: visualTheme.darkEarth,
  },
  onboardingQueryText: {
    color: visualTheme.text,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 22,
  },
  onboardingActionRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  appLabel: {
    color: visualTheme.accentMist,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  title: {
    color: visualTheme.text,
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 26,
  },
  description: {
    color: visualTheme.textMuted,
    fontSize: 13,
    lineHeight: 16,
  },
  sectionNavCard: {
    backgroundColor: visualTheme.elevated,
    borderColor: visualTheme.borderStrong,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  sectionNavLabel: {
    color: visualTheme.accentMist,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  sectionNavChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sectionNavChip: {
    backgroundColor: visualTheme.surface,
    borderColor: visualTheme.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  sectionNavChipSelected: {
    backgroundColor: visualTheme.accentDeep,
    borderColor: visualTheme.accentSeaGlass,
  },
  sectionNavChipText: {
    color: visualTheme.textMuted,
    fontSize: 13,
    fontWeight: "800",
  },
  sectionNavChipTextSelected: {
    color: visualTheme.text,
  },

  topHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  compactAppHeader: {
    alignItems: "center",
    backgroundColor: visualTheme.elevated,
    borderRadius: mobileUxTokens.radius.card,
    flexDirection: "row",
    gap: mobileUxTokens.spacing.sm,
    justifyContent: "space-between",
    minHeight: mobileUxTokens.controlMinHeight,
    paddingHorizontal: mobileUxTokens.cardPadding,
    paddingVertical: mobileUxTokens.spacing.xs,
  },
  classicHeaderStacked: {
    alignItems: "stretch",
    flexDirection: "column",
  },
  directedReturnRow: {
    alignItems: "flex-start",
    marginBottom: mobileUxTokens.spacing.xs,
  },
  topHeaderTitleBlock: {
    flex: 1,
    flexShrink: 1,
    gap: 2,
    minWidth: 0,
  },
  settingsEntryButton: {
    backgroundColor: visualTheme.elevated,
    borderColor: visualTheme.accentDeep,
    borderRadius: mobileUxTokens.radius.chip,
    borderWidth: 1,
    flexShrink: 0,
    justifyContent: "center",
    minHeight: mobileUxTokens.controlMinHeight,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  settingsEntryButtonActive: {
    backgroundColor: visualTheme.accentDeep,
    borderColor: visualTheme.accentSeaGlass,
  },
  settingsEntryText: {
    color: visualTheme.accentSeaGlass,
    fontSize: 13,
    fontWeight: "900",
  },
  settingsEntryTextActive: {
    color: visualTheme.text,
  },
  settingsPanel: {
    backgroundColor: visualTheme.elevated,
    borderColor: visualTheme.borderStrong,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  settingsHeaderRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  settingsHeaderTextBlock: {
    flex: 1,
    flexShrink: 1,
    gap: 2,
    minWidth: 0,
  },
  settingsEyebrow: {
    color: visualTheme.accentMist,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  settingsTitle: {
    color: visualTheme.text,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 22,
  },
  settingsSection: {
    backgroundColor: visualTheme.surface,
    borderColor: visualTheme.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: 7,
    padding: 10,
  },
  settingsSectionTitle: {
    color: visualTheme.accentMist,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  settingsDiagnosticSection: {
    backgroundColor: visualTheme.background,
    borderColor: visualTheme.border,
    opacity: 0.88,
  },
  settingsDiagnosticTitle: {
    color: visualTheme.textMuted,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  settingsDiagnosticHelper: {
    color: visualTheme.textSubtle,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 15,
  },
  settingsBodyText: {
    color: visualTheme.textMuted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },
  settingsActionRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  settingsConfirmText: {
    color: visualTheme.dangerText,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
  },
  playbackTimingTraceText: {
    backgroundColor: visualTheme.background,
    borderColor: visualTheme.border,
    borderRadius: 10,
    borderWidth: 1,
    color: visualTheme.textMuted,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 16,
    padding: 9,
  },
  settingsChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  settingsChip: {
    alignItems: "center",
    backgroundColor: visualTheme.background,
    borderColor: visualTheme.border,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  settingsChipSelected: {
    backgroundColor: visualTheme.accentDeep,
    borderColor: visualTheme.accentSeaGlass,
  },
  settingsChipText: {
    color: visualTheme.textMuted,
    fontSize: 12,
    fontWeight: "900",
  },
  settingsChipTextSelected: {
    color: visualTheme.text,
  },
  selectedCard: {
    backgroundColor: visualTheme.elevated,
    borderColor: visualTheme.border,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  fastStartCard: {
    backgroundColor: visualTheme.elevated,
    borderRadius: mobileUxTokens.radius.section,
    padding: mobileUxTokens.sectionPadding,
    gap: mobileUxTokens.spacing.sm,
  },
  fastStartEyebrow: {
    color: visualTheme.accentSeaGlass,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  fastStartTitle: {
    color: visualTheme.text,
    fontSize: 24,
    fontWeight: "800",
  },
  fastStartDescription: {
    color: visualTheme.textMuted,
    fontSize: 15,
    lineHeight: 21,
  },
  fastStartSearchBox: {
    gap: 8,
  },
  fastStartInput: {
    backgroundColor: visualTheme.surface,
    borderColor: visualTheme.border,
    borderRadius: 14,
    borderWidth: 1,
    color: visualTheme.text,
    fontSize: 15,
    height: 48,
    paddingHorizontal: 14,
    paddingVertical: 0,
  },
  fastStartSearchActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  activeAvoidanceBox: {
    backgroundColor: visualTheme.warningSurface,
    borderColor: visualTheme.accentSandDeep,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
    padding: 10,
  },
  activeAvoidanceTitle: {
    color: visualTheme.dangerText,
    fontSize: 14,
    fontWeight: "800",
  },
  activeAvoidanceText: {
    color: visualTheme.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  fastStartChipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  fastStartChip: {
    backgroundColor: visualTheme.surface,
    borderColor: visualTheme.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  fastStartChipSelected: {
    backgroundColor: visualTheme.accentDeep,
    borderColor: visualTheme.accentSeaGlass,
  },
  fastStartChipText: {
    color: visualTheme.textMuted,
    fontSize: 14,
    fontWeight: "800",
  },
  fastStartChipTextSelected: {
    color: visualTheme.text,
  },
  avoidedText: {
    color: visualTheme.accentSand,
  },
  fastStartMatchNote: {
    color: visualTheme.accentSeaGlass,
    fontSize: 13,
    fontWeight: "700",
  },
  fastStartNoticeNote: {
    color: visualTheme.accentSand,
  },
  fastStartNoMatchNote: {
    color: visualTheme.dangerText,
  },
  fastStartResultCard: {
    backgroundColor: visualTheme.panelBotanical,
    borderColor: visualTheme.accentDeep,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    padding: 12,
  },
  fastStartCurrentSessionBox: {
    backgroundColor: visualTheme.surface,
    borderColor: visualTheme.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
    padding: 9,
  },
  fastStartResultSection: {
    backgroundColor: visualTheme.elevated,
    borderColor: visualTheme.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    padding: 10,
  },
  fastStartResultEyebrow: {
    color: visualTheme.accentSeaGlass,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  fastStartResultHeader: {
    alignItems: "stretch",
    flexDirection: "column",
    gap: 6,
  },
  fastStartResultPillRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "flex-start",
  },
  fastStartChoiceNote: {
    color: visualTheme.textMuted,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
  },
  fastStartResultTags: {
    color: visualTheme.textMuted,
    fontSize: 12,
    fontWeight: "800",
  },
  fastStartWhyBox: {
    backgroundColor: visualTheme.surface,
    borderColor: visualTheme.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
    padding: 9,
  },
  fastStartWhyText: {
    color: visualTheme.textMuted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  fastStartHelperText: {
    backgroundColor: visualTheme.surface,
    borderColor: visualTheme.border,
    borderRadius: 12,
    borderWidth: 1,
    color: visualTheme.textMuted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
    padding: 9,
  },
  fastStartResultActions: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  feedbackChipStack: {
    gap: 6,
  },
  feedbackChipRow: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "flex-start",
  },
  feedbackChip: {
    alignItems: "center",
    backgroundColor: visualTheme.surface,
    borderColor: visualTheme.borderStrong,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: mobileUxTokens.controlMinHeight,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  feedbackChipSelected: {
    backgroundColor: visualTheme.accentSage,
    borderColor: visualTheme.darkEarth,
    borderWidth: 2,
  },
  feedbackChipDangerSelected: {
    backgroundColor: visualTheme.warningSurface,
    borderColor: visualTheme.dangerText,
  },
  feedbackChipText: {
    color: visualTheme.darkEarth,
    fontSize: 11,
    fontWeight: "900",
  },
  feedbackChipTextSelected: {
    color: visualTheme.midnightOak,
  },
  feedbackHelperText: {
    color: visualTheme.textMuted,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 15,
  },
  quickFeedbackRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  quickFeedbackButton: {
    alignItems: "center",
    backgroundColor: visualTheme.surface,
    borderColor: visualTheme.borderStrong,
    borderRadius: 999,
    borderWidth: 1,
    height: mobileUxTokens.controlMinHeight,
    justifyContent: "center",
    width: mobileUxTokens.controlMinHeight,
  },
  quickFeedbackButtonSelected: {
    backgroundColor: visualTheme.accentSage,
    borderColor: visualTheme.darkEarth,
    borderWidth: 2,
  },
  quickFeedbackIcon: {
    color: visualTheme.darkEarth,
    fontSize: 18,
    fontWeight: "900",
  },
  quickFeedbackIconSelected: {
    color: visualTheme.midnightOak,
    fontSize: 15,
  },
  playerQuickFeedbackBox: {
    alignItems: "flex-start",
    backgroundColor: visualTheme.panelBotanical,
    borderColor: visualTheme.accentDeep,
    borderRadius: mobileUxTokens.radius.card,
    borderWidth: 1,
    gap: 5,
    padding: 8,
  },
  playerQuickFeedbackControls: {
    alignSelf: "flex-start",
  },
  miniQuickFeedbackControls: {
    flexShrink: 0,
    width: 92,
  },
  transientNotificationOverlay: {
    alignItems: "center",
    elevation: 20,
    left: 12,
    position: "absolute",
    right: 12,
    zIndex: 30,
  },
  transientNotificationToast: {
    backgroundColor: visualTheme.accentSage,
    borderColor: visualTheme.darkEarth,
    borderRadius: 12,
    borderWidth: 1,
    color: visualTheme.darkEarth,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 17,
    maxWidth: 520,
    padding: 10,
    textAlign: "center",
    width: "100%",
  },
  savedSessionErrorText: {
    color: visualTheme.dangerText,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
  },
  savedSessionStorageErrorBox: {
    alignItems: "flex-start",
    backgroundColor: visualTheme.warningSurface,
    borderColor: visualTheme.accentSandDeep,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    padding: 10,
    width: "100%",
  },
  savedSessionDuplicateText: {
    color: visualTheme.accentSand,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
  },
  savedSessionModalBackdrop: {
    alignItems: "center",
    backgroundColor: "#2E241899",
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  savedSessionDialog: {
    alignSelf: "center",
    backgroundColor: visualTheme.elevated,
    borderColor: visualTheme.accentDeep,
    borderRadius: 16,
    borderWidth: 1,
    gap: 9,
    maxWidth: 520,
    padding: 12,
    width: "100%",
  },
  savedSessionInput: {
    backgroundColor: visualTheme.surface,
    borderColor: visualTheme.borderStrong,
    borderRadius: 12,
    borderWidth: 1,
    color: visualTheme.text,
    fontSize: 14,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: "100%",
  },
  savedSessionActionRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    width: "100%",
  },
  savedSessionManageBox: {
    backgroundColor: visualTheme.elevated,
    borderColor: visualTheme.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: 7,
    padding: 9,
    width: "100%",
  },
  savedSessionManageLabel: {
    color: visualTheme.accentMist,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  savedSessionManageActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: mobileUxTokens.spacing.sm,
    justifyContent: "space-between",
    width: "100%",
  },
  savedSessionManageActionsStacked: {
    alignItems: "stretch",
    flexDirection: "column",
  },
  savedSessionDeleteConfirmBox: {
    alignItems: "flex-start",
    backgroundColor: visualTheme.warningSurface,
    borderColor: visualTheme.dangerText,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
    padding: 9,
    width: "100%",
  },
  savedSessionDeleteConfirmText: {
    color: visualTheme.dangerText,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 18,
  },
  savedSessionCurrentActions: {
    backgroundColor: visualTheme.panelBotanical,
    borderColor: visualTheme.accentDeep,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginTop: 6,
    padding: 10,
    width: "100%",
  },
  savedSessionCurrentHint: {
    color: visualTheme.darkEarth,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },
  savedAreaTabRow: {
    backgroundColor: visualTheme.surface,
    borderColor: visualTheme.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    padding: 5,
    width: "100%",
  },
  savedAreaTab: {
    alignItems: "center",
    borderRadius: 10,
    flexBasis: "47%",
    flexGrow: 1,
    justifyContent: "center",
    minHeight: 44,
    minWidth: 130,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  savedAreaTabSelected: {
    backgroundColor: visualTheme.accentDeep,
  },
  savedAreaTabText: {
    color: visualTheme.textMuted,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
  },
  savedAreaTabTextSelected: {
    color: visualTheme.text,
  },
  savedDestinationHeading: {
    backgroundColor: visualTheme.surface,
    borderColor: visualTheme.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: 3,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: "100%",
  },
  savedDestinationHeadingText: {
    color: visualTheme.darkEarth,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 23,
  },
  savedDestinationHeadingMeta: {
    color: visualTheme.textMuted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },
  quickMixSection: {
    backgroundColor: visualTheme.panelBotanical,
    borderColor: visualTheme.accentDeep,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    padding: 10,
    width: "100%",
  },
  quickMixList: {
    gap: 8,
    width: "100%",
  },
  quickMixCard: {
    alignItems: "center",
    backgroundColor: visualTheme.elevated,
    borderColor: visualTheme.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
    padding: 10,
    width: "100%",
  },
  quickMixTextBlock: {
    flex: 1,
    flexShrink: 1,
    gap: 3,
    minWidth: 180,
  },
  quickMixLabel: {
    color: visualTheme.accentSeaGlass,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.2,
    lineHeight: 14,
    textTransform: "uppercase",
  },
  quickMixName: {
    color: visualTheme.text,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 17,
    maxWidth: "100%",
  },
  quickMixDetail: {
    color: visualTheme.textMuted,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 15,
  },
  savedSessionList: {
    gap: 9,
    width: "100%",
  },
  savedSessionCard: {
    backgroundColor: visualTheme.surface,
    borderColor: visualTheme.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    overflow: "hidden",
    padding: 11,
    width: "100%",
  },
  savedSessionHeaderRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "space-between",
    width: "100%",
  },
  savedSessionTitleBlock: {
    flex: 1,
    flexShrink: 1,
    gap: 3,
    minWidth: 160,
  },
  savedSessionName: {
    color: visualTheme.text,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 20,
  },
  savedSessionMeta: {
    color: visualTheme.textMuted,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 16,
  },
  savedSessionPillStack: {
    alignItems: "flex-end",
    flexShrink: 1,
    gap: 5,
    maxWidth: "100%",
  },
  savedSessionTypePill: {
    backgroundColor: visualTheme.accentDeep,
    borderRadius: 999,
    color: visualTheme.text,
    fontSize: 10,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 5,
    textAlign: "center",
  },
  savedSessionChoicePill: {
    backgroundColor: visualTheme.accentRose,
    borderRadius: 12,
    color: visualTheme.darkEarth,
    flexShrink: 1,
    fontSize: 10,
    fontWeight: "900",
    lineHeight: 14,
    maxWidth: 190,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 5,
    textAlign: "center",
  },
  savedSessionNote: {
    color: visualTheme.textSubtle,
    fontSize: 12,
    fontStyle: "italic",
    lineHeight: 17,
  },
  savedSessionConfirmBox: {
    backgroundColor: visualTheme.warningSurface,
    borderColor: visualTheme.accentSandDeep,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    padding: 9,
    width: "100%",
  },
  savedSessionChoiceText: {
    color: visualTheme.dangerText,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 17,
  },
  savedResultPill: {
    backgroundColor: visualTheme.accentDeep,
    borderRadius: 999,
    color: visualTheme.text,
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  fastStartAlternativeMeta: {
    color: visualTheme.accentSeaGlass,
    flexShrink: 1,
    flexWrap: "wrap",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
    width: "100%",
  },
  fastStartAlternativeTextBlock: {
    alignSelf: "stretch",
    flexShrink: 1,
    gap: 3,
    minWidth: 0,
    width: "100%",
  },
  fastStartAlternativesBox: {
    gap: 8,
    marginTop: 2,
  },
  fastStartAlternativesTitle: {
    color: visualTheme.accentMist,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  fastStartAlternativeRow: {
    alignItems: "stretch",
    alignSelf: "stretch",
    backgroundColor: visualTheme.elevated,
    borderColor: visualTheme.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "column",
    gap: 10,
    justifyContent: "flex-start",
    minHeight: 58,
    overflow: "hidden",
    padding: 11,
    width: "100%",
  },
  catalogCard: {
    backgroundColor: visualTheme.surface,
    borderRadius: mobileUxTokens.radius.section,
    padding: mobileUxTokens.sectionPadding,
    gap: mobileUxTokens.spacing.md,
  },
  browseIntroText: {
    color: visualTheme.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  discoverySection: {
    backgroundColor: visualTheme.elevated,
    borderRadius: mobileUxTokens.radius.card,
    gap: mobileUxTokens.spacing.sm,
    padding: mobileUxTokens.cardPadding,
  },
  discoverySectionTitle: {
    color: visualTheme.accentMist,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  filterDisclosureButton: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: mobileUxTokens.controlMinHeight,
  },
  filterDisclosureSummary: {
    color: visualTheme.textMuted,
    fontSize: 12,
    fontWeight: "800",
  },
  expandedFilterGroups: {
    gap: mobileUxTokens.spacing.md,
  },
  collectionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    width: "100%",
  },
  collectionCard: {
    alignItems: "center",
    backgroundColor: visualTheme.surface,
    borderColor: visualTheme.border,
    borderRadius: mobileUxTokens.radius.control,
    borderWidth: 1,
    flexBasis: "30%",
    flexGrow: 1,
    justifyContent: "center",
    minHeight: mobileUxTokens.controlMinHeight,
    minWidth: 104,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  collectionCardSelected: {
    backgroundColor: visualTheme.selectedSurface,
    borderColor: visualTheme.accentDeep,
    borderWidth: 2,
  },
  collectionTitle: {
    color: visualTheme.text,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 17,
  },
  collectionTitleSelected: {
    color: visualTheme.darkEarth,
  },
  collectionDescription: {
    color: visualTheme.textMuted,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 15,
  },
  collectionDescriptionSelected: {
    color: visualTheme.darkEarth,
  },
  collectionChoiceLabel: {
    color: visualTheme.dangerText,
    fontSize: 10,
    fontWeight: "900",
    lineHeight: 14,
    textTransform: "uppercase",
  },
  filterGroup: {
    gap: 6,
  },
  filterGroupLabel: {
    color: visualTheme.textMuted,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 16,
  },
  filterChipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  browseIntensityRow: {
    flexWrap: "nowrap",
    width: "100%",
  },
  browseIntensityChip: {
    minWidth: 0,
    paddingHorizontal: 6,
  },
  filterChip: {
    alignItems: "center",
    backgroundColor: visualTheme.surface,
    borderColor: visualTheme.border,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  filterChipSelected: {
    backgroundColor: visualTheme.accentDeep,
    borderColor: visualTheme.accentSeaGlass,
  },
  filterChipChoice: {
    borderColor: visualTheme.accentSandDeep,
  },
  filterChipText: {
    color: visualTheme.textMuted,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
  },
  filterChipTextSelected: {
    color: visualTheme.text,
  },
  activeFilterSection: {
    backgroundColor: visualTheme.panelBotanical,
    borderColor: visualTheme.accentDeep,
    borderRadius: 12,
    borderWidth: 1,
    gap: 7,
    padding: 9,
  },
  activeFilterLabel: {
    color: visualTheme.darkEarth,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  activeFilterChipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  activeFilterChip: {
    alignItems: "center",
    backgroundColor: visualTheme.accentSage,
    borderColor: visualTheme.darkEarth,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  activeFilterChipText: {
    color: visualTheme.darkEarth,
    fontSize: 12,
    fontWeight: "900",
  },
  browseResultHeader: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "space-between",
  },
  browseResultSummary: {
    color: visualTheme.darkEarth,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 16,
  },
  presetCard: {
    backgroundColor: visualTheme.elevated,
    borderRadius: mobileUxTokens.radius.section,
    padding: mobileUxTokens.sectionPadding,
    gap: mobileUxTokens.spacing.sm,
  },
  presetEyebrow: {
    color: visualTheme.accentMist,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  presetTitle: {
    color: visualTheme.text,
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 22,
  },
  presetDescription: {
    color: visualTheme.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
  builderControlBox: {
    backgroundColor: visualTheme.panelBotanical,
    borderRadius: mobileUxTokens.radius.card,
    gap: mobileUxTokens.spacing.sm,
    padding: mobileUxTokens.cardPadding,
  },
  builderControlLabel: {
    color: visualTheme.accentMist,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  builderChipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  builderIntentChip: {
    backgroundColor: visualTheme.elevated,
    borderColor: visualTheme.border,
    borderRadius: 12,
    borderWidth: 2,
    flexBasis: "47%",
    flexGrow: 1,
    gap: 2,
    minWidth: 132,
    padding: 9,
  },
  presetSelectableOption: {
    paddingRight: 38,
    paddingTop: 9,
    position: "relative",
  },
  builderIntentChipSelected: {
    backgroundColor: visualTheme.selectionSurface,
    borderColor: visualTheme.accentDeep,
  },
  builderIntentHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    justifyContent: "space-between",
    minHeight: 20,
  },
  builderIntentText: {
    color: visualTheme.text,
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "900",
  },
  builderIntentTextSelected: {
    color: visualTheme.linen,
  },
  builderIntentHelper: {
    color: visualTheme.textMuted,
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 14,
  },
  builderIntentHelperSelected: {
    color: visualTheme.sand,
  },
  builderDensityRow: {
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: 7,
  },
  compactThreeColumnRow: {
    flexDirection: "row",
    flexWrap: "nowrap",
    width: "100%",
  },
  compactThreeColumnRowStacked: {
    alignItems: "stretch",
    flexDirection: "column",
  },
  compactThreeColumnItem: {
    flexBasis: 0,
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  compactThreeColumnItemStacked: {
    alignSelf: "stretch",
    flexBasis: "auto",
    width: "100%",
  },
  presetLayerChoiceRow: {
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: 8,
    width: "100%",
  },
  presetLayerChoiceItem: {
    flexBasis: 0,
    flexGrow: 1,
    flexShrink: 0,
    minWidth: 0,
  },
  presetLayerChoiceItemStacked: {
    alignSelf: "stretch",
    flexBasis: "auto",
    width: "100%",
  },
  builderDensityChip: {
    backgroundColor: visualTheme.elevated,
    borderColor: visualTheme.border,
    borderRadius: 12,
    borderWidth: 2,
    gap: 2,
    minHeight: mobileUxTokens.controlMinHeight,
    paddingBottom: 7,
    paddingHorizontal: 7,
    paddingTop: 7,
  },
  builderDensityChipSelected: {
    backgroundColor: visualTheme.selectionSurface,
    borderColor: visualTheme.accentDeep,
  },
  builderDensityHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    justifyContent: "flex-start",
    minHeight: 20,
  },
  builderDensityText: {
    color: visualTheme.textMuted,
    flex: 1,
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "900",
  },
  builderDensityTextSelected: {
    color: visualTheme.linen,
  },
  builderDensityHelper: {
    color: visualTheme.textSubtle,
    fontSize: 10,
    fontWeight: "800",
    lineHeight: 13,
  },
  builderDensityHelperSelected: {
    color: visualTheme.sand,
  },
  presetOptionSelectionIndicator: {
    alignItems: "center",
    borderColor: "transparent",
    borderRadius: 10,
    borderWidth: 2,
    height: 20,
    justifyContent: "center",
    position: "absolute",
    right: 8,
    top: 8,
    width: 20,
  },
  selectionIndicatorSlotSelected: {
    backgroundColor: visualTheme.forestDeep,
    borderColor: visualTheme.linen,
  },
  selectionIndicatorText: {
    color: visualTheme.linen,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 14,
  },
  generatedRecipeCard: {
    backgroundColor: visualTheme.elevated,
    borderColor: visualTheme.accentDeep,
    borderRadius: 16,
    borderWidth: 1,
    gap: 9,
    padding: 11,
  },
  generatedRecipeHeaderRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  generatedRecipeTitleBlock: {
    flex: 1,
    flexShrink: 1,
    gap: 3,
    minWidth: 0,
  },
  generatedRecipeStatusSlot: {
    alignItems: "center",
    backgroundColor: visualTheme.forestDeep,
    borderColor: visualTheme.darkEarth,
    borderRadius: 999,
    borderWidth: 1,
    height: 28,
    justifyContent: "center",
    minWidth: 92,
    paddingHorizontal: 8,
  },
  generatedRecipeStatusText: {
    color: visualTheme.linen,
    fontSize: 11,
    fontWeight: "900",
  },
  generatedRecipeEyebrow: {
    color: visualTheme.accentSeaGlass,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  generatedRecipeTitle: {
    color: visualTheme.text,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 20,
  },
  generatedRecipeSummary: {
    color: visualTheme.textMuted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  disclosureButton: {
    alignItems: "center",
    backgroundColor: visualTheme.panelBotanical,
    borderRadius: mobileUxTokens.radius.control,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: mobileUxTokens.controlMinHeight,
    paddingHorizontal: mobileUxTokens.cardPadding,
  },
  disclosureButtonText: {
    color: visualTheme.darkEarth,
    fontSize: 12,
    fontWeight: "900",
  },
  tertiaryDisclosureButton: {
    alignItems: "flex-start",
    justifyContent: "center",
    minHeight: mobileUxTokens.controlMinHeight,
  },
  tertiaryDisclosureText: {
    color: visualTheme.accentSeaGlass,
    fontSize: 12,
    fontWeight: "800",
  },
  generatedWhyBox: {
    backgroundColor: visualTheme.surface,
    borderColor: visualTheme.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
    padding: 8,
  },
  generatedWhyTitle: {
    color: visualTheme.accentMist,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  generatedWhyText: {
    color: visualTheme.textMuted,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 15,
  },
  generatedWarningText: {
    color: visualTheme.dangerText,
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 15,
  },
  generatedLayerList: {
    gap: 7,
  },
  generatedLayerRow: {
    alignItems: "stretch",
    backgroundColor: visualTheme.surface,
    borderColor: visualTheme.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "column",
    gap: 8,
    justifyContent: "flex-start",
    padding: 9,
  },
  generatedRecipeActions: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: 8,
    width: "100%",
  },
  compactPresetActionRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: mobileUxTokens.spacing.sm,
    marginTop: mobileUxTokens.spacing.xs,
  },
  curatedPresetHeading: {
    color: visualTheme.accentMist,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  presetList: {
    gap: 10,
  },
  presetRow: {
    alignItems: "flex-start",
    backgroundColor: visualTheme.elevated,
    borderColor: visualTheme.border,
    borderRadius: 14,
    borderWidth: 2,
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
    padding: 10,
    position: "relative",
  },
  selectedPresetRow: {
    backgroundColor: visualTheme.presetSelectedSurface,
    borderColor: visualTheme.darkEarth,
  },
  presetRowText: {
    flex: 1,
    flexShrink: 1,
    gap: 3,
    minWidth: 0,
    paddingRight: 32,
  },
  presetSelectionIndicatorSlot: {
    alignItems: "center",
    borderColor: "transparent",
    borderRadius: 10,
    borderWidth: 2,
    height: 20,
    justifyContent: "center",
    position: "absolute",
    right: 8,
    top: 8,
    width: 20,
  },
  presetRowTitle: {
    color: visualTheme.text,
    fontSize: 15,
    fontWeight: "800",
  },
  presetRowSubtitle: {
    color: visualTheme.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  presetUseCase: {
    color: visualTheme.textSubtle,
    fontSize: 12,
    lineHeight: 17,
  },
  presetLayerSummary: {
    color: visualTheme.accentSeaGlass,
    fontSize: 13,
    fontWeight: "800",
  },
  presetStartingSound: {
    color: visualTheme.accentSand,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
  },
  presetProofNote: {
    color: visualTheme.textSubtle,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 15,
  },
  presetFeedbackRow: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderColor: "transparent",
    borderRadius: 7,
    borderWidth: 2,
    flexDirection: "row",
    gap: 5,
    height: 30,
    marginTop: 2,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  presetFeedbackRowSelected: {
    backgroundColor: visualTheme.forestDeep,
    borderColor: visualTheme.midnightOak,
  },
  presetFeedbackIndicatorSlot: {
    alignItems: "center",
    height: 16,
    justifyContent: "center",
    width: 16,
  },
  presetFeedbackSelectedIndicator: {
    color: visualTheme.linen,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 16,
  },
  presetSelectedText: {
    color: visualTheme.linen,
    fontWeight: "900",
  },
  contractLabel: {
    color: visualTheme.accentMist,
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 2,
    textTransform: "uppercase",
  },
  catalogEyebrow: {
    color: visualTheme.textSubtle,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  selectedTitle: {
    color: visualTheme.text,
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 22,
  },
  contractMeta: {
    color: visualTheme.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
  currentSessionHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  currentSessionTitleBlock: {
    flex: 1,
    flexShrink: 1,
    gap: 2,
    minWidth: 0,
  },
  sessionMetaLine: {
    color: visualTheme.accentSeaGlass,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
  },
  sessionModePill: {
    backgroundColor: visualTheme.accentDeep,
    borderRadius: 999,
    color: visualTheme.text,
    flexShrink: 0,
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 5,
    textTransform: "uppercase",
  },
  playbackModeBox: {
    backgroundColor: visualTheme.surface,
    borderColor: visualTheme.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: 2,
    marginTop: 6,
    padding: 9,
  },
  playerProgressBox: {
    backgroundColor: visualTheme.midnightOak,
    borderColor: visualTheme.darkEarth,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
    padding: 10,
  },
  playbackModeEyebrow: {
    color: visualTheme.accentMist,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  playbackModeText: {
    color: visualTheme.text,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 17,
  },
  playbackModeSubtext: {
    color: visualTheme.textMuted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  playerTransportBox: {
    backgroundColor: visualTheme.midnightOak,
    borderColor: visualTheme.darkEarth,
    borderRadius: 12,
    borderWidth: 1,
    gap: 9,
    marginTop: 6,
    padding: 10,
  },
  playerTransportRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    width: "100%",
  },
  playerTransportStatus: {
    color: visualTheme.textOnDark,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 18,
  },
  playerTransportEyebrow: {
    color: visualTheme.sand,
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 15,
  },
  playerTransportMeta: {
    color: visualTheme.textMuted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  sessionControlBox: {
    backgroundColor: visualTheme.panelBotanical,
    borderColor: visualTheme.accentDeep,
    borderRadius: 12,
    borderWidth: 1,
    gap: 7,
    marginTop: 6,
    padding: 9,
  },
  sessionControlHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  sessionControlTitleBlock: {
    flex: 1,
    flexShrink: 1,
    gap: 2,
    minWidth: 0,
  },
  sessionControlEyebrow: {
    color: visualTheme.accentMist,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  sessionControlStatus: {
    color: visualTheme.text,
    fontSize: 13,
    fontWeight: "900",
  },
  timerChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  timerChip: {
    backgroundColor: visualTheme.background,
    borderColor: visualTheme.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  timerChipSelected: {
    backgroundColor: visualTheme.accentDeep,
    borderColor: visualTheme.accentSeaGlass,
  },
  timerChipText: {
    color: visualTheme.textMuted,
    fontSize: 12,
    fontWeight: "900",
  },
  timerChipTextSelected: {
    color: visualTheme.text,
  },
  sessionControlHint: {
    color: visualTheme.darkEarth,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 15,
  },
  playerActionRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  emptySessionBox: {
    gap: 6,
  },
  emptySessionSecondaryRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  emptySessionLink: {
    alignItems: "center",
    borderRadius: 10,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 12,
  },
  emptySessionLinkText: {
    color: visualTheme.accentMist,
    fontSize: 13,
    fontWeight: "900",
    textDecorationLine: "underline",
  },
  relatedSoundsBox: {
    backgroundColor: visualTheme.surface,
    borderColor: visualTheme.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    marginTop: 8,
    padding: 9,
  },
  relatedSoundsTitle: {
    color: visualTheme.accentMist,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  relatedSoundRow: {
    alignItems: "center",
    borderColor: visualTheme.border,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  relatedSoundTitle: {
    color: visualTheme.text,
    flex: 1,
    fontSize: 12,
    fontWeight: "800",
    minWidth: 0,
  },
  relatedSoundMeta: {
    color: visualTheme.accentSeaGlass,
    fontSize: 11,
    fontWeight: "800",
  },
  noticeText: {
    backgroundColor: visualTheme.warningSurface,
    borderColor: visualTheme.accentSandDeep,
    borderRadius: 12,
    borderWidth: 1,
    color: visualTheme.dangerText,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    padding: 10,
  },
  recipeLayerList: {
    gap: 8,
    marginTop: 8,
  },
  recipeLayerRow: {
    alignItems: "center",
    backgroundColor: visualTheme.surface,
    borderColor: visualTheme.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    padding: 10,
  },
  recipeLayerTextBlock: {
    flex: 1,
    flexShrink: 1,
    gap: 2,
    minWidth: 0,
  },
  recipeLayerRole: {
    alignSelf: "flex-start",
    backgroundColor: visualTheme.accentRose,
    borderRadius: 999,
    color: visualTheme.darkEarth,
    fontSize: 12,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
    textTransform: "uppercase",
  },
  recipeLayerName: {
    color: visualTheme.text,
    fontSize: 14,
    fontWeight: "700",
  },
  recipeLayerStatus: {
    color: visualTheme.textSubtle,
    fontSize: 11,
    fontWeight: "800",
    maxWidth: 120,
    textAlign: "right",
  },
  recipeLayerStatusPlaying: {
    color: visualTheme.accentSeaGlass,
  },
  layeredPrimaryControls: {
    marginTop: 2,
  },
  layeredQuickControlsBox: {
    backgroundColor: visualTheme.panelBotanical,
    borderColor: visualTheme.accentDeep,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
    marginTop: 4,
    padding: 8,
  },
  layeredPreviewBox: {
    backgroundColor: visualTheme.panelBotanical,
    borderColor: visualTheme.accentDeep,
    borderRadius: 12,
    borderWidth: 1,
    gap: 5,
    marginTop: 6,
    padding: 8,
  },
  layeredPreviewEyebrow: {
    color: visualTheme.accentSeaGlass,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  layeredPreviewTitle: {
    color: visualTheme.text,
    fontSize: 14,
    fontWeight: "800",
  },
  layeredPreviewText: {
    color: visualTheme.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
  layeredPreviewLayerList: {
    gap: 6,
  },
  layeredPreviewLayerRow: {
    alignItems: "center",
    backgroundColor: visualTheme.elevated,
    borderColor: visualTheme.border,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
    padding: 9,
  },
  layeredPreviewLayerRowStack: {
    backgroundColor: visualTheme.elevated,
    borderColor: visualTheme.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    padding: 8,
  },
  layeredPreviewLayerHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  layeredPreviewLayerName: {
    color: visualTheme.text,
    flex: 1,
    fontSize: 12,
    fontWeight: "800",
  },
  layeredPreviewLayerBalance: {
    color: visualTheme.accentSeaGlass,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  layeredPreviewLayerMeta: {
    color: visualTheme.textMuted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  layeredPreviewLayerHint: {
    color: visualTheme.textSubtle,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 15,
  },
  layerControlRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  layerOfflineStatusText: {
    flexShrink: 1,
    maxWidth: "100%",
  },
  balanceControlGroup: {
    flexBasis: "100%",
    gap: 4,
  },
  balanceChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  balanceChip: {
    backgroundColor: visualTheme.surface,
    borderColor: visualTheme.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  balanceChipSelected: {
    backgroundColor: visualTheme.accentDeep,
    borderColor: visualTheme.accentSeaGlass,
  },
  balanceChipText: {
    color: visualTheme.textMuted,
    fontSize: 12,
    fontWeight: "900",
  },
  balanceChipTextSelected: {
    color: visualTheme.text,
  },
  balanceChipSubtext: {
    color: visualTheme.textSubtle,
    fontSize: 10,
    fontWeight: "800",
  },
  balanceChipSubtextSelected: {
    color: visualTheme.accentMistSoft,
  },
  layeredPreviewControls: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  layeredPreviewStatusText: {
    color: visualTheme.accentSeaGlass,
    fontSize: 12,
    fontWeight: "800",
  },
  laneGroup: {
    gap: 8,
  },
  laneHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  virtualizedLaneHeader: {
    alignItems: "center",
    backgroundColor: visualTheme.panelBotanical,
    borderRadius: mobileUxTokens.radius.control,
    flexDirection: "row",
    gap: mobileUxTokens.spacing.sm,
    justifyContent: "space-between",
    marginTop: mobileUxTokens.spacing.md,
    minHeight: mobileUxTokens.controlMinHeight,
    paddingHorizontal: mobileUxTokens.cardPadding,
  },
  laneTitle: {
    color: visualTheme.darkEarth,
    flex: 1,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.3,
    minWidth: 0,
    textTransform: "uppercase",
  },
  laneCountPill: {
    backgroundColor: visualTheme.accentSage,
    borderRadius: 999,
    color: visualTheme.darkEarth,
    fontSize: 11,
    fontWeight: "900",
    minWidth: 28,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
    textAlign: "center",
  },
  compactSoundRow: {
    alignItems: "stretch",
    backgroundColor: visualTheme.elevated,
    borderColor: visualTheme.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "column",
    gap: 8,
    justifyContent: "flex-start",
    minHeight: 0,
    overflow: "hidden",
    padding: 11,
    width: "100%",
  },
  compactSoundRowHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "space-between",
    width: "100%",
  },
  compactSoundRowBody: {
    flex: 1,
    flexShrink: 1,
    gap: 2,
    minWidth: 0,
  },
  compactSoundRowActions: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 0,
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "flex-end",
  },
  compactSoundPrimaryActions: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: mobileUxTokens.spacing.sm,
  },
  compactSoundFeedbackControls: {
    alignSelf: "stretch",
    flexShrink: 0,
    width: "100%",
  },
  playerSoundInfoBox: {
    backgroundColor: visualTheme.surface,
    borderColor: visualTheme.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    padding: 9,
  },
  soundRow: {
    alignItems: "center",
    backgroundColor: visualTheme.elevated,
    borderColor: visualTheme.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    minHeight: 62,
    padding: 12,
  },
  selectedSoundRow: {
    backgroundColor: visualTheme.selectedSurface,
    borderColor: visualTheme.accentDeep,
    borderWidth: 2,
  },
  avoidedRow: {
    backgroundColor: visualTheme.warningSurface,
    borderColor: visualTheme.accentSandDeep,
    opacity: 0.78,
  },
  pressedSoundRow: {
    opacity: 0.82,
  },
  soundRowText: {
    flex: 1,
    flexShrink: 1,
    gap: 2,
    minWidth: 0,
  },
  soundTitle: {
    color: visualTheme.text,
    fontSize: 15,
    fontWeight: "700",
  },
  soundSubtitle: {
    color: visualTheme.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  soundDiscoveryMeta: {
    color: visualTheme.textMuted,
    flexShrink: 1,
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 15,
  },
  soundTagLine: {
    color: visualTheme.accentSeaGlass,
    flexShrink: 1,
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 15,
  },
  clearLabelPill: {
    backgroundColor: visualTheme.accentRose,
    borderRadius: 999,
    color: visualTheme.darkEarth,
    fontSize: 12,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  layeredPreviewPill: {
    backgroundColor: visualTheme.accentDeep,
    borderRadius: 999,
    color: visualTheme.text,
    fontSize: 11,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 5,
    textAlign: "center",
  },
  avoidedPill: {
    backgroundColor: visualTheme.warningSurface,
    borderColor: visualTheme.accentSandDeep,
    borderRadius: 999,
    borderWidth: 1,
    color: visualTheme.accentSand,
    fontSize: 12,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 5,
  },

  savePill: {
    alignItems: "center",
    backgroundColor: visualTheme.surface,
    borderColor: visualTheme.accentDeep,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  savePillActive: {
    backgroundColor: visualTheme.accentDeep,
    borderColor: visualTheme.accentSeaGlass,
  },
  savePillText: {
    color: visualTheme.accentSeaGlass,
    fontSize: 12,
    fontWeight: "800",
  },
  savePillTextActive: {
    color: visualTheme.text,
  },
  localLibraryActions: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
  },
  localLibraryHint: {
    color: visualTheme.textMuted,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "700",
  },
  localLibraryCard: {
    backgroundColor: visualTheme.elevated,
    borderColor: visualTheme.borderStrong,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  localLibraryEyebrow: {
    color: visualTheme.accentMist,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  localLibraryDescription: {
    color: visualTheme.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  librarySortLabel: {
    color: visualTheme.textMuted,
    fontSize: 12,
    fontWeight: "900",
  },
  librarySortRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  librarySortChip: {
    alignItems: "center",
    backgroundColor: visualTheme.surface,
    borderColor: visualTheme.border,
    borderRadius: 12,
    borderWidth: 1,
    flexGrow: 1,
    justifyContent: "center",
    minHeight: 44,
    minWidth: 86,
    paddingHorizontal: 9,
    paddingVertical: 8,
  },
  librarySortChipSelected: {
    backgroundColor: visualTheme.accentDeep,
    borderColor: visualTheme.accentSeaGlass,
  },
  librarySortChipText: {
    color: visualTheme.textMuted,
    fontSize: 11,
    fontWeight: "900",
    textAlign: "center",
  },
  librarySortChipTextSelected: {
    color: visualTheme.text,
  },
  localSoundList: {
    gap: 8,
  },
  emptyLibraryBox: {
    alignItems: "flex-start",
    backgroundColor: visualTheme.surface,
    borderColor: visualTheme.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    padding: 12,
  },
  emptyLibraryText: {
    color: visualTheme.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  guardrailText: {
    color: visualTheme.textSubtle,
    fontSize: 13,
    lineHeight: 19,
  },

  persistentSectionNavSafeArea: {
    backgroundColor: visualTheme.background,
    borderColor: visualTheme.border,
    borderTopWidth: 1,
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 16,
  },
  persistentSectionNav: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    justifyContent: "space-between",
    minHeight: mobileUxTokens.bottomNavigationContentHeight,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  persistentSectionTab: {
    alignItems: "center",
    backgroundColor: visualTheme.elevated,
    borderColor: visualTheme.border,
    borderRadius: mobileUxTokens.radius.chip,
    borderWidth: 1,
    flex: 1,
    minHeight: mobileUxTokens.controlMinHeight,
    justifyContent: "center",
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  persistentSectionTabSelected: {
    backgroundColor: visualTheme.accentDeep,
    borderColor: visualTheme.accentSeaGlass,
  },
  persistentSectionTabText: {
    color: visualTheme.textMuted,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
  },
  persistentSectionTabTextSelected: {
    color: visualTheme.text,
  },
  miniPlayer: {
    backgroundColor: visualTheme.midnightOak,
    borderColor: visualTheme.darkEarth,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderTopWidth: 1,
    gap: 4,
    left: 0,
    paddingHorizontal: 8,
    paddingVertical: 7,
    position: "absolute",
    right: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 14,
  },
  miniPlayerMainRow: {
    width: "100%",
  },
  miniPlayerContent: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: 8,
  },
  miniPlayerContentFallback: {
    alignItems: "stretch",
    flexDirection: "column",
  },
  miniPlayerSummary: {
    alignItems: "center",
    borderRadius: 10,
    flex: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 44,
    minWidth: 0,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  miniPlayerSummaryFallback: {
    width: "100%",
  },
  miniPlayerSummaryPressed: {
    backgroundColor: visualTheme.darkEarth,
  },
  miniPlayerSeekRow: {
    alignSelf: "stretch",
    paddingHorizontal: 4,
    width: "100%",
  },
  miniPlayerSeekControl: {
    minHeight: mobileUxTokens.controlMinHeight,
    width: "100%",
  },
  miniTitleBlock: {
    flex: 1,
    flexShrink: 1,
    gap: 1,
    minWidth: 0,
  },
  miniEyebrow: {
    color: visualTheme.accentSeaGlass,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  miniTitle: {
    color: visualTheme.textOnDark,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 17,
  },
  miniMetadata: {
    color: visualTheme.sand,
    fontSize: 10,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
    lineHeight: 13,
  },
  compactProgressSummary: {
    gap: 2,
    maxWidth: 180,
  },
  compactProgressTimesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  compactProgressTime: {
    color: visualTheme.sand,
    fontSize: 9,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
  },
  compactProgressTrack: {
    backgroundColor: visualTheme.elevated,
    borderRadius: 999,
    height: 3,
    overflow: "hidden",
  },
  progressTimesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressTime: {
    color: visualTheme.sand,
    fontSize: 12,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
  },
  progressTouchTarget: {
    gap: 2,
    justifyContent: "center",
    minHeight: 44,
  },
  progressTouchTargetDisabled: {
    opacity: 0.55,
  },
  progressTrackShell: {
    height: 16,
    justifyContent: "center",
    position: "relative",
    width: "100%",
  },
  progressTrack: {
    backgroundColor: visualTheme.elevated,
    borderRadius: 999,
    height: 8,
    overflow: "hidden",
    width: "100%",
  },
  miniPlayerSeekTrack: {
    height: 6,
  },
  progressThumb: {
    backgroundColor: visualTheme.linen,
    borderColor: visualTheme.midnightOak,
    borderRadius: 7,
    borderWidth: 2,
    height: 14,
    marginLeft: -7,
    position: "absolute",
    top: 1,
    width: 14,
  },
  scrubberLabel: {
    color: visualTheme.sand,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  progressFill: {
    backgroundColor: visualTheme.accentDeep,
    borderRadius: 999,
    height: "100%",
  },
  loopStatusRow: {
    alignItems: "center",
    backgroundColor: visualTheme.elevated,
    borderColor: visualTheme.border,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "space-between",
    paddingHorizontal: 7,
    paddingVertical: 5,
  },
  loopStatusText: {
    fontSize: 12,
    fontWeight: "900",
  },
  loopStatusAvailableText: {
    color: visualTheme.accentSeaGlass,
  },
  loopStatusUnavailableText: {
    color: visualTheme.accentSand,
  },
  loopHelperText: {
    color: visualTheme.textMuted,
    flexShrink: 1,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 14,
    textAlign: "right",
  },
  miniControls: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: 5,
    justifyContent: "space-between",
  },
  miniControlsInline: {
    flexShrink: 0,
    width: 144,
  },
  miniControlsFallback: {
    width: "100%",
  },
  button: {
    alignItems: "center",
    backgroundColor: visualTheme.accentDeep,
    borderRadius: 999,
    minWidth: 104,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  compactButton: {
    justifyContent: "center",
    minHeight: 44,
    minWidth: 80,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  miniPlayerAction: {
    flex: 1,
    minHeight: 44,
    minWidth: 0,
    paddingHorizontal: 4,
  },
  fixedTransportAction: {
    width: 92,
  },
  balancedActionButton: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 6,
  },
  fullWidthButton: {
    alignSelf: "stretch",
    width: "100%",
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderColor: visualTheme.accentDeep,
    borderWidth: 1,
  },
  destructiveButton: {
    backgroundColor: visualTheme.warningSurface,
    borderColor: visualTheme.dangerText,
    borderWidth: 2,
  },
  destructiveButtonText: {
    color: visualTheme.dangerText,
  },
  disabledButton: {
    opacity: 0.45,
  },
  unavailableButton: {
    backgroundColor: visualTheme.darkEarth,
    borderColor: visualTheme.walnut,
    borderWidth: 1,
    opacity: 1,
  },
  unavailableButtonText: {
    color: visualTheme.sand,
  },
  pressedButton: {
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    color: visualTheme.text,
    fontSize: 16,
    fontWeight: "800",
  },
  compactButtonText: {
    fontSize: 14,
  },
  secondaryButtonText: {
    color: visualTheme.accentSeaGlass,
  },
  miniLoadingStatus: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    minHeight: 24,
  },
  miniLoadingText: {
    color: visualTheme.sand,
    fontSize: 12,
    fontWeight: "800",
  },
  miniErrorText: {
    backgroundColor: visualTheme.warningSurface,
    borderRadius: 8,
    color: visualTheme.dangerText,
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 16,
    maxWidth: "100%",
    paddingHorizontal: 8,
    paddingVertical: 6,
    width: "100%",
  },
});
