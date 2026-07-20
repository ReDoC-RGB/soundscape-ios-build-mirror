Pod::Spec.new do |s|
  s.name           = 'SoundscapeLayeredMedia'
  s.version        = '0.11.4'
  s.summary        = 'First-party layered media engine foundation for Soundscape.'
  s.description    = 'Production aggregate AVFoundation and MediaPlayer ownership boundary for Soundscape playback.'
  s.author         = 'Wellmade Systems'
  s.homepage       = 'https://wellmadesystems.com'
  s.platforms      = { :ios => '15.1' }
  s.source         = { :git => 'https://github.com/ReDoC-RGB/soundscape-ios-build-mirror.git' }
  s.static_framework = true
  s.swift_version = '5.9'
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'AVFoundation', 'MediaPlayer'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
