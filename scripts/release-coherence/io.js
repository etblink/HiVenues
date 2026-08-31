'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function requireMatch(source, pattern, message) {
  if (!pattern.test(source)) throw new Error(message);
}

module.exports = { exists, read, requireMatch };
