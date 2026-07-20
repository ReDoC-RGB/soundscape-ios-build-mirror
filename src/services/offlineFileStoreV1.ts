import { Directory, File, Paths } from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import { fetch } from "expo/fetch";
import { Platform } from "react-native";
import { sha256Hex } from "../contracts/localBackupContractV1";
import {
  classifyLocalBackupCandidateV1,
  LOCAL_BACKUP_TRANSPORT_V1,
} from "../contracts/localBackupTransportContractV1";
import {
  OfflineDownloadPortErrorV1,
  type OfflineFilePortV1,
  type OfflineNetworkDownloadResultV1,
  type OfflineNetworkPortV1,
} from "./offlineDownloadManagerV1";

const offlineRoot = new Directory(Paths.document, "soundscape-offline-v1");
const backupRoot = new Directory(Paths.cache, "soundscape-backups-v1");
const ensureDirectory = (directory: Directory) => { if (!directory.exists) directory.create({ idempotent: true, intermediates: true }); };
const safeName = (value: string) => value.replace(/[^a-z0-9._-]/gi, "_");
const safeMediaExtension = (remoteUri: string, requested?: string): string => {
  if (requested && /^\.(mp3|m4a|aac|wav|caf|flac|ogg)$/i.test(requested)) return requested.toLowerCase();
  const source = remoteUri.split(/[?#]/, 1)[0]?.toLowerCase() ?? "";
  const extension = source.match(/\.(mp3|m4a|aac|wav|caf|flac|ogg)$/)?.[0];
  return extension ?? ".mp3";
};
const parseHeaderNumber = (value: string | null): number | null => {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
};

export const expoOfflineFilePortV1: OfflineFilePortV1 = Object.freeze({
  tempUri(assetId, operationId, fileExtension) {
    ensureDirectory(offlineRoot);
    const extension = safeMediaExtension("", fileExtension);
    return new File(offlineRoot, `${safeName(assetId)}.${operationId}.part${extension}`).uri;
  },
  finalUri(assetId, remoteUri, fileExtension) {
    ensureDirectory(offlineRoot);
    return new File(offlineRoot, `${safeName(assetId)}${safeMediaExtension(remoteUri, fileExtension)}`).uri;
  },
  async normalizePlaybackUri(uri, assetId, remoteUri) {
    ensureDirectory(offlineRoot);
    const expectedUri = new File(offlineRoot, `${safeName(assetId)}${safeMediaExtension(remoteUri)}`).uri;
    if (uri === expectedUri || Platform.OS !== "ios") return uri;
    const source = new File(uri);
    if (!source.exists) return uri;
    const target = new File(expectedUri);
    if (target.exists) target.delete();
    source.move(target);
    return target.uri;
  },
  async availableBytes() { return Number(Paths.availableDiskSpace ?? 0); },
  async stat(uri) {
    const file = new File(uri);
    const info = file.info();
    return { exists: info.exists, bytes: Number(info.size ?? 0) };
  },
  async sha256(uri) {
    const file = new File(uri);
    if (!file.exists) throw new OfflineDownloadPortErrorV1("filesystem", "Cannot hash a missing download file.");
    return sha256Hex(await file.bytes());
  },
  async validateMedia(uri, mediaType = "audio/mpeg", fileExtension = ".mp3") {
    const file = new File(uri);
    if (!file.exists || file.size <= 0) return false;
    if (!mediaType.toLowerCase().startsWith("audio/") || !uri.toLowerCase().split(/[?#]/, 1)[0]?.endsWith(fileExtension.toLowerCase())) return false;
    const bytes = await file.bytes();
    if (bytes.length < 12) return false;
    const ascii = String.fromCharCode(...bytes.slice(0, 12));
    return ascii.startsWith("ID3") || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) || ascii.includes("ftyp") || ascii.startsWith("RIFF") || ascii.startsWith("OggS") || ascii.startsWith("fLaC");
  },
  async promoteAtomic(tempUri, finalUri) {
    const source = new File(tempUri);
    const target = new File(finalUri);
    if (!source.exists) throw new OfflineDownloadPortErrorV1("promotion", "Validated temporary file disappeared before promotion.");
    source.move(target);
  },
  async remove(uri) { const file = new File(uri); if (file.exists) file.delete(); },
});

export const expoOfflineNetworkPortV1: OfflineNetworkPortV1 = Object.freeze({
  async download(remoteUri, tempUri): Promise<OfflineNetworkDownloadResultV1> {
    let response: Awaited<ReturnType<typeof fetch>>;
    try {
      response = await fetch(remoteUri, { headers: { Range: "bytes=0-" } });
    } catch (error) {
      throw new OfflineDownloadPortErrorV1("offline", error instanceof Error ? error.message : String(error));
    }
    const status = response.status;
    if (![200, 206].includes(status)) throw new OfflineDownloadPortErrorV1("http", `Download failed with HTTP ${status}.`, { status });
    const acceptedStatus = status as 200 | 206;
    const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() ?? null;
    const contentLength = parseHeaderNumber(response.headers.get("content-length"));
    const contentRange = response.headers.get("content-range");
    const bytes = await response.bytes();
    if (status === 206) {
      const match = contentRange?.match(/^bytes\s+0-(\d+)\/(\d+)$/i);
      if (!match || Number(match[1]) + 1 !== Number(match[2]) || Number(match[2]) !== bytes.length) {
        throw new OfflineDownloadPortErrorV1("integrity", `Incomplete HTTP 206 response: ${contentRange ?? "missing Content-Range"}.`, { status: acceptedStatus, contentType, contentLength, contentRange, bytesWritten: bytes.length });
      }
    }
    try {
      const destination = new File(tempUri);
      if (destination.exists) destination.delete();
      destination.write(bytes);
      const written = destination.info();
      if (!written.exists || Number(written.size ?? 0) !== bytes.length) throw new Error(`File write returned ${written.size ?? 0}/${bytes.length} bytes.`);
    } catch (error) {
      throw new OfflineDownloadPortErrorV1("filesystem", error instanceof Error ? error.message : String(error), { status: acceptedStatus, contentType, contentLength, contentRange, bytesWritten: bytes.length });
    }
    return Object.freeze({
      status: acceptedStatus,
      finalUrl: response.url || remoteUri,
      redirected: response.redirected,
      contentType,
      contentLength,
      contentRange,
      bytesWritten: bytes.length,
    });
  },
});

export async function canReachRemoteMediaSourceV1(remoteUri: string): Promise<boolean> {
  try {
    await fetch(remoteUri, { method: "HEAD" });
    return true;
  } catch {
    return false;
  }
}

export async function writeLocalBackupFileV1(text: string, createdAt: string): Promise<File> {
  ensureDirectory(backupRoot);
  const stamp = createdAt.replace(/[:.]/g, "-");
  const file = new File(backupRoot, `soundscape-local-backup-${stamp}${LOCAL_BACKUP_TRANSPORT_V1.extension}`);
  file.write(text);
  return file;
}

export async function shareLocalBackupFileV1(file: File): Promise<void> {
  if (!await Sharing.isAvailableAsync()) throw new Error("File sharing is not available on this device.");
  await Sharing.shareAsync(file.uri, {
    mimeType: LOCAL_BACKUP_TRANSPORT_V1.mimeType,
    UTI: LOCAL_BACKUP_TRANSPORT_V1.iosUti,
    dialogTitle: "Export Soundscape local backup",
  });
}

export async function pickLocalBackupTextV1(): Promise<{ text: string; uri: string; displayName: string; mimeType: string | null } | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: Platform.OS === "ios"
      ? ["application/json", "text/plain"]
      : [...LOCAL_BACKUP_TRANSPORT_V1.pickerMimeTypes],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) return null;
  const file = new File(asset.uri);
  const text = await file.text();
  const displayName = asset.name || file.name;
  const mimeType = asset.mimeType || file.type || null;
  const decision = classifyLocalBackupCandidateV1({ uri: asset.uri, displayName, mimeType, text });
  if (!decision.accepted) throw new Error(decision.reason ?? "The selected file is not a valid Soundscape backup candidate.");
  return { text, uri: asset.uri, displayName, mimeType };
}
