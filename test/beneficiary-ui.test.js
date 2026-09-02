'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { beneficiaryPercentLabel, creatorDonationField } = require('../src/hive/beneficiary-ui');

test('creator donation UI is absent when venue policy is disabled', () => {
  assert.equal(creatorDonationField({
    hive: {
      officialAccount: 'fourthstreetbar',
      beneficiaryPolicy: { creatorDonation: { enabled: false, weight: null } },
    },
  }), null);
});

test('creator donation UI is explicitly unchecked and names author reward percentage', () => {
  const field = creatorDonationField({
    hive: {
      officialAccount: 'fourthstreetbar',
      beneficiaryPolicy: { creatorDonation: { enabled: true, weight: 125 } },
    },
  }, 'thread-donation');
  assert.equal(field.id, 'thread-donation');
  assert.equal(field.name, 'creatorDonation');
  assert.equal(field.checked, false);
  assert.match(field.label, /1\.25%/);
  assert.match(field.label, /author reward/);
  assert.match(field.label, /@fourthstreetbar/);
  assert.match(field.help, /unchecked by default/);
});

test('beneficiary percentage formatting is exact for basis-point weights', () => {
  assert.equal(beneficiaryPercentLabel(100), '1%');
  assert.equal(beneficiaryPercentLabel(125), '1.25%');
  assert.equal(beneficiaryPercentLabel(10_000), '100%');
});
