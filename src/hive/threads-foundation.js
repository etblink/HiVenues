'use strict';

const { createHash } = require('node:crypto');

const HIVE_ACCOUNT_PATTERN = /^(?=.{3,64}$)[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)*$/;
const VENUE_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,63}$/;
const PERMLINK_PATTERN = /^[a-z0-9][a-z0-9-]{0,255}$/;
const THREADS_CONTAINER_KIND = 'threads-container';
const THREADS_CONTAINER_VERSION = 1;
const MAX_BENEFICIARY_WEIGHT = 10_000;
const DEFAULT_MAX_ACCEPTED_PAYOUT = '1000000.000 HBD';
const THREADS_ACCOUNT_POST_SCAN_LIMIT = 10;

const THREADS_FUNDS_POLICY = Object.freeze({
  recurrentTransfer: false,
  automaticSweep: false,
  manualClaim: true,
  claimAuthority: 'Active',
  claimSigner: 'venue-official-account',
  sourceAuthority: 'threads-active-account-auth',
});

function fail(message) {
  const error = new Error(message);
  error.name = 'ValidationError';
  throw error;
}

function normalizeHiveAccount(value, label = 'Hive account') {
  const account = String(value || '').trim().toLowerCase();
  if (!HIVE_ACCOUNT_PATTERN.test(account)) fail(`${label} is invalid`);
  return account;
}

function normalizeVenueId(value) {
  const venueId = String(value || '').trim().toLowerCase();
  if (!VENUE_ID_PATTERN.test(venueId)) fail('Venue id is invalid');
  return venueId;
}

function normalizePermlink(value) {
  const permlink = String(value || '').trim().toLowerCase();
  if (!PERMLINK_PATTERN.test(permlink)) fail('Permlink is invalid');
  return permlink;
}

function normalizeVenue(venue) {
  if (!venue || typeof venue !== 'object') fail('Venue context is required');
  const hive = venue.hive || {};
  return Object.freeze({
    id: normalizeVenueId(venue.id),
    hive: Object.freeze({
      communityId: String(hive.communityId || '').trim().toLowerCase(),
      officialAccount: normalizeHiveAccount(hive.officialAccount, 'Official venue account'),
      threadsContainerAccount: normalizeHiveAccount(
        hive.threadsContainerAccount,
        'Threads container account',
      ),
    }),
  });
}

function fingerprintOperations(operations) {
  return createHash('sha256').update(JSON.stringify(operations), 'utf8').digest('hex');
}

function safeObject(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function buildThreadsContainerMetadata({ venue, appTag }) {
  const normalizedVenue = normalizeVenue(venue);
  const app = String(appTag || '').trim();
  const payload = {
    app,
    format: 'markdown',
    hive_venues: {
      kind: THREADS_CONTAINER_KIND,
      version: THREADS_CONTAINER_VERSION,
      venue: normalizedVenue.id,
    },
  };
  return JSON.stringify(payload);
}

function readThreadsContainerMarker(rawMetadata) {
  const metadata = safeObject(rawMetadata);
  const marker = safeObject(metadata.hive_venues);
  if (
    marker.kind !== THREADS_CONTAINER_KIND ||
    Number(marker.version) !== THREADS_CONTAINER_VERSION ||
    !VENUE_ID_PATTERN.test(String(marker.venue || '').trim().toLowerCase())
  ) {
    return null;
  }
  return Object.freeze({
    kind: THREADS_CONTAINER_KIND,
    version: THREADS_CONTAINER_VERSION,
    venue: String(marker.venue).trim().toLowerCase(),
  });
}

function isTopLevelByAccount(item, account) {
  return item?.author === account && !item?.parent_author;
}

function selectThreadsContainer(rawPosts, {
  account: accountValue,
  venueId: venueIdValue,
  allowLegacyFallback = true,
} = {}) {
  const account = normalizeHiveAccount(accountValue, 'Threads container account');
  const venueId = normalizeVenueId(venueIdValue);
  const posts = Array.isArray(rawPosts) ? rawPosts.slice(0, THREADS_ACCOUNT_POST_SCAN_LIMIT) : [];
  const topLevel = posts.filter((item) => isTopLevelByAccount(item, account));

  for (const item of topLevel) {
    const marker = readThreadsContainerMarker(item.json_metadata);
    if (marker?.venue === venueId) {
      return Object.freeze({ item, marker, legacyFallbackUsed: false });
    }
  }

  if (!allowLegacyFallback || topLevel.length === 0) return null;
  return Object.freeze({ item: topLevel[0], marker: null, legacyFallbackUsed: true });
}

function normalizeBeneficiaryComponent(component) {
  if (!component || component.enabled === false) return null;
  const account = normalizeHiveAccount(component.account, 'Beneficiary account');
  const weight = Number(component.weight);
  if (!Number.isInteger(weight) || weight <= 0 || weight > MAX_BENEFICIARY_WEIGHT) {
    fail('Beneficiary weight must be a whole number from 1 to 10000');
  }
  return Object.freeze({
    source: String(component.source || 'beneficiary').trim() || 'beneficiary',
    account,
    weight,
  });
}

function composeBeneficiaries(components = []) {
  const normalizedComponents = components
    .map(normalizeBeneficiaryComponent)
    .filter(Boolean);
  const byAccount = new Map();
  for (const component of normalizedComponents) {
    byAccount.set(component.account, (byAccount.get(component.account) || 0) + component.weight);
  }
  const beneficiaries = [...byAccount.entries()]
    .map(([account, weight]) => ({ account, weight }))
    .sort((left, right) => left.account.localeCompare(right.account));
  const totalWeight = beneficiaries.reduce((sum, beneficiary) => sum + beneficiary.weight, 0);
  if (totalWeight > MAX_BENEFICIARY_WEIGHT) {
    fail('Combined beneficiary weight cannot exceed 10000');
  }
  if (beneficiaries.some((beneficiary) => beneficiary.weight > MAX_BENEFICIARY_WEIGHT)) {
    fail('Combined beneficiary weight for one account cannot exceed 10000');
  }
  return Object.freeze({
    components: Object.freeze(normalizedComponents),
    beneficiaries: Object.freeze(beneficiaries.map(Object.freeze)),
    totalWeight,
  });
}

function composeUserContentBeneficiaries({ venuePolicy = null, creatorDonation = null } = {}) {
  return composeBeneficiaries([
    venuePolicy?.enabled
      ? {
          source: 'venue-policy',
          account: venuePolicy.account,
          weight: venuePolicy.weight,
        }
      : null,
    creatorDonation?.checked
      ? {
          source: 'hive-venues-creator-donation',
          account: creatorDonation.account,
          weight: creatorDonation.weight,
        }
      : null,
  ]);
}

function commentOptionsOperation({
  author: authorValue,
  permlink: permlinkValue,
  beneficiaries,
  maxAcceptedPayout = DEFAULT_MAX_ACCEPTED_PAYOUT,
}) {
  const author = normalizeHiveAccount(authorValue, 'Comment options author');
  const permlink = normalizePermlink(permlinkValue);
  const composition = composeBeneficiaries(
    Array.isArray(beneficiaries)
      ? beneficiaries.map((beneficiary) => ({ ...beneficiary, enabled: true }))
      : [],
  );
  return [
    'comment_options',
    {
      author,
      permlink,
      max_accepted_payout: String(maxAcceptedPayout),
      percent_hbd: 10_000,
      allow_votes: true,
      allow_curation_rewards: true,
      extensions: composition.beneficiaries.length > 0
        ? [[0, { beneficiaries: composition.beneficiaries }]]
        : [],
    },
  ];
}

function buildThreadsContainerRoot({
  venue,
  appTag,
  permlink: permlinkValue,
  title = 'Threads',
  body = 'Technical Threads container for this venue.',
}) {
  const normalizedVenue = normalizeVenue(venue);
  const author = normalizedVenue.hive.threadsContainerAccount;
  const permlink = normalizePermlink(permlinkValue);
  const beneficiaryComposition = composeBeneficiaries([
    {
      source: 'threads-root-venue-beneficiary',
      account: normalizedVenue.hive.officialAccount,
      weight: MAX_BENEFICIARY_WEIGHT,
    },
  ]);
  const comment = [
    'comment',
    {
      parent_author: '',
      parent_permlink: normalizedVenue.hive.communityId,
      author,
      permlink,
      title: String(title || 'Threads').trim() || 'Threads',
      body: String(body || '').trim() || 'Technical Threads container for this venue.',
      json_metadata: buildThreadsContainerMetadata({ venue: normalizedVenue, appTag }),
    },
  ];
  const options = commentOptionsOperation({
    author,
    permlink,
    beneficiaries: beneficiaryComposition.beneficiaries,
  });
  const operations = Object.freeze([comment, options]);
  const fingerprint = fingerprintOperations(operations);

  return Object.freeze({
    action: 'threads-container-root',
    account: author,
    authority: 'Posting',
    operations,
    fingerprint,
    summary: Object.freeze({
      kind: 'Threads container root',
      author,
      permlink,
      venue: normalizedVenue.id,
      beneficiaryPolicy: '100% of author reward to venue official account',
      beneficiaryAccount: normalizedVenue.hive.officialAccount,
      beneficiaryWeight: MAX_BENEFICIARY_WEIGHT,
      recurrentTransfer: false,
    }),
    review: Object.freeze({
      author,
      permlink,
      authority: 'Posting',
      operationCount: operations.length,
      beneficiaryComponents: beneficiaryComposition.components,
      beneficiaries: beneficiaryComposition.beneficiaries,
      totalBeneficiaryWeight: beneficiaryComposition.totalWeight,
      fingerprint,
    }),
  });
}

function parseLiquidAsset(value, symbol) {
  const pattern = new RegExp(`^(0|[1-9][0-9]*)\\.([0-9]{3}) ${symbol}$`);
  const match = pattern.exec(String(value || ''));
  if (!match) fail(`Current ${symbol} balance is invalid`);
  return Object.freeze({
    symbol,
    units: BigInt(`${match[1]}${match[2]}`),
    canonical: `${match[1]}.${match[2]} ${symbol}`,
  });
}


function directActiveAccountAuthorization({ accountRecord, signerAccount: signerValue }) {
  const signer = normalizeHiveAccount(signerValue, 'Active signer account');
  const authority = accountRecord?.active;
  const threshold = Number(authority?.weight_threshold);
  const accountAuths = Array.isArray(authority?.account_auths) ? authority.account_auths : [];
  if (!Number.isSafeInteger(threshold) || threshold < 1) {
    return Object.freeze({
      signer,
      authorized: false,
      threshold: null,
      weight: 0,
      reason: 'ACTIVE_AUTHORITY_UNAVAILABLE',
    });
  }
  const entry = accountAuths.find((candidate) => (
    Array.isArray(candidate) && String(candidate[0] || '').trim().toLowerCase() === signer
  ));
  const weight = Number(entry?.[1]);
  const normalizedWeight = Number.isSafeInteger(weight) && weight > 0 ? weight : 0;
  return Object.freeze({
    signer,
    authorized: normalizedWeight >= threshold,
    threshold,
    weight: normalizedWeight,
    reason: normalizedWeight >= threshold
      ? 'DIRECT_ACTIVE_ACCOUNT_AUTH_SATISFIES_THRESHOLD'
      : 'DIRECT_ACTIVE_ACCOUNT_AUTH_DOES_NOT_SATISFY_THRESHOLD',
  });
}

function inspectThreadsFunds({ venue, accountRecord, viewerAccount }) {
  const normalizedVenue = normalizeVenue(venue);
  const source = normalizedVenue.hive.threadsContainerAccount;
  const destination = normalizedVenue.hive.officialAccount;
  if (!accountRecord || String(accountRecord.name || '').toLowerCase() !== source) {
    fail('Current Threads account balances are unavailable');
  }
  const hive = parseLiquidAsset(accountRecord.balance ?? '0.000 HIVE', 'HIVE');
  const hbd = parseLiquidAsset(accountRecord.hbd_balance ?? '0.000 HBD', 'HBD');
  const hasFunds = hive.units > 0n || hbd.units > 0n;
  const viewer = viewerAccount ? normalizeHiveAccount(viewerAccount, 'Viewer account') : null;
  const merchantViewer = viewer === destination;
  const activeAuthorization = directActiveAccountAuthorization({
    accountRecord,
    signerAccount: destination,
  });
  const alertVisible = Boolean(hasFunds && merchantViewer);

  return Object.freeze({
    source,
    destination,
    liquidHive: hive.canonical,
    liquidHbd: hbd.canonical,
    hasFunds,
    alertVisible,
    activeAuthorization,
    policy: THREADS_FUNDS_POLICY,
    claimButton: alertVisible
      ? Object.freeze({
          label: 'Claim funds',
          action: 'threads-funds-claim',
          authority: 'Active',
          operationAccount: source,
          signerAccount: destination,
          enabled: activeAuthorization.authorized,
          automatic: false,
        })
      : null,
  });
}

function buildThreadsFundsClaim({ venue, accountRecord, signerAccount: signerValue }) {
  const normalizedVenue = normalizeVenue(venue);
  const source = normalizedVenue.hive.threadsContainerAccount;
  const destination = normalizedVenue.hive.officialAccount;
  const signer = normalizeHiveAccount(signerValue ?? destination, 'Claim signer account');
  if (signer !== destination) {
    const error = new Error('Only the venue merchant account may sign a Threads funds claim');
    error.name = 'AuthorizationError';
    error.code = 'THREADS_FUNDS_MERCHANT_SIGNER_REQUIRED';
    throw error;
  }
  const state = inspectThreadsFunds({
    venue: normalizedVenue,
    accountRecord,
    viewerAccount: signer,
  });
  if (!state.hasFunds) {
    const error = new Error('There are no liquid Threads funds to claim');
    error.name = 'ConflictError';
    error.code = 'NO_THREADS_FUNDS_TO_CLAIM';
    throw error;
  }
  if (!state.activeAuthorization.authorized) {
    const error = new Error(
      'The venue merchant is not currently authorized to move funds from the Threads account',
    );
    error.name = 'AuthorizationError';
    error.code = 'THREADS_ACTIVE_AUTH_REQUIRED';
    throw error;
  }

  const memo = `Hive-Venues manual Threads funds claim for ${normalizedVenue.id}`;
  const operations = [];
  if (state.liquidHive !== '0.000 HIVE') {
    operations.push(['transfer', {
      from: source,
      to: destination,
      amount: state.liquidHive,
      memo,
    }]);
  }
  if (state.liquidHbd !== '0.000 HBD') {
    operations.push(['transfer', {
      from: source,
      to: destination,
      amount: state.liquidHbd,
      memo,
    }]);
  }
  const frozenOperations = Object.freeze(operations);
  const fingerprint = fingerprintOperations(frozenOperations);
  return Object.freeze({
    action: 'threads-funds-claim',
    account: source,
    signer,
    authority: 'Active',
    operations: frozenOperations,
    fingerprint,
    summary: Object.freeze({
      kind: 'Manual Threads funds claim',
      from: source,
      to: destination,
      signer,
      signerAuthorization: state.activeAuthorization.reason,
      liquidHive: state.liquidHive,
      liquidHbd: state.liquidHbd,
      manualOnly: true,
      recurrentTransfer: false,
      automaticSweep: false,
    }),
    review: Object.freeze({
      from: source,
      to: destination,
      signer,
      authority: 'Active',
      operationAccount: source,
      requiredKeychainAccount: signer,
      activeAuthorityThreshold: state.activeAuthorization.threshold,
      activeAuthorityWeight: state.activeAuthorization.weight,
      operationCount: frozenOperations.length,
      amounts: Object.freeze(
        frozenOperations.map(([, operation]) => operation.amount),
      ),
      fingerprint,
      confirmationRequired: true,
    }),
  });
}

function measureThreadsDiscussion({ container, rawDiscussion, durationMs, nowMs = Date.now() }) {
  if (!container || typeof container !== 'object') fail('Threads container is required');
  const entries = Array.isArray(rawDiscussion)
    ? rawDiscussion
    : Object.values(safeObject(rawDiscussion));
  const childCount = Math.max(
    0,
    Number(container.children || container.replyCount || container.stats?.children || 0) || Math.max(0, entries.length - 1),
  );
  const createdText = String(container.created || '').trim();
  const normalizedCreated = createdText && !/(?:Z|[+-]\d{2}:\d{2})$/i.test(createdText)
    ? `${createdText}Z`
    : createdText;
  const createdMs = Date.parse(normalizedCreated);
  const ageMs = Number.isFinite(createdMs) ? Math.max(0, nowMs - createdMs) : null;
  const serializedBytes = Buffer.byteLength(JSON.stringify(rawDiscussion ?? {}), 'utf8');
  const latency = Number(durationMs);
  return Object.freeze({
    author: String(container.author || ''),
    permlink: String(container.permlink || ''),
    childCount,
    serializedDiscussionBytes: serializedBytes,
    discussionLatencyMs: Number.isFinite(latency) && latency >= 0 ? latency : null,
    containerAgeMs: ageMs,
    measuredAt: new Date(nowMs).toISOString(),
  });
}

module.exports = {
  DEFAULT_MAX_ACCEPTED_PAYOUT,
  MAX_BENEFICIARY_WEIGHT,
  THREADS_ACCOUNT_POST_SCAN_LIMIT,
  THREADS_CONTAINER_KIND,
  THREADS_CONTAINER_VERSION,
  THREADS_FUNDS_POLICY,
  buildThreadsContainerMetadata,
  buildThreadsContainerRoot,
  buildThreadsFundsClaim,
  commentOptionsOperation,
  composeBeneficiaries,
  composeUserContentBeneficiaries,
  directActiveAccountAuthorization,
  fingerprintOperations,
  inspectThreadsFunds,
  measureThreadsDiscussion,
  readThreadsContainerMarker,
  selectThreadsContainer,
};
