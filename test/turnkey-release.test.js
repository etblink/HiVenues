'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { URLSearchParams } = require('node:url');
const { JSDOM } = require('jsdom');
const { loadDeploymentAgnosticVenueSourceFile, serializeDeploymentAgnosticVenueSourceFile } = require('../src/venue/source-file');
const { JUNIPER_WORKS_AUTHORING_INPUT } = require('./support/hv7-juniper-venue');
const { createTurnkeyWorkspace } = require('../src/venue/turnkey-workspace');
const { inspectManagedImage, prepareManagedImage } = require('../src/venue/managed-assets');
const { startTurnkeyStudio } = require('../src/venue/turnkey-studio');
const { qualifyTurnkeyWorkspace } = require('../src/venue/turnkey-readiness');

const TEST_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR4nGMUqTjxn4GBgYGJAQoAIrQCV9IemH0AAAAASUVORK5CYII=', 'base64');

function answers() {
  return {
    displayName: 'Juniper Workshop',
    id: 'juniper-workshop',
    address: '100 Example Avenue, Testville, NV 89000',
    phone: '(555) 010-2026',
    hours: 'Mon–Fri, 9:00 a.m.–6:00 p.m.',
    websiteUrl: 'https://juniper-workshop.example/',
    mapUrl: 'https://juniper-workshop.example/map',
    communityId: 'hive-654321',
    officialAccount: 'juniperwork',
    threadsContainerAccount: 'juniper.threads',
    paymentMerchantAccount: 'juniperwork',
  };
}

function temporaryWorkspace() {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-turnkey-'));
  const workspaceDirectory = path.join(parent, 'juniper-workspace');
  const created = createTurnkeyWorkspace({ workspaceDirectory, answers: answers() });
  return { parent, ...created };
}

async function post(runtime, pathname, options = {}) {
  return fetch(`${runtime.origin}${pathname}`, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      origin: runtime.origin,
      ...(options.headers || {}),
    },
    body: options.body,
  });
}

test('official starter creates canonical deployment-agnostic source plus managed assets', () => {
  const workspace = temporaryWorkspace();
  try {
    assert.equal(path.basename(workspace.sourceFile), 'venue-source.json');
    assert.equal(path.basename(workspace.assetDirectory), 'venue-assets');
    assert.deepEqual(fs.readdirSync(workspace.assetDirectory).sort(), [
      'starter-gallery.svg', 'starter-hero.svg', 'starter-logo.svg',
    ]);
    const source = loadDeploymentAgnosticVenueSourceFile(workspace.sourceFile);
    assert.equal(source.venueContext.displayName, 'Juniper Workshop');
    assert.equal(source.venuePackage.home.hero.image.src, '/venue-assets/starter-hero.svg');
    assert.doesNotMatch(fs.readFileSync(workspace.sourceFile, 'utf8'), /Fourth Street|Privex|production deployment/i);
  } finally { fs.rmSync(workspace.parent, { recursive: true, force: true }); }
});

test('managed image import validates actual bytes and refuses unsafe overwrite', () => {
  const workspace = temporaryWorkspace();
  try {
    assert.deepEqual(inspectManagedImage(TEST_PNG), {
      extension: 'png', mediaType: 'image/png', width: 2, height: 2,
    });
    assert.throws(() => inspectManagedImage(Buffer.from('<svg></svg>')), /only PNG, JPEG, and GIF/);
    const asset = prepareManagedImage({ workspaceDirectory: workspace.root, bytes: TEST_PNG });
    assert.equal(asset.sourcePath, `/venue-assets/${asset.filename}`);
    fs.writeFileSync(asset.filePath, Buffer.from('tampered'));
    assert.throws(
      () => prepareManagedImage({ workspaceDirectory: workspace.root, bytes: TEST_PNG }),
      /different bytes; refusing overwrite/,
    );
  } finally { fs.rmSync(workspace.parent, { recursive: true, force: true }); }
});

test('fresh workspace opens Studio, imports media, saves, reopens, renders, and passes offline readiness', async () => {
  const workspace = temporaryWorkspace();
  let runtime;
  let reopened;
  try {
    const beforeBytes = fs.readFileSync(workspace.sourceFile);
    runtime = await startTurnkeyStudio({ workspaceDirectory: workspace.root });
    const editor = await fetch(runtime.url);
    assert.equal(editor.status, 200);
    const editorHtml = await editor.text();
    assert.match(editorHtml, /HiVenues|Venue Studio/);
    assert.match(editorHtml, /type="file"/);
    assert.match(editorHtml, /Save to workspace/);
    assert.doesNotMatch(editorHtml, /Save venue file|Keep changes to save/);

    const pointer = '/venuePackage/home/hero/image/src';
    const imported = await post(runtime, `${runtime.editorPath}/media-import?pointer=${encodeURIComponent(pointer)}`, {
      headers: { 'content-type': 'image/png' }, body: TEST_PNG,
    });
    assert.equal(imported.status, 204);

    const kept = await post(runtime, `${runtime.editorPath}/apply`, {
      headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: '',
    });
    assert.equal(kept.status, 303);
    const saved = await post(runtime, `${runtime.editorPath}/save-workspace`, {
      headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: '',
    });
    assert.equal(saved.status, 303);
    const diagnostics = runtime.diagnostics();
    assert.equal(diagnostics.rpcAttempts, 0);
    await runtime.close();
    runtime = null;

    const source = loadDeploymentAgnosticVenueSourceFile(workspace.sourceFile);
    const expectedHash = crypto.createHash('sha256').update(TEST_PNG).digest('hex').slice(0, 20);
    const expectedSrc = `/venue-assets/media-${expectedHash}.png`;
    assert.equal(source.venuePackage.home.hero.image.src, expectedSrc);
    assert.notDeepEqual(fs.readFileSync(workspace.sourceFile), beforeBytes);
    assert.deepEqual(fs.readFileSync(path.join(workspace.assetDirectory, `media-${expectedHash}.png`)), TEST_PNG);

    const sourceBytesBeforeReadiness = fs.readFileSync(workspace.sourceFile);
    const readiness = qualifyTurnkeyWorkspace({ workspaceDirectory: workspace.root });
    assert.equal(readiness.ready, true);
    assert.equal(readiness.media.length, 3);
    assert.deepEqual(fs.readFileSync(workspace.sourceFile), sourceBytesBeforeReadiness);

    reopened = await startTurnkeyStudio({ workspaceDirectory: workspace.root });
    const preview = await fetch(`${reopened.origin}${reopened.editorPath}/preview`);
    assert.equal(preview.status, 200);
    assert.match(await preview.text(), new RegExp(expectedSrc.replaceAll('/', '\\/')));
    assert.equal(reopened.diagnostics().rpcAttempts, 0);
  } finally {
    if (runtime) await runtime.close();
    if (reopened) await reopened.close();
    fs.rmSync(workspace.parent, { recursive: true, force: true });
  }
});

function equipmentWorkspace() {
  const workspace = temporaryWorkspace();
  const source = JSON.parse(JSON.stringify(loadDeploymentAgnosticVenueSourceFile(workspace.sourceFile)));
  // Fixture setup only: Canvas must operate on an already-present valid section.
  source.venuePackage.home.equipmentStatus = JUNIPER_WORKS_AUTHORING_INPUT.venuePackage.home.equipmentStatus;
  fs.writeFileSync(workspace.sourceFile, serializeDeploymentAgnosticVenueSourceFile(source));
  return workspace;
}

const EQUIPMENT_BLOCK = 'home.equipment-status';
const DRILL_FIELDS = {
  name: 'Venue drill fixed topology', state: 'limited', note: 'Awaiting inspection.',
  accessNote: 'Ask a steward.', lastUpdated: '2026-09-06T12:00:00Z', group: 'Woodworking',
};

async function canvasPage(runtime, blockId = EQUIPMENT_BLOCK, fieldId) {
  const query = new URLSearchParams({ blockId, ...(fieldId ? { fieldId } : {}) });
  const response = await fetch(`${runtime.url}/canvas-editor?${query}`);
  assert.equal(response.status, 200);
  return new JSDOM(await response.text()).window.document;
}

async function submitNativeForm(runtime, document, selector, overrides = {}, status = 200) {
  const element = document.querySelector(selector);
  assert.ok(element, `Missing native form: ${selector}`);
  const form = element.tagName === 'FORM' ? element : element.closest('form');
  const values = Object.fromEntries([...form.querySelectorAll('[name]')].map(node => [node.name, node.value]));
  const response = await post(runtime, form.getAttribute('action'), {
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...values, ...overrides }),
  });
  assert.equal(response.status, status);
  return new JSDOM(await response.text()).window.document;
}

async function workspaceAction(runtime, action, status = 303) {
  const response = await post(runtime, `${runtime.editorPath}/${action}`, {
    headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: '',
  });
  assert.equal(response.status, status);
  return response;
}

function assertEmptyCanvasHistory(document) {
  const history = document.querySelector('[data-canvas-history]');
  assert.equal(history.dataset.undoCount, '0');
  assert.equal(history.dataset.redoCount, '0');
  for (const action of ['undo', 'redo']) assert.equal(document.querySelector(`[data-canvas-history-action="${action}"]`).disabled, true);
}

async function assertRenderedEquipment(runtime, expectedItems) {
  const response = await fetch(`${runtime.url}/preview`);
  assert.equal(response.status, 200);
  const document = new JSDOM(await response.text()).window.document;
  const cards = [...document.querySelectorAll('[data-equipment-id]')];
  assert.deepEqual(cards.map(card => card.dataset.equipmentId), expectedItems.map(item => item.id));
  for (const [index, item] of expectedItems.entries()) {
    const card = cards[index];
    assert.equal(card.querySelector('h3').textContent, item.name);
    assert.equal(card.querySelector('[data-equipment-state]').dataset.equipmentState, item.state);
    assert.equal(card.querySelector('time').getAttribute('datetime'), item.lastUpdated);
    assert.ok(card.textContent.includes(item.note));
    assert.ok(card.textContent.includes(item.accessNote));
    if (item.group) assert.equal(card.querySelector('.home-structured-card__group').textContent, item.group);
  }
  assert.equal(runtime.diagnostics().rpcAttempts, 0);
}

test('Canvas equipment survives keep, failed save, retry and reopen with exact identity, fields and order', async () => {
  const workspace = equipmentWorkspace();
  let runtime;
  let rejectRename = false;
  let rejectedRenames = 0;
  try {
    const initialBytes = fs.readFileSync(workspace.sourceFile);
    const expected = JSON.parse(initialBytes.toString('utf8'));
    runtime = await startTurnkeyStudio({ workspaceDirectory: workspace.root, fsImpl: {
      ...fs,
      renameSync(from, to) {
        if (rejectRename && to === workspace.sourceFile) {
          rejectedRenames += 1;
          throw new Error('Injected atomic-save replacement failure');
        }
        return fs.renameSync(from, to);
      },
    } });
    let page = await canvasPage(runtime);
    page = await submitNativeForm(runtime, page, '[data-canvas-equipment-add-form]', DRILL_FIELDS);
    const blockId = page.querySelector('#selection-summary').dataset.selectionBlockId;
    const id = blockId.slice((EQUIPMENT_BLOCK + '.item.').length);
    assert.match(id, /^equipment-[a-f0-9]{24}$/);
    assert.equal(page.querySelector('#selection-summary h2').textContent, DRILL_FIELDS.name);
    const staleAdd = await canvasPage(runtime);
    page = await canvasPage(runtime, blockId, 'name');
    page = await submitNativeForm(runtime, page, '[data-canvas-edit-form]', { value: 'Renamed workshop drill' });
    page = await submitNativeForm(runtime, page, '[data-canvas-move-to-form]', { destination: EQUIPMENT_BLOCK + '.item.laser-cutter' });
    page = await canvasPage(runtime, EQUIPMENT_BLOCK + '.item.wood-shop');
    page = await submitNativeForm(runtime, page, '[data-canvas-equipment-remove-form]');
    page = await submitNativeForm(runtime, page, '[data-canvas-history-action="undo"]');
    assert.equal(page.querySelector('#selection-summary').dataset.selectionBlockId, EQUIPMENT_BLOCK + '.item.wood-shop');
    page = await submitNativeForm(runtime, page, '[data-canvas-history-action="redo"]');
    assert.equal(page.querySelector('#selection-summary').dataset.selectionBlockId, EQUIPMENT_BLOCK);
    expected.venuePackage.home.equipmentStatus.items = [
      { id, ...DRILL_FIELDS, name: 'Renamed workshop drill' },
      ...expected.venuePackage.home.equipmentStatus.items.filter(item => item.id !== 'wood-shop'),
    ];
    const expectedBytes = Buffer.from(serializeDeploymentAgnosticVenueSourceFile(expected));
    await assertRenderedEquipment(runtime, expected.venuePackage.home.equipmentStatus.items);
    assert.deepEqual(fs.readFileSync(workspace.sourceFile), initialBytes);
    await workspaceAction(runtime, 'save-workspace', 409);
    assert.deepEqual(fs.readFileSync(workspace.sourceFile), initialBytes);
    await workspaceAction(runtime, 'apply');
    assertEmptyCanvasHistory(await canvasPage(runtime));
    assert.deepEqual(fs.readFileSync(workspace.sourceFile), initialBytes);
    await submitNativeForm(runtime, staleAdd, '[data-canvas-equipment-add-form]', DRILL_FIELDS, 409);
    rejectRename = true;
    await workspaceAction(runtime, 'save-workspace', 500);
    assert.equal(rejectedRenames, 1);
    assert.deepEqual(fs.readFileSync(workspace.sourceFile), initialBytes);
    assert.equal(fs.readdirSync(workspace.root).some(name => name.endsWith('.tmp')), false);
    await assertRenderedEquipment(runtime, expected.venuePackage.home.equipmentStatus.items);
    rejectRename = false;
    await workspaceAction(runtime, 'save-workspace');
    assert.deepEqual(fs.readFileSync(workspace.sourceFile), expectedBytes);
    assert.equal(runtime.diagnostics().rpcAttempts, 0);
    const previousSessionForm = await canvasPage(runtime);
    await runtime.close();
    runtime = await startTurnkeyStudio({ workspaceDirectory: workspace.root });
    page = await canvasPage(runtime, blockId);
    assert.equal(page.querySelector('#selection-summary h2').textContent, 'Renamed workshop drill');
    assertEmptyCanvasHistory(page);
    await assertRenderedEquipment(runtime, expected.venuePackage.home.equipmentStatus.items);
    await submitNativeForm(runtime, previousSessionForm, '[data-canvas-equipment-add-form]', DRILL_FIELDS, 400);
    assertEmptyCanvasHistory(await canvasPage(runtime));
    await workspaceAction(runtime, 'save-workspace');
    assert.deepEqual(fs.readFileSync(workspace.sourceFile), expectedBytes);
    assert.equal(qualifyTurnkeyWorkspace({ workspaceDirectory: workspace.root }).ready, true);
    assert.deepEqual(fs.readFileSync(workspace.sourceFile), expectedBytes);
  } finally {
    if (runtime) await runtime.close();
    fs.rmSync(workspace.parent, { recursive: true, force: true });
  }
});

test('Closing Studio before workspace save loses both unkept and kept equipment proposals, with no persisted history', async () => {
  for (const keep of [false, true]) {
    const workspace = equipmentWorkspace();
    let runtime;
    try {
      const initialBytes = fs.readFileSync(workspace.sourceFile);
      const expectedItems = loadDeploymentAgnosticVenueSourceFile(workspace.sourceFile).venuePackage.home.equipmentStatus.items;
      runtime = await startTurnkeyStudio({ workspaceDirectory: workspace.root });
      const page = await canvasPage(runtime);
      await submitNativeForm(runtime, page, '[data-canvas-equipment-add-form]', DRILL_FIELDS);
      if (keep) await workspaceAction(runtime, 'apply');
      assert.deepEqual(fs.readFileSync(workspace.sourceFile), initialBytes);
      assert.equal(runtime.diagnostics().rpcAttempts, 0);
      await runtime.close();
      runtime = await startTurnkeyStudio({ workspaceDirectory: workspace.root });
      assertEmptyCanvasHistory(await canvasPage(runtime));
      await assertRenderedEquipment(runtime, expectedItems);
      assert.deepEqual(fs.readFileSync(workspace.sourceFile), initialBytes);
    } finally {
      if (runtime) await runtime.close();
      fs.rmSync(workspace.parent, { recursive: true, force: true });
    }
  }
});
