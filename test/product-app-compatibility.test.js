'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const productApp = require('../src/product/app');
const legacyDogfoodApp = require('../src/candidate-c/dogfood-app');

test('historical dogfood entry delegates to the canonical product composition root', () => {
  assert.equal(legacyDogfoodApp.DOGFOOD_HOST, productApp.LOCAL_HOST);
  assert.equal(legacyDogfoodApp.SESSION_COOKIE, productApp.SESSION_COOKIE);
  assert.strictEqual(legacyDogfoodApp.createDogfoodApp, productApp.createHiVenuesApp);
  assert.strictEqual(legacyDogfoodApp.startDogfoodServer, productApp.startHiVenuesServer);
  assert.strictEqual(legacyDogfoodApp.requireSameOrigin, productApp.requireSameOrigin);
});

test('canonical product entry owns composition instead of importing the historical root', () => {
  const productSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'product', 'app.js'), 'utf8');
  const legacySource = fs.readFileSync(path.join(__dirname, '..', 'src', 'candidate-c', 'dogfood-app.js'), 'utf8');

  assert.doesNotMatch(productSource, /candidate-c\/dogfood-app/);
  assert.match(productSource, /createCandidateCCommunityRouter/);
  assert.match(productSource, /createCandidateCSocialReadRouter/);
  assert.match(legacySource, /require\('\.\.\/product\/app'\)/);
  assert.equal(typeof productApp.createHiVenuesStore, 'function');
});
