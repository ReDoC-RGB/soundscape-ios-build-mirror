export const ACTIVATION_ELIGIBILITY_VERSION = "1" as const;

export type ActivationGateEvidenceV1 = Readonly<{
  provenance: boolean;
  rights: boolean;
  technicalQc: boolean;
  sensoryQc: boolean;
  taxonomy: boolean;
  sensitivityExposure: boolean;
  playback: boolean;
}>;
export type EligibilityInput = Readonly<{
  lifecycleState: string;
  catalogStatus: string;
  migrationClass?: "accepted_legacy_catalog" | "new_candidate";
  sensitiveFamilyRequiresChoice?: boolean;
  explicitSensitiveReviewCompleted?: boolean;
  gateEvidence?: ActivationGateEvidenceV1;
  compatibility: Readonly<{ metadataVisible: boolean; mobilePlayable: boolean; defaultSafe: boolean; choice: boolean; loopEligible: boolean }>;
}>;
export type ActivationEligibilityDecisionV1 = Readonly<{
  metadataVisibility: boolean;
  mobilePlayback: boolean;
  defaultBrowse: boolean;
  choiceBrowse: boolean;
  fast: boolean;
  builder: boolean;
  curatedAutomatic: boolean;
  quickMix: boolean;
  savedRecentRestoration: boolean;
  autoplay: boolean;
  loop: boolean;
  newPlaybackSession: boolean;
  loopEligibilitySource: "legacy_compatibility" | "reviewed_evidence" | "unavailable";
}>;

const inactiveStates = new Set(["candidate", "quarantine", "quarantined", "evidence_incomplete", "qc_pending", "restricted", "retired", "rejected", "revoked"]);
const gatesComplete = (gates: ActivationGateEvidenceV1 | undefined): boolean => !!gates && Object.values(gates).every(Boolean);

export const decideActivationEligibility = (input: EligibilityInput): ActivationEligibilityDecisionV1 => {
  const legacy = input.lifecycleState === "legacy_active_pending_evidence" && input.migrationClass !== "new_candidate";
  const reviewed = (input.lifecycleState === "approved" || input.lifecycleState === "active_metadata_only" || input.lifecycleState === "active_mobile_playback") && gatesComplete(input.gateEvidence);
  const unavailable = inactiveStates.has(input.lifecycleState) || inactiveStates.has(input.catalogStatus);
  const sensitive = input.sensitiveFamilyRequiresChoice === true;
  const sensitiveReviewAllowsPlayback = !sensitive || input.explicitSensitiveReviewCompleted === true;
  const eligibleLifecycle = (legacy || reviewed) && !unavailable;
  const metadataVisibility = eligibleLifecycle && input.compatibility.metadataVisible;
  const mobilePlayback = eligibleLifecycle && sensitiveReviewAllowsPlayback && input.compatibility.mobilePlayable;
  const choiceRequired = sensitive || input.compatibility.choice;
  const automatic = mobilePlayback && !choiceRequired && input.compatibility.defaultSafe;
  return Object.freeze({
    metadataVisibility,
    mobilePlayback,
    defaultBrowse: automatic,
    choiceBrowse: mobilePlayback && choiceRequired,
    fast: automatic,
    builder: automatic,
    curatedAutomatic: automatic,
    quickMix: automatic,
    savedRecentRestoration: mobilePlayback,
    autoplay: automatic,
    loop: mobilePlayback && input.compatibility.loopEligible,
    newPlaybackSession: mobilePlayback,
    loopEligibilitySource: mobilePlayback ? legacy ? "legacy_compatibility" : "reviewed_evidence" : "unavailable",
  });
};

export const resolveHistoricalReference = <T extends EligibilityInput>(
  id: string,
  recordById: Readonly<Record<string, T>>,
): Readonly<{ status: "available"; record: T }> | Readonly<{ status: "unavailable"; consumerMessage: string }> => {
  const record = recordById[id];
  if (record && decideActivationEligibility(record).savedRecentRestoration) return Object.freeze({ status: "available", record });
  return Object.freeze({ status: "unavailable", consumerMessage: "This saved sound is no longer available. Your saved history is still preserved." });
};
