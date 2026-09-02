'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const contract = JSON.parse(fs.readFileSync(path.join(root, 'config', 'issue-130-presentation-review.json'), 'utf8'));
const capture = fs.readFileSync(path.join(root, 'scripts', 'capture-issue-130-presentation-review.js'), 'utf8');
const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'ci.yml'), 'utf8');

const REQUIRED = [
  'issue130-fourth-home-mobile',
  'issue130-fourth-home-desktop',
  'issue130-fourth-authoring-mobile',
  'issue130-fourth-authoring-desktop',
  'issue130-juniper-home-mobile',
  'issue130-juniper-home-desktop',
  'issue130-juniper-authoring-mobile',
  'issue130-juniper-authoring-desktop',
];

test('Issue #130 freezes exactly the required eight-view human presentation envelope', () => {
  assert.equal(contract.schemaVersion, 1);
  assert.equal(contract.reviewId, 'ISSUE_130_PRESENTATION_QUALITY_REVIEW_V1');
  assert.equal(contract.screenshotMode, 'viewport-only');
  assert.equal(contract.fullPageScreenshots, false);
  assert.deepEqual(contract.blockingAccessibilityImpacts, ['serious', 'critical']);
  assert.deepEqual(contract.scenarios.map(({ id }) => id), REQUIRED);
  assert.equal(new Set(contract.scenarios.map(({ id }) => id)).size, 8);
  assert.deepEqual(
    [...new Set(contract.scenarios.map(({ viewport }) => viewport.width))].sort((a, b) => a - b),
    [390, 1440],
  );
  assert.equal(contract.scenarios.filter(({ fixture }) => fixture === 'fourth-street').length, 4);
  assert.equal(contract.scenarios.filter(({ fixture }) => fixture === 'juniper-starter').length, 4);
  assert.equal(contract.scenarios.filter(({ surface }) => surface === 'rendered-home').length, 4);
  assert.equal(contract.scenarios.filter(({ surface }) => surface === 'venue-studio').length, 4);
});

test('Issue #130 visual evidence is an exact-head CI obligation and a bounded uploaded artifact', () => {
  assert.match(capture, /fullPage:\s*false/);
  assert.match(capture, /blockingAccessibilityImpacts/);
  assert.match(capture, /horizontalOverflow/);
  assert.match(capture, /data-studio-stage/);
  assert.match(capture, /juniper-starter/);
  assert.match(capture, /Built with Hive-Venues/);
  assert.match(capture, /Hive RPC calls/);

  assert.match(workflow, /Capture Issue 130 presentation review evidence/);
  assert.match(workflow, /node scripts\/capture-issue-130-presentation-review\.js/);
  assert.match(workflow, /artifacts\/issue-130-presentation-review/);
  assert.match(workflow, /github\.event\.pull_request\.head\.sha \|\| github\.sha/);
});
