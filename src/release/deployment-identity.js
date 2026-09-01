'use strict';

const fs = require('node:fs');
const path = require('node:path');

const SHA40_PATTERN = /^[0-9a-f]{40}$/;
const DEFAULT_RELEASE_ROOT = path.join(__dirname, '..', '..');
const DEFAULT_COMMIT_FILENAME = '.hive-bar-commit';
const DEFAULT_TREE_FILENAME = '.hive-bar-tree';

function buildLabelForCommit(commit) {
  return commit ? `beta-${commit.slice(0, 7)}` : 'beta-dev';
}

function requireIdentityFilename(value, label) {
  const filename = String(value || '').trim();
  if (
    !filename ||
    filename === '.' ||
    filename === '..' ||
    filename.includes('/') ||
    filename.includes('\\') ||
    filename.includes('\0')
  ) {
    throw new Error(`${label} must be a filename without path separators`);
  }
  return filename;
}

function readDeploymentIdentity(options = {}) {
  const rootDir = options.rootDir || DEFAULT_RELEASE_ROOT;
  const strict = options.strict === true;
  const commitFilename = requireIdentityFilename(
    options.commitFilename || DEFAULT_COMMIT_FILENAME,
    'Deployment commit identity filename',
  );
  const treeFilename = requireIdentityFilename(
    options.treeFilename || DEFAULT_TREE_FILENAME,
    'Deployment tree identity filename',
  );
  const commitPath = path.join(rootDir, commitFilename);
  const treePath = path.join(rootDir, treeFilename);
  const hasCommit = fs.existsSync(commitPath);
  const hasTree = fs.existsSync(treePath);

  if (!hasCommit && !hasTree) {
    if (strict) {
      throw new Error('Exact deployment identity is required but release identity files are missing');
    }
    return Object.freeze({
      build: buildLabelForCommit(null),
      commit: null,
      tree: null,
      exact: false,
    });
  }

  if (!hasCommit || !hasTree) {
    throw new Error('Deployment identity is incomplete');
  }

  const commit = fs.readFileSync(commitPath, 'utf8').trim();
  const tree = fs.readFileSync(treePath, 'utf8').trim();

  if (!SHA40_PATTERN.test(commit)) {
    throw new Error('Deployment commit identity is malformed');
  }
  if (!SHA40_PATTERN.test(tree)) {
    throw new Error('Deployment tree identity is malformed');
  }

  return Object.freeze({
    build: buildLabelForCommit(commit),
    commit,
    tree,
    exact: true,
  });
}

module.exports = {
  DEFAULT_COMMIT_FILENAME,
  DEFAULT_TREE_FILENAME,
  buildLabelForCommit,
  readDeploymentIdentity,
  requireIdentityFilename,
};
