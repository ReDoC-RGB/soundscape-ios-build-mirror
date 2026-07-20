export type SoundscapeDomain = "catalog" | "recommendation" | "preference" | "playback" | "persistence";
export type DomainErrorCode =
  | "CATALOG_SOUND_NOT_FOUND" | "RECOMMENDATION_UNAVAILABLE" | "PREFERENCE_READ_FAILED"
  | "PREFERENCE_WRITE_FAILED" | "PLAYBACK_LOAD_FAILED" | "PLAYBACK_COMMAND_REJECTED"
  | "STALE_PLAYBACK_OWNERSHIP" | "UNIFIED_SEEK_UNAVAILABLE" | "STORAGE_READ_FAILED" | "STORAGE_WRITE_FAILED";

export class SoundscapeDomainError extends Error {
  constructor(
    readonly domain: SoundscapeDomain,
    readonly code: DomainErrorCode,
    readonly safeMessage: string,
    options?: { cause?: unknown },
  ) {
    super(safeMessage, options);
    this.name = "SoundscapeDomainError";
  }
}

export const toSafeConsumerMessage = (error: unknown, fallback = "Something went wrong. Please try again.") =>
  error instanceof SoundscapeDomainError ? error.safeMessage : fallback;
