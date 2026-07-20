export type QuickFeedbackState = "neutral" | "up" | "down";
export type QuickFeedbackDirection = "up" | "down";

export type QuickFeedbackPersistenceWork<T> = {
  revision: number;
  value: T;
};

export type KeyedAfterPaintWork<T> = QuickFeedbackPersistenceWork<T> & {
  key: string;
};

type LatestKeyedAfterPaintQueueOptions<T> = {
  requestFrame: (callback: () => void) => unknown;
  postTask: (callback: () => void) => unknown;
  onReady: (work: KeyedAfterPaintWork<T>) => void;
};

type LatestIntentPersistenceQueueOptions<T> = {
  persist: (work: QuickFeedbackPersistenceWork<T>) => Promise<void>;
  onCommitted: (work: QuickFeedbackPersistenceWork<T>, isLatest: boolean) => void;
  onFailed: (work: QuickFeedbackPersistenceWork<T>, error: unknown, isLatest: boolean) => void;
};

export function getNextQuickFeedbackState(
  currentState: QuickFeedbackState,
  direction: QuickFeedbackDirection,
): QuickFeedbackState {
  return currentState === direction ? "neutral" : direction;
}

export function getQuickFeedbackMessage(
  currentState: QuickFeedbackState,
  direction: QuickFeedbackDirection,
): "Feedback recorded." | "Feedback changed." | "Feedback cleared." {
  if (currentState === direction) return "Feedback cleared.";
  if (currentState === "neutral") return "Feedback recorded.";
  return "Feedback changed.";
}

export class LatestKeyedAfterPaintQueue<T> {
  private pendingByKey = new Map<string, KeyedAfterPaintWork<T>>();
  private frameScheduled = false;

  constructor(private readonly options: LatestKeyedAfterPaintQueueOptions<T>) {}

  enqueue(work: KeyedAfterPaintWork<T>): void {
    const pending = this.pendingByKey.get(work.key);
    if (pending && pending.revision > work.revision) return;
    this.pendingByKey.set(work.key, work);
    if (this.frameScheduled) return;

    this.frameScheduled = true;
    this.options.requestFrame(() => {
      this.options.postTask(() => {
        this.frameScheduled = false;
        const ready = [...this.pendingByKey.values()]
          .sort((left, right) => left.revision - right.revision);
        this.pendingByKey.clear();
        for (const item of ready) this.options.onReady(item);
        if (this.pendingByKey.size > 0 && !this.frameScheduled) {
          const next = [...this.pendingByKey.values()][0];
          if (next) this.enqueue(next);
        }
      });
    });
  }
}

export class LatestIntentPersistenceQueue<T> {
  private latestRevision = 0;
  private pendingWork: QuickFeedbackPersistenceWork<T> | null = null;
  private running = false;
  private idleResolvers: Array<() => void> = [];

  constructor(private readonly options: LatestIntentPersistenceQueueOptions<T>) {}

  enqueue(work: QuickFeedbackPersistenceWork<T>): void {
    if (work.revision < this.latestRevision) return;
    this.latestRevision = work.revision;
    this.pendingWork = work;
    void this.drain();
  }

  whenIdle(): Promise<void> {
    if (!this.running && !this.pendingWork) return Promise.resolve();
    return new Promise((resolve) => this.idleResolvers.push(resolve));
  }

  private async drain(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      while (this.pendingWork) {
        const work = this.pendingWork;
        this.pendingWork = null;
        try {
          await this.options.persist(work);
          this.options.onCommitted(work, work.revision === this.latestRevision);
        } catch (error) {
          this.options.onFailed(work, error, work.revision === this.latestRevision);
        }
      }
    } finally {
      this.running = false;
      const resolvers = this.idleResolvers.splice(0);
      for (const resolve of resolvers) resolve();
    }
  }
}
