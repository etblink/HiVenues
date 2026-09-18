'use strict';

const { requireHiveAccount } = require('../http/validation');
const { ConflictError, ValidationError } = require('../lib/errors');
const { parseAsset } = require('../hive/assets');
const { fingerprint } = require('../hive/social-operations');

const SUPPORT_MEMO = 'hivenues-support:v1';
const SUPPORT_ASSETS = new Set(['HIVE', 'HBD']);

function canonicalSupportAmount(value, symbol) {
  const asset = String(symbol || '').trim().toUpperCase();
  if (!SUPPORT_ASSETS.has(asset)) {
    throw new ValidationError('Direct support is available only in HIVE or HBD');
  }
  const raw = String(value || '').trim();
  const parsed = parseAsset(raw.includes(' ') ? raw : raw + ' ' + asset, asset);
  if (!parsed || parsed.units <= 0n) {
    throw new ValidationError('Support amount must be a positive amount with exactly three decimals');
  }
  return parsed;
}

function currentLiquidBalance(accountRecord, symbol) {
  const raw = symbol === 'HIVE' ? accountRecord?.balance : accountRecord?.hbd_balance;
  const parsed = parseAsset(raw, symbol);
  if (!parsed) throw new ValidationError('Current ' + symbol + ' balance is unavailable');
  return parsed;
}

function buildDirectSupport({
  account: accountValue,
  recipient: recipientValue,
  amount,
  asset,
  senderRecord,
  recipientRecord,
}) {
  const account = requireHiveAccount(accountValue);
  const recipient = requireHiveAccount(recipientValue, 'Host value recipient');
  if (account === recipient) {
    throw new ConflictError('The verified account is already the host value recipient', {
      code: 'SUPPORT_SELF_RECIPIENT',
    });
  }
  if (!senderRecord || senderRecord.name !== account) {
    throw new ValidationError('Current sender balance is unavailable');
  }
  if (!recipientRecord || recipientRecord.name !== recipient) {
    throw new ValidationError('The released host value recipient is unavailable on Hive');
  }

  const requested = canonicalSupportAmount(amount, asset);
  const balance = currentLiquidBalance(senderRecord, requested.symbol);
  if (requested.units > balance.units) {
    throw new ConflictError(
      'The requested support amount is greater than the current ' + requested.symbol + ' balance',
      { code: 'SUPPORT_BALANCE_INSUFFICIENT' },
    );
  }

  const operation = Object.freeze([
    'transfer',
    Object.freeze({
      from: account,
      to: recipient,
      amount: requested.canonical,
      memo: SUPPORT_MEMO,
    }),
  ]);
  const operations = Object.freeze([operation]);

  return Object.freeze({
    action: 'support-host',
    account,
    authority: 'Active',
    operations,
    fingerprint: fingerprint(operations),
    summary: Object.freeze({
      kind: 'Direct host support',
      sender: account,
      recipient,
      amount: requested.canonical,
      asset: requested.symbol,
      availableBalance: balance.canonical,
      memo: SUPPORT_MEMO,
    }),
  });
}

module.exports = {
  SUPPORT_ASSETS,
  SUPPORT_MEMO,
  buildDirectSupport,
  canonicalSupportAmount,
  currentLiquidBalance,
};
