import type { GeneratedRecipe, RecipeLayer } from "./localRecipeEngine";
import type { MobileCatalogSound } from "./mobileSoundContract";

export type TransferredGeneratedRecipeLayer = {
  layer: RecipeLayer;
  catalogSound: MobileCatalogSound;
  volume: number;
};

export type GeneratedRecipeTransferResult =
  | {
      status: "ready";
      layers: TransferredGeneratedRecipeLayer[];
      missingLayers: [];
    }
  | {
      status: "unavailable";
      layers: TransferredGeneratedRecipeLayer[];
      missingLayers: RecipeLayer[];
    };

export function transferGeneratedRecipeLayers(
  recipe: GeneratedRecipe,
  soundById: Map<string, MobileCatalogSound>,
): GeneratedRecipeTransferResult {
  const layers: TransferredGeneratedRecipeLayer[] = [];
  const missingLayers: RecipeLayer[] = [];

  for (const layer of recipe.layers) {
    const catalogSound = soundById.get(layer.soundId);
    if (!catalogSound) {
      missingLayers.push(layer);
      continue;
    }
    layers.push({ layer, catalogSound, volume: layer.volumeDefault });
  }

  if (missingLayers.length > 0) {
    return { status: "unavailable", layers, missingLayers };
  }

  return { status: "ready", layers, missingLayers: [] };
}
