'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  CANDIDATE_IDENTITY,
  PREVIOUS_IDENTITY,
  manifestPathForNativePath,
  runIndependentVenueReleaseRehearsal,
} = require('../scripts/rehearse-independent-venue-release');
const {
  NonProductionReleaseRehearsalError,
  promoteRelease,
  stageReleaseIdentity,
} = require('../src/release/non-production-rehearsal');
const { resolveHealthServiceName } = require('../src/routes/health');
const { FOURTH_STREET_REFERENCE_VENUE } = require('../src/venue/reference/fourth-street');
const { HV4_SYNTHETIC_BOOTSTRAP_INPUT } = require('./support/hv4-synthetic-bootstrap');

const root = path.resolve(__dirname, '..');

function temporaryRoot(t) {
  const directory = fs.mkdtempSync(path.join(root, '.hive-venues-release-state-test-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}


test('health service identity positively preserves Fourth Street compatibility and scopes generic venues', () => {
  assert.equal(
    resolveHealthServiceName({ venue: FOURTH_STREET_REFERENCE_VENUE }),
    'hive-bar',
  );
  assert.equal(
    resolveHealthServiceName({
      venue: { ...FOURTH_STREET_REFERENCE_VENUE, displayName: 'Divergent reference-shaped venue' },
    }),
    FOURTH_STREET_REFERENCE_VENUE.id,
  );
  assert.equal(
    resolveHealthServiceName({ venue: HV4_SYNTHETIC_BOOTSTRAP_INPUT.venueContext }),
    'lantern-room-fixture',
  );
});

test('independent venue completes health-gated promotion and identity-verified rollback rehearsal', async () => {
  const result = await runIndependentVenueReleaseRehearsal({ repositoryRoot: root });

  assert.equal(result.schemaVersion, 1);
  assert.equal(result.rehearsal, 'independent-venue-release-lifecycle');
  assert.equal(result.status, 'PASS');
  assert.deepEqual(result.venue, {
    id: 'lantern-room-fixture',
    displayName: 'The Lantern Room (Fixture)',
    synthetic: true,
    fourthStreet: false,
  });
  assert.deepEqual(result.releases.previous, PREVIOUS_IDENTITY);
  assert.deepEqual(result.releases.candidate, CANDIDATE_IDENTITY);
  assert.notDeepEqual(result.releases.previous, result.releases.candidate);

  assert.equal(result.phases.previousInitial.health.status, 200);
  assert.equal(result.phases.previousInitial.health.exactIdentity, true);
  assert.equal(result.phases.previousInitial.health.body.service, 'lantern-room-fixture');
  assert.equal(result.phases.previousInitial.readiness.status, 200);
  assert.equal(result.phases.candidatePrePromotion.health.status, 200);
  assert.equal(result.phases.candidatePrePromotion.health.exactIdentity, true);
  assert.equal(result.phases.candidatePrePromotion.health.body.service, 'lantern-room-fixture');
  assert.equal(result.phases.candidatePrePromotion.readiness.status, 200);
  assert.deepEqual(result.phases.candidatePromotion.previous, PREVIOUS_IDENTITY);
  assert.deepEqual(result.phases.candidatePromotion.current, CANDIDATE_IDENTITY);

  assert.equal(
    result.phases.candidatePostPromotionFailure.failure,
    'INJECTED_POST_PROMOTION_SERVICE_UNAVAILABLE',
  );
  assert.equal(
    result.phases.candidatePostPromotionFailure.productionFailureClass,
    'POST_SWITCH_HEALTH_UNREACHABLE',
  );
  assert.equal(result.phases.candidatePostPromotionFailure.health.reachable, false);
  assert.equal(result.phases.candidatePostPromotionFailure.readiness.reachable, false);
  assert.deepEqual(result.phases.rollback.from, CANDIDATE_IDENTITY);
  assert.deepEqual(result.phases.rollback.restored, PREVIOUS_IDENTITY);
  assert.equal(result.phases.restoredPrevious.health.status, 200);
  assert.equal(result.phases.restoredPrevious.health.exactIdentity, true);
  assert.equal(result.phases.restoredPrevious.readiness.status, 200);
  assert.deepEqual(result.final.current, PREVIOUS_IDENTITY);
  assert.equal(result.final.rollbackVerified, true);
  assert.equal(result.final.healthVerified, true);
  assert.equal(result.final.readinessVerified, true);

  assert.equal(result.scope.environment, 'NON_PRODUCTION_REPOSITORY_LOCAL');
  assert.equal(result.scope.network, 'LOOPBACK_ONLY');
  assert.equal(result.scope.privilegedHostMutation, false);
  assert.equal(result.scope.productionMutation, false);
  assert.equal(result.scope.liveHiveWrite, false);
  assert.equal(result.scope.realKeyMaterial, false);
  assert.match(result.pointerMechanism, /NOT_PRODUCTION_SYMLINK_MECHANISM/);
  assert.equal(result.identityOrigin, 'SYNTHETIC_REHEARSAL_ONLY__FORMAT_EXACT_NOT_GIT_PROVENANCE');
  assert.ok(Object.values(result.productionInvariantCrosscheck).every(Boolean));
});


test('portable manifest path resolves to the same isolated filesystem root', (t) => {
  const nativeRoot = temporaryRoot(t);
  const manifestRoot = manifestPathForNativePath(nativeRoot);

  assert.equal(path.posix.isAbsolute(manifestRoot), true);
  assert.equal(path.resolve(manifestRoot), path.resolve(nativeRoot));
});

test('portable release state refuses promotion after exact tree identity is tampered', (t) => {
  const rootDir = temporaryRoot(t);
  const provenance = HV4_SYNTHETIC_BOOTSTRAP_INPUT.deploymentManifest.provenance;
  const staged = stageReleaseIdentity({
    rootDir,
    identity: PREVIOUS_IDENTITY,
    commitFilename: provenance.commitFilename,
    treeFilename: provenance.treeFilename,
  });
  fs.writeFileSync(
    path.join(staged.releasePath, provenance.treeFilename),
    `${'f'.repeat(40)}\n`,
    'utf8',
  );

  assert.throws(
    () =>
      promoteRelease({
        rootDir,
        identity: PREVIOUS_IDENTITY,
        commitFilename: provenance.commitFilename,
        treeFilename: provenance.treeFilename,
      }),
    (error) =>
      error instanceof NonProductionReleaseRehearsalError &&
      /does not match its expected exact identity/.test(error.message),
  );
});
