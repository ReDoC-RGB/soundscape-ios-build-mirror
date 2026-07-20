export type SessionReplacementReady<T> = {
  generation: number;
  current: boolean;
  value: T;
};

export type SessionReplacementOperation<T> = {
  generation: number;
  ready: Promise<SessionReplacementReady<T>>;
  teardown: Promise<void>;
};

export const teardownResourcesConcurrently = async <T>(
  resources: readonly T[],
  teardown: (resource: T, index: number) => Promise<void>,
): Promise<void> => {
  await Promise.all(resources.map((resource, index) => teardown(resource, index)));
};

export class SessionReplacementCoordinator {
  private generation = 0;
  private inFlightKey: string | null = null;

  currentGeneration(): number {
    return this.generation;
  }

  isCurrent(generation: number): boolean {
    return generation === this.generation;
  }

  begin<T>(
    key: string,
    dispatchNewSession: () => Promise<T>,
    teardownOldSession: () => Promise<void>,
  ): SessionReplacementOperation<T> | null {
    if (this.inFlightKey === key) {
      return null;
    }

    const generation = this.generation + 1;
    this.generation = generation;
    this.inFlightKey = key;

    // Both functions are invoked synchronously and in this order. A prepared
    // createAsync/play path therefore reaches native dispatch before old audio
    // teardown can enqueue stop/unload work. Neither promise waits on the other.
    const newSessionPromise = dispatchNewSession();
    const teardown = teardownOldSession().catch(() => undefined);
    const ready = newSessionPromise.then((value) => {
      const current = this.isCurrent(generation);
      if (current && this.inFlightKey === key) {
        this.inFlightKey = null;
      }
      return { generation, current, value };
    }, (error: unknown) => {
      if (this.isCurrent(generation) && this.inFlightKey === key) {
        this.inFlightKey = null;
      }
      throw error;
    });

    return { generation, ready, teardown };
  }
}
