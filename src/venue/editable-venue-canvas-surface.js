'use strict';

const express = require('express');
const { randomBytes, timingSafeEqual } = require('node:crypto');
const { canvasTextField } = require('./canvas-source-preview');
const { createSetFieldCommand } = require('./semantic-venue-canvas-contract');
const { renderVenueCanvasFrame, parseReadOnlyVenueCanvasQuery, projectStudioSource } = require('./read-only-venue-canvas-surface');

const MESSAGES = Object.freeze({
  ready: 'Preview a text change, then review it in your venue.',
  success: 'Preview updated. Use the form editor to keep or undo this change.',
  invalid: 'That change could not be previewed. Check the text and try again. Your draft is unchanged.',
  conflict: 'Your draft changed in another action. Current values are shown below. Review them before previewing again.',
  unsupported: 'This field is read-only here. Use the form editor for its supported controls.',
});
function escapeHtml(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}
function renderEditableVenueCanvasSurface({ session, editorPath, previewPath, token, selectionInput, outcome = 'ready', attemptedValue }) {
  const source = session.proposalDraft;
  const projection = projectStudioSource(source, selectionInput);
  const { blockId, fieldId } = projection.selection;
  const field = fieldId ? canvasTextField(source, blockId, fieldId) : null;
  if (!field?.editable && outcome === 'ready') outcome = 'unsupported';
  const text = fieldId ? projection.inspector.fields.find((x) => x.fieldId === fieldId)?.label : 'Text field';
  const value = outcome === 'invalid' && typeof attemptedValue === 'string' ? attemptedValue : field?.value;
  const invalid = (outcome === 'invalid' ? ' aria-invalid="true"' : '') + (field?.required ? ' aria-required="true"' : '');
  const hidden = (name, v) => `<input type="hidden" name="${name}" value="${escapeHtml(v)}">`;
  const control = field?.controlKind === 'multiline-text'
    ? `<textarea id="canvas-field-value" name="value" rows="5" aria-describedby="canvas-edit-status"${invalid}>${escapeHtml(value)}</textarea>`
    : `<input id="canvas-field-value" name="value" type="text" value="${escapeHtml(value)}" aria-describedby="canvas-edit-status"${invalid}>`;
  const inspector = `<section class="canvas-editor" data-edit-outcome="${outcome}"><p id="canvas-edit-status" role="${['invalid', 'conflict'].includes(outcome) ? 'alert' : 'status'}">${MESSAGES[outcome]}</p>${field?.editable ? `<form method="post" action="${escapeHtml(editorPath)}/canvas-editor" data-canvas-edit-form>${hidden('token', token)}${hidden('revision', session.proposalRevision())}${hidden('blockId', blockId)}${hidden('fieldId', fieldId)}<label for="canvas-field-value">${escapeHtml(text)}${field.required ? '' : ' (optional)'}</label>${control}<button type="submit">Preview change</button></form>` : '<p data-canvas-unsupported>Select an available text field to edit its preview.</p>'}</section>`;
  return renderVenueCanvasFrame({ sourceInput: source, selectionInput, editorPath, previewPath, dirty: session.status().dirty }, {
    canvasPath: editorPath + '/canvas-editor', inspector,
    style: `.canvas-editor { margin: 10px; padding: 12px; background: #f7f8f3; border: 1px solid #d4d9cc; border-radius: 8px; }
      .canvas-editor p { margin: 0 0 12px; font-size: .83rem; line-height: 1.5; overflow-wrap: anywhere; }
      .canvas-editor label { display: block; margin-bottom: 7px; font-weight: 700; font-size: .87rem; }
      .canvas-editor input:not([type=hidden]), .canvas-editor textarea { display: block; width: 100%; min-width: 44px; min-height: 44px; padding: 10px; border: 1px solid #727c66; border-radius: 6px; font: inherit; font-size: .9rem; background: #fff; color: #242522; }
      .canvas-editor textarea { resize: vertical; }
      .canvas-editor button { width: 100%; min-height: 44px; margin-top: 12px; border: 0; border-radius: 7px; padding: 10px; background: #263d2d; color: #fff; font: inherit; font-weight: 700; cursor: pointer; }
      .canvas-editor :is(input,textarea,button):focus-visible { outline: 3px solid #a3460c; outline-offset: 3px; }
      .canvas-editor [aria-invalid=true] { border: 2px solid #9d321e; }
      [data-edit-outcome=invalid], [data-edit-outcome=conflict] { border-left: 4px solid #9d321e; }
      @media (min-width:1101px) { .workspace { grid-template-columns: 190px minmax(0,1fr) 310px; } }
      .canvas-fields { margin: 10px; } .canvas-fields summary { min-height: 44px; min-width: 44px; padding: 12px; cursor: pointer; }
      @media (max-width:700px) { .inspector { order: 0; } .canvas { order: 1; } .tree { order: 2; } .inspector > [data-diagnostics] { display: none; } .inspector-context { margin-bottom: 0; } }`,
  });
}

function createEditableVenueCanvasRouter(surface) {
  const router = express.Router();
  const pathname = surface.editorPath + '/canvas-editor';
  const token = randomBytes(32).toString('hex');
  const render = (selectionInput, outcome, attemptedValue) => renderEditableVenueCanvasSurface({ ...surface, token, selectionInput, outcome, attemptedValue });
  router.use(pathname, (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  router.get(pathname, (req, res) => {
    try { res.type('html').send(render(parseReadOnlyVenueCanvasQuery(req.query), 'ready')); }
    catch { res.status(400).type('text').send('That Canvas selection is unavailable. Return to the form editor and choose Canvas again.'); }
  });
  router.post(pathname, express.urlencoded({ extended: false, limit: '32kb', parameterLimit: 6 }), (req, res) => {
    let selection;
    try {
      if (Object.keys(req.query).length) throw new TypeError('Unexpected query');
      const body = req.body;
      const keys = ['token', 'revision', 'blockId', 'fieldId', 'value'];
      if (!body || Object.keys(body).length !== keys.length || keys.some((key) => typeof body[key] !== 'string')) throw new TypeError('Malformed form');
      const origin = new URL(req.get('Origin'));
      if (origin.origin !== req.get('Origin') || origin.origin !== `${req.protocol}://${req.get('Host')}`
        || !['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname)) throw new TypeError('Origin rejected');
      if (!/^[a-f0-9]{64}$/.test(body.token) || !timingSafeEqual(Buffer.from(body.token), Buffer.from(token))) throw new TypeError('Token rejected');
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
  router.use(pathname, (error, _req, res, next) => {
    if (!error) return next();
    res.status(error.status === 413 ? 413 : 400).type('text').send('Canvas request rejected. Your draft is unchanged.');
  });
  return router;
}

module.exports = { createEditableVenueCanvasRouter, renderEditableVenueCanvasSurface };
