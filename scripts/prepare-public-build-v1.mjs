#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const manifestPath = path.join(root, "public-build-manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
assert.match(manifest.canonicalPrivateCommit, /^[a-f0-9]{40}$/);
if (/^0{40}$/.test(manifest.canonicalPrivateCommit)) {
  assert.equal(process.env.SOUNDSCAPE_ALLOW_UNCOMMITTED_MIRROR, "1", "an uncommitted candidate cannot run without the explicit local-only audit override");
}
assert.ok(Array.isArray(manifest.exportedPaths) && manifest.exportedPaths.length > 0);
assert.deepEqual(Object.keys(manifest).sort(), ["canonicalPrivateCommit", "exportedPaths"]);

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const normalizeRelative = (value) => value.split(path.sep).join("/");
const walkFiles = (directory) => {
  const files = [];
  const visit = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name === ".git") continue;
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile()) files.push(normalizeRelative(path.relative(directory, absolute)));
      else throw new Error(`public checkout contains a non-file entry: ${absolute}`);
    }
  };
  visit(directory);
  return files.sort();
};

const manifestPaths = manifest.exportedPaths.map((entry) => entry.path);
assert.deepEqual(manifestPaths, [...new Set(manifestPaths)].sort(), "manifest paths must be sorted, unique, and exact");
for (const relativePath of manifestPaths) {
  assert.equal(path.posix.normalize(relativePath), relativePath, `non-normalized manifest path: ${relativePath}`);
  assert.equal(relativePath.startsWith("/") || relativePath.includes(".."), false, `unsafe manifest path: ${relativePath}`);
}
assert.deepEqual(walkFiles(root), ["public-build-manifest.json", ...manifestPaths].sort(), "checkout contains a missing or unmanifested public path");
for (const entry of manifest.exportedPaths) {
  assert.deepEqual(Object.keys(entry).sort(), ["byteLength", "path", "sha256"]);
  const bytes = fs.readFileSync(path.join(root, entry.path));
  assert.equal(bytes.length, entry.byteLength, `${entry.path} byte length mismatch`);
  assert.equal(sha256(bytes), entry.sha256, `${entry.path} hash mismatch`);
}

const publicRuntimePath = "src/catalog/slowRainReconciledEvidenceV1.ts";
assert.equal(manifestPaths.includes(publicRuntimePath), true, "complete public-safe Slow Rain runtime source is missing");
const publicRuntime = fs.readFileSync(path.join(root, publicRuntimePath), "utf8");
assert.match(publicRuntime, /soundscape-evidence-ref-v1:/);
assert.match(publicRuntime, /https:\/\/soundscape\.wellmadesystems\.com\/mobile-catalog-slice\/[A-Za-z0-9_-]{24,128}\/freesound-slow-rain-loop\.mp3/);
assert.doesNotMatch(publicRuntime, /license-proofs\/|Soundscape-[A-Za-z0-9._-]+\.txt|__SOUNDSCAPE_(?:PRIVATE_COMPILE_INPUT_REQUIRED|MEDIA_ROUTE_TOKEN)__/);

const applicationSources = manifest.exportedPaths.filter((entry) => entry.path.startsWith("src/") && /\.tsx?$/.test(entry.path));
assert.ok(applicationSources.length > 0, "public manifest contains no application source");
for (const entry of applicationSources) {
  const source = fs.readFileSync(path.join(root, entry.path), "utf8");
  assert.doesNotMatch(source, /private-evidence\/slow-rain-evidence-locators-v1|license-proofs\/|Soundscape-[A-Za-z0-9._-]+\.txt|__SOUNDSCAPE_(?:PRIVATE_COMPILE_INPUT_REQUIRED|MEDIA_ROUTE_TOKEN)__/);
}

const hostedRouteTokens = new Set();
for (const entry of applicationSources) {
  const source = fs.readFileSync(path.join(root, entry.path), "utf8");
  for (const match of source.matchAll(/soundscape\.wellmadesystems\.com\/mobile-catalog-slice\/([A-Za-z0-9_-]{24,128})(?=\/|["'`])/g)) hostedRouteTokens.add(match[1]);
}
assert.equal(hostedRouteTokens.size, 1, "public application source must contain exactly one authorized hosted-media route identity");
console.log(`Verified ${manifest.exportedPaths.length} manifest-bound public paths and complete compile-required application source without source restoration.`);
