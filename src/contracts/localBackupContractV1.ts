export const LOCAL_BACKUP_SCHEMA_VERSION = 1 as const;
export type LocalBackupModeV1 = "merge" | "replace";
export type LocalBackupV1 = Readonly<{
  schemaVersion: typeof LOCAL_BACKUP_SCHEMA_VERSION;
  createdAt: string;
  appReleaseIdentity: string;
  profileReference: string;
  payload: any;
  checksumSha256: string;
}>;

const rotr = (value: number, shift: number) => (value >>> shift) | (value << (32 - shift));
const K = [
  0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
  0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
  0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
  0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
  0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
  0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
  0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
  0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2,
];
export function sha256Hex(input: string | Uint8Array): string {
  const source = typeof input === "string" ? new TextEncoder().encode(input) : input;
  const bitLength = source.length * 8;
  const paddedLength = Math.ceil((source.length + 9) / 64) * 64;
  const bytes = new Uint8Array(paddedLength);
  bytes.set(source);
  bytes[source.length] = 0x80;
  const view = new DataView(bytes.buffer);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000), false);
  view.setUint32(paddedLength - 4, bitLength >>> 0, false);
  const h = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const w = new Uint32Array(64);
  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let i = 0; i < 16; i += 1) w[i] = view.getUint32(offset + i * 4, false);
    for (let i = 16; i < 64; i += 1) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a,b,c,d,e,f,g,hh] = h;
    for (let i = 0; i < 64; i += 1) {
      const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + s1 + ch + K[i] + w[i]) >>> 0;
      const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (s0 + maj) >>> 0;
      hh=g; g=f; f=e; e=(d+t1)>>>0; d=c; c=b; b=a; a=(t1+t2)>>>0;
    }
    h[0]=(h[0]+a)>>>0; h[1]=(h[1]+b)>>>0; h[2]=(h[2]+c)>>>0; h[3]=(h[3]+d)>>>0;
    h[4]=(h[4]+e)>>>0; h[5]=(h[5]+f)>>>0; h[6]=(h[6]+g)>>>0; h[7]=(h[7]+hh)>>>0;
  }
  return h.map((value) => value.toString(16).padStart(8, "0")).join("");
}

const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(object[key])}`).join(",")}}`;
};
const assertSafe = (value: unknown, depth = 0): void => {
  if (depth > 30) throw new Error("Backup structure is too deeply nested.");
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    if (value.length > 10000) throw new Error("Backup array is too large.");
    for (const entry of value) assertSafe(entry, depth + 1);
    return;
  }
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (["__proto__", "prototype", "constructor", "mediaBytes", "base64Audio"].includes(key)) throw new Error(`Unsafe backup key: ${key}`);
    assertSafe(entry, depth + 1);
  }
};
const withoutMediaBytes = (snapshot: any): any => {
  assertSafe(snapshot);
  const clone = JSON.parse(JSON.stringify(snapshot));
  if (Array.isArray(clone.offlineManifest)) {
    clone.offlineManifest = clone.offlineManifest.map((item: any) => ({
      ...item,
      localUri: null,
      verifiedBytes: null,
      state: item.state === "available" ? "failed/retryable" : item.state,
      lastError: item.state === "available" ? "Media bytes are not embedded in backup; re-download is required." : item.lastError ?? null,
    }));
  }
  return clone;
};
export function createLocalBackupV1(snapshot: any, options: { createdAt: string; appReleaseIdentity: string }): LocalBackupV1 {
  const createdAt = new Date(options.createdAt).toISOString();
  const payload = withoutMediaBytes(snapshot);
  const profileReference = typeof payload.profile?.id === "string" ? payload.profile.id : "local-profile:unknown";
  return Object.freeze({
    schemaVersion: LOCAL_BACKUP_SCHEMA_VERSION,
    createdAt,
    appReleaseIdentity: options.appReleaseIdentity,
    profileReference,
    payload,
    checksumSha256: sha256Hex(stableStringify(payload)),
  });
}
export const serializeLocalBackupV1 = (backup: LocalBackupV1): string => stableStringify(backup);
export function validateLocalBackupV1(raw: string): { ok: true; backup: LocalBackupV1 } | { ok: false; reason: string } {
  try {
    if (new TextEncoder().encode(raw).length > 2_000_000) return { ok: false, reason: "Backup exceeds the 2 MB supported limit." };
    const parsed = JSON.parse(raw) as LocalBackupV1;
    assertSafe(parsed);
    if (parsed.schemaVersion !== 1) return { ok: false, reason: "Incompatible backup schema." };
    if (!Number.isFinite(Date.parse(parsed.createdAt))) return { ok: false, reason: "Invalid backup creation time." };
    if (!/^Alpha 0\.\d+\.\d+/.test(parsed.appReleaseIdentity)) return { ok: false, reason: "Invalid app release identity." };
    if (!/^local-profile:/.test(parsed.profileReference)) return { ok: false, reason: "Invalid local profile reference." };
    if (!parsed.payload || typeof parsed.payload !== "object") return { ok: false, reason: "Backup payload is missing." };
    if (sha256Hex(stableStringify(parsed.payload)) !== parsed.checksumSha256) return { ok: false, reason: "Backup checksum mismatch; nothing was imported." };
    return { ok: true, backup: parsed };
  } catch (error) {
    return { ok: false, reason: `Corrupt or unsafe backup: ${error instanceof Error ? error.message : String(error)}` };
  }
}
const mergeStrings = (a: unknown, b: unknown) => [...new Set([...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])].filter((value): value is string => typeof value === "string"))];
const mergeById = (a: unknown, b: unknown) => {
  const result = new Map<string, any>();
  for (const value of [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])]) {
    const id = value && typeof value === "object" && typeof value.id === "string" ? value.id : stableStringify(value);
    if (!result.has(id)) result.set(id, value);
    else {
      const current = result.get(id);
      const currentRevision = Number(current?.revision ?? current?.updatedAt ?? 0);
      const nextRevision = Number(value?.revision ?? value?.updatedAt ?? 0);
      if (nextRevision > currentRevision) result.set(id, value);
    }
  }
  return [...result.values()];
};
export function applyLocalBackupV1(current: any, backup: LocalBackupV1, mode: LocalBackupModeV1): any {
  const imported = withoutMediaBytes(backup.payload);
  if (mode === "replace") return imported;
  return {
    ...current,
    ...imported,
    profile: current.profile ?? imported.profile,
    savedSoundIds: mergeStrings(current.savedSoundIds, imported.savedSoundIds),
    recentSoundIds: mergeStrings(current.recentSoundIds, imported.recentSoundIds),
    savedSessions: mergeById(current.savedSessions, imported.savedSessions),
    builderSessions: mergeById(current.builderSessions, imported.builderSessions),
    offlineManifest: mergeById(current.offlineManifest, imported.offlineManifest),
    preferences: { ...(current.preferences ?? {}), ...(imported.preferences ?? {}) },
    feedback: { ...(current.feedback ?? {}), ...(imported.feedback ?? {}) },
  };
}
