'use strict';

const crypto = require('node:crypto');

const { Client } = require('ssh2');

const READ_ONLY_INSPECTION_COMMAND = [
  'set -eu',
  'if [ -r /etc/os-release ]; then . /etc/os-release; else PRETTY_NAME="$(uname -s)"; fi',
  'printf "HIVENUES_OS=%s\\n" "${PRETTY_NAME:-unknown}"',
  'printf "HIVENUES_ARCH=%s\\n" "$(uname -m)"',
  'printf "HIVENUES_MEMORY_KB=%s\\n" "$(awk \'/^MemTotal:/ { print $2; exit }\' /proc/meminfo)"',
  'printf "HIVENUES_DISK_KB=%s\\n" "$(df -Pk / | awk \'NR==2 { print $2; exit }\')"',
  'printf "HIVENUES_PUBLIC_TCP_PORTS=%s\\n" "$(ss -H -ltn | awk \'{ endpoint=$4; if (endpoint ~ /^127\\.0\\.0\\.1:/ || endpoint ~ /^\\[::1\\]:/) next; sub(/^.*:/, "", endpoint); if (endpoint ~ /^[0-9]+$/) print endpoint }\' | sort -nu | paste -sd, -)"',
  'if systemctl is-active --quiet caddy.service 2>/dev/null; then printf "HIVENUES_SYSTEM_CADDY_ACTIVE=1\\n"; else printf "HIVENUES_SYSTEM_CADDY_ACTIVE=0\\n"; fi',
  'if systemctl is-active --quiet hivenues-caddy.service 2>/dev/null; then printf "HIVENUES_HIVENUES_CADDY_ACTIVE=1\\n"; else printf "HIVENUES_HIVENUES_CADDY_ACTIVE=0\\n"; fi',
  'if systemctl is-active --quiet hivenues-firewall.service 2>/dev/null; then printf "HIVENUES_HIVENUES_FIREWALL_ACTIVE=1\\n"; else printf "HIVENUES_HIVENUES_FIREWALL_ACTIVE=0\\n"; fi',
].join('; ');

const DEFAULT_READY_TIMEOUT_MS = 10000;
const MAX_INSPECTION_OUTPUT_BYTES = 32768;

function transportError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function hostKeyFingerprint(key) {
  if (!Buffer.isBuffer(key) || !key.length) {
    throw transportError('DEPLOYMENT_HOST_KEY_INVALID', 'SSH server returned an invalid host key.');
  }
  return 'SHA256:' + crypto
    .createHash('sha256')
    .update(key)
    .digest('base64')
    .replace(/=+$/, '');
}

function requireFingerprint(value) {
  const fingerprint = String(value || '').trim();
  if (!/^SHA256:[A-Za-z0-9+/]{20,}$/.test(fingerprint)) {
    throw transportError(
      'DEPLOYMENT_HOST_FINGERPRINT_INVALID',
      'Trusted SSH host fingerprint is invalid.',
    );
  }
  return fingerprint;
}

function requireTarget(target = {}) {
  const host = String(target.host || '').trim();
  const username = String(target.username || '').trim();
  const port = Number(target.port || 22);
  if (!host || !username || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw transportError(
      'DEPLOYMENT_TARGET_FACTS_INCOMPLETE',
      'SSH transport requires host, port and username.',
    );
  }
  return { host, port, username };
}

function boundedText(value, label, maxLength) {
  const text = String(value || '').trim();
  if (
    !text
    || text.length > maxLength
    || /[\u0000-\u001f\u007f]/.test(text)
  ) {
    throw transportError(
      'DEPLOYMENT_INSPECTION_INVALID',
      'SSH inspection returned an invalid ' + label + '.',
    );
  }
  return text;
}

function positiveInteger(value, label) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number <= 0) {
    throw transportError(
      'DEPLOYMENT_INSPECTION_INVALID',
      'SSH inspection returned an invalid ' + label + '.',
    );
  }
  return number;
}

function boundedPortList(value) {
  const text = String(value ?? '').trim();
  if (!text) return Object.freeze([]);
  if (!/^[0-9]+(?:,[0-9]+)*$/.test(text)) {
    throw transportError(
      'DEPLOYMENT_INSPECTION_INVALID',
      'SSH inspection returned an invalid public TCP listener list.',
    );
  }
  const ports = [...new Set(text.split(',').map((item) => Number(item)))].sort((a, b) => a - b);
  if (ports.some((port) => !Number.isInteger(port) || port < 1 || port > 65535)) {
    throw transportError(
      'DEPLOYMENT_INSPECTION_INVALID',
      'SSH inspection returned an out-of-range public TCP listener.',
    );
  }
  return Object.freeze(ports);
}

function strictBoolean(value, label) {
  if (value === '1') return true;
  if (value === '0') return false;
  throw transportError(
    'DEPLOYMENT_INSPECTION_INVALID',
    'SSH inspection returned an invalid ' + label + ' state.',
  );
}

function parseInspectionOutput(stdout) {
  const values = new Map();
  for (const line of String(stdout || '').split(/\r?\n/)) {
    const match = /^HIVENUES_([A-Z_]+)=(.*)$/.exec(line);
    if (match && !values.has(match[1])) values.set(match[1], match[2]);
  }

  const memoryKb = positiveInteger(values.get('MEMORY_KB'), 'memory size');
  const diskKb = positiveInteger(values.get('DISK_KB'), 'disk size');
  return Object.freeze({
    os: boundedText(values.get('OS'), 'operating-system identity', 200),
    architecture: boundedText(values.get('ARCH'), 'architecture', 64),
    memoryMb: Math.floor(memoryKb / 1024),
    diskMb: Math.floor(diskKb / 1024),
    publicTcpPorts: boundedPortList(values.get('PUBLIC_TCP_PORTS')),
    systemCaddyActive: strictBoolean(values.get('SYSTEM_CADDY_ACTIVE'), 'system Caddy'),
    hivenuesCaddyActive: strictBoolean(values.get('HIVENUES_CADDY_ACTIVE'), 'HiVenues Caddy'),
    hivenuesFirewallActive: strictBoolean(values.get('HIVENUES_FIREWALL_ACTIVE'), 'HiVenues firewall'),
  });
}

class Ssh2ReadOnlyVerificationTransport {
  constructor({
    readyTimeoutMs = DEFAULT_READY_TIMEOUT_MS,
    maxOutputBytes = MAX_INSPECTION_OUTPUT_BYTES,
    clientFactory = () => new Client(),
  } = {}) {
    if (!Number.isInteger(readyTimeoutMs) || readyTimeoutMs < 1000) {
      throw new TypeError('SSH ready timeout must be at least one second.');
    }
    if (!Number.isInteger(maxOutputBytes) || maxOutputBytes < 1024) {
      throw new TypeError('SSH inspection output bound must be at least 1024 bytes.');
    }
    if (typeof clientFactory !== 'function') {
      throw new TypeError('SSH transport clientFactory must be a function.');
    }
    this.readyTimeoutMs = readyTimeoutMs;
    this.maxOutputBytes = maxOutputBytes;
    this.clientFactory = clientFactory;
  }

  async observeHostKey(input) {
    const target = requireTarget(input);
    return new Promise((resolve, reject) => {
      const client = this.clientFactory();
      let observed = '';
      let settled = false;

      const finish = (error) => {
        if (settled) return;
        settled = true;
        if (error) reject(error);
        else resolve(observed);
      };

      client.once('error', () => {
        if (observed) return;
        finish(transportError(
          'DEPLOYMENT_SSH_UNREACHABLE',
          'SSH host key could not be observed from the deployment target.',
        ));
      });
      client.once('close', () => {
        if (observed) finish();
        else finish(transportError(
          'DEPLOYMENT_SSH_UNREACHABLE',
          'SSH target closed before presenting a host key.',
        ));
      });

      try {
        client.connect({
          ...target,
          readyTimeout: this.readyTimeoutMs,
          hostVerifier: (key) => {
            observed = hostKeyFingerprint(key);
            return false;
          },
        });
      } catch {
        finish(transportError(
          'DEPLOYMENT_SSH_UNREACHABLE',
          'SSH host key observation could not start.',
        ));
      }
    });
  }

  async inspect(input = {}) {
    const target = requireTarget(input);
    const expected = requireFingerprint(input.expectedHostKeyFingerprint);
    if (!Buffer.isBuffer(input.privateKey) || input.privateKey.length < 100) {
      throw transportError(
        'DEPLOYMENT_AUTHORITY_INVALID',
        'Deployment private key was unavailable for SSH verification.',
      );
    }

    return new Promise((resolve, reject) => {
      const client = this.clientFactory();
      let observed = '';
      let result = null;
      let settled = false;
      let commandStarted = false;

      const finish = (error) => {
        if (settled) return;
        settled = true;
        if (error) reject(error);
        else resolve(result);
      };

      client.once('error', () => {
        if (observed && observed !== expected) {
          const error = transportError(
            'DEPLOYMENT_HOST_KEY_CHANGED',
            'SSH host fingerprint changed before authentication.',
          );
          error.observedHostKeyFingerprint = observed;
          finish(error);
          return;
        }
        finish(transportError(
          commandStarted ? 'DEPLOYMENT_SSH_INSPECTION_FAILED' : 'DEPLOYMENT_SSH_AUTH_FAILED',
          commandStarted
            ? 'Read-only SSH inspection failed.'
            : 'SSH authentication failed for the deployment target.',
        ));
      });
      client.once('close', () => {
        if (result) finish();
        else if (!settled) {
          if (observed && observed !== expected) {
            finish(transportError(
              'DEPLOYMENT_HOST_KEY_CHANGED',
              'SSH host fingerprint changed before authentication.',
            ));
          } else {
            finish(transportError(
              commandStarted ? 'DEPLOYMENT_SSH_INSPECTION_FAILED' : 'DEPLOYMENT_SSH_AUTH_FAILED',
              commandStarted
                ? 'Read-only SSH inspection closed before completion.'
                : 'SSH authentication did not complete.',
            ));
          }
        }
      });
      client.once('ready', () => {
        commandStarted = true;
        client.exec(READ_ONLY_INSPECTION_COMMAND, { pty: false }, (error, stream) => {
          if (error) {
            client.end();
            finish(transportError(
              'DEPLOYMENT_SSH_INSPECTION_FAILED',
              'Read-only SSH inspection could not start.',
            ));
            return;
          }

          const stdout = [];
          let stdoutBytes = 0;
          let overflow = false;
          stream.on('data', (chunk) => {
            const value = Buffer.from(chunk);
            stdoutBytes += value.length;
            if (stdoutBytes > this.maxOutputBytes) {
              overflow = true;
              stream.close?.();
              return;
            }
            stdout.push(value);
          });
          stream.stderr.on('data', () => {});
          stream.once('close', (code) => {
            if (overflow) {
              client.end();
              finish(transportError(
                'DEPLOYMENT_SSH_INSPECTION_OUTPUT_LIMIT',
                'Read-only SSH inspection exceeded its output limit.',
              ));
              return;
            }
            if (code !== 0) {
              client.end();
              finish(transportError(
                'DEPLOYMENT_SSH_INSPECTION_FAILED',
                'Read-only SSH inspection returned a nonzero status.',
              ));
              return;
            }
            try {
              result = parseInspectionOutput(Buffer.concat(stdout).toString('utf8'));
            } catch (parseError) {
              client.end();
              finish(parseError);
              return;
            }
            client.end();
          });
        });
      });

      try {
        client.connect({
          ...target,
          readyTimeout: this.readyTimeoutMs,
          privateKey: input.privateKey,
          hostVerifier: (key) => {
            observed = hostKeyFingerprint(key);
            return observed === expected;
          },
        });
      } catch {
        finish(transportError(
          'DEPLOYMENT_SSH_AUTH_FAILED',
          'SSH verification could not start.',
        ));
      }
    });
  }
}

module.exports = {
  MAX_INSPECTION_OUTPUT_BYTES,
  READ_ONLY_INSPECTION_COMMAND,
  Ssh2ReadOnlyVerificationTransport,
  hostKeyFingerprint,
  parseInspectionOutput,
};
