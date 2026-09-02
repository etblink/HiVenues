'use strict';

const MAX_BENEFICIARY_WEIGHT = 10_000;

function beneficiaryPercentLabel(weightValue) {
  const weight = Number(weightValue);
  if (!Number.isInteger(weight) || weight < 1 || weight > MAX_BENEFICIARY_WEIGHT) {
    throw new TypeError('Beneficiary weight must be a whole number from 1 to 10000');
  }
  const percent = weight / 100;
  return Number.isInteger(percent)
    ? `${percent}%`
    : `${percent.toFixed(2).replace(/0+$/u, '').replace(/\.$/u, '')}%`;
}

function creatorDonationField(config, id = 'creator-donation') {
  const policy = config?.hive?.beneficiaryPolicy?.creatorDonation;
  if (!policy?.enabled) return null;
  const account = String(config?.hive?.officialAccount || '').trim().toLowerCase();
  if (!account) throw new TypeError('Official venue account is required for creator donation');
  const percent = beneficiaryPercentLabel(policy.weight);
  return Object.freeze({
    id: String(id || 'creator-donation'),
    name: 'creatorDonation',
    type: 'checkbox',
    value: 'true',
    checked: false,
    label: `Donate ${percent} of this content’s author reward to @${account}`,
    help: 'Optional and unchecked by default. The exact beneficiary operation is shown in review before Hive Keychain opens.',
  });
}

module.exports = { beneficiaryPercentLabel, creatorDonationField };
