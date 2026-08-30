'use strict';

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
