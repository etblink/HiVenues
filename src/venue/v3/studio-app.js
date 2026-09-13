'use strict';

const {
  SAFE_V3_STUDIO_ERROR: CORE_SAFE_V3_STUDIO_ERROR,
  createV3AuthoringStudioApp: createCoreV3AuthoringStudioApp,
} = require('./studio-app-core');
const {
  V3_PERSISTED_SOURCE_ABSENT,
} = require('./source-file');

// S4 authority remains delegated byte-for-byte to studio-app-core.js.
// Historical audit anchors: createV3ActivityAuthoringSession,
// atomicSaveV3DeploymentAgnosticVenueSourceFile.

const SAFE_V3_STUDIO_ERROR =
  'The requested Studio action was rejected. Review the current selection and state, then try an available action again.';

const S6_V3_STYLES = `
.studio-context{margin:.2rem 0 0;color:#57534e;font-size:.86rem;line-height:1.4}
.status[role="status"]{align-items:center}
.state-stage{display:inline-flex;align-items:center;min-height:32px;padding:6px 10px;border-radius:999px;background:#e7e5e4;color:#292524;font-size:.8rem;font-weight:800}
main[data-s6-studio-state="preview"] .state-stage{background:#fef3c7;color:#92400e}
main[data-s6-studio-state="unsaved"] .state-stage{background:#ffedd5;color:#9a3412}
main[data-s6-studio-state="saved"] .state-stage{background:#dcfce7;color:#166534}
.save-state[data-s6-workspace-state]{padding:10px 12px;border-radius:10px;background:#f5f5f4}
@media(max-width:900px){.status[role="status"]{width:100%}.state-stage{order:-1}}
`;

function convergenceError(label) {
  return new Error(`S6 v3 Studio convergence anchor drifted: ${label}`);
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

function createV3AuthoringStudioApp(sourceInput, options = {}) {
  const fixture = createCoreV3AuthoringStudioApp(sourceInput, options);
  const originalSend = fixture.app.response.send;
  fixture.app.response.send = function sendWithS6V3Convergence(body) {
    return originalSend.call(this, convergeV3StudioSurface(body, fixture));
  };
  return fixture;
}

module.exports = {
  SAFE_V3_STUDIO_ERROR,
  createV3AuthoringStudioApp,
};
