'use strict';

const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const {
  ADD_ACTIVITY_MANAGED_MEDIA,
  ADD_ACTIVITY_PUBLIC_ACTION,
  BEFORE_MANAGED_MEDIA,
  BEFORE_PUBLIC_ACTION,
  END_OF_MANAGED_MEDIA,
  END_OF_PUBLIC_ACTIONS,
  MOVE_ACTIVITY_MANAGED_MEDIA,
  MOVE_ACTIVITY_PUBLIC_ACTION,
  REMOVE_ACTIVITY_MANAGED_MEDIA,
  REMOVE_ACTIVITY_PUBLIC_ACTION,
  SET_ACTIVITY_ACCESS,
  SET_ACTIVITY_LIFECYCLE,
  SET_ACTIVITY_PRESENCE,
  SET_ACTIVITY_PUBLIC_ACTION,
  SET_ACTIVITY_TEMPORAL,
  SET_ACTIVITY_TEXT,
  applyV3ActivityAuthoringProposal,
  createV3ActivityAuthoringSession,
  discardV3ActivityAuthoringProposal,
  proposeV3ActivityAuthoringCommand,
  redoV3ActivityAuthoringSession,
  undoV3ActivityAuthoringSession,
} = require('./authoring-transaction');
const {
  deriveV3DeploymentAgnosticVenueSourceDigest,
} = require('./source');
const {
  V3_PERSISTED_SOURCE_ABSENT,
  atomicSaveV3DeploymentAgnosticVenueSourceFile,
  loadV3DeploymentAgnosticVenueSourceFile,
} = require('./source-file');
const {
  renderV3PublicStylesheet,
  renderV3Route,
} = require('./renderer');

const PUBLIC_ROOT = path.join(__dirname, '..', '..', '..', 'public');
const SAFE_V3_STUDIO_ERROR = 'That Studio change could not be previewed. Your accepted draft is unchanged.';
const ACTION_ROLES = Object.freeze(['INFO', 'TICKETS', 'RSVP', 'RESERVE', 'WATCH', 'LISTEN', 'CALENDAR']);
const LIFECYCLES = Object.freeze(['DRAFT', 'SCHEDULED', 'LIVE', 'COMPLETED', 'POSTPONED', 'CANCELLED']);
const CAPACITIES = Object.freeze(['UNSPECIFIED', 'AVAILABLE', 'FULL']);

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function requiredScalar(value, label, max = 240) {
  if (typeof value !== 'string' || value.length === 0 || value.length > max) {
    throw new TypeError(`${label} is invalid`);
  }
  return value;
}

function optionalScalar(value, label, max = 500) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > max) throw new TypeError(`${label} is invalid`);
  return value;
}

function exactChoice(value, label, allowed) {
  if (typeof value !== 'string' || !allowed.includes(value)) throw new TypeError(`${label} is invalid`);
  return value;
}

function oneBody(request, allowedKeys) {
  const keys = Object.keys(request.body || {});
  if (keys.some((key) => !allowedKeys.includes(key))) throw new TypeError('request contains unsupported fields');
  const result = {};
  for (const key of allowedKeys) {
    if (Object.hasOwn(request.body || {}, key)) result[key] = request.body[key];
  }
  return result;
}

function selectedActivity(source, requestedId) {
  const id = requestedId || source.resources.activities[0]?.id;
  const activity = source.resources.activities.find((candidate) => candidate.id === id);
  if (!activity) throw new TypeError('selected activity does not exist');
  return activity;
}

function command(session, type, fields) {
  return {
    schemaVersion: 1,
    type,
    expectedDraftDigest: session.draftDigest,
    ...fields,
  };
}

function actionTarget(activityId, actionId) {
  return { activityId, actionId };
}

function mediaTarget(activityId, assetId, role) {
  return { activityId, assetId, role };
}

function option(value, current) {
  return `<option value="${escapeHtml(value)}"${value === current ? ' selected' : ''}>${escapeHtml(value.replaceAll('_', ' '))}</option>`;
}

function temporalFields(activity) {
  const temporal = activity.temporal;
  if (temporal.kind === 'RELEASE') {
    return `<label>Release time<input name="releaseAt" value="${escapeHtml(temporal.releaseAt)}" required maxlength="80"></label>`;
  }
  return `<label>Start time<input name="startAt" value="${escapeHtml(temporal.startAt)}" required maxlength="80"></label>
    <label>End time<input name="endAt" value="${escapeHtml(temporal.endAt || '')}" maxlength="80"></label>`;
}

function presenceFields(activity) {
  const presence = activity.presence;
  if (!['ONLINE', 'HYBRID'].includes(presence.kind)) {
    return `<p class="field-note">${presence.kind === 'NONE' ? 'No attendance location is required for this activity.' : 'This activity uses the host’s accepted physical presence.'}</p>`;
  }
  const destination = presence.destinations[0];
  return `<input type="hidden" name="destinationId" value="${escapeHtml(destination.id)}">
    <label>Destination label<input name="destinationLabel" value="${escapeHtml(destination.label)}" required maxlength="120"></label>
    <label>Destination URL<input name="destinationHref" type="url" value="${escapeHtml(destination.href)}" required maxlength="500"></label>
    <button type="submit">Preview presence</button>`;
}

function actionMarkup(activity) {
  const rows = activity.publicActions.map((action, index) => `<li class="entity-row" data-action-id="${escapeHtml(action.id)}">
    <div><strong>${escapeHtml(action.role.replaceAll('_', ' '))}</strong><span>${escapeHtml(action.label)}</span></div>
    <form method="post" action="/v3-studio/action-set">
      <input type="hidden" name="activityId" value="${escapeHtml(activity.id)}">
      <input type="hidden" name="actionId" value="${escapeHtml(action.id)}">
      <label>Label<input name="label" value="${escapeHtml(action.label)}" required maxlength="120"></label>
      <label>HTTPS destination<input name="href" type="url" value="${escapeHtml(action.href)}" required maxlength="500"></label>
      <button type="submit">Preview action edit</button>
    </form>
    <div class="row-actions">
      ${index > 0 ? `<form method="post" action="/v3-studio/action-move"><input type="hidden" name="activityId" value="${escapeHtml(activity.id)}"><input type="hidden" name="actionId" value="${escapeHtml(action.id)}"><input type="hidden" name="beforeActionId" value="${escapeHtml(activity.publicActions[index - 1].id)}"><button type="submit">Move earlier</button></form>` : ''}
      <form method="post" action="/v3-studio/action-remove"><input type="hidden" name="activityId" value="${escapeHtml(activity.id)}"><input type="hidden" name="actionId" value="${escapeHtml(action.id)}"><button type="submit">Remove action</button></form>
    </div>
  </li>`).join('');
  return rows || '<li class="empty-row">No public actions yet.</li>';
}

function mediaMarkup(source, activity) {
  const rows = activity.managedMedia.map((usage, index) => {
    const asset = source.media.assets.find((candidate) => candidate.id === usage.assetId);
    return `<li class="entity-row" data-media-key="${escapeHtml(`${usage.assetId}:${usage.role}`)}">
      <div><strong>${escapeHtml(usage.role.replaceAll('_', ' '))}</strong><span>${escapeHtml(asset?.id || usage.assetId)}</span></div>
      <div class="row-actions">
        ${index > 0 ? `<form method="post" action="/v3-studio/media-move"><input type="hidden" name="activityId" value="${escapeHtml(activity.id)}"><input type="hidden" name="assetId" value="${escapeHtml(usage.assetId)}"><input type="hidden" name="role" value="${escapeHtml(usage.role)}"><input type="hidden" name="beforeAssetId" value="${escapeHtml(activity.managedMedia[index - 1].assetId)}"><input type="hidden" name="beforeRole" value="${escapeHtml(activity.managedMedia[index - 1].role)}"><button type="submit">Move earlier</button></form>` : ''}
        <form method="post" action="/v3-studio/media-remove"><input type="hidden" name="activityId" value="${escapeHtml(activity.id)}"><input type="hidden" name="assetId" value="${escapeHtml(usage.assetId)}"><input type="hidden" name="role" value="${escapeHtml(usage.role)}"><button type="submit">Remove media</button></form>
      </div>
    </li>`;
  }).join('');
  return rows || '<li class="empty-row">No activity media yet.</li>';
}

function renderStudio({ session, proposal, activityId, persistence, error = null }) {
  const acceptedSource = session.draftSource;
  const activity = selectedActivity(acceptedSource, activityId);
  const previewSource = proposal ? proposal.previewSource : acceptedSource;
  const previewActivity = selectedActivity(previewSource, activity.id);
  const previewDigest = proposal ? proposal.afterDigest : session.draftDigest;
  const availablePromoAssets = acceptedSource.media.assets.filter((asset) => !activity.managedMedia.some((usage) => usage.assetId === asset.id && usage.role === 'PROMO'));
  const previewPath = `/v3-preview/activities/${encodeURIComponent(previewActivity.slug)}`;
  const canEditPresence = ['ONLINE', 'HYBRID'].includes(activity.presence.kind);

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>HiVenues v3 Studio · ${escapeHtml(activity.title)}</title>
<style>
:root{font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#1c1917;background:#f5f5f4}*{box-sizing:border-box}body{margin:0}button,input,select,textarea{font:inherit}button{min-height:44px;padding:10px 14px;border:0;border-radius:10px;background:#292524;color:white;font-weight:700;cursor:pointer}button.secondary{background:#e7e5e4;color:#292524}.shell{max-width:1500px;margin:0 auto;padding:20px}.topbar{display:flex;gap:14px;align-items:center;justify-content:space-between;flex-wrap:wrap}.eyebrow{text-transform:uppercase;letter-spacing:.08em;font-size:.75rem;font-weight:800;color:#57534e}.status{display:flex;gap:8px;flex-wrap:wrap}.badge{background:#e7e5e4;border-radius:999px;padding:6px 10px;font-size:.8rem}.preview-badge{background:#fef3c7;color:#92400e}.error{padding:12px;border-radius:10px;background:#fee2e2;color:#991b1b}.layout{display:grid;grid-template-columns:minmax(360px,520px) minmax(0,1fr);gap:18px;margin-top:18px}.editor,.preview-card{background:white;border:1px solid #e7e5e4;border-radius:16px;box-shadow:0 8px 30px rgba(28,25,23,.06)}.editor{padding:18px;display:grid;gap:18px}.preview-card{padding:12px;position:sticky;top:12px;height:calc(100vh - 24px)}iframe{width:100%;height:100%;border:1px solid #d6d3d1;border-radius:12px;background:white}.section{border-top:1px solid #e7e5e4;padding-top:16px}.section:first-child{border-top:0;padding-top:0}.section h2{font-size:1rem;margin:0 0 10px}.field-note,.empty-row{color:#78716c}.stack,form{display:grid;gap:10px}label{display:grid;gap:5px;font-size:.86rem;font-weight:700}input,select,textarea{width:100%;min-height:44px;padding:9px 10px;border:1px solid #a8a29e;border-radius:9px;background:white;color:#1c1917}textarea{min-height:90px;resize:vertical}.entity-list{list-style:none;padding:0;margin:0;display:grid;gap:10px}.entity-row{border:1px solid #e7e5e4;border-radius:12px;padding:10px;display:grid;gap:10px}.entity-row>div:first-child{display:flex;justify-content:space-between;gap:10px}.entity-row span{color:#57534e}.row-actions,.history-actions{display:flex;gap:8px;flex-wrap:wrap}.row-actions form,.history-actions form{display:inline}.activity-picker{display:flex;gap:8px;align-items:end}.activity-picker label{flex:1}.save-state{font-size:.82rem;color:#57534e}@media(max-width:900px){.layout{grid-template-columns:1fr}.preview-card{position:relative;top:auto;height:70vh}.shell{padding:12px}}
</style></head><body><main class="shell v3-studio" data-accepted-digest="${session.draftDigest}" data-preview-digest="${previewDigest}" data-preview-active="${proposal ? 'true' : 'false'}" data-studio-persistent="${persistence.enabled ? 'true' : 'false'}" data-studio-runtime-wired="false" data-external-effects="false">
<header class="topbar"><div><div class="eyebrow">HiVenues v3 Studio · S4 journey</div><h1>${escapeHtml(acceptedSource.venue.displayName)}</h1></div><div class="status"><span class="badge">${escapeHtml(activity.temporal.kind)}</span><span class="badge">${escapeHtml(activity.presence.kind)}</span>${proposal ? '<span class="badge preview-badge">Preview — not applied</span>' : '<span class="badge">Accepted draft</span>'}</div></header>
${error ? `<p class="error" role="alert">${escapeHtml(error)}</p>` : ''}
<div class="layout"><div class="editor">
<section class="section"><h2>Activity</h2><form method="get" action="/v3-studio" class="activity-picker"><label>Selected activity<select name="activityId">${acceptedSource.resources.activities.map((candidate) => option(candidate.id, activity.id)).join('')}</select></label><button type="submit">Open</button></form></section>
<section class="section"><h2>Visitor-facing copy</h2><form method="post" action="/v3-studio/text"><input type="hidden" name="activityId" value="${escapeHtml(activity.id)}"><input type="hidden" name="field" value="title"><label>Title<input name="value" value="${escapeHtml(activity.title)}" required maxlength="160"></label><button type="submit">Preview title</button></form><form method="post" action="/v3-studio/text"><input type="hidden" name="activityId" value="${escapeHtml(activity.id)}"><input type="hidden" name="field" value="description"><label>Description<textarea name="value" maxlength="1000">${escapeHtml(activity.description || '')}</textarea></label><button type="submit">Preview description</button></form></section>
<section class="section"><h2>Status and access</h2><form method="post" action="/v3-studio/lifecycle"><input type="hidden" name="activityId" value="${escapeHtml(activity.id)}"><label>Lifecycle<select name="lifecycle">${LIFECYCLES.map((value) => option(value, activity.lifecycle)).join('')}</select></label><button type="submit">Preview lifecycle</button></form><form method="post" action="/v3-studio/access"><input type="hidden" name="activityId" value="${escapeHtml(activity.id)}"><label>Capacity<select name="capacity">${CAPACITIES.map((value) => option(value, activity.access.capacity)).join('')}</select></label><label>Access note<input name="note" value="${escapeHtml(activity.access.note || '')}" maxlength="500"></label><button type="submit">Preview access</button></form></section>
<section class="section"><h2>Timing</h2><form method="post" action="/v3-studio/temporal"><input type="hidden" name="activityId" value="${escapeHtml(activity.id)}"><input type="hidden" name="kind" value="${escapeHtml(activity.temporal.kind)}">${temporalFields(activity)}<button type="submit">Preview timing</button></form></section>
<section class="section"><h2>Presence</h2><form method="post" action="/v3-studio/presence"><input type="hidden" name="activityId" value="${escapeHtml(activity.id)}"><input type="hidden" name="kind" value="${escapeHtml(activity.presence.kind)}">${presenceFields(activity)}</form>${!canEditPresence ? '' : '<p class="field-note">This edits the existing semantic destination; it does not create or authenticate an external account.</p>'}</section>
<section class="section"><h2>Public actions</h2><ul class="entity-list">${actionMarkup(activity)}</ul><form method="post" action="/v3-studio/action-add"><input type="hidden" name="activityId" value="${escapeHtml(activity.id)}"><label>Action purpose<select name="role">${ACTION_ROLES.map((value) => option(value, '')).join('')}</select></label><label>Label<input name="label" required maxlength="120"></label><label>HTTPS destination<input name="href" type="url" required maxlength="500"></label><button type="submit">Preview new action</button></form></section>
<section class="section"><h2>Promotional media</h2><ul class="entity-list">${mediaMarkup(acceptedSource, activity)}</ul>${availablePromoAssets.length ? `<form method="post" action="/v3-studio/media-add"><input type="hidden" name="activityId" value="${escapeHtml(activity.id)}"><label>Managed asset<select name="assetId">${availablePromoAssets.map((asset) => option(asset.id, '')).join('')}</select></label><button type="submit">Preview promotional media</button></form>` : '<p class="field-note">No additional managed assets are available for promotional use.</p>'}</section>
<section class="section"><h2>Review changes</h2>${proposal ? `<div class="history-actions"><form method="post" action="/v3-studio/apply"><input type="hidden" name="activityId" value="${escapeHtml(activity.id)}"><button type="submit">Apply to draft</button></form><form method="post" action="/v3-studio/discard"><input type="hidden" name="activityId" value="${escapeHtml(activity.id)}"><button class="secondary" type="submit">Discard preview</button></form></div>` : '<p class="field-note">Preview an edit before applying it.</p>'}<div class="history-actions"><form method="post" action="/v3-studio/undo"><input type="hidden" name="activityId" value="${escapeHtml(activity.id)}"><button class="secondary" type="submit"${session.canUndo ? '' : ' disabled'}>Undo</button></form><form method="post" action="/v3-studio/redo"><input type="hidden" name="activityId" value="${escapeHtml(activity.id)}"><button class="secondary" type="submit"${session.canRedo ? '' : ' disabled'}>Redo</button></form>${persistence.enabled ? `<form method="post" action="/v3-studio/save"><input type="hidden" name="activityId" value="${escapeHtml(activity.id)}"><button type="submit"${proposal ? ' disabled' : ''}>Save workspace</button></form>` : ''}</div>${persistence.enabled ? `<p class="save-state">Persisted digest: ${escapeHtml(persistence.persistedDigest)}</p>` : '<p class="save-state">This reference session is in memory only.</p>'}</section>
</div><section class="preview-card" aria-label="Generated experience preview"><iframe title="Generated activity preview" src="${previewPath}"></iframe></section></div></main></body></html>`;
}

function createV3AuthoringStudioApp(sourceInput, options = {}) {
  const sourceFilename = options.sourceFilename || null;
  const legacyEventRoutes = options.legacyEventRoutes || {};
  let openingSource = typeof sourceInput === 'function' ? sourceInput() : sourceInput;
  let persistedDigest = V3_PERSISTED_SOURCE_ABSENT;
  if (sourceFilename && fs.existsSync(sourceFilename)) {
    openingSource = loadV3DeploymentAgnosticVenueSourceFile(sourceFilename);
    persistedDigest = deriveV3DeploymentAgnosticVenueSourceDigest(openingSource);
  }
  if (!openingSource) throw new TypeError('v3 Studio requires an opening source');
  let session = createV3ActivityAuthoringSession(openingSource);
  let proposal = null;
  let lastError = null;
  const diagnostics = {
    proposals: 0,
    applies: 0,
    discards: 0,
    undos: 0,
    redos: 0,
    saveRequests: 0,
    saveSuccesses: 0,
    persistentWrites: 0,
    freshReopens: 0,
    hiveRpcAttempts: 0,
    hiveWrites: 0,
    providerWrites: 0,
    payments: 0,
    signingAttempts: 0,
    mediaUploads: 0,
    reservationMutations: 0,
    ticketPurchases: 0,
    deployments: 0,
  };
  const app = express();
  app.disable('x-powered-by');
  app.use(express.urlencoded({ extended: false, limit: '12kb', parameterLimit: 16 }));
  app.use(express.static(PUBLIC_ROOT, { fallthrough: true, index: false }));

  function persistence() {
    return { enabled: Boolean(sourceFilename), persistedDigest };
  }

  function previewSource() {
    return proposal ? proposal.previewSource : session.draftSource;
  }

  function redirect(response, activityId) {
    const suffix = activityId ? `?activityId=${encodeURIComponent(activityId)}` : '';
    response.redirect(303, `/v3-studio${suffix}`);
  }

  function propose(type, fields) {
    proposal = proposeV3ActivityAuthoringCommand(session, command(session, type, fields));
    diagnostics.proposals += 1;
  }

  function guarded(handler) {
    return (request, response) => {
      try {
        lastError = null;
        handler(request, response);
      } catch (_error) {
        proposal = null;
        lastError = SAFE_V3_STUDIO_ERROR;
        const activityId = typeof request.body?.activityId === 'string' ? request.body.activityId : null;
        redirect(response, activityId);
      }
    };
  }

  app.get('/__hivenues-v3/styles.css', (_request, response) => response.type('text/css').send(renderV3PublicStylesheet()));
  app.use('/v3-preview', (request, response) => {
    try {
      response.set('Cache-Control', 'no-store');
      response.type('html').send(renderV3Route(previewSource(), request.path || '/', { legacyEventRoutes }));
    } catch (error) {
      response.status(404).type('text').send(error.message);
    }
  });
  app.get('/v3-studio', guarded((request, response) => {
    const activityId = typeof request.query.activityId === 'string' ? request.query.activityId : null;
    response.set('Cache-Control', 'no-store');
    response.type('html').send(renderStudio({ session, proposal, activityId, persistence: persistence(), error: lastError }));
    lastError = null;
  }));

  app.post('/v3-studio/text', guarded((request, response) => {
    const body = oneBody(request, ['activityId', 'field', 'value']);
    const activityId = requiredScalar(body.activityId, 'activity id', 100);
    const field = exactChoice(body.field, 'text field', ['title', 'description']);
    propose(SET_ACTIVITY_TEXT, { target: { activityId }, field, value: field === 'description' ? optionalScalar(body.value, 'description', 1000) : requiredScalar(body.value, 'title', 160) });
    redirect(response, activityId);
  }));
  app.post('/v3-studio/lifecycle', guarded((request, response) => {
    const body = oneBody(request, ['activityId', 'lifecycle']);
    const activityId = requiredScalar(body.activityId, 'activity id', 100);
    propose(SET_ACTIVITY_LIFECYCLE, { target: { activityId }, lifecycle: exactChoice(body.lifecycle, 'lifecycle', LIFECYCLES) });
    redirect(response, activityId);
  }));
  app.post('/v3-studio/access', guarded((request, response) => {
    const body = oneBody(request, ['activityId', 'capacity', 'note']);
    const activityId = requiredScalar(body.activityId, 'activity id', 100);
    propose(SET_ACTIVITY_ACCESS, { target: { activityId }, access: { capacity: exactChoice(body.capacity, 'capacity', CAPACITIES), note: optionalScalar(body.note, 'access note') } });
    redirect(response, activityId);
  }));
  app.post('/v3-studio/temporal', guarded((request, response) => {
    const body = oneBody(request, ['activityId', 'kind', 'startAt', 'endAt', 'releaseAt']);
    const activityId = requiredScalar(body.activityId, 'activity id', 100);
    const activity = selectedActivity(session.draftSource, activityId);
    const kind = exactChoice(body.kind, 'temporal kind', ['OCCURRENCE', 'WINDOW', 'RELEASE']);
    if (kind !== activity.temporal.kind) throw new TypeError('S4 does not transform temporal forms');
    const temporal = kind === 'RELEASE'
      ? { kind, releaseAt: requiredScalar(body.releaseAt, 'release time', 80) }
      : { kind, startAt: requiredScalar(body.startAt, 'start time', 80), endAt: optionalScalar(body.endAt, 'end time', 80) };
    propose(SET_ACTIVITY_TEMPORAL, { target: { activityId }, temporal });
    redirect(response, activityId);
  }));
  app.post('/v3-studio/presence', guarded((request, response) => {
    const body = oneBody(request, ['activityId', 'kind', 'destinationId', 'destinationLabel', 'destinationHref']);
    const activityId = requiredScalar(body.activityId, 'activity id', 100);
    const activity = selectedActivity(session.draftSource, activityId);
    const kind = exactChoice(body.kind, 'presence kind', ['ONLINE', 'HYBRID']);
    if (kind !== activity.presence.kind) throw new TypeError('S4 does not transform presence forms');
    propose(SET_ACTIVITY_PRESENCE, {
      target: { activityId },
      presence: {
        kind,
        destinations: [{
          id: requiredScalar(body.destinationId, 'destination id', 100),
          label: requiredScalar(body.destinationLabel, 'destination label', 120),
          href: requiredScalar(body.destinationHref, 'destination href', 500),
        }],
      },
    });
    redirect(response, activityId);
  }));
  app.post('/v3-studio/action-add', guarded((request, response) => {
    const body = oneBody(request, ['activityId', 'role', 'label', 'href']);
    const activityId = requiredScalar(body.activityId, 'activity id', 100);
    propose(ADD_ACTIVITY_PUBLIC_ACTION, {
      target: { activityId },
      role: exactChoice(body.role, 'action role', ACTION_ROLES),
      label: requiredScalar(body.label, 'action label', 120),
      href: requiredScalar(body.href, 'action href', 500),
      destination: { kind: END_OF_PUBLIC_ACTIONS },
    });
    redirect(response, activityId);
  }));
  app.post('/v3-studio/action-set', guarded((request, response) => {
    const body = oneBody(request, ['activityId', 'actionId', 'label', 'href']);
    const activityId = requiredScalar(body.activityId, 'activity id', 100);
    propose(SET_ACTIVITY_PUBLIC_ACTION, {
      target: actionTarget(activityId, requiredScalar(body.actionId, 'action id', 140)),
      label: requiredScalar(body.label, 'action label', 120),
      href: requiredScalar(body.href, 'action href', 500),
    });
    redirect(response, activityId);
  }));
  app.post('/v3-studio/action-move', guarded((request, response) => {
    const body = oneBody(request, ['activityId', 'actionId', 'beforeActionId']);
    const activityId = requiredScalar(body.activityId, 'activity id', 100);
    propose(MOVE_ACTIVITY_PUBLIC_ACTION, {
      target: actionTarget(activityId, requiredScalar(body.actionId, 'action id', 140)),
      destination: { kind: BEFORE_PUBLIC_ACTION, beforeActionId: requiredScalar(body.beforeActionId, 'destination action id', 140) },
    });
    redirect(response, activityId);
  }));
  app.post('/v3-studio/action-remove', guarded((request, response) => {
    const body = oneBody(request, ['activityId', 'actionId']);
    const activityId = requiredScalar(body.activityId, 'activity id', 100);
    propose(REMOVE_ACTIVITY_PUBLIC_ACTION, { target: actionTarget(activityId, requiredScalar(body.actionId, 'action id', 140)) });
    redirect(response, activityId);
  }));
  app.post('/v3-studio/media-add', guarded((request, response) => {
    const body = oneBody(request, ['activityId', 'assetId']);
    const activityId = requiredScalar(body.activityId, 'activity id', 100);
    propose(ADD_ACTIVITY_MANAGED_MEDIA, { target: { activityId }, assetId: requiredScalar(body.assetId, 'asset id', 140), role: 'PROMO', destination: { kind: END_OF_MANAGED_MEDIA } });
    redirect(response, activityId);
  }));
  app.post('/v3-studio/media-move', guarded((request, response) => {
    const body = oneBody(request, ['activityId', 'assetId', 'role', 'beforeAssetId', 'beforeRole']);
    const activityId = requiredScalar(body.activityId, 'activity id', 100);
    propose(MOVE_ACTIVITY_MANAGED_MEDIA, {
      target: mediaTarget(activityId, requiredScalar(body.assetId, 'asset id', 140), requiredScalar(body.role, 'media role', 80)),
      destination: { kind: BEFORE_MANAGED_MEDIA, beforeAssetId: requiredScalar(body.beforeAssetId, 'destination asset id', 140), beforeRole: requiredScalar(body.beforeRole, 'destination media role', 80) },
    });
    redirect(response, activityId);
  }));
  app.post('/v3-studio/media-remove', guarded((request, response) => {
    const body = oneBody(request, ['activityId', 'assetId', 'role']);
    const activityId = requiredScalar(body.activityId, 'activity id', 100);
    propose(REMOVE_ACTIVITY_MANAGED_MEDIA, { target: mediaTarget(activityId, requiredScalar(body.assetId, 'asset id', 140), requiredScalar(body.role, 'media role', 80)) });
    redirect(response, activityId);
  }));
  app.post('/v3-studio/apply', guarded((request, response) => {
    const body = oneBody(request, ['activityId']);
    const activityId = requiredScalar(body.activityId, 'activity id', 100);
    if (!proposal) throw new TypeError('no proposal to apply');
    session = applyV3ActivityAuthoringProposal(session, proposal);
    proposal = null;
    diagnostics.applies += 1;
    redirect(response, activityId);
  }));
  app.post('/v3-studio/discard', guarded((request, response) => {
    const body = oneBody(request, ['activityId']);
    const activityId = requiredScalar(body.activityId, 'activity id', 100);
    if (!proposal) throw new TypeError('no proposal to discard');
    session = discardV3ActivityAuthoringProposal(session, proposal);
    proposal = null;
    diagnostics.discards += 1;
    redirect(response, activityId);
  }));
  app.post('/v3-studio/undo', guarded((request, response) => {
    const body = oneBody(request, ['activityId']);
    const activityId = requiredScalar(body.activityId, 'activity id', 100);
    if (proposal) throw new TypeError('preview must be resolved before undo');
    session = undoV3ActivityAuthoringSession(session);
    diagnostics.undos += 1;
    redirect(response, activityId);
  }));
  app.post('/v3-studio/redo', guarded((request, response) => {
    const body = oneBody(request, ['activityId']);
    const activityId = requiredScalar(body.activityId, 'activity id', 100);
    if (proposal) throw new TypeError('preview must be resolved before redo');
    session = redoV3ActivityAuthoringSession(session);
    diagnostics.redos += 1;
    redirect(response, activityId);
  }));
  app.post('/v3-studio/save', guarded((request, response) => {
    const body = oneBody(request, ['activityId']);
    const activityId = requiredScalar(body.activityId, 'activity id', 100);
    diagnostics.saveRequests += 1;
    if (!sourceFilename || proposal) throw new TypeError('workspace save is unavailable');
    const saved = atomicSaveV3DeploymentAgnosticVenueSourceFile(sourceFilename, session.draftSource, { expectedDigest: persistedDigest });
    diagnostics.persistentWrites += 1;
    persistedDigest = saved.persistedDigest;
    const reopened = loadV3DeploymentAgnosticVenueSourceFile(sourceFilename);
    diagnostics.freshReopens += 1;
    if (deriveV3DeploymentAgnosticVenueSourceDigest(reopened) !== session.draftDigest) throw new TypeError('fresh reopen digest mismatch');
    diagnostics.saveSuccesses += 1;
    redirect(response, activityId);
  }));

  return Object.freeze({
    app,
    diagnostics: () => Object.freeze({ ...diagnostics }),
    session: () => session,
    proposal: () => proposal,
    persistence: () => Object.freeze(persistence()),
    authority: Object.freeze({ persistent: Boolean(sourceFilename), runtimeWired: false, externalEffects: false }),
    legacyEventRoutes: Object.freeze({ ...legacyEventRoutes }),
  });
}

module.exports = {
  SAFE_V3_STUDIO_ERROR,
  createV3AuthoringStudioApp,
};
