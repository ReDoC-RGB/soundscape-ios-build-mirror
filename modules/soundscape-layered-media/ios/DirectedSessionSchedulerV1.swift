import Foundation

struct DirectedSchedulerOwnerV1: Equatable {
  let sessionId: String
  let generationId: Int
  let operationId: Int
}

struct DirectedSchedulerPhaseV1 {
  let phaseId: String
  let label: String
  let startMs: Double
  let endMs: Double
  let visualStateId: String
  let nextPhaseCopy: String?
}

struct DirectedSchedulerAssetV1 {
  let layerId: String
  let assetId: String
  let title: String
  let sourceUri: String
  let durationMs: Double
  let loopEligible: Bool
  let required: Bool
}

struct DirectedSchedulerEventV1 {
  let eventId: String
  let phaseIndex: Int
  let startMs: Double
  let layerId: String
  let assetId: String
  let role: String
  let gain: Float
  let required: Bool
  let continuous: Bool
  let densityRank: Int
  let timingVariationMs: Double
  let gainVariationDb: Float
  let fadeInMs: Double
  let fadeOutMs: Double
}

struct DirectedTexturePairV1 {
  let pairId: String
  let firstLayerId: String
  let secondLayerId: String

  func contains(_ fromLayerId: String, _ toLayerId: String) -> Bool {
    (firstLayerId == fromLayerId && secondLayerId == toLayerId)
      || (firstLayerId == toLayerId && secondLayerId == fromLayerId)
  }
}

struct DirectedManualTrimV1 {
  var enabled: Bool
  var trimDb: Int
}

struct DirectedAppliedSteeringV1: Equatable {
  var softer: Int
  var sparser: Int
  var closer: Int
  var steadier: Int
  var textureReplacements: [String: String]

  func level(for axis: String) -> Int {
    switch axis {
    case "softer": return softer
    case "sparser": return sparser
    case "closer": return closer
    case "steadier": return steadier
    default: return 0
    }
  }

  func replacing(axis: String, level: Int) -> DirectedAppliedSteeringV1 {
    var copy = self
    switch axis {
    case "softer": copy.softer = level
    case "sparser": copy.sparser = level
    case "closer": copy.closer = level
    case "steadier": copy.steadier = level
    default: break
    }
    return copy
  }
}

struct DirectedSchedulerDefinitionV1 {
  let contractVersion: Int
  let sceneId: String
  let sceneVersion: Int
  let scoreHash: String
  let title: String
  let trajectory: String
  let durationMs: Double
  let initialPlayedElapsedMs: Double
  let finalFadeStartMs: Double
  let outputProfile: String
  let playingOffline: Bool
  let maxLayerGain: Float
  let minimumOptionalGain: Float
  let phaseCrossfadeMs: Double
  let assets: [DirectedSchedulerAssetV1]
  let phases: [DirectedSchedulerPhaseV1]
  let events: [DirectedSchedulerEventV1]
  let texturePairs: [DirectedTexturePairV1]
  let initialAppliedSteering: DirectedAppliedSteeringV1
  let initialManualTrims: [String: DirectedManualTrimV1]
  let hardAvoidanceIds: [String]
  let definitionIdempotencyKey: String

  init(payload: [String: Any]) throws {
    func number(_ key: String) throws -> NSNumber {
      guard let value = payload[key] as? NSNumber else { throw DirectedSchedulerErrorV1.invalid("INVALID_\(key.uppercased())") }
      return value
    }
    guard payload["sessionType"] as? String == "directed" else {
      throw DirectedSchedulerErrorV1.invalid("INVALID_DIRECTED_SESSION_TYPE")
    }
    guard
      let sceneId = payload["sceneId"] as? String,
      let scoreHash = payload["scoreHash"] as? String,
      let title = payload["title"] as? String,
      let trajectory = payload["trajectory"] as? String,
      let outputProfile = payload["outputProfile"] as? String,
      let definitionIdempotencyKey = payload["idempotencyKey"] as? String,
      let assetPayloads = payload["assets"] as? [[String: Any]],
      let phasePayloads = payload["phases"] as? [[String: Any]],
      let eventPayloads = payload["events"] as? [[String: Any]],
      let pairPayloads = payload["texturePairs"] as? [[String: Any]],
      let steeringPayload = payload["initialAppliedSteering"] as? [String: Any]
    else { throw DirectedSchedulerErrorV1.invalid("INVALID_DIRECTED_SCORE") }
    guard !definitionIdempotencyKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
      throw DirectedSchedulerErrorV1.invalid("INVALID_IDEMPOTENCY_KEY")
    }

    contractVersion = try number("contractVersion").intValue
    self.sceneId = sceneId
    sceneVersion = try number("sceneVersion").intValue
    self.scoreHash = scoreHash
    self.title = title
    self.trajectory = trajectory
    durationMs = try number("durationMs").doubleValue
    initialPlayedElapsedMs = try number("initialPlayedElapsedMs").doubleValue
    finalFadeStartMs = try number("finalFadeStartMs").doubleValue
    self.outputProfile = outputProfile
    self.definitionIdempotencyKey = definitionIdempotencyKey
    playingOffline = payload["playingOffline"] as? Bool ?? false
    maxLayerGain = try number("maxLayerGain").floatValue
    minimumOptionalGain = try number("minimumOptionalGain").floatValue
    phaseCrossfadeMs = try number("phaseCrossfadeMs").doubleValue
    hardAvoidanceIds = payload["hardAvoidanceIds"] as? [String] ?? []

    let replacements = steeringPayload["textureReplacements"] as? [String: String] ?? [:]
    initialAppliedSteering = DirectedAppliedSteeringV1(
      softer: (steeringPayload["softer"] as? NSNumber)?.intValue ?? 0,
      sparser: (steeringPayload["sparser"] as? NSNumber)?.intValue ?? 0,
      closer: (steeringPayload["closer"] as? NSNumber)?.intValue ?? 0,
      steadier: (steeringPayload["steadier"] as? NSNumber)?.intValue ?? 0,
      textureReplacements: replacements
    )

    var parsedTrims: [String: DirectedManualTrimV1] = [:]
    for (layerId, value) in payload["initialManualTrims"] as? [String: [String: Any]] ?? [:] {
      parsedTrims[layerId] = DirectedManualTrimV1(
        enabled: value["enabled"] as? Bool ?? true,
        trimDb: (value["trimDb"] as? NSNumber)?.intValue ?? 0
      )
    }
    initialManualTrims = parsedTrims

    assets = try assetPayloads.map { item in
      guard
        let layerId = item["layerId"] as? String,
        let assetId = item["assetId"] as? String,
        let title = item["title"] as? String,
        let sourceUri = item["sourceUri"] as? String,
        let duration = item["durationMs"] as? NSNumber
      else { throw DirectedSchedulerErrorV1.invalid("INVALID_DIRECTED_ASSET") }
      return DirectedSchedulerAssetV1(
        layerId: layerId,
        assetId: assetId,
        title: title,
        sourceUri: sourceUri,
        durationMs: duration.doubleValue,
        loopEligible: item["loopEligible"] as? Bool ?? false,
        required: item["required"] as? Bool ?? false
      )
    }
    phases = try phasePayloads.map { item in
      guard
        let phaseId = item["phaseId"] as? String,
        let label = item["label"] as? String,
        let start = item["startMs"] as? NSNumber,
        let end = item["endMs"] as? NSNumber,
        let visualStateId = item["visualStateId"] as? String
      else { throw DirectedSchedulerErrorV1.invalid("INVALID_DIRECTED_PHASE") }
      return DirectedSchedulerPhaseV1(
        phaseId: phaseId,
        label: label,
        startMs: start.doubleValue,
        endMs: end.doubleValue,
        visualStateId: visualStateId,
        nextPhaseCopy: item["nextPhaseCopy"] as? String
      )
    }
    events = try eventPayloads.map { item in
      guard
        let eventId = item["eventId"] as? String,
        let phaseIndex = item["phaseIndex"] as? NSNumber,
        let start = item["startMs"] as? NSNumber,
        let layerId = item["layerId"] as? String,
        let assetId = item["assetId"] as? String,
        let role = item["role"] as? String,
        let gain = item["gain"] as? NSNumber,
        let densityRank = item["densityRank"] as? NSNumber,
        let timingVariation = item["timingVariationMs"] as? NSNumber,
        let gainVariation = item["gainVariationDb"] as? NSNumber,
        let fadeIn = item["fadeInMs"] as? NSNumber,
        let fadeOut = item["fadeOutMs"] as? NSNumber
      else { throw DirectedSchedulerErrorV1.invalid("INVALID_DIRECTED_EVENT") }
      return DirectedSchedulerEventV1(
        eventId: eventId,
        phaseIndex: phaseIndex.intValue,
        startMs: start.doubleValue,
        layerId: layerId,
        assetId: assetId,
        role: role,
        gain: gain.floatValue,
        required: item["required"] as? Bool ?? false,
        continuous: item["continuous"] as? Bool ?? false,
        densityRank: densityRank.intValue,
        timingVariationMs: timingVariation.doubleValue,
        gainVariationDb: gainVariation.floatValue,
        fadeInMs: fadeIn.doubleValue,
        fadeOutMs: fadeOut.doubleValue
      )
    }
    texturePairs = try pairPayloads.map { item in
      guard
        let pairId = item["pairId"] as? String,
        let layerIds = item["layerIds"] as? [String],
        layerIds.count == 2
      else { throw DirectedSchedulerErrorV1.invalid("INVALID_TEXTURE_PAIR") }
      return DirectedTexturePairV1(pairId: pairId, firstLayerId: layerIds[0], secondLayerId: layerIds[1])
    }

    guard contractVersion == 1, sceneVersion == 1, durationMs > 0, phases.first?.startMs == 0,
      phases.last?.endMs == durationMs, initialPlayedElapsedMs >= 0, initialPlayedElapsedMs < durationMs,
      finalFadeStartMs >= 0, finalFadeStartMs < durationMs,
      initialAppliedSteering.softer >= 0, initialAppliedSteering.softer <= 2,
      initialAppliedSteering.sparser >= 0, initialAppliedSteering.sparser <= 2,
      initialAppliedSteering.closer >= 0, initialAppliedSteering.closer <= 2,
      initialAppliedSteering.steadier >= 0, initialAppliedSteering.steadier <= 2
    else { throw DirectedSchedulerErrorV1.invalid("INVALID_DIRECTED_SCORE") }
    for (left, right) in zip(phases, phases.dropFirst()) where left.endMs != right.startMs {
      _ = right
      throw DirectedSchedulerErrorV1.invalid("INVALID_PHASE_TIMELINE")
    }
    let layerIds = Set(assets.map(\.layerId))
    guard Set(events.map(\.eventId)).count == events.count,
      events.allSatisfy({ $0.phaseIndex >= 0 && $0.phaseIndex < phases.count && layerIds.contains($0.layerId) })
    else { throw DirectedSchedulerErrorV1.invalid("INVALID_EVENT_TIMELINE") }
  }
}

enum DirectedTransportV1: String {
  case preparing, playing, paused, interrupted, completing, completed, failed, stopped
}

enum DirectedSchedulerActionTypeV1: Equatable {
  case startEvent, phaseChanged, applyGains, terminalFade, stopAll
}

enum DirectedSchedulerErrorV1: Error {
  case invalid(String)
}

struct DirectedSteeringCommandV1 {
  let owner: DirectedSchedulerOwnerV1
  let expectedPhaseRevision: Int
  let expectedPathRevision: Int
  let idempotencyKey: String
}

struct DirectedSchedulerAcknowledgementV1 {
  let status: String
  let operationId: Int
  let idempotencyKey: String
  let pathRevision: Int
  let code: String?
  let message: String?
  let safeCheckpointWithinMs: Double

  func dictionary() -> [String: Any] {
    [
      "status": status,
      "operationId": operationId,
      "idempotencyKey": idempotencyKey,
      "pathRevision": pathRevision,
      "code": code.map { $0 as Any } ?? NSNull(),
      "message": message.map { $0 as Any } ?? NSNull(),
      "safeCheckpointWithinMs": safeCheckpointWithinMs,
    ]
  }
}

struct DirectedPendingSteeringV1 {
  let idempotencyKey: String
  let operationId: Int
  let targetPhaseRevision: Int
  let axis: String?
  let level: Int?
  let fromLayerId: String?
  let toLayerId: String?
  let requestedAtPlayedElapsedMs: Double
}

struct DirectedPathHistoryEntryV1 {
  let axis: String
  let beforeNumber: Int?
  let afterNumber: Int?
  let beforeString: String?
  let afterString: String?
  let operationId: Int
  let appliedAtPhaseRevision: Int

  func dictionary() -> [String: Any] {
    let before: Any = beforeNumber.map { $0 as Any } ?? beforeString.map { $0 as Any } ?? NSNull()
    let after: Any = afterNumber.map { $0 as Any } ?? afterString.map { $0 as Any } ?? NSNull()
    return [
      "axis": axis,
      "before": before,
      "after": after,
      "operationId": operationId,
      "appliedAtPhaseRevision": appliedAtPhaseRevision,
    ]
  }
}

struct DirectedSchedulerSnapshotV1 {
  let owner: DirectedSchedulerOwnerV1
  let sceneId: String
  let scoreHash: String
  let transport: DirectedTransportV1
  let playedElapsedMs: Double
  let durationMs: Double
  let phaseIndex: Int
  let phaseId: String
  let phaseLabel: String
  let phaseRevision: Int
  let pathRevision: Int
  let appliedSteering: DirectedAppliedSteeringV1
  let pendingSteering: DirectedPendingSteeringV1?
  let outputProfile: String
  let playingOffline: Bool
  let completionEligible: Bool
  let endedReason: String?
  let lastAcceptedOperationId: Int
  let lastAcknowledgement: DirectedSchedulerAcknowledgementV1?
}

struct DirectedSchedulerActionV1 {
  let type: DirectedSchedulerActionTypeV1
  let eventId: String?
  let layerId: String?
  let gain: Float?
  let fadeInMs: Double
  let fadeOutMs: Double
  let durationMs: Double
  let continuous: Bool
  let detail: String?
}

final class DirectedSessionSchedulerV1 {
  private let lock = NSRecursiveLock()
  private let definition: DirectedSchedulerDefinitionV1
  private let monotonicNowMs: () -> Double
  private var owner: DirectedSchedulerOwnerV1
  private(set) var playingSinceMonotonicMs: Double?
  private(set) var pausedAccumulatedMs: Double
  private var transport: DirectedTransportV1 = .preparing
  private var phaseIndex: Int
  private(set) var phaseRevision = 1
  private(set) var pathRevision = 0
  private(set) var lastAcceptedOperationId: Int
  private(set) var pendingSteering: DirectedPendingSteeringV1?
  private(set) var appliedSteering: DirectedAppliedSteeringV1
  private(set) var lastAcknowledgement: DirectedSchedulerAcknowledgementV1?
  private var outputProfile: String
  private var manualTrims: [String: DirectedManualTrimV1]
  private var history: [(steering: DirectedAppliedSteeringV1, profile: String, trims: [String: DirectedManualTrimV1])] = []
  private var pathHistory: [DirectedPathHistoryEntryV1] = []
  private var idempotency: [String: DirectedSchedulerAcknowledgementV1] = [:]
  private var idempotencyOrder: [String] = []
  private var firedEvents: Set<String> = []
  private var queuedActions: [DirectedSchedulerActionV1] = []
  private var lastProcessedElapsedMs: Double
  private var terminalFadeQueued = false
  private var stopQueued = false
  private var completionEligible = false
  private var endedReason: String?
  private var interruptionResumeEligible = false

  init(
    definition: DirectedSchedulerDefinitionV1,
    owner: DirectedSchedulerOwnerV1,
    monotonicNowMs: @escaping () -> Double = { ProcessInfo.processInfo.systemUptime * 1000 }
  ) {
    self.definition = definition
    self.owner = owner
    self.monotonicNowMs = monotonicNowMs
    pausedAccumulatedMs = definition.initialPlayedElapsedMs
    phaseIndex = definition.phases.lastIndex(where: {
      definition.initialPlayedElapsedMs >= $0.startMs && definition.initialPlayedElapsedMs < $0.endMs
    }) ?? 0
    lastAcceptedOperationId = owner.operationId
    appliedSteering = definition.initialAppliedSteering
    outputProfile = definition.outputProfile
    manualTrims = definition.initialManualTrims
    lastProcessedElapsedMs = definition.initialPlayedElapsedMs - 0.001
    let definitionAcknowledgement = DirectedSchedulerAcknowledgementV1(
      status: "accepted",
      operationId: owner.operationId,
      idempotencyKey: definition.definitionIdempotencyKey,
      pathRevision: 0,
      code: nil,
      message: nil,
      safeCheckpointWithinMs: 0
    )
    lastAcknowledgement = definitionAcknowledgement
    idempotency[definition.definitionIdempotencyKey] = definitionAcknowledgement
    idempotencyOrder.append(definition.definitionIdempotencyKey)
    for event in definition.events where effectiveStartMs(event) < definition.initialPlayedElapsedMs {
      if event.continuous { fire(event) }
      else { firedEvents.insert(event.eventId) }
    }
  }

  func play(_ command: DirectedSteeringCommandV1) -> DirectedSchedulerAcknowledgementV1 {
    locked {
      synchronize()
      if let rejected = validate(command) { return rejected }
      guard !isTerminal else { return reject(command, code: "SESSION_TERMINAL") }
      transport = .playing
      playingSinceMonotonicMs = monotonicNowMs()
      interruptionResumeEligible = false
      let ack = accept(command, status: "accepted")
      synchronize()
      return ack
    }
  }

  func pause(_ command: DirectedSteeringCommandV1) -> DirectedSchedulerAcknowledgementV1 {
    locked {
      synchronize()
      if let rejected = validate(command) { return rejected }
      guard !isTerminal else { return reject(command, code: "SESSION_TERMINAL") }
      if transport == .playing { freezePlayedTime() }
      transport = .paused
      interruptionResumeEligible = false
      return accept(command, status: "accepted")
    }
  }

  func interrupt(_ kind: String, userPausedOrStopped: Bool = false) {
    locked {
      synchronize()
      guard !isTerminal else { return }
      let wasPlaying = transport == .playing
      if wasPlaying { freezePlayedTime() }
      transport = .interrupted
      interruptionResumeEligible = kind == "transient" && wasPlaying && !userPausedOrStopped
    }
  }

  func resumeAfterInterruption(_ command: DirectedSteeringCommandV1, osAllows: Bool) -> Bool {
    locked {
      synchronize()
      if let _ = validate(command) { return false }
      guard interruptionResumeEligible, osAllows, transport == .interrupted else {
        _ = reject(command, code: "AUTO_RESUME_NOT_ALLOWED")
        return false
      }
      transport = .playing
      playingSinceMonotonicMs = monotonicNowMs()
      interruptionResumeEligible = false
      _ = accept(command, status: "accepted")
      return true
    }
  }

  func stop(_ command: DirectedSteeringCommandV1, reason: String = "user-ended") -> DirectedSchedulerAcknowledgementV1 {
    locked {
      synchronize()
      if let rejected = validate(command) { return rejected }
      if transport == .playing { freezePlayedTime() }
      transport = .stopped
      completionEligible = false
      endedReason = reason
      queueStop(detail: "directed_stopped")
      return accept(command, status: "accepted")
    }
  }

  func steer(_ command: DirectedSteeringCommandV1, axis: String, level: Int) -> DirectedSchedulerAcknowledgementV1 {
    locked {
      synchronize()
      if let rejected = validate(command) { return rejected }
      guard ["softer", "sparser", "closer", "steadier"].contains(axis), (0...2).contains(level) else {
        return reject(command, code: "INVALID_STEERING")
      }
      pendingSteering = DirectedPendingSteeringV1(
        idempotencyKey: command.idempotencyKey,
        operationId: command.owner.operationId,
        targetPhaseRevision: phaseRevision + 1,
        axis: axis,
        level: level,
        fromLayerId: nil,
        toLayerId: nil,
        requestedAtPlayedElapsedMs: playedElapsedMs
      )
      return accept(command, status: "accepted")
    }
  }

  func steer(_ command: DirectedSteeringCommandV1, fromLayerId: String, toLayerId: String) -> DirectedSchedulerAcknowledgementV1 {
    locked {
      synchronize()
      if let rejected = validate(command) { return rejected }
      guard definition.texturePairs.contains(where: { $0.contains(fromLayerId, toLayerId) }) else {
        return reject(command, code: "TEXTURE_PAIR_UNAVAILABLE")
      }
      pendingSteering = DirectedPendingSteeringV1(
        idempotencyKey: command.idempotencyKey,
        operationId: command.owner.operationId,
        targetPhaseRevision: phaseRevision + 1,
        axis: nil,
        level: nil,
        fromLayerId: fromLayerId,
        toLayerId: toLayerId,
        requestedAtPlayedElapsedMs: playedElapsedMs
      )
      return accept(command, status: "accepted")
    }
  }

  func cancelPending(_ command: DirectedSteeringCommandV1) -> DirectedSchedulerAcknowledgementV1 {
    locked {
      synchronize()
      if let rejected = validate(command) { return rejected }
      guard pendingSteering != nil else { return reject(command, code: "NO_PENDING_STEERING") }
      pendingSteering = nil
      return accept(command, status: "cancelled")
    }
  }

  func undo(_ command: DirectedSteeringCommandV1) -> DirectedSchedulerAcknowledgementV1 {
    locked {
      synchronize()
      if let rejected = validate(command) { return rejected }
      if pendingSteering != nil {
        pendingSteering = nil
        return accept(command, status: "cancelled")
      }
      guard let prior = history.popLast(), let priorPath = pathHistory.popLast() else { return reject(command, code: "NOTHING_TO_UNDO") }
      appliedSteering = prior.steering
      outputProfile = prior.profile
      manualTrims = prior.trims
      pathRevision += 1
      queuedActions.append(action(.applyGains, detail: "undo"))
      return accept(command, status: "applied", safeCheckpointWithinMs: priorPath.axis == "different-texture" ? 0 : 10_000)
    }
  }

  func adjust(_ command: DirectedSteeringCommandV1, layerId: String, enabled: Bool?, trimDb: Int?) -> DirectedSchedulerAcknowledgementV1 {
    locked {
      synchronize()
      if let rejected = validate(command) { return rejected }
      guard let asset = definition.assets.first(where: { $0.layerId == layerId }) else { return reject(command, code: "UNKNOWN_LAYER") }
      let prior = manualTrims[layerId] ?? DirectedManualTrimV1(enabled: true, trimDb: 0)
      let nextEnabled = enabled ?? prior.enabled
      guard nextEnabled || !asset.required else { return reject(command, code: "REQUIRED_LAYER") }
      let nextTrim = trimDb ?? prior.trimDb
      guard [-3, 0, 3].contains(nextTrim) else { return reject(command, code: "INVALID_MANUAL_TRIM") }
      manualTrims[layerId] = DirectedManualTrimV1(enabled: nextEnabled, trimDb: nextTrim)
      queuedActions.append(action(.applyGains, detail: "manual-adjust"))
      return accept(command, status: "applied")
    }
  }

  func setOutputProfile(_ command: DirectedSteeringCommandV1, profile: String) -> DirectedSchedulerAcknowledgementV1 {
    locked {
      synchronize()
      if let rejected = validate(command) { return rejected }
      guard ["headphones", "speakers"].contains(profile) else { return reject(command, code: "INVALID_OUTPUT_PROFILE") }
      outputProfile = profile
      queuedActions.append(action(.applyGains, detail: "output-profile"))
      return accept(command, status: "applied")
    }
  }

  func requiredAssetFailed(_ layerId: String) {
    locked {
      guard !isTerminal else { return }
      if transport == .playing { freezePlayedTime() }
      transport = .failed
      completionEligible = false
      endedReason = "required-asset-failed"
      queueStop(detail: "directed_failed")
    }
  }

  func schedulerFailed() {
    locked {
      guard !isTerminal else { return }
      if transport == .playing { freezePlayedTime() }
      transport = .failed
      completionEligible = false
      endedReason = "scheduler-failed"
      queueStop(detail: "directed_failed")
    }
  }

  func reconcile() -> DirectedSchedulerSnapshotV1 {
    locked {
      synchronize()
      return makeSnapshot()
    }
  }

  func snapshot() -> DirectedSchedulerSnapshotV1 { reconcile() }

  func drainActions() -> [DirectedSchedulerActionV1] {
    locked {
      let result = queuedActions
      queuedActions.removeAll()
      return result
    }
  }

  func nextWakeDelayMs() -> Double {
    locked {
      synchronize()
      guard transport == .playing else { return .infinity }
      let played = playedElapsedMs
      var candidates: [Double] = [definition.durationMs, definition.phases[phaseIndex].endMs]
      if !terminalFadeQueued { candidates.append(definition.finalFadeStartMs) }
      candidates.append(contentsOf: definition.events.filter { !firedEvents.contains($0.eventId) }.map(effectiveStartMs))
      guard let next = candidates.filter({ $0 > played }).min() else { return 1 }
      return max(1, next - played)
    }
  }

  func resolvedGain(eventId: String, layerId: String) -> Float? {
    locked {
      guard let event = definition.events.first(where: { $0.eventId == eventId }) else { return nil }
      let resolvedLayer = appliedSteering.textureReplacements[event.layerId] ?? event.layerId
      guard resolvedLayer == layerId, eventEnabled(event) else { return nil }
      let trim = manualTrims[layerId] ?? DirectedManualTrimV1(enabled: true, trimDb: 0)
      guard trim.enabled || event.required else { return nil }
      return effectiveGain(event, trim: trim)
    }
  }

  func layerEnabled(_ layerId: String) -> Bool {
    locked {
      definition.assets.first(where: { $0.layerId == layerId })?.required == true
        || (manualTrims[layerId]?.enabled ?? true)
    }
  }

  func dictionary() -> [String: Any] {
    locked {
      synchronize()
      let state = makeSnapshot()
      let pendingValue: Any = state.pendingSteering.map { pending in
        [
          "idempotencyKey": pending.idempotencyKey,
          "operationId": pending.operationId,
          "targetPhaseRevision": pending.targetPhaseRevision,
          "axis": pending.axis ?? "different-texture",
          "level": pending.level.map { $0 as Any } ?? NSNull(),
          "fromLayerId": pending.fromLayerId.map { $0 as Any } ?? NSNull(),
          "toLayerId": pending.toLayerId.map { $0 as Any } ?? NSNull(),
          "requestedAtPlayedElapsedMs": pending.requestedAtPlayedElapsedMs,
        ] as [String: Any]
      }.map { $0 as Any } ?? NSNull()
      let trims = manualTrims.mapValues { ["enabled": $0.enabled, "trimDb": $0.trimDb] as [String: Any] }
      return [
        "sessionId": state.owner.sessionId,
        "generationId": state.owner.generationId,
        "operationId": state.owner.operationId,
        "directedSessionSchedulerVersion": 1,
        "sessionType": "directed",
        "sceneId": state.sceneId,
        "sceneVersion": definition.sceneVersion,
        "scoreHash": state.scoreHash,
        "title": definition.title,
        "trajectory": definition.trajectory,
        "transport": state.transport.rawValue,
        "playedElapsedMs": state.playedElapsedMs,
        "observedAtMonotonicMs": monotonicNowMs(),
        "durationMs": state.durationMs,
        "phaseIndex": state.phaseIndex,
        "phaseId": state.phaseId,
        "phaseLabel": state.phaseLabel,
        "nextPhaseLabel": definition.phases.indices.contains(state.phaseIndex + 1) ? definition.phases[state.phaseIndex + 1].label : NSNull(),
        "phaseRevision": state.phaseRevision,
        "pathRevision": state.pathRevision,
        "appliedSteering": steeringDictionary(state.appliedSteering),
        "pendingSteering": pendingValue,
        "outputProfile": state.outputProfile,
        "hardAvoidanceIds": definition.hardAvoidanceIds,
        "manualTrims": trims,
        "pathHistory": pathHistory.map { $0.dictionary() },
        "playingOffline": state.playingOffline,
        "completionEligible": state.completionEligible,
        "endedReason": state.endedReason.map { $0 as Any } ?? NSNull(),
        "failureCopyKey": state.transport == .failed ? (state.endedReason ?? "scheduler-failed") : NSNull(),
        "lastAcceptedOperationId": state.lastAcceptedOperationId,
        "lastAcknowledgement": state.lastAcknowledgement.map { $0.dictionary() as Any } ?? NSNull(),
      ]
    }
  }

  private var playedElapsedMs: Double {
    guard transport == .playing, let playingSinceMonotonicMs else { return pausedAccumulatedMs }
    return min(definition.durationMs, max(0, pausedAccumulatedMs + monotonicNowMs() - playingSinceMonotonicMs))
  }

  private var isTerminal: Bool { [.completed, .failed, .stopped].contains(transport) }

  private func synchronize() {
    guard transport == .playing else { return }
    let target = playedElapsedMs
    while true {
      let nextPhaseBoundary = phaseIndex < definition.phases.count - 1 ? definition.phases[phaseIndex].endMs : Double.infinity
      let nextEvent = definition.events
        .filter { !firedEvents.contains($0.eventId) }
        .map { ($0, effectiveStartMs($0)) }
        .filter { $0.1 > lastProcessedElapsedMs }
        .min { $0.1 < $1.1 }
      let nextEventTime = nextEvent?.1 ?? Double.infinity
      let finalFadeTime = terminalFadeQueued ? Double.infinity : definition.finalFadeStartMs
      let nextTime = min(min(nextPhaseBoundary, nextEventTime), min(finalFadeTime, definition.durationMs))
      if !nextTime.isFinite || nextTime > target { break }
      if nextTime == definition.durationMs {
        completeNaturally()
        lastProcessedElapsedMs = definition.durationMs
        break
      }
      if nextTime == nextPhaseBoundary {
        phaseIndex += 1
        phaseRevision += 1
        applyPendingIfDue()
        queuedActions.append(DirectedSchedulerActionV1(
          type: .phaseChanged,
          eventId: nil,
          layerId: nil,
          gain: nil,
          fadeInMs: definition.phaseCrossfadeMs,
          fadeOutMs: definition.phaseCrossfadeMs,
          durationMs: 0,
          continuous: false,
          detail: definition.phases[phaseIndex].phaseId
        ))
        lastProcessedElapsedMs = nextTime
        continue
      }
      if nextTime == finalFadeTime {
        terminalFadeQueued = true
        queuedActions.append(DirectedSchedulerActionV1(
          type: .terminalFade,
          eventId: nil,
          layerId: nil,
          gain: nil,
          fadeInMs: 0,
          fadeOutMs: definition.durationMs - definition.finalFadeStartMs,
          durationMs: 0,
          continuous: false,
          detail: "terminalFade"
        ))
        lastProcessedElapsedMs = nextTime
        continue
      }
      if let event = nextEvent?.0 {
        fire(event)
        lastProcessedElapsedMs = nextTime
        continue
      }
      break
    }
    if target >= definition.durationMs && !isTerminal { completeNaturally() }
  }

  private func freezePlayedTime() {
    pausedAccumulatedMs = playedElapsedMs
    playingSinceMonotonicMs = nil
  }

  private func completeNaturally() {
    pausedAccumulatedMs = definition.durationMs
    playingSinceMonotonicMs = nil
    transport = .completed
    completionEligible = true
    endedReason = "natural-completion"
    queueStop(detail: "directed_completed")
  }

  private func queueStop(detail: String) {
    guard !stopQueued else { return }
    stopQueued = true
    queuedActions.append(action(.stopAll, detail: detail))
  }

  private func fire(_ event: DirectedSchedulerEventV1) {
    firedEvents.insert(event.eventId)
    guard eventEnabled(event) else { return }
    let resolvedLayer = appliedSteering.textureReplacements[event.layerId] ?? event.layerId
    let trim = manualTrims[resolvedLayer] ?? DirectedManualTrimV1(enabled: true, trimDb: 0)
    guard trim.enabled || event.required else { return }
    let duration = definition.assets.first(where: { $0.layerId == resolvedLayer })?.durationMs
      ?? definition.assets.first(where: { $0.layerId == event.layerId })?.durationMs
      ?? 0
    queuedActions.append(DirectedSchedulerActionV1(
      type: .startEvent,
      eventId: event.eventId,
      layerId: resolvedLayer,
      gain: effectiveGain(event, trim: trim),
      fadeInMs: event.fadeInMs,
      fadeOutMs: event.fadeOutMs,
      durationMs: duration,
      continuous: event.continuous,
      detail: nil
    ))
  }

  private func effectiveStartMs(_ event: DirectedSchedulerEventV1) -> Double {
    let multiplier: Double = appliedSteering.steadier == 0 ? 1 : (appliedSteering.steadier == 1 ? 0.4 : 0)
    return event.startMs + event.timingVariationMs * multiplier
  }

  private func eventEnabled(_ event: DirectedSchedulerEventV1) -> Bool {
    if event.required { return true }
    if appliedSteering.sparser == 1 && event.densityRank >= 3 { return false }
    if appliedSteering.sparser == 2 && event.densityRank >= 2 { return false }
    return true
  }

  private func effectiveGain(_ event: DirectedSchedulerEventV1, trim: DirectedManualTrimV1) -> Float {
    let softer: Float = appliedSteering.softer == 0 ? 1 : (appliedSteering.softer == 1 ? 0.82 : 0.68)
    let steadier: Float = appliedSteering.steadier == 0 ? 1 : (appliedSteering.steadier == 1 ? 0.5 : 0)
    var closerDb: Float = 0
    if event.role == "foreground" { closerDb = Float(appliedSteering.closer) * 2 }
    if event.role == "anchor" { closerDb = Float(appliedSteering.closer) * -1 }
    var profileDb: Float = 0
    if outputProfile == "speakers" {
      if event.role == "bed" { profileDb = -1 }
      if event.role == "foreground" { profileDb = 1.5 }
    }
    let db = event.gainVariationDb * steadier + closerDb + profileDb + Float(trim.trimDb)
    let resolved = event.gain * softer * powf(10, db / 20)
    if event.required { return min(definition.maxLayerGain, max(0.0001, resolved)) }
    return min(definition.maxLayerGain, max(definition.minimumOptionalGain, resolved))
  }

  private func applyPendingIfDue() {
    guard let pendingSteering, pendingSteering.targetPhaseRevision <= phaseRevision else { return }
    history.append((appliedSteering, outputProfile, manualTrims))
    let pathEntry: DirectedPathHistoryEntryV1
    if let axis = pendingSteering.axis, let level = pendingSteering.level {
      let before = appliedSteering.level(for: axis)
      appliedSteering = appliedSteering.replacing(axis: axis, level: level)
      pathEntry = DirectedPathHistoryEntryV1(
        axis: axis,
        beforeNumber: before,
        afterNumber: level,
        beforeString: nil,
        afterString: nil,
        operationId: pendingSteering.operationId,
        appliedAtPhaseRevision: phaseRevision
      )
    } else if let from = pendingSteering.fromLayerId, let to = pendingSteering.toLayerId {
      appliedSteering.textureReplacements[from] = to
      pathEntry = DirectedPathHistoryEntryV1(
        axis: "different-texture",
        beforeNumber: nil,
        afterNumber: nil,
        beforeString: from,
        afterString: to,
        operationId: pendingSteering.operationId,
        appliedAtPhaseRevision: phaseRevision
      )
    } else {
      history.removeLast()
      self.pendingSteering = nil
      return
    }
    pathHistory.append(pathEntry)
    self.pendingSteering = nil
    pathRevision += 1
    let appliedAck = DirectedSchedulerAcknowledgementV1(
      status: "applied",
      operationId: pendingSteering.operationId,
      idempotencyKey: pendingSteering.idempotencyKey,
      pathRevision: pathRevision,
      code: nil,
      message: nil,
      safeCheckpointWithinMs: 10_000
    )
    lastAcknowledgement = appliedAck
    idempotency[pendingSteering.idempotencyKey] = appliedAck
    queuedActions.append(action(.applyGains, detail: "steering-applied"))
  }

  private func validate(_ command: DirectedSteeringCommandV1) -> DirectedSchedulerAcknowledgementV1? {
    if let prior = idempotency[command.idempotencyKey] {
      let duplicate = DirectedSchedulerAcknowledgementV1(
        status: "duplicate",
        operationId: command.owner.operationId,
        idempotencyKey: command.idempotencyKey,
        pathRevision: pathRevision,
        code: "DUPLICATE",
        message: "Already acknowledged.",
        safeCheckpointWithinMs: prior.safeCheckpointWithinMs
      )
      lastAcknowledgement = duplicate
      return duplicate
    }
    guard command.owner.sessionId == owner.sessionId, command.owner.generationId == owner.generationId else {
      return reject(command, code: "SESSION_MISMATCH")
    }
    guard command.owner.operationId > lastAcceptedOperationId else { return reject(command, code: "STALE") }
    guard command.expectedPhaseRevision == phaseRevision else { return reject(command, code: "STALE_PHASE") }
    guard command.expectedPathRevision == pathRevision else { return reject(command, code: "STALE_PATH") }
    return nil
  }

  private func accept(
    _ command: DirectedSteeringCommandV1,
    status: String,
    safeCheckpointWithinMs: Double = 0
  ) -> DirectedSchedulerAcknowledgementV1 {
    owner = command.owner
    lastAcceptedOperationId = command.owner.operationId
    let ack = DirectedSchedulerAcknowledgementV1(
      status: status,
      operationId: command.owner.operationId,
      idempotencyKey: command.idempotencyKey,
      pathRevision: pathRevision,
      code: nil,
      message: nil,
      safeCheckpointWithinMs: safeCheckpointWithinMs
    )
    remember(ack)
    return ack
  }

  private func reject(_ command: DirectedSteeringCommandV1, code: String) -> DirectedSchedulerAcknowledgementV1 {
    let ack = DirectedSchedulerAcknowledgementV1(
      status: code == "DUPLICATE" ? "duplicate" : (code.hasPrefix("STALE") || code == "SESSION_MISMATCH" ? "stale" : "rejected"),
      operationId: command.owner.operationId,
      idempotencyKey: command.idempotencyKey,
      pathRevision: pathRevision,
      code: code,
      message: "Command was not applied.",
      safeCheckpointWithinMs: 0
    )
    lastAcknowledgement = ack
    return ack
  }

  private func remember(_ ack: DirectedSchedulerAcknowledgementV1) {
    idempotency[ack.idempotencyKey] = ack
    idempotencyOrder.append(ack.idempotencyKey)
    while idempotencyOrder.count > 64 {
      let removed = idempotencyOrder.removeFirst()
      idempotency.removeValue(forKey: removed)
    }
    lastAcknowledgement = ack
  }

  private func makeSnapshot() -> DirectedSchedulerSnapshotV1 {
    let phase = definition.phases[phaseIndex]
    return DirectedSchedulerSnapshotV1(
      owner: owner,
      sceneId: definition.sceneId,
      scoreHash: definition.scoreHash,
      transport: transport,
      playedElapsedMs: playedElapsedMs,
      durationMs: definition.durationMs,
      phaseIndex: phaseIndex,
      phaseId: phase.phaseId,
      phaseLabel: phase.label,
      phaseRevision: phaseRevision,
      pathRevision: pathRevision,
      appliedSteering: appliedSteering,
      pendingSteering: pendingSteering,
      outputProfile: outputProfile,
      playingOffline: definition.playingOffline,
      completionEligible: completionEligible,
      endedReason: endedReason,
      lastAcceptedOperationId: lastAcceptedOperationId,
      lastAcknowledgement: lastAcknowledgement
    )
  }

  private func action(_ type: DirectedSchedulerActionTypeV1, detail: String) -> DirectedSchedulerActionV1 {
    DirectedSchedulerActionV1(
      type: type,
      eventId: nil,
      layerId: nil,
      gain: nil,
      fadeInMs: 0,
      fadeOutMs: 0,
      durationMs: 0,
      continuous: false,
      detail: detail
    )
  }

  private func steeringDictionary(_ steering: DirectedAppliedSteeringV1) -> [String: Any] {
    [
      "softer": steering.softer,
      "sparser": steering.sparser,
      "closer": steering.closer,
      "steadier": steering.steadier,
      "textureReplacements": steering.textureReplacements,
    ]
  }

  private func locked<T>(_ work: () -> T) -> T {
    lock.lock()
    defer { lock.unlock() }
    return work()
  }
}
