import {
  generateLocalRecipe,
  type GeneratedRecipe,
  type RecipeDensity,
  type RecipeEngineOptions,
  type RecipeEnginePreferenceOptions,
  type RecipeEngineResult,
  type RecipeLayer,
  type RecipeLayerRole,
} from "../localRecipeEngine";
import { type LibrarySoundMetadataV1 } from "../librarySoundMetadata";
import { catalogRepository } from "./catalogContractV2";
import { catalogEvidenceRepository } from "../services/catalogEvidenceReconciliationV1";
import { SoundscapeDomainError } from "./domainErrors";

export const RECOMMENDATION_CONTRACT_VERSION = "1" as const;
export const RECOMMENDATION_ENGINE_VERSION = "local-recipe-engine-v1" as const;
export type RecommendationSource = "Fast" | "Builder";

export type RecommendationRequest = Readonly<{
  contractVersion: typeof RECOMMENDATION_CONTRACT_VERSION;
  requestRevision: number;
  source: RecommendationSource;
  intent?: string;
  query?: string;
  density: RecipeDensity;
  avoidances: readonly string[];
  choiceGrants: readonly string[];
  profileRevision: number;
  profile?: RecipeEnginePreferenceOptions;
  recentHistory: readonly string[];
  seed: string;
  catalogRevision: string;
}>;

export type RecommendationResult = Readonly<{
  contractVersion: typeof RECOMMENDATION_CONTRACT_VERSION;
  requestRevision: number;
  resultId: string;
  engineVersion: typeof RECOMMENDATION_ENGINE_VERSION;
  catalogRevision: string;
  profileRevision: number;
  composition: readonly RecipeLayer[];
  rankedCandidates: readonly RecipeLayer[];
  alternatives: GeneratedRecipe["alternatives"];
  roles: readonly RecipeLayerRole[];
  volumes: readonly number[];
  explanations: readonly string[];
  reasons: readonly string[];
  warnings: readonly string[];
  rejectionSummary?: string;
  rejectionReasons: readonly string[];
  safeSingleFallback: boolean;
}>;

export interface RecommendationService {
  readonly contractVersion: typeof RECOMMENDATION_CONTRACT_VERSION;
  readonly engineVersion: typeof RECOMMENDATION_ENGINE_VERSION;
  recommend(request: RecommendationRequest): RecommendationResult;
  derive(input: RecipeEngineOptions, source: RecommendationSource, requestRevision: number, profileRevision: number, catalogRevision: string): RecipeEngineResult;
}

class LocalRecommendationService implements RecommendationService {
  readonly contractVersion = RECOMMENDATION_CONTRACT_VERSION;
  readonly engineVersion = RECOMMENDATION_ENGINE_VERSION;
  constructor(private readonly library: readonly LibrarySoundMetadataV1[]) {}

  recommend(request: RecommendationRequest): RecommendationResult {
    const engineResult = this.derive({
      intent: request.intent ?? request.query,
      density: request.density,
      avoidanceTags: [...request.avoidances],
      allowUserChoice: request.choiceGrants.length > 0,
      requestedOptInTags: [...request.choiceGrants],
      seed: request.seed,
      recentSoundIds: [...request.recentHistory],
      preferences: request.profile,
    }, request.source, request.requestRevision, request.profileRevision, request.catalogRevision);
    return this.toContractResult(request, engineResult);
  }

  derive(
    input: RecipeEngineOptions,
    _source: RecommendationSource,
    _requestRevision: number,
    _profileRevision: number,
    _catalogRevision: string,
  ): RecipeEngineResult {
    try {
      return generateLocalRecipe(input, this.library as LibrarySoundMetadataV1[]);
    } catch (cause) {
      throw new SoundscapeDomainError(
        "recommendation",
        "RECOMMENDATION_UNAVAILABLE",
        "We could not prepare that soundscape. Please try again.",
        { cause },
      );
    }
  }

  private toContractResult(request: RecommendationRequest, result: RecipeEngineResult): RecommendationResult {
    const recipe = result.bestRecipe;
    const alternatives = recipe?.alternatives ?? {};
    const rankedCandidates = (["bed", "texture", "accent"] as RecipeLayerRole[])
      .flatMap((role) => alternatives[role] ?? []);
    const composition = recipe?.layers ?? [];
    const warnings = recipe?.warnings ?? result.warnings;
    return Object.freeze({
      contractVersion: RECOMMENDATION_CONTRACT_VERSION,
      requestRevision: request.requestRevision,
      resultId: recipe?.id ?? `no-result:${request.source}:${request.requestRevision}:${request.seed}`,
      engineVersion: RECOMMENDATION_ENGINE_VERSION,
      catalogRevision: request.catalogRevision,
      profileRevision: request.profileRevision,
      composition,
      rankedCandidates,
      alternatives,
      roles: composition.map((layer) => layer.role),
      volumes: composition.map((layer) => layer.volumeDefault),
      explanations: recipe?.whyThisRecipe ?? [],
      reasons: composition.map((layer) => layer.reason),
      warnings,
      rejectionSummary: result.rejectedReasonSummary,
      rejectionReasons: result.rejectedReasonSummary ? [result.rejectedReasonSummary] : [],
      safeSingleFallback: composition.length === 1 && warnings.some((warning) => warning.includes("safer single sound")),
    });
  }
}

const recommendationEligibleIds = new Set(catalogEvidenceRepository.getMobilePlaybackProjection().map((sound) => sound.id));
export const recommendationService: RecommendationService = new LocalRecommendationService(
  catalogRepository.getMobilePlayable().filter((sound) => recommendationEligibleIds.has(sound.id)).map((sound) => sound.compatibility.metadata),
);

export type {
  GeneratedRecipe,
  RecipeDensity,
  RecipeEngineOptions,
  RecipeEnginePreferenceOptions,
  RecipeEngineResult,
  RecipeLayer,
  RecipeLayerRole,
};
