'use strict';

const { URLSearchParams } = require('node:url');

const assert = require('node:assert/strict');
const test = require('node:test');
const request = require('supertest');

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

test('memory-only authoring Studio exposes one typed editable surface across all four references', async () => {
  for (const spec of CASES) {
    const fixture = createReferenceV2AuthoringStudioFixture(spec.referenceId);
    const response = await request(fixture.app).get(selectionPath(spec));

    assert.equal(response.status, 200, spec.referenceId);
    assert.match(response.text, /data-v2-authoring-studio="true"/, spec.referenceId);
    assert.match(response.text, /data-studio-persistent="false"/, spec.referenceId);
    assert.match(response.text, /data-studio-runtime-wired="false"/, spec.referenceId);
    assert.match(response.text, /Session draft · memory only/, spec.referenceId);
    assert.match(response.text, /Preview change/, spec.referenceId);
    assert.match(response.text, /name="expectedDraftDigest"/, spec.referenceId);
    assert.match(response.text, /Real v2 authoring preview/, spec.referenceId);

    const diagnostics = fixture.diagnostics();
    assert.equal(diagnostics.persistentWrites, 0, spec.referenceId);
    assert.equal(diagnostics.hiveRpcAttempts, 0, spec.referenceId);
    assert.equal(diagnostics.hiveWrites, 0, spec.referenceId);
  }
});

test('proposal preview does not change accepted draft; discard, apply, undo, and redo restore exact digests', async () => {
  const spec = CASES.find((item) => item.referenceId === 'restaurant');
  const fixture = createReferenceV2AuthoringStudioFixture(spec.referenceId);
  const openingDigest = fixture.session().draftDigest;

  let response = await request(fixture.app)
    .post('/studio-authoring/propose')
    .type('form')
    .send({
      nodeId: spec.nodeId,
      fieldId: spec.fieldId,
      viewport: 'desktop',
      expectedDraftDigest: openingDigest,
      value: spec.value,
    });

  assert.equal(response.status, 303);
  assert.equal(fixture.session().draftDigest, openingDigest);
  assert.ok(fixture.proposal());
  const previewDigest = fixture.proposal().afterDigest;
  assert.notEqual(previewDigest, openingDigest);

  response = await request(fixture.app).get(response.headers.location);
  assert.equal(response.status, 200);
  assert.match(response.text, /Preview — not applied/);
  assert.match(response.text, new RegExp(`data-accepted-digest="${openingDigest}"`));
  assert.match(response.text, new RegExp(`data-preview-digest="${previewDigest}"`));

  response = await request(fixture.app)
    .post('/studio-authoring/discard')
    .type('form')
    .send({
      nodeId: spec.nodeId,
      fieldId: spec.fieldId,
      viewport: 'desktop',
    });

  assert.equal(response.status, 303);
  assert.equal(fixture.proposal(), null);
  assert.equal(fixture.session().draftDigest, openingDigest);
  assert.equal(fixture.session().historyIndex, 0);

  await request(fixture.app)
    .post('/studio-authoring/propose')
    .type('form')
    .send({
      nodeId: spec.nodeId,
      fieldId: spec.fieldId,
      viewport: 'desktop',
      expectedDraftDigest: openingDigest,
      value: spec.value,
    })
    .expect(303);

  const appliedDigest = fixture.proposal().afterDigest;
  await request(fixture.app)
    .post('/studio-authoring/apply')
    .type('form')
    .send({
      nodeId: spec.nodeId,
      fieldId: spec.fieldId,
      viewport: 'desktop',
    })
    .expect(303);

  assert.equal(fixture.proposal(), null);
  assert.equal(fixture.session().draftDigest, appliedDigest);
  assert.equal(fixture.session().historyIndex, 1);
  assert.equal(fixture.session().canUndo, true);

  await request(fixture.app)
    .post('/studio-authoring/undo')
    .type('form')
    .send({
      nodeId: spec.nodeId,
      fieldId: spec.fieldId,
      viewport: 'desktop',
    })
    .expect(303);

  assert.equal(fixture.session().draftDigest, openingDigest);
  assert.equal(fixture.session().canRedo, true);

  await request(fixture.app)
    .post('/studio-authoring/redo')
    .type('form')
    .send({
      nodeId: spec.nodeId,
      fieldId: spec.fieldId,
      viewport: 'desktop',
    })
    .expect(303);

  assert.equal(fixture.session().draftDigest, appliedDigest);
  assert.equal(fixture.session().historyIndex, 1);

  const diagnostics = fixture.diagnostics();
  assert.equal(diagnostics.proposals, 2);
  assert.equal(diagnostics.discards, 1);
  assert.equal(diagnostics.applies, 1);
  assert.equal(diagnostics.undos, 1);
  assert.equal(diagnostics.redos, 1);
  assert.equal(diagnostics.persistentWrites, 0);
  assert.equal(diagnostics.hiveRpcAttempts, 0);
  assert.equal(diagnostics.hiveWrites, 0);
});

test('stale and unauthorized browser requests fail closed without changing session state', async () => {
  const fixture = createReferenceV2AuthoringStudioFixture('restaurant');
  const openingDigest = fixture.session().draftDigest;

  await request(fixture.app)
    .post('/studio-authoring/propose')
    .type('form')
    .send({
      nodeId: 'component:home-gallery',
      fieldId: 'heading',
      viewport: 'desktop',
      expectedDraftDigest: '0'.repeat(64),
      value: 'Stale',
    })
    .expect(400);

  assert.equal(fixture.session().draftDigest, openingDigest);
  assert.equal(fixture.proposal(), null);

  await request(fixture.app)
    .post('/studio-authoring/propose')
    .type('form')
    .send({
      nodeId: 'page:home',
      fieldId: 'slug',
      viewport: 'desktop',
      expectedDraftDigest: openingDigest,
      value: 'renamed-route',
    })
    .expect(400);

  assert.equal(fixture.session().draftDigest, openingDigest);
  assert.equal(fixture.proposal(), null);

  await request(fixture.app)
    .post('/studio-authoring/propose')
    .type('form')
    .send({
      nodeId: 'component:home-gallery',
      fieldId: 'heading',
      viewport: 'desktop',
      expectedDraftDigest: openingDigest,
      value: 'No path authority',
      sourcePointer: '/site/pages/0/components/0/content/heading',
    })
    .expect(400);

  assert.equal(fixture.session().draftDigest, openingDigest);
  assert.equal(fixture.proposal(), null);
  assert.equal(fixture.diagnostics().persistentWrites, 0);
});

test('preview transport is GET-only and does not expose mutation authority to the renderer route', async () => {
  const fixture = createReferenceV2AuthoringStudioFixture('live-music');

  const preview = await request(fixture.app)
    .get('/studio-authoring-preview/page/home');

  assert.equal(preview.status, 200);
  assert.match(preview.text, /data-component-id="home-hero"/);

  const rejected = await request(fixture.app)
    .post('/studio-authoring-preview/page/home')
    .send('mutation');

  assert.equal(rejected.status, 405);
  assert.equal(rejected.headers.allow, 'GET, HEAD');
  assert.equal(fixture.diagnostics().persistentWrites, 0);
  assert.equal(fixture.diagnostics().hiveRpcAttempts, 0);
  assert.equal(fixture.diagnostics().hiveWrites, 0);
});
