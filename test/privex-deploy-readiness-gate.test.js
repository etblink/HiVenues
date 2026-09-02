'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { spawnSync } = require('node:child_process');
const {
  productionInvariantCoverageFromSources,
} = require('../src/release/non-production-rehearsal');

const root = path.resolve(__dirname, '..');
const deployPath = path.join(root, 'ops', 'privex', 'bin', 'hive-bar-deploy');
const rollbackPath = path.join(root, 'ops', 'privex', 'bin', 'hive-bar-rollback');

function readHelpers() {
  return {
    deploy: fs.readFileSync(deployPath, 'utf8'),
    rollback: fs.readFileSync(rollbackPath, 'utf8'),
  };
}

function extractSimpleFunction(source, name) {
  const match = source.match(new RegExp(`${name}\\(\\) \\{([\\s\\S]*?)\\n\\}`));
  assert.ok(match, `${name} must exist`);
  return `${name}() {${match[1]}\n}`;
}

function extractProbeNodeProgram(source) {
  const match = source.match(/"\$runtime" <<'NODE'\n([\s\S]*?)\nNODE/);
  assert.ok(match, 'load_probe_urls Node program must exist');
  return match[1];
}

function runProbeNodeProgram(source, releaseRoot) {
  return spawnSync(process.execPath, ['-e', extractProbeNodeProgram(source)], {
    cwd: root,
    env: { ...process.env, RELEASE_ROOT: releaseRoot },
    encoding: 'utf8',
  });
}

function runReadinessBodyPredicate(source, body) {
  const predicate = extractSimpleFunction(source, 'readiness_body_is_ready');
  return spawnSync('bash', ['-c', `${predicate}\nreadiness_body_is_ready "$1"`, 'bash', body], {
    encoding: 'utf8',
  });
}

function legacyReleaseRoot(t, manifest) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hive-venues-legacy-privex-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.mkdirSync(path.join(directory, 'ops', 'privex'), { recursive: true });
  fs.writeFileSync(
    path.join(directory, 'ops', 'privex', 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );
  return directory;
}

function historicalPrivexManifest(overrides = {}) {
  return {
    schemaVersion: 1,
    topology: {
      applicationAddress: '127.0.0.1:3000',
      ...(overrides.topology || {}),
    },
    release: {
      healthPath: '/healthz',
      readinessPath: '/readyz',
      ...(overrides.release || {}),
    },
  };
}

test('deploy and rollback derive health and readiness routes from the compiled deployment profile when available', () => {
  const { deploy, rollback } = readHelpers();

  for (const source of [deploy, rollback]) {
    assert.match(source, /fs\.existsSync\(profilePath\)/);
    assert.match(source, /compileDeploymentProfile/);
    assert.match(source, /profile\.release\.healthPath/);
    assert.match(source, /profile\.release\.readinessPath/);
    assert.match(source, /profile\.topology\.application/);
    assert.doesNotMatch(source, /readonly health_url=http:\/\/127\.0\.0\.1:3000\/healthz/);
    assert.doesNotMatch(source, /readonly readiness_url=http:\/\/127\.0\.0\.1:3000\/readyz/);

    const result = runProbeNodeProgram(source, root);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, 'http://127.0.0.1:3000/healthz\nhttp://127.0.0.1:3000/readyz\n');
  }
});

test('legacy installed releases without deployment profile compiler derive probes from the reviewed Privex manifest', (t) => {
  const releaseRoot = legacyReleaseRoot(t, historicalPrivexManifest());
  assert.equal(fs.existsSync(path.join(releaseRoot, 'src', 'deployment', 'profile.js')), false);
  const { deploy, rollback } = readHelpers();

  for (const source of [deploy, rollback]) {
    const result = runProbeNodeProgram(source, releaseRoot);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, 'http://127.0.0.1:3000/healthz\nhttp://127.0.0.1:3000/readyz\n');
  }
});

test('legacy manifest fallback fails closed for non-loopback topology and malformed or missing readiness routes', (t) => {
  const cases = [
    historicalPrivexManifest({ topology: { applicationAddress: 'example.com:3000' } }),
    historicalPrivexManifest({ release: { readinessPath: '' } }),
    historicalPrivexManifest({ release: { readinessPath: 'readyz' } }),
    historicalPrivexManifest({ release: { readinessPath: '/healthz' } }),
  ];
  const { deploy, rollback } = readHelpers();
  for (const manifest of cases) {
    const releaseRoot = legacyReleaseRoot(t, manifest);
    for (const source of [deploy, rollback]) {
      const result = runProbeNodeProgram(source, releaseRoot);
      assert.notEqual(result.status, 0);
    }
  }
});

test('deploy and rollback require exact health identity and readiness in the same success gate', () => {
  const { deploy, rollback } = readHelpers();
  const coverage = productionInvariantCoverageFromSources(deploy, rollback);

  assert.equal(coverage.deployHealthBindsCommitTree, true);
  assert.equal(coverage.deployReadinessGateFromDeploymentProfile, true);
  assert.equal(coverage.rollbackHealthBindsCommitTree, true);
  assert.equal(coverage.rollbackReadinessGateFromDeploymentProfile, true);

  for (const source of [deploy, rollback]) {
    assert.match(source, /\\"commit\\":\\"\$commit\\"/);
    assert.match(source, /\\"tree\\":\\"\$tree\\"/);
    assert.match(source, /\]\] &&\n\s+readiness_check; then/);
  }
});

test('readiness body predicate accepts ready and fails closed for not-ready, malformed, and empty bodies', (t) => {
  if (process.platform === 'win32') {
    t.skip('direct Bash predicate execution runs on non-Windows CI lanes');
    return;
  }
  const { deploy, rollback } = readHelpers();
  for (const source of [deploy, rollback]) {
    assert.equal(runReadinessBodyPredicate(source, '{"status":"ready"}').status, 0);
    assert.notEqual(runReadinessBodyPredicate(source, '{"status":"not_ready"}').status, 0);
    assert.notEqual(runReadinessBodyPredicate(source, '{"status":"ready"').status, 0);
    assert.notEqual(runReadinessBodyPredicate(source, '').status, 0);
  }
});

test('readiness check fails when its HTTP request is unreachable', (t) => {
  if (process.platform === 'win32') {
    t.skip('direct Bash curl-failure simulation runs on non-Windows CI lanes');
    return;
  }
  const { deploy, rollback } = readHelpers();
  for (const source of [deploy, rollback]) {
    const predicate = extractSimpleFunction(source, 'readiness_body_is_ready');
    const check = extractSimpleFunction(source, 'readiness_check');
    const program = [
      predicate,
      check,
      'readiness_url=http://127.0.0.1:9/readyz',
      'curl() { return 7; }',
      'readiness_check',
    ].join('\n');
    const result = spawnSync('bash', ['-c', program], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
  }
});

test('production invariant cross-check fails if readiness gating disappears while exact health and recovery prose remain', () => {
  const { deploy, rollback } = readHelpers();
  const deployWithoutReadiness = deploy.replace(
    ']] &&\n      readiness_check; then',
    ']]; then',
  );
  const rollbackWithoutReadiness = rollback.replace(
    ']] &&\n      readiness_check; then',
    ']]; then',
  );

  const missingDeploy = productionInvariantCoverageFromSources(deployWithoutReadiness, rollback);
  const missingRollback = productionInvariantCoverageFromSources(deploy, rollbackWithoutReadiness);

  assert.equal(missingDeploy.deployHealthBindsCommitTree, true);
  assert.equal(missingDeploy.deployReadinessGateFromDeploymentProfile, false);
  assert.equal(missingDeploy.deployFailureRestoresPrevious, true);
  assert.equal(missingRollback.rollbackHealthBindsCommitTree, true);
  assert.equal(missingRollback.rollbackReadinessGateFromDeploymentProfile, false);
  assert.equal(missingRollback.rollbackFailureRestoresPrior, true);
  assert.match(deployWithoutReadiness, /the previous release was restored when available/);
  assert.match(rollbackWithoutReadiness, /the prior release was restored when available/);
});

test('production helper Bash remains syntactically valid', (t) => {
  if (process.platform === 'win32') {
    t.skip('bash syntax validation runs on non-Windows CI lanes');
    return;
  }
  for (const helper of [deployPath, rollbackPath]) {
    const result = spawnSync('bash', ['-n', helper], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr || `${helper} failed bash -n`);
  }
});
