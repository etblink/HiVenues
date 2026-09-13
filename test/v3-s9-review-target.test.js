'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const {
  startV3S9ReviewTarget,
} = require('../scripts/support/v3-s9-review-target');

const EXTERNAL_EFFECT_KEYS = Object.freeze([
  'hiveRpcAttempts',
  'hiveWrites',
  'providerWrites',
  'payments',
  'signingAttempts',
  'mediaUploads',
  'reservationMutations',
  'ticketPurchases',
  'deployments',
]);

test('S9 review target exposes R1/R2/R3 direct browser entry points and cleans up without external effects', async () => {
  const target = await startV3S9ReviewTarget({ buildIdentity: 'test-build' });
  const workspaceRoot = target.workspaceRoot;
  try {
    assert.equal(target.manifest.buildIdentity, 'test-build');
    assert.equal(target.manifest.syntheticReviewTarget, true);
    assert.equal(target.manifest.externalEffects, false);
    assert.equal(target.manifest.references.length, 3);

    const health = await fetch(new URL('healthz', target.indexUrl));
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { ok: true, externalEffects: false });

    const manifestResponse = await fetch(new URL('manifest.json', target.indexUrl));
    assert.equal(manifestResponse.status, 200);
    const manifest = await manifestResponse.json();
    assert.deepEqual(manifest.references.map((reference) => reference.referenceId), [
      'migratedPhysical',
      'nativeCreator',
      'nativeRelease',
    ]);

    const indexResponse = await fetch(target.indexUrl);
    assert.equal(indexResponse.status, 200);
    const indexHtml = await indexResponse.text();
    assert.match(indexHtml, /HiVenues review target/);
    assert.match(indexHtml, /Open Studio/);
    assert.match(indexHtml, /Open generated Home/);
    assert.match(indexHtml, /Open representative Activity/);

    for (const reference of manifest.references) {
      for (const url of Object.values(reference.urls)) {
        const response = await fetch(url);
        assert.equal(response.status, 200, `${reference.referenceId}: ${url}`);
        assert.match(response.headers.get('content-type') || '', /text\/html/);
      }
    }

    assert.equal(fs.existsSync(workspaceRoot), true);
    for (const record of target.diagnostics()) {
      for (const key of EXTERNAL_EFFECT_KEYS) {
        assert.equal(record.diagnostics[key], 0, `${record.referenceId}: ${key}`);
      }
    }
  } finally {
    const diagnostics = await target.close();
    assert.equal(fs.existsSync(workspaceRoot), false);
    for (const record of diagnostics) {
      for (const key of EXTERNAL_EFFECT_KEYS) {
        assert.equal(record.diagnostics[key], 0, `${record.referenceId}: close ${key}`);
      }
    }
  }
});
