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
