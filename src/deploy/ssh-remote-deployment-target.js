'use strict';

const path = require('node:path');

const { renderBootstrapArtifacts } = require('./bootstrap-config');
const { loadRuntimeProvenance } = require('./public-runtime');
const { loadReleasePackage } = require('./release-store');
const {
  Ssh2PinnedMutationTransport,
  shellQuote,
} = require('./ssh2-mutation-transport');

function targetError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function readRuntime(root) {
  const absolute = path.resolve(root);
  return loadRuntimeProvenance(
    path.join(absolute, 'runtime-provenance.json'),
    path.join(absolute, 'runtime-manifest.json'),
  );
}

function requirePublicKey(value) {
  const key = String(value || '').trim();
  const parts = key.split(/\s+/);
  if (
    parts.length < 2
    || parts[0] !== 'ssh-rsa'
    || !/^[A-Za-z0-9+/=]+$/.test(parts[1])
  ) {
    throw targetError(
      'DEPLOYMENT_AUTHORITY_PUBLIC_KEY_INVALID',
      'Deployment authority public key is invalid.',
    );
  }
  return Object.freeze({
    full: key,
    identity: parts[0] + ' ' + parts[1],
  });
}

function serviceName(plan) {
  return 'hivenues-' + plan.release.hostSlug + '.service';
}

function stagePath(kind, digest) {
  if (!/^[a-f0-9]{64}$/.test(String(digest || ''))) {
    throw targetError('DEPLOYMENT_STAGE_DIGEST_INVALID', 'Deployment staging digest is invalid.');
  }
  if (!['runtime', 'release'].includes(kind)) {
    throw targetError('DEPLOYMENT_STAGE_KIND_INVALID', 'Deployment staging kind is invalid.');
  }
  return '/var/tmp/hivenues-' + kind + '-' + digest.slice(0, 24);
}

function initialBootstrapCommand(plan, runtime, release, publicKey) {
  const node = plan.nodeDistribution;
  const lines = [
    'set -eu',
    'test "$(id -u)" = "0"',
    'export DEBIAN_FRONTEND=noninteractive',
    'apt-get update',
    'apt-get install -y --no-install-recommends ca-certificates curl xz-utils gnupg debian-keyring debian-archive-keyring apt-transport-https nftables sudo',
    'if ! command -v caddy >/dev/null 2>&1; then',
    "  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg",
    "  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' -o /etc/apt/sources.list.d/caddy-stable.list",
    '  chmod o+r /usr/share/keyrings/caddy-stable-archive-keyring.gpg /etc/apt/sources.list.d/caddy-stable.list',
    '  apt-get update',
    '  apt-get install -y --no-install-recommends caddy',
    'fi',
    'systemctl disable --now caddy >/dev/null 2>&1 || true',
    'getent group hivenues >/dev/null 2>&1 || groupadd --system hivenues',
    'id -u hivenues >/dev/null 2>&1 || useradd --system --gid hivenues --no-create-home --home-dir /nonexistent --shell /usr/sbin/nologin hivenues',
    'id -u hivenues-deploy >/dev/null 2>&1 || useradd --system --gid hivenues --create-home --home-dir /var/lib/hivenues-deploy --shell /bin/bash hivenues-deploy',
    'install -d -m 0755 -o root -g root /opt/hivenues /opt/hivenues/node /srv/hivenues /etc/hivenues',
    'install -d -m 0750 -o hivenues-deploy -g hivenues /opt/hivenues/runtime /srv/hivenues/releases',
    'install -d -m 0750 -o hivenues -g hivenues ' + shellQuote(plan.paths.stateRoot),
    'if [ ! -x ' + shellQuote(node.nodePath) + ' ]; then',
    '  tmp="$(mktemp /var/tmp/hivenues-node.XXXXXX)"',
    '  curl -fsSL --proto "=https" --tlsv1.2 ' + shellQuote(node.url) + ' -o "$tmp"',
    '  printf "%s  %s\\n" ' + shellQuote(node.sha256) + ' "$tmp" | sha256sum -c -',
    '  rm -rf -- ' + shellQuote(node.installRoot),
    '  tar -xJf "$tmp" -C /opt/hivenues/node',
    '  mv -- ' + shellQuote('/opt/hivenues/node/node-v24.19.0-linux-x64') + ' ' + shellQuote(node.installRoot),
    '  rm -f -- "$tmp"',
    'fi',
    'test "$(' + shellQuote(node.nodePath) + ' --version)" = ' + shellQuote(node.version),
    'test "$(' + shellQuote(node.npmPath) + ' --version)" = ' + shellQuote(node.npmVersion),
  ];

  if (runtime.stagingPath) {
    lines.push(
      'if [ ! -d ' + shellQuote(runtime.path) + ' ]; then mv -- '
        + shellQuote(runtime.stagingPath) + ' ' + shellQuote(runtime.path)
        + '; else rm -rf -- ' + shellQuote(runtime.stagingPath) + '; fi',
    );
  }
  lines.push(
    'chown -R hivenues-deploy:hivenues -- ' + shellQuote(runtime.path),
    'runuser -u hivenues-deploy -- env HOME=/var/lib/hivenues-deploy '
      + shellQuote(node.npmPath)
      + ' --prefix ' + shellQuote(runtime.path)
      + ' ci --omit=dev --ignore-scripts --no-audit --no-fund',
  );

  if (release.stagingPath) {
    lines.push(
      'if [ ! -d ' + shellQuote(release.path) + ' ]; then mv -- '
        + shellQuote(release.stagingPath) + ' ' + shellQuote(release.path)
        + '; else rm -rf -- ' + shellQuote(release.stagingPath) + '; fi',
    );
  }
  lines.push(
    'chown -R hivenues-deploy:hivenues -- ' + shellQuote(release.path),
    'install -d -m 0700 -o hivenues-deploy -g hivenues /var/lib/hivenues-deploy/.ssh',
    'printf "%s\\n" ' + shellQuote(publicKey.full)
      + ' > /var/lib/hivenues-deploy/.ssh/authorized_keys',
    'chown hivenues-deploy:hivenues /var/lib/hivenues-deploy/.ssh/authorized_keys',
    'chmod 0600 /var/lib/hivenues-deploy/.ssh/authorized_keys',
  );

  return lines.join('\n') + '\n';
}

function steadyInstallCommand(plan, runtime, release) {
  const lines = ['set -eu', 'test "$(id -un)" = ' + shellQuote(plan.deploymentUser)];
  if (runtime.stagingPath) {
    lines.push(
      'if [ ! -d ' + shellQuote(runtime.path) + ' ]; then mv -- '
        + shellQuote(runtime.stagingPath) + ' ' + shellQuote(runtime.path)
        + '; else rm -rf -- ' + shellQuote(runtime.stagingPath) + '; fi',
    );
  }
  lines.push(
    'cd -- ' + shellQuote(runtime.path),
    'HOME=/var/lib/hivenues-deploy ' + shellQuote(plan.nodeDistribution.npmPath)
      + ' ci --omit=dev --ignore-scripts --no-audit --no-fund',
  );
  if (release.stagingPath) {
    lines.push(
      'if [ ! -d ' + shellQuote(release.path) + ' ]; then mv -- '
        + shellQuote(release.stagingPath) + ' ' + shellQuote(release.path)
        + '; else rm -rf -- ' + shellQuote(release.stagingPath) + '; fi',
    );
  }
  return lines.join('\n') + '\n';
}

function activationCommand(plan, runtimePath, releasePath, {
  restricted = false,
} = {}) {
  const service = serviceName(plan);
  const lines = [
    'set -eu',
    restricted
      ? 'test "$(id -un)" = ' + shellQuote(plan.deploymentUser)
      : 'test "$(id -u)" = "0"',
    'ln -sfn -- ' + shellQuote(runtimePath) + ' ' + shellQuote(plan.paths.runtimeCurrent + '.next'),
    'mv -Tf -- ' + shellQuote(plan.paths.runtimeCurrent + '.next') + ' ' + shellQuote(plan.paths.runtimeCurrent),
    'ln -sfn -- ' + shellQuote(releasePath) + ' ' + shellQuote(plan.paths.releaseCurrent + '.next'),
    'mv -Tf -- ' + shellQuote(plan.paths.releaseCurrent + '.next') + ' ' + shellQuote(plan.paths.releaseCurrent),
  ];

  if (restricted) {
    lines.push('sudo -n /usr/bin/systemctl restart ' + shellQuote(service));
  } else {
    lines.push(
      'systemctl daemon-reload',
      '/usr/bin/caddy validate --config ' + shellQuote(plan.paths.caddyConfig) + ' --adapter caddyfile',
      '/usr/sbin/nft -c -f ' + shellQuote(plan.paths.firewallPolicy),
      '/usr/sbin/visudo -cf ' + shellQuote(plan.paths.sudoersFile),
      'systemctl enable --now hivenues-firewall.service',
      'systemctl enable --now hivenues-caddy.service',
      'systemctl enable --now ' + shellQuote(service),
    );
  }

  lines.push(
    'for attempt in $(seq 1 30); do',
    '  if curl -fsS --max-time 2 http://127.0.0.1:' + plan.runtimePort + '/__hivenues/health >/dev/null; then break; fi',
    '  sleep 1',
    'done',
    'curl -fsS --max-time 3 http://127.0.0.1:' + plan.runtimePort + '/__hivenues/health >/dev/null',
  );
  return lines.join('\n') + '\n';
}

function authorityStateCommand(plan, value) {
  return [
    'set -eu',
    'printf "%s\\n" ' + shellQuote(value) + ' > ' + shellQuote(plan.paths.stateRoot + '/authority-state'),
    'chown hivenues:hivenues -- ' + shellQuote(plan.paths.stateRoot + '/authority-state'),
    'chmod 0640 -- ' + shellQuote(plan.paths.stateRoot + '/authority-state'),
  ].join('\n') + '\n';
}

function removeBootstrapKeyCommand(plan, publicKey) {
  const initial = plan.privilegeModel.initialRemoteAccount;
  return [
    'set -eu',
    'test "$(id -u)" = "0"',
    'home="$(getent passwd ' + shellQuote(initial) + ' | cut -d: -f6)"',
    'test -n "$home"',
    'auth="$home/.ssh/authorized_keys"',
    'if [ -f "$auth" ]; then',
    '  tmp="$(mktemp "$home/.ssh/.hivenues-authorized-keys.XXXXXX")"',
    '  awk -v key=' + shellQuote(publicKey.identity)
      + ' \'index($0, key) == 0 { print }\' "$auth" > "$tmp"',
    '  chown --reference="$auth" "$tmp"',
    '  chmod 0600 "$tmp"',
    '  mv -f -- "$tmp" "$auth"',
    'fi',
    authorityStateCommand(plan, 'restricted-deployment-user').trimEnd(),
  ].join('\n') + '\n';
}

async function writeRootFile(session, filePath, content, mode) {
  const temporary = filePath + '.hivenues-new';
  await session.exec([
    'set -eu',
    'umask 077',
    'cat > ' + shellQuote(temporary),
    'chown root:root -- ' + shellQuote(temporary),
    'chmod ' + mode + ' -- ' + shellQuote(temporary),
    'mv -f -- ' + shellQuote(temporary) + ' ' + shellQuote(filePath),
  ].join('\n') + '\n', {
    stdin: Buffer.from(content, 'utf8'),
  });
}

class SshRemoteDeploymentTarget {
  constructor({
    authorityStore,
    authorityId,
    target,
    expectedHostKeyFingerprint,
    hostSlug,
    transport = new Ssh2PinnedMutationTransport(),
  } = {}) {
    if (!authorityStore || typeof authorityStore.withPrivateKey !== 'function') {
      throw new TypeError('Remote deployment target requires an authority store.');
    }
    if (!authorityId) throw new TypeError('Remote deployment target requires authorityId.');
    if (!target || !target.host || !target.username) {
      throw new TypeError('Remote deployment target requires public connection facts.');
    }
    if (!hostSlug) throw new TypeError('Remote deployment target requires hostSlug.');
    if (!transport || typeof transport.withSession !== 'function') {
      throw new TypeError('Remote deployment target requires an SSH mutation transport.');
    }

    this.authorityStore = authorityStore;
    this.authorityId = authorityId;
    this.connection = {
      host: String(target.host),
      port: Number(target.port || 22),
      username: String(target.username),
    };
    this.initialUsername = this.connection.username;
    this.expectedHostKeyFingerprint = String(expectedHostKeyFingerprint || '');
    this.hostSlug = String(hostSlug);
    this.transport = transport;
    this.publicKey = requirePublicKey(authorityStore.publicRecord(authorityId).publicKey);
    this.narrowingPending = false;
    this.lastPlan = null;
  }

  async withSession(username, action) {
    return this.authorityStore.withPrivateKey(this.authorityId, (privateKey) => (
      this.transport.withSession({
        target: {
          host: this.connection.host,
          port: this.connection.port,
          username,
        },
        expectedHostKeyFingerprint: this.expectedHostKeyFingerprint,
        privateKey,
      }, action)
    ));
  }

  async stageTree(kind, localRoot, digest, finalPath) {
    const stagingPath = stagePath(kind, digest);
    const exists = await this.withSession(this.connection.username, async (session) => {
      const result = await session.exec(
        'if [ -d ' + shellQuote(finalPath) + ' ]; then printf "yes"; else printf "no"; fi',
      );
      return result.stdout.trim() === 'yes';
    });
    if (exists) {
      return Object.freeze({ reused: true, stagingPath: null, path: finalPath });
    }

    await this.withSession(this.connection.username, async (session) => {
      await session.exec('rm -rf -- ' + shellQuote(stagingPath));
      await session.uploadTree(localRoot, stagingPath);
    });
    return Object.freeze({ reused: false, stagingPath, path: finalPath });
  }

  async installRuntime(runtimeRoot) {
    const provenance = readRuntime(runtimeRoot);
    const finalPath = '/opt/hivenues/runtime/' + provenance.bundleDigest;
    const staged = await this.stageTree(
      'runtime',
      runtimeRoot,
      provenance.bundleDigest,
      finalPath,
    );
    return Object.freeze({
      ...staged,
      provenance,
    });
  }

  async installRelease(packageRoot) {
    const release = loadReleasePackage(path.resolve(packageRoot));
    const manifest = release.manifest;
    const finalPath = '/srv/hivenues/releases/'
      + manifest.releaseId + '-' + manifest.releaseDigest.slice(0, 12);
    const staged = await this.stageTree(
      'release',
      packageRoot,
      manifest.packageDigest,
      finalPath,
    );
    return Object.freeze({
      ...staged,
      manifest,
    });
  }

  async activate({
    runtime,
    release,
    plan,
  }) {
    if (!runtime?.provenance || !release?.manifest || !plan) {
      throw targetError(
        'DEPLOYMENT_REMOTE_ACTIVATION_INVALID',
        'Remote deployment activation inputs are invalid.',
      );
    }
    this.lastPlan = plan;

    if (this.connection.username === plan.deploymentUser) {
      await this.withSession(plan.deploymentUser, async (session) => {
        await session.exec(steadyInstallCommand(plan, runtime, release), {
          timeoutMs: 120000,
        });
        await session.exec(
          activationCommand(plan, runtime.path, release.path, { restricted: true }),
          { timeoutMs: 60000 },
        );
      });
      return Object.freeze({
        authorityState: 'restricted-deployment-user',
        deploymentUser: plan.deploymentUser,
      });
    }

    if (this.connection.username !== plan.privilegeModel.initialRemoteAccount) {
      throw targetError(
        'DEPLOYMENT_BOOTSTRAP_ACCOUNT_MISMATCH',
        'Remote target account does not match the bootstrap plan.',
      );
    }

    const artifacts = renderBootstrapArtifacts(plan, {
      sshPort: this.connection.port,
    });

    await this.withSession(this.initialUsername, async (session) => {
      await session.exec(
        initialBootstrapCommand(plan, runtime, release, this.publicKey),
        { timeoutMs: 240000 },
      );
      await writeRootFile(session, plan.paths.environmentFile, artifacts.environment, '0600');
      await writeRootFile(session, plan.paths.serviceUnit, artifacts.systemdUnit, '0644');
      await writeRootFile(session, plan.paths.caddyConfig, artifacts.caddyHttpConfig, '0644');
      await writeRootFile(session, plan.paths.caddyService, artifacts.caddySystemdUnit, '0644');
      await writeRootFile(session, plan.paths.firewallPolicy, artifacts.nftablesPolicy, '0600');
      await writeRootFile(session, plan.paths.firewallService, artifacts.firewallSystemdUnit, '0644');
      await writeRootFile(session, plan.paths.sudoersFile, artifacts.restrictedSudoers, '0440');
      await session.exec(authorityStateCommand(plan, 'restricted-login-pending'));
      await session.exec(
        activationCommand(plan, runtime.path, release.path, { restricted: false }),
        { timeoutMs: 90000 },
      );
    });

    await this.withSession(plan.deploymentUser, async (session) => {
      const identity = await session.exec('id -un');
      if (identity.stdout.trim() !== plan.deploymentUser) {
        throw targetError(
          'DEPLOYMENT_RESTRICTED_LOGIN_FAILED',
          'Restricted deployment account identity could not be proven.',
        );
      }
      await session.exec(
        'sudo -n /usr/bin/systemctl status ' + shellQuote(serviceName(plan)),
        { timeoutMs: 15000 },
      );
    });

    await this.withSession(this.initialUsername, (session) => (
      session.exec(authorityStateCommand(plan, 'restricted-login-proven'))
    ));

    this.connection.username = plan.deploymentUser;
    this.narrowingPending = true;
    return Object.freeze({
      authorityState: 'restricted-login-proven',
      deploymentUser: plan.deploymentUser,
    });
  }

  async finalizeAuthorityNarrowing(plan = this.lastPlan) {
    if (!plan || !this.narrowingPending) return false;
    await this.withSession(this.initialUsername, (session) => (
      session.exec(removeBootstrapKeyCommand(plan, this.publicKey))
    ));
    this.narrowingPending = false;
    return true;
  }

  async readBack() {
    const plan = this.lastPlan;
    const port = plan?.runtimePort || 4317;
    const stateRoot = plan?.paths?.stateRoot || '/var/lib/hivenues/' + this.hostSlug;
    const command = [
      'set -eu',
      'health="$(curl -fsS --max-time 3 http://127.0.0.1:' + port + '/__hivenues/health 2>/dev/null || true)"',
      'if [ -z "$health" ]; then exit 0; fi',
      'printf "%s\\n" "$health"',
      'cat ' + shellQuote(stateRoot + '/authority-state') + ' 2>/dev/null || printf "bootstrap-admin\\n"',
    ].join('\n') + '\n';

    let result;
    try {
      result = await this.withSession(this.connection.username, (session) => (
        session.exec(command, { timeoutMs: 10000 })
      ));
    } catch (error) {
      if (
        error?.code === 'DEPLOYMENT_SSH_AUTH_FAILED'
        || error?.code === 'DEPLOYMENT_REMOTE_COMMAND_FAILED'
      ) {
        return null;
      }
      throw error;
    }

    const lines = result.stdout.trim().split(/\r?\n/);
    if (!lines[0]) return null;
    let health;
    try {
      health = JSON.parse(lines[0]);
    } catch {
      throw targetError(
        'DEPLOYMENT_REMOTE_READBACK_INVALID',
        'Remote health read-back was not valid JSON.',
      );
    }
    const authorityState = String(lines[1] || 'bootstrap-admin').trim();
    return Object.freeze({
      status: health.status,
      runtime: Object.freeze({ ...health.runtime }),
      deployment: Object.freeze({ ...health.deployment }),
      bootstrap: Object.freeze({
        profile: plan?.profile || 'debian-systemd-caddy-v1',
        runtimeUser: plan?.runtimeUser || 'hivenues',
        deploymentUser: plan?.deploymentUser || 'hivenues-deploy',
        runtimePort: port,
        authorityState,
      }),
    });
  }
}

module.exports = {
  SshRemoteDeploymentTarget,
  activationCommand,
  initialBootstrapCommand,
  removeBootstrapKeyCommand,
  steadyInstallCommand,
  writeRootFile,
};
