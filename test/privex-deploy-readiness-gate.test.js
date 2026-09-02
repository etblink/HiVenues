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

const EXACT_COMMIT = '2'.repeat(40);
const EXACT_TREE = 'b'.repeat(40);
const EXACT_BUILD = `beta-${EXACT_COMMIT.slice(0, 7)}`;
const EXACT_HEALTH = JSON.stringify({
  status: 'ok',
  service: 'hive-bar',
  environment: 'production',
  writeMode: 'disabled',
  build: EXACT_BUILD,
  commit: EXACT_COMMIT,
  tree: EXACT_TREE,
});

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

function runGateProbe(source, overrides = {}) {
  const predicate = extractSimpleFunction(source, 'readiness_body_is_ready');
  const gate = extractSimpleFunction(source, 'release_gate_check');
  const reason = extractSimpleFunction(source, 'gate_failure_reason');
  const program = [
    predicate,
    gate,
    reason,
    'health_url=http://127.0.0.1:3000/healthz',
    'readiness_url=http://127.0.0.1:3000/readyz',
    `build=${EXACT_BUILD}`,
    `commit=${EXACT_COMMIT}`,
    `tree=${EXACT_TREE}`,
    'gate_failure=NOT_RUN',
    'curl() {',
    '  local url="${!#}"',
    '  if [[ "$url" == "$health_url" ]]; then',
    '    [[ "${HEALTH_EXIT:-0}" == 0 ]] || return "$HEALTH_EXIT"',
    '    printf \'%s\\n%s\' "$HEALTH_BODY" "$HEALTH_STATUS"',
    '    return 0',
    '  fi',
    '  [[ "${READINESS_EXIT:-0}" == 0 ]] || return "$READINESS_EXIT"',
    '  printf \'%s\\n%s\' "$READINESS_BODY" "$READINESS_STATUS"',
    '}',
    'set +e',
    'release_gate_check',
    'status=$?',
    'reason="$(gate_failure_reason)"',
    'printf \'status=%s\\nfailure=%s\\nreason=%s\\n\' "$status" "$gate_failure" "$reason"',
    'exit 0',
  ].join('\n');

  return spawnSync('bash', ['-c', program], {
    encoding: 'utf8',
    env: {
      ...process.env,
      HEALTH_BODY: EXACT_HEALTH,
      HEALTH_STATUS: '200',
      HEALTH_EXIT: '0',
      READINESS_BODY: '{"status":"ready"}',
      READINESS_STATUS: '200',
      READINESS_EXIT: '0',
      ...overrides,
    },
  });
}

function parseProbeOutput(output) {
  return Object.fromEntries(
    output.trim().split('\n').map((line) => {
      const index = line.indexOf('=');
      return [line.slice(0, index), line.slice(index + 1)];
    }),
  );
}

function runReadiness503RestorationHarness(source, t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hive-venues-readiness-restore-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));

  const predicate = extractSimpleFunction(source, 'readiness_body_is_ready');
  const gate = extractSimpleFunction(source, 'release_gate_check');
  const restore = extractSimpleFunction(source, 'restore_previous_release');
  const reason = extractSimpleFunction(source, 'gate_failure_reason');
  const program = [
    'set -Eeuo pipefail',
    predicate,
    gate,
    restore,
    reason,
    'app_root="$1"',
    'current="$app_root/current"',
    'previous="$app_root/releases/previous"',
    'candidate="$app_root/releases/candidate"',
    'service=hive-bar.service',
    'health_url=http://127.0.0.1:3000/healthz',
    'readiness_url=http://127.0.0.1:3000/readyz',
    `build=${EXACT_BUILD}`,
    `commit=${EXACT_COMMIT}`,
    `tree=${EXACT_TREE}`,
    'gate_failure=NOT_RUN',
    'mkdir -p "$previous" "$candidate"',
    'ln -s "$candidate" "$current"',
    'curl() {',
    '  local url="${!#}"',
    '  if [[ "$url" == "$health_url" ]]; then',
    '    printf \'%s\\n200\' "$HEALTH_BODY"',
    '    return 0',
    '  fi',
    '  printf \'%s\\n503\' \'{"status":"not_ready"}\'',
    '  return 0',
    '}',
    'systemctl() {',
    '  [[ "$1" == restart && "$2" == "$service" ]] || return 91',
    '  printf \'restart\\n\' >>"$app_root/systemctl.log"',
    '}',
    'set +e',
    'release_gate_check',
    'gate_status=$?',
    'set -e',
    '[[ "$gate_status" -ne 0 ]] || exit 92',
    '[[ "$gate_failure" == READINESS_HTTP_503 ]] || exit 93',
    '[[ "$(gate_failure_reason)" == "readiness gate failed (READINESS_HTTP_503)" ]] || exit 94',
    'restore_previous_release',
    '[[ "$(readlink -f "$current")" == "$(readlink -f "$previous")" ]] || exit 95',
    '[[ "$(cat "$app_root/systemctl.log")" == restart ]] || exit 96',
    'printf \'failure=%s\\nrestored=%s\\n\' "$gate_failure" "$(readlink -f "$current")"',
  ].join('\n');

  return spawnSync('bash', ['-c', program, 'bash', directory], {
    encoding: 'utf8',
    env: { ...process.env, HEALTH_BODY: EXACT_HEALTH },
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

test('exact health identity plus ready response is accepted by both production gates', (t) => {
  if (process.platform === 'win32') {
    t.skip('direct Bash gate execution runs on non-Windows CI lanes');
    return;
  }
  const { deploy, rollback } = readHelpers();
  for (const source of [deploy, rollback]) {
    const result = runGateProbe(source);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(parseProbeOutput(result.stdout), {
      status: '0',
      failure: 'NONE',
      reason: 'release gate failed (NONE)',
    });
  }
});

test('health identity and readiness failures receive distinct deterministic classifications', (t) => {
  if (process.platform === 'win32') {
    t.skip('direct Bash gate execution runs on non-Windows CI lanes');
    return;
  }
  const { deploy, rollback } = readHelpers();
  for (const source of [deploy, rollback]) {
    const healthFailure = parseProbeOutput(
      runGateProbe(source, { HEALTH_BODY: '{"status":"ok","writeMode":"disabled"}' }).stdout,
    );
    assert.equal(healthFailure.status, '1');
    assert.equal(healthFailure.failure, 'HEALTH_IDENTITY_MISMATCH');
    assert.equal(
      healthFailure.reason,
      'health identity gate failed (HEALTH_IDENTITY_MISMATCH)',
    );

    const readinessFailure = parseProbeOutput(
      runGateProbe(source, {
        READINESS_BODY: '{"status":"not_ready"}',
        READINESS_STATUS: '503',
      }).stdout,
    );
    assert.equal(readinessFailure.status, '1');
    assert.equal(readinessFailure.failure, 'READINESS_HTTP_503');
    assert.equal(
      readinessFailure.reason,
      'readiness gate failed (READINESS_HTTP_503)',
    );
  }
});

test('exact health plus 503 not_ready refuses acceptance and executes prior-release restoration', (t) => {
  if (process.platform === 'win32') {
    t.skip('production Bash recovery harness runs on non-Windows CI lanes');
    return;
  }
  const { deploy, rollback } = readHelpers();
  for (const source of [deploy, rollback]) {
    const result = runReadiness503RestorationHarness(source, t);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /^failure=READINESS_HTTP_503$/m);
    assert.match(result.stdout, /^restored=.*\/releases\/previous$/m);
  }
});

test('unreachable readiness is classified separately from not-ready and from health failure', (t) => {
  if (process.platform === 'win32') {
    t.skip('direct Bash gate execution runs on non-Windows CI lanes');
    return;
  }
  const { deploy, rollback } = readHelpers();
  for (const source of [deploy, rollback]) {
    const result = runGateProbe(source, { READINESS_EXIT: '7' });
    assert.equal(result.status, 0, result.stderr);
    const observed = parseProbeOutput(result.stdout);
    assert.equal(observed.status, '1');
    assert.equal(observed.failure, 'READINESS_UNREACHABLE');
    assert.equal(observed.reason, 'readiness gate failed (READINESS_UNREACHABLE)');
  }
});

test('production invariant cross-check requires readiness invocation, distinct failure classification, and recovery mechanics', () => {
  const { deploy, rollback } = readHelpers();
  const baseline = productionInvariantCoverageFromSources(deploy, rollback);
  assert.ok(Object.values(baseline).every(Boolean));

  const deployWithoutGateInvocation = deploy.replace(
    'if release_gate_check; then',
    'if true; then',
  );
  const rollbackWithoutReadinessClassification = rollback.replace(
    'gate_failure="READINESS_HTTP_$http_status"',
    'gate_failure="HEALTH_HTTP_$http_status"',
  );
  const deployWithoutRecoverySwitch = deploy.replace(
    'mv -Tf "$recovery_link" "$current"',
    '# injected test: recovery current switch removed',
  );

  const missingDeployGate = productionInvariantCoverageFromSources(
    deployWithoutGateInvocation,
    rollback,
  );
  const missingRollbackClassification = productionInvariantCoverageFromSources(
    deploy,
    rollbackWithoutReadinessClassification,
  );
  const missingDeployRecovery = productionInvariantCoverageFromSources(
    deployWithoutRecoverySwitch,
    rollback,
  );

  assert.equal(missingDeployGate.deployHealthBindsCommitTree, true);
  assert.equal(missingDeployGate.deployReadinessGateFromDeploymentProfile, false);
  assert.equal(
    missingRollbackClassification.rollbackDistinctHealthReadinessFailureClassification,
    false,
  );
  assert.equal(missingDeployRecovery.deployFailureRestoresPrevious, false);
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
