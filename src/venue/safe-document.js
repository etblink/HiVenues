'use strict';

const SECRET_FIELD_PATTERN = /(?:secret|password|privatekey|apikey|token|credential|authorization|sshkey|signature)$/i;
const PRIVATE_MATERIAL_PATTERNS = [
  /-----BEGIN(?: [A-Z0-9]+)? PRIVATE KEY-----/i,
  /\b5[HJK][1-9A-HJ-NP-Za-km-z]{48,50}\b/,
];

function normalizedKey(value) {
  return value.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function defaultErrorFactory(message) {
  return new Error(message);
}

function assertUrlHasNoCredentialMaterial(value, location, errorFactory) {
  if (!/^https?:\/\//i.test(value)) return;

  let url;
  try {
    url = new URL(value);
  } catch {
    return;
  }

  if (url.username || url.password) {
    throw errorFactory(`${location} contains URL userinfo credentials`);
  }

  for (const key of url.searchParams.keys()) {
    if (SECRET_FIELD_PATTERN.test(normalizedKey(key))) {
      throw errorFactory(`${location} contains a secret-bearing URL query parameter`);
    }
  }
}

function assertNoSecretMaterial(
  value,
  {
    location = 'document',
    seen = new WeakSet(),
    errorFactory = defaultErrorFactory,
  } = {},
) {
  if (typeof value === 'string') {
    if (PRIVATE_MATERIAL_PATTERNS.some((pattern) => pattern.test(value))) {
      throw errorFactory(`${location} contains private key material`);
    }
    assertUrlHasNoCredentialMaterial(value, location, errorFactory);
    return;
  }

  if (!value || typeof value !== 'object') return;
  if (seen.has(value)) {
    throw errorFactory(`${location} contains a circular reference`);
  }
  seen.add(value);

  if (Array.isArray(value)) {
    value.forEach((child, index) =>
      assertNoSecretMaterial(child, { location: `${location}[${index}]`, seen, errorFactory }),
    );
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    if (SECRET_FIELD_PATTERN.test(normalizedKey(key))) {
      throw errorFactory(`${location}.${key} is a secret-bearing field and is not allowed`);
    }
    assertNoSecretMaterial(child, { location: `${location}.${key}`, seen, errorFactory });
  }
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value)
    .sort()
    .reduce((result, key) => {
      result[key] = canonicalize(value[key]);
      return result;
    }, {});
}

function serializeCanonicalJson(value) {
  return `${JSON.stringify(canonicalize(value), null, 2)}\n`;
}

module.exports = {
  PRIVATE_MATERIAL_PATTERNS,
  SECRET_FIELD_PATTERN,
  assertNoSecretMaterial,
  canonicalize,
  serializeCanonicalJson,
};
