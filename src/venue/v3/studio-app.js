'use strict';

const express = require('express');
const {
  SAFE_V3_STUDIO_ERROR: CORE_SAFE_V3_STUDIO_ERROR,
  createV3AuthoringStudioApp: createCoreV3AuthoringStudioApp,
} = require('./studio-app-core');
const {
  V3_PERSISTED_SOURCE_ABSENT,
} = require('./source-file');

// S4 transaction and persistence authority remains delegated byte-for-byte to
// studio-app-core.js. The S9.4 adapter owns presentation/workflow gating only;
// it does not own semantic mutation, history, or durable persistence.

const SAFE_V3_STUDIO_ERROR =
  'The requested Studio action was rejected. Review the current selection and state, then try an available action again.';
const PENDING_PREVIEW_MESSAGE =
  'One change is already waiting in preview. Apply or discard it before previewing another change.';

const PROPOSAL_PATHS = new Set([
  '/v3-studio/text',
  '/v3-studio/lifecycle',
  '/v3-studio/access',
  '/v3-studio/temporal',
  '/v3-studio/presence',
  '/v3-studio/action-add',
  '/v3-studio/action-set',
  '/v3-studio/action-move',
  '/v3-studio/action-remove',
  '/v3-studio/media-add',
  '/v3-studio/media-move',
  '/v3-studio/media-remove',
]);

const SUCCESS_COUNTER_BY_PATH = new Map([
  ...[...PROPOSAL_PATHS].map((pathname) => [pathname, 'proposals']),
  ['/v3-studio/apply', 'applies'],
  ['/v3-studio/discard', 'discards'],
  ['/v3-studio/undo', 'undos'],
  ['/v3-studio/redo', 'redos'],
  ['/v3-studio/save', 'saveSuccesses'],
]);

const TOKEN_LABELS = Object.freeze({
  OCCURRENCE: 'Scheduled time',
  WINDOW: 'Time window',
  RELEASE: 'Release time',
  NONE: 'No attendance location',
  PHYSICAL_HOST_DEFAULT: 'In person',
  ONLINE: 'Online',
  HYBRID: 'In person + online',
  DRAFT: 'Draft',
  SCHEDULED: 'Scheduled',
  LIVE: 'Live now',
  COMPLETED: 'Completed',
  POSTPONED: 'Postponed',
  CANCELLED: 'Cancelled',
  UNSPECIFIED: 'No capacity limit shown',
  AVAILABLE: 'Spots available',
  FULL: 'At capacity',
  INFO: 'Learn more',
  TICKETS: 'Tickets',
  RSVP: 'RSVP',
  RESERVE: 'Reserve',
  WATCH: 'Watch',
  LISTEN: 'Listen',
  CALENDAR: 'Add to calendar',
});

const S6_V3_STYLES = `
.studio-context{margin:.2rem 0 0;color:#57534e;font-size:.86rem;line-height:1.4}
.status[role="status"]{align-items:center}
.state-stage{display:inline-flex;align-items:center;min-height:32px;padding:6px 10px;border-radius:999px;background:#e7e5e4;color:#292524;font-size:.8rem;font-weight:800}
main[data-s6-studio-state="preview"] .state-stage{background:#fef3c7;color:#92400e}
main[data-s6-studio-state="unsaved"] .state-stage{background:#ffedd5;color:#9a3412}
main[data-s6-studio-state="saved"] .state-stage{background:#dcfce7;color:#166534}
.save-state[data-s6-workspace-state]{padding:10px 12px;border-radius:10px;background:#f5f5f4}
.time-fields{display:grid;grid-template-columns:minmax(0,1fr) minmax(9rem,.42fr);gap:10px}.field-help{margin:0;color:#78716c;font-size:.8rem;font-weight:500}
.editor{gap:22px}.section h2{letter-spacing:-.01em}.entity-row>div:first-child span{text-align:right}
@media(max-width:900px){.status[role="status"]{width:100%}.state-stage{order:-1}.time-fields{grid-template-columns:1fr}}
`;

function convergenceError(label) {
  return new Error(`S6 v3 Studio convergence anchor drifted: ${label}`);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function replaceExactlyOnce(html, search, replacement, label) {
  const first = html.indexOf(search);
  if (first === -1) throw convergenceError(label);
  if (html.indexOf(search, first + search.length) !== -1) {
    throw convergenceError(`${label} is not unique`);
  }
  return `${html.slice(0, first)}${replacement}${html.slice(first + search.length)}`;
}

function replacePatternExactlyOnce(html, pattern, replacement, label) {
  const matches = [...html.matchAll(pattern)];
  if (matches.length !== 1) throw convergenceError(`${label} count ${matches.length}`);
  return html.replace(pattern, replacement);
}

function selectedActivityIdFromHtml(html) {
  const select = /<select name="activityId">([\s\S]*?)<\/select>/.exec(html)?.[1] || '';
  return /<option value="([^"]+)" selected>/.exec(select)?.[1] || null;
}

function selectedActivityFromHtml(html, source) {
  const id = selectedActivityIdFromHtml(html) || source.resources.activities[0]?.id;
  return source.resources.activities.find((activity) => activity.id === id) || source.resources.activities[0];
}

function splitCanonicalInstant(value) {
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.exec(String(value || ''));
  if (!match) throw convergenceError('canonical time editor value');
  return Object.freeze({ local: `${match[1]}:${match[2] || '00'}`, offset: match[3] === 'Z' ? '+00:00' : match[3] });
}

function joinCanonicalInstant(localValue, offsetValue) {
  const local = String(localValue || '');
  const offset = String(offsetValue || '');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(local)) throw new TypeError('local time is invalid');
  if (!/^[+-]\d{2}:\d{2}$/.test(offset)) throw new TypeError('UTC offset is invalid');
  return `${local.length === 16 ? `${local}:00` : local}${offset}`;
}

function temporalEditorMarkup(activity) {
  const kind = activity.temporal.kind;
  const hidden = `<input type="hidden" name="activityId" value="${escapeHtml(activity.id)}"><input type="hidden" name="kind" value="${escapeHtml(kind)}">`;
  const fields = [];
  const field = (label, prefix, value, required = true) => {
    if (!value && !required) {
      return `<div class="time-fields"><label>${label}<input type="datetime-local" step="1" name="${prefix}Local"></label><label>UTC offset<input name="${prefix}Offset" value="+00:00" pattern="[+-][0-9]{2}:[0-9]{2}" maxlength="6"></label></div>`;
    }
    const parts = splitCanonicalInstant(value);
    return `<div class="time-fields"><label>${label}<input type="datetime-local" step="1" name="${prefix}Local" value="${escapeHtml(parts.local)}"${required ? ' required' : ''}></label><label>UTC offset<input name="${prefix}Offset" value="${escapeHtml(parts.offset)}" pattern="[+-][0-9]{2}:[0-9]{2}" maxlength="6"${required ? ' required' : ''}></label></div>`;
  };
  if (kind === 'RELEASE') {
    fields.push(field('Release date and time', 'release', activity.temporal.releaseAt));
  } else {
    fields.push(field('Start date and time', 'start', activity.temporal.startAt));
    fields.push(field('End date and time', 'end', activity.temporal.endAt, false));
  }
  return `${hidden}${fields.join('')}<p class="field-help">Times are edited in the host’s local clock time with an explicit UTC offset. The canonical instant remains authoritative.</p><button type="submit">Preview timing</button>`;
}

function humanizeStudioTokens(html) {
  let output = html;
  for (const [token, label] of Object.entries(TOKEN_LABELS)) {
    output = output
      .replaceAll(`<span class="badge">${token}</span>`, `<span class="badge">${escapeHtml(label)}</span>`)
      .replaceAll(`>${token}</option>`, `>${escapeHtml(label)}</option>`)
      .replaceAll(`<strong>${token}</strong>`, `<strong>${escapeHtml(label)}</strong>`);
  }
  return output;
}

function convergeActivityPicker(html, source, selectedActivityId) {
  return replacePatternExactlyOnce(
    html,
    /<select name="activityId">[\s\S]*?<\/select>/g,
    `<select name="activityId">${source.resources.activities.map((activity) => `<option value="${escapeHtml(activity.id)}"${activity.id === selectedActivityId ? ' selected' : ''}>${escapeHtml(activity.title)}</option>`).join('')}</select>`,
    'activity picker labels',
  );
}

function convergeManagedMediaLabels(html, source) {
  let output = html;
  source.media.assets.forEach((asset, index) => {
    const label = `Managed image ${index + 1}`;
    output = output.replaceAll(`<span>${escapeHtml(asset.id)}</span>`, `<span>${label}</span>`);
    output = output.replaceAll(`>${escapeHtml(asset.id)}</option>`, `>${label}</option>`);
  });
  return output;
}

function deriveStudioState(fixture) {
  if (fixture.proposal()) {
    return Object.freeze({
      id: 'preview',
      label: 'Preview',
      workspaceState: 'preview-blocked',
      workspaceCopy: 'Preview is not applied. Apply or discard it before saving.',
    });
  }

  const persistence = fixture.persistence();
  if (!persistence.enabled) {
    return Object.freeze({
      id: 'session',
      label: 'Session draft',
      workspaceState: 'session',
      workspaceCopy: 'Session changes are in memory only.',
    });
  }

  if (persistence.persistedDigest === fixture.session().draftDigest) {
    return Object.freeze({
      id: 'saved',
      label: 'Saved workspace',
      workspaceState: 'saved',
      workspaceCopy: 'Accepted draft matches the saved workspace.',
    });
  }

  return Object.freeze({
    id: 'unsaved',
    label: 'Unsaved draft',
    workspaceState: 'unsaved',
    workspaceCopy: persistence.persistedDigest === V3_PERSISTED_SOURCE_ABSENT
      ? 'No workspace checkpoint has been saved yet.'
      : 'Accepted draft has unsaved workspace changes.',
  });
}

function convergeV3StudioSurface(html, fixture) {
  if (typeof html !== 'string' || !html.includes('<main class="shell v3-studio"')) {
    return html;
  }

  const source = fixture.session().draftSource;
  const activity = selectedActivityFromHtml(html, source);
  const state = deriveStudioState(fixture);
  let output = html;
  output = replacePatternExactlyOnce(
    output,
    /<title>HiVenues v3 Studio · ([^<]+)<\/title>/g,
    '<title>HiVenues Studio · $1</title>',
    'document title',
  );
  output = replaceExactlyOnce(
    output,
    '</style>',
    `${S6_V3_STYLES}\n</style>`,
    'document styles',
  );
  output = replaceExactlyOnce(
    output,
    '<main class="shell v3-studio"',
    `<main class="shell v3-studio" data-s6-product-convergence="true" data-s6-studio-state="${state.id}"`,
    'Studio root',
  );
  output = replaceExactlyOnce(
    output,
    '<header class="topbar"><div><div class="eyebrow">HiVenues v3 Studio · S4 journey</div><h1>',
    '<header class="topbar"><div><div class="eyebrow">HiVenues Studio</div><p class="studio-context">Activity workspace · Live generated preview</p><h1>',
    'product identity and orientation',
  );
  output = replaceExactlyOnce(
    output,
    '<div class="status">',
    `<div class="status" role="status" aria-label="Studio status" aria-live="polite" aria-atomic="true" data-s6-state-feedback="true"><span class="state-stage" data-s6-state="${state.id}">${state.label}</span>`,
    'Studio status region',
  );
  output = replaceExactlyOnce(
    output,
    '<section class="section"><h2>Activity</h2>',
    '<section class="section" data-s6-edit-selection="true"><h2>Edit activity</h2>',
    'editing section',
  );
  output = replaceExactlyOnce(
    output,
    '<label>Selected activity<select name="activityId">',
    '<label>Activity selection<select name="activityId">',
    'activity selection label',
  );
  output = convergeActivityPicker(output, source, activity.id);
  output = replacePatternExactlyOnce(
    output,
    /(<section class="section"><h2>Timing<\/h2><form method="post" action="\/v3-studio\/temporal">)[\s\S]*?(<\/form><\/section>)/g,
    `$1${temporalEditorMarkup(activity)}$2`,
    'human-oriented timing editor',
  );
  output = convergeManagedMediaLabels(output, source);
  output = humanizeStudioTokens(output);
  output = replacePatternExactlyOnce(
    output,
    /<p class="save-state">[^<]*<\/p>/g,
    `<p class="save-state" id="studio-workspace-state" data-s6-workspace-state="${state.workspaceState}">${state.workspaceCopy}</p>`,
    'workspace state copy',
  );
  if (output.includes(CORE_SAFE_V3_STUDIO_ERROR)) {
    output = replaceExactlyOnce(
      output,
      CORE_SAFE_V3_STUDIO_ERROR,
      SAFE_V3_STUDIO_ERROR,
      'safe rejection feedback',
    );
  }
  return output;
}

function normalizeTemporalBody(request) {
  if (request.method !== 'POST' || request.path !== '/v3-studio/temporal') return;
  const body = request.body || {};
  const kind = body.kind;
  if (kind === 'RELEASE') {
    request.body = {
      activityId: body.activityId,
      kind,
      releaseAt: joinCanonicalInstant(body.releaseLocal, body.releaseOffset),
    };
    return;
  }
  request.body = {
    activityId: body.activityId,
    kind,
    startAt: joinCanonicalInstant(body.startLocal, body.startOffset),
    endAt: body.endLocal ? joinCanonicalInstant(body.endLocal, body.endOffset) : '',
  };
}

function createV3AuthoringStudioApp(sourceInput, options = {}) {
  const fixture = createCoreV3AuthoringStudioApp(sourceInput, options);
  let pendingSafeMessage = null;
  const app = express();
  app.disable('x-powered-by');
  app.use(express.urlencoded({ extended: false, limit: '12kb', parameterLimit: 20 }));

  app.use((request, response, next) => {
    if (request.method === 'POST') {
      pendingSafeMessage = null;
      if (PROPOSAL_PATHS.has(request.path) && fixture.proposal()) {
        pendingSafeMessage = PENDING_PREVIEW_MESSAGE;
        const activityId = typeof request.body?.activityId === 'string' ? request.body.activityId : null;
        const suffix = activityId ? `?activityId=${encodeURIComponent(activityId)}` : '';
        return response.redirect(303, `/v3-studio${suffix}`);
      }
      try {
        normalizeTemporalBody(request);
      } catch (_error) {
        pendingSafeMessage = SAFE_V3_STUDIO_ERROR;
        const activityId = typeof request.body?.activityId === 'string' ? request.body.activityId : null;
        const suffix = activityId ? `?activityId=${encodeURIComponent(activityId)}` : '';
        return response.redirect(303, `/v3-studio${suffix}`);
      }
    }

    const before = fixture.diagnostics();
    const originalRedirect = response.redirect.bind(response);
    const originalSend = response.send.bind(response);

    response.redirect = (...args) => {
      if (request.method === 'POST') {
        const counter = SUCCESS_COUNTER_BY_PATH.get(request.path);
        if (counter) {
          const after = fixture.diagnostics();
          if (after[counter] === before[counter]) pendingSafeMessage = SAFE_V3_STUDIO_ERROR;
        }
      }
      return originalRedirect(...args);
    };

    response.send = (body) => {
      let output = body;
      if (
        request.method === 'GET'
        && request.path === '/v3-studio'
        && typeof output === 'string'
      ) {
        if (pendingSafeMessage) {
          output = replaceExactlyOnce(
            output,
            '<div class="layout">',
            `<p class="error" role="alert">${escapeHtml(pendingSafeMessage)}</p>\n<div class="layout">`,
            'safe rejection alert insertion',
          );
          pendingSafeMessage = null;
        }
        output = convergeV3StudioSurface(output, fixture);
      }
      return originalSend(output);
    };

    next();
  });

  app.use(fixture.app);

  return Object.freeze({
    ...fixture,
    app,
  });
}

module.exports = {
  PENDING_PREVIEW_MESSAGE,
  SAFE_V3_STUDIO_ERROR,
  createV3AuthoringStudioApp,
};