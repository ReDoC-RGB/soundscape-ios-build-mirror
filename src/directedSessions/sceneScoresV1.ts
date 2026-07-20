export const DIRECTED_SCENE_SCORE_CONTRACT_VERSION = 1 as const;

export type DirectedSceneIdV1 = "rain-desk-v1" | "porcelain-table-v1" | "soft-wardrobe-v1";
export type DirectedOutputProfileV1 = "headphones" | "speakers";
export type DirectedSteeringAxisV1 = "softer" | "sparser" | "closer" | "steadier";
export type DirectedSteeringControlV1 = DirectedSteeringAxisV1 | "different-texture";
export type DirectedLayerRoleV1 = "bed" | "anchor" | "texture" | "accent" | "foreground";

export type DirectedAssetV1 = Readonly<{
  assetId: string;
  title: string;
  sourceUri: string;
  durationMs: number;
  loopEligible: boolean;
  required: boolean;
  persistentDownloadEligible: boolean;
  containsVoice: false;
  manualOnly: false;
  neverAutoplay: false;
  warningRequired: false;
}>;

export type DirectedPhaseV1 = Readonly<{
  phaseId: string;
  label: string;
  startMs: number;
  endMs: number;
  visualStateId: string;
  nextPhaseCopy: string | null;
}>;

export type DirectedEventV1 = Readonly<{
  eventId: string;
  phaseIndex: number;
  startMs: number;
  assetId: string;
  role: DirectedLayerRoleV1;
  gain: number;
  required: boolean;
  continuous: boolean;
  densityRank: 0 | 1 | 2 | 3;
  timingVariationMs: number;
  gainVariationDb: number;
  fadeInMs: 250;
  fadeOutMs: 500;
}>;

export type DirectedAvoidanceRuleV1 = Readonly<{
  avoidanceId: string;
  label: string;
  essentialConflict: boolean;
  removeAssetIds: readonly string[];
  replacements: Readonly<Record<string, string>>;
  trajectoryOverride?: string;
}>;

export type DirectedTexturePairV1 = Readonly<{
  pairId: string;
  assetIds: readonly [string, string];
}>;

export type DirectedSceneScoreV1 = Readonly<{
  contractVersion: 1;
  sceneId: DirectedSceneIdV1;
  sceneVersion: 1;
  scoreHash: string;
  title: string;
  trajectory: string;
  cardCopy: string;
  durationMs: number;
  visualThemeId: "rain-desk" | "porcelain-table" | "soft-wardrobe";
  productionEligible: boolean;
  contentGateCustomerCopy: string | null;
  outputProfiles: Readonly<{
    headphones: Readonly<{ bedTrimDb: 0; foregroundTrimDb: 0 }>;
    speakers: Readonly<{ bedTrimDb: -1; foregroundTrimDb: 1.5 }>;
  }>;
  assets: readonly DirectedAssetV1[];
  requiredAssetIds: readonly string[];
  optionalAssetIds: readonly string[];
  hardAvoidances: readonly DirectedAvoidanceRuleV1[];
  texturePairs: readonly DirectedTexturePairV1[];
  phases: readonly DirectedPhaseV1[];
  events: readonly DirectedEventV1[];
  finalFadeStartMs: number;
}>;

export type MaterializedDirectedSceneV1 = Readonly<{
  blocked: boolean;
  customerCopy: string;
  sceneId: DirectedSceneIdV1;
  sceneVersion: 1;
  scoreHash: string;
  title: string;
  trajectory: string;
  durationMs: number;
  outputProfile: DirectedOutputProfileV1;
  hardAvoidanceIds: readonly string[];
  assets: readonly DirectedAssetV1[];
  phases: readonly DirectedPhaseV1[];
  events: readonly DirectedEventV1[];
  texturePairs: readonly DirectedTexturePairV1[];
  finalFadeStartMs: number;
}>;

export const DIRECTED_STEERING_POLICY_V1 = Object.freeze({
  controlOrder: Object.freeze(["softer", "sparser", "closer", "steadier", "different-texture"] as const),
  softer: Object.freeze({ gainMultipliers: Object.freeze([1, 0.82, 0.68] as const) }),
  sparser: Object.freeze({ optionalEventFractions: Object.freeze([1, 0.75, 0.5] as const) }),
  closer: Object.freeze({
    foregroundDb: Object.freeze([0, 2, 4] as const),
    anchorDb: Object.freeze([0, -1, -2] as const),
  }),
  steadier: Object.freeze({
    timingVariationMultipliers: Object.freeze([1, 0.4, 0] as const),
    gainVariationDb: Object.freeze([2, 1, 0] as const),
  }),
  minimumOptionalGain: 0.06,
  maxLayerGain: 0.65,
  phaseCrossfadeMs: 2_000,
  manualTrimEnvelopeMs: 300,
  appliedUndoMaximumMs: 10_000,
  finalFadeMs: 15_000,
});

const outputProfiles = Object.freeze({
  headphones: Object.freeze({ bedTrimDb: 0 as const, foregroundTrimDb: 0 as const }),
  speakers: Object.freeze({ bedTrimDb: -1 as const, foregroundTrimDb: 1.5 as const }),
});

const asset = (
  assetId: string,
  title: string,
  sourceUri: string,
  durationMs: number,
  loopEligible: boolean,
  required: boolean,
  persistentDownloadEligible = true,
): DirectedAssetV1 => Object.freeze({
  assetId,
  title,
  sourceUri,
  durationMs,
  loopEligible,
  required,
  persistentDownloadEligible,
  containsVoice: false,
  manualOnly: false,
  neverAutoplay: false,
  warningRequired: false,
});

const phase = (
  phaseId: string,
  label: string,
  startMs: number,
  endMs: number,
  visualStateId: string,
  nextPhaseCopy: string | null,
): DirectedPhaseV1 => Object.freeze({ phaseId, label, startMs, endMs, visualStateId, nextPhaseCopy });

let nextEventSequence = 0;
const event = (
  scene: string,
  phaseIndex: number,
  startSeconds: number,
  assetId: string,
  role: DirectedLayerRoleV1,
  gain: number,
  densityRank: 0 | 1 | 2 | 3,
  options: Partial<Pick<DirectedEventV1, "required" | "continuous" | "timingVariationMs" | "gainVariationDb">> = {},
): DirectedEventV1 => Object.freeze({
  eventId: `${scene}:event:${String(++nextEventSequence).padStart(3, "0")}`,
  phaseIndex,
  startMs: Math.round(startSeconds * 1_000),
  assetId,
  role,
  gain,
  required: options.required ?? false,
  continuous: options.continuous ?? false,
  densityRank,
  timingVariationMs: options.timingVariationMs ?? 0,
  gainVariationDb: options.gainVariationDb ?? 0,
  fadeInMs: 250,
  fadeOutMs: 500,
});

const RAIN = Object.freeze({
  bed: "freesound-slow-rain-loop",
  book: "m6-nonvoice-bb9-026-book-handling",
  paper: "m6-nonvoice-bb9-032-paper-handling",
  pencil: "m6-nonvoice-bb9-033-pencil-and-marker-writing",
  pages: "m6-nonvoice-bb9-025-book-open-close-and-pages",
});
const PORCELAIN = Object.freeze({
  shells: "m6-nonvoice-bb9-013-shells-on-marble-and-ceramic",
  wood: "m6-nonvoice-bb10-009-finger-tapping-on-table",
  metal: "m6-nonvoice-bb9-009-finger-tapping-on-metal-pipe",
  mixed: "m6-nonvoice-bb9-012-screwdriver-taps-and-coin-jar",
});
const WARDROBE = Object.freeze({
  fabric: "m6-nonvoice-bb9-057-zip-and-rustling-fabric",
  leather: "m6-nonvoice-bb9-050-leather-jacket-handling",
  brush: "m6-nonvoice-bb9-051-plastic-hairbrush",
});

const rainDeskScoreV1: DirectedSceneScoreV1 = Object.freeze({
  contractVersion: 1,
  sceneId: "rain-desk-v1",
  sceneVersion: 1,
  scoreHash: "06271ef741f41a84e282aba9469514d65763e4a2075772b5508fa4dcc9eabd35",
  title: "Rain Desk",
  trajectory: "Paper to Pencil",
  cardCopy: "Rain settles, paper moves, pencil comes closer.",
  durationMs: 840_000,
  visualThemeId: "rain-desk",
  productionEligible: true,
  contentGateCustomerCopy: null,
  outputProfiles,
  assets: Object.freeze([
    asset(RAIN.bed, "Slow Rain", "https://soundscape.wellmadesystems.com/mobile-catalog-slice/kpfbNpr4n9exCDcz30C8Kp3Mzd8nNaHN/freesound-slow-rain-loop.mp3", 73_415, true, true, true),
    asset(RAIN.book, "Book handling", "https://cdn.freesound.org/previews/250/250017_389377-lq.mp3", 132_024, false, false),
    asset(RAIN.paper, "Paper handling", "https://cdn.freesound.org/previews/534/534957_37011-lq.mp3", 75_528, false, false),
    asset(RAIN.pencil, "Pencil and marker writing", "https://cdn.freesound.org/previews/530/530190_6652872-lq.mp3", 82_368, false, false),
    asset(RAIN.pages, "Book open, close, and pages", "https://cdn.freesound.org/previews/734/734547_13973196-lq.mp3", 44_208, false, false),
  ]),
  requiredAssetIds: Object.freeze([RAIN.bed, RAIN.paper]),
  optionalAssetIds: Object.freeze([RAIN.book, RAIN.pencil, RAIN.pages]),
  hardAvoidances: Object.freeze([
    Object.freeze({ avoidanceId: "no-rain", label: "No rain", essentialConflict: true, removeAssetIds: Object.freeze([RAIN.bed]), replacements: Object.freeze({}) }),
    Object.freeze({ avoidanceId: "no-paper", label: "No paper", essentialConflict: true, removeAssetIds: Object.freeze([RAIN.paper, RAIN.book, RAIN.pages]), replacements: Object.freeze({}) }),
    Object.freeze({ avoidanceId: "no-writing", label: "No writing", essentialConflict: false, removeAssetIds: Object.freeze([RAIN.pencil]), replacements: Object.freeze({ [RAIN.pencil]: RAIN.pages }), trajectoryOverride: "Paper to Pages" }),
  ]),
  texturePairs: Object.freeze([
    Object.freeze({ pairId: "rain-paper-book", assetIds: Object.freeze([RAIN.paper, RAIN.book] as const) }),
    Object.freeze({ pairId: "rain-pencil-pages", assetIds: Object.freeze([RAIN.pencil, RAIN.pages] as const) }),
  ]),
  phases: Object.freeze([
    phase("window-settles", "Window settles", 0, 150_000, "rain-window", "Paper in focus"),
    phase("paper-in-focus", "Paper in focus", 150_000, 360_000, "rain-paper", "Pencil detail"),
    phase("pencil-detail", "Pencil detail", 360_000, 630_000, "rain-pencil", "Pages thin"),
    phase("pages-thin", "Pages thin", 630_000, 780_000, "rain-pages", "Back to window"),
    phase("back-to-window", "Back to window", 780_000, 840_000, "rain-window-dark", null),
  ]),
  events: Object.freeze([
    event("rain", 0, 0, RAIN.bed, "bed", 0.38, 0, { required: true, continuous: true }),
    event("rain", 0, 40, RAIN.book, "texture", 0.14, 1, { timingVariationMs: -2_000, gainVariationDb: -1 }),
    event("rain", 1, 165, RAIN.paper, "texture", 0.20, 1, { timingVariationMs: 2_000, gainVariationDb: 1 }),
    event("rain", 1, 260, RAIN.paper, "texture", 0.20, 2, { timingVariationMs: -3_000, gainVariationDb: -1 }),
    event("rain", 1, 310, RAIN.pages, "accent", 0.12, 3, { timingVariationMs: 4_000, gainVariationDb: 1 }),
    event("rain", 2, 375, RAIN.pencil, "foreground", 0.23, 1, { timingVariationMs: -3_000, gainVariationDb: -1 }),
    event("rain", 2, 462, RAIN.paper, "texture", 0.15, 3, { timingVariationMs: 4_000, gainVariationDb: 1 }),
    event("rain", 2, 485, RAIN.pencil, "foreground", 0.23, 2, { timingVariationMs: 2_000, gainVariationDb: 1 }),
    event("rain", 2, 595, RAIN.pencil, "foreground", 0.23, 1, { timingVariationMs: -2_000, gainVariationDb: -1 }),
    event("rain", 3, 645, RAIN.pages, "accent", 0.15, 1, { timingVariationMs: 2_000 }),
    event("rain", 3, 682, RAIN.pencil, "foreground", 0.18, 3, { timingVariationMs: -3_000, gainVariationDb: -1 }),
    event("rain", 3, 720, RAIN.pages, "accent", 0.15, 2, { timingVariationMs: 3_000 }),
    event("rain", 4, 785, RAIN.pages, "accent", 0.10, 1),
  ]),
  finalFadeStartMs: 825_000,
});

const porcelainTableScoreV1: DirectedSceneScoreV1 = Object.freeze({
  contractVersion: 1,
  sceneId: "porcelain-table-v1",
  sceneVersion: 1,
  scoreHash: "91f1e5848c3bd7bff832b0c42e8d0968036fa747cdc68d54ea3c988505815817",
  title: "Porcelain Table",
  trajectory: "Shells to Wood",
  cardCopy: "Ceramic detail opens into wood and soft metal.",
  durationMs: 900_000,
  visualThemeId: "porcelain-table",
  productionEligible: true,
  contentGateCustomerCopy: null,
  outputProfiles,
  assets: Object.freeze([
    asset(PORCELAIN.shells, "Shells on marble and ceramic", "https://cdn.freesound.org/previews/800/800116_2520418-lq.mp3", 20_592, false, true),
    asset(PORCELAIN.wood, "Finger tapping on table", "https://cdn.freesound.org/previews/557/557363_7281605-lq.mp3", 12_480, false, false),
    asset(PORCELAIN.metal, "Finger tapping on metal pipe", "https://cdn.freesound.org/previews/811/811807_13183432-lq.mp3", 21_840, false, false),
    asset(PORCELAIN.mixed, "Screwdriver taps and coin jar", "https://cdn.freesound.org/previews/435/435814_6262563-lq.mp3", 60_744, false, false),
  ]),
  requiredAssetIds: Object.freeze([PORCELAIN.shells]),
  optionalAssetIds: Object.freeze([PORCELAIN.wood, PORCELAIN.metal, PORCELAIN.mixed]),
  hardAvoidances: Object.freeze([
    Object.freeze({ avoidanceId: "no-tapping", label: "No tapping", essentialConflict: true, removeAssetIds: Object.freeze(Object.values(PORCELAIN)), replacements: Object.freeze({}) }),
    Object.freeze({ avoidanceId: "no-metal", label: "No metal", essentialConflict: false, removeAssetIds: Object.freeze([PORCELAIN.metal, PORCELAIN.mixed]), replacements: Object.freeze({}) }),
    Object.freeze({ avoidanceId: "no-shells-ceramic", label: "No shells / ceramic", essentialConflict: false, removeAssetIds: Object.freeze([PORCELAIN.shells]), replacements: Object.freeze({ [PORCELAIN.shells]: PORCELAIN.wood }) }),
  ]),
  texturePairs: Object.freeze([
    Object.freeze({ pairId: "porcelain-shells-wood", assetIds: Object.freeze([PORCELAIN.shells, PORCELAIN.wood] as const) }),
    Object.freeze({ pairId: "porcelain-metal-mixed", assetIds: Object.freeze([PORCELAIN.metal, PORCELAIN.mixed] as const) }),
  ]),
  phases: Object.freeze([
    phase("shells-arrive", "Shells arrive", 0, 180_000, "porcelain-shells", "Wood pulse"),
    phase("wood-pulse", "Wood pulse", 180_000, 420_000, "porcelain-wood", "Metal reply"),
    phase("metal-reply", "Metal reply", 420_000, 660_000, "porcelain-metal", "Mixed objects"),
    phase("mixed-objects", "Mixed objects", 660_000, 840_000, "porcelain-mixed", "Surface clears"),
    phase("surface-clears", "Surface clears", 840_000, 900_000, "porcelain-clear", null),
  ]),
  events: Object.freeze([
    event("porcelain", 0, 20, PORCELAIN.shells, "anchor", 0.24, 0, { required: true, timingVariationMs: -2_000, gainVariationDb: -1 }),
    event("porcelain", 0, 60, PORCELAIN.wood, "accent", 0.12, 2, { timingVariationMs: 2_000, gainVariationDb: 1 }),
    event("porcelain", 0, 80, PORCELAIN.shells, "anchor", 0.24, 1, { timingVariationMs: 2_000, gainVariationDb: 1 }),
    event("porcelain", 0, 120, PORCELAIN.wood, "accent", 0.12, 3, { timingVariationMs: -2_000, gainVariationDb: -1 }),
    event("porcelain", 0, 140, PORCELAIN.shells, "anchor", 0.24, 2),
    ...[190, 235, 282, 330, 377].map((at, index) => event("porcelain", 1, at, PORCELAIN.wood, "accent", 0.18, ([1, 2, 1, 3, 2] as const)[index], { timingVariationMs: index % 2 ? -3_000 : 3_000, gainVariationDb: index % 2 ? -1 : 1 })),
    ...[205, 282, 360].map((at, index) => event("porcelain", 1, at, PORCELAIN.shells, "anchor", 0.20, ([1, 3, 2] as const)[index], { timingVariationMs: index % 2 ? -4_000 : 4_000 })),
    ...[435, 495, 555, 615].map((at, index) => event("porcelain", 2, at, PORCELAIN.metal, "texture", 0.17, ([1, 2, 3, 1] as const)[index], { timingVariationMs: index % 2 ? -4_000 : 4_000, gainVariationDb: index % 2 ? -1 : 1 })),
    ...[450, 540, 630].map((at, index) => event("porcelain", 2, at, PORCELAIN.shells, "anchor", 0.18, ([2, 1, 3] as const)[index], { timingVariationMs: index % 2 ? -4_000 : 4_000 })),
    event("porcelain", 2, 520, PORCELAIN.mixed, "accent", 0.11, 3, { timingVariationMs: 4_000 }),
    event("porcelain", 3, 670, PORCELAIN.mixed, "accent", 0.13, 1, { timingVariationMs: -2_000, gainVariationDb: -1 }),
    event("porcelain", 3, 735, PORCELAIN.wood, "accent", 0.15, 3, { timingVariationMs: 3_000 }),
    event("porcelain", 3, 760, PORCELAIN.mixed, "accent", 0.13, 2, { timingVariationMs: 2_000, gainVariationDb: 1 }),
    event("porcelain", 3, 810, PORCELAIN.shells, "anchor", 0.16, 1, { timingVariationMs: -3_000 }),
    event("porcelain", 4, 845, PORCELAIN.shells, "anchor", 0.14, 0, { required: true }),
  ]),
  finalFadeStartMs: 885_000,
});

const softWardrobeScoreV1: DirectedSceneScoreV1 = Object.freeze({
  contractVersion: 1,
  sceneId: "soft-wardrobe-v1",
  sceneVersion: 1,
  scoreHash: "efad5676934c2a2e2ea7dbf7809556b6ed76a1d3b17be84a898e2b73e181ba47",
  title: "Soft Wardrobe",
  trajectory: "Fabric to Brush",
  cardCopy: "Fabric folds, leather shifts, brush passes thin out.",
  durationMs: 960_000,
  visualThemeId: "soft-wardrobe",
  productionEligible: true,
  contentGateCustomerCopy: null,
  outputProfiles,
  assets: Object.freeze([
    asset(WARDROBE.fabric, "Zip and rustling fabric", "https://cdn.freesound.org/previews/728/728156_6033218-lq.mp3", 28_944, false, true),
    asset(WARDROBE.leather, "Leather jacket handling", "https://cdn.freesound.org/previews/770/770050_13973196-lq.mp3", 36_096, false, false),
    asset(WARDROBE.brush, "Plastic hairbrush", "https://cdn.freesound.org/previews/199/199299_2723971-lq.mp3", 45_528, false, false),
  ]),
  requiredAssetIds: Object.freeze([WARDROBE.fabric]),
  optionalAssetIds: Object.freeze([WARDROBE.leather, WARDROBE.brush]),
  hardAvoidances: Object.freeze([
    Object.freeze({ avoidanceId: "no-fabric-cloth", label: "No fabric / cloth", essentialConflict: true, removeAssetIds: Object.freeze([WARDROBE.fabric]), replacements: Object.freeze({}) }),
    Object.freeze({ avoidanceId: "no-leather", label: "No leather", essentialConflict: false, removeAssetIds: Object.freeze([WARDROBE.leather]), replacements: Object.freeze({}) }),
    Object.freeze({ avoidanceId: "no-brushing", label: "No brushing", essentialConflict: false, removeAssetIds: Object.freeze([WARDROBE.brush]), replacements: Object.freeze({ [WARDROBE.brush]: WARDROBE.fabric }) }),
  ]),
  texturePairs: Object.freeze([
    Object.freeze({ pairId: "wardrobe-fabric-leather", assetIds: Object.freeze([WARDROBE.fabric, WARDROBE.leather] as const) }),
    Object.freeze({ pairId: "wardrobe-brush-fabric", assetIds: Object.freeze([WARDROBE.brush, WARDROBE.fabric] as const) }),
  ]),
  phases: Object.freeze([
    phase("fabric-breath", "Fabric breath", 0, 210_000, "wardrobe-fabric", "Leather folds"),
    phase("leather-folds", "Leather folds", 210_000, 420_000, "wardrobe-leather", "Brush passes"),
    phase("brush-passes", "Brush passes", 420_000, 690_000, "wardrobe-brush", "Woven blend"),
    phase("woven-blend", "Woven blend", 690_000, 900_000, "wardrobe-woven", "Folded quiet"),
    phase("folded-quiet", "Folded quiet", 900_000, 960_000, "wardrobe-folded", null),
  ]),
  events: Object.freeze([
    ...[20, 75, 130, 185].map((at, index) => event("wardrobe", 0, at, WARDROBE.fabric, "anchor", 0.23, ([0, 2, 1, 3] as const)[index], { required: index === 0, timingVariationMs: index % 2 ? -4_000 : 4_000, gainVariationDb: index % 2 ? -1 : 1 })),
    ...[225, 285, 345, 405].map((at, index) => event("wardrobe", 1, at, WARDROBE.leather, "texture", 0.19, ([1, 2, 3, 1] as const)[index], { timingVariationMs: index % 2 ? -4_000 : 4_000, gainVariationDb: index % 2 ? -1 : 1 })),
    ...[250, 340].map((at, index) => event("wardrobe", 1, at, WARDROBE.fabric, "anchor", 0.16, ([2, 1] as const)[index], { timingVariationMs: index ? -5_000 : 5_000 })),
    ...[435, 500, 565, 630].map((at, index) => event("wardrobe", 2, at, WARDROBE.brush, "foreground", 0.17, ([1, 2, 3, 1] as const)[index], { timingVariationMs: index % 2 ? -5_000 : 5_000, gainVariationDb: index % 2 ? -1 : 1 })),
    ...[465, 562, 660].map((at, index) => event("wardrobe", 2, at, WARDROBE.fabric, "anchor", 0.15, ([2, 1, 3] as const)[index], { timingVariationMs: index % 2 ? -5_000 : 5_000 })),
    event("wardrobe", 3, 700, WARDROBE.fabric, "anchor", 0.18, 1, { timingVariationMs: 3_000, gainVariationDb: 1 }),
    event("wardrobe", 3, 752, WARDROBE.leather, "texture", 0.16, 2, { timingVariationMs: -3_000, gainVariationDb: -1 }),
    event("wardrobe", 3, 775, WARDROBE.brush, "foreground", 0.14, 3, { timingVariationMs: 4_000 }),
    event("wardrobe", 3, 804, WARDROBE.fabric, "anchor", 0.18, 1, { timingVariationMs: -3_000, gainVariationDb: -1 }),
    event("wardrobe", 3, 850, WARDROBE.brush, "foreground", 0.14, 2, { timingVariationMs: -4_000 }),
    event("wardrobe", 3, 856, WARDROBE.leather, "texture", 0.16, 3, { timingVariationMs: 3_000, gainVariationDb: 1 }),
    event("wardrobe", 4, 905, WARDROBE.fabric, "anchor", 0.12, 0, { required: true }),
  ]),
  finalFadeStartMs: 945_000,
});

export const directedSceneScoresV1: readonly DirectedSceneScoreV1[] = Object.freeze([
  rainDeskScoreV1,
  porcelainTableScoreV1,
  softWardrobeScoreV1,
]);

export function getDirectedSceneScoreV1(sceneId: DirectedSceneIdV1): DirectedSceneScoreV1 {
  const score = directedSceneScoresV1.find((candidate) => candidate.sceneId === sceneId);
  if (!score) throw new Error(`Unknown directed scene ${sceneId}.`);
  return score;
}

export function validateSceneScoreV1(score: DirectedSceneScoreV1): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (score.contractVersion !== 1) errors.push("unsupported contract version");
  if (score.durationMs < 600_000 || score.durationMs > 1_200_000) errors.push("duration outside beta range");
  if (!/^[a-f0-9]{64}$/.test(score.scoreHash)) errors.push("invalid score hash");
  if (score.phases.length !== 5) errors.push("exactly five phases required");
  let cursor = 0;
  const phaseIds = new Set<string>();
  for (const phaseDefinition of score.phases) {
    if (phaseDefinition.startMs !== cursor || phaseDefinition.endMs <= phaseDefinition.startMs) errors.push(`phase gap/overlap:${phaseDefinition.phaseId}`);
    if (phaseIds.has(phaseDefinition.phaseId)) errors.push(`duplicate phase:${phaseDefinition.phaseId}`);
    phaseIds.add(phaseDefinition.phaseId);
    cursor = phaseDefinition.endMs;
  }
  if (cursor !== score.durationMs) errors.push("phases do not end at duration");
  const assetIds = new Set<string>();
  for (const candidate of score.assets) {
    if (assetIds.has(candidate.assetId)) errors.push(`duplicate asset:${candidate.assetId}`);
    assetIds.add(candidate.assetId);
    if (candidate.containsVoice || candidate.manualOnly || candidate.neverAutoplay || candidate.warningRequired) errors.push(`unsafe asset:${candidate.assetId}`);
  }
  if (score.assets.length > 8 || score.events.length > 128) errors.push("score size ceiling exceeded");
  const eventIds = new Set<string>();
  for (const scoreEvent of score.events) {
    if (eventIds.has(scoreEvent.eventId)) errors.push(`duplicate event:${scoreEvent.eventId}`);
    eventIds.add(scoreEvent.eventId);
    const ownerPhase = score.phases[scoreEvent.phaseIndex];
    if (!ownerPhase || scoreEvent.startMs < ownerPhase.startMs || scoreEvent.startMs >= ownerPhase.endMs) errors.push(`event outside phase:${scoreEvent.eventId}`);
    if (!assetIds.has(scoreEvent.assetId)) errors.push(`unknown event asset:${scoreEvent.eventId}`);
    if (scoreEvent.gain < 0.06 || scoreEvent.gain > DIRECTED_STEERING_POLICY_V1.maxLayerGain) errors.push(`gain out of range:${scoreEvent.eventId}`);
    if (scoreEvent.fadeInMs !== 250 || scoreEvent.fadeOutMs !== 500) errors.push(`unsafe event envelope:${scoreEvent.eventId}`);
  }
  if (score.finalFadeStartMs !== score.durationMs - DIRECTED_STEERING_POLICY_V1.finalFadeMs) errors.push("invalid terminal fade");
  for (const pair of score.texturePairs) {
    if (pair.assetIds[0] === pair.assetIds[1] || pair.assetIds.some((id) => !assetIds.has(id))) errors.push(`invalid texture pair:${pair.pairId}`);
  }
  return { valid: errors.length === 0, errors };
}

export function materializeDirectedSceneVariantV1(
  score: DirectedSceneScoreV1,
  options: Readonly<{
    hardAvoidanceIds: readonly string[];
    outputProfile: DirectedOutputProfileV1;
    allowContentGatedFixture?: boolean;
  }>,
): MaterializedDirectedSceneV1 {
  const selectedRules = options.hardAvoidanceIds.map((id) => score.hardAvoidances.find((rule) => rule.avoidanceId === id)).filter((rule): rule is DirectedAvoidanceRuleV1 => Boolean(rule));
  const essential = selectedRules.find((rule) => rule.essentialConflict);
  if (essential) {
    return Object.freeze({
      blocked: true,
      customerCopy: `This session can’t run with ${essential.label}. Choose another session.`,
      sceneId: score.sceneId,
      sceneVersion: 1,
      scoreHash: score.scoreHash,
      title: score.title,
      trajectory: score.trajectory,
      durationMs: score.durationMs,
      outputProfile: options.outputProfile,
      hardAvoidanceIds: Object.freeze([...options.hardAvoidanceIds]),
      assets: Object.freeze([]),
      phases: score.phases,
      events: Object.freeze([]),
      texturePairs: Object.freeze([]),
      finalFadeStartMs: score.finalFadeStartMs,
    });
  }
  if (!score.productionEligible && !options.allowContentGatedFixture) {
    return Object.freeze({
      blocked: true,
      customerCopy: score.contentGateCustomerCopy ?? "This session isn’t available in this beta yet.",
      sceneId: score.sceneId,
      sceneVersion: 1,
      scoreHash: score.scoreHash,
      title: score.title,
      trajectory: score.trajectory,
      durationMs: score.durationMs,
      outputProfile: options.outputProfile,
      hardAvoidanceIds: Object.freeze([...options.hardAvoidanceIds]),
      assets: Object.freeze([]),
      phases: score.phases,
      events: Object.freeze([]),
      texturePairs: Object.freeze([]),
      finalFadeStartMs: score.finalFadeStartMs,
    });
  }
  const removals = new Set(selectedRules.flatMap((rule) => [...rule.removeAssetIds]));
  const replacements = Object.assign({}, ...selectedRules.map((rule) => rule.replacements));
  const mapAsset = (assetId: string) => replacements[assetId] ?? assetId;
  const events = score.events
    .filter((scoreEvent) => !removals.has(scoreEvent.assetId) || Boolean(replacements[scoreEvent.assetId]))
    .map((scoreEvent) => Object.freeze({ ...scoreEvent, assetId: mapAsset(scoreEvent.assetId) }));
  const usedIds = new Set(events.map((scoreEvent) => scoreEvent.assetId));
  const assets = score.assets.filter((candidate) => usedIds.has(candidate.assetId));
  const texturePairs = score.texturePairs.filter((pair) => pair.assetIds.every((id) => !removals.has(id) && usedIds.has(id)));
  return Object.freeze({
    blocked: false,
    customerCopy: "Ready to stream. Download for offline listening anytime.",
    sceneId: score.sceneId,
    sceneVersion: 1,
    scoreHash: score.scoreHash,
    title: score.title,
    trajectory: selectedRules.find((rule) => rule.trajectoryOverride)?.trajectoryOverride ?? score.trajectory,
    durationMs: score.durationMs,
    outputProfile: options.outputProfile,
    hardAvoidanceIds: Object.freeze([...options.hardAvoidanceIds]),
    assets: Object.freeze(assets),
    phases: score.phases,
    events: Object.freeze(events),
    texturePairs: Object.freeze(texturePairs),
    finalFadeStartMs: score.finalFadeStartMs,
  });
}

const dbToLinear = (db: number) => 10 ** (db / 20);
const level = (value: number) => Math.max(0, Math.min(2, Math.trunc(value))) as 0 | 1 | 2;

export function resolveDirectedEventV1(
  scoreEvent: Pick<DirectedEventV1, "gain" | "role" | "densityRank" | "timingVariationMs" | "gainVariationDb"> & Partial<Pick<DirectedEventV1, "required">>,
  steering: Readonly<Record<DirectedSteeringAxisV1, number>>,
  outputProfile: DirectedOutputProfileV1,
): Readonly<{ audible: boolean; gain: number; timingVariationMs: number; gainVariationDb: number }> {
  const softer = level(steering.softer);
  const sparser = level(steering.sparser);
  const closer = level(steering.closer);
  const steadier = level(steering.steadier);
  const audible = Boolean(scoreEvent.required)
    || sparser === 0
    || (sparser === 1 ? scoreEvent.densityRank < 3 : scoreEvent.densityRank < 2);
  const timingVariationMs = Math.round(scoreEvent.timingVariationMs * DIRECTED_STEERING_POLICY_V1.steadier.timingVariationMultipliers[steadier]);
  const maximumVariation = DIRECTED_STEERING_POLICY_V1.steadier.gainVariationDb[steadier];
  const gainVariationDb = Math.max(-maximumVariation, Math.min(maximumVariation, scoreEvent.gainVariationDb));
  const closeDb = scoreEvent.role === "foreground"
    ? DIRECTED_STEERING_POLICY_V1.closer.foregroundDb[closer]
    : scoreEvent.role === "bed" || scoreEvent.role === "anchor"
      ? DIRECTED_STEERING_POLICY_V1.closer.anchorDb[closer]
      : 0;
  const profileDb = outputProfile === "speakers"
    ? scoreEvent.role === "bed" || scoreEvent.role === "anchor" ? -1 : scoreEvent.role === "foreground" ? 1.5 : 0
    : 0;
  const raw = scoreEvent.gain
    * DIRECTED_STEERING_POLICY_V1.softer.gainMultipliers[softer]
    * dbToLinear(gainVariationDb + closeDb + profileDb);
  const bounded = Math.min(DIRECTED_STEERING_POLICY_V1.maxLayerGain, raw);
  const gain = audible && !scoreEvent.required ? Math.max(DIRECTED_STEERING_POLICY_V1.minimumOptionalGain, bounded) : bounded;
  return Object.freeze({ audible, gain, timingVariationMs, gainVariationDb });
}

export function getPhaseAtElapsedV1(score: Pick<DirectedSceneScoreV1, "durationMs" | "phases">, playedElapsedMs: number): DirectedPhaseV1 {
  const bounded = Math.max(0, Math.min(score.durationMs - 1, Math.trunc(playedElapsedMs)));
  return score.phases.find((candidate) => bounded >= candidate.startMs && bounded < candidate.endMs) ?? score.phases[score.phases.length - 1];
}

export function formatDirectedTimeV1(valueMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(valueMs / 1_000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
