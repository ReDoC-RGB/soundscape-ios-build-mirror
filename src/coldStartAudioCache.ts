import { Directory, File, Paths } from "expo-file-system";

import type { MobileCatalogSound } from "./mobileSoundContract";

type ColdStartStarterProfile = {
  fileName: string;
  expectedBytes: number;
};

export type ColdStartCacheEvent =
  | "cache hit"
  | "download start"
  | "download joined"
  | "download resolved"
  | "download failed";

export const coldStartStarterSoundProfiles: Record<string, ColdStartStarterProfile> = {
  "freesound-soft-rain-loop": {
    fileName: "freesound-soft-rain-loop.mp3",
    expectedBytes: 451441,
  },
  "rbb-013-brown-noise-deep-low-bed": {
    fileName: "rbb-013-brown-noise-deep-low-bed.mp3",
    expectedBytes: 601005,
  },
  "rbb-022-small-stove-extractor-fan": {
    fileName: "rbb-022-small-stove-extractor-fan.mp3",
    expectedBytes: 413302,
  },
  "bb10-013-pencil-writing-two": {
    fileName: "bb10-013-pencil-writing-two.mp3",
    expectedBytes: 260397,
  },
};

const coldStartCacheDirectory = new Directory(Paths.cache, "soundscape-cold-start-v1");
const preparedUrisBySoundId = new Map<string, string>();
const preparationPromisesBySoundId = new Map<string, Promise<string>>();
let cacheCleanupPromise: Promise<void> | null = null;

const getCachedFile = (soundId: string) => {
  const profile = coldStartStarterSoundProfiles[soundId];
  return profile ? new File(coldStartCacheDirectory, profile.fileName) : null;
};

const cachedFileIsComplete = (file: File, expectedBytes: number) =>
  file.exists && file.size === expectedBytes;

const ensureColdStartCacheDirectory = () => {
  coldStartCacheDirectory.create({ intermediates: true, idempotent: true });
};

const cleanupColdStartCache = async () => {
  ensureColdStartCacheDirectory();
  const allowedFileNames = new Set(
    Object.values(coldStartStarterSoundProfiles).map((profile) => profile.fileName),
  );

  for (const entry of coldStartCacheDirectory.list()) {
    if (entry instanceof File && !allowedFileNames.has(entry.name)) {
      entry.delete();
    }
  }
};

const ensureBoundedCacheCleanup = () => {
  if (!cacheCleanupPromise) {
    cacheCleanupPromise = cleanupColdStartCache().catch(() => undefined);
  }
  return cacheCleanupPromise;
};

export const isColdStartStarterSound = (soundId: string) =>
  soundId in coldStartStarterSoundProfiles;

export const getPreparedColdStartUri = (soundId: string) => {
  const preparedUri = preparedUrisBySoundId.get(soundId);
  if (preparedUri) return preparedUri;

  const profile = coldStartStarterSoundProfiles[soundId];
  const cachedFile = getCachedFile(soundId);
  if (profile && cachedFile && cachedFileIsComplete(cachedFile, profile.expectedBytes)) {
    preparedUrisBySoundId.set(soundId, cachedFile.uri);
    return cachedFile.uri;
  }

  return null;
};

export function prepareColdStartSound(
  sound: MobileCatalogSound,
  onEvent?: (event: ColdStartCacheEvent) => void,
): Promise<string> {
  const profile = coldStartStarterSoundProfiles[sound.id];
  if (!profile) {
    return Promise.resolve(sound.audioUrl);
  }

  const preparedUri = getPreparedColdStartUri(sound.id);
  if (preparedUri) {
    onEvent?.("cache hit");
    return Promise.resolve(preparedUri);
  }

  const existingPreparation = preparationPromisesBySoundId.get(sound.id);
  if (existingPreparation) {
    onEvent?.("download joined");
    return existingPreparation;
  }

  const preparation = (async () => {
    try {
      await ensureBoundedCacheCleanup();
      ensureColdStartCacheDirectory();
      const cachedFile = new File(coldStartCacheDirectory, profile.fileName);
      if (cachedFileIsComplete(cachedFile, profile.expectedBytes)) {
        preparedUrisBySoundId.set(sound.id, cachedFile.uri);
        onEvent?.("cache hit");
        return cachedFile.uri;
      }
      if (cachedFile.exists) {
        cachedFile.delete();
      }

      onEvent?.("download start");
      await File.downloadFileAsync(sound.audioUrl, cachedFile, {
        idempotent: true,
      });
      if (!cachedFileIsComplete(cachedFile, profile.expectedBytes)) {
        if (cachedFile.exists) cachedFile.delete();
        throw new Error(`Cold-start cache size mismatch for ${sound.title}`);
      }

      preparedUrisBySoundId.set(sound.id, cachedFile.uri);
      onEvent?.("download resolved");
      return cachedFile.uri;
    } catch (error) {
      onEvent?.("download failed");
      throw error;
    } finally {
      preparationPromisesBySoundId.delete(sound.id);
    }
  })();

  preparationPromisesBySoundId.set(sound.id, preparation);
  return preparation;
}
