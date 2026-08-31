'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  applyOrdinaryOperatorEdit,
  buildOwnershipMap,
  createVenueAuthoringDocument,
  serializeVenueAuthoringReview,
} = require('../src/venue/authoring');
const { createVenueContext } = require('../src/venue/context');
const { createVenuePackage } = require('../src/venue/package');
const { HV3_SYNTHETIC_PACKAGE, HV3_SYNTHETIC_VENUE } = require('./support/hv3-synthetic-venue');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const JUNIPER_VENUE = createVenueContext({
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

function juniperPackageInput() {
  return {
    schemaVersion: 1,
    id: 'juniper-works-fixture-package',
    venueId: JUNIPER_VENUE.id,
    brand: {
      logo: { src: '/fixtures/juniper-works/logo.svg', width: 320, height: 320 },
      theme: {
        canvas: '#f4f1e8',
        surface: '#ffffff',
        border: '#8b8172',
        text: '#1d2620',
        mutedText: '#505a53',
        accent: '#d99b38',
        accentHover: '#efb54e',
      },
    },
    seo: {
      defaultDescription: 'Synthetic community workshop fixture used to test Hive-Venues platform generality.',
    },
    home: {
      hero: {
        lede: 'A member-run workshop and tool library for learning, making, and maintaining shared equipment.',
        footnote: 'Synthetic fixture only. No real venue, account, or deployment is represented.',
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
        items: [],
      },
      equipmentStatus: {
        kicker: 'Equipment status',
        heading: 'Advisory tool and area availability',
        intro: 'Public status is advisory and never replaces steward guidance or posted safety rules.',
        emptyLead: 'No equipment status is posted.',
        emptyBody: 'Ask a steward for current workshop availability.',
        items: [],
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

function juniperAuthoringInput() {
  return {
    schemaVersion: 1,
    deploymentRef: { id: 'juniper-works-offline-fixture' },
    venueContext: JUNIPER_VENUE,
    venuePackage: juniperPackageInput(),
  };
}

test('schema-v1 remains backward compatible for the accepted Lantern Room fixture', () => {
  const document = createVenueAuthoringDocument({
    schemaVersion: 1,
    deploymentRef: { id: 'lantern-room-offline-fixture' },
    venueContext: HV3_SYNTHETIC_VENUE,
    venuePackage: HV3_SYNTHETIC_PACKAGE,
  });

  assert.equal(document.schemaVersion, 1);
  assert.equal(document.venuePackage.brand.theme, undefined);
  assert.equal(document.venuePackage.home.programs, undefined);
  assert.equal(document.venuePackage.home.equipmentStatus, undefined);
});

test('Juniper optional structured capabilities validate and programs canonicalize chronologically', () => {
  const input = juniperPackageInput();
  input.home.programs.items = [
    {
      id: 'later-session',
      title: 'Open build session',
      startAt: '2026-09-12T18:00:00-07:00',
      endAt: '2026-09-12T20:00:00-07:00',
      description: 'An open build period with stewards available for general questions.',
      accessNote: 'Members and oriented visitors; tool eligibility still applies.',
      state: 'scheduled',
      link: null,
    },
    {
      id: 'orientation-101',
      title: 'New member orientation',
      startAt: '2026-09-10T18:00:00-07:00',
      endAt: '2026-09-10T19:00:00-07:00',
      description: 'A public overview of workshop practices and shared-space expectations.',
      accessNote: 'Visitors welcome; this listing does not itself grant equipment eligibility.',
      state: 'full',
      link: 'https://juniper-works.example/programs/orientation-101',
    },
  ];

  const parsed = createVenuePackage(input, JUNIPER_VENUE);
  assert.deepEqual(parsed.home.programs.items.map((item) => item.id), ['orientation-101', 'later-session']);
  assert.equal(parsed.home.programs.items[0].state, 'full');
  assert.equal(parsed.home.equipmentStatus.items.length, 0);
  assert.equal(parsed.brand.theme.accent, '#d99b38');
});

test('structured collections reject duplicate identities and invalid time ranges', () => {
  const duplicate = juniperPackageInput();
  const item = {
    id: 'orientation-101',
    title: 'Orientation',
    startAt: '2026-09-10T18:00:00-07:00',
    endAt: '2026-09-10T19:00:00-07:00',
    description: 'Workshop orientation.',
    accessNote: 'Visitors welcome.',
    state: 'scheduled',
    link: null,
  };
  duplicate.home.programs.items = [item, { ...item, title: 'Duplicate identity' }];
  assert.throws(() => createVenuePackage(duplicate, JUNIPER_VENUE), /item id must be unique/i);

  const invalidTime = juniperPackageInput();
  invalidTime.home.programs.items = [{ ...item, endAt: item.startAt }];
  assert.throws(() => createVenuePackage(invalidTime, JUNIPER_VENUE), /endAt must be after startAt/i);
});

test('venue-owned theme fails closed when required contrast is insufficient', () => {
  const input = juniperPackageInput();
  input.brand.theme.text = '#eeeeee';
  input.brand.theme.canvas = '#ffffff';
  assert.throws(() => createVenuePackage(input, JUNIPER_VENUE), /Theme contrast is insufficient/i);
});

test('HV-5 explicitly admits lifecycle changes only for the two preregistered collections', () => {
  const base = createVenueAuthoringDocument(juniperAuthoringInput());
  const proposed = clone(base);
  proposed.venuePackage.home.programs.items.push({
    id: 'orientation-101',
    title: 'New member orientation',
    startAt: '2026-09-10T18:00:00-07:00',
    endAt: '2026-09-10T19:00:00-07:00',
    description: 'A public overview of workshop practices and shared-space expectations.',
    accessNote: 'Visitors welcome; this listing does not itself grant equipment eligibility.',
    state: 'scheduled',
    link: null,
  });
  proposed.venuePackage.home.equipmentStatus.items.push(
    {
      id: 'laser-cutter',
      name: 'Laser cutter',
      state: 'maintenance',
      note: 'Lens cleaning in progress.',
      accessNote: 'Orientation required before use.',
      lastUpdated: '2026-09-09T16:30:00-07:00',
      group: 'Digital fabrication',
    },
    {
      id: 'wood-shop',
      name: 'Wood shop',
      state: 'available',
      note: 'Normal advisory availability.',
      accessNote: 'Some machines require individual orientation.',
      lastUpdated: '2026-09-09T16:35:00-07:00',
      group: 'Fabrication areas',
    },
  );

  const accepted = applyOrdinaryOperatorEdit(base, proposed);
  assert.equal(accepted.venuePackage.home.programs.items[0].id, 'orientation-101');
  assert.deepEqual(accepted.venuePackage.home.equipmentStatus.items.map((item) => item.id), ['laser-cutter', 'wood-shop']);

  const reordered = clone(accepted);
  reordered.venuePackage.home.equipmentStatus.items.reverse();
  const reorderedAccepted = applyOrdinaryOperatorEdit(accepted, reordered);
  assert.deepEqual(reorderedAccepted.venuePackage.home.equipmentStatus.items.map((item) => item.id), ['wood-shop', 'laser-cutter']);

  const removed = clone(reorderedAccepted);
  removed.venuePackage.home.programs.items = [];
  assert.equal(applyOrdinaryOperatorEdit(reorderedAccepted, removed).venuePackage.home.programs.items.length, 0);
});

test('HV-5 still denies gallery topology and protected Hive identity changes', () => {
  const base = createVenueAuthoringDocument({
    schemaVersion: 1,
    deploymentRef: { id: 'lantern-room-offline-fixture' },
    venueContext: HV3_SYNTHETIC_VENUE,
    venuePackage: HV3_SYNTHETIC_PACKAGE,
  });

  const galleryChange = clone(base);
  galleryChange.venuePackage.home.gallery.items.push(clone(galleryChange.venuePackage.home.gallery.items[0]));
  assert.throws(() => applyOrdinaryOperatorEdit(base, galleryChange), /gallery\/items.*INTEGRATION_OWNED/i);

  const hiveChange = clone(base);
  hiveChange.venueContext.hive.officialAccount = 'different-account';
  assert.throws(() => applyOrdinaryOperatorEdit(base, hiveChange), /officialAccount.*INTEGRATION_OWNED/i);
});

test('ownership and canonical serialization expose collection authority without broad container authority', () => {
  const document = createVenueAuthoringDocument(juniperAuthoringInput());
  const ownership = buildOwnershipMap(document);

  assert.equal(ownership['/venuePackage/home/programs/items'], 'OPERATOR_AUTHORED_COLLECTION');
  assert.equal(ownership['/venuePackage/home/equipmentStatus/items'], 'OPERATOR_AUTHORED_COLLECTION');
  assert.equal(ownership['/venuePackage/home/gallery/items'], 'INTEGRATION_OWNED');
  assert.equal(ownership['/venuePackage/home'], 'INTEGRATION_OWNED');

  const canonical = serializeVenueAuthoringReview(document);
  assert.ok(canonical.endsWith('\n'));
  assert.equal(canonical.includes('PRIVATE KEY'), false);
});
