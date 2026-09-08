'use strict';

const { URLSearchParams } = require('node:url');
const {
  V2_READ_ONLY_STUDIO_VIEWPORTS,
  createV2ReadOnlyStudioModel,
} = require('./studio-read-only');
const {
  ADD_RESOURCE,
  REMOVE_RESOURCE,
  MOVE_RESOURCE,
  END_OF_LIST,
  getV2ResourceListContext,
  ADD_COMPONENT,
  BEFORE_COMPONENT,
  END_OF_PAGE,
  IMPORT_LOCAL_HERO_MEDIA,
  MOVE_COMPONENT,
  REMOVE_COMPONENT,
  SET_MEDIA_USAGE_ASSET,
  SET_THEME_RECIPE,
  V2_GLOBAL_THEME_TARGET,
  V2_HERO_MEDIA_SLOT,
  getV2ComponentRemovalContext,
  listV2ComponentAddDestinations,
  listV2ComponentMoveDestinations,
  listV2MediaUsageOptions,
  listV2ResourceScalarFieldOptions,
  listV2ThemeRecipeOptions,
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
    if (model.selectedEntry.kind === 'resource-reference') {
      return '<p class="muted">This shared resource is edited through the typed resource controls below.</p>';
    }
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

const THEME_RECIPE_COPY = Object.freeze({
  'type-system-sans': ['System Sans', 'Clean, familiar, highly legible typography.'],
  'type-editorial': ['Editorial', 'A more literary, publication-like visual voice.'],
  'type-grotesk-display': ['Grotesk Display', 'Bold display character with a contemporary venue feel.'],
  'type-poster': ['Poster', 'High-impact type for event-forward and expressive venues.'],
  'density-compact': ['Compact', 'Tighter spacing for information-dense experiences.'],
  'density-standard': ['Standard', 'Balanced spacing for everyday venue content.'],
  'density-generous': ['Generous', 'More breathing room and a premium editorial rhythm.'],
  'shape-crisp': ['Crisp', 'Sharper geometry and restrained corner treatment.'],
  'shape-soft': ['Soft', 'Gentle rounding for a welcoming modern character.'],
  'shape-rounded': ['Rounded', 'More expressive curves and friendly visual softness.'],
  'surface-flat': ['Flat', 'Minimal surface separation and quieter layering.'],
  'surface-layered': ['Layered', 'Balanced panels and hierarchy across the page.'],
  'surface-elevated': ['Elevated', 'Stronger depth and emphasis between content surfaces.'],
});

function themeRecipeCopy(recipeId) {
  return THEME_RECIPE_COPY[recipeId] || [humanize(recipeId), 'Curated HiVenues design recipe.'];
}

function matchingThemeProposal(proposal) {
  return Boolean(proposal && proposal.command.type === SET_THEME_RECIPE);
}

function acceptedStateMarkup(
  persistence,
  {
    label = 'Accepted session draft',
    memoryDetail = 'Memory only · not saved · not published',
  } = {},
) {
  let detail = memoryDetail;
  if (persistence?.enabled) {
    detail = persistence.isPersisted
      ? 'Workspace checkpoint saved · not published · not deployed'
      : persistence.persistedDigest === 'ABSENT'
        ? 'Not saved yet · not published · not deployed'
        : 'Accepted draft differs from saved checkpoint · not published · not deployed';
  }
  return `<div class="accepted-state"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(detail)}</span></div>`;
}

function renderThemeEditor({ model, session, proposal, source, actionPaths, persistence }) {
  const context = listV2ThemeRecipeOptions(source);
  if (proposal && !matchingThemeProposal(proposal)) {
    return '<section class="editor-card"><p class="eyebrow">Theme</p><h3>Finish the active preview first</h3><p class="muted">Apply or discard the current proposal before starting a global theme change.</p></section>';
  }

  const isProposal = matchingThemeProposal(proposal);
  const activeDimension = isProposal ? proposal.command.dimension : null;
  const activeRecipe = isProposal ? proposal.command.recipeId : null;
  const controls = context.dimensions.map((dimension) => {
    const currentCopy = themeRecipeCopy(dimension.value);
    if (isProposal) {
      const shownValue = dimension.id === activeDimension ? activeRecipe : dimension.value;
      const shownCopy = themeRecipeCopy(shownValue);
      return `<div class="theme-control${dimension.id === activeDimension ? ' is-preview' : ''}">
        <div><strong>${escapeHtml(dimension.label)}</strong><span>${escapeHtml(dimension.id === activeDimension ? 'Preview' : 'Accepted')}</span></div>
        <p>${escapeHtml(shownCopy[0])}</p>
        <small>${escapeHtml(shownCopy[1])}</small>
      </div>`;
    }

    const options = dimension.values
      .filter((value) => value !== dimension.value)
      .map((value) => {
        const copy = themeRecipeCopy(value);
        return `<option value="${escapeHtml(value)}">${escapeHtml(copy[0])}</option>`;
      })
      .join('');
    return `<form class="theme-control" method="post" action="${escapeHtml(actionPaths.theme)}">
      <input type="hidden" name="themeNodeId" value="${escapeHtml(V2_GLOBAL_THEME_TARGET)}">
      <input type="hidden" name="dimension" value="${escapeHtml(dimension.id)}">
      <input type="hidden" name="nodeId" value="${escapeHtml(model.selection.nodeId)}">
      <input type="hidden" name="fieldId" value="${escapeHtml(model.selection.fieldId || '')}">
      <input type="hidden" name="viewport" value="${escapeHtml(model.selection.viewport)}">
      <input type="hidden" name="expectedDraftDigest" value="${escapeHtml(session.draftDigest)}">
      <div><label for="theme-${escapeHtml(dimension.id)}">${escapeHtml(dimension.label)}</label><span>Current · ${escapeHtml(currentCopy[0])}</span></div>
      <small>${escapeHtml(currentCopy[1])}</small>
      <select id="theme-${escapeHtml(dimension.id)}" name="recipeId" required>
        <option value="" selected disabled>Choose a different ${escapeHtml(dimension.label.toLowerCase())}…</option>
        ${options}
      </select>
      <button class="button secondary" type="submit">Preview ${escapeHtml(dimension.label.toLowerCase())}</button>
    </form>`;
  }).join('');

  const status = isProposal
    ? '<div class="preview-state" role="status"><strong>Theme preview — not applied</strong><span>The real Canvas is rendering the proposed global design recipe. The accepted session draft is unchanged.</span></div>'
    : acceptedStateMarkup(persistence, {
      label: 'Accepted global theme',
      memoryDetail: 'Curated semantic recipes · memory only · not saved · not published',
    });

  return `<section class="editor-card theme-card" aria-labelledby="theme-editor-heading">
    <p class="eyebrow">Venue design</p>
    <h3 id="theme-editor-heading">Theme</h3>
    <p class="target-path">Global semantic design · ${escapeHtml(humanize(context.ownership))}</p>
    ${status}
    <div class="theme-grid">${controls}</div>
    <p class="form-help">Theme controls use HiVenues design recipes. Raw CSS, arbitrary token keys, font URLs, media, responsive overrides, persistence, and publishing are not available here.</p>
    ${isProposal ? renderProposalActions(model, actionPaths) : ''}
  </section>`;
}

function mediaUsageContext(source, nodeId) {
  try {
    return listV2MediaUsageOptions(source, { nodeId }, V2_HERO_MEDIA_SLOT);
  } catch {
    return null;
  }
}

function matchingMediaProposal(proposal, model) {
  return Boolean(
    proposal
    && [SET_MEDIA_USAGE_ASSET, IMPORT_LOCAL_HERO_MEDIA].includes(proposal.command.type)
    && proposal.command.target.nodeId === model.selection.nodeId
  );
}

function renderMediaEditor({ model, session, proposal, source, actionPaths, persistence }) {
  const context = mediaUsageContext(source, model.selection.nodeId);
  if (!context) return '';
  if (proposal && !matchingMediaProposal(proposal, model)) {
    return '<section class="editor-card"><p class="eyebrow">Media</p><h3>Finish the active preview first</h3><p class="muted">Apply or discard the current proposal before starting a media change.</p></section>';
  }

  const isProposal = matchingMediaProposal(proposal, model);
  const usage = isProposal
    ? {
      assetId: proposal.resolvedTarget.assetId,
      alt: proposal.command.alt,
      decorative: proposal.command.decorative,
    }
    : context.current;
  const assets = context.assets.map((asset) =>
    `<option value="${escapeHtml(asset.id)}"${asset.id === usage.assetId ? ' selected' : ''}>${escapeHtml(humanize(asset.id))} · ${asset.width} × ${asset.height}</option>`
  ).join('');
  const status = isProposal
    ? '<div class="preview-state" role="status"><strong>Media preview — not applied</strong><span>The real Canvas is rendering the proposed managed asset. The accepted session draft is unchanged.</span></div>'
    : acceptedStateMarkup(persistence, {
      label: 'Accepted hero media',
      memoryDetail: 'Existing managed assets only · memory only · not saved · not published',
    });

  if (isProposal) {
    const meaning = usage.decorative ? 'Decorative image' : `Meaningful · ${usage.alt}`;
    return `<section class="editor-card media-card" aria-labelledby="media-editor-heading">
      <p class="eyebrow">Venue media</p>
      <h3 id="media-editor-heading">Hero image</h3>
      <p class="target-path">${escapeHtml(context.componentId)} · ${escapeHtml(humanize(context.ownership))}</p>
      ${status}
      <div class="theme-control is-preview"><div><strong>${escapeHtml(humanize(usage.assetId))}</strong><span>Preview</span></div><small>${escapeHtml(meaning)}</small></div>
      <p class="form-help">This preview changes only the hero media reference and accessibility meaning. Asset bytes, paths, dimensions, crop/treatment, persistence, and publishing remain server-owned or unavailable.</p>
      ${renderProposalActions(model, actionPaths)}
    </section>`;
  }

  return `<section class="editor-card media-card" aria-labelledby="media-editor-heading">
    <p class="eyebrow">Venue media</p>
    <h3 id="media-editor-heading">Hero image</h3>
    <p class="target-path">${escapeHtml(context.componentId)} · ${escapeHtml(humanize(context.ownership))}</p>
    ${status}
    <form class="edit-form" method="post" action="${escapeHtml(actionPaths.media)}" data-media-meaning="meaningful">
      <input type="hidden" name="nodeId" value="${escapeHtml(model.selection.nodeId)}">
      <input type="hidden" name="mediaSlot" value="${escapeHtml(V2_HERO_MEDIA_SLOT)}">
      <input type="hidden" name="decorative" value="false">
      <input type="hidden" name="viewport" value="${escapeHtml(model.selection.viewport)}">
      <input type="hidden" name="expectedDraftDigest" value="${escapeHtml(session.draftDigest)}">
      <label for="authoring-media-asset">Meaningful hero image</label>
      <select id="authoring-media-asset" name="assetId" required>${assets}</select>
      <label for="authoring-media-alt">Alternative text</label>
      <input id="authoring-media-alt" name="alt" type="text" maxlength="240" value="${escapeHtml(context.current.decorative ? '' : (context.current.alt || ''))}" required>
      <p class="form-help">Use this path when the image communicates information. Give it concise alternative text.</p>
      <button class="button primary" type="submit">Preview meaningful image</button>
    </form>
    <form class="edit-form" method="post" action="${escapeHtml(actionPaths.media)}" data-media-meaning="decorative">
      <input type="hidden" name="nodeId" value="${escapeHtml(model.selection.nodeId)}">
      <input type="hidden" name="mediaSlot" value="${escapeHtml(V2_HERO_MEDIA_SLOT)}">
      <input type="hidden" name="decorative" value="true">
      <input type="hidden" name="viewport" value="${escapeHtml(model.selection.viewport)}">
      <input type="hidden" name="expectedDraftDigest" value="${escapeHtml(session.draftDigest)}">
      <label for="authoring-media-decorative-asset">Decorative hero image</label>
      <select id="authoring-media-decorative-asset" name="assetId" required>${assets}</select>
      <p class="form-help">Use this path only when the image adds no information. HiVenues will render empty alternative text and hide it from assistive technology.</p>
      <button class="button secondary" type="submit">Preview as decorative</button>
    </form>
    <div class="theme-control"><div><strong>Bring your own hero image</strong><span>Session only</span></div><small>PNG, JPEG, or GIF · up to 8 MiB · inspected by HiVenues before preview</small></div>
    <form class="edit-form" data-local-media-import="meaningful" action="${escapeHtml(actionPaths.mediaImport)}">
      <input type="hidden" name="nodeId" value="${escapeHtml(model.selection.nodeId)}">
      <input type="hidden" name="mediaSlot" value="${escapeHtml(V2_HERO_MEDIA_SLOT)}">
      <input type="hidden" name="decorative" value="false">
      <input type="hidden" name="viewport" value="${escapeHtml(model.selection.viewport)}">
      <input type="hidden" name="expectedDraftDigest" value="${escapeHtml(session.draftDigest)}">
      <label for="authoring-local-media-file">Local meaningful hero image</label>
      <input id="authoring-local-media-file" name="file" type="file" accept="image/png,image/jpeg,image/gif" required>
      <label for="authoring-local-media-alt">Alternative text</label>
      <input id="authoring-local-media-alt" name="alt" type="text" maxlength="240" required>
      <p class="form-help">The selected file stays in this in-memory Studio session. HiVenues derives its identity, path, format, and dimensions.</p>
      <button class="button primary" type="submit">Preview local image</button>
      <span class="form-help" data-local-media-status role="status"></span>
    </form>
    <form class="edit-form" data-local-media-import="decorative" action="${escapeHtml(actionPaths.mediaImport)}">
      <input type="hidden" name="nodeId" value="${escapeHtml(model.selection.nodeId)}">
      <input type="hidden" name="mediaSlot" value="${escapeHtml(V2_HERO_MEDIA_SLOT)}">
      <input type="hidden" name="decorative" value="true">
      <input type="hidden" name="viewport" value="${escapeHtml(model.selection.viewport)}">
      <input type="hidden" name="expectedDraftDigest" value="${escapeHtml(session.draftDigest)}">
      <label for="authoring-local-media-decorative-file">Local decorative hero image</label>
      <input id="authoring-local-media-decorative-file" name="file" type="file" accept="image/png,image/jpeg,image/gif" required>
      <p class="form-help">Use only when the image adds no information. Empty alternative text is derived automatically.</p>
      <button class="button secondary" type="submit">Preview local decorative image</button>
      <span class="form-help" data-local-media-status role="status"></span>
    </form>
    <p class="form-help">No source path, asset ID, dimensions, file type, digest, crop/focal controls, gallery editing, persistence, or publishing authority is exposed.</p>
    <script>
    (() => {
      for (const form of document.querySelectorAll('form[data-local-media-import]')) {
        form.addEventListener('submit', async (event) => {
          event.preventDefault();
          const status = form.querySelector('[data-local-media-status]');
          const file = form.querySelector('input[type="file"]').files[0];
          if (!file) {
            status.textContent = 'Choose a local image first.';
            return;
          }
          const params = new URLSearchParams();
          for (const name of ['nodeId', 'mediaSlot', 'decorative', 'viewport', 'expectedDraftDigest']) {
            params.set(name, form.elements[name].value);
          }
          const alt = form.elements.alt;
          if (alt) params.set('alt', alt.value);
          status.textContent = 'Inspecting image…';
          try {
            const response = await fetch(form.action + '?' + params.toString(), {
              method: 'POST',
              headers: { 'Content-Type': file.type || 'application/octet-stream' },
              body: file,
            });
            if (!response.ok) {
              status.textContent = await response.text() || 'Local image preview was rejected.';
              return;
            }
            const redirect = new URL('${escapeHtml(actionPaths.studio)}', location.origin);
            redirect.searchParams.set('nodeId', form.elements.nodeId.value);
            redirect.searchParams.set('viewport', form.elements.viewport.value);
            location.assign(redirect.pathname + redirect.search);
          } catch {
            status.textContent = 'Local image preview failed before the in-memory request completed.';
          }
        });
      }
    })();
    </script>
  </section>`;
}

function matchingFieldProposal(proposal, model) {
  if (!proposal || proposal.command.type !== 'SET_FIELD' || !model.selection.fieldId) return false;
  return proposal.command.target.nodeId === model.selection.nodeId
    && proposal.command.target.fieldId === model.selection.fieldId;
}

function matchingResourceProposal(proposal, model) {
  return Boolean(
    proposal
    && proposal.command.type === 'SET_FIELD'
    && model.selectedEntry.kind === 'resource-reference'
    && proposal.command.target.nodeId === model.selectedEntry.nodeId
  );
}

function resourceScalarContext(source, model) {
  if (model.selectedEntry.kind !== 'resource-reference') return null;
  try {
    return listV2ResourceScalarFieldOptions(source, { nodeId: model.selectedEntry.nodeId });
  } catch {
    return null;
  }
}

function renderResourceInput(field, value) {
  if (field.control === 'select') {
    const options = field.values.map((candidate) =>
      `<option value="${escapeHtml(candidate)}"${candidate === value ? ' selected' : ''}>${escapeHtml(humanize(candidate))}</option>`
    ).join('');
    return `<select id="resource-${escapeHtml(field.id)}" name="value" required>${options}</select>`;
  }
  if (field.control === 'textarea') {
    return `<textarea id="resource-${escapeHtml(field.id)}" name="value" rows="4" maxlength="${field.maxLength}" required>${escapeHtml(value)}</textarea>`;
  }
  return `<input id="resource-${escapeHtml(field.id)}" name="value" type="text" maxlength="${field.maxLength}" value="${escapeHtml(value)}" required>`;
}

function renderResourceEditor({ model, session, proposal, source, actionPaths, persistence }) {
  const context = resourceScalarContext(source, model);
  if (!context) {
    return '<section class="editor-card"><p class="eyebrow">Resource</p><h3>Read-only resource</h3><p class="muted">This resource kind has no scalar authoring controls in the current bounded command family.</p></section>';
  }
  const isProposalTarget = matchingResourceProposal(proposal, model);
  if (proposal && !isProposalTarget) {
    return '<section class="editor-card"><p class="eyebrow">Resource</p><h3>Finish the active preview first</h3><p class="muted">Apply or discard the current proposal before editing this shared resource.</p></section>';
  }
  const activeFieldId = isProposalTarget ? proposal.command.target.fieldId : null;
  const controls = context.fields.map((field) => {
    const active = activeFieldId === field.id;
    const shownValue = active ? proposal.command.payload.value : field.currentValue;
    if (isProposalTarget) {
      return `<div class="theme-control${active ? ' is-preview' : ''}"><div><strong>${escapeHtml(field.label)}</strong><span>${active ? 'Preview' : 'Current'}</span></div><p>${escapeHtml(shownValue)}</p></div>`;
    }
    return `<form class="edit-form resource-field-form" method="post" action="${escapeHtml(actionPaths.resource)}">
      <input type="hidden" name="nodeId" value="${escapeHtml(model.selection.nodeId)}">
      <input type="hidden" name="resourceNodeId" value="${escapeHtml(context.target.nodeId)}">
      <input type="hidden" name="fieldId" value="${escapeHtml(field.id)}">
      <input type="hidden" name="viewport" value="${escapeHtml(model.selection.viewport)}">
      <input type="hidden" name="expectedDraftDigest" value="${escapeHtml(session.draftDigest)}">
      <label for="resource-${escapeHtml(field.id)}">${escapeHtml(field.label)}</label>
      ${renderResourceInput(field, shownValue)}
      <button class="button primary" type="submit">Preview ${escapeHtml(field.label.toLowerCase())}</button>
    </form>`;
  }).join('');
  const status = isProposalTarget
    ? '<div class="preview-state" role="status"><strong>Resource preview — not applied</strong><span>Every generated consumer is rendering the proposed shared-resource value. The accepted draft is unchanged.</span></div>'
    : acceptedStateMarkup(persistence, {
      label: 'Accepted shared resource',
      memoryDetail: 'Typed resource fields · memory only · not saved · not published',
    });
  return `<section class="editor-card resource-editor" aria-labelledby="resource-editor-heading">
    <p class="eyebrow">Shared resource</p>
    <h3 id="resource-editor-heading">${escapeHtml(context.label)}</h3>
    <p class="target-path">${escapeHtml(humanize(context.resourceKind))} · stable ID ${escapeHtml(context.resourceId)}</p>
    ${status}
    <div class="resource-controls">${controls}</div>
    <p class="form-help">HiVenues resolves the canonical resource, collection position, ownership, validation and every consumer. IDs, ordering, timestamps, actions, media and raw source structure are not editable in this slice.</p>
    ${isProposalTarget ? renderProposalActions(model, actionPaths) : ''}
  </section>`;
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

function renderAddEditor({ model, session, proposal, source, actionPaths, persistence }) {
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
    : acceptedStateMarkup(persistence);

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

function renderRemoveEditor({ model, session, proposal, source, actionPaths, persistence }) {
  const context = componentRemovalContext(source, model.selection.nodeId);
  if (!context?.eligible) return '';
  const isProposalTarget = matchingRemoveProposal(proposal, model);
  const status = isProposalTarget
    ? '<div class="preview-state" role="status"><strong>Preview — not applied</strong><span>The Canvas is rendering this component removed. The accepted session draft still contains it.</span></div>'
    : acceptedStateMarkup(persistence);

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

function renderMoveEditor({ model, session, proposal, source, actionPaths, persistence }) {
  const context = componentMoveContext(source, model.selection.nodeId);
  if (!context) {
    return '<section class="editor-card"><p class="eyebrow">Edit</p><h3>Select a field</h3><p class="muted">Choose an editable text field, or select an existing page component to change its position. Media, themes, capabilities, persistence, and publishing remain outside this slice.</p></section>';
  }

  const isProposalTarget = matchingMoveProposal(proposal, model);
  const activeDestination = isProposalTarget ? proposal.command.destination : null;
  const status = isProposalTarget
    ? '<div class="preview-state" role="status"><strong>Preview — not applied</strong><span>The Canvas is rendering the proposed component position. The accepted session draft is unchanged.</span></div>'
    : acceptedStateMarkup(persistence);

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

function renderResourceLifecycleEditor({ model, session, proposal, source, actionPaths }) {
  let context;
  try {
    context = getV2ResourceListContext(source, { nodeId: `component:${model.selectedEntry.componentId}` });
  } catch { return ''; }
  const noun = context.resourceKind === 'events' ? 'show' : context.resourceKind === 'programs' ? 'program' : 'equipment item';
  const ownProposal = [ADD_RESOURCE, REMOVE_RESOURCE, MOVE_RESOURCE].includes(proposal?.command.type)
    && proposal.resolvedTarget.componentId === context.componentId;
  if (proposal) {
    if (!ownProposal) return '';
    const action = proposal.command.type === ADD_RESOURCE ? 'Add'
      : proposal.command.type === MOVE_RESOURCE ? 'Reorder' : 'Remove';
    const consequence = proposal.command.type === REMOVE_RESOURCE
      ? `Removed from: ${proposal.resolvedTarget.affectedLists.join('; ')}. Undo restores every reference.`
      : 'This list shows the proposed change. Other lists keep their existing selection and order.';
    return `<section class="editor-card resource-lifecycle-editor"><h3>${action} ${noun}</h3>
      <div class="preview-state" role="status"><strong>${action} preview — not applied</strong><span>${escapeHtml(consequence)}</span></div>
      ${renderProposalActions(model, actionPaths)}</section>`;
  }
  const common = (operation) => `<input type="hidden" name="nodeId" value="${escapeHtml(model.selection.nodeId)}">
    <input type="hidden" name="viewport" value="${escapeHtml(model.selection.viewport)}">
    <input type="hidden" name="expectedDraftDigest" value="${escapeHtml(session.draftDigest)}">
    <input type="hidden" name="operation" value="${operation}">`;
  const formStart = `<form class="edit-form" method="post" action="${escapeHtml(actionPaths.resourceLifecycle)}">`;
  if (model.selectedEntry.kind !== 'resource-reference') {
    if (!context.canAdd) return `<section class="editor-card resource-lifecycle-editor"><h3>List capacity reached</h3><p class="muted">Remove an item before adding another ${noun}.</p></section>`;
    const fields = context.resourceKind === 'equipment'
      ? [['name', 'Equipment name'], ['note', 'Availability note'], ['accessNote', 'Access requirements'], ['lastUpdated', 'Status checked at']]
      : [['title', `${noun === 'show' ? 'Show' : 'Program'} title`], ['description', 'Description'],
        ...(context.resourceKind === 'programs' ? [['accessNote', 'Access requirements']] : []), ['startAt', 'Starts'], ['endAt', 'Ends']];
    const controls = fields.map(([key, label]) => {
      const time = ['startAt', 'endAt', 'lastUpdated'].includes(key);
      return `<label for="new-resource-${key}">${label}</label><input id="new-resource-${key}" name="${key}" type="${time ? 'datetime-local' : 'text'}" ${time ? 'step="1"' : `maxlength="${key === 'description' ? 1200 : 240}"`} required>`;
    }).join('');
    const offsets = [];
    for (let minutes = -720; minutes <= 840; minutes += 15) {
      const absolute = Math.abs(minutes);
      const value = `${minutes < 0 ? '-' : '+'}${String(Math.floor(absolute / 60)).padStart(2, '0')}:${String(absolute % 60).padStart(2, '0')}`;
      offsets.push(`<option value="${value}"${minutes === 0 ? ' selected' : ''}>UTC${value}</option>`);
    }
    return `<section class="editor-card resource-lifecycle-editor"><h3>Add ${noun}</h3>
      <p class="muted">${context.items.length ? `${context.items.length} items in this list.` : 'This list is empty.'} New items appear here. ${context.resourceKind === 'equipment' ? 'New equipment starts Offline until you change its status.' : 'New entries start Scheduled.'}</p>
      ${formStart}${common(ADD_RESOURCE)}${controls}
      <label for="new-resource-offset">UTC offset at the venue on this date</label>
      <select id="new-resource-offset" name="utcOffset">${offsets.join('')}</select>
      <button class="button primary" type="submit">Preview new ${noun}</button></form></section>`;
  }
  const resourceId = model.selectedEntry.nodeId.slice(`resource:${context.resourceKind}:`.length);
  const selectedIndex = context.items.findIndex((item) => item.id === resourceId);
  const item = context.items[selectedIndex];
  if (!item) return '';
  const destinations = context.items.filter((other) => other.id !== resourceId).map((other) => ({ id: other.id, label: `Before ${other.label}` }));
  destinations.push({ id: END_OF_LIST, label: 'End of this list' });
  const noOp = context.items[selectedIndex + 1]?.id || END_OF_LIST;
  const choices = destinations.filter((d) => d.id !== noOp).map((d) => `<option value="${escapeHtml(d.id)}">${escapeHtml(d.label)}</option>`).join('');
  const move = choices ? `${formStart}${common(MOVE_RESOURCE)}
    <input type="hidden" name="resourceId" value="${escapeHtml(resourceId)}">
    <label for="resource-destination">Position in this list</label><select id="resource-destination" name="destination">${choices}</select>
    <button class="button secondary" type="submit">Preview order</button></form>` : '<p class="muted">This is the only item in this list.</p>';
  return `<section class="editor-card resource-lifecycle-editor"><h3>Manage ${escapeHtml(item.label)}</h3>${move}
    <details><summary>Remove ${noun} everywhere</summary>
    <p class="muted">Removes this shared item from every list and its detail page, when present. Undo restores it.</p>
    ${formStart}${common(REMOVE_RESOURCE)}<input type="hidden" name="resourceId" value="${escapeHtml(resourceId)}">
    <label for="resource-confirmation">Type “${escapeHtml(item.label)}” to confirm</label>
    <input id="resource-confirmation" name="confirmation" type="text" required>
    <button class="button secondary" type="submit">Preview removal</button></form></details></section>`;
}

function renderStructuralEditor({ model, session, proposal, source, actionPaths, persistence }) {
  if (model.selection.nodeId.startsWith('page:')) {
    return renderAddEditor({ model, session, proposal, source, actionPaths, persistence });
  }
  if (matchingMoveProposal(proposal, model)) {
    return renderMoveEditor({ model, session, proposal, source, actionPaths, persistence });
  }
  if (matchingRemoveProposal(proposal, model)) {
    return renderRemoveEditor({ model, session, proposal, source, actionPaths, persistence });
  }
  const move = renderMoveEditor({ model, session, proposal, source, actionPaths, persistence });
  const remove = renderRemoveEditor({ model, session, proposal, source, actionPaths, persistence });
  return `${move}${remove}`;
}
function renderEditor({
  model,
  session,
  proposal,
  source,
  actionPaths,
  persistence,
}) {
  if ([SET_MEDIA_USAGE_ASSET, IMPORT_LOCAL_HERO_MEDIA].includes(proposal?.command.type)) {
    return '<section class="editor-card"><p class="eyebrow">Selected context</p><h3>Media preview active</h3><p class="muted">The current Canvas selection remains available for orientation. Apply or discard the Media proposal below before starting another content or structure change.</p></section>';
  }
  if (matchingThemeProposal(proposal)) {
    return '<section class="editor-card"><p class="eyebrow">Selected context</p><h3>Theme preview active</h3><p class="muted">The current Canvas selection remains available for orientation. Apply or discard the Theme proposal below before starting another content or structure change.</p></section>';
  }
  if (model.selectedEntry.kind === 'resource-reference') {
    return renderResourceLifecycleEditor({ model, session, proposal, source, actionPaths })
      + renderResourceEditor({ model, session, proposal, source, actionPaths, persistence });
  }
  if (!model.selection.fieldId) {
    return renderResourceLifecycleEditor({ model, session, proposal, source, actionPaths })
      + renderStructuralEditor({ model, session, proposal, source, actionPaths, persistence });
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
    : acceptedStateMarkup(persistence);

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

function normalizePersistence(value, session) {
  if (!value || value.enabled !== true) return Object.freeze({ enabled: false });
  const persistedDigest = value.persistedDigest;
  if (
    persistedDigest !== 'ABSENT'
    && (typeof persistedDigest !== 'string' || !/^[0-9a-f]{64}$/.test(persistedDigest))
  ) {
    throw new V2AuthoringStudioError('persisted v2 source digest is invalid');
  }
  if (value.sourceFilename !== 'venue-source-v2.json') {
    throw new V2AuthoringStudioError('v2 persistence filename is invalid');
  }
  return Object.freeze({
    enabled: true,
    persistedDigest,
    isPersisted: persistedDigest === session.draftDigest,
    sourceFilename: value.sourceFilename,
  });
}

function renderPersistenceControls(session, proposal, persistence, actionPaths, model) {
  if (!persistence.enabled) return '';
  const saved = persistence.isPersisted;
  const blocked = Boolean(proposal);
  const state = blocked
    ? 'Preview is active. Apply or discard it before saving.'
    : saved
      ? 'The accepted draft matches the durable workspace checkpoint.'
      : persistence.persistedDigest === 'ABSENT'
        ? 'No durable v2 checkpoint exists yet.'
        : 'The accepted draft has changed since the last workspace checkpoint.';
  const buttonLabel = saved ? 'Workspace saved' : 'Save workspace checkpoint';
  const hidden = `<input type="hidden" name="nodeId" value="${escapeHtml(model.selection.nodeId)}"><input type="hidden" name="fieldId" value="${escapeHtml(model.selection.fieldId || '')}"><input type="hidden" name="viewport" value="${escapeHtml(model.selection.viewport)}"><input type="hidden" name="expectedDraftDigest" value="${escapeHtml(session.draftDigest)}"><input type="hidden" name="expectedPersistedDigest" value="${escapeHtml(persistence.persistedDigest)}">`;
  return `<section class="history-card persistence-card" aria-labelledby="persistence-heading">
    <div><p class="eyebrow">Workspace checkpoint</p><h3 id="persistence-heading">${saved ? 'Saved' : 'Save accepted draft'}</h3><p>${escapeHtml(state)}</p><p><code>${escapeHtml(persistence.sourceFilename)}</code></p></div>
    <form method="post" action="${escapeHtml(actionPaths.save)}">${hidden}<button class="button primary" type="submit"${blocked || saved ? ' disabled' : ''}>${escapeHtml(buttonLabel)}</button></form>
  </section>`;
}

function renderV2AuthoringStudioSurface({
  session,
  proposal = null,
  query,
  studioPath = '/studio-authoring',
  previewPathForPage,
  actionPaths = {},
  persistence: persistenceInput = null,
} = {}) {
  if (!session || session.kind !== 'hivenues-v2-authoring-session') {
    throw new V2AuthoringStudioError('valid memory-only authoring session is required');
  }
  if (typeof previewPathForPage !== 'function') {
    throw new V2AuthoringStudioError('previewPathForPage must be a function');
  }

  const normalizedStudioPath = strictLocalPath(studioPath, 'Studio path');
  const persistence = normalizePersistence(persistenceInput, session);
  const normalizedActions = {
    propose: strictLocalPath(actionPaths.propose || `${normalizedStudioPath}/propose`, 'propose path'),
    resourceLifecycle: strictLocalPath(actionPaths.resourceLifecycle || `${normalizedStudioPath}/resource-lifecycle`, 'resource lifecycle path'),
    resource: strictLocalPath(actionPaths.resource || `${normalizedStudioPath}/resource`, 'resource path'),
    reorder: strictLocalPath(actionPaths.reorder || `${normalizedStudioPath}/reorder`, 'reorder path'),
    add: strictLocalPath(actionPaths.add || `${normalizedStudioPath}/add`, 'add path'),
    remove: strictLocalPath(actionPaths.remove || `${normalizedStudioPath}/remove`, 'remove path'),
    theme: strictLocalPath(actionPaths.theme || `${normalizedStudioPath}/theme`, 'theme path'),
    media: strictLocalPath(actionPaths.media || `${normalizedStudioPath}/media`, 'media path'),
    mediaImport: strictLocalPath(actionPaths.mediaImport || `${normalizedStudioPath}/media-import`, 'media import path'),
    save: strictLocalPath(actionPaths.save || `${normalizedStudioPath}/save-workspace`, 'save path'),
    studio: normalizedStudioPath,
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
    : proposal?.command.type === REMOVE_RESOURCE
      ? `component:${proposal.resolvedTarget.componentId}` : model.selection.nodeId;
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
  const persistenceBadge = persistence.enabled
    ? `Workspace checkpoint · ${persistence.isPersisted ? 'Saved' : 'Unsaved'}`
    : 'Session draft · memory only';
  const stateTitle = proposalActive
    ? 'Preview — not applied'
    : persistence.enabled && persistence.isPersisted
      ? 'Saved workspace checkpoint'
      : 'Accepted session draft';
  const stateDetail = persistence.enabled
    ? proposalActive
      ? 'Preview remains memory-only · apply or discard before Save · no publishing or deployment'
      : persistence.isPersisted
        ? 'Accepted v2 draft is durable · no publishing · no deployment · no Hive writes'
        : 'Accepted draft differs from durable checkpoint · no publishing · no deployment · no Hive writes'
    : 'No workspace save · no publishing · no deployment · no external effects';
  const memoryNote = persistence.enabled
    ? 'Preview proposals remain memory-only. Save writes only the accepted v2 draft and required managed media to the configured workspace; publishing and deployment remain separate.'
    : 'Canvas changes in this phase are session-memory state only. Publishing and persistence remain separate unauthorized capabilities.';

  return `<!doctype html>
<html lang="en" data-v2-authoring-studio="true">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Authoring Studio · ${escapeHtml(model.venue.displayName)}</title>
<style>
:root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#1d2528;background:#e9edef;color-scheme:light}
*{box-sizing:border-box}body{margin:0}a{color:inherit;text-decoration:none}button,input,textarea,select,a{font:inherit}a,button,input,textarea,select{min-height:44px}a:focus-visible,button:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible{outline:3px solid #0f766e;outline-offset:3px}.skip{position:fixed;top:-90px;left:12px;z-index:50;padding:12px 16px;border-radius:10px;background:#102a2e;color:#fff}.skip:focus{top:12px}
.studio{min-height:100vh;display:grid;grid-template-rows:auto auto 1fr}.topbar{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:14px 22px;border-bottom:1px solid #ccd3d6;background:#fff}.brand{display:flex;align-items:center;gap:14px;min-width:0}.brand-mark{display:grid;place-items:center;width:38px;height:38px;border-radius:11px;background:#143c42;color:#fff;font-weight:900}.eyebrow{margin:0;color:#4b5a5f;font-size:.7rem;font-weight:800;letter-spacing:.11em;text-transform:uppercase}.brand h1{margin:2px 0 0;font-size:1.05rem}.authority-badge{display:inline-flex;align-items:center;gap:7px;padding:7px 10px;border:1px solid #a8b7b7;border-radius:999px;background:#f4f8f7;color:#29494b;font-size:.74rem;font-weight:800}.authority-badge::before{content:"";width:8px;height:8px;border-radius:50%;background:#d69e2e}
.statebar{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:10px 22px;border-bottom:1px solid #ccd3d6;background:#f8fafb}.state-copy strong,.state-copy span{display:block}.state-copy strong{font-size:.82rem}.state-copy span{margin-top:2px;color:#4b5a5f;font-size:.72rem}.digest-pair{display:flex;gap:8px;flex-wrap:wrap}.digest-chip{padding:6px 8px;border-radius:8px;background:#fff;border:1px solid #ccd3d6;font-size:.64rem}.digest-chip strong{display:block}.digest-chip code{font-size:.6rem}
.workspace{display:grid;grid-template-columns:220px minmax(0,1fr) 330px;gap:12px;padding:12px;min-width:0}.panel{min-width:0;border:1px solid #cbd3d6;border-radius:14px;background:#fff;box-shadow:0 3px 16px rgba(28,38,41,.05);overflow:hidden}.panel-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:13px 14px;border-bottom:1px solid #e0e5e7}.panel-head h2{margin:0;font-size:.85rem}.panel-head span{color:#4b5a5f;font-size:.68rem}.tree-panel,.inspector-panel{max-height:calc(100vh - 150px);overflow:auto;position:sticky;top:12px}.tree-list,.field-list{list-style:none;margin:0;padding:8px}.tree-list li{padding-left:calc(var(--depth) * 8px)}.tree-link,.field-link{display:flex;align-items:center;justify-content:space-between;gap:7px;padding:9px;border-radius:9px;border:1px solid transparent}.tree-link strong,.tree-link small,.field-link strong,.field-link small{display:block}.tree-link strong,.field-link strong{font-size:.76rem}.tree-link small,.field-link small{margin-top:2px;color:#536166;font-size:.63rem}.tree-link.is-selected,.field-link.is-selected{border-color:#73a9a1;background:#e8f4f1}.field-link.is-locked{opacity:.66}.selected-chip,.ownership-chip{flex:none;padding:4px 6px;border-radius:999px;background:#edf2f2;color:#395255;font-size:.6rem;font-weight:800}.selected-chip{background:#176b61;color:#fff}
.canvas-panel{background:#dce2e4}.canvas-tools{display:flex;gap:7px;overflow-x:auto;padding:9px;border-bottom:1px solid #cbd3d6;background:#f5f7f8}.canvas-card{display:flex;min-width:170px;max-width:245px;align-items:center;justify-content:space-between;gap:8px;padding:9px 10px;border:1px solid #cbd3d6;border-radius:9px;background:#fff}.canvas-card strong,.canvas-card small{display:block}.canvas-card strong{font-size:.75rem}.canvas-card small{margin-top:2px;color:#536166;font-size:.62rem}.canvas-card.is-selected{border:2px solid #176b61;background:#edf7f4}.preview-area{display:grid;place-items:start center;min-height:620px;padding:18px;overflow:hidden;background:linear-gradient(135deg,#dce2e4,#eef1f2)}.preview-holder{position:relative;overflow:hidden;border:1px solid #adb9bd;border-radius:12px;background:#fff;box-shadow:0 18px 42px rgba(21,34,38,.18)}.preview-holder iframe{position:absolute;top:0;left:0;border:0;background:#fff;transform-origin:top left}.preview-holder.viewport-desktop{width:720px;height:500px}.preview-holder.viewport-desktop iframe{width:1440px;height:1000px;transform:scale(.5)}.preview-holder.viewport-tablet{width:459px;height:612px}.preview-holder.viewport-tablet iframe{width:834px;height:1112px;transform:scale(.55)}.preview-holder.viewport-mobile{width:273px;height:591px}.preview-holder.viewport-mobile iframe{width:390px;height:844px;transform:scale(.70)}.preview-meta{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 13px;border-top:1px solid #cbd3d6;background:#fff;font-size:.68rem}.viewport-options{display:flex;gap:5px;padding:8px;border-top:1px solid #dce2e4;background:#fff}.viewport-option{display:flex;align-items:center;gap:6px;padding:7px 10px;border-radius:8px;color:#536166}.viewport-option span{font-size:.62rem}.viewport-option.is-selected{background:#143c42;color:#fff}
.inspector-summary,.editor-card,.history-card{padding:14px;border-bottom:1px solid #e5e9ea}.resource-controls{display:grid;gap:12px;margin:10px 0}.theme-grid{display:grid;gap:9px;margin:10px 0}.theme-control{display:grid;gap:7px;padding:10px;border:1px solid #d5dcde;border-radius:10px;background:#fbfcfc}.theme-control.is-preview{border-color:#d69e2e;background:#fffaf0}.theme-control>div{display:flex;align-items:center;justify-content:space-between;gap:8px}.theme-control strong,.theme-control label{font-size:.7rem;font-weight:800}.theme-control span{font-size:.6rem;color:#536166}.theme-control p{margin:0;font-size:.76rem;font-weight:800}.theme-control small{color:#536166;font-size:.64rem;line-height:1.4}.theme-control select{width:100%;min-height:44px;padding:10px;border:1px solid #aebbc0;border-radius:9px;background:#fff;color:#1d2528;line-height:1.45}.inspector-summary h2,.editor-card h3,.history-card h3{margin:3px 0 8px}.muted,.target-path,.history-card p{color:#536166;font-size:.72rem;line-height:1.45}.edit-form{display:grid;gap:8px;margin-top:12px}.edit-form label{font-size:.7rem;font-weight:800}.edit-form input,.edit-form textarea,.edit-form select{width:100%;padding:10px;border:1px solid #aebbc0;border-radius:9px;background:#fff;color:#1d2528;line-height:1.45}.edit-form input[type="file"]{padding:8px}.edit-form textarea{resize:vertical;min-height:110px}.form-help{margin:0;color:#536166;font-size:.66rem;line-height:1.4}.button{display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:9px;padding:9px 12px;font-weight:800;cursor:pointer}.button.primary{background:#176b61;color:#fff}.button.secondary{border:1px solid #aebbc0;background:#fff;color:#29494b}.button:disabled{cursor:not-allowed;opacity:.45}.preview-state,.accepted-state{display:grid;gap:3px;margin:10px 0;padding:10px;border-radius:9px}.preview-state{border:1px solid #d69e2e;background:#fff8df;color:#6b4f12}.accepted-state{border:1px solid #9bc8be;background:#edf7f4;color:#29494b}.preview-state span,.accepted-state span{font-size:.66rem}.proposal-actions,.history-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.history-card{display:flex;align-items:center;justify-content:space-between;gap:10px}.history-card p{margin:0}.memory-note{margin:0;padding:9px 14px;border-top:1px solid #dbe2e4;background:#f7faf9;color:#4b5a5f;font-size:.67rem}
@media(max-width:1180px){.workspace{grid-template-columns:190px minmax(0,1fr)}.inspector-panel{grid-column:2;position:static;max-height:none}.preview-holder.viewport-desktop{width:620px;height:431px}.preview-holder.viewport-desktop iframe{transform:scale(.431)}}
@media(max-width:720px){.topbar,.statebar{align-items:flex-start;flex-direction:column;padding:12px}.workspace{display:flex;flex-direction:column;padding:8px}.canvas-panel{order:0}.inspector-panel{order:1;position:static;max-height:none}.tree-panel{order:2;position:static;max-height:none}.preview-area{min-height:0;padding:10px}.preview-holder.viewport-desktop{width:346px;height:240px}.preview-holder.viewport-desktop iframe{transform:scale(.24)}.preview-holder.viewport-tablet{width:334px;height:445px}.preview-holder.viewport-tablet iframe{transform:scale(.40)}.preview-holder.viewport-mobile{width:343px;height:743px}.preview-holder.viewport-mobile iframe{transform:scale(.88)}.history-card{align-items:flex-start;flex-direction:column}}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;animation:none!important;transition:none!important}}
</style>
</head>
<body>
<a class="skip" href="#authoring-canvas-heading">Skip to Canvas</a>
<main class="studio" data-v2-authoring-studio="true" data-accepted-digest="${escapeHtml(session.draftDigest)}" data-preview-digest="${escapeHtml(previewDigest)}" data-studio-persistent="${persistence.enabled ? 'true' : 'false'}" data-studio-persisted="${persistence.enabled && persistence.isPersisted ? 'true' : 'false'}" data-persisted-digest="${escapeHtml(persistence.enabled ? persistence.persistedDigest : '')}" data-studio-runtime-wired="false" data-studio-mutations="true" data-preview-active="${proposalActive ? 'true' : 'false'}">
  <header class="topbar">
    <div class="brand"><span class="brand-mark" aria-hidden="true">H</span><div><p class="eyebrow">HiVenues · Authoring Studio</p><h1>${escapeHtml(model.venue.displayName)}</h1></div></div>
    <span class="authority-badge">${escapeHtml(persistenceBadge)}</span>
  </header>
  <section class="statebar" aria-label="Authoring state">
    <div class="state-copy"><strong>${escapeHtml(stateTitle)}</strong><span>${escapeHtml(stateDetail)}</span></div>
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
      <p class="memory-note">${escapeHtml(memoryNote)}</p>
    </section>
    <aside class="panel inspector-panel" aria-labelledby="authoring-inspector-heading">
      <header class="panel-head"><h2 id="authoring-inspector-heading">Inspector</h2><span>Content · resources · structure · media · theme</span></header>
      <section class="inspector-summary"><p class="eyebrow">Selected context</p><h2>${escapeHtml(model.inspector.label)}</h2><p class="muted">${escapeHtml(humanize(model.inspector.semanticKind))}</p></section>
      <section class="inspector-summary" aria-labelledby="authoring-fields-heading"><h3 id="authoring-fields-heading">Fields</h3>${renderFields(model, source, normalizedStudioPath)}</section>
      ${renderEditor({ model, session, proposal, source, actionPaths: normalizedActions, persistence })}
      ${renderMediaEditor({ model, session, proposal, source, actionPaths: normalizedActions, persistence })}
      ${renderThemeEditor({ model, session, proposal, source, actionPaths: normalizedActions, persistence })}
      ${renderHistoryControls(session, normalizedActions, model)}
      ${renderPersistenceControls(session, proposal, persistence, normalizedActions, model)}
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
