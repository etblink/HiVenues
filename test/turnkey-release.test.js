'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { loadDeploymentAgnosticVenueSourceFile } = require('../src/venue/source-file');
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
