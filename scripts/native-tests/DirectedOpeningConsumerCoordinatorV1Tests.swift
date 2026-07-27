import Foundation

private enum RegressionFailure: Error, CustomStringConvertible {
  case assertion(String)
  var description: String {
    switch self {
    case let .assertion(message): return message
    }
  }
}

private func require(_ condition: @autoclosure () -> Bool, _ message: String) throws {
  if !condition() { throw RegressionFailure.assertion(message) }
}

private final class ControlledConsumer {
  var seekCompletions: [(Bool) -> Void] = []
  var seekCount = 0
  var audibleCount = 0
  var failures: [DirectedOpeningConsumerFailureV1] = []

  func startSeek(_ completion: @escaping (Bool) -> Void) {
    seekCount += 1
    seekCompletions.append(completion)
  }

  func completeSeek(_ succeeded: Bool) {
    let callbacks = seekCompletions
    seekCompletions.removeAll()
    callbacks.forEach { $0(succeeded) }
  }
}

private func key(_ event: String, generation: Int = 7, layer: String? = nil) -> DirectedOpeningConsumerKeyV1 {
  DirectedOpeningConsumerKeyV1(
    sessionId: "directed:rain-desk-v1:\(generation)",
    generationId: generation,
    eventId: event,
    layerId: layer ?? "directed:\(event)"
  )
}

@main
struct DirectedOpeningConsumerRegressionV1 {
  static func main() throws {
    let coordinator = DirectedOpeningConsumerCoordinatorV1()
    let rain = [ControlledConsumer(), ControlledConsumer()]
    let rainKeys = [key("rain-opening"), key("paper-opening")]

    for index in rain.indices {
      let consumer = rain[index]
      coordinator.begin(
        key: rainKeys[index],
        readiness: .unknown,
        startSeek: consumer.startSeek,
        becomeAudible: { consumer.audibleCount += 1 },
        fail: { consumer.failures.append($0) }
      )
    }

    try require(rain.allSatisfy { $0.seekCount == 0 }, "Rain Desk seek must wait for independently controlled item readiness")
    try require(rain.allSatisfy { $0.audibleCount == 0 }, "Rain Desk play/fade must not begin before readiness and successful seek")

    coordinator.readinessChanged(key: rainKeys[1], readiness: .ready)
    try require(rain[1].seekCount == 1 && rain[0].seekCount == 0, "the second simultaneous opening must seek independently when it becomes ready")
    coordinator.readinessChanged(key: rainKeys[0], readiness: .ready)
    try require(rain[0].seekCount == 1, "the first opening must not serialize behind the second")
    try require(rain.allSatisfy { $0.audibleCount == 0 }, "readiness alone must not start play/fade")

    rain[0].completeSeek(true)
    try require(rain[0].audibleCount == 1 && rain[1].audibleCount == 0, "successful seek completion must activate only its own consumer")
    rain[1].completeSeek(true)
    try require(rain.allSatisfy { $0.audibleCount == 1 }, "both Rain Desk openings must become eligible without waiting for the later score event")

    let stale = ControlledConsumer()
    let staleKey = key("stale-opening", generation: 8)
    coordinator.begin(
      key: staleKey,
      readiness: .ready,
      startSeek: stale.startSeek,
      becomeAudible: { stale.audibleCount += 1 },
      fail: { stale.failures.append($0) }
    )
    coordinator.cancel(key: staleKey)
    stale.completeSeek(true)
    try require(stale.audibleCount == 0, "a late seek callback must not revive a cancelled/replaced generation")

    let failed = ControlledConsumer()
    let failedKey = key("failed-opening", generation: 9)
    coordinator.begin(
      key: failedKey,
      readiness: .unknown,
      startSeek: failed.startSeek,
      becomeAudible: { failed.audibleCount += 1 },
      fail: { failed.failures.append($0) }
    )
    coordinator.readinessChanged(key: failedKey, readiness: .failed)
    try require(failed.failures == [.itemFailed] && failed.audibleCount == 0, "item readiness failure must fail truthfully without audible activation")

    let seekFailed = ControlledConsumer()
    let seekFailedKey = key("seek-failed-opening", generation: 10)
    coordinator.begin(
      key: seekFailedKey,
      readiness: .ready,
      startSeek: seekFailed.startSeek,
      becomeAudible: { seekFailed.audibleCount += 1 },
      fail: { seekFailed.failures.append($0) }
    )
    seekFailed.completeSeek(false)
    try require(seekFailed.failures == [.seekFailed] && seekFailed.audibleCount == 0, "failed seek must remain inaudible and fail closed")

    let timedOut = ControlledConsumer()
    let timedOutKey = key("timed-out-opening", generation: 11)
    coordinator.begin(
      key: timedOutKey,
      readiness: .unknown,
      startSeek: timedOut.startSeek,
      becomeAudible: { timedOut.audibleCount += 1 },
      fail: { timedOut.failures.append($0) }
    )
    coordinator.timeout(key: timedOutKey)
    coordinator.readinessChanged(key: timedOutKey, readiness: .ready)
    try require(timedOut.failures == [.timedOut] && timedOut.seekCount == 0 && timedOut.audibleCount == 0, "timeout must fence later readiness and remain inaudible")

    let requiredFailure = ControlledConsumer()
    let requiredFailureKey = key("required-opening", generation: 12)
    var acceptedPlaybackProjected = false
    coordinator.begin(
      key: requiredFailureKey,
      readiness: .failed,
      startSeek: requiredFailure.startSeek,
      becomeAudible: { acceptedPlaybackProjected = true },
      fail: { requiredFailure.failures.append($0) }
    )
    try require(!acceptedPlaybackProjected && requiredFailure.failures == [.itemFailed], "required opening failure must not project accepted audible playback")

    let replacedOld = ControlledConsumer()
    let replacedNew = ControlledConsumer()
    let replacementEvent = "replacement-opening"
    let replacedOldKey = key(replacementEvent, generation: 13, layer: "directed:old-texture")
    let replacedNewKey = key(replacementEvent, generation: 13, layer: "directed:new-texture")
    coordinator.begin(
      key: replacedOldKey,
      readiness: .ready,
      startSeek: replacedOld.startSeek,
      becomeAudible: { replacedOld.audibleCount += 1 },
      fail: { replacedOld.failures.append($0) }
    )
    coordinator.cancel(key: replacedOldKey)
    coordinator.begin(
      key: replacedNewKey,
      readiness: .ready,
      startSeek: replacedNew.startSeek,
      becomeAudible: { replacedNew.audibleCount += 1 },
      fail: { replacedNew.failures.append($0) }
    )
    replacedOld.completeSeek(true)
    replacedNew.completeSeek(true)
    try require(replacedOld.audibleCount == 0 && replacedNew.audibleCount == 1, "late callback must not revive a replaced consumer")

    let stoppedConsumers = [ControlledConsumer(), ControlledConsumer()]
    let stoppedKeys = [key("stop-a", generation: 14), key("stop-b", generation: 14)]
    for index in stoppedConsumers.indices {
      let consumer = stoppedConsumers[index]
      coordinator.begin(
        key: stoppedKeys[index],
        readiness: .ready,
        startSeek: consumer.startSeek,
        becomeAudible: { consumer.audibleCount += 1 },
        fail: { consumer.failures.append($0) }
      )
    }
    coordinator.cancelAll()
    stoppedConsumers.forEach { $0.completeSeek(true) }
    try require(stoppedConsumers.allSatisfy { $0.audibleCount == 0 }, "late callbacks must not revive a stopped session")

    for controlName in ["porcelain-opening", "wardrobe-opening"] {
      let control = ControlledConsumer()
      let controlKey = key(controlName, generation: 15)
      coordinator.begin(
        key: controlKey,
        readiness: .ready,
        startSeek: control.startSeek,
        becomeAudible: { control.audibleCount += 1 },
        fail: { control.failures.append($0) }
      )
      try require(control.audibleCount == 0, "\(controlName) must retain the same readiness/seek ordering")
      control.completeSeek(true)
      try require(control.audibleCount == 1 && control.failures.isEmpty, "\(controlName) control must activate after successful seek")
    }

    print("DirectedOpeningConsumerRegressionV1 GREEN: two simultaneous Rain Desk openings, independent readiness/seek, timeout/failure fencing, cancellation/replacement, required-failure projection, and both controls")
  }
}
