'use strict';

const { URLSearchParams } = require('node:url');
const {
  createReadOnlyVenueCanvasProjection,
  createVenueCanvasSelection,
  parseVenueCanvasSelection,
} = require('./read-only-venue-canvas-projection');
const { createDeploymentAgnosticVenueSource } = require('./source');

const SAFE_READ_ONLY_VENUE_CANVAS_ERROR = 'The selected Canvas item is unavailable. Return to Canvas and choose another item.';

function escapeHtml(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function surfacePath(value) {
  if (typeof value !== 'string' || !/^\/(?!\/)[^?#\s\\]+$/.test(value) || value.endsWith('/')) {
    throw new TypeError('A local surface path is required');
  }
  return value;
}

function readOnlyVenueCanvasPath(editorPath) {
  return surfacePath(editorPath) + '/canvas';
}

function parseReadOnlyVenueCanvasQuery(query) {
  if (!query || typeof query !== 'object' || Array.isArray(query)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(query))) {
    throw new TypeError('Invalid Canvas query');
  }
  const keys = Reflect.ownKeys(query);
  if (keys.length === 0) return undefined;
  if (!keys.includes('blockId') || keys.length > 2 || keys.some((key) => !['blockId', 'fieldId'].includes(key))) {
    throw new TypeError('Invalid Canvas query keys');
  }
  for (const key of keys) {
    const property = Object.getOwnPropertyDescriptor(query, key);
    if (!property.enumerable || !Object.hasOwn(property, 'value')
      || typeof property.value !== 'string' || property.value.length === 0) {
      throw new TypeError('Canvas query requires scalar strings');
    }
  }
  return createVenueCanvasSelection(keys.includes('fieldId')
    ? { blockId: query.blockId, fieldId: query.fieldId }
    : { blockId: query.blockId });
}

function selectionHref(canvasPath, input) {
  const selection = parseVenueCanvasSelection(input);
  const query = new URLSearchParams({ blockId: selection.blockId });
  if (selection.fieldId !== null) query.set('fieldId', selection.fieldId);
  return surfacePath(canvasPath) + '?' + query.toString() + '#selection-summary';
}

function projectStudioSource(sourceInput, selectionInput) {
  const source = createDeploymentAgnosticVenueSource(sourceInput);
  // The earlier model accepts a bound-authoring envelope. This private adapter
  // supplies a local sentinel only; it neither binds nor changes the Studio source.
  return createReadOnlyVenueCanvasProjection({
    schemaVersion: source.schemaVersion,
    deploymentRef: { id: 'offline-read-only-canvas-projection' },
    venueContext: source.venueContext,
    venuePackage: source.venuePackage,
  }, selectionInput);
}

function label(value) {
  return value.replace(/^Venue equipment status item: /, '').replace(/^Venue program: /, '')
    .replace(/^Venue /, '').replace(/ fixed topology$/, '');
}

function selectionAttributes(selection) {
  return `data-selection-block-id="${escapeHtml(selection.blockId)}" data-selection-field-id="${escapeHtml(selection.fieldId)}"`;
}

function renderReadOnlyVenueCanvasSurface({ sourceInput, selectionInput, editorPath, previewPath, dirty = false }) {
  const canvasPath = readOnlyVenueCanvasPath(editorPath);
  surfacePath(previewPath);
  if (typeof dirty !== 'boolean') throw new TypeError('dirty must be a boolean');
  const projection = projectStudioSource(sourceInput, selectionInput);
  const selection = projection.selection;
  const selectedField = projection.inspector.fields.find((field) => field.selected);
  const selectedLabel = label(projection.inspector.block.label);
  const attrs = selectionAttributes(selection);
  const target = (blockId, fieldId = null) => projection.navigation.targets.find((entry) => entry.blockId === blockId && entry.fieldId === fieldId);
  const link = (value) => escapeHtml(selectionHref(canvasPath, value));
  const state = (selected) => `data-selected="${selected}"${selected ? ' aria-current="location" class="selected"' : ''}`;
  const marker = '<span class="selected-marker">Selected</span>';
  const tree = projection.tree.rows.map((row) => `<li style="--depth:${row.depth}"><a data-tree-row data-block-id="${escapeHtml(row.blockId)}" ${state(row.selected)} href="${link(target(row.blockId))}"><span>${escapeHtml(label(row.label))}</span>${row.selected ? marker : ''}</a></li>`).join('');
  const cards = projection.canvas.cards.filter((card) => card.selected || card.parentBlockId === selection.blockId)
    .map((card) => `<a data-canvas-card data-block-id="${escapeHtml(card.blockId)}" ${state(card.selected)} href="${link(target(card.blockId))}"><strong>${escapeHtml(label(card.label))}</strong>${card.selected ? marker : '<span aria-hidden="true">→</span>'}</a>`).join('');
  const fields = projection.inspector.fields.map((field) => `<li><a data-inspector-field data-field-id="${escapeHtml(field.fieldId)}" ${state(field.selected)} href="${link(target(selection.blockId, field.fieldId))}"><span><strong>${escapeHtml(field.label)}</strong><small>${field.required ? 'Required' : 'Optional'} field</small></span>${field.selected ? marker : '<span aria-hidden="true">→</span>'}</a></li>`).join('');
  const navigation = [
    ['previous', 'Previous'], ['next', 'Next'], ['containingBlock', 'Containing block'],
    ['parentBlock', 'Parent block'], ['firstChild', 'First child'], ['firstField', 'First field'],
  ].map(([key, text]) => projection.navigation[key]
    ? `<a data-navigation="${key}" href="${link(projection.navigation[key])}">${text}</a>`
    : `<span aria-disabled="true">${text}</span>`).join('');

  return `<!doctype html>
<html lang="en" data-read-only-venue-canvas="true"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Venue Canvas — ${escapeHtml(sourceInput.venueContext.displayName)}</title>
<style>
  :root { font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: #242522; background: #eeefeb; color-scheme: light; }
  * { box-sizing: border-box; } body { margin: 0; } a { color: inherit; text-decoration: none; }
  a, summary { min-height: 44px; min-width: 44px; }
  a:focus-visible, summary:focus-visible, [tabindex]:focus { outline: 3px solid #a3460c; outline-offset: 3px; }
  .skip { position: fixed; top: -80px; left: 12px; z-index: 10; background: #252d25; color: white; padding: 12px; }
  .skip:focus { top: 12px; }
  .shell { max-width: 1920px; margin: auto; padding: 12px; }
  .topbar { display: flex; gap: 20px; justify-content: space-between; align-items: center; padding: 12px 16px; background: #fff; border: 1px solid #cccec5; border-radius: 12px; }
  .eyebrow { margin: 0; color: #585e50; font-size: .73rem; text-transform: uppercase; letter-spacing: .1em; font-weight: 750; }
  h1 { margin: 3px 0 0; font-size: 1.25rem; } h2 { margin: 0; font-size: 1rem; } h3 { margin: 0; font-size: .9rem; }
  .top-actions { display: flex; gap: 12px; align-items: center; } .back { display: inline-flex; align-items: center; padding: 8px 13px; border-radius: 8px; background: #263d2d; color: #fff; font-weight: 700; }
  .badge { border: 1px solid #8a957e; border-radius: 5px; padding: 4px 7px; color: #33432c; font-size: .74rem; font-weight: 700; white-space: nowrap; }
  .selection-summary { display: flex; justify-content: space-between; gap: 12px; align-items: center; margin: 12px 2px 8px; padding: 8px 10px; border-left: 4px solid #263d2d; background: #fafbf7; }
  .selection-summary p { margin: 3px 0 0; color: #53584c; font-size: .82rem; } .selection-summary h2 { margin-top: 3px; }
  .navigation { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 12px; }
  .navigation a, .navigation > span { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; padding: 8px 12px; font-size: .8rem; border: 1px solid #b4b9aa; border-radius: 7px; background: #fff; }
  .navigation > span { color: #606454; border-style: dashed; background: transparent; }
  .workspace { display: grid; grid-template-columns: 190px minmax(0, 1fr) 250px; gap: 12px; align-items: start; }
  .panel { min-width: 0; border: 1px solid #cccec5; border-radius: 12px; overflow: hidden; background: white; }
  .panel-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 13px; border-bottom: 1px solid #dedfd7; }
  .canvas { grid-column: 2; grid-row: 1; } .tree { grid-column: 1; grid-row: 1; } .inspector { grid-column: 3; grid-row: 1; }
  .tree, .inspector { max-height: calc(100vh - 240px); overflow-y: auto; position: sticky; top: 12px; }
  ul { list-style: none; padding: 8px; margin: 0; display: grid; gap: 5px; }
  .tree li { padding-left: calc(var(--depth) * 7px); }
  .tree a, .inspector a, .canvas-map a { display: flex; align-items: center; justify-content: space-between; gap: 7px; padding: 9px; border: 1px solid #e0e2d9; border-radius: 7px; font-size: .83rem; overflow-wrap: anywhere; }
  .tree a { flex-wrap: wrap; } .selected { border: 2px solid #30472c !important; background: #f0f5e8; }
  .selected-marker { border-radius: 4px; padding: 3px 5px; font-size: .65rem; font-weight: 800; background: #30472c; color: #fff; flex-shrink: 0; }
  .canvas-map { display: flex; gap: 7px; flex-wrap: wrap; padding: 9px; background: #f8f9f5; }
  .canvas-map a { flex: 1 1 160px; } .canvas-map a.selected { background: #e7efdb; }
  .renderer-head { display: flex; justify-content: space-between; gap: 10px; padding: 8px 12px; font-size: .73rem; color: #525b49; border-top: 1px solid #dedfd7; }
  iframe { display: block; width: 100%; height: max(650px, calc(100vh - 320px)); border: 0; background: white; }
  .inspector-context { margin: 10px; padding: 12px; background: #f1f3ed; border-radius: 7px; }
  .inspector-context p { margin: 4px 0 0; font-size: .8rem; color: #53584c; }
  .inspector small { display: block; margin-top: 3px; color: #585e50; font-size: .73rem; }
  .empty { padding: 10px; color: #53584c; font-size: .85rem; }
  details { margin: 8px 10px 12px; border-top: 1px solid #dedfd7; } summary { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: .8rem; font-weight: 700; }
  summary::before { content: '+'; } details[open] summary::before { content: '−'; }
  dl { margin: 0 0 8px; } dt { margin: 8px 0 3px; color: #585e50; font-size: .73rem; } dd { margin: 0; overflow-wrap: anywhere; font-size: .76rem; }
  .jumps { display: none; } .note { color: #53584c; font-size: .78rem; margin: 10px 3px 0; }
  @media (max-width: 1100px) { .workspace { grid-template-columns: 165px minmax(0, 1fr); } .inspector { grid-column: 2; grid-row: 2; max-height: none; position: static; } }
  @media (max-width: 700px) {
    .shell { padding: 8px; } .topbar { padding: 10px; gap: 8px; } h1 { font-size: 1rem; } .top-actions { gap: 6px; } .top-actions .badge { display: none; } .back { font-size: .76rem; padding: 8px; }
    .selection-summary { align-items: flex-start; padding: 8px; margin-top: 10px; } .selection-summary > .badge { display: none; }
    .selection-summary p { font-size: .75rem; } .navigation { gap: 5px; } .navigation a, .navigation > span { flex: 1 1 29%; padding: 7px; font-size: .72rem; }
    .jumps { display: flex; gap: 7px; margin: 8px 0; } .jumps a { display: inline-flex; align-items: center; justify-content: center; flex: 1; border: 1px solid #b4b9aa; border-radius: 7px; background: #fff; font-size: .8rem; }
    .workspace { display: flex; flex-direction: column; } .panel { width: 100%; } .tree, .inspector { position: static; max-height: none; } .canvas { order: 0; } .inspector { order: 1; } .tree { order: 2; }
    .panel-head { padding: 10px; } .renderer-head { flex-wrap: wrap; } iframe { height: 580px; }
  }
  @media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto !important; animation: none !important; transition: none !important; } }
</style></head><body>
<a class="skip" href="#canvas-heading">Skip to Canvas</a>
<main class="shell" data-read-only-canvas-surface ${attrs}>
  <header class="topbar"><div><p class="eyebrow">HiVenues · Venue Studio</p><h1>${escapeHtml(sourceInput.venueContext.displayName)}</h1></div><div class="top-actions"><span class="badge">Read-only Canvas</span><a class="back" href="${escapeHtml(editorPath)}">Back to form editor</a></div></header>
  <section class="selection-summary" id="selection-summary" tabindex="-1" ${selectionInput === undefined ? '' : 'autofocus'} data-focus-target="${escapeHtml(projection.focusTarget.surface)}" ${attrs}>
    <div><p class="eyebrow">Selected context</p><h2>${escapeHtml(selectedLabel)}${selectedField ? ' · ' + escapeHtml(selectedField.label) : ''}</h2><p>${dirty ? 'Includes preview changes' : 'Current Studio draft'} · Explore without changing your venue.</p></div><span class="badge">Selection ${projection.navigation.position} of ${projection.navigation.targetCount}</span>
  </section>
  <nav class="navigation" aria-label="Selection navigation" data-current-navigation-target ${attrs}>${navigation}</nav>
  <nav class="jumps" aria-label="Workspace landmarks"><a href="#canvas-heading">Canvas</a><a href="#tree-heading">Tree</a><a href="#inspector-heading">Inspector</a></nav>
  <div class="workspace">
    <section class="panel canvas" data-canvas ${attrs} aria-labelledby="canvas-heading"><header class="panel-head"><h2 id="canvas-heading" tabindex="-1">Venue Canvas</h2><span class="badge">Read-only</span></header><nav class="canvas-map" aria-label="Canvas block selection">${cards}</nav><div class="renderer-head"><strong>Real venue preview</strong><span>Current proposal · Local preview</span></div><iframe title="Real venue renderer preview" src="${escapeHtml(previewPath)}"></iframe></section>
    <nav class="panel tree" data-tree ${attrs} aria-labelledby="tree-heading"><header class="panel-head"><h2 id="tree-heading" tabindex="-1">Page structure</h2></header><ul>${tree}</ul></nav>
    <aside class="panel inspector" data-inspector ${attrs} aria-labelledby="inspector-heading"><header class="panel-head"><h2 id="inspector-heading" tabindex="-1">Inspector</h2><span class="badge">Read-only</span></header><div class="inspector-context" data-inspector-block-id="${escapeHtml(selection.blockId)}"><h3>${escapeHtml(selectedLabel)}</h3><p>Choose a field to inspect its context.</p></div><ul>${fields || '<li class="empty">Choose a block to explore its fields.</li>'}</ul>
      <details data-diagnostics ${attrs} data-block-source-pointer="${escapeHtml(projection.diagnostics.blockSourcePointer)}" data-field-source-pointer="${escapeHtml(projection.diagnostics.fieldSourcePointer)}" data-navigation-index="${projection.diagnostics.navigationIndex}"><summary>Selection diagnostics</summary><dl><dt>Stable identity</dt><dd>${escapeHtml(projection.diagnostics.stableIdentity.value)}</dd><dt>Source pointer</dt><dd>${escapeHtml(projection.diagnostics.fieldSourcePointer || projection.diagnostics.blockSourcePointer || 'Home page root')}</dd><dt>Navigation position</dt><dd>${projection.navigation.position} of ${projection.navigation.targetCount}</dd></dl></details>
    </aside>
  </div><p class="note">Use the form editor to change your draft. Canvas selection does not save, publish, or deploy.</p>
</main></body></html>`;
}

module.exports = { SAFE_READ_ONLY_VENUE_CANVAS_ERROR, parseReadOnlyVenueCanvasQuery, readOnlyVenueCanvasPath, selectionHref, projectStudioSource, renderReadOnlyVenueCanvasSurface };
