import Foundation

/// Platform-neutral boundary used by the production iOS runtime and by the exact-source
/// qualification. AVPlayer remains behind this adapter; restart ownership and inventory do not.
protocol DirectedRestartRuntimeAdapterV1: AnyObject {
  var directedAvailableLayerIdsV1: Set<String> { get }
  var directedCurrentSnapshotV1: DirectedSchedulerSnapshotV1? { get }
  func preflightDirectedStartV1(_ action: DirectedSchedulerActionV1) throws
  func clearDirectedRuntimeForReplacementV1()
  func executeDirectedRestartStartV1(
    _ action: DirectedSchedulerActionV1,
    completion: @escaping (Bool) -> Void
  )
  func executeDirectedRuntimeActionV1(_ action: DirectedSchedulerActionV1)
  func cleanupDirectedRuntimeAfterFailureV1()
  func directedRestartRuntimeDidFailV1()
}

enum DirectedRestartRuntimeConsumeResultV1: Equatable {
  case consumed
  case committed
  case rejectedStale
  case failureCleanup
}

struct DirectedRestartRuntimeInventoryV1: Equatable {
  let activeEvents: [String: String]
  let callbackKinds: [String: Int]
  let pendingCallbackCount: Int
  let pendingFadeCount: Int
  let pendingFutureCount: Int
  let pendingWakeCount: Int
  let pendingRestartActivationCount: Int
  let pendingRestartTrailingActionCount: Int
  let terminalFadeExecutions: Int
  let completionExecutions: Int
  let failureCleanupExecutions: Int
  let committedRestartRequestId: String?
  let committedSuccessorPhaseRevision: Int?
}

private final class DirectedPendingRestartRuntimeV1 {
  let id = UUID()
  let commit: DirectedRestartCommitV1
  var activationFence: DirectedRuntimeFenceV1
  var remainingStartKeys: Set<String>
  let trailingActions: [DirectedSchedulerActionV1]

  init(plan: DirectedRestartRuntimePlanV1, startKeys: Set<String>, activationFence: DirectedRuntimeFenceV1) {
    commit = plan.commit
    self.activationFence = activationFence
    remainingStartKeys = startKeys
    trailingActions = plan.trailingActions
  }
}

private func directedRestartStartKeyV1(_ action: DirectedSchedulerActionV1) -> String? {
  guard let eventId = action.eventId, let layerId = action.layerId else { return nil }
  return "\(eventId)\u{0}\(layerId)"
}

/// The exact production consumer invoked by SoundscapeLayeredMediaModule.consumeDirectedActions.
/// It owns replacement preflight/commit, runtime event identity, asynchronous token inventory,
/// terminal/completion uniqueness counters, and owner/generation/request/transport fences.
final class DirectedRestartRuntimeConsumerV1 {
  private weak var adapter: DirectedRestartRuntimeAdapterV1?
  private var activeEvents: [String: String] = [:]
  private var callbackTokens: [UUID: (kind: String, fence: DirectedRuntimeFenceV1)] = [:]
  private var wakeToken: (id: UUID, fence: DirectedRuntimeFenceV1, futurePending: Bool)?
  private var pendingRestart: DirectedPendingRestartRuntimeV1?
  private var terminalFadeExecutions = 0
  private var completionExecutions = 0
  private var failureCleanupExecutions = 0
  private var committedRestart: DirectedRestartCommitV1?

  init(adapter: DirectedRestartRuntimeAdapterV1) {
    self.adapter = adapter
  }

  @discardableResult
  func consume(
    actions: [DirectedSchedulerActionV1],
    commit: DirectedRestartCommitV1?,
    injectFailureAtEventId: String? = nil
  ) -> DirectedRestartRuntimeConsumeResultV1 {
    guard let adapter else { return .rejectedStale }
    guard actions.contains(where: { $0.type == .restartPhase }) else {
      if let pending = pendingRestart,
        adapter.directedCurrentSnapshotV1.map(directedRuntimeFenceV1) != pending.activationFence {
        pendingRestart = nil
        adapter.cleanupDirectedRuntimeAfterFailureV1()
      }
      actions.forEach { execute($0, adapter: adapter) }
      return .consumed
    }

    do {
      let plan = try prepareDirectedRestartRuntimePlanV1(
        actions: actions,
        commit: commit,
        availableLayerIds: adapter.directedAvailableLayerIdsV1,
        injectFailureAtEventId: injectFailureAtEventId
      )
      guard let plan else { return .consumed }

      // Every opening/player operation is proven available before old runtime is touched.
      try plan.startActions.forEach(adapter.preflightDirectedStartV1)
      guard let currentSnapshot = adapter.directedCurrentSnapshotV1,
        directedRestartFenceMatchesV1(plan.commit, currentSnapshot) else {
        return .rejectedStale
      }
      let startKeys = Set(try plan.startActions.map { action -> String in
        guard let key = directedRestartStartKeyV1(action) else { throw DirectedRestartRuntimeErrorV1.missingIdentity }
        return key
      })

      // One replacement critical section: token/event authority is cleared before the adapter
      // clears AVPlayer/opening resources. Trailing work remains transaction-owned until every
      // real opening reports success after becoming active.
      resetRuntimeState(preserveFailureCount: true)
      committedRestart = plan.commit
      adapter.clearDirectedRuntimeForReplacementV1()
      let pending = DirectedPendingRestartRuntimeV1(
        plan: plan,
        startKeys: startKeys,
        activationFence: directedRuntimeFenceV1(currentSnapshot)
      )
      pendingRestart = pending

      if plan.startActions.isEmpty {
        pendingRestart = nil
        plan.trailingActions.forEach { execute($0, adapter: adapter) }
      } else {
        for action in plan.startActions {
          guard pendingRestart?.id == pending.id else { break }
          adapter.executeDirectedRestartStartV1(action) { [weak self] success in
            self?.completeDirectedRestartStartV1(
              action: action,
              transactionId: pending.id,
              success: success
            )
          }
        }
      }
      return .committed
    } catch {
      performFailureCleanupV1(adapter: adapter)
      return .failureCleanup
    }
  }

  private func completeDirectedRestartStartV1(
    action: DirectedSchedulerActionV1,
    transactionId: UUID,
    success: Bool
  ) {
    guard let adapter, let pending = pendingRestart, pending.id == transactionId else { return }
    guard adapter.directedCurrentSnapshotV1.map(directedRuntimeFenceV1) == pending.activationFence else {
      pendingRestart = nil
      return
    }
    guard let key = directedRestartStartKeyV1(action), pending.remainingStartKeys.contains(key) else { return }

    guard success,
      let eventId = action.eventId,
      let layerId = action.layerId,
      activeEvents[eventId] == layerId
    else {
      pendingRestart = nil
      performFailureCleanupV1(adapter: adapter)
      return
    }

    pending.remainingStartKeys.remove(key)
    guard pending.remainingStartKeys.isEmpty else { return }
    pendingRestart = nil
    pending.trailingActions.forEach { execute($0, adapter: adapter) }
  }

  private func performFailureCleanupV1(adapter: DirectedRestartRuntimeAdapterV1) {
    resetRuntimeState(preserveFailureCount: true)
    failureCleanupExecutions += 1
    adapter.cleanupDirectedRuntimeAfterFailureV1()
    adapter.directedRestartRuntimeDidFailV1()
  }

  /// Pause/resume/interruption may supersede transport identity while the same committed
  /// phase replacement is still opening. Rebase only within the same owner, phase, and path;
  /// terminal or structurally newer state must invalidate the pending reconstruction.
  @discardableResult
  func rebasePendingRestartTransport(snapshot: DirectedSchedulerSnapshotV1) -> Bool {
    guard let pending = pendingRestart,
      snapshot.owner.sessionId == pending.commit.sessionId,
      snapshot.owner.generationId == pending.commit.generationId,
      snapshot.phaseIndex == pending.commit.phaseIndex,
      snapshot.phaseRevision == pending.commit.successorPhaseRevision,
      snapshot.pathRevision == pending.commit.pathRevision,
      [.playing, .paused, .interrupted].contains(snapshot.transport)
    else { return false }
    pending.activationFence = directedRuntimeFenceV1(snapshot)
    return true
  }

  private func execute(_ action: DirectedSchedulerActionV1, adapter: DirectedRestartRuntimeAdapterV1) {
    if action.type == .terminalFade { terminalFadeExecutions += 1 }
    if action.type == .stopAll {
      pendingRestart = nil
      if action.detail == "directed_completed" { completionExecutions += 1 }
      activeEvents.removeAll()
      cancelAsyncTokens()
    }
    adapter.executeDirectedRuntimeActionV1(action)
  }

  func didActivate(_ action: DirectedSchedulerActionV1) {
    guard let eventId = action.eventId, let layerId = action.layerId else { return }
    if let pending = pendingRestart {
      guard adapter?.directedCurrentSnapshotV1.map(directedRuntimeFenceV1) == pending.activationFence,
        let key = directedRestartStartKeyV1(action),
        pending.remainingStartKeys.contains(key)
      else { return }
    }
    activeEvents[eventId] = layerId
  }

  func didRemove(eventId: String) {
    activeEvents.removeValue(forKey: eventId)
  }

  func registerCallback(kind: String, snapshot: DirectedSchedulerSnapshotV1) -> UUID {
    let token = UUID()
    callbackTokens[token] = (kind, directedRuntimeFenceV1(snapshot))
    return token
  }

  func callbackIsCurrent(_ token: UUID, snapshot: DirectedSchedulerSnapshotV1?) -> Bool {
    guard let registered = callbackTokens[token], let snapshot else { return false }
    return registered.fence == directedRuntimeFenceV1(snapshot)
  }

  func completeCallback(_ token: UUID) {
    callbackTokens.removeValue(forKey: token)
  }

  func armWake(snapshot: DirectedSchedulerSnapshotV1, futurePending: Bool) -> UUID {
    let token = UUID()
    wakeToken = (token, directedRuntimeFenceV1(snapshot), futurePending)
    return token
  }

  func wakeIsCurrent(_ token: UUID, snapshot: DirectedSchedulerSnapshotV1?) -> Bool {
    guard let wakeToken, wakeToken.id == token, let snapshot else { return false }
    return wakeToken.fence == directedRuntimeFenceV1(snapshot)
  }

  func completeWake(_ token: UUID) {
    if wakeToken?.id == token { wakeToken = nil }
  }

  func cancelAsyncTokens() {
    callbackTokens.removeAll()
    wakeToken = nil
  }

  func resetRuntimeState(preserveFailureCount: Bool = false) {
    activeEvents.removeAll()
    callbackTokens.removeAll()
    wakeToken = nil
    pendingRestart = nil
    terminalFadeExecutions = 0
    completionExecutions = 0
    committedRestart = nil
    if !preserveFailureCount { failureCleanupExecutions = 0 }
  }

  func inventory() -> DirectedRestartRuntimeInventoryV1 {
    var kinds: [String: Int] = [:]
    callbackTokens.values.forEach { kinds[$0.kind, default: 0] += 1 }
    return DirectedRestartRuntimeInventoryV1(
      activeEvents: activeEvents,
      callbackKinds: kinds,
      pendingCallbackCount: callbackTokens.count,
      pendingFadeCount: callbackTokens.values.filter { $0.kind.contains("fade") }.count,
      pendingFutureCount: wakeToken?.futurePending == true ? 1 : 0,
      pendingWakeCount: wakeToken == nil ? 0 : 1,
      pendingRestartActivationCount: pendingRestart?.remainingStartKeys.count ?? 0,
      pendingRestartTrailingActionCount: pendingRestart?.trailingActions.count ?? 0,
      terminalFadeExecutions: terminalFadeExecutions,
      completionExecutions: completionExecutions,
      failureCleanupExecutions: failureCleanupExecutions,
      committedRestartRequestId: committedRestart?.restartRequestId,
      committedSuccessorPhaseRevision: committedRestart?.successorPhaseRevision
    )
  }
}
