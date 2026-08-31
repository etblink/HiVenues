'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { assertAcceptedGovernanceBindings } = require('../scripts/release-coherence/accepted-governance');
const { loadDocumentContext, loadManifestContext } = require('../scripts/release-coherence/context');
const {
  assertLivingDocumentGuardrails,
  assertLivingRoutingCoherence,
} = require('../scripts/release-coherence/current-routing');
const {
  assertEnvironmentAndWorkflowCoherence,
  assertPackageRuntimeCoherence,
} = require('../scripts/release-coherence/package-runtime');
const { assertProductionOperationsCompatibility } = require('../scripts/release-coherence/production-operations');
const {
  assertDeploymentManifestCoherence,
  assertReferenceDeploymentProfile,
  assertV1ManifestCoherence,
} = require('../scripts/release-coherence/reference-deployment');
const { assertRequiredLivingReleaseDocuments } = require('../scripts/release-coherence/required-documents');

function loadContext() {
  return { ...loadManifestContext(), ...loadDocumentContext() };
}

test('release-coherence invariant checkers remain independently composable', () => {
  const context = loadContext();
  const deployment = assertReferenceDeploymentProfile();

  assert.doesNotThrow(() => assertPackageRuntimeCoherence(context));
  assert.doesNotThrow(() => assertDeploymentManifestCoherence(context, deployment));
  assert.doesNotThrow(() => assertEnvironmentAndWorkflowCoherence(context));
  assert.doesNotThrow(() => assertLivingRoutingCoherence(context));
  assert.doesNotThrow(() => assertAcceptedGovernanceBindings(context));
  assert.doesNotThrow(() => assertProductionOperationsCompatibility(context));
  assert.doesNotThrow(() => assertLivingDocumentGuardrails(context));
  assert.doesNotThrow(() => assertV1ManifestCoherence(context));
  assert.doesNotThrow(() => assertRequiredLivingReleaseDocuments());
});
