export function getFiniteSeekPositionMillis(
  locationX: number,
  trackWidth: number,
  durationMillis: number,
): number | null {
  if (
    !Number.isFinite(locationX)
    || !Number.isFinite(trackWidth)
    || trackWidth <= 0
    || !Number.isFinite(durationMillis)
    || durationMillis <= 0
  ) {
    return null;
  }
  const seekRatio = locationX / trackWidth;
  if (!Number.isFinite(seekRatio)) {
    return null;
  }
  const positionMillis = Math.round(durationMillis * Math.min(1, Math.max(0, seekRatio)));
  return Number.isFinite(positionMillis) ? positionMillis : null;
}
