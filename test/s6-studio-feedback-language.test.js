'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const request = require('supertest');

const {
  SAFE_V2_AUTHORING_STUDIO_ERROR,
} = require('../src/venue/v2/studio-app');
const {
  createReferenceV2AuthoringStudioFixture,
} = require('./support/v2-authoring-studio-fixture');

function assertSafeStudioRejection(response) {
  assert.equal(response.status, 400);
  assert.match(response.headers['content-type'] || '', /^text\/plain/);
  assert.equal(response.text, SAFE_V2_AUTHORING_STUDIO_ERROR);
  assert.doesNotMatch(response.text, /editable field/i);
  assert.doesNotMatch(response.text, /digest|workspace persistence|unsupported keys/i);
}

test('S6.3 uses action-neutral safe rejection guidance for field and non-field Studio actions', async () => {
  const fixture = createReferenceV2AuthoringStudioFixture('restaurant');
  const openingDigest = fixture.session().draftDigest;

  const staleField = await request(fixture.app)
    .post('/studio-authoring/propose')
    .type('form')
    .send({
      nodeId: 'component:home-gallery',
      fieldId: 'heading',
      viewport: 'desktop',
      expectedDraftDigest: '0'.repeat(64),
      value: 'Stale field edit',
    });

  assertSafeStudioRejection(staleField);
  assert.equal(fixture.session().draftDigest, openingDigest);
  assert.equal(fixture.proposal(), null);

  const unavailableSave = await request(fixture.app)
    .post('/studio-authoring/save-workspace')
    .type('form')
    .send({});

  assertSafeStudioRejection(unavailableSave);
  assert.equal(fixture.session().draftDigest, openingDigest);
  assert.equal(fixture.proposal(), null);
  assert.equal(fixture.diagnostics().persistentWrites, 0);
  assert.equal(fixture.diagnostics().hiveRpcAttempts, 0);
  assert.equal(fixture.diagnostics().hiveWrites, 0);
});
