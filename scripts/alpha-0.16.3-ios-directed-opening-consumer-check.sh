#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
coordinator="$root/modules/soundscape-layered-media/ios/DirectedOpeningConsumerCoordinatorV1.swift"
regression="$root/scripts/native-tests/DirectedOpeningConsumerCoordinatorV1Tests.swift"
output="${TMPDIR:-/tmp}/DirectedOpeningConsumerRegressionV1.$$"
trap 'rm -f "$output"' EXIT

if command -v swiftc >/dev/null 2>&1; then
  swiftc "$coordinator" "$regression" -o "$output"
  "$output"
elif command -v docker >/dev/null 2>&1; then
  docker run --rm -v "$root:/repo:ro" -w /tmp swift:5.9-jammy bash -lc \
    'swiftc /repo/modules/soundscape-layered-media/ios/DirectedOpeningConsumerCoordinatorV1.swift /repo/scripts/native-tests/DirectedOpeningConsumerCoordinatorV1Tests.swift -o /tmp/DirectedOpeningConsumerRegressionV1 && /tmp/DirectedOpeningConsumerRegressionV1'
else
  echo "Swift 5.9+ or Docker is required for the finite iOS Directed opening-consumer regression." >&2
  exit 2
fi
