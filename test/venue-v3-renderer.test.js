'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { JSDOM } = require('jsdom');
const request = require('supertest');
const {
  createV3DeploymentAgnosticVenueSource,
  deriveV3DeploymentAgnosticVenueSourceDigest,
} = require('../src/venue/v3/source');
const {
  V3RendererError,
  renderV3ActivityDetail,
  renderV3Page,
  renderV3PublicStylesheet,
  renderV3Route,
} = require('../src/venue/v3/renderer');
const {
  REFERENCE_FACTORIES,
  createV3PreviewFixture,
  migratedPhysicalReference,
  nativeCreatorSource,
  nativeReleaseSource,
} = require('./support/v3-reference-fixtures');

const ROOT = path.join(__dirname, '..');

function documentFrom(html) {
  return new JSDOM(html).window.document;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

test('one generic v3 renderer renders all three frozen reference families without host-specific branches', () => {
  const rendererSource = fs.readFileSync(
    path.join(ROOT, 'src', 'venue', 'v3', 'renderer', 'index.js'),
    'utf8',
  );
  for (const forbiddenIdentity of [
    'northline-hall-example',
    'signal-room-creator',
    'northstar-release-host',
    'Northline Hall Example',
    'Signal Room Creator Example',
    'Northstar Release Host Example',
  ]) {
    assert.equal(rendererSource.includes(forbiddenIdentity), false, forbiddenIdentity);
  }

  for (const [referenceId, factory] of Object.entries(REFERENCE_FACTORIES)) {
    const source = factory();
    const html = renderV3Page(source);
    const document = documentFrom(html);
    assert.equal(document.querySelectorAll('main').length, 1, referenceId);
    assert.equal(document.querySelectorAll('h1').length, 1, referenceId);
    assert.equal(document.querySelector('.v3-wordmark').textContent.trim(), source.venue.displayName, referenceId);
    assert.equal(document.documentElement.lang, 'en', referenceId);
    assert.equal(document.querySelectorAll('a[href^="/activities/"]').length >= 1, true, referenceId);
  }
});

test('canonical /activities routes resolve every reference while migrated /events compatibility is explicit only', () => {
  const migrated = migratedPhysicalReference();
  const migratedActivity = migrated.source.resources.activities[0];
  const canonical = documentFrom(renderV3Route(
    migrated.source,
    `/activities/${migratedActivity.slug}`,
    { legacyEventRoutes: migrated.legacyEventRoutes },
  ));
  const legacy = documentFrom(renderV3Route(
    migrated.source,
    `/events/${migratedActivity.slug}`,
    { legacyEventRoutes: migrated.legacyEventRoutes },
  ));
  assert.equal(canonical.querySelector('main').dataset.activityId, migratedActivity.id);
  assert.equal(legacy.querySelector('main').dataset.activityId, migratedActivity.id);
  assert.equal(legacy.querySelector('h1').textContent, canonical.querySelector('h1').textContent);

  for (const source of [nativeCreatorSource(), nativeReleaseSource()]) {
    const activity = source.resources.activities[0];
    const detail = documentFrom(renderV3Route(source, `/activities/${activity.slug}`));
    assert.equal(detail.querySelector('main').dataset.activityId, activity.id);
    assert.throws(
      () => renderV3Route(source, `/events/${activity.slug}`),
      (error) => error instanceof V3RendererError && /not bound/.test(error.message),
    );
  }
});

test('locationless online occurrence renders explicit destination without fabricated place facts', () => {
  const source = nativeCreatorSource();
  const activity = source.resources.activities[0];
  const document = documentFrom(renderV3ActivityDetail(source, activity.slug));
  assert.equal(document.querySelector('h1').textContent, activity.title);
  assert.equal(document.querySelector('time').getAttribute('datetime'), activity.temporal.startAt);
  assert.match(document.body.textContent, /Join online/);
  assert.equal(
    document.querySelector('.v3-activity-presence a').getAttribute('href'),
    activity.presence.destinations[0].href,
  );
  assert.equal(document.querySelectorAll('address').length, 0);
  assert.equal(
    [...document.querySelectorAll('a')].some((link) => /map and directions/i.test(link.textContent)),
    false,
  );
  assert.equal(
    [...document.querySelectorAll('.v3-activity-presence h2')]
      .some((heading) => heading.textContent.trim() === 'Location'),
    false,
  );
});

test('release detail renders release moment with no fake end time or physical location', () => {
  const source = nativeReleaseSource();
  const activity = source.resources.activities[0];
  const document = documentFrom(renderV3ActivityDetail(source, activity.slug));
  const times = [...document.querySelectorAll('time')];
  assert.equal(times.length, 1);
  assert.equal(times[0].getAttribute('datetime'), activity.temporal.releaseAt);
  assert.match(document.body.textContent, /Release/);
  assert.equal(document.querySelectorAll('address,.v3-activity-presence').length, 0);
  assert.doesNotMatch(document.body.textContent, /Join online|Location/);
});

test('migrated physical detail retains business facts, managed media and legacy external action', () => {
  const { source } = migratedPhysicalReference();
  const activity = source.resources.activities[0];
  const document = documentFrom(renderV3ActivityDetail(source, activity.slug));
  assert.equal(document.querySelector('main').dataset.activityId, activity.id);
  assert.equal(document.querySelector('address').textContent, source.venue.business.address);
  if (activity.managedMedia.length > 0) {
    const image = document.querySelector('.v3-activity-media img');
    assert.ok(image);
    assert.equal(image.alt, activity.title);
  }
  if (activity.publicActions.length > 0) {
    const link = document.querySelector('[data-action-role="LEGACY_EXTERNAL"]');
    assert.equal(link.getAttribute('href'), activity.publicActions[0].href);
    assert.equal(link.textContent, activity.publicActions[0].label);
  }
});

test('activity-list preserves explicit stable-id order and never falls back to source order', () => {
  const source = clone(nativeCreatorSource());
  const original = clone(source.resources.activities[0]);
  const second = clone(original);
  second.id = 'live-session-two';
  second.slug = 'live-session-two';
  second.title = 'Live Session Two';
  source.resources.activities.push(second);
  source.site.pages[0].components[1].content.resourceIds = ['live-session-two', 'live-session-one'];
  const validated = createV3DeploymentAgnosticVenueSource(source);
  const document = documentFrom(renderV3Page(validated));
  assert.deepEqual(
    [...document.querySelectorAll('.v3-activity-card')].map((node) => node.dataset.resourceId),
    ['live-session-two', 'live-session-one'],
  );

  const missing = clone(source);
  missing.site.pages[0].components[1].content.resourceIds = ['missing-activity'];
  assert.throws(() => createV3DeploymentAgnosticVenueSource(missing), /missing activity/);
});

test('renderer escapes hostile source text without mutating canonical source', () => {
  const source = clone(nativeCreatorSource());
  source.resources.activities[0].title = 'Live <script>alert(1)</script> Session';
  source.resources.activities[0].description = 'Text & markup <img src=x onerror=alert(1)> remains text.';
  const validated = createV3DeploymentAgnosticVenueSource(source);
  const before = deriveV3DeploymentAgnosticVenueSourceDigest(validated);
  const html = renderV3ActivityDetail(validated, validated.resources.activities[0].slug);
  const document = documentFrom(html);
  assert.equal(document.querySelectorAll('script').length, 0);
  assert.equal(document.querySelectorAll('img[onerror]').length, 0);
  assert.equal(document.querySelector('h1').textContent, source.resources.activities[0].title);
  assert.match(document.querySelector('.v3-activity-description').textContent, /<img src=x onerror=alert\(1\)>/);
  assert.equal(deriveV3DeploymentAgnosticVenueSourceDigest(validated), before);
});

test('isolated v3 preview performs zero Hive RPC, Hive writes or provider writes by construction', async () => {
  const migrated = migratedPhysicalReference();
  const fixtures = [
    createV3PreviewFixture(migrated.source, { legacyEventRoutes: migrated.legacyEventRoutes }),
    createV3PreviewFixture(nativeCreatorSource()),
    createV3PreviewFixture(nativeReleaseSource()),
  ];
  for (const fixture of fixtures) {
    const home = await request(fixture.app).get('/').expect(200);
    const homeDocument = documentFrom(home.text);
    assert.ok(homeDocument.querySelector('main.v3-page'));
    assert.equal(
      homeDocument.querySelector('.v3-wordmark').textContent.trim(),
      fixture.source.venue.displayName,
    );

    const activity = fixture.source.resources.activities[0];
    const response = await request(fixture.app).get(`/activities/${activity.slug}`).expect(200);
    assert.match(response.text, new RegExp(activity.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.deepEqual(fixture.diagnostics, {
      hiveRpcAttempts: 0,
      hiveWrites: 0,
      providerWrites: 0,
    });
  }
  await request(fixtures[0].app)
    .get(`/events/${fixtures[0].source.resources.activities[0].slug}`)
    .expect(200);
});

test('public stylesheet includes narrow-viewport, focus-target and reduced-motion guardrails', () => {
  const css = renderV3PublicStylesheet();
  assert.match(css, /@media \(max-width:640px\)/);
  assert.match(css, /min-height:44px/);
  assert.match(css, /focus-visible/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.doesNotMatch(css, /northline|signal-room|northstar/i);
});
