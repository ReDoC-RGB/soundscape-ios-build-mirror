export const LOCAL_BACKUP_TRANSPORT_V1 = Object.freeze({
  extension: ".json",
  mimeType: "application/json",
  iosUti: "public.json",
  pickerMimeTypes: ["application/json", "text/plain", "application/octet-stream"] as readonly string[],
  legacyExtensions: [".txt"] as readonly string[],
  maxBytes: 2_000_000,
});

export type LocalBackupCandidateV1 = Readonly<{
  uri: string;
  displayName?: string | null;
  mimeType: string | null;
  text: string;
}>;

export type LocalBackupCandidateDecisionV1 = Readonly<{
  accepted: boolean;
  extension: ".json" | ".txt" | "unsupported";
  legacyTextTransport: boolean;
  reason: string | null;
}>;

const extensionFrom = (value: string | null | undefined): ".json" | ".txt" | "unsupported" => {
  if (!value) return "unsupported";
  let normalized = value;
  try { normalized = decodeURIComponent(value); } catch { normalized = value; }
  normalized = normalized.split(/[?#]/, 1)[0]?.toLowerCase() ?? "";
  if (normalized.endsWith(".json")) return ".json";
  if (normalized.endsWith(".txt")) return ".txt";
  return "unsupported";
};
const getCandidateExtension = (candidate: LocalBackupCandidateV1): ".json" | ".txt" | "unsupported" => {
  const displayNameExtension = extensionFrom(candidate.displayName);
  return displayNameExtension !== "unsupported" ? displayNameExtension : extensionFrom(candidate.uri);
};
const normalizedMimeType = (value: string | null): string | null => value?.split(";", 1)[0]?.trim().toLowerCase() || null;

export function classifyLocalBackupCandidateV1(
  candidate: LocalBackupCandidateV1,
): LocalBackupCandidateDecisionV1 {
  const extension = getCandidateExtension(candidate);
  const mimeType = normalizedMimeType(candidate.mimeType);
  if (new TextEncoder().encode(candidate.text).byteLength > LOCAL_BACKUP_TRANSPORT_V1.maxBytes) {
    return Object.freeze({ accepted: false, extension, legacyTextTransport: extension === ".txt", reason: "Backup file exceeds the size limit." });
  }
  if (extension === "unsupported") {
    return Object.freeze({ accepted: false, extension, legacyTextTransport: false, reason: "Only Soundscape .json and legacy .txt backup files are supported." });
  }
  if (extension === ".json" && mimeType && !["application/json", "application/octet-stream", "text/json", "text/plain"].includes(mimeType)) {
    return Object.freeze({ accepted: false, extension, legacyTextTransport: false, reason: "The selected .json file has an incompatible media type." });
  }
  if (extension === ".txt" && mimeType && !["text/plain", "application/octet-stream", "application/json", "text/json"].includes(mimeType)) {
    return Object.freeze({ accepted: false, extension, legacyTextTransport: true, reason: "The selected legacy .txt file has an incompatible media type." });
  }
  try {
    const parsed = JSON.parse(candidate.text) as { schemaVersion?: unknown; payload?: unknown; checksumSha256?: unknown };
    if (!parsed || typeof parsed !== "object" || parsed.schemaVersion !== 1 || !parsed.payload || typeof parsed.payload !== "object" || typeof parsed.checksumSha256 !== "string") {
      return Object.freeze({ accepted: false, extension, legacyTextTransport: extension === ".txt", reason: "The file is not a version 1 Soundscape JSON backup." });
    }
  } catch {
    return Object.freeze({ accepted: false, extension, legacyTextTransport: extension === ".txt", reason: "The file does not contain valid JSON." });
  }
  return Object.freeze({ accepted: true, extension, legacyTextTransport: extension === ".txt", reason: null });
}
