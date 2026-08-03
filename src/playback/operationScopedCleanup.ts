export type OperationScopedCleanupRequest<Resource> = Readonly<{
  resources: readonly Resource[];
  cleanupResource: (resource: Resource, index: number) => Promise<void>;
  isCurrent: () => boolean;
  projectCurrent: () => void;
}>;

/**
 * Always retires the detached resources, but publishes cleanup state only when
 * the initiating operation still owns the visible session after every await.
 */
export const runOperationScopedCleanup = async <Resource>(
  request: OperationScopedCleanupRequest<Resource>,
): Promise<boolean> => {
  await Promise.all(
    request.resources.map((resource, index) => request.cleanupResource(resource, index)),
  );
  if (!request.isCurrent()) {
    return false;
  }
  request.projectCurrent();
  return true;
};

export type PortableClassicPlaybackResourceV1 = Readonly<{
  getStatusAsync: () => Promise<{ isLoaded: boolean }>;
  stopAsync: () => Promise<unknown>;
  unloadAsync: () => Promise<unknown>;
}>;

const retireClassicPlaybackResourceForPortableReplacementV1 = async (
  resource: PortableClassicPlaybackResourceV1,
): Promise<void> => {
  const failures: unknown[] = [];
  let isLoaded: boolean | null = null;
  try {
    isLoaded = (await resource.getStatusAsync()).isLoaded;
  } catch (error: unknown) {
    failures.push(error);
  }
  if (isLoaded === true) {
    try {
      await resource.stopAsync();
    } catch (error: unknown) {
      failures.push(error);
    }
  }
  if (isLoaded !== false) {
    try {
      await resource.unloadAsync();
    } catch (error: unknown) {
      failures.push(error);
    }
  }
  if (failures.length) {
    throw new AggregateError(failures, "Classic playback resource could not be retired safely.");
  }
};

/**
 * Portable import/reset is destructive authority replacement, not best-effort
 * navigation cleanup. Every captured Classic resource must settle, and any
 * unconfirmed status/stop/unload boundary rejects the replacement.
 */
export const retireClassicPlaybackResourcesForPortableReplacementV1 = async (
  resources: readonly PortableClassicPlaybackResourceV1[],
): Promise<void> => {
  const results = await Promise.allSettled(
    resources.map(retireClassicPlaybackResourceForPortableReplacementV1),
  );
  const failures = results
    .filter((result): result is PromiseRejectedResult => result.status === "rejected")
    .map((result) => result.reason);
  if (failures.length) {
    throw new AggregateError(failures, "Classic playback authority could not be fenced safely.");
  }
};
