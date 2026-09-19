'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { Client } = require('ssh2');

const { hostKeyFingerprint } = require('../product/ssh2-readonly-transport');

const DEFAULT_READY_TIMEOUT_MS = 10000;
const DEFAULT_COMMAND_TIMEOUT_MS = 30000;
const MAX_COMMAND_OUTPUT_BYTES = 65536;

function mutationError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function requireFingerprint(value) {
  const fingerprint = String(value || '').trim();
  if (!/^SHA256:[A-Za-z0-9+/]{20,}$/.test(fingerprint)) {
    throw mutationError(
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
    throw mutationError(
      'DEPLOYMENT_TARGET_FACTS_INCOMPLETE',
      'SSH mutation transport requires host, port and username.',
    );
  }
  return Object.freeze({ host, port, username });
}

function hasRejectedControlCharacter(value) {
  for (const character of String(value ?? '')) {
    const code = character.charCodeAt(0);
    if (code === 0 || code === 10 || code === 13) return true;
  }
  return false;
}

function shellQuote(value) {
  const text = String(value ?? '');
  if (hasRejectedControlCharacter(text)) {
    throw mutationError(
      'DEPLOYMENT_REMOTE_VALUE_INVALID',
      'Remote shell value contains a control character.',
    );
  }
  return "'" + text.replaceAll("'", "'\\''") + "'";
}

function boundedBuffer(chunks, bytes, maxBytes, label) {
  if (bytes > maxBytes) {
    throw mutationError(
      'DEPLOYMENT_REMOTE_OUTPUT_LIMIT',
      'Remote ' + label + ' exceeded its output limit.',
    );
  }
  return Buffer.concat(chunks).toString('utf8');
}

function execRemote(client, command, {
  stdin = null,
  timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS,
  maxOutputBytes = MAX_COMMAND_OUTPUT_BYTES,
} = {}) {
  if (!client || typeof client.exec !== 'function') {
    throw new TypeError('Remote exec requires an SSH client.');
  }
  if (typeof command !== 'string' || !command.trim()) {
    throw new TypeError('Remote exec requires a nonempty command.');
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000) {
    throw new TypeError('Remote exec timeout must be at least one second.');
  }

  return new Promise((resolve, reject) => {
    client.exec(command, { pty: false }, (error, stream) => {
      if (error) {
        reject(mutationError(
          'DEPLOYMENT_REMOTE_EXEC_START_FAILED',
          'Remote command could not start.',
        ));
        return;
      }

      const stdout = [];
      const stderr = [];
      let stdoutBytes = 0;
      let stderrBytes = 0;
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        stream.close?.();
        reject(mutationError(
          'DEPLOYMENT_REMOTE_EXEC_TIMEOUT',
          'Remote command exceeded its execution timeout.',
        ));
      }, timeoutMs);

      stream.on('data', (chunk) => {
        const value = Buffer.from(chunk);
        stdoutBytes += value.length;
        if (stdoutBytes <= maxOutputBytes) stdout.push(value);
      });
      stream.stderr.on('data', (chunk) => {
        const value = Buffer.from(chunk);
        stderrBytes += value.length;
        if (stderrBytes <= maxOutputBytes) stderr.push(value);
      });
      stream.once('close', (code, signal) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);

        let stdoutText;
        let stderrText;
        try {
          stdoutText = boundedBuffer(stdout, stdoutBytes, maxOutputBytes, 'stdout');
          stderrText = boundedBuffer(stderr, stderrBytes, maxOutputBytes, 'stderr');
        } catch (limitError) {
          reject(limitError);
          return;
        }

        if (code !== 0) {
          const failure = mutationError(
            'DEPLOYMENT_REMOTE_COMMAND_FAILED',
            'Remote command returned a nonzero status.',
          );
          failure.remoteExitCode = code;
          failure.remoteSignal = signal || '';
          failure.remoteStderr = stderrText.slice(0, 4096);
          reject(failure);
          return;
        }
        resolve(Object.freeze({
          stdout: stdoutText,
          stderr: stderrText,
          exitCode: code,
        }));
      });

      if (stdin !== null && stdin !== undefined) {
        stream.end(Buffer.isBuffer(stdin) ? stdin : Buffer.from(String(stdin), 'utf8'));
      } else {
        stream.end();
      }
    });
  });
}

function openSftp(client) {
  return new Promise((resolve, reject) => {
    client.sftp((error, sftp) => {
      if (error) {
        reject(mutationError(
          'DEPLOYMENT_SFTP_UNAVAILABLE',
          'Remote SFTP subsystem is unavailable.',
        ));
        return;
      }
      resolve(sftp);
    });
  });
}

function sftpFastPut(sftp, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    sftp.fastPut(localPath, remotePath, {
      concurrency: 8,
      chunkSize: 32768,
    }, (error) => {
      if (error) {
        reject(mutationError(
          'DEPLOYMENT_SFTP_UPLOAD_FAILED',
          'Remote artifact upload failed.',
        ));
        return;
      }
      resolve();
    });
  });
}

function listTree(root) {
  const absoluteRoot = path.resolve(root);
  if (!fs.existsSync(absoluteRoot) || !fs.statSync(absoluteRoot).isDirectory()) {
    throw mutationError(
      'DEPLOYMENT_UPLOAD_SOURCE_MISSING',
      'Local deployment artifact directory is missing.',
    );
  }
  const directories = [''];
  const files = [];

  const walk = (relative) => {
    const directory = path.join(absoluteRoot, relative);
    for (const name of fs.readdirSync(directory).sort()) {
      const next = path.join(relative, name);
      const full = path.join(absoluteRoot, next);
      const stat = fs.lstatSync(full);
      if (stat.isSymbolicLink()) {
        throw mutationError(
          'DEPLOYMENT_UPLOAD_SYMLINK_REJECTED',
          'Deployment artifacts may not contain symbolic links.',
        );
      }
      if (stat.isDirectory()) {
        directories.push(next);
        walk(next);
      } else if (stat.isFile()) {
        files.push(next);
      } else {
        throw mutationError(
          'DEPLOYMENT_UPLOAD_FILE_TYPE_REJECTED',
          'Deployment artifacts contain an unsupported file type.',
        );
      }
    }
  };
  walk('');

  return Object.freeze({
    root: absoluteRoot,
    directories: Object.freeze(directories),
    files: Object.freeze(files),
  });
}

class Ssh2PinnedMutationTransport {
  constructor({
    readyTimeoutMs = DEFAULT_READY_TIMEOUT_MS,
    commandTimeoutMs = DEFAULT_COMMAND_TIMEOUT_MS,
    maxOutputBytes = MAX_COMMAND_OUTPUT_BYTES,
    clientFactory = () => new Client(),
  } = {}) {
    if (!Number.isInteger(readyTimeoutMs) || readyTimeoutMs < 1000) {
      throw new TypeError('SSH ready timeout must be at least one second.');
    }
    if (!Number.isInteger(commandTimeoutMs) || commandTimeoutMs < 1000) {
      throw new TypeError('SSH command timeout must be at least one second.');
    }
    if (!Number.isInteger(maxOutputBytes) || maxOutputBytes < 1024) {
      throw new TypeError('SSH command output bound must be at least 1024 bytes.');
    }
    if (typeof clientFactory !== 'function') {
      throw new TypeError('SSH mutation transport clientFactory must be a function.');
    }
    this.readyTimeoutMs = readyTimeoutMs;
    this.commandTimeoutMs = commandTimeoutMs;
    this.maxOutputBytes = maxOutputBytes;
    this.clientFactory = clientFactory;
  }

  async withSession({
    target,
    expectedHostKeyFingerprint,
    privateKey,
  }, action) {
    if (typeof action !== 'function') {
      throw new TypeError('SSH mutation session requires an action.');
    }
    const normalizedTarget = requireTarget(target);
    const expected = requireFingerprint(expectedHostKeyFingerprint);
    if (!Buffer.isBuffer(privateKey) || privateKey.length < 100) {
      throw mutationError(
        'DEPLOYMENT_AUTHORITY_INVALID',
        'Deployment private key was unavailable for remote mutation.',
      );
    }

    const client = this.clientFactory();
    let observed = '';
    let ready = false;

    await new Promise((resolve, reject) => {
      const rejectConnection = (error) => {
        try { client.end(); } catch {}
        reject(error);
      };
      client.once('error', () => {
        if (observed && observed !== expected) {
          const error = mutationError(
            'DEPLOYMENT_HOST_KEY_CHANGED',
            'SSH host fingerprint changed before remote mutation.',
          );
          error.observedHostKeyFingerprint = observed;
          rejectConnection(error);
          return;
        }
        rejectConnection(mutationError(
          ready ? 'DEPLOYMENT_REMOTE_SESSION_FAILED' : 'DEPLOYMENT_SSH_AUTH_FAILED',
          ready
            ? 'Remote mutation SSH session failed.'
            : 'SSH authentication failed for remote mutation.',
        ));
      });
      client.once('ready', () => {
        ready = true;
        resolve();
      });

      try {
        client.connect({
          ...normalizedTarget,
          readyTimeout: this.readyTimeoutMs,
          privateKey,
          hostVerifier: (key) => {
            observed = hostKeyFingerprint(key);
            return observed === expected;
          },
        });
      } catch {
        rejectConnection(mutationError(
          'DEPLOYMENT_SSH_AUTH_FAILED',
          'SSH mutation session could not start.',
        ));
      }
    });

    const session = Object.freeze({
      target: normalizedTarget,
      exec: (command, options = {}) => execRemote(client, command, {
        timeoutMs: this.commandTimeoutMs,
        maxOutputBytes: this.maxOutputBytes,
        ...options,
      }),
      uploadTree: async (localRoot, remoteRoot) => {
        const tree = listTree(localRoot);
        const normalizedRemote = String(remoteRoot || '').trim();
        if (!normalizedRemote.startsWith('/') || hasRejectedControlCharacter(normalizedRemote)) {
          throw mutationError(
            'DEPLOYMENT_REMOTE_PATH_INVALID',
            'Remote upload path is invalid.',
          );
        }

        await execRemote(
          client,
          'install -d -m 0700 -- ' + shellQuote(normalizedRemote),
          {
            timeoutMs: this.commandTimeoutMs,
            maxOutputBytes: this.maxOutputBytes,
          },
        );

        for (const relative of tree.directories.slice(1)) {
          const remote = path.posix.join(
            normalizedRemote,
            relative.split(path.sep).join('/'),
          );
          await execRemote(
            client,
            'install -d -m 0700 -- ' + shellQuote(remote),
            {
              timeoutMs: this.commandTimeoutMs,
              maxOutputBytes: this.maxOutputBytes,
            },
          );
        }

        const sftp = await openSftp(client);
        try {
          for (const relative of tree.files) {
            const local = path.join(tree.root, relative);
            const remote = path.posix.join(
              normalizedRemote,
              relative.split(path.sep).join('/'),
            );
            await sftpFastPut(sftp, local, remote);
          }
        } finally {
          sftp.end();
        }
      },
    });

    try {
      return await action(session);
    } finally {
      try { client.end(); } catch {}
    }
  }
}

module.exports = {
  MAX_COMMAND_OUTPUT_BYTES,
  Ssh2PinnedMutationTransport,
  execRemote,
  listTree,
  shellQuote,
};
