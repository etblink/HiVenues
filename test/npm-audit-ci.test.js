'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  AUDIT_ARGS,
  DEFAULT_POLICY,
  buildAuditCommand,
  classifyAuditAttempt,
  policyWorstCaseMs,
  runAuditPolicy,
  spawnCommandAttempt,
} = require('../scripts/run-npm-audit-ci');

function report({ low = 0, moderate = 0, high = 0, critical = 0 } = {}) {
  return JSON.stringify({
    auditReportVersion: 2,
    vulnerabilities: {},
    metadata: {
      vulnerabilities: {
        info: 0,
        low,
        moderate,
        high,
        critical,
        total: low + moderate + high + critical,
      },
    },
  });
}

function outcome(overrides = {}) {
  return {
    exitCode: 0,
    signal: null,
    timedOut: false,
    timeoutMs: 60_000,
    stdout: report(),
    stderr: '',
    error: null,
    ...overrides,
  };
}

function sequence(values) {
  let index = 0;
  return async () => values[index++];
}

test('bounded entrypoint retains the exact production audit threshold and a finite total policy', () => {
  const command = buildAuditCommand('/npm/bin/npm-cli.js');

  assert.equal(command.command, process.execPath);
  assert.deepEqual(AUDIT_ARGS, ['audit', '--omit=dev', '--audit-level=high', '--json']);
  assert.deepEqual(command.args, ['/npm/bin/npm-cli.js', ...AUDIT_ARGS]);
  assert.equal(policyWorstCaseMs(DEFAULT_POLICY), 195_000);
});

test('clean audit result is classified as success', async () => {
  const result = await runAuditPolicy({
    runAttempt: sequence([outcome()]),
  });

  assert.equal(result.kind, 'success');
  assert.equal(result.attempts.length, 1);
});

test('high-or-critical vulnerability fails immediately without retry', async () => {
  let sleeps = 0;
  const result = await runAuditPolicy({
    runAttempt: sequence([outcome({ exitCode: 1, stdout: report({ high: 1 }) })]),
    sleep: async () => { sleeps += 1; },
  });

  assert.equal(result.kind, 'vulnerability');
  assert.equal(result.attempts.length, 1);
  assert.equal(sleeps, 0);
});

test('HTTP advisory-service failure is distinct, retried, and never treated as clean', async () => {
  const waits = [];
  const http503 = outcome({
    exitCode: 1,
    stdout: JSON.stringify({
      error: {
        code: 'E503',
        summary: '503 Service Unavailable - POST https://registry.npmjs.org/-/npm/v1/security/advisories/bulk',
        detail: '',
      },
    }),
  });

  assert.equal(classifyAuditAttempt(http503).kind, 'network_failure');
  const result = await runAuditPolicy({
    runAttempt: sequence([http503, outcome()]),
    sleep: async (milliseconds) => { waits.push(milliseconds); },
  });

  assert.equal(result.kind, 'success');
  assert.deepEqual(result.attempts.map((attempt) => attempt.classification.kind), [
    'network_failure',
    'success',
  ]);
  assert.deepEqual(waits, [5_000]);
});

test('timed-out advisory call is distinct and can recover on a bounded retry', async () => {
  const timeout = outcome({
    exitCode: null,
    timedOut: true,
    stdout: '',
  });

  assert.equal(classifyAuditAttempt(timeout).kind, 'timeout');
  const result = await runAuditPolicy({
    runAttempt: sequence([timeout, outcome()]),
    sleep: async () => {},
  });

  assert.equal(result.kind, 'success');
  assert.deepEqual(result.attempts.map((attempt) => attempt.classification.kind), [
    'timeout',
    'success',
  ]);
});

test('retry exhaustion remains a failing unknown security result', async () => {
  const http503 = outcome({
    exitCode: 1,
    stdout: JSON.stringify({ error: { code: 'E503', summary: '503 Service Unavailable' } }),
  });
  const timeout = outcome({ exitCode: null, timedOut: true, stdout: '' });
  const waits = [];
  const result = await runAuditPolicy({
    runAttempt: sequence([http503, timeout, http503]),
    sleep: async (milliseconds) => { waits.push(milliseconds); },
  });

  assert.equal(result.kind, 'retry_exhausted');
  assert.equal(result.classification.lastKind, 'network_failure');
  assert.equal(result.attempts.length, 3);
  assert.deepEqual(waits, [5_000, 10_000]);
});

test('unknown command failure is fail-closed and is not retried', async () => {
  const result = await runAuditPolicy({
    runAttempt: sequence([outcome({ exitCode: 1, stdout: '', stderr: 'unexpected npm failure' })]),
    sleep: async () => assert.fail('unknown failures must not be retried'),
  });

  assert.equal(result.kind, 'command_error');
  assert.equal(result.attempts.length, 1);
});

test('command runner terminates a stalled child within its attempt boundary', { timeout: 5_000 }, async () => {
  const startedAt = Date.now();
  const result = await spawnCommandAttempt({
    command: process.execPath,
    args: ['-e', 'setInterval(() => {}, 1_000)'],
    timeoutMs: 100,
  });

  assert.equal(result.timedOut, true);
  assert.ok(Date.now() - startedAt < 4_000);
});

test('workflow separates both OS audit lanes from the deterministic verification lanes', () => {
  const root = path.join(__dirname, '..');
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'ci.yml'), 'utf8');
  const verifyStart = workflow.indexOf('  verify:');
  const auditStart = workflow.indexOf('  security-audit:');
  const visualStart = workflow.indexOf('  visual-acceptance:');
  const verifyBlock = workflow.slice(verifyStart, auditStart);
  const auditBlock = workflow.slice(auditStart, visualStart);

  assert.equal(packageJson.scripts['audit:prod'], 'npm audit --omit=dev --audit-level=high');
  assert.equal(packageJson.scripts['audit:prod:ci'], 'node scripts/run-npm-audit-ci.js');
  assert.match(packageJson.scripts.check, /^npm run check:deterministic && npm run audit:prod:ci$/);
  assert.match(verifyBlock, /run: npm run check:deterministic/);
  assert.doesNotMatch(verifyBlock, /audit:prod/);
  assert.match(auditBlock, /ubuntu-latest/);
  assert.match(auditBlock, /windows-latest/);
  assert.match(auditBlock, /timeout-minutes: 6/);
  assert.match(auditBlock, /run: npm run audit:prod:ci/);
});
