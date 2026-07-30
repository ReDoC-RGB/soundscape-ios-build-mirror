import Foundation

/// Fully validated replacement inventory used by the production iOS engine before runtime clear.
struct DirectedRestartRuntimePlanV1 {
  let commit: DirectedRestartCommitV1
  let restartAction: DirectedSchedulerActionV1
  let startActions: [DirectedSchedulerActionV1]
  let trailingActions: [DirectedSchedulerActionV1]
}

func prepareDirectedRestartRuntimePlanV1(
  actions: [DirectedSchedulerActionV1],
  commit: DirectedRestartCommitV1?,
  availableLayerIds: Set<String>,
  injectFailureAtEventId: String? = nil
) throws -> DirectedRestartRuntimePlanV1? {
  guard let restartIndex = actions.firstIndex(where: { $0.type == .restartPhase }) else { return nil }
  guard restartIndex == 0, actions.filter({ $0.type == .restartPhase }).count == 1 else { throw DirectedRestartRuntimeErrorV1.invalidOrder }
  guard let commit, !commit.restartRequestId.isEmpty, commit.transportGeneration > 0 else { throw DirectedRestartRuntimeErrorV1.invalidCommit }
  let suffix = Array(actions.dropFirst())
  let starts = Array(suffix.prefix(while: { $0.type == .startEvent }))
  let trailing = Array(suffix.dropFirst(starts.count))
  guard !trailing.contains(where: { $0.type == .startEvent || $0.type == .restartPhase }) else { throw DirectedRestartRuntimeErrorV1.noncontiguous }
  var eventIds = Set<String>()
  var layerIds = Set<String>()
  for action in starts {
    guard let eventId = action.eventId, let layerId = action.layerId else { throw DirectedRestartRuntimeErrorV1.missingIdentity }
    guard eventId != injectFailureAtEventId else { throw DirectedRestartRuntimeErrorV1.injectedFailure }
    guard eventIds.insert(eventId).inserted, layerIds.insert(layerId).inserted else { throw DirectedRestartRuntimeErrorV1.duplicateEntry }
    guard availableLayerIds.contains(layerId), action.gain?.isFinite == true, action.durationMs >= 0 else { throw DirectedRestartRuntimeErrorV1.unexecutable }
  }
  return DirectedRestartRuntimePlanV1(commit: commit, restartAction: actions[0], startActions: starts, trailingActions: trailing)
}

enum DirectedRestartRuntimeErrorV1: Error {
  case invalidOrder, invalidCommit, noncontiguous, missingIdentity, duplicateEntry, unexecutable, injectedFailure
}

struct DirectedRuntimeFenceV1: Equatable {
  let sessionId: String
  let generationId: Int
  let operationId: Int
  let phaseIndex: Int
  let phaseId: String
  let phaseRevision: Int
  let pathRevision: Int
  let transport: DirectedTransportV1
  let transportGeneration: Int
  let restartRequestId: String?
}

func directedRuntimeFenceV1(_ snapshot: DirectedSchedulerSnapshotV1) -> DirectedRuntimeFenceV1 {
  DirectedRuntimeFenceV1(
    sessionId: snapshot.owner.sessionId,
    generationId: snapshot.owner.generationId,
    operationId: snapshot.owner.operationId,
    phaseIndex: snapshot.phaseIndex,
    phaseId: snapshot.phaseId,
    phaseRevision: snapshot.phaseRevision,
    pathRevision: snapshot.pathRevision,
    transport: snapshot.transport,
    transportGeneration: snapshot.transportGeneration,
    restartRequestId: snapshot.restartCommit?.restartRequestId
  )
}

func directedRestartFenceMatchesV1(_ expected: DirectedRestartCommitV1, _ current: DirectedSchedulerSnapshotV1?) -> Bool {
  guard let current else { return false }
  return current.owner.sessionId == expected.sessionId
    && current.owner.generationId == expected.generationId
    && current.owner.operationId == expected.operationId
    && current.phaseIndex == expected.phaseIndex
    && current.phaseId == expected.phaseId
    && current.phaseRevision == expected.successorPhaseRevision
    && current.pathRevision == expected.pathRevision
    && [.playing, .paused, .interrupted].contains(current.transport)
    && current.transportGeneration == expected.transportGeneration
    && current.restartCommit?.restartRequestId == expected.restartRequestId
}
