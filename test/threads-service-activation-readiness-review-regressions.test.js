'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  assessThreadsServiceActivationReadiness,
} = require('../src/social/threads-service-activation-readiness');

const PUBLIC_KEY = 'STM73MTSWz2Nks4Eaf8G8F7Nr6jbHorZSM774HFmtrdEuahXqi1ff';
const OTHER_PUBLIC_KEY = 'STM5UXjwf1qXw1cAF6GLT4w5RjH48Rn8Y6xLPZwwVDWh3D3aap86N';

function snapshot(overrides = {}) {
  return {
    venue: {
      officialAccount: 'fourthstreetbar',
      threadsContainerAccount: 'fourthst.threads',
    },
    threadsAccount: {
      name: 'fourthst.threads',
      posting: {
        weight_threshold: 1,
        account_auths: [],
        key_auths: [[PUBLIC_KEY, 1]],
      },
      active: {
        weight_threshold: 1,
        account_auths: [['fourthstreetbar', 1]],
        key_auths: [],
      },
    },
    intendedPostingPublicKey: PUBLIC_KEY,
    serverCredentialClasses: ['posting'],
    configuredPostingPublicKey: PUBLIC_KEY,
    ...overrides,
  };
}

test('preparationReady requires the configured Posting credential identity', () => {
  const missing = assessThreadsServiceActivationReadiness(snapshot({
    serverCredentialClasses: [],
    configuredPostingPublicKey: null,
  }));
  assert.equal(missing.authorityReady, true);
  assert.equal(missing.preparationReady, false);

  const stale = assessThreadsServiceActivationReadiness(snapshot({
    configuredPostingPublicKey: OTHER_PUBLIC_KEY,
  }));
  assert.equal(stale.authorityReady, true);
  assert.equal(stale.credentialIdentityReady, false);
  assert.equal(stale.preparationReady, false);
});

test('duplicate Posting key entries invalidate the authority instead of summing weights', () => {
  const input = snapshot();
  input.threadsAccount.posting = {
    weight_threshold: 2,
    account_auths: [],
    key_auths: [[PUBLIC_KEY, 1], [PUBLIC_KEY, 1]],
  };
  const report = assessThreadsServiceActivationReadiness(input);
  assert.equal(report.authorityReady, false);
  assert.equal(report.preparationReady, false);
  assert.equal(report.nextStage, 'REPAIR_IDENTITY_OR_AUTHORITY_INPUT');
  assert.equal(report.blockers.includes('THREADS_POSTING_AUTHORITY_VALID'), true);
  assert.deepEqual(report.proposedAuthorityChanges, []);
});

test('duplicate merchant Active account entries invalidate the authority instead of summing weights', () => {
  const input = snapshot();
  input.threadsAccount.active = {
    weight_threshold: 2,
    account_auths: [['fourthstreetbar', 1], ['fourthstreetbar', 1]],
    key_auths: [],
  };
  const report = assessThreadsServiceActivationReadiness(input);
  assert.equal(report.authorityReady, false);
  assert.equal(report.preparationReady, false);
  assert.equal(report.nextStage, 'REPAIR_IDENTITY_OR_AUTHORITY_INPUT');
  assert.equal(report.blockers.includes('THREADS_ACTIVE_AUTHORITY_VALID'), true);
  assert.deepEqual(report.proposedAuthorityChanges, []);
});

test('authority proposal never emits a single auth weight above Hive uint16 maximum', () => {
  const input = snapshot();
  input.threadsAccount.posting = {
    weight_threshold: 70000,
    account_auths: [['helper.account', 5000]],
    key_auths: [[PUBLIC_KEY, 65535]],
  };
  input.threadsAccount.active = {
    weight_threshold: 70000,
    account_auths: [['fourthstreetbar', 65535], ['helper.account', 5000]],
    key_auths: [],
  };
  const report = assessThreadsServiceActivationReadiness(input);
  assert.equal(report.authorityReady, false);
  assert.deepEqual(report.proposedAuthorityChanges, [
    {
      authority: 'posting',
      action: 'RESTRUCTURE_AUTHORITY_FOR_DIRECT_KEY_AUTH',
      publicKey: PUBLIC_KEY,
      currentThreshold: 70000,
      maximumSingleWeight: 65535,
    },
    {
      authority: 'active',
      action: 'RESTRUCTURE_AUTHORITY_FOR_DIRECT_ACCOUNT_AUTH',
      account: 'fourthstreetbar',
      currentThreshold: 70000,
      maximumSingleWeight: 65535,
    },
  ]);
});

test('preflight rejects Hive account names that violate protocol label grammar', () => {
  assert.throws(
    () => assessThreadsServiceActivationReadiness(snapshot({
      venue: {
        officialAccount: 'abc-',
        threadsContainerAccount: 'fourthst.threads',
      },
    })),
    /valid Hive account/,
  );

  const input = snapshot();
  input.threadsAccount.active.account_auths = [['abc-', 1]];
  const report = assessThreadsServiceActivationReadiness(input);
  assert.equal(report.authorityReady, false);
  assert.equal(report.blockers.includes('THREADS_ACTIVE_AUTHORITY_VALID'), true);
  assert.deepEqual(report.proposedAuthorityChanges, []);
});
