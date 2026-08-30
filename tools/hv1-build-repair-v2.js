'use strict';

const fs = require('node:fs');

function replaceOnce(file, before, after) {
  const source = fs.readFileSync(file, 'utf8');
  const first = source.indexOf(before);
  if (first < 0 || source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`Expected exactly one repair target in ${file}: ${before.slice(0, 80)}`);
  }
  fs.writeFileSync(file, source.slice(0, first) + after + source.slice(first + before.length));
}

replaceOnce(
  'src/venue/context.js',
  `        paymentMerchantAccounts: z
          .array(z.string().trim().regex(HIVE_ACCOUNT_PATTERN))
          .min(1)
          .transform((accounts) => [...new Set(accounts)]),`,
  `        paymentMerchantAccounts: z
          .array(z.string().trim().regex(HIVE_ACCOUNT_PATTERN))
          .transform((accounts) => [...new Set(accounts)]),`,
);

replaceOnce(
  'test/ux-1f-homepage.test.js',
  '  assert.match(routeSource, /account:\\s*config\\.hive\\.officialBarAccount/);\n  assert.match(routeSource, /community:\\s*config\\.hive\\.communityId/);',
  '  assert.match(routeSource, /account:\\s*venue\\.hive\\.officialAccount/);\n  assert.match(routeSource, /community:\\s*venue\\.hive\\.communityId/);',
);

const venueTest = 'test/venue-context.test.js';
let tests = fs.readFileSync(venueTest, 'utf8');
const anchor = "test('venue context validation rejects unsafe identity and URL values', () => {";
const insertion = `test('venue context preserves an empty merchant list while Pay is disabled', () => {
  const config = loadConfig(
    {
      NODE_ENV: 'test',
      HIVE_WRITE_MODE: 'disabled',
      HIVE_PAYMENT_ENABLED: 'false',
      HIVE_PAYMENT_MERCHANT_ACCOUNTS: '',
    },
    { loadDotenv: false },
  );
  assert.deepEqual(config.venue.hive.paymentMerchantAccounts, []);
  assert.deepEqual(config.payments.merchantAccounts, []);
  assert.equal(config.payments.enabled, false);
});

`;
const index = tests.indexOf(anchor);
if (index < 0 || tests.indexOf(anchor, index + anchor.length) >= 0) {
  throw new Error('Expected one venue validation test anchor');
}
tests = tests.slice(0, index) + insertion + tests.slice(index);
fs.writeFileSync(venueTest, tests);
