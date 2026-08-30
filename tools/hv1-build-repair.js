'use strict';

const fs = require('node:fs');

const file = 'src/config.js';
const source = fs.readFileSync(file, 'utf8');
const deadHelper = `function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

`;
const first = source.indexOf(deadHelper);
if (first < 0 || source.indexOf(deadHelper, first + deadHelper.length) >= 0) {
  throw new Error('Expected exactly one obsolete config deepFreeze helper');
}
fs.writeFileSync(file, source.slice(0, first) + source.slice(first + deadHelper.length));
