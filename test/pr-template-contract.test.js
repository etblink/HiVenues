'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..');
const templatePath = path.join(ROOT, '.github', 'pull_request_template.md');
const template = fs.readFileSync(templatePath, 'utf8');

test('pull request template externalizes conditional visual-state acceptance', () => {
  assert.match(template, /## Conditional presentation states/);
  assert.match(template, /every materially distinct new or changed conditional state is enumerated below/);
  assert.match(template, /deterministically activated by fixture state/);
  assert.match(template, /representative responsive browser evidence/);
  assert.match(template, /Changed-path selection can trigger visual CI without exercising a new or changed conditional UI branch/);
});

test('pull request template preserves qualification, acceptance, and authority boundaries', () => {
  assert.match(template, /A PR or Issue is not authorization for those effects/);
  assert.match(template, /Green CI is treated as qualification evidence, not Project Lead acceptance/);
  assert.match(template, /visual artifact will be integrity-checked/);
  assert.match(template, /manually reviewed before acceptance/);
  assert.match(template, /fresh base\/main race check/);
  assert.match(template, /Do not use `Closes` unless this PR fully satisfies the issue/);
});
