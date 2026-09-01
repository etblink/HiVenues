'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const express = require('express');
const request = require('supertest');
const { extractDeploymentAgnosticVenueSource } = require('../src/venue/source');
const { FIRST_PARTY_ASSETS } = require('../src/release/static-assets');
const {
  SAFE_SOURCE_EDIT_ERROR,
  createOfflineSourceAuthoringSurface,
  generatedItemId,
  normalizeDateTimeInput,
} = require('../src/venue/source-authoring-surface');
const { FOURTH_STREET_AUTHORING_INPUT } = require('./support/hv5-authoring-fixtures');
const { JUNIPER_WORKS_AUTHORING_INPUT } = require('./support/hv7-juniper-venue');

const root = path.join(__dirname, '..');

function sourceOf(authoring) {
  return extractDeploymentAgnosticVenueSource(authoring);
}

function createTestSurface(sourceInput) {
  const surface = createOfflineSourceAuthoringSurface({
    sourceInput,
    editorPath: '/customize-test',
    renderPreviewHtml: async (projection) => `<!doctype html><html lang="en"><body><h1>${projection.siteName}</h1><p>${projection.venuePackage.home.hero.lede}</p></body></html>`,
  });
  const app = express();
  app.use(surface.router);
  return { app, ...surface };
}

test('simple source-authoring surface is deployment-agnostic and avoids developer-facing implementation jargon', async () => {
  const fixture = createTestSurface(sourceOf(FOURTH_STREET_AUTHORING_INPUT));
  const response = await request(fixture.app).get(fixture.editorPath).expect(200);

  assert.match(response.text, /Customize your venue/);
  assert.match(response.text, /Hosting comes later/);
  assert.match(response.text, /Keep changes/);
  assert.match(response.text, /Undo preview changes/);
  assert.match(response.text, /data-qol-progressive="section-picker"/);
  assert.match(response.text, /item-edit-group:not\(\[open\]\)\s*>\s*\.item-edit-fields\s*\{\s*display:\s*none;/);
  assert.match(response.text, /\.preview\s*\{[^}]*width:\s*calc\(100% \+ 24px\)[^}]*margin-left:\s*-12px/s);
  assert.doesNotMatch(response.text, /deploymentRef|Stable item ID|Operator-owned|ISO date\/time|Local image path|raw JSON/i);
  assert.doesNotMatch(response.text, /data-field-pointer="[^"]+\/src"/);
  assert.doesNotMatch(response.text, /<textarea[^>]*(?:whole-document|raw-json|document-json)/i);

  const qol = await request(fixture.app).get(`${fixture.editorPath}/qol.js`).expect(200);
  assert.match(qol.text, /groupStructuredFields/);
  assert.match(qol.text, /item-edit-group/);
  assert.match(qol.text, /qolStructured = 'item-disclosure'/);
  assert.match(qol.text, /heading !== 'Programs' && heading !== 'Equipment'/);

  const preview = await request(fixture.app).get(fixture.previewPath).expect(200);
  assert.match(preview.text, /4th Street Bar/);
});

test('simple source-authoring surface previews and keeps an ordinary non-identity edit without a deployment identity', async () => {
  const fixture = createTestSurface(sourceOf(FOURTH_STREET_AUTHORING_INPUT));
  const acceptedBefore = fixture.session.canonicalAccepted();
  const acceptedName = fixture.session.acceptedSource.venueContext.displayName;
  const editedLede = 'Source-authoring preview qualification only.';

  await request(fixture.app)
    .post(`${fixture.editorPath}/proposal`)
    .type('form')
    .send({ pointer: '/venuePackage/home/hero/lede', value: editedLede })
    .expect(303);

  assert.equal(fixture.session.status().dirty, true);
  assert.equal(fixture.session.canonicalAccepted(), acceptedBefore);
  assert.equal(fixture.session.previewProjection().siteName, acceptedName);
  assert.equal(fixture.session.previewProjection().venuePackage.home.hero.lede, editedLede);

  const preview = await request(fixture.app).get(fixture.previewPath).expect(200);
  assert.match(preview.text, /4th Street Bar/);
  assert.match(preview.text, /Source-authoring preview qualification only\./);

  await request(fixture.app).post(`${fixture.editorPath}/apply`).expect(303);
  assert.equal(fixture.session.acceptedSource.venueContext.displayName, acceptedName);
  assert.equal(fixture.session.acceptedSource.venuePackage.home.hero.lede, editedLede);
  assert.equal(Object.prototype.hasOwnProperty.call(fixture.session.acceptedSource, 'deploymentRef'), false);
});

test('structured item IDs are generated from operator-entered names instead of requested from the operator', async () => {
  const fixture = createTestSurface(sourceOf(JUNIPER_WORKS_AUTHORING_INPUT));
  const response = await request(fixture.app).get(fixture.editorPath).expect(200);

  assert.match(response.text, /Add program/);
  assert.doesNotMatch(response.text, /name="id"/);
  assert.equal(generatedItemId({ items: [{ id: 'repair-cafe' }] }, 'Repair café'), 'repair-cafe-2');
  assert.equal(normalizeDateTimeInput('2026-09-18 18:00 -07:00'), '2026-09-18T18:00:00-07:00');

  await request(fixture.app)
    .post(`${fixture.editorPath}/collection`)
    .type('form')
    .send({
      pointer: '/venuePackage/home/programs/items',
      operation: 'add',
      title: 'Repair café',
      startAt: '2026-09-18 18:00 -07:00',
      endAt: '2026-09-18 20:00 -07:00',
      description: 'A community repair session.',
      accessNote: 'Visitors welcome; normal tool eligibility still applies.',
      state: 'scheduled',
      link: '',
    })
    .expect(303);

  const added = fixture.session.previewProjection().venuePackage.home.programs.items.find((item) => item.title === 'Repair café');
  assert.ok(added);
  assert.equal(added.id, 'repair-cafe');
  assert.equal(added.startAt, '2026-09-18T18:00:00-07:00');
});

test('simple source-authoring surface keeps invalid validator detail behind a plain-language error', async () => {
  const fixture = createTestSurface(sourceOf(FOURTH_STREET_AUTHORING_INPUT));
  const acceptedBefore = fixture.session.canonicalAccepted();

  await request(fixture.app)
    .post(`${fixture.editorPath}/proposal`)
    .type('form')
    .send({ pointer: '/venueContext/displayName', value: '' })
    .expect(303);

  const response = await request(fixture.app).get(fixture.editorPath).expect(200);
  assert.match(response.text, new RegExp(SAFE_SOURCE_EDIT_ERROR.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.doesNotMatch(response.text, /Venue context invalid|Deployment-agnostic venue source invalid|Zod/i);
  assert.equal(fixture.session.canonicalAccepted(), acceptedBefore);
});

test('mobile home hero safety stays inside the existing byte-versioned UX-1F owner stylesheet', () => {
  const home = fs.readFileSync(path.join(root, 'views/pages/home/index.ejs'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'public/css/ux-1f-home.css'), 'utf8');

  assert.match(home, /assetUrl\('\/css\/ux-1f-home\.css'\)/);
  assert.doesNotMatch(home, /home-hero-mobile-safety\.css/);
  assert.ok(FIRST_PARTY_ASSETS.includes('/css/ux-1f-home.css'));
  assert.match(css, /@media \(max-width: 519px\)/);
  assert.match(css, /\.home-hero__frame\s*\{[^}]*min-height:\s*max\(43rem,[^}]*padding-top:\s*4\.75rem/s);
  assert.match(css, /\.home-hero__caption\s*\{[^}]*left:\s*0\.85rem[^}]*right:\s*0\.85rem/s);
});

test('source-authoring foundation remains unmounted from ordinary production entrypoints', () => {
  for (const relativePath of ['src/app.js', 'src/server.js', 'index.js']) {
    const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
    assert.doesNotMatch(source, /source-authoring-surface|createOfflineSourceAuthoringSurface|__hive_venues\/source-authoring/i, relativePath);
  }
});
