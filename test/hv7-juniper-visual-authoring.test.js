'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const express = require('express');
const request = require('supertest');
const { createOfflineNativeAuthoringSurface } = require('../src/venue/native-authoring-surface');
const { createVisualAuthoringSession } = require('../src/venue/visual-authoring-session');
const { JUNIPER_WORKS_AUTHORING_INPUT } = require('./support/hv7-juniper-venue');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

test('HV-6 derives Juniper typed fields and collection controls from the expanded HV-5 document', () => {
  const session = createVisualAuthoringSession(JUNIPER_WORKS_AUTHORING_INPUT);
  const fields = session.listEditableFields();
  const collections = session.listEditableCollections();

  const themeAccent = fields.find((field) => field.pointer === '/venuePackage/brand/theme/accent');
  assert.equal(themeAccent.controlKind, 'color');

  const programState = fields.find((field) => /\/home\/programs\/items\/0\/state$/.test(field.pointer));
  assert.equal(programState.controlKind, 'select');
  assert.deepEqual(programState.options, ['scheduled', 'full', 'cancelled']);

  const optionalLink = fields.find((field) => /\/home\/programs\/items\/0\/link$/.test(field.pointer));
  assert.equal(optionalLink.controlKind, 'optional-url');
  assert.equal(optionalLink.required, false);

  assert.equal(fields.some((field) => /\/items\/\d+\/id$/.test(field.pointer)), false);
  assert.deepEqual(collections.map((collection) => collection.kind), ['programs', 'equipment-status']);
  assert.deepEqual(collections[0].items.map((item) => item.id), ['orientation-101', 'open-build-night']);
});

test('visual session supports bounded collection lifecycle while accepted state stays atomic', () => {
  const session = createVisualAuthoringSession(JUNIPER_WORKS_AUTHORING_INPUT);
  const acceptedBefore = session.canonicalAccepted();

  session.addCollectionItem('/venuePackage/home/programs/items', {
    id: 'safety-clinic',
    title: 'Shared-shop safety clinic',
    startAt: '2026-09-15T18:00:00-07:00',
    endAt: '2026-09-15T19:00:00-07:00',
    description: 'A public clinic covering shared-space habits and how to request equipment-specific orientation.',
    accessNote: 'Visitors welcome; attendance does not itself grant tool eligibility.',
    state: 'scheduled',
    link: null,
  });
  assert.equal(session.status().dirty, true);
  assert.equal(session.canonicalAccepted(), acceptedBefore);
  assert.equal(session.previewProjection().venuePackage.home.programs.items.some((item) => item.id === 'safety-clinic'), true);

  session.moveCollectionItem('/venuePackage/home/equipmentStatus/items', 'wood-shop', 'up');
  assert.deepEqual(
    session.previewProjection().venuePackage.home.equipmentStatus.items.map((item) => item.id),
    ['wood-shop', 'laser-cutter', 'electronics-bench'],
  );

  session.edit('/venuePackage/brand/theme/accent', '#a96700');
  session.apply();
  assert.equal(session.acceptedDocument.venuePackage.brand.theme.accent, '#a96700');
  assert.equal(session.acceptedDocument.venuePackage.home.programs.items.some((item) => item.id === 'safety-clinic'), true);
  assert.equal(session.status().dirty, false);

  const acceptedAfter = session.canonicalAccepted();
  session.removeCollectionItem('/venuePackage/home/programs/items', 'safety-clinic');
  assert.equal(session.status().dirty, true);
  session.discard();
  assert.equal(session.canonicalAccepted(), acceptedAfter);
  assert.equal(session.canonicalProposal(), acceptedAfter);
});

test('visual session rejects invalid collection identity and does not replace the proposal', () => {
  const session = createVisualAuthoringSession(JUNIPER_WORKS_AUTHORING_INPUT);
  const proposalBefore = session.canonicalProposal();

  assert.throws(
    () => session.addCollectionItem('/venuePackage/home/programs/items', {
      id: 'orientation-101',
      title: 'Duplicate',
      startAt: '2026-09-20T18:00:00-07:00',
      endAt: '2026-09-20T19:00:00-07:00',
      description: 'Duplicate identity should fail before proposal replacement.',
      accessNote: 'Fixture only.',
      state: 'scheduled',
      link: null,
    }),
    /already exists/i,
  );
  assert.equal(session.canonicalProposal(), proposalBefore);
  assert.equal(session.status().dirty, false);
});

test('native authoring surface exposes typed Juniper collection lifecycle without raw JSON', async () => {
  const surface = createOfflineNativeAuthoringSurface({
    authoringInput: clone(JUNIPER_WORKS_AUTHORING_INPUT),
    editorPath: '/juniper-authoring',
    renderPreviewHtml: async (projection) => `<!doctype html><html lang="en"><body><h1>${projection.siteName}</h1><p>${projection.venuePackage.home.programs.items.length} programs</p></body></html>`,
  });
  const app = express();
  app.use(surface.router);

  const editor = await request(app).get(surface.editorPath).expect(200);
  assert.match(editor.text, /data-collection-pointer="\/venuePackage\/home\/programs\/items"/);
  assert.match(editor.text, /data-collection-pointer="\/venuePackage\/home\/equipmentStatus\/items"/);
  assert.match(editor.text, /type="color"/);
  assert.match(editor.text, /<select[^>]*name="value"/);
  assert.match(editor.text, /Add program/);
  assert.match(editor.text, /Add equipment item/);
  assert.doesNotMatch(editor.text, /<textarea[^>]*(?:whole-document|raw-json|document-json)/i);

  const acceptedBefore = surface.session.canonicalAccepted();
  await request(app)
    .post(`${surface.editorPath}/collection`)
    .type('form')
    .send({
      pointer: '/venuePackage/home/programs/items',
      operation: 'add',
      id: 'repair-cafe',
      title: 'Repair café',
      startAt: '2026-09-18T18:00:00-07:00',
      endAt: '2026-09-18T20:00:00-07:00',
      description: 'A community repair session for fixture testing.',
      accessNote: 'Visitors welcome; tool eligibility still applies.',
      state: 'scheduled',
      link: '',
    })
    .expect(303);

  assert.equal(surface.session.status().dirty, true);
  assert.equal(surface.session.canonicalAccepted(), acceptedBefore);
  assert.equal(surface.session.previewProjection().venuePackage.home.programs.items.some((item) => item.id === 'repair-cafe'), true);

  const preview = await request(app).get(surface.previewPath).expect(200);
  assert.match(preview.text, /3 programs/);

  await request(app).post(`${surface.editorPath}/apply`).expect(303);
  assert.equal(surface.session.acceptedDocument.venuePackage.home.programs.items.some((item) => item.id === 'repair-cafe'), true);
});
