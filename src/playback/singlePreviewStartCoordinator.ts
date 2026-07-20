export type SinglePreviewSingleFlightCoordinator = {
  run<T>(key: string, task: (token: number) => Promise<T>): Promise<T>;
  isCurrent(token: number): boolean;
};

export type SinglePreviewStartRequest<PreparedSource> = {
  key: string;
  select: () => void | Promise<void>;
  prepare: () => Promise<PreparedSource>;
  start: (
    preparedSource: PreparedSource,
    isCurrent: () => boolean,
  ) => Promise<boolean>;
  isSelectedCurrent: () => boolean;
};

export function runSinglePreviewStart<PreparedSource>(
  coordinator: SinglePreviewSingleFlightCoordinator,
  request: SinglePreviewStartRequest<PreparedSource>,
): Promise<boolean> {
  return coordinator.run(request.key, async (token) => {
    const isCurrent = () =>
      coordinator.isCurrent(token) && request.isSelectedCurrent();

    await request.select();
    if (!isCurrent()) return false;

    const preparedSource = await request.prepare();
    if (!isCurrent()) return false;

    const started = await request.start(preparedSource, isCurrent);
    return Boolean(started && isCurrent());
  });
}
