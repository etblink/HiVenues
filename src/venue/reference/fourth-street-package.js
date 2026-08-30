'use strict';

const { createVenuePackage } = require('../package');
const { FOURTH_STREET_REFERENCE_VENUE } = require('./fourth-street');

const FOURTH_STREET_REFERENCE_PACKAGE = createVenuePackage(
  {
    schemaVersion: 1,
    id: 'fourth-street-reference',
    venueId: FOURTH_STREET_REFERENCE_VENUE.id,
    brand: {
      logo: {
        src: '/images/fourth-street-bar-logo.jpg',
        width: 720,
        height: 720,
      },
    },
    seo: {
      defaultDescription: 'Visit 4th Street Bar in Reno and browse its public Hive community.',
    },
    home: {
      hero: {
        lede: 'A neighborhood bar in Reno with a real local atmosphere and a community that keeps the conversation going online.',
        footnote: 'Come by in Reno or browse the public conversation on Hive.',
        image: {
          src: '/images/fourth-street-bar-patio.jpg',
          alt: 'The outdoor patio at 4th Street Bar under a pink evening sky',
          width: 2048,
          height: 1536,
          caption: 'Back patio at sunset · 4th Street Bar',
        },
      },
      updates: {
        heading: 'Latest from the bar',
        unavailableLead: 'Latest updates are temporarily unavailable.',
        unavailableBody: 'The bar and community pages are still ready to explore.',
        emptyLead: 'No official updates yet.',
        emptyBody: 'New posts from the bar will appear here.',
      },
      pathways: {
        kicker: 'In Reno and online',
        heading: 'Two ways to pull up a stool',
        intro: 'Come through the front door or join the conversation from wherever you are.',
      },
      visit: {
        kicker: 'At the bar',
        heading: 'Make your way to East 4th Street',
        lede: 'The essentials for finding 4th Street Bar and planning a visit.',
        note: 'Holiday hours may vary; call the bar if you’re planning around a holiday.',
      },
      community: {
        kicker: 'The online bar',
        heading: 'Stay for the conversation',
        lede: 'See what friends and regulars are talking about.',
      },
      gallery: {
        kicker: 'Inside 4th Street Bar',
        heading: 'A real look at the place',
        intro: 'Candid photographs from the pool table, the bar, and the East 4th Street entrance.',
        items: [
          {
            src: '/images/fourth-street-bar-pool-table.jpg',
            alt: 'Pool table and crossed cues inside 4th Street Bar',
            width: 720,
            height: 960,
            caption: 'Pool at the heart of the bar',
          },
          {
            src: '/images/fourth-street-bar-bartender.jpg',
            alt: 'A bartender behind the bar holding a 4th Street Bar mug',
            width: 768,
            height: 960,
            caption: 'A welcome from behind the bar',
          },
          {
            src: '/images/fourth-street-bar-exterior.jpg',
            alt: 'The 4th Street Bar entrance and sign on East 4th Street in Reno',
            width: 720,
            height: 960,
            caption: '1114 East 4th Street',
          },
        ],
      },
    },
    onboarding: {
      operatorNoun: 'bar',
      staffRole: 'bartender',
    },
  },
  FOURTH_STREET_REFERENCE_VENUE,
);

module.exports = { FOURTH_STREET_REFERENCE_PACKAGE };
