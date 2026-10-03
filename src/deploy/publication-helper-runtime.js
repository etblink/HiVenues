#!/opt/hivenues/node/v24.19.0/bin/node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const HELPER_PREFIX = 'hivenues-publication-';

function helperError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function requireSlug(value) {
  const slug = String(value || '').trim();
  if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(slug)) {
    throw helperError('PUBLICATION_HOST_SLUG_INVALID', 'Publication host slug is invalid.');
  }
  return slug;
}

function requirePort(value, label) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw helperError('PUBLICATION_METADATA_INVALID', label + ' port is invalid.');
  }
  return port;
}

function normalizePublicationHostname(value) {
  const raw = String(value || '').trim().toLowerCase().replace(/\.$/, '');
  if (!raw || raw.length > 253 || raw.includes('://') || /[\s/:?#@]/.test(raw)) {
    throw helperError('PUBLICATION_HOSTNAME_INVALID', 'Publication hostname is invalid.');
  }
  const labels = raw.split('.');
  if (labels.length < 2 || labels.some((label) => (
    !label
    || label.length > 63
    || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)
  ))) {
    throw helperError('PUBLICATION_HOSTNAME_INVALID', 'Publication hostname is invalid.');
  }
  return raw;
}

function canonicalPublicationPaths(hostSlug) {
  const slug = requireSlug(hostSlug);
  return Object.freeze({
    caddyConfig: '/etc/hivenues/' + slug + '.caddy',
    firewallPolicy: '/etc/hivenues/' + slug + '.nft',
    metadata: '/etc/hivenues/' + slug + '.publication.json',
    stateRoot: '/var/lib/hivenues-publication/' + slug,
    status: '/var/lib/hivenues-publication/' + slug + '/status.json',
    caddyStateRoot: '/var/lib/hivenues-caddy/' + slug,
    helper: '/usr/local/libexec/' + HELPER_PREFIX + slug,
    caddyService: 'hivenues-caddy.service',
    firewallService: 'hivenues-firewall.service',
  });
}

function requirePublicationMetadata(value, expectedSlug = '') {
  const record = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const keys = Object.keys(record).sort();
  const expectedKeys = ['hostSlug', 'runtimePort', 'sshPort', 'version'];
  if (
    keys.length !== expectedKeys.length
    || keys.some((key, index) => key !== expectedKeys[index])
    || record.version !== 1
  ) {
    throw helperError('PUBLICATION_METADATA_INVALID', 'Publication metadata is invalid.');
  }
  const hostSlug = requireSlug(record.hostSlug);
  if (expectedSlug && hostSlug !== requireSlug(expectedSlug)) {
    throw helperError('PUBLICATION_METADATA_INVALID', 'Publication metadata host does not match helper identity.');
  }
  return Object.freeze({
    version: 1,
    hostSlug,
    runtimePort: requirePort(record.runtimePort, 'Runtime'),
    sshPort: requirePort(record.sshPort, 'SSH'),
  });
}

function renderPublicationCaddyConfig({ hostname, runtimePort } = {}) {
  const host = normalizePublicationHostname(hostname);
  const port = requirePort(runtimePort, 'Runtime');
  return [
    '{',
    '  admin off',
    '}',
    '',
    host + ' {',
    '  encode zstd gzip',
    '  reverse_proxy 127.0.0.1:' + port,
    '  header {',
    '    -Server',
    '    X-Content-Type-Options nosniff',
    '    X-Frame-Options DENY',
    '    Referrer-Policy no-referrer',
    '  }',
    '}',
    '',
  ].join('\n');
}

function requireTableName(value) {
  const name = String(value || '').trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]{0,47}$/.test(name)) {
    throw helperError('PUBLICATION_FIREWALL_TABLE_INVALID', 'Publication firewall table name is invalid.');
  }
  return name;
}

function renderPublicationNftablesPolicy({
  sshPort = 22,
  tableName = 'hivenues',
} = {}) {
  const port = requirePort(sshPort, 'SSH');
  const table = requireTableName(tableName);
  return [
    'table inet ' + table + ' {',
    '  chain input {',
    '    type filter hook input priority 0; policy drop;',
    '    ct state established,related accept',
    '    iifname "lo" accept',
    '    ip protocol icmp accept',
    '    ip6 nexthdr ipv6-icmp accept',
    '    tcp dport ' + port + ' accept comment "HiVenues deployment SSH"',
    '    tcp dport 80 accept comment "HiVenues HTTP and ACME"',
    '    tcp dport 443 accept comment "HiVenues HTTPS"',
    '  }',
    '}',
    '',
  ].join('\n');
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function readRegularFile(filePath, io = fs) {
  let stat;
  try {
    stat = io.lstatSync(filePath);
  } catch {
    throw helperError('PUBLICATION_BASELINE_MISSING', 'Required HiVenues publication baseline is missing.');
  }
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw helperError('PUBLICATION_PATH_UNSAFE', 'HiVenues publication path is not a regular file.');
  }
  return io.readFileSync(filePath);
}

function writeCandidate(filePath, content, mode, io = fs) {
  const temporary = filePath + '.hivenues-publication-new';
  try { io.rmSync(temporary, { force: true }); } catch {}
  const descriptor = io.openSync(temporary, 'wx', mode);
  try {
    io.writeFileSync(descriptor, content, 'utf8');
    io.fsyncSync(descriptor);
  } finally {
    io.closeSync(descriptor);
  }
  io.chmodSync(temporary, mode);
  return temporary;
}

function atomicRestore(filePath, content, mode, io = fs) {
  const temporary = filePath + '.hivenues-publication-restore';
  try { io.rmSync(temporary, { force: true }); } catch {}
  const descriptor = io.openSync(temporary, 'wx', mode);
  try {
    io.writeFileSync(descriptor, content);
    io.fsyncSync(descriptor);
  } finally {
    io.closeSync(descriptor);
  }
  io.chmodSync(temporary, mode);
  io.renameSync(temporary, filePath);
}

function command(execFile, executable, args) {
  return execFile(executable, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function statusRecordValid(value, metadata) {
  return Boolean(
    value
    && value.version === 1
    && value.hostSlug === metadata.hostSlug
    && normalizePublicationHostname(value.hostname) === value.hostname
    && /^[a-f0-9]{64}$/.test(String(value.caddyConfigSha256 || ''))
    && /^[a-f0-9]{64}$/.test(String(value.firewallPolicySha256 || ''))
    && Number.isFinite(Date.parse(String(value.appliedAt || '')))
  );
}

function publicationStatus({
  metadata,
  paths = canonicalPublicationPaths(metadata?.hostSlug),
  io = fs,
  execFile = null,
} = {}) {
  const accepted = requirePublicationMetadata(metadata);
  if (!io.existsSync(paths.status)) {
    return Object.freeze({
      version: 1,
      capability: 'ready',
      state: 'unconfigured',
      hostSlug: accepted.hostSlug,
    });
  }

  let stored;
  try {
    stored = JSON.parse(io.readFileSync(paths.status, 'utf8'));
  } catch {
    return Object.freeze({
      version: 1,
      capability: 'ready',
      state: 'drifted',
      hostSlug: accepted.hostSlug,
      reason: 'status-unreadable',
    });
  }

  try {
    if (!statusRecordValid(stored, accepted)) {
      throw helperError('PUBLICATION_STATUS_INVALID', 'Publication status is invalid.');
    }
  } catch {
    return Object.freeze({
      version: 1,
      capability: 'ready',
      state: 'drifted',
      hostSlug: accepted.hostSlug,
      reason: 'status-invalid',
    });
  }

  let caddy;
  let firewall;
  try {
    caddy = readRegularFile(paths.caddyConfig, io);
    firewall = readRegularFile(paths.firewallPolicy, io);
  } catch {
    return Object.freeze({
      version: 1,
      capability: 'ready',
      state: 'drifted',
      hostSlug: accepted.hostSlug,
      hostname: stored.hostname,
      reason: 'managed-config-missing',
    });
  }

  const caddyDigest = sha256(caddy);
  const firewallDigest = sha256(firewall);
  const intact = (
    caddyDigest === stored.caddyConfigSha256
    && firewallDigest === stored.firewallPolicySha256
  );
  let servicesActive = null;
  if (intact && execFile) {
    try {
      command(execFile, '/usr/bin/systemctl', ['is-active', '--quiet', paths.firewallService]);
      command(execFile, '/usr/bin/systemctl', ['is-active', '--quiet', paths.caddyService]);
      servicesActive = true;
    } catch {
      servicesActive = false;
    }
  }
  const active = intact && servicesActive !== false;
  return Object.freeze({
    version: 1,
    capability: 'ready',
    state: active ? 'configured' : 'drifted',
    hostSlug: accepted.hostSlug,
    hostname: stored.hostname,
    appliedAt: stored.appliedAt,
    caddyConfigSha256: caddyDigest,
    firewallPolicySha256: firewallDigest,
    ...(servicesActive === null ? {} : { servicesActive }),
    ...(
      !intact
        ? { reason: 'managed-config-drift' }
        : (servicesActive === false ? { reason: 'managed-service-inactive' } : {})
    ),
  });
}

function readKernelText(filePath) {
  try {
    return String(fs.readFileSync(filePath, 'utf8')).trim();
  } catch {
    return '';
  }
}

function processStartTicks(pid) {
  const value = readKernelText('/proc/' + String(pid) + '/stat');
  if (!value) return '';
  const close = value.lastIndexOf(')');
  if (close < 0) return '';
  const fields = value.slice(close + 1).trim().split(/\s+/);
  return fields[19] || '';
}

function lockOwnerRecord() {
  return Object.freeze({
    version: 1,
    pid: process.pid,
    bootId: readKernelText('/proc/sys/kernel/random/boot_id'),
    processStartTicks: processStartTicks(process.pid),
  });
}

function lockOwnerAlive(record) {
  const pid = Number(record?.pid);
  if (!Number.isInteger(pid) || pid < 1) return false;

  const currentBootId = readKernelText('/proc/sys/kernel/random/boot_id');
  if (record.bootId && currentBootId && record.bootId !== currentBootId) return false;

  const currentStartTicks = processStartTicks(pid);
  if (record.processStartTicks && currentStartTicks) {
    return String(record.processStartTicks) === currentStartTicks;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code !== 'ESRCH';
  }
}

function staleLock(lockPath, io = fs) {
  try {
    const record = JSON.parse(io.readFileSync(lockPath, 'utf8'));
    if (record?.version === 1 && Number.isInteger(Number(record.pid))) {
      return !lockOwnerAlive(record);
    }
  } catch {}

  try {
    const stat = io.statSync(lockPath);
    return Date.now() - Number(stat.mtimeMs || 0) > 30000;
  } catch {
    return true;
  }
}

function acquireLock(paths, io = fs) {
  io.mkdirSync(paths.stateRoot, { recursive: true, mode: 0o700 });
  const lockPath = path.join(paths.stateRoot, 'apply.lock');

  for (let attempt = 0; attempt < 3; attempt += 1) {
    let descriptor;
    try {
      descriptor = io.openSync(lockPath, 'wx', 0o600);
      const owner = Buffer.from(JSON.stringify(lockOwnerRecord()) + '\n', 'utf8');
      io.writeFileSync(descriptor, owner);
      io.fsyncSync(descriptor);
      return Object.freeze({ descriptor, lockPath });
    } catch (error) {
      if (descriptor !== undefined) {
        try { io.closeSync(descriptor); } catch {}
        try { io.unlinkSync(lockPath); } catch {}
      }
      if (error?.code !== 'EEXIST') throw error;
      if (!staleLock(lockPath, io)) {
        throw helperError('PUBLICATION_APPLY_BUSY', 'Another HiVenues publication operation is in progress.');
      }
      try {
        io.unlinkSync(lockPath);
      } catch (unlinkError) {
        if (unlinkError?.code !== 'ENOENT') {
          throw helperError(
            'PUBLICATION_APPLY_BUSY',
            'Another HiVenues publication operation is in progress.',
          );
        }
      }
    }
  }

  throw helperError('PUBLICATION_APPLY_BUSY', 'Another HiVenues publication operation is in progress.');
}

function releaseLock(lock, io = fs) {
  try { io.closeSync(lock.descriptor); } finally {
    try { io.unlinkSync(lock.lockPath); } catch {}
  }
}

function applyPublication({
  metadata,
  hostname,
  paths = canonicalPublicationPaths(metadata?.hostSlug),
  io = fs,
  execFile = execFileSync,
  now = Date.now,
} = {}) {
  const accepted = requirePublicationMetadata(metadata);
  const host = normalizePublicationHostname(hostname);
  const lock = acquireLock(paths, io);
  const caddyCandidate = paths.caddyConfig + '.hivenues-publication-new';
  const firewallCandidate = paths.firewallPolicy + '.hivenues-publication-new';
  const firewallCheck = paths.firewallPolicy + '.hivenues-publication-check';

  try {
    const priorCaddy = readRegularFile(paths.caddyConfig, io);
    const priorFirewall = readRegularFile(paths.firewallPolicy, io);
    const priorStatus = io.existsSync(paths.status)
      ? readRegularFile(paths.status, io)
      : null;
    const caddy = renderPublicationCaddyConfig({
      hostname: host,
      runtimePort: accepted.runtimePort,
    });
    const firewall = renderPublicationNftablesPolicy({
      sshPort: accepted.sshPort,
      tableName: 'hivenues',
    });
    const firewallValidation = renderPublicationNftablesPolicy({
      sshPort: accepted.sshPort,
      tableName: 'hivenues_stage4_check',
    });

    writeCandidate(paths.caddyConfig, caddy, 0o644, io);
    try { io.rmSync(firewallCheck, { force: true }); } catch {}
    const checkDescriptor = io.openSync(firewallCheck, 'wx', 0o600);
    try {
      io.writeFileSync(checkDescriptor, firewallValidation, 'utf8');
      io.fsyncSync(checkDescriptor);
    } finally {
      io.closeSync(checkDescriptor);
    }
    io.chmodSync(firewallCheck, 0o600);

    try {
      command(execFile, '/usr/bin/caddy', [
        'validate',
        '--config',
        caddyCandidate,
        '--adapter',
        'caddyfile',
      ]);
      command(execFile, '/usr/sbin/nft', ['-c', '-f', firewallCheck]);
    } catch {
      throw helperError(
        'PUBLICATION_VALIDATION_FAILED',
        'HiVenues publication candidate validation failed before activation.',
      );
    }

    writeCandidate(paths.firewallPolicy, firewall, 0o600, io);

    try {
      io.renameSync(caddyCandidate, paths.caddyConfig);
      io.renameSync(firewallCandidate, paths.firewallPolicy);
      command(execFile, '/usr/bin/systemctl', ['restart', paths.firewallService]);
      command(execFile, '/usr/bin/systemctl', ['restart', paths.caddyService]);
      command(execFile, '/usr/bin/systemctl', ['is-active', '--quiet', paths.firewallService]);
      command(execFile, '/usr/bin/systemctl', ['is-active', '--quiet', paths.caddyService]);

      const appliedAt = new Date(now()).toISOString();
      const status = {
        version: 1,
        hostSlug: accepted.hostSlug,
        hostname: host,
        appliedAt,
        caddyConfigSha256: sha256(Buffer.from(caddy, 'utf8')),
        firewallPolicySha256: sha256(Buffer.from(firewall, 'utf8')),
      };
      io.mkdirSync(paths.stateRoot, { recursive: true, mode: 0o700 });
      atomicRestore(
        paths.status,
        Buffer.from(JSON.stringify(status, null, 2) + '\n', 'utf8'),
        0o600,
        io,
      );
      const confirmed = publicationStatus({
        metadata: accepted,
        paths,
        io,
        execFile,
      });
      if (confirmed.state !== 'configured' || confirmed.hostname !== host) {
        throw helperError(
          'PUBLICATION_STATUS_CONFIRMATION_FAILED',
          'HiVenues publication status did not confirm the exact applied hostname.',
        );
      }
      return confirmed;
    } catch {
      atomicRestore(paths.caddyConfig, priorCaddy, 0o644, io);
      atomicRestore(paths.firewallPolicy, priorFirewall, 0o600, io);
      if (priorStatus) {
        atomicRestore(paths.status, priorStatus, 0o600, io);
      } else {
        try { io.rmSync(paths.status, { force: true }); } catch {}
      }
      try { command(execFile, '/usr/bin/systemctl', ['restart', paths.firewallService]); } catch {}
      try { command(execFile, '/usr/bin/systemctl', ['restart', paths.caddyService]); } catch {}
      throw helperError(
        'PUBLICATION_ACTIVATION_FAILED',
        'HiVenues publication activation failed and the prior managed configuration was restored.',
      );
    }
  } finally {
    try { io.rmSync(caddyCandidate, { force: true }); } catch {}
    try { io.rmSync(firewallCandidate, { force: true }); } catch {}
    try { io.rmSync(firewallCheck, { force: true }); } catch {}
    releaseLock(lock, io);
  }
}

function slugFromExecutable(executable) {
  const name = path.basename(String(executable || ''));
  if (!name.startsWith(HELPER_PREFIX)) {
    throw helperError('PUBLICATION_HELPER_IDENTITY_INVALID', 'Publication helper identity is invalid.');
  }
  return requireSlug(name.slice(HELPER_PREFIX.length));
}

function loadCanonicalMetadata(hostSlug, io = fs) {
  const paths = canonicalPublicationPaths(hostSlug);
  let record;
  try {
    record = JSON.parse(io.readFileSync(paths.metadata, 'utf8'));
  } catch {
    throw helperError('PUBLICATION_METADATA_UNREADABLE', 'Publication metadata could not be read.');
  }
  return Object.freeze({
    metadata: requirePublicationMetadata(record, hostSlug),
    paths,
  });
}

function runCli({
  argv = process.argv.slice(2),
  executable = process.argv[1],
  io = fs,
  execFile = execFileSync,
  now = Date.now,
} = {}) {
  const hostSlug = slugFromExecutable(executable);
  const loaded = loadCanonicalMetadata(hostSlug, io);
  let result;
  if (argv.length === 1 && argv[0] === 'status') {
    result = publicationStatus({ ...loaded, io, execFile });
  } else if (argv.length === 2 && argv[0] === 'apply') {
    result = applyPublication({
      ...loaded,
      hostname: argv[1],
      io,
      execFile,
      now,
    });
  } else {
    throw helperError(
      'PUBLICATION_COMMAND_INVALID',
      'Publication helper accepts only status or apply with one hostname.',
    );
  }
  process.stdout.write(JSON.stringify(result) + '\n');
  return result;
}

if (require.main === module) {
  try {
    runCli();
  } catch (error) {
    const code = /^[A-Z0-9_]+$/.test(String(error?.code || ''))
      ? error.code
      : 'PUBLICATION_HELPER_FAILED';
    process.stderr.write('HIVENUES_PUBLICATION_ERROR=' + code + '\n');
    process.exitCode = 1;
  }
}

module.exports = {
  applyPublication,
  canonicalPublicationPaths,
  normalizePublicationHostname,
  publicationStatus,
  renderPublicationCaddyConfig,
  renderPublicationNftablesPolicy,
  requirePublicationMetadata,
  runCli,
};
