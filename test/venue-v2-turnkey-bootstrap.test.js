'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  parseArgs: parseCreateArgs,
  main: createMain,
  usage: createUsage,
} = require('../scripts/create-v2-venue');
const {
  parseArgs: parseStudioArgs,
} = require('../scripts/open-v2-studio');
const {
  deriveV2DeploymentAgnosticVenueSourceDigest,
  serializeV2DeploymentAgnosticVenueSource,
} = require('../src/venue/v2/source');
const {
  loadV2DeploymentAgnosticVenueSourceFile,
  V2_VENUE_SOURCE_FILENAME,
} = require('../src/venue/v2/source-file');
const {
  V2_STARTER_IDS,
  V2TurnkeyWorkspaceError,
  buildV2StarterSource,
  createV2TurnkeyWorkspace,
} = require('../src/venue/v2/turnkey-workspace');
const {
  V2_TURNKEY_STUDIO_HOST,
  startV2TurnkeyStudio,
} = require('../src/venue/v2/turnkey-studio');

function answers(starter = 'general') {
  return {
    displayName: 'Fresh Venue',
    id: 'fresh-venue',
    starter,
    address: '400 New Venue Way, Reno, NV 89501',
    phone: '(555) 010-1940',
    hours: 'Mon–Sun, 10:00 a.m.–10:00 p.m.',
    websiteUrl: 'https://fresh-venue.example/',
    mapUrl: 'https://fresh-venue.example/visit',
  };
}

function temporaryRoot(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-v2-bootstrap-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

test('closed v2 starters produce valid venue-first sources with Hive/payment capabilities disabled', () => {
  assert.deepEqual(V2_STARTER_IDS, ['general', 'hospitality', 'live-music']);
  for (const starter of V2_STARTER_IDS) {
    const source = buildV2StarterSource(answers(starter));
    assert.equal(source.kind, 'hive-venues-deployment-agnostic-source');
    assert.equal(source.schemaVersion, 2);
    assert.equal(source.provenance.origin, 'native-v2');
    assert.equal(source.capabilities.community.state, 'disabled');
    assert.equal(source.capabilities.transaction.state, 'disabled');
    assert.equal(source.site.homePageId, 'home');
    assert.equal(source.site.pages.length, 1);
    assert.equal(source.site.pages[0].components.some((item) => item.kind === 'venue-hero'), true);
    const serialized = serializeV2DeploymentAgnosticVenueSource(source);
    for (const forbidden of [
      'communityId',
      'officialAccount',
      'threadsContainerAccount',
      'merchantAccounts',
      'beneficiaryPolicy',
    ]) {
      assert.equal(serialized.includes(forbidden), false, starter + ': leaked ' + forbidden);
    }
    assert.match(deriveV2DeploymentAgnosticVenueSourceDigest(source), /^[0-9a-f]{64}$/);
  }
});

test('fresh v2 workspace writes exact canonical source and starter media without v1 source', (t) => {
  const parent = temporaryRoot(t);
  const workspaceDirectory = path.join(parent, 'fresh-workspace');
  const created = createV2TurnkeyWorkspace({
    workspaceDirectory,
    answers: answers('hospitality'),
  });

  assert.equal(path.basename(created.sourceFile), V2_VENUE_SOURCE_FILENAME);
  assert.equal(fs.existsSync(path.join(created.root, 'venue-source.json')), false);
  assert.equal(fs.existsSync(path.join(created.root, 'venue-source-v2.json')), true);
  for (const asset of ['starter-logo.svg', 'starter-hero.svg', 'starter-gallery.svg']) {
    assert.equal(fs.existsSync(path.join(created.assetDirectory, asset)), true, asset);
  }

  const loaded = loadV2DeploymentAgnosticVenueSourceFile(created.sourceFile);
  assert.equal(
    serializeV2DeploymentAgnosticVenueSource(loaded),
    serializeV2DeploymentAgnosticVenueSource(created.source),
  );
  assert.equal(
    deriveV2DeploymentAgnosticVenueSourceDigest(loaded),
    deriveV2DeploymentAgnosticVenueSourceDigest(created.source),
  );
});

test('v2 workspace refuses existing destinations and cleans partial construction failure', (t) => {
  const parent = temporaryRoot(t);
  const existing = path.join(parent, 'existing');
  fs.mkdirSync(existing);
  assert.throws(
    () => createV2TurnkeyWorkspace({
      workspaceDirectory: existing,
      answers: answers(),
    }),
    (error) => error instanceof V2TurnkeyWorkspaceError && /destination already exists/.test(error.message),
  );

  const failing = path.join(parent, 'failing');
  const fsImpl = Object.create(fs);
  fsImpl.writeFileSync = (filename, data, options) => {
    if (path.basename(filename) === V2_VENUE_SOURCE_FILENAME) {
      const error = new Error('synthetic source write failure');
      error.code = 'EACCES';
      throw error;
    }
    return fs.writeFileSync(filename, data, options);
  };
  assert.throws(
    () => createV2TurnkeyWorkspace({
      workspaceDirectory: failing,
      answers: answers(),
      fsImpl,
    }),
    (error) => error instanceof V2TurnkeyWorkspaceError && /could not create workspace/.test(error.message),
  );
  assert.equal(fs.existsSync(failing), false);
});

test('explicit v2 create CLI accepts venue-only inputs and exposes no Hive flags', async (t) => {
  const parent = temporaryRoot(t);
  const workspaceDirectory = path.join(parent, 'cli-workspace');
  const parsed = parseCreateArgs([
    workspaceDirectory,
    '--name', 'CLI Venue',
    '--starter', 'general',
    '--address', '500 CLI Street, Reno, NV 89501',
    '--phone', '(555) 010-5000',
    '--hours', 'Daily 9–9',
    '--website', 'https://cli-venue.example/',
    '--map', 'https://cli-venue.example/visit',
  ]);
  assert.equal(parsed.workspaceDirectory, workspaceDirectory);
  assert.equal(parsed.answers.displayName, 'CLI Venue');
  assert.equal(parsed.answers.starter, 'general');
  assert.throws(
    () => parseCreateArgs([workspaceDirectory, '--community', 'hive-123456']),
    /Unknown option: --community/,
  );
  assert.doesNotMatch(createUsage(), /--community|--official|--threads|--merchant/);

  let output = '';
  const created = await createMain([
    workspaceDirectory,
    '--name', 'CLI Venue',
    '--id', 'cli-venue',
    '--starter', 'general',
    '--address', '500 CLI Street, Reno, NV 89501',
    '--phone', '(555) 010-5000',
    '--hours', 'Daily 9–9',
    '--website', 'https://cli-venue.example/',
    '--map', 'https://cli-venue.example/visit',
  ], {
    output: { write(value) { output += value; } },
  });
  assert.equal(fs.existsSync(created.sourceFile), true);
  assert.match(output, /Hive\/community\/payment capabilities: disabled by default/);
  assert.match(output, /npm run venue:studio:v2/);
});

test('v2 Studio CLI parsing stays explicit and separate from v1', () => {
  assert.deepEqual(
    parseStudioArgs(['/tmp/workspace', '--port', '0']),
    { help: false, port: 0, workspaceDirectory: '/tmp/workspace' },
  );
  assert.equal(parseStudioArgs([]), null);
  assert.equal(parseStudioArgs(['/tmp/workspace', '--port', '65536']), null);
});

test('flagship v2 Studio runtime is loopback-only and rejects cross-origin mutation', async (t) => {
  const parent = temporaryRoot(t);
  const workspaceDirectory = path.join(parent, 'runtime-workspace');
  createV2TurnkeyWorkspace({
    workspaceDirectory,
    answers: answers('live-music'),
  });
  const runtime = await startV2TurnkeyStudio({ workspaceDirectory, port: 0 });
  t.after(() => runtime.close());

  assert.equal(new URL(runtime.origin).hostname, V2_TURNKEY_STUDIO_HOST);
  const response = await fetch(runtime.url);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /HiVenues Studio/);
  assert.match(html, /Workspace checkpoint · Saved/);

  const crossOrigin = await fetch(runtime.origin + '/studio-authoring/save-workspace', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      origin: 'https://attacker.example',
    },
    body: new URLSearchParams({
      nodeId: 'component:home-hero',
      viewport: 'desktop',
      expectedDraftDigest: runtime.session().draftDigest,
      expectedPersistedDigest: runtime.persistence().persistedDigest,
    }),
    redirect: 'manual',
  });
  assert.equal(crossOrigin.status, 403);
  assert.equal(runtime.diagnostics().hiveRpcAttempts, 0);
  assert.equal(runtime.diagnostics().hiveWrites, 0);
});
