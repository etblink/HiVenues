'use strict';

const { TextDecoder } = require('node:util');

const B64U_LOOKUP = Object.freeze({
  '/': '_',
  '_': '/',
  '+': '-',
  '-': '+',
  '=': '.',
  '.': '=',
});
const B64U_PATTERN = /^[A-Za-z0-9_.-]*$/;
const RESOLVE_PATTERN = /(__(ref_block_(num|prefix)|expiration|signer))/g;
const UTF8_DECODER = new TextDecoder('utf-8', { fatal: true });

function decodeBase64u(value) {
  if (typeof value !== 'string' || !B64U_PATTERN.test(value) || value.length % 4 === 1) {
    throw new Error('Invalid base64u value');
  }
  try {
    const normalized = value.replace(/(-|_|\.)/g, (match) => B64U_LOOKUP[match]);
    const binary = atob(normalized);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return UTF8_DECODER.decode(bytes);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Invalid base64u value');
  }
}

function decodeQuery(search) {
  return Object.fromEntries(
    search
      .substring(1)
      .split('&')
      .filter(Boolean)
      .map((parameter) => {
        const [key, value = ''] = parameter.split('=');
        return [decodeURIComponent(key), decodeURIComponent(value)];
      }),
  );
}

function transactionForOperations(operations) {
  return {
    ref_block_num: '__ref_block_num',
    ref_block_prefix: '__ref_block_prefix',
    expiration: '__expiration',
    extensions: [],
    operations,
  };
}

function decodeHiveSigningUri(hiveUrl) {
  if (typeof hiveUrl !== 'string') throw new Error('Hive URI must be a string');
  const protocol = hiveUrl.slice(0, 5);
  let url;
  try {
    url = new URL(hiveUrl.replace(/^hive:/, 'http:'));
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Invalid Hive URI');
  }
  if (protocol !== 'hive:') {
    throw new Error(`Invalid protocol, expected 'hive:' got '${protocol}'`);
  }
  if (url.host !== 'sign') {
    throw new Error(`Invalid action, expected 'sign' got '${url.host}'`);
  }

  const pathParts = url.pathname.split('/').slice(1);
  const [type, rawPayload] = pathParts;
  let tx;

  if (type === 'transfer') {
    if (pathParts.length < 3 || pathParts.length > 4 || !pathParts[1] || !pathParts[2]) {
      throw new Error('Invalid transfer action');
    }
    try {
      tx = transactionForOperations([[
        'transfer',
        {
          from: '__signer',
          to: decodeURIComponent(pathParts[1]),
          amount: decodeURIComponent(pathParts[2]),
          memo: pathParts[3] ? decodeBase64u(pathParts[3]) : '',
        },
      ]]);
    } catch (error) {
      throw new Error(
        `Invalid transfer payload: ${error instanceof Error ? error.message : 'invalid value'}`,
      );
    }
  } else {
    let payload;
    try {
      payload = JSON.parse(decodeBase64u(rawPayload));
    } catch (error) {
      throw new Error(`Invalid payload: ${error instanceof Error ? error.message : 'invalid value'}`);
    }
    switch (type) {
      case 'tx':
        tx = payload;
        break;
      case 'op':
        tx = transactionForOperations([payload]);
        break;
      case 'ops':
        tx = transactionForOperations(payload);
        break;
      case 'msg':
        tx = payload;
        break;
      default:
        throw new Error(`Invalid signing action '${type}'`);
    }
  }

  const queryParams = decodeQuery(url.search);
  const params = {};
  if (queryParams.cb) params.callback = decodeBase64u(queryParams.cb);
  if (queryParams.nb !== undefined) params.no_broadcast = true;
  if (queryParams.a) params.authority = queryParams.a;
  if (queryParams.s) params.signer = queryParams.s;
  return { tx, params };
}

function resolveHiveSigningTransaction(unresolvedTransaction, params, options) {
  const signer = params.signer || options.preferred_signer;
  if (!options.signers.includes(signer)) {
    throw new Error(`Signer '${signer}' not available`);
  }
  const context = {
    __ref_block_num: options.ref_block_num,
    __ref_block_prefix: options.ref_block_prefix,
    __expiration: options.expiration,
    __signer: signer,
  };

  function walk(value) {
    let type = typeof value;
    if (type === 'object' && Array.isArray(value)) type = 'array';
    else if (value === null) type = 'null';

    switch (type) {
      case 'string':
        return value.replace(RESOLVE_PATTERN, (match) => context[match]);
      case 'array':
        return value.map(walk);
      case 'object': {
        const result = {};
        for (const [key, child] of Object.entries(value)) result[key] = walk(child);
        return result;
      }
      default:
        return value;
    }
  }

  return { signer, tx: walk(unresolvedTransaction) };
}

module.exports = {
  decodeHiveSigningUri,
  resolveHiveSigningTransaction,
};
