'use strict';

const HIVE_MIN_ACCOUNT_NAME_LENGTH = 3;
const HIVE_MAX_ACCOUNT_NAME_LENGTH = 16;
const HIVE_ACCOUNT_PATTERN = /^(?=.{3,16}$)[a-z][a-z0-9-]+[a-z0-9](?:\.[a-z][a-z0-9-]+[a-z0-9])*$/;

function isValidHiveAccountName(value) {
  return typeof value === 'string' && HIVE_ACCOUNT_PATTERN.test(value);
}

module.exports = {
  HIVE_ACCOUNT_PATTERN,
  HIVE_MAX_ACCOUNT_NAME_LENGTH,
  HIVE_MIN_ACCOUNT_NAME_LENGTH,
  isValidHiveAccountName,
};
