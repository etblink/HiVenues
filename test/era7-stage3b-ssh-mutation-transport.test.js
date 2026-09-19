'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  Server,
  sftp: {
    OPEN_MODE,
    STATUS_CODE,
  },
  utils: {
    generateKeyPairSync,
    parseKey,
  },
} = require('ssh2');

const {
  Ssh2PinnedMutationTransport,
  listTree,
} = require('../src/deploy/ssh2-mutation-transport');
const { hostKeyFingerprint } = require('../src/product/ssh2-readonly-transport');

function equalBuffer(left, right) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function createLoopbackMutationServer(t) {
  const hostKeys = generateKeyPairSync('rsa', { bits: 2048 });
  const clientKeys = generateKeyPairSync('rsa', { bits: 2048 });
  const allowedPublic = parseKey(clientKeys.public);
  const expectedHostFingerprint = hostKeyFingerprint(
    parseKey(hostKeys.public).getPublicSSH(),
  );
  const evidence = {
    authenticationAttempts: 0,
    authenticatedUsers: [],
    execCommands: [],
    files: new Map(),
  };

  const server = new Server({ hostKeys: [hostKeys.private] }, (client) => {
    client.on('error', () => {});
    client.on('authentication', (ctx) => {
      evidence.authenticationAttempts += 1;
      if (ctx.method !== 'publickey') {
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
      evidence.authenticatedUsers.push(ctx.username);
      ctx.accept();
    }).on('ready', () => {
      client.on('session', (accept) => {
        const session = accept();

        session.on('exec', (acceptExec, _rejectExec, info) => {
          evidence.execCommands.push(info.command);
          const stream = acceptExec();
          if (info.command === 'printf mutation-ok') {
            stream.write('mutation-ok');
          }
          stream.exit(0);
          stream.end();
        });

        session.on('sftp', (acceptSftp) => {
          const sftp = acceptSftp();
          const handles = new Map();
          let handleCounter = 0;

          sftp.on('OPEN', (reqid, filename, flags) => {
            if (!(flags & OPEN_MODE.WRITE)) {
              sftp.status(reqid, STATUS_CODE.FAILURE);
              return;
            }
            const handle = Buffer.alloc(4);
            const id = handleCounter++;
            handle.writeUInt32BE(id, 0);
            handles.set(id, {
              filename,
              data: Buffer.alloc(0),
            });
            sftp.handle(reqid, handle);
          });

          sftp.on('WRITE', (reqid, handle, offset, data) => {
            const id = handle.length === 4 ? handle.readUInt32BE(0) : -1;
            const record = handles.get(id);
            if (!record) {
              sftp.status(reqid, STATUS_CODE.FAILURE);
              return;
            }
            const required = offset + data.length;
            if (record.data.length < required) {
              const next = Buffer.alloc(required);
              record.data.copy(next);
              record.data = next;
            }
            Buffer.from(data).copy(record.data, offset);
            sftp.status(reqid, STATUS_CODE.OK);
          });

          sftp.on('CLOSE', (reqid, handle) => {
            const id = handle.length === 4 ? handle.readUInt32BE(0) : -1;
            const record = handles.get(id);
            if (!record) {
              sftp.status(reqid, STATUS_CODE.FAILURE);
              return;
            }
            evidence.files.set(record.filename, Buffer.from(record.data));
            handles.delete(id);
            sftp.status(reqid, STATUS_CODE.OK);
          });
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

test('Era 7 Stage 3B: mutation transport rejects wrong host key before authentication', async (t) => {
  const fixture = await createLoopbackMutationServer(t);
  const transport = new Ssh2PinnedMutationTransport({
    readyTimeoutMs: 5000,
  });

  await assert.rejects(
    () => transport.withSession({
      target: {
        host: '127.0.0.1',
        port: fixture.port,
        username: 'root',
      },
      expectedHostKeyFingerprint: 'SHA256:' + 'A'.repeat(43),
      privateKey: fixture.privateKey,
    }, async () => {}),
    (error) => error.code === 'DEPLOYMENT_HOST_KEY_CHANGED',
  );

  assert.equal(fixture.evidence.authenticationAttempts, 0);
  assert.deepEqual(fixture.evidence.authenticatedUsers, []);
  assert.deepEqual(fixture.evidence.execCommands, []);
  assert.equal(fixture.evidence.files.size, 0);
});

test('Era 7 Stage 3B: exact pinned host permits bounded exec and recursive SFTP upload', async (t) => {
  const fixture = await createLoopbackMutationServer(t);
  const transport = new Ssh2PinnedMutationTransport({
    readyTimeoutMs: 5000,
  });
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-era7-stage3b-wire-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  fs.mkdirSync(path.join(root, 'nested'), { recursive: true });
  fs.writeFileSync(path.join(root, 'alpha.txt'), 'alpha\n');
  fs.writeFileSync(path.join(root, 'nested', 'beta.txt'), 'beta\n');

  const result = await transport.withSession({
    target: {
      host: '127.0.0.1',
      port: fixture.port,
      username: 'root',
    },
    expectedHostKeyFingerprint: fixture.expectedHostFingerprint,
    privateKey: fixture.privateKey,
  }, async (session) => {
    const command = await session.exec('printf mutation-ok');
    await session.uploadTree(root, '/var/tmp/hivenues-stage3b-wire');
    return command.stdout;
  });

  assert.equal(result, 'mutation-ok');
  assert.ok(fixture.evidence.authenticationAttempts >= 1);
  assert.deepEqual(
    [...new Set(fixture.evidence.authenticatedUsers)],
    ['root'],
  );
  assert.equal(
    fixture.evidence.execCommands.includes('printf mutation-ok'),
    true,
  );
  assert.equal(
    fixture.evidence.execCommands.some((value) => (
      value.includes("install -d -m 0700")
      && value.includes("/var/tmp/hivenues-stage3b-wire")
    )),
    true,
  );

  assert.equal(
    fixture.evidence.files.get('/var/tmp/hivenues-stage3b-wire/alpha.txt')?.toString('utf8'),
    'alpha\n',
  );
  assert.equal(
    fixture.evidence.files.get('/var/tmp/hivenues-stage3b-wire/nested/beta.txt')?.toString('utf8'),
    'beta\n',
  );
});

test('Era 7 Stage 3B: upload tree rejects symlinks before any remote session', (t) => {
  if (process.platform === 'win32') {
    t.skip('Windows CI does not guarantee unprivileged symlink creation.');
    return;
  }
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-era7-stage3b-symlink-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  fs.writeFileSync(path.join(root, 'target.txt'), 'target');
  fs.symlinkSync('target.txt', path.join(root, 'link.txt'));

  assert.throws(
    () => listTree(root),
    (error) => error.code === 'DEPLOYMENT_UPLOAD_SYMLINK_REJECTED',
  );
});
