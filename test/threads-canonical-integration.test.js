'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { HiveReadService } = require('../src/hive/read-service');
const { buildSocialOperation } = require('../src/hive/social-operations');
const { createVenueContext } = require('../src/venue/context');
const { threadsFundsAppError } = require('../src/routes/threads-operator');

function venueInput(overrides = {}) {
  return {
    id: 'lantern-room-fixture',
    displayName: 'The Lantern Room',
    business: {
      address: '1 Example Way, Testville, NV 89000',
      phone: '(555) 010-0100',
      hours: 'Daily, 12:00 p.m.–2:00 a.m.',
      websiteUrl: 'https://example.test/',
      mapUrl: 'https://example.test/map',
    },
    hive: {
      communityId: 'hive-654321',
      officialAccount: 'lanternroom',
      threadsContainerAccount: 'lantern.threads',
      paymentMerchantAccounts: ['lanternroom'],
      ...overrides,
    },
  };
}

function socialConfig(beneficiaryPolicy) {
  return {
    hive: {
      appTag: 'hive-venues/0.1.0',
      communityId: 'hive-654321',
      officialAccount: 'lanternroom',
      threadsContainerAccount: 'lantern.threads',
      beneficiaryPolicy,
    },
  };
}

test('venue beneficiary policy is default-off and enabled policy requires an explicit weight', () => {
  const venue = createVenueContext(venueInput());
  assert.equal(venue.hive.beneficiaryPolicy, undefined);
  assert.throws(
    () => createVenueContext(venueInput({
      beneficiaryPolicy: {
        venueUserPost: { enabled: false, weight: null },
        creatorDonation: { enabled: true, weight: null },
      },
    })),
    /explicit weight/,
  );
});

test('venue admission rejects enabled beneficiary weights above 100 percent combined', () => {
  assert.throws(
    () => createVenueContext(venueInput({
      beneficiaryPolicy: {
        venueUserPost: { enabled: true, weight: 6000 },
        creatorDonation: { enabled: true, weight: 5000 },
      },
    })),
    /Combined enabled beneficiary policy weights cannot exceed 10000/,
  );
});

test('explicit creator donation appends one reviewed comment_options operation and stays absent when unchecked', () => {
  const config = socialConfig({
    venueUserPost: { enabled: false, weight: null },
    creatorDonation: { enabled: true, weight: 125 },
  });
  const common = {
    account: 'alice',
    config,
    threadContainer: { author: 'lantern.threads', permlink: 'threads-20260901' },
  };
  const unchecked = buildSocialOperation('thread', {
    ...common,
    payload: { body: 'Hello', permlink: 'hello-thread', creatorDonation: false },
  });
  assert.equal(unchecked.operations.length, 1);

  const checked = buildSocialOperation('thread', {
    ...common,
    payload: { body: 'Hello', permlink: 'hello-thread-two', creatorDonation: true },
  });
  assert.equal(checked.operations.length, 2);
  assert.equal(checked.operations[1][0], 'comment_options');
  assert.deepEqual(checked.operations[1][1].extensions, [[0, {
    beneficiaries: [{ account: 'lanternroom', weight: 125 }],
  }]]);
});

test('venue-aware resolver prefers a marked container over a newer unrelated machine root', async () => {
  const calls = [];
  const service = new HiveReadService({
    async call(api, method, params) {
      calls.push({ api, method, params });
      if (method !== 'get_account_posts') throw new Error('unexpected RPC call');
      return [
        {
          author: 'lantern.threads', permlink: 'unrelated', parent_author: '',
          json_metadata: '{}', active_votes: [],
        },
        {
          author: 'lantern.threads', permlink: 'threads-marked', parent_author: '',
          json_metadata: JSON.stringify({
            hive_venues: { kind: 'threads-container', version: 1, venue: 'lantern-room-fixture' },
          }),
          active_votes: [],
        },
      ];
    },
  });
  const container = await service.getLatestThreadContainer('lantern.threads', {
    venueId: 'lantern-room-fixture',
    allowLegacyFallback: true,
  });
  assert.equal(container.permlink, 'threads-marked');
  assert.equal(container.legacyFallbackUsed, false);
  assert.equal(calls[0].params.limit, 10);
});


test('Threads funds foundation failures become canonical exposed HTTP errors', () => {
  const empty = new Error('There are no liquid Threads funds to claim');
  empty.code = 'NO_THREADS_FUNDS_TO_CLAIM';
  const emptyMapped = threadsFundsAppError(empty);
  assert.equal(emptyMapped.statusCode, 409);
  assert.equal(emptyMapped.code, 'NO_THREADS_FUNDS_TO_CLAIM');
  assert.equal(emptyMapped.expose, true);

  const unauthorized = new Error('Merchant authority is insufficient');
  unauthorized.code = 'THREADS_ACTIVE_AUTH_REQUIRED';
  const unauthorizedMapped = threadsFundsAppError(unauthorized);
  assert.equal(unauthorizedMapped.statusCode, 403);
  assert.equal(unauthorizedMapped.code, 'THREADS_ACTIVE_AUTH_REQUIRED');
  assert.equal(unauthorizedMapped.expose, true);

  const invalid = new Error('Current HIVE balance is invalid');
  invalid.name = 'ValidationError';
  const invalidMapped = threadsFundsAppError(invalid);
  assert.equal(invalidMapped.statusCode, 400);
  assert.equal(invalidMapped.code, 'VALIDATION_ERROR');
});
test('explicit beneficiary policy remains security-privileged and unknown descendants fail closed', () => {
  const { OWNERSHIP, ownershipForPath } = require('../src/venue/authoring');

  for (const pointer of [
    '/venueContext/hive/beneficiaryPolicy',
    '/venueContext/hive/beneficiaryPolicy/venueUserPost',
    '/venueContext/hive/beneficiaryPolicy/venueUserPost/enabled',
    '/venueContext/hive/beneficiaryPolicy/venueUserPost/weight',
    '/venueContext/hive/beneficiaryPolicy/creatorDonation',
    '/venueContext/hive/beneficiaryPolicy/creatorDonation/enabled',
    '/venueContext/hive/beneficiaryPolicy/creatorDonation/weight',
  ]) {
    assert.equal(
      ownershipForPath(pointer),
      OWNERSHIP.SECURITY_PRIVILEGED,
    );
  }

  assert.equal(
    ownershipForPath('/venueContext/hive/beneficiaryPolicy/unrecognized'),
    null,
  );
});

test('Threads funds claim client is registered as a page-scoped versioned asset', () => {
  const { PAGE_SCOPED_ASSETS } = require('../src/release/static-assets');

  assert.equal(
    PAGE_SCOPED_ASSETS.includes('/js/threads-funds-claim.js'),
    true,
  );
});
