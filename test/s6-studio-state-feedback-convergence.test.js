'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const request = require('supertest');

const {
  createTurnkeyWorkspace,
} = require('../src/venue/turnkey-workspace');
const {
  createReferenceV2AuthoringStudioFixture,
} = require('./support/v2-authoring-studio-fixture');

const REFERENCES = Object.freeze([
  'fourth-street',
  'juniper',
  'restaurant',
  'live-music',
]);

function workspaceAnswers() {
  return {
    displayName: 'S6 State Fixture',
    id: 's6-state-fixture',
    address: '100 Example Avenue, Testville, NV 89000',
    phone: '(555) 010-1920',
    hours: 'Daily, 10:00 a.m.–10:00 p.m.',
    websiteUrl: 'https://s6-state.example/',
    mapUrl: 'https://s6-state.example/map',
    communityId: 'hive-654321',
    officialAccount: 's6statevenue',
    threadsContainerAccount: 's6state.threads',
    paymentMerchantAccount: 's6statevenue',
  };
}

function temporaryWorkspace(t) {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-s6-state-'));
  const workspaceDirectory = path.join(parent, 'venue-workspace');
  const created = createTurnkeyWorkspace({
    workspaceDirectory,
    answers: workspaceAnswers(),
  });
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));
  return created;
}

function assertPrimaryStatus(html, id, label) {
  assert.match(
    html,
    /<section class="statebar" aria-label="Studio status" role="status" aria-live="polite" aria-atomic="true" data-s6-state-feedback="true">/,
  );
  assert.match(html, new RegExp(`data-s6-studio-state="${id}"`));
  assert.match(
    html,
    new RegExp(`<span class="state-stage" data-s6-state="${id}">${label}<\\/span>`),
  );
  assert.match(html, /id="studio-status-detail"/);
}

test('S6.3 exposes one accessible Studio status taxonomy across all memory-only reference hosts', async () => {
  for (const referenceId of REFERENCES) {
    const fixture = createReferenceV2AuthoringStudioFixture(referenceId);
    const response = await request(fixture.app).get('/studio-authoring');

    assert.equal(response.status, 200, referenceId);
    assertPrimaryStatus(response.text, 'session', 'Session draft');
    assert.match(response.text, /Session draft · memory only/, referenceId);
    assert.doesNotMatch(response.text, /data-s6-workspace-state=/, referenceId);

    const diagnostics = fixture.diagnostics();
    assert.equal(diagnostics.persistentWrites, 0, referenceId);
    assert.equal(diagnostics.hiveRpcAttempts, 0, referenceId);
    assert.equal(diagnostics.hiveWrites, 0, referenceId);
  }
});

test('S6.3 distinguishes unsaved draft, active preview, and saved workspace without changing persistence semantics', async (t) => {
  const workspace = temporaryWorkspace(t);
  const fixture = createReferenceV2AuthoringStudioFixture(
    'restaurant',
    { workspaceDirectory: workspace.root },
  );
  const source = fixture.session().draftSource;
  const page = source.site.pages.find((candidate) => candidate.id === source.site.homePageId);
  const hero = page.components.find((component) => component.kind === 'venue-hero');
  const nodeId = `component:${hero.id}`;
  const fieldId = 'body';
  const query = { nodeId, fieldId, viewport: 'desktop' };

  let response = await request(fixture.app)
    .get('/studio-authoring')
    .query(query)
    .expect(200);

  assertPrimaryStatus(response.text, 'unsaved', 'Unsaved draft');
  assert.match(response.text, /data-s6-workspace-state="unsaved"/);
  assert.match(response.text, /aria-describedby="studio-status-detail"/);
  assert.match(response.text, /No durable v2 checkpoint exists yet/);
  assert.equal(fixture.diagnostics().persistentWrites, 0);

  const openingDigest = fixture.session().draftDigest;
  response = await request(fixture.app)
    .post('/studio-authoring/propose')
    .type('form')
    .send({
      ...query,
      expectedDraftDigest: openingDigest,
      value: 'S6 state feedback preview.',
    });

  assert.equal(response.status, 303);
  const previewDigest = fixture.proposal().afterDigest;
  assert.notEqual(previewDigest, openingDigest);
  assert.equal(fixture.session().draftDigest, openingDigest);

  response = await request(fixture.app).get(response.headers.location).expect(200);
  assertPrimaryStatus(response.text, 'preview', 'Preview');
  assert.match(response.text, /data-s6-workspace-state="preview-blocked"/);
  assert.match(response.text, /Preview — not applied/);
  assert.match(response.text, /Apply to draft/);
  assert.match(response.text, /Discard preview/);
  assert.equal(fixture.diagnostics().persistentWrites, 0);

  await request(fixture.app)
    .post('/studio-authoring/apply')
    .type('form')
    .send(query)
    .expect(303);

  assert.equal(fixture.proposal(), null);
  assert.equal(fixture.session().draftDigest, previewDigest);
  response = await request(fixture.app)
    .get('/studio-authoring')
    .query(query)
    .expect(200);
  assertPrimaryStatus(response.text, 'unsaved', 'Unsaved draft');
  assert.match(response.text, /data-s6-workspace-state="unsaved"/);
  assert.equal(fixture.diagnostics().persistentWrites, 0);

  await request(fixture.app)
    .post('/studio-authoring/save-workspace')
    .type('form')
    .send({
      ...query,
      expectedDraftDigest: previewDigest,
      expectedPersistedDigest: 'ABSENT',
    })
    .expect(303);

  assert.equal(fixture.diagnostics().saveSuccesses, 1);
  assert.equal(fixture.diagnostics().persistentWrites, 1);

  response = await request(fixture.app)
    .get('/studio-authoring')
    .query(query)
    .expect(200);
  assertPrimaryStatus(response.text, 'saved', 'Saved workspace');
  assert.match(response.text, /data-s6-workspace-state="saved"/);
  assert.match(response.text, /Saved workspace checkpoint/);
  assert.match(response.text, /Workspace saved/);
  assert.equal(fixture.diagnostics().hiveRpcAttempts, 0);
  assert.equal(fixture.diagnostics().hiveWrites, 0);
});
