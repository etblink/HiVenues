'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');

const {
  Server,
  utils: {
    generateKeyPairSync,
    parseKey,
  },
} = require('ssh2');

const {
  READ_ONLY_INSPECTION_COMMAND,
  Ssh2ReadOnlyVerificationTransport,
  hostKeyFingerprint,
  parseInspectionOutput,
} = require('../src/product/ssh2-readonly-transport');

function equalBuffer(left, right) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function createLoopbackSshServer(t) {
  const hostKeys = generateKeyPairSync('rsa', { bits: 2048 });
  const clientKeys = generateKeyPairSync('rsa', { bits: 2048 });
  const allowedPublic = parseKey(clientKeys.public);
  const expectedHostFingerprint = hostKeyFingerprint(parseKey(hostKeys.public).getPublicSSH());
  const evidence = {
    authenticationAttempts: 0,
    sessions: 0,
    commands: [],
  };

  const server = new Server({
    hostKeys: [hostKeys.private],
  }, (client) => {
    client.on('authentication', (ctx) => {
      evidence.authenticationAttempts += 1;
      if (ctx.username !== 'root' || ctx.method !== 'publickey') {
        ctx.reject();
        return;
      }
      if (
        ctx.key.algo !== allowedPublic.type
        || !equalBuffer(ctx.key.data, allowedPublic.getPublicSSH())
        || (
          ctx.signature
          && allowedPublic.verify(ctx.blob, ctx.signature, ctx.hashAlgo) !== true
        )
      ) {
        ctx.reject();
        return;
      }
      ctx.accept();
    }).on('ready', () => {
      client.on('session', (accept) => {
        evidence.sessions += 1;
        const session = accept();
        session.once('exec', (acceptExec, rejectExec, info) => {
          evidence.commands.push(info.command);
          if (info.command !== READ_ONLY_INSPECTION_COMMAND) {
            rejectExec();
            return;
          }
          const stream = acceptExec();
          stream.write([
            'HIVENUES_OS=Debian GNU/Linux 13',
            'HIVENUES_ARCH=x86_64',
            'HIVENUES_MEMORY_KB=1048576',
            'HIVENUES_DISK_KB=20971520',
            '',
          ].join('\n'));
          stream.exit(0);
          stream.end();
        });
      });
    });
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.removeListener('error', reject);
      resolve();
    });
  });

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  return {
    port: server.address().port,
    privateKey: Buffer.from(clientKeys.private),
    expectedHostFingerprint,
    evidence,
  };
}

test('Era 7 Stage 2B: inspection output parser accepts only complete bounded read-only facts', () => {
  assert.deepEqual(
    parseInspectionOutput([
      'HIVENUES_OS=Debian GNU/Linux 13',
      'HIVENUES_ARCH=x86_64',
      'HIVENUES_MEMORY_KB=1048576',
      'HIVENUES_DISK_KB=20971520',
      '',
    ].join('\n')),
    {
      os: 'Debian GNU/Linux 13',
      architecture: 'x86_64',
      memoryMb: 1024,
      diskMb: 20480,
    },
  );

  assert.throws(
    () => parseInspectionOutput('HIVENUES_OS=Debian\nHIVENUES_ARCH=x86_64\n'),
    (error) => error.code === 'DEPLOYMENT_INSPECTION_INVALID',
  );
});

test('Era 7 Stage 2B: loopback SSH observation and inspection enforce host trust before authentication', async (t) => {
  const fixture = await createLoopbackSshServer(t);
  const transport = new Ssh2ReadOnlyVerificationTransport({
    readyTimeoutMs: 5000,
  });
  const target = {
    host: '127.0.0.1',
    port: fixture.port,
    username: 'root',
  };

  const observed = await transport.observeHostKey(target);
  assert.equal(observed, fixture.expectedHostFingerprint);
  assert.equal(fixture.evidence.authenticationAttempts, 0);
  assert.equal(fixture.evidence.sessions, 0);
  assert.deepEqual(fixture.evidence.commands, []);

  const wrongFingerprint = 'SHA256:' + 'A'.repeat(43);
  await assert.rejects(
    () => transport.inspect({
      ...target,
      expectedHostKeyFingerprint: wrongFingerprint,
      privateKey: fixture.privateKey,
    }),
    (error) => error.code === 'DEPLOYMENT_HOST_KEY_CHANGED',
  );
  assert.equal(fixture.evidence.authenticationAttempts, 0);
  assert.equal(fixture.evidence.sessions, 0);
  assert.deepEqual(fixture.evidence.commands, []);

  const inspection = await transport.inspect({
    ...target,
    expectedHostKeyFingerprint: fixture.expectedHostFingerprint,
    privateKey: fixture.privateKey,
  });
  assert.deepEqual(inspection, {
    os: 'Debian GNU/Linux 13',
    architecture: 'x86_64',
    memoryMb: 1024,
    diskMb: 20480,
  });
  assert.ok(fixture.evidence.authenticationAttempts >= 1);
  assert.equal(fixture.evidence.sessions, 1);
  assert.deepEqual(fixture.evidence.commands, [READ_ONLY_INSPECTION_COMMAND]);
});

test('Era 7 Stage 2B: host fingerprint is OpenSSH SHA256 over the raw host-key blob', () => {
  const keys = generateKeyPairSync('rsa', { bits: 2048 });
  const raw = parseKey(keys.public).getPublicSSH();
  const expected = 'SHA256:' + crypto
    .createHash('sha256')
    .update(raw)
    .digest('base64')
    .replace(/=+$/, '');
  assert.equal(hostKeyFingerprint(raw), expected);
});
