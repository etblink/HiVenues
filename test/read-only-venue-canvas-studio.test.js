'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const request = require('supertest');
const { JSDOM } = require('jsdom');
const { createOfflineSourceAuthoringSurface } = require('../src/venue/source-authoring-surface');
const { extractDeploymentAgnosticVenueSource } = require('../src/venue/source');
const { createVenueCanvasSelection } = require('../src/venue/read-only-venue-canvas-projection');
const { SAFE_READ_ONLY_VENUE_CANVAS_ERROR, parseReadOnlyVenueCanvasQuery, readOnlyVenueCanvasPath, selectionHref, projectStudioSource, renderReadOnlyVenueCanvasSurface } = require('../src/venue/read-only-venue-canvas-surface');
const { FOURTH_STREET_AUTHORING_INPUT } = require('./support/hv5-authoring-fixtures');
const { JUNIPER_WORKS_AUTHORING_INPUT } = require('./support/hv7-juniper-venue');

const ROOT = path.join(__dirname, '..');
function fixture(input) {
  const surface = createOfflineSourceAuthoringSurface({
    sourceInput: extractDeploymentAgnosticVenueSource(input), editorPath: '/studio-test',
    renderPreviewHtml: async () => '<!doctype html><html lang="en"><body><h1>Real renderer callback</h1></body></html>',
  });
  const app = express();
  app.use(surface.router);
  return { app, ...surface };
}
function snapshot(session) {
  return { accepted: session.canonicalAccepted(), proposal: session.canonicalProposal(), status: session.status() };
}
function documentOf(html) { return new JSDOM(html).window.document; }
function assertSelection(document, selection) {
  const blockId = selection.blockId;
  const fieldId = selection.fieldId || '';
  for (const selector of ['[data-read-only-canvas-surface]', '[data-canvas]', '[data-tree]', '[data-inspector]', '#selection-summary', '[data-diagnostics]', '[data-current-navigation-target]']) {
    assert.equal(document.querySelector(selector)?.dataset.selectionBlockId, blockId, selector);
    assert.equal(document.querySelector(selector)?.dataset.selectionFieldId, fieldId, selector);
  }
  for (const selector of ['[data-canvas-card]', '[data-tree-row]']) {
    const selected = document.querySelectorAll(selector + '[data-selected="true"]');
    assert.equal(selected.length, 1);
    assert.equal(selected[0].dataset.blockId, blockId);
    assert.equal(selected[0].getAttribute('aria-current'), 'location');
    assert.ok(selected[0].querySelector('.selected-marker'));
  }
  const fields = document.querySelectorAll('[data-inspector-field][data-selected="true"]');
  assert.equal(fields.length, fieldId ? 1 : 0);
  if (fieldId) assert.equal(fields[0].dataset.fieldId, fieldId);
}

test('Issue142: both venues expose GET-only Canvas, exact default/block/field identities, and the frozen API', async () => {
  for (const input of [FOURTH_STREET_AUTHORING_INPUT, JUNIPER_WORKS_AUTHORING_INPUT]) {
    const f = fixture(input);
    const before = snapshot(f.session);
    assert.equal(f.canvasPath, f.editorPath + '/canvas');
    const editor = documentOf((await request(f.app).get(f.editorPath).expect(200)).text);
    assert.equal(editor.querySelectorAll('.studio-canvas-link').length, 1);
    assert.equal(editor.querySelector('.studio-canvas-link').getAttribute('href'), f.canvasPath);
    assert.equal(editor.querySelectorAll('[data-studio-stage]').length, 4);
    for (const query of ['', '?blockId=home.hero', '?blockId=home.hero&fieldId=lede']) {
      const response = await request(f.app).get(f.canvasPath + query).expect(200);
      const doc = documentOf(response.text);
      const selection = query ? createVenueCanvasSelection({ blockId: 'home.hero', fieldId: query.includes('fieldId') ? 'lede' : null }) : createVenueCanvasSelection({ blockId: 'page.home' });
      assertSelection(doc, selection);
      assert.equal(response.headers['cache-control'], 'no-store');
      assert.equal(doc.querySelector('#selection-summary').hasAttribute('autofocus'), Boolean(query));
      assert.equal(doc.querySelector('iframe')?.getAttribute('src'), f.previewPath);
      assert.equal(doc.querySelector('iframe')?.getAttribute('title'), 'Real venue renderer preview');
      assert.equal(doc.querySelector('.back').getAttribute('href'), f.editorPath);
      assert.equal(doc.querySelectorAll('form,input,textarea,select,button,[contenteditable],script').length, 0);
      assert.equal(doc.querySelectorAll('a').length, doc.querySelectorAll('a[href^="/"],a[href^="#"]').length);
      assert.doesNotMatch(response.text, /set-field|insert-item|remove-item|move-item|command-payload|offline-read-only-canvas-projection/);
      assert.ok([...doc.querySelectorAll('a')].every((a) => !/^(Publish|Deploy)$/i.test(a.textContent.trim())));
      assert.deepEqual(snapshot(f.session), before);
    }
    await request(f.app).post(f.canvasPath).send({ blockId: 'home.hero' }).expect(404);
    assert.deepEqual(snapshot(f.session), before);
  }
});

test('Issue142: every rendered block, field, and navigation link round-trips through strict canonical selection', async () => {
  for (const input of [FOURTH_STREET_AUTHORING_INPUT, JUNIPER_WORKS_AUTHORING_INPUT]) {
    const f = fixture(input);
    const before = snapshot(f.session);
    const initial = projectStudioSource(f.session.proposalDraft);
    const links = new Set();
    for (const target of initial.navigation.targets) {
      const doc = documentOf(renderReadOnlyVenueCanvasSurface({ sourceInput: f.session.proposalDraft, selectionInput: target, editorPath: f.editorPath, previewPath: f.previewPath }));
      assertSelection(doc, target);
      for (const a of doc.querySelectorAll('[data-canvas-card], [data-tree-row], [data-inspector-field], a[data-navigation]')) links.add(a.getAttribute('href'));
    }
    assert.equal(links.size, initial.navigation.targets.length);
    for (const href of links) {
      const url = new URL(href, 'https://studio.invalid');
      const selection = parseReadOnlyVenueCanvasQuery(Object.fromEntries(url.searchParams));
      assert.equal(selectionHref(f.canvasPath, selection), href);
      const response = await request(f.app).get(url.pathname + url.search).expect(200);
      assertSelection(documentOf(response.text), selection);
    }
    assert.deepEqual(snapshot(f.session), before);
  }
});

test('Issue142: malformed and stale queries return one neutral 400 without changing exact source or session state', async () => {
  const f = fixture(JUNIPER_WORKS_AUTHORING_INPUT);
  const before = snapshot(f.session);
  const queries = ['blockId=', 'fieldId=lede', 'blockId=home.hero&fieldId=', 'blockId=home.hero&blockId=page.home', 'blockId[]=home.hero', 'blockId=home.hero&fieldId=lede&fieldId=image', 'blockId=venue.settings', 'blockId=home.unknown', 'blockId=home.hero&fieldId=name', 'blockId=home.equipment-status.item.removed', 'blockId=home.hero&extra=1', 'blockId=%3Cscript%3E'];
  for (const query of queries) {
    const response = await request(f.app).get(f.canvasPath + '?' + query).expect(400);
    assert.equal(response.text, SAFE_READ_ONLY_VENUE_CANVAS_ERROR);
    assert.equal(response.headers['cache-control'], 'no-store');
    assert.deepEqual(snapshot(f.session), before);
  }
  f.session.removeCollectionItem('/venuePackage/home/equipmentStatus/items', 'wood-shop');
  const afterRemoval = snapshot(f.session);
  await request(f.app).get(f.canvasPath + '?blockId=home.equipment-status.item.wood-shop&fieldId=name').expect(400);
  assert.deepEqual(snapshot(f.session), afterRemoval);
});

test('Issue142: Juniper stable item/field survives reorder while diagnostic pointer and navigation index update', async () => {
  const f = fixture(JUNIPER_WORKS_AUTHORING_INPUT);
  const selection = createVenueCanvasSelection({ blockId: 'home.equipment-status.item.wood-shop', fieldId: 'name' });
  const url = new URL(selectionHref(f.canvasPath, selection), 'https://studio.invalid');
  const before = documentOf((await request(f.app).get(url.pathname + url.search).expect(200)).text);
  const accepted = f.session.canonicalAccepted();
  f.session.moveCollectionItem('/venuePackage/home/equipmentStatus/items', 'wood-shop', 'up');
  const moved = snapshot(f.session);
  const after = documentOf((await request(f.app).get(url.pathname + url.search).expect(200)).text);
  assertSelection(before, selection);
  assertSelection(after, selection);
  assert.equal(before.querySelector('[data-diagnostics]').dataset.fieldSourcePointer, '/venuePackage/home/equipmentStatus/items/1/name');
  assert.equal(after.querySelector('[data-diagnostics]').dataset.fieldSourcePointer, '/venuePackage/home/equipmentStatus/items/0/name');
  assert.notEqual(before.querySelector('[data-diagnostics]').dataset.navigationIndex, after.querySelector('[data-diagnostics]').dataset.navigationIndex);
  assert.equal(f.session.canonicalAccepted(), accepted);
  assert.deepEqual(snapshot(f.session), moved);
});

test('Issue142: preview-changed source stays authoritative through Canvas and existing keep/save/undo actions', async () => {
  const f = fixture(JUNIPER_WORKS_AUTHORING_INPUT);
  const accepted = f.session.canonicalAccepted();
  await request(f.app).post(f.editorPath + '/studio-proposal').type('form').send({ pointer: '/venueContext/displayName', value: 'Juniper Studio Draft' }).expect(303);
  const dirty = snapshot(f.session);
  const response = await request(f.app).get(f.canvasPath).expect(200);
  assert.equal(documentOf(response.text).querySelector('h1').textContent, 'Juniper Studio Draft');
  assert.match(response.text, /Includes preview changes/);
  assert.equal(f.session.canonicalAccepted(), accepted);
  assert.deepEqual(snapshot(f.session), dirty);
  const editor = documentOf((await request(f.app).get(f.editorPath).expect(200)).text);
  assert.equal(editor.querySelector('.source-save').getAttribute('aria-disabled'), 'true');
  await request(f.app).post(f.editorPath + '/apply').expect(303);
  assert.equal(f.session.acceptedSource.venueContext.displayName, 'Juniper Studio Draft');
  assert.equal(Object.hasOwn(f.session.acceptedSource, 'deploymentRef'), false);
  await request(f.app).get(f.sourceFilePath).expect(200);
  f.session.edit('/venuePackage/home/hero/lede', 'A temporary proposal.');
  await request(f.app).post(f.editorPath + '/discard').expect(303);
  assert.equal(f.session.canonicalProposal(), f.session.canonicalAccepted());
});

test('Issue142: query properties are strict and source text and selection URLs are escaped', () => {
  assert.equal(parseReadOnlyVenueCanvasQuery(Object.create(null)), undefined);
  for (const query of [null, [], { blockId: ['home.hero'] }, { blockId: 'home.hero', fieldId: null }, Object.create({ blockId: 'home.hero' }), { blockId: 'home.hero', [Symbol('extra')]: 'x' }]) assert.throws(() => parseReadOnlyVenueCanvasQuery(query));
  const accessor = Object.defineProperty({}, 'blockId', { enumerable: true, get() { throw Error('must not execute'); } });
  assert.throws(() => parseReadOnlyVenueCanvasQuery(accessor), /scalar strings/);
  assert.throws(() => readOnlyVenueCanvasPath('//external.example'), /local surface path/);
  const input = structuredClone(extractDeploymentAgnosticVenueSource(JUNIPER_WORKS_AUTHORING_INPUT));
  input.venueContext.displayName = '<img src=x onerror=alert(1)>';
  const html = renderReadOnlyVenueCanvasSurface({ sourceInput: input, editorPath: '/studio', previewPath: '/studio/preview' });
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.equal(documentOf(html).querySelectorAll('img').length, 0);
  assert.equal(selectionHref('/studio/canvas', createVenueCanvasSelection({ blockId: 'a&b', fieldId: 'x y' })), '/studio/canvas?blockId=a%26b&fieldId=x+y#selection-summary');
});

test('Issue142: current visual contract activates exactly the two Canvas states inside selected CI', () => {
  const contract = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/visual-qualification-contract.json'), 'utf8'));
  assert.deepEqual(contract.reviewScenarios.filter((x) => x.mode === 'canvas').map((x) => ({ id: x.id, selection: x.selection, viewport: x.viewport })), [
    { id: 'fourth-street-canvas-desktop', selection: { blockId: 'home.hero', fieldId: 'lede' }, viewport: { width: 1440, height: 1000 } },
    { id: 'juniper-canvas-mobile', selection: { blockId: 'home.equipment-status.item.wood-shop', fieldId: 'name' }, viewport: { width: 390, height: 844 } },
  ]);
  assert.ok(contract.reviewScenarios.some((x) => x.id === 'home-mobile'));
  assert.ok(contract.reviewScenarios.some((x) => x.id === 'home-desktop'));
  const workflow = fs.readFileSync(path.join(ROOT, '.github/workflows/ci.yml'), 'utf8');
  for (const file of ['capture-source-authoring-visual.js', 'capture-current-contract-visual.js', 'assemble-current-visual-evidence.js']) {
    const capture = fs.readFileSync(path.join(ROOT, 'scripts', file), 'utf8');
    assert.match(capture, /readOnlyCanvas/);
    assert.match(capture, /selectedCanvasCardCount|inspectReadOnlyCanvas/);
    assert.match(capture, /selectionSummaryFocused|inspectReadOnlyCanvas/);
  }
  assert.match(workflow, /src\/venue\/source-authoring-surface\.js/);
  assert.match(workflow, /scripts\/capture-current-contract-visual\.js/);
});
