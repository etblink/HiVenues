'use strict';

function configError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function shellQuote(value) {
  const text = String(value ?? '');
  for (const character of text) {
    const code = character.charCodeAt(0);
    if (code === 0 || code === 10 || code === 13) {
      throw configError(
        'DEPLOYED_BOOTSTRAP_VALUE_INVALID',
        'Bootstrap value contains a control character.',
      );
    }
  }
  return "'" + text.replaceAll("'", "'\\''") + "'";
}

function assertPlan(plan) {
  if (
    !plan
    || plan.version !== 1
    || plan.profile !== 'debian-systemd-caddy-v1'
    || plan.runtime?.bindHost !== '127.0.0.1'
    || !Number.isInteger(plan.runtimePort)
    || plan.runtimePort < 1024
    || plan.runtimePort > 65535
  ) {
    throw configError('DEPLOYED_BOOTSTRAP_PLAN_INVALID', 'Reference bootstrap plan is invalid.');
  }
  return plan;
}

function renderRuntimeEnvironment(planInput) {
  const plan = assertPlan(planInput);
  const entries = {
    HIVENUES_RELEASE_PACKAGE: plan.paths.releaseCurrent,
    HIVENUES_RUNTIME_STATE: plan.paths.runtimeState,
    HIVENUES_RUNTIME_PROVENANCE: plan.paths.runtimeCurrent + '/runtime-provenance.json',
    HIVENUES_RUNTIME_MANIFEST: plan.paths.runtimeCurrent + '/runtime-manifest.json',
    PORT: String(plan.runtimePort),
    NODE_ENV: 'production',
    PATH: plan.paths.nodeRoot + '/bin:/usr/bin:/bin',
  };
  return Object.entries(entries)
    .map(([key, value]) => key + '=' + shellQuote(value))
    .join('\n') + '\n';
}

function renderSystemdUnit(planInput) {
  const plan = assertPlan(planInput);
  const executable = plan.paths.runtimeCurrent + '/scripts/hivenues-public-runtime.js';
  return [
    '[Unit]',
    'Description=HiVenues public runtime for ' + plan.release.hostSlug,
    'After=network-online.target',
    'Wants=network-online.target',
    '',
    '[Service]',
    'Type=simple',
    'User=' + plan.runtimeUser,
    'Group=' + plan.runtimeUser,
    'WorkingDirectory=' + plan.paths.runtimeCurrent,
    'EnvironmentFile=' + plan.paths.environmentFile,
    'ExecStart=' + plan.nodeDistribution.nodePath + ' ' + executable,
    'Restart=on-failure',
    'RestartSec=3s',
    'NoNewPrivileges=true',
    'PrivateTmp=true',
    'ProtectSystem=strict',
    'ProtectHome=true',
    'ProtectKernelTunables=true',
    'ProtectKernelModules=true',
    'ProtectControlGroups=true',
    'RestrictSUIDSGID=true',
    'LockPersonality=true',
    'RestrictRealtime=true',
    'ReadWritePaths=' + plan.paths.stateRoot,
    'UMask=0077',
    '',
    '[Install]',
    'WantedBy=multi-user.target',
    '',
  ].join('\n');
}

function renderCaddyHttpConfig(planInput) {
  const plan = assertPlan(planInput);
  return [
    '{',
    '  auto_https off',
    '  admin off',
    '}',
    '',
    'http://:80 {',
    '  encode zstd gzip',
    '  reverse_proxy 127.0.0.1:' + plan.runtimePort,
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

function renderNftablesPolicy({
  sshPort = 22,
} = {}) {
  const port = Number(sshPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw configError('DEPLOYED_BOOTSTRAP_SSH_PORT_INVALID', 'SSH firewall port is invalid.');
  }
  return [
    'table inet hivenues {',
    '  chain input {',
    '    type filter hook input priority 0; policy drop;',
    '    ct state established,related accept',
    '    iifname "lo" accept',
    '    ip protocol icmp accept',
    '    ip6 nexthdr ipv6-icmp accept',
    '    tcp dport ' + port + ' accept comment "HiVenues deployment SSH"',
    '    tcp dport 80 accept comment "HiVenues Stage 3 temporary HTTP"',
    '  }',
    '}',
    '',
  ].join('\n');
}

function renderFirewallSystemdUnit(planInput) {
  const plan = assertPlan(planInput);
  return [
    '[Unit]',
    'Description=HiVenues bounded firewall policy',
    'Before=network-online.target',
    'Wants=network-pre.target',
    '',
    '[Service]',
    'Type=oneshot',
    'ExecStart=/usr/sbin/nft -f ' + plan.paths.firewallPolicy,
    'RemainAfterExit=yes',
    'NoNewPrivileges=true',
    'ProtectSystem=strict',
    'ProtectHome=true',
    '',
    '[Install]',
    'WantedBy=multi-user.target',
    '',
  ].join('\n');
}

function renderRestrictedSudoers(planInput) {
  const plan = assertPlan(planInput);
  const service = 'hivenues-' + plan.release.hostSlug + '.service';
  const deployUser = plan.deploymentUser;
  return [
    'Cmnd_Alias HIVENUES_SERVICE = /usr/bin/systemctl restart ' + service
      + ', /usr/bin/systemctl start ' + service
      + ', /usr/bin/systemctl stop ' + service
      + ', /usr/bin/systemctl status ' + service,
    deployUser + ' ALL=(root) NOPASSWD: HIVENUES_SERVICE',
    '',
  ].join('\n');
}

function renderBootstrapArtifacts(planInput, {
  sshPort = 22,
} = {}) {
  const plan = assertPlan(planInput);
  return Object.freeze({
    environment: renderRuntimeEnvironment(plan),
    systemdUnit: renderSystemdUnit(plan),
    caddyHttpConfig: renderCaddyHttpConfig(plan),
    nftablesPolicy: renderNftablesPolicy({ sshPort }),
    firewallSystemdUnit: renderFirewallSystemdUnit(plan),
    restrictedSudoers: renderRestrictedSudoers(plan),
  });
}

module.exports = {
  renderBootstrapArtifacts,
  renderCaddyHttpConfig,
  renderFirewallSystemdUnit,
  renderNftablesPolicy,
  renderRestrictedSudoers,
  renderRuntimeEnvironment,
  renderSystemdUnit,
};
