import { m6CatalogExpansionV1, type M6LocalCatalogIdentity } from "./m6CatalogExpansionV1";

export type M6ProtectedDiscoveryEntry = Readonly<{
  identity: M6LocalCatalogIdentity;
  manualOnly: boolean;
  neverAutoplay: boolean;
  explicitChoiceRequired: boolean;
  activationEligible: boolean;
}>;

export const m6ProtectedDiscoveryIndexV1: readonly M6ProtectedDiscoveryEntry[] = Object.freeze(
  m6CatalogExpansionV1.map((identity) => Object.freeze({
    identity,
    manualOnly: identity.manualOnly,
    neverAutoplay: identity.neverAutoplay,
    explicitChoiceRequired: identity.manualOnly,
    activationEligible: identity.activationEligible,
  })),
);

export const discoverM6ActiveManualCatalog = (
  choiceGranted: boolean,
): readonly M6LocalCatalogIdentity[] => Object.freeze(
  m6ProtectedDiscoveryIndexV1
    .filter((entry) => entry.activationEligible && entry.manualOnly && choiceGranted)
    .map((entry) => entry.identity),
);

export const discoverM6ActiveDefaultSafeCatalog = (): readonly M6LocalCatalogIdentity[] => Object.freeze(
  m6ProtectedDiscoveryIndexV1
    .filter((entry) => entry.activationEligible && !entry.manualOnly)
    .map((entry) => entry.identity),
);

export const assertM6NeverEntersAutomaticExposure = (): boolean =>
  m6ProtectedDiscoveryIndexV1.every((entry) =>
    !entry.manualOnly || (entry.explicitChoiceRequired && entry.neverAutoplay),
  );
