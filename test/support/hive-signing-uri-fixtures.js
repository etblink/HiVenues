'use strict';

const B64U_LOOKUP = Object.freeze({ '+': '-', '/': '_', '=': '.' });

function encodeBase64u(value) {
  return Buffer.from(String(value), 'utf8')
    .toString('base64')
    .replace(/(\+|\/|=)/g, (match) => B64U_LOOKUP[match]);
}

function encodeParameters(params = {}) {
  const parts = [];
  if (params.no_broadcast) parts.push('nb=');
  if (params.signer) parts.push(`s=${params.signer}`);
  if (params.callback) parts.push(`cb=${encodeBase64u(params.callback)}`);
  if (params.authority) parts.push(`a=${params.authority}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

function encodeJson(value) {
  return encodeBase64u(JSON.stringify(value));
}

function encodeTx(tx, params = {}) {
  return `hive://sign/tx/${encodeJson(tx)}${encodeParameters(params)}`;
}

function encodeOp(operation, params = {}) {
  return `hive://sign/op/${encodeJson(operation)}${encodeParameters(params)}`;
}

function encodeOps(operations, params = {}) {
  return `hive://sign/ops/${encodeJson(operations)}${encodeParameters(params)}`;
}

function encodeMsg(message, params = {}) {
  return `hive://sign/msg/${encodeJson(message)}${encodeParameters(params)}`;
}

module.exports = {
  encodeBase64u,
  encodeMsg,
  encodeOp,
  encodeOps,
  encodeTx,
};
