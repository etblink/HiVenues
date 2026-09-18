'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const {
  resolveInstalledDataRoot,
  resolveInstalledPaths,
} = require('../src/product/runtime-paths');

test('Windows installed data belongs under LOCALAPPDATA, not the app or repository tree', () => {
  const root = resolveInstalledDataRoot({
    platform: 'win32',
    env: { LOCALAPPDATA: 'C:\\Users\\Ada\\AppData\\Local' },
    homedir: 'C:\\Users\\Ada',
  });
  assert.equal(root, path.resolve('C:\\Users\\Ada\\AppData\\Local', 'HiVenues Studio'));

  const paths = resolveInstalledPaths({
    platform: 'win32',
    env: { LOCALAPPDATA: 'C:\\Users\\Ada\\AppData\\Local' },
    homedir: 'C:\\Users\\Ada',
  });
  assert.match(paths.statePath, /HiVenues Studio[\\/]workspace[\\/]state\.json$/);
  assert.match(paths.mediaRoot, /HiVenues Studio[\\/]media$/);
  assert.match(paths.instanceLockPath, /HiVenues Studio[\\/]runtime\.lock$/);
});

test('Windows installed data has a bounded homedir fallback when LOCALAPPDATA is unavailable', () => {
  const root = resolveInstalledDataRoot({
    platform: 'win32',
    env: {},
    homedir: 'C:\\Users\\Ada',
  });
  assert.equal(root, path.resolve('C:\\Users\\Ada', 'AppData', 'Local', 'HiVenues Studio'));
});
