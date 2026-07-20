import { mobileCatalogSounds, type MobileCatalogSound } from "../mobileSoundContract";
import { librarySoundMetadataV1, type BuilderRole, type LibrarySoundMetadataV1 } from "../librarySoundMetadata";

export type { MobileCatalogSound } from "../mobileSoundContract";
export const CATALOG_CONTRACT_VERSION = "2" as const;
export const CATALOG_SCHEMA_VERSION = "2" as const;
export type CatalogRevisionV2 = `soundscape-catalog-v2:${number}:${number}`;
export type EvidenceState = "unknown" | "not_applicable" | "review_required" | "supported";
export type TriggerFamilyId =
  | "rain_water" | "fan_air_room_tone" | "noise_colors" | "nature_forest_fire"
  | "paper_pages_writing_typing" | "fabric_cloth" | "tapping_object_handling" | "scratching"
  | "brushing_mic_brushing" | "hair_scalp_personal_attention" | "crinkle_packaging"
  | "spray_bottle_liquid" | "keyboard_desk_study" | "mouth_sounds" | "eating_chewing"
  | "whisper_soft_spoken" | "binaural_spatial_ear_to_ear" | "resonant_tone_drone"
  | "pulse_rhythm" | "personal_attention_intimate" | "mechanical_object" | "unknown";
export type MaterialId = "water" | "air" | "paper" | "fabric" | "wood" | "glass" | "metal" | "plastic" | "natural_environment" | "electronic_device" | "resonant_object" | "mixed" | "unknown" | "not_applicable";
export type ActionId = "flow" | "rainfall" | "hum" | "write" | "type" | "turn_pages" | "rub" | "tap" | "handle" | "scratch" | "brush" | "crinkle" | "spray" | "strike" | "pulse" | "ambient" | "whisper" | "speak" | "unknown" | "not_applicable";
export type SpatialMode = "mono" | "stereo" | "binaural" | "ear_to_ear" | "unknown";
export type VoiceSpeechPresence = "no_speech" | "voice_present" | "speech_present" | "unknown";
export type VoiceModality = "none" | "whisper" | "soft_spoken" | "other" | "unknown";
export type LifecycleState = "active" | "held" | "blocked" | "revoked" | "deprecated";
export type CatalogDeliveryRightsV1 = Readonly<{
  bundledAllowed: boolean;
  cacheAllowed: boolean;
  persistentDownloadAllowed: boolean;
  streamingAllowed: boolean;
  redistributionAllowed: boolean;
  attributionRequired: boolean;
  offlineEligibilityReason: string;
  offlineEligibilityVersion: "1";
}>;

export type TriggerFamilyPolicy = Readonly<{
  id: TriggerFamilyId;
  label: string;
  canEverBeDefaultSafe: boolean;
  requiresExplicitChoice: boolean;
  neverAutoplay: boolean;
  warningCategories: readonly string[];
  consentCategories: readonly string[];
  prerequisites: readonly string[];
  futureOnly: boolean;
  headphoneGuidanceRequiresAssetEvidence: boolean;
}>;

const policy = (
  id: TriggerFamilyId, label: string, canEverBeDefaultSafe = true,
  options: Partial<Omit<TriggerFamilyPolicy, "id" | "label" | "canEverBeDefaultSafe">> = {},
): TriggerFamilyPolicy => Object.freeze({
  id, label, canEverBeDefaultSafe,
  requiresExplicitChoice: false, neverAutoplay: false, warningCategories: [], consentCategories: [],
  prerequisites: ["provenance_review", "audio_qc_review"], futureOnly: false,
  headphoneGuidanceRequiresAssetEvidence: false, ...options,
});

const sensitivePolicy = (id: TriggerFamilyId, label: string): TriggerFamilyPolicy => policy(id, label, false, {
  requiresExplicitChoice: true,
  neverAutoplay: true,
  warningCategories: ["surprising_close_mic_content", "misophonia_sensitive"],
  consentCategories: ["explicit_user_choice", "reviewed_content_warning"],
  prerequisites: ["provenance_review", "performer_review", "voice_speech_review", "consent_review", "age_policy_decision", "audio_qc_review"],
  futureOnly: true,
  headphoneGuidanceRequiresAssetEvidence: true,
});

export const triggerFamilyPolicies: Readonly<Record<TriggerFamilyId, TriggerFamilyPolicy>> = Object.freeze({
  rain_water: policy("rain_water", "Rain and water"),
  fan_air_room_tone: policy("fan_air_room_tone", "Fan, air, and room tone"),
  noise_colors: policy("noise_colors", "Noise colors"),
  nature_forest_fire: policy("nature_forest_fire", "Nature, forest, and fire ambience"),
  paper_pages_writing_typing: policy("paper_pages_writing_typing", "Paper, pages, and writing"),
  fabric_cloth: policy("fabric_cloth", "Fabric and cloth"),
  tapping_object_handling: policy("tapping_object_handling", "Tapping and object handling"),
  scratching: policy("scratching", "Scratching"),
  brushing_mic_brushing: policy("brushing_mic_brushing", "Brushing and microphone brushing"),
  hair_scalp_personal_attention: policy("hair_scalp_personal_attention", "Hair, scalp, and non-speech personal attention", true, { requiresExplicitChoice: true, neverAutoplay: true, warningCategories: ["personal_attention_style"], prerequisites: ["provenance_review", "performer_review", "audio_qc_review"] }),
  crinkle_packaging: policy("crinkle_packaging", "Crinkles, plastic, foil, and packaging"),
  spray_bottle_liquid: policy("spray_bottle_liquid", "Spray, bottle, and liquid handling"),
  keyboard_desk_study: policy("keyboard_desk_study", "Keyboard, desk, and study"),
  mouth_sounds: sensitivePolicy("mouth_sounds", "Mouth sounds"),
  eating_chewing: sensitivePolicy("eating_chewing", "Eating and chewing"),
  whisper_soft_spoken: policy("whisper_soft_spoken", "Whisper and soft-spoken", false, {
    requiresExplicitChoice: true,
    neverAutoplay: true,
    warningCategories: ["surprising_close_mic_content", "misophonia_sensitive"],
    consentCategories: ["explicit_user_choice", "reviewed_content_warning"],
    prerequisites: ["provenance_review", "performer_review", "voice_speech_review", "consent_review", "age_policy_decision", "audio_qc_review"],
    futureOnly: false,
    headphoneGuidanceRequiresAssetEvidence: true,
  }),
  binaural_spatial_ear_to_ear: policy("binaural_spatial_ear_to_ear", "Binaural, spatial, and ear-to-ear", false, { requiresExplicitChoice: true, neverAutoplay: true, prerequisites: ["recording_method_evidence", "channel_qc_review", "provenance_review"], futureOnly: true, headphoneGuidanceRequiresAssetEvidence: true }),
  resonant_tone_drone: policy("resonant_tone_drone", "Resonant bowls, tones, and drones", true, { requiresExplicitChoice: true, neverAutoplay: true, warningCategories: ["prominent_tone"], prerequisites: ["frequency_measurement_when_labeled", "provenance_review", "audio_qc_review"] }),
  pulse_rhythm: policy("pulse_rhythm", "Pulse and rhythm", true, { requiresExplicitChoice: true, neverAutoplay: true, warningCategories: ["rhythmic_pulse"], futureOnly: true }),
  personal_attention_intimate: sensitivePolicy("personal_attention_intimate", "Intimate personal attention"),
  mechanical_object: policy("mechanical_object", "Mechanical and object sounds"),
  unknown: policy("unknown", "Unknown", false, { requiresExplicitChoice: true, neverAutoplay: true, futureOnly: true }),
});

export type CatalogSoundV2 = Readonly<{
  id: string;
  schemaVersion: typeof CATALOG_SCHEMA_VERSION;
  catalogRevision: CatalogRevisionV2;
  migration: Readonly<{ sourceSchema: "library-metadata-v1"; ruleRevision: "catalog-v2-migration-1"; overrides: readonly string[] }>;
  display: Readonly<{ title: string; description: string }>;
  taxonomy: Readonly<{ useCaseIntentIds: readonly string[]; triggerFamilyIds: readonly TriggerFamilyId[]; materialIds: readonly MaterialId[]; actionIds: readonly ActionId[] }>;
  roleEligibility: Readonly<{ backgroundBed: boolean; texture: boolean; accentFoley: boolean; foregroundVoice: boolean; singleUse: boolean; unsupportedRoles: readonly BuilderRole[] }>;
  sensory: Readonly<{ traitIds: readonly string[]; intensity: LibrarySoundMetadataV1["intensity"] }>;
  cadence: Readonly<{ eventDensity: "low" | "medium" | "high" | "unknown"; rhythm: "steady" | "irregular" | "non_rhythmic" | "unknown" }>;
  repetition: Readonly<{ continuity: LibrarySoundMetadataV1["continuity"]; loopPolicy: LibrarySoundMetadataV1["loopPolicy"]; reviewState: EvidenceState }>;
  perspective: Readonly<{ microphonePerspective: "close" | "room" | "field" | "unknown"; distance: "near" | "mid" | "far" | "unknown"; spatialMode: SpatialMode; evidence: EvidenceState }>;
  voiceSpeech: Readonly<{ presence: VoiceSpeechPresence; speechType: VoiceModality; language: "not_applicable" | "unknown" | string; performerReview: EvidenceState; consentReview: EvidenceState }>;
  sensitivity: Readonly<{ warningClassIds: readonly string[] }>;
  exposure: Readonly<{ defaultSafe: boolean; explicitChoice: boolean; neverAutoplay: boolean; manualOnly: boolean; warningRequired: boolean; consentRequired: boolean; headphoneGuidance: EvidenceState }>;
  deliveryRights: CatalogDeliveryRightsV1;
  references: Readonly<{
    playbackAsset: Readonly<{ status: "referenced" | "metadata_only" | "blocked"; soundId: string }>;
    durationPlatform: Readonly<{ status: EvidenceState; durationSeconds: number | null; mobileEligible: boolean }>;
    loop: Readonly<{ status: EvidenceState; contract: LibrarySoundMetadataV1["loopPolicy"] }>;
    audioQc: Readonly<{ status: "passed_mobile_qc" | "needs_mobile_listening_qc" | "failed_mobile_qc"; reviewReference: EvidenceState }>;
    provenance: Readonly<{ status: "review_required"; reference: null }>;
    license: Readonly<{ status: "needs_review"; reference: null }>;
  }>;
  lifecycle: Readonly<{ state: LifecycleState }>;
  eligibility: Readonly<{ activeMetadata: true; mobilePlayable: boolean; heldOrBlocked: boolean }>;
  compatibility: Readonly<{ metadata: LibrarySoundMetadataV1; playback: MobileCatalogSound | null }>;
}>;

export type AutomaticExposureCandidate = Pick<CatalogSoundV2, "taxonomy" | "exposure" | "lifecycle" | "eligibility">;
export const canEnterAutomaticExposure = (candidate: AutomaticExposureCandidate): boolean =>
  candidate.lifecycle.state === "active"
  && candidate.eligibility.activeMetadata
  && candidate.exposure.defaultSafe
  && !candidate.exposure.explicitChoice
  && !candidate.exposure.neverAutoplay
  && !candidate.exposure.manualOnly
  && candidate.taxonomy.triggerFamilyIds.every((id) => {
    const familyPolicy = triggerFamilyPolicies[id];
    return familyPolicy.canEverBeDefaultSafe
      && !familyPolicy.requiresExplicitChoice
      && !familyPolicy.neverAutoplay
      && !familyPolicy.futureOnly;
  });

const includesAny = (values: readonly string[], needles: readonly string[]) => needles.some((needle) => values.includes(needle));
const normalizedFacts = (metadata: LibrarySoundMetadataV1) => [metadata.primaryLane, metadata.subcategory, metadata.mobileTitle, ...metadata.sensoryQualities, ...metadata.avoidanceTags].map((value) => value.toLowerCase().replace(/[ /-]+/g, "_"));

const mapTriggerFamilies = (metadata: LibrarySoundMetadataV1): readonly TriggerFamilyId[] => {
  if (metadata.id === "bulk4-016-ziplock-bag-crackle") return ["crinkle_packaging"];
  const facts = normalizedFacts(metadata);
  if (includesAny(facts, ["rain", "water", "river", "stream", "creek", "ocean", "drips", "liquid"])) return ["rain_water"];
  if (includesAny(facts, ["fan", "fan_air_room", "airflow", "room_tone", "hum"])) return ["fan_air_room_tone"];
  if (includesAny(facts, ["noise", "white_noise", "pink_noise", "brown_noise"])) return ["noise_colors"];
  if (includesAny(facts, ["paper", "pages", "page", "writing", "pencil", "pen"])) return ["paper_pages_writing_typing"];
  if (includesAny(facts, ["keyboard", "typing", "desk", "study"])) return ["keyboard_desk_study"];
  if (includesAny(facts, ["fabric", "cloth", "clothing", "rustle"])) return ["fabric_cloth"];
  if (includesAny(facts, ["brush", "brushing", "mic_brushing"])) return ["brushing_mic_brushing"];
  if (includesAny(facts, ["scratch", "scratching"])) return ["scratching"];
  if (includesAny(facts, ["crinkle", "crackling", "plastic", "foil", "packaging"])) return ["crinkle_packaging"];
  if (includesAny(facts, ["tap", "tapping", "object", "handling"])) return ["tapping_object_handling"];
  if (includesAny(facts, ["bowl", "tone", "drone", "frequency", "hz"])) return ["resonant_tone_drone"];
  if (includesAny(facts, ["forest", "nature", "fire", "fire_crackle", "crickets", "birds", "wind"])) return ["nature_forest_fire"];
  if (includesAny(facts, ["mechanical", "motor", "machine"])) return ["mechanical_object"];
  return ["unknown"];
};

const mapMaterials = (metadata: LibrarySoundMetadataV1, families: readonly TriggerFamilyId[]): readonly MaterialId[] => {
  if (metadata.id === "bulk4-016-ziplock-bag-crackle") return ["plastic"];
  const facts = normalizedFacts(metadata);
  const mapped: MaterialId[] = [];
  for (const [id, terms] of [["water", ["water", "rain", "river", "stream", "creek"]], ["paper", ["paper", "page", "writing"]], ["fabric", ["fabric", "cloth", "clothing"]], ["wood", ["wood", "wooden"]], ["glass", ["glass"]], ["metal", ["metal", "metallic"]], ["plastic", ["plastic", "ziplock"]], ["electronic_device", ["keyboard", "typing"]], ["resonant_object", ["bowl", "bell", "chime"]]] as const) if (includesAny(facts, terms)) mapped.push(id);
  if (mapped.length) return [...new Set(mapped)];
  if (families.includes("fan_air_room_tone") || families.includes("noise_colors")) return ["air"];
  if (families.includes("nature_forest_fire")) return ["natural_environment"];
  return ["unknown"];
};

const mapActions = (metadata: LibrarySoundMetadataV1, families: readonly TriggerFamilyId[]): readonly ActionId[] => {
  if (metadata.id === "bulk4-016-ziplock-bag-crackle") return ["crinkle"];
  const facts = normalizedFacts(metadata);
  const mapped: ActionId[] = [];
  for (const [id, terms] of [["rainfall", ["rain", "rainfall"]], ["flow", ["flow", "flowing", "river", "stream", "creek"]], ["hum", ["hum", "fan", "airflow", "noise"]], ["write", ["write", "writing", "pencil", "pen"]], ["type", ["type", "typing", "keyboard"]], ["turn_pages", ["page", "pages", "page_turning"]], ["rub", ["rub", "rustle", "fabric"]], ["tap", ["tap", "tapping"]], ["handle", ["handling", "object"]], ["scratch", ["scratch", "scratching"]], ["brush", ["brush", "brushing"]], ["crinkle", ["crinkle", "crackling", "plastic"]], ["spray", ["spray"]], ["strike", ["bowl", "bell", "chime"]]] as const) if (includesAny(facts, terms)) mapped.push(id);
  if (mapped.length) return [...new Set(mapped)];
  if (families.includes("nature_forest_fire")) return ["ambient"];
  return ["unknown"];
};

export const migrateCatalogV1ToV2 = (
  metadataRows: readonly LibrarySoundMetadataV1[], playbackRows: readonly MobileCatalogSound[],
): readonly CatalogSoundV2[] => {
  const revision: CatalogRevisionV2 = `soundscape-catalog-v2:${metadataRows.length}:${playbackRows.length}`;
  const playbackById = new Map(playbackRows.map((row) => [row.id, row]));
  return Object.freeze(metadataRows.map((metadata) => {
    const playback = playbackById.get(metadata.id) ?? null;
    const triggerFamilyIds = mapTriggerFamilies(metadata);
    const materialIds = mapMaterials(metadata, triggerFamilyIds);
    const actionIds = mapActions(metadata, triggerFamilyIds);
    const heldOrBlocked = metadata.licenseSourceConfidence === "blocked" || metadata.appSafeUrlStatus === "blocked" || metadata.mobileQcStatus === "failed_mobile_qc";
    const lifecycle: LifecycleState = heldOrBlocked ? "blocked" : "active";
    const explicitChoice = metadata.userChoiceOnly;
    const presence: VoiceSpeechPresence = metadata.contentSafetyFlags.speechPresent ? "speech_present" : metadata.contentSafetyFlags.voicePresent ? "voice_present" : "no_speech";
    const roleMap = { background: metadata.builderRole === "background", texture: metadata.builderRole === "texture", accent: metadata.builderRole === "accent" };
    const unsupportedRoles = (["background", "texture", "accent"] as BuilderRole[]).filter((role) => !roleMap[role]);
    const row: CatalogSoundV2 = {
      id: metadata.id, schemaVersion: CATALOG_SCHEMA_VERSION, catalogRevision: revision,
      migration: { sourceSchema: "library-metadata-v1", ruleRevision: "catalog-v2-migration-1", overrides: metadata.id === "bulk4-016-ziplock-bag-crackle" ? ["ziplock-crinkle-truth-v1"] : [] },
      display: { title: metadata.mobileTitle, description: metadata.mobileSubtitle },
      taxonomy: { useCaseIntentIds: [metadata.primaryLane.toLowerCase().replace(/[ /]+/g, "_")], triggerFamilyIds, materialIds, actionIds },
      roleEligibility: { backgroundBed: roleMap.background, texture: roleMap.texture, accentFoley: roleMap.accent, foregroundVoice: false, singleUse: true, unsupportedRoles },
      sensory: { traitIds: [...metadata.sensoryQualities], intensity: metadata.intensity },
      cadence: { eventDensity: metadata.intensity === "soft" ? "low" : metadata.intensity === "strong" ? "high" : "medium", rhythm: metadata.continuity === "continuous" ? "steady" : metadata.continuity === "sequence" || metadata.continuity === "one_shot" ? "irregular" : "unknown" },
      repetition: { continuity: metadata.continuity, loopPolicy: metadata.loopPolicy, reviewState: metadata.loopPolicy === "not_reviewed" || metadata.continuity === "unknown_review_needed" ? "review_required" : "supported" },
      perspective: { microphonePerspective: "unknown", distance: "unknown", spatialMode: "unknown", evidence: "review_required" },
      voiceSpeech: { presence, speechType: presence === "no_speech" ? "none" : "unknown", language: presence === "no_speech" ? "not_applicable" : "unknown", performerReview: "review_required", consentReview: presence === "no_speech" ? "not_applicable" : "review_required" },
      sensitivity: { warningClassIds: [...(metadata.contentSafetyFlags.harshSpikeRisk ? ["harsh_spike_risk"] : []), ...(explicitChoice ? ["explicit_choice"] : [])] },
      exposure: { defaultSafe: !explicitChoice && !heldOrBlocked, explicitChoice, neverAutoplay: explicitChoice || heldOrBlocked, manualOnly: explicitChoice || heldOrBlocked, warningRequired: metadata.clearLabelRequired || explicitChoice, consentRequired: explicitChoice, headphoneGuidance: "unknown" },
      deliveryRights: {
        bundledAllowed: false,
        cacheAllowed: false,
        persistentDownloadAllowed: false,
        streamingAllowed: false,
        redistributionAllowed: false,
        attributionRequired: false,
        offlineEligibilityReason: "Legacy catalog migration requires evidence-backed rights review before enabling delivery rights.",
        offlineEligibilityVersion: "1",
      },
      references: {
        playbackAsset: { status: heldOrBlocked ? "blocked" : playback ? "referenced" : "metadata_only", soundId: metadata.id },
        durationPlatform: { status: playback ? "supported" : "review_required", durationSeconds: playback?.durationSeconds ?? null, mobileEligible: playback?.playable === true && !heldOrBlocked },
        loop: { status: metadata.loopPolicy === "not_reviewed" ? "review_required" : "supported", contract: metadata.loopPolicy },
        audioQc: { status: metadata.mobileQcStatus, reviewReference: metadata.mobileQcStatus === "passed_mobile_qc" ? "supported" : "review_required" },
        provenance: { status: "review_required", reference: null }, license: { status: "needs_review", reference: null },
      },
      lifecycle: { state: lifecycle },
      eligibility: { activeMetadata: true, mobilePlayable: playback?.playable === true && !heldOrBlocked, heldOrBlocked },
      compatibility: { metadata, playback },
    };
    return Object.freeze(row);
  }));
};

export const validateCatalogV2 = (rows: readonly CatalogSoundV2[]): readonly string[] => {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const row of rows) {
    if (ids.has(row.id)) errors.push(`${row.id}: duplicate stable ID`); ids.add(row.id);
    for (const family of row.taxonomy.triggerFamilyIds) if (!triggerFamilyPolicies[family]) errors.push(`${row.id}: unknown trigger family ${family}`);
    if (!row.taxonomy.triggerFamilyIds.length || !row.taxonomy.materialIds.length || !row.taxonomy.actionIds.length) errors.push(`${row.id}: incomplete taxonomy`);
    if ((row.perspective.spatialMode === "binaural" || row.perspective.spatialMode === "ear_to_ear") && row.perspective.evidence !== "supported") errors.push(`${row.id}: spatial claim lacks evidence`);
    if (row.voiceSpeech.presence === "no_speech" && row.voiceSpeech.language !== "not_applicable") errors.push(`${row.id}: no-speech language must be not_applicable`);
    if (row.exposure.neverAutoplay && row.exposure.defaultSafe) errors.push(`${row.id}: never-autoplay cannot be default-safe`);
    if (row.exposure.defaultSafe && !canEnterAutomaticExposure(row)) errors.push(`${row.id}: default exposure conflicts with family policy`);
    if (row.lifecycle.state !== "active" && (row.exposure.defaultSafe || row.eligibility.mobilePlayable)) errors.push(`${row.id}: held/blocked content is eligible`);
    if (row.references.license.status !== "needs_review" || row.references.provenance.status !== "review_required") errors.push(`${row.id}: M3 evidence boundary violated`);
  }
  return Object.freeze(errors);
};

export type CatalogProtectedCounts = Readonly<{ defaultSafe: number; userChoice: number; activeMetadata: number; mobilePlayback: number }>;
export interface CatalogRepositoryV2 {
  readonly contractVersion: typeof CATALOG_CONTRACT_VERSION;
  readonly revision: CatalogRevisionV2;
  getById(id: string): CatalogSoundV2 | null;
  enumerate(): readonly CatalogSoundV2[];
  getMetadata(): readonly LibrarySoundMetadataV1[];
  getPlaybackRows(): readonly MobileCatalogSound[];
  getDefaultSafe(): readonly CatalogSoundV2[];
  getUserChoice(): readonly CatalogSoundV2[];
  getMobilePlayable(): readonly CatalogSoundV2[];
  getMetadataOnly(): readonly CatalogSoundV2[];
  getByTriggerFamily(id: TriggerFamilyId): readonly CatalogSoundV2[];
  getByWarningClass(id: string): readonly CatalogSoundV2[];
  getValidationErrors(): readonly string[];
  getProtectedCounts(): CatalogProtectedCounts;
  getCompatibilityProjection(): Readonly<{ metadata: readonly LibrarySoundMetadataV1[]; playback: readonly MobileCatalogSound[] }>;
}

class InMemoryCatalogRepositoryV2 implements CatalogRepositoryV2 {
  readonly contractVersion = CATALOG_CONTRACT_VERSION;
  readonly revision: CatalogRevisionV2;
  private readonly sounds: readonly CatalogSoundV2[];
  private readonly byId: ReadonlyMap<string, CatalogSoundV2>;
  private readonly validationErrors: readonly string[];
  constructor(private readonly metadataRows: readonly LibrarySoundMetadataV1[], private readonly playbackRows: readonly MobileCatalogSound[]) {
    this.revision = `soundscape-catalog-v2:${metadataRows.length}:${playbackRows.length}`;
    this.sounds = migrateCatalogV1ToV2(metadataRows, playbackRows);
    this.byId = new Map(this.sounds.map((sound) => [sound.id, sound]));
    this.validationErrors = validateCatalogV2(this.sounds);
    if (this.validationErrors.length) throw new Error(`Invalid Catalog Contract v2: ${this.validationErrors.join("; ")}`);
  }
  getById(id: string) { return this.byId.get(id) ?? null; }
  enumerate() { return this.sounds; }
  getMetadata() { return this.metadataRows; }
  getPlaybackRows() { return this.playbackRows; }
  getDefaultSafe() { return this.sounds.filter(canEnterAutomaticExposure); }
  getUserChoice() { return this.sounds.filter((sound) => sound.exposure.explicitChoice); }
  getMobilePlayable() { return this.sounds.filter((sound) => sound.eligibility.mobilePlayable); }
  getMetadataOnly() { return this.sounds.filter((sound) => sound.compatibility.playback === null); }
  getByTriggerFamily(id: TriggerFamilyId) { return this.sounds.filter((sound) => sound.taxonomy.triggerFamilyIds.includes(id)); }
  getByWarningClass(id: string) { return this.sounds.filter((sound) => sound.sensitivity.warningClassIds.includes(id)); }
  getValidationErrors() { return this.validationErrors; }
  getProtectedCounts(): CatalogProtectedCounts { return Object.freeze({ defaultSafe: this.getDefaultSafe().length, userChoice: this.getUserChoice().length, activeMetadata: this.sounds.length, mobilePlayback: this.getMobilePlayable().length }); }
  getCompatibilityProjection() { return Object.freeze({ metadata: this.metadataRows, playback: this.playbackRows }); }
}

export const catalogRepository: CatalogRepositoryV2 = new InMemoryCatalogRepositoryV2(librarySoundMetadataV1, mobileCatalogSounds);
export const mobileCatalogSoundsV1: MobileCatalogSound[] = [...catalogRepository.getCompatibilityProjection().playback];
export const defaultMobileCatalogSoundV1 = mobileCatalogSoundsV1[0];
export const mobileCatalogLanesV1 = Array.from(new Set(mobileCatalogSoundsV1.map((sound) => sound.lane)));
