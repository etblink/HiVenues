'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { JSDOM } = require('jsdom');
const {
  renderV3Page,
  renderV3PublicStylesheet,
} = require('../src/venue/v3/renderer');
const {
  REFERENCE_FACTORIES,
} = require('./support/v3-reference-fixtures');

const ROOT = path.join(__dirname, '..');
const RENDERER_PATH = path.join(ROOT, 'src', 'venue', 'v3', 'renderer', 'index.js');

function documentFrom(html) {
  return new JSDOM(html).window.document;
}

test('S7 visual contract keeps one shared venue-first renderer across frozen reference families', () => {
  const rendererSource = fs.readFileSync(RENDERER_PATH, 'utf8');

  assert.equal((rendererSource.match(/function renderV3PublicStylesheet\(/g) || []).length, 1);
  assert.equal((rendererSource.match(/function renderV3Page\(/g) || []).length, 1);

  for (const forbiddenIdentity of [
    'northline-hall-example',
    'signal-room-creator',
    'northstar-release-host',
    'Northline Hall Example',
    'Signal Room Creator Example',
    'Northstar Release Host Example',
  ]) {
    assert.equal(rendererSource.includes(forbiddenIdentity), false, forbiddenIdentity);
  }

  for (const [referenceId, factory] of Object.entries(REFERENCE_FACTORIES)) {
    const source = factory();
    const document = documentFrom(renderV3Page(source));
    assert.equal(document.querySelectorAll('header.v3-site-header').length, 1, referenceId);
    assert.equal(document.querySelectorAll('main.v3-page').length, 1, referenceId);
    assert.equal(document.querySelector('.v3-wordmark').textContent.trim(), source.venue.displayName, referenceId);
  }
});

test('S7 presentation layer remains self-contained, accessible and host-neutral', () => {
  const css = renderV3PublicStylesheet();

  assert.match(css, /var\(--v3-canvas\)/);
  assert.match(css, /var\(--v3-text\)/);
  assert.match(css, /var\(--v3-accent\)/);
  assert.match(css, /min-height:44px/);
  assert.match(css, /focus-visible/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /@media \(max-width:640px\)/);

  assert.doesNotMatch(css, /@import/i);
  assert.doesNotMatch(css, /url\s*\(\s*['"]?https?:/i);
  assert.doesNotMatch(css, /northline|signal-room|northstar/i);
});

test('S7 public rendering does not introduce scripts or remote presentation dependencies', () => {
  for (const [referenceId, factory] of Object.entries(REFERENCE_FACTORIES)) {
    const source = factory();
    const document = documentFrom(renderV3Page(source));

    assert.equal(document.querySelectorAll('script').length, 0, referenceId);
    assert.equal(document.querySelectorAll('link[rel="stylesheet"][href^="http"]').length, 0, referenceId);
    assert.equal(document.querySelectorAll('iframe').length, 0, referenceId);
  }
});
