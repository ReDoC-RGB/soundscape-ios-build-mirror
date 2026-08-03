import { reopenBuilderSession, type BuilderSessionModelV1 } from "../builderSessionModelV1";
import { parseSavedSessions } from "../savedSessions";
import { parseDirectedCheckpointV1, parseSavedDirectedPathsV1 } from "../directedSessions/sessionStateV1";
import type { SessionSource } from "./playbackSessionContractV1";

export type LocalBackupFeedbackStateV1 = "up" | "down" | "neutral";
export type ImportedLocalBackupTransientStateV1 = Readonly<{
  feedback: Readonly<Record<string, LocalBackupFeedbackStateV1>>;
  builderSession: BuilderSessionModelV1 | null;
}>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const validateFeedbackV1 = (value: unknown): Readonly<Record<string, LocalBackupFeedbackStateV1>> => {
  if (value === undefined || value === null) return Object.freeze({});
  if (!isRecord(value)) throw new Error("Backup feedback must be an object.");
  const entries = Object.entries(value);
  if (entries.length > 10_000) throw new Error("Backup feedback exceeds the supported record limit.");
  const result: Record<string, LocalBackupFeedbackStateV1> = {};
  for (const [rawKey, rawState] of entries) {
    const key = rawKey.trim();
    if (!key || key.length > 240) throw new Error("Backup feedback contains an invalid identity.");
    if (rawState !== "up" && rawState !== "down" && rawState !== "neutral") {
      throw new Error(`Backup feedback contains an invalid state for ${key}.`);
    }
    result[key] = rawState;
  }
  return Object.freeze(result);
};

const validateBuilderSessionV1 = (
  value: unknown,
  validSoundIds: ReadonlySet<string>,
): BuilderSessionModelV1 | null => {
  if (value === undefined || value === null) return null;
  if (!Array.isArray(value)) throw new Error("Backup Builder state must be an array.");
  if (value.length > 1) {
    throw new Error("Backup merge produced multiple active Builder states. Use Replace or clear the current Builder state before importing.");
  }
  if (value.length === 0) return null;
  const model = reopenBuilderSession(value[0] as BuilderSessionModelV1);
  for (const layer of model.layers) {
    if (!validSoundIds.has(layer.soundId)) {
      throw new Error(`Backup Builder state references unavailable sound ${layer.soundId}.`);
    }
  }
  return model;
};

export function validateImportedLocalBackupTransientStateV1(
  snapshot: unknown,
  validSoundIds: ReadonlySet<string>,
): ImportedLocalBackupTransientStateV1 {
  if (!isRecord(snapshot)) throw new Error("Backup snapshot is invalid.");
  return Object.freeze({
    feedback: validateFeedbackV1(snapshot.feedback),
    builderSession: validateBuilderSessionV1(snapshot.builderSessions, validSoundIds),
  });
}

export type ImportedLocalBackupValidationOptionsV1 = Readonly<{
  validSoundIds: ReadonlySet<string>;
  timerOptions: ReadonlySet<number>;
  startTabKeys: ReadonlySet<string>;
  allowCurrentDeviceOfflineAuthority?: boolean;
}>;

const requireStringArrayV1 = (value: unknown, label: string): string[] => {
  if (!Array.isArray(value) || value.length > 10_000) throw new Error(`${label} must be a bounded array.`);
  const result: string[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== "string" || !entry.trim() || entry.length > 512) throw new Error(`${label} contains an invalid identity.`);
    if (seen.has(entry)) throw new Error(`${label} contains a duplicate identity.`);
    seen.add(entry);
    result.push(entry);
  }
  return result;
};

const requireDateV1 = (value: unknown, label: string): void => {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) throw new Error(`${label} contains an invalid date.`);
};

const validatePreferencesV1 = (value: unknown): void => {
  if (!isRecord(value)) throw new Error("Backup preferences must be an object.");
  for (const field of ["likedSoundIds", "dislikedSoundIds", "avoidedSoundIds", "likedRecipeFingerprints", "dislikedRecipeFingerprints", "tagBoosts", "tagAvoids"] as const) {
    requireStringArrayV1(value[field], `Backup preferences ${field}`);
  }
  if (!Number.isInteger(value.revision) || Number(value.revision) < 0) throw new Error("Backup preferences revision is invalid.");
  if (value.updatedAt !== null) requireDateV1(value.updatedAt, "Backup preferences");
};

const validateSavedSessionsV1 = (value: unknown): void => {
  if (!Array.isArray(value) || value.length > 10_000) throw new Error("Backup Saved Sessions must be a bounded array.");
  const ids = new Set<string>();
  for (const candidate of value) {
    if (!isRecord(candidate) || typeof candidate.id !== "string" || !candidate.id || typeof candidate.name !== "string") throw new Error("Backup contains an invalid Saved Session.");
    if (ids.has(candidate.id)) throw new Error("Backup contains a duplicate Saved Session identity.");
    ids.add(candidate.id);
    requireDateV1(candidate.updatedAt, "Backup Saved Session");
    if (candidate.createdAt !== undefined) requireDateV1(candidate.createdAt, "Backup Saved Session");
  }
  const parsed = parseSavedSessions(JSON.stringify({ schemaVersion: 1, sessions: value }));
  if (parsed.length !== value.length || parsed.some((session, index) => session.id !== (value[index] as Record<string, unknown>).id)) {
    throw new Error("Backup contains Saved Session data rejected by the production parser.");
  }
};

const validateOfflineManifestV1 = (value: unknown, allowCurrentDeviceOfflineAuthority = false): void => {
  if (!Array.isArray(value) || value.length > 10_000) throw new Error("Backup offline manifest must be a bounded array.");
  const ids = new Set<string>();
  const portableStates = new Set(["queued", "downloading", "verifying", "failed/retryable", "ineligible", "revoked", "deleting"]);
  for (const candidate of value) {
    if (!isRecord(candidate) || candidate.version !== 1 || typeof candidate.assetId !== "string" || !candidate.assetId) throw new Error("Backup contains invalid offline metadata.");
    if (ids.has(candidate.assetId)) throw new Error("Backup contains duplicate offline metadata.");
    ids.add(candidate.assetId);
    if (typeof candidate.catalogRevision !== "string" || typeof candidate.sourceRevision !== "string") throw new Error("Backup offline source identity is invalid.");
    if (!Number.isInteger(candidate.expectedBytes) || Number(candidate.expectedBytes) < 0 || typeof candidate.checksumSha256 !== "string" || !/^[a-f0-9]{64}$/i.test(candidate.checksumSha256)) throw new Error("Backup offline integrity metadata is invalid.");
    const validCurrentDeviceAuthority = allowCurrentDeviceOfflineAuthority
      && candidate.state === "available"
      && candidate.stage === "available_offline"
      && typeof candidate.localUri === "string"
      && /^(?:file|content):\/\//i.test(candidate.localUri)
      && Number.isInteger(candidate.verifiedBytes)
      && Number(candidate.verifiedBytes) === Number(candidate.expectedBytes);
    if (!validCurrentDeviceAuthority && (candidate.localUri !== null || candidate.verifiedBytes !== null || !portableStates.has(String(candidate.state)))) {
      throw new Error("Backup may not claim portable local media bytes.");
    }
  }
};

const sessionSourcesV1 = new Set<SessionSource>([
  "Fast Start", "Fast Start alternative", "Presets/Builder", "Browse", "Saved", "Recent", "Player",
]);

const validateCurrentSessionV1 = (value: unknown, validSoundIds: ReadonlySet<string>): void => {
  if (value === null || value === undefined) return;
  if (
    !isRecord(value)
    || typeof value.title !== "string"
    || !value.title.trim()
    || !sessionSourcesV1.has(value.source as SessionSource)
    || !Number.isFinite(value.updatedAt)
  ) throw new Error("Backup current-session projection is invalid.");
  if (value.type === "single") {
    if (typeof value.soundId !== "string" || !validSoundIds.has(value.soundId)) throw new Error("Backup single-session projection is invalid.");
    return;
  }
  if (value.type === "recipe") {
    if (typeof value.recipeId !== "string" || !value.recipeId.trim() || typeof value.startingSoundId !== "string" || !validSoundIds.has(value.startingSoundId)) {
      throw new Error("Backup recipe-session projection is invalid.");
    }
    return;
  }
  throw new Error("Backup current-session projection is invalid.");
};

const validateDirectedFeedbackV1 = (value: unknown): readonly unknown[] => {
  if (!Array.isArray(value) || value.length > 10_000) throw new Error("Backup Directed feedback must be a bounded array.");
  return Object.freeze(value.map((candidate) => {
    if (!isRecord(candidate) || typeof candidate.sceneId !== "string" || typeof candidate.scoreHash !== "string" || !/^[a-f0-9]{64}$/i.test(candidate.scoreHash)) throw new Error("Backup contains invalid Directed feedback.");
    if (!["too-busy", "just-right", "too-sparse", "preferred-texture"].includes(String(candidate.value))) throw new Error("Backup contains an invalid Directed feedback value.");
    requireDateV1(candidate.recordedAt, "Backup Directed feedback");
    return Object.freeze({ ...candidate });
  }));
};

const validateDirectedStateV1 = (value: unknown): Readonly<{ checkpoint: unknown | null; savedPaths: readonly unknown[]; feedback: readonly unknown[] }> => {
  if (value === undefined) return Object.freeze({ checkpoint: null, savedPaths: Object.freeze([]), feedback: Object.freeze([]) });
  if (!isRecord(value)) throw new Error("Backup Directed state must be an object.");
  if (!Array.isArray(value.savedPaths) || value.savedPaths.length > 10_000) throw new Error("Backup Directed saved paths must be a bounded array.");
  const ids = new Set<string>();
  const savedPaths = value.savedPaths.map((candidate) => {
    if (!isRecord(candidate) || candidate.contractVersion !== 1 || typeof candidate.pathId !== "string" || !candidate.pathId || typeof candidate.sceneId !== "string" || typeof candidate.scoreHash !== "string" || !/^[a-f0-9]{64}$/i.test(candidate.scoreHash)) throw new Error("Backup contains an invalid Directed saved path.");
    if (ids.has(candidate.pathId)) throw new Error("Backup contains a duplicate Directed saved path identity.");
    ids.add(candidate.pathId);
    if (typeof candidate.name !== "string" || !Number.isFinite(candidate.durationMs) || !Array.isArray(candidate.steeringOperations)) throw new Error("Backup contains incomplete Directed saved-path data.");
    return Object.freeze({ ...candidate });
  });
  const parsedSavedPaths = parseSavedDirectedPathsV1(JSON.stringify(value.savedPaths));
  if (parsedSavedPaths.length !== value.savedPaths.length || parsedSavedPaths.some((path, index) => path.pathId !== (value.savedPaths as Record<string, unknown>[])[index].pathId)) {
    throw new Error("Backup contains Directed saved-path data rejected by the production parser.");
  }
  let checkpoint: unknown | null = null;
  if (value.checkpoint !== null && value.checkpoint !== undefined) {
    if (!isRecord(value.checkpoint) || value.checkpoint.contractVersion !== 1 || typeof value.checkpoint.sessionId !== "string" || typeof value.checkpoint.sceneId !== "string" || typeof value.checkpoint.scoreHash !== "string" || !/^[a-f0-9]{64}$/i.test(value.checkpoint.scoreHash) || !Number.isFinite(value.checkpoint.generation) || !Number.isFinite(value.checkpoint.pathRevision)) throw new Error("Backup contains an invalid Directed checkpoint.");
    if (!parseDirectedCheckpointV1(JSON.stringify(value.checkpoint))) throw new Error("Backup contains a Directed checkpoint rejected by the production parser.");
    checkpoint = Object.freeze({ ...value.checkpoint });
  }
  return Object.freeze({ checkpoint, savedPaths: Object.freeze(savedPaths), feedback: validateDirectedFeedbackV1(value.feedback) });
};

export function validateImportedLocalBackupSnapshotV1(
  snapshot: unknown,
  options: ImportedLocalBackupValidationOptionsV1,
): Readonly<Record<string, unknown>> {
  if (!isRecord(snapshot)) throw new Error("Backup snapshot is invalid.");
  if (!isRecord(snapshot.profile) || typeof snapshot.profile.id !== "string" || !/^local-profile:/.test(snapshot.profile.id)) throw new Error("Backup local profile is invalid.");
  const savedSoundIds = requireStringArrayV1(snapshot.savedSoundIds, "Backup saved sounds");
  const recentSoundIds = requireStringArrayV1(snapshot.recentSoundIds, "Backup recent sounds");
  if (!isRecord(snapshot.settings) || !options.timerOptions.has(Number(snapshot.settings.defaultTimerMinutes)) || !options.startTabKeys.has(String(snapshot.settings.startTabKey))) throw new Error("Backup settings are invalid.");
  validatePreferencesV1(snapshot.preferences);
  validateSavedSessionsV1(snapshot.savedSessions);
  validateOfflineManifestV1(snapshot.offlineManifest, options.allowCurrentDeviceOfflineAuthority);
  validateCurrentSessionV1(snapshot.currentSession, options.validSoundIds);
  if (typeof snapshot.catalogRevision !== "string" || !snapshot.catalogRevision) throw new Error("Backup catalog revision is invalid.");
  const transient = validateImportedLocalBackupTransientStateV1(snapshot, options.validSoundIds);
  const directed = validateDirectedStateV1(snapshot.directed);
  return Object.freeze({ ...snapshot, savedSoundIds: Object.freeze(savedSoundIds), recentSoundIds: Object.freeze(recentSoundIds), builderSessions: transient.builderSession ? Object.freeze([transient.builderSession]) : Object.freeze([]), feedback: transient.feedback, directed });
}
