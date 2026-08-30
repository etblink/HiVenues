'use strict';

const { createVenueContext } = require('../../src/venue/context');
const { createVenuePackage } = require('../../src/venue/package');

const HV3_SYNTHETIC_VENUE = createVenueContext({
  id: 'lantern-room-fixture',
  displayName: 'The Lantern Room (Fixture)',
  business: {
    address: '1 Example Way, Testville, NV 89000',
    phone: '(555) 010-4242',
    hours: 'Tue–Sun, 9:00 a.m.–7:00 p.m.',
    websiteUrl: 'https://lantern-room.example/',
    mapUrl: 'https://lantern-room.example/map',
  },
  hive: {
    communityId: 'hive-654321',
    officialAccount: 'lanternroom',
    threadsContainerAccount: 'lantern.threads',
    paymentMerchantAccounts: ['lanternroom'],
  },
});

const HV3_SYNTHETIC_PACKAGE = createVenuePackage(
  {
    schemaVersion: 1,
    id: 'lantern-room-fixture-package',
    venueId: HV3_SYNTHETIC_VENUE.id,
    brand: {
      logo: {
        src: '/fixtures/lantern-room/logo.svg',
        width: 320,
        height: 320,
      },
    },
    seo: {
      defaultDescription: 'A fictional offline reading-room fixture used only to prove Hive-Venues package composition.',
    },
    home: {
      hero: {
        lede: 'A fictional quiet reading room where the test community trades book notes instead of bar stories.',
        footnote: 'This fixture is offline test data and is never a real venue or deployment target.',
        image: {
          src: '/fixtures/lantern-room/reading-room.jpg',
          alt: 'Fictional fixture reading room with lanterns and bookshelves',
          width: 1600,
          height: 1000,
          caption: 'Fixture reading room · offline test media',
        },
      },
      updates: {
        heading: 'Latest from the reading room',
        unavailableLead: 'Fixture notes are intentionally unavailable.',
        unavailableBody: 'The fictional reading room and community navigation remain testable offline.',
        emptyLead: 'No fixture notes yet.',
        emptyBody: 'Synthetic reading-room notes would appear here.',
      },
      pathways: {
        kicker: 'In the reading room and online',
        heading: 'Two ways to open the next chapter',
        intro: 'Use the fictional front desk or browse the equally fictional community from the same platform shell.',
      },
      visit: {
        kicker: 'At the reading room',
        heading: 'Find the fictional Lantern Room',
        lede: 'Fixture-only details prove that factual venue context remains separate from authored venue expression.',
        note: 'This address, schedule, and contact information exist only for deterministic tests.',
      },
      community: {
        kicker: 'The online reading table',
        heading: 'Keep the book conversation going',
        lede: 'See what fictional readers are discussing in the fixture community.',
      },
      gallery: {
        kicker: 'Inside the fixture',
        heading: 'Distinct synthetic media metadata',
        intro: 'These fixture paths are intentionally different from every Fourth Street production photograph.',
        items: [
          {
            src: '/fixtures/lantern-room/bookshelf.jpg',
            alt: 'Fictional fixture bookshelf',
            width: 900,
            height: 1200,
            caption: 'Fixture bookshelf',
          },
          {
            src: '/fixtures/lantern-room/reading-table.jpg',
            alt: 'Fictional fixture reading table',
            width: 900,
            height: 1200,
            caption: 'Fixture reading table',
          },
          {
            src: '/fixtures/lantern-room/front-desk.jpg',
            alt: 'Fictional fixture front desk',
            width: 900,
            height: 1200,
            caption: 'Fixture front desk',
          },
        ],
      },
    },
    onboarding: {
      operatorNoun: 'reading room',
      staffRole: 'host',
    },
  },
  HV3_SYNTHETIC_VENUE,
);

module.exports = { HV3_SYNTHETIC_PACKAGE, HV3_SYNTHETIC_VENUE };
