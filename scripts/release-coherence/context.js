'use strict';

const { read } = require('./io');

function loadManifestContext() {
  return {
    pkg: JSON.parse(read('package.json')),
    lock: JSON.parse(read('package-lock.json')),
    manifest: JSON.parse(read('ops/privex/manifest.json')),
  };
}

function loadDocumentContext() {
  return {
    envExample: read('.env.example'),
    privexEnv: read('ops/privex/hive-bar.env.example'),
    workflow: read('.github/workflows/ci.yml'),
    readme: read('README.md'),
    docsReadme: read('docs/README.md'),
    roadmap: read('docs/ROADMAP.md'),
    architectureDecision: read('docs/HIVE_VENUES_SUCCESSOR_ARCHITECTURE_DECISION_0_1_0.md'),
    hv5Acceptance: read('docs/HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_ACCEPTANCE_0_1_0.md'),
    hv6Acceptance: read('docs/HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION_ACCEPTANCE_0_1_0.md'),
    operations: read('docs/PRODUCTION_OPERATIONS.md'),
  };
}

module.exports = { loadDocumentContext, loadManifestContext };
