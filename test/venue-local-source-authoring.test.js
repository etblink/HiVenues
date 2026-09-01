'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { URLSearchParams } = require('node:url');
const {
  extractDeploymentAgnosticVenueSource,
} = require('../src/venue/source');
const {
  parseDeploymentAgnosticVenueSourceFile,
  serializeDeploymentAgnosticVenueSourceFile,
} = require('../src/venue/source-file');
const {
  LOCAL_SOURCE_AUTHORING_HOST,
  startLocalSourceAuthoring,
} = require('../src/venue/local-source-authoring');
const {
  parseArgs,
} = require('../scripts/open-venue-source');
const {
  FOURTH_STREET_AUTHORING_INPUT,
} = require('./support/hv5-authoring-fixtures');

function writeSourceFile(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hive-venues-local-source-authoring-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const source = extractDeploymentAgnosticVenueSource(FOURTH_STREET_AUTHORING_INPUT);
  const filename = path.join(directory, 'venue-source.json');
  fs.writeFileSync(filename, serializeDeploymentAgnosticVenueSourceFile(source), 'utf8');
  return { filename, source };
}

async function closeRuntime(t, runtime) {
  t.after(async () => {
    await runtime.close();
  });
}

function rawHttpRequest({ origin, path: requestPath, method = 'GET', headers = {} }) {
  const url = new URL(origin);
  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        host: url.hostname,
        port: url.port,
        path: requestPath,
        method,
        headers,
      },
      (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          resolve({
            body: Buffer.concat(chunks).toString('utf8'),
            headers: response.headers,
            status: response.statusCode,
          });
        });
      },
    );
    request.on('error', reject);
    request.end();
  });
}

test('local source-authoring launcher binds only loopback and renders the accepted source with offline Hive reads', async (t) => {
  const { filename } = writeSourceFile(t);
  const runtime = await startLocalSourceAuthoring({ sourceFilename: filename });
  await closeRuntime(t, runtime);

  assert.equal(runtime.address.address, LOCAL_SOURCE_AUTHORING_HOST);
  assert.equal(new URL(runtime.url).hostname, LOCAL_SOURCE_AUTHORING_HOST);
  assert.match(runtime.url, /\/customize$/);

  const editor = await fetch(runtime.url);
  assert.equal(editor.status, 200);
  const editorHtml = await editor.text();
  assert.match(editorHtml, /Customize your venue/);
  assert.match(editorHtml, /Save venue file/);
  assert.match(editorHtml, /value="4th Street Bar"/);

  const preview = await fetch(`${runtime.origin}${runtime.editorPath}/preview`);
  assert.equal(preview.status, 200);
  const previewHtml = await preview.text();
  assert.match(previewHtml, /4th Street Bar/);

  const diagnostics = runtime.diagnostics();
  assert.equal(diagnostics.rpcAttempts, 0);
  assert.equal(diagnostics.substitutedReadCalls, 2);
});

test('local launcher save endpoint is canonical when clean and fails closed while preview changes are pending', async (t) => {
  const { filename, source } = writeSourceFile(t);
  const runtime = await startLocalSourceAuthoring({ sourceFilename: filename });
  await closeRuntime(t, runtime);

  const saveUrl = `${runtime.origin}${runtime.sourceFilePath}`;
  const before = await fetch(saveUrl);
  assert.equal(before.status, 200);
  const beforeText = await before.text();
  assert.equal(beforeText, serializeDeploymentAgnosticVenueSourceFile(source));
  assert.equal(before.headers.get('content-type').startsWith('application/json'), true);
  assert.match(before.headers.get('content-disposition') || '', /venue-source\.json/);

  const proposal = await fetch(`${runtime.origin}${runtime.editorPath}/proposal`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      origin: runtime.origin,
    },
    body: new URLSearchParams({
      pointer: '/venuePackage/home/hero/lede',
      value: 'A locally saved operator draft.',
    }),
    redirect: 'manual',
  });
  assert.equal(proposal.status, 303);

  const dirtyEditor = await fetch(runtime.url);
  assert.equal(dirtyEditor.status, 200);
  const dirtyHtml = await dirtyEditor.text();
  assert.match(dirtyHtml, /Keep changes to save/);
  assert.doesNotMatch(dirtyHtml, />Save venue file</);

  const blocked = await fetch(saveUrl);
  assert.equal(blocked.status, 409);
  assert.match(await blocked.text(), /Keep or undo your preview changes before saving/);

  const apply = await fetch(`${runtime.origin}${runtime.editorPath}/apply`, {
    method: 'POST',
    headers: { origin: runtime.origin },
    redirect: 'manual',
  });
  assert.equal(apply.status, 303);

  const after = await fetch(saveUrl);
  assert.equal(after.status, 200);
  const updated = parseDeploymentAgnosticVenueSourceFile(await after.text());
  assert.equal(updated.venuePackage.home.hero.lede, 'A locally saved operator draft.');
  assert.equal(Object.hasOwn(updated, 'deploymentRef'), false);
  assert.equal(updated.venueContext.displayName, '4th Street Bar');
});

test('local launcher rejects cross-origin state changes and unexpected Host headers', async (t) => {
  const { filename } = writeSourceFile(t);
  const runtime = await startLocalSourceAuthoring({ sourceFilename: filename });
  await closeRuntime(t, runtime);

  const crossOrigin = await fetch(`${runtime.origin}${runtime.editorPath}/discard`, {
    method: 'POST',
    headers: { origin: 'https://example.com' },
    redirect: 'manual',
  });
  assert.equal(crossOrigin.status, 403);
  assert.match(await crossOrigin.text(), /cross-origin state change/);

  const unexpectedHost = await rawHttpRequest({
    origin: runtime.origin,
    path: runtime.editorPath,
    headers: { host: 'example.com' },
  });
  assert.equal(unexpectedHost.status, 403);
  assert.match(unexpectedHost.body, /unexpected Host header/);
});

test('launcher rejects an invalid source before exposing an editor URL', async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hive-venues-invalid-local-source-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const filename = path.join(directory, 'venue-source.json');
  fs.writeFileSync(filename, '{"deploymentRef":{"id":"must-not-exist"}}\n', 'utf8');

  await assert.rejects(
    () => startLocalSourceAuthoring({ sourceFilename: filename }),
    /Venue source file invalid/,
  );
});

test('launcher uses explicit local configuration rather than ambient process configuration', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'venue', 'local-source-authoring.js'),
    'utf8',
  );

  assert.doesNotMatch(source, /process\.env/);
  assert.match(source, /HIVE_WRITE_MODE:\s*'disabled'/);
  assert.match(source, /HIVE_SIGNER_MODE:\s*'disabled'/);
  assert.match(source, /HIVE_PAYMENT_ENABLED:\s*'false'/);
  assert.match(source, /HIVE_MODERATION_ENABLED:\s*'false'/);
  assert.match(source, /HIVE_ONBOARDING_ENABLED:\s*'false'/);
  assert.match(source, /HIVE_RPC_NODES:\s*'https:\/\/127\.0\.0\.1'/);
});

test('launcher CLI accepts one venue file plus an optional local port and exposes no host override', () => {
  assert.deepEqual(parseArgs(['venue-source.json']), {
    help: false,
    port: 0,
    sourceFilename: 'venue-source.json',
  });
  assert.deepEqual(parseArgs(['venue-source.json', '--port', '43123']), {
    help: false,
    port: 43123,
    sourceFilename: 'venue-source.json',
  });
  assert.equal(parseArgs(['venue-source.json', '--host', '0.0.0.0']), null);
  assert.equal(parseArgs(['venue-source.json', '--port', '65536']), null);
});
