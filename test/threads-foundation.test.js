'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  THREADS_FUNDS_POLICY,
  buildThreadsContainerMetadata,
  buildThreadsContainerRoot,
  buildThreadsFundsClaim,
  composeUserContentBeneficiaries,
  directActiveAccountAuthorization,
  fingerprintOperations,
  inspectThreadsFunds,
  measureThreadsDiscussion,
  readThreadsContainerMarker,
  selectThreadsContainer,
} = require('../src/hive/threads-foundation');

const venue = Object.freeze({
  id: 'fourth-street-bar-reno',
  hive: Object.freeze({
    communityId: 'hive-108590',
    officialAccount: 'fourthstreetbar',
    threadsContainerAccount: 'fourthst.threads',
  }),
});

function threadsAccountRecord({
  hive = '1.250 HIVE',
  hbd = '0.500 HBD',
  threshold = 1,
  merchantWeight = 1,
} = {}) {
  return {
    name: 'fourthst.threads',
    balance: hive,
    hbd_balance: hbd,
    active: {
      weight_threshold: threshold,
      account_auths: merchantWeight > 0 ? [['fourthstreetbar', merchantWeight]] : [],
      key_auths: [],
    },
  };
}

test('marks Threads roots with exact venue identity and reads the marker safely', () => {
  const encoded = buildThreadsContainerMetadata({ venue, appTag: 'hive-venues/0.1.0' });
  assert.deepEqual(JSON.parse(encoded).hive_venues, {
    kind: 'threads-container',
    version: 1,
    venue: 'fourth-street-bar-reno',
  });
  assert.deepEqual(readThreadsContainerMarker(encoded), {
    kind: 'threads-container',
    version: 1,
    venue: 'fourth-street-bar-reno',
  });
  assert.equal(readThreadsContainerMarker('{not json'), null);
});

test('marked container wins over newer unrelated roots and legacy fallback is explicit', () => {
  const marked = {
    author: 'fourthst.threads',
    permlink: 'threads-marked',
    parent_author: '',
    json_metadata: buildThreadsContainerMetadata({ venue, appTag: 'hive-venues/0.1.0' }),
  };
  const unrelated = {
    author: 'fourthst.threads',
    permlink: 'unrelated-newer-root',
    parent_author: '',
    json_metadata: '{}',
  };
  const selected = selectThreadsContainer([unrelated, marked], {
    account: 'fourthst.threads',
    venueId: venue.id,
  });
  assert.equal(selected.item.permlink, 'threads-marked');
  assert.equal(selected.legacyFallbackUsed, false);

  const legacy = selectThreadsContainer([unrelated], {
    account: 'fourthst.threads',
    venueId: venue.id,
  });
  assert.equal(legacy.item.permlink, 'unrelated-newer-root');
  assert.equal(legacy.legacyFallbackUsed, true);
  assert.equal(selectThreadsContainer([unrelated], {
    account: 'fourthst.threads',
    venueId: venue.id,
    allowLegacyFallback: false,
  }), null);
});

test('legacy fallback never selects a valid marker owned by another venue', () => {
  const foreignMarked = {
    author: 'fourthst.threads',
    permlink: 'foreign-marked',
    parent_author: '',
    json_metadata: buildThreadsContainerMetadata({
      venue: { ...venue, id: 'another-venue' },
      appTag: 'hive-venues/0.1.0',
    }),
  };
  const legacy = {
    author: 'fourthst.threads',
    permlink: 'legacy-unmarked',
    parent_author: '',
    json_metadata: '{}',
  };

  const selected = selectThreadsContainer([foreignMarked, legacy], {
    account: 'fourthst.threads',
    venueId: venue.id,
    allowLegacyFallback: true,
  });
  assert.equal(selected.item.permlink, 'legacy-unmarked');
  assert.equal(selected.legacyFallbackUsed, true);

  assert.equal(selectThreadsContainer([foreignMarked], {
    account: 'fourthst.threads',
    venueId: venue.id,
    allowLegacyFallback: true,
  }), null);
});

test('machine root routes 100 percent of author reward to official venue account', () => {
  const envelope = buildThreadsContainerRoot({
    venue,
    appTag: 'hive-venues/0.1.0',
    permlink: 'threads-2026-09-01',
  });
  assert.equal(envelope.authority, 'Posting');
  assert.equal(envelope.operations.length, 2);
  assert.equal(envelope.operations[0][0], 'comment');
  assert.deepEqual(envelope.operations[1], [
    'comment_options',
    {
      author: 'fourthst.threads',
      permlink: 'threads-2026-09-01',
      max_accepted_payout: '1000000.000 HBD',
      percent_hbd: 10000,
      allow_votes: true,
      allow_curation_rewards: true,
      extensions: [[0, { beneficiaries: [{ account: 'fourthstreetbar', weight: 10000 }] }]],
    },
  ]);
  assert.equal(envelope.review.totalBeneficiaryWeight, 10000);
  assert.equal(envelope.summary.recurrentTransfer, false);
  assert.equal(envelope.fingerprint, fingerprintOperations(envelope.operations));
});

test('user content beneficiary composition stays off by default and voluntary donation is explicit', () => {
  assert.deepEqual(composeUserContentBeneficiaries(), {
    components: [],
    beneficiaries: [],
    totalWeight: 0,
  });
  const composed = composeUserContentBeneficiaries({
    venuePolicy: { enabled: true, account: 'fourthstreetbar', weight: 500 },
    creatorDonation: { checked: true, account: 'hivevenues', weight: 250 },
  });
  assert.deepEqual(composed.beneficiaries, [
    { account: 'fourthstreetbar', weight: 500 },
    { account: 'hivevenues', weight: 250 },
  ]);
  assert.equal(composed.totalWeight, 750);
});

test('merchant sees a Claim funds button only when the Threads account has liquid funds', () => {
  const funded = inspectThreadsFunds({
    venue,
    viewerAccount: 'fourthstreetbar',
    accountRecord: threadsAccountRecord(),
  });
  assert.equal(funded.alertVisible, true);
  assert.deepEqual(funded.claimButton, {
    label: 'Claim funds',
    action: 'threads-funds-claim',
    authority: 'Active',
    operationAccount: 'fourthst.threads',
    signerAccount: 'fourthstreetbar',
    enabled: true,
    automatic: false,
  });
  assert.equal(funded.activeAuthorization.reason, 'DIRECT_ACTIVE_ACCOUNT_AUTH_SATISFIES_THRESHOLD');

  const outsider = inspectThreadsFunds({
    venue,
    viewerAccount: 'alice',
    accountRecord: threadsAccountRecord(),
  });
  assert.equal(outsider.alertVisible, false);
  assert.equal(outsider.claimButton, null);

  const empty = inspectThreadsFunds({
    venue,
    viewerAccount: 'fourthstreetbar',
    accountRecord: threadsAccountRecord({ hive: '0.000 HIVE', hbd: '0.000 HBD' }),
  });
  assert.equal(empty.alertVisible, false);
  assert.equal(empty.claimButton, null);
});

test('merchant alert remains visible but Claim funds fails closed when Active account authorization is insufficient', () => {
  const state = inspectThreadsFunds({
    venue,
    viewerAccount: 'fourthstreetbar',
    accountRecord: threadsAccountRecord({ threshold: 2, merchantWeight: 1 }),
  });
  assert.equal(state.alertVisible, true);
  assert.equal(state.claimButton.enabled, false);
  assert.equal(state.activeAuthorization.authorized, false);
  assert.equal(state.activeAuthorization.threshold, 2);
  assert.equal(state.activeAuthorization.weight, 1);
});

test('direct Active account authorization requires the merchant weight to satisfy the Threads threshold', () => {
  assert.deepEqual(
    directActiveAccountAuthorization({
      accountRecord: threadsAccountRecord({ threshold: 2, merchantWeight: 2 }),
      signerAccount: 'fourthstreetbar',
    }),
    {
      signer: 'fourthstreetbar',
      authorized: true,
      threshold: 2,
      weight: 2,
      reason: 'DIRECT_ACTIVE_ACCOUNT_AUTH_SATISFIES_THRESHOLD',
    },
  );
  assert.equal(
    directActiveAccountAuthorization({
      accountRecord: threadsAccountRecord({ threshold: 2, merchantWeight: 1 }),
      signerAccount: 'fourthstreetbar',
    }).authorized,
    false,
  );
});

test('Claim funds is a one-time Active Keychain transfer of current liquid balances only', () => {
  const envelope = buildThreadsFundsClaim({
    venue,
    accountRecord: threadsAccountRecord(),
    signerAccount: 'fourthstreetbar',
  });
  assert.equal(envelope.authority, 'Active');
  assert.equal(envelope.signer, 'fourthstreetbar');
  assert.deepEqual(envelope.operations, [
    ['transfer', {
      from: 'fourthst.threads',
      to: 'fourthstreetbar',
      amount: '1.250 HIVE',
      memo: 'Hive-Venues manual Threads funds claim for fourth-street-bar-reno',
    }],
    ['transfer', {
      from: 'fourthst.threads',
      to: 'fourthstreetbar',
      amount: '0.500 HBD',
      memo: 'Hive-Venues manual Threads funds claim for fourth-street-bar-reno',
    }],
  ]);
  assert.equal(envelope.summary.manualOnly, true);
  assert.equal(envelope.summary.recurrentTransfer, false);
  assert.equal(envelope.summary.automaticSweep, false);
  assert.equal(envelope.review.requiredKeychainAccount, 'fourthstreetbar');
  assert.equal(envelope.review.operationAccount, 'fourthst.threads');
  assert.equal(envelope.review.activeAuthorityThreshold, 1);
  assert.equal(envelope.review.activeAuthorityWeight, 1);
  assert.equal(envelope.review.confirmationRequired, true);
  assert.equal(envelope.fingerprint, fingerprintOperations(envelope.operations));
  assert.deepEqual(THREADS_FUNDS_POLICY, {
    recurrentTransfer: false,
    automaticSweep: false,
    manualClaim: true,
    claimAuthority: 'Active',
    claimSigner: 'venue-official-account',
    sourceAuthority: 'threads-active-account-auth',
  });
});

test('Claim funds refuses an empty Threads account', () => {
  assert.throws(() => buildThreadsFundsClaim({
    venue,
    accountRecord: threadsAccountRecord({ hive: '0.000 HIVE', hbd: '0.000 HBD' }),
    signerAccount: 'fourthstreetbar',
  }), (error) => error.code === 'NO_THREADS_FUNDS_TO_CLAIM');
});

test('Claim funds refuses to prepare unless the merchant directly satisfies Threads Active authority', () => {
  assert.throws(() => buildThreadsFundsClaim({
    venue,
    accountRecord: threadsAccountRecord({ threshold: 2, merchantWeight: 1 }),
    signerAccount: 'fourthstreetbar',
  }), (error) => error.code === 'THREADS_ACTIVE_AUTH_REQUIRED');

  assert.throws(() => buildThreadsFundsClaim({
    venue,
    accountRecord: threadsAccountRecord(),
    signerAccount: 'alice',
  }), (error) => error.code === 'THREADS_FUNDS_MERCHANT_SIGNER_REQUIRED');
});

test('discussion metrics capture the evidence needed for later rotation adjudication', () => {
  const nowMs = Date.parse('2026-09-01T12:00:10Z');
  const container = {
    author: 'fourthst.threads',
    permlink: 'threads-active',
    created: '2026-09-01T12:00:00',
    children: 2,
  };
  const rawDiscussion = {
    'fourthst.threads/threads-active': container,
    'alice/thread-one': { author: 'alice', permlink: 'thread-one' },
    'bob/thread-two': { author: 'bob', permlink: 'thread-two' },
  };
  const metrics = measureThreadsDiscussion({ container, rawDiscussion, durationMs: 37, nowMs });
  assert.equal(metrics.childCount, 2);
  assert.equal(metrics.discussionLatencyMs, 37);
  assert.equal(metrics.containerAgeMs, 10000);
  assert.ok(metrics.serializedDiscussionBytes > 0);
});
