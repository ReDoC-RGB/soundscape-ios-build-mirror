import { reopenBuilderSession, type BuilderSessionLayerRole, type BuilderSessionModelV1 } from "./builderSessionModelV1";

export const SAVED_SESSIONS_STORAGE_KEY = "soundscape-mobile:saved-sessions:v1";
export const SAVED_SESSION_SCHEMA_VERSION = 1;
export const SAVED_SESSION_NOTE_LIMIT = 160;

export type SavedSessionSource = "Fast Start" | "Builder" | "Generated Recipe" | "Manual";
export type SavedSessionType = "Single sound" | "Layered recipe";
export type SavedSessionSortMode = "Recently used" | "Recently updated" | "A–Z";

export type SavedSessionSoundEntry = {
  soundId: string;
  titleSnapshot: string;
  laneSnapshot: string;
  sourceUri: string;
  volume: number;
  enabled: boolean;
  userChoiceOnly: boolean;
  role?: BuilderSessionLayerRole;
  builderLayerId?: string;
};

export type SavedSession = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  lastPlayedAt: string | null;
  playCount: number;
  source: SavedSessionSource;
  type: SavedSessionType;
  sounds: SavedSessionSoundEntry[];
  loop: boolean;
  timerMinutes?: number;
  note?: string;
  builderModel?: BuilderSessionModelV1;
  schemaVersion: typeof SAVED_SESSION_SCHEMA_VERSION;
};

export type SavedSessionDraft = Omit<
  SavedSession,
  "id" | "createdAt" | "updatedAt" | "lastPlayedAt" | "playCount" | "schemaVersion"
>;

export type SavedSessionCreateOptions = {
  now?: string;
  idFactory?: () => string;
  existingIds?: Iterable<string>;
};

export type SavedSessionStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

export type SavedSessionCatalogSound = {
  id: string;
  title?: string;
  lane?: string;
  category?: string;
  audioUrl?: string;
  playable?: boolean;
  userChoiceOnly?: boolean;
  loopEligible?: boolean;
};

export type ResolvedSavedSessionEntry = SavedSessionSoundEntry & {
  title: string;
  lane: string;
  audioUrl: string;
  catalogSound: SavedSessionCatalogSound;
};

export type UnavailableSavedSessionEntry = {
  entry: SavedSessionSoundEntry;
  reason: "missing" | "inactive" | "missing source" | "restricted";
  detail?: string;
};

export type SavedSessionEligibilityDecision = Readonly<{ allowed: boolean; reason: string | null }>;
export type SavedSessionEligibilityResolver = (soundId: string) => SavedSessionEligibilityDecision;

export type SavedSessionResolution = {
  canStart: boolean;
  choiceRequired: boolean;
  choiceConsentGranted: boolean;
  isPartial: boolean;
  validEntries: ResolvedSavedSessionEntry[];
  unavailableEntries: UnavailableSavedSessionEntry[];
  issueSummary: string;
};

export type QuickMixKind = "resume-last" | "most-played" | "recently-saved" | "favorite-category";
export type QuickMix = {
  kind: QuickMixKind;
  label: "Resume last session" | "Most played saved session" | "Recently saved" | "Favorite category session";
  sessionId: string;
  sessionName: string;
  detail: string;
};

const allowedSources = new Set<SavedSessionSource>([
  "Fast Start",
  "Builder",
  "Generated Recipe",
  "Manual",
]);
const allowedTypes = new Set<SavedSessionType>(["Single sound", "Layered recipe"]);

export function createSavedSession(
  draft: SavedSessionDraft | Record<string, unknown>,
  options: SavedSessionCreateOptions = {},
): SavedSession | null {
  const sanitizedDraft = sanitizeDraft(draft);
  if (!sanitizedDraft) return null;
  const now = normalizeDate(options.now) ?? new Date().toISOString();
  const id = createUniqueSessionId(options.existingIds ?? [], options.idFactory);
  return {
    ...sanitizedDraft,
    id,
    createdAt: now,
    updatedAt: now,
    lastPlayedAt: null,
    playCount: 0,
    schemaVersion: SAVED_SESSION_SCHEMA_VERSION,
  };
}

export function updateSavedSession(
  sessions: SavedSession[],
  sessionId: string,
  updates: Partial<Pick<SavedSession, "name" | "source" | "type" | "sounds" | "loop" | "timerMinutes" | "note" | "builderModel">>,
  now: string = new Date().toISOString(),
): SavedSession[] {
  const current = sessions.find((session) => session.id === sessionId);
  if (!current) return sessions;
  const draft = sanitizeDraft({ ...current, ...updates });
  if (!draft) return sessions;
  const updatedAt = normalizeDate(now) ?? new Date().toISOString();
  return sessions.map((session) => session.id === sessionId
    ? { ...session, ...draft, updatedAt, schemaVersion: SAVED_SESSION_SCHEMA_VERSION }
    : session);
}

export function renameSavedSession(
  sessions: SavedSession[],
  sessionId: string,
  name: string,
  now: string = new Date().toISOString(),
): SavedSession[] {
  const normalizedName = normalizeName(name);
  if (!normalizedName) return sessions;
  return updateSavedSession(sessions, sessionId, { name: normalizedName }, now);
}

export function duplicateSavedSession(
  sessions: SavedSession[],
  sessionId: string,
  options: SavedSessionCreateOptions = {},
): SavedSession[] {
  const source = sessions.find((session) => session.id === sessionId);
  if (!source) return sessions;
  const duplicate = saveAsNewSavedSession(source, `${source.name} Copy`, {
    ...options,
    existingIds: sessions.map((session) => session.id),
  });
  return duplicate ? [...sessions, duplicate] : sessions;
}

export function deleteSavedSession(sessions: SavedSession[], sessionId: string): SavedSession[] {
  return sessions.filter((session) => session.id !== sessionId);
}

export function saveAsNewSavedSession(
  source: SavedSession,
  name: string,
  options: SavedSessionCreateOptions = {},
): SavedSession | null {
  return createSavedSession({
    name,
    source: source.source,
    type: source.type,
    sounds: source.sounds.map((entry) => ({ ...entry })),
    loop: source.loop,
    timerMinutes: source.timerMinutes,
    note: source.note,
    builderModel: source.builderModel,
  }, options);
}

export function recordSavedSessionStarted(
  sessions: SavedSession[],
  sessionId: string,
  now: string = new Date().toISOString(),
): SavedSession[] {
  const lastPlayedAt = normalizeDate(now) ?? new Date().toISOString();
  return sessions.map((session) => session.id === sessionId
    ? { ...session, lastPlayedAt, playCount: Math.max(0, session.playCount) + 1 }
    : session);
}

export function parseSavedSessions(raw: string | null | undefined): SavedSession[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    const rows = Array.isArray(parsed)
      ? parsed
      : isRecord(parsed) && Array.isArray(parsed.sessions)
        ? parsed.sessions
        : [];
    const ids = new Set<string>();
    const sessions: SavedSession[] = [];
    for (const row of rows) {
      const session = sanitizeStoredSession(row);
      if (!session || ids.has(session.id)) continue;
      ids.add(session.id);
      sessions.push(session);
    }
    return sessions;
  } catch {
    return [];
  }
}

export async function loadSavedSessions(storage: SavedSessionStorage): Promise<SavedSession[]> {
  const raw = await storage.getItem(SAVED_SESSIONS_STORAGE_KEY);
  return parseSavedSessions(raw);
}

export async function persistSavedSessions(
  storage: SavedSessionStorage,
  sessions: SavedSession[],
): Promise<void> {
  const payload = {
    schemaVersion: SAVED_SESSION_SCHEMA_VERSION,
    sessions: sessions.map((session) => sanitizeStoredSession(session)).filter(isSavedSession),
  };
  await storage.setItem(SAVED_SESSIONS_STORAGE_KEY, JSON.stringify(payload));
}

export function sortSavedSessions(
  sessions: SavedSession[],
  mode: SavedSessionSortMode,
): SavedSession[] {
  return [...sessions].sort((a, b) => {
    if (mode === "A–Z") return a.name.localeCompare(b.name) || b.updatedAt.localeCompare(a.updatedAt);
    if (mode === "Recently updated") return b.updatedAt.localeCompare(a.updatedAt) || a.name.localeCompare(b.name);
    const aUsed = a.lastPlayedAt ?? a.updatedAt;
    const bUsed = b.lastPlayedAt ?? b.updatedAt;
    return bUsed.localeCompare(aUsed) || b.updatedAt.localeCompare(a.updatedAt);
  });
}

export function deriveQuickMixes(sessions: SavedSession[]): QuickMix[] {
  if (!sessions.length) return [];
  const mixes: QuickMix[] = [];
  const seenSessionIds = new Set<string>();
  const addMix = (mix: QuickMix | null) => {
    if (!mix || seenSessionIds.has(mix.sessionId)) return;
    seenSessionIds.add(mix.sessionId);
    mixes.push(mix);
  };
  const played = sessions.filter((session) => session.lastPlayedAt && session.playCount > 0);
  const last = [...played].sort((a, b) => (b.lastPlayedAt ?? "").localeCompare(a.lastPlayedAt ?? ""))[0];
  addMix(last ? toQuickMix("resume-last", "Resume last session", last, "Continue where you left off.") : null);
  const mostPlayed = [...played].sort((a, b) => b.playCount - a.playCount || (b.lastPlayedAt ?? "").localeCompare(a.lastPlayedAt ?? ""))[0];
  addMix(mostPlayed ? toQuickMix("most-played", "Most played saved session", mostPlayed, `${mostPlayed.playCount} local starts.`) : null);
  const recent = [...sessions].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  addMix(recent ? toQuickMix("recently-saved", "Recently saved", recent, "Your newest saved session.") : null);

  const totalPlays = played.reduce((sum, session) => sum + session.playCount, 0);
  if (totalPlays >= 3) {
    const laneCounts = new Map<string, number>();
    for (const session of played) {
      const lane = getMainSessionLane(session);
      if (lane) laneCounts.set(lane, (laneCounts.get(lane) ?? 0) + session.playCount);
    }
    const favoriteLane = [...laneCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    if (favoriteLane && favoriteLane[1] >= 2) {
      const favorite = [...played]
        .filter((session) => getMainSessionLane(session) === favoriteLane[0])
        .sort((a, b) => b.playCount - a.playCount || (b.lastPlayedAt ?? "").localeCompare(a.lastPlayedAt ?? ""))[0];
      addMix(favorite ? toQuickMix("favorite-category", "Favorite category session", favorite, `${favoriteLane[0]} is your most-used lane.`) : null);
    }
  }
  return mixes;
}

export function resolveSavedSession(
  session: SavedSession,
  catalog: SavedSessionCatalogSound[],
  choiceConsentGranted: boolean,
  eligibilityResolver?: SavedSessionEligibilityResolver,
): SavedSessionResolution {
  const catalogById = new Map(catalog.map((sound) => [sound.id, sound]));
  const validEntries: ResolvedSavedSessionEntry[] = [];
  const unavailableEntries: UnavailableSavedSessionEntry[] = [];
  let choiceRequired = false;

  for (const entry of session.sounds) {
    const current = catalogById.get(entry.soundId);
    if (entry.enabled) {
      choiceRequired = choiceRequired || entry.userChoiceOnly || current?.userChoiceOnly === true;
    }
    if (!current) {
      unavailableEntries.push({ entry, reason: "missing" });
      continue;
    }
    if (current.playable === false) {
      unavailableEntries.push({ entry, reason: "inactive" });
      continue;
    }
    const eligibility = eligibilityResolver?.(entry.soundId);
    if (eligibility && !eligibility.allowed) {
      unavailableEntries.push({ entry, reason: "restricted", ...(eligibility.reason ? { detail: eligibility.reason } : {}) });
      continue;
    }
    const audioUrl = normalizeShortString(current.audioUrl, 2048) ?? entry.sourceUri;
    if (!audioUrl) {
      unavailableEntries.push({ entry, reason: "missing source" });
      continue;
    }
    validEntries.push({
      ...entry,
      title: normalizeShortString(current.title, 120) ?? entry.titleSnapshot,
      lane: normalizeShortString(current.lane ?? current.category, 120) ?? entry.laneSnapshot,
      audioUrl,
      userChoiceOnly: entry.userChoiceOnly || current.userChoiceOnly === true,
      catalogSound: current,
    });
  }

  const issueSummary = unavailableEntries.length
    ? `Some sounds are unavailable: ${unavailableEntries.map(({ entry, detail }) => `${entry.titleSnapshot}${detail ? ` (${detail})` : ""}`).join(", ")}.`
    : "";
  const activeValidEntries = validEntries.filter((entry) => entry.enabled);
  return {
    canStart: activeValidEntries.length > 0 && (!choiceRequired || choiceConsentGranted),
    choiceRequired,
    choiceConsentGranted,
    isPartial: activeValidEntries.length > 0 && unavailableEntries.length > 0,
    validEntries,
    unavailableEntries,
    issueSummary,
  };
}

export function getMainSessionLane(session: SavedSession): string {
  const enabled = session.sounds.filter((entry) => entry.enabled);
  return enabled[0]?.laneSnapshot ?? session.sounds[0]?.laneSnapshot ?? "";
}

export function createUniqueSessionId(
  existingIds: Iterable<string>,
  idFactory: (() => string) | undefined = defaultSessionIdFactory,
): string {
  const occupied = new Set(existingIds);
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = normalizeId(idFactory());
    if (candidate && !occupied.has(candidate)) return candidate;
  }
  let suffix = 1;
  const fallbackBase = `session-${Date.now().toString(36)}`;
  while (occupied.has(`${fallbackBase}-${suffix}`)) suffix += 1;
  return `${fallbackBase}-${suffix}`;
}

function defaultSessionIdFactory(): string {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `session-${Date.now().toString(36)}-${randomPart}`;
}

function sanitizeStoredSession(value: unknown): SavedSession | null {
  if (!isRecord(value)) return null;
  const id = normalizeId(value.id);
  const draft = sanitizeDraft(value);
  if (!id || !draft) return null;
  const createdAt = normalizeDate(value.createdAt) ?? normalizeDate(value.updatedAt) ?? new Date(0).toISOString();
  const updatedAt = normalizeDate(value.updatedAt) ?? createdAt;
  const lastPlayedAt = normalizeDate(value.lastPlayedAt);
  const playCount = typeof value.playCount === "number" && Number.isFinite(value.playCount)
    ? Math.max(0, Math.floor(value.playCount))
    : lastPlayedAt ? 1 : 0;
  return {
    ...draft,
    id,
    createdAt,
    updatedAt,
    lastPlayedAt,
    playCount,
    schemaVersion: SAVED_SESSION_SCHEMA_VERSION,
  };
}

function sanitizeDraft(value: unknown): SavedSessionDraft | null {
  if (!isRecord(value)) return null;
  const name = normalizeName(value.name);
  const rawSounds = Array.isArray(value.sounds) ? value.sounds : [];
  const sounds = rawSounds
    .map((entry, index) => sanitizeSoundEntry(entry, index, rawSounds.length))
    .filter(isSavedSessionSoundEntry);
  if (!name || sounds.length === 0) return null;
  const source = allowedSources.has(value.source as SavedSessionSource) ? value.source as SavedSessionSource : "Manual";
  const inferredType: SavedSessionType = sounds.length > 1 ? "Layered recipe" : "Single sound";
  const type = allowedTypes.has(value.type as SavedSessionType) ? value.type as SavedSessionType : inferredType;
  const timerMinutes = typeof value.timerMinutes === "number" && Number.isFinite(value.timerMinutes)
    ? Math.max(0, Math.min(1440, Math.round(value.timerMinutes)))
    : undefined;
  const note = normalizeShortString(value.note, SAVED_SESSION_NOTE_LIMIT);
  const builderModel = sanitizeBuilderModel(value.builderModel);
  return {
    name,
    source,
    type,
    sounds,
    loop: value.loop === true,
    ...(timerMinutes === undefined ? {} : { timerMinutes }),
    ...(note ? { note } : {}),
    ...(builderModel ? { builderModel } : {}),
  };
}

function sanitizeSoundEntry(value: unknown, index: number, total: number): SavedSessionSoundEntry | null {
  if (!isRecord(value)) return null;
  const soundId = normalizeId(value.soundId ?? value.id);
  const titleSnapshot = normalizeShortString(value.titleSnapshot ?? value.title, 120);
  const laneSnapshot = normalizeShortString(value.laneSnapshot ?? value.lane ?? value.category, 120) ?? "Library";
  const sourceUri = normalizeShortString(value.sourceUri ?? value.audioUrl ?? value.uri, 2048);
  if (!soundId || !titleSnapshot || !sourceUri) return null;
  const volume = typeof value.volume === "number" && Number.isFinite(value.volume)
    ? Math.max(0, Math.min(1, value.volume))
    : 1;
  const role: BuilderSessionLayerRole = value.role === "bed" || value.role === "texture" || value.role === "accent" || value.role === "foreground"
    ? value.role
    : index === 0 ? "bed" : index === total - 1 && index > 1 ? "accent" : "texture";
  const builderLayerId = normalizeId(value.builderLayerId) ?? `${role}:${index}`;
  return {
    soundId,
    titleSnapshot,
    laneSnapshot,
    sourceUri,
    volume,
    enabled: value.enabled !== false && value.muted !== true,
    userChoiceOnly: value.userChoiceOnly === true,
    role,
    builderLayerId,
  };
}

function sanitizeBuilderModel(value: unknown): BuilderSessionModelV1 | undefined {
  if (!isRecord(value) || value.contractVersion !== "1") return undefined;
  if (typeof value.recipeId !== "string" || typeof value.editId !== "string" || !Array.isArray(value.layers)) return undefined;
  try {
    return reopenBuilderSession(value as BuilderSessionModelV1);
  } catch {
    return undefined;
  }
}

function normalizeId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().slice(0, 160);
  return normalized || null;
}

function normalizeName(value: unknown): string | null {
  return normalizeShortString(value, 80);
}

function normalizeShortString(value: unknown, limit: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ").slice(0, limit);
  return normalized || null;
}

function normalizeDate(value: unknown): string | null {
  const millis = typeof value === "number"
    ? value
    : typeof value === "string" && value.trim()
      ? Date.parse(value)
      : Number.NaN;
  if (!Number.isFinite(millis)) return null;
  const date = new Date(millis);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isSavedSession(value: SavedSession | null): value is SavedSession {
  return value !== null;
}

function isSavedSessionSoundEntry(value: SavedSessionSoundEntry | null): value is SavedSessionSoundEntry {
  return value !== null;
}

function toQuickMix(
  kind: QuickMixKind,
  label: QuickMix["label"],
  session: SavedSession,
  detail: string,
): QuickMix {
  return { kind, label, sessionId: session.id, sessionName: session.name, detail };
}
