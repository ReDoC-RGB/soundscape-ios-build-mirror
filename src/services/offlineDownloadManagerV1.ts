import {
  createOfflineManifestItem,
  decideOfflineEligibility,
  planQuotaEviction,
  recoverOfflineManifestItem,
  transitionOfflineManifestItem,
  type OfflineDownloadFailureCodeV1,
  type OfflineManifestItemV1,
} from "../contracts/offlineManifestContractV1";
import type { CatalogDeliveryRightsV1, LifecycleState } from "../contracts/catalogContractV2";

export const OFFLINE_DOWNLOAD_CUSTOMER_COPY_V1: Readonly<Record<OfflineDownloadFailureCodeV1, string>> = Object.freeze({
  offline: "Connect to the internet to download this sound.",
  http: "The download couldn't start. Try again.",
  filesystem: "The download couldn't be saved. Check available storage and try again.",
  integrity: "The downloaded file couldn't be verified. Try again.",
  media: "The downloaded file couldn't be verified. Try again.",
  promotion: "The download couldn't be saved. Check available storage and try again.",
  stale: "Offline download failed. Try again.",
  unknown: "Offline download failed. Try again.",
});

export type OfflineNetworkDownloadResultV1 = Readonly<{
  status: 200 | 206;
  finalUrl: string;
  redirected: boolean;
  contentType: string | null;
  contentLength: number | null;
  contentRange: string | null;
  bytesWritten: number;
}>;
export type OfflineFilePortV1 = Readonly<{
  tempUri(assetId: string, operationId: number, fileExtension?: string): string;
  finalUri(assetId: string, remoteUri: string, fileExtension?: string): string;
  normalizePlaybackUri(uri: string, assetId: string, remoteUri: string): Promise<string>;
  availableBytes(): Promise<number>;
  stat(uri: string): Promise<{ exists: boolean; bytes: number }>;
  sha256(uri: string): Promise<string>;
  validateMedia(uri: string, mediaType?: string, fileExtension?: string): Promise<boolean>;
  promoteAtomic(tempUri: string, finalUri: string): Promise<void>;
  remove(uri: string): Promise<void>;
}>;
export type OfflineNetworkPortV1 = Readonly<{
  download(remoteUri: string, tempUri: string): Promise<OfflineNetworkDownloadResultV1 | void>;
}>;
export type OfflineDownloadInputV1 = Readonly<{
  assetId: string;
  remoteUri: string;
  catalogRevision: string;
  sourceRevision: string;
  expectedBytes: number;
  checksumSha256: string;
  mediaType?: string;
  fileExtension?: string;
  attributionRequired: boolean;
  rights: CatalogDeliveryRightsV1 | undefined;
  lifecycleState: LifecycleState;
  now: string;
}>;
export type OfflineDownloadDiagnosticV1 = Readonly<{
  assetId: string;
  operationId: number;
  stage: string;
  code: OfflineDownloadFailureCodeV1 | null;
  status: number | null;
  expectedBytes: number;
  actualBytes: number | null;
  expectedChecksum: string;
  actualChecksum: string | null;
  catalogRevision: string;
  sourceRevision: string;
  redirected: boolean | null;
  contentType: string | null;
  technicalReason: string | null;
}>;
export type VerifiedOfflineLocalResolutionV1 = Readonly<
  | { state: "local"; uri: string; item: OfflineManifestItemV1 }
  | { state: "not-downloaded"; item: null }
  | { state: "unusable" | "revoked"; item: OfflineManifestItemV1; reason: string }
>;

export type OfflineDownloadPortErrorDetailsV1 = Readonly<Partial<Omit<OfflineNetworkDownloadResultV1, "status">> & { status?: number }>;

export class OfflineDownloadPortErrorV1 extends Error {
  constructor(
    readonly code: OfflineDownloadFailureCodeV1,
    message: string,
    readonly details: OfflineDownloadPortErrorDetailsV1 = {},
  ) {
    super(message);
    this.name = "OfflineDownloadPortErrorV1";
  }
}

const normalizedExtension = (input: OfflineDownloadInputV1): string => {
  if (input.fileExtension && /^\.[a-z0-9]{2,5}$/i.test(input.fileExtension)) return input.fileExtension.toLowerCase();
  const fromUrl = input.remoteUri.split(/[?#]/, 1)[0]?.match(/\.(mp3|m4a|aac|wav|caf|flac|ogg)$/i)?.[0];
  return (fromUrl ?? ".mp3").toLowerCase();
};
const normalizedMediaType = (input: OfflineDownloadInputV1): string => input.mediaType ?? (normalizedExtension(input) === ".mp3" ? "audio/mpeg" : "audio/*");

export class OfflineDownloadManager {
  private readonly items = new Map<string, OfflineManifestItemV1>();
  private readonly inFlight = new Map<string, Promise<OfflineManifestItemV1>>();
  private readonly diagnostics = new Map<string, OfflineDownloadDiagnosticV1[]>();
  private nextOperationId = 0;
  constructor(private readonly options: {
    filePort: OfflineFilePortV1;
    network: OfflineNetworkPortV1;
    quotaBytes: number;
    reserveBytes: number;
    initialItems?: readonly OfflineManifestItemV1[];
  }) {
    for (const item of options.initialItems ?? []) {
      const recovered = recoverOfflineManifestItem(item, new Date().toISOString());
      this.items.set(recovered.assetId, recovered);
    }
    this.nextOperationId = Math.max(0, ...[...this.items.values()].map((item) => item.operationId));
  }
  get(assetId: string): OfflineManifestItemV1 | null { return this.items.get(assetId) ?? null; }
  getDiagnostics(assetId: string): readonly OfflineDownloadDiagnosticV1[] { return Object.freeze([...(this.diagnostics.get(assetId) ?? [])]); }
  enumerate(): readonly OfflineManifestItemV1[] { return Object.freeze([...this.items.values()].sort((a, b) => a.assetId.localeCompare(b.assetId))); }
  storageTotals() {
    const available = [...this.items.values()].filter((item) => item.state === "available");
    return Object.freeze({
      availableBytes: available.reduce((sum, item) => sum + (item.verifiedBytes ?? item.expectedBytes), 0),
      itemCount: available.length,
      quotaBytes: this.options.quotaBytes,
    });
  }
  download(input: OfflineDownloadInputV1, activeAssetIds: ReadonlySet<string> = new Set()): Promise<OfflineManifestItemV1> {
    const existing = this.inFlight.get(input.assetId);
    if (existing) return existing;
    const promise = this.performDownload(input, activeAssetIds).finally(() => this.inFlight.delete(input.assetId));
    this.inFlight.set(input.assetId, promise);
    return promise;
  }
  retry(assetId: string, input: OfflineDownloadInputV1, activeAssetIds: ReadonlySet<string> = new Set()) {
    if (assetId !== input.assetId) throw new Error("Retry asset identity mismatch.");
    return this.download(input, activeAssetIds);
  }
  private recordDiagnostic(input: OfflineDownloadInputV1, diagnostic: OfflineDownloadDiagnosticV1): void {
    const entries = [...(this.diagnostics.get(input.assetId) ?? []), Object.freeze(diagnostic)].slice(-20);
    this.diagnostics.set(input.assetId, entries);
  }
  private owns(input: OfflineDownloadInputV1, operationId: number): boolean {
    const current = this.items.get(input.assetId);
    return current?.operationId === operationId
      && current.catalogRevision === input.catalogRevision
      && current.sourceRevision === input.sourceRevision
      && current.expectedBytes === input.expectedBytes
      && current.checksumSha256.toLowerCase() === input.checksumSha256.toLowerCase();
  }
  private staleResult(input: OfflineDownloadInputV1, item: OfflineManifestItemV1, reason: string): OfflineManifestItemV1 {
    this.recordDiagnostic(input, {
      assetId: input.assetId, operationId: item.operationId, stage: "stale", code: "stale", status: null,
      expectedBytes: input.expectedBytes, actualBytes: null, expectedChecksum: input.checksumSha256, actualChecksum: null,
      catalogRevision: input.catalogRevision, sourceRevision: input.sourceRevision, redirected: null, contentType: null, technicalReason: reason,
    });
    return this.items.get(input.assetId) ?? Object.freeze({
      ...item,
      state: "failed/retryable" as const,
      stage: "failed" as const,
      lastError: reason,
      lastErrorCode: "stale" as const,
      lastErrorCustomerCopy: OFFLINE_DOWNLOAD_CUSTOMER_COPY_V1.stale,
      lastErrorTechnicalReason: reason,
    });
  }
  private async performDownload(input: OfflineDownloadInputV1, activeAssetIds: ReadonlySet<string>): Promise<OfflineManifestItemV1> {
    const eligibility = decideOfflineEligibility(input.rights, input.lifecycleState);
    const operationId = ++this.nextOperationId;
    const extension = normalizedExtension(input);
    const mediaType = normalizedMediaType(input);
    let item = createOfflineManifestItem({ ...input, eligibility, operationId });
    this.items.set(input.assetId, item);
    if (!eligibility.eligible) return item;
    let tempUri: string | null = null;
    let finalUri: string | null = null;
    let networkResult: OfflineNetworkDownloadResultV1 | null = null;
    let actualBytes: number | null = null;
    let actualChecksum: string | null = null;
    let stage = "filesystem";
    try {
      const requiredDiskBytes = input.expectedBytes + this.options.reserveBytes;
      const availableDiskBytes = await this.options.filePort.availableBytes();
      if (availableDiskBytes < requiredDiskBytes) {
        throw new OfflineDownloadPortErrorV1("filesystem", `Not enough storage. ${requiredDiskBytes} bytes are required including the safety reserve.`);
      }
      const currentAvailableBytes = this.storageTotals().availableBytes;
      const quotaOverflow = Math.max(0, currentAvailableBytes + input.expectedBytes - this.options.quotaBytes);
      if (quotaOverflow > 0) {
        const evictions = planQuotaEviction(this.enumerate(), quotaOverflow, activeAssetIds);
        const releasable = evictions.reduce((sum, id) => sum + (this.items.get(id)?.verifiedBytes ?? this.items.get(id)?.expectedBytes ?? 0), 0);
        if (releasable < quotaOverflow) throw new OfflineDownloadPortErrorV1("filesystem", "Offline quota is full and actively playing or protected media cannot be evicted.");
        for (const assetId of evictions) await this.delete(assetId, input.now, activeAssetIds);
      }
      item = transitionOfflineManifestItem(item, { type: "download-started", operationId, now: input.now });
      this.items.set(input.assetId, item);
      tempUri = this.options.filePort.tempUri(input.assetId, operationId, extension);
      finalUri = this.options.filePort.finalUri(input.assetId, input.remoteUri, extension);
      await this.options.filePort.remove(tempUri).catch(() => undefined);
      stage = "http";
      networkResult = (await this.options.network.download(input.remoteUri, tempUri) ?? null) as OfflineNetworkDownloadResultV1 | null;
      if (!this.owns(input, operationId)) {
        await this.options.filePort.remove(tempUri).catch(() => undefined);
        return this.staleResult(input, item, "A newer catalog generation or operation replaced this download before validation.");
      }
      if (networkResult && ![200, 206].includes(networkResult.status)) throw new OfflineDownloadPortErrorV1("http", `Unexpected HTTP ${networkResult.status}.`, networkResult);
      if (networkResult?.contentType && !networkResult.contentType.toLowerCase().startsWith("audio/")) {
        throw new OfflineDownloadPortErrorV1("media", `Unexpected media type ${networkResult.contentType}.`, networkResult);
      }
      item = transitionOfflineManifestItem(item, { type: "downloaded", operationId, now: input.now });
      this.items.set(input.assetId, item);
      stage = "integrity";
      const stat = await this.options.filePort.stat(tempUri);
      actualBytes = stat.bytes;
      if (!stat.exists || stat.bytes !== input.expectedBytes) throw new OfflineDownloadPortErrorV1("integrity", `Download length mismatch: expected ${input.expectedBytes}, received ${stat.bytes}.`, networkResult ?? {});
      if (networkResult && networkResult.bytesWritten !== stat.bytes) throw new OfflineDownloadPortErrorV1("integrity", `Download write mismatch: response supplied ${networkResult.bytesWritten}, file contains ${stat.bytes}.`, networkResult);
      actualChecksum = (await this.options.filePort.sha256(tempUri)).toLowerCase();
      if (!this.owns(input, operationId)) {
        await this.options.filePort.remove(tempUri).catch(() => undefined);
        return this.staleResult(input, item, "A newer catalog generation or operation replaced this download during checksum validation.");
      }
      if (actualChecksum !== input.checksumSha256.toLowerCase()) throw new OfflineDownloadPortErrorV1("integrity", "Download checksum mismatch.", networkResult ?? {});
      stage = "media";
      if (!await this.options.filePort.validateMedia(tempUri, mediaType, extension)) throw new OfflineDownloadPortErrorV1("media", "Downloaded file is not valid supported media.", networkResult ?? {});
      if (!this.owns(input, operationId)) {
        await this.options.filePort.remove(tempUri).catch(() => undefined);
        return this.staleResult(input, item, "A newer catalog generation or operation replaced this download during media validation.");
      }
      stage = "promotion";
      item = transitionOfflineManifestItem(item, { type: "promotion-started", operationId, now: input.now });
      this.items.set(input.assetId, item);
      await this.options.filePort.remove(finalUri).catch(() => undefined);
      await this.options.filePort.promoteAtomic(tempUri, finalUri);
      tempUri = null;
      if (!this.owns(input, operationId)) {
        await this.options.filePort.remove(finalUri).catch(() => undefined);
        return this.staleResult(input, item, "A newer catalog generation or operation replaced this download during promotion.");
      }
      item = transitionOfflineManifestItem(item, { type: "verified", operationId, now: input.now, localUri: finalUri, verifiedBytes: actualBytes });
      this.items.set(input.assetId, item);
      this.recordDiagnostic(input, {
        assetId: input.assetId, operationId, stage: "available_offline", code: null, status: networkResult?.status ?? null,
        expectedBytes: input.expectedBytes, actualBytes, expectedChecksum: input.checksumSha256, actualChecksum,
        catalogRevision: input.catalogRevision, sourceRevision: input.sourceRevision, redirected: networkResult?.redirected ?? null,
        contentType: networkResult?.contentType ?? mediaType, technicalReason: null,
      });
      return item;
    } catch (error) {
      if (tempUri) await this.options.filePort.remove(tempUri).catch(() => undefined);
      if (stage === "promotion" && finalUri) await this.options.filePort.remove(finalUri).catch(() => undefined);
      const portError = error instanceof OfflineDownloadPortErrorV1 ? error : null;
      const code: OfflineDownloadFailureCodeV1 = portError?.code ?? (stage === "filesystem" || stage === "promotion" ? stage : stage === "http" ? "http" : "unknown");
      const technicalReason = error instanceof Error ? error.message : String(error);
      const failed = this.fail(item, input.now, code, technicalReason);
      this.recordDiagnostic(input, {
        assetId: input.assetId, operationId, stage, code, status: portError?.details.status ?? networkResult?.status ?? null,
        expectedBytes: input.expectedBytes, actualBytes, expectedChecksum: input.checksumSha256, actualChecksum,
        catalogRevision: input.catalogRevision, sourceRevision: input.sourceRevision,
        redirected: portError?.details.redirected ?? networkResult?.redirected ?? null,
        contentType: portError?.details.contentType ?? networkResult?.contentType ?? null,
        technicalReason,
      });
      return failed;
    }
  }
  private fail(item: OfflineManifestItemV1, now: string, code: OfflineDownloadFailureCodeV1, technicalReason: string): OfflineManifestItemV1 {
    const failed = transitionOfflineManifestItem(item, {
      type: "failed", operationId: item.operationId, now, error: technicalReason, code,
      customerCopy: OFFLINE_DOWNLOAD_CUSTOMER_COPY_V1[code], technicalReason,
    });
    if (this.items.get(item.assetId)?.operationId === item.operationId) this.items.set(item.assetId, failed);
    return failed;
  }
  async resolveVerifiedLocal(
    input: Pick<OfflineDownloadInputV1, "assetId" | "remoteUri" | "catalogRevision" | "sourceRevision" | "expectedBytes" | "checksumSha256" | "mediaType" | "fileExtension">,
    now: string,
  ): Promise<VerifiedOfflineLocalResolutionV1> {
    const item = this.items.get(input.assetId);
    if (!item) return Object.freeze({ state: "not-downloaded", item: null });
    if (item.state === "revoked" || item.state === "ineligible") return Object.freeze({ state: "revoked", item, reason: item.lastErrorTechnicalReason ?? item.lastError ?? "Offline eligibility is no longer valid." });
    const manifestMismatch = item.catalogRevision !== input.catalogRevision
      || item.sourceRevision !== input.sourceRevision
      || item.expectedBytes !== input.expectedBytes
      || item.checksumSha256.toLowerCase() !== input.checksumSha256.toLowerCase();
    if (item.state !== "available" || !item.localUri || item.verifiedBytes !== item.expectedBytes || manifestMismatch) {
      const reason = manifestMismatch ? "The offline manifest generation, source revision, byte count, or checksum is stale." : `The offline manifest state ${item.state} is not a verified available source.`;
      const failed = this.fail(item, now, "integrity", reason);
      return Object.freeze({ state: "unusable", item: failed, reason });
    }
    const operationId = item.operationId;
    const stat = await this.options.filePort.stat(item.localUri);
    if (!this.isCurrentOperation(input.assetId, operationId)) return Object.freeze({ state: "unusable", item, reason: "A newer offline operation replaced this verification." });
    if (!stat.exists || stat.bytes !== input.expectedBytes) {
      const reason = `The offline file is missing or has the wrong length (${stat.bytes}/${input.expectedBytes}).`;
      const failed = this.fail(item, now, "integrity", reason);
      return Object.freeze({ state: "unusable", item: failed, reason });
    }
    const checksum = (await this.options.filePort.sha256(item.localUri)).toLowerCase();
    if (!this.isCurrentOperation(input.assetId, operationId)) return Object.freeze({ state: "unusable", item, reason: "A newer offline operation replaced this checksum verification." });
    if (checksum !== input.checksumSha256.toLowerCase()) {
      const reason = "The offline file checksum does not match the current verified manifest.";
      const failed = this.fail(item, now, "integrity", reason);
      return Object.freeze({ state: "unusable", item: failed, reason });
    }
    const validMedia = await this.options.filePort.validateMedia(item.localUri, input.mediaType, input.fileExtension);
    if (!this.isCurrentOperation(input.assetId, operationId)) return Object.freeze({ state: "unusable", item, reason: "A newer offline operation replaced this media verification." });
    if (!validMedia) {
      const reason = "The offline file is not readable supported media.";
      const failed = this.fail(item, now, "media", reason);
      return Object.freeze({ state: "unusable", item: failed, reason });
    }
    const normalizedUri = await this.options.filePort.normalizePlaybackUri(item.localUri, input.assetId, input.remoteUri);
    if (!this.isCurrentOperation(input.assetId, operationId)) return Object.freeze({ state: "unusable", item, reason: "A newer offline operation replaced this source migration." });
    const verified = Object.freeze({ ...item, localUri: normalizedUri, stage: "available_offline" as const, updatedAt: now, lastAccessedAt: now, lastError: null, lastErrorCode: null, lastErrorCustomerCopy: null, lastErrorTechnicalReason: null });
    this.items.set(input.assetId, verified);
    return Object.freeze({ state: "local", uri: normalizedUri, item: verified });
  }
  private isCurrentOperation(assetId: string, operationId: number): boolean {
    const current = this.items.get(assetId);
    return current?.operationId === operationId && current.state === "available";
  }
  async delete(assetId: string, now: string, activeAssetIds: ReadonlySet<string>): Promise<OfflineManifestItemV1 | null> {
    const item = this.items.get(assetId);
    if (!item) return null;
    if (activeAssetIds.has(assetId)) {
      const technicalReason = "Actively playing media cannot be deleted or evicted.";
      return Object.freeze({
        ...item,
        lastError: technicalReason,
        lastErrorCode: "filesystem" as const,
        lastErrorCustomerCopy: "This layer is playing. Stop playback before deleting the download.",
        lastErrorTechnicalReason: technicalReason,
      });
    }
    const deleting = transitionOfflineManifestItem(item, { type: "delete-started", operationId: item.operationId, now });
    this.items.set(assetId, deleting);
    if (item.localUri) await this.options.filePort.remove(item.localUri).catch(() => undefined);
    this.items.delete(assetId);
    return null;
  }
  async deleteAll(now: string, activeAssetIds: ReadonlySet<string>): Promise<readonly string[]> {
    const retained: string[] = [];
    for (const item of this.enumerate()) {
      if (activeAssetIds.has(item.assetId)) { retained.push(item.assetId); continue; }
      await this.delete(item.assetId, now, activeAssetIds);
    }
    return Object.freeze(retained);
  }
  reconcileCatalog(input: Pick<OfflineDownloadInputV1, "assetId" | "rights" | "lifecycleState" | "now" | "catalogRevision" | "sourceRevision">): OfflineManifestItemV1 | null {
    const existing = this.items.get(input.assetId);
    if (!existing) return null;
    const item = recoverOfflineManifestItem(existing, input.now);
    const eligibility = decideOfflineEligibility(input.rights, input.lifecycleState);
    const state = eligibility.state === "revoked" ? "revoked" : eligibility.eligible ? item.state : "ineligible";
    const reconciled = Object.freeze({ ...item, catalogRevision: input.catalogRevision, sourceRevision: input.sourceRevision, eligibility, state, updatedAt: input.now, lastError: eligibility.eligible ? item.lastError : eligibility.reason, lastErrorTechnicalReason: eligibility.eligible ? item.lastErrorTechnicalReason : eligibility.reason }) as OfflineManifestItemV1;
    this.items.set(input.assetId, reconciled);
    return reconciled;
  }
}
