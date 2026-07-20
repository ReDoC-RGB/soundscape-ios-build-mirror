import {
  excludedHoldLibrarySoundIdsV1,
  librarySoundMetadataV1,
  type LibrarySoundMetadataV1,
  type LoopPolicy,
} from "./librarySoundMetadata";

export type RecipeDensity = "minimal" | "balanced" | "textured";
export type RecipeLayerRole = "bed" | "texture" | "accent";

export type RecipeIntent = {
  intent?: string;
  intentKey?: string;
};

export type RecipeEnginePreferenceOptions = {
  likedSoundIds?: string[];
  dislikedSoundIds?: string[];
  avoidedSoundIds?: string[];
  boostedTags?: string[];
  reducedTags?: string[];
};

export type RecipeEngineOptions = RecipeIntent & {
  positiveTags?: string[];
  avoidanceTags?: string[];
  density?: RecipeDensity;
  allowUserChoice?: boolean;
  requestedOptInTags?: string[];
  requestedOptInCategories?: string[];
  seed?: string;
  limit?: number;
  count?: number;
  recentSoundIds?: string[];
  preferences?: RecipeEnginePreferenceOptions;
};

export type RecipeLayer = {
  role: RecipeLayerRole;
  soundId: string;
  title: string;
  volumeDefault: number;
  loopPolicy: LoopPolicy;
  userChoiceOnly: boolean;
  reason: string;
};

export type GeneratedRecipe = {
  id: string;
  intentKey?: string;
  normalizedIntent: string;
  density: RecipeDensity;
  layers: RecipeLayer[];
  whyThisRecipe: string[];
  warnings: string[];
  alternatives: Partial<Record<RecipeLayerRole, RecipeLayer[]>>;
  rejectedReasonSummary?: string;
};

export type RecipeEngineResult = {
  input: RecipeEngineOptions;
  normalizedIntent: string;
  warnings: string[];
  recipes: GeneratedRecipe[];
  bestRecipe?: GeneratedRecipe;
  rejectedReasonSummary?: string;
  candidateSummary: {
    libraryCount: number;
    eligibleCount: number;
    defaultSafeCount: number;
    userChoiceCount: number;
  };
};

type Candidate = {
  sound: LibrarySoundMetadataV1;
  score: number;
  reasonParts: string[];
};

type PreparedInput = Required<Pick<RecipeEngineOptions, "density" | "allowUserChoice" | "seed">> &
  RecipeEngineOptions & {
    normalizedIntent: string;
    positiveTerms: string[];
    avoidedTerms: string[];
    optInRequested: boolean;
    recentSet: Set<string>;
    preferenceLikedSet: Set<string>;
    preferenceDislikedSet: Set<string>;
    preferenceAvoidedSet: Set<string>;
    preferenceBoostedTerms: string[];
    preferenceReducedTerms: string[];
  };

const DEFAULT_SEED = "local-recipe-engine-v1";
const HOLD_IDS = new Set(excludedHoldLibrarySoundIdsV1);
const CLAIM_SAFE_OPT_IN_WARNING =
  "Choice sounds require an explicit opt-in request and allowUserChoice=true; default-safe results stay separate.";
const SAFER_SINGLE_WARNING = "I found a safer single sound instead of forcing a bad mix.";

type PreparedSoundIndex = {
  searchableTerms: string[];
  avoidanceTerms: string[];
  identityTerms: string[];
  searchableMatchCache: Map<string, boolean>;
  avoidanceMatchCache: Map<string, boolean>;
  compatibilityMatchCache: Map<string, boolean>;
  laneMatchCache: Map<string, boolean>;
};

// These fields are immutable catalog metadata. Android previously normalized
// the same strings thousands of times for every role/request; cache the exact
// existing transformations without changing scoring or result ordering.
const preparedSoundIndexCache = new WeakMap<LibrarySoundMetadataV1, PreparedSoundIndex>();
const normalizedTextCache = new Map<string, string>();
const expandedTermCache = new Map<string, string[]>();

const OPT_IN_TERMS = ["bowl", "singing", "resonance", "tone", "tones", "chime", "bell"];
const TOKEN_ALIASES: Record<string, string[]> = {
  air: ["air", "airflow", "fan", "room", "hum", "hvac", "soft_air", "wind"],
  asmr: ["asmr", "texture", "soft", "paper", "fabric", "writing", "tapping"],
  bell: ["bell", "chime", "bowl", "resonance", "tone"],
  blanket: ["blanket", "fabric", "cloth", "soft_texture"],
  bowl: ["bowl", "singing", "singing_bowl", "resonance", "resonant", "tone", "tones", "chime"],
  brown: ["brown", "brown_noise", "noise"],
  chime: ["chime", "bell", "bowl", "resonance", "tone"],
  cloth: ["cloth", "fabric", "soft_texture", "rustle"],
  creek: ["creek", "stream", "water", "wet", "flowing_water"],
  cricket: ["cricket", "crickets", "insect", "insects"],
  drizzle: ["drizzle", "rain", "rainfall", "soft_rain"],
  fabric: ["fabric", "cloth", "blanket", "soft_texture", "gentle_texture", "rustle", "brushing"],
  fan: ["fan", "extractor", "hvac", "appliance_hum"],
  focus: ["focus", "focus_safe", "steady", "writing", "soft"],
  foley: ["foley", "object", "object_foley", "tapping", "tap"],
  forest: ["forest", "nature", "outdoor", "meadow", "wind", "leaves", "birds", "frog", "frogs"],
  harsh: ["harsh", "sharp", "sharp_transient", "high_presence"],
  hum: ["hum", "room", "fan", "hvac", "air"],
  insect: ["insect", "insects", "bug", "bugs", "cricket", "crickets"],
  insects: ["insect", "insects", "bug", "bugs", "cricket", "crickets"],
  meadow: ["meadow", "forest", "nature", "outdoor", "wind", "leaves"],
  mouth: ["mouth", "chewing", "eating", "wet", "squish"],
  noise: ["noise", "white_noise", "brown_noise", "pink_noise", "steady_noise"],
  object: ["object", "foley", "object_foley", "tapping", "tap", "wood", "box", "cardboard"],
  page: ["page", "pages", "page_turning", "paper", "book"],
  paper: ["paper", "page", "pages", "page_turning", "book", "writing", "pencil", "pen", "marker", "notebook"],
  pink: ["pink", "pink_noise", "noise"],
  rain: ["rain", "rainy", "rainfall", "steady_rain", "soft_rain", "drizzle", "drips"],
  rainy: ["rain", "rainy", "rainfall", "steady_rain", "soft_rain", "drizzle"],
  resonance: ["resonance", "resonant", "bowl", "singing_bowl", "tone", "tones", "chime"],
  river: ["river", "stream", "water", "wet", "flowing_water"],
  room: ["room", "air", "fan", "hum", "hvac"],
  sharp: ["sharp", "harsh", "sharp_transient", "high_presence"],
  sleep: ["sleep", "sleep_safe", "soft", "stable_bed", "steady"],
  stream: ["stream", "river", "creek", "water", "wet", "flowing_water"],
  tapping: ["tapping", "tap", "taps", "object", "object_foley", "foley", "wood", "box", "cardboard"],
  texture: ["texture", "soft_texture", "gentle_texture", "fabric", "cloth"],
  tone: ["tone", "tones", "resonance", "resonant", "bowl", "singing_bowl", "chime"],
  typing: ["typing", "keyboard", "keys", "writing"],
  water: ["water", "river", "creek", "stream", "flowing", "flowing_water", "wet"],
  wet: ["wet", "water", "rain", "river", "creek", "stream", "squish"],
  white: ["white", "white_noise", "noise"],
  writing: ["writing", "pencil", "pen", "marker", "scribble", "paper", "notebook", "typing"],
};

const ROLE_NAMES: Record<RecipeLayerRole, string> = {
  bed: "stable bed/background",
  texture: "supporting texture",
  accent: "low-volume accent",
};

export function generateLocalRecipe(
  input: string | RecipeEngineOptions,
  sourceLibrary: LibrarySoundMetadataV1[] = librarySoundMetadataV1,
): RecipeEngineResult {
  const options = typeof input === "string" ? { intent: input } : input;
  const prepared = prepareInput(options);
  const warnings: string[] = [];

  if (prepared.optInRequested && !prepared.allowUserChoice) {
    warnings.push(CLAIM_SAFE_OPT_IN_WARNING);
  }

  const eligible = sourceLibrary.filter((sound) => isEligible(sound, prepared));
  const defaultSafeCount = sourceLibrary.filter((sound) => !sound.userChoiceOnly).length;
  const userChoiceCount = sourceLibrary.filter((sound) => sound.userChoiceOnly).length;

  if (prepared.preferenceAvoidedSet.size > 0) {
    warnings.push("Personalization avoided sounds were excluded when alternatives were available.");
  }
  if (prepared.preferenceDislikedSet.size > 0 || prepared.preferenceReducedTerms.length > 0) {
    warnings.push("Personalization reduced disliked sound and reduced tag scores.");
  }

  const recipe = buildRecipe(prepared, eligible, sourceLibrary.length, warnings);
  const recipes = recipe ? [recipe] : [];

  return {
    input: options,
    normalizedIntent: prepared.normalizedIntent,
    warnings,
    recipes,
    bestRecipe: recipe,
    rejectedReasonSummary: recipe?.rejectedReasonSummary,
    candidateSummary: {
      libraryCount: sourceLibrary.length,
      eligibleCount: eligible.length,
      defaultSafeCount,
      userChoiceCount,
    },
  };
}

export function normalizeRecipeIntent(intent: string | undefined): string {
  return tokenize(intent ?? "").join(" ");
}

function prepareInput(options: RecipeEngineOptions): PreparedInput {
  const density = options.density ?? "balanced";
  const normalizedIntent = normalizeRecipeIntent(options.intent ?? options.intentKey ?? "soundscape");
  const parsedAvoidances = parseAvoidanceTerms(options.intent ?? "");
  const optionAvoidances = options.avoidanceTags ?? [];
  const avoidedTerms = unique([
    ...parsedAvoidances,
    ...optionAvoidances.flatMap((tag) => tokenize(tag)),
  ]);
  const strippedIntent = stripAvoidanceClauses(options.intent ?? options.intentKey ?? "soundscape");
  const positiveTerms = uniqueTerms([
    ...tokenize(strippedIntent),
    ...(options.positiveTags ?? []).flatMap((tag) => tokenize(tag)),
  ]).filter((term) => !avoidedTerms.includes(term));
  const requestedOptInTerms = [
    ...(options.requestedOptInTags ?? []),
    ...(options.requestedOptInCategories ?? []),
  ].flatMap((tag) => tokenize(tag));
  const optInRequested = [...positiveTerms, ...requestedOptInTerms].some((term) => expandsTo(term, OPT_IN_TERMS));
  const preferences = options.preferences ?? {};

  return {
    ...options,
    density,
    allowUserChoice: options.allowUserChoice ?? false,
    seed: options.seed ?? DEFAULT_SEED,
    normalizedIntent,
    positiveTerms,
    avoidedTerms,
    optInRequested,
    recentSet: new Set(options.recentSoundIds ?? []),
    preferenceLikedSet: new Set(preferences.likedSoundIds ?? []),
    preferenceDislikedSet: new Set(preferences.dislikedSoundIds ?? []),
    preferenceAvoidedSet: new Set(preferences.avoidedSoundIds ?? []),
    preferenceBoostedTerms: uniqueTerms((preferences.boostedTags ?? []).flatMap((tag) => tokenize(tag))),
    preferenceReducedTerms: uniqueTerms((preferences.reducedTags ?? []).flatMap((tag) => tokenize(tag))),
  };
}

function buildRecipe(
  input: PreparedInput,
  eligible: LibrarySoundMetadataV1[],
  libraryCount: number,
  inheritedWarnings: string[],
): GeneratedRecipe | undefined {
  const selected: RecipeLayer[] = [];
  const recipeWarnings = [...inheritedWarnings];

  const bedCandidates = rankedCandidates(eligible, input, "bed", libraryCount).filter((candidate) => canServeAsBed(candidate.sound));
  const textureCandidates = rankedCandidates(eligible, input, "texture", libraryCount);
  const accentCandidates = rankedCandidates(eligible, input, "accent", libraryCount).filter(
    (candidate) => input.density !== "minimal" && candidate.sound.intensity !== "strong",
  );

  if (input.optInRequested && input.allowUserChoice) {
    const optInCandidates = rankedCandidates(
      eligible.filter((sound) => sound.userChoiceOnly),
      input,
      input.density === "minimal" ? "accent" : "texture",
      libraryCount,
    );
    const bestOptIn = optInCandidates[0];
    if (bestOptIn && bestOptIn.score >= 35) {
      selected.push(toLayer(bestOptIn, "accent"));
      recipeWarnings.push("Choice/opt-in sound included because the request explicitly asked for this sound family.");
      if (input.density !== "minimal") {
        const supportBed = bedCandidates.find((candidate) =>
          !candidate.sound.userChoiceOnly && isNeutralSupportBed(candidate.sound),
        ) ?? bedCandidates.find((candidate) => !candidate.sound.userChoiceOnly);
        if (supportBed && supportBed.sound.id !== bestOptIn.sound.id) {
          selected.unshift(toLayer(supportBed, "bed"));
        }
      }
      return finalizeRecipe(input, selected, recipeWarnings, {
        bed: bedCandidates,
        texture: textureCandidates,
        accent: accentCandidates,
      });
    }
  }

  const bestBed = bedCandidates[0];
  const bestTexture = textureCandidates.find((candidate) =>
    !selected.some((layer) => layer.soundId === candidate.sound.id)
      && (input.density !== "balanced" || candidate.sound.balancedRecipeEligible !== false)
      && (input.density !== "balanced" || !bestBed || areBalancedSoundsCompatible(bestBed.sound, candidate.sound)),
  );
  const bestAccent = accentCandidates.find((candidate) => !selected.some((layer) => layer.soundId === candidate.sound.id));

  if (input.density === "minimal") {
    if (bestBed && (bestBed.score >= 20 || !bestTexture || bestBed.score >= bestTexture.score - 15)) {
      selected.push(toLayer(bestBed, "bed"));
    } else if (bestTexture) {
      selected.push(toLayer(bestTexture, "texture"));
      recipeWarnings.push(SAFER_SINGLE_WARNING);
    } else if (bestAccent) {
      selected.push(toLayer(bestAccent, "accent"));
      recipeWarnings.push(SAFER_SINGLE_WARNING);
    }
  }

  if (input.density === "balanced") {
    const textureFirstIntent = input.positiveTerms.some((term) =>
      expandsTo(term, ["paper", "writing", "fabric", "cloth", "texture"]),
    );
    const accentFirstIntent = input.positiveTerms.some((term) =>
      expandsTo(term, ["tapping", "object", "foley"]),
    );

    if (textureFirstIntent && bestTexture && bestTexture.score >= 18 && hasIntentSignal(bestTexture)) {
      const neutralBed = bedCandidates.find((candidate) =>
        isNeutralSupportBed(candidate.sound)
          && candidate.sound.id !== bestTexture.sound.id
          && areBalancedSoundsCompatible(candidate.sound, bestTexture.sound),
      );
      if (neutralBed) selected.push(toLayer(neutralBed, "bed"));
      selected.push(toLayer(bestTexture, "texture"));
    }
    if (accentFirstIntent && bestAccent && bestAccent.score >= 30 && hasIntentSignal(bestAccent)) {
      selected.push(toLayer(bestAccent, "accent"));
    }
    if (selected.length === 0 && bestBed) selected.push(toLayer(bestBed, "bed"));
    if (!textureFirstIntent && !accentFirstIntent && bestTexture && bestTexture.score >= 18 && hasIntentSignal(bestTexture)) {
      selected.push(toLayer(bestTexture, "texture"));
    }
    if (!textureFirstIntent && !accentFirstIntent && selected.length < 2 && bestAccent && bestAccent.score >= 42 && hasIntentSignal(bestAccent) && selected.some((layer) => layer.role === "bed")) {
      selected.push(toLayer(bestAccent, "accent"));
    }
  }

  if (input.density === "textured") {
    const textureFirstIntent = input.positiveTerms.some((term) =>
      expandsTo(term, ["paper", "writing", "fabric", "cloth", "texture"]),
    );
    const accentFirstIntent = input.positiveTerms.some((term) =>
      expandsTo(term, ["tapping", "object", "foley"]),
    );

    if (textureFirstIntent && bestTexture && hasIntentSignal(bestTexture)) {
      const neutralBed = bedCandidates.find((candidate) => isNeutralSupportBed(candidate.sound));
      if (neutralBed) selected.push(toLayer(neutralBed, "bed"));
      selected.push(toLayer(bestTexture, "texture"));
    } else if (accentFirstIntent && bestAccent && hasIntentSignal(bestAccent)) {
      selected.push(toLayer(bestAccent, "accent"));
    } else if (bestBed) {
      selected.push(toLayer(bestBed, "bed"));
    }
    if (!textureFirstIntent && !accentFirstIntent) {
      for (const candidate of textureCandidates) {
        if (selected.filter((layer) => layer.role === "texture").length >= 2) break;
        if (candidate.score >= 15 && hasIntentSignal(candidate) && !selected.some((layer) => layer.soundId === candidate.sound.id)) {
          selected.push(toLayer(candidate, "texture"));
        }
      }
      if (bestAccent && hasIntentSignal(bestAccent) && selected.some((layer) => layer.role === "bed") && !selected.some((layer) => layer.soundId === bestAccent.sound.id)) {
        selected.push(toLayer(bestAccent, "accent"));
      }
    }
  }

  const guarded = applyRecipeGuardrails(selected, input);
  selected.splice(0, selected.length, ...guarded.layers);
  recipeWarnings.push(...guarded.warnings);

  if (selected.length > 1 && !selected.some((layer) => layer.role === "bed")) {
    const bestSingle = [bestTexture, bestAccent].filter(Boolean).sort((a, b) => (b?.score ?? 0) - (a?.score ?? 0))[0];
    selected.splice(0, selected.length);
    if (bestSingle) selected.push(toLayer(bestSingle, roleFromSound(bestSingle.sound)));
    recipeWarnings.push(SAFER_SINGLE_WARNING);
  }

  if (selected.length === 0) {
    const bestSingle = [...bedCandidates, ...textureCandidates, ...accentCandidates].sort((a, b) => b.score - a.score)[0];
    if (!bestSingle) {
      return undefined;
    }
    selected.push(toLayer(bestSingle, roleFromSound(bestSingle.sound)));
    recipeWarnings.push(SAFER_SINGLE_WARNING);
  }

  return finalizeRecipe(input, selected, recipeWarnings, {
    bed: bedCandidates,
    texture: textureCandidates,
    accent: accentCandidates,
  });
}

function areBalancedSoundsCompatible(first: LibrarySoundMetadataV1, second: LibrarySoundMetadataV1): boolean {
  return !(first.balancedIncompatibleSoundIds ?? []).includes(second.id)
    && !(second.balancedIncompatibleSoundIds ?? []).includes(first.id);
}

function isEligible(sound: LibrarySoundMetadataV1, input: PreparedInput): boolean {
  if (HOLD_IDS.has(sound.id)) return false;
  if (sound.licenseSourceConfidence === "blocked") return false;
  if (sound.appSafeUrlStatus === "blocked") return false;
  if (sound.mobileQcStatus === "failed_mobile_qc") return false;
  if (sound.mobileQcStatus === "needs_mobile_listening_qc") return false;
  if (input.preferenceAvoidedSet.has(sound.id)) return false;
  if (sound.userChoiceOnly && !(input.allowUserChoice && input.optInRequested)) return false;
  if (!sound.userChoiceOnly && input.optInRequested && input.allowUserChoice) return true;
  if (hasExplicitAvoidanceConflict(sound, input.avoidedTerms)) return false;
  return true;
}

function rankedCandidates(
  library: LibrarySoundMetadataV1[],
  input: PreparedInput,
  targetRole: RecipeLayerRole,
  libraryCount: number,
): Candidate[] {
  return library
    .filter((sound) => roleFitScore(sound, targetRole) > 0)
    .map((sound) => scoreCandidate(sound, input, targetRole, libraryCount))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.sound.id.localeCompare(b.sound.id));
}

function scoreCandidate(
  sound: LibrarySoundMetadataV1,
  input: PreparedInput,
  targetRole: RecipeLayerRole,
  libraryCount: number,
): Candidate {
  let score = 0;
  const reasonParts: string[] = [];
  const soundIndex = getPreparedSoundIndex(sound);
  const positiveMatches = input.positiveTerms.filter((term) => matchesPreparedTerms(soundIndex.searchableMatchCache, term, soundIndex.searchableTerms));
  const laneMatches = input.positiveTerms.filter((term) => matchesPreparedTexts(soundIndex.laneMatchCache, term, [sound.primaryLane]));

  if (laneMatches.length > 0) {
    score += 40;
    reasonParts.push(`matches ${sound.primaryLane}`);
  }

  const roleScore = roleFitScore(sound, targetRole);
  if (roleScore > 0) {
    score += roleScore;
    reasonParts.push(`fits ${ROLE_NAMES[targetRole]}`);
  }

  const familyFit = scoreIntentFamilyFit(sound, input, targetRole);
  if (familyFit.score !== 0) {
    score += familyFit.score;
    if (familyFit.reason) reasonParts.push(familyFit.reason);
  }

  if (positiveMatches.length > 0) {
    const capped = Math.min(30, positiveMatches.length * 15);
    score += capped;
    reasonParts.push(`matches ${positiveMatches.slice(0, 3).join(", ")}`);
  }

  const compatibilityMatches = input.positiveTerms.filter((term) =>
    matchesPreparedTexts(soundIndex.compatibilityMatchCache, term, sound.recipeCompatibilityTags),
  );
  if (compatibilityMatches.length > 0) {
    score += 10;
    reasonParts.push("compatible with the requested use");
  }

  if (sound.mobileQcStatus === "passed_mobile_qc") score += 8;
  if (sound.appSafeUrlStatus === "existing") score += 5;
  if (targetRole === "bed" && ["loop_safe", "restart_safe", "crossfade_recommended"].includes(sound.loopPolicy)) score += 5;
  if (input.recentSet.has(sound.id)) score -= 10;
  if (input.preferenceLikedSet.has(sound.id)) {
    score += 32;
    reasonParts.push("preferred sound");
  }
  if (input.preferenceDislikedSet.has(sound.id)) {
    score -= 28;
    reasonParts.push("disliked sound");
  }
  const preferenceBoostMatches = input.preferenceBoostedTerms.filter((term) => matchesPreparedTerms(soundIndex.searchableMatchCache, term, soundIndex.searchableTerms));
  if (preferenceBoostMatches.length > 0) {
    score += Math.min(30, preferenceBoostMatches.length * 10);
    reasonParts.push("preferred tag");
  }
  const preferenceReductionMatches = input.preferenceReducedTerms.filter((term) => matchesPreparedTerms(soundIndex.searchableMatchCache, term, soundIndex.searchableTerms));
  if (preferenceReductionMatches.length > 0) {
    score -= Math.min(26, preferenceReductionMatches.length * 9);
    reasonParts.push("reduced tag");
  }
  if (sound.userChoiceOnly) score += input.optInRequested && input.allowUserChoice ? 12 : -100;
  if (targetRole === "accent") score -= sound.intensity === "strong" ? 20 : 0;
  if (input.density === "minimal" && targetRole !== "bed") score -= 8;
  if (input.density === "textured" && targetRole === "texture") score += 6;

  const tieBreak = deterministicFraction(`${input.normalizedIntent}|${input.density}|${libraryCount}|${input.seed}|${sound.id}|${targetRole}`);
  score += tieBreak;

  if (reasonParts.length === 0 && (sound.recipeCompatibilityTags.includes("stable_bed") || sound.intensity === "soft")) {
    score += targetRole === "bed" ? 12 : 4;
    reasonParts.push("safe soft fallback");
  }

  return { sound, score, reasonParts };
}

function hasIntentSignal(candidate: Candidate): boolean {
  return candidate.reasonParts.some((part) => part.startsWith("matches") || part.includes("compatible"));
}

function finalizeRecipe(
  input: PreparedInput,
  layers: RecipeLayer[],
  warnings: string[],
  candidateMap: Record<RecipeLayerRole, Candidate[]>,
): GeneratedRecipe {
  const uniqueLayers = layers.filter((layer, index, all) => all.findIndex((candidate) => candidate.soundId === layer.soundId) === index);
  const selectedIds = new Set(uniqueLayers.map((layer) => layer.soundId));
  const whyThisRecipe = [
    `Deterministic ${input.density} recipe for “${input.normalizedIntent}”.`,
    ...uniqueLayers.map((layer) => `${layer.title} provides the ${ROLE_NAMES[layer.role]}.`),
  ];
  const alternatives: Partial<Record<RecipeLayerRole, RecipeLayer[]>> = {};

  for (const role of ["bed", "texture", "accent"] as RecipeLayerRole[]) {
    alternatives[role] = candidateMap[role]
      .filter((candidate) => !selectedIds.has(candidate.sound.id))
      .slice(0, 3)
      .map((candidate) => toLayer(candidate, role));
  }

  return {
    id: `recipe-${stableHash(`${input.normalizedIntent}|${input.density}|${input.seed}|${uniqueLayers.map((layer) => layer.soundId).join("|")}`)}`,
    intentKey: input.intentKey,
    normalizedIntent: input.normalizedIntent,
    density: input.density,
    layers: uniqueLayers,
    whyThisRecipe,
    warnings: unique(warnings),
    alternatives,
    rejectedReasonSummary: warnings.includes(SAFER_SINGLE_WARNING) ? SAFER_SINGLE_WARNING : undefined,
  };
}

function toLayer(candidate: Candidate, role: RecipeLayerRole): RecipeLayer {
  const sound = candidate.sound;
  return {
    role,
    soundId: sound.id,
    title: sound.mobileTitle,
    volumeDefault: volumeForRole(sound, role),
    loopPolicy: sound.loopPolicy,
    userChoiceOnly: sound.userChoiceOnly,
    reason: candidate.reasonParts.length > 0 ? candidate.reasonParts.join("; ") : `selected as ${ROLE_NAMES[role]}`,
  };
}

function applyRecipeGuardrails(layers: RecipeLayer[], input: PreparedInput): { layers: RecipeLayer[]; warnings: string[] } {
  const warnings: string[] = [];
  let guarded = [...layers];
  const textById = new Map(guarded.map((layer) => [layer.soundId, layer.title.toLowerCase()]));
  const hasRain = guarded.some((layer) => /rain/.test(`${layer.soundId} ${textById.get(layer.soundId) ?? ""}`));
  const hasWater = guarded.some((layer) => /water|river|creek|stream/.test(`${layer.soundId} ${textById.get(layer.soundId) ?? ""}`));

  if (hasRain && hasWater && !(input.density === "textured" && input.avoidedTerms.length === 0 && input.positiveTerms.some((term) => expandsTo(term, ["rain", "water"])))) {
    const firstBed = guarded.find((layer) => layer.role === "bed");
    guarded = guarded.filter((layer) => layer === firstBed || !/water|river|creek|stream/.test(`${layer.soundId} ${layer.title}`.toLowerCase()));
    warnings.push("Water/rain overlap was reduced to keep the recipe clean.");
  }

  const wetLayers = guarded.filter((layer) => /rain|water|river|creek|stream|wet/.test(`${layer.soundId} ${layer.title}`.toLowerCase()));
  if (wetLayers.length > 2) {
    const keep = new Set(wetLayers.slice(0, 2).map((layer) => layer.soundId));
    guarded = guarded.filter((layer) => !wetLayers.some((wetLayer) => wetLayer.soundId === layer.soundId) || keep.has(layer.soundId));
    warnings.push("Wet/rain/water layers were capped for clarity.");
  }

  if (input.density === "minimal") {
    guarded = guarded.slice(0, 2).filter((layer) => layer.role !== "accent");
  }

  return { layers: guarded, warnings };
}

function hasExplicitAvoidanceConflict(sound: LibrarySoundMetadataV1, avoidedTerms: string[]): boolean {
  if (avoidedTerms.length === 0) return false;
  const soundIndex = getPreparedSoundIndex(sound);
  for (const term of avoidedTerms) {
    const cached = soundIndex.avoidanceMatchCache.get(term);
    if (cached === true) return true;
    if (cached === false) continue;
    const matched = avoidanceAliases(term).some((avoidanceTerm) =>
      soundIndex.avoidanceTerms.some((entry) => termMatchesText(avoidanceTerm, entry)),
    );
    soundIndex.avoidanceMatchCache.set(term, matched);
    if (matched) return true;
  }
  if (avoidedTerms.some((term) => expandsTo(term, ["mouth", "wet", "squish"]))) {
    if (sound.contentSafetyFlags.mouthSounds || sound.contentSafetyFlags.eatingChewing) return true;
  }
  if (avoidedTerms.some((term) => expandsTo(term, ["voice", "speech"]))) {
    if (sound.contentSafetyFlags.voicePresent || sound.contentSafetyFlags.speechPresent) return true;
  }
  return false;
}

function avoidanceSearchTerms(sound: LibrarySoundMetadataV1): string[] {
  return getPreparedSoundIndex(sound).avoidanceTerms;
}

function buildAvoidanceSearchTerms(sound: LibrarySoundMetadataV1): string[] {
  return unique([
    sound.id,
    sound.mobileTitle,
    sound.mobileSubtitle,
    sound.primaryLane,
    sound.subcategory,
    ...sound.sensoryQualities,
    ...sound.avoidanceTags,
    ...sound.conflictTags,
  ].flatMap((value) => tokenize(value)));
}

function avoidanceAliases(term: string): string[] {
  const normalized = term.toLowerCase();
  const singular = normalized.replace(/s$/, "");
  const custom: Record<string, string[]> = {
    air: ["air", "fan", "hvac", "room", "hum"],
    bell: ["bell", "chime", "tone", "bowl"],
    bowl: ["bowl", "singing", "singing_bowl", "tone", "resonance", "chime"],
    chime: ["chime", "bell", "tone", "bowl"],
    cloth: ["cloth", "fabric", "soft_texture"],
    creek: ["creek", "stream", "water", "wet"],
    cricket: ["cricket", "crickets", "insect", "insects", "bug", "bugs"],
    fan: ["fan", "hvac", "extractor", "appliance_hum"],
    fabric: ["fabric", "cloth", "soft_texture", "rustle"],
    harsh: ["harsh", "sharp", "sharp_transient", "high_presence"],
    insect: ["insect", "insects", "cricket", "crickets", "bug", "bugs"],
    mouth: ["mouth", "chewing", "eating"],
    noise: ["noise", "white_noise", "brown_noise", "pink_noise", "steady_noise"],
    object: ["object", "foley", "object_foley", "tapping", "tap"],
    paper: ["paper", "page", "pages", "page_turning", "book", "notebook"],
    rain: ["rain", "rainfall", "steady_rain", "soft_rain", "drizzle"],
    resonance: ["resonance", "resonant", "tone", "tones", "bowl", "chime"],
    river: ["river", "stream", "water", "wet"],
    room: ["room", "fan", "air", "hum", "hvac"],
    sharp: ["sharp", "harsh", "sharp_transient", "high_presence"],
    stream: ["stream", "river", "creek", "water", "wet"],
    tapping: ["tapping", "tap", "taps", "object", "foley", "object_foley"],
    tone: ["tone", "tones", "resonance", "bowl", "chime"],
    typing: ["typing", "keyboard", "keys", "writing"],
    water: ["water", "rain", "river", "creek", "stream", "wet"],
    wet: ["wet", "water", "rain", "river", "creek", "stream", "squish"],
    writing: ["writing", "typing", "paper", "pencil", "pen", "marker", "notebook"],
  };
  return unique([normalized, singular, ...(custom[normalized] ?? []), ...(custom[singular] ?? [])]);
}

function canServeAsBed(sound: LibrarySoundMetadataV1): boolean {
  if (sound.builderRole !== "background" && !["bed", "environment", "tonal_noise"].includes(sound.role)) return false;
  return !["manual_replay_only", "one_shot_only", "needs_loop_edit", "not_reviewed"].includes(sound.loopPolicy);
}

function isNeutralSupportBed(sound: LibrarySoundMetadataV1): boolean {
  return ["Fan / Air / Room", "Noise Colors"].includes(sound.primaryLane);
}

function roleFromSound(sound: LibrarySoundMetadataV1): RecipeLayerRole {
  if (sound.builderRole === "background") return "bed";
  return sound.builderRole;
}

function roleFitScore(sound: LibrarySoundMetadataV1, role: RecipeLayerRole): number {
  if (role === "bed") {
    if (sound.builderRole === "background") return 25;
    if (["bed", "environment", "tonal_noise"].includes(sound.role)) return 18;
  }
  if (role === "texture") {
    if (sound.builderRole === "texture") return 25;
    if (["texture", "interaction_foley"].includes(sound.role)) return 16;
  }
  if (role === "accent") {
    if (sound.builderRole === "accent") return 25;
    if (sound.role === "accent" || sound.role === "interaction_foley") return 14;
  }
  return 0;
}

function scoreIntentFamilyFit(
  sound: LibrarySoundMetadataV1,
  input: PreparedInput,
  targetRole: RecipeLayerRole,
): { score: number; reason?: string } {
  const wantsRain = input.positiveTerms.some((term) => expandsTo(term, ["rain", "rainy", "rainfall", "drizzle", "soft_rain", "steady_rain"]));
  const wantsWater = input.positiveTerms.some((term) => expandsTo(term, ["water", "river", "creek", "stream", "flowing_water"]));
  const wantsPaperWriting = input.positiveTerms.some((term) => expandsTo(term, ["paper", "page", "pages", "page_turning", "book", "writing", "typing", "pencil", "pen", "marker", "notebook"]));
  const wantsToneBowl = input.positiveTerms.some((term) => expandsTo(term, ["bowl", "singing_bowl", "tone", "tones", "resonance", "chime", "bell"]));
  const identityText = getPreparedSoundIndex(sound).identityTerms;
  const hasRain = ["rain", "rainfall", "rainy", "soft_rain", "steady_rain", "drizzle"].some((term) => identityText.some((entry) => termMatchesText(term, entry)));
  const hasWater = ["water", "river", "creek", "stream", "flowing_water"].some((term) => identityText.some((entry) => termMatchesText(term, entry)));
  const hasPaperWriting = ["paper", "page", "pages", "page_turning", "book", "writing", "typing", "pencil", "pen", "marker", "notebook"].some((term) => identityText.some((entry) => termMatchesText(term, entry)));
  const hasToneBowl = ["bowl", "singing_bowl", "tone", "tones", "resonance", "chime", "bell"].some((term) => identityText.some((entry) => termMatchesText(term, entry)));

  let score = 0;
  const reasons: string[] = [];
  if (wantsRain && targetRole === "bed") {
    if (hasRain) {
      score += 80;
      reasons.push("exact rain-family bed match");
    } else if (hasWater && !wantsWater) {
      score -= 45;
      reasons.push("related water bed deprioritized for Rainy intent");
    }
  }
  if (wantsPaperWriting) {
    if (targetRole === "texture" && hasPaperWriting) {
      score += 90;
      reasons.push("exact paper/writing texture match");
    }
    if (targetRole === "bed" && !hasPaperWriting) {
      score -= 35;
      reasons.push("neutral bed deprioritized for paper/textured intent");
    }
  }
  if (wantsToneBowl) {
    if (hasToneBowl && targetRole === "accent") {
      score += 70;
      reasons.push("Choice tone/bowl accent match");
    }
    if (hasToneBowl && targetRole === "bed") {
      score -= 120;
      reasons.push("Choice tone/bowl not allowed as background");
    }
  }

  return { score, reason: reasons.join("; ") || undefined };
}

function volumeForRole(sound: LibrarySoundMetadataV1, role: RecipeLayerRole): number {
  const cap = role === "accent" ? 0.12 : role === "texture" ? 0.28 : sound.maxRecommendedVolume;
  return roundVolume(Math.min(sound.defaultVolume, sound.maxRecommendedVolume, cap));
}

function soundSearchTerms(sound: LibrarySoundMetadataV1): string[] {
  return getPreparedSoundIndex(sound).searchableTerms;
}

function buildSoundSearchTerms(sound: LibrarySoundMetadataV1): string[] {
  return uniqueTerms([
    sound.id,
    sound.mobileTitle,
    sound.mobileSubtitle,
    sound.primaryLane,
    sound.subcategory,
    sound.role,
    sound.builderRole,
    sound.intensity,
    sound.continuity,
    sound.loopPolicy,
    ...sound.sensoryQualities,
    ...sound.avoidanceTags,
    ...sound.recipeCompatibilityTags,
    ...sound.conflictTags,
  ].flatMap((value) => tokenize(value)));
}

function stripAvoidanceClauses(text: string): string {
  return text
    .replace(/\b(no|without|avoid|exclude)\s+[a-z0-9_ -]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseAvoidanceTerms(text: string): string[] {
  const results: string[] = [];
  const pattern = /\b(?:no|without|avoid|exclude)\s+([a-z0-9_ -]+?)(?=\s*(?:,|;|\band\b|\bwith\b|$))/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    results.push(...tokenize(match[1] ?? ""));
  }
  return unique(results);
}

function tokenize(text: string): string[] {
  return unique(
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean),
  );
}

function uniqueTerms(terms: string[]): string[] {
  return unique(terms.flatMap((term) => expandTerm(term))).filter((term) => term.length > 1);
}

function expandTerm(term: string): string[] {
  const normalized = term.toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
  const cached = expandedTermCache.get(normalized);
  if (cached) return cached;
  const base = normalized.replace(/s$/, "");
  const expanded = unique([normalized, base, ...(TOKEN_ALIASES[normalized] ?? []), ...(TOKEN_ALIASES[base] ?? [])]);
  expandedTermCache.set(normalized, expanded);
  return expanded;
}

function termMatchesSearchable(term: string, searchable: string[]): boolean {
  return expandTerm(term).some((expanded) => searchable.some((entry) => termMatchesText(expanded, entry)));
}

function matchesPreparedTerms(cache: Map<string, boolean>, term: string, searchable: string[]): boolean {
  const cached = cache.get(term);
  if (cached !== undefined) return cached;
  const matched = termMatchesSearchable(term, searchable);
  cache.set(term, matched);
  return matched;
}

function matchesPreparedTexts(cache: Map<string, boolean>, term: string, texts: string[]): boolean {
  const cached = cache.get(term);
  if (cached !== undefined) return cached;
  const matched = texts.some((text) => termMatchesText(term, text));
  cache.set(term, matched);
  return matched;
}

function termMatchesText(term: string, text: string): boolean {
  const normalizedText = normalizeMatchText(text);
  const normalizedTerm = normalizeMatchText(term);
  return normalizedText === normalizedTerm || normalizedText.includes(normalizedTerm);
}

function normalizeMatchText(text: string): string {
  const cached = normalizedTextCache.get(text);
  if (cached !== undefined) return cached;
  const normalized = text.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  normalizedTextCache.set(text, normalized);
  return normalized;
}

function getPreparedSoundIndex(sound: LibrarySoundMetadataV1): PreparedSoundIndex {
  const cached = preparedSoundIndexCache.get(sound);
  if (cached) return cached;
  const prepared = {
    searchableTerms: buildSoundSearchTerms(sound),
    avoidanceTerms: buildAvoidanceSearchTerms(sound),
    identityTerms: tokenize([sound.id, sound.mobileTitle, sound.mobileSubtitle, sound.primaryLane, sound.subcategory].join(" ")),
    searchableMatchCache: new Map<string, boolean>(),
    avoidanceMatchCache: new Map<string, boolean>(),
    compatibilityMatchCache: new Map<string, boolean>(),
    laneMatchCache: new Map<string, boolean>(),
  };
  preparedSoundIndexCache.set(sound, prepared);
  return prepared;
}

function expandsTo(term: string, targets: string[]): boolean {
  const expanded = expandTerm(term);
  return targets.some((target) => expanded.includes(target));
}

function stableHash(text: string): string {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function deterministicFraction(text: string): number {
  const value = Number.parseInt(stableHash(text), 36);
  return (value % 1000) / 1000;
}

function roundVolume(value: number): number {
  return Math.round(value * 100) / 100;
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}
