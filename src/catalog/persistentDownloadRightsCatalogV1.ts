import { catalogRepository } from "../contracts/catalogContractV2";
import {
  classifyPersistentDownloadLayerV1,
  createPersistentDownloadResolutionV1,
  type LayerPersistentDownloadInputV1,
  type LayerPersistentDownloadResolutionV1,
  type PersistentDownloadCatalogRecordV1,
  type PersistentDownloadRightsStateV1,
} from "../contracts/persistentDownloadRightsContractV1";
import { m6CatalogExpansionV1 } from "./m6CatalogExpansionV1";
import { SLOW_RAIN_RECONCILED_EVIDENCE_V1 } from "./slowRainReconciledEvidenceV1";

export const PERSISTENT_DOWNLOAD_RIGHTS_CATALOG_VERSION = "1" as const;
export const PERSISTENT_DOWNLOAD_RIGHTS_CATALOG_REVISION = "alpha-0.14.0-slow-rain-reconciled-2026-07-19" as const;

type M6AcceptedPersistentDownloadEvidenceInputV1 = Readonly<{
  catalogIdentity: string;
  catalogAudioUri: string;
  sourceIdentity: string;
  sourceUri: string | null;
  sourceChecksumSha256: string;
  licenseOrProviderBasis: string;
  deliveryRemoteUri: string;
  deliveryExpectedBytes: number;
  deliveryChecksumSha256: string;
  attributionText: string | null;
}>;

const M6_ACCEPTED_PERSISTENT_DOWNLOAD_EVIDENCE_V1 = Object.freeze([
  {
    "catalogIdentity": "m6-nonvoice-bb10-009-finger-tapping-on-table",
    "catalogAudioUri": "https://cdn.freesound.org/previews/557/557363_7281605-lq.mp3",
    "sourceIdentity": "freesound:557363",
    "sourceUri": "https://freesound.org/people/launchsite/sounds/557363/",
    "sourceChecksumSha256": "8824160d4adfd0518aee0dfff4e2b7fa89e83ba1078083a7260aea1159b99c61",
    "licenseOrProviderBasis": "CC0 1.0 accepted operational defined-use review permits commercial redistribution/embedding of the exact source delivery bytes",
    "deliveryRemoteUri": "https://cdn.freesound.org/previews/557/557363_7281605-lq.mp3",
    "deliveryExpectedBytes": 94944,
    "deliveryChecksumSha256": "74b7c6180da6f31de24034882491fc2b1003ec84ddfd5dde5a4aea3f06fcd387",
    "attributionText": null
  },
  {
    "catalogIdentity": "m6-nonvoice-bb10-048-deep-singing-bowl",
    "catalogAudioUri": "https://cdn.freesound.org/previews/699/699447_2557312-lq.mp3",
    "sourceIdentity": "freesound:699447",
    "sourceUri": "https://freesound.org/people/zambolino/sounds/699447/",
    "sourceChecksumSha256": "33e2c1ff616bcf36005c6c7b1051212ec6e435a23db3abaace817a85265f6625",
    "licenseOrProviderBasis": "CC0 1.0 accepted operational defined-use review permits commercial redistribution/embedding of the exact source delivery bytes",
    "deliveryRemoteUri": "https://cdn.freesound.org/previews/699/699447_2557312-lq.mp3",
    "deliveryExpectedBytes": 2416224,
    "deliveryChecksumSha256": "150eeb842cbefe741be6db2163b992bc9fa6f101b8fc3baa1b762add4c794b0c",
    "attributionText": null
  },
  {
    "catalogIdentity": "m6-nonvoice-bb10-052-metal-bowl-long-resonance",
    "catalogAudioUri": "https://cdn.freesound.org/previews/634/634149_522747-lq.mp3",
    "sourceIdentity": "freesound:634149",
    "sourceUri": "https://freesound.org/people/Erbsland-Music/sounds/634149/",
    "sourceChecksumSha256": "42677f309b10d4a219e43577f51d0b541ccf09fc73a06785f2dec8f58c7f7971",
    "licenseOrProviderBasis": "CC0 1.0 accepted operational defined-use review permits commercial redistribution/embedding of the exact source delivery bytes",
    "deliveryRemoteUri": "https://cdn.freesound.org/previews/634/634149_522747-lq.mp3",
    "deliveryExpectedBytes": 513960,
    "deliveryChecksumSha256": "51647ff95a89e8d982c6ff7a0246961c2ade6a931cbc8e543340de5a54f0a290",
    "attributionText": null
  },
  {
    "catalogIdentity": "m6-nonvoice-bb10-053-metal-gong-bowl-scrape",
    "catalogAudioUri": "https://cdn.freesound.org/previews/828/828602_3012788-lq.mp3",
    "sourceIdentity": "freesound:828602",
    "sourceUri": "https://freesound.org/people/LamaMakesMusic/sounds/828602/",
    "sourceChecksumSha256": "05e455883445ef49360f28531db81e657b00f68a235c6e4314966dc25f1a35f5",
    "licenseOrProviderBasis": "CC0 1.0 accepted operational defined-use review permits commercial redistribution/embedding of the exact source delivery bytes",
    "deliveryRemoteUri": "https://cdn.freesound.org/previews/828/828602_3012788-lq.mp3",
    "deliveryExpectedBytes": 437760,
    "deliveryChecksumSha256": "e8235bfdcffa0f1585f2d1bf0fa83e2814f69fcb47f7f7c1a128a17ebba2f47e",
    "attributionText": null
  },
  {
    "catalogIdentity": "m6-nonvoice-bb9-009-finger-tapping-on-metal-pipe",
    "catalogAudioUri": "https://cdn.freesound.org/previews/811/811807_13183432-lq.mp3",
    "sourceIdentity": "freesound:811807",
    "sourceUri": "https://freesound.org/people/JW_Audio/sounds/811807/",
    "sourceChecksumSha256": "8bf73462c73cc8a30da93cf8222fb02433c11b0e4790f59befee1c1e2d290603",
    "licenseOrProviderBasis": "CC0 1.0 accepted operational defined-use review permits commercial redistribution/embedding of the exact source delivery bytes",
    "deliveryRemoteUri": "https://cdn.freesound.org/previews/811/811807_13183432-lq.mp3",
    "deliveryExpectedBytes": 188664,
    "deliveryChecksumSha256": "97fb94f2fe276fc91b7a932a11ca9654393e8412b09e17d9c4193768213749c4",
    "attributionText": null
  },
  {
    "catalogIdentity": "m6-nonvoice-bb9-012-screwdriver-taps-and-coin-jar",
    "catalogAudioUri": "https://cdn.freesound.org/previews/435/435814_6262563-lq.mp3",
    "sourceIdentity": "freesound:435814",
    "sourceUri": "https://freesound.org/people/vanszisounddesign/sounds/435814/",
    "sourceChecksumSha256": "128ea864b4a1d1b1147103c8d361070fa5ed7f99290c88881db458bfd55efb7f",
    "licenseOrProviderBasis": "CC0 1.0 accepted operational defined-use review permits commercial redistribution/embedding of the exact source delivery bytes",
    "deliveryRemoteUri": "https://cdn.freesound.org/previews/435/435814_6262563-lq.mp3",
    "deliveryExpectedBytes": 500744,
    "deliveryChecksumSha256": "4248440768e50ca583d40c11356a10f09462a5047dfb624aec40459be7991e73",
    "attributionText": null
  },
  {
    "catalogIdentity": "m6-nonvoice-bb9-013-shells-on-marble-and-ceramic",
    "catalogAudioUri": "https://cdn.freesound.org/previews/800/800116_2520418-lq.mp3",
    "sourceIdentity": "freesound:800116",
    "sourceUri": "https://freesound.org/people/CVLTIV8R/sounds/800116/",
    "sourceChecksumSha256": "ebdf59934d9cb4cc744e60aa3a178dbff4025f9fe1cbe43f997c1d76fba9dd75",
    "licenseOrProviderBasis": "CC0 1.0 accepted operational defined-use review permits commercial redistribution/embedding of the exact source delivery bytes",
    "deliveryRemoteUri": "https://cdn.freesound.org/previews/800/800116_2520418-lq.mp3",
    "deliveryExpectedBytes": 181296,
    "deliveryChecksumSha256": "c7f49190e118cc61136211f27e9ed712c8d84bbc874fc7f5e2dc5d49b9d8b18d",
    "attributionText": null
  },
  {
    "catalogIdentity": "m6-nonvoice-bb9-025-book-open-close-and-pages",
    "catalogAudioUri": "https://cdn.freesound.org/previews/734/734547_13973196-lq.mp3",
    "sourceIdentity": "freesound:734547",
    "sourceUri": "https://freesound.org/people/Vrymaa/sounds/734547/",
    "sourceChecksumSha256": "90a3ec482e2c80abe8a93c0587f901e6829efb61367d43842e4b8b5e78c9a032",
    "licenseOrProviderBasis": "CC0 1.0 accepted operational defined-use review permits commercial redistribution/embedding of the exact source delivery bytes",
    "deliveryRemoteUri": "https://cdn.freesound.org/previews/734/734547_13973196-lq.mp3",
    "deliveryExpectedBytes": 387361,
    "deliveryChecksumSha256": "b6695e457fcab4b562bbb27787654e6a64c38c47a5e2cdce11a5ad6f7fbd15f9",
    "attributionText": null
  },
  {
    "catalogIdentity": "m6-nonvoice-bb9-026-book-handling",
    "catalogAudioUri": "https://cdn.freesound.org/previews/250/250017_389377-lq.mp3",
    "sourceIdentity": "freesound:250017",
    "sourceUri": "https://freesound.org/people/launemax/sounds/250017/",
    "sourceChecksumSha256": "644b663b4d00777cda8f91fdc93baf71289f0bd06c918c47b80d6109af76cb5a",
    "licenseOrProviderBasis": "CC0 1.0 accepted operational defined-use review permits commercial redistribution/embedding of the exact source delivery bytes",
    "deliveryRemoteUri": "https://cdn.freesound.org/previews/250/250017_389377-lq.mp3",
    "deliveryExpectedBytes": 1142352,
    "deliveryChecksumSha256": "7cfbfece218d2b48556a638c229243d3980ae4dffaf183bf61a664d9133d2865",
    "attributionText": null
  },
  {
    "catalogIdentity": "m6-nonvoice-bb9-032-paper-handling",
    "catalogAudioUri": "https://cdn.freesound.org/previews/534/534957_37011-lq.mp3",
    "sourceIdentity": "freesound:534957",
    "sourceUri": "https://freesound.org/people/soundstack/sounds/534957/",
    "sourceChecksumSha256": "31a222ee823512662c24d2f30aad0db4eb1eaee2941fe4323338dd5d376a75a0",
    "licenseOrProviderBasis": "CC0 1.0 accepted operational defined-use review permits commercial redistribution/embedding of the exact source delivery bytes",
    "deliveryRemoteUri": "https://cdn.freesound.org/previews/534/534957_37011-lq.mp3",
    "deliveryExpectedBytes": 703224,
    "deliveryChecksumSha256": "7927e6af2fded8311a844f4ae6d58c868f62ce427824e1de024ca9db0c3e6e35",
    "attributionText": null
  },
  {
    "catalogIdentity": "m6-nonvoice-bb9-033-pencil-and-marker-writing",
    "catalogAudioUri": "https://cdn.freesound.org/previews/530/530190_6652872-lq.mp3",
    "sourceIdentity": "freesound:530190",
    "sourceUri": "https://freesound.org/people/khenshom/sounds/530190/",
    "sourceChecksumSha256": "42f0fc55c745883d196967f1a4265b24f74f1f93d38b4256bef6f4c3f9b171dc",
    "licenseOrProviderBasis": "CC0 1.0 accepted operational defined-use review permits commercial redistribution/embedding of the exact source delivery bytes",
    "deliveryRemoteUri": "https://cdn.freesound.org/previews/530/530190_6652872-lq.mp3",
    "deliveryExpectedBytes": 775176,
    "deliveryChecksumSha256": "fe14bc229e2b0c1560e465d5dca4151ab8a0f85b2e893470a5f55617d71e8f87",
    "attributionText": null
  },
  {
    "catalogIdentity": "m6-nonvoice-bb9-046-brushing-knotty-hair",
    "catalogAudioUri": "https://cdn.freesound.org/previews/443/443037_8282799-lq.mp3",
    "sourceIdentity": "freesound:443037",
    "sourceUri": "https://freesound.org/people/AmberdeMeillon/sounds/443037/",
    "sourceChecksumSha256": "c7fa270a095e33b39a3ef66efd182ba8e42e361e4f0236a1ef19076e547745aa",
    "licenseOrProviderBasis": "CC0 1.0 accepted operational defined-use review permits commercial redistribution/embedding of the exact source delivery bytes",
    "deliveryRemoteUri": "https://cdn.freesound.org/previews/443/443037_8282799-lq.mp3",
    "deliveryExpectedBytes": 91728,
    "deliveryChecksumSha256": "061b20c4d72eb3f94c151ed469fd6b22b5309fd31115da66ff111768cc276761",
    "attributionText": null
  },
  {
    "catalogIdentity": "m6-nonvoice-bb9-050-leather-jacket-handling",
    "catalogAudioUri": "https://cdn.freesound.org/previews/770/770050_13973196-lq.mp3",
    "sourceIdentity": "freesound:770050",
    "sourceUri": "https://freesound.org/people/Vrymaa/sounds/770050/",
    "sourceChecksumSha256": "dad31fb176893002f2ace0cf4b0598d1b2957ec94efae7dc1f6db23095d2ef6b",
    "licenseOrProviderBasis": "CC0 1.0 accepted operational defined-use review permits commercial redistribution/embedding of the exact source delivery bytes",
    "deliveryRemoteUri": "https://cdn.freesound.org/previews/770/770050_13973196-lq.mp3",
    "deliveryExpectedBytes": 312744,
    "deliveryChecksumSha256": "116417bb8d722b8eb69becd0d2e7e601dfe7fb6208161aa27a562f7b894f4398",
    "attributionText": null
  },
  {
    "catalogIdentity": "m6-nonvoice-bb9-051-plastic-hairbrush",
    "catalogAudioUri": "https://cdn.freesound.org/previews/199/199299_2723971-lq.mp3",
    "sourceIdentity": "freesound:199299",
    "sourceUri": "https://freesound.org/people/KatiReh/sounds/199299/",
    "sourceChecksumSha256": "5ffa10e9d7608e041e4498892c423882a0234c9cd8eb01cddf98e988b1d608d6",
    "licenseOrProviderBasis": "CC0 1.0 accepted operational defined-use review permits commercial redistribution/embedding of the exact source delivery bytes",
    "deliveryRemoteUri": "https://cdn.freesound.org/previews/199/199299_2723971-lq.mp3",
    "deliveryExpectedBytes": 418584,
    "deliveryChecksumSha256": "aa59f5a606e43cba8539af6261b88a5a3846b22547a29c4c6c37b2919bc16c8f",
    "attributionText": null
  },
  {
    "catalogIdentity": "m6-nonvoice-bb9-057-zip-and-rustling-fabric",
    "catalogAudioUri": "https://cdn.freesound.org/previews/728/728156_6033218-lq.mp3",
    "sourceIdentity": "freesound:728156",
    "sourceUri": "https://freesound.org/people/Coo01/sounds/728156/",
    "sourceChecksumSha256": "1ce9fbb3eae7062b503890a5d73838b8b862dae4bfe4a004638c342f72d5bdda",
    "licenseOrProviderBasis": "CC0 1.0 accepted operational defined-use review permits commercial redistribution/embedding of the exact source delivery bytes",
    "deliveryRemoteUri": "https://cdn.freesound.org/previews/728/728156_6033218-lq.mp3",
    "deliveryExpectedBytes": 266712,
    "deliveryChecksumSha256": "2b7b362323058ca6197380db3cb995df1388c832b67592529c235380413b8076",
    "attributionText": null
  },
  {
    "catalogIdentity": "m6-nonvoice-bb9-059-asmr-mouth-sounds-1",
    "catalogAudioUri": "https://cdn.freesound.org/previews/530/530346_11771294-lq.mp3",
    "sourceIdentity": "freesound:530346",
    "sourceUri": "https://freesound.org/people/ASMR_Tingles/sounds/530346/",
    "sourceChecksumSha256": "9a5b0a02284822df3c7024b68fc2de79d4e75641219be9916fce02e04e83da0e",
    "licenseOrProviderBasis": "CC0 1.0 accepted operational defined-use review permits commercial redistribution/embedding of the exact source delivery bytes",
    "deliveryRemoteUri": "https://cdn.freesound.org/previews/530/530346_11771294-lq.mp3",
    "deliveryExpectedBytes": 461064,
    "deliveryChecksumSha256": "b75f7f99fc6c64b017797366444b6f901e3afab6b2778662902b47667a5cd393",
    "attributionText": null
  },
  {
    "catalogIdentity": "m6-nonvoice-bb9-060-asmr-mouth-sounds-2",
    "catalogAudioUri": "https://cdn.freesound.org/previews/530/530348_11771294-lq.mp3",
    "sourceIdentity": "freesound:530348",
    "sourceUri": "https://freesound.org/people/ASMR_Tingles/sounds/530348/",
    "sourceChecksumSha256": "2472db2b4f8cf1eee966f5406aa5416aa0cbeeffe58e611fd19a6b0e2eef5e19",
    "licenseOrProviderBasis": "CC0 1.0 accepted operational defined-use review permits commercial redistribution/embedding of the exact source delivery bytes",
    "deliveryRemoteUri": "https://cdn.freesound.org/previews/530/530348_11771294-lq.mp3",
    "deliveryExpectedBytes": 491904,
    "deliveryChecksumSha256": "9d83b1a3855d160d2799ca61fcaa44f07f2c51bf1893e327deecc53e84f9bea7",
    "attributionText": null
  },
  {
    "catalogIdentity": "m6-nonvoice-bb9-061-asmr-mouth-sounds-3",
    "catalogAudioUri": "https://cdn.freesound.org/previews/530/530349_11771294-lq.mp3",
    "sourceIdentity": "freesound:530349",
    "sourceUri": "https://freesound.org/people/ASMR_Tingles/sounds/530349/",
    "sourceChecksumSha256": "4fd065f7e081ec2e1bda6d6a0fdc5536f2402f8b1da9ad880a384bb8faf4d13a",
    "licenseOrProviderBasis": "CC0 1.0 accepted operational defined-use review permits commercial redistribution/embedding of the exact source delivery bytes",
    "deliveryRemoteUri": "https://cdn.freesound.org/previews/530/530349_11771294-lq.mp3",
    "deliveryExpectedBytes": 109488,
    "deliveryChecksumSha256": "8b6c225c0cb47b13985fab792b9d01fa6e64822881e75ee4a346d017bb95cf7e",
    "attributionText": null
  },
  {
    "catalogIdentity": "m6-nonvoice-bb9-066-mouth-pops",
    "catalogAudioUri": "https://cdn.freesound.org/previews/802/802606_3501916-lq.mp3",
    "sourceIdentity": "freesound:802606",
    "sourceUri": "https://freesound.org/people/JelloApocalypse/sounds/802606/",
    "sourceChecksumSha256": "2ebe034515a5293eab3382df2d37a8a1510bf4ee846bac72cb54d059c3e1dcd6",
    "licenseOrProviderBasis": "CC0 1.0 accepted operational defined-use review permits commercial redistribution/embedding of the exact source delivery bytes",
    "deliveryRemoteUri": "https://cdn.freesound.org/previews/802/802606_3501916-lq.mp3",
    "deliveryExpectedBytes": 71040,
    "deliveryChecksumSha256": "3f7cff0605f8dd0eb71aeaeabf80617d7bc54301476f971890161bde2e8da304",
    "attributionText": null
  },
  {
    "catalogIdentity": "m6-nonvoice-bb9-108-tibetan-singing-bowl",
    "catalogAudioUri": "https://cdn.freesound.org/previews/196/196365_1847371-lq.mp3",
    "sourceIdentity": "freesound:196365",
    "sourceUri": "https://freesound.org/people/anunquietmind/sounds/196365/",
    "sourceChecksumSha256": "b611a86e0e4f194f215de2f993d0ce6c2031355649cab52c3e62219c7fbe8fcc",
    "licenseOrProviderBasis": "CC0 1.0 accepted operational defined-use review permits commercial redistribution/embedding of the exact source delivery bytes",
    "deliveryRemoteUri": "https://cdn.freesound.org/previews/196/196365_1847371-lq.mp3",
    "deliveryExpectedBytes": 374640,
    "deliveryChecksumSha256": "fe5aa844409b3fb76f9151d1080526a3ca93c036e79c3f3eb0828fd3dbd8e8c3",
    "attributionText": null
  },
  {
    "catalogIdentity": "m6-replacement-voice-01-cass-bass-asmr-whisper-snack",
    "catalogAudioUri": "https://cdn.freesound.org/previews/401/401180_7711286-lq.mp3",
    "sourceIdentity": "freesound:401180",
    "sourceUri": "https://freesound.org/people/Cass_bass/sounds/401180/",
    "sourceChecksumSha256": "6b80cead3ccc45323b1c159b8470a2a4c0312607f1f63f8e5464a7952d6de736",
    "licenseOrProviderBasis": "CC0 1.0 accepted operational defined-use review permits commercial redistribution/embedding of the exact source delivery bytes",
    "deliveryRemoteUri": "https://cdn.freesound.org/previews/401/401180_7711286-lq.mp3",
    "deliveryExpectedBytes": 6432012,
    "deliveryChecksumSha256": "7145f655e04104e9edbfbfc6cd7d293ee063b4ce3aad6114be2a36aed61ed782",
    "attributionText": null
  },
  {
    "catalogIdentity": "m6-voice-balloonhead-hello-goodbye",
    "catalogAudioUri": "https://soundscape.wellmadesystems.com/mobile-catalog-slice/kpfbNpr4n9exCDcz30C8Kp3Mzd8nNaHN/m6-voice-balloonhead-hello-goodbye.mp3",
    "sourceIdentity": "freesound:364972",
    "sourceUri": "https://freesound.org/people/balloonhead/sounds/364972/",
    "sourceChecksumSha256": "6001d8cd9cda1644c45ace956cdac2896d96cdbe9003f95b4cc42790682cb091",
    "licenseOrProviderBasis": "CC0 1.0 accepted operational defined-use review permits commercial redistribution/embedding of the exact source delivery bytes",
    "deliveryRemoteUri": "https://soundscape.wellmadesystems.com/mobile-catalog-slice/kpfbNpr4n9exCDcz30C8Kp3Mzd8nNaHN/m6-voice-balloonhead-hello-goodbye.mp3",
    "deliveryExpectedBytes": 350253,
    "deliveryChecksumSha256": "c40ebaaca98c9d45776aa171f9f4bb438591bb0064c4c23b92033c86af4e12c2",
    "attributionText": null
  },
  {
    "catalogIdentity": "m6-voice-dobroide-spanish-close-mouth",
    "catalogAudioUri": "https://soundscape.wellmadesystems.com/mobile-catalog-slice/kpfbNpr4n9exCDcz30C8Kp3Mzd8nNaHN/m6-voice-dobroide-spanish-close-mouth.mp3",
    "sourceIdentity": "freesound:29653",
    "sourceUri": "https://freesound.org/people/dobroide/sounds/29653/",
    "sourceChecksumSha256": "3597cf2845bb3221e480560b88a0374c12863b68e96839aa63e4dd408a411482",
    "licenseOrProviderBasis": "CC BY 4.0 accepted operational defined-use review permits commercial redistribution/embedding of the exact source delivery bytes",
    "deliveryRemoteUri": "https://soundscape.wellmadesystems.com/mobile-catalog-slice/kpfbNpr4n9exCDcz30C8Kp3Mzd8nNaHN/m6-voice-dobroide-spanish-close-mouth.mp3",
    "deliveryExpectedBytes": 1046829,
    "deliveryChecksumSha256": "ac6693ae5473c6fd1c06c58cac37ae6289b04d55b8046a0e504552629236f4b3",
    "attributionText": "Spanish Close-Mouth Whisper by dobroide, licensed CC BY 4.0 via Freesound."
  },
  {
    "catalogIdentity": "m6-voice-maya-hold-my-hand",
    "catalogAudioUri": "https://soundscape.wellmadesystems.com/mobile-catalog-slice/kpfbNpr4n9exCDcz30C8Kp3Mzd8nNaHN/m6-voice-maya-hold-my-hand.mp3",
    "sourceIdentity": "freesound:661983",
    "sourceUri": "https://freesound.org/people/MayaTakeda/sounds/661983/",
    "sourceChecksumSha256": "d595b75f5fae61ee823c89d04d8bb1b994bf07b8a68b3b36031f8cb6dcad7ba2",
    "licenseOrProviderBasis": "CC0 1.0 accepted operational defined-use review permits commercial redistribution/embedding of the exact source delivery bytes",
    "deliveryRemoteUri": "https://soundscape.wellmadesystems.com/mobile-catalog-slice/kpfbNpr4n9exCDcz30C8Kp3Mzd8nNaHN/m6-voice-maya-hold-my-hand.mp3",
    "deliveryExpectedBytes": 779949,
    "deliveryChecksumSha256": "67c82ce0058634e26254583350d089ee1ab26178bb5bcea72d61377dadd2312c",
    "attributionText": null
  },
  {
    "catalogIdentity": "m6-voice-resemble-01-quiet-desk-whisper",
    "catalogAudioUri": "https://soundscape.wellmadesystems.com/mobile-catalog-slice/kpfbNpr4n9exCDcz30C8Kp3Mzd8nNaHN/m6-voice-resemble-01-quiet-desk-whisper.mp3",
    "sourceIdentity": "resemble-generated:01-Quiet-Desk-Whisper.wav",
    "sourceUri": null,
    "sourceChecksumSha256": "731fc43ba7c283107c6161a2406471166da31dd79ece9ac23b67dbacc82a5709",
    "licenseOrProviderBasis": "Authenticated Resemble commercial-use and provider-delivery evidence, followed by accepted M6 hosted-delivery activation, permits app delivery of the exact generated output bytes",
    "deliveryRemoteUri": "https://soundscape.wellmadesystems.com/mobile-catalog-slice/kpfbNpr4n9exCDcz30C8Kp3Mzd8nNaHN/m6-voice-resemble-01-quiet-desk-whisper.mp3",
    "deliveryExpectedBytes": 1375917,
    "deliveryChecksumSha256": "11ff6f1d349d571ef75f4a98a1d87a5c64cd0b40949831e8a15905c6a1e1120e",
    "attributionText": null
  },
  {
    "catalogIdentity": "m6-voice-resemble-02-paper-sorting-whisper",
    "catalogAudioUri": "https://soundscape.wellmadesystems.com/mobile-catalog-slice/kpfbNpr4n9exCDcz30C8Kp3Mzd8nNaHN/m6-voice-resemble-02-paper-sorting-whisper.mp3",
    "sourceIdentity": "resemble-generated:02-Paper-Sorting-Whisper.wav",
    "sourceUri": null,
    "sourceChecksumSha256": "8c89f1cc27f7f2b8ab628b348d150ac60f940abc267b712f9c6920b11f6095dc",
    "licenseOrProviderBasis": "Authenticated Resemble commercial-use and provider-delivery evidence, followed by accepted M6 hosted-delivery activation, permits app delivery of the exact generated output bytes",
    "deliveryRemoteUri": "https://soundscape.wellmadesystems.com/mobile-catalog-slice/kpfbNpr4n9exCDcz30C8Kp3Mzd8nNaHN/m6-voice-resemble-02-paper-sorting-whisper.mp3",
    "deliveryExpectedBytes": 1684269,
    "deliveryChecksumSha256": "4358b2ab78db900bd42cd918e68f721f718de63c6466fee12f0196085d44ec79",
    "attributionText": null
  },
  {
    "catalogIdentity": "m6-voice-resemble-03-small-objects-whisper",
    "catalogAudioUri": "https://soundscape.wellmadesystems.com/mobile-catalog-slice/kpfbNpr4n9exCDcz30C8Kp3Mzd8nNaHN/m6-voice-resemble-03-small-objects-whisper.mp3",
    "sourceIdentity": "resemble-generated:03-Small-Objects-Whisper.wav",
    "sourceUri": null,
    "sourceChecksumSha256": "6b563a067191f61fcfcb2f41adce99eafe9f713a47fa53ae6ef1901f41c48a1d",
    "licenseOrProviderBasis": "Authenticated Resemble commercial-use and provider-delivery evidence, followed by accepted M6 hosted-delivery activation, permits app delivery of the exact generated output bytes",
    "deliveryRemoteUri": "https://soundscape.wellmadesystems.com/mobile-catalog-slice/kpfbNpr4n9exCDcz30C8Kp3Mzd8nNaHN/m6-voice-resemble-03-small-objects-whisper.mp3",
    "deliveryExpectedBytes": 1383597,
    "deliveryChecksumSha256": "dc26b125df69859f1dcb6bf53fd994712b4f77a9c0d733aca687feab1a689a7c",
    "attributionText": null
  },
  {
    "catalogIdentity": "m6-voice-resemble-04-rainy-library-whisper",
    "catalogAudioUri": "https://soundscape.wellmadesystems.com/mobile-catalog-slice/kpfbNpr4n9exCDcz30C8Kp3Mzd8nNaHN/m6-voice-resemble-04-rainy-library-whisper.mp3",
    "sourceIdentity": "resemble-generated:04-Rainy-Library-Whisper.wav",
    "sourceUri": null,
    "sourceChecksumSha256": "be0b38b4333e27e45d0a73ada48eee05f15cba4d80bb0de419ff6c15b32aae0d",
    "licenseOrProviderBasis": "Authenticated Resemble commercial-use and provider-delivery evidence, followed by accepted M6 hosted-delivery activation, permits app delivery of the exact generated output bytes",
    "deliveryRemoteUri": "https://soundscape.wellmadesystems.com/mobile-catalog-slice/kpfbNpr4n9exCDcz30C8Kp3Mzd8nNaHN/m6-voice-resemble-04-rainy-library-whisper.mp3",
    "deliveryExpectedBytes": 1232301,
    "deliveryChecksumSha256": "3f642fa33efbf3a7747c2be34f3be3f717b324c9711fda42f364ff295e898388",
    "attributionText": null
  },
  {
    "catalogIdentity": "m6-voice-resemble-05-gentle-room-soft-spoken",
    "catalogAudioUri": "https://soundscape.wellmadesystems.com/mobile-catalog-slice/kpfbNpr4n9exCDcz30C8Kp3Mzd8nNaHN/m6-voice-resemble-05-gentle-room-soft-spoken.mp3",
    "sourceIdentity": "resemble-generated:05-Gentle-Room-Soft-Spoken.wav",
    "sourceUri": null,
    "sourceChecksumSha256": "6195cc0020d905bf3ab68119360f611d23c72162955c8b42fc8e30858ef97213",
    "licenseOrProviderBasis": "Authenticated Resemble commercial-use and provider-delivery evidence, followed by accepted M6 hosted-delivery activation, permits app delivery of the exact generated output bytes",
    "deliveryRemoteUri": "https://soundscape.wellmadesystems.com/mobile-catalog-slice/kpfbNpr4n9exCDcz30C8Kp3Mzd8nNaHN/m6-voice-resemble-05-gentle-room-soft-spoken.mp3",
    "deliveryExpectedBytes": 1177773,
    "deliveryChecksumSha256": "7bc4735542db675207a0dd455c022c075187e7fa002b00ceb8a5f0cc6ecd74e7",
    "attributionText": null
  },
  {
    "catalogIdentity": "m6-voice-resemble-06-texture-observations-soft-spoken",
    "catalogAudioUri": "https://soundscape.wellmadesystems.com/mobile-catalog-slice/kpfbNpr4n9exCDcz30C8Kp3Mzd8nNaHN/m6-voice-resemble-06-texture-observations-soft-spoken.mp3",
    "sourceIdentity": "resemble-generated:06-Texture-Observations-Soft-Spoken.wav",
    "sourceUri": null,
    "sourceChecksumSha256": "77668108266804f01a5f0fe0d31bb9c545001cdcc9276c4849236105df2fecd6",
    "licenseOrProviderBasis": "Authenticated Resemble commercial-use and provider-delivery evidence, followed by accepted M6 hosted-delivery activation, permits app delivery of the exact generated output bytes",
    "deliveryRemoteUri": "https://soundscape.wellmadesystems.com/mobile-catalog-slice/kpfbNpr4n9exCDcz30C8Kp3Mzd8nNaHN/m6-voice-resemble-06-texture-observations-soft-spoken.mp3",
    "deliveryExpectedBytes": 1261869,
    "deliveryChecksumSha256": "a5e7e32e9c217cb1773e7a1b66b95643b109ebf07625ba2f031ec1e6588373ed",
    "attributionText": null
  },
  {
    "catalogIdentity": "m6-voice-resemble-07-slow-number-patterns-soft-spoken",
    "catalogAudioUri": "https://soundscape.wellmadesystems.com/mobile-catalog-slice/kpfbNpr4n9exCDcz30C8Kp3Mzd8nNaHN/m6-voice-resemble-07-slow-number-patterns-soft-spoken.mp3",
    "sourceIdentity": "resemble-generated:07-Slow-Number-Patterns-Soft-Spoken.wav",
    "sourceUri": null,
    "sourceChecksumSha256": "bf8c3e91065b27c93b8097b0150ed8f808fc4221bc92e0bf5af429b67b56de4f",
    "licenseOrProviderBasis": "Authenticated Resemble commercial-use and provider-delivery evidence, followed by accepted M6 hosted-delivery activation, permits app delivery of the exact generated output bytes",
    "deliveryRemoteUri": "https://soundscape.wellmadesystems.com/mobile-catalog-slice/kpfbNpr4n9exCDcz30C8Kp3Mzd8nNaHN/m6-voice-resemble-07-slow-number-patterns-soft-spoken.mp3",
    "deliveryExpectedBytes": 989997,
    "deliveryChecksumSha256": "36139e812c59504aed30637b952548881c1640f139f24da0b05c0e00014f26c0",
    "attributionText": null
  }
]) as readonly M6AcceptedPersistentDownloadEvidenceInputV1[];

const m6LedgerById = new Map(m6CatalogExpansionV1.map((identity) => [identity.id, identity]));

export const m6PersistentDownloadRightsRecordsV1: readonly PersistentDownloadCatalogRecordV1[] = Object.freeze(
  M6_ACCEPTED_PERSISTENT_DOWNLOAD_EVIDENCE_V1.map((evidence) => {
    const ledgerIdentity = m6LedgerById.get(evidence.catalogIdentity);
    if (!ledgerIdentity) throw new Error(`${evidence.catalogIdentity} is missing from the accepted M6 ledger.`);
    if (
      !ledgerIdentity.activationEligible
      || ledgerIdentity.lifecycleState !== "active"
      || !ledgerIdentity.playbackEvidenceComplete
      || ledgerIdentity.audioUrl !== evidence.catalogAudioUri
      || evidence.deliveryRemoteUri !== evidence.catalogAudioUri
    ) throw new Error(`${evidence.catalogIdentity} persistent-download evidence does not match the active product media identity.`);
    if (!/^[a-f0-9]{64}$/.test(evidence.sourceChecksumSha256) || !/^[a-f0-9]{64}$/.test(evidence.deliveryChecksumSha256) || evidence.deliveryExpectedBytes <= 0) {
      throw new Error(`${evidence.catalogIdentity} has incomplete source/delivery checksum or byte evidence.`);
    }
    return Object.freeze({
      version: 1 as const,
      catalogIdentity: evidence.catalogIdentity,
      catalogCohort: "m6" as const,
      catalogAudioUri: evidence.catalogAudioUri,
      state: "eligible_persistent_download" as const,
      lifecycleState: "active" as const,
      activationStatus: "accepted_m6_product_active_playback_verified",
      attributionText: evidence.attributionText,
      evidence: Object.freeze({
        rightsRecord: `evidence/m6-catalog-expansion-v1/activation-records.json#catalogIdentity=${evidence.catalogIdentity}`,
        activationRecord: `evidence/alpha-0.13.1-catalog-integration-offline-recovery/reconciliation.json#id=${evidence.catalogIdentity}`,
        licenseOrProviderBasis: evidence.licenseOrProviderBasis,
        sourceIdentity: evidence.sourceIdentity,
        sourceUri: evidence.sourceUri,
        sourceChecksumSha256: evidence.sourceChecksumSha256,
      }),
      delivery: Object.freeze({
        remoteUri: evidence.deliveryRemoteUri,
        expectedBytes: evidence.deliveryExpectedBytes,
        checksumSha256: evidence.deliveryChecksumSha256,
        mediaType: "audio/mpeg" as const,
      }),
    });
  }),
);

const preM6PersistentDownloadRightsRecordsV1: readonly PersistentDownloadCatalogRecordV1[] = Object.freeze(
  catalogRepository.getMobilePlayable().map((catalogRow) => {
    const product = catalogRow.compatibility.playback;
    if (!product) throw new Error(`${catalogRow.id} is marked mobile-playable without a product playback identity.`);
    if (catalogRow.id === SLOW_RAIN_RECONCILED_EVIDENCE_V1.catalogIdentity) {
      if (
        catalogRow.lifecycle.state !== "active"
        || product.audioUrl !== SLOW_RAIN_RECONCILED_EVIDENCE_V1.delivery.remoteUri
        || !SLOW_RAIN_RECONCILED_EVIDENCE_V1.rights.persistentOfflineCustomerDownload
        || !SLOW_RAIN_RECONCILED_EVIDENCE_V1.qc.mobileListeningPlaybackAccepted
      ) throw new Error("Slow Rain reconciled evidence does not match the active product media identity.");
      return Object.freeze({
        version: 1 as const,
        catalogIdentity: SLOW_RAIN_RECONCILED_EVIDENCE_V1.catalogIdentity,
        catalogCohort: "pre_m6" as const,
        catalogAudioUri: SLOW_RAIN_RECONCILED_EVIDENCE_V1.delivery.remoteUri,
        state: "eligible_persistent_download" as const,
        lifecycleState: "active" as const,
        activationStatus: "accepted_cc0_source_delivery_route_and_mobile_playback_qc",
        attributionText: SLOW_RAIN_RECONCILED_EVIDENCE_V1.rights.attributionText,
        evidence: Object.freeze({
          rightsRecord: "src/catalog/slowRainReconciledEvidenceV1.ts#rights",
          activationRecord: "src/catalog/slowRainReconciledEvidenceV1.ts#qc",
          licenseOrProviderBasis: "CC0 1.0 and Daniel's controlling exact-byte decision permit commercial derivative distribution, hosted delivery, and persistent offline customer download.",
          sourceIdentity: `freesound:${SLOW_RAIN_RECONCILED_EVIDENCE_V1.source.soundId}`,
          sourceUri: SLOW_RAIN_RECONCILED_EVIDENCE_V1.source.stableUri,
          sourceChecksumSha256: SLOW_RAIN_RECONCILED_EVIDENCE_V1.source.checksumSha256,
        }),
        delivery: Object.freeze({
          remoteUri: SLOW_RAIN_RECONCILED_EVIDENCE_V1.delivery.remoteUri,
          expectedBytes: SLOW_RAIN_RECONCILED_EVIDENCE_V1.delivery.expectedBytes,
          checksumSha256: SLOW_RAIN_RECONCILED_EVIDENCE_V1.delivery.checksumSha256,
          mediaType: SLOW_RAIN_RECONCILED_EVIDENCE_V1.delivery.mediaType,
        }),
      });
    }
    return Object.freeze({
      version: 1 as const,
      catalogIdentity: catalogRow.id,
      catalogCohort: "pre_m6" as const,
      catalogAudioUri: product.audioUrl,
      state: "rights_unknown" as const,
      lifecycleState: catalogRow.lifecycle.state,
      activationStatus: "legacy_active_pending_m3_persistent_download_evidence",
      attributionText: null,
      evidence: Object.freeze({
        rightsRecord: `src/services/catalogEvidenceReconciliationV1.ts#catalogIdentity=${catalogRow.id}`,
        activationRecord: `src/services/activationEligibilityV1.ts#legacyCompatibility=${catalogRow.id}`,
        licenseOrProviderBasis: "M3 records this legacy catalog identity as pending provenance/license evidence; no persistent-download permission is accepted.",
        sourceIdentity: catalogRow.id,
        sourceUri: null,
        sourceChecksumSha256: "",
      }),
      delivery: null,
    });
  }),
);

const records = Object.freeze(
  [...preM6PersistentDownloadRightsRecordsV1, ...m6PersistentDownloadRightsRecordsV1]
    .sort((left, right) => left.catalogIdentity.localeCompare(right.catalogIdentity)),
);
const recordById = new Map(records.map((record) => [record.catalogIdentity, record]));
if (recordById.size !== records.length) throw new Error("Persistent-download catalog contains duplicate catalog identities.");

const stateOrder: readonly PersistentDownloadRightsStateV1[] = Object.freeze([
  "eligible_persistent_download",
  "bundled_or_local",
  "streaming_only",
  "rights_unknown",
  "restricted_or_revoked",
  "unavailable",
]);
const counts = Object.freeze(Object.fromEntries(
  stateOrder.map((state) => [state, records.filter((record) => record.state === state).length]),
)) as Readonly<Record<PersistentDownloadRightsStateV1, number>>;

export const persistentDownloadRightsCatalogV1 = Object.freeze({
  version: PERSISTENT_DOWNLOAD_RIGHTS_CATALOG_VERSION,
  revision: PERSISTENT_DOWNLOAD_RIGHTS_CATALOG_REVISION,
  records,
  counts,
  cohorts: Object.freeze({
    m6: m6PersistentDownloadRightsRecordsV1.length,
    preM6: preM6PersistentDownloadRightsRecordsV1.length,
  }),
});

export function getPersistentDownloadCatalogRecordV1(catalogIdentity: string): PersistentDownloadCatalogRecordV1 | null {
  return recordById.get(catalogIdentity) ?? null;
}

export function resolvePersistentDownloadRightsV1(catalogIdentity: string, catalogAudioUri: string) {
  const record = getPersistentDownloadCatalogRecordV1(catalogIdentity);
  if (!record) return createPersistentDownloadResolutionV1({
    state: "unavailable",
    technicalReason: `No active customer catalog identity matches ${catalogIdentity}.`,
  });
  if (record.catalogAudioUri !== catalogAudioUri) return createPersistentDownloadResolutionV1({
    state: "unavailable",
    technicalReason: `${catalogIdentity} media identity mismatch: the requested URI is not the exact evidenced delivery URI.`,
    record,
  });
  const technicalReason = record.state === "eligible_persistent_download"
    ? `${catalogIdentity} exactly matches accepted rights, source, delivery checksum, catalog identity, and active product evidence.`
    : record.state === "rights_unknown"
      ? `${catalogIdentity} remains fail-closed because its M3 provenance/license record is legacy_active_pending_evidence.`
      : `${catalogIdentity} resolved to ${record.state} from its exact evidence record.`;
  return createPersistentDownloadResolutionV1({ state: record.state, technicalReason, record });
}

export function classifyLayeredPersistentDownloadRightsV1(
  layers: readonly LayerPersistentDownloadInputV1[],
): readonly LayerPersistentDownloadResolutionV1[] {
  return Object.freeze(layers.map((layer) => classifyPersistentDownloadLayerV1(
    layer,
    resolvePersistentDownloadRightsV1(layer.soundId, layer.audioUrl),
  )));
}
