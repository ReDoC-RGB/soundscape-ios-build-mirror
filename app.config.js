const UNBOUND_SOURCE_COMMIT = "0000000000000000000000000000000000000000";
const RELEASE = Object.freeze({
  label: "Alpha 0.14.2",
  displayLabel: "Alpha 0.14.2 — Independent Build Pipeline Proof",
  codename: "independent-build-pipeline-proof-v1",
  internalLabel: "Alpha 0.14.2+independent-build-pipeline-proof-v1",
});

module.exports = ({ config }) => {
  const sourceCommit = process.env.SOUNDSCAPE_SOURCE_COMMIT || UNBOUND_SOURCE_COMMIT;
  const channel = process.env.SOUNDSCAPE_BUILD_CHANNEL || "preview";
  const buildSystem = process.env.SOUNDSCAPE_BUILD_SYSTEM || "unbound-development";

  if (!/^[a-f0-9]{40}$/.test(sourceCommit)) {
    throw new Error("SOUNDSCAPE_SOURCE_COMMIT must be one lowercase 40-character Git commit.");
  }
  if (process.env.SOUNDSCAPE_REQUIRE_BOUND_COMMIT === "1" && sourceCommit === UNBOUND_SOURCE_COMMIT) {
    throw new Error("A bound SOUNDSCAPE_SOURCE_COMMIT is required for an install artifact.");
  }
  if (channel !== "preview") {
    throw new Error("Build Independence v1 is authorized only for the preview channel.");
  }

  return {
    ...config,
    updates: {
      ...config.updates,
      requestHeaders: {
        ...(config.updates?.requestHeaders || {}),
        "expo-channel-name": channel,
      },
    },
    extra: {
      ...(config.extra || {}),
      soundscapeBuild: {
        release: RELEASE,
        sourceCommit,
        channel,
        distribution: "internal",
        runtimePolicy: "fingerprint",
        buildSystem,
      },
    },
    ios: {
      ...config.ios,
      infoPlist: {
        ...(config.ios?.infoPlist || {}),
        SoundscapeSourceCommit: sourceCommit,
        SoundscapeBuildChannel: channel,
        SoundscapeBuildDistribution: "internal",
        SoundscapeRuntimePolicy: "fingerprint",
        SoundscapeBuildSystem: buildSystem,
      },
    },
  };
};
