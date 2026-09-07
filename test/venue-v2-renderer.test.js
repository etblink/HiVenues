'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { JSDOM } = require('jsdom');
const request = require('supertest');
const {
  deriveV2DeploymentAgnosticVenueSourceDigest,
} = require('../src/venue/v2/source');
const {
  V2RendererError,
  renderV2EventDetail,
  renderV2Page,
  renderV2PublicStylesheet,
  renderV2ThemeStylesheet,
} = require('../src/venue/v2/renderer');
const {
  REFERENCE_FACTORIES,
  createV2RendererPreviewFixture,
  fourthStreetSource,
  musicSource,
  restaurantSource,
} = require('./support/v2-renderer-fixture');

const ROOT = path.join(__dirname, '..');

function documentFrom(html) {
  return new JSDOM(html).window.document;
}

test('one generic v2 renderer renders all four reference sources without venue-id branches', async () => {
  const rendererSource = fs.readFileSync(
    path.join(ROOT, 'src', 'venue', 'v2', 'renderer', 'index.js'),
    'utf8',
  );
  for (const venueSpecific of [
    'fourth-street-bar-reno',
    'juniper-works-fixture',
    'harbor-hearth-example',
    'northline-hall-example',
  ]) {
    assert.equal(rendererSource.includes(venueSpecific), false);
  }

  const digests = new Set();
  for (const [referenceId, factory] of Object.entries(REFERENCE_FACTORIES)) {
    const source = factory();
    const html = renderV2Page(source);
    const document = documentFrom(html);
    assert.equal(document.querySelectorAll('main').length, 1, referenceId);
    assert.equal(document.querySelectorAll('h1').length, 1, referenceId);
    assert.equal(document.querySelector('h1').textContent.trim().length > 0, true, referenceId);
    assert.equal(document.querySelector('.v2-wordmark').textContent.trim(), source.venue.displayName);
    assert.equal(document.documentElement.lang, 'en');
    digests.add(deriveV2DeploymentAgnosticVenueSourceDigest(source));
  }
  assert.equal(digests.size, 4);
});

test('public-only references do not leak Hive application navigation while configured Fourth Street exposes only the Community entry', () => {
  for (const factory of [restaurantSource, musicSource]) {
    const document = documentFrom(renderV2Page(factory()));
    const navigation = document.querySelector('nav[aria-label="Primary"]').textContent;
    assert.doesNotMatch(navigation, /Community|Threads|Sign in|Pay/i);
    assert.equal(document.querySelectorAll('a[href="/community"]').length, 0);
  }

  const fourth = documentFrom(renderV2Page(fourthStreetSource()));
  const navigation = fourth.querySelector('nav[aria-label="Primary"]').textContent;
  assert.match(navigation, /Community/);
  assert.doesNotMatch(navigation, /Threads|Sign in|Pay/);
  assert.equal(fourth.querySelectorAll('a[href="/community"]').length >= 1, true);
});

test('restaurant rendering uses semantic menu resources and recipe-driven editorial composition', () => {
  const source = restaurantSource();
  const document = documentFrom(renderV2Page(source));

  assert.equal(document.documentElement.classList.contains('v2-type--editorial'), true);
  assert.equal(document.documentElement.classList.contains('v2-density--generous'), true);
  assert.equal(document.querySelector('[data-component-id="home-hero"]').dataset.recipe, 'hero-editorial-split');
  assert.equal(
    document.querySelector('[data-component-id="home-hero"]').classList.contains('v2-d-layoutvariant--split'),
    true,
  );
  assert.equal(
    document.querySelector('[data-component-id="home-hero"]').classList.contains('v2-t-layoutvariant--stacked'),
    true,
  );

  const menuItems = [...document.querySelectorAll('[data-menu-item-id]')].map((node) => node.dataset.menuItemId);
  assert.deepEqual(menuItems, ['oysters', 'carrots', 'market-fish', 'short-rib']);
  assert.match(document.body.textContent, /A short seasonal menu/);
});

test('live-music event details derive from the canonical Event resource and emit structured-data seam', () => {
  const source = musicSource();
  const event = source.resources.events[0];
  const html = renderV2EventDetail(source, event.slug);
  const document = documentFrom(html);

  assert.equal(document.querySelector('h1').textContent, event.title);
  assert.equal(document.querySelector('time').getAttribute('datetime'), event.startAt);
  assert.match(document.body.textContent, new RegExp(event.description));
  assert.equal(document.querySelector('.v2-action--primary').getAttribute('href'), event.externalAction.href);

  const structured = JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent);
  assert.equal(structured['@type'], 'Event');
  assert.equal(structured.name, event.title);
  assert.equal(structured.startDate, event.startAt);
  assert.equal(structured.location.name, source.venue.displayName);

  assert.throws(
    () => renderV2EventDetail(source, 'missing-event'),
    (error) => error instanceof V2RendererError && /event does not exist/.test(error.message),
  );
});

test('theme stylesheet is deterministic semantic output and public stylesheet contains responsive/accessibility guardrails', () => {
  const source = restaurantSource();
  const first = renderV2ThemeStylesheet(source);
  const second = renderV2ThemeStylesheet(JSON.parse(JSON.stringify(source)));
  assert.equal(first, second);
  assert.match(first, /--v2-canvas: #fbf7f0/);
  assert.match(first, /--v2-accent: #6b3b13/);
  assert.doesNotMatch(first, /Harbor|restaurant|venueId/i);

  const publicCss = renderV2PublicStylesheet();
  assert.match(publicCss, /@media \(max-width: 1024px\)/);
  assert.match(publicCss, /@media \(max-width: 640px\)/);
  assert.match(publicCss, /prefers-reduced-motion: reduce/);
  assert.match(publicCss, /min-height: 44px/);
  assert.match(publicCss, /focus-visible/);
  assert.doesNotMatch(publicCss, /fourth-street|juniper|harbor-hearth|northline-hall/i);
});

test('isolated preview harness renders pages, styles and event routes with zero Hive/write attempts', async () => {
  for (const [referenceId, factory] of Object.entries(REFERENCE_FACTORIES)) {
    const fixture = createV2RendererPreviewFixture(factory());
    const home = await request(fixture.app).get('/').expect(200);
    assert.equal(home.text.includes(fixture.source.venue.displayName), true);

    const styles = await request(fixture.app).get('/__hivenues-v2/styles.css').expect(200);
    assert.match(styles.text, /v2-site-header/);
    const theme = await request(fixture.app).get('/__hivenues-v2/theme.css').expect(200);
    assert.match(theme.text, /--v2-canvas/);

    if (referenceId === 'live-music') {
      await request(fixture.app).get('/shows').expect(200);
      await request(fixture.app).get('/events/fixture-show-one').expect(200);
    }

    const diagnostics = fixture.diagnostics();
    assert.equal(diagnostics.hiveRpcAttempts, 0);
    assert.equal(diagnostics.writes, 0);
  }
});

test('current production app remains v1-only and the renderer foundation is not runtime-wired', () => {
  const appSource = fs.readFileSync(path.join(ROOT, 'src', 'app.js'), 'utf8');
  const serverSource = fs.readFileSync(path.join(ROOT, 'src', 'server.js'), 'utf8');
  const studioSource = fs.readFileSync(path.join(ROOT, 'src', 'venue', 'turnkey-studio.js'), 'utf8');

  for (const source of [appSource, serverSource, studioSource]) {
    assert.doesNotMatch(source, /venue\/v2|v2\/renderer|renderV2Page|renderV2EventDetail/);
  }
});
