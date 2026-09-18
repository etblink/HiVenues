'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { ProvisioningFileHiVenuesStore } = require('../src/product/provisioning-file-store');

test('Astra beta durable urgent: superseded live Release outranks stale working-version tokens', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-durable-stale-urgent-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const statePath = path.join(root, 'state.json');
  const mediaRoot = path.join(root, 'media');
  const store = new ProvisioningFileHiVenuesStore({ statePath, mediaRoot });
  const slug = 'northline-hall';

  const activity = store.publicSnapshot(slug).draft.activities[0];
  const reviewTokens = store.snapshot(slug);
  const proposed = store.proposeUrgent(slug, {
    kind: 'activity-status',
    activityId: activity.id,
    lifecycle: 'cancelled',
    statusNote: 'Durable stale-live ordering proof.',
  });
  assert.equal(proposed.ok, true);
  assert.equal(proposed.operation.baseReleaseId, store.publicSnapshot(slug).liveReleaseId);

  let current = store.snapshot(slug);
  const edited = store.editTagline(
    slug,
    'Competing full Release for durable stale-urgent proof.',
    current.revision,
    current.draftDigest
  );
  assert.equal(edited.ok, true);
  current = store.snapshot(slug);
  const competingRelease = store.createRelease(slug, current.revision, current.draftDigest);
  assert.equal(competingRelease.ok, true);
  const advancedLive = store.publicSnapshot(slug).liveReleaseId;
  assert.notEqual(advancedLive, proposed.operation.baseReleaseId);

  const stale = store.executeUrgent(
    slug,
    proposed.operation.id,
    proposed.operation.baseReleaseId,
    reviewTokens.revision,
    reviewTokens.draftDigest
  );
  assert.equal(stale.ok, false);
  assert.equal(stale.reason, 'STALE_LIVE_RELEASE');
  assert.equal(store.publicSnapshot(slug).liveReleaseId, advancedLive);
  assert.equal(store.publicSnapshot(slug).draft.activities.find((item) => item.id === activity.id).lifecycle, 'scheduled');

  const restarted = new ProvisioningFileHiVenuesStore({ statePath, mediaRoot });
  assert.equal(restarted.publicSnapshot(slug).liveReleaseId, advancedLive);
  assert.equal(restarted.publicSnapshot(slug).draft.activities.find((item) => item.id === activity.id).lifecycle, 'scheduled');
  assert.deepEqual(restarted.diagnostics().external, {
    hiveRpcAttempts: 0,
    hiveWrites: 0,
    providerWrites: 0,
    payments: 0,
    signingAttempts: 0,
    deployments: 0,
  });
});
