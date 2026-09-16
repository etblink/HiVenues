'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const request = require('supertest');
const { createDogfoodApp } = require('../src/candidate-c/dogfood-app');
const { CandidateCStore } = require('../src/candidate-c/store');

function rewriteActivity(store, slug, activityId) {
  const before = store.snapshot(slug);
  const result = store.commit(slug, before.revision, 'r2-draft-preview-continuity', (draft) => {
    const activity = draft.activities.find((item) => item.id === activityId);
    activity.title = 'Friday Night Assembly — Working Cut';
    activity.description = 'Draft-only room notes that must never escape into the released visitor surface.';
    activity.startsAt = '2026-09-19T21:00:00-07:00';
    activity.endsAt = '2026-09-20T00:15:00-07:00';
  }, [
    `activities.${activityId}.title`,
    `activities.${activityId}.description`,
    `activities.${activityId}.startsAt`,
    `activities.${activityId}.endsAt`,
  ], before.draftDigest);
  assert.equal(result.ok, true);
}

test('draft preview activity navigation, calendar, and back-link remain on the working snapshot', async () => {
  const store = new CandidateCStore();
  const app = createDogfoodApp({ store });
  const slug = 'northline-hall';
  const activitySlug = 'friday-night-assembly';
  const activityId = 'activity-northline-friday-001';
  rewriteActivity(store, slug, activityId);

  const previewHome = await request(app).get(`/candidate-c/studio/${slug}/preview`).expect(200);
  assert.match(previewHome.text, /Friday Night Assembly — Working Cut/);
  assert.match(previewHome.text, new RegExp(`/candidate-c/studio/${slug}/preview/activities/${activitySlug}`));
  assert.doesNotMatch(previewHome.text, new RegExp(`href="/candidate-c/${slug}/activities/${activitySlug}"`));

  const previewDetail = await request(app)
    .get(`/candidate-c/studio/${slug}/preview/activities/${activitySlug}`)
    .expect(200);
  assert.match(previewDetail.text, /Friday Night Assembly — Working Cut/);
  assert.match(previewDetail.text, /Draft-only room notes/);
  assert.match(previewDetail.text, new RegExp(`href="/candidate-c/studio/${slug}/preview"`));
  assert.match(previewDetail.text, /Draft preview/);
  assert.doesNotMatch(previewDetail.text, new RegExp(`action="/candidate-c/${slug}/activities/${activitySlug}/rsvp"`));

  const previewCalendar = await request(app)
    .get(`/candidate-c/studio/${slug}/preview/activities/${activitySlug}/calendar.ics`)
    .expect('Content-Type', /text\/calendar/)
    .expect(200);
  assert.match(previewCalendar.text, /SUMMARY:Friday Night Assembly — Working Cut/);
  assert.match(previewCalendar.text, /DTSTART:20260920T040000Z/);
  assert.match(previewCalendar.text, new RegExp(`URL:/candidate-c/studio/${slug}/preview/activities/${activitySlug}`));
  assert.doesNotMatch(previewCalendar.text, /DTSTART:20260919T023000Z/);

  const publicHome = await request(app).get(`/candidate-c/${slug}`).expect(200);
  assert.match(publicHome.text, /Friday Night Assembly/);
  assert.doesNotMatch(publicHome.text, /Working Cut/);

  const publicDetail = await request(app).get(`/candidate-c/${slug}/activities/${activitySlug}`).expect(200);
  assert.match(publicDetail.text, /Friday Night Assembly/);
  assert.doesNotMatch(publicDetail.text, /Draft-only room notes|Working Cut/);

  const publicCalendar = await request(app)
    .get(`/candidate-c/${slug}/activities/${activitySlug}/calendar.ics`)
    .expect(200);
  assert.match(publicCalendar.text, /SUMMARY:Friday Night Assembly/);
  assert.match(publicCalendar.text, /DTSTART:20260919T023000Z/);
  assert.doesNotMatch(publicCalendar.text, /Working Cut|20260920T040000Z/);
});

test('all admitted public Directions keep preview Activity links inside preview context', async () => {
  const store = new CandidateCStore();
  const app = createDogfoodApp({ store });
  const cases = [
    ['northline-hall', 'friday-night-assembly'],
    ['nova-ashby', 'soft-infrastructure-live-session'],
    ['harbor-and-hearth', 'sunday-harvest-table'],
  ];

  for (const [slug, activitySlug] of cases) {
    const preview = await request(app).get(`/candidate-c/studio/${slug}/preview`).expect(200);
    assert.match(preview.text, new RegExp(`/candidate-c/studio/${slug}/preview/activities/${activitySlug}`));
    assert.doesNotMatch(preview.text, new RegExp(`href="/candidate-c/${slug}/activities/${activitySlug}`));
  }
});
