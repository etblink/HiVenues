'use strict';

const ASSET_SPECS = Object.freeze({
  HBD: Object.freeze({ precision: 3, nai: '@@000000013' }),
  HIVE: Object.freeze({ precision: 3, nai: '@@000000021' }),
  VESTS: Object.freeze({ precision: 6, nai: '@@000000037' }),
});
const NAI_SYMBOLS = Object.freeze(
  Object.fromEntries(Object.entries(ASSET_SPECS).map(([symbol, spec]) => [spec.nai, symbol])),
);

function parseAssetLike(value, expectedSymbol = null) {
  if (typeof value === 'string') {
    const match = /^(0|[1-9][0-9]*)\.([0-9]+) (HIVE|HBD|VESTS)$/.exec(value);
    if (!match) return null;
    const [, whole, fraction, symbol] = match;
    const spec = ASSET_SPECS[symbol];
    if (!spec || fraction.length !== spec.precision || (expectedSymbol && symbol !== expectedSymbol)) {
      return null;
    }
    return Object.freeze({ symbol, units: BigInt(`${whole}${fraction}`) });
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const symbol = NAI_SYMBOLS[value.nai];
  const spec = symbol ? ASSET_SPECS[symbol] : null;
  if (
    !spec ||
    value.precision !== spec.precision ||
    !/^(0|[1-9][0-9]*)$/.test(String(value.amount ?? '')) ||
    (expectedSymbol && symbol !== expectedSymbol)
  ) {
    return null;
  }
  return Object.freeze({ symbol, units: BigInt(String(value.amount)) });
}

function assetEquivalent(left, right, expectedSymbol = null) {
  const parsedLeft = parseAssetLike(left, expectedSymbol);
  const parsedRight = parsedLeft ? parseAssetLike(right, parsedLeft.symbol) : null;
  return Boolean(
    parsedLeft &&
    parsedRight &&
    parsedLeft.symbol === parsedRight.symbol &&
    parsedLeft.units === parsedRight.units,
  );
}

function transactionOperationTuple(operation) {
  if (Array.isArray(operation) && operation.length === 2) return operation;
  if (operation && typeof operation === 'object' && typeof operation.type === 'string') {
    return [operation.type.replace(/_operation$/, ''), operation.value || {}];
  }
  return [null, null];
}

function semanticValue(value) {
  const asset = parseAssetLike(value);
  if (asset) {
    return Object.freeze({ __hiveAsset: `${asset.symbol}:${asset.units.toString()}` });
  }
  if (Array.isArray(value)) return value.map(semanticValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, semanticValue(value[key])]),
    );
  }
  return value;
}

function semanticEquivalent(left, right) {
  return JSON.stringify(semanticValue(left)) === JSON.stringify(semanticValue(right));
}

function operationEquivalent(expected, actual) {
  const [expectedType, expectedValue] = transactionOperationTuple(expected);
  const [actualType, actualValue] = transactionOperationTuple(actual);
  if (!expectedType || expectedType !== actualType) return false;

  // Preserve the established profile-update observation contract: profile settings are
  // identified by account + exact posting_json_metadata even when RPCs serialize default
  // account_update2 fields differently.
  if (expectedType === 'account_update2') {
    return (
      expectedValue.account === actualValue.account &&
      expectedValue.posting_json_metadata === actualValue.posting_json_metadata
    );
  }

  if (expectedType === 'claim_reward_balance') {
    return (
      expectedValue.account === actualValue.account &&
      assetEquivalent(expectedValue.reward_hive, actualValue.reward_hive, 'HIVE') &&
      assetEquivalent(expectedValue.reward_hbd, actualValue.reward_hbd, 'HBD') &&
      assetEquivalent(expectedValue.reward_vests, actualValue.reward_vests, 'VESTS')
    );
  }

  if (expectedType === 'transfer') {
    return (
      expectedValue.from === actualValue.from &&
      expectedValue.to === actualValue.to &&
      assetEquivalent(expectedValue.amount, actualValue.amount) &&
      expectedValue.memo === actualValue.memo
    );
  }

  // Generic Hive operations are compared after normalizing the two supported operation
  // wrappers, object key order, and legacy-string vs NAI asset encodings. This is required
  // for comment_options because its max_accepted_payout can be returned as a NAI asset.
  return semanticEquivalent(expectedValue, actualValue);
}

function transactionMatchesRecord(record, transaction) {
  const transactionId = String(record?.transactionId || '').toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(transactionId)) return false;
  const actual = Array.isArray(transaction?.operations) ? transaction.operations : [];
  const expected = Array.isArray(record?.operations) ? record.operations : [];
  return (
    String(transaction?.transaction_id || '').toLowerCase() === transactionId &&
    expected.length === actual.length &&
    expected.every((operation, index) => operationEquivalent(operation, actual[index]))
  );
}

module.exports = {
  assetEquivalent,
  operationEquivalent,
  parseAssetLike,
  semanticEquivalent,
  semanticValue,
  transactionMatchesRecord,
  transactionOperationTuple,
};
