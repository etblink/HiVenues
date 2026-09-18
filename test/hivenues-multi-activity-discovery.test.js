'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const request = require('supertest');
const { createHiVenuesApp } = require('../src/product/app');
const { HiVenuesStore } = require('../src/product/store');

const CASES = [
  { slug: 'northline-hall', expectedMarker: 'More on the wall' },
  { slug: 'nova-ashby', expectedMarker: 'ACTIVITY INDEX' },
  { slug: 'harbor-and-hearth', expectedMarker: 'Other dates & activities' },
];

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function addSecondActivity(store, slug) {
  const before = store.snapshot(slug);
  const first = before.draft.activities[0];
  assert(first, `${slug} fixture must start with an Activity`);
  const secondId = `activity-${slug}-second-r3`;
  const secondSlug = 'second-scheduled-activity';
  const secondTitle = `Second Scheduled Activity — ${slug}`;
  const result = store.commit(slug, before.revision, 'r3-add-second-activity', (draft) => {
    const source = draft.activities[0];
    draft.activities.push({
      ...structuredClone(source),
      id: secondId,
      slug: secondSlug,
      title: secondTitle,
      description: `A second released scheduled Activity for ${slug} that must remain ordinarily discoverable.`,
      startsAt: '2026-10-10T19:00:00-07:00',
      endsAt: '2026-10-10T21:00:00-07:00',
      lifecycle: 'scheduled',
    });
  }, [`activities.${secondId}`], before.draftDigest);
  assert.equal(result.ok, true);
  return { firstId: first.id, secondSlug, secondTitle };
}

function releaseCurrent(store, slug) {
  const snapshot = store.snapshot(slug);
  const released = store.createRelease(slug, snapshot.revision, snapshot.draftDigest);
  assert.equal(released.ok, true);
  return released.release;
}

function completeFirstActivity(store, slug, activityId) {
  const before = store.snapshot(slug);
  const result = store.editActivityStatus(
    slug,
    activityId,
    'completed',
    'This Activity has concluded.',
    before.revision,
    before.draftDigest,
  );
  assert.equal(result.ok, true);
}

test('every released relevant Activity remains discoverable when the featured Activity is completed', async () => {
  for (const scenario of CASES) {
    const store = new HiVenuesStore();
    const app = createHiVenuesApp({ store });
    const initial = await request(app).get(`/hivenues/${scenario.slug}`).expect(200);
    assert.doesNotMatch(initial.text, new RegExp(escapeRegex(scenario.expectedMarker)));

    const added = addSecondActivity(store, scenario.slug);
    releaseCurrent(store, scenario.slug);
    completeFirstActivity(store, scenario.slug, added.firstId);
    const finalRelease = releaseCurrent(store, scenario.slug);

    const live = store.publicSnapshot(scenario.slug);
    assert.equal(live.liveReleaseId, finalRelease.id);
    assert.equal(live.draft.activities.length, 2);
    assert.equal(live.draft.activities[0].lifecycle, 'completed');
    assert.equal(live.draft.activities[1].lifecycle, 'scheduled');

    const home = await request(app).get(`/hivenues/${scenario.slug}`).expect(200);
    assert.match(home.text, new RegExp(escapeRegex(scenario.expectedMarker)));
    assert.match(home.text, new RegExp(escapeRegex(added.secondTitle)));
    assert.match(home.text, new RegExp(escapeRegex(`/hivenues/${scenario.slug}/activities/${added.secondSlug}`)));

    const detail = await request(app)
      .get(`/hivenues/${scenario.slug}/activities/${added.secondSlug}`)
      .expect(200);
    assert.match(detail.text, new RegExp(escapeRegex(added.secondTitle)));
  }
});

test('working preview uses the same featured/remainder discovery contract without exposing it publicly before Release', async () => {
  const store = new HiVenuesStore();
  const app = createHiVenuesApp({ store });
  const slug = 'harbor-and-hearth';
  const added = addSecondActivity(store, slug);

  const preview = await request(app).get(`/hivenues/studio/${slug}/preview`).expect(200);
  assert.match(preview.text, /Other dates & activities/);
  assert.match(preview.text, new RegExp(escapeRegex(added.secondTitle)));
  assert.match(preview.text, new RegExp(escapeRegex(`/hivenues/studio/${slug}/preview/activities/${added.secondSlug}`)));

  const publicHome = await request(app).get(`/hivenues/${slug}`).expect(200);
  assert.doesNotMatch(publicHome.text, new RegExp(escapeRegex(added.secondTitle)));
});
