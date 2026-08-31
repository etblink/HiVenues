'use strict';

const { PACKAGE_VERSION, RELEASE_APP_TAG } = require('../../src/release/release-version');
const { requireMatch } = require('./io');

function assertPackageRuntimeCoherence({ pkg, lock }) {
  if (pkg.version !== PACKAGE_VERSION) throw new Error('package version source is inconsistent');
  if (lock.packages?.['']?.version !== PACKAGE_VERSION) throw new Error('package-lock root version must match package.json');
}

function assertEnvironmentAndWorkflowCoherence({ envExample, privexEnv, workflow }) {
  for (const [name, source] of [['.env.example', envExample], ['ops/privex/hive-bar.env.example', privexEnv]]) {
    requireMatch(source, new RegExp(`^HIVE_APP_TAG=${RELEASE_APP_TAG.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'm'), `${name} must use the derived release app tag`);
  }

  requireMatch(workflow, /uses:\s+actions\/checkout@[0-9a-f]{40}(?:\s+#.*)?$/m, 'checkout must be pinned by full commit SHA');
  requireMatch(workflow, /uses:\s+actions\/setup-node@[0-9a-f]{40}(?:\s+#.*)?$/m, 'setup-node must be pinned by full commit SHA');
}

module.exports = { assertEnvironmentAndWorkflowCoherence, assertPackageRuntimeCoherence };
