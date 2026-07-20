export const EVIDENCE_STORAGE_KEY = "soundscape.catalogEvidence.v1" as const;
export const EVIDENCE_STORE_VERSION = 1 as const;
export type PersistedEvidenceLifecycleState = "candidate" | "quarantine" | "evidence_incomplete" | "qc_pending" | "approved" | "legacy_active_pending_evidence" | "active_metadata_only" | "active_mobile_playback" | "restricted" | "retired" | "rejected";
export type EvidenceStoreV1 = Readonly<{ version: 1; records: readonly Readonly<{ catalogIdentity: string; lifecycleState: PersistedEvidenceLifecycleState }>[] }>;
export type EvidencePersistenceError = Readonly<{ code: "invalid_evidence_data" | "unsupported_evidence_version"; consumerMessage: string; developerDetail: string }>;
export type EvidenceDecodeResult = Readonly<{ ok: true; value: EvidenceStoreV1 }> | Readonly<{ ok: false; error: EvidencePersistenceError }>;
const lifecycleStates = new Set<PersistedEvidenceLifecycleState>(["candidate", "quarantine", "evidence_incomplete", "qc_pending", "approved", "legacy_active_pending_evidence", "active_metadata_only", "active_mobile_playback", "restricted", "retired", "rejected"]);
const invalid = (developerDetail: string): EvidenceDecodeResult => Object.freeze({ ok: false, error: Object.freeze({ code: "invalid_evidence_data", consumerMessage: "Catalog review data could not be loaded. Please try again.", developerDetail }) });
export const createEmptyEvidenceStore = (): EvidenceStoreV1 => Object.freeze({ version: 1, records: Object.freeze([]) });
export const serializeEvidenceStore = (store: EvidenceStoreV1): string => JSON.stringify({ version: store.version, records: [...store.records].sort((a, b) => a.catalogIdentity.localeCompare(b.catalogIdentity)) });
export const deserializeEvidenceStore = (raw: string): EvidenceDecodeResult => {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !("version" in parsed) || typeof (parsed as any).version !== "number") return invalid("missing numeric version");
    if ((parsed as any).version !== 1) return Object.freeze({ ok: false, error: Object.freeze({ code: "unsupported_evidence_version", consumerMessage: "Catalog review data could not be loaded. Please update the app or try again.", developerDetail: `unsupported version ${(parsed as any).version}` }) });
    if (!Array.isArray((parsed as any).records)) return invalid("records must be an array");
    const ids = new Set<string>();
    const records: { catalogIdentity: string; lifecycleState: PersistedEvidenceLifecycleState }[] = [];
    for (const [index, candidate] of (parsed as any).records.entries()) {
      if (!candidate || typeof candidate !== "object" || typeof candidate.catalogIdentity !== "string" || !candidate.catalogIdentity.trim()) return invalid(`record ${index} has invalid catalogIdentity`);
      if (!lifecycleStates.has(candidate.lifecycleState)) return invalid(`record ${index} has invalid lifecycleState`);
      if (ids.has(candidate.catalogIdentity)) return invalid(`record ${index} duplicates catalogIdentity ${candidate.catalogIdentity}`);
      ids.add(candidate.catalogIdentity);
      records.push(Object.freeze({ catalogIdentity: candidate.catalogIdentity, lifecycleState: candidate.lifecycleState }));
    }
    return Object.freeze({ ok: true, value: Object.freeze({ version: 1, records: Object.freeze(records.sort((a, b) => a.catalogIdentity.localeCompare(b.catalogIdentity))) }) });
  } catch (error) {
    return invalid(error instanceof Error ? error.message : "unknown decode error");
  }
};
export const migrateEvidenceStore = (raw: string | null): EvidenceDecodeResult => raw === null ? Object.freeze({ ok: true, value: createEmptyEvidenceStore() }) : deserializeEvidenceStore(raw);
