import { mobileUxTokens } from "../mobileUxFoundation";

/**
 * Canonical Classic Soundscape visual authority.
 *
 * Classic surfaces and the Directed Sessions shell import these exact objects so
 * release corrections cannot silently create a second palette or component scale.
 */
export const classicVisualPaletteV1 = Object.freeze({
  midnightOak: "#2E2418",
  candlelight: "#C4935A",
  linen: "#F5F0E8",
  sand: "#E8DCCA",
  walnut: "#7A6A52",
  sageMist: "#C8D4BE",
  dustyRose: "#D8C4BC",
  darkEarth: "#4A3828",
  amberGlow: "#C4935A33",
  forestDeep: "#344830",
});

export const classicVisualThemeV1 = Object.freeze({
  ...classicVisualPaletteV1,
  background: classicVisualPaletteV1.linen,
  surface: classicVisualPaletteV1.sand,
  elevated: "#EFE5D6",
  panelBotanical: classicVisualPaletteV1.amberGlow,
  selectedSurface: classicVisualPaletteV1.amberGlow,
  selectionSurface: classicVisualPaletteV1.darkEarth,
  presetSelectedSurface: "#E4CDA6",
  border: "#D1C1A9",
  borderStrong: classicVisualPaletteV1.darkEarth,
  accentDeep: classicVisualPaletteV1.candlelight,
  accentSeaGlass: classicVisualPaletteV1.candlelight,
  accentSeaGlassSoft: classicVisualPaletteV1.amberGlow,
  accentSand: classicVisualPaletteV1.candlelight,
  accentSandDeep: classicVisualPaletteV1.darkEarth,
  accentMist: classicVisualPaletteV1.darkEarth,
  accentMistSoft: classicVisualPaletteV1.darkEarth,
  accentSage: classicVisualPaletteV1.sageMist,
  accentRose: classicVisualPaletteV1.dustyRose,
  labelText: classicVisualPaletteV1.darkEarth,
  warningSurface: "#F2E4CE",
  dangerText: "#8A3E2E",
  text: classicVisualPaletteV1.midnightOak,
  textOnDark: classicVisualPaletteV1.linen,
  textMuted: classicVisualPaletteV1.walnut,
  textSubtle: classicVisualPaletteV1.walnut,
  inkText: classicVisualPaletteV1.midnightOak,
});

export const classicComponentTokensV1 = mobileUxTokens;
