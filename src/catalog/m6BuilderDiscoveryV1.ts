import {
  m6DefaultSafeProductCatalogSoundsV1,
  m6ProductCatalogSoundsV1,
  type M6ProductCatalogSound,
} from "./m6ProductCatalogV1";

export const M6_LAYERED_OFFLINE_DISCOVERY_VERSION = "1" as const;
export type M6LayeredBuilderRoleV1 = "texture" | "accent" | "foreground";
export type M6LayeredProductSurfaceV1 =
  | "Browse"
  | "Saved Sessions"
  | "Offline & storage"
  | "Builder role discovery"
  | "Explicit Choice Builder";

export type M6LayeredOfflineInventoryRowV1 = Readonly<{
  catalogId: string;
  title: string;
  role: M6LayeredBuilderRoleV1;
  defaultSafe: boolean;
  choiceOnly: boolean;
  persistentDownloadEligible: boolean;
  productSurfaces: readonly M6LayeredProductSurfaceV1[];
}>;

export const m6LayeredOfflineInventoryV1: readonly M6LayeredOfflineInventoryRowV1[] = Object.freeze(
  m6ProductCatalogSoundsV1
    .map((sound) => Object.freeze({
      catalogId: sound.id,
      title: sound.title,
      role: sound.builderRole,
      defaultSafe: !sound.manualOnly,
      choiceOnly: sound.manualOnly,
      persistentDownloadEligible: sound.persistentDownloadRights.eligible,
      productSurfaces: Object.freeze([
        "Browse",
        "Saved Sessions",
        "Offline & storage",
        sound.manualOnly ? "Explicit Choice Builder" : "Builder role discovery",
      ] as const),
    }))
    .sort((left, right) => left.role.localeCompare(right.role) || left.title.localeCompare(right.title)),
);

const preferredDefaultSafeByRole: Readonly<Record<"texture" | "accent", readonly string[]>> = Object.freeze({
  texture: Object.freeze([
    "m6-nonvoice-bb9-032-paper-handling",
    "m6-nonvoice-bb9-033-pencil-and-marker-writing",
    "m6-nonvoice-bb9-026-book-handling",
  ]),
  accent: Object.freeze([
    "m6-nonvoice-bb10-009-finger-tapping-on-table",
  ]),
});

const byPreferredOrder = (role: "texture" | "accent") => (left: M6ProductCatalogSound, right: M6ProductCatalogSound): number => {
  const preferred = preferredDefaultSafeByRole[role];
  const leftIndex = preferred.indexOf(left.id);
  const rightIndex = preferred.indexOf(right.id);
  if (leftIndex >= 0 || rightIndex >= 0) {
    if (leftIndex < 0) return 1;
    if (rightIndex < 0) return -1;
    return leftIndex - rightIndex;
  }
  return left.title.localeCompare(right.title);
};

export function getDefaultSafeM6BuilderDiscoveryCandidatesV1(
  role: "bed" | M6LayeredBuilderRoleV1,
): readonly M6ProductCatalogSound[] {
  if (role === "bed" || role === "foreground") return Object.freeze([]);
  return Object.freeze(
    m6DefaultSafeProductCatalogSoundsV1
      .filter((sound) => sound.builderRole === role)
      .filter((sound) => !sound.manualOnly && !sound.userChoiceOnly && !sound.neverAutoplay && !sound.containsVoice)
      .sort(byPreferredOrder(role)),
  );
}

export function getExplicitChoiceM6BuilderCandidatesV1(
  role: M6LayeredBuilderRoleV1,
): readonly M6ProductCatalogSound[] {
  return Object.freeze(
    m6ProductCatalogSoundsV1
      .filter((sound) => sound.builderRole === role)
      .filter((sound) => sound.manualOnly && sound.userChoiceOnly && sound.neverAutoplay)
      .sort((left, right) => left.title.localeCompare(right.title)),
  );
}

export const ALPHA_0_13_4_DEFAULT_SAFE_TWO_LAYER_FIXTURE_V1 = Object.freeze({
  presetId: "soft-air-cotton-texture",
  presetTitle: "Soft Air with Fabric Texture",
  exactControls: Object.freeze(["Presets/Builder", "Soft Air with Fabric Texture", "Try another texture"]),
  layers: Object.freeze([
    Object.freeze({ role: "bed" as const, catalogId: "rbb-007-generated-soft-airflow-bed-a", title: "Soft Airflow A" }),
    Object.freeze({ role: "texture" as const, catalogId: "m6-nonvoice-bb9-032-paper-handling", title: "Paper handling" }),
  ]),
});

export const ALPHA_0_13_4_PARTIAL_OFFLINE_FIXTURE_V1 = Object.freeze({
  presetId: "rain-soft-writing",
  presetTitle: "Rain with Soft Writing",
  exactControls: Object.freeze(["Presets/Builder", "Rain with Soft Writing", "Try another texture", "Try another accent"]),
  layers: Object.freeze([
    Object.freeze({ role: "bed" as const, catalogId: "freesound-slow-rain-loop", title: "Slow Rain" }),
    Object.freeze({ role: "texture" as const, catalogId: "m6-nonvoice-bb9-032-paper-handling", title: "Paper handling" }),
    Object.freeze({ role: "accent" as const, catalogId: "m6-nonvoice-bb10-009-finger-tapping-on-table", title: "Finger tapping on table" }),
  ]),
  eligibleLayerCatalogIds: Object.freeze([
    "m6-nonvoice-bb9-032-paper-handling",
    "m6-nonvoice-bb10-009-finger-tapping-on-table",
  ]),
});
