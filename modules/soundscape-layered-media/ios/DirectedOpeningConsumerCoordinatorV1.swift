import Foundation

struct DirectedOpeningConsumerKeyV1: Hashable {
  let sessionId: String
  let generationId: Int
  let eventId: String
  let layerId: String
}

enum DirectedOpeningConsumerReadinessV1: Equatable {
  case unknown
  case ready
  case failed
}

enum DirectedOpeningConsumerFailureV1: Equatable {
  case itemFailed
  case seekFailed
  case timedOut
}

/// Production ordering authority for one independently prepared Directed event consumer.
/// The coordinator is AVFoundation-free so the causal readiness/seek/cancellation contract
/// can be exercised deterministically while IOSLayeredMediaEngine remains the sole player owner.
final class DirectedOpeningConsumerCoordinatorV1 {
  private enum Phase {
    case awaitingReadiness
    case seeking
  }

  private struct Pending {
    var readiness: DirectedOpeningConsumerReadinessV1
    var phase: Phase
    let startSeek: (@escaping (Bool) -> Void) -> Void
    let becomeAudible: () -> Void
    let fail: (DirectedOpeningConsumerFailureV1) -> Void
  }

  private var pending: [DirectedOpeningConsumerKeyV1: Pending] = [:]

  func begin(
    key: DirectedOpeningConsumerKeyV1,
    readiness: DirectedOpeningConsumerReadinessV1,
    startSeek: @escaping (@escaping (Bool) -> Void) -> Void,
    becomeAudible: @escaping () -> Void,
    fail: @escaping (DirectedOpeningConsumerFailureV1) -> Void
  ) {
    pending[key] = Pending(
      readiness: readiness,
      phase: .awaitingReadiness,
      startSeek: startSeek,
      becomeAudible: becomeAudible,
      fail: fail
    )
    advance(key: key)
  }

  func readinessChanged(key: DirectedOpeningConsumerKeyV1, readiness: DirectedOpeningConsumerReadinessV1) {
    guard var state = pending[key], state.phase == .awaitingReadiness else { return }
    state.readiness = readiness
    pending[key] = state
    advance(key: key)
  }

  func timeout(key: DirectedOpeningConsumerKeyV1) {
    guard let state = pending.removeValue(forKey: key) else { return }
    state.fail(.timedOut)
  }

  func cancel(key: DirectedOpeningConsumerKeyV1) {
    pending.removeValue(forKey: key)
  }

  func cancelAll() {
    pending.removeAll()
  }

  func contains(_ key: DirectedOpeningConsumerKeyV1) -> Bool {
    pending[key] != nil
  }

  private func advance(key: DirectedOpeningConsumerKeyV1) {
    guard var state = pending[key], state.phase == .awaitingReadiness else { return }
    switch state.readiness {
    case .unknown:
      return
    case .failed:
      pending.removeValue(forKey: key)
      state.fail(.itemFailed)
    case .ready:
      state.phase = .seeking
      pending[key] = state
      state.startSeek { [weak self] succeeded in
        self?.seekCompleted(key: key, succeeded: succeeded)
      }
    }
  }

  private func seekCompleted(key: DirectedOpeningConsumerKeyV1, succeeded: Bool) {
    guard let state = pending[key], state.phase == .seeking else { return }
    pending.removeValue(forKey: key)
    if succeeded {
      state.becomeAudible()
    } else {
      state.fail(.seekFailed)
    }
  }
}
