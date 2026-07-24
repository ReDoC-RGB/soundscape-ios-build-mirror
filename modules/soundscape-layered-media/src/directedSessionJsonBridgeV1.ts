import type { NativeDirectedSessionDefinitionV1 } from './SoundscapeLayeredMedia.types';

export const DIRECTED_SESSION_JSON_MAX_UTF8_BYTES_V1 = 65_536;

const ROOT_FIELDS_V1 = Object.freeze([
  'sessionId',
  'generationId',
  'operationId',
  'expectedPhaseRevision',
  'expectedPathRevision',
  'idempotencyKey',
  'sessionType',
  'contractVersion',
  'sceneId',
  'sceneVersion',
  'scoreHash',
  'title',
  'trajectory',
  'durationMs',
  'initialPlayedElapsedMs',
  'finalFadeStartMs',
  'outputProfile',
  'hardAvoidanceIds',
  'initialAppliedSteering',
  'initialManualTrims',
  'playingOffline',
  'maxLayerGain',
  'minimumOptionalGain',
  'phaseCrossfadeMs',
  'assets',
  'phases',
  'events',
  'texturePairs',
] as const);

const ROOT_FIELD_SET_V1 = new Set<string>(ROOT_FIELDS_V1);

export class DirectedJsonBridgePreNativeErrorV1 extends Error {
  readonly nativeCallAttempted = false;

  constructor(readonly diagnosticCode: string) {
    super(diagnosticCode);
    this.name = 'DirectedJsonBridgePreNativeErrorV1';
  }
}

export const isDirectedJsonBridgePreNativeErrorV1 = (value: unknown): value is DirectedJsonBridgePreNativeErrorV1 => (
  value instanceof DirectedJsonBridgePreNativeErrorV1
  || Boolean(
    value
    && typeof value === 'object'
    && (value as { nativeCallAttempted?: unknown }).nativeCallAttempted === false
    && typeof (value as { diagnosticCode?: unknown }).diagnosticCode === 'string',
  )
);

const reject = (code: string): never => {
  throw new DirectedJsonBridgePreNativeErrorV1(code);
};

const utf8ByteLengthV1 = (value: string): number => {
  let bytes = 0;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x7f) bytes += 1;
    else if (code <= 0x7ff) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff) {
      const low = value.charCodeAt(index + 1);
      if (!(low >= 0xdc00 && low <= 0xdfff)) reject('DIRECTED_JSON_VALUE_UNSUPPORTED');
      bytes += 4;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      reject('DIRECTED_JSON_VALUE_UNSUPPORTED');
    } else bytes += 3;
  }
  return bytes;
};

const canonicalizeJsonValueV1 = (value: unknown, active: Set<object>): unknown => {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) reject('DIRECTED_JSON_NON_FINITE');
    return value;
  }
  if (typeof value !== 'object') reject('DIRECTED_JSON_VALUE_UNSUPPORTED');
  const objectValue = value as object;
  if (active.has(objectValue)) reject('DIRECTED_JSON_CYCLIC');
  active.add(objectValue);
  try {
    if (Array.isArray(value)) return value.map((entry) => canonicalizeJsonValueV1(entry, active));
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) reject('DIRECTED_JSON_VALUE_UNSUPPORTED');
    const record = value as Record<string, unknown>;
    const canonical: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) canonical[key] = canonicalizeJsonValueV1(record[key], active);
    return canonical;
  } finally {
    active.delete(objectValue);
  }
};

export function serializeDirectedSessionDefinitionV1(definition: NativeDirectedSessionDefinitionV1 | unknown): string {
  if (definition === null || typeof definition !== 'object' || Array.isArray(definition)) reject('DIRECTED_JSON_ROOT_INVALID');
  const prototype = Object.getPrototypeOf(definition);
  if (prototype !== Object.prototype && prototype !== null) reject('DIRECTED_JSON_ROOT_INVALID');
  const fields = Object.keys(definition as Record<string, unknown>);
  if (fields.some((field) => !ROOT_FIELD_SET_V1.has(field))) reject('DIRECTED_JSON_FIELD_UNSUPPORTED');
  if (ROOT_FIELDS_V1.some((field) => !Object.prototype.hasOwnProperty.call(definition, field))) reject('DIRECTED_JSON_FIELD_MISSING');

  const serialized = (() => {
    try {
      const result = JSON.stringify(canonicalizeJsonValueV1(definition, new Set<object>()));
      if (typeof result !== 'string' || result.length === 0) return reject('DIRECTED_JSON_STRINGIFY_FAILED');
      return result;
    } catch (error) {
      if (isDirectedJsonBridgePreNativeErrorV1(error)) throw error;
      return reject('DIRECTED_JSON_STRINGIFY_FAILED');
    }
  })();
  if (utf8ByteLengthV1(serialized) > DIRECTED_SESSION_JSON_MAX_UTF8_BYTES_V1) reject('DIRECTED_JSON_TOO_LARGE');
  return serialized;
}
