'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const request = require('supertest');
const {
  PENDING_PREVIEW_MESSAGE,
} = require('../src/venue/v3/studio-app');
const {
  renderV3RobotsText,
  renderV3Route,
  renderV3SitemapXml,
} = require('../src/venue/v3/renderer');
const {
  createReferenceV3AuthoringStudioFixture,
} = require('./support/v3-authoring-studio-fixture');
const {
  migratedPhysicalReference,
  nativeCreatorSource,
  nativeReleaseSource,
} = require('./support/v3-reference-fixtures');

function selectedActivity(source) {
  return source.resources.activities.find((activity) => activity.publicActions.length > 0)
    || source.resources.activities[0];
}

function activityPath(activity) {
  return `/activities/${activity.slug}`;
}

function assertReleaseMetadata(html, canonicalPath) {
  assert.match(html, /<meta name="description" content="[^"]+">/);
  assert.match(html, new RegExp(`<link rel="canonical" href="https://release\\.example${canonicalPath.replaceAll('/', '\\/')}">`));
  assert.match(html, /<meta property="og:title" content="[^"]+">/);
  assert.match(html, /<meta property="og:description" content="[^"]+">/);
  assert.match(html, /<meta property="og:url" content="https:\/\/release\.example[^"]*">/);
  assert.match(html, /<script type="application\/ld\+json">\{"@context":"https:\/\/schema\.org"/);
}

test('S9.4 RB1 keeps the first pending preview when a second edit is attempted', async () => {
  const fixture = createReferenceV3AuthoringStudioFixture('nativeCreator');
  const activity = fixture.source.resources.activities[0];
  const originalLifecycle = activity.lifecycle;

  const first = await request(fixture.app)
    .post('/v3-studio/text')
    .type('form')
    .send({ activityId: activity.id, field: 'title', value: 'Signal Room — Late Session' });
  assert.equal(first.status, 303);
  assert.ok(fixture.proposal());
  const firstDigest = fixture.proposal().afterDigest;

  const second = await request(fixture.app)
    .post('/v3-studio/lifecycle')
    .type('form')
    .send({ activityId: activity.id, lifecycle: 'LIVE' });
  assert.equal(second.status, 303);
  assert.equal(fixture.proposal().afterDigest, firstDigest);

  const studio = await request(fixture.app).get(`/v3-studio?activityId=${encodeURIComponent(activity.id)}`);
  assert.equal(studio.status, 200);
  assert.match(studio.text, new RegExp(PENDING_PREVIEW_MESSAGE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  const apply = await request(fixture.app)
    .post('/v3-studio/apply')
    .type('form')
    .send({ activityId: activity.id });
  assert.equal(apply.status, 303);
  assert.equal(fixture.proposal(), null);
  const accepted = fixture.session().draftSource.resources.activities.find((candidate) => candidate.id === activity.id);
  assert.equal(accepted.title, 'Signal Room — Late Session');
  assert.equal(accepted.lifecycle, originalLifecycle);
});

test('S9.4 RB2 Studio edits local date/time plus explicit UTC offset while preserving canonical instants', async () => {
  const fixture = createReferenceV3AuthoringStudioFixture('nativeCreator');
  const activity = fixture.source.resources.activities[0];
  const studio = await request(fixture.app).get(`/v3-studio?activityId=${encodeURIComponent(activity.id)}`);

  assert.equal(studio.status, 200);
  assert.match(studio.text, /type="datetime-local"/);
  assert.match(studio.text, /UTC offset/);
  assert.doesNotMatch(studio.text, />live-session-one<\/option>/);
  assert.match(studio.text, />Open Room: Songs in Progress<\/option>/);
  assert.doesNotMatch(studio.text, /<span>[^<]*s4-nativecreator-promo/);

  const preview = await request(fixture.app)
    .post('/v3-studio/temporal')
    .type('form')
    .send({
      activityId: activity.id,
      kind: 'OCCURRENCE',
      startLocal: '2026-10-05T20:30:00',
      startOffset: '-07:00',
      endLocal: '2026-10-05T21:45:00',
      endOffset: '-07:00',
    });
  assert.equal(preview.status, 303);
  assert.equal(fixture.proposal().previewSource.resources.activities[0].temporal.startAt, '2026-10-05T20:30:00-07:00');
  assert.equal(fixture.proposal().previewSource.resources.activities[0].temporal.endAt, '2026-10-05T21:45:00-07:00');
});

test('S9.4 RB2/RB4 renders human time and puts essentials plus the primary action before supporting media', () => {
  const physical = migratedPhysicalReference().source;
  const activity = selectedActivity(physical);
  const html = renderV3Route(physical, activityPath(activity), { canonicalOrigin: 'https://release.example' });

  assert.match(html, /September 18, 2026/);
  assert.match(html, /UTC−07:00/);
  assert.doesNotMatch(html, />2026-09-18T20:00:00-07:00</);
  assert.match(html, />Scheduled</);
  assert.match(html, />Tickets<\/a>/);
  assert.ok(html.indexOf('v3-activity-essentials') < html.indexOf('v3-activity-gallery'));
  assert.ok(html.indexOf('>Tickets</a>') < html.indexOf('v3-activity-gallery'));
});

test('S9.4 RB3 references read as credible fictional hosts and use credible local managed art', async () => {
  const references = [
    migratedPhysicalReference().source,
    nativeCreatorSource(),
    nativeReleaseSource(),
  ];
  const forbidden = /reference exists|used to prove|proving that|synthetic reference|demo quartet|synthetic s4|managed media proof/i;

  for (const source of references) {
    const activity = selectedActivity(source);
    const home = renderV3Route(source, '/', { canonicalOrigin: 'https://release.example' });
    const detail = renderV3Route(source, activityPath(activity), { canonicalOrigin: 'https://release.example' });
    assert.doesNotMatch(home, forbidden);
    assert.doesNotMatch(detail, forbidden);
    assert.doesNotMatch(source.venue.displayName, / Example$/);
  }

  assert.doesNotMatch(migratedPhysicalReference().source.venue.business.address, /example/i);
  assert.equal(nativeCreatorSource().resources.activities[0].title, 'Open Room: Songs in Progress');

  for (const referenceId of ['nativeCreator', 'nativeRelease']) {
    const fixture = createReferenceV3AuthoringStudioFixture(referenceId);
    const home = fixture.source.site.pages.find((page) => page.id === fixture.source.site.homePageId);
    const hero = home.components.find((component) => component.kind === 'venue-hero');
    assert.ok(hero.content.media, `${referenceId}: managed hero media`);
    const image = await request(fixture.app).get(hero.content.media.src);
    assert.equal(image.status, 200, `${referenceId}: managed hero media route`);
    assert.match(image.headers['content-type'], /image\/svg\+xml/);
    assert.doesNotMatch(image.text, /<text\b/i, `${referenceId}: no visible placeholder label in artwork`);
  }

  const release = nativeReleaseSource();
  const releaseActivity = release.resources.activities[0];
  const releaseHtml = renderV3Route(release, activityPath(releaseActivity), { canonicalOrigin: 'https://release.example' });
  assert.match(releaseHtml, /data-action-role="LISTEN"/);
  assert.match(releaseHtml, />Listen to Afterglow<\/a>/);
});

test('S9.4 RB5 emits route-derived metadata, structured data, robots, and sitemap inventory', async () => {
  const references = [
    migratedPhysicalReference().source,
    nativeCreatorSource(),
    nativeReleaseSource(),
  ];

  for (const source of references) {
    const activity = selectedActivity(source);
    const home = renderV3Route(source, '/', { canonicalOrigin: 'https://release.example' });
    const detail = renderV3Route(source, activityPath(activity), { canonicalOrigin: 'https://release.example' });
    assertReleaseMetadata(home, '/');
    assertReleaseMetadata(detail, activityPath(activity));

    const robots = renderV3RobotsText(source, { canonicalOrigin: 'https://release.example' });
    const sitemap = renderV3SitemapXml(source, { canonicalOrigin: 'https://release.example' });
    assert.match(robots, /User-agent: \*/);
    assert.match(robots, /Sitemap: https:\/\/release\.example\/sitemap\.xml/);
    assert.match(sitemap, /<loc>https:\/\/release\.example\/<\/loc>/);
    assert.match(sitemap, new RegExp(`<loc>https://release\\.example${activityPath(activity).replaceAll('/', '\\/')}<\\/loc>`));
  }

  const preview = require('./support/v3-reference-fixtures').createV3PreviewFixture(nativeReleaseSource());
  const robotsResponse = await request(preview.app).get('/robots.txt').set('Host', 'release.example');
  const sitemapResponse = await request(preview.app).get('/sitemap.xml').set('Host', 'release.example');
  assert.equal(robotsResponse.status, 200);
  assert.match(robotsResponse.headers['content-type'], /text\/plain/);
  assert.equal(sitemapResponse.status, 200);
  assert.match(sitemapResponse.headers['content-type'], /(?:application|text)\/xml/);

  const review = createReferenceV3AuthoringStudioFixture('nativeRelease');
  const reviewHome = await request(review.app).get('/v3-preview/').set('Host', 'review.example');
  const reviewActivity = await request(review.app)
    .get('/v3-preview/activities/afterglow-release')
    .set('Host', 'review.example');
  const reviewRobots = await request(review.app).get('/robots.txt').set('Host', 'review.example');
  const reviewSitemap = await request(review.app).get('/sitemap.xml').set('Host', 'review.example');

  assert.equal(reviewHome.status, 200);
  assert.match(reviewHome.text, /<link rel="canonical" href="http:\/\/review\.example\/">/);
  assert.match(reviewHome.text, /<meta property="og:url" content="http:\/\/review\.example\/">/);
  assert.equal(reviewActivity.status, 200);
  assert.match(reviewActivity.text, /<link rel="canonical" href="http:\/\/review\.example\/activities\/afterglow-release">/);
  assert.equal(reviewRobots.status, 200);
  assert.match(reviewRobots.text, /Sitemap: http:\/\/review\.example\/sitemap\.xml/);
  assert.equal(reviewSitemap.status, 200);
  assert.match(reviewSitemap.text, /<loc>http:\/\/review\.example\/activities\/afterglow-release<\/loc>/);
});
