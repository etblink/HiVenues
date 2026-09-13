'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const request = require('supertest');

const {
  createReferenceV2AuthoringStudioFixture,
} = require('./support/v2-authoring-studio-fixture');

const REFERENCES = Object.freeze([
  'fourth-street',
  'juniper',
  'restaurant',
  'live-music',
]);

test('S6.1 Studio shell is operator-first across reference hosts while technical provenance remains available', async () => {
  for (const referenceId of REFERENCES) {
    const fixture = createReferenceV2AuthoringStudioFixture(referenceId);
    const response = await request(fixture.app).get('/studio-authoring');

    assert.equal(response.status, 200, referenceId);
    assert.match(response.text, /<p class="eyebrow">HiVenues Studio<\/p>/, referenceId);
    assert.match(response.text, /Page Structure<\/h2><span>Pages and sections<\/span>/, referenceId);
    assert.match(response.text, /Venue Canvas<\/h2><span>Live venue preview<\/span>/, referenceId);
    assert.doesNotMatch(response.text, /Page Structure<\/h2><span>Stable semantic IDs<\/span>/, referenceId);
    assert.doesNotMatch(response.text, /Venue Canvas<\/h2><span>Real v2 renderer<\/span>/, referenceId);

    assert.match(response.text, /<style data-s6-studio-shell="true">/, referenceId);
    assert.match(response.text, /<details class="technical-details"><summary>Technical details<\/summary>/, referenceId);
    assert.match(response.text, /Stable semantic IDs · Real v2 renderer · draft and Canvas digests/, referenceId);
    assert.match(response.text, /data-accepted-digest="[0-9a-f]{64}"/, referenceId);
    assert.match(response.text, /data-preview-digest="[0-9a-f]{64}"/, referenceId);
    assert.match(response.text, /<div class="digest-chip"><strong>Accepted<\/strong>/, referenceId);
    assert.match(response.text, /<div class="digest-chip"><strong>Canvas<\/strong>/, referenceId);

    assert.match(response.text, /Session draft · memory only/, referenceId);
    assert.match(response.text, /Preview change/, referenceId);
    assert.match(response.text, /Real v2 authoring preview/, referenceId);

    const diagnostics = fixture.diagnostics();
    assert.equal(diagnostics.persistentWrites, 0, referenceId);
    assert.equal(diagnostics.hiveRpcAttempts, 0, referenceId);
    assert.equal(diagnostics.hiveWrites, 0, referenceId);
  }
});
