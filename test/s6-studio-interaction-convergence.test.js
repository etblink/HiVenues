'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const request = require('supertest');
const { URLSearchParams } = require('node:url');

const {
  createReferenceV2AuthoringStudioFixture,
} = require('./support/v2-authoring-studio-fixture');

const CASES = Object.freeze([
  {
    referenceId: 'fourth-street',
    nodeId: 'page:home',
    fieldId: 'title',
    value: 'Home and neighborhood updates',
  },
  {
    referenceId: 'juniper',
    nodeId: 'component:home-equipment-status',
    fieldId: 'heading',
    value: 'Equipment availability today',
  },
  {
    referenceId: 'restaurant',
    nodeId: 'component:home-gallery',
    fieldId: 'heading',
    value: 'An evening by the water',
  },
  {
    referenceId: 'live-music',
    nodeId: 'component:home-shows',
    fieldId: 'heading',
    value: 'This week at Northline',
  },
]);

function selectionPath(spec, viewport = 'desktop') {
  const query = new URLSearchParams({
    nodeId: spec.nodeId,
    fieldId: spec.fieldId,
    viewport,
  });
  return `/studio-authoring?${query.toString()}`;
}

test('S6.2 converges selection and editing context without weakening the draft transaction boundary', async () => {
  for (const spec of CASES) {
    const fixture = createReferenceV2AuthoringStudioFixture(spec.referenceId);
    const openingDigest = fixture.session().draftDigest;

    let response = await request(fixture.app).get(selectionPath(spec));
    assert.equal(response.status, 200, spec.referenceId);
    assert.match(response.text, /data-s6-edit-selection="true"/, spec.referenceId);
    assert.match(
      response.text,
      /<h2 id="authoring-inspector-heading">Edit selection<\/h2>/,
      spec.referenceId,
    );
    assert.match(response.text, /<p class="eyebrow">Selection<\/p>/, spec.referenceId);
    assert.match(response.text, /<p class="eyebrow">Editing field<\/p>/, spec.referenceId);
    assert.match(response.text, /Preview change/, spec.referenceId);
    assert.doesNotMatch(response.text, />Inspector<\/h2>/, spec.referenceId);
    assert.doesNotMatch(response.text, /<p class="eyebrow">Selected context<\/p>/, spec.referenceId);
    assert.doesNotMatch(response.text, /<p class="eyebrow">Selected field<\/p>/, spec.referenceId);

    response = await request(fixture.app)
      .post('/studio-authoring/propose')
      .type('form')
      .send({
        nodeId: spec.nodeId,
        fieldId: spec.fieldId,
        viewport: 'desktop',
        expectedDraftDigest: openingDigest,
        value: spec.value,
      });

    assert.equal(response.status, 303, spec.referenceId);
    assert.equal(fixture.session().draftDigest, openingDigest, spec.referenceId);
    assert.ok(fixture.proposal(), spec.referenceId);
    const previewDigest = fixture.proposal().afterDigest;
    assert.notEqual(previewDigest, openingDigest, spec.referenceId);

    response = await request(fixture.app).get(response.headers.location);
    assert.equal(response.status, 200, spec.referenceId);
    assert.match(response.text, /<h2 id="authoring-inspector-heading">Edit selection<\/h2>/, spec.referenceId);
    assert.match(response.text, /Preview — not applied/, spec.referenceId);
    assert.match(response.text, /Apply to draft/, spec.referenceId);
    assert.match(response.text, /Discard preview/, spec.referenceId);
    assert.match(response.text, new RegExp(`data-accepted-digest="${openingDigest}"`), spec.referenceId);
    assert.match(response.text, new RegExp(`data-preview-digest="${previewDigest}"`), spec.referenceId);

    await request(fixture.app)
      .post('/studio-authoring/apply')
      .type('form')
      .send({
        nodeId: spec.nodeId,
        fieldId: spec.fieldId,
        viewport: 'desktop',
      })
      .expect(303);

    assert.equal(fixture.proposal(), null, spec.referenceId);
    assert.equal(fixture.session().draftDigest, previewDigest, spec.referenceId);
    assert.equal(fixture.session().historyIndex, 1, spec.referenceId);

    const diagnostics = fixture.diagnostics();
    assert.equal(diagnostics.proposals, 1, spec.referenceId);
    assert.equal(diagnostics.applies, 1, spec.referenceId);
    assert.equal(diagnostics.persistentWrites, 0, spec.referenceId);
    assert.equal(diagnostics.hiveRpcAttempts, 0, spec.referenceId);
    assert.equal(diagnostics.hiveWrites, 0, spec.referenceId);
  }
});
