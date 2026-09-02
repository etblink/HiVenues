'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { isValidHiveAccountName } = require('../src/hive/account-name');

test('Hive account validator matches protocol label grammar and 16-byte account type', () => {
  for (const account of [
    'abc',
    'fourthstreetbar',
    'fourthst.threads',
    'abc-def',
    'abc.def',
  ]) {
    assert.equal(isValidHiveAccountName(account), true, account);
  }

  for (const account of [
    'ab',
    'abc-',
    '-abc',
    'ab.cd',
    'abc.de',
    'abc..def',
    'ABC',
    'abcdefghijklmnopq',
  ]) {
    assert.equal(isValidHiveAccountName(account), false, account);
  }
});
