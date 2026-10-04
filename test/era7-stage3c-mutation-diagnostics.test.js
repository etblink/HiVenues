'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  deploymentErrorMessage,
} = require('../src/product/deployment-router');

test('Era 7 Stage 3C: mutation diagnostics expose only stable stages and status', () => {
  const error = new Error('Remote command returned a nonzero status.');
  error.code = 'DEPLOYMENT_REMOTE_COMMAND_FAILED';
  error.deploymentStage = 'bootstrap-initial';
  error.remoteExitCode = 100;
  error.remoteStderr = [
    'arbitrary apt stderr that must not be rendered',
    'secret-like-value=do-not-surface',
    'HIVENUES_MUTATION_STAGE=base-packages',
    '',
  ].join('\n');

  const message = deploymentErrorMessage(error);

  assert.equal(
    message,
    'Remote deployment operation failed during bootstrap-initial / base-packages '
      + '(status 100). [DEPLOYMENT_REMOTE_COMMAND_FAILED]',
  );
  assert.doesNotMatch(message, /arbitrary apt stderr/);
  assert.doesNotMatch(message, /secret-like-value/);
});

test('Era 7 Stage 3C: malformed remote stderr cannot inject a diagnostic stage', () => {
  const error = new Error('Remote command returned a nonzero status.');
  error.code = 'DEPLOYMENT_REMOTE_COMMAND_FAILED';
  error.deploymentStage = 'write-firewall-policy';
  error.remoteExitCode = 2;
  error.remoteStderr = [
    'HIVENUES_MUTATION_STAGE=valid-but-followed-by-space payload',
    'attacker text',
  ].join('\n');

  assert.equal(
    deploymentErrorMessage(error),
    'Remote deployment operation failed during write-firewall-policy '
      + '(status 2). [DEPLOYMENT_REMOTE_COMMAND_FAILED]',
  );
});


test('Era 7 Stage 5B corrective: repeated pre-auth failure exposes only bounded reconnection stage diagnostics', () => {
  const error = new Error('SSH connection failed before authentication could be proven.');
  error.code = 'DEPLOYMENT_SSH_CONNECTION_FAILED';
  error.reauthorizationStage = 'install-steady-authority';
  error.retryAttempts = 3;
  error.remoteStderr = 'secret-like-value=must-not-surface';

  const message = deploymentErrorMessage(error);

  assert.equal(
    message,
    'SSH connection failed before authentication could be proven. '
      + 'Stage: install-steady-authority after 3 bounded attempts. '
      + '[DEPLOYMENT_SSH_CONNECTION_FAILED]',
  );
  assert.doesNotMatch(message, /secret-like-value/);
});
