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

test('PM4 reference evidence uses four shared hero compositions and visitor-facing synthetic concept copy', () => {
  const heroRecipes = new Map();
  for (const [referenceId, factory] of Object.entries(REFERENCE_FACTORIES)) {
    const source = factory();
    const home = source.site.pages.find((page) => page.id === source.site.homePageId);
    const hero = home.components.find((component) => component.kind === 'venue-hero');
    heroRecipes.set(referenceId, hero.recipeId);
  }
  assert.deepEqual(Object.fromEntries(heroRecipes), {
    'fourth-street': 'hero-immersive-media',
    juniper: 'hero-legacy-v1',
    restaurant: 'hero-editorial-split',
    'live-music': 'hero-poster',
  });
  assert.equal(new Set(heroRecipes.values()).size, 4);

  for (const factory of [restaurantSource, musicSource]) {
    const document = documentFrom(renderV2Page(factory()));
    const publicText = document.body.textContent;
    assert.doesNotMatch(publicText, /\b(renderer|fixture|resource routing|semantic resource)\b/i);
    assert.match(publicText, /concept venue|fictional/i);
  }
});

test('synthetic reference media bytes match every declared intrinsic dimension', async () => {
  for (const factory of [restaurantSource, musicSource]) {
    const source = factory();
    const fixture = createV2RendererPreviewFixture(source);
    for (const asset of source.media.assets) {
      const response = await request(fixture.app).get(asset.src).expect(200);
      assert.match(response.text, new RegExp(`width=["']${asset.width}["']`));
      assert.match(response.text, new RegExp(`height=["']${asset.height}["']`));
      assert.match(response.text, new RegExp(`viewBox=["']0 0 ${asset.width} ${asset.height}["']`));
    }
  }
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
  assert.equal(document.querySelector('.v2-event-detail__media .v2-media').classList.contains('v2-fit--contain'), true);

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

test('poster rows preserve managed artwork, event order, literal copy and visitor actions without source mutation', () => {
  const source = JSON.parse(JSON.stringify(musicSource()));
  source.resources.events[0].title = 'Lights <and> Sound';
  source.resources.events[0].description = 'Music & stories <script>never markup</script>';
  const before = deriveV2DeploymentAgnosticVenueSourceDigest(source);
  const document = documentFrom(renderV2Page(source, { pageSlug: 'shows', basePath: '/preview' }));
  const cards = [...document.querySelectorAll('.v2-event-card--poster')];
  assert.deepEqual(cards.map((card) => card.dataset.resourceId), source.resources.events.map((event) => event.id));
  cards.forEach((card, index) => {
    const event = source.resources.events[index];
    const asset = source.media.assets.find((entry) => entry.id === event.mediaAssetId);
    const image = card.querySelector('img');
    assert.equal(image.getAttribute('src'), asset.src);
    assert.equal(image.getAttribute('width'), String(asset.width));
    assert.equal(image.getAttribute('height'), String(asset.height));
    assert.equal(image.alt, event.title);
    assert.equal(image.getAttribute('loading'), 'lazy');
    assert.ok(image.closest('.v2-fit--contain'), 'poster artwork must not be cropped');
    assert.equal(card.querySelector('h3').textContent, event.title);
    assert.equal(card.querySelector('h3 a').getAttribute('href'), `/preview/events/${event.slug}`);
    assert.equal(card.querySelector('time').getAttribute('datetime'), event.startAt);
    assert.equal(card.querySelector('.v2-action--primary').getAttribute('href'), event.externalAction.href);
    assert.equal(card.querySelector('.v2-event-card__copy > p').textContent, event.description);
    assert.equal(card.querySelectorAll('script').length, 0);
  });
  assert.equal(deriveV2DeploymentAgnosticVenueSourceDigest(source), before);
});

test('poster rows handle absent artwork and actions while other event recipes retain their existing markup', () => {
  const source = JSON.parse(JSON.stringify(musicSource()));
  source.resources.events[0].mediaAssetId = null;
  source.resources.events[0].externalAction = null;
  let document = documentFrom(renderV2Page(source, { pageSlug: 'shows' }));
  const textRow = document.querySelector('.v2-event-card--text-only');
  assert.ok(textRow);
  assert.equal(textRow.querySelectorAll('img,.v2-event-card__artwork,.v2-action--primary').length, 0);
  assert.equal(textRow.querySelector('.v2-action--secondary').textContent, 'Details');
  assert.equal(document.querySelectorAll('.v2-event-card--poster img').length, 1);

  const page = source.site.pages.find((entry) => entry.slug === 'shows');
  page.components[0].recipeId = 'list-card-grid';
  document = documentFrom(renderV2Page(source, { pageSlug: 'shows' }));
  assert.equal(document.querySelectorAll('.v2-event-card').length, 2);
  assert.equal(document.querySelectorAll('.v2-event-card--poster,.v2-event-card__copy,.v2-event-card img').length, 0);

  page.components[0].recipeId = 'list-poster-rows';
  source.resources.events[1].mediaAssetId = 'unknown-asset';
  assert.throws(() => renderV2Page(source, { pageSlug: 'shows' }), /media|asset/i);
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
  assert.match(publicCss, /body \{[\s\S]*font-family: inherit;/);
  assert.match(publicCss, /\.v2-type--system-sans \{ font-family: ui-sans-serif/);
  assert.match(publicCss, /\.v2-type--editorial \{ font-family: Georgia/);
  assert.match(publicCss, /\.v2-type--grotesk-display \{ font-family: "Arial Narrow"/);
  assert.match(publicCss, /\.v2-type--poster \{ font-family: "Arial Black"/);
  assert.doesNotMatch(publicCss, /fourth-street|juniper|harbor-hearth|northline-hall/i);
});

test('isolated preview harness renders pages, styles and event routes with zero Hive/write attempts', async () => {
  for (const [referenceId, factory] of Object.entries(REFERENCE_FACTORIES)) {
    const fixture = createV2RendererPreviewFixture(factory());
    const home = await request(fixture.app).get('/').expect(200);
    const homeDocument = documentFrom(home.text);
    assert.equal(
      homeDocument.querySelector('.v2-wordmark').textContent.trim(),
      fixture.source.venue.displayName,
    );

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
