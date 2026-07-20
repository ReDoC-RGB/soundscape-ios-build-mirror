export const FOREGROUND_POSITION_PROJECTION_INTERVAL_MILLIS = 250;

export type AuthoritativePositionProjectionInput = Readonly<{
  authoritativePositionMillis: number;
  authoritativeObservedAtMillis: number;
  nowMillis: number;
  durationMillis: number;
  playing: boolean;
  foreground: boolean;
}>;

const finiteNonNegative = (value: number): number =>
  Number.isFinite(value) ? Math.max(0, value) : 0;

/**
 * Projection only: native Media3/AVPlayer samples remain authoritative.
 * This function cannot issue transport, mutate persisted position, or outlive
 * the caller's playing/foreground lifecycle.
 */
export function projectAuthoritativePositionMillis(
  input: AuthoritativePositionProjectionInput,
): number {
  const authoritativePositionMillis = finiteNonNegative(input.authoritativePositionMillis);
  const durationMillis = finiteNonNegative(input.durationMillis);
  const upperBound = durationMillis > 0 ? durationMillis : authoritativePositionMillis;
  if (!input.playing || !input.foreground) {
    return Math.min(upperBound, authoritativePositionMillis);
  }
  const elapsedMillis = Math.max(
    0,
    finiteNonNegative(input.nowMillis) - finiteNonNegative(input.authoritativeObservedAtMillis),
  );
  return Math.min(upperBound, authoritativePositionMillis + elapsedMillis);
}
