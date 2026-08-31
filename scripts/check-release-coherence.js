'use strict';

const { PACKAGE_VERSION, RELEASE_APP_TAG } = require('../src/release/release-version');
const { V1_ACTIONS } = require('../src/v1/actions');
const { assertAcceptedGovernanceBindings } = require('./release-coherence/accepted-governance');
const { loadDocumentContext, loadManifestContext } = require('./release-coherence/context');
const {
  assertLivingDocumentGuardrails,
  assertLivingRoutingCoherence,
} = require('./release-coherence/current-routing');
const {
  assertEnvironmentAndWorkflowCoherence,
  assertPackageRuntimeCoherence,
} = require('./release-coherence/package-runtime');
const { assertProductionOperationsCompatibility } = require('./release-coherence/production-operations');
const {
  assertDeploymentManifestCoherence,
  assertReferenceDeploymentProfile,
  assertV1ManifestCoherence,
} = require('./release-coherence/reference-deployment');
const { assertRequiredLivingReleaseDocuments } = require('./release-coherence/required-documents');

const NEXT_SUCCESSOR_OPERATION = 'HV7_JUNIPER_WORKS_ARCHITECTURE_CONFRONTATION__READ_ONLY';

function assertReleaseCoherence() {
  const manifestContext = loadManifestContext();
  const deployment = assertReferenceDeploymentProfile();
  const documentContext = loadDocumentContext();
  const context = { ...manifestContext, ...documentContext };

  assertPackageRuntimeCoherence(context);
  assertDeploymentManifestCoherence(context, deployment);
  assertEnvironmentAndWorkflowCoherence(context);
  assertLivingRoutingCoherence(context);
  assertAcceptedGovernanceBindings(context);
  assertProductionOperationsCompatibility(context);
  assertLivingDocumentGuardrails(context);
  assertV1ManifestCoherence(context);
  assertRequiredLivingReleaseDocuments();

  return Object.freeze({
    product: 'Hive-Venues',
    packageVersion: PACKAGE_VERSION,
    appTag: RELEASE_APP_TAG,
    v1ActionCount: V1_ACTIONS.length,
    acceptedSuccessorMilestones: 6,
    nextOperation: NEXT_SUCCESSOR_OPERATION,
  });
}

if (require.main === module) {
  try {
    process.stdout.write(`${JSON.stringify(assertReleaseCoherence())}\n`);
  } catch (error) {
    process.stderr.write(`Hive-Venues release coherence refused: ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { NEXT_SUCCESSOR_OPERATION, assertReleaseCoherence };
