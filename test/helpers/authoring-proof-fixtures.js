'use strict';

const { seedHiVenuesHosts } = require('../../src/product/fixtures');
const { getMaximalTerritoryHost } = require('../../src/product/territory-fixture');
const { validateHostGraph } = require('../../src/product/model');

// Deliberately synthetic, in-memory qualification specimens. Never import these
// into the operator's retained workspace or infer ownership from their names.
function authoringProofCases() {
  const cases = [];
  for (const family of ['poster', 'editorial', 'hospitality']) {
    for (const schemaVersion of [1, 2]) {
      for (const density of ['sparse', 'dense']) {
        const host = schemaVersion === 2 ? getMaximalTerritoryHost()
          : seedHiVenuesHosts().find((item) => item.presentation.compositionFamily === family);
        host.presentation.compositionFamily = family;
        host.intent.direction = family;
        host.bindings.hive.valueRecipient = 'proof-recipient';
        if (density === 'sparse') {
          host.activities = [];
          host.offers = [];
          if (schemaVersion === 2) { host.stories = []; host.people = []; host.gallery.mediaIds = []; }
        } else if (schemaVersion === 1) {
          const first = host.activities[0];
          host.activities = ['scheduled', 'cancelled', 'completed'].map((lifecycle, i) => ({
            ...structuredClone(first), id: first.id + '-proof-' + i, slug: first.slug + '-proof-' + i,
            title: first.title + ' · synthetic ' + i, lifecycle,
          }));
        }
        cases.push({ id: family + '-v' + schemaVersion + '-' + density, family, schemaVersion, density, host: validateHostGraph(host) });
      }
    }
  }
  return cases;
}

module.exports = { authoringProofCases };
