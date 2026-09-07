'use strict';

const { URLSearchParams } = require('node:url');
const {
  V2_READ_ONLY_STUDIO_VIEWPORTS,
  createV2ReadOnlyStudioModel,
} = require('./studio-read-only');
const {
  ADD_COMPONENT,
  BEFORE_COMPONENT,
  END_OF_PAGE,
  MOVE_COMPONENT,
  REMOVE_COMPONENT,
  getV2ComponentRemovalContext,
  listV2ComponentAddDestinations,
  listV2ComponentMoveDestinations,
  resolveV2AuthoringTarget,
} = require('./authoring-transaction');

class V2AuthoringStudioError extends Error {
  constructor(message) {
    super(`HiVenues v2 authoring Studio error: ${message}`);
    this.name = 'V2AuthoringStudioError';
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function strictLocalPath(value, label) {
  if (typeof value !== 'string' || !/^\/(?!\/)[^?#\s\\]*$/.test(value)) {
    throw new V2AuthoringStudioError(`${label} must be a same-origin local path`);
  }
  return value;
}

function humanize(value) {
  const result = String(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replaceAll('-', ' ')
    .replaceAll('_', ' ')
    .trim();
  return result ? result[0].toUpperCase() + result.slice(1) : '';
}

function selectionHref(studioPath, model, overrides = {}) {
  const query = new URLSearchParams({
    nodeId: overrides.nodeId ?? model.selection.nodeId,
    viewport: overrides.viewport ?? model.selection.viewport,
  });
  const fieldId = Object.hasOwn(overrides, 'fieldId')
    ? overrides.fieldId
    : model.selection.fieldId;
  if (fieldId) query.set('fieldId', fieldId);
  return `${studioPath}?${query.toString()}`;
}

function editableField(source, nodeId, fieldId) {
  try {
    return resolveV2AuthoringTarget(source, { nodeId, fieldId });
  } catch {
    return null;
  }
}

function renderTree(model, studioPath) {
  return model.treeRows.map((row) => {
    const href = selectionHref(studioPath, model, {
      nodeId: row.selectionId,
      fieldId: null,
    });
    return `<li style="--depth:${row.depth}"><a class="tree-link${row.selected ? ' is-selected' : ''}" href="${escapeHtml(href)}"${row.selected ? ' aria-current="location"' : ''}><span><strong>${escapeHtml(row.label)}</strong><small>${escapeHtml(humanize(row.kind))}</small></span>${row.selected ? '<span class="selected-chip">Selected</span>' : ''}</a></li>`;
  }).join('');
}

function renderCanvasCards(model, studioPath) {
  return model.canvasCards.map((card) => {
    const href = selectionHref(studioPath, model, {
      nodeId: card.selectionId,
      fieldId: null,
    });
    return `<a class="canvas-card${card.selected ? ' is-selected' : ''}" href="${escapeHtml(href)}"${card.selected ? ' aria-current="location"' : ''}><span><strong>${escapeHtml(card.label)}</strong><small>${escapeHtml(humanize(card.kind))}</small></span><span aria-hidden="true">→</span></a>`;
  }).join('');
}

function renderViewportOptions(model, studioPath) {
  return Object.entries(V2_READ_ONLY_STUDIO_VIEWPORTS).map(([id, viewport]) => {
    const href = selectionHref(studioPath, model, { viewport: id });
    return `<a class="viewport-option${model.viewport.id === id ? ' is-selected' : ''}" href="${escapeHtml(href)}"${model.viewport.id === id ? ' aria-current="true"' : ''}><strong>${escapeHtml(viewport.label)}</strong><span>${viewport.width} × ${viewport.height}</span></a>`;
  }).join('');
}

function renderFields(model, source, studioPath) {
  if (model.inspector.fields.length === 0) {
    return '<p class="muted">Choose a page or semantic component with editable text fields.</p>';
  }

  return `<ul class="field-list">${model.inspector.fields.map((field) => {
    const resolved = editableField(source, model.selection.nodeId, field.fieldId);
    const href = resolved
      ? selectionHref(studioPath, model, { fieldId: field.fieldId })
      : null;
    const content = `<span><strong>${escapeHtml(field.label)}</strong><small>${escapeHtml(field.valueSummary)}</small></span><span class="ownership-chip">${escapeHtml(resolved ? 'Editable' : humanize(field.ownership))}</span>`;
    if (!href) return `<li><div class="field-link is-locked" aria-disabled="true">${content}</div></li>`;
    return `<li><a class="field-link${field.selected ? ' is-selected' : ''}" href="${escapeHtml(href)}"${field.selected ? ' aria-current="location"' : ''}>${content}</a></li>`;
  }).join('')}</ul>`;
}

function matchingFieldProposal(proposal, model) {
  if (!proposal || proposal.command.type !== 'SET_FIELD' || !model.selection.fieldId) return false;
  return proposal.command.target.nodeId === model.selection.nodeId
    && proposal.command.target.fieldId === model.selection.fieldId;
}

function matchingMoveProposal(proposal, model) {
  return Boolean(
    proposal
    && proposal.command.type === MOVE_COMPONENT
    && proposal.command.target.nodeId === model.selection.nodeId
  );
}

function matchingAddProposal(proposal, model) {
  return Boolean(
    proposal
    && proposal.command.type === ADD_COMPONENT
    && proposal.command.target.nodeId === model.selection.nodeId
  );
}

function matchingRemoveProposal(proposal, model) {
  return Boolean(
    proposal
    && proposal.command.type === REMOVE_COMPONENT
    && proposal.command.target.nodeId === model.selection.nodeId
  );
}

function componentAddContext(source, nodeId) {
  try {
    return listV2ComponentAddDestinations(source, { nodeId });
  } catch {
    return null;
  }
}

function componentRemovalContext(source, nodeId) {
  try {
    return getV2ComponentRemovalContext(source, { nodeId });
  } catch {
    return null;
  }
}
function componentMoveContext(source, nodeId) {
  try {
    return listV2ComponentMoveDestinations(source, { nodeId });
  } catch {
    return null;
  }
}

function componentLabel(model, componentId) {
  const selectionId = `component:${componentId}`;
  const card = model.canvasCards.find((candidate) => candidate.selectionId === selectionId);
  if (card) return card.label;
  const row = model.treeRows.find((candidate) => candidate.selectionId === selectionId);
  return row?.label || componentId;
}

function destinationLabel(model, destination) {
  if (destination.kind === END_OF_PAGE) return 'End of page';
  if (destination.kind === BEFORE_COMPONENT) {
    return `Before ${componentLabel(model, destination.beforeComponentId)}`;
  }
  return 'Unknown destination';
}

function renderProposalActions(model, actionPaths) {
  const field = model.selection.fieldId
    ? `<input type="hidden" name="fieldId" value="${escapeHtml(model.selection.fieldId)}">`
    : '';
  return `<div class="proposal-actions">
    <form method="post" action="${escapeHtml(actionPaths.apply)}">
      <input type="hidden" name="nodeId" value="${escapeHtml(model.selection.nodeId)}">
      ${field}
      <input type="hidden" name="viewport" value="${escapeHtml(model.selection.viewport)}">
      <button class="button primary" type="submit">Apply to draft</button>
    </form>
    <form method="post" action="${escapeHtml(actionPaths.discard)}">
      <input type="hidden" name="nodeId" value="${escapeHtml(model.selection.nodeId)}">
      ${field}
      <input type="hidden" name="viewport" value="${escapeHtml(model.selection.viewport)}">
      <button class="button secondary" type="submit">Discard preview</button>
    </form>
  </div>`;
}

function renderAddEditor({ model, session, proposal, source, actionPaths }) {
  const context = componentAddContext(source, model.selection.nodeId);
  if (!context) return '';
  const isProposalTarget = matchingAddProposal(proposal, model);
  const activeCatalog = isProposalTarget ? proposal.command.catalogItemId : context.catalog[0]?.id;
  const activeDestination = isProposalTarget ? proposal.command.destination : context.destinations.at(-1);
  const catalogOptions = context.catalog.map((item) =>
    `<option value="${escapeHtml(item.id)}"${item.id === activeCatalog ? ' selected' : ''}>${escapeHtml(item.label)}</option>`
  ).join('');
  const destinationOptions = context.destinations.map((destination) => {
    const value = destination.kind === END_OF_PAGE
      ? END_OF_PAGE
      : `${BEFORE_COMPONENT}:${destination.beforeComponentId}`;
    const selected = activeDestination
      && activeDestination.kind === destination.kind
      && (destination.kind === END_OF_PAGE || activeDestination.beforeComponentId === destination.beforeComponentId);
    return `<option value="${escapeHtml(value)}"${selected ? ' selected' : ''}>${escapeHtml(destinationLabel(model, destination))}</option>`;
  }).join('');
  const status = isProposalTarget
    ? '<div class="preview-state" role="status"><strong>Preview — not applied</strong><span>The Canvas is rendering the catalog component proposal. The accepted session draft is unchanged.</span></div>'
    : '<div class="accepted-state"><strong>Accepted session draft</strong><span>Memory only · not saved · not published</span></div>';

  return `<section class="editor-card" aria-labelledby="component-add-heading">
    <p class="eyebrow">Component library</p>
    <h3 id="component-add-heading">Add component</h3>
    <p class="target-path">${escapeHtml(context.pageId)} · ${escapeHtml(humanize(context.ownership))}</p>
    ${status}
    <form class="edit-form" method="post" action="${escapeHtml(actionPaths.add)}">
      <input type="hidden" name="nodeId" value="${escapeHtml(model.selection.nodeId)}">
      <input type="hidden" name="viewport" value="${escapeHtml(model.selection.viewport)}">
      <input type="hidden" name="expectedDraftDigest" value="${escapeHtml(session.draftDigest)}">
      <label for="authoring-catalog-item">Component</label>
      <select id="authoring-catalog-item" name="catalogItemId" required>${catalogOptions}</select>
      <label for="authoring-add-destination">Position</label>
      <select id="authoring-add-destination" name="destination" required>${destinationOptions}</select>
      <p class="form-help">HiVenues owns the component type, recipe, defaults, responsive behavior, and stable ID. You choose only the semantic component and its position on this page.</p>
      <button class="button primary" type="submit">Preview component</button>
    </form>
    ${isProposalTarget ? renderProposalActions(model, actionPaths) : ''}
  </section>`;
}

function renderRemoveEditor({ model, session, proposal, source, actionPaths }) {
  const context = componentRemovalContext(source, model.selection.nodeId);
  if (!context?.eligible) return '';
  const isProposalTarget = matchingRemoveProposal(proposal, model);
  const status = isProposalTarget
    ? '<div class="preview-state" role="status"><strong>Preview — not applied</strong><span>The Canvas is rendering this component removed. The accepted session draft still contains it.</span></div>'
    : '<div class="accepted-state"><strong>Accepted session draft</strong><span>Memory only · not saved · not published</span></div>';

  return `<section class="editor-card" aria-labelledby="component-remove-heading">
    <p class="eyebrow">Component library</p>
    <h3 id="component-remove-heading">Remove component</h3>
    <p class="target-path">${escapeHtml(context.componentId)} · approved removable component</p>
    ${status}
    ${isProposalTarget ? renderProposalActions(model, actionPaths) : `<form class="edit-form" method="post" action="${escapeHtml(actionPaths.remove)}">
      <input type="hidden" name="nodeId" value="${escapeHtml(model.selection.nodeId)}">
      <input type="hidden" name="viewport" value="${escapeHtml(model.selection.viewport)}">
      <input type="hidden" name="expectedDraftDigest" value="${escapeHtml(session.draftDigest)}">
      <p class="form-help">Removal is limited to approved catalog-backed components. Undo restores the exact server-owned component snapshot and order.</p>
      <button class="button secondary" type="submit">Preview removal</button>
    </form>`}
  </section>`;
}

function renderMoveEditor({ model, session, proposal, source, actionPaths }) {
  const context = componentMoveContext(source, model.selection.nodeId);
  if (!context) {
    return '<section class="editor-card"><p class="eyebrow">Edit</p><h3>Select a field</h3><p class="muted">Choose an editable text field, or select an existing page component to change its position. Media, themes, capabilities, persistence, and publishing remain outside this slice.</p></section>';
  }

  const isProposalTarget = matchingMoveProposal(proposal, model);
  const activeDestination = isProposalTarget ? proposal.command.destination : null;
  const status = isProposalTarget
    ? '<div class="preview-state" role="status"><strong>Preview — not applied</strong><span>The Canvas is rendering the proposed component position. The accepted session draft is unchanged.</span></div>'
    : '<div class="accepted-state"><strong>Accepted session draft</strong><span>Memory only · not saved · not published</span></div>';

  if (context.destinations.length === 0) {
    return `<section class="editor-card"><p class="eyebrow">Position</p><h3>Only component on page</h3><p class="target-path">${escapeHtml(context.componentId)} · position ${context.position} of ${context.count}</p><p class="muted">There is no different same-page position available for this component.</p></section>`;
  }

  const options = context.destinations.map((destination) => {
    const value = destination.kind === END_OF_PAGE
      ? END_OF_PAGE
      : `${BEFORE_COMPONENT}:${destination.beforeComponentId}`;
    const selected = activeDestination
      && activeDestination.kind === destination.kind
      && (
        destination.kind === END_OF_PAGE
        || activeDestination.beforeComponentId === destination.beforeComponentId
      );
    return `<option value="${escapeHtml(value)}"${selected ? ' selected' : ''}>${escapeHtml(destinationLabel(model, destination))}</option>`;
  }).join('');

  return `<section class="editor-card" aria-labelledby="component-position-heading">
    <p class="eyebrow">Structure</p>
    <h3 id="component-position-heading">Reorder component</h3>
    <p class="target-path">${escapeHtml(context.componentId)} · position ${context.position} of ${context.count} · ${escapeHtml(humanize(context.ownership))}</p>
    ${status}
    <form class="edit-form" method="post" action="${escapeHtml(actionPaths.reorder)}">
      <input type="hidden" name="nodeId" value="${escapeHtml(model.selection.nodeId)}">
      <input type="hidden" name="viewport" value="${escapeHtml(model.selection.viewport)}">
      <input type="hidden" name="expectedDraftDigest" value="${escapeHtml(session.draftDigest)}">
      <label for="authoring-destination">Position</label>
      <select id="authoring-destination" name="destination" required>${options}</select>
      <p class="form-help">Destinations are derived from stable siblings on this page. Cross-page movement is not available.</p>
      <button class="button primary" type="submit">Preview position</button>
    </form>
    ${isProposalTarget ? `<div class="proposal-actions">
      <form method="post" action="${escapeHtml(actionPaths.apply)}">
        <input type="hidden" name="nodeId" value="${escapeHtml(model.selection.nodeId)}">
        <input type="hidden" name="viewport" value="${escapeHtml(model.selection.viewport)}">
        <button class="button primary" type="submit">Apply to draft</button>
      </form>
      <form method="post" action="${escapeHtml(actionPaths.discard)}">
        <input type="hidden" name="nodeId" value="${escapeHtml(model.selection.nodeId)}">
        <input type="hidden" name="viewport" value="${escapeHtml(model.selection.viewport)}">
        <button class="button secondary" type="submit">Discard preview</button>
      </form>
    </div>` : ''}
  </section>`;
}

function renderStructuralEditor({ model, session, proposal, source, actionPaths }) {
  if (model.selection.nodeId.startsWith('page:')) {
    return renderAddEditor({ model, session, proposal, source, actionPaths });
  }
  const move = renderMoveEditor({ model, session, proposal, source, actionPaths });
  const remove = renderRemoveEditor({ model, session, proposal, source, actionPaths });
  return `${move}${remove}`;
}
function renderEditor({
  model,
  session,
  proposal,
  source,
  actionPaths,
}) {
  if (!model.selection.fieldId) {
    return renderStructuralEditor({ model, session, proposal, source, actionPaths });
  }

  const resolved = editableField(source, model.selection.nodeId, model.selection.fieldId);
  if (!resolved) {
    return '<section class="editor-card"><p class="eyebrow">Edit</p><h3>Read-only field</h3><p class="muted">This field is outside the first ordinary operator-authored scalar-text mutation slice.</p></section>';
  }

  const isProposalTarget = matchingFieldProposal(proposal, model);
  const inputValue = isProposalTarget
    ? proposal.command.payload.value
    : resolved.currentValue;
  const status = isProposalTarget
    ? '<div class="preview-state" role="status"><strong>Preview — not applied</strong><span>The Canvas is rendering the proposal. The accepted session draft is unchanged.</span></div>'
    : '<div class="accepted-state"><strong>Accepted session draft</strong><span>Memory only · not saved · not published</span></div>';

  return `<section class="editor-card" aria-labelledby="field-editor-heading">
    <p class="eyebrow">Selected field</p>
    <h3 id="field-editor-heading">${escapeHtml(humanize(resolved.fieldId))}</h3>
    <p class="target-path">${escapeHtml(resolved.componentId || resolved.pageId)} · ${escapeHtml(humanize(resolved.ownership))}</p>
    ${status}
    <form class="edit-form" method="post" action="${escapeHtml(actionPaths.propose)}">
      <input type="hidden" name="nodeId" value="${escapeHtml(model.selection.nodeId)}">
      <input type="hidden" name="fieldId" value="${escapeHtml(model.selection.fieldId)}">
      <input type="hidden" name="viewport" value="${escapeHtml(model.selection.viewport)}">
      <input type="hidden" name="expectedDraftDigest" value="${escapeHtml(session.draftDigest)}">
      <label for="authoring-value">Text</label>
      <textarea id="authoring-value" name="value" rows="5" maxlength="1200" required>${escapeHtml(inputValue)}</textarea>
      <button class="button primary" type="submit">Preview change</button>
    </form>
    ${isProposalTarget ? `<div class="proposal-actions">
      <form method="post" action="${escapeHtml(actionPaths.apply)}">
        <input type="hidden" name="nodeId" value="${escapeHtml(model.selection.nodeId)}">
        <input type="hidden" name="fieldId" value="${escapeHtml(model.selection.fieldId)}">
        <input type="hidden" name="viewport" value="${escapeHtml(model.selection.viewport)}">
        <button class="button primary" type="submit">Apply to draft</button>
      </form>
      <form method="post" action="${escapeHtml(actionPaths.discard)}">
        <input type="hidden" name="nodeId" value="${escapeHtml(model.selection.nodeId)}">
        <input type="hidden" name="fieldId" value="${escapeHtml(model.selection.fieldId)}">
        <input type="hidden" name="viewport" value="${escapeHtml(model.selection.viewport)}">
        <button class="button secondary" type="submit">Discard preview</button>
      </form>
    </div>` : ''}
  </section>`;
}

function renderHistoryControls(session, actionPaths, model) {
  const hidden = `<input type="hidden" name="nodeId" value="${escapeHtml(model.selection.nodeId)}"><input type="hidden" name="fieldId" value="${escapeHtml(model.selection.fieldId || '')}"><input type="hidden" name="viewport" value="${escapeHtml(model.selection.viewport)}">`;
  return `<section class="history-card" aria-labelledby="history-heading">
    <div><p class="eyebrow">Session history</p><h3 id="history-heading">Undo / Redo</h3><p>${session.historyIndex} applied change${session.historyIndex === 1 ? '' : 's'} in the current branch of history.</p></div>
    <div class="history-actions">
      <form method="post" action="${escapeHtml(actionPaths.undo)}">${hidden}<button class="button secondary" type="submit"${session.canUndo ? '' : ' disabled'}>Undo</button></form>
      <form method="post" action="${escapeHtml(actionPaths.redo)}">${hidden}<button class="button secondary" type="submit"${session.canRedo ? '' : ' disabled'}>Redo</button></form>
    </div>
  </section>`;
}

function renderV2AuthoringStudioSurface({
  session,
  proposal = null,
  query,
  studioPath = '/studio-authoring',
  previewPathForPage,
  actionPaths = {},
} = {}) {
  if (!session || session.kind !== 'hivenues-v2-authoring-session') {
    throw new V2AuthoringStudioError('valid memory-only authoring session is required');
  }
  if (typeof previewPathForPage !== 'function') {
    throw new V2AuthoringStudioError('previewPathForPage must be a function');
  }

  const normalizedStudioPath = strictLocalPath(studioPath, 'Studio path');
  const normalizedActions = {
    propose: strictLocalPath(actionPaths.propose || `${normalizedStudioPath}/propose`, 'propose path'),
    reorder: strictLocalPath(actionPaths.reorder || `${normalizedStudioPath}/reorder`, 'reorder path'),
    add: strictLocalPath(actionPaths.add || `${normalizedStudioPath}/add`, 'add path'),
    remove: strictLocalPath(actionPaths.remove || `${normalizedStudioPath}/remove`, 'remove path'),
    apply: strictLocalPath(actionPaths.apply || `${normalizedStudioPath}/apply`, 'apply path'),
    discard: strictLocalPath(actionPaths.discard || `${normalizedStudioPath}/discard`, 'discard path'),
    undo: strictLocalPath(actionPaths.undo || `${normalizedStudioPath}/undo`, 'undo path'),
    redo: strictLocalPath(actionPaths.redo || `${normalizedStudioPath}/redo`, 'redo path'),
  };

  const source = session.draftSource;
  const model = createV2ReadOnlyStudioModel(source, query);
  const previewSource = proposal ? proposal.previewSource : source;
  const previewSelectionNodeId = proposal?.command.type === REMOVE_COMPONENT
    ? `page:${proposal.resolvedTarget.pageId}`
    : model.selection.nodeId;
  const previewModel = createV2ReadOnlyStudioModel(previewSource, {
    nodeId: previewSelectionNodeId,
    ...(previewSelectionNodeId === model.selection.nodeId && model.selection.fieldId
      ? { fieldId: model.selection.fieldId }
      : {}),
    viewport: model.selection.viewport,
  });
  const previewHref = strictLocalPath(
    previewPathForPage(previewModel.previewPage),
    'preview path',
  );
  const proposalActive = Boolean(proposal);
  const previewDigest = proposalActive ? proposal.afterDigest : session.draftDigest;

  return `<!doctype html>
<html lang="en" data-v2-authoring-studio="true">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Authoring Studio · ${escapeHtml(model.venue.displayName)}</title>
<style>
:root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#1d2528;background:#e9edef;color-scheme:light}
*{box-sizing:border-box}body{margin:0}a{color:inherit;text-decoration:none}button,textarea,select,a{font:inherit}a,button{min-height:44px}a:focus-visible,button:focus-visible,textarea:focus-visible,select:focus-visible{outline:3px solid #0f766e;outline-offset:3px}.skip{position:fixed;top:-90px;left:12px;z-index:50;padding:12px 16px;border-radius:10px;background:#102a2e;color:#fff}.skip:focus{top:12px}
.studio{min-height:100vh;display:grid;grid-template-rows:auto auto 1fr}.topbar{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:14px 22px;border-bottom:1px solid #ccd3d6;background:#fff}.brand{display:flex;align-items:center;gap:14px;min-width:0}.brand-mark{display:grid;place-items:center;width:38px;height:38px;border-radius:11px;background:#143c42;color:#fff;font-weight:900}.eyebrow{margin:0;color:#4b5a5f;font-size:.7rem;font-weight:800;letter-spacing:.11em;text-transform:uppercase}.brand h1{margin:2px 0 0;font-size:1.05rem}.authority-badge{display:inline-flex;align-items:center;gap:7px;padding:7px 10px;border:1px solid #a8b7b7;border-radius:999px;background:#f4f8f7;color:#29494b;font-size:.74rem;font-weight:800}.authority-badge::before{content:"";width:8px;height:8px;border-radius:50%;background:#d69e2e}
.statebar{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:10px 22px;border-bottom:1px solid #ccd3d6;background:#f8fafb}.state-copy strong,.state-copy span{display:block}.state-copy strong{font-size:.82rem}.state-copy span{margin-top:2px;color:#4b5a5f;font-size:.72rem}.digest-pair{display:flex;gap:8px;flex-wrap:wrap}.digest-chip{padding:6px 8px;border-radius:8px;background:#fff;border:1px solid #ccd3d6;font-size:.64rem}.digest-chip strong{display:block}.digest-chip code{font-size:.6rem}
.workspace{display:grid;grid-template-columns:220px minmax(0,1fr) 330px;gap:12px;padding:12px;min-width:0}.panel{min-width:0;border:1px solid #cbd3d6;border-radius:14px;background:#fff;box-shadow:0 3px 16px rgba(28,38,41,.05);overflow:hidden}.panel-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:13px 14px;border-bottom:1px solid #e0e5e7}.panel-head h2{margin:0;font-size:.85rem}.panel-head span{color:#4b5a5f;font-size:.68rem}.tree-panel,.inspector-panel{max-height:calc(100vh - 150px);overflow:auto;position:sticky;top:12px}.tree-list,.field-list{list-style:none;margin:0;padding:8px}.tree-list li{padding-left:calc(var(--depth) * 8px)}.tree-link,.field-link{display:flex;align-items:center;justify-content:space-between;gap:7px;padding:9px;border-radius:9px;border:1px solid transparent}.tree-link strong,.tree-link small,.field-link strong,.field-link small{display:block}.tree-link strong,.field-link strong{font-size:.76rem}.tree-link small,.field-link small{margin-top:2px;color:#536166;font-size:.63rem}.tree-link.is-selected,.field-link.is-selected{border-color:#73a9a1;background:#e8f4f1}.field-link.is-locked{opacity:.66}.selected-chip,.ownership-chip{flex:none;padding:4px 6px;border-radius:999px;background:#edf2f2;color:#395255;font-size:.6rem;font-weight:800}.selected-chip{background:#176b61;color:#fff}
.canvas-panel{background:#dce2e4}.canvas-tools{display:flex;gap:7px;overflow-x:auto;padding:9px;border-bottom:1px solid #cbd3d6;background:#f5f7f8}.canvas-card{display:flex;min-width:170px;max-width:245px;align-items:center;justify-content:space-between;gap:8px;padding:9px 10px;border:1px solid #cbd3d6;border-radius:9px;background:#fff}.canvas-card strong,.canvas-card small{display:block}.canvas-card strong{font-size:.75rem}.canvas-card small{margin-top:2px;color:#536166;font-size:.62rem}.canvas-card.is-selected{border:2px solid #176b61;background:#edf7f4}.preview-area{display:grid;place-items:start center;min-height:620px;padding:18px;overflow:hidden;background:linear-gradient(135deg,#dce2e4,#eef1f2)}.preview-holder{position:relative;overflow:hidden;border:1px solid #adb9bd;border-radius:12px;background:#fff;box-shadow:0 18px 42px rgba(21,34,38,.18)}.preview-holder iframe{position:absolute;top:0;left:0;border:0;background:#fff;transform-origin:top left}.preview-holder.viewport-desktop{width:720px;height:500px}.preview-holder.viewport-desktop iframe{width:1440px;height:1000px;transform:scale(.5)}.preview-holder.viewport-tablet{width:459px;height:612px}.preview-holder.viewport-tablet iframe{width:834px;height:1112px;transform:scale(.55)}.preview-holder.viewport-mobile{width:273px;height:591px}.preview-holder.viewport-mobile iframe{width:390px;height:844px;transform:scale(.70)}.preview-meta{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 13px;border-top:1px solid #cbd3d6;background:#fff;font-size:.68rem}.viewport-options{display:flex;gap:5px;padding:8px;border-top:1px solid #dce2e4;background:#fff}.viewport-option{display:flex;align-items:center;gap:6px;padding:7px 10px;border-radius:8px;color:#536166}.viewport-option span{font-size:.62rem}.viewport-option.is-selected{background:#143c42;color:#fff}
.inspector-summary,.editor-card,.history-card{padding:14px;border-bottom:1px solid #e5e9ea}.inspector-summary h2,.editor-card h3,.history-card h3{margin:3px 0 8px}.muted,.target-path,.history-card p{color:#536166;font-size:.72rem;line-height:1.45}.edit-form{display:grid;gap:8px;margin-top:12px}.edit-form label{font-size:.7rem;font-weight:800}.edit-form textarea,.edit-form select{width:100%;padding:10px;border:1px solid #aebbc0;border-radius:9px;background:#fff;color:#1d2528;line-height:1.45}.edit-form textarea{resize:vertical;min-height:110px}.edit-form select{min-height:44px}.form-help{margin:0;color:#536166;font-size:.66rem;line-height:1.4}.button{display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:9px;padding:9px 12px;font-weight:800;cursor:pointer}.button.primary{background:#176b61;color:#fff}.button.secondary{border:1px solid #aebbc0;background:#fff;color:#29494b}.button:disabled{cursor:not-allowed;opacity:.45}.preview-state,.accepted-state{display:grid;gap:3px;margin:10px 0;padding:10px;border-radius:9px}.preview-state{border:1px solid #d69e2e;background:#fff8df;color:#6b4f12}.accepted-state{border:1px solid #9bc8be;background:#edf7f4;color:#29494b}.preview-state span,.accepted-state span{font-size:.66rem}.proposal-actions,.history-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.history-card{display:flex;align-items:center;justify-content:space-between;gap:10px}.history-card p{margin:0}.memory-note{margin:0;padding:9px 14px;border-top:1px solid #dbe2e4;background:#f7faf9;color:#4b5a5f;font-size:.67rem}
@media(max-width:1180px){.workspace{grid-template-columns:190px minmax(0,1fr)}.inspector-panel{grid-column:2;position:static;max-height:none}.preview-holder.viewport-desktop{width:620px;height:431px}.preview-holder.viewport-desktop iframe{transform:scale(.431)}}
@media(max-width:720px){.topbar,.statebar{align-items:flex-start;flex-direction:column;padding:12px}.workspace{display:flex;flex-direction:column;padding:8px}.canvas-panel{order:0}.inspector-panel{order:1;position:static;max-height:none}.tree-panel{order:2;position:static;max-height:none}.preview-area{min-height:0;padding:10px}.preview-holder.viewport-desktop{width:346px;height:240px}.preview-holder.viewport-desktop iframe{transform:scale(.24)}.preview-holder.viewport-tablet{width:334px;height:445px}.preview-holder.viewport-tablet iframe{transform:scale(.40)}.preview-holder.viewport-mobile{width:343px;height:743px}.preview-holder.viewport-mobile iframe{transform:scale(.88)}.history-card{align-items:flex-start;flex-direction:column}}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;animation:none!important;transition:none!important}}
</style>
</head>
<body>
<a class="skip" href="#authoring-canvas-heading">Skip to Canvas</a>
<main class="studio" data-v2-authoring-studio="true" data-accepted-digest="${escapeHtml(session.draftDigest)}" data-preview-digest="${escapeHtml(previewDigest)}" data-studio-persistent="false" data-studio-runtime-wired="false" data-studio-mutations="true" data-preview-active="${proposalActive ? 'true' : 'false'}">
  <header class="topbar">
    <div class="brand"><span class="brand-mark" aria-hidden="true">H</span><div><p class="eyebrow">HiVenues · Authoring Studio</p><h1>${escapeHtml(model.venue.displayName)}</h1></div></div>
    <span class="authority-badge">Session draft · memory only</span>
  </header>
  <section class="statebar" aria-label="Authoring state">
    <div class="state-copy"><strong>${proposalActive ? 'Preview — not applied' : 'Accepted session draft'}</strong><span>No workspace save · no publishing · no deployment · no external effects</span></div>
    <div class="digest-pair"><div class="digest-chip"><strong>Accepted</strong><code>${escapeHtml(session.draftDigest.slice(0, 12))}…</code></div><div class="digest-chip"><strong>Canvas</strong><code>${escapeHtml(previewDigest.slice(0, 12))}…</code></div></div>
  </section>
  <div class="workspace">
    <nav class="panel tree-panel" aria-labelledby="authoring-tree-heading">
      <header class="panel-head"><h2 id="authoring-tree-heading">Page Structure</h2><span>Stable semantic IDs</span></header>
      <ul class="tree-list">${renderTree(model, normalizedStudioPath)}</ul>
    </nav>
    <section class="panel canvas-panel" aria-labelledby="authoring-canvas-heading">
      <header class="panel-head"><h2 id="authoring-canvas-heading" tabindex="-1">Venue Canvas</h2><span>Real v2 renderer</span></header>
      <nav class="canvas-tools" aria-label="Page component selection">${renderCanvasCards(model, normalizedStudioPath)}</nav>
      <div class="preview-area"><div class="preview-holder viewport-${escapeHtml(model.viewport.id)}"><iframe title="Real v2 authoring preview" data-v2-authoring-preview="true" src="${escapeHtml(previewHref)}" width="${model.viewport.width}" height="${model.viewport.height}"></iframe></div></div>
      <div class="preview-meta"><strong>${escapeHtml(previewModel.previewPage.title)}</strong><span>${escapeHtml(model.viewport.label)} · ${model.viewport.width} × ${model.viewport.height}</span></div>
      <nav class="viewport-options" aria-label="Preview viewport">${renderViewportOptions(model, normalizedStudioPath)}</nav>
      <p class="memory-note">Canvas changes in this phase are session-memory state only. Publishing and persistence remain separate unauthorized capabilities.</p>
    </section>
    <aside class="panel inspector-panel" aria-labelledby="authoring-inspector-heading">
      <header class="panel-head"><h2 id="authoring-inspector-heading">Inspector</h2><span>Typed content + structure</span></header>
      <section class="inspector-summary"><p class="eyebrow">Selected context</p><h2>${escapeHtml(model.inspector.label)}</h2><p class="muted">${escapeHtml(humanize(model.inspector.semanticKind))}</p></section>
      <section class="inspector-summary" aria-labelledby="authoring-fields-heading"><h3 id="authoring-fields-heading">Fields</h3>${renderFields(model, source, normalizedStudioPath)}</section>
      ${renderEditor({ model, session, proposal, source, actionPaths: normalizedActions })}
      ${renderHistoryControls(session, normalizedActions, model)}
    </aside>
  </div>
</main>
</body>
</html>`;
}

module.exports = {
  V2AuthoringStudioError,
  renderV2AuthoringStudioSurface,
};
