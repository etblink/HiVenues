'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const express = require('express');
const request = require('supertest');
const {
  createDeploymentAgnosticVenueSource,
  extractDeploymentAgnosticVenueSource,
} = require('../src/venue/source');
const {
  SAFE_STUDIO_EDIT_ERROR,
  createOfflineSourceAuthoringSurface,
} = require('../src/venue/source-authoring-surface');
const { FOURTH_STREET_AUTHORING_INPUT } = require('./support/hv5-authoring-fixtures');
const { JUNIPER_WORKS_AUTHORING_INPUT } = require('./support/hv7-juniper-venue');

const root = path.join(__dirname, '..');

function createSurface(authoringInput) {
  const surface = createOfflineSourceAuthoringSurface({
    sourceInput: extractDeploymentAgnosticVenueSource(authoringInput),
    editorPath: '/studio-test',
    renderPreviewHtml: async (projection) => `<!doctype html><html lang="en"><body><h1>${projection.siteName}</h1><img src="${projection.venuePackage.home.hero.image.src}" alt=""><p>${projection.venuePackage.home.hero.lede}</p></body></html>`,
  });
  const app = express();
  app.use(surface.router);
  return { app, ...surface };
}

test('Issue #130 Venue Studio presents a four-step authoring workflow with immediate mobile preview control', async () => {
  const fixture = createSurface(FOURTH_STREET_AUTHORING_INPUT);
  const response = await request(fixture.app).get(fixture.editorPath).expect(200);

  assert.match(response.text, /Venue Studio/);
  assert.match(response.text, /data-studio-stage="brand"/);
  assert.match(response.text, /data-studio-active-stage="brand"/);
  assert.match(response.text, /data-studio-active-view="edit"/);
  assert.match(response.text, />Brand</);
  assert.match(response.text, />Page</);
  assert.match(response.text, />Details</);
  assert.match(response.text, />Review</);
  assert.match(response.text, /data-studio-view="preview"/);
  assert.match(response.text, />Preview venue</);
  assert.match(response.text, /Keep changes in draft/);
  assert.match(response.text, /Save venue file/);
  assert.match(response.text, /\.nav\s*\{[^}]*flex-wrap:\s*wrap[^}]*overflow:\s*visible/s);
  assert.match(response.text, /html\.qol-sections\s+\.nav\s+a\[hidden\]\s*\{\s*display:\s*none\s*!important;/);
  assert.match(response.text, /html\[data-studio-active-view="edit"\]\s+\.preview\s*\{\s*display:\s*none;/);

  const qol = await request(fixture.app).get(`${fixture.editorPath}/qol.js`).expect(200);
  assert.match(qol.text, /async function previewStage/);
  assert.match(qol.text, /studio-proposal/);
  assert.match(qol.text, /post\.submit\(\)/);
  assert.match(qol.text, /studioActiveView/);
  assert.doesNotMatch(qol.text, /document\.documentElement\.dataset\.studioView/);
  assert.doesNotMatch(qol.text, /redirect\s*:\s*['"]follow['"]/);
  assert.match(qol.text, /prefers-reduced-motion/);
});

test('Issue #130 generated mobile homepage keeps longer venue identity readable without shell ellipsis', () => {
  const css = fs.readFileSync(path.join(root, 'public', 'css', 'ux-1f-home.css'), 'utf8');

  assert.match(css, /@media \(max-width: 519px\)[\s\S]*\.app-brand__wordmark strong\s*\{[\s\S]*max-width:\s*min\(13rem, calc\(100vw - 7rem\)\);[\s\S]*text-overflow:\s*clip;[\s\S]*white-space:\s*normal;/);
});

test('Issue #130 exposes operator-owned logo, hero, and gallery media without raw JSON editing', async () => {
  const fixture = createSurface(FOURTH_STREET_AUTHORING_INPUT);
  const response = await request(fixture.app).get(fixture.editorPath).expect(200);

  assert.match(response.text, /Brand media/);
  assert.match(response.text, /Hero media/);
  assert.match(response.text, /Gallery media/);
  assert.match(response.text, /data-media-pointer="\/venuePackage\/brand\/logo\/src"/);
  assert.match(response.text, /data-media-pointer="\/venuePackage\/home\/hero\/image\/src"/);
  assert.match(response.text, /data-media-pointer="\/venuePackage\/home\/gallery\/items\/0\/src"/);
  assert.doesNotMatch(response.text, /raw JSON|whole-document|document-json/i);

  await request(fixture.app)
    .post(`${fixture.editorPath}/media-proposal`)
    .type('form')
    .send({ pointer: '/venuePackage/home/hero/image/src', value: '/images/fourth-street-bar-exterior.jpg' })
    .expect(303);

  assert.equal(fixture.session.status().dirty, true);
  assert.equal(fixture.session.previewProjection().venuePackage.home.hero.image.src, '/images/fourth-street-bar-exterior.jpg');
  const preview = await request(fixture.app).get(fixture.previewPath).expect(200);
  assert.match(preview.text, /fourth-street-bar-exterior\.jpg/);
});

test('Issue #130 stage proposal is atomic and fail-closed when any proposed value is invalid', async () => {
  const fixture = createSurface(FOURTH_STREET_AUTHORING_INPUT);
  const before = fixture.session.canonicalProposal();

  await request(fixture.app)
    .post(`${fixture.editorPath}/studio-proposal`)
    .type('form')
    .send('pointer=/venueContext/displayName&value=Temporary+Name&pointer=/venuePackage/brand/logo/src&value=https%3A%2F%2Fexample.com%2Flogo.png')
    .expect(303);

  assert.equal(fixture.session.canonicalProposal(), before);
  const response = await request(fixture.app).get(fixture.editorPath).expect(200);
  assert.match(response.text, new RegExp(SAFE_STUDIO_EDIT_ERROR.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('Issue #130 Juniper remains synthetic while using the same Venue Studio and materially different branding', async () => {
  const fixture = createSurface(JUNIPER_WORKS_AUTHORING_INPUT);
  const response = await request(fixture.app).get(fixture.editorPath).expect(200);

  assert.match(response.text, /Juniper Works Cooperative/);
  assert.match(response.text, /Venue Studio/);
  assert.match(response.text, /#945500/i);
  assert.match(response.text, /\/fixtures\/juniper-works\/logo\.svg/);
});

test('Issue #130 product-facing Juniper starter is valid, explicit synthetic evidence with portable venue-owned assets', () => {
  const sourcePath = path.join(root, 'examples', 'juniper', 'venue-source.json');
  const readme = fs.readFileSync(path.join(root, 'examples', 'juniper', 'README.md'), 'utf8');
  const source = createDeploymentAgnosticVenueSource(JSON.parse(fs.readFileSync(sourcePath, 'utf8')));

  assert.equal(source.venueContext.id, 'juniper-works-example');
  assert.equal(source.venueContext.displayName, 'Juniper Works Cooperative');
  assert.equal(source.venuePackage.brand.theme.accent, '#945500');
  assert.equal(source.venuePackage.brand.logo.src, '/examples/juniper/logo.svg');
  assert.equal(source.venuePackage.home.hero.image.src, '/examples/juniper/workshop.svg');
  assert.ok(source.venuePackage.home.gallery.items.every((item) => item.src.startsWith('/examples/juniper/')));
  assert.match(readme, /illustrative, synthetic starter/i);
  assert.match(readme, /not a real venue/i);
  assert.match(readme, /venue-owned layer/i);
  assert.match(readme, /platform-owned/i);

  for (const filename of ['logo.svg', 'workshop.svg', 'project-a.svg', 'project-b.svg', 'project-c.svg']) {
    assert.equal(fs.existsSync(path.join(root, 'public', 'examples', 'juniper', filename)), true, filename);
  }
});
