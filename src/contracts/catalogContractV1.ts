import { mobileCatalogSounds, type MobileCatalogSound } from "../mobileSoundContract";
import { librarySoundMetadataV1, type LibrarySoundMetadataV1 } from "../librarySoundMetadata";

export type { MobileCatalogSound } from "../mobileSoundContract";

export const CATALOG_CONTRACT_VERSION = "1" as const;
export type CatalogRevision = `mobile-catalog-v1:${number}:${number}`;

export type CatalogSound = Readonly<{
  id: string;
  metadata: LibrarySoundMetadataV1;
  playback: MobileCatalogSound | null;
  eligibility: Readonly<{
    activeMetadata: boolean;
    mobilePlayable: boolean;
    defaultSafe: boolean;
    userChoiceOnly: boolean;
    heldOrBlocked: boolean;
  }>;
}>;

export type CatalogProtectedCounts = Readonly<{
  defaultSafe: number;
  userChoice: number;
  activeMetadata: number;
  mobilePlayback: number;
}>;

export interface CatalogRepository {
  readonly contractVersion: typeof CATALOG_CONTRACT_VERSION;
  readonly revision: CatalogRevision;
  getById(id: string): CatalogSound | null;
  enumerate(): readonly CatalogSound[];
  getMetadata(): readonly LibrarySoundMetadataV1[];
  getPlaybackRows(): readonly MobileCatalogSound[];
  getDefaultSafe(): readonly CatalogSound[];
  getUserChoice(): readonly CatalogSound[];
  getMobilePlayable(): readonly CatalogSound[];
  getProtectedCounts(): CatalogProtectedCounts;
}

class InMemoryCatalogRepository implements CatalogRepository {
  readonly contractVersion = CATALOG_CONTRACT_VERSION;
  readonly revision: CatalogRevision;
  private readonly sounds: readonly CatalogSound[];
  private readonly byId: ReadonlyMap<string, CatalogSound>;

  constructor(
    private readonly metadataRows: readonly LibrarySoundMetadataV1[],
    private readonly playbackRows: readonly MobileCatalogSound[],
  ) {
    const playbackById = new Map(playbackRows.map((sound) => [sound.id, sound]));
    this.sounds = Object.freeze(metadataRows.map((metadata) => {
      const playback = playbackById.get(metadata.id) ?? null;
      const heldOrBlocked = metadata.licenseSourceConfidence === "blocked"
        || metadata.appSafeUrlStatus === "blocked"
        || metadata.mobileQcStatus === "failed_mobile_qc";
      return Object.freeze({
        id: metadata.id,
        metadata,
        playback,
        eligibility: Object.freeze({
          activeMetadata: true,
          mobilePlayable: playback?.playable === true,
          defaultSafe: !metadata.userChoiceOnly,
          userChoiceOnly: metadata.userChoiceOnly,
          heldOrBlocked,
        }),
      });
    }));
    this.byId = new Map(this.sounds.map((sound) => [sound.id, sound]));
    this.revision = `mobile-catalog-v1:${metadataRows.length}:${playbackRows.length}`;
  }

  getById(id: string): CatalogSound | null { return this.byId.get(id) ?? null; }
  enumerate(): readonly CatalogSound[] { return this.sounds; }
  getMetadata(): readonly LibrarySoundMetadataV1[] { return this.metadataRows; }
  getPlaybackRows(): readonly MobileCatalogSound[] { return this.playbackRows; }
  getDefaultSafe(): readonly CatalogSound[] { return this.sounds.filter((sound) => sound.eligibility.defaultSafe); }
  getUserChoice(): readonly CatalogSound[] { return this.sounds.filter((sound) => sound.eligibility.userChoiceOnly); }
  getMobilePlayable(): readonly CatalogSound[] { return this.sounds.filter((sound) => sound.eligibility.mobilePlayable); }
  getProtectedCounts(): CatalogProtectedCounts {
    return Object.freeze({
      defaultSafe: this.getDefaultSafe().length,
      userChoice: this.getUserChoice().length,
      activeMetadata: this.metadataRows.length,
      mobilePlayback: this.playbackRows.filter((sound) => sound.playable).length,
    });
  }
}

export const catalogRepository: CatalogRepository = new InMemoryCatalogRepository(
  librarySoundMetadataV1,
  mobileCatalogSounds,
);
export const mobileCatalogSoundsV1: MobileCatalogSound[] = [...catalogRepository.getPlaybackRows()];
export const defaultMobileCatalogSoundV1 = mobileCatalogSoundsV1[0];
export const mobileCatalogLanesV1 = Array.from(new Set(mobileCatalogSoundsV1.map((sound) => sound.lane)));
