'use strict';

const express = require('express');
const { localDateTimeToOffsetIso } = require('./admission');
const { buildViewModel } = require('./present');

function localInputValue(value, timezone) {
  const date = new Date(value);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

function valuesFor(activity, timezone) {
  return {
    startsLocal: localInputValue(activity.startsAt, timezone),
    endsLocal: localInputValue(activity.endsAt, timezone),
  };
}

function draftMutation(store, slug, body, label, mutator, manualPaths) {
  const revision = Number(body.expectedRevision);
  const digest = typeof body.expectedDraftDigest === 'string' ? body.expectedDraftDigest : '';
  if (typeof store.draftMutation === 'function') {
    return store.draftMutation(slug, revision, digest, (innerStore) => (
      innerStore.commit(slug, revision, label, mutator, manualPaths, digest)
    ));
  }
  return store.commit(slug, revision, label, mutator, manualPaths, digest);
}

function renderSchedule(res, snapshot, activity, { status = 200, values, errors = [] } = {}) {
  return res.status(status).render('candidate-c/activity-schedule', {
    pageTitle: `Schedule — ${activity.title}`,
    ...buildViewModel(snapshot),
    activity,
    values: values || valuesFor(activity, snapshot.draft.identity.timezone),
    errors,
  });
}

function createBetaRemediationRouter({ store } = {}) {
  if (!store) throw new TypeError('Beta remediation router requires a store.');
  const router = express.Router();

  router.get('/studio/:slug/activity/:activityId/schedule', (req, res) => {
    const snapshot = store.snapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);
    const activity = snapshot.draft.activities.find((item) => item.id === req.params.activityId);
    if (!activity) return res.sendStatus(404);
    return renderSchedule(res, snapshot, activity);
  });

  router.post('/studio/:slug/activity/:activityId/schedule', (req, res) => {
    const snapshot = store.snapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);
    const activity = snapshot.draft.activities.find((item) => item.id === req.params.activityId);
    if (!activity) return res.sendStatus(404);

    const values = {
      startsLocal: String(req.body.startsLocal || '').trim(),
      endsLocal: String(req.body.endsLocal || '').trim(),
    };
    const errors = [];
    if (!values.startsLocal) errors.push('Choose a start date and time.');
    if (!values.endsLocal) errors.push('Choose an end date and time.');

    let startsAt;
    let endsAt;
    if (!errors.length) {
      try {
        startsAt = localDateTimeToOffsetIso(values.startsLocal, snapshot.draft.identity.timezone);
        endsAt = localDateTimeToOffsetIso(values.endsLocal, snapshot.draft.identity.timezone);
        if (Date.parse(endsAt) <= Date.parse(startsAt)) errors.push('End time must be after start time.');
      } catch (_) {
        errors.push(`Choose real local times in ${snapshot.draft.identity.timezone}.`);
      }
    }
    if (errors.length) return renderSchedule(res, snapshot, activity, { status: 400, values, errors });

    const result = draftMutation(store, req.params.slug, req.body, 'reschedule-activity', (draft) => {
      const target = draft.activities.find((item) => item.id === req.params.activityId);
      if (!target) throw new Error('Activity not found');
      target.startsAt = startsAt;
      target.endsAt = endsAt;
    }, [
      `activities.${req.params.activityId}.startsAt`,
      `activities.${req.params.activityId}.endsAt`,
    ]);

    if (!result.ok) {
      if (['STALE_REVISION', 'STALE_DIGEST', 'INVALID_REVISION', 'INVALID_DRAFT_DIGEST'].includes(result.reason)) {
        const latest = store.snapshot(req.params.slug);
        const latestActivity = latest.draft.activities.find((item) => item.id === req.params.activityId);
        return renderSchedule(res, latest, latestActivity, {
          status: 409,
          values,
          errors: ['A newer working version exists. Reload the latest schedule before saving again.'],
        });
      }
      return res.status(result.reason === 'NOT_FOUND' ? 404 : 400).send('The schedule could not be saved.');
    }

    return res.redirect(303, `/candidate-c/studio/${encodeURIComponent(req.params.slug)}?scheduled=${encodeURIComponent(req.params.activityId)}`);
  });

  return router;
}

module.exports = { createBetaRemediationRouter, localInputValue };
