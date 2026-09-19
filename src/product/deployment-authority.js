'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const AUTHORITY_VERSION = 1;

function authorityError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function base64urlBytes(value) {
  return Buffer.from(String(value), 'base64url');
}

function uint32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value, 0);
  return buffer;
}

function sshString(buffer) {
  return Buffer.concat([uint32(buffer.length), buffer]);
}

function sshMpint(buffer) {
  let value = Buffer.from(buffer);
  while (value.length > 1 && value[0] === 0) value = value.subarray(1);
  if (value[0] & 0x80) value = Buffer.concat([Buffer.from([0]), value]);
  return sshString(value);
}

function rsaPublicKeyToOpenSsh(publicKey, comment = 'hivenues-deployment') {
  const jwk = publicKey.export({ format: 'jwk' });
  if (jwk.kty !== 'RSA' || !jwk.n || !jwk.e) {
    throw authorityError('DEPLOYMENT_KEY_INVALID', 'Deployment public key is not RSA.');
  }
  const wire = Buffer.concat([
    sshString(Buffer.from('ssh-rsa', 'ascii')),
    sshMpint(base64urlBytes(jwk.e)),
    sshMpint(base64urlBytes(jwk.n)),
  ]);
  return 'ssh-rsa ' + wire.toString('base64') + ' ' + comment;
}

function generateDeploymentSshKeyPair({
  modulusLength = 3072,
  comment = 'hivenues-deployment',
} = {}) {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength,
    publicExponent: 0x10001,
  });
  const privateKeyPem = privateKey.export({
    type: 'pkcs1',
    format: 'pem',
  });
  const publicKeyOpenSsh = rsaPublicKeyToOpenSsh(publicKey, comment);
  const publicKeyFingerprint = 'SHA256:' + crypto
    .createHash('sha256')
    .update(Buffer.from(publicKeyOpenSsh.split(' ')[1], 'base64'))
    .digest('base64')
    .replace(/=+$/, '');
  return Object.freeze({
    algorithm: 'rsa',
    modulusLength,
    privateKeyPem,
    publicKeyOpenSsh,
    publicKeyFingerprint,
  });
}

const DPAPI_SCRIPT = Object.freeze({
  protect: [
    '$ErrorActionPreference = "Stop"',
    '$inputB64 = [Console]::In.ReadToEnd().Trim()',
    '$bytes = [Convert]::FromBase64String($inputB64)',
    '$scope = [Security.Cryptography.DataProtectionScope]::CurrentUser',
    '$protected = [Security.Cryptography.ProtectedData]::Protect($bytes, $null, $scope)',
    '[Console]::Out.Write([Convert]::ToBase64String($protected))',
  ].join('; '),
  unprotect: [
    '$ErrorActionPreference = "Stop"',
    '$inputB64 = [Console]::In.ReadToEnd().Trim()',
    '$bytes = [Convert]::FromBase64String($inputB64)',
    '$scope = [Security.Cryptography.DataProtectionScope]::CurrentUser',
    '$plain = [Security.Cryptography.ProtectedData]::Unprotect($bytes, $null, $scope)',
    '[Console]::Out.Write([Convert]::ToBase64String($plain))',
  ].join('; '),
});

function runDpapi(script, payload, {
  powershellPath = 'powershell.exe',
} = {}) {
  const encodedInput = Buffer.from(payload).toString('base64');
  const result = spawnSync(
    powershellPath,
    ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', script],
    {
      input: encodedInput,
      encoding: 'utf8',
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    },
  );
  if (result.error) {
    throw authorityError('DEPLOYMENT_DPAPI_UNAVAILABLE', 'Windows DPAPI could not be invoked.');
  }
  if (result.status !== 0) {
    throw authorityError('DEPLOYMENT_DPAPI_FAILED', 'Windows DPAPI rejected the deployment authority operation.');
  }
  let output;
  try {
    output = Buffer.from(String(result.stdout || '').trim(), 'base64');
  } catch {
    throw authorityError('DEPLOYMENT_DPAPI_FAILED', 'Windows DPAPI returned invalid protected data.');
  }
  if (!output.length) {
    throw authorityError('DEPLOYMENT_DPAPI_FAILED', 'Windows DPAPI returned empty protected data.');
  }
  return output;
}

function createWindowsDpapiProtector(options = {}) {
  return Object.freeze({
    kind: 'windows-dpapi-current-user',
    protect(plaintext) {
      return runDpapi(DPAPI_SCRIPT.protect, Buffer.from(plaintext), options);
    },
    unprotect(ciphertext) {
      return runDpapi(DPAPI_SCRIPT.unprotect, Buffer.from(ciphertext), options);
    },
  });
}

function createPlatformAuthorityProtector({
  platform = process.platform,
  ...options
} = {}) {
  if (platform !== 'win32') {
    throw authorityError(
      'DEPLOYMENT_SECURE_STORAGE_UNAVAILABLE',
      'Production deployment authority requires an admitted operating-system secure protector.',
    );
  }
  return createWindowsDpapiProtector(options);
}

function writeExclusivePrivate(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const fd = fs.openSync(filePath, 'wx', 0o600);
  try {
    fs.writeFileSync(fd, payload, 'utf8');
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

class FileDeploymentAuthorityStore {
  constructor({
    root,
    protector,
    now = Date.now,
    idFactory = () => crypto.randomUUID(),
    keyPairFactory = generateDeploymentSshKeyPair,
  } = {}) {
    if (!root) throw new TypeError('Deployment authority store requires a root.');
    if (!protector || typeof protector.protect !== 'function' || typeof protector.unprotect !== 'function') {
      throw new TypeError('Deployment authority store requires a secure protector.');
    }
    this.root = path.resolve(root);
    this.protector = protector;
    this.now = now;
    this.idFactory = idFactory;
    this.keyPairFactory = keyPairFactory;
  }

  createSshAuthority({ label = 'HiVenues deployment' } = {}) {
    const id = 'authority-' + this.idFactory();
    const keyPair = this.keyPairFactory();
    const protectedPrivateKey = this.protector.protect(Buffer.from(keyPair.privateKeyPem, 'utf8'));
    const record = {
      version: AUTHORITY_VERSION,
      id,
      kind: 'ssh-key',
      label: String(label || 'HiVenues deployment'),
      protector: this.protector.kind || 'injected-secure-protector',
      algorithm: keyPair.algorithm,
      publicKey: keyPair.publicKeyOpenSsh,
      publicKeyFingerprint: keyPair.publicKeyFingerprint,
      protectedPrivateKey: Buffer.from(protectedPrivateKey).toString('base64'),
      createdAt: new Date(this.now()).toISOString(),
    };
    const filePath = path.join(this.root, id + '.json');
    writeExclusivePrivate(filePath, JSON.stringify(record, null, 2) + '\n');
    return Object.freeze({
      id,
      kind: record.kind,
      label: record.label,
      protector: record.protector,
      algorithm: record.algorithm,
      publicKey: record.publicKey,
      publicKeyFingerprint: record.publicKeyFingerprint,
      createdAt: record.createdAt,
    });
  }

  publicRecord(id) {
    const record = this.readRecord(id);
    return Object.freeze({
      id: record.id,
      kind: record.kind,
      label: record.label,
      protector: record.protector,
      algorithm: record.algorithm,
      publicKey: record.publicKey,
      publicKeyFingerprint: record.publicKeyFingerprint,
      createdAt: record.createdAt,
    });
  }

  withPrivateKey(id, action) {
    if (typeof action !== 'function') throw new TypeError('withPrivateKey requires an action.');
    const record = this.readRecord(id);
    const ciphertext = Buffer.from(record.protectedPrivateKey, 'base64');
    const plaintext = this.protector.unprotect(ciphertext);
    ciphertext.fill(0);

    let result;
    try {
      result = action(plaintext);
    } catch (error) {
      plaintext.fill(0);
      throw error;
    }

    if (result && typeof result.then === 'function') {
      return Promise.resolve(result).finally(() => plaintext.fill(0));
    }
    plaintext.fill(0);
    return result;
  }

  revoke(id) {
    const filePath = this.pathFor(id);
    if (!fs.existsSync(filePath)) return false;
    fs.unlinkSync(filePath);
    return true;
  }

  pathFor(id) {
    if (!/^authority-[A-Za-z0-9._-]+$/.test(String(id || ''))) {
      throw authorityError('DEPLOYMENT_AUTHORITY_ID_INVALID', 'Deployment authority id is invalid.');
    }
    return path.join(this.root, String(id) + '.json');
  }

  readRecord(id) {
    const filePath = this.pathFor(id);
    if (!fs.existsSync(filePath)) {
      throw authorityError('DEPLOYMENT_AUTHORITY_NOT_FOUND', 'Deployment authority was not found.');
    }
    let record;
    try {
      record = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
      throw authorityError('DEPLOYMENT_AUTHORITY_INVALID', 'Deployment authority record could not be read.');
    }
    if (
      !record
      || record.version !== AUTHORITY_VERSION
      || record.id !== id
      || record.kind !== 'ssh-key'
      || typeof record.publicKey !== 'string'
      || typeof record.publicKeyFingerprint !== 'string'
      || typeof record.protectedPrivateKey !== 'string'
      || record.protector !== (this.protector.kind || 'injected-secure-protector')
    ) {
      throw authorityError('DEPLOYMENT_AUTHORITY_INVALID', 'Deployment authority record is invalid.');
    }
    return record;
  }
}

module.exports = {
  FileDeploymentAuthorityStore,
  createPlatformAuthorityProtector,
  createWindowsDpapiProtector,
  generateDeploymentSshKeyPair,
  rsaPublicKeyToOpenSsh,
};
