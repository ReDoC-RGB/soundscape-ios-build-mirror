import type { MobileCatalogSound } from "./mobileSoundContract";

const clampPlaybackVolume = (volume: number): number => Math.min(1, Math.max(0, Number(volume.toFixed(3))));

export function getLayerPlaybackVolume(baseVolume: number, sound: MobileCatalogSound): number {
  return clampPlaybackVolume(baseVolume * (sound.layerMixGain ?? 1));
}

export function isLayeredLoopEligible(sounds: Array<Pick<MobileCatalogSound, "loopEligible">>): boolean {
  return sounds.length > 0 && sounds.every((sound) => sound.loopEligible);
}
