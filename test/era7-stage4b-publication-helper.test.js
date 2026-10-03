'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  applyPublication,
  canonicalPublicationPaths,
  normalizePublicationHostname,
  publicationStatus,
  renderPublicationCaddyConfig,
  renderPublicationNftablesPolicy,
  requirePublicationMetadata,
} = require('../src/deploy/publication-helper-runtime');

function metadata() {
  return {
    version: 1,
    hostSlug: 'harbor-and-hearth',
    runtimePort: 4317,
    sshPort: 22,
  };
}

function tempPaths(root) {
  return {
    caddyConfig: path.join(root, 'etc', 'harbor-and-hearth.caddy'),
    firewallPolicy: path.join(root, 'etc', 'harbor-and-hearth.nft'),
    metadata: path.join(root, 'etc', 'harbor-and-hearth.publication.json'),
    stateRoot: path.join(root, 'state'),
    status: path.join(root, 'state', 'status.json'),
    caddyStateRoot: path.join(root, 'caddy'),
    helper: path.join(root, 'libexec', 'hivenues-publication-harbor-and-hearth'),
    caddyService: 'hivenues-caddy.service',
    firewallService: 'hivenues-firewall.service',
  };
}

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-stage4b-helper-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const paths = tempPaths(root);
  fs.mkdirSync(path.dirname(paths.caddyConfig), { recursive: true });
  fs.mkdirSync(paths.stateRoot, { recursive: true });
  fs.writeFileSync(paths.caddyConfig, 'old-caddy\n', 'utf8');
  fs.writeFileSync(paths.firewallPolicy, 'old-firewall\n', 'utf8');
  return { root, paths };
}

test('Era 7 Stage 4B: publication helper accepts only strict FQDN input', () => {
  assert.equal(normalizePublicationHostname('Dev.FourthStreetBar.com.'), 'dev.fourthstreetbar.com');
  for (const value of [
    'localhost',
    '*.fourthstreetbar.com',
    'https://dev.fourthstreetbar.com',
    'dev.fourthstreetbar.com/path',
    'dev.fourthstreetbar.com;id',
    '--help',
    'dev fourthstreetbar.com',
  ]) {
    assert.throws(
      () => normalizePublicationHostname(value),
      (error) => error.code === 'PUBLICATION_HOSTNAME_INVALID',
    );
  }
});

test('Era 7 Stage 4B: publication metadata is host-scoped and accepts no path or command authority', () => {
  assert.deepEqual(requirePublicationMetadata(metadata()), metadata());
  assert.throws(
    () => requirePublicationMetadata({ ...metadata(), caddyConfig: '/tmp/owned' }),
    (error) => error.code === 'PUBLICATION_METADATA_INVALID',
  );
  assert.deepEqual(canonicalPublicationPaths('harbor-and-hearth'), {
    caddyConfig: '/etc/hivenues/harbor-and-hearth.caddy',
    firewallPolicy: '/etc/hivenues/harbor-and-hearth.nft',
    metadata: '/etc/hivenues/harbor-and-hearth.publication.json',
    stateRoot: '/var/lib/hivenues-publication/harbor-and-hearth',
    status: '/var/lib/hivenues-publication/harbor-and-hearth/status.json',
    caddyStateRoot: '/var/lib/hivenues-caddy/harbor-and-hearth',
    helper: '/usr/local/libexec/hivenues-publication-harbor-and-hearth',
    caddyService: 'hivenues-caddy.service',
    firewallService: 'hivenues-firewall.service',
  });
});

test('Era 7 Stage 4B: publication renderers bind one hostname to loopback and open only SSH HTTP HTTPS', () => {
  const caddy = renderPublicationCaddyConfig({
    hostname: 'dev.fourthstreetbar.com',
    runtimePort: 4317,
  });
  assert.match(caddy, /^dev\.fourthstreetbar\.com \{$/m);
  assert.match(caddy, /^  reverse_proxy 127\.0\.0\.1:4317$/m);
  assert.doesNotMatch(caddy, /auto_https off|:4317 \{|0\.0\.0\.0/);

  const firewall = renderPublicationNftablesPolicy({ sshPort: 22 });
  assert.match(firewall, /tcp dport 22 accept/);
  assert.match(firewall, /tcp dport 80 accept/);
  assert.match(firewall, /tcp dport 443 accept/);
  assert.doesNotMatch(firewall, /dport 4317 accept|flush ruleset/);
});

test('Era 7 Stage 4B: bounded apply validates candidates, activates only named services, and records hashes', (t) => {
  const f = fixture(t);
  const calls = [];
  const execFile = (command, args) => {
    calls.push([command, [...args]]);
    return '';
  };

  const result = applyPublication({
    metadata: metadata(),
    hostname: 'dev.fourthstreetbar.com',
    paths: f.paths,
    execFile,
    now: () => Date.parse('2026-10-03T17:30:00.000Z'),
  });

  assert.equal(result.state, 'configured');
  assert.equal(result.hostname, 'dev.fourthstreetbar.com');
  assert.match(fs.readFileSync(f.paths.caddyConfig, 'utf8'), /dev\.fourthstreetbar\.com/);
  assert.match(fs.readFileSync(f.paths.firewallPolicy, 'utf8'), /tcp dport 443 accept/);
  assert.equal(
    calls.some(([command, args]) => (
      command === '/usr/bin/caddy'
      && args[0] === 'validate'
      && args.includes(f.paths.caddyConfig + '.hivenues-publication-new')
    )),
    true,
  );
  assert.equal(
    calls.some(([command, args]) => command === '/usr/sbin/nft' && args[0] === '-c'),
    true,
  );
  assert.deepEqual(
    calls.filter(([command, args]) => command === '/usr/bin/systemctl' && args[0] === 'restart')
      .map(([, args]) => args[1]),
    ['hivenues-firewall.service', 'hivenues-caddy.service'],
  );
  const stored = JSON.parse(fs.readFileSync(f.paths.status, 'utf8'));
  assert.equal(stored.hostname, 'dev.fourthstreetbar.com');
  assert.match(stored.caddyConfigSha256, /^[a-f0-9]{64}$/);
  assert.match(stored.firewallPolicySha256, /^[a-f0-9]{64}$/);
});

test('Era 7 Stage 4B: activation failure restores the prior HiVenues-owned configuration', (t) => {
  const f = fixture(t);
  let failed = false;
  const execFile = (command, args) => {
    if (
      !failed
      && command === '/usr/bin/systemctl'
      && args[0] === 'restart'
      && args[1] === 'hivenues-caddy.service'
    ) {
      failed = true;
      throw new Error('synthetic caddy restart failure');
    }
    return '';
  };

  assert.throws(
    () => applyPublication({
      metadata: metadata(),
      hostname: 'dev.fourthstreetbar.com',
      paths: f.paths,
      execFile,
    }),
    (error) => error.code === 'PUBLICATION_ACTIVATION_FAILED',
  );
  assert.equal(fs.readFileSync(f.paths.caddyConfig, 'utf8'), 'old-caddy\n');
  assert.equal(fs.readFileSync(f.paths.firewallPolicy, 'utf8'), 'old-firewall\n');
  assert.equal(fs.existsSync(f.paths.status), false);
});

test('Era 7 Stage 4B: status detects managed-config drift without exposing arbitrary file content', (t) => {
  const f = fixture(t);
  applyPublication({
    metadata: metadata(),
    hostname: 'dev.fourthstreetbar.com',
    paths: f.paths,
    execFile: () => '',
    now: () => Date.parse('2026-10-03T17:30:00.000Z'),
  });

  fs.appendFileSync(f.paths.caddyConfig, '# drift\n', 'utf8');
  const result = publicationStatus({
    metadata: metadata(),
    paths: f.paths,
  });
  assert.equal(result.state, 'drifted');
  assert.equal(result.reason, 'managed-config-drift');
  assert.equal(Object.hasOwn(result, 'content'), false);
});
