'use strict';

const os = require('node:os');
const path = require('node:path');

const APP_DIRECTORY_NAME = 'HiVenues Studio';

function nonempty(value) {
  const text = String(value || '').trim();
  return text || '';
}

function resolveInstalledDataRoot({
  platform = process.platform,
  env = process.env,
  homedir = os.homedir(),
  appDirectoryName = APP_DIRECTORY_NAME,
} = {}) {
  let parent;
  if (platform === 'win32') {
    parent = nonempty(env.LOCALAPPDATA) || path.join(homedir, 'AppData', 'Local');
  } else if (platform === 'darwin') {
    parent = path.join(homedir, 'Library', 'Application Support');
  } else {
    parent = nonempty(env.XDG_DATA_HOME) || path.join(homedir, '.local', 'share');
  }
  if (!nonempty(parent)) throw new Error('HiVenues could not resolve an application-data location.');
  return path.resolve(parent, appDirectoryName);
}

function resolveInstalledPaths(options = {}) {
  const dataRoot = resolveInstalledDataRoot(options);
  const diagnosticsRoot = path.join(dataRoot, 'diagnostics');
  return Object.freeze({
    dataRoot,
    statePath: path.join(dataRoot, 'workspace', 'state.json'),
    mediaRoot: path.join(dataRoot, 'media'),
    diagnosticsRoot,
    runtimeDiagnosticsPath: path.join(diagnosticsRoot, 'runtime.json'),
    currentUrlPath: path.join(diagnosticsRoot, 'current-url.txt'),
    instanceLockPath: path.join(dataRoot, 'runtime.lock'),
  });
}

module.exports = {
  APP_DIRECTORY_NAME,
  resolveInstalledDataRoot,
  resolveInstalledPaths,
};
