'use strict';

const {
  V2AuthoringStudioError,
  renderV2AuthoringStudioSurface: renderCoreV2AuthoringStudioSurface,
} = require('./studio-authoring-core');

const S6_SHELL_STYLES = `
.technical-details{margin-left:auto;max-width:430px;color:#29494b}
.technical-details summary{display:flex;align-items:center;min-height:44px;cursor:pointer;font-size:.72rem;font-weight:800}
.technical-details summary:focus-visible{outline:3px solid #0f766e;outline-offset:3px}
.technical-details[open]{padding:0 10px 10px;border:1px solid #ccd3d6;border-radius:10px;background:#fff}
.technical-details .technical-copy{margin:0 0 8px;color:#536166;font-size:.65rem;line-height:1.4}
.technical-details .digest-pair{margin-top:0}
.state-copy{display:grid;grid-template-columns:auto 1fr;column-gap:8px;align-items:center}
.state-copy .state-stage{grid-row:1 / span 2;display:inline-flex;align-items:center;justify-content:center;min-height:28px;padding:4px 9px;border:1px solid #a8b7b7;border-radius:999px;background:#fff;color:#29494b;font-size:.66rem;font-weight:900;white-space:nowrap}
.state-copy .state-stage[data-s6-state="preview"]{border-color:#d69e2e;background:#fff8df;color:#6b4f12}
.state-copy .state-stage[data-s6-state="saved"]{border-color:#9bc8be;background:#edf7f4;color:#176b61}
.state-copy .state-stage[data-s6-state="unsaved"]{border-color:#c0a35a;background:#fffaf0;color:#6b4f12}
@media(max-width:720px){.technical-details{margin-left:0;width:100%;max-width:none}.state-copy{width:100%}}
`;

function shellError(label) {
  return new V2AuthoringStudioError(`S6.1 Studio shell anchor drifted: ${label}`);
}

function interactionError(label) {
  return new V2AuthoringStudioError(`S6.2 Studio interaction anchor drifted: ${label}`);
}

function stateError(label) {
  return new V2AuthoringStudioError(`S6.3 Studio state anchor drifted: ${label}`);
}

function replaceExactlyOnce(html, search, replacement, label) {
  const first = html.indexOf(search);
  if (first === -1) throw shellError(label);
  if (html.indexOf(search, first + search.length) !== -1) throw shellError(`${label} is not unique`);
  return `${html.slice(0, first)}${replacement}${html.slice(first + search.length)}`;
}

function replaceInteractionExactlyOnce(html, search, replacement, label) {
  const first = html.indexOf(search);
  if (first === -1) throw interactionError(label);
  if (html.indexOf(search, first + search.length) !== -1) {
    throw interactionError(`${label} is not unique`);
  }
  return `${html.slice(0, first)}${replacement}${html.slice(first + search.length)}`;
}

function replaceInteractionBounded(html, search, replacement, {
  label,
  min,
  max,
}) {
  const count = html.split(search).length - 1;
  if (count < min || count > max) {
    throw interactionError(`${label} count ${count} outside ${min}-${max}`);
  }
  return html.replaceAll(search, replacement);
}

function convergeTechnicalDetails(html) {
  const pattern = /<div class="digest-pair"><div class="digest-chip"><strong>Accepted<\/strong><code>[^<]+<\/code><\/div><div class="digest-chip"><strong>Canvas<\/strong><code>[^<]+<\/code><\/div><\/div>/g;
  const matches = [...html.matchAll(pattern)];
  if (matches.length !== 1) throw shellError('digest diagnostics');
  const digestPair = matches[0][0];
  const replacement = `<details class="technical-details"><summary>Technical details</summary><p class="technical-copy">Stable semantic IDs · Real v2 renderer · draft and Canvas digests</p>${digestPair}</details>`;
  return html.replace(pattern, replacement);
}

function convergeV2AuthoringStudioShell(html) {
  if (typeof html !== 'string' || !html.includes('data-v2-authoring-studio="true"')) {
    throw shellError('authoring Studio document');
  }

  let output = html;
  output = replaceExactlyOnce(
    output,
    '<p class="eyebrow">HiVenues · Authoring Studio</p>',
    '<p class="eyebrow">HiVenues Studio</p>',
    'product identity',
  );
  output = replaceExactlyOnce(
    output,
    '<header class="panel-head"><h2 id="authoring-tree-heading">Page Structure</h2><span>Stable semantic IDs</span></header>',
    '<header class="panel-head"><h2 id="authoring-tree-heading">Page Structure</h2><span>Pages and sections</span></header>',
    'structure orientation',
  );
  output = replaceExactlyOnce(
    output,
    '<header class="panel-head"><h2 id="authoring-canvas-heading" tabindex="-1">Venue Canvas</h2><span>Real v2 renderer</span></header>',
    '<header class="panel-head"><h2 id="authoring-canvas-heading" tabindex="-1">Venue Canvas</h2><span>Live venue preview</span></header>',
    'Canvas orientation',
  );
  output = convergeTechnicalDetails(output);
  output = replaceExactlyOnce(
    output,
    '</head>',
    `<style data-s6-studio-shell="true">${S6_SHELL_STYLES}</style>\n</head>`,
    'document head',
  );
  return output;
}

function convergeV2AuthoringStudioInteraction(html) {
  let output = html;
  output = replaceInteractionExactlyOnce(
    output,
    '<aside class="panel inspector-panel" aria-labelledby="authoring-inspector-heading">',
    '<aside class="panel inspector-panel" aria-labelledby="authoring-inspector-heading" data-s6-edit-selection="true">',
    'editing panel',
  );
  output = replaceInteractionExactlyOnce(
    output,
    '<header class="panel-head"><h2 id="authoring-inspector-heading">Inspector</h2><span>Content · resources · structure · media · theme</span></header>',
    '<header class="panel-head"><h2 id="authoring-inspector-heading">Edit selection</h2><span>Content · resources · structure · media · theme</span></header>',
    'editing panel heading',
  );
  output = replaceInteractionBounded(
    output,
    '<p class="eyebrow">Selected context</p>',
    '<p class="eyebrow">Selection</p>',
    { label: 'selection context label', min: 1, max: 2 },
  );
  output = replaceInteractionBounded(
    output,
    '<p class="eyebrow">Selected field</p>',
    '<p class="eyebrow">Editing field</p>',
    { label: 'field editing label', min: 0, max: 1 },
  );
  return output;
}

function studioState(html) {
  const persistent = html.includes('data-studio-persistent="true"');
  const persisted = html.includes('data-studio-persisted="true"');
  const preview = html.includes('data-preview-active="true"');

  if (preview) return { id: 'preview', label: 'Preview' };
  if (persistent && persisted) return { id: 'saved', label: 'Saved workspace' };
  if (persistent) return { id: 'unsaved', label: 'Unsaved draft' };
  return { id: 'session', label: 'Session draft' };
}

function convergeV2AuthoringStudioStateFeedback(html) {
  const state = studioState(html);
  let output = html;

  output = output.replace(
    '<section class="statebar" aria-label="Authoring state">',
    '<section class="statebar" aria-label="Studio status" role="status" aria-live="polite" aria-atomic="true" data-s6-state-feedback="true">',
  );
  if (!output.includes('data-s6-state-feedback="true"')) {
    throw stateError('primary status region');
  }

  const pattern = /<div class="state-copy"><strong>([^<]+)<\/strong><span>([^<]+)<\/span><\/div>/g;
  const matches = [...output.matchAll(pattern)];
  if (matches.length !== 1) throw stateError('primary status copy');
  const [matched, title, detail] = matches[0];
  const replacement = `<div class="state-copy"><span class="state-stage" data-s6-state="${state.id}">${state.label}</span><strong>${title}</strong><span id="studio-status-detail">${detail}</span></div>`;
  output = output.replace(matched, replacement);

  const mainPattern = /<main class="studio" ([^>]+)>/g;
  const mainMatches = [...output.matchAll(mainPattern)];
  if (mainMatches.length !== 1) throw stateError('Studio root');
  output = output.replace(
    mainMatches[0][0],
    `<main class="studio" data-s6-studio-state="${state.id}" ${mainMatches[0][1]}>`,
  );

  if (output.includes('<section class="history-card persistence-card"')) {
    const workspaceState = state.id === 'preview'
      ? 'preview-blocked'
      : state.id === 'saved'
        ? 'saved'
        : 'unsaved';
    output = output.replace(
      '<section class="history-card persistence-card" aria-labelledby="persistence-heading">',
      `<section class="history-card persistence-card" aria-labelledby="persistence-heading" aria-describedby="studio-status-detail" data-s6-workspace-state="${workspaceState}">`,
    );
    if (!output.includes('data-s6-workspace-state=')) throw stateError('workspace status');
  }

  return output;
}

function renderV2AuthoringStudioSurface(options) {
  const shell = convergeV2AuthoringStudioShell(renderCoreV2AuthoringStudioSurface(options));
  const interaction = convergeV2AuthoringStudioInteraction(shell);
  return convergeV2AuthoringStudioStateFeedback(interaction);
}

module.exports = {
  V2AuthoringStudioError,
  renderV2AuthoringStudioSurface,
};
