'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { stateChangeIsSameOrigin } = require('../src/venue/turnkey-studio');

function request(method, headers = {}) {
  const normalized = Object.fromEntries(Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value]));
  return {
    method,
    get(name) { return normalized[name.toLowerCase()]; },
  };
}

test('Venue Studio state-change guard requires the exact loopback Origin', () => {
  const origin = 'http://127.0.0.1:43123';

  assert.equal(stateChangeIsSameOrigin(request('GET'), origin), true);
  assert.equal(stateChangeIsSameOrigin(request('POST', { origin }), origin), true);
  assert.equal(stateChangeIsSameOrigin(request('POST', { origin: 'http://127.0.0.1:43124' }), origin), false);
  assert.equal(stateChangeIsSameOrigin(request('POST', { origin: 'null', 'sec-fetch-site': 'same-origin' }), origin), false);
  assert.equal(stateChangeIsSameOrigin(request('POST', { 'sec-fetch-site': 'same-origin' }), origin), false);
  assert.equal(stateChangeIsSameOrigin(request('POST', { 'sec-fetch-site': 'cross-site' }), origin), false);
  assert.equal(stateChangeIsSameOrigin(request('POST'), origin), false);
});