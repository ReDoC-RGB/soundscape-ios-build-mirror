export const DIRECTED_CONTENT_EVIDENCE_CONTRACT_VERSION = 1 as const;

export const DIRECTED_CONTENT_PRODUCTION_BASE_V1 =
  "https://soundscape.wellmadesystems.com/directed-sessions-alpha-0.16.0/37OsO7aWiFR1Gj9M1tYmFTomboJdPe-azytylY03CUU" as const;

export type DirectedContentEvidenceRecordV1 = Readonly<{
  contractVersion: 1;
  assetId: string;
  title: string;
  sourcePageUri: string;
  sourceDeliveryUri: string;
  productionUri: string;
  creator: string;
  sourceId: string;
  sourceCaptureSha256: string;
  sourceOriginalSha256: string;
  licenseName: "CC0 1.0";
  licenseUri: "https://creativecommons.org/publicdomain/zero/1.0/";
  commercialUse: true;
  derivativesAllowed: true;
  redistributionAllowed: true;
  persistentDownloadAllowed: true;
  containsVoice: false;
  sensoryDecision: "PASS";
  sensoryReviewer: "Daniel";
  expectedBytes: number;
  checksumSha256: string;
  durationMs: number;
  codec: "mp3";
  sampleRateHz: number;
  channels: 1 | 2;
  mediaType: "audio/mpeg";
  rangeSupported: true;
  loopEligible: false;
  sensoryFamilies: readonly string[];
  sourceEvidenceReference: string;
  rightsEvidenceReference: string;
  sensoryEvidenceReference: string;
  productionReadbackObservedAt: "2026-07-26T02:07:15Z";
}>;

const productionUri = (assetId: string): string => `${DIRECTED_CONTENT_PRODUCTION_BASE_V1}/${assetId}.mp3`;
const activationEvidence = (assetId: string): string =>
  `evidence/m6-catalog-expansion-v1/activation-records.json#catalogIdentity=${assetId}`;
const sourceRecord = (
  input: Omit<DirectedContentEvidenceRecordV1,
    | "contractVersion"
    | "productionUri"
    | "licenseName"
    | "licenseUri"
    | "commercialUse"
    | "derivativesAllowed"
    | "redistributionAllowed"
    | "persistentDownloadAllowed"
    | "containsVoice"
    | "sensoryDecision"
    | "sensoryReviewer"
    | "codec"
    | "mediaType"
    | "rangeSupported"
    | "loopEligible"
    | "sourceEvidenceReference"
    | "rightsEvidenceReference"
    | "sensoryEvidenceReference"
    | "productionReadbackObservedAt"
  >,
): DirectedContentEvidenceRecordV1 => Object.freeze({
  contractVersion: 1,
  ...input,
  productionUri: productionUri(input.assetId),
  licenseName: "CC0 1.0",
  licenseUri: "https://creativecommons.org/publicdomain/zero/1.0/",
  commercialUse: true,
  derivativesAllowed: true,
  redistributionAllowed: true,
  persistentDownloadAllowed: true,
  containsVoice: false,
  sensoryDecision: "PASS",
  sensoryReviewer: "Daniel",
  codec: "mp3",
  mediaType: "audio/mpeg",
  rangeSupported: true,
  loopEligible: false,
  sourceEvidenceReference: activationEvidence(input.assetId),
  rightsEvidenceReference: activationEvidence(input.assetId),
  sensoryEvidenceReference: activationEvidence(input.assetId),
  productionReadbackObservedAt: "2026-07-26T02:07:15Z",
});

export const DIRECTED_CONTENT_EVIDENCE_V1: readonly DirectedContentEvidenceRecordV1[] = Object.freeze([
  sourceRecord({
    assetId: "m6-nonvoice-bb9-025-book-open-close-and-pages",
    title: "Book open, close, and pages",
    sourcePageUri: "https://freesound.org/people/Vrymaa/sounds/734547/",
    sourceDeliveryUri: "https://cdn.freesound.org/previews/734/734547_13973196-lq.mp3",
    creator: "Vrymaa",
    sourceId: "734547",
    sourceCaptureSha256: "fe9547c18295ef4ec3217a24c5a77a54f1476a2a3e67cb794f5626d34630ea2e",
    sourceOriginalSha256: "90a3ec482e2c80abe8a93c0587f901e6829efb61367d43842e4b8b5e78c9a032",
    expectedBytes: 387_361,
    checksumSha256: "b6695e457fcab4b562bbb27787654e6a64c38c47a5e2cdce11a5ad6f7fbd15f9",
    durationMs: 44_199,
    sampleRateHz: 44_100,
    channels: 1,
    sensoryFamilies: Object.freeze(["paper", "pages", "book"]),
  }),
  sourceRecord({
    assetId: "m6-nonvoice-bb9-026-book-handling",
    title: "Book handling",
    sourcePageUri: "https://freesound.org/people/launemax/sounds/250017/",
    sourceDeliveryUri: "https://cdn.freesound.org/previews/250/250017_389377-lq.mp3",
    creator: "launemax",
    sourceId: "250017",
    sourceCaptureSha256: "f473a8b05ea2b5f9fc473c8e114b3aa686d9abf6ab79754c0a35cfeca92b16d9",
    sourceOriginalSha256: "644b663b4d00777cda8f91fdc93baf71289f0bd06c918c47b80d6109af76cb5a",
    expectedBytes: 1_142_352,
    checksumSha256: "7cfbfece218d2b48556a638c229243d3980ae4dffaf183bf61a664d9133d2865",
    durationMs: 132_048,
    sampleRateHz: 24_000,
    channels: 2,
    sensoryFamilies: Object.freeze(["paper", "pages", "book"]),
  }),
  sourceRecord({
    assetId: "m6-nonvoice-bb9-032-paper-handling",
    title: "Paper handling",
    sourcePageUri: "https://freesound.org/people/soundstack/sounds/534957/",
    sourceDeliveryUri: "https://cdn.freesound.org/previews/534/534957_37011-lq.mp3",
    creator: "soundstack",
    sourceId: "534957",
    sourceCaptureSha256: "abb9d8cb8ab0fddd69d4bbc935d87958aab05bf0533a8e1f764ccc222f44a596",
    sourceOriginalSha256: "31a222ee823512662c24d2f30aad0db4eb1eaee2941fe4323338dd5d376a75a0",
    expectedBytes: 703_224,
    checksumSha256: "7927e6af2fded8311a844f4ae6d58c868f62ce427824e1de024ca9db0c3e6e35",
    durationMs: 75_552,
    sampleRateHz: 24_000,
    channels: 2,
    sensoryFamilies: Object.freeze(["paper"]),
  }),
  sourceRecord({
    assetId: "m6-nonvoice-bb9-033-pencil-and-marker-writing",
    title: "Pencil and marker writing",
    sourcePageUri: "https://freesound.org/people/khenshom/sounds/530190/",
    sourceDeliveryUri: "https://cdn.freesound.org/previews/530/530190_6652872-lq.mp3",
    creator: "khenshom",
    sourceId: "530190",
    sourceCaptureSha256: "0b80b50fc3626469d4cbc1f30e05fd24393e03466e1e030c594cb64251d2cec9",
    sourceOriginalSha256: "42f0fc55c745883d196967f1a4265b24f74f1f93d38b4256bef6f4c3f9b171dc",
    expectedBytes: 775_176,
    checksumSha256: "fe14bc229e2b0c1560e465d5dca4151ab8a0f85b2e893470a5f55617d71e8f87",
    durationMs: 82_392,
    sampleRateHz: 24_000,
    channels: 2,
    sensoryFamilies: Object.freeze(["paper", "pencil", "writing"]),
  }),
  sourceRecord({
    assetId: "m6-nonvoice-bb9-013-shells-on-marble-and-ceramic",
    title: "Shells on marble and ceramic",
    sourcePageUri: "https://freesound.org/people/CVLTIV8R/sounds/800116/",
    sourceDeliveryUri: "https://cdn.freesound.org/previews/800/800116_2520418-lq.mp3",
    creator: "CVLTIV8R",
    sourceId: "800116",
    sourceCaptureSha256: "a970e702fc361c67358d1b30420f3f3a411c9f3daf5e1ac975afd47e0b5b36d9",
    sourceOriginalSha256: "ebdf59934d9cb4cc744e60aa3a178dbff4025f9fe1cbe43f997c1d76fba9dd75",
    expectedBytes: 181_296,
    checksumSha256: "c7f49190e118cc61136211f27e9ed712c8d84bbc874fc7f5e2dc5d49b9d8b18d",
    durationMs: 20_616,
    sampleRateHz: 24_000,
    channels: 2,
    sensoryFamilies: Object.freeze(["porcelain", "ceramic", "table-contact", "shell"]),
  }),
  sourceRecord({
    assetId: "m6-nonvoice-bb10-009-finger-tapping-on-table",
    title: "Finger tapping on table",
    sourcePageUri: "https://freesound.org/people/launchsite/sounds/557363/",
    sourceDeliveryUri: "https://cdn.freesound.org/previews/557/557363_7281605-lq.mp3",
    creator: "launchsite",
    sourceId: "557363",
    sourceCaptureSha256: "d2600b4252b4720cbb252b395e3be1b8652e53ec4d42096388d8efa9502c5c8e",
    sourceOriginalSha256: "8824160d4adfd0518aee0dfff4e2b7fa89e83ba1078083a7260aea1159b99c61",
    expectedBytes: 94_944,
    checksumSha256: "74b7c6180da6f31de24034882491fc2b1003ec84ddfd5dde5a4aea3f06fcd387",
    durationMs: 12_480,
    sampleRateHz: 48_000,
    channels: 1,
    sensoryFamilies: Object.freeze(["table-contact", "wood"]),
  }),
  sourceRecord({
    assetId: "m6-nonvoice-bb9-009-finger-tapping-on-metal-pipe",
    title: "Finger tapping on metal pipe",
    sourcePageUri: "https://freesound.org/people/JW_Audio/sounds/811807/",
    sourceDeliveryUri: "https://cdn.freesound.org/previews/811/811807_13183432-lq.mp3",
    creator: "JW_Audio",
    sourceId: "811807",
    sourceCaptureSha256: "fb50bf9cbf1c5f5a000ec9aed785c4a0848c4aeab56c380b322a24e15f97dcb5",
    sourceOriginalSha256: "8bf73462c73cc8a30da93cf8222fb02433c11b0e4790f59befee1c1e2d290603",
    expectedBytes: 188_664,
    checksumSha256: "97fb94f2fe276fc91b7a932a11ca9654393e8412b09e17d9c4193768213749c4",
    durationMs: 21_840,
    sampleRateHz: 48_000,
    channels: 1,
    sensoryFamilies: Object.freeze(["table-contact", "metal-accent"]),
  }),
  sourceRecord({
    assetId: "m6-nonvoice-bb9-012-screwdriver-taps-and-coin-jar",
    title: "Screwdriver taps and coin jar",
    sourcePageUri: "https://freesound.org/people/vanszisounddesign/sounds/435814/",
    sourceDeliveryUri: "https://cdn.freesound.org/previews/435/435814_6262563-lq.mp3",
    creator: "vanszisounddesign",
    sourceId: "435814",
    sourceCaptureSha256: "ae06f96199cbd51b77e6d9396bef8a26f47534f12bc47e9bbb899eec660f925a",
    sourceOriginalSha256: "128ea864b4a1d1b1147103c8d361070fa5ed7f99290c88881db458bfd55efb7f",
    expectedBytes: 500_744,
    checksumSha256: "4248440768e50ca583d40c11356a10f09462a5047dfb624aec40459be7991e73",
    durationMs: 60_735,
    sampleRateHz: 44_100,
    channels: 1,
    sensoryFamilies: Object.freeze(["table-contact", "metal-accent", "object-handling"]),
  }),
  sourceRecord({
    assetId: "m6-nonvoice-bb9-057-zip-and-rustling-fabric",
    title: "Zip and rustling fabric",
    sourcePageUri: "https://freesound.org/people/Coo01/sounds/728156/",
    sourceDeliveryUri: "https://cdn.freesound.org/previews/728/728156_6033218-lq.mp3",
    creator: "Coo01",
    sourceId: "728156",
    sourceCaptureSha256: "bc7cae7edd71c1e59218a0d396c993e8aae9e43d18c1162b1c41df4828c2d525",
    sourceOriginalSha256: "1ce9fbb3eae7062b503890a5d73838b8b862dae4bfe4a004638c342f72d5bdda",
    expectedBytes: 266_712,
    checksumSha256: "2b7b362323058ca6197380db3cb995df1388c832b67592529c235380413b8076",
    durationMs: 28_944,
    sampleRateHz: 48_000,
    channels: 1,
    sensoryFamilies: Object.freeze(["fabric", "garment", "zipper"]),
  }),
  sourceRecord({
    assetId: "m6-nonvoice-bb9-050-leather-jacket-handling",
    title: "Leather jacket handling",
    sourcePageUri: "https://freesound.org/people/Vrymaa/sounds/770050/",
    sourceDeliveryUri: "https://cdn.freesound.org/previews/770/770050_13973196-lq.mp3",
    creator: "Vrymaa",
    sourceId: "770050",
    sourceCaptureSha256: "c01a925ab324e3c0936b139d9fb84353f4d5f6bced1642dfb26ca18603a16019",
    sourceOriginalSha256: "dad31fb176893002f2ace0cf4b0598d1b2957ec94efae7dc1f6db23095d2ef6b",
    expectedBytes: 312_744,
    checksumSha256: "116417bb8d722b8eb69becd0d2e7e601dfe7fb6208161aa27a562f7b894f4398",
    durationMs: 36_096,
    sampleRateHz: 48_000,
    channels: 1,
    sensoryFamilies: Object.freeze(["fabric", "garment", "leather"]),
  }),
  sourceRecord({
    assetId: "m6-nonvoice-bb9-051-plastic-hairbrush",
    title: "Plastic hairbrush",
    sourcePageUri: "https://freesound.org/people/KatiReh/sounds/199299/",
    sourceDeliveryUri: "https://cdn.freesound.org/previews/199/199299_2723971-lq.mp3",
    creator: "KatiReh",
    sourceId: "199299",
    sourceCaptureSha256: "b536a581b4ed16d57035807b0768156ce939713abf514f7e5ecb3676a388624d",
    sourceOriginalSha256: "5ffa10e9d7608e041e4498892c423882a0234c9cd8eb01cddf98e988b1d608d6",
    expectedBytes: 418_584,
    checksumSha256: "aa59f5a606e43cba8539af6261b88a5a3846b22547a29c4c6c37b2919bc16c8f",
    durationMs: 48_048,
    sampleRateHz: 24_000,
    channels: 2,
    sensoryFamilies: Object.freeze(["brush", "garment-care", "plastic"]),
  }),
]);

const byAssetId = new Map(DIRECTED_CONTENT_EVIDENCE_V1.map((record) => [record.assetId, record]));

export function getDirectedContentEvidenceV1(assetId: string): DirectedContentEvidenceRecordV1 {
  const record = byAssetId.get(assetId);
  if (!record) throw new Error(`Unknown directed content evidence ${assetId}.`);
  return record;
}
