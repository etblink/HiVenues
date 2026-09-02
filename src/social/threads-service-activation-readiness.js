'use strict';

const { ECDH, createHash } = require('node:crypto');
const { isValidHiveAccountName } = require('../hive/account-name');

const SERVER_CREDENTIAL_CLASSES = Object.freeze(['posting', 'active', 'owner', 'memo']);
const PROHIBITED_SERVER_CREDENTIAL_CLASSES = Object.freeze(['active', 'owner', 'memo']);
const WIF_PATTERN = /\b5[HJK][1-9A-HJ-NP-Za-km-z]{48,51}\b/;
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const BASE58_INDEX = new Map([...BASE58_ALPHABET].map((character, index) => [character, index]));
const MAX_HIVE_AUTHORITY_WEIGHT = 65_535;
const MAX_HIVE_AUTHORITY_THRESHOLD = 0xffff_ffff;
const MAX_HIVE_AUTHORITY_MEMBERSHIP = 40;

function requireAccount(value, label) {
  const account = String(value || '').trim();
  if (!isValidHiveAccountName(account)) {
    throw new TypeError(`${label} must be a valid Hive account`);
  }
  return account;
}

function decodeBase58(value) {
  const text = String(value || '');
  if (!text) throw new TypeError('Hive public key payload is empty');

  let number = 0n;
  for (const character of text) {
    const digit = BASE58_INDEX.get(character);
    if (digit === undefined) {
      throw new TypeError('Hive public key contains invalid Base58 characters');
    }
    number = (number * 58n) + BigInt(digit);
  }

  let hex = number.toString(16);
  if (hex.length % 2 !== 0) hex = `0${hex}`;
  let encoded = number === 0n ? Buffer.alloc(0) : Buffer.from(hex, 'hex');
  let leadingZeros = 0;
  for (const character of text) {
    if (character !== '1') break;
    leadingZeros += 1;
  }
  if (leadingZeros > 0) {
    encoded = Buffer.concat([Buffer.alloc(leadingZeros), encoded]);
  }
  return encoded;
}

function requirePublicKey(value, label = 'Hive public key') {
  const publicKey = String(value || '').trim();
  if (!publicKey.startsWith('STM')) {
    throw new TypeError(`${label} must use the STM mainnet Hive public-key prefix`);
  }

  const decoded = decodeBase58(publicKey.slice(3));
  if (decoded.length !== 37) {
    throw new TypeError(`${label} must decode to a 33-byte compressed key plus 4-byte checksum`);
  }

  const keyBytes = decoded.subarray(0, 33);
  const checksum = decoded.subarray(33);
  if (![0x02, 0x03].includes(keyBytes[0])) {
    throw new TypeError(`${label} must contain a compressed secp256k1 public key`);
  }

  const expectedChecksum = createHash('ripemd160').update(keyBytes).digest().subarray(0, 4);
  if (!checksum.equals(expectedChecksum)) {
    throw new TypeError(`${label} has an invalid Hive public-key checksum`);
  }

  try {
    const normalized = ECDH.convertKey(keyBytes, 'secp256k1', undefined, undefined, 'compressed');
    if (!Buffer.from(normalized).equals(keyBytes)) {
      throw new Error('compressed point changed during validation');
    }
  } catch {
    throw new TypeError(`${label} is not a valid secp256k1 public key`);
  }

  return publicKey;
}

function assertNoPrivateKeyMaterial(value, path = 'input') {
  if (typeof value === 'string') {
    if (WIF_PATTERN.test(value)) {
      const error = new Error(`Private key material is forbidden in Threads activation preflight input (${path})`);
      error.code = 'THREADS_ACTIVATION_PRIVATE_KEY_MATERIAL_FORBIDDEN';
      throw error;
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const [index, child] of value.entries()) {
      assertNoPrivateKeyMaterial(child, `${path}[${index}]`);
    }
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (/private.?key|\bwif\b|secret/i.test(key)) {
      const error = new Error(`Private-key-shaped field is forbidden in Threads activation preflight input (${path}.${key})`);
      error.code = 'THREADS_ACTIVATION_PRIVATE_KEY_FIELD_FORBIDDEN';
      throw error;
    }
    assertNoPrivateKeyMaterial(child, `${path}.${key}`);
  }
}

function normalizeCredentialClasses(value) {
  if (!Array.isArray(value)) {
    throw new TypeError('serverCredentialClasses must be an array');
  }
  const normalized = value.map((entry) => String(entry || '').trim().toLowerCase());
  for (const credentialClass of normalized) {
    if (!SERVER_CREDENTIAL_CLASSES.includes(credentialClass)) {
      throw new TypeError(`Unsupported server credential class: ${credentialClass || '(empty)'}`);
    }
  }
  return [...new Set(normalized)].sort();
}

function isValidHivePublicKey(value) {
  try {
    requirePublicKey(value);
    return true;
  } catch {
    return false;
  }
}

function normalizeAuthorityEntries(entries, { identityValidator = null } = {}) {
  if (!Array.isArray(entries)) return null;
  const seen = new Set();
  const normalized = [];
  for (const entry of entries) {
    if (!Array.isArray(entry) || entry.length !== 2) return null;
    const rawIdentity = entry[0];
    const identity = typeof rawIdentity === 'string' ? rawIdentity : '';
    const weight = entry[1];
    if (
      !identity
      || identity !== identity.trim()
      || typeof weight !== 'number'
      || !Number.isSafeInteger(weight)
      || weight < 1
      || weight > MAX_HIVE_AUTHORITY_WEIGHT
      || seen.has(identity)
      || (identityValidator && !identityValidator(identity))
    ) {
      return null;
    }
    seen.add(identity);
    normalized.push([identity, weight]);
  }
  return normalized;
}

function normalizeAuthority(authority) {
  const threshold = authority?.weight_threshold;
  if (
    typeof threshold !== 'number'
    || !Number.isSafeInteger(threshold)
    || threshold < 1
    || threshold > MAX_HIVE_AUTHORITY_THRESHOLD
  ) {
    return null;
  }
  const keyAuths = normalizeAuthorityEntries(authority?.key_auths, {
    identityValidator: isValidHivePublicKey,
  });
  const accountAuths = normalizeAuthorityEntries(authority?.account_auths, {
    identityValidator: isValidHiveAccountName,
  });
  if (
    !keyAuths
    || !accountAuths
    || keyAuths.length + accountAuths.length > MAX_HIVE_AUTHORITY_MEMBERSHIP
  ) {
    return null;
  }
  return {
    threshold,
    keyAuths,
    accountAuths,
  };
}

function authorityMembershipCount(authority) {
  if (!authority) return 0;
  return authority.keyAuths.length + authority.accountAuths.length;
}

function hasKeyAuth(authority, publicKey) {
  return Boolean(authority && authority.keyAuths.some(([candidate]) => candidate === publicKey));
}

function hasAccountAuth(authority, account) {
  return Boolean(authority && authority.accountAuths.some(([candidate]) => candidate === account));
}

function matchingKeyWeight(authority, publicKey) {
  if (!authority) return 0;
  return authority.keyAuths.reduce((sum, entry) => {
    const [candidate, weight] = Array.isArray(entry) ? entry : [];
    if (candidate !== publicKey || !Number.isSafeInteger(weight) || weight < 1) return sum;
    return sum + weight;
  }, 0);
}

function matchingAccountWeight(authority, account) {
  if (!authority) return 0;
  return authority.accountAuths.reduce((sum, entry) => {
    const [candidate, weight] = Array.isArray(entry) ? entry : [];
    if (candidate !== account || !Number.isSafeInteger(weight) || weight < 1) return sum;
    return sum + weight;
  }, 0);
}

function directKeyAuthorityChange(authority, publicKey) {
  const existingMember = hasKeyAuth(authority, publicKey);
  if (authority.threshold > MAX_HIVE_AUTHORITY_WEIGHT) {
    return {
      authority: 'posting',
      action: 'RESTRUCTURE_AUTHORITY_FOR_DIRECT_KEY_AUTH',
      publicKey,
      currentThreshold: authority.threshold,
      maximumSingleWeight: MAX_HIVE_AUTHORITY_WEIGHT,
    };
  }
  if (!existingMember && authorityMembershipCount(authority) >= MAX_HIVE_AUTHORITY_MEMBERSHIP) {
    return {
      authority: 'posting',
      action: 'RESTRUCTURE_AUTHORITY_FOR_DIRECT_KEY_AUTH',
      publicKey,
      currentMembership: authorityMembershipCount(authority),
      maximumMembership: MAX_HIVE_AUTHORITY_MEMBERSHIP,
    };
  }
  return {
    authority: 'posting',
    action: existingMember ? 'RAISE_KEY_AUTH' : 'ADD_KEY_AUTH',
    publicKey,
    minimumWeight: authority.threshold,
  };
}

function directAccountAuthorityChange(authority, account) {
  const existingMember = hasAccountAuth(authority, account);
  if (authority.threshold > MAX_HIVE_AUTHORITY_WEIGHT) {
    return {
      authority: 'active',
      action: 'RESTRUCTURE_AUTHORITY_FOR_DIRECT_ACCOUNT_AUTH',
      account,
      currentThreshold: authority.threshold,
      maximumSingleWeight: MAX_HIVE_AUTHORITY_WEIGHT,
    };
  }
  if (!existingMember && authorityMembershipCount(authority) >= MAX_HIVE_AUTHORITY_MEMBERSHIP) {
    return {
      authority: 'active',
      action: 'RESTRUCTURE_AUTHORITY_FOR_DIRECT_ACCOUNT_AUTH',
      account,
      currentMembership: authorityMembershipCount(authority),
      maximumMembership: MAX_HIVE_AUTHORITY_MEMBERSHIP,
    };
  }
  return {
    authority: 'active',
    action: existingMember ? 'RAISE_ACCOUNT_AUTH' : 'ADD_ACCOUNT_AUTH',
    account,
    minimumWeight: authority.threshold,
  };
}

function addCheck(checks, blockers, id, pass, details = {}, { block = true } = {}) {
  const result = Object.freeze({ id, pass: Boolean(pass), ...details });
  checks.push(result);
  if (block && !result.pass) blockers.push(id);
  return result;
}

function assessThreadsServiceActivationReadiness(input = {}) {
  assertNoPrivateKeyMaterial(input);

  const allowedTopLevel = new Set([
    'venue',
    'threadsAccount',
    'intendedPostingPublicKey',
    'serverCredentialClasses',
    'configuredPostingPublicKey',
  ]);
  for (const key of Object.keys(input)) {
    if (!allowedTopLevel.has(key)) {
      throw new TypeError(`Unsupported Threads activation preflight field: ${key}`);
    }
  }

  const venue = input.venue;
  if (!venue || typeof venue !== 'object' || Array.isArray(venue)) {
    throw new TypeError('venue must be an object');
  }
  const allowedVenueFields = new Set(['officialAccount', 'threadsContainerAccount']);
  for (const key of Object.keys(venue)) {
    if (!allowedVenueFields.has(key)) {
      throw new TypeError(`Unsupported venue preflight field: ${key}`);
    }
  }

  const merchantAccount = requireAccount(venue.officialAccount, 'venue.officialAccount');
  const expectedThreadsAccount = requireAccount(
    venue.threadsContainerAccount,
    'venue.threadsContainerAccount',
  );
  const intendedPostingPublicKey = requirePublicKey(
    input.intendedPostingPublicKey,
    'intendedPostingPublicKey',
  );
  const serverCredentialClasses = normalizeCredentialClasses(input.serverCredentialClasses || []);
  const postingCredentialConfigured = serverCredentialClasses.includes('posting');
  const configuredPostingPublicKey = (input.configuredPostingPublicKey === null
    || input.configuredPostingPublicKey === undefined)
    ? null
    : requirePublicKey(input.configuredPostingPublicKey, 'configuredPostingPublicKey');
  if (!postingCredentialConfigured && configuredPostingPublicKey !== null) {
    throw new TypeError(
      'configuredPostingPublicKey may be supplied only when serverCredentialClasses includes posting',
    );
  }

  const threadsAccount = input.threadsAccount;
  if (!threadsAccount || typeof threadsAccount !== 'object' || Array.isArray(threadsAccount)) {
    throw new TypeError('threadsAccount must be an on-chain account snapshot object');
  }
  const observedThreadsAccount = typeof threadsAccount.name === 'string' ? threadsAccount.name : '';
  const posting = normalizeAuthority(threadsAccount.posting);
  const active = normalizeAuthority(threadsAccount.active);

  const checks = [];
  const blockers = [];
  const proposedAuthorityChanges = [];

  const accountMatches = observedThreadsAccount === expectedThreadsAccount;
  addCheck(checks, blockers, 'THREADS_ACCOUNT_MATCH', accountMatches, {
    expectedAccount: expectedThreadsAccount,
    observedAccount: observedThreadsAccount || null,
  });

  addCheck(checks, blockers, 'THREADS_POSTING_AUTHORITY_VALID', Boolean(posting), {
    threshold: posting?.threshold || null,
  });
  addCheck(checks, blockers, 'THREADS_ACTIVE_AUTHORITY_VALID', Boolean(active), {
    threshold: active?.threshold || null,
  });

  const postingWeight = matchingKeyWeight(posting, intendedPostingPublicKey);
  const postingDirect = Boolean(posting && postingWeight >= posting.threshold);
  addCheck(checks, blockers, 'THREADS_POSTING_PUBLIC_KEY_DIRECTLY_SATISFIES_THRESHOLD', postingDirect, {
    publicKey: intendedPostingPublicKey,
    observedWeight: postingWeight,
    requiredWeight: posting?.threshold || null,
  });
  if (accountMatches && posting && !postingDirect) {
    proposedAuthorityChanges.push(Object.freeze(
      directKeyAuthorityChange(posting, intendedPostingPublicKey),
    ));
  }

  const merchantActiveWeight = matchingAccountWeight(active, merchantAccount);
  const merchantActive = Boolean(active && merchantActiveWeight >= active.threshold);
  addCheck(checks, blockers, 'MERCHANT_ACCOUNT_DIRECTLY_SATISFIES_THREADS_ACTIVE_THRESHOLD', merchantActive, {
    merchantAccount,
    observedWeight: merchantActiveWeight,
    requiredWeight: active?.threshold || null,
  });
  if (accountMatches && active && !merchantActive) {
    proposedAuthorityChanges.push(Object.freeze(
      directAccountAuthorityChange(active, merchantAccount),
    ));
  }

  const prohibitedConfigured = serverCredentialClasses.filter((credentialClass) =>
    PROHIBITED_SERVER_CREDENTIAL_CLASSES.includes(credentialClass),
  );
  addCheck(checks, blockers, 'SERVER_CREDENTIAL_BOUNDARY_POSTING_ONLY', prohibitedConfigured.length === 0, {
    allowedClasses: ['posting'],
    prohibitedConfigured,
  });

  addCheck(checks, blockers, 'THREADS_POSTING_CREDENTIAL_CONFIGURED', postingCredentialConfigured, {
    configured: postingCredentialConfigured,
  });

  const configuredPostingKeyMatches = !postingCredentialConfigured
    ? null
    : configuredPostingPublicKey === intendedPostingPublicKey;
  addCheck(
    checks,
    blockers,
    'CONFIGURED_POSTING_CREDENTIAL_MATCHES_INTENDED_PUBLIC_KEY',
    configuredPostingKeyMatches !== false,
    {
      applicable: postingCredentialConfigured,
      configuredPostingPublicKey,
      intendedPostingPublicKey,
    },
    { block: postingCredentialConfigured },
  );

  const authorityReady = accountMatches && postingDirect && merchantActive;
  const credentialBoundarySafe = prohibitedConfigured.length === 0;
  const credentialIdentityReady = postingCredentialConfigured && configuredPostingKeyMatches === true;
  const preparationReady = authorityReady && credentialBoundarySafe && credentialIdentityReady;
  const runtimeSignerActivationImplemented = false;
  addCheck(
    checks,
    blockers,
    'THREADS_RUNTIME_SIGNER_ACTIVATION_IMPLEMENTED',
    runtimeSignerActivationImplemented,
    {
      implemented: false,
      currentBoundary: 'CANONICAL_THREADS_SERVICE_SIGNER_REMAINS_SYNTHETIC_TEST_ONLY',
    },
  );
  const activationReady = false;

  let nextStage;
  if (!accountMatches || !posting || !active) {
    nextStage = 'REPAIR_IDENTITY_OR_AUTHORITY_INPUT';
  } else if (!credentialBoundarySafe) {
    nextStage = 'REMOVE_PROHIBITED_SERVER_CREDENTIALS';
  } else if (!authorityReady) {
    nextStage = 'SEPARATELY_AUTHORIZE_AND_APPLY_HIVE_AUTHORITY_CHANGE';
  } else if (!postingCredentialConfigured) {
    nextStage = 'SEPARATELY_AUTHORIZE_POSTING_KEY_PROVISIONING';
  } else if (!credentialIdentityReady) {
    nextStage = 'REPAIR_OR_REPROVISION_THREADS_POSTING_CREDENTIAL';
  } else {
    nextStage = 'IMPLEMENT_AND_QUALIFY_SEPARATELY_AUTHORIZED_RUNTIME_SIGNER_ACTIVATION';
  }

  return Object.freeze({
    schema: 'hive-venues-threads-service-activation-readiness-v1',
    activationReady,
    preparationReady,
    authorityReady,
    credentialBoundarySafe,
    postingCredentialConfigured,
    credentialIdentityReady,
    nextStage,
    identities: Object.freeze({
      merchantAccount,
      threadsAccount: expectedThreadsAccount,
      intendedPostingPublicKey,
      configuredPostingPublicKey,
    }),
    checks: Object.freeze(checks),
    blockers: Object.freeze([...new Set(blockers)]),
    proposedAuthorityChanges: Object.freeze(proposedAuthorityChanges),
    rollbackRequirements: Object.freeze([
      'CAPTURE_EXACT_PRE_CHANGE_POSTING_AND_ACTIVE_AUTHORITIES_BEFORE_ANY_LIVE_MUTATION',
      'PRECOMPUTE_EXACT_ROLLBACK_FROM_CAPTURED_PRE_CHANGE_AUTHORITIES',
      'VERIFY_POST_CHANGE_AUTHORITIES_FROM_FRESH_ON_CHAIN_READ_BEFORE_DEPLOYMENT',
      'NEVER_PROVISION_ACTIVE_OWNER_OR_MEMO_PRIVATE_KEYS_TO_THE_SERVER',
    ]),
    currentRepositoryBoundary: 'REAL_THREADS_SERVICE_SIGNER_REMAINS_SYNTHETIC_TEST_ONLY',
    externalEffectBoundary: 'NO_LIVE_MUTATION_OR_SECRET_OPERATION_PERFORMED_BY_THIS_PREFLIGHT',
  });
}

module.exports = {
  MAX_HIVE_AUTHORITY_MEMBERSHIP,
  MAX_HIVE_AUTHORITY_THRESHOLD,
  MAX_HIVE_AUTHORITY_WEIGHT,
  PROHIBITED_SERVER_CREDENTIAL_CLASSES,
  SERVER_CREDENTIAL_CLASSES,
  assessThreadsServiceActivationReadiness,
  assertNoPrivateKeyMaterial,
  decodeBase58,
  isValidHivePublicKey,
  normalizeAuthority,
  requirePublicKey,
};
