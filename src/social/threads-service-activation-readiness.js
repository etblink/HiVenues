'use strict';

const { HIVE_ACCOUNT_PATTERN } = require('../venue/context');

const SERVER_CREDENTIAL_CLASSES = Object.freeze(['posting', 'active', 'owner', 'memo']);
const PROHIBITED_SERVER_CREDENTIAL_CLASSES = Object.freeze(['active', 'owner', 'memo']);
const WIF_PATTERN = /\b5[HJK][1-9A-HJ-NP-Za-km-z]{48,51}\b/;
const PUBLIC_KEY_PATTERN = /^STM[1-9A-HJ-NP-Za-km-z]{40,60}$/;

function requireAccount(value, label) {
  const account = String(value || '').trim().toLowerCase();
  if (!HIVE_ACCOUNT_PATTERN.test(account)) {
    throw new TypeError(`${label} must be a valid Hive account`);
  }
  return account;
}

function requirePublicKey(value) {
  const publicKey = String(value || '').trim();
  if (!PUBLIC_KEY_PATTERN.test(publicKey)) {
    throw new TypeError('intendedPostingPublicKey must be a mainnet Hive public key');
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

function normalizeAuthority(authority) {
  const threshold = Number(authority?.weight_threshold);
  if (!Number.isSafeInteger(threshold) || threshold < 1) return null;
  return {
    threshold,
    keyAuths: Array.isArray(authority?.key_auths) ? authority.key_auths : [],
    accountAuths: Array.isArray(authority?.account_auths) ? authority.account_auths : [],
  };
}

function matchingKeyWeight(authority, publicKey) {
  if (!authority) return 0;
  return authority.keyAuths.reduce((sum, entry) => {
    const [candidate, rawWeight] = Array.isArray(entry) ? entry : [];
    const weight = Number(rawWeight);
    if (candidate !== publicKey || !Number.isSafeInteger(weight) || weight < 1) return sum;
    return sum + weight;
  }, 0);
}

function matchingAccountWeight(authority, account) {
  if (!authority) return 0;
  return authority.accountAuths.reduce((sum, entry) => {
    const [candidateValue, rawWeight] = Array.isArray(entry) ? entry : [];
    const candidate = String(candidateValue || '').trim().toLowerCase();
    const weight = Number(rawWeight);
    if (candidate !== account || !Number.isSafeInteger(weight) || weight < 1) return sum;
    return sum + weight;
  }, 0);
}

function addCheck(checks, blockers, id, pass, details = {}) {
  const result = Object.freeze({ id, pass: Boolean(pass), ...details });
  checks.push(result);
  if (!result.pass) blockers.push(id);
  return result;
}

function assessThreadsServiceActivationReadiness(input = {}) {
  assertNoPrivateKeyMaterial(input);

  const allowedTopLevel = new Set([
    'venue',
    'threadsAccount',
    'intendedPostingPublicKey',
    'serverCredentialClasses',
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
  const intendedPostingPublicKey = requirePublicKey(input.intendedPostingPublicKey);
  const serverCredentialClasses = normalizeCredentialClasses(input.serverCredentialClasses || []);

  const threadsAccount = input.threadsAccount;
  if (!threadsAccount || typeof threadsAccount !== 'object' || Array.isArray(threadsAccount)) {
    throw new TypeError('threadsAccount must be an on-chain account snapshot object');
  }
  const observedThreadsAccount = String(threadsAccount.name || '').trim().toLowerCase();
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
    proposedAuthorityChanges.push(Object.freeze({
      authority: 'posting',
      action: 'ADD_OR_RAISE_KEY_AUTH',
      publicKey: intendedPostingPublicKey,
      minimumWeight: posting.threshold,
    }));
  }

  const merchantActiveWeight = matchingAccountWeight(active, merchantAccount);
  const merchantActive = Boolean(active && merchantActiveWeight >= active.threshold);
  addCheck(checks, blockers, 'MERCHANT_ACCOUNT_DIRECTLY_SATISFIES_THREADS_ACTIVE_THRESHOLD', merchantActive, {
    merchantAccount,
    observedWeight: merchantActiveWeight,
    requiredWeight: active?.threshold || null,
  });
  if (accountMatches && active && !merchantActive) {
    proposedAuthorityChanges.push(Object.freeze({
      authority: 'active',
      action: 'ADD_OR_RAISE_ACCOUNT_AUTH',
      account: merchantAccount,
      minimumWeight: active.threshold,
    }));
  }

  const prohibitedConfigured = serverCredentialClasses.filter((credentialClass) =>
    PROHIBITED_SERVER_CREDENTIAL_CLASSES.includes(credentialClass),
  );
  addCheck(checks, blockers, 'SERVER_CREDENTIAL_BOUNDARY_POSTING_ONLY', prohibitedConfigured.length === 0, {
    allowedClasses: ['posting'],
    prohibitedConfigured,
  });

  const postingCredentialConfigured = serverCredentialClasses.includes('posting');
  addCheck(checks, blockers, 'THREADS_POSTING_CREDENTIAL_CONFIGURED', postingCredentialConfigured, {
    configured: postingCredentialConfigured,
  });

  const authorityReady = accountMatches && postingDirect && merchantActive;
  const credentialBoundarySafe = prohibitedConfigured.length === 0;
  const activationReady = authorityReady && credentialBoundarySafe && postingCredentialConfigured;

  let nextStage;
  if (!accountMatches || !posting || !active) {
    nextStage = 'REPAIR_IDENTITY_OR_AUTHORITY_INPUT';
  } else if (!credentialBoundarySafe) {
    nextStage = 'REMOVE_PROHIBITED_SERVER_CREDENTIALS';
  } else if (!authorityReady) {
    nextStage = 'SEPARATELY_AUTHORIZE_AND_APPLY_HIVE_AUTHORITY_CHANGE';
  } else if (!postingCredentialConfigured) {
    nextStage = 'SEPARATELY_AUTHORIZE_POSTING_KEY_PROVISIONING';
  } else {
    nextStage = 'SEPARATELY_AUTHORIZE_DEPLOYMENT_ACTIVATION';
  }

  return Object.freeze({
    schema: 'hive-venues-threads-service-activation-readiness-v1',
    activationReady,
    authorityReady,
    credentialBoundarySafe,
    postingCredentialConfigured,
    nextStage,
    identities: Object.freeze({
      merchantAccount,
      threadsAccount: expectedThreadsAccount,
      intendedPostingPublicKey,
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
    externalEffectBoundary: 'NO_LIVE_MUTATION_OR_SECRET_OPERATION_PERFORMED_BY_THIS_PREFLIGHT',
  });
}

module.exports = {
  PROHIBITED_SERVER_CREDENTIAL_CLASSES,
  SERVER_CREDENTIAL_CLASSES,
  assessThreadsServiceActivationReadiness,
  assertNoPrivateKeyMaterial,
  normalizeAuthority,
};
