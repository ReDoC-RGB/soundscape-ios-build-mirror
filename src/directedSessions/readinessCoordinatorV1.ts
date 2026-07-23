export const DIRECTED_CUSTOMER_READINESS_EXPECTATION_MS = 1_500 as const;

export type DirectedRemoteFreshnessStatusV1 = "reachable" | "unreachable" | "timeout";
export type DirectedRemoteFreshnessResultV1 = Readonly<{
  status: DirectedRemoteFreshnessStatusV1;
  current: boolean;
}>;

export function projectDirectedRemoteFreshnessAvailabilityV1<T extends Readonly<{ offlineReady: boolean }>>(
  stable: T,
  unreachable: T,
  status: DirectedRemoteFreshnessStatusV1,
): T {
  return status === "unreachable" && !stable.offlineReady ? unreachable : stable;
}

type TimerHandleV1 = ReturnType<typeof setTimeout>;

export function createDirectedReadinessCoordinatorV1<T>(input: Readonly<{
  loadStable: () => Promise<T>;
  probeRemote: (uri: string, signal: AbortSignal) => Promise<boolean>;
  schedule?: (callback: () => void, timeoutMs: number) => TimerHandleV1;
  cancel?: (handle: TimerHandleV1) => void;
  timeoutMs?: number;
}>) {
  const schedule = input.schedule ?? ((callback, timeoutMs) => setTimeout(callback, timeoutMs));
  const cancel = input.cancel ?? clearTimeout;
  const timeoutMs = input.timeoutMs ?? DIRECTED_CUSTOMER_READINESS_EXPECTATION_MS;
  let epoch = 0;
  let stable: T | null = null;
  let stableInFlight: Promise<T> | null = null;
  type RemoteEntryV1 = Readonly<{
    controller: AbortController;
    epoch: number;
    promise: Promise<DirectedRemoteFreshnessResultV1>;
  }>;
  const remoteInFlight = new Map<string, RemoteEntryV1>();

  const restoreStable = (): Promise<T> => {
    if (stableInFlight) return stableInFlight;
    const requestEpoch = epoch;
    const pending = input.loadStable().then((value) => {
      if (epoch === requestEpoch) stable = value;
      return value;
    }).finally(() => {
      if (stableInFlight === pending) stableInFlight = null;
    });
    stableInFlight = pending;
    return pending;
  };

  const refreshRemote = (uri: string): Promise<DirectedRemoteFreshnessResultV1> => {
    const existing = remoteInFlight.get(uri);
    if (existing?.epoch === epoch) return existing.promise;
    const requestEpoch = epoch;
    const controller = new AbortController();
    let timeoutHandle: TimerHandleV1 | null = null;
    const timeout = new Promise<DirectedRemoteFreshnessStatusV1>((resolve) => {
      timeoutHandle = schedule(() => {
        controller.abort();
        resolve("timeout");
      }, timeoutMs);
    });
    const probe = input.probeRemote(uri, controller.signal)
      .then((reachable): DirectedRemoteFreshnessStatusV1 => reachable ? "reachable" : "unreachable")
      .catch((): DirectedRemoteFreshnessStatusV1 => controller.signal.aborted ? "timeout" : "unreachable");
    let entry: RemoteEntryV1;
    const pending = Promise.race([probe, timeout]).then((status) => Object.freeze({
      status,
      current: epoch === requestEpoch,
    })).finally(() => {
      if (timeoutHandle !== null) cancel(timeoutHandle);
      if (remoteInFlight.get(uri) === entry) remoteInFlight.delete(uri);
    });
    entry = Object.freeze({ controller, epoch: requestEpoch, promise: pending });
    remoteInFlight.set(uri, entry);
    return pending;
  };

  return Object.freeze({
    restoreStable,
    refreshRemote,
    currentStable: (): T | null => stable,
    supersede: () => {
      epoch += 1;
      stable = null;
      stableInFlight = null;
      for (const entry of remoteInFlight.values()) entry.controller.abort();
      remoteInFlight.clear();
    },
  });
}
