import AVFoundation
import ExpoModulesCore
import MediaPlayer

private struct Owner: Equatable {
  let sessionId: String
  let generationId: Int
  let operationId: Int
}

private final class LayerPlayback {
  let owner: Owner
  let soundId: String
  let sourceURL: URL
  let player: AVQueuePlayer
  let required: Bool
  var enabled: Bool
  var volume: Float
  let loopEligible: Bool

  init(owner: Owner, soundId: String, sourceURL: URL, player: AVQueuePlayer, required: Bool, enabled: Bool, volume: Float, loopEligible: Bool) {
    self.owner = owner
    self.soundId = soundId
    self.sourceURL = sourceURL
    self.player = player
    self.required = required
    self.enabled = enabled
    self.volume = volume
    self.loopEligible = loopEligible
    self.player.volume = enabled ? volume : 0
  }
}

private final class IOSLayeredMediaEngine {
  private var owner = Owner(sessionId: "", generationId: 0, operationId: 0)
  private var layers: [String: LayerPlayback] = [:]
  private var timer: DispatchSourceTimer?
  private var timerToken: UUID?
  private var timerDeadlineElapsedRealtimeMs: Double?
  private var timerFade: DispatchSourceTimer?
  private var timerFadeToken: UUID?
  private var timerFadeStep = 0
  private var timerFadeStartingVolumes: [String: Float] = [:]
  private let timerFadeDurationSeconds: TimeInterval = 5
  private var timerDiagnosticsEnabled = false
  private var timerDiagnostics: [[String: Any]] = []
  private var metadata: [String: Any]?
  private var sessionType: String?
  private var durationMillis: Double = 0
  private var loopEnabled = false
  private var completed = false
  private var completionPositionMillis: Double?
  private var eventId = 0
  private var userPausedOrStopped = false
  private var interruptionMayResume = false
  private var remoteCommandTargets: [(command: MPRemoteCommand, target: Any)] = []
  private var positionTimeObserver: (player: AVQueuePlayer, token: Any)?
  private var lastPublishedPositionMillis: Double?
  private let positionTickIntervalSeconds: TimeInterval = 0.75
  private var directedScheduler: DirectedSessionSchedulerV1?
  private var directedWake: DispatchSourceTimer?
  private var directedWakeToken: UUID?
  private var directedCallbacks: [UUID: DispatchSourceTimer] = [:]
  private var directedActiveEvents: [String: String] = [:]
  private var directedActiveActions: [String: DirectedSchedulerActionV1] = [:]
  private var directedPhaseCrossfadeMs: Double = 300
  private var maxLayerGain: Float = 0.65
  private var minimumOptionalGain: Float = 0.0001
  private var currentDirectedLayerId: String?
  var emit: (([String: Any]) -> Void)?

  init() {
    let center = NotificationCenter.default
    center.addObserver(self, selector: #selector(interruption(_:)), name: AVAudioSession.interruptionNotification, object: nil)
    center.addObserver(self, selector: #selector(routeChanged(_:)), name: AVAudioSession.routeChangeNotification, object: nil)
    center.addObserver(self, selector: #selector(playbackFailed(_:)), name: AVPlayerItem.failedToPlayToEndTimeNotification, object: nil)
    center.addObserver(self, selector: #selector(playbackEnded(_:)), name: AVPlayerItem.didPlayToEndTimeNotification, object: nil)
    configureRemoteCommands()
  }

  deinit {
    stopPositionPublisher()
    NotificationCenter.default.removeObserver(self)
    for registration in remoteCommandTargets {
      registration.command.removeTarget(registration.target)
    }
    cancelTimer()
    cancelTimerFade(restoreVolumes: false)
    cancelDirectedRuntime(clearScheduler: true, clearActiveEvents: true)
    stopPlayers(release: true)
  }

  func define(_ payload: [String: Any]) throws -> [String: Any] {
    let next = try parseOwner(payload)
    guard owner.sessionId.isEmpty || next.sessionId != owner.sessionId || next.generationId > owner.generationId else {
      throw error(1, "STALE_GENERATION")
    }

    guard let definitions = payload["layers"] as? [[String: Any]], !definitions.isEmpty else {
      throw error(2, "EMPTY_SESSION")
    }

    var preparedLayers: [String: LayerPlayback] = [:]
    for definition in definitions {
      let required = definition["required"] as? Bool ?? false
      guard
        let layerId = definition["layerId"] as? String,
        !layerId.isEmpty,
        preparedLayers[layerId] == nil,
        let soundId = definition["soundId"] as? String,
        let sourceUri = definition["sourceUri"] as? String,
        let url = URL(string: sourceUri),
        ["file", "http", "https"].contains(url.scheme?.lowercased() ?? "")
      else {
        if required { throw error(8, "INVALID_REQUIRED_LAYER") }
        continue
      }
      let enabled = definition["enabled"] as? Bool ?? true
      let volume = Float(max(0, min(1, definition["volume"] as? Double ?? 1.0)))
      let loopEligible = definition["loopEligible"] as? Bool ?? false
      let item = AVPlayerItem(url: url)
      let player = AVQueuePlayer()
      player.actionAtItemEnd = .pause
      player.insert(item, after: nil)
      preparedLayers[layerId] = LayerPlayback(
        owner: next,
        soundId: soundId,
        sourceURL: url,
        player: player,
        required: required,
        enabled: enabled,
        volume: volume,
        loopEligible: loopEligible
      )
    }
    guard !preparedLayers.isEmpty else { throw error(2, "EMPTY_SESSION") }

    let audioSession = AVAudioSession.sharedInstance()
    do {
      try audioSession.setCategory(.playback, mode: .default, options: [])
      try audioSession.setActive(true)
    } catch {
      preparedLayers.values.forEach { $0.player.removeAllItems() }
      throw error
    }

    stopPositionPublisher()
    cancelTimer()
    cancelTimerFade(restoreVolumes: false)
    cancelDirectedRuntime(clearScheduler: true, clearActiveEvents: true)
    stopPlayers(release: true)
    owner = next
    metadata = payload["metadata"] as? [String: Any]
    sessionType = payload["sessionType"] as? String ?? (definitions.count == 1 ? "single" : "layered")
    durationMillis = (payload["durationMillis"] as? NSNumber)?.doubleValue ?? 0
    loopEnabled = payload["loopEnabled"] as? Bool ?? false
    completed = false
    completionPositionMillis = nil
    userPausedOrStopped = false
    interruptionMayResume = false
    layers = preparedLayers

    updateNowPlaying(rate: 0)
    return publish(kind: "session_defined", phase: "loading")
  }

  func command(_ payload: [String: Any]) throws -> [String: Any] {
    let next = try parseOwner(payload)
    try accept(next)
    owner = next

    switch payload["type"] as? String {
    case "play", "resume":
      guard !layers.isEmpty else { return publish(kind: "command_rejected", phase: "idle") }
      if completed {
        guard sessionType == "single", layers.count == 1, let layer = layers.values.first, let item = layer.player.currentItem else {
          return publish(kind: "command_rejected", phase: "ended")
        }
        stopPositionPublisher()
        beginSeek(
          layer: layer,
          expectedItem: item,
          expectedOwner: next,
          positionMillis: 0,
          shouldPlay: true,
          completionKind: "command_ack"
        )
        return publish(kind: "command_pending", phase: "loading")
      }
      layers.values.forEach { $0.player.play() }
      userPausedOrStopped = false
      interruptionMayResume = false
      startPositionPublisher()
      let playPhase = currentPhase() == "playing" ? "playing" : "loading"
      updateNowPlaying(rate: playPhase == "playing" ? 1 : 0)
      return publish(kind: "command_ack", phase: playPhase)
    case "pause":
      guard !layers.isEmpty else { return publish(kind: "command_rejected", phase: "idle") }
      stopPositionPublisher()
      layers.values.forEach { $0.player.pause() }
      userPausedOrStopped = true
      interruptionMayResume = false
      updateNowPlaying(rate: 0)
      return publish(kind: "command_ack", phase: "paused")
    case "stop", "dispose":
      userPausedOrStopped = true
      interruptionMayResume = false
      stopPositionPublisher()
      cancelTimer()
      cancelTimerFade(restoreVolumes: false)
      cancelDirectedRuntime(clearScheduler: true, clearActiveEvents: true)
      stopPlayers(release: true)
      metadata = nil
      MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
      MPRemoteCommandCenter.shared().changePlaybackPositionCommand.isEnabled = false
      try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
      let stopped = publish(kind: "command_ack", phase: "stopped")
      sessionType = nil
      durationMillis = 0
      loopEnabled = false
      completed = false
      completionPositionMillis = nil
      return stopped
    case "cancelTimer":
      cancelTimer()
      cancelTimerFade(restoreVolumes: true)
      return publish(kind: "timer_cancelled", phase: currentPhase())
    default:
      throw error(3, "UNKNOWN_COMMAND")
    }
  }

  func setLayer(_ payload: [String: Any]) throws -> [String: Any] {
    let next = try parseOwner(payload)
    try accept(next)
    owner = next
    guard let layerId = payload["layerId"] as? String, let layer = layers[layerId] else {
      throw error(4, "UNKNOWN_LAYER")
    }
    if let volume = payload["volume"] as? Double {
      layer.volume = Float(max(0, min(1, volume)))
    }
    if let enabled = payload["enabled"] as? Bool {
      layer.enabled = enabled
    }
    layer.player.volume = layer.enabled ? layer.volume : 0
    return publish(kind: "layer_updated", phase: currentPhase())
  }

  func setLoop(_ payload: [String: Any]) throws -> [String: Any] {
    let next = try parseOwner(payload)
    try accept(next)
    owner = next
    let enabled = payload["enabled"] as? Bool ?? false
    loopEnabled = enabled
    // Loop mode is policy only. Never pause, seek, copy, or replace an active
    // item while toggling; playbackEnded applies the policy at the boundary.
    updateNowPlaying(rate: currentPhase() == "playing" ? 1 : 0)
    return publish(kind: "loop_updated", phase: currentPhase())
  }

  func seek(_ payload: [String: Any], promise: Promise) {
    do {
      let next = try parseOwner(payload)
      try accept(next)
      guard sessionType == "single", layers.count == 1, let layer = layers.values.first else {
        throw error(9, "SEEK_UNAVAILABLE_FOR_LAYERED_SESSION")
      }
      guard let item = layer.player.currentItem else {
        throw error(10, "NO_CURRENT_ITEM")
      }
      owner = next
      let requestedMillis = max(0, min(durationMillis, (payload["positionMillis"] as? NSNumber)?.doubleValue ?? 0))
      let shouldPlay = payload["shouldPlay"] as? Bool ?? false
      stopPositionPublisher()
      _ = publish(kind: "seek_pending", phase: "loading")
      beginSeek(
        layer: layer,
        expectedItem: item,
        expectedOwner: next,
        positionMillis: requestedMillis,
        shouldPlay: shouldPlay,
        completionKind: "seek_completed",
        promise: promise
      )
    } catch {
      promise.reject(error)
    }
  }

  func setTimer(_ payload: [String: Any]) throws -> [String: Any] {
    let expected = try parseOwner(payload)
    try accept(expected)
    guard let deadlineMs = (payload["absoluteDeadlineElapsedRealtimeMs"] as? NSNumber)?.doubleValue else {
      throw error(5, "INVALID_TIMER_DEADLINE")
    }

    cancelTimer()
    cancelTimerFade(restoreVolumes: true)
    owner = expected
    let token = UUID()
    timerToken = token
    timerDeadlineElapsedRealtimeMs = deadlineMs
    let nowMs = Double(ProcessInfo.processInfo.systemUptime * 1000)
    let delaySeconds = max(0, deadlineMs - nowMs) / 1000
    recordTimer(kind: "timer_set", detail: ["delayMs": max(0, deadlineMs - nowMs)])

    let source = DispatchSource.makeTimerSource(queue: .main)
    source.schedule(deadline: .now() + delaySeconds, leeway: .milliseconds(25))
    source.setEventHandler { [weak self] in
      guard let self else { return }
      guard
        self.timerToken == token,
        self.owner.sessionId == expected.sessionId,
        self.owner.generationId == expected.generationId,
        self.owner.operationId >= expected.operationId
      else {
        self.recordTimer(kind: "timer_callback_rejected", detail: [:])
        return
      }
      let firedAtMs = Double(ProcessInfo.processInfo.systemUptime * 1000)
      self.recordTimer(kind: "timer_callback_fired", detail: ["errorMs": firedAtMs - deadlineMs])
      source.setEventHandler {}
      source.cancel()
      self.timer = nil
      self.timerToken = nil
      self.timerDeadlineElapsedRealtimeMs = nil
      self.startTimerFade(owner: expected, deadlineMs: deadlineMs, firedAtMs: firedAtMs)
    }
    timer = source
    source.resume()
    return publish(kind: "timer_set", phase: currentPhase())
  }

  func setTimerDiagnosticsEnabled(_ enabled: Bool) -> [String: Any] {
    timerDiagnosticsEnabled = enabled
    if !enabled { timerDiagnostics.removeAll() }
    return publish(kind: "timer_diagnostics_changed", phase: currentPhase())
  }

  func notificationPermissionState() -> [String: Any] {
    return [
      "status": "not-required",
      "runtimePermissionRequired": false,
      "permissionGranted": true,
      "notificationsEnabled": true,
      "channelCreated": false,
      "channelId": "",
    ]
  }

  func state() -> [String: Any] {
    publish(kind: "state_query", phase: currentPhase())
  }

  func createDirectedSession(_ payload: [String: Any]) throws -> [String: Any] {
    let next = try parseOwner(payload)
    guard owner.sessionId.isEmpty || next.sessionId != owner.sessionId || next.generationId > owner.generationId else {
      throw error(1, "STALE_GENERATION")
    }
    let definition = try DirectedSchedulerDefinitionV1(payload: payload)
    var preparedLayers: [String: LayerPlayback] = [:]
    for asset in definition.assets {
      guard
        !asset.layerId.isEmpty,
        preparedLayers[asset.layerId] == nil,
        let url = URL(string: asset.sourceUri),
        ["file", "http", "https"].contains(url.scheme?.lowercased() ?? "")
      else {
        if asset.required { throw error(8, "INVALID_REQUIRED_LAYER") }
        continue
      }
      let player = AVQueuePlayer()
      player.actionAtItemEnd = .pause
      player.insert(AVPlayerItem(url: url), after: nil)
      preparedLayers[asset.layerId] = LayerPlayback(
        owner: next,
        soundId: asset.assetId,
        sourceURL: url,
        player: player,
        required: asset.required,
        enabled: true,
        volume: 0,
        loopEligible: asset.loopEligible
      )
    }
    guard !preparedLayers.isEmpty, definition.assets.filter({ $0.required }).allSatisfy({ preparedLayers[$0.layerId] != nil }) else {
      preparedLayers.values.forEach { $0.player.removeAllItems() }
      throw error(8, "INVALID_REQUIRED_LAYER")
    }
    do {
      let audioSession = AVAudioSession.sharedInstance()
      try audioSession.setCategory(.playback, mode: .default, options: [])
      try audioSession.setActive(true)
    } catch {
      preparedLayers.values.forEach { $0.player.removeAllItems() }
      throw error
    }

    stopPositionPublisher()
    cancelTimer()
    cancelTimerFade(restoreVolumes: false)
    cancelDirectedRuntime(clearScheduler: true, clearActiveEvents: true)
    stopPlayers(release: true)
    owner = next
    layers = preparedLayers
    metadata = ["title": definition.title, "artist": "Soundscape", "recipeId": definition.sceneId]
    sessionType = "directed"
    durationMillis = definition.durationMs
    loopEnabled = false
    completed = false
    completionPositionMillis = nil
    userPausedOrStopped = false
    interruptionMayResume = false
    directedPhaseCrossfadeMs = definition.phaseCrossfadeMs
    maxLayerGain = definition.maxLayerGain
    minimumOptionalGain = definition.minimumOptionalGain
    directedScheduler = DirectedSessionSchedulerV1(
      definition: definition,
      owner: DirectedSchedulerOwnerV1(sessionId: next.sessionId, generationId: next.generationId, operationId: next.operationId)
    )
    updateNowPlaying(rate: 0)
    _ = publish(kind: "directed_session_defined", phase: "loading")
    return directedScheduler?.dictionary() ?? [:]
  }

  func dispatchDirectedSession(_ payload: [String: Any]) throws -> [String: Any] {
    guard let scheduler = directedScheduler else { throw error(20, "NO_DIRECTED_SESSION") }
    let command = try parseDirectedCommand(payload)
    let type = payload["type"] as? String ?? ""
    let acknowledgement: DirectedSchedulerAcknowledgementV1
    switch type {
    case "play", "resume": acknowledgement = scheduler.play(command)
    case "pause": acknowledgement = scheduler.pause(command)
    case "stop": acknowledgement = scheduler.stop(command, reason: payload["endedReason"] as? String ?? "user-ended")
    default: throw error(3, "UNKNOWN_DIRECTED_COMMAND")
    }
    if acknowledgement.status == "accepted" {
      owner = Owner(sessionId: command.owner.sessionId, generationId: command.owner.generationId, operationId: command.owner.operationId)
      switch type {
      case "play", "resume":
        userPausedOrStopped = false
        interruptionMayResume = false
      case "pause":
        layers.values.forEach { $0.player.pause() }
        userPausedOrStopped = true
        interruptionMayResume = false
      case "stop":
        userPausedOrStopped = true
        interruptionMayResume = false
      default: break
      }
    }
    consumeDirectedActions()
    if acknowledgement.status == "accepted", type == "play" || type == "resume" {
      let activeLayerIds = Set(directedActiveEvents.values)
      for layerId in activeLayerIds { layers[layerId]?.player.play() }
    }
    scheduleDirectedWake()
    updateNowPlaying(rate: type == "play" || type == "resume" ? 1 : 0)
    _ = publish(kind: "directed_transport_ack", phase: directedPhase())
    return scheduler.dictionary()
  }

  func steerDirectedSession(_ payload: [String: Any]) throws -> [String: Any] {
    guard let scheduler = directedScheduler else { throw error(20, "NO_DIRECTED_SESSION") }
    let command = try parseDirectedCommand(payload)
    let acknowledgement: DirectedSchedulerAcknowledgementV1
    switch payload["type"] as? String {
    case "steer":
      guard let axis = payload["axis"] as? String, let level = (payload["level"] as? NSNumber)?.intValue else {
        throw error(21, "INVALID_DIRECTED_STEERING")
      }
      acknowledgement = scheduler.steer(command, axis: axis, level: level)
    case "different-texture":
      guard let from = payload["fromLayerId"] as? String, let to = payload["toLayerId"] as? String else {
        throw error(21, "INVALID_DIRECTED_STEERING")
      }
      acknowledgement = scheduler.steer(command, fromLayerId: from, toLayerId: to)
    case "cancel-pending": acknowledgement = scheduler.cancelPending(command)
    default: throw error(21, "UNKNOWN_DIRECTED_STEERING")
    }
    adoptDirectedOwner(command, acknowledgement)
    consumeDirectedActions()
    scheduleDirectedWake()
    _ = publish(kind: "directed_steering_ack", phase: directedPhase())
    return scheduler.dictionary()
  }

  func undoDirectedSessionSteering(_ payload: [String: Any]) throws -> [String: Any] {
    guard let scheduler = directedScheduler else { throw error(20, "NO_DIRECTED_SESSION") }
    let command = try parseDirectedCommand(payload)
    let acknowledgement = scheduler.undo(command)
    adoptDirectedOwner(command, acknowledgement)
    consumeDirectedActions()
    scheduleDirectedWake()
    _ = publish(kind: "directed_undo_ack", phase: directedPhase())
    return scheduler.dictionary()
  }

  func adjustDirectedSession(_ payload: [String: Any]) throws -> [String: Any] {
    guard let scheduler = directedScheduler, let layerId = payload["layerId"] as? String else {
      throw error(20, "NO_DIRECTED_SESSION")
    }
    let command = try parseDirectedCommand(payload)
    let acknowledgement = scheduler.adjust(
      command,
      layerId: layerId,
      enabled: payload["enabled"] as? Bool,
      trimDb: (payload["trimDb"] as? NSNumber)?.intValue
    )
    adoptDirectedOwner(command, acknowledgement)
    consumeDirectedActions()
    scheduleDirectedWake()
    _ = publish(kind: "directed_adjust_ack", phase: directedPhase())
    return scheduler.dictionary()
  }

  func setDirectedSessionOutputProfile(_ payload: [String: Any]) throws -> [String: Any] {
    guard let scheduler = directedScheduler, let profile = payload["outputProfile"] as? String else {
      throw error(20, "NO_DIRECTED_SESSION")
    }
    let command = try parseDirectedCommand(payload)
    let acknowledgement = scheduler.setOutputProfile(command, profile: profile)
    adoptDirectedOwner(command, acknowledgement)
    consumeDirectedActions()
    scheduleDirectedWake()
    _ = publish(kind: "directed_profile_ack", phase: directedPhase())
    return scheduler.dictionary()
  }

  func directedSessionState() -> [String: Any]? {
    guard let scheduler = directedScheduler else { return nil }
    _ = scheduler.reconcile()
    consumeDirectedActions()
    scheduleDirectedWake()
    return scheduler.dictionary()
  }

  private func parseDirectedCommand(_ payload: [String: Any]) throws -> DirectedSteeringCommandV1 {
    let parsed = try parseOwner(payload)
    guard
      let expectedPhaseRevision = (payload["expectedPhaseRevision"] as? NSNumber)?.intValue,
      let expectedPathRevision = (payload["expectedPathRevision"] as? NSNumber)?.intValue,
      let idempotencyKey = payload["idempotencyKey"] as? String,
      !idempotencyKey.isEmpty
    else { throw error(22, "INVALID_DIRECTED_COMMAND_FENCE") }
    return DirectedSteeringCommandV1(
      owner: DirectedSchedulerOwnerV1(sessionId: parsed.sessionId, generationId: parsed.generationId, operationId: parsed.operationId),
      expectedPhaseRevision: expectedPhaseRevision,
      expectedPathRevision: expectedPathRevision,
      idempotencyKey: idempotencyKey
    )
  }

  private func adoptDirectedOwner(_ command: DirectedSteeringCommandV1, _ acknowledgement: DirectedSchedulerAcknowledgementV1) {
    guard ["accepted", "applied", "cancelled"].contains(acknowledgement.status) else { return }
    owner = Owner(sessionId: command.owner.sessionId, generationId: command.owner.generationId, operationId: command.owner.operationId)
  }

  private func directedSystemCommand(_ purpose: String) -> DirectedSteeringCommandV1? {
    guard let state = directedScheduler?.dictionary(),
      let phaseRevision = state["phaseRevision"] as? Int,
      let pathRevision = state["pathRevision"] as? Int
    else { return nil }
    let operation = max(owner.operationId + 1, (state["lastAcceptedOperationId"] as? Int ?? owner.operationId) + 1)
    return DirectedSteeringCommandV1(
      owner: DirectedSchedulerOwnerV1(sessionId: owner.sessionId, generationId: owner.generationId, operationId: operation),
      expectedPhaseRevision: phaseRevision,
      expectedPathRevision: pathRevision,
      idempotencyKey: "ios-system-\(purpose)-\(owner.sessionId)-\(owner.generationId)-\(operation)"
    )
  }

  private func dispatchDirectedRemote(_ type: String) -> Bool {
    guard sessionType == "directed", directedScheduler != nil, let command = directedSystemCommand("remote-\(type)") else { return false }
    let acknowledgement: DirectedSchedulerAcknowledgementV1
    switch type {
    case "play":
      guard let result = directedScheduler?.play(command) else { return false }
      acknowledgement = result
    case "pause":
      guard let result = directedScheduler?.pause(command) else { return false }
      acknowledgement = result
    case "stop":
      guard let result = directedScheduler?.stop(command, reason: "user-ended") else { return false }
      acknowledgement = result
    default: return false
    }
    adoptDirectedOwner(command, acknowledgement)
    if acknowledgement.status == "accepted" {
      if type == "pause" || type == "stop" { layers.values.forEach { $0.player.pause() } }
      userPausedOrStopped = type != "play"
      interruptionMayResume = false
    }
    consumeDirectedActions()
    if acknowledgement.status == "accepted", type == "play" {
      let activeLayerIds = Set(directedActiveEvents.values)
      for layerId in activeLayerIds { layers[layerId]?.player.play() }
    }
    scheduleDirectedWake()
    updateNowPlaying(rate: type == "play" ? 1 : 0)
    _ = publish(kind: "directed_remote_\(type)", phase: directedPhase())
    return acknowledgement.status == "accepted"
  }

  private func scheduleDirectedWake() {
    cancelDirectedWake()
    guard let scheduler = directedScheduler else { return }
    let delayMs = scheduler.nextWakeDelayMs()
    guard delayMs.isFinite else { return }
    let expectedOwner = owner
    let token = UUID()
    directedWakeToken = token
    let source = DispatchSource.makeTimerSource(queue: .main)
    source.schedule(deadline: .now() + max(0.001, delayMs / 1000), leeway: .milliseconds(20))
    source.setEventHandler { [weak self, weak source] in
      guard let self, let source else { return }
      guard self.directedWakeToken == token, self.owner.sessionId == expectedOwner.sessionId,
        self.owner.generationId == expectedOwner.generationId else { return }
      source.setEventHandler {}
      source.cancel()
      self.directedWake = nil
      self.directedWakeToken = nil
      _ = self.directedScheduler?.reconcile()
      self.consumeDirectedActions()
      self.updateNowPlaying(rate: self.directedPhase() == "playing" ? 1 : 0)
      _ = self.publish(kind: "directed_position_tick", phase: self.directedPhase())
      self.scheduleDirectedWake()
    }
    directedWake = source
    source.resume()
  }

  private func cancelDirectedWake() {
    directedWake?.setEventHandler {}
    directedWake?.cancel()
    directedWake = nil
    directedWakeToken = nil
  }

  private func cancelDirectedRuntime(clearScheduler: Bool, clearActiveEvents: Bool) {
    cancelDirectedWake()
    for timer in directedCallbacks.values {
      timer.setEventHandler {}
      timer.cancel()
    }
    directedCallbacks.removeAll()
    directedActiveActions.removeAll()
    if clearActiveEvents { directedActiveEvents.removeAll() }
    currentDirectedLayerId = nil
    if clearScheduler { directedScheduler = nil }
  }

  private func consumeDirectedActions() {
    guard let scheduler = directedScheduler else { return }
    for action in scheduler.drainActions() {
      switch action.type {
      case .startEvent:
        guard let eventId = action.eventId, let layerId = action.layerId, let layer = layers[layerId] else {
          scheduler.schedulerFailed()
          continue
        }
        if layer.player.currentItem == nil { layer.player.insert(AVPlayerItem(url: layer.sourceURL), after: nil) }
        layer.player.seek(to: .zero, toleranceBefore: .zero, toleranceAfter: .zero)
        let target = min(maxLayerGain, max(minimumOptionalGain, action.gain ?? minimumOptionalGain))
        layer.player.volume = action.fadeInMs > 0 ? 0 : target
        layer.player.play()
        currentDirectedLayerId = layerId
        directedActiveEvents[eventId] = layerId
        directedActiveActions[eventId] = action
        if action.fadeInMs > 0 { scheduleDirectedVolume(layerId: layerId, eventId: eventId, target: target, durationMs: action.fadeInMs) }
        if !action.continuous, action.durationMs > action.fadeOutMs, action.fadeOutMs > 0 {
          scheduleDirectedDelayedFade(layerId: layerId, eventId: eventId, delayMs: action.durationMs - action.fadeOutMs, fadeOutMs: action.fadeOutMs)
        }
      case .phaseChanged, .applyGains:
        applyDirectedGains(durationMs: action.type == .phaseChanged ? max(action.fadeInMs, directedPhaseCrossfadeMs) : 250)
      case .terminalFade:
        for (eventId, layerId) in directedActiveEvents {
          scheduleDirectedVolume(layerId: layerId, eventId: eventId, target: 0, durationMs: action.fadeOutMs)
        }
      case .stopAll:
        let terminalKind = action.detail == "directed_completed" ? "directed_completed" : (action.detail == "directed_failed" ? "directed_failed" : "directed_stopped")
        cancelDirectedRuntime(clearScheduler: false, clearActiveEvents: true)
        stopPlayers(release: true)
        completed = terminalKind == "directed_completed"
        completionPositionMillis = completed ? durationMillis : nil
        updateNowPlaying(rate: 0)
        _ = publish(kind: terminalKind, phase: completed ? "ended" : (terminalKind == "directed_failed" ? "error" : "stopped"))
      }
    }
  }

  private func effectiveDirectedGain(eventId: String, layerId: String) -> Float {
    guard let gain = directedScheduler?.resolvedGain(eventId: eventId, layerId: layerId) else { return 0 }
    return min(maxLayerGain, max(minimumOptionalGain, gain))
  }

  private func applyDirectedGains(durationMs: Double) {
    let active = Array(directedActiveEvents)
    for (eventId, layerId) in active {
      let resolvedLayerId = layers.keys.first(where: { directedScheduler?.resolvedGain(eventId: eventId, layerId: $0) != nil })
      guard let resolvedLayerId else {
        scheduleDirectedVolume(layerId: layerId, eventId: eventId, target: 0, durationMs: durationMs)
        continue
      }
      if resolvedLayerId != layerId, let replacement = layers[resolvedLayerId] {
        if replacement.player.currentItem == nil { replacement.player.insert(AVPlayerItem(url: replacement.sourceURL), after: nil) }
        replacement.player.seek(to: .zero, toleranceBefore: .zero, toleranceAfter: .zero)
        replacement.player.volume = 0
        replacement.player.play()
        directedActiveEvents[eventId] = resolvedLayerId
        currentDirectedLayerId = resolvedLayerId
        scheduleDirectedDetachedVolume(layerId: layerId, target: 0, durationMs: durationMs)
      }
      scheduleDirectedVolume(
        layerId: resolvedLayerId,
        eventId: eventId,
        target: effectiveDirectedGain(eventId: eventId, layerId: resolvedLayerId),
        durationMs: durationMs
      )
    }
  }

  private func scheduleDirectedDetachedVolume(layerId: String, target: Float, durationMs: Double) {
    guard let layer = layers[layerId] else { return }
    if durationMs <= 0 { layer.player.volume = target; if target <= 0 { layer.player.pause() }; return }
    let token = UUID()
    let expectedOwner = owner
    let start = layer.player.volume
    let steps = max(1, Int(ceil(durationMs / 50)))
    var step = 0
    let source = DispatchSource.makeTimerSource(queue: .main)
    source.schedule(deadline: .now(), repeating: max(0.01, durationMs / Double(steps) / 1000), leeway: .milliseconds(10))
    source.setEventHandler { [weak self, weak source, weak player = layer.player] in
      guard let self, let source, let player else { return }
      guard self.owner.sessionId == expectedOwner.sessionId, self.owner.generationId == expectedOwner.generationId else {
        self.directedCallbacks.removeValue(forKey: token)
        source.setEventHandler {}; source.cancel(); return
      }
      step += 1
      let fraction = Float(min(1, Double(step) / Double(steps)))
      player.volume = start + (target - start) * fraction
      if step >= steps {
        self.directedCallbacks.removeValue(forKey: token)
        source.setEventHandler {}; source.cancel()
        if target <= 0 { player.pause() }
      }
    }
    directedCallbacks[token] = source
    source.resume()
  }

  private func scheduleDirectedDelayedFade(layerId: String, eventId: String, delayMs: Double, fadeOutMs: Double) {
    let token = UUID()
    let expectedOwner = owner
    let source = DispatchSource.makeTimerSource(queue: .main)
    source.schedule(deadline: .now() + max(0.001, delayMs / 1000), leeway: .milliseconds(20))
    source.setEventHandler { [weak self, weak source] in
      guard let self, let source else { return }
      self.directedCallbacks.removeValue(forKey: token)
      source.setEventHandler {}
      source.cancel()
      guard self.owner.sessionId == expectedOwner.sessionId, self.owner.generationId == expectedOwner.generationId,
        self.directedActiveEvents[eventId] == layerId else { return }
      self.scheduleDirectedVolume(layerId: layerId, eventId: eventId, target: 0, durationMs: fadeOutMs)
    }
    directedCallbacks[token] = source
    source.resume()
  }

  private func scheduleDirectedVolume(layerId: String, eventId: String, target: Float, durationMs: Double) {
    guard let layer = layers[layerId] else { return }
    if durationMs <= 0 { layer.player.volume = target; return }
    let token = UUID()
    let expectedOwner = owner
    let start = layer.player.volume
    let steps = max(1, Int(ceil(durationMs / 50)))
    var step = 0
    let source = DispatchSource.makeTimerSource(queue: .main)
    source.schedule(deadline: .now(), repeating: max(0.01, durationMs / Double(steps) / 1000), leeway: .milliseconds(10))
    source.setEventHandler { [weak self, weak source, weak player = layer.player] in
      guard let self, let source, let player else { return }
      guard self.owner.sessionId == expectedOwner.sessionId, self.owner.generationId == expectedOwner.generationId,
        self.directedActiveEvents[eventId] == layerId else {
        self.directedCallbacks.removeValue(forKey: token)
        source.setEventHandler {}; source.cancel(); return
      }
      step += 1
      let fraction = Float(min(1, Double(step) / Double(steps)))
      player.volume = start + (target - start) * fraction
      if step >= steps {
        self.directedCallbacks.removeValue(forKey: token)
        source.setEventHandler {}; source.cancel()
        if target <= 0, self.directedActiveEvents[eventId] == layerId {
          player.pause()
          self.directedActiveEvents.removeValue(forKey: eventId)
          self.directedActiveActions.removeValue(forKey: eventId)
        }
      }
    }
    directedCallbacks[token] = source
    source.resume()
  }

  private func directedPhase() -> String {
    guard let transport = directedScheduler?.dictionary()["transport"] as? String else { return currentPhase() }
    switch transport {
    case "playing": return "playing"
    case "preparing": return "loading"
    case "completed": return "ended"
    case "failed": return "error"
    case "stopped": return "stopped"
    default: return "paused"
    }
  }

  private func beginSeek(
    layer: LayerPlayback,
    expectedItem: AVPlayerItem,
    expectedOwner: Owner,
    positionMillis: Double,
    shouldPlay: Bool,
    completionKind: String,
    promise: Promise? = nil
  ) {
    let target = CMTime(seconds: positionMillis / 1000, preferredTimescale: 600)
    layer.player.seek(
      to: target,
      toleranceBefore: .zero,
      toleranceAfter: .zero,
      completionHandler: { [weak self, weak player = layer.player, weak expectedItem] finished in
        DispatchQueue.main.async {
          guard let self else {
            promise?.reject(NSError(domain: "SoundscapeLayeredMedia", code: 11))
            return
          }
          guard let player, let expectedItem else {
            promise?.reject(self.error(11, "SEEK_RESOURCE_RELEASED"))
            return
          }
          guard
            self.owner == expectedOwner,
            self.layers.values.contains(where: { $0 === layer }),
            player.currentItem === expectedItem
          else {
            promise?.reject(self.error(7, "STALE_ASYNC_TRANSITION"))
            return
          }
          guard finished else {
            promise?.reject(self.error(12, "SEEK_INTERRUPTED"))
            return
          }

          self.completed = false
          self.completionPositionMillis = nil
          if shouldPlay {
            player.play()
            self.userPausedOrStopped = false
            self.interruptionMayResume = false
            self.startPositionPublisher()
          } else {
            player.pause()
            self.stopPositionPublisher()
          }
          let phase = shouldPlay
            ? (player.timeControlStatus == .playing ? "playing" : "loading")
            : "paused"
          self.updateNowPlaying(rate: phase == "playing" ? 1 : 0)
          let event = self.publish(kind: completionKind, phase: phase)
          promise?.resolve(event)
        }
      }
    )
  }

  private func beginRemoteSeek(positionMillis: Double, shouldPlay: Bool) -> Bool {
    guard
      sessionType == "single",
      layers.count == 1,
      let layer = layers.values.first,
      let item = layer.player.currentItem
    else { return false }
    let requestedMillis = max(0, min(durationMillis, positionMillis))
    let expectedOwner = owner
    stopPositionPublisher()
    _ = publish(kind: "seek_pending", phase: "loading")
    beginSeek(
      layer: layer,
      expectedItem: item,
      expectedOwner: expectedOwner,
      positionMillis: requestedMillis,
      shouldPlay: shouldPlay,
      completionKind: "seek_completed"
    )
    return true
  }

  private func configureRemoteCommands() {
    let commands = MPRemoteCommandCenter.shared()
    let playTarget = commands.playCommand.addTarget { [weak self] _ in self?.remote("play") ?? .commandFailed }
    let pauseTarget = commands.pauseCommand.addTarget { [weak self] _ in self?.remote("pause") ?? .commandFailed }
    commands.stopCommand.isEnabled = true
    let stopTarget = commands.stopCommand.addTarget { [weak self] _ in self?.remote("stop") ?? .commandFailed }
    commands.changePlaybackPositionCommand.isEnabled = true
    commands.nextTrackCommand.isEnabled = false
    commands.previousTrackCommand.isEnabled = false
    commands.skipForwardCommand.isEnabled = false
    commands.skipBackwardCommand.isEnabled = false
    let seekTarget = commands.changePlaybackPositionCommand.addTarget { [weak self] event in
      guard
        let self,
        self.sessionType == "single",
        let event = event as? MPChangePlaybackPositionCommandEvent
      else { return MPRemoteCommandHandlerStatus.commandFailed }
      return self.beginRemoteSeek(
        positionMillis: event.positionTime * 1000,
        shouldPlay: self.currentPhase() == "playing"
      ) ? .success : .commandFailed
    }
    remoteCommandTargets = [
      (commands.playCommand, playTarget),
      (commands.pauseCommand, pauseTarget),
      (commands.stopCommand, stopTarget),
      (commands.changePlaybackPositionCommand, seekTarget),
    ]
  }

  private func remote(_ type: String) -> MPRemoteCommandHandlerStatus {
    guard !owner.sessionId.isEmpty, !layers.isEmpty else { return .noSuchContent }
    if sessionType == "directed" {
      return dispatchDirectedRemote(type) ? .success : .commandFailed
    }
    do {
      _ = try command([
        "sessionId": owner.sessionId,
        "generationId": owner.generationId,
        "operationId": owner.operationId,
        "type": type,
      ])
      return .success
    } catch {
      return .commandFailed
    }
  }

  @objc private func interruption(_ note: Notification) {
    guard
      let info = note.userInfo,
      let raw = info[AVAudioSessionInterruptionTypeKey] as? UInt,
      let type = AVAudioSession.InterruptionType(rawValue: raw)
    else { return }

    if type == .began {
      stopPositionPublisher()
      layers.values.forEach { $0.player.pause() }
      interruptionMayResume = !userPausedOrStopped
      if sessionType == "directed" {
        directedScheduler?.interrupt("transient", userPausedOrStopped: userPausedOrStopped)
        cancelDirectedWake()
      }
      updateNowPlaying(rate: 0)
      _ = publish(kind: "interruption_began", phase: "paused")
      return
    }

    let options = AVAudioSession.InterruptionOptions(rawValue: info[AVAudioSessionInterruptionOptionKey] as? UInt ?? 0)
    if options.contains(.shouldResume) && interruptionMayResume && !userPausedOrStopped {
      if sessionType == "directed", let command = directedSystemCommand("interruption-resume") {
        if directedScheduler?.resumeAfterInterruption(command, osAllows: true) == true {
          adoptDirectedOwner(command, DirectedSchedulerAcknowledgementV1(status: "accepted", operationId: command.owner.operationId, idempotencyKey: command.idempotencyKey, pathRevision: (directedScheduler?.dictionary()["pathRevision"] as? Int) ?? 0, code: nil, message: nil, safeCheckpointWithinMs: 0))
          let activeLayerIds = Set(directedActiveEvents.values)
          for layerId in activeLayerIds { layers[layerId]?.player.play() }
          consumeDirectedActions()
          scheduleDirectedWake()
          updateNowPlaying(rate: 1)
        }
      } else {
        layers.values.forEach { $0.player.play() }
        startPositionPublisher()
        updateNowPlaying(rate: 1)
      }
    } else {
      updateNowPlaying(rate: 0)
    }
    interruptionMayResume = false
    _ = publish(kind: "interruption_ended", phase: currentPhase())
  }

  @objc private func routeChanged(_ note: Notification) {
    guard
      let raw = note.userInfo?[AVAudioSessionRouteChangeReasonKey] as? UInt,
      AVAudioSession.RouteChangeReason(rawValue: raw) == .oldDeviceUnavailable
    else { return }
    stopPositionPublisher()
    layers.values.forEach { $0.player.pause() }
    directedScheduler?.interrupt("route-loss", userPausedOrStopped: true)
    cancelDirectedWake()
    userPausedOrStopped = true
    interruptionMayResume = false
    updateNowPlaying(rate: 0)
    _ = publish(kind: "route_loss", phase: "paused")
  }

  @objc private func playbackFailed(_ note: Notification) {
    guard let failedLayer = layers.values.first(where: { $0.player.currentItem === note.object as? AVPlayerItem }) else { return }
    stopPositionPublisher()
    completed = false
    completionPositionMillis = nil
    if sessionType == "directed" {
      let endedReason: String
      if failedLayer.required {
        endedReason = "required-asset-failed"
        let failedLayerId = layers.first(where: { $0.value === failedLayer })?.key ?? failedLayer.soundId
        directedScheduler?.requiredAssetFailed(failedLayerId)
      } else {
        endedReason = "scheduler-failed"
        directedScheduler?.schedulerFailed()
      }
      consumeDirectedActions()
      _ = endedReason
      return
    }
    _ = publish(kind: "error", phase: "error")
  }

  @objc private func playbackEnded(_ note: Notification) {
    guard
      let item = note.object as? AVPlayerItem,
      let layer = layers.values.first(where: { $0.player.currentItem === item }),
      layer.owner.sessionId == owner.sessionId,
      layer.owner.generationId == owner.generationId,
      timerFadeToken == nil
    else { return }

    let expectedOwner = owner
    let expectedItem = item
    guard layer.player.currentItem === expectedItem else { return }
    if sessionType == "directed" {
      let endedLayerId = layers.first(where: { $0.value === layer })?.key
      let endedEventIds = directedActiveEvents.compactMap { $0.value == endedLayerId ? $0.key : nil }
      let shouldContinue = directedPhase() == "playing"
      for eventId in endedEventIds {
        if directedActiveActions[eventId]?.continuous == true, layer.loopEligible, shouldContinue {
          layer.player.seek(to: .zero, toleranceBefore: .zero, toleranceAfter: .zero)
          layer.player.volume = effectiveDirectedGain(eventId: eventId, layerId: endedLayerId ?? "")
          layer.player.play()
        } else {
          directedActiveEvents.removeValue(forKey: eventId)
          directedActiveActions.removeValue(forKey: eventId)
        }
      }
      return
    }
    if loopEnabled && layer.loopEligible {
      stopPositionPublisher()
      _ = publish(kind: "loop_boundary_pending", phase: "loading")
      beginSeek(
        layer: layer,
        expectedItem: expectedItem,
        expectedOwner: expectedOwner,
        positionMillis: 0,
        shouldPlay: true,
        completionKind: "loop_boundary"
      )
      return
    }

    guard sessionType == "single", layers.count == 1 else { return }
    stopPositionPublisher()
    cancelTimer()
    completed = true
    completionPositionMillis = max(0, durationMillis)
    updateNowPlaying(rate: 0)
    _ = publish(kind: "playback_completed", phase: "ended")
  }

  private func updateNowPlaying(rate: Double) {
    guard let metadata else { return }
    MPRemoteCommandCenter.shared().changePlaybackPositionCommand.isEnabled = sessionType == "single"
    var info: [String: Any] = [
      MPMediaItemPropertyTitle: metadata["title"] as? String ?? "Soundscape",
      MPMediaItemPropertyArtist: metadata["artist"] as? String ?? "Soundscape",
      MPNowPlayingInfoPropertyPlaybackRate: rate,
      MPNowPlayingInfoPropertyMediaType: MPNowPlayingInfoMediaType.audio.rawValue,
      MPNowPlayingInfoPropertyExternalContentIdentifier: metadata["recipeId"] as? String ?? owner.sessionId,
    ]
    if sessionType == "directed", let state = directedScheduler?.dictionary() {
      info[MPMediaItemPropertyPlaybackDuration] = durationMillis / 1000
      info[MPNowPlayingInfoPropertyElapsedPlaybackTime] = ((state["playedElapsedMs"] as? NSNumber)?.doubleValue ?? 0) / 1000
    }
    if sessionType == "single", let player = layers.values.first {
      info[MPMediaItemPropertyPlaybackDuration] = durationMillis / 1000
      let elapsed = player.player.currentTime().seconds
      info[MPNowPlayingInfoPropertyElapsedPlaybackTime] = elapsed.isFinite ? max(0, elapsed) : 0
    }
    MPNowPlayingInfoCenter.default().nowPlayingInfo = info
  }

  private func parseOwner(_ payload: [String: Any]) throws -> Owner {
    guard
      let sessionId = payload["sessionId"] as? String,
      let generation = (payload["generationId"] as? NSNumber)?.intValue,
      let operation = (payload["operationId"] as? NSNumber)?.intValue
    else { throw error(6, "INVALID_OWNERSHIP") }
    return Owner(sessionId: sessionId, generationId: generation, operationId: operation)
  }

  private func accept(_ candidate: Owner) throws {
    guard
      candidate.sessionId == owner.sessionId,
      candidate.generationId == owner.generationId,
      candidate.operationId >= owner.operationId
    else { throw error(7, "STALE_OPERATION") }
  }

  private func startPositionPublisher() {
    stopPositionPublisher()
    guard
      sessionType == "single",
      layers.count == 1,
      let layer = layers.values.first,
      !owner.sessionId.isEmpty,
      durationMillis > 0
    else { return }
    let expectedOwner = owner
    let initialSeconds = layer.player.currentTime().seconds
    lastPublishedPositionMillis = initialSeconds.isFinite ? max(0, initialSeconds * 1000) : 0
    let interval = CMTime(seconds: positionTickIntervalSeconds, preferredTimescale: 600)
    let token = layer.player.addPeriodicTimeObserver(forInterval: interval, queue: .main) { [weak self, weak player = layer.player] _ in
      guard let self, let player else { return }
      guard
        self.owner.sessionId == expectedOwner.sessionId,
        self.owner.generationId == expectedOwner.generationId,
        self.sessionType == "single",
        self.layers.count == 1,
        player.currentItem?.error == nil
      else {
        self.stopPositionPublisher()
        return
      }
      guard player.timeControlStatus == .playing else { return }
      let seconds = player.currentTime().seconds
      let positionMillis = seconds.isFinite ? max(0, seconds * 1000) : 0
      let wrapped = self.loopEnabled
        && (self.layers.values.first?.loopEligible == true)
        && positionMillis + 250 < (self.lastPublishedPositionMillis ?? positionMillis)
      self.lastPublishedPositionMillis = positionMillis
      if wrapped {
        _ = self.publish(kind: "loop_boundary", phase: "playing")
      } else {
        _ = self.publish(kind: "position_tick", phase: "playing")
      }
    }
    positionTimeObserver = (layer.player, token)
  }

  private func stopPositionPublisher() {
    if let observer = positionTimeObserver {
      observer.player.removeTimeObserver(observer.token)
    }
    positionTimeObserver = nil
    lastPublishedPositionMillis = nil
  }

  private func stopPlayers(release: Bool) {
    stopPositionPublisher()
    layers.values.forEach {
      $0.player.pause()
      $0.player.removeAllItems()
    }
    if release { layers.removeAll() }
  }

  private func startTimerFade(owner expected: Owner, deadlineMs: Double, firedAtMs: Double) {
    cancelTimerFade(restoreVolumes: false)
    let token = UUID()
    timerFadeToken = token
    timerFadeStep = 0
    timerFadeStartingVolumes = Dictionary(uniqueKeysWithValues: layers.map { ($0.key, $0.value.player.volume) })

    let source = DispatchSource.makeTimerSource(queue: .main)
    source.schedule(deadline: .now() + 1, repeating: 1, leeway: .milliseconds(25))
    source.setEventHandler { [weak self] in
      guard let self else { return }
      guard
        self.timerFadeToken == token,
        self.owner.sessionId == expected.sessionId,
        self.owner.generationId == expected.generationId,
        self.owner.operationId >= expected.operationId
      else {
        self.cancelTimerFade(restoreVolumes: false)
        return
      }

      self.timerFadeStep += 1
      let remainingFraction = Float(max(0, 5 - self.timerFadeStep)) / 5
      for (layerId, layer) in self.layers {
        layer.player.volume = (self.timerFadeStartingVolumes[layerId] ?? 0) * remainingFraction
      }
      if self.timerFadeStep >= 5 {
        source.setEventHandler {}
        source.cancel()
        self.timerFade = nil
        self.timerFadeToken = nil
        self.timerFadeStartingVolumes.removeAll()
        self.recordTimer(kind: "timer_stop_started", detail: ["reason": "deadline_elapsed_after_fade"])
        _ = try? self.command([
          "sessionId": expected.sessionId,
          "generationId": expected.generationId,
          "operationId": max(expected.operationId, self.owner.operationId),
          "type": "stop",
        ])
        self.recordTimer(kind: "timer_fired", detail: ["errorMs": firedAtMs - deadlineMs])
        _ = self.publish(kind: "timer_fired", phase: "stopped")
      }
    }
    timerFade = source
    recordTimer(kind: "timer_fade_started", detail: ["durationMs": timerFadeDurationSeconds * 1000])
    _ = publish(kind: "timer_fade_started", phase: currentPhase())
    source.resume()
  }

  private func cancelTimerFade(restoreVolumes: Bool) {
    timerFade?.setEventHandler {}
    timerFade?.cancel()
    timerFade = nil
    timerFadeToken = nil
    timerFadeStep = 0
    if restoreVolumes {
      for (layerId, layer) in layers {
        layer.player.volume = layer.enabled ? layer.volume : 0
        timerFadeStartingVolumes[layerId] = layer.player.volume
      }
    }
    timerFadeStartingVolumes.removeAll()
  }

  private func cancelTimer() {
    timer?.setEventHandler {}
    timer?.cancel()
    timer = nil
    timerToken = nil
    timerDeadlineElapsedRealtimeMs = nil
  }

  private func currentPhase() -> String {
    if layers.isEmpty { return "idle" }
    if completed { return "ended" }
    return layers.values.contains(where: { $0.player.timeControlStatus == .playing }) ? "playing" : "paused"
  }

  private func recordTimer(kind: String, detail: [String: Any]) {
    guard timerDiagnosticsEnabled else { return }
    timerDiagnostics.append([
      "kind": kind,
      "atElapsedRealtimeMs": ProcessInfo.processInfo.systemUptime * 1000,
      "sessionId": owner.sessionId,
      "generationId": owner.generationId,
      "operationId": owner.operationId,
      "detail": detail,
    ])
    if timerDiagnostics.count > 32 {
      timerDiagnostics.removeFirst(timerDiagnostics.count - 32)
    }
  }

  private func publish(kind: String, phase: String) -> [String: Any] {
    eventId += 1
    let layerStates = layers.keys.sorted().compactMap { layerId -> [String: Any]? in
      guard let layer = layers[layerId] else { return nil }
      return [
        "layerId": layerId,
        "soundId": layer.soundId,
        "enabled": layer.enabled,
        "volume": Double(layer.volume),
        "playing": layer.player.timeControlStatus == .playing,
        "buffering": layer.player.timeControlStatus == .waitingToPlayAtSpecifiedRate,
      ]
    }
    let deadlineValue: Any = timerDeadlineElapsedRealtimeMs.map { $0 as Any } ?? NSNull()
    let metadataValue: Any = metadata.map { $0 as Any } ?? NSNull()
    let sessionTypeValue: Any = sessionType.map { $0 as Any } ?? NSNull()
    let directedStateValue: Any = directedScheduler.map { $0.dictionary() as Any } ?? NSNull()
    let positionMillis: Double = {
      if let completionPositionMillis { return min(max(0, durationMillis), completionPositionMillis) }
      if sessionType == "directed" {
        return min(max(0, durationMillis), max(0, (directedScheduler?.dictionary()["playedElapsedMs"] as? NSNumber)?.doubleValue ?? 0))
      }
      guard sessionType == "single", let seconds = layers.values.first?.player.currentTime().seconds, seconds.isFinite else { return 0 }
      return min(max(0, durationMillis), max(0, seconds * 1000))
    }()
    let event: [String: Any] = [
      "kind": kind,
      "sessionId": owner.sessionId,
      "sessionType": sessionTypeValue,
      "generationId": owner.generationId,
      "operationId": owner.operationId,
      "eventId": eventId,
      "phase": phase,
      "layers": layerStates,
      "positionMillis": positionMillis,
      "durationMillis": durationMillis,
      "loopEnabled": loopEnabled,
      "timerDeadlineElapsedRealtimeMs": deadlineValue,
      "timerDiagnostics": timerDiagnostics,
      "userPausedOrStopped": userPausedOrStopped,
      "interruptionMayResume": interruptionMayResume,
      "metadata": metadataValue,
      "directedSessionState": directedStateValue,
      "acknowledgedAtElapsedRealtimeMs": ProcessInfo.processInfo.systemUptime * 1000,
    ]
    emit?(event)
    return event
  }

  private func error(_ code: Int, _ message: String) -> NSError {
    NSError(
      domain: "SoundscapeLayeredMedia",
      code: code,
      userInfo: [NSLocalizedDescriptionKey: message]
    )
  }
}

public class SoundscapeLayeredMediaModule: Module {
  private let engine = IOSLayeredMediaEngine()

  public func definition() -> ModuleDefinition {
    Name("SoundscapeLayeredMedia")
    Events("onNativeMediaEvent")
    OnCreate {
      self.engine.emit = { [weak self] event in
        self?.sendEvent("onNativeMediaEvent", event)
      }
    }
    Function("isAvailable") { true }
    Function("directedSessionSchedulerVersion") { 1 }
    Function("nativeElapsedRealtimeMs") { ProcessInfo.processInfo.systemUptime * 1000 }
    Function("notificationPermissionState") { self.engine.notificationPermissionState() }
    Function("ensureMediaNotificationChannel") { self.engine.notificationPermissionState() }
    Function("openNotificationSettings") { }
    AsyncFunction("defineSession") { (payload: [String: Any]) in try self.engine.define(payload) }
    AsyncFunction("dispatch") { (payload: [String: Any]) in try self.engine.command(payload) }
    AsyncFunction("setLayer") { (payload: [String: Any]) in try self.engine.setLayer(payload) }
    AsyncFunction("setLoop") { (payload: [String: Any]) in try self.engine.setLoop(payload) }
    AsyncFunction("seek") { (payload: [String: Any], promise: Promise) in
      self.engine.seek(payload, promise: promise)
    }
    AsyncFunction("setTimer") { (payload: [String: Any]) in try self.engine.setTimer(payload) }
    AsyncFunction("setTimerDiagnosticsEnabled") { (enabled: Bool) in self.engine.setTimerDiagnosticsEnabled(enabled) }
    AsyncFunction("queryState") { self.engine.state() }
    AsyncFunction("createDirectedSession") { (payload: [String: Any]) in try self.engine.createDirectedSession(payload) }
    AsyncFunction("dispatchDirectedSession") { (payload: [String: Any]) in try self.engine.dispatchDirectedSession(payload) }
    AsyncFunction("steerDirectedSession") { (payload: [String: Any]) in try self.engine.steerDirectedSession(payload) }
    AsyncFunction("undoDirectedSessionSteering") { (payload: [String: Any]) in try self.engine.undoDirectedSessionSteering(payload) }
    AsyncFunction("adjustDirectedSession") { (payload: [String: Any]) in try self.engine.adjustDirectedSession(payload) }
    AsyncFunction("setDirectedSessionOutputProfile") { (payload: [String: Any]) in try self.engine.setDirectedSessionOutputProfile(payload) }
    AsyncFunction("getDirectedSessionState") { self.engine.directedSessionState() }
    AsyncFunction("dispose") { (payload: [String: Any]) in
      try self.engine.command(payload.merging(["type": "dispose"]) { _, new in new })
    }
  }
}
