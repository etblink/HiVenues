'use strict';

const express = require('express');
const { randomBytes, timingSafeEqual } = require('node:crypto');
const { EQUIPMENT_COLLECTION, canvasEquipmentCollection, canvasMoveItem, canvasEditableField } = require('./canvas-source-preview');
const { createSetFieldCommand } = require('./semantic-venue-canvas-contract');
const { renderVenueCanvasFrame, parseReadOnlyVenueCanvasQuery, projectStudioSource } = require('./read-only-venue-canvas-surface');

const MESSAGES = Object.freeze({
  ready: 'Preview a supported change, then review it in your venue.',
  success: 'Preview updated. Use Undo preview here, or keep the draft in the form editor.',
  added: 'Equipment added to your preview. Review it here, then keep the draft in the form editor.',
  removed: 'Equipment removed from your preview. Undo preview restores it.',
  move: 'Item order preview updated. Review the real venue renderer, then undo here or keep the draft in the form editor.',
  undo: 'Preview change undone. You can redo it while the shared draft stays unchanged elsewhere.',
  redo: 'Preview change redone. Review it in the real venue renderer before keeping the draft.',
  invalid: 'That change could not be previewed. Review the current field or item and try again. Your draft is unchanged.',
  conflict: 'Your draft changed in another action. Current values are shown below. Review them before previewing again.',
  unsupported: 'This field is read-only here. Use the form editor for its supported controls.',
});
function escapeHtml(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}
function renderEditableVenueCanvasSurface({ session, editorPath, previewPath, token, selectionInput, outcome = 'ready', attemptedValue, attemptedEquipment }) {
  const source = session.proposalDraft;
  const projection = projectStudioSource(source, selectionInput);
  const { blockId, fieldId } = projection.selection;
  const field = fieldId ? canvasEditableField(source, blockId, fieldId) : null;
  const move = canvasMoveItem(source, blockId);
  const equipment = blockId === EQUIPMENT_COLLECTION && !fieldId ? canvasEquipmentCollection(source, blockId) : null;
  if (!equipment && !field?.editable && !move.editable && outcome === 'ready') outcome = 'unsupported';
  const text = fieldId ? projection.inspector.fields.find((x) => x.fieldId === fieldId)?.label : 'Text field';
  const value = outcome === 'invalid' && typeof attemptedValue === 'string' ? attemptedValue : field?.value;
  const invalid = (outcome === 'invalid' ? ' aria-invalid="true"' : '') + (field?.required ? ' aria-required="true"' : '');
  const hidden = (name, v) => `<input type="hidden" name="${name}" value="${escapeHtml(v)}">`;
  const history = session.canvasHistoryStatus();
  const historyRevision = session.proposalRevision();
  const historyAction = (action, entry) => {
    const enabled = Boolean(entry);
    const label = action === 'undo' ? 'Undo preview' : 'Redo preview';
    const state = enabled
      ? entry.fieldId ? `${entry.blockId} / ${entry.fieldId}` : `${entry.itemLabel || entry.blockId} / ${{ 'move-item': 'reorder', 'insert-item': 'add equipment', 'remove-item': 'remove equipment' }[entry.type] || entry.type}`
      : `No preview available to ${action}`;
    return `<form method="post" action="${escapeHtml(editorPath)}/canvas-editor/history" data-canvas-history-form>${hidden('token', token)}${hidden('revision', historyRevision)}${hidden('action', action)}${hidden('blockId', blockId)}${hidden('fieldId', fieldId || '')}<button type="submit" data-canvas-history-action="${action}"${enabled ? '' : ' disabled aria-disabled="true"'}>${label}</button><span>${escapeHtml(state)}</span></form>`;
  };
  const timeHelp = field?.editable && field.controlKind === 'datetime-offset'
    ? '<p id="canvas-field-help">Enter the actual check time with a timezone, for example 2026-09-06T12:00:00Z (UTC) or 2026-09-06T05:00:00-07:00.</p>' : '';
  const choiceOptions = field?.controlKind === 'select' ? field.options : [];
  const rejectedChoice = field?.controlKind === 'select' && !choiceOptions.includes(value)
    ? `<option value="${escapeHtml(value)}" selected disabled>${value ? 'Unavailable status: ' + escapeHtml(value) : 'Choose status'}</option>` : '';
  const control = field?.controlKind === 'select'
    ? `<select id="canvas-field-value" name="value" aria-describedby="canvas-edit-status"${invalid}>${rejectedChoice}${choiceOptions.map(option => `<option value="${escapeHtml(option)}"${option === value ? ' selected' : ''}>${escapeHtml(option[0].toUpperCase() + option.slice(1))}</option>`).join('')}</select>`
    : field?.controlKind === 'multiline-text'
    ? `<textarea id="canvas-field-value" name="value" rows="5" aria-describedby="canvas-edit-status"${invalid}>${escapeHtml(value)}</textarea>`
    : `<input id="canvas-field-value" name="value" type="text" value="${escapeHtml(value)}" aria-describedby="canvas-edit-status${timeHelp ? ' canvas-field-help' : ''}"${timeHelp ? ' maxlength="40"' : ''}${invalid}>`;
  const textEditor = field?.editable
    ? `<form method="post" action="${escapeHtml(editorPath)}/canvas-editor" data-canvas-edit-form>${hidden('token', token)}${hidden('revision', session.proposalRevision())}${hidden('blockId', blockId)}${hidden('fieldId', fieldId)}<label for="canvas-field-value">${escapeHtml(text)}${field.required ? '' : ' (optional)'}</label>${control}${timeHelp}<button type="submit">Preview change</button></form>`
    : fieldId ? '<p data-canvas-unsupported>This field is read-only in Canvas.</p>' : '';
  const moveAction = (direction, enabled) => `<form method="post" action="${escapeHtml(editorPath)}/canvas-editor/move" data-canvas-move-form>${hidden('token', token)}${hidden('revision', session.proposalRevision())}${hidden('blockId', blockId)}${hidden('fieldId', fieldId || '')}${hidden('direction', direction)}<button type="submit" data-canvas-move-action="${direction}"${enabled ? '' : ' disabled aria-disabled="true"'}>Move ${direction}</button></form>`;
  const moveDestinationOptions = move.destinations.map((destination) => `<option value="${escapeHtml(destination.value)}"${destination.current ? ' disabled data-current="true"' : ''}>Position ${destination.position}${destination.current ? ' — current' : destination.beforeBlockId === null ? ' — end' : ''}</option>`).join('');
  const moveToForm = move.editable
    ? `<form method="post" action="${escapeHtml(editorPath)}/canvas-editor/move-to" data-canvas-move-to-form>${hidden('token', token)}${hidden('revision', session.proposalRevision())}${hidden('blockId', blockId)}${hidden('fieldId', fieldId || '')}<label for="canvas-move-destination">Move to…</label><select id="canvas-move-destination" name="destination" data-canvas-move-destination required><option value="" selected>Choose a position</option>${moveDestinationOptions}</select><button type="submit" data-canvas-move-to-action>Move to selected position</button></form>`
    : '';
  const moveEditor = move.editable
    ? `<section class="canvas-move" data-canvas-move data-can-move-up="${move.canMoveUp}" data-can-move-down="${move.canMoveDown}" data-current-position="${move.index + 1}" aria-label="Item order preview"><p><strong>Item order</strong><br>Move this existing item one position, or choose a stable destination directly. Use Undo preview to restore its previous position.</p><div class="canvas-move-actions">${moveAction('up', move.canMoveUp)}${moveAction('down', move.canMoveDown)}</div>${moveToForm}</section>`
    : '';
  const selectionUrl = (id) => `${escapeHtml(editorPath)}/canvas-editor?blockId=${encodeURIComponent(id)}#selection-summary`;
  const equipmentFields = [
    ['name', 'Equipment name', 'text'], ['state', 'Status', 'select'],
    ['note', 'Status note', 'text'], ['accessNote', 'Access instructions', 'text'],
    ['lastUpdated', 'Status checked at', 'text'], ['group', 'Group (optional)', 'text'],
  ];
  const addEditor = equipment ? `<section class="canvas-equipment" data-canvas-equipment data-count="${equipment.count}" data-capacity="${equipment.maximum}" aria-label="Equipment list">
    <p><strong>Equipment list</strong><br>${equipment.count} of ${equipment.maximum} items.${equipment.count === 0 ? ' Add your first item below.' : ''}</p>
    ${equipment.canAdd ? `<form method="post" action="${escapeHtml(editorPath)}/canvas-editor/equipment/add" data-canvas-equipment-add-form>
      ${hidden('token', token)}${hidden('revision', historyRevision)}${hidden('blockId', blockId)}
      ${equipmentFields.map(([key, label, kind]) => {
        const value = attemptedEquipment?.[key] || '';
        const required = key === 'group' ? '' : ' required';
        const control = kind === 'select'
          ? `<select id="equipment-${key}" name="${key}"${required}><option value="">Choose status</option>${['available', 'limited', 'maintenance', 'offline'].map(state => `<option value="${state}"${state === value ? ' selected' : ''}>${state[0].toUpperCase() + state.slice(1)}</option>`).join('')}</select>`
          : `<input id="equipment-${key}" name="${key}" value="${escapeHtml(value)}" maxlength="${key === 'lastUpdated' ? 40 : 240}"${required}${key === 'lastUpdated' ? ' aria-describedby="equipment-time-help" placeholder="2026-09-06T12:00:00Z"' : ''}>`;
        return `<div class="equipment-field"><label for="equipment-${key}">${label}</label>${control}${key === 'lastUpdated' ? '<p id="equipment-time-help">Enter the actual check time with a timezone, for example 2026-09-06T12:00:00Z (UTC).</p>' : ''}</div>`;
      }).join('')}
      ${outcome === 'invalid' ? '<p role="alert">Check the required fields, status, and timestamp. Your entries are retained for correction.</p>' : ''}
      <button type="submit" data-canvas-equipment-add>Add equipment to preview</button>
    </form>` : '<p data-canvas-equipment-full>The list is full. Remove an item before adding another.</p>'}
  </section>` : '';
  const removeEditor = move.editable && !fieldId ? `<section class="canvas-equipment" aria-label="Equipment actions">
    <a class="equipment-link" href="${selectionUrl(EQUIPMENT_COLLECTION)}">Equipment list · Add equipment</a>
    <details data-canvas-equipment-confirm><summary>Remove equipment…</summary>
      <p>Remove <strong>${escapeHtml(source.venuePackage.home.equipmentStatus.items.find(item => item.id === move.itemId).name)}</strong> from this preview? You can restore it with Undo preview.</p>
      <form method="post" action="${escapeHtml(editorPath)}/canvas-editor/equipment/remove" data-canvas-equipment-remove-form>
        ${hidden('token', token)}${hidden('revision', historyRevision)}${hidden('blockId', blockId)}${hidden('confirmation', blockId)}
        <button type="submit" data-canvas-equipment-remove>Remove equipment from preview</button>
      </form><a class="equipment-link" data-canvas-equipment-cancel href="${selectionUrl(blockId)}">Cancel removal</a>
    </details></section>` : '';
  const fallback = !textEditor && !moveEditor && !addEditor ? '<p data-canvas-unsupported>Select an editable field or a supported movable item.</p>' : '';
  const feedback = outcome === 'invalid' && field?.editable && field.controlKind === 'datetime-offset'
    ? 'Enter a real calendar date and time with a timezone. Your draft is unchanged.'
    : outcome === 'invalid' && field?.editable && field.controlKind === 'select'
      ? 'Choose one of the listed equipment statuses. Your draft is unchanged.' : MESSAGES[outcome];
  const inspector = `<section class="canvas-editor" data-edit-outcome="${outcome}"><p id="canvas-edit-status" role="${['invalid', 'conflict'].includes(outcome) ? 'alert' : 'status'}">${feedback}</p>${textEditor}${moveEditor}${addEditor}${removeEditor}${fallback}<section class="canvas-history" data-canvas-history data-undo-count="${history.undoCount}" data-redo-count="${history.redoCount}" aria-label="Session preview history"><p><strong>Session preview history</strong><br>Up to ${history.limit} Canvas preview changes. History is cleared by other draft actions and is never saved.</p>${historyAction('undo', history.undo)}${historyAction('redo', history.redo)}</section></section>`;
  return renderVenueCanvasFrame({ sourceInput: source, selectionInput, editorPath, previewPath, dirty: session.status().dirty }, {
    canvasPath: editorPath + '/canvas-editor', inspector,
    style: `.canvas-editor { margin: 10px; padding: 12px; background: #f7f8f3; border: 1px solid #d4d9cc; border-radius: 8px; }
      .canvas-editor p { margin: 0 0 12px; font-size: .83rem; line-height: 1.5; overflow-wrap: anywhere; }
      .canvas-editor label { display: block; margin-bottom: 7px; font-weight: 700; font-size: .87rem; }
      .canvas-editor input:not([type=hidden]), .canvas-editor textarea, .canvas-editor select { display: block; width: 100%; min-width: 44px; min-height: 44px; padding: 10px; border: 1px solid #727c66; border-radius: 6px; font: inherit; font-size: .9rem; background: #fff; color: #242522; }
      .canvas-editor textarea { resize: vertical; }
      .canvas-editor button { width: 100%; min-height: 44px; margin-top: 12px; border: 0; border-radius: 7px; padding: 10px; background: #263d2d; color: #fff; font: inherit; font-weight: 700; cursor: pointer; }
      .canvas-editor button:disabled { cursor: not-allowed; opacity: .55; }
      .canvas-move { margin-top: 12px; padding: 12px; border: 1px solid #d4d9cc; border-radius: 7px; background: #fff; }
      .canvas-move-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
      .canvas-move-actions form button { margin-top: 0; }
      .canvas-move [data-canvas-move-to-form] { margin-top: 12px; padding-top: 12px; border-top: 1px solid #e1e5dc; }
      .canvas-move [data-canvas-move-to-form] button { margin-top: 8px; }
      .canvas-equipment { margin-top: 12px; }
      .equipment-field { margin-top: 12px; }
      .equipment-field p { margin-top: 6px; }
      .canvas-equipment summary, .equipment-link { display: block; min-height: 44px; min-width: 44px; padding: 12px 4px; }
      .canvas-equipment summary { display: list-item; cursor: pointer; }
      .canvas-equipment :is(a,summary):focus-visible { outline: 3px solid #a3460c; outline-offset: 3px; }
      .canvas-equipment [data-canvas-equipment-remove] { background: #8b3220; }
      .canvas-history { margin-top: 14px; padding-top: 12px; border-top: 1px solid #d4d9cc; }
      .canvas-history form { display: grid; grid-template-columns: minmax(112px,.8fr) minmax(0,1fr); gap: 8px; align-items: center; margin-top: 8px; }
      .canvas-history form button { margin-top: 0; }
      .canvas-history form span { font-size: .76rem; line-height: 1.35; overflow-wrap: anywhere; }
      .canvas-editor :is(input,textarea,select,button):focus-visible { outline: 3px solid #a3460c; outline-offset: 3px; }
      .canvas-editor [aria-invalid=true] { border: 2px solid #9d321e; }
      [data-edit-outcome=invalid], [data-edit-outcome=conflict] { border-left: 4px solid #9d321e; }
      @media (min-width:1101px) { .workspace { grid-template-columns: 190px minmax(0,1fr) 310px; } }
      .canvas-fields { margin: 10px; } .canvas-fields summary { min-height: 44px; min-width: 44px; padding: 12px; cursor: pointer; }
      @media (max-width:700px) { .inspector { order: 0; } .canvas { order: 1; width: calc(100% + 16px); margin-inline: -8px; border-left: 0; border-right: 0; border-radius: 0; } .tree { order: 2; } .inspector > [data-diagnostics] { display: none; } .inspector-context { margin-bottom: 0; } }`,
  });
}

function validateLoopbackPost(req, token, keys) {
  const body = req.body;
  if (Object.keys(req.query).length) throw new TypeError('Unexpected query');
  if (!body || Object.keys(body).length !== keys.length || keys.some((key) => typeof body[key] !== 'string')) {
    throw new TypeError('Malformed form');
  }
  const origin = new URL(req.get('Origin'));
  if (origin.origin !== req.get('Origin') || origin.origin !== `${req.protocol}://${req.get('Host')}`
    || !['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname)) throw new TypeError('Origin rejected');
  if (!/^[a-f0-9]{64}$/.test(body.token) || !timingSafeEqual(Buffer.from(body.token), Buffer.from(token))) {
    throw new TypeError('Token rejected');
  }
  return body;
}

function selectionFromPost(body) {
  return parseReadOnlyVenueCanvasQuery(body.fieldId
    ? { blockId: body.blockId, fieldId: body.fieldId }
    : { blockId: body.blockId });
}

function createEditableVenueCanvasRouter(surface) {
  const router = express.Router();
  const pathname = surface.editorPath + '/canvas-editor';
  const token = randomBytes(32).toString('hex');
  const render = (selectionInput, outcome, attemptedValue, attemptedEquipment) => renderEditableVenueCanvasSurface({ ...surface, token, selectionInput, outcome, attemptedValue, attemptedEquipment });
  router.use(pathname, (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  router.get(pathname, (req, res) => {
    try { res.type('html').send(render(parseReadOnlyVenueCanvasQuery(req.query), 'ready')); }
    catch { res.status(400).type('text').send('That Canvas selection is unavailable. Return to the form editor and choose Canvas again.'); }
  });
  router.post(pathname, express.urlencoded({ extended: false, limit: '32kb', parameterLimit: 6 }), (req, res) => {
    let selection;
    try {
      const body = validateLoopbackPost(req, token, ['token', 'revision', 'blockId', 'fieldId', 'value']);
      // Syntax before revision; resolve IDs only after revision to distinguish stale removal.
      selection = parseReadOnlyVenueCanvasQuery({ blockId: body.blockId, fieldId: body.fieldId });
      surface.session.previewCanvasField(createSetFieldCommand(body), body.revision);
      res.type('html').send(render(selection, 'success'));
    } catch (error) {
      const conflict = error.code === 'STALE_CANVAS_PROPOSAL';
      if (selection) {
        try { projectStudioSource(surface.session.proposalDraft, selection); }
        catch { selection = undefined; }
        res.status(conflict ? 409 : 400).type('html').send(render(selection, conflict ? 'conflict' : 'invalid', conflict ? undefined : req.body.value));
      } else res.status(400).type('text').send('Canvas request rejected. Your draft is unchanged.');
    }
  });
  router.post(pathname + '/move', express.urlencoded({ extended: false, limit: '32kb', parameterLimit: 5 }), (req, res) => {
    let selection;
    try {
      const body = validateLoopbackPost(req, token, ['token', 'revision', 'blockId', 'fieldId', 'direction']);
      if (!['up', 'down'].includes(body.direction)) throw new TypeError('Unsupported move direction');
      selection = selectionFromPost(body);
      if (body.revision === surface.session.proposalRevision()) projectStudioSource(surface.session.proposalDraft, selection);
      surface.session.previewCanvasMove(body.blockId, body.direction, body.revision);
      res.type('html').send(render(selection, 'move'));
    } catch (error) {
      const conflict = ['STALE_CANVAS_PROPOSAL', 'CANVAS_HISTORY_CONFLICT'].includes(error.code);
      if (selection) {
        try { projectStudioSource(surface.session.proposalDraft, selection); }
        catch { selection = undefined; }
        res.status(conflict ? 409 : 400).type('html').send(render(selection, conflict ? 'conflict' : 'invalid'));
      } else res.status(conflict ? 409 : 400).type('text').send('Canvas move request rejected. Your draft is unchanged.');
    }
  });
  router.post(pathname + '/move-to', express.urlencoded({ extended: false, limit: '32kb', parameterLimit: 5 }), (req, res) => {
    let selection;
    try {
      const body = validateLoopbackPost(req, token, ['token', 'revision', 'blockId', 'fieldId', 'destination']);
      selection = selectionFromPost(body);
      if (body.revision === surface.session.proposalRevision()) projectStudioSource(surface.session.proposalDraft, selection);
      surface.session.previewCanvasMoveTo(body.blockId, body.destination, body.revision);
      res.type('html').send(render(selection, 'move'));
    } catch (error) {
      const conflict = ['STALE_CANVAS_PROPOSAL', 'CANVAS_HISTORY_CONFLICT'].includes(error.code);
      if (selection) {
        try { projectStudioSource(surface.session.proposalDraft, selection); }
        catch { selection = undefined; }
        res.status(conflict ? 409 : 400).type('html').send(render(selection, conflict ? 'conflict' : 'invalid'));
      } else res.status(conflict ? 409 : 400).type('text').send('Canvas move-to request rejected. Your draft is unchanged.');
    }
  });
  router.post(pathname + '/equipment/add', express.urlencoded({ extended: false, limit: '32kb', parameterLimit: 9 }), (req, res) => {
    let selection;
    try {
      const body = validateLoopbackPost(req, token, ['token', 'revision', 'blockId', 'name', 'state', 'note', 'accessNote', 'lastUpdated', 'group']);
      selection = parseReadOnlyVenueCanvasQuery({ blockId: body.blockId });
      const { name, state, note, accessNote, lastUpdated, group } = body;
      const added = surface.session.previewCanvasAddEquipment(body.blockId, { name, state, note, accessNote, lastUpdated, group }, body.revision);
      res.type('html').send(render(parseReadOnlyVenueCanvasQuery({ blockId: added.blockId }), 'added'));
    } catch (error) {
      const conflict = error.code === 'STALE_CANVAS_PROPOSAL';
      if (selection) {
        try { projectStudioSource(surface.session.proposalDraft, selection); }
        catch { selection = undefined; }
        res.status(conflict ? 409 : 400).type('html').send(render(selection, conflict ? 'conflict' : 'invalid', undefined, conflict ? undefined : req.body));
      } else res.status(400).type('text').send('Equipment request rejected. Your draft is unchanged.');
    }
  });
  router.post(pathname + '/equipment/remove', express.urlencoded({ extended: false, limit: '32kb', parameterLimit: 4 }), (req, res) => {
    let selection;
    try {
      const body = validateLoopbackPost(req, token, ['token', 'revision', 'blockId', 'confirmation']);
      selection = parseReadOnlyVenueCanvasQuery({ blockId: body.blockId });
      if (body.confirmation !== body.blockId) throw new TypeError('Item confirmation required');
      surface.session.previewCanvasRemoveEquipment(body.blockId, body.revision);
      res.type('html').send(render(parseReadOnlyVenueCanvasQuery({ blockId: EQUIPMENT_COLLECTION }), 'removed'));
    } catch (error) {
      const conflict = error.code === 'STALE_CANVAS_PROPOSAL';
      if (selection) {
        try { projectStudioSource(surface.session.proposalDraft, selection); }
        catch { selection = undefined; }
        res.status(conflict ? 409 : 400).type('html').send(render(selection, conflict ? 'conflict' : 'invalid'));
      } else res.status(400).type('text').send('Equipment request rejected. Your draft is unchanged.');
    }
  });
  router.post(pathname + '/history', express.urlencoded({ extended: false, limit: '32kb', parameterLimit: 5 }), (req, res) => {
    let selection;
    try {
      const body = validateLoopbackPost(req, token, ['token', 'revision', 'action', 'blockId', 'fieldId']);
      if (!['undo', 'redo'].includes(body.action)) throw new TypeError('Unsupported history action');
      selection = selectionFromPost(body);
      if (body.revision === surface.session.proposalRevision()) projectStudioSource(surface.session.proposalDraft, selection);
      const entry = surface.session.canvasHistoryStatus()[body.action];
      if (body.action === 'undo') surface.session.undoCanvasPreview(body.revision);
      else surface.session.redoCanvasPreview(body.revision);
      if (entry?.type === 'insert-item') selection = parseReadOnlyVenueCanvasQuery({ blockId: body.action === 'undo' ? EQUIPMENT_COLLECTION : entry.itemBlockId });
      else if (entry?.type === 'remove-item') selection = parseReadOnlyVenueCanvasQuery({ blockId: body.action === 'undo' ? entry.blockId : EQUIPMENT_COLLECTION });
      res.type('html').send(render(selection, body.action));
    } catch (error) {
      const conflict = ['STALE_CANVAS_PROPOSAL', 'CANVAS_HISTORY_CONFLICT'].includes(error.code);
      if (selection) {
        try { projectStudioSource(surface.session.proposalDraft, selection); }
        catch { selection = undefined; }
        res.status(conflict ? 409 : 400).type('html').send(render(selection, conflict ? 'conflict' : 'invalid'));
      } else res.status(conflict ? 409 : 400).type('text').send('Canvas history request rejected. Your draft is unchanged.');
    }
  });
  router.use(pathname, (error, _req, res, next) => {
    if (!error) return next();
    res.status(error.status === 413 ? 413 : 400).type('text').send('Canvas request rejected. Your draft is unchanged.');
  });
  return router;
}

module.exports = { createEditableVenueCanvasRouter, renderEditableVenueCanvasSurface };
