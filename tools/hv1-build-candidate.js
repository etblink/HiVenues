'use strict';

const fs = require('node:fs');
const path = require('node:path');

function replaceOnce(file, before, after) {
  const original = fs.readFileSync(file, 'utf8');
  const first = original.indexOf(before);
  if (first < 0) throw new Error(`Expected text not found in ${file}: ${before.slice(0, 80)}`);
  if (original.indexOf(before, first + before.length) >= 0) {
    throw new Error(`Expected text is not unique in ${file}: ${before.slice(0, 80)}`);
  }
  fs.writeFileSync(file, original.slice(0, first) + after + original.slice(first + before.length));
}

fs.mkdirSync(path.join('src', 'venue', 'reference'), { recursive: true });

fs.writeFileSync(
  path.join('src', 'venue', 'context.js'),
  `'use strict';

const { z } = require('zod');

const VENUE_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,63}$/;
const HIVE_ACCOUNT_PATTERN = /^(?=.{3,64}$)[a-z][a-z0-9-]*(?:\\.[a-z][a-z0-9-]*)*$/;
const COMMUNITY_PATTERN = /^hive-[0-9]{3,12}$/;

function httpsUrl(value, context) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    context.addIssue({ code: 'custom', message: 'Must be a valid URL' });
    return z.NEVER;
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) {
    context.addIssue({ code: 'custom', message: 'Must be a credential-free HTTPS URL' });
    return z.NEVER;
  }
  return parsed.toString();
}

const venueContextSchema = z
  .object({
    id: z.string().trim().regex(VENUE_ID_PATTERN),
    displayName: z.string().trim().min(1).max(80),
    business: z
      .object({
        address: z.string().trim().min(1).max(200),
        phone: z.string().trim().min(1).max(40),
        hours: z.string().trim().min(1).max(120),
        websiteUrl: z.string().trim().transform(httpsUrl),
        mapUrl: z.string().trim().transform(httpsUrl),
      })
      .strict(),
    hive: z
      .object({
        communityId: z.string().trim().regex(COMMUNITY_PATTERN),
        officialAccount: z.string().trim().regex(HIVE_ACCOUNT_PATTERN),
        threadsContainerAccount: z.string().trim().regex(HIVE_ACCOUNT_PATTERN),
        paymentMerchantAccounts: z
          .array(z.string().trim().regex(HIVE_ACCOUNT_PATTERN))
          .min(1)
          .transform((accounts) => [...new Set(accounts)]),
      })
      .strict(),
  })
  .strict();

function createVenueContext(input) {
  const result = venueContextSchema.safeParse(input);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => \`${'${issue.path.join(\'.\') || \'venue\'}'}: ${'${issue.message}'}\`)
      .join('; ');
    throw new Error(\`Invalid venue context: ${'${details}'}\`);
  }
  return deepFreeze(result.data);
}

function withVenueContext(config, venueInput) {
  if (!config || typeof config !== 'object') {
    throw new TypeError('A validated application configuration is required');
  }
  const venue = createVenueContext(venueInput);
  return deepFreeze({
    ...config,
    venue,
    site: {
      ...(config.site || {}),
      name: venue.displayName,
      business: venue.business,
    },
    hive: {
      ...(config.hive || {}),
      communityId: venue.hive.communityId,
      officialAccount: venue.hive.officialAccount,
      officialBarAccount: venue.hive.officialAccount,
      threadsContainerAccount: venue.hive.threadsContainerAccount,
    },
    payments: {
      ...(config.payments || {}),
      merchantAccounts: [...venue.hive.paymentMerchantAccounts],
    },
  });
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

module.exports = {
  COMMUNITY_PATTERN,
  HIVE_ACCOUNT_PATTERN,
  VENUE_ID_PATTERN,
  createVenueContext,
  venueContextSchema,
  withVenueContext,
};
`,
);

fs.writeFileSync(
  path.join('src', 'venue', 'reference', 'fourth-street.js'),
  `'use strict';

const { createVenueContext } = require('../context');

const FOURTH_STREET_REFERENCE_VENUE = createVenueContext({
  id: 'fourth-street-bar-reno',
  displayName: '4th Street Bar',
  business: {
    address: '1114 E. 4th Street, Reno, NV 89512',
    phone: '(775) 324-7827',
    hours: 'Daily, 12:00 p.m.–2:00 a.m.',
    websiteUrl: 'https://4thstreetbarreno.com/',
    mapUrl:
      'https://www.google.com/maps/search/?api=1&query=1114%20E.%204th%20Street%2C%20Reno%2C%20NV%2089512',
  },
  hive: {
    communityId: 'hive-108590',
    officialAccount: 'fourthstreetbar',
    threadsContainerAccount: 'fourthst.threads',
    paymentMerchantAccounts: ['fourthstreetbar'],
  },
});

module.exports = { FOURTH_STREET_REFERENCE_VENUE };
`,
);

replaceOnce(
  'src/config.js',
  "const { parseAsset } = require('./hive/assets');",
  "const { parseAsset } = require('./hive/assets');\nconst { createVenueContext, withVenueContext } = require('./venue/context');\nconst { FOURTH_STREET_REFERENCE_VENUE } = require('./venue/reference/fourth-street');",
);
replaceOnce(
  'src/config.js',
  "    BIND_HOST: z.enum(['127.0.0.1', '::1', '0.0.0.0', '::']).default('127.0.0.1'),\n    SITE_NAME: z.string().trim().min(1).max(80).default('4th Street Bar'),",
  "    BIND_HOST: z.enum(['127.0.0.1', '::1', '0.0.0.0', '::']).default('127.0.0.1'),\n    VENUE_ID: z.string().trim().default(FOURTH_STREET_REFERENCE_VENUE.id),\n    SITE_NAME: z.string().trim().min(1).max(80).default(FOURTH_STREET_REFERENCE_VENUE.displayName),",
);
replaceOnce('src/config.js', ".default('1114 E. 4th Street, Reno, NV 89512'),", '.default(FOURTH_STREET_REFERENCE_VENUE.business.address),');
replaceOnce('src/config.js', "    BAR_PHONE: z.string().trim().min(1).max(40).default('(775) 324-7827'),", '    BAR_PHONE: z.string().trim().min(1).max(40).default(FOURTH_STREET_REFERENCE_VENUE.business.phone),');
replaceOnce('src/config.js', "    BAR_HOURS: z.string().trim().min(1).max(120).default('Daily, 12:00 p.m.–2:00 a.m.'),", '    BAR_HOURS: z.string().trim().min(1).max(120).default(FOURTH_STREET_REFERENCE_VENUE.business.hours),');
replaceOnce('src/config.js', ".default('https://4thstreetbarreno.com/')", '.default(FOURTH_STREET_REFERENCE_VENUE.business.websiteUrl)');
replaceOnce(
  'src/config.js',
  ".default(\n        'https://www.google.com/maps/search/?api=1&query=1114%20E.%204th%20Street%2C%20Reno%2C%20NV%2089512',\n      )",
  '.default(FOURTH_STREET_REFERENCE_VENUE.business.mapUrl)',
);
replaceOnce('src/config.js', "    HIVE_COMMUNITY_ID: z.string().trim().regex(COMMUNITY_PATTERN).default('hive-108590'),", '    HIVE_COMMUNITY_ID: z.string().trim().regex(COMMUNITY_PATTERN).default(FOURTH_STREET_REFERENCE_VENUE.hive.communityId),');
replaceOnce('src/config.js', ".default('fourthstreetbar'),\n    THREADS_CONTAINER_ACCOUNT:", '.default(FOURTH_STREET_REFERENCE_VENUE.hive.officialAccount),\n    THREADS_CONTAINER_ACCOUNT:');
replaceOnce('src/config.js', ".default('fourthst.threads'),", '.default(FOURTH_STREET_REFERENCE_VENUE.hive.threadsContainerAccount),');
replaceOnce(
  'src/config.js',
  "      .string()\n      .default('fourthstreetbar')\n      .transform(parseAccountList),",
  "      .string()\n      .default(FOURTH_STREET_REFERENCE_VENUE.hive.paymentMerchantAccounts.join(','))\n      .transform(parseAccountList),",
);
replaceOnce(
  'src/config.js',
  "  { loadDotenv = source === process.env, allowV1Production = false } = {},",
  '  { loadDotenv = source === process.env, allowV1Production = false, venue: venueOverride = null } = {},',
);
replaceOnce(
  'src/config.js',
  '  const config = {',
  `  const venue = venueOverride
    ? createVenueContext(venueOverride)
    : createVenueContext({
        id: result.data.VENUE_ID,
        displayName: result.data.SITE_NAME,
        business: {
          address: result.data.BAR_ADDRESS,
          phone: result.data.BAR_PHONE,
          hours: result.data.BAR_HOURS,
          websiteUrl: result.data.BAR_WEBSITE_URL,
          mapUrl: result.data.BAR_MAP_URL,
        },
        hive: {
          communityId: result.data.HIVE_COMMUNITY_ID,
          officialAccount: result.data.HIVE_OFFICIAL_BAR_ACCOUNT,
          threadsContainerAccount: result.data.THREADS_CONTAINER_ACCOUNT,
          paymentMerchantAccounts: result.data.HIVE_PAYMENT_MERCHANT_ACCOUNTS,
        },
      });

  const config = {`,
);
replaceOnce('src/config.js', '  return deepFreeze(config);', '  return withVenueContext(config, venue);');

replaceOnce(
  'src/app.js',
  "const { loadConfig } = require('./config');",
  "const { loadConfig } = require('./config');\nconst { withVenueContext } = require('./venue/context');",
);
replaceOnce(
  'src/app.js',
  '  const config = options.config || loadConfig();\n  const logger = options.logger || createLogger(config);',
  '  const baseConfig = options.config || loadConfig();\n  const config = options.venue ? withVenueContext(baseConfig, options.venue) : baseConfig;\n  const venue = config.venue;\n  const logger = options.logger || createLogger(config);',
);
replaceOnce(
  'src/app.js',
  '  app.locals.config = config;\n  app.locals.onboardingConfig = onboardingConfig;\n  app.locals.siteName = config.site.name;\n  app.locals.business = config.site.business;\n  app.locals.communityId = config.hive.communityId;\n  app.locals.threadsContainerAccount = config.hive.threadsContainerAccount;',
  '  app.locals.config = config;\n  app.locals.venue = venue;\n  app.locals.onboardingConfig = onboardingConfig;\n  app.locals.siteName = venue.displayName;\n  app.locals.business = venue.business;\n  app.locals.communityId = venue.hive.communityId;\n  app.locals.threadsContainerAccount = venue.hive.threadsContainerAccount;',
);

replaceOnce('routes/index.js', '    const { config, services } = req.app.locals;', '    const { services, venue } = req.app.locals;');
replaceOnce(
  'routes/index.js',
  '        account: config.hive.officialBarAccount,\n        community: config.hive.communityId,',
  '        account: venue.hive.officialAccount,\n        community: venue.hive.communityId,',
);
replaceOnce(
  'routes/index.js',
  '      merchants: req.app.locals.config.payments.merchantAccounts,',
  '      merchants: req.app.locals.venue.hive.paymentMerchantAccounts,',
);

fs.writeFileSync(
  path.join('test', 'venue-context.test.js'),
  `'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { createApp } = require('../src/app');
const { loadConfig } = require('../src/config');
const { createVenueContext } = require('../src/venue/context');
const { FOURTH_STREET_REFERENCE_VENUE } = require('../src/venue/reference/fourth-street');

function testConfig(options = {}) {
  return loadConfig(
    { NODE_ENV: 'test', HIVE_WRITE_MODE: 'disabled' },
    { loadDotenv: false, ...options },
  );
}

function syntheticVenue() {
  return createVenueContext({
    id: 'synthetic-venue',
    displayName: 'Synthetic Venue',
    business: {
      address: '1 Test Avenue, Example, NV 89000',
      phone: '(555) 010-2000',
      hours: 'Daily, 10:00 a.m.–10:00 p.m.',
      websiteUrl: 'https://venue.example/',
      mapUrl: 'https://venue.example/map',
    },
    hive: {
      communityId: 'hive-123456',
      officialAccount: 'syntheticvenue',
      threadsContainerAccount: 'synthetic.threads',
      paymentMerchantAccounts: ['syntheticvenue'],
    },
  });
}

test('default configuration compiles the canonical Fourth Street reference venue', () => {
  const config = testConfig();
  assert.deepEqual(config.venue, FOURTH_STREET_REFERENCE_VENUE);
  assert.equal(config.site.name, config.venue.displayName);
  assert.deepEqual(config.site.business, config.venue.business);
  assert.equal(config.hive.communityId, config.venue.hive.communityId);
  assert.equal(config.hive.officialAccount, config.venue.hive.officialAccount);
  assert.equal(config.hive.officialBarAccount, config.venue.hive.officialAccount);
  assert.equal(config.hive.threadsContainerAccount, config.venue.hive.threadsContainerAccount);
  assert.deepEqual(config.payments.merchantAccounts, config.venue.hive.paymentMerchantAccounts);
  assert.equal(Object.isFrozen(config.venue), true);
  assert.equal(Object.isFrozen(config.venue.business), true);
  assert.equal(Object.isFrozen(config.venue.hive), true);
});

test('explicit synthetic venue context rebinds application venue-scoped identity without network access', () => {
  const venue = syntheticVenue();
  const config = testConfig();
  const app = createApp({
    config,
    venue,
    deploymentIdentity: { build: 'test', commit: 'test', tree: 'test' },
  });

  assert.equal(app.locals.venue.id, 'synthetic-venue');
  assert.equal(app.locals.siteName, 'Synthetic Venue');
  assert.equal(app.locals.business.address, '1 Test Avenue, Example, NV 89000');
  assert.equal(app.locals.config.hive.communityId, 'hive-123456');
  assert.equal(app.locals.config.hive.officialAccount, 'syntheticvenue');
  assert.equal(app.locals.config.hive.officialBarAccount, 'syntheticvenue');
  assert.equal(app.locals.config.hive.threadsContainerAccount, 'synthetic.threads');
  assert.deepEqual(app.locals.config.payments.merchantAccounts, ['syntheticvenue']);
  assert.equal(app.locals.config.hive.writeMode, config.hive.writeMode);
  assert.equal(app.locals.config.hive.appTag, config.hive.appTag);

  app.locals.services.receiptStore?.close?.();
});

test('loadConfig accepts an explicit venue without changing deployment safety settings', () => {
  const venue = syntheticVenue();
  const config = testConfig({ venue });
  assert.deepEqual(config.venue, venue);
  assert.equal(config.hive.writeMode, 'disabled');
  assert.equal(config.hive.writesEnabled, false);
  assert.equal(config.payments.enabled, false);
  assert.equal(config.hive.appTag, 'fourth-street-bar-app/0.1.0');
});

test('generic app and primary route wiring contain no canonical Fourth Street identifiers', () => {
  const files = ['src/app.js', 'routes/index.js'];
  const forbidden = /fourthstreetbar|fourthst\\.threads|hive-108590|1114 E\\. 4th Street|4thstreetbarreno\\.com/i;
  for (const file of files) {
    const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    assert.doesNotMatch(source, forbidden, file);
  }
});

test('venue context validation rejects unsafe identity and URL values', () => {
  assert.throws(
    () => createVenueContext({ ...syntheticVenue(), id: 'Synthetic Venue' }),
    /Invalid venue context/,
  );
  assert.throws(
    () =>
      createVenueContext({
        ...syntheticVenue(),
        business: { ...syntheticVenue().business, websiteUrl: 'http://venue.example/' },
      }),
    /credential-free HTTPS URL/,
  );
});
`,
);
