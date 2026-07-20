import type {
  NativeLayer,
  NativeMediaMetadata,
  NativeOwnership,
  NativeSessionDefinition,
} from './SoundscapeLayeredMedia.types';

export type NativeSessionBuildOptions = {
  sessionType: 'single' | 'layered';
  title: string;
  recipeId?: string;
  durationMillis: number;
  loopEnabled: boolean;
  layers: NativeLayer[];
};

export function assertNoUndefinedNativePayload(value: unknown, path = '$', seen = new WeakSet<object>()): void {
  if (value === undefined) {
    throw new TypeError(`Native payload contains undefined at ${path}`);
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError(`Native payload contains a non-finite number at ${path}`);
    }
    return;
  }
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return;
  }
  if (typeof value !== 'object') {
    throw new TypeError(`Native payload contains unsupported ${typeof value} at ${path}`);
  }
  if (seen.has(value)) {
    throw new TypeError(`Native payload contains a circular reference at ${path}`);
  }
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoUndefinedNativePayload(item, `${path}[${index}]`, seen));
  } else {
    Object.keys(value).forEach((key) => {
      assertNoUndefinedNativePayload((value as Record<string, unknown>)[key], `${path}.${key}`, seen);
    });
  }
  seen.delete(value);
}

export function buildNativeSessionDefinition(
  options: NativeSessionBuildOptions,
  owner: NativeOwnership,
): NativeSessionDefinition {
  const metadata: NativeMediaMetadata = {
    title: options.title,
    artist: 'Soundscape',
    ...(options.recipeId !== undefined && options.recipeId.length > 0 ? { recipeId: options.recipeId } : {}),
  };
  const definition: NativeSessionDefinition = {
    ...owner,
    sessionType: options.sessionType,
    layers: options.layers,
    loopEnabled: options.loopEnabled,
    durationMillis: options.durationMillis,
    metadata,
  };
  assertNoUndefinedNativePayload(definition);
  return definition;
}
