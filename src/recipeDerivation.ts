export type RecipeSurface = "Builder" | "Fast";
export type RecipePolicy = "required" | "allowed-after-acknowledgement" | "forbidden";

export type RecipeTriggerContractEntry = {
  trigger: string;
  policy: RecipePolicy;
  surface?: RecipeSurface | "Both";
  note: string;
};

export const recipeTriggerContract: RecipeTriggerContractEntry[] = [
  { trigger: "Fast chip/query/avoidance change", policy: "required", surface: "Fast", note: "A chip is an explicit Fast search in the accepted UX; derive once after acknowledgement." },
  { trigger: "Find sounds", policy: "required", surface: "Fast", note: "Explicit Fast request; derive Fast once after acknowledgement." },
  { trigger: "display Fast best/alternatives", policy: "allowed-after-acknowledgement", surface: "Fast", note: "Store the one result requested by the chip/search; display and later playback reuse it." },
  { trigger: "Start Fast best", policy: "forbidden", surface: "Both", note: "Reuse the displayed result; playback commands never generate." },
  { trigger: "Start Fast alternative", policy: "forbidden", surface: "Both", note: "The selected alternative already requested/stored its Fast result." },
  { trigger: "select curated preset", policy: "forbidden", surface: "Both", note: "Curated layers are fixed." },
  { trigger: "Preview curated preset", policy: "forbidden", surface: "Both", note: "Curated layers are fixed." },
  { trigger: "Use curated preset", policy: "forbidden", surface: "Both", note: "Curated layers are fixed." },
  { trigger: "change Builder Mood", policy: "required", surface: "Builder", note: "Explicit Builder generation input." },
  { trigger: "change Builder Layers", policy: "required", surface: "Builder", note: "Explicit Builder generation input." },
  { trigger: "Try another", policy: "required", surface: "Builder", note: "Explicit Builder or Fast request; the handler names the single surface." },
  { trigger: "Use this mix", policy: "forbidden", surface: "Both", note: "Reuse the stored Builder result." },
  { trigger: "current session/selected sound change", policy: "forbidden", surface: "Both", note: "Session state cannot invalidate generated results." },
  { trigger: "play/pause/resume/replay/stop/seek/loop/Timer", policy: "forbidden", surface: "Both", note: "Transport and timing commands never generate." },
  { trigger: "quick feedback publication", policy: "forbidden", surface: "Both", note: "Preferences apply to the next explicit request." },
  { trigger: "route/tab navigation", policy: "forbidden", surface: "Both", note: "Navigation cannot generate." },
  { trigger: "saved-session start/resume", policy: "forbidden", surface: "Both", note: "Saved definitions are reused." },
  { trigger: "catalog/filter/preference change", policy: "forbidden", surface: "Both", note: "Catalog UI and preference publication cannot regenerate current results." },
];

type TraceEvent = {
  type: "RECIPE_REQUEST" | "RECIPE_DERIVE_START" | "RECIPE_DERIVE_END" | "RECIPE_RESULT_STORED" | "RECIPE_RESULT_STALE" | "RECIPE_DERIVE_FORBIDDEN_PATH_VIOLATION" | "RECIPE_DUPLICATE_BLOCKED";
  surface: RecipeSurface | "Both";
  action: string;
  reason: string;
  inputRevision: number;
  requestRevision: number;
  durationMillis?: number;
};

type RecipeRequest<TResult> = {
  surface: RecipeSurface;
  action: string;
  reason: string;
  inputRevision: number;
  inputKey: string;
  acknowledge: (requestRevision: number) => void;
  derive: () => TResult;
  store: (result: TResult, requestRevision: number) => void;
};

type RecipeDerivationCoordinatorOptions = {
  requestFrame: (callback: () => void) => void;
  postTask: (callback: () => void) => void;
  onTrace?: (event: TraceEvent) => void;
  now?: () => number;
};

type PendingRequest = {
  requestRevision: number;
  inputKey: string;
};

export class RecipeDerivationCoordinator {
  private requestRevision = 0;
  private readonly pending = new Map<RecipeSurface, PendingRequest>();
  private readonly requestFrame: (callback: () => void) => void;
  private readonly postTask: (callback: () => void) => void;
  private readonly onTrace: (event: TraceEvent) => void;
  private readonly now: () => number;

  constructor(options: RecipeDerivationCoordinatorOptions) {
    this.requestFrame = options.requestFrame;
    this.postTask = options.postTask;
    this.onTrace = options.onTrace ?? (() => undefined);
    this.now = options.now ?? Date.now;
  }

  request<TResult>(request: RecipeRequest<TResult>): { accepted: boolean; requestRevision: number } {
    const currentPending = this.pending.get(request.surface);
    if (currentPending?.inputKey === request.inputKey) {
      this.onTrace({
        type: "RECIPE_DUPLICATE_BLOCKED",
        surface: request.surface,
        action: request.action,
        reason: request.reason,
        inputRevision: request.inputRevision,
        requestRevision: currentPending.requestRevision,
      });
      return { accepted: false, requestRevision: currentPending.requestRevision };
    }

    this.requestRevision += 1;
    const requestRevision = this.requestRevision;
    this.pending.set(request.surface, { requestRevision, inputKey: request.inputKey });
    request.acknowledge(requestRevision);
    this.onTrace({
      type: "RECIPE_REQUEST",
      surface: request.surface,
      action: request.action,
      reason: request.reason,
      inputRevision: request.inputRevision,
      requestRevision,
    });

    this.requestFrame(() => {
      this.postTask(() => {
        const pendingAtStart = this.pending.get(request.surface);
        if (pendingAtStart?.requestRevision !== requestRevision) {
          this.onTrace({
            type: "RECIPE_RESULT_STALE",
            surface: request.surface,
            action: request.action,
            reason: request.reason,
            inputRevision: request.inputRevision,
            requestRevision,
          });
          return;
        }

        const startedAt = this.now();
        this.onTrace({
          type: "RECIPE_DERIVE_START",
          surface: request.surface,
          action: request.action,
          reason: request.reason,
          inputRevision: request.inputRevision,
          requestRevision,
        });
        const result = request.derive();
        const durationMillis = this.now() - startedAt;
        this.onTrace({
          type: "RECIPE_DERIVE_END",
          surface: request.surface,
          action: request.action,
          reason: request.reason,
          inputRevision: request.inputRevision,
          requestRevision,
          durationMillis,
        });

        const pendingAtStore = this.pending.get(request.surface);
        if (pendingAtStore?.requestRevision !== requestRevision) {
          this.onTrace({
            type: "RECIPE_RESULT_STALE",
            surface: request.surface,
            action: request.action,
            reason: request.reason,
            inputRevision: request.inputRevision,
            requestRevision,
            durationMillis,
          });
          return;
        }
        this.pending.delete(request.surface);
        request.store(result, requestRevision);
        this.onTrace({
          type: "RECIPE_RESULT_STORED",
          surface: request.surface,
          action: request.action,
          reason: request.reason,
          inputRevision: request.inputRevision,
          requestRevision,
          durationMillis,
        });
      });
    });
    return { accepted: true, requestRevision };
  }

  cancel(surface: RecipeSurface): void {
    this.pending.delete(surface);
  }

  forbid(action: string, surface: RecipeSurface | "Both" = "Both"): void {
    this.onTrace({
      type: "RECIPE_DERIVE_FORBIDDEN_PATH_VIOLATION",
      surface,
      action,
      reason: "forbidden-playback-or-reuse-path",
      inputRevision: -1,
      requestRevision: this.requestRevision,
    });
  }
}
