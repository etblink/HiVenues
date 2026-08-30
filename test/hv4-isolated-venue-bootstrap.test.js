'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const referenceManifest = require('../ops/privex/manifest.json');
const {
  VenueBootstrapError,
  composeVenueBootstrap,
  serializeVenueBootstrapReview,
} = require('../src/venue/bootstrap');
const { REFERENCE_DEPLOYMENT_PROFILE } = require('../src/deployment/reference/fourth-street-privex');
const { HV4_SYNTHETIC_BOOTSTRAP_INPUT } = require('./support/hv4-synthetic-bootstrap');

const ROOT = path.join(__dirname, '..');
const clone = (value) => JSON.parse(JSON.stringify(value));

function expectInvalid(mutator, pattern) {
  const input = clone(HV4_SYNTHETIC_BOOTSTRAP_INPUT);
  mutator(input);
  assert.throws(() => composeVenueBootstrap(input), pattern);
}

test('HV-4 deterministically composes the Lantern Room through the authoritative validators', () => {
  const first = composeVenueBootstrap(clone(HV4_SYNTHETIC_BOOTSTRAP_INPUT));
  const second = composeVenueBootstrap(clone(HV4_SYNTHETIC_BOOTSTRAP_INPUT));
  const firstReview = serializeVenueBootstrapReview(first);
  const secondReview = serializeVenueBootstrapReview(second);

  assert.deepEqual(first.identity, {
    venueId: 'lantern-room-fixture',
    packageId: 'lantern-room-fixture-package',
    deploymentId: 'lantern-room-offline-deployment',
  });
  assert.equal(first.venuePackage.onboarding.operatorNoun, 'reading room');
  assert.equal(first.venuePackage.onboarding.staffRole, 'host');
  assert.equal(first.deploymentProfile.topology.instances, 1);
  assert.equal(first.deploymentProfile.release.publicHost, 'lantern-room.example.invalid');
  assert.equal(first.deploymentProfile.release.automaticDeploys, false);
  assert.equal(firstReview, secondReview);
  assert.equal(firstReview.endsWith('\n'), true);
  assert.doesNotMatch(firstReview, /"venueType"/);

  for (const value of [
    first,
    first.identity,
    first.venueContext,
    first.venuePackage,
    first.deploymentProfile,
    first.metadata,
  ]) {
    assert.equal(Object.isFrozen(value), true);
  }
});

test('HV-4 fails closed when required bootstrap input is absent or an unsupported venue type is injected', () => {
  expectInvalid((input) => { delete input.bindings; }, /Venue bootstrap invalid: input does not match schema version 1/);
  expectInvalid((input) => { delete input.deploymentManifest; }, /Venue bootstrap invalid: input does not match schema version 1/);
  expectInvalid((input) => { input.venueType = 'bar'; }, /Venue bootstrap invalid: input does not match schema version 1/);
});

test('HV-4 delegates malformed venue, package, and deployment facts to the existing authoritative validators', () => {
  expectInvalid((input) => { delete input.venueContext.displayName; }, /Invalid venue context:/);
  expectInvalid((input) => { input.venuePackage.onboarding.staffRole = 'Host'; }, /Invalid venue package:/);
  expectInvalid((input) => { input.deploymentManifest.release.root = 'relative/releases'; }, /Deployment profile invalid:/);
});

test('HV-4 rejects cross-venue package pairing before composition', () => {
  expectInvalid(
    (input) => { input.venuePackage.venueId = 'fourth-street-bar'; },
    /is bound to fourth-street-bar, not lantern-room-fixture/,
  );
});

test('HV-4 requires declared venue, package, and deployment identities to match validated inputs', () => {
  expectInvalid(
    (input) => { input.bindings.venueId = 'another-venue'; },
    /bindings\.venueId expects another-venue, but validated input resolves to lantern-room-fixture/,
  );
  expectInvalid(
    (input) => { input.bindings.packageId = 'another-package'; },
    /bindings\.packageId expects another-package, but validated input resolves to lantern-room-fixture-package/,
  );
  expectInvalid(
    (input) => { input.bindings.deploymentId = 'another-deployment'; },
    /bindings\.deploymentId expects another-deployment, but validated input resolves to lantern-room-offline-deployment/,
  );
});

test('HV-4 rejects a valid Fourth Street deployment manifest when the bootstrap declares Lantern Room deployment identity', () => {
  expectInvalid(
    (input) => { input.deploymentManifest = clone(referenceManifest); },
    /bindings\.deploymentId expects lantern-room-offline-deployment, but validated input resolves to fourth-street-privex/,
  );
});

test('HV-4 rejects secret-bearing fields and recognizable private key material before producing review output', () => {
  const fakePemMarker = ['-----BEGIN', ' PRIVATE', ' KEY----- fixture'].join('');

  expectInvalid(
    (input) => { input.metadata.apiToken = 'fixture-value'; },
    /metadata\.apiToken is a secret-bearing field and is not allowed/,
  );
  expectInvalid(
    (input) => { input.metadata.notes = fakePemMarker; },
    /contains private key material/,
  );
});

test('HV-4 generic bootstrap code is venue-neutral and does not fork on Fourth Street', () => {
  const source = fs.readFileSync(path.join(ROOT, 'src/venue/bootstrap.js'), 'utf8');

  assert.doesNotMatch(source, /fourth[- ]street/i);
  assert.doesNotMatch(source, /\bbar\b/i);
  assert.doesNotMatch(source, /venueType/);
  assert.match(source, /createVenueContext\(envelope\.venueContext\)/);
  assert.match(source, /createVenuePackage\(envelope\.venuePackage, venueContext\)/);
  assert.match(source, /compileDeploymentProfile\(envelope\.deploymentManifest\)/);
});

test('HV-4 preserves Fourth Street production compatibility identities while proving another isolated deployment', () => {
  assert.equal(REFERENCE_DEPLOYMENT_PROFILE.release.root, '/opt/hive-bar');
  assert.equal(REFERENCE_DEPLOYMENT_PROFILE.release.service, 'hive-bar.service');
  assert.equal(REFERENCE_DEPLOYMENT_PROFILE.storage.paymentDatabase, '/var/lib/hive-bar/payments/receipts.sqlite3');
  assert.equal(REFERENCE_DEPLOYMENT_PROFILE.storage.onboardingDatabase, '/var/lib/hive-bar/onboarding/onboarding.sqlite3');
  assert.equal(REFERENCE_DEPLOYMENT_PROFILE.provenance.commitFilename, '.hive-bar-commit');
  assert.equal(REFERENCE_DEPLOYMENT_PROFILE.provenance.treeFilename, '.hive-bar-tree');
  assert.match(REFERENCE_DEPLOYMENT_PROFILE.release.hiveAppTag, /^fourth-street-bar-app\//);
});

test('HV-4 CLI emits only the deterministic normalized review document for valid non-secret JSON', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hive-venues-hv4-'));
  const inputPath = path.join(directory, 'bootstrap.json');
  const input = clone(HV4_SYNTHETIC_BOOTSTRAP_INPUT);
  fs.writeFileSync(inputPath, `${JSON.stringify(input, null, 2)}\n`, 'utf8');

  try {
    const result = spawnSync(
      process.execPath,
      [path.join(ROOT, 'scripts/validate-venue-bootstrap.js'), inputPath],
      { cwd: ROOT, encoding: 'utf8' },
    );
    const expected = serializeVenueBootstrapReview(composeVenueBootstrap(input));

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, '');
    assert.equal(result.stdout, expected);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('HV-4 reports secret rejection without echoing the secret value', () => {
  const secretValue = 'do-not-echo-this-fixture-token';
  const input = clone(HV4_SYNTHETIC_BOOTSTRAP_INPUT);
  input.metadata.apiToken = secretValue;

  assert.throws(
    () => composeVenueBootstrap(input),
    (error) => {
      assert.equal(error instanceof VenueBootstrapError, true);
      assert.doesNotMatch(error.message, new RegExp(secretValue));
      return true;
    },
  );
});
