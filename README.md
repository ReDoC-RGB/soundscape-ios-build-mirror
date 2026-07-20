# Soundscape iOS Build Mirror

This public repository is an automatically generated, sanitized build snapshot for a single Soundscape internal Ad Hoc proof. Canonical development and all Git history remain in a private repository.

The snapshot is bound to the exact private source commit recorded in `public-build-manifest.json`. It intentionally contains no private Git history, signing material, credentials, private evidence trees, support system, or issue-tracking promise.

The sole workflow is manual-only. It verifies every manifest-bound byte and the complete compile-required public-safe runtime source without restoring or rewriting application source, generates the iOS workspace, resolves Pods with pinned CocoaPods 1.16.2 and an in-run deployment-lock drift check, imports only the existing Apple distribution identity and Ad Hoc profile from repository secrets into temporary runner storage, builds one internal IPA on a standard GitHub-hosted `macos-15` runner, verifies provenance/signing, removes temporary signing inputs, uploads a one-day Actions artifact, and performs no App Store or TestFlight transaction.

Issues and pull requests are not a supported product or support channel.
