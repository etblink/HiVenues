'use strict';

const { createVenueContext } = require('../../src/venue/context');
const { createVenuePackage } = require('../../src/venue/package');

const JUNIPER_WORKS_VENUE = createVenueContext({
  id: 'juniper-works-fixture',
  displayName: 'Juniper Works Cooperative',
  business: {
    address: '240 Juniper Works Way, Reno, NV 89502',
    phone: '(555) 010-2746',
    hours: 'Tue–Fri 2:00 p.m.–9:00 p.m.; Sat–Sun 10:00 a.m.–6:00 p.m.; Mon closed',
    websiteUrl: 'https://juniper-works.example/',
    mapUrl: 'https://juniper-works.example/visit',
  },
  hive: {
    communityId: 'hive-742913',
    officialAccount: 'juniperworks',
    threadsContainerAccount: 'juniper.threads',
    paymentMerchantAccounts: [],
  },
});

function createJuniperWorksPackageInput() {
  return {
    schemaVersion: 1,
    id: 'juniper-works-fixture-package',
    venueId: JUNIPER_WORKS_VENUE.id,
    brand: {
      logo: { src: '/fixtures/juniper-works/logo.svg', width: 320, height: 320 },
      theme: {
        canvas: '#f4f1e8',
        surface: '#ffffff',
        border: '#8b8172',
        text: '#1d2620',
        mutedText: '#505a53',
        accent: '#b86f00',
        accentHover: '#bd7700',
      },
    },
    seo: {
      defaultDescription: 'Synthetic community workshop fixture used to test Hive-Venues platform generality.',
    },
    home: {
      hero: {
        lede: 'A member-run workshop and tool library for learning, making, and maintaining shared equipment.',
        footnote: 'Synthetic fixture only. No real venue, account, community, or deployment is represented.',
        image: {
          src: '/fixtures/juniper-works/workshop.jpg',
          alt: 'Synthetic community workshop with shared work tables',
          width: 1600,
          height: 1000,
          caption: 'Synthetic Juniper Works workshop',
        },
      },
      updates: {
        heading: 'Workshop updates',
        unavailableLead: 'Community updates are temporarily unavailable.',
        unavailableBody: 'Workshop information remains available while Hive reads recover.',
        emptyLead: 'No community updates yet.',
        emptyBody: 'Future workshop updates will appear here.',
      },
      programs: {
        kicker: 'Upcoming at the workshop',
        heading: 'Classes, orientations, and build sessions',
        intro: 'Programs are public workshop information, not a booking or credential system.',
        emptyLead: 'No upcoming programs are listed.',
        emptyBody: 'Check back for orientations, classes, and community build sessions.',
        items: [
          {
            id: 'open-build-night',
            title: 'Open build night',
            startAt: '2026-09-12T18:00:00-07:00',
            endAt: '2026-09-12T20:30:00-07:00',
            description: 'A shared build period with stewards available for general workshop questions.',
            accessNote: 'Members and oriented visitors; individual tool eligibility still applies.',
            state: 'scheduled',
            link: 'https://juniper-works.example/programs/open-build-night',
          },
          {
            id: 'orientation-101',
            title: 'New member orientation',
            startAt: '2026-09-10T18:00:00-07:00',
            endAt: '2026-09-10T19:00:00-07:00',
            description: 'A public overview of workshop practices, shared-space expectations, and how to ask for tool orientation.',
            accessNote: 'Visitors welcome; this listing does not itself grant equipment eligibility.',
            state: 'full',
            link: null,
          },
        ],
      },
      equipmentStatus: {
        kicker: 'Equipment status',
        heading: 'Advisory tool and area availability',
        intro: 'Public status is advisory and never replaces steward guidance or posted safety rules.',
        emptyLead: 'No equipment status is posted.',
        emptyBody: 'Ask a steward for current workshop availability.',
        items: [
          {
            id: 'laser-cutter',
            name: 'Laser cutter',
            state: 'maintenance',
            note: 'Lens cleaning and alignment check in progress.',
            accessNote: 'Orientation required before use.',
            lastUpdated: '2026-09-09T16:30:00-07:00',
            group: 'Digital fabrication',
          },
          {
            id: 'wood-shop',
            name: 'Wood shop',
            state: 'available',
            note: 'Normal advisory availability during open hours.',
            accessNote: 'Some machines require individual orientation.',
            lastUpdated: '2026-09-09T16:35:00-07:00',
            group: 'Fabrication areas',
          },
          {
            id: 'electronics-bench',
            name: 'Electronics bench',
            state: 'limited',
            note: 'Two soldering stations available while one station is being serviced.',
            accessNote: 'Basic bench use is open; specialized equipment may require steward guidance.',
            lastUpdated: '2026-09-09T16:40:00-07:00',
            group: 'Electronics',
          },
        ],
      },
      pathways: {
        kicker: 'At the workshop and online',
        heading: 'Learn before you arrive, then stay connected',
        intro: 'Review first-visit expectations or join the community discussion from the same venue presence.',
      },
      visit: {
        kicker: 'First visit',
        heading: 'Start with orientation and a steward check-in',
        lede: 'Visitors can tour the workshop; some tools and areas require orientation before use.',
        note: 'This fixture describes access expectations only and does not create credentials or physical-access authority.',
      },
      community: {
        kicker: 'Workshop community',
        heading: 'Share projects, questions, and repair knowledge',
        lede: 'Continue the workshop conversation through the venue community on Hive.',
      },
      gallery: {
        kicker: 'Member projects',
        heading: 'A bounded project showcase',
        intro: 'Synthetic examples demonstrate venue-specific media without changing generic platform source.',
        items: [
          { src: '/fixtures/juniper-works/project-a.jpg', alt: 'Synthetic wooden project', width: 900, height: 1200, caption: 'Fixture project A' },
          { src: '/fixtures/juniper-works/project-b.jpg', alt: 'Synthetic metal project', width: 900, height: 1200, caption: 'Fixture project B' },
          { src: '/fixtures/juniper-works/project-c.jpg', alt: 'Synthetic textile project', width: 900, height: 1200, caption: 'Fixture project C' },
        ],
      },
    },
    onboarding: {
      operatorNoun: 'workshop',
      staffRole: 'steward',
    },
  };
}

const JUNIPER_WORKS_PACKAGE = createVenuePackage(
  createJuniperWorksPackageInput(),
  JUNIPER_WORKS_VENUE,
);

const JUNIPER_WORKS_AUTHORING_INPUT = Object.freeze({
  schemaVersion: 1,
  deploymentRef: { id: 'juniper-works-offline-fixture' },
  venueContext: JUNIPER_WORKS_VENUE,
  venuePackage: JUNIPER_WORKS_PACKAGE,
});

module.exports = {
  JUNIPER_WORKS_AUTHORING_INPUT,
  JUNIPER_WORKS_PACKAGE,
  JUNIPER_WORKS_VENUE,
  createJuniperWorksPackageInput,
};
