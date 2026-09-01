'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('signed-in header account link keeps an accessible profile name when responsive text is hidden', () => {
  const header = read('views/common/header.ejs');
  const styles = read('src/input.css');

  assert.match(styles, /\.app-account__identity\s*>\s*span:last-child\s*\{[\s\S]*?display:\s*none;/);
  assert.match(header, /class="app-account__identity"\s+aria-label="View your profile, @<%= hiveSession\.account %>"/);
  assert.match(header, /class="app-account__avatar" aria-hidden="true"/);
});
