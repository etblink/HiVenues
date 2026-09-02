'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  assessThreadsServiceActivationReadiness,
} = require('../src/social/threads-service-activation-readiness');

const PUBLIC_KEY = 'STM73MTSWz2Nks4Eaf8G8F7Nr6jbHorZSM774HFmtrdEuahXqi1ff';

test('optional cleanup reports Threads account identity mismatch explicitly', () => {
  const report = assessThreadsServiceActivationReadiness({
    venue: {
      officialAccount: 'fourthstreetbar',
      threadsContainerAccount: 'fourthst.threads',
    },
    threadsAccount: {
      name: 'other.threads',
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
  });

  assert.equal(report.optionalCleanupReady, false);
  assert.equal(report.optionalCleanup.activeAuthorityValid, true);
  assert.equal(report.optionalCleanup.merchantDirectActiveAuthorization, true);
  assert.deepEqual(report.optionalCleanup.blockers, ['THREADS_ACCOUNT_MATCH']);
});
