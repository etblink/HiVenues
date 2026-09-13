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
    assert.equal(document.querySelectorAll('.v3-page-heading--home h1').length, 1, referenceId);
    assert.equal(document.querySelector('.v3-wordmark').textContent.trim(), source.venue.displayName, referenceId);
  }
});

test('S7.1 public foundation expresses editorial hierarchy without host-specific styling', () => {
  const css = renderV3PublicStylesheet();

  assert.match(css, /--v3-site-width:72rem/);
  assert.match(css, /--v3-reading-width:46rem/);
  assert.match(css, /--v3-space-section:clamp\(/);
  assert.match(css, /font-family:ui-serif,Georgia,Cambria/);
  assert.match(css, /\.v3-site-header\{width:min\(var\(--v3-site-width\)/);
  assert.match(css, /\.v3-component\{margin:var\(--v3-space-section\) 0;padding:0;background:transparent\}/);
  assert.match(css, /\.v3-activity-card\{padding:1\.5rem 0;border-bottom:1px solid var\(--v3-border\)\}/);
  assert.match(css, /text-transform:uppercase/);
  assert.doesNotMatch(css, /northline|signal-room|northstar/i);
});

test('S7.2-S7.4 shared composition gives media, activity facts and actions intentional responsive hierarchy', () => {
  const css = renderV3PublicStylesheet();

  assert.match(css, /\.v3-hero\{display:grid;grid-template-columns:repeat\(auto-fit,minmax\(min\(100%,24rem\),1fr\)\)/);
  assert.match(css, /\.v3-hero__media,\.v3-activity-media\{overflow:hidden;border:1px solid var\(--v3-border\);border-radius:1\.1rem;background:var\(--v3-surface\)\}/);
  assert.match(css, /\.v3-activity-description\{max-width:58ch/);
  assert.match(css, /\.v3-activity-time\{max-width:var\(--v3-reading-width\);margin:2rem 0;padding:1\.1rem 0;border-top:1px solid var\(--v3-border\);border-bottom:1px solid var\(--v3-border\)\}/);
  assert.match(css, /\.v3-activity-presence\{max-width:var\(--v3-reading-width\);padding:1\.5rem 0;border-top:1px solid var\(--v3-border\)\}/);
  assert.match(css, /\.v3-activity-actions\{display:flex;flex-wrap:wrap;gap:\.75rem;margin-top:2rem\}/);
  assert.match(css, /\.v3-visit-facts\{max-width:var\(--v3-reading-width\);display:grid;grid-template-columns:repeat\(auto-fit/);
  assert.match(css, /\.v3-activity-actions \.v3-action\{flex:1 1 100%\}/);

  assert.doesNotMatch(css, /object-fit:/);
  assert.doesNotMatch(css, /northline|signal-room|northstar/i);
});

test('S7.5 visual review refinements keep landing hierarchy quiet and multi-column activities separated', () => {
  const css = renderV3PublicStylesheet();

  assert.match(css, /\.v3-page-heading--home\{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden/);
  assert.match(css, /\.v3-activity-list__items\{display:grid;grid-template-columns:repeat\(auto-fit,minmax\(min\(100%,20rem\),1fr\)\);column-gap:clamp\(2rem,5vw,4rem\);row-gap:0/);
  assert.match(css, /@media \(max-width:640px\).*\.v3-page-heading--home\{padding:0\}/);
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
