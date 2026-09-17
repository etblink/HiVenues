'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  LOCAL_HOST,
  createHiVenuesApp,
  createHiVenuesStore,
} = require('../src/product/app');
const {
  DEFAULT_STATE_PATH,
  parseArgs,
} = require('../scripts/hivenues-studio');

test('canonical product boundary exposes the qualified local runtime', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-product-'));
  const statePath = path.join(directory, 'state.json');
  try {
    const store = createHiVenuesStore({ statePath });
    const hosts = store.list();
    assert.ok(Array.isArray(hosts));
    assert.ok(hosts.length > 0);
    assert.ok(fs.existsSync(statePath));

    const app = createHiVenuesApp({ store });
    assert.equal(typeof app.listen, 'function');
    assert.equal(LOCAL_HOST, '127.0.0.1');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('ordinary Studio launcher has a durable ignored default state and bounded CLI', () => {
  const defaults = parseArgs([]);
  assert.equal(defaults.statePath, DEFAULT_STATE_PATH);
  assert.equal(defaults.port, 4173);
  assert.match(DEFAULT_STATE_PATH, /data[\\/]hivenues-dev-state\.json$/);

  const custom = parseArgs(['--state', './tmp/local-state.json', '--port', '4317']);
  assert.equal(custom.statePath, path.resolve('./tmp/local-state.json'));
  assert.equal(custom.port, 4317);

  assert.throws(() => parseArgs(['--public-ingress']), /Unknown argument/);
  assert.throws(() => parseArgs(['--port', '0']), /integer from 1 to 65535/);
});
