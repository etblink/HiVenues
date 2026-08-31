'use strict';

const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');

function createGitReader(root) {
  return (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

function listenLoopback(app) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1');
    server.once('error', reject);
    server.once('listening', () => resolve(server));
  });
}

async function closeServer(server) {
  if (!server) return;
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

module.exports = {
  closeServer,
  createGitReader,
  listenLoopback,
  sha256,
};
