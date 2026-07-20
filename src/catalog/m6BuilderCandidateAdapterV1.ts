import type { BuilderSessionLayer } from "../builderSessionModelV1";
import type { M6LocalCatalogIdentity } from "./m6CatalogExpansionV1";

export const createM6BuilderCandidate = (identity: M6LocalCatalogIdentity): BuilderSessionLayer => Object.freeze({
  layerId: `m6:${identity.builderRole}:${identity.id}`,
  role: identity.builderRole,
  soundId: identity.id,
  title: identity.title,
  volume: identity.builderRole === "texture" ? 0.18 : 0.1,
  enabled: true,
  userChoiceOnly: identity.manualOnly,
  reason: identity.builderRole === "texture" ? "truthful traditional-ASMR texture" : "truthful traditional-ASMR accent",
  roleEligible: true,
  gate: Object.freeze({
    lifecycleState: identity.activationEligible ? "active" : identity.lifecycleState,
    mobilePlayable: identity.activationEligible,
    rightsAllowed: true,
    technicalQcAllowed: true,
    sensoryQcAllowed: true,
    activationAllowed: identity.activationEligible,
    manualOnly: identity.manualOnly,
    explicitChoice: identity.manualOnly,
    warning: identity.warningRequired ? `${identity.title} requires explicit Choice and a clear sensitivity label.` : null,
  }),
});
