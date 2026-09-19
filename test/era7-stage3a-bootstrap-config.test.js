'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { createReferenceBootstrapPlan } = require('../src/deploy/bootstrap-plan');
const {
  renderBootstrapArtifacts,
  renderCaddyHttpConfig,
  renderNftablesPolicy,
  renderRestrictedSudoers,
  renderRuntimeEnvironment,
  renderSystemdUnit,
} = require('../src/deploy/bootstrap-config');

function plan() {
  return createReferenceBootstrapPlan({
    runtimeProvenance: {
      sourceSha: '1'.repeat(40),
      sourceTree: '2'.repeat(40),
      packageVersion: '1.0.0',
      nodeVersion: 'v24.19.0',
      bundleDigest: 'a'.repeat(64),
    },
    releaseManifest: {
      hostSlug: 'harbor-and-hearth',
      releaseId: 'release-stage3a',
      releaseDigest: 'b'.repeat(64),
      packageDigest: 'c'.repeat(64),
    },
  });
}

test('Era 7 Stage 3A: bootstrap environment uses stable current pointers and loopback runtime port', () => {
  const value = renderRuntimeEnvironment(plan());
  assert.match(value, /HIVENUES_RELEASE_PACKAGE='\/srv\/hivenues\/releases\/current-harbor-and-hearth'/);
  assert.match(value, /HIVENUES_RUNTIME_PROVENANCE='\/opt\/hivenues\/runtime\/current\/runtime-provenance\.json'/);
  assert.match(value, /HIVENUES_RUNTIME_MANIFEST='\/opt\/hivenues\/runtime\/current\/runtime-manifest\.json'/);
  assert.match(value, /HIVENUES_RUNTIME_STATE='\/var\/lib\/hivenues\/harbor-and-hearth\/runtime-state\.json'/);
  assert.match(value, /PORT='4317'/);
  assert.match(value, /NODE_ENV='production'/);
  assert.doesNotMatch(value, /release-stage3a|aaaaaaaaaaaaaaaa/);
});

test('Era 7 Stage 3A: systemd unit runs as non-login runtime user against stable runtime pointer', () => {
  const value = renderSystemdUnit(plan());
  assert.match(value, /^User=hivenues$/m);
  assert.match(value, /^Group=hivenues$/m);
  assert.match(value, /^WorkingDirectory=\/opt\/hivenues\/runtime\/current$/m);
  assert.match(
    value,
    /^ExecStart=\/usr\/bin\/node \/opt\/hivenues\/runtime\/current\/scripts\/hivenues-public-runtime\.js$/m,
  );
  assert.match(value, /^NoNewPrivileges=true$/m);
  assert.match(value, /^ProtectSystem=strict$/m);
  assert.match(value, /^ProtectHome=true$/m);
  assert.match(value, /^ReadWritePaths=\/var\/lib\/hivenues\/harbor-and-hearth$/m);
  assert.doesNotMatch(value, /root|sudo|ssh|release-stage3a/);
});

test('Era 7 Stage 3A: temporary Caddy config is HTTP-only and reverse-proxies only to loopback', () => {
  const value = renderCaddyHttpConfig(plan());
  assert.match(value, /^  auto_https off$/m);
  assert.match(value, /^  admin off$/m);
  assert.match(value, /^http:\/\/:80 \{$/m);
  assert.match(value, /^  reverse_proxy 127\.0\.0\.1:4317$/m);
  assert.doesNotMatch(value, /:443|tls |acme|dns |https:\/\//i);
});

test('Era 7 Stage 3A: firewall policy exposes only deployment SSH and temporary HTTP', () => {
  const value = renderNftablesPolicy({ sshPort: 2222 });
  assert.match(value, /policy drop/);
  assert.match(value, /tcp dport 2222 accept/);
  assert.match(value, /tcp dport 80 accept/);
  assert.doesNotMatch(value, /dport 443|53 accept|4317 accept/);
  assert.throws(
    () => renderNftablesPolicy({ sshPort: 0 }),
    (error) => error.code === 'DEPLOYED_BOOTSTRAP_SSH_PORT_INVALID',
  );
});

test('Era 7 Stage 3A: steady-state sudo authority is restricted to the named HiVenues service', () => {
  const value = renderRestrictedSudoers(plan());
  assert.match(value, /^Cmnd_Alias HIVENUES_SERVICE = /m);
  assert.match(value, /systemctl restart hivenues-harbor-and-hearth\.service/);
  assert.match(value, /systemctl start hivenues-harbor-and-hearth\.service/);
  assert.match(value, /systemctl stop hivenues-harbor-and-hearth\.service/);
  assert.match(value, /systemctl status hivenues-harbor-and-hearth\.service/);
  assert.match(value, /^hivenues-deploy ALL=\(root\) NOPASSWD: HIVENUES_SERVICE$/m);
  assert.doesNotMatch(value, /ALL=\(ALL|\/bin\/sh|\/bin\/bash|daemon-reload|caddy|nft|apt|npm/);
});

test('Era 7 Stage 3A: complete bootstrap artifacts contain no Stage 4 domain or TLS mutation', () => {
  const artifacts = renderBootstrapArtifacts(plan(), { sshPort: 22 });
  assert.deepEqual(Object.keys(artifacts).sort(), [
    'caddyHttpConfig',
    'environment',
    'nftablesPolicy',
    'restrictedSudoers',
    'systemdUnit',
  ]);
  const combined = Object.values(artifacts).join('\n');
  assert.doesNotMatch(combined, /certificate|acme|dns provider|api token|private key/i);
  assert.doesNotMatch(combined, /https:\/\/|:443/);
});
