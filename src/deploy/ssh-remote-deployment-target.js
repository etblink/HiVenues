'use strict';

const fs = require('node:fs');
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

async function withMutationStage(stage, action) {
  try {
    return await action();
  } catch (error) {
    if (error && typeof error === 'object' && !error.deploymentStage) {
      error.deploymentStage = stage;
    }
    throw error;
  }
}

function readRuntime(root) {
  const absolute = path.resolve(root);
  return loadRuntimeProvenance(
    path.join(absolute, 'runtime-provenance.json'),
    path.join(absolute, 'runtime-manifest.json'),
  );
}

function runtimeFileDigest(root, relativePath) {
  const absolute = path.resolve(root);
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(path.join(absolute, 'runtime-manifest.json'), 'utf8'));
  } catch {
    throw targetError(
      'DEPLOYMENT_RUNTIME_MANIFEST_UNREADABLE',
      'Qualified runtime manifest could not be read for privileged helper installation.',
    );
  }
  const file = Array.isArray(manifest?.files)
    ? manifest.files.find((item) => item?.path === relativePath)
    : null;
  if (!file || !/^[a-f0-9]{64}$/.test(String(file.sha256 || ''))) {
    throw targetError(
      'DEPLOYMENT_RUNTIME_HELPER_DIGEST_MISSING',
      'Qualified runtime does not contain an exact publication-helper digest.',
    );
  }
  return String(file.sha256);
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

function qualifiedNodePath(node) {
  return node.installRoot + '/bin:/usr/bin:/bin';
}

function initialBootstrapCommand(plan, runtime, release, publicKey) {
  const node = plan.nodeDistribution;
  const nodePath = qualifiedNodePath(node);
  const lines = [
    'set -eu',
    'printf "HIVENUES_MUTATION_STAGE=bootstrap-root\\n" >&2',
    'test "$(id -u)" = "0"',
    'export DEBIAN_FRONTEND=noninteractive',
    'printf "HIVENUES_MUTATION_STAGE=base-packages\\n" >&2',
    'apt-get update',
    'apt-get install -y --no-install-recommends ca-certificates curl xz-utils gnupg debian-keyring debian-archive-keyring apt-transport-https nftables sudo',
    'printf "HIVENUES_MUTATION_STAGE=caddy-install\\n" >&2',
    'if ! command -v caddy >/dev/null 2>&1; then',
    "  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg",
    "  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' -o /etc/apt/sources.list.d/caddy-stable.list",
    '  chmod o+r /usr/share/keyrings/caddy-stable-archive-keyring.gpg /etc/apt/sources.list.d/caddy-stable.list',
    '  apt-get update',
    '  apt-get install -y --no-install-recommends caddy',
    'fi',
    'printf "HIVENUES_MUTATION_STAGE=users-directories\\n" >&2',
    'systemctl disable --now caddy >/dev/null 2>&1 || true',
    'getent group hivenues >/dev/null 2>&1 || groupadd --system hivenues',
    'id -u hivenues >/dev/null 2>&1 || useradd --system --gid hivenues --no-create-home --home-dir /nonexistent --shell /usr/sbin/nologin hivenues',
    'id -u hivenues-deploy >/dev/null 2>&1 || useradd --system --gid hivenues --create-home --home-dir /var/lib/hivenues-deploy --shell /bin/bash hivenues-deploy',
    'install -d -m 0755 -o root -g root /opt/hivenues /opt/hivenues/node /srv/hivenues /etc/hivenues /usr/local/libexec /var/lib/hivenues-publication /var/lib/hivenues-caddy',
    'install -d -m 0750 -o hivenues-deploy -g hivenues /opt/hivenues/runtime /srv/hivenues/releases',
    'install -d -m 0750 -o hivenues -g hivenues ' + shellQuote(plan.paths.stateRoot),
    'install -d -m 0700 -o root -g root ' + shellQuote(plan.paths.publicationStateRoot),
    'install -d -m 0700 -o caddy -g caddy ' + shellQuote(plan.paths.caddyStateRoot)
      + ' ' + shellQuote(plan.paths.caddyStateRoot + '/data')
      + ' ' + shellQuote(plan.paths.caddyStateRoot + '/config'),
    'printf "HIVENUES_MUTATION_STAGE=node-runtime\\n" >&2',
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
    'test "$(env PATH=' + shellQuote(nodePath) + ' ' + shellQuote(node.npmPath)
      + ' --version)" = ' + shellQuote(node.npmVersion),
  ];

  lines.push('printf "HIVENUES_MUTATION_STAGE=runtime-dependencies\\n" >&2');
  if (runtime.stagingPath) {
    lines.push(
      'if [ ! -d ' + shellQuote(runtime.path) + ' ]; then mv -- '
        + shellQuote(runtime.stagingPath) + ' ' + shellQuote(runtime.path)
        + '; else rm -rf -- ' + shellQuote(runtime.stagingPath) + '; fi',
    );
  }
  lines.push(
    'test -f ' + shellQuote(runtime.path + '/src/deploy/publication-helper-runtime.js'),
    'printf "%s  %s\\n" ' + shellQuote(runtime.publicationHelperSha256)
      + ' ' + shellQuote(runtime.path + '/src/deploy/publication-helper-runtime.js')
      + ' | sha256sum -c -',
    'install -m 0755 -o root -g root -- '
      + shellQuote(runtime.path + '/src/deploy/publication-helper-runtime.js')
      + ' ' + shellQuote(plan.paths.publicationHelper),
    'chown -R hivenues-deploy:hivenues -- ' + shellQuote(runtime.path),
    'chmod -R g+rX,o-rwx -- ' + shellQuote(runtime.path),
    'runuser -u hivenues-deploy -- env HOME=/var/lib/hivenues-deploy PATH='
      + shellQuote(nodePath) + ' '
      + shellQuote(node.npmPath)
      + ' --prefix ' + shellQuote(runtime.path)
      + ' ci --omit=dev --ignore-scripts --no-audit --no-fund',
  );

  lines.push('printf "HIVENUES_MUTATION_STAGE=release-authority\\n" >&2');
  if (release.stagingPath) {
    lines.push(
      'if [ ! -d ' + shellQuote(release.path) + ' ]; then mv -- '
        + shellQuote(release.stagingPath) + ' ' + shellQuote(release.path)
        + '; else rm -rf -- ' + shellQuote(release.stagingPath) + '; fi',
    );
  }
  lines.push(
    'chown -R hivenues-deploy:hivenues -- ' + shellQuote(release.path),
    'chmod -R g+rX,o-rwx -- ' + shellQuote(release.path),
    'install -d -m 0700 -o hivenues-deploy -g hivenues /var/lib/hivenues-deploy/.ssh',
    'printf "%s\\n" ' + shellQuote(publicKey.full)
      + ' > /var/lib/hivenues-deploy/.ssh/authorized_keys',
    'chown hivenues-deploy:hivenues /var/lib/hivenues-deploy/.ssh/authorized_keys',
    'chmod 0600 /var/lib/hivenues-deploy/.ssh/authorized_keys',
  );

  return lines.join('\n') + '\n';
}

function steadyInstallCommand(plan, runtime, release) {
  const nodePath = qualifiedNodePath(plan.nodeDistribution);
  const lines = [
    'set -eu',
    'printf "HIVENUES_MUTATION_STAGE=steady-install\\n" >&2',
    'test "$(id -un)" = ' + shellQuote(plan.deploymentUser),
  ];
  if (runtime.stagingPath) {
    lines.push(
      'if [ ! -d ' + shellQuote(runtime.path) + ' ]; then mv -- '
        + shellQuote(runtime.stagingPath) + ' ' + shellQuote(runtime.path)
        + '; else rm -rf -- ' + shellQuote(runtime.stagingPath) + '; fi',
    );
  }
  lines.push(
    'chmod -R g+rX,o-rwx -- ' + shellQuote(runtime.path),
    'cd -- ' + shellQuote(runtime.path),
    'HOME=/var/lib/hivenues-deploy PATH=' + shellQuote(nodePath) + ' '
      + shellQuote(plan.nodeDistribution.npmPath)
      + ' ci --omit=dev --ignore-scripts --no-audit --no-fund',
  );
  if (release.stagingPath) {
    lines.push(
      'if [ ! -d ' + shellQuote(release.path) + ' ]; then mv -- '
        + shellQuote(release.stagingPath) + ' ' + shellQuote(release.path)
        + '; else rm -rf -- ' + shellQuote(release.stagingPath) + '; fi',
    );
  }
  lines.push('chmod -R g+rX,o-rwx -- ' + shellQuote(release.path));
  return lines.join('\n') + '\n';
}

function activationCommand(plan, runtimePath, releasePath, {
  restricted = false,
} = {}) {
  const service = serviceName(plan);
  const lines = [
    'set -eu',
    'printf "HIVENUES_MUTATION_STAGE=service-activation\\n" >&2',
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
      'test -x ' + shellQuote(plan.paths.publicationHelper),
      shellQuote(plan.paths.publicationHelper) + ' status >/dev/null',
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
    'printf "HIVENUES_MUTATION_STAGE=authority-state\\n" >&2',
    'printf "%s\\n" ' + shellQuote(value) + ' > ' + shellQuote(plan.paths.stateRoot + '/authority-state'),
    'chown hivenues:hivenues -- ' + shellQuote(plan.paths.stateRoot + '/authority-state'),
    'chmod 0640 -- ' + shellQuote(plan.paths.stateRoot + '/authority-state'),
  ].join('\n') + '\n';
}

function removeBootstrapKeyCommand(plan, publicKey) {
  const initial = plan.privilegeModel.initialRemoteAccount;
  return [
    'set -eu',
    'printf "HIVENUES_MUTATION_STAGE=authority-narrowing\\n" >&2',
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

function initialBootstrapUsesSudo(plan) {
  return plan?.privilegeModel?.initialRemoteAccount !== 'root';
}

async function execInitialRootScript(session, plan, script, {
  timeoutMs,
} = {}) {
  if (!initialBootstrapUsesSudo(plan)) {
    return session.exec(script, { timeoutMs });
  }
  return session.exec('sudo -n /bin/sh -s', {
    timeoutMs,
    stdin: Buffer.from(script, 'utf8'),
  });
}

async function writeRootFile(session, filePath, content, mode, {
  viaSudo = false,
} = {}) {
  const temporary = filePath + '.hivenues-new';
  const lines = [
    'set -eu',
    'umask 077',
    'cat > ' + shellQuote(temporary),
    'chown root:root -- ' + shellQuote(temporary),
    'chmod ' + mode + ' -- ' + shellQuote(temporary),
    'mv -f -- ' + shellQuote(temporary) + ' ' + shellQuote(filePath),
  ];
  const command = viaSudo
    ? 'sudo -n /bin/sh -c ' + shellQuote(lines.join('; '))
    : lines.join('\n') + '\n';
  await session.exec(command, {
    stdin: Buffer.from(content, 'utf8'),
  });
}

function publicationMigrationCandidate(pathValue) {
  return String(pathValue) + '.hivenues-stage4-migration-new';
}

function publicationMigrationDirectoriesCommand(plan) {
  return [
    'set -eu',
    'printf "HIVENUES_MUTATION_STAGE=publication-capability-directories\\n" >&2',
    'test "$(id -u)" = "0"',
    'install -d -m 0755 -o root -g root /usr/local/libexec /var/lib/hivenues-publication /var/lib/hivenues-caddy',
    'install -d -m 0700 -o root -g root ' + shellQuote(plan.paths.publicationStateRoot),
    'install -d -m 0700 -o caddy -g caddy ' + shellQuote(plan.paths.caddyStateRoot)
      + ' ' + shellQuote(plan.paths.caddyStateRoot + '/data')
      + ' ' + shellQuote(plan.paths.caddyStateRoot + '/config'),
  ].join('\n') + '\n';
}

function publicationMigrationActivateCommand(plan, helperSha256) {
  if (!/^[a-f0-9]{64}$/.test(String(helperSha256 || ''))) {
    throw targetError(
      'DEPLOYMENT_PUBLICATION_HELPER_DIGEST_INVALID',
      'Publication helper digest is invalid.',
    );
  }
  const helperCandidate = publicationMigrationCandidate(plan.paths.publicationHelper);
  const metadataCandidate = publicationMigrationCandidate(plan.paths.publicationMetadata);
  const caddyServiceCandidate = publicationMigrationCandidate(plan.paths.caddyService);
  const firewallServiceCandidate = publicationMigrationCandidate(plan.paths.firewallService);
  const sudoersCandidate = publicationMigrationCandidate(plan.paths.sudoersFile);
  return [
    'set -eu',
    'printf "HIVENUES_MUTATION_STAGE=publication-capability-activate\\n" >&2',
    'test "$(id -u)" = "0"',
    'printf "%s  %s\\n" ' + shellQuote(helperSha256) + ' ' + shellQuote(helperCandidate)
      + ' | sha256sum -c -',
    '/usr/sbin/visudo -cf ' + shellQuote(sudoersCandidate),
    'install -m 0600 -o root -g root -- ' + shellQuote(metadataCandidate)
      + ' ' + shellQuote(plan.paths.publicationMetadata),
    'install -m 0644 -o root -g root -- ' + shellQuote(caddyServiceCandidate)
      + ' ' + shellQuote(plan.paths.caddyService),
    'install -m 0644 -o root -g root -- ' + shellQuote(firewallServiceCandidate)
      + ' ' + shellQuote(plan.paths.firewallService),
    'install -m 0440 -o root -g root -- ' + shellQuote(sudoersCandidate)
      + ' ' + shellQuote(plan.paths.sudoersFile),
    'install -m 0755 -o root -g root -- ' + shellQuote(helperCandidate)
      + ' ' + shellQuote(plan.paths.publicationHelper),
    'rm -f -- ' + [
      helperCandidate,
      metadataCandidate,
      caddyServiceCandidate,
      firewallServiceCandidate,
      sudoersCandidate,
    ].map(shellQuote).join(' '),
    'systemctl daemon-reload',
    shellQuote(plan.paths.publicationHelper) + ' status >/dev/null',
  ].join('\n') + '\n';
}

class SshRemoteDeploymentTarget {
  constructor({
    authorityStore,
    authorityId,
    target,
    expectedHostKeyFingerprint,
    hostSlug,
    bootstrapUsername = '',
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
    this.initialUsername = String(bootstrapUsername || this.connection.username).trim();
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
    const exists = await withMutationStage(kind + '-stage-probe', () => (
      this.withSession(this.connection.username, async (session) => {
        const result = await session.exec(
          'if [ -d ' + shellQuote(finalPath) + ' ]; then printf "yes"; else printf "no"; fi',
        );
        return result.stdout.trim() === 'yes';
      })
    ));
    if (exists) {
      return Object.freeze({ reused: true, stagingPath: null, path: finalPath });
    }

    await withMutationStage(kind + '-stage-upload', () => (
      this.withSession(this.connection.username, async (session) => {
        await session.exec('rm -rf -- ' + shellQuote(stagingPath));
        await session.uploadTree(localRoot, stagingPath);
      })
    ));
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
      publicationHelperSha256: runtimeFileDigest(
        runtimeRoot,
        'src/deploy/publication-helper-runtime.js',
      ),
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
    if (
      !runtime?.provenance
      || !/^[a-f0-9]{64}$/.test(String(runtime.publicationHelperSha256 || ''))
      || !release?.manifest
      || !plan
    ) {
      throw targetError(
        'DEPLOYMENT_REMOTE_ACTIVATION_INVALID',
        'Remote deployment activation inputs are invalid.',
      );
    }
    this.lastPlan = plan;

    if (this.connection.username === plan.deploymentUser) {
      await this.withSession(plan.deploymentUser, async (session) => {
        await withMutationStage('steady-install', () => (
        session.exec(steadyInstallCommand(plan, runtime, release), {
          timeoutMs: 120000,
        })
      ));
      await withMutationStage('steady-service-activation', () => (
        session.exec(
          activationCommand(plan, runtime.path, release.path, { restricted: true }),
          { timeoutMs: 60000 },
        )
      ));
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
      const viaSudo = initialBootstrapUsesSudo(plan);
      await withMutationStage('bootstrap-initial', () => (
        execInitialRootScript(
          session,
          plan,
          initialBootstrapCommand(plan, runtime, release, this.publicKey),
          { timeoutMs: 240000 },
        )
      ));
      await withMutationStage('write-environment', () => writeRootFile(
        session, plan.paths.environmentFile, artifacts.environment, '0600', { viaSudo },
      ));
      await withMutationStage('write-runtime-service', () => writeRootFile(
        session, plan.paths.serviceUnit, artifacts.systemdUnit, '0644', { viaSudo },
      ));
      await withMutationStage('write-caddy-config', () => writeRootFile(
        session, plan.paths.caddyConfig, artifacts.caddyHttpConfig, '0644', { viaSudo },
      ));
      await withMutationStage('write-caddy-service', () => writeRootFile(
        session, plan.paths.caddyService, artifacts.caddySystemdUnit, '0644', { viaSudo },
      ));
      await withMutationStage('write-firewall-policy', () => writeRootFile(
        session, plan.paths.firewallPolicy, artifacts.nftablesPolicy, '0600', { viaSudo },
      ));
      await withMutationStage('write-firewall-service', () => writeRootFile(
        session, plan.paths.firewallService, artifacts.firewallSystemdUnit, '0644', { viaSudo },
      ));
      await withMutationStage('write-publication-metadata', () => writeRootFile(
        session, plan.paths.publicationMetadata, artifacts.publicationMetadata, '0600', { viaSudo },
      ));
      await withMutationStage('write-restricted-sudoers', () => writeRootFile(
        session, plan.paths.sudoersFile, artifacts.restrictedSudoers, '0440', { viaSudo },
      ));
      await withMutationStage('authority-state-pending', () => (
        execInitialRootScript(
          session,
          plan,
          authorityStateCommand(plan, 'restricted-login-pending'),
        )
      ));
      await withMutationStage('first-service-activation', () => (
        execInitialRootScript(
          session,
          plan,
          activationCommand(plan, runtime.path, release.path, { restricted: false }),
          { timeoutMs: 90000 },
        )
      ));
    });

    await this.withSession(plan.deploymentUser, async (session) => {
      const identity = await withMutationStage(
        'restricted-login-identity',
        () => session.exec('id -un'),
      );
      if (identity.stdout.trim() !== plan.deploymentUser) {
        throw targetError(
          'DEPLOYMENT_RESTRICTED_LOGIN_FAILED',
          'Restricted deployment account identity could not be proven.',
        );
      }
      await withMutationStage('restricted-login-service-proof', () => (
        session.exec(
          'sudo -n /usr/bin/systemctl status ' + shellQuote(serviceName(plan)),
          { timeoutMs: 15000 },
        )
      ));
      await withMutationStage('restricted-publication-capability-proof', () => (
        session.exec(
          'sudo -n ' + shellQuote(plan.paths.publicationHelper) + ' status',
          { timeoutMs: 15000 },
        )
      ));
    });

    await withMutationStage('authority-state-proven', () => (
      this.withSession(this.initialUsername, (session) => (
        execInitialRootScript(
          session,
          plan,
          authorityStateCommand(plan, 'restricted-login-proven'),
        )
      ))
    ));

    this.connection.username = plan.deploymentUser;
    this.narrowingPending = true;
    return Object.freeze({
      authorityState: 'restricted-login-proven',
      deploymentUser: plan.deploymentUser,
    });
  }

  async finalizeAuthorityNarrowing(plan = this.lastPlan) {
    if (!plan) return false;
    if (!this.initialUsername || this.initialUsername === plan.deploymentUser) {
      throw targetError(
        'DEPLOYMENT_BOOTSTRAP_ACCOUNT_UNAVAILABLE',
        'Original bootstrap account is unavailable for authority cleanup.',
      );
    }
    await withMutationStage('authority-narrowing', () => (
      this.withSession(this.initialUsername, (session) => (
        execInitialRootScript(
          session,
          plan,
          removeBootstrapKeyCommand(plan, this.publicKey),
        )
      ))
    ));
    this.narrowingPending = false;
    return true;
  }

  async bootstrapAuthorityAccessible(plan = this.lastPlan) {
    if (!plan) {
      throw targetError(
        'DEPLOYMENT_PUBLICATION_PLAN_REQUIRED',
        'Bootstrap-authority inspection requires an exact deployment plan.',
      );
    }
    try {
      const result = await this.withSession(this.initialUsername, (session) => (
        session.exec('id -un', { timeoutMs: 10000 })
      ));
      return String(result.stdout || '').trim() === this.initialUsername;
    } catch (error) {
      if (error?.code === 'DEPLOYMENT_SSH_AUTH_FAILED') return false;
      throw error;
    }
  }

  async migratePublicationCapability({
    plan = this.lastPlan,
    helperSource,
    helperSha256,
  } = {}) {
    if (!plan) {
      throw targetError(
        'DEPLOYMENT_PUBLICATION_PLAN_REQUIRED',
        'Publication capability migration requires an exact deployment plan.',
      );
    }
    const source = Buffer.isBuffer(helperSource)
      ? Buffer.from(helperSource)
      : Buffer.from(String(helperSource || ''), 'utf8');
    if (!source.length || !/^[a-f0-9]{64}$/.test(String(helperSha256 || ''))) {
      throw targetError(
        'DEPLOYMENT_PUBLICATION_MIGRATION_INVALID',
        'Publication capability migration artifact is invalid.',
      );
    }
    this.lastPlan = plan;
    const artifacts = renderBootstrapArtifacts(plan, {
      sshPort: this.connection.port,
    });

    await this.withSession(this.initialUsername, async (session) => {
      const identity = await session.exec('id -un', { timeoutMs: 10000 });
      if (String(identity.stdout || '').trim() !== this.initialUsername) {
        throw targetError(
          'DEPLOYMENT_BOOTSTRAP_ACCOUNT_MISMATCH',
          'Temporary bootstrap authority does not match the original account.',
        );
      }
      const viaSudo = initialBootstrapUsesSudo(plan);
      await withMutationStage('publication-capability-directories', () => (
        execInitialRootScript(
          session,
          plan,
          publicationMigrationDirectoriesCommand(plan),
          { timeoutMs: 30000 },
        )
      ));

      await withMutationStage('publication-helper-candidate', () => writeRootFile(
        session,
        publicationMigrationCandidate(plan.paths.publicationHelper),
        source,
        '0755',
        { viaSudo },
      ));
      await withMutationStage('publication-metadata-candidate', () => writeRootFile(
        session,
        publicationMigrationCandidate(plan.paths.publicationMetadata),
        artifacts.publicationMetadata,
        '0600',
        { viaSudo },
      ));
      await withMutationStage('publication-caddy-service-candidate', () => writeRootFile(
        session,
        publicationMigrationCandidate(plan.paths.caddyService),
        artifacts.caddySystemdUnit,
        '0644',
        { viaSudo },
      ));
      await withMutationStage('publication-firewall-service-candidate', () => writeRootFile(
        session,
        publicationMigrationCandidate(plan.paths.firewallService),
        artifacts.firewallSystemdUnit,
        '0644',
        { viaSudo },
      ));
      await withMutationStage('publication-sudoers-candidate', () => writeRootFile(
        session,
        publicationMigrationCandidate(plan.paths.sudoersFile),
        artifacts.restrictedSudoers,
        '0440',
        { viaSudo },
      ));

      await withMutationStage('publication-capability-activate', () => (
        execInitialRootScript(
          session,
          plan,
          publicationMigrationActivateCommand(plan, helperSha256),
          { timeoutMs: 30000 },
        )
      ));
    });

    return this.publicationStatus(plan);
  }

  async publicationStatus(plan = this.lastPlan) {
    if (!plan) {
      throw targetError(
        'DEPLOYMENT_PUBLICATION_PLAN_REQUIRED',
        'Publication capability inspection requires an exact deployment plan.',
      );
    }
    this.lastPlan = plan;
    const helper = plan.paths.publicationHelper;
    const command = [
      'set -eu',
      'if [ ! -x ' + shellQuote(helper) + ' ]; then',
      '  printf "HIVENUES_PUBLICATION_CAPABILITY=upgrade-required\\n"',
      '  exit 0',
      'fi',
      'if output="$(sudo -n ' + shellQuote(helper) + ' status 2>/dev/null)"; then',
      '  printf "HIVENUES_PUBLICATION_CAPABILITY=ready\\n"',
      '  printf "%s\\n" "$output"',
      'else',
      '  printf "HIVENUES_PUBLICATION_CAPABILITY=error\\n"',
      'fi',
    ].join('\n') + '\n';

    const result = await this.withSession(this.connection.username, (session) => (
      session.exec(command, { timeoutMs: 15000 })
    ));
    const lines = result.stdout.trim().split(/\r?\n/);
    const marker = String(lines[0] || '').trim();
    if (marker === 'HIVENUES_PUBLICATION_CAPABILITY=upgrade-required') {
      return Object.freeze({
        capability: 'upgrade-required',
        reason: 'publication-capability-upgrade-required',
      });
    }
    if (marker === 'HIVENUES_PUBLICATION_CAPABILITY=error') {
      throw targetError(
        'DEPLOYMENT_PUBLICATION_STATUS_FAILED',
        'Publication capability exists but its bounded status check failed.',
      );
    }
    if (marker !== 'HIVENUES_PUBLICATION_CAPABILITY=ready' || !lines[1]) {
      throw targetError(
        'DEPLOYMENT_PUBLICATION_STATUS_INVALID',
        'Publication capability status was not valid.',
      );
    }
    let status;
    try {
      status = JSON.parse(lines[1]);
    } catch {
      throw targetError(
        'DEPLOYMENT_PUBLICATION_STATUS_INVALID',
        'Publication capability status was not valid JSON.',
      );
    }
    if (
      !status
      || status.version !== 1
      || status.capability !== 'ready'
      || status.hostSlug !== plan.release.hostSlug
      || !['unconfigured', 'configured', 'drifted'].includes(status.state)
    ) {
      throw targetError(
        'DEPLOYMENT_PUBLICATION_STATUS_INVALID',
        'Publication capability status was inconsistent.',
      );
    }
    return Object.freeze({
      capability: 'ready',
      status: Object.freeze({ ...status }),
    });
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
  publicationMigrationActivateCommand,
  publicationMigrationDirectoriesCommand,
  qualifiedNodePath,
  removeBootstrapKeyCommand,
  steadyInstallCommand,
  writeRootFile,
};
