import {
  librarySoundMetadataV1,
  type LibrarySoundMetadataV1,
} from "./librarySoundMetadata";
import type { MobileCatalogSound } from "./mobileSoundContract";

export type BrowseFilterGroupKey = "category" | "intensity" | "texture" | "availability";
export type BrowseFilterKey =
  | "rain-water"
  | "fan-air-noise"
  | "room-environment"
  | "paper-writing-typing"
  | "fabric-soft-texture"
  | "tapping-object-foley"
  | "brushing-scratching"
  | "crinkle-packaging"
  | "nature-forest"
  | "choice-tones-bowls"
  | "choice-mouth-eating"
  | "voice-whisper-soft-spoken"
  | "soft"
  | "balanced"
  | "rich-strong"
  | "smooth"
  | "crisp"
  | "rhythmic"
  | "deep-low"
  | "bright-light"
  | "default-safe"
  | "choice-only";

export type BrowseFilterState = Record<BrowseFilterGroupKey, BrowseFilterKey[]>;
export type LibrarySortMode = "recent" | "az" | "category";

export type BrowseFilterOption = {
  key: BrowseFilterKey;
  label: string;
  choiceOptIn?: boolean;
};

export type BrowseFilterGroup = {
  key: BrowseFilterGroupKey;
  label: string;
  options: BrowseFilterOption[];
};

export type DiscoveryCollectionId =
  | "sleep-ready"
  | "focus-friendly"
  | "rainy-room"
  | "soft-textures"
  | "deep-noise"
  | "paper-writing"
  | "traditional-asmr-tactile"
  | "quiet-nature"
  | "choice-tones"
  | "choice-mouth-eating"
  | "choice-voice";

export type DiscoveryCollection = {
  id: DiscoveryCollectionId;
  label: string;
  description: string;
  choiceOptIn?: boolean;
};

export const defaultBrowseFilterState: BrowseFilterState = {
  category: [],
  intensity: [],
  texture: [],
  availability: ["default-safe"],
};

export const browseFilterGroups: BrowseFilterGroup[] = [
  {
    key: "category",
    label: "Category",
    options: [
      { key: "rain-water", label: "Rain & Water" },
      { key: "fan-air-noise", label: "Fan / Air / Noise" },
      { key: "room-environment", label: "Room / Environmental Ambience" },
      { key: "paper-writing-typing", label: "Paper / Writing / Typing" },
      { key: "fabric-soft-texture", label: "Fabric / Soft Texture" },
      { key: "tapping-object-foley", label: "Tapping / Object Foley" },
      { key: "brushing-scratching", label: "Brushing / Scratching" },
      { key: "crinkle-packaging", label: "Crinkle / Packaging" },
      { key: "nature-forest", label: "Nature / Forest" },
      { key: "choice-tones-bowls", label: "Tones & bowls (opt-in)", choiceOptIn: true },
      { key: "choice-mouth-eating", label: "Mouth / Eating Sounds (Choice)", choiceOptIn: true },
      { key: "voice-whisper-soft-spoken", label: "Voice / Whisper / Soft-Spoken (Choice)", choiceOptIn: true },
    ],
  },
  {
    key: "intensity",
    label: "Intensity",
    options: [
      { key: "soft", label: "Soft" },
      { key: "balanced", label: "Balanced" },
      { key: "rich-strong", label: "Rich / Strong" },
    ],
  },
  {
    key: "texture",
    label: "Texture / character",
    options: [
      { key: "smooth", label: "Smooth" },
      { key: "crisp", label: "Crisp" },
      { key: "rhythmic", label: "Rhythmic" },
      { key: "deep-low", label: "Deep / Low" },
      { key: "bright-light", label: "Bright / Light" },
    ],
  },
  {
    key: "availability",
    label: "Sound access",
    options: [
      { key: "default-safe", label: "Standard sounds" },
      { key: "choice-only", label: "Choice sounds", choiceOptIn: true },
    ],
  },
];

export const discoveryCollections: DiscoveryCollection[] = [
  { id: "sleep-ready", label: "Soft & steady", description: "Soft textures with even, steady sound." },
  { id: "focus-friendly", label: "Steady backgrounds", description: "Consistent background layers with minimal variation." },
  { id: "rainy-room", label: "Rainy room", description: "Rain-at-window and room-like ambience." },
  { id: "soft-textures", label: "Soft textures", description: "Soft tactile and texture metadata." },
  { id: "deep-noise", label: "Deep noise", description: "Low, deep noise-color metadata." },
  { id: "paper-writing", label: "Paper & writing", description: "Pages, pencils, writing, and typing." },
  { id: "traditional-asmr-tactile", label: "Traditional ASMR textures", description: "Tapping, paper, fabric, brushing, scratching, and object sounds." },
  { id: "quiet-nature", label: "Quiet nature", description: "Softer forest and outdoor ambience." },
  {
    id: "choice-tones",
    label: "Tones & bowls",
    description: "Explicit opt-in tones and bowls. No autoplay.",
    choiceOptIn: true,
  },
  {
    id: "choice-mouth-eating",
    label: "Mouth / Eating Sounds",
    description: "Explicit Choice mouth and eating sounds. No autoplay.",
    choiceOptIn: true,
  },
  {
    id: "choice-voice",
    label: "Voice / Whisper / Soft-Spoken",
    description: "Explicit Choice voice recordings. Synthetic voices are labeled. No autoplay.",
    choiceOptIn: true,
  },
];

export const librarySortOptions: { key: LibrarySortMode; label: string }[] = [
  { key: "recent", label: "Recently saved / recently used" },
  { key: "az", label: "A–Z" },
  { key: "category", label: "Category" },
];

export const libraryDiscoveryMetadataById = new Map<string, LibrarySoundMetadataV1>(
  librarySoundMetadataV1.map((metadata) => [metadata.id, metadata]),
);

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const buildMetadataText = (sound: MobileCatalogSound, metadata: LibrarySoundMetadataV1 | undefined) =>
  normalize([
    sound.title,
    sound.subtitle,
    sound.lane,
    sound.category,
    ...sound.tags,
    metadata?.primaryLane ?? "",
    metadata?.subcategory ?? "",
    metadata?.role ?? "",
    metadata?.builderRole ?? "",
    ...(metadata?.sensoryQualities ?? []),
    ...(metadata?.recipeCompatibilityTags ?? []),
  ].join(" "));

const includesAny = (text: string, terms: string[]) => terms.some((term) => text.includes(normalize(term)));
const choiceCategoryKeys = new Set<BrowseFilterKey>([
  "choice-tones-bowls",
  "choice-mouth-eating",
  "voice-whisper-soft-spoken",
]);
const choiceCollectionIds = new Set<DiscoveryCollectionId>([
  "choice-tones",
  "choice-mouth-eating",
  "choice-voice",
]);

export function browseFilterOptionMatches(
  sound: MobileCatalogSound,
  optionKey: BrowseFilterKey,
  metadata = libraryDiscoveryMetadataById.get(sound.id),
): boolean {
  const lane = normalize(metadata?.primaryLane ?? sound.lane);
  const metadataText = buildMetadataText(sound, metadata);

  switch (optionKey) {
    case "rain-water":
      return lane.includes("rain") || lane.includes("water");
    case "fan-air-noise":
      return lane.includes("fan air room") || lane.includes("noise color");
    case "room-environment":
      return lane.includes("fan air room") && includesAny(metadataText, ["room", "interior", "hum", "appliance", "environment"]);
    case "paper-writing-typing":
      return lane.includes("paper") || lane.includes("writing typing");
    case "fabric-soft-texture":
      return lane.includes("fabric soft texture");
    case "tapping-object-foley":
      return lane.includes("tapping object foley") || lane.includes("tapping object handling");
    case "brushing-scratching":
      return lane.includes("brushing scratching") || includesAny(metadataText, ["brush", "brushing", "scratch", "scratching"]);
    case "crinkle-packaging":
      return lane.includes("crinkle packaging") || includesAny(metadataText, ["crinkle", "plastic", "packaging"]);
    case "nature-forest":
      return lane.includes("forest nature wind");
    case "choice-tones-bowls":
      return sound.userChoiceOnly && (lane.includes("tones resonance") || lane.includes("resonant objects tones"));
    case "choice-mouth-eating":
      return sound.userChoiceOnly && (lane.includes("mouth eating sounds") || includesAny(metadataText, ["mouth sounds", "mouth pops", "eating", "chewing", "snack"]));
    case "voice-whisper-soft-spoken":
      return sound.userChoiceOnly && sound.containsVoice && lane.includes("voice whisper soft spoken");
    case "soft":
      return metadata?.intensity === "soft";
    case "balanced":
      return metadata?.intensity === "medium";
    case "rich-strong":
      return metadata?.intensity === "strong";
    case "smooth":
      return includesAny(metadataText, ["smooth", "steady", "gentle", "soft", "flowing"]);
    case "crisp":
      return includesAny(metadataText, ["crisp", "dry", "scratch", "paper", "page", "typing", "tap"]);
    case "rhythmic":
      return includesAny(metadataText, ["rhythmic", "repeated", "sequence", "typing", "tapping"]);
    case "deep-low":
      return includesAny(metadataText, ["deep", "low", "brown noise", "room hum", "rumble"]);
    case "bright-light":
      return includesAny(metadataText, ["bright", "light", "airy", "chime", "bell", "white noise"]);
    case "default-safe":
      return !sound.userChoiceOnly;
    case "choice-only":
      return sound.userChoiceOnly;
    default:
      return false;
  }
}

export function soundMatchesBrowseFilters(sound: MobileCatalogSound, filters: BrowseFilterState): boolean {
  return browseFilterGroups.every((group) => {
    const selectedOptions = filters[group.key];
    return selectedOptions.length === 0 || selectedOptions.some((optionKey) => browseFilterOptionMatches(sound, optionKey));
  });
}

export type BrowseFilterOptionCounts = Record<
  BrowseFilterGroupKey,
  Partial<Record<BrowseFilterKey, number>>
>;

export function getBrowseFilterOptionCounts(
  sounds: MobileCatalogSound[],
  filters: BrowseFilterState,
  collectionId: DiscoveryCollectionId | null,
  matchesSearch: (sound: MobileCatalogSound) => boolean = () => true,
  searchExplicitlyAllowsChoice = false,
): BrowseFilterOptionCounts {
  const counts: BrowseFilterOptionCounts = {
    category: {},
    intensity: {},
    texture: {},
    availability: {},
  };

  for (const group of browseFilterGroups) {
    for (const option of group.options) {
      const candidateFilters: BrowseFilterState = {
        category: [...filters.category],
        intensity: [...filters.intensity],
        texture: [...filters.texture],
        availability: [...filters.availability],
        [group.key]: [option.key],
      };

      if (group.key === "availability") {
        candidateFilters.availability = [option.key];
        if (option.key === "default-safe") {
          candidateFilters.category = candidateFilters.category.filter(
            (categoryKey) => !choiceCategoryKeys.has(categoryKey),
          );
        }
      } else if (group.key === "category" && choiceCategoryKeys.has(option.key)) {
        candidateFilters.availability = ["choice-only"];
      }

      const candidateAllowsChoice =
        searchExplicitlyAllowsChoice ||
        (collectionId !== null && choiceCollectionIds.has(collectionId)) ||
        candidateFilters.availability.includes("choice-only") ||
        candidateFilters.category.some((categoryKey) => choiceCategoryKeys.has(categoryKey));
      const effectiveCandidateFilters =
        searchExplicitlyAllowsChoice && candidateFilters.availability.includes("default-safe")
          ? { ...candidateFilters, availability: [] }
          : candidateFilters;

      counts[group.key][option.key] = sounds.filter(
        (sound) =>
          (!sound.userChoiceOnly || candidateAllowsChoice) &&
          matchesSearch(sound) &&
          soundMatchesBrowseFilters(sound, effectiveCandidateFilters) &&
          soundMatchesDiscoveryCollection(sound, collectionId),
      ).length;
    }
  }

  return counts;
}

export function soundMatchesDiscoveryCollection(
  sound: MobileCatalogSound,
  collectionId: DiscoveryCollectionId | null,
): boolean {
  if (!collectionId) return true;
  const metadata = libraryDiscoveryMetadataById.get(sound.id);
  const lane = normalize(metadata?.primaryLane ?? sound.lane);
  const metadataText = buildMetadataText(sound, metadata);
  const recipeTags = new Set(metadata?.recipeCompatibilityTags ?? []);

  switch (collectionId) {
    case "sleep-ready":
      return recipeTags.has("sleep_safe") && metadata?.intensity !== "strong" && !sound.userChoiceOnly;
    case "focus-friendly":
      return recipeTags.has("focus_safe") && !sound.userChoiceOnly;
    case "rainy-room":
      return lane.includes("rain") && includesAny(metadataText, ["window", "room", "steady rain", "soft rain"]);
    case "soft-textures":
      return metadata?.intensity === "soft" && (metadata.builderRole === "texture" || includesAny(metadataText, ["texture", "fabric", "paper", "writing"]));
    case "deep-noise":
      return lane.includes("noise color") && includesAny(metadataText, ["deep", "low", "brown", "warm"]);
    case "paper-writing":
      return lane.includes("paper") || lane.includes("writing typing");
    case "traditional-asmr-tactile":
      return !sound.userChoiceOnly && includesAny(metadataText, ["traditional asmr", "tapping", "paper", "fabric", "brushing", "scratching", "object"]);
    case "quiet-nature":
      return lane.includes("forest nature wind") && metadata?.intensity === "soft";
    case "choice-tones":
      return sound.userChoiceOnly && (lane.includes("tones resonance") || lane.includes("resonant objects tones"));
    case "choice-mouth-eating":
      return sound.userChoiceOnly && (lane.includes("mouth eating sounds") || includesAny(metadataText, ["mouth sounds", "mouth pops", "eating", "chewing", "snack"]));
    case "choice-voice":
      return sound.userChoiceOnly && sound.containsVoice && lane.includes("voice whisper soft spoken");
    default:
      return true;
  }
}

export function getDiscoveryTags(sound: MobileCatalogSound): string[] {
  const metadata = libraryDiscoveryMetadataById.get(sound.id);
  const tags: string[] = [];
  if (metadata?.intensity === "soft") tags.push("Soft");
  if (metadata?.intensity === "medium") tags.push("Balanced");
  if (metadata?.intensity === "strong") tags.push("Rich / Strong");
  for (const optionKey of ["smooth", "crisp", "rhythmic", "deep-low", "bright-light"] as BrowseFilterKey[]) {
    if (browseFilterOptionMatches(sound, optionKey, metadata)) {
      const label = browseFilterGroups
        .find((group) => group.key === "texture")
        ?.options.find((option) => option.key === optionKey)?.label;
      if (label && !tags.includes(label)) tags.push(label);
    }
  }
  return tags.slice(0, 4);
}

export function formatDiscoveryMeta(sound: MobileCatalogSound): string {
  const availability = sound.userChoiceOnly ? "Choice" : "Default-safe";
  const duration = formatDiscoveryDuration(sound.durationSeconds);
  return `${sound.lane} · ${availability} · ${duration}`;
}

export function formatDiscoveryDuration(durationSeconds: number): string {
  const roundedSeconds = Math.max(0, Math.round(durationSeconds));
  const minutes = Math.floor(roundedSeconds / 60);
  const seconds = roundedSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export type ActiveBrowseFilterChip = {
  key: string;
  label: string;
  removeAccessibilityLabel: string;
  groupKey?: BrowseFilterGroupKey;
  optionKey?: BrowseFilterKey;
};

export type BrowseDiscoveryState = {
  filters: BrowseFilterState;
  collectionId: DiscoveryCollectionId | null;
};

const withoutChoiceCategories = (filters: BrowseFilterState): BrowseFilterKey[] =>
  filters.category.filter((categoryKey) => !choiceCategoryKeys.has(categoryKey));

export function selectBrowseCollectionState(
  filters: BrowseFilterState,
  currentCollectionId: DiscoveryCollectionId | null,
  collectionId: DiscoveryCollectionId,
): BrowseDiscoveryState {
  const collectionIsActive = currentCollectionId === collectionId;
  const nextCollectionId = collectionIsActive ? null : collectionId;
  if (choiceCollectionIds.has(collectionId)) {
    return {
      collectionId: nextCollectionId,
      filters: {
        ...filters,
        category: withoutChoiceCategories(filters),
        availability: collectionIsActive ? ["default-safe"] : ["choice-only"],
      },
    };
  }
  if (currentCollectionId && choiceCollectionIds.has(currentCollectionId)) {
    return {
      collectionId: nextCollectionId,
      filters: {
        ...filters,
        category: withoutChoiceCategories(filters),
        availability: ["default-safe"],
      },
    };
  }
  return { collectionId: nextCollectionId, filters };
}

export function toggleBrowseFilterState(
  filters: BrowseFilterState,
  collectionId: DiscoveryCollectionId | null,
  groupKey: BrowseFilterGroupKey,
  optionKey: BrowseFilterKey,
): BrowseDiscoveryState {
  if (groupKey === "availability") {
    return {
      collectionId: optionKey === "default-safe" && collectionId && choiceCollectionIds.has(collectionId) ? null : collectionId,
      filters: {
        ...filters,
        category: optionKey === "default-safe" ? withoutChoiceCategories(filters) : filters.category,
        availability: [optionKey],
      },
    };
  }

  const optionIsActive = filters[groupKey].includes(optionKey);
  const nextGroupValues = optionIsActive
    ? filters[groupKey].filter((currentOptionKey) => currentOptionKey !== optionKey)
    : [...filters[groupKey], optionKey];
  const choiceCategoryChanged = groupKey === "category" && choiceCategoryKeys.has(optionKey);
  return {
    collectionId: choiceCategoryChanged && collectionId && choiceCollectionIds.has(collectionId) ? null : collectionId,
    filters: {
      ...filters,
      [groupKey]: nextGroupValues,
      availability: choiceCategoryChanged
        ? optionIsActive
          ? ["default-safe"]
          : ["choice-only"]
        : filters.availability,
    },
  };
}

export function clearBrowseFilterState(
  filters: BrowseFilterState,
  collectionId: DiscoveryCollectionId | null,
  chip: ActiveBrowseFilterChip | undefined,
): BrowseDiscoveryState {
  if (!chip?.groupKey || !chip.optionKey) {
    return {
      collectionId: null,
      filters: collectionId === "choice-tones"
        ? { ...filters, category: withoutChoiceCategories(filters), availability: ["default-safe"] }
        : filters,
    };
  }

  const clearingChoiceCategory = chip.groupKey === "category" && choiceCategoryKeys.has(chip.optionKey);
  const clearingChoiceAccess = chip.groupKey === "availability";
  if (clearingChoiceCategory || clearingChoiceAccess) {
    return {
      collectionId: collectionId && choiceCollectionIds.has(collectionId) ? null : collectionId,
      filters: {
        ...filters,
        category: withoutChoiceCategories(filters),
        availability: ["default-safe"],
      },
    };
  }

  return {
    collectionId,
    filters: {
      ...filters,
      [chip.groupKey]: filters[chip.groupKey].filter((currentOptionKey) => currentOptionKey !== chip.optionKey),
    },
  };
}

export function getActiveBrowseFilterLabels(
  filters: BrowseFilterState,
  collectionId: DiscoveryCollectionId | null,
): ActiveBrowseFilterChip[] {
  const labels: ActiveBrowseFilterChip[] = browseFilterGroups.flatMap((group) =>
    filters[group.key]
      .filter((optionKey) => !(group.key === "availability" && optionKey === "default-safe"))
      .filter((optionKey) => !(collectionId === "choice-tones" && group.key === "availability" && optionKey === "choice-only"))
      .map((optionKey) => ({
        key: `${group.key}:${optionKey}`,
        label: group.options.find((option) => option.key === optionKey)?.label ?? optionKey,
        removeAccessibilityLabel: optionKey === "choice-only"
          ? "Remove Choice sounds access"
          : optionKey === "choice-tones-bowls"
            ? "Remove Tones & bowls category and Choice access"
            : `Remove ${group.options.find((option) => option.key === optionKey)?.label ?? optionKey} filter`,
        groupKey: group.key,
        optionKey,
      })),
  );
  if (collectionId) {
    const collection = discoveryCollections.find((entry) => entry.id === collectionId);
    if (collection) labels.unshift({
      key: `collection:${collectionId}`,
      label: collectionId === "choice-tones" ? "Tones & bowls · Opt-in" : collection.label,
      removeAccessibilityLabel: collectionId === "choice-tones"
        ? "Remove Tones & bowls opt-in collection and Choice access"
        : `Remove ${collection.label} collection filter`,
    });
  }
  return labels;
}

export function sortLibrarySounds(sounds: MobileCatalogSound[], mode: LibrarySortMode): MobileCatalogSound[] {
  if (mode === "recent") return [...sounds];
  return [...sounds].sort((left, right) => {
    if (mode === "category") {
      const laneOrder = left.lane.localeCompare(right.lane);
      if (laneOrder !== 0) return laneOrder;
    }
    return left.title.localeCompare(right.title);
  });
}
