export const M6_CATALOG_EXPANSION_VERSION = "1" as const;
export const M6_REV5_IDENTITY_COUNT = 21 as const;
export const M6_REV5_VOICE_IDENTITY_COUNT = 0 as const;
export const M6_NEW_IDENTITY_COUNT = 31 as const;
export const M6_VOICE_IDENTITY_COUNT = 10 as const;
export const M6_QUALIFIED_CORE_VOICE_COUNT = 10 as const;
export type M6LocalCatalogIdentity = Readonly<{
  id: string; title: string; audioUrl: string; durationSeconds: number; triggerFamilyIds: readonly string[];
  materialIds: readonly string[]; actionIds: readonly string[]; manualOnly: boolean; neverAutoplay: boolean;
  warningRequired: boolean; containsVoice: boolean; loopEligible: false; builderRole: "texture" | "accent" | "foreground";
  humanSensoryDecision: "PASS" | "PASS_WITH_NOTES" | "PASS_NONVOICE_ONLY"; activationEligible: true;
  lifecycleState: "active";
  audioSha256: string;
  deliveryAudioSha256?: string;
  coreVoice?: boolean;
  voiceModality?: "whisper" | "soft-spoken";
  performerType?: "human" | "synthetic";
  syntheticVoice?: boolean;
  voiceLabel?: string;
  voiceProvenanceSummary?: string;
  transcript?: string;
  intendedTranscriptEvidence?: string;
  actualTranscriptEvidence?: string;
  transcriptVerified?: boolean;
  rightsEvidenceComplete?: boolean;
  playbackEvidenceComplete: true;
}>;

export const m6CatalogExpansionV1: readonly M6LocalCatalogIdentity[] = Object.freeze([
  {
    "id": "m6-nonvoice-bb9-012-screwdriver-taps-and-coin-jar",
    "title": "Screwdriver taps and coin jar",
    "audioUrl": "https://cdn.freesound.org/previews/435/435814_6262563-lq.mp3",
    "durationSeconds": 60.744,
    "triggerFamilyIds": [
      "tapping_object_handling"
    ],
    "materialIds": [
      "metal",
      "mixed"
    ],
    "actionIds": [
      "tap",
      "handle"
    ],
    "manualOnly": false,
    "neverAutoplay": false,
    "warningRequired": false,
    "containsVoice": false,
    "loopEligible": false,
    "builderRole": "texture",
    "humanSensoryDecision": "PASS",
    "activationEligible": true,
    "lifecycleState": "active",
    "playbackEvidenceComplete": true,
    "audioSha256": "128ea864b4a1d1b1147103c8d361070fa5ed7f99290c88881db458bfd55efb7f"
  },
  {
    "id": "m6-nonvoice-bb9-013-shells-on-marble-and-ceramic",
    "title": "Shells on marble and ceramic",
    "audioUrl": "https://cdn.freesound.org/previews/800/800116_2520418-lq.mp3",
    "durationSeconds": 20.592,
    "triggerFamilyIds": [
      "tapping_object_handling"
    ],
    "materialIds": [
      "mixed"
    ],
    "actionIds": [
      "tap",
      "handle"
    ],
    "manualOnly": false,
    "neverAutoplay": false,
    "warningRequired": false,
    "containsVoice": false,
    "loopEligible": false,
    "builderRole": "texture",
    "humanSensoryDecision": "PASS",
    "activationEligible": true,
    "lifecycleState": "active",
    "playbackEvidenceComplete": true,
    "audioSha256": "ebdf59934d9cb4cc744e60aa3a178dbff4025f9fe1cbe43f997c1d76fba9dd75"
  },
  {
    "id": "m6-nonvoice-bb9-009-finger-tapping-on-metal-pipe",
    "title": "Finger tapping on metal pipe",
    "audioUrl": "https://cdn.freesound.org/previews/811/811807_13183432-lq.mp3",
    "durationSeconds": 21.84,
    "triggerFamilyIds": [
      "tapping_object_handling"
    ],
    "materialIds": [
      "metal"
    ],
    "actionIds": [
      "tap"
    ],
    "manualOnly": false,
    "neverAutoplay": false,
    "warningRequired": false,
    "containsVoice": false,
    "loopEligible": false,
    "builderRole": "texture",
    "humanSensoryDecision": "PASS",
    "activationEligible": true,
    "lifecycleState": "active",
    "playbackEvidenceComplete": true,
    "audioSha256": "8bf73462c73cc8a30da93cf8222fb02433c11b0e4790f59befee1c1e2d290603"
  },
  {
    "id": "m6-nonvoice-bb10-009-finger-tapping-on-table",
    "title": "Finger tapping on table",
    "audioUrl": "https://cdn.freesound.org/previews/557/557363_7281605-lq.mp3",
    "durationSeconds": 12.48,
    "triggerFamilyIds": [
      "tapping_object_handling"
    ],
    "materialIds": [
      "wood"
    ],
    "actionIds": [
      "tap"
    ],
    "manualOnly": false,
    "neverAutoplay": false,
    "warningRequired": false,
    "containsVoice": false,
    "loopEligible": false,
    "builderRole": "accent",
    "humanSensoryDecision": "PASS",
    "activationEligible": true,
    "lifecycleState": "active",
    "playbackEvidenceComplete": true,
    "audioSha256": "8824160d4adfd0518aee0dfff4e2b7fa89e83ba1078083a7260aea1159b99c61"
  },
  {
    "id": "m6-nonvoice-bb9-026-book-handling",
    "title": "Book handling",
    "audioUrl": "https://cdn.freesound.org/previews/250/250017_389377-lq.mp3",
    "durationSeconds": 132.024,
    "triggerFamilyIds": [
      "paper_pages_writing_typing"
    ],
    "materialIds": [
      "paper"
    ],
    "actionIds": [
      "handle",
      "turn_pages"
    ],
    "manualOnly": false,
    "neverAutoplay": false,
    "warningRequired": false,
    "containsVoice": false,
    "loopEligible": false,
    "builderRole": "texture",
    "humanSensoryDecision": "PASS",
    "activationEligible": true,
    "lifecycleState": "active",
    "playbackEvidenceComplete": true,
    "audioSha256": "644b663b4d00777cda8f91fdc93baf71289f0bd06c918c47b80d6109af76cb5a"
  },
  {
    "id": "m6-nonvoice-bb9-033-pencil-and-marker-writing",
    "title": "Pencil and marker writing",
    "audioUrl": "https://cdn.freesound.org/previews/530/530190_6652872-lq.mp3",
    "durationSeconds": 82.368,
    "triggerFamilyIds": [
      "paper_pages_writing_typing"
    ],
    "materialIds": [
      "paper"
    ],
    "actionIds": [
      "write"
    ],
    "manualOnly": false,
    "neverAutoplay": false,
    "warningRequired": false,
    "containsVoice": false,
    "loopEligible": false,
    "builderRole": "texture",
    "humanSensoryDecision": "PASS",
    "activationEligible": true,
    "lifecycleState": "active",
    "playbackEvidenceComplete": true,
    "audioSha256": "42f0fc55c745883d196967f1a4265b24f74f1f93d38b4256bef6f4c3f9b171dc"
  },
  {
    "id": "m6-nonvoice-bb9-032-paper-handling",
    "title": "Paper handling",
    "audioUrl": "https://cdn.freesound.org/previews/534/534957_37011-lq.mp3",
    "durationSeconds": 75.528,
    "triggerFamilyIds": [
      "paper_pages_writing_typing"
    ],
    "materialIds": [
      "paper"
    ],
    "actionIds": [
      "handle"
    ],
    "manualOnly": false,
    "neverAutoplay": false,
    "warningRequired": false,
    "containsVoice": false,
    "loopEligible": false,
    "builderRole": "texture",
    "humanSensoryDecision": "PASS",
    "activationEligible": true,
    "lifecycleState": "active",
    "playbackEvidenceComplete": true,
    "audioSha256": "31a222ee823512662c24d2f30aad0db4eb1eaee2941fe4323338dd5d376a75a0"
  },
  {
    "id": "m6-nonvoice-bb9-025-book-open-close-and-pages",
    "title": "Book open, close, and pages",
    "audioUrl": "https://cdn.freesound.org/previews/734/734547_13973196-lq.mp3",
    "durationSeconds": 44.208,
    "triggerFamilyIds": [
      "paper_pages_writing_typing"
    ],
    "materialIds": [
      "paper"
    ],
    "actionIds": [
      "turn_pages",
      "handle"
    ],
    "manualOnly": false,
    "neverAutoplay": false,
    "warningRequired": false,
    "containsVoice": false,
    "loopEligible": false,
    "builderRole": "texture",
    "humanSensoryDecision": "PASS",
    "activationEligible": true,
    "lifecycleState": "active",
    "playbackEvidenceComplete": true,
    "audioSha256": "90a3ec482e2c80abe8a93c0587f901e6829efb61367d43842e4b8b5e78c9a032"
  },
  {
    "id": "m6-nonvoice-bb9-051-plastic-hairbrush",
    "title": "Plastic hairbrush",
    "audioUrl": "https://cdn.freesound.org/previews/199/199299_2723971-lq.mp3",
    "durationSeconds": 45.528,
    "triggerFamilyIds": [
      "brushing_mic_brushing"
    ],
    "materialIds": [
      "plastic"
    ],
    "actionIds": [
      "brush"
    ],
    "manualOnly": false,
    "neverAutoplay": false,
    "warningRequired": false,
    "containsVoice": false,
    "loopEligible": false,
    "builderRole": "texture",
    "humanSensoryDecision": "PASS",
    "activationEligible": true,
    "lifecycleState": "active",
    "playbackEvidenceComplete": true,
    "audioSha256": "5ffa10e9d7608e041e4498892c423882a0234c9cd8eb01cddf98e988b1d608d6"
  },
  {
    "id": "m6-nonvoice-bb9-057-zip-and-rustling-fabric",
    "title": "Zip and rustling fabric",
    "audioUrl": "https://cdn.freesound.org/previews/728/728156_6033218-lq.mp3",
    "durationSeconds": 28.944,
    "triggerFamilyIds": [
      "fabric_cloth"
    ],
    "materialIds": [
      "fabric",
      "mixed"
    ],
    "actionIds": [
      "handle",
      "rub"
    ],
    "manualOnly": false,
    "neverAutoplay": false,
    "warningRequired": false,
    "containsVoice": false,
    "loopEligible": false,
    "builderRole": "texture",
    "humanSensoryDecision": "PASS",
    "activationEligible": true,
    "lifecycleState": "active",
    "playbackEvidenceComplete": true,
    "audioSha256": "1ce9fbb3eae7062b503890a5d73838b8b862dae4bfe4a004638c342f72d5bdda"
  },
  {
    "id": "m6-nonvoice-bb9-050-leather-jacket-handling",
    "title": "Leather jacket handling",
    "audioUrl": "https://cdn.freesound.org/previews/770/770050_13973196-lq.mp3",
    "durationSeconds": 36.096,
    "triggerFamilyIds": [
      "fabric_cloth"
    ],
    "materialIds": [
      "fabric"
    ],
    "actionIds": [
      "handle",
      "rub"
    ],
    "manualOnly": false,
    "neverAutoplay": false,
    "warningRequired": false,
    "containsVoice": false,
    "loopEligible": false,
    "builderRole": "texture",
    "humanSensoryDecision": "PASS",
    "activationEligible": true,
    "lifecycleState": "active",
    "playbackEvidenceComplete": true,
    "audioSha256": "dad31fb176893002f2ace0cf4b0598d1b2957ec94efae7dc1f6db23095d2ef6b"
  },
  {
    "id": "m6-nonvoice-bb9-046-brushing-knotty-hair",
    "title": "Brushing knotty hair",
    "audioUrl": "https://cdn.freesound.org/previews/443/443037_8282799-lq.mp3",
    "durationSeconds": 10.872,
    "triggerFamilyIds": [
      "brushing_mic_brushing"
    ],
    "materialIds": [
      "mixed"
    ],
    "actionIds": [
      "brush"
    ],
    "manualOnly": true,
    "neverAutoplay": true,
    "warningRequired": true,
    "containsVoice": false,
    "loopEligible": false,
    "builderRole": "accent",
    "humanSensoryDecision": "PASS",
    "activationEligible": true,
    "lifecycleState": "active",
    "playbackEvidenceComplete": true,
    "audioSha256": "c7fa270a095e33b39a3ef66efd182ba8e42e361e4f0236a1ef19076e547745aa"
  },
  {
    "id": "m6-nonvoice-bb9-059-asmr-mouth-sounds-1",
    "title": "ASMR mouth sounds 1",
    "audioUrl": "https://cdn.freesound.org/previews/530/530346_11771294-lq.mp3",
    "durationSeconds": 59.04,
    "triggerFamilyIds": [
      "mouth_sounds"
    ],
    "materialIds": [
      "not_applicable"
    ],
    "actionIds": [
      "not_applicable"
    ],
    "manualOnly": true,
    "neverAutoplay": true,
    "warningRequired": true,
    "containsVoice": false,
    "loopEligible": false,
    "builderRole": "texture",
    "humanSensoryDecision": "PASS",
    "activationEligible": true,
    "lifecycleState": "active",
    "playbackEvidenceComplete": true,
    "audioSha256": "9a5b0a02284822df3c7024b68fc2de79d4e75641219be9916fce02e04e83da0e"
  },
  {
    "id": "m6-nonvoice-bb9-060-asmr-mouth-sounds-2",
    "title": "ASMR mouth sounds 2",
    "audioUrl": "https://cdn.freesound.org/previews/530/530348_11771294-lq.mp3",
    "durationSeconds": 64.032,
    "triggerFamilyIds": [
      "mouth_sounds"
    ],
    "materialIds": [
      "not_applicable"
    ],
    "actionIds": [
      "not_applicable"
    ],
    "manualOnly": true,
    "neverAutoplay": true,
    "warningRequired": true,
    "containsVoice": false,
    "loopEligible": false,
    "builderRole": "texture",
    "humanSensoryDecision": "PASS",
    "activationEligible": true,
    "lifecycleState": "active",
    "playbackEvidenceComplete": true,
    "audioSha256": "2472db2b4f8cf1eee966f5406aa5416aa0cbeeffe58e611fd19a6b0e2eef5e19"
  },
  {
    "id": "m6-nonvoice-bb9-061-asmr-mouth-sounds-3",
    "title": "ASMR mouth sounds 3",
    "audioUrl": "https://cdn.freesound.org/previews/530/530349_11771294-lq.mp3",
    "durationSeconds": 14.04,
    "triggerFamilyIds": [
      "mouth_sounds"
    ],
    "materialIds": [
      "not_applicable"
    ],
    "actionIds": [
      "not_applicable"
    ],
    "manualOnly": true,
    "neverAutoplay": true,
    "warningRequired": true,
    "containsVoice": false,
    "loopEligible": false,
    "builderRole": "accent",
    "humanSensoryDecision": "PASS",
    "activationEligible": true,
    "lifecycleState": "active",
    "playbackEvidenceComplete": true,
    "audioSha256": "4fd065f7e081ec2e1bda6d6a0fdc5536f2402f8b1da9ad880a384bb8faf4d13a"
  },
  {
    "id": "m6-nonvoice-bb9-066-mouth-pops",
    "title": "Mouth pops",
    "audioUrl": "https://cdn.freesound.org/previews/802/802606_3501916-lq.mp3",
    "durationSeconds": 8.592,
    "triggerFamilyIds": [
      "mouth_sounds"
    ],
    "materialIds": [
      "not_applicable"
    ],
    "actionIds": [
      "not_applicable"
    ],
    "manualOnly": true,
    "neverAutoplay": true,
    "warningRequired": true,
    "containsVoice": false,
    "loopEligible": false,
    "builderRole": "accent",
    "humanSensoryDecision": "PASS",
    "activationEligible": true,
    "lifecycleState": "active",
    "playbackEvidenceComplete": true,
    "audioSha256": "2ebe034515a5293eab3382df2d37a8a1510bf4ee846bac72cb54d059c3e1dcd6"
  },
  {
    "id": "m6-nonvoice-bb10-048-deep-singing-bowl",
    "title": "Deep singing bowl",
    "audioUrl": "https://cdn.freesound.org/previews/699/699447_2557312-lq.mp3",
    "durationSeconds": 294.432,
    "triggerFamilyIds": [
      "resonant_tone_drone"
    ],
    "materialIds": [
      "resonant_object"
    ],
    "actionIds": [
      "strike"
    ],
    "manualOnly": true,
    "neverAutoplay": true,
    "warningRequired": true,
    "containsVoice": false,
    "loopEligible": false,
    "builderRole": "texture",
    "humanSensoryDecision": "PASS",
    "activationEligible": true,
    "lifecycleState": "active",
    "playbackEvidenceComplete": true,
    "audioSha256": "33e2c1ff616bcf36005c6c7b1051212ec6e435a23db3abaace817a85265f6625"
  },
  {
    "id": "m6-nonvoice-bb10-052-metal-bowl-long-resonance",
    "title": "Metal bowl long resonance",
    "audioUrl": "https://cdn.freesound.org/previews/634/634149_522747-lq.mp3",
    "durationSeconds": 65.28,
    "triggerFamilyIds": [
      "resonant_tone_drone"
    ],
    "materialIds": [
      "metal",
      "resonant_object"
    ],
    "actionIds": [
      "strike"
    ],
    "manualOnly": true,
    "neverAutoplay": true,
    "warningRequired": true,
    "containsVoice": false,
    "loopEligible": false,
    "builderRole": "texture",
    "humanSensoryDecision": "PASS",
    "activationEligible": true,
    "lifecycleState": "active",
    "playbackEvidenceComplete": true,
    "audioSha256": "42677f309b10d4a219e43577f51d0b541ccf09fc73a06785f2dec8f58c7f7971"
  },
  {
    "id": "m6-nonvoice-bb10-053-metal-gong-bowl-scrape",
    "title": "Metal gong bowl scrape",
    "audioUrl": "https://cdn.freesound.org/previews/828/828602_3012788-lq.mp3",
    "durationSeconds": 47.424,
    "triggerFamilyIds": [
      "resonant_tone_drone"
    ],
    "materialIds": [
      "metal",
      "resonant_object"
    ],
    "actionIds": [
      "rub",
      "strike"
    ],
    "manualOnly": true,
    "neverAutoplay": true,
    "warningRequired": true,
    "containsVoice": false,
    "loopEligible": false,
    "builderRole": "texture",
    "humanSensoryDecision": "PASS",
    "activationEligible": true,
    "lifecycleState": "active",
    "playbackEvidenceComplete": true,
    "audioSha256": "05e455883445ef49360f28531db81e657b00f68a235c6e4314966dc25f1a35f5"
  },
  {
    "id": "m6-nonvoice-bb9-108-tibetan-singing-bowl",
    "title": "Tibetan singing bowl",
    "audioUrl": "https://cdn.freesound.org/previews/196/196365_1847371-lq.mp3",
    "durationSeconds": 44.712,
    "triggerFamilyIds": [
      "resonant_tone_drone"
    ],
    "materialIds": [
      "resonant_object"
    ],
    "actionIds": [
      "strike"
    ],
    "manualOnly": true,
    "neverAutoplay": true,
    "warningRequired": true,
    "containsVoice": false,
    "loopEligible": false,
    "builderRole": "texture",
    "humanSensoryDecision": "PASS",
    "activationEligible": true,
    "lifecycleState": "active",
    "playbackEvidenceComplete": true,
    "audioSha256": "b611a86e0e4f194f215de2f993d0ce6c2031355649cab52c3e62219c7fbe8fcc"
  },
  {
    "id": "m6-replacement-voice-01-cass-bass-asmr-whisper-snack",
    "title": "Snack eating and mouth sounds with clock",
    "audioUrl": "https://cdn.freesound.org/previews/401/401180_7711286-lq.mp3",
    "durationSeconds": 680.112,
    "triggerFamilyIds": [
      "eating_chewing",
      "mouth_sounds"
    ],
    "materialIds": [
      "not_applicable"
    ],
    "actionIds": [
      "not_applicable"
    ],
    "manualOnly": true,
    "neverAutoplay": true,
    "warningRequired": true,
    "containsVoice": false,
    "loopEligible": false,
    "builderRole": "texture",
    "humanSensoryDecision": "PASS_NONVOICE_ONLY",
    "activationEligible": true,
    "lifecycleState": "active",
    "playbackEvidenceComplete": true,
    "audioSha256": "6b80cead3ccc45323b1c159b8470a2a4c0312607f1f63f8e5464a7952d6de736"
  },
  {
    id: "m6-voice-maya-hold-my-hand",
    title: "Female Voice — Hold My Hand",
    audioUrl: "https://soundscape.wellmadesystems.com/mobile-catalog-slice/kpfbNpr4n9exCDcz30C8Kp3Mzd8nNaHN/m6-voice-maya-hold-my-hand.mp3",
    durationSeconds: 48.718367,
    triggerFamilyIds: ["whisper_soft_spoken", "personal_attention_intimate"],
    materialIds: ["not_applicable"], actionIds: ["speak"],
    manualOnly: true, neverAutoplay: true, warningRequired: true, containsVoice: true, loopEligible: false,
    builderRole: "foreground", humanSensoryDecision: "PASS", activationEligible: true,
    lifecycleState: "active",
    audioSha256: "d595b75f5fae61ee823c89d04d8bb1b994bf07b8a68b3b36031f8cb6dcad7ba2",
    deliveryAudioSha256: "67c82ce0058634e26254583350d089ee1ab26178bb5bcea72d61377dadd2312c",
    coreVoice: true, voiceModality: "soft-spoken", performerType: "human", syntheticVoice: false,
    voiceProvenanceSummary: "MayaTakeda self-recorded the voice and released the source under CC0 1.0; prior M6 rights and performer evidence retained.",
    transcript: "Reach out for my hand and hold my hand. Follow me so you will not get lost. I will guide you to the right path. Just follow me and hold my hand.",
    transcriptVerified: true, rightsEvidenceComplete: true, playbackEvidenceComplete: true,
  },
  {
    id: "m6-voice-balloonhead-hello-goodbye",
    title: "Whispered Hello and Goodbye — German / English",
    audioUrl: "https://soundscape.wellmadesystems.com/mobile-catalog-slice/kpfbNpr4n9exCDcz30C8Kp3Mzd8nNaHN/m6-voice-balloonhead-hello-goodbye.mp3",
    durationSeconds: 21.86449,
    triggerFamilyIds: ["whisper_soft_spoken"], materialIds: ["not_applicable"], actionIds: ["whisper"],
    manualOnly: true, neverAutoplay: true, warningRequired: true, containsVoice: true, loopEligible: false,
    builderRole: "foreground", humanSensoryDecision: "PASS", activationEligible: true,
    lifecycleState: "active",
    audioSha256: "6001d8cd9cda1644c45ace956cdac2896d96cdbe9003f95b4cc42790682cb091",
    deliveryAudioSha256: "c40ebaaca98c9d45776aa171f9f4bb438591bb0064c4c23b92033c86af4e12c2",
    coreVoice: true, voiceModality: "whisper", performerType: "human", syntheticVoice: false,
    voiceProvenanceSummary: "Richard Wroblewski published his self-performed whisper source under CC0 1.0; prior M6 performer evidence retained.",
    transcript: "Hallo, mein Freund. Hallöchen, Junge. Mach es gut. Tschüss. Auf Wiedersehen. See you. Goodbye. Bye, friend. Hello, my friend.",
    transcriptVerified: true, rightsEvidenceComplete: true, playbackEvidenceComplete: true,
  },
  {
    id: "m6-voice-dobroide-spanish-close-mouth",
    title: "Spanish Close-Mouth Whisper",
    audioUrl: "https://soundscape.wellmadesystems.com/mobile-catalog-slice/kpfbNpr4n9exCDcz30C8Kp3Mzd8nNaHN/m6-voice-dobroide-spanish-close-mouth.mp3",
    durationSeconds: 65.410612,
    triggerFamilyIds: ["whisper_soft_spoken", "mouth_sounds"], materialIds: ["not_applicable"], actionIds: ["whisper"],
    manualOnly: true, neverAutoplay: true, warningRequired: true, containsVoice: true, loopEligible: false,
    builderRole: "foreground", humanSensoryDecision: "PASS_WITH_NOTES", activationEligible: true,
    lifecycleState: "active",
    audioSha256: "3597cf2845bb3221e480560b88a0374c12863b68e96839aa63e4dd408a411482",
    deliveryAudioSha256: "ac6693ae5473c6fd1c06c58cac37ae6289b04d55b8046a0e504552629236f4b3",
    coreVoice: true, voiceModality: "whisper", performerType: "human", syntheticVoice: false,
    voiceProvenanceSummary: "dobroide self-recorded the Spanish whisper source under CC BY 4.0; attribution and prior safe translation evidence remain required.",
    transcript: "Spanish whisper; the complete reviewed transcript and English translation remain in the prior M6 semantic evidence package.",
    transcriptVerified: true, rightsEvidenceComplete: true, playbackEvidenceComplete: true,
  },
  {
    id: "m6-voice-resemble-01-quiet-desk-whisper", title: "Quiet Desk Whisper",
    audioUrl: "https://soundscape.wellmadesystems.com/mobile-catalog-slice/kpfbNpr4n9exCDcz30C8Kp3Mzd8nNaHN/m6-voice-resemble-01-quiet-desk-whisper.mp3",
    durationSeconds: 85.939583, triggerFamilyIds: ["whisper_soft_spoken"], materialIds: ["not_applicable"], actionIds: ["whisper"],
    manualOnly: true, neverAutoplay: true, warningRequired: true, containsVoice: true, loopEligible: false, builderRole: "foreground",
    humanSensoryDecision: "PASS", activationEligible: true, lifecycleState: "active",
    audioSha256: "731fc43ba7c283107c6161a2406471166da31dd79ece9ac23b67dbacc82a5709", deliveryAudioSha256: "11ff6f1d349d571ef75f4a98a1d87a5c64cd0b40949831e8a15905c6a1e1120e",
    coreVoice: true, voiceModality: "whisper", performerType: "synthetic", syntheticVoice: true, voiceLabel: "ASMR Whisper 2",
    voiceProvenanceSummary: "Daniel generated this synthetic voice with Resemble Voice Design and TTS using a descriptive prompt and no supplied real-person reference recording.",
    transcript: "Welcome to a small, quiet desk. I have placed a few simple objects in front of me. A smooth wooden box, a folded piece of paper, a clear glass jar, and one small, round stone.",
    intendedTranscriptEvidence: "MANIFEST.txt track 01", actualTranscriptEvidence: "Three-model local ASR consensus; no material deviation.",
    transcriptVerified: true, rightsEvidenceComplete: true, playbackEvidenceComplete: true,
  },
  {
    id: "m6-voice-resemble-02-paper-sorting-whisper", title: "Paper Sorting Whisper",
    audioUrl: "https://soundscape.wellmadesystems.com/mobile-catalog-slice/kpfbNpr4n9exCDcz30C8Kp3Mzd8nNaHN/m6-voice-resemble-02-paper-sorting-whisper.mp3",
    durationSeconds: 105.2025, triggerFamilyIds: ["whisper_soft_spoken"], materialIds: ["not_applicable"], actionIds: ["whisper"],
    manualOnly: true, neverAutoplay: true, warningRequired: true, containsVoice: true, loopEligible: false, builderRole: "foreground",
    humanSensoryDecision: "PASS", activationEligible: true, lifecycleState: "active",
    audioSha256: "8c89f1cc27f7f2b8ab628b348d150ac60f940abc267b712f9c6920b11f6095dc", deliveryAudioSha256: "4358b2ab78db900bd42cd918e68f721f718de63c6466fee12f0196085d44ec79",
    coreVoice: true, voiceModality: "whisper", performerType: "synthetic", syntheticVoice: true, voiceLabel: "ASMR Whisper 2",
    voiceProvenanceSummary: "Daniel generated this synthetic voice with Resemble Voice Design and TTS using a descriptive prompt and no supplied real-person reference recording.",
    transcript: "Transcript accepted with documented ASR-only uncertainty; Daniel directly rechecked the exact source and heard no skipped, malformed, repeated, or defective speech.",
    intendedTranscriptEvidence: "MANIFEST.txt track 02", actualTranscriptEvidence: "Mode C exact-evidence review: ASR_ONLY_UNCERTAINTY; three correlated Whisper-family variants are not independent proof of an audible source defect.",
    transcriptVerified: true, rightsEvidenceComplete: true, playbackEvidenceComplete: true,
  },
  {
    id: "m6-voice-resemble-03-small-objects-whisper", title: "Small Objects Whisper",
    audioUrl: "https://soundscape.wellmadesystems.com/mobile-catalog-slice/kpfbNpr4n9exCDcz30C8Kp3Mzd8nNaHN/m6-voice-resemble-03-small-objects-whisper.mp3",
    durationSeconds: 86.42375, triggerFamilyIds: ["whisper_soft_spoken"], materialIds: ["not_applicable"], actionIds: ["whisper"],
    manualOnly: true, neverAutoplay: true, warningRequired: true, containsVoice: true, loopEligible: false, builderRole: "foreground",
    humanSensoryDecision: "PASS", activationEligible: true, lifecycleState: "active",
    audioSha256: "6b563a067191f61fcfcb2f41adce99eafe9f713a47fa53ae6ef1901f41c48a1d", deliveryAudioSha256: "dc26b125df69859f1dcb6bf53fd994712b4f77a9c0d733aca687feab1a689a7c",
    coreVoice: true, voiceModality: "whisper", performerType: "synthetic", syntheticVoice: true, voiceLabel: "ASMR Whisper 2",
    voiceProvenanceSummary: "Daniel generated this selected prosody10 synthetic voice with Resemble Voice Design and TTS using no supplied real-person reference recording.",
    transcript: "Transcript accepted with documented ASR-only uncertainty; Daniel stated exactly: “I just listened to 03 and can find no errors.”",
    intendedTranscriptEvidence: "MANIFEST.txt track 03; selected prosody10 generation", actualTranscriptEvidence: "Mode C exact-evidence review: ASR_ONLY_UNCERTAINTY; the endpoint number tail is ASR hallucination, not source speech.",
    transcriptVerified: true, rightsEvidenceComplete: true, playbackEvidenceComplete: true,
  },
  {
    id: "m6-voice-resemble-04-rainy-library-whisper", title: "Rainy Library Whisper",
    audioUrl: "https://soundscape.wellmadesystems.com/mobile-catalog-slice/kpfbNpr4n9exCDcz30C8Kp3Mzd8nNaHN/m6-voice-resemble-04-rainy-library-whisper.mp3",
    durationSeconds: 76.947917, triggerFamilyIds: ["whisper_soft_spoken"], materialIds: ["not_applicable"], actionIds: ["whisper"],
    manualOnly: true, neverAutoplay: true, warningRequired: true, containsVoice: true, loopEligible: false, builderRole: "foreground",
    humanSensoryDecision: "PASS", activationEligible: true, lifecycleState: "active",
    audioSha256: "be0b38b4333e27e45d0a73ada48eee05f15cba4d80bb0de419ff6c15b32aae0d", deliveryAudioSha256: "3f642fa33efbf3a7747c2be34f3be3f717b324c9711fda42f364ff295e898388",
    coreVoice: true, voiceModality: "whisper", performerType: "synthetic", syntheticVoice: true, voiceLabel: "ASMR Whisper 2",
    voiceProvenanceSummary: "Daniel generated this synthetic voice with Resemble Voice Design and TTS using a descriptive prompt and no supplied real-person reference recording.",
    transcript: "Transcript accepted with documented ASR-only uncertainty; Daniel stated exactly: “Just listened to 04 no errors found.”",
    intendedTranscriptEvidence: "MANIFEST.txt track 04", actualTranscriptEvidence: "Mode C exact-evidence review: ASR_ONLY_UNCERTAINTY; model segments extending beyond the source duration are ASR hallucinations.",
    transcriptVerified: true, rightsEvidenceComplete: true, playbackEvidenceComplete: true,
  },
  {
    id: "m6-voice-resemble-05-gentle-room-soft-spoken", title: "Gentle Room Soft Spoken",
    audioUrl: "https://soundscape.wellmadesystems.com/mobile-catalog-slice/kpfbNpr4n9exCDcz30C8Kp3Mzd8nNaHN/m6-voice-resemble-05-gentle-room-soft-spoken.mp3",
    durationSeconds: 73.55875, triggerFamilyIds: ["whisper_soft_spoken"], materialIds: ["not_applicable"], actionIds: ["speak"],
    manualOnly: true, neverAutoplay: true, warningRequired: true, containsVoice: true, loopEligible: false, builderRole: "foreground",
    humanSensoryDecision: "PASS", activationEligible: true, lifecycleState: "active",
    audioSha256: "6195cc0020d905bf3ab68119360f611d23c72162955c8b42fc8e30858ef97213", deliveryAudioSha256: "7bc4735542db675207a0dd455c022c075187e7fa002b00ceb8a5f0cc6ecd74e7",
    coreVoice: true, voiceModality: "soft-spoken", performerType: "synthetic", syntheticVoice: true, voiceLabel: "Soft Spoken 1",
    voiceProvenanceSummary: "Daniel generated this synthetic voice with Resemble Voice Design and TTS using a descriptive prompt and no supplied real-person reference recording.",
    transcript: "Transcript accepted with documented ASR-only uncertainty; Daniel’s exact batch decision “Yes all pass” remains authoritative.",
    intendedTranscriptEvidence: "MANIFEST.txt track 05", actualTranscriptEvidence: "Mode C exact-evidence review: ASR_ONLY_UNCERTAINTY; the alleged ending phrase exists only in correlated Whisper-family decoding.",
    transcriptVerified: true, rightsEvidenceComplete: true, playbackEvidenceComplete: true,
  },
  {
    id: "m6-voice-resemble-06-texture-observations-soft-spoken", title: "Texture Observations Soft Spoken",
    audioUrl: "https://soundscape.wellmadesystems.com/mobile-catalog-slice/kpfbNpr4n9exCDcz30C8Kp3Mzd8nNaHN/m6-voice-resemble-06-texture-observations-soft-spoken.mp3",
    durationSeconds: 78.815417, triggerFamilyIds: ["whisper_soft_spoken"], materialIds: ["not_applicable"], actionIds: ["speak"],
    manualOnly: true, neverAutoplay: true, warningRequired: true, containsVoice: true, loopEligible: false, builderRole: "foreground",
    humanSensoryDecision: "PASS", activationEligible: true, lifecycleState: "active",
    audioSha256: "77668108266804f01a5f0fe0d31bb9c545001cdcc9276c4849236105df2fecd6", deliveryAudioSha256: "a5e7e32e9c217cb1773e7a1b66b95643b109ebf07625ba2f031ec1e6588373ed",
    coreVoice: true, voiceModality: "soft-spoken", performerType: "synthetic", syntheticVoice: true, voiceLabel: "Soft Spoken 1",
    voiceProvenanceSummary: "Daniel generated this synthetic voice with Resemble Voice Design and TTS using a descriptive prompt and no supplied real-person reference recording.",
    transcript: "Transcript accepted with documented ASR-only uncertainty; disk/disc spelling is harmless variation.",
    intendedTranscriptEvidence: "MANIFEST.txt track 06", actualTranscriptEvidence: "Mode C exact-evidence review: ASR_ONLY_UNCERTAINTY; second/third and pumice/pomace/POMAS are correlated same-family hypotheses.",
    transcriptVerified: true, rightsEvidenceComplete: true, playbackEvidenceComplete: true,
  },
  {
    id: "m6-voice-resemble-07-slow-number-patterns-soft-spoken", title: "Slow Number Patterns Soft Spoken",
    audioUrl: "https://soundscape.wellmadesystems.com/mobile-catalog-slice/kpfbNpr4n9exCDcz30C8Kp3Mzd8nNaHN/m6-voice-resemble-07-slow-number-patterns-soft-spoken.mp3",
    durationSeconds: 61.800417, triggerFamilyIds: ["whisper_soft_spoken"], materialIds: ["not_applicable"], actionIds: ["speak"],
    manualOnly: true, neverAutoplay: true, warningRequired: true, containsVoice: true, loopEligible: false, builderRole: "foreground",
    humanSensoryDecision: "PASS", activationEligible: true, lifecycleState: "active",
    audioSha256: "bf8c3e91065b27c93b8097b0150ed8f808fc4221bc92e0bf5af429b67b56de4f", deliveryAudioSha256: "36139e812c59504aed30637b952548881c1640f139f24da0b05c0e00014f26c0",
    coreVoice: true, voiceModality: "soft-spoken", performerType: "synthetic", syntheticVoice: true, voiceLabel: "Soft Spoken 1",
    voiceProvenanceSummary: "Daniel generated this synthetic voice with Resemble Voice Design and TTS using a descriptive prompt and no supplied real-person reference recording.",
    transcript: "Transcript accepted with documented ASR-only uncertainty; number words/digits and line formatting are harmless variation.",
    intendedTranscriptEvidence: "MANIFEST.txt track 07", actualTranscriptEvidence: "Mode C exact-evidence review: ASR_ONLY_UNCERTAINTY; the endpoint number tail is ASR hallucination, not source speech.",
    transcriptVerified: true, rightsEvidenceComplete: true, playbackEvidenceComplete: true,
  }
]);
export const M6_TRIGGER_FAMILY_COUNT = new Set(m6CatalogExpansionV1.flatMap((row) => row.triggerFamilyIds)).size;
export const m6ActivationEligibleCatalogV1 = Object.freeze(m6CatalogExpansionV1.filter((row) => row.activationEligible));
