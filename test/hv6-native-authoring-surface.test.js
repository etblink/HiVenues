'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const express = require('express');
const request = require('supertest');
const {
  SAFE_APPLY_ERROR,
  SAFE_EDIT_ERROR,
  SAFE_PREVIEW_ERROR,
  createOfflineNativeAuthoringSurface,
} = require('../src/venue/native-authoring-surface');
const {
  FOURTH_STREET_AUTHORING_INPUT,
  LANTERN_ROOM_AUTHORING_INPUT,
} = require('./support/hv5-authoring-fixtures');

const root = path.join(__dirname, '..');

function createTestSurface(authoringInput, renderPreviewHtml) {
  const surface = createOfflineNativeAuthoringSurface({
    authoringInput,
    renderPreviewHtml,
    editorPath: '/authoring-test',
  });
  const app = express();
  app.use(surface.router);
  return { app, ...surface };
}

function editablePointerSet(html) {
  return new Set(
    Array.from(html.matchAll(/data-field-pointer="([^"]+)"/g), (match) => match[1]),
  );
}

test('promoted native surface renders the complete HV-5-derived field registry for both venues', async () => {
  for (const input of [FOURTH_STREET_AUTHORING_INPUT, LANTERN_ROOM_AUTHORING_INPUT]) {
    const projections = [];
    const fixture = createTestSurface(input, async (projection) => {
      projections.push(projection);
      return `<!doctype html><html lang="en"><body><h1>${projection.siteName}</h1></body></html>`;
    });

    const response = await request(fixture.app).get(fixture.editorPath).expect(200);
    const renderedPointers = editablePointerSet(response.text);
    const sessionPointers = new Set(fixture.session.listEditableFields().map((field) => field.pointer));
    assert.deepEqual(renderedPointers, sessionPointers);
    assert.ok(renderedPointers.size > 20);
    assert.match(response.text, /HV-6 selected native foundation/);
    assert.match(response.text, /Semantic inspector \+ real application preview/);
    assert.match(response.text, /data-session-state>CLEAN</);

    for (const protectedPointer of [
      '/schemaVersion',
      '/deploymentRef/id',
      '/venueContext/id',
      '/venueContext/hive/communityId',
      '/venueContext/hive/officialAccount',
      '/venueContext/hive/threadsContainerAccount',
      '/venueContext/hive/paymentMerchantAccounts',
      '/venuePackage/id',
      '/venuePackage/venueId',
      '/venuePackage/home/gallery/items',
      '/venuePackage/home/gallery/items/0/width',
    ]) {
      assert.equal(renderedPointers.has(protectedPointer), false, protectedPointer);
    }

    const preview = await request(fixture.app).get(fixture.previewPath).expect(200);
    assert.match(preview.text, new RegExp(input.venueContext.displayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.equal(projections.length, 1);
    assert.equal(projections[0].siteName, input.venueContext.displayName);
  }
});

test('native surface keeps preview edits ephemeral until explicit Apply and supports Discard', async () => {
  const projections = [];
  const fixture = createTestSurface(FOURTH_STREET_AUTHORING_INPUT, async (projection) => {
    projections.push(projection);
    return `<!doctype html><html lang="en"><body><h1>${projection.siteName}</h1><p>${projection.venuePackage.home.hero.lede}</p></body></html>`;
  });
  const acceptedBefore = fixture.session.canonicalAccepted();

  await request(fixture.app)
    .post(`${fixture.editorPath}/proposal`)
    .type('form')
    .send({ pointer: '/venuePackage/home/hero/lede', value: 'Phase-C preview-only lede' })
    .expect(303);
  assert.equal(fixture.session.status().dirty, true);
  assert.equal(fixture.session.canonicalAccepted(), acceptedBefore);

  const preview = await request(fixture.app).get(fixture.previewPath).expect(200);
  assert.match(preview.text, /Phase-C preview-only lede/);
  assert.equal(projections.at(-1).venuePackage.home.hero.lede, 'Phase-C preview-only lede');

  await request(fixture.app).post(`${fixture.editorPath}/discard`).expect(303);
  assert.equal(fixture.session.status().dirty, false);
  assert.equal(fixture.session.canonicalAccepted(), acceptedBefore);
  assert.equal(fixture.session.canonicalProposal(), acceptedBefore);

  await request(fixture.app)
    .post(`${fixture.editorPath}/proposal`)
    .type('form')
    .send({ pointer: '/venueContext/displayName', value: 'Fourth Street Phase C' })
    .expect(303);
  await request(fixture.app).post(`${fixture.editorPath}/apply`).expect(303);
  assert.equal(fixture.session.acceptedDocument.venueContext.displayName, 'Fourth Street Phase C');
  assert.equal(fixture.session.status().dirty, false);
  assert.notEqual(fixture.session.canonicalAccepted(), acceptedBefore);
});

test('operator-facing source surface uses nontechnical safe errors without leaking validator details', async () => {
  const fixture = createTestSurface(FOURTH_STREET_AUTHORING_INPUT, async () => '<!doctype html><html><body>preview</body></html>');
  const acceptedBefore = fixture.session.canonicalAccepted();

  await request(fixture.app)
    .post(`${fixture.editorPath}/proposal`)
    .type('form')
    .send({ pointer: '/venuePackage/home/hero/image/src', value: 'https://outside.example/hero.jpg' })
    .expect(303);

  const editor = await request(fixture.app).get(fixture.editorPath).expect(200);
  assert.match(editor.text, new RegExp(SAFE_EDIT_ERROR.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.doesNotMatch(editor.text, /absolute same-origin path|Venue package invalid|Visual authoring session invalid/i);
  assert.equal(fixture.session.canonicalAccepted(), acceptedBefore);
  assert.equal(fixture.session.status().dirty, false);
  assert.equal(SAFE_APPLY_ERROR.includes('HV-5'), false);
});

test('preview renderer failures are contained behind a safe source-foundation response', async () => {
  const fixture = createTestSurface(LANTERN_ROOM_AUTHORING_INPUT, async () => {
    throw new Error('internal-preview-renderer-detail');
  });

  const response = await request(fixture.app).get(fixture.previewPath).expect(503);
  assert.match(response.text, new RegExp(SAFE_PREVIEW_ERROR.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.doesNotMatch(response.text, /internal-preview-renderer-detail/);
});

test('Phase C source foundation remains unmounted from production application and server entrypoints', () => {
  for (const relativePath of ['src/app.js', 'src/server.js', 'index.js']) {
    const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
    assert.doesNotMatch(source, /native-authoring-surface|createOfflineNativeAuthoringSurface|__hive_venues\/native-authoring/i, relativePath);
  }
});
